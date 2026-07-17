import assert from "node:assert/strict";
import test from "node:test";
import {
  RuntimeV2ShadowOrchestrator,
  createEmptyRuntimeHandoffState,
  createV1HandoffObservation,
  applyHandoffTurn,
  evaluateHandoffCompatibility,
  transitionHandoffStatus,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "company-handoff-test",
  assistantId: "assistant-handoff-test",
  conversationId: "conversation-handoff-test",
  contactId: "contact-handoff-test",
  contextVersion: 1,
  runtimeVersion: "V2",
  mode: "SHADOW",
};
const now = new Date("2026-07-16T12:00:00.000Z");

function observation(overrides = {}) {
  return createV1HandoffObservation({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    contactId: scope.contactId,
    contextVersion: scope.contextVersion,
    internalMessageId: "message-handoff-1",
    flowId: "flow-support",
    handoffPendingObserved: true,
    reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    customerRequested: true,
    humanActiveObserved: false,
    aiActiveObserved: true,
    pausedByHumanObserved: false,
    requestedTargetType: "ANY_HUMAN",
    requestedTargetIdHash: null,
    collectedContextKeys: ["handoff_pending", "customer_requested_human"],
    contextHash: "",
    provenance: {
      source: "V1_PIPELINE",
      sourceMessageId: "message-handoff-1",
      sourceFlowId: "flow-support",
      sourceVersion: "test",
      reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    },
    ...overrides,
  });
}

function stateAfter(input = {}) {
  return applyHandoffTurn({
    scope,
    state: input.state,
    observation: Object.prototype.hasOwnProperty.call(input, "observation")
      ? input.observation
      : observation(),
    currentTime: input.currentTime ?? now,
    internalMessageId: input.internalMessageId ?? "message-handoff-1",
    reset: input.reset,
  });
}

test("handoff observation and proposal IDs are deterministic and metadata-only", () => {
  const first = observation();
  const second = observation();
  assert.equal(first.observationId, second.observationId);
  const firstState = stateAfter();
  const secondState = stateAfter();
  assert.equal(firstState.request.handoffId, secondState.request.handoffId);
  assert.equal(firstState.after.activeHandoff.status, "HANDOFF_READY");
  assert.deepEqual(
    firstState.after.recentHandoffEvents.map((event) => event.eventType),
    ["HANDOFF_PROPOSED", "HANDOFF_READY", "HANDOFF_OBSERVATION_RECEIVED"],
  );
  const serialized = JSON.stringify(firstState.after);
  assert.equal(serialized.includes("message integral"), false);
  assert.equal(serialized.includes("prompt"), false);
  assert.equal(serialized.includes("token"), false);
  assert.equal(firstState.after.activeHandoff.redactionApplied, true);
});

test("uma mensagem duplicada gera apenas observation event, sem nova proposta", () => {
  const first = stateAfter();
  const duplicate = stateAfter({ state: first.after });
  assert.equal(duplicate.compatibility, "SAME_HANDOFF");
  assert.equal(duplicate.events.length, 1);
  assert.equal(duplicate.events[0].eventType, "HANDOFF_OBSERVATION_RECEIVED");
  assert.equal(duplicate.after.activeHandoff.handoffId, first.after.activeHandoff.handoffId);
  assert.equal(duplicate.after.recentTerminalHandoffs.length, 0);
});

test("apenas uma proposta permanece ativa e uma nova proposta substitui a anterior", () => {
  const first = stateAfter();
  const secondObservation = observation({
    internalMessageId: "message-handoff-2",
    reasonCode: "TOOL_FAILED",
    customerRequested: false,
    collectedContextKeys: ["tool_failed"],
  });
  const second = stateAfter({
    state: first.after,
    observation: secondObservation,
    internalMessageId: "message-handoff-2",
  });
  assert.notEqual(second.after.activeHandoff.handoffId, first.after.activeHandoff.handoffId);
  assert.equal(second.after.recentTerminalHandoffs.length, 1);
  assert.equal(second.after.recentTerminalHandoffs[0].finalStatus, "HANDOFF_SUPERSEDED");
});

test("reset invalida o handoff sem executar operação Chatwoot", () => {
  const first = stateAfter();
  const reset = stateAfter({
    state: first.after,
    observation: null,
    reset: true,
    internalMessageId: "message-reset-1",
  });
  assert.equal(reset.after.activeHandoff, null);
  assert.equal(reset.after.recentTerminalHandoffs[0].finalStatus, "HANDOFF_CANCELLED");
  assert.equal(reset.events[0].eventType, "HANDOFF_INVALIDATED_BY_RESET");
});

test("contextVersion diferente e escopo diferente não reutilizam confirmação/estado", () => {
  const first = stateAfter();
  for (const field of ["companyId", "assistantId", "conversationId", "contextVersion"]) {
    const nextContext = {
      ...scope,
      [field]: field === "contextVersion" ? 2 : `${scope[field]}-other`,
    };
    const incompatible = applyHandoffTurn({
      scope: nextContext,
      state: first.after,
      observation: observation({
        companyId: nextContext.companyId,
        assistantId: nextContext.assistantId,
        conversationId: nextContext.conversationId,
        contextVersion: nextContext.contextVersion,
      }),
      currentTime: now,
    });
    assert.equal(incompatible.errorCode, "HANDOFF_SCOPE_MISMATCH");
  }
  assert.equal(
    evaluateHandoffCompatibility(first.after.activeHandoff, { contextVersion: 2 }),
    "CONTEXT_VERSION_CHANGED",
  );
  assert.throws(
    () => transitionHandoffStatus("HANDOFF_CANCELLED", "HANDOFF_READY"),
    /HANDOFF_INVALID_TRANSITION/,
  );
});

test("humano ativo cancela proposta e não abre nova operação", () => {
  const first = stateAfter();
  const activeHuman = stateAfter({
    state: first.after,
    observation: observation({
      internalMessageId: "human-message-1",
      handoffPendingObserved: false,
      customerRequested: false,
      humanActiveObserved: true,
      aiActiveObserved: false,
      pausedByHumanObserved: true,
      reasonCode: "HUMAN_ALREADY_ACTIVE",
    }),
    internalMessageId: "human-message-1",
  });
  assert.equal(activeHuman.after.activeHandoff, null);
  assert.equal(activeHuman.after.recentTerminalHandoffs[0].reason, "HUMAN_ALREADY_ACTIVE");
  assert.equal(activeHuman.after.recentTerminalHandoffs[0].finalStatus, "HANDOFF_CANCELLED");
});

test("flag OFF não cria observação nem estado no Shadow", async () => {
  const store = undefined;
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    store,
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_HANDOFF_STATE_MODE: "OFF",
      RUNTIME_V2_EVIDENCE_MODE: "OFF",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
    },
    () => now,
  );
  const result = await orchestrator.process({
    scope: { ...scope },
    correlationId: "correlation-handoff-off",
    internalMessageId: "message-handoff-off",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "pedido estruturado",
    v1HandoffObservation: observation({ internalMessageId: "message-handoff-off" }),
  });
  assert.equal(result.enabled, true);
  assert.equal(result.manifest.handoff, undefined);
  assert.equal(result.state.handoffState, null);
  assert.equal(result.manifest.chatwootMutationPerformed, undefined);
});

test("SHADOW_STATE persiste somente metadata e mantém todas as mutações Chatwoot falsas", async () => {
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    undefined,
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_HANDOFF_STATE_MODE: "SHADOW_STATE",
      RUNTIME_V2_EVIDENCE_MODE: "OFF",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
    },
    () => now,
  );
  const result = await orchestrator.process({
    scope: { ...scope },
    correlationId: "correlation-handoff-shadow",
    internalMessageId: "message-handoff-shadow",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "pedido estruturado",
    v1HandoffObservation: observation({ internalMessageId: "message-handoff-shadow" }),
  });
  assert.equal(result.manifest.handoff.handoffStateMode, "SHADOW_STATE");
  assert.equal(result.manifest.handoff.activeHandoffStatus, "HANDOFF_READY");
  assert.equal(result.manifest.handoff.handoffExecutionPerformed, false);
  assert.equal(result.manifest.handoff.chatwootMutationPerformed, false);
  assert.equal(result.manifest.handoff.labelApplied, false);
  assert.equal(result.manifest.handoff.assignmentChanged, false);
  assert.equal(result.manifest.handoff.conversationStatusChanged, false);
  assert.equal(result.manifest.handoff.aiActiveChanged, false);
  assert.equal(result.manifest.handoff.outboundSent, false);
  assert.equal(JSON.stringify(result.state.handoffState).includes("pedido estruturado"), false);
});

test("SHADOW_STATE ocioso não materializa estado de handoff sem sinal V1", async () => {
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    undefined,
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_HANDOFF_STATE_MODE: "SHADOW_STATE",
      RUNTIME_V2_EVIDENCE_MODE: "OFF",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
    },
    () => now,
  );
  const result = await orchestrator.process({
    scope: { ...scope },
    correlationId: "correlation-handoff-idle",
    internalMessageId: "message-handoff-idle",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "pergunta sem handoff",
    v1HandoffObservation: null,
  });
  assert.equal(result.state.handoffState, null);
  assert.equal(result.manifest.handoff.activeHandoffPresent, false);
  assert.deepEqual(result.manifest.handoff.handoffEventIds, []);
});

test("handoff state começa vazio com referências terminais limitadas", () => {
  const empty = createEmptyRuntimeHandoffState(now);
  assert.equal(empty.activeHandoff, null);
  assert.deepEqual(empty.recentTerminalHandoffs, []);
  assert.deepEqual(empty.recentHandoffEventIds, []);
  assert.deepEqual(empty.recentHandoffEvents, []);
});
