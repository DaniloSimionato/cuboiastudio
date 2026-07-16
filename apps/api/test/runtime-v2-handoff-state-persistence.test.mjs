import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  PrismaConversationStateStore,
  applyHandoffTurn,
  createEmptyConversationState,
  createV1HandoffObservation,
  createEmptyRuntimeHandoffState,
} from "../dist/runtime-v2/index.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must point to a local disposable database");
}

const prisma = new PrismaClient();
const prefix = `runtime-v2-handoff-state-${randomUUID()}`;
const now = new Date("2026-07-16T12:00:00.000Z");

function storeScope(scope) {
  return { ...scope, runtimeVersion: "V2", mode: "SHADOW" };
}

async function createFixture() {
  const scope = {
    companyId: `${prefix}-company`,
    assistantId: `${prefix}-assistant`,
    conversationId: `${prefix}-conversation`,
    contextVersion: 1,
  };
  await prisma.company.create({ data: { id: scope.companyId, name: "Handoff Test" } });
  await prisma.assistant.create({
    data: { id: scope.assistantId, companyId: scope.companyId, name: "Handoff Assistant" },
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
      content: "structured handoff signal",
      source: "TEST",
      messageType: "TEXT",
      contextVersion: 1,
    },
  });
  return { scope, message };
}

function observation(fixture, internalMessageId) {
  return createV1HandoffObservation({
    companyId: fixture.scope.companyId,
    assistantId: fixture.scope.assistantId,
    conversationId: fixture.scope.conversationId,
    contactId: null,
    contextVersion: 1,
    internalMessageId,
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
    contextHash: "",
    provenance: {
      source: "V1_PIPELINE",
      sourceMessageId: internalMessageId,
      sourceFlowId: "flow-handoff",
      sourceVersion: "handoff-persistence-test",
      reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    },
  });
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

after(async () => {
  await prisma.assistantConversationStateV2Event.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversationStateV2.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversationMessage.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversation.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistant.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test("PostgreSQL persiste, recupera e deduplica o estado de handoff", async () => {
  const fixture = await createFixture();
  const scope = storeScope(fixture.scope);
  const handoff = applyHandoffTurn({
    scope,
    state: createEmptyRuntimeHandoffState(now),
    observation: observation(fixture, fixture.message.id),
    currentTime: now,
    internalMessageId: fixture.message.id,
  });
  const initial = {
    ...createEmptyConversationState(fixture.scope, now),
    handoffState: handoff.after,
    revision: 1,
    lastProcessedMessageId: fixture.message.id,
  };
  const store = new PrismaConversationStateStore(prisma);
  const saved = await store.saveTurn(initial, 0, {
    internalMessageId: fixture.message.id,
    receivedAt: now,
  });
  assert.equal(saved.state.handoffState.activeHandoff.status, "HANDOFF_READY");
  assert.deepEqual(
    saved.state.handoffState.recentHandoffEvents.map((event) => event.eventType),
    ["HANDOFF_PROPOSED", "HANDOFF_READY", "HANDOFF_OBSERVATION_RECEIVED"],
  );

  const restarted = await new PrismaConversationStateStore(prisma).load(scope);
  assert.equal(
    restarted.handoffState.activeHandoff.handoffId,
    handoff.after.activeHandoff.handoffId,
  );
  assert.equal(restarted.handoffState.recentHandoffEvents.length, 3);
  assert.equal(JSON.stringify(restarted.handoffState).includes("structured handoff signal"), false);

  const duplicate = await store.saveTurn(initial, 0, {
    internalMessageId: fixture.message.id,
    receivedAt: now,
  });
  assert.equal(duplicate.persistenceResult, "DUPLICATE");
  assert.equal(duplicate.state.revision, 1);
});
