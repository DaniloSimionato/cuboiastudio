import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  PrismaConversationStateStore,
  applyHandoffExecutionEvent,
  applyHandoffTurn,
  createHandoffExecutionStateEvent,
  createEmptyConversationState,
  createEmptyRuntimeHandoffState,
  createV1HandoffObservation,
} from "../dist/runtime-v2/index.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must point to a local disposable database");

const prisma = new PrismaClient();
const prefix = `runtime-v2-handoff-executor-${randomUUID()}`;
const now = new Date("2026-07-16T19:00:00.000Z");

async function fixture() {
  const scope = {
    companyId: `${prefix}-company`,
    assistantId: `${prefix}-assistant`,
    conversationId: `${prefix}-conversation`,
    contextVersion: 1,
  };
  await prisma.company.create({ data: { id: scope.companyId, name: "Handoff Executor Test" } });
  await prisma.assistant.create({
    data: { id: scope.assistantId, companyId: scope.companyId, name: "Handoff Executor Assistant" },
  });
  await prisma.assistantConversation.create({
    data: {
      id: scope.conversationId,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      source: "SMOKE",
      channelType: "UNKNOWN",
      currentContextVersion: 1,
    },
  });
  const message = await prisma.assistantConversationMessage.create({
    data: {
      id: `${prefix}-message-1`,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      role: "user",
      content: "handoff executor metadata test",
      source: "TEST",
      messageType: "TEXT",
      contextVersion: 1,
    },
  });
  return { scope, message };
}

function stateScope(scope) {
  return { ...scope, contactId: null, runtimeVersion: "V2", mode: "SHADOW" };
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

after(async () => {
  await prisma.assistantConversationStateV2Event.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistantConversationStateV2.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistantConversationMessage.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistantConversation.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistant.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test("PostgreSQL persiste o resultado do handoff sem tabela nova ou payload operacional", async () => {
  const created = await fixture();
  const scope = stateScope(created.scope);
  const observation = createV1HandoffObservation({
    companyId: created.scope.companyId,
    assistantId: created.scope.assistantId,
    conversationId: created.scope.conversationId,
    contactId: null,
    contextVersion: 1,
    internalMessageId: created.message.id,
    flowId: "flow-handoff",
    handoffPendingObserved: true,
    reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    customerRequested: true,
    humanActiveObserved: false,
    aiActiveObserved: true,
    pausedByHumanObserved: false,
    requestedTargetType: "ANY_HUMAN",
    requestedTargetIdHash: null,
    collectedContextKeys: ["handoff_pending"],
    contextHash: "handoff-context-hash",
    provenance: { source: "V1_PIPELINE", sourceMessageId: created.message.id },
  });
  const turn = applyHandoffTurn({
    scope,
    state: createEmptyRuntimeHandoffState(now),
    observation,
    currentTime: now,
    internalMessageId: created.message.id,
  });
  let state = turn.after;
  const handoff = state.activeHandoff;
  const pending = createHandoffExecutionStateEvent({
    scope,
    handoff,
    eventType: "HANDOFF_EXECUTION_PENDING",
    timestamp: new Date("2026-07-16T19:01:00.000Z"),
    reasonCode: handoff.reasonCode,
  });
  state = applyHandoffExecutionEvent(state, pending, { scope, currentTime: new Date(pending.timestamp) });
  const started = createHandoffExecutionStateEvent({
    scope,
    handoff: state.activeHandoff,
    eventType: "HANDOFF_EXECUTION_STARTED",
    timestamp: new Date("2026-07-16T19:02:00.000Z"),
    reasonCode: handoff.reasonCode,
  });
  state = applyHandoffExecutionEvent(state, started, { scope, currentTime: new Date(started.timestamp) });
  const succeeded = createHandoffExecutionStateEvent({
    scope,
    handoff: state.activeHandoff,
    eventType: "HANDOFF_EXECUTION_SUCCEEDED",
    timestamp: new Date("2026-07-16T19:03:00.000Z"),
    reasonCode: handoff.reasonCode,
    metadata: { chatwootMutationPerformed: true, outboundSent: false },
  });
  state = applyHandoffExecutionEvent(state, succeeded, { scope, currentTime: new Date(succeeded.timestamp) });

  const conversationState = {
    ...createEmptyConversationState(created.scope, now),
    handoffState: state,
    revision: 1,
    lastProcessedMessageId: created.message.id,
  };
  const store = new PrismaConversationStateStore(prisma);
  const saved = await store.saveTurn(conversationState, 0, {
    internalMessageId: created.message.id,
    receivedAt: now,
  });
  const restarted = await store.load(scope);
  assert.equal(saved.state.handoffState.activeHandoff, null);
  assert.equal(restarted.handoffState.activeHandoff, null);
  assert.equal(
    restarted.handoffState.recentTerminalHandoffs[0].finalStatus,
    "HANDOFF_SUCCEEDED",
  );
  assert.ok(restarted.handoffState.recentHandoffEvents.some((event) => event.eventType === "HANDOFF_EXECUTION_SUCCEEDED"));
  assert.equal(JSON.stringify(restarted.handoffState).includes("chatwootMutationPerformed"), true);
  assert.equal(JSON.stringify(restarted.handoffState).includes("payload"), false);
});
