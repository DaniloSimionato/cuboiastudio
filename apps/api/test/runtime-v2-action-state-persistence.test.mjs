import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  InMemoryConversationStateStore,
  PrismaConversationStateStore,
  applyStructuredConfirmation,
  createEmptyConversationState,
  createV1ToolExecutionObservation,
  proposePendingAction,
  RuntimeV2ShadowIntegrationService,
  RuntimeV2ShadowOrchestrator,
} from "../dist/runtime-v2/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must point to a local disposable database");

const prisma = new PrismaClient();
const prefix = `runtime-v2-action-state-${randomUUID()}`;
const now = new Date("2026-07-15T12:00:00.000Z");

async function createFixture(suffix = randomUUID().slice(0, 8)) {
  const fixturePrefix = `${prefix}-${suffix}`;
  const scope = {
    companyId: `${fixturePrefix}-company`,
    assistantId: `${fixturePrefix}-assistant`,
    conversationId: `${fixturePrefix}-conversation`,
    contextVersion: 1,
  };
  await prisma.company.create({ data: { id: scope.companyId, name: "Action State Test" } });
  await prisma.assistant.create({
    data: { id: scope.assistantId, companyId: scope.companyId, name: "Action State Assistant" },
  });
  await prisma.assistantConversation.create({
    data: {
      id: scope.conversationId,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      source: "SMOKE",
      channelType: "UNKNOWN",
      currentContextVersion: scope.contextVersion,
    },
  });
  const message = await prisma.assistantConversationMessage.create({
    data: {
      id: `${fixturePrefix}-message-1`,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      role: "user",
      content: "synthetic action state turn",
      source: "TEST",
      messageType: "TEXT",
      contextVersion: scope.contextVersion,
    },
  });
  return { scope, message, fixturePrefix };
}

function storeScope(scope) {
  return { ...scope, runtimeVersion: "V2", mode: "SHADOW" };
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
  await prisma.assistantRuntimeLog.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversation.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistant.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test("PostgreSQL persiste, recupera e atualiza ação pendente sem nova tabela", async () => {
  const fixture = await createFixture();
  const scope = storeScope(fixture.scope);
  const proposal = proposePendingAction({
    scope,
    proposal: {
      contractVersion: 1,
      flowId: "flow-booking",
      intent: "booking",
      proposedActionType: "CREATE_BOOKING",
      requiredParameters: ["date", "time"],
      collectedParameters: ["date", "time"],
      missingParameters: [],
      confirmationPolicy: "EXPLICIT_CUSTOMER_CONFIRMATION",
      toolContext: null,
      provenance: { source: "V2_SHADOW", sourceFlowId: "flow-booking", sourceVersion: "test" },
    },
    internalMessageId: fixture.message.id,
    currentTime: now,
    expiresAt: "2026-07-15T12:15:00.000Z",
    normalizedArguments: { date: "2026-07-20", time: "14:00" },
    collectedParameterKeys: ["date", "time"],
    missingParameters: [],
    provenance: { source: "V2_SHADOW", sourceFlowId: "flow-booking", sourceVersion: "test" },
  });
  const initial = {
    ...createEmptyConversationState(fixture.scope, now),
    actionState: proposal.state,
    revision: 1,
    lastProcessedMessageId: fixture.message.id,
  };
  const store = new PrismaConversationStateStore(prisma);
  const saved = await store.saveTurn(initial, 0, {
    internalMessageId: fixture.message.id,
    receivedAt: now,
  });
  assert.equal(saved.state.actionState.activeAction.status, "AWAITING_CUSTOMER_CONFIRMATION");
  assert.equal(saved.state.actionState.recentActionEvents.length, 2);

  const restarted = await new PrismaConversationStateStore(prisma).load(scope);
  assert.equal(restarted.actionState.activeAction.actionId, proposal.request.actionId);
  assert.equal(restarted.actionState.activeAction.executionState.executionPerformed, false);
  assert.equal(restarted.actionState.recentActionEvents.length, 2);
  const row = await prisma.assistantConversationStateV2.findUnique({
    where: {
      companyId_assistantId_conversationId_contextVersion_mode: {
        ...fixture.scope,
        mode: "SHADOW",
      },
    },
    select: { stateJson: true },
  });
  assert.equal(JSON.stringify(row.stateJson).includes("2026-07-20"), false);
  assert.equal(
    await prisma.assistantConversationStateV2.count({
      where: { companyId: fixture.scope.companyId },
    }),
    1,
  );

  const confirmationMessage = await prisma.assistantConversationMessage.create({
    data: {
      id: `${fixture.fixturePrefix}-message-2`,
      companyId: fixture.scope.companyId,
      assistantId: fixture.scope.assistantId,
      conversationId: fixture.scope.conversationId,
      role: "user",
      content: "synthetic confirmation",
      source: "TEST",
      messageType: "TEXT",
      contextVersion: fixture.scope.contextVersion,
    },
  });
  const confirmation = applyStructuredConfirmation(
    restarted.actionState,
    {
      signalType: "CONFIRM",
      ...fixture.scope,
      actionId: proposal.request.actionId,
      confirmingMessageId: confirmationMessage.id,
      detectedAt: "2026-07-15T12:05:00.000Z",
    },
    { scope, currentTime: new Date("2026-07-15T12:05:00.000Z") },
  );
  const updatedState = {
    ...restarted,
    actionState: confirmation.state,
    revision: restarted.revision + 1,
    lastProcessedMessageId: confirmationMessage.id,
    updatedAt: new Date("2026-07-15T12:05:00.000Z"),
  };
  const updated = await store.saveTurn(updatedState, restarted.revision, {
    internalMessageId: confirmationMessage.id,
    receivedAt: new Date("2026-07-15T12:05:00.000Z"),
  });
  assert.equal(updated.state.actionState.activeAction.status, "ACTION_CONFIRMED");
  assert.equal(
    (await new PrismaConversationStateStore(prisma).load(scope)).actionState.activeAction.status,
    "ACTION_CONFIRMED",
  );
});

test("OFF não cria ação nem altera o contrato de estado em memória", async () => {
  const store = new InMemoryConversationStateStore();
  const scope = {
    companyId: `${prefix}-off-company`,
    assistantId: `${prefix}-off-assistant`,
    conversationId: `${prefix}-off-conversation`,
    contextVersion: 1,
  };
  const state = createEmptyConversationState(scope, now);
  assert.equal(state.actionState, undefined);
  await store.create(state);
  assert.equal((await store.load(storeScope(scope))).actionState, undefined);
});

test("PostgreSQL registra observação de ferramenta somente como metadata", async () => {
  const fixture = await createFixture();
  const observation = createV1ToolExecutionObservation({
    scope: fixture.scope,
    internalMessageId: fixture.message.id,
    executionAttemptId: `${prefix}-tool-call`,
    toolName: "calendar_checkAvailability",
    arguments: {
      startAt: "2026-07-20T14:00:00.000Z",
      endAt: "2026-07-20T15:00:00.000Z",
    },
    startedAt: now,
    completedAt: new Date(now.getTime() + 10),
    timeoutMs: 5000,
    executionStarted: true,
    result: JSON.stringify({
      available: true,
      options: [{ startAt: "2026-07-20T14:00:00.000Z", endAt: "2026-07-20T15:00:00.000Z" }],
    }),
  });
  const environment = {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
    RUNTIME_V2_TOOL_OBSERVATION_MODE: "SHADOW_METADATA",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: fixture.scope.assistantId,
  };
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    environment,
    () => now,
  );
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, environment);
  const result = await integration.schedule({
    scope: fixture.scope,
    correlationId: `${prefix}-correlation`,
    internalMessageId: fixture.message.id,
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "availability",
    toolObservations: [observation],
    v1Comparison: {},
  });
  assert.equal(result.status, "COMPLETED");
  const log = await prisma.assistantRuntimeLog.findFirst({
    where: { companyId: fixture.scope.companyId },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  const metadata = log?.metadata ?? {};
  assert.equal(metadata.toolObservationPersisted, true);
  assert.equal(metadata.v1ToolExecutionObserved, true);
  assert.equal(JSON.stringify(metadata).includes("2026-07-20T14:00:00.000Z"), false);
  assert.equal(JSON.stringify(metadata).includes("startAt"), false);
});
