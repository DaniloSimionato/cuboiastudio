import assert from "node:assert/strict";
import { test } from "node:test";
import {
  InMemoryConversationStateStore,
  RuntimeV2ShadowOrchestrator,
  createV1ToolExecutionObservation,
  isRuntimeV2ToolObservationEnabled,
  observationToManifest,
  toolObservationToEvidence,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "company-tool-observation",
  assistantId: "assistant-tool-observation",
  conversationId: "conversation-tool-observation",
  contextVersion: 1,
};
const now = new Date("2026-07-15T12:00:00.000Z");

function observation(overrides = {}) {
  return createV1ToolExecutionObservation({
    scope,
    internalMessageId: "message-tool-1",
    executionAttemptId: "call-tool-1",
    toolName: "calendar_checkAvailability",
    arguments: { endAt: "2026-07-16T15:00:00.000Z", startAt: "2026-07-16T14:00:00.000Z" },
    startedAt: now,
    completedAt: new Date(now.getTime() + 20),
    timeoutMs: 5000,
    executionStarted: true,
    result: JSON.stringify({
      available: true,
      options: [{ startAt: "2026-07-16T14:00:00.000Z", endAt: "2026-07-16T15:00:00.000Z" }],
    }),
    ...overrides,
  });
}

test("observação V1 é determinística, ordena chaves e não inclui argumentos", () => {
  const left = observation();
  const right = observation({
    arguments: { startAt: "2026-07-16T14:00:00.000Z", endAt: "2026-07-16T15:00:00.000Z" },
  });
  assert.equal(left.observationId, right.observationId);
  assert.deepEqual(left.argumentKeys, ["endAt", "startAt"]);
  const manifest = observationToManifest(left);
  assert.equal("arguments" in manifest, false);
  assert.equal("result" in manifest, false);
  assert.equal(manifest.toolObservationRedactionApplied, true);
});

test("Calendar availability vira evidência somente com escopo e validade", () => {
  const result = toolObservationToEvidence({
    observation: observation({
      result: JSON.stringify({
        available: true,
        validFrom: "2026-07-15T11:00:00.000Z",
        validUntil: "2026-07-15T13:00:00.000Z",
      }),
    }),
    scope,
    currentTime: now,
  });
  assert.equal(result.reason, "AUTHORIZED");
  assert.equal(result.evidence?.category, "AVAILABILITY");
  assert.equal(result.evidence?.sourceType, "TOOL_RESULT");
});

test("mutação com timeout fica incerta e não gera evidência positiva", () => {
  const result = toolObservationToEvidence({
    observation: observation({
      toolName: "calendar_createBooking",
      executionAttemptId: "call-booking-timeout",
      arguments: { endAt: "2026-07-16T15:00:00.000Z", startAt: "2026-07-16T14:00:00.000Z" },
      errorCode: "TOOL_TIMEOUT",
      executionStarted: true,
    }),
    scope,
    currentTime: now,
  });
  assert.equal(result.result.status, "TIMED_OUT_UNKNOWN_EFFECT");
  assert.equal(result.result.reconciliationStatus, "PENDING");
  assert.equal(result.reason, "RESULT_NOT_SUCCESSFUL");
  assert.equal(result.evidence, null);
});

test("webhook read e write recebem efeitos distintos", () => {
  const read = observation({
    toolName: "webhook_lookup",
    executionAttemptId: "call-webhook-read",
    metadata: { webhookMethod: "GET", webhookOperationName: "lookup" },
  });
  const write = observation({
    toolName: "webhook_update",
    executionAttemptId: "call-webhook-write",
    metadata: { webhookMethod: "POST", webhookOperationName: "update" },
  });
  assert.equal(read.actionType, "CUSTOM_WEBHOOK_READ");
  assert.equal(read.effectType, "READ_ONLY_EXTERNAL");
  assert.equal(write.actionType, "CUSTOM_WEBHOOK_WRITE");
  assert.equal(write.effectType, "REVERSIBLE_EXTERNAL_MUTATION");
});

test("flag OFF não habilita observação; allowlist exige Shadow", () => {
  assert.equal(
    isRuntimeV2ToolObservationEnabled({ assistantId: scope.assistantId }, {}),
    false,
  );
  assert.equal(
    isRuntimeV2ToolObservationEnabled(
      { assistantId: scope.assistantId },
      {
        RUNTIME_V2_MODE: "SHADOW",
        RUNTIME_V2_TOOL_OBSERVATION_MODE: "SHADOW_METADATA",
        RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
      },
    ),
    true,
  );
});

test("Shadow observa metadata recebida sem executar ferramenta", async () => {
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
      RUNTIME_V2_TOOL_OBSERVATION_MODE: "SHADOW_METADATA",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
    },
    () => now,
  );
  const result = await orchestrator.process({
    scope,
    correlationId: "correlation-tool-1",
    internalMessageId: "message-tool-1",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Vocês têm disponibilidade amanhã?",
    toolObservations: [observation()],
    v1Comparison: {},
  });
  assert.equal(result.manifest?.toolObservationMode, "SHADOW_METADATA");
  assert.equal(result.manifest?.v1ToolExecutionObserved, true);
  assert.equal(result.manifest?.toolObservations.length, 1);
  assert.equal(result.manifest?.providerCalled, false);
  assert.equal(result.manifest?.toolCalls, 0);
  assert.equal(result.manifest?.outboundSent, false);
  assert.equal(result.manifest?.evidence?.winningSourceTypes.includes("TOOL_RESULT"), true);
});
