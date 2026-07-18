import assert from "node:assert/strict";
import test from "node:test";
import { ResponseGenerationRouter } from "../dist/assistant-conversations/response-generation-router.js";

function v1Response(overrides = {}) {
  return {
    owner: "V1",
    strategy: "STANDARD",
    responseText: "resposta V1",
    providerCallCount: 1,
    providerMetadata: { provider: "fake", model: "fake-model" },
    toolCallCount: 0,
    toolExecutionMetadata: { loopCount: 0 },
    handoffRequired: false,
    requiresHuman: false,
    autoRespond: null,
    generationMetadata: {
      finalAction: null,
      outcome: null,
      triageValidationPassed: null,
      triageAttemptCount: null,
      triageResolved: null,
    },
    sanitizedTelemetry: { strategy: "STANDARD", providerCallCount: 1, toolCallCount: 0 },
    errorStage: null,
    ...overrides,
  };
}

function createHarness(response = v1Response()) {
  const calls = [];
  const router = new ResponseGenerationRouter({
    executeV1: async (input) => {
      calls.push(input);
      return response;
    },
  });
  return { calls, router };
}

function input(overrides = {}) {
  return {
    turn: {
      companyId: "company-1",
      assistantId: "assistant-1",
      conversationId: "conversation-1",
      internalMessageId: "message-1",
      canonicalComparisonHash: "hash-1",
      canonicalVersion: "canonical-inbound-message-v1",
    },
    v1Input: { triageMode: false },
    ...overrides,
  };
}

test("router executes V1 once and returns a V1_NORMAL execution envelope", async () => {
  const { calls, router } = createHarness();
  const result = await router.route(input());

  assert.equal(calls.length, 1);
  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(result.route, "V1_DEFAULT");
  assert.equal(result.strategy, "STANDARD");
  assert.equal(result.responseText, v1Response().responseText);
  assert.deepEqual(result.generatedResponse, v1Response());
  assert.equal(result.outboundAllowed, true);
  assert.deepEqual(Object.keys(result.sanitizedTelemetry).sort(), [
    "decision",
    "executionOwner",
    "providerCallCount",
    "reason",
    "route",
    "strategy",
    "toolCallCount",
  ]);
});

test("router preserves FLOW_BYPASS, TRIAGE, and STANDARD strategies in the envelope", async () => {
  for (const strategy of ["FLOW_BYPASS", "TRIAGE", "STANDARD"]) {
    const response = v1Response({
      strategy,
      sanitizedTelemetry: { strategy, providerCallCount: 1, toolCallCount: 0 },
    });
    const { router } = createHarness(response);
    const result = await router.route(input());

    assert.equal(result.strategy, strategy);
    assert.equal(result.generatedResponse.strategy, strategy);
  }
});

test("router propagates V1 errors without fallback or a second execution", async () => {
  let calls = 0;
  const router = new ResponseGenerationRouter({
    executeV1: async () => {
      calls += 1;
      throw new Error("V1 unavailable");
    },
  });

  await assert.rejects(() => router.route(input()), /V1 unavailable/);
  assert.equal(calls, 1);
});

test("missing, OFF, invalid, and empty execution scope remain V1_DEFAULT", async () => {
  for (const [options, reason] of [
    [{}, "EXECUTION_MODE_OFF"],
    [{ executionMode: "OFF" }, "EXECUTION_MODE_OFF"],
    [{ executionMode: "invalid" }, "EXECUTION_MODE_OFF"],
    [
      {
        executionMode: "CONTROLLED",
        executionAssistantIds: [],
        executionConversationIds: [],
      },
      "EXECUTION_SCOPE_EMPTY",
    ],
  ]) {
    const { calls, router } = createHarness();
    const result = await router.route(input(options));

    assert.equal(result.route, "V1_DEFAULT");
    assert.equal(result.sanitizedTelemetry.reason, reason);
    assert.equal(calls.length, 1);
  }
});

test("even a populated future execution scope remains disconnected and redacted", async () => {
  const { calls, router } = createHarness();
  const result = await router.route(
    input({
      executionMode: "CONTROLLED",
      executionAssistantIds: ["assistant-1"],
      executionConversationIds: ["conversation-1"],
    }),
  );

  assert.equal(result.route, "V1_DEFAULT");
  assert.equal(result.sanitizedTelemetry.reason, "V2_EXECUTION_NOT_CONNECTED");
  assert.deepEqual(Object.keys(result.sanitizedTelemetry).sort(), [
    "decision",
    "executionOwner",
    "providerCallCount",
    "reason",
    "route",
    "strategy",
    "toolCallCount",
  ]);
  assert.equal(calls.length, 1);
});
