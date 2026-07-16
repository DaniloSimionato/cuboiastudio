import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

const runtime = await import("../dist/runtime-v2/index.js");
const commandModule = await import("../dist/runtime-v2/controlled-handoff-command.js");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must point to a local disposable database");
}
const databaseUrl = new URL(process.env.DATABASE_URL);
if (!(databaseUrl.hostname === "127.0.0.1" || databaseUrl.hostname === "localhost")) {
  throw new Error("DATABASE_URL must point to loopback for this test");
}
if (process.env.RUNTIME_V2_TEST_DATABASE_NAME && databaseUrl.pathname.slice(1) !== process.env.RUNTIME_V2_TEST_DATABASE_NAME) {
  throw new Error("unexpected disposable database name");
}

const prisma = new PrismaClient();
const prefix = `runtime-v2-controlled-command-${randomUUID()}`;
const now = new Date("2026-07-16T12:00:00.000Z");
const scope = {
  companyId: `${prefix}-company`,
  assistantId: `${prefix}-assistant`,
  conversationId: `${prefix}-conversation`,
  contextVersion: 1,
};
const storeScope = { ...scope, contactId: null, runtimeVersion: "V2", mode: "SHADOW" };
const environment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_HANDOFF_STATE_MODE: "SHADOW_STATE",
  RUNTIME_V2_HANDOFF_EXECUTION_MODE: "CONTROLLED",
  RUNTIME_V2_HANDOFF_ADAPTER_MODE: "CHATWOOT_CONTROLLED",
  RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS: scope.conversationId,
};
const structuralReference = {
  companyId: scope.companyId,
  assistantId: scope.assistantId,
  internalConversationId: scope.conversationId,
  contextVersion: scope.contextVersion,
  channelBindingPresent: true,
  configurationPresent: true,
  configurationActive: true,
  accountScopeHash: "account-scope-hash",
  inboxScopeHash: "inbox-scope-hash",
  externalConversationReferenceHash: "conversation-scope-hash",
  scopeValid: true,
  resolutionStatus: "RESOLVED",
  redactionApplied: true,
};

async function createFixture() {
  await prisma.company.create({ data: { id: scope.companyId, name: "Controlled Command Test" } });
  await prisma.assistant.create({
    data: { id: scope.assistantId, companyId: scope.companyId, name: "Controlled Command Assistant" },
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
  return message;
}

function createObservation(messageId) {
  return runtime.createV1HandoffObservation({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    contactId: null,
    contextVersion: 1,
    internalMessageId: messageId,
    flowId: "flow-handoff",
    handoffPendingObserved: true,
    reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    customerRequested: true,
    humanActiveObserved: false,
    aiActiveObserved: true,
    pausedByHumanObserved: false,
    requestedTargetType: "ANY_HUMAN",
    requestedTargetIdHash: null,
    collectedContextKeys: ["customer_requested_human"],
    contextHash: "context-hash",
    provenance: {
      source: "V1_PIPELINE",
      sourceMessageId: messageId,
      sourceFlowId: "flow-handoff",
      sourceVersion: "controlled-command-persistence-test",
      reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    },
  });
}

class FakeAdapter {
  constructor() {
    this.aiActive = true;
    this.calls = [];
  }
  async getConversationState() {
    this.calls.push("getConversationState");
    return {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      contactId: null,
      contextVersion: 1,
      inboxMatches: true,
      configReady: true,
      aiActive: this.aiActive,
      humanActive: false,
      labelApplied: false,
      teamAssigned: false,
      agentAssigned: false,
      finalStateVerified: true,
    };
  }
  async pauseAi() {
    this.calls.push("pauseAi");
    this.aiActive = false;
  }
  async applyLabel() { throw new Error("disabled"); }
  async assignTeam() { throw new Error("disabled"); }
  async assignAgent() { throw new Error("disabled"); }
  async verifyFinalState() {
    this.calls.push("verifyFinalState");
    return (await this.getConversationState());
  }
  async reconcile() { return (await this.getConversationState()); }
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

test("PostgreSQL persists one-shot approval, execution and redacted event IDs", async () => {
  const message = await createFixture();
  const handoffTurn = runtime.applyHandoffTurn({
    scope: storeScope,
    state: runtime.createEmptyRuntimeHandoffState(now),
    observation: createObservation(message.id),
    currentTime: now,
    internalMessageId: message.id,
  });
  const initial = {
    ...runtime.createEmptyConversationState(storeScope, now),
    handoffState: handoffTurn.after,
    revision: 1,
    lastProcessedMessageId: message.id,
  };
  const store = new runtime.PrismaConversationStateStore(prisma);
  const persistedInitial = await store.saveTurn(initial, 0, {
    internalMessageId: message.id,
    receivedAt: now,
  });
  const approval = commandModule.createControlledExecutionApproval({
    approvalId: `${prefix}-approval`,
    handoff: persistedInitial.state.handoffState.activeHandoff,
    expectedRevision: 2,
    issuedAt: now,
    expiresAt: new Date("2026-07-16T13:00:00.000Z"),
    nonceHash: "nonce-hash-only",
    planHash: commandModule.createControlledHandoffPlanHash(
      persistedInitial.state.handoffState.activeHandoff,
      now,
      structuralReference,
    ),
  });
  const withApproval = await store.save({
    ...persistedInitial.state,
    controlledExecutionApproval: approval,
    revision: 2,
  }, 1);
  const persistedApproval = await store.load(storeScope);
  assert.equal(persistedApproval?.controlledExecutionApproval?.approvalId, approval.approvalId);
  assert.equal(persistedApproval?.controlledExecutionApproval?.status, "ISSUED");
  assert.deepEqual(
    persistedApproval?.handoffState?.activeHandoff,
    persistedInitial.state.handoffState.activeHandoff,
  );
  const adapter = new FakeAdapter();
  const command = new commandModule.RuntimeV2ControlledHandoffCommand({
    stateStore: store,
    environment,
    now: () => now,
    resolveConfigurationReference: () => ({
      ...structuralReference,
    }),
    resolveAdapter: async () => adapter,
  });
  const result = await command.run({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    contextVersion: 1,
    handoffId: withApproval.handoffState.activeHandoff.handoffId,
    expectedRevision: 2,
    mode: "EXECUTE",
    approvalId: approval.approvalId,
  });
  assert.equal(
    result.status,
    "SUCCEEDED",
    `status=${result.status}; blockers=${result.blockers.join(",")}; resultCode=${result.resultCode}`,
  );
  assert.equal(result.revisionChanged, true);
  assert.equal(adapter.calls.filter((call) => call === "pauseAi").length, 1);
  const restarted = await new runtime.PrismaConversationStateStore(prisma).load(storeScope);
  assert.equal(restarted.controlledExecution.status, "SUCCEEDED");
  assert.equal(restarted.controlledExecutionApproval.status, "CONSUMED");
  assert.equal(restarted.controlledExecution.eventIds.length, 3);
  assert.equal(JSON.stringify(restarted).includes("nonce-hash-only"), true);
  assert.equal(JSON.stringify(restarted).includes("token"), false);
  assert.equal(JSON.stringify(restarted).includes("payload"), false);
  const tableNames = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_name IN ('assistant_conversation_states_v2', 'assistant_conversation_state_v2_events')
    ORDER BY table_name
  `;
  assert.equal(tableNames.length >= 1, true);
});
