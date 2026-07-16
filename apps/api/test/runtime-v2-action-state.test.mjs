import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_STATE_CONTRACT_VERSION,
  applyActionExpiration,
  applyStructuredConfirmation,
  buildActionStateManifest,
  createEmptyRuntimeActionState,
  evaluateActionCompatibility,
  invalidateAction,
  proposePendingAction,
  redactRuntimeActionState,
  reduceRuntimeActionState,
  RuntimeV2ShadowOrchestrator,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "company-action-state",
  assistantId: "assistant-action-state",
  conversationId: "conversation-action-state",
  contactId: "contact-action-state",
  contextVersion: 1,
  runtimeVersion: "V2",
  mode: "SHADOW",
};
const now = new Date("2026-07-15T12:00:00.000Z");
const expiresAt = "2026-07-15T12:15:00.000Z";

function proposal(overrides = {}) {
  return {
    contractVersion: 1,
    flowId: "flow-booking",
    intent: "booking",
    proposedActionType: "CREATE_BOOKING",
    requiredParameters: ["date", "time"],
    collectedParameters: ["date"],
    missingParameters: ["time"],
    confirmationPolicy: "EXPLICIT_CUSTOMER_CONFIRMATION",
    toolContext: null,
    provenance: { source: "V2_SHADOW", sourceFlowId: "flow-booking", sourceVersion: "test" },
    ...overrides,
  };
}

function proposedState(overrides = {}) {
  return proposePendingAction({
    scope,
    proposal: proposal(overrides),
    internalMessageId: "message-action-state-1",
    currentTime: now,
    expiresAt,
    normalizedArguments:
      overrides.missingParameters?.length === 0
        ? { date: "2026-07-20", time: "14:00" }
        : { date: "2026-07-20" },
    collectedParameterKeys: ["date"],
    missingParameters: overrides.missingParameters ?? ["time"],
    provenance: { source: "V2_SHADOW", sourceFlowId: "flow-booking", sourceVersion: "test" },
  });
}

test("propõe uma ação determinística e não persiste argumentos integrais", () => {
  const first = proposedState();
  const second = proposedState();
  assert.equal(first.request.actionId, second.request.actionId);
  assert.equal(first.state.activeAction.status, "ACTION_PROPOSED");
  assert.deepEqual(first.state.activeAction.missingParameters, ["time"]);
  assert.equal(first.state.activeAction.redactionApplied, true);
  assert.equal(first.state.recentActionEvents.length, 1);
  assert.equal(JSON.stringify(first.state).includes("2026-07-20"), false);
  assert.equal(JSON.stringify(first.state).includes("normalizedArguments"), false);
});

test("ação completa aguarda confirmação e confirmação válida é vinculada ao hash", () => {
  const proposed = proposedState({
    collectedParameters: ["date", "time"],
    missingParameters: [],
  });
  assert.equal(proposed.state.activeAction.status, "AWAITING_CUSTOMER_CONFIRMATION");
  assert.equal(proposed.state.recentActionEvents.length, 2);
  const result = applyStructuredConfirmation(
    proposed.state,
    {
      signalType: "CONFIRM",
      ...scope,
      confirmingMessageId: "message-confirmation-1",
      actionId: proposed.request.actionId,
      detectedAt: "2026-07-15T12:05:00.000Z",
    },
    { scope, currentTime: new Date("2026-07-15T12:05:00.000Z") },
  );
  assert.equal(result.reason, "CONFIRMATION_REQUIRED");
  assert.equal(result.confirmation.status, "VALIDATED");
  assert.equal(result.confirmation.parametersHash, proposed.request.argumentsHash);
  assert.equal(result.state.activeAction.status, "ACTION_CONFIRMED");
  assert.equal(result.state.activeAction.confirmationState.accepted, true);
});

test("rejeição, expiração, reset e troca de intenção tornam a ação terminal", () => {
  const pending = proposedState({ collectedParameters: ["date", "time"], missingParameters: [] });
  const rejected = applyStructuredConfirmation(
    pending.state,
    {
      signalType: "REJECT",
      ...scope,
      confirmingMessageId: "message-reject-1",
      actionId: pending.request.actionId,
      detectedAt: "2026-07-15T12:05:00.000Z",
    },
    { scope, currentTime: new Date("2026-07-15T12:05:00.000Z") },
  );
  assert.equal(rejected.state.activeAction, null);
  assert.equal(rejected.state.recentTerminalActions[0].finalStatus, "CANCELLED");

  const expired = proposedState({ collectedParameters: ["date", "time"], missingParameters: [] });
  const expiration = applyActionExpiration(
    expired.state,
    { scope, currentTime: new Date(expiresAt) },
    "message-expire-1",
  );
  assert.equal(expiration.reason, "ACTION_EXPIRED");
  assert.equal(expiration.state.recentTerminalActions[0].finalStatus, "EXPIRED");

  const reset = proposedState();
  const invalidated = invalidateAction(
    reset.state,
    { scope, currentTime: new Date("2026-07-15T12:06:00.000Z") },
    "message-reset-1",
    "ACTION_INVALIDATED_BY_RESET",
    "RESET_OCCURRED",
  );
  assert.equal(invalidated.state.activeAction, null);
  assert.equal(invalidated.state.recentTerminalActions[0].reason, "RESET_OCCURRED");
});

test("confirmações fora do escopo, duplicadas ou sem ação não são aceitas", () => {
  const empty = createEmptyRuntimeActionState(now);
  const noAction = applyStructuredConfirmation(
    empty,
    {
      signalType: "CONFIRM",
      ...scope,
      confirmingMessageId: "message-no-action",
      detectedAt: now.toISOString(),
    },
    { scope, currentTime: now },
  );
  assert.equal(noAction.reason, "NO_PENDING_ACTION");

  const pending = proposedState({ collectedParameters: ["date", "time"], missingParameters: [] });
  assert.throws(
    () =>
      applyStructuredConfirmation(
        pending.state,
        {
          signalType: "CONFIRM",
          ...scope,
          companyId: "other-company",
          confirmingMessageId: "message-foreign",
          detectedAt: now.toISOString(),
        },
        { scope, currentTime: now },
      ),
    /ACTION_STATE_SCOPE_MISMATCH/,
  );
  const first = applyStructuredConfirmation(
    pending.state,
    {
      signalType: "CONFIRM",
      ...scope,
      confirmingMessageId: "message-confirm",
      actionId: pending.request.actionId,
      detectedAt: "2026-07-15T12:01:00.000Z",
    },
    { scope, currentTime: new Date("2026-07-15T12:01:00.000Z") },
  );
  assert.equal(first.confirmation.status, "VALIDATED");
  assert.equal(
    applyStructuredConfirmation(
      first.state,
      {
        signalType: "CONFIRM",
        ...scope,
        confirmingMessageId: "message-confirm",
        actionId: pending.request.actionId,
        detectedAt: "2026-07-15T12:02:00.000Z",
      },
      { scope, currentTime: new Date("2026-07-15T12:02:00.000Z") },
    ).reason,
    "CONFIRMATION_MISMATCH",
  );
});

test("reducer rejeita transições inválidas, preserva concorrência lógica e ordena eventos", () => {
  const pending = proposedState();
  const event = pending.state.recentActionEvents[0];
  assert.deepEqual(
    reduceRuntimeActionState(pending.state, event, { scope, currentTime: now }),
    pending.state,
  );
  assert.throws(
    () =>
      reduceRuntimeActionState(
        pending.state,
        { ...event, eventId: "foreign-event", nextStatus: "SUCCEEDED" },
        { scope, currentTime: now },
      ),
    /ACTION_STATE_IDEMPOTENCY_CONFLICT/,
  );
  assert.equal(pending.state.recentTerminalActions.length <= 10, true);
});

test("compatibilidade e manifesto permanecem metadata-only", () => {
  const pending = proposedState();
  assert.equal(
    evaluateActionCompatibility(pending.state.activeAction, {
      contextVersion: 1,
      actionType: "CREATE_BOOKING",
      requestedAction: "PARAMETER_UPDATE",
    }),
    "PARAMETER_UPDATE",
  );
  assert.equal(
    evaluateActionCompatibility(pending.state.activeAction, {
      contextVersion: 1,
      turnIntent: "price",
    }),
    "INCOMPATIBLE_INTENT",
  );
  const manifest = buildActionStateManifest({
    mode: "SHADOW_STATE",
    before: null,
    after: pending.state,
    revisionBefore: 0,
    revisionAfter: 1,
    persisted: true,
  });
  assert.equal(manifest.actionExecutionPerformed, false);
  assert.equal(manifest.actionExternalEffectMayHaveOccurred, false);
  assert.equal(manifest.actionStatePersisted, true);
  const redacted = JSON.stringify(redactRuntimeActionState(pending.state));
  assert.equal(redacted.includes("2026-07-20"), false);
  assert.equal(redacted.includes('"token"'), false);
  assert.equal(redacted.includes('"arguments"'), false);
  assert.equal(redacted.includes(pending.request.argumentsHash), true);
  assert.equal(ACTION_STATE_CONTRACT_VERSION, 1);
});

test("Shadow State mantém uma ação por contexto, sobrevive a turnos e nunca executa", async () => {
  const environment = {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
    RUNTIME_V2_ACTION_STATE_MODE: "SHADOW_STATE",
    RUNTIME_V2_STATE_STORE: "MEMORY",
  };
  const orchestrator = new RuntimeV2ShadowOrchestrator(undefined, environment, () => now);
  const base = {
    scope,
    correlationId: "correlation-action-state",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Quero agendar um atendimento",
  };
  const makeProposal = (messageId, missingParameters) => ({
    ...base,
    internalMessageId: messageId,
    actionProposal: proposal({
      missingParameters,
      collectedParameters: missingParameters.length ? ["date"] : ["date", "time"],
    }),
    actionProposalArguments: missingParameters.length
      ? { date: "2026-07-20" }
      : { date: "2026-07-20", time: "14:00" },
    actionProposalCollectedParameterKeys: missingParameters.length ? ["date"] : ["date", "time"],
    actionProposalMissingParameters: missingParameters,
  });
  const first = await orchestrator.process(makeProposal("action-turn-1", ["time"]));
  assert.equal(first.manifest.actionState.activeActionStatus, "ACTION_PROPOSED");
  assert.equal(first.manifest.actionState.actionStatePersisted, true);
  const second = await orchestrator.process(makeProposal("action-turn-2", ["time"]));
  assert.equal(second.manifest.actionState.activeActionPresent, true);
  assert.equal(second.state.actionState.recentTerminalActions.length, 1);
  const third = await orchestrator.process(makeProposal("action-turn-3", []));
  const actionId = third.state.actionState.activeAction.actionId;
  assert.equal(third.manifest.actionState.activeActionStatus, "AWAITING_CUSTOMER_CONFIRMATION");
  const fourth = await orchestrator.process({
    ...base,
    internalMessageId: "action-turn-4",
    currentMessage: "Confirmo",
    confirmationSignal: {
      signalType: "CONFIRM",
      ...scope,
      actionId,
      confirmingMessageId: "action-turn-4",
      detectedAt: "2026-07-15T12:01:00.000Z",
    },
  });
  assert.equal(fourth.manifest.actionState.activeActionStatus, "ACTION_CONFIRMED");
  assert.equal(fourth.manifest.actionState.actionExecutionPerformed, false);
  assert.equal(fourth.manifest.providerCalled, false);
  assert.equal(fourth.manifest.toolCalls, 0);
  assert.equal(fourth.manifest.outboundSent, false);
  const duplicate = await orchestrator.process({
    ...base,
    internalMessageId: "action-turn-4",
    currentMessage: "Confirmo",
  });
  assert.equal(duplicate.manifest.messageAlreadyProcessed, true);
  assert.equal(duplicate.state.actionState.activeAction.status, "ACTION_CONFIRMED");
});
