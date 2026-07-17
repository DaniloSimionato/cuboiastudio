import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  InMemoryConversationStateStore,
  applyStructuredConfirmation,
  createEmptyConversationState,
  createDefaultSyntheticToolRegistry,
  createSyntheticExecutionId,
  createRuntimeActionStateEvent,
  isRuntimeV2SyntheticExecutionEnabled,
  proposePendingAction,
  reduceRuntimeActionState,
  RuntimeV2SyntheticExecutionOrchestrator,
  SyntheticToolRegistry,
} from "../dist/runtime-v2/index.js";

const now = new Date("2026-07-15T12:00:00.000Z");
const baseScope = {
  companyId: "company-synthetic",
  assistantId: "assistant-synthetic",
  conversationId: "conversation-synthetic",
  contactId: "contact-synthetic",
  contextVersion: 1,
};
const scope = { ...baseScope, runtimeVersion: "V2", mode: "SHADOW" };
const environment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_ACTION_STATE_MODE: "SHADOW_STATE",
  RUNTIME_V2_SYNTHETIC_EXECUTION_MODE: "SYNTHETIC_ONLY",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: baseScope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: baseScope.conversationId,
};

function createActionFixture({ actionType, confirmationPolicy, args, requiredParameters = [] }) {
  const proposal = {
    contractVersion: 1,
    flowId: "flow-synthetic",
    intent: actionType === "READ_AVAILABILITY" ? "availability" : "booking",
    proposedActionType: actionType,
    requiredParameters,
    collectedParameters: Object.keys(args),
    missingParameters: requiredParameters.filter((key) => !(key in args)),
    confirmationPolicy,
    toolContext: null,
    provenance: {
      source: "V2_SHADOW",
      sourceMessageId: "message-proposal",
      sourceFlowId: "flow-synthetic",
      sourceVersion: "test",
      reasonCode: "SYNTHETIC_FIXTURE",
    },
  };
  const proposed = proposePendingAction({
    scope,
    proposal,
    internalMessageId: "message-proposal",
    currentTime: now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    normalizedArguments: args,
    collectedParameterKeys: Object.keys(args),
    missingParameters: proposal.missingParameters,
    provenance: proposal.provenance,
  });
  let actionState = proposed.state;
  let confirmation = null;
  if (confirmationPolicy !== "NONE" && proposal.missingParameters.length === 0) {
    const confirmed = applyStructuredConfirmation(
      actionState,
      {
        signalType: "CONFIRM",
        companyId: baseScope.companyId,
        assistantId: baseScope.assistantId,
        conversationId: baseScope.conversationId,
        contactId: baseScope.contactId,
        contextVersion: baseScope.contextVersion,
        confirmingMessageId: "message-confirmation",
        actionId: proposed.request.actionId,
        detectedAt: now.toISOString(),
        provenanceMetadata: { source: "synthetic-test" },
      },
      { scope, currentTime: now },
    );
    actionState = confirmed.state;
    confirmation = confirmed.confirmation;
  }
  const state = createEmptyConversationState(baseScope, now);
  state.actionState = actionState;
  return { state, actionId: proposed.request.actionId, confirmation };
}

async function createStore(action) {
  const store = new InMemoryConversationStateStore();
  await store.create(action.state);
  return store;
}

test("flag OFF e allowlist impedem execução sintética", async () => {
  assert.equal(isRuntimeV2SyntheticExecutionEnabled(scope, {}), false);
  assert.equal(
    isRuntimeV2SyntheticExecutionEnabled(scope, {
      ...environment,
      RUNTIME_V2_SYNTHETIC_EXECUTION_MODE: "OFF",
    }),
    false,
  );
  const action = createActionFixture({
    actionType: "READ_AVAILABILITY",
    confirmationPolicy: "NONE",
    args: { date: "2026-07-16" },
  });
  const store = await createStore(action);
  const result = await new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    undefined,
    {},
    () => now,
  ).execute({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16" },
    internalMessageId: "message-off",
    currentTime: now,
  });
  assert.equal(result.manifest.errorCode, "SYNTHETIC_EXECUTION_DISABLED");
  assert.equal((await store.load(scope)).revision, 0);
});

test("registry aceita somente adapters synthetic e não resolve ferramenta real", () => {
  const registry = createDefaultSyntheticToolRegistry();
  assert.deepEqual(registry.names(), [
    "synthetic.availability",
    "synthetic.booking",
    "synthetic.webhook_read",
    "synthetic.webhook_write",
  ]);
  assert.equal(registry.resolve("calendar.createBooking", "CREATE_BOOKING"), null);
  assert.throws(
    () =>
      new SyntheticToolRegistry([
        {
          ...registry.resolve("synthetic.availability", "READ_AVAILABILITY"),
          toolName: "calendar.real",
        },
      ]),
    /SYNTHETIC_TOOL_NAME_INVALID/,
  );
});

test("availability sintética percorre fila, execução e cria somente AVAILABILITY evidence", async () => {
  const action = createActionFixture({
    actionType: "READ_AVAILABILITY",
    confirmationPolicy: "NONE",
    args: { date: "2026-07-16" },
  });
  const store = await createStore(action);
  const result = await new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    createDefaultSyntheticToolRegistry(),
    environment,
    () => now,
  ).execute({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16" },
    internalMessageId: "message-availability",
    currentTime: now,
  });
  assert.equal(result.result.status, "SUCCEEDED");
  assert.equal(result.evidence?.category, "AVAILABILITY");
  assert.equal(result.manifest.executionEnvironment, "SYNTHETIC");
  assert.equal(result.manifest.syntheticEvidenceCreated, true);
  assert.equal(result.manifest.externalNetworkCallPerformed, false);
  assert.equal(result.manifest.realToolExecutionPerformed, false);
  assert.equal(result.state.actionState.activeAction, null);
  assert.equal(result.state.actionState.recentTerminalActions[0].finalStatus, "SUCCEEDED");
  assert.equal(result.state.actionState.recentActionEvents.length, 4);
});

test("booking exige confirmação estruturada e, com confirmação, termina SUCCEEDED", async () => {
  const action = createActionFixture({
    actionType: "CREATE_BOOKING",
    confirmationPolicy: "EXPLICIT_CUSTOMER_CONFIRMATION",
    args: { date: "2026-07-16", time: "14:00" },
    requiredParameters: ["date", "time"],
  });
  const store = await createStore(action);
  const result = await new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    undefined,
    environment,
    () => now,
  ).execute({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16", time: "14:00" },
    confirmation: action.confirmation,
    internalMessageId: "message-booking",
    currentTime: now,
  });
  assert.equal(result.result.status, "SUCCEEDED");
  assert.equal(result.evidence?.category, "BOOKING");
  assert.equal(result.state.actionState.recentTerminalActions[0].finalStatus, "SUCCEEDED");
});

test("booking sem confirmação permanece sem execução", async () => {
  const action = createActionFixture({
    actionType: "CREATE_BOOKING",
    confirmationPolicy: "EXPLICIT_CUSTOMER_CONFIRMATION",
    args: { date: "2026-07-16", time: "14:00" },
    requiredParameters: ["date", "time"],
  });
  const store = await createStore(action);
  const result = await new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    undefined,
    environment,
    () => now,
  ).execute({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16", time: "14:00" },
    internalMessageId: "message-booking-no-confirmation",
    currentTime: now,
  });
  assert.equal(result.manifest.errorCode, "SYNTHETIC_CONFIRMATION_INVALID");
  assert.equal((await store.load(scope)).revision, 0);
});

test("timeout de mutação exige reconciliação e reconciliação sintética pode autorizar depois", async () => {
  const action = createActionFixture({
    actionType: "CREATE_BOOKING",
    confirmationPolicy: "EXPLICIT_CUSTOMER_CONFIRMATION",
    args: { date: "2026-07-16", time: "14:00" },
    requiredParameters: ["date", "time"],
  });
  const store = await createStore(action);
  const orchestrator = new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    undefined,
    environment,
    () => now,
  );
  const timedOut = await orchestrator.execute({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16", time: "14:00" },
    confirmation: action.confirmation,
    internalMessageId: "message-booking-timeout",
    currentTime: now,
    fixture: { outcome: "TIMED_OUT_UNKNOWN_EFFECT" },
  });
  assert.equal(timedOut.result.status, "TIMED_OUT_UNKNOWN_EFFECT");
  assert.equal(timedOut.state.actionState.activeAction.status, "RECONCILIATION_REQUIRED");
  assert.equal(timedOut.evidence, null);
  const reconciled = await orchestrator.reconcile({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16", time: "14:00" },
    confirmation: action.confirmation,
    internalMessageId: "message-reconcile",
    currentTime: now,
    executionId: timedOut.result.executionId,
    previousResult: timedOut.result,
    fixture: { reconciliationOutcome: "SUCCEEDED" },
  });
  assert.equal(reconciled.result.status, "SUCCEEDED");
  assert.equal(reconciled.evidence?.category, "BOOKING");
  assert.equal(
    reconciled.state.actionState.recentTerminalActions[0].finalStatus,
    "RECONCILED_SUCCEEDED",
  );
});

test("falha, duplicate e reset não executam segunda ação lógica", async () => {
  const action = createActionFixture({
    actionType: "READ_AVAILABILITY",
    confirmationPolicy: "NONE",
    args: { date: "2026-07-16" },
  });
  const store = await createStore(action);
  const orchestrator = new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    undefined,
    environment,
    () => now,
  );
  const failed = await orchestrator.execute({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16" },
    internalMessageId: "message-failed",
    currentTime: now,
    fixture: { outcome: "FAILED" },
  });
  assert.equal(failed.result.status, "FAILED");
  assert.equal(failed.evidence, null);
  const duplicate = await orchestrator.execute({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16" },
    internalMessageId: "message-duplicate",
    currentTime: now,
  });
  assert.equal(duplicate.result.status, "DUPLICATE_SUPPRESSED");
  assert.equal(duplicate.manifest.errorCode, "SYNTHETIC_EXECUTION_DUPLICATE");
  assert.equal((await store.load(scope)).actionState.recentActionEvents.length, 4);
});

test("webhook sintético respeita categoria declarada e escrita exige confirmação", async () => {
  const readAction = createActionFixture({
    actionType: "CUSTOM_WEBHOOK_READ",
    confirmationPolicy: "NONE",
    args: { lookup: "status" },
  });
  const readStore = await createStore(readAction);
  const read = await new RuntimeV2SyntheticExecutionOrchestrator(
    readStore,
    undefined,
    environment,
    () => now,
  ).execute({
    scope,
    actionId: readAction.actionId,
    normalizedArguments: { lookup: "status" },
    internalMessageId: "message-webhook-read",
    currentTime: now,
  });
  assert.equal(read.result.status, "SUCCEEDED");
  assert.equal(read.evidence.category, "EXTERNAL_LOOKUP");

  const writeAction = createActionFixture({
    actionType: "CUSTOM_WEBHOOK_WRITE",
    confirmationPolicy: "EXPLICIT_CUSTOMER_CONFIRMATION",
    args: { operation: "update" },
    requiredParameters: ["operation"],
  });
  const writeStore = await createStore(writeAction);
  const write = await new RuntimeV2SyntheticExecutionOrchestrator(
    writeStore,
    undefined,
    environment,
    () => now,
  ).execute({
    scope,
    actionId: writeAction.actionId,
    normalizedArguments: { operation: "update" },
    confirmation: writeAction.confirmation,
    internalMessageId: "message-webhook-write",
    currentTime: now,
    fixture: { outcome: "SUCCEEDED" },
  });
  assert.equal(write.result.status, "SUCCEEDED");
  assert.equal(write.evidence.category, "EXTERNAL_MUTATION");
});

test("dois executores concorrentes produzem uma única execução lógica", async () => {
  const action = createActionFixture({
    actionType: "READ_AVAILABILITY",
    confirmationPolicy: "NONE",
    args: { date: "2026-07-16" },
  });
  const store = await createStore(action);
  const orchestrator = new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    undefined,
    environment,
    () => now,
  );
  const input = {
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16" },
    internalMessageId: "message-concurrent",
    currentTime: now,
  };
  const results = await Promise.allSettled([
    orchestrator.execute(input),
    orchestrator.execute(input),
  ]);
  const fulfilled = results.filter((item) => item.status === "fulfilled");
  const rejected = results.filter((item) => item.status === "rejected");
  assert.equal(fulfilled.length + rejected.length, 2);
  assert.equal(fulfilled.filter((item) => item.value.result?.status === "SUCCEEDED").length, 1);
  if (rejected.length > 0) assert.match(rejected[0].reason.message, /SYNTHETIC_REVISION_CONFLICT/);
  const saved = await store.load(scope);
  assert.equal(saved.actionState.recentTerminalActions.length, 1);
  assert.equal(saved.actionState.recentTerminalActions[0].finalStatus, "SUCCEEDED");
});

test("cancelamento e reset antes da execução impedem a fila", async () => {
  const action = createActionFixture({
    actionType: "CREATE_BOOKING",
    confirmationPolicy: "EXPLICIT_CUSTOMER_CONFIRMATION",
    args: { date: "2026-07-16", time: "14:00" },
    requiredParameters: ["date", "time"],
  });
  const store = await createStore(action);
  const cancelled = await new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    undefined,
    environment,
    () => now,
  ).cancel(
    {
      scope,
      actionId: action.actionId,
      normalizedArguments: { date: "2026-07-16", time: "14:00" },
      confirmation: action.confirmation,
      internalMessageId: "message-cancel",
      currentTime: now,
    },
    "RESET_OCCURRED",
  );
  assert.equal(cancelled.manifest.syntheticExecutionStatus, "CANCELLED");
  assert.equal(cancelled.state.actionState.recentTerminalActions[0].finalStatus, "CANCELLED");
  const blocked = await new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    undefined,
    environment,
    () => now,
  ).execute({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16", time: "14:00" },
    confirmation: action.confirmation,
    internalMessageId: "message-after-reset",
    currentTime: now,
  });
  assert.equal(blocked.result.status, "DUPLICATE_SUPPRESSED");
  assert.equal(blocked.manifest.syntheticExecutionStatus, "DUPLICATE_SUPPRESSED");
});

test("restart com EXECUTION_QUEUED retoma a execução sem nova proposta", async () => {
  const action = createActionFixture({
    actionType: "READ_AVAILABILITY",
    confirmationPolicy: "NONE",
    args: { date: "2026-07-16" },
  });
  const queuedEvent = createRuntimeActionStateEvent({
    scope,
    action: action.state.actionState.activeAction,
    eventType: "EXECUTION_REQUESTED",
    nextStatus: "EXECUTION_QUEUED",
    internalMessageId: "message-queued",
    timestamp: now.toISOString(),
    reason: "EXECUTION_QUEUED",
    metadata: { confirmationPolicy: "NONE" },
  });
  const queuedActionState = reduceRuntimeActionState(action.state.actionState, queuedEvent, {
    scope,
    currentTime: now,
  });
  action.state.actionState = queuedActionState;
  const store = await createStore(action);
  const result = await new RuntimeV2SyntheticExecutionOrchestrator(
    store,
    undefined,
    environment,
    () => now,
  ).execute({
    scope,
    actionId: action.actionId,
    normalizedArguments: { date: "2026-07-16" },
    internalMessageId: "message-after-restart",
    currentTime: now,
  });
  assert.equal(result.result.status, "SUCCEEDED");
  assert.equal(result.state.actionState.recentActionEvents.length, 4);
});

test("identity de execução não depende de timestamp ou ordem de Promise", () => {
  const input = {
    actionId: "action-synthetic",
    toolName: "synthetic.booking",
    toolVersion: "1",
    argumentsHash: "a".repeat(64),
    attemptNumber: 1,
    contextVersion: 1,
  };
  assert.equal(createSyntheticExecutionId(input), createSyntheticExecutionId({ ...input }));
  assert.notEqual(
    createSyntheticExecutionId(input),
    createSyntheticExecutionId({ ...input, attemptNumber: 2 }),
  );
});

test("guard arquitetural não importa executores ou clientes reais", () => {
  const source = readFileSync(
    new URL("../src/runtime-v2/synthetic-execution.ts", import.meta.url),
    "utf8",
  );
  for (const forbidden of [
    "GoogleCalendarService",
    "GoogleCalendarOAuthService",
    "CustomWebhookService",
    "ChatwootService",
    "fetch(",
    "axios",
    "openai",
    "anthropic",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
