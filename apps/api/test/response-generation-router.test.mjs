import assert from "node:assert/strict";
import test from "node:test";
import { ResponseGenerationRouter } from "../dist/assistant-conversations/response-generation-router.js";
import { createRuntimeV2ResponseExecutionApproval } from "../dist/runtime-v2/index.js";
import {
  buildResponseExecutionConversationContext,
  resolveResponseExecutionIntent,
} from "../dist/runtime-v2/index.js";

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

function controlledInput(overrides = {}) {
  const semanticDecision = resolveResponseExecutionIntent({
    canonicalMessage: "Que horas voces atendem de segunda a sexta?",
    messageId: "message-1",
  });
  return input({
    executionMode: "CONTROLLED",
    executionAssistantIds: ["assistant-1"],
    executionConversationIds: ["conversation-1"],
    v2Eligibility: {
      standardEligible: true,
      category: "businessHours",
      authority: "OFFICIAL_CONTEXT",
      semanticDecision,
      flowEvaluation: {
        v2Compatibility: "ALLOWED",
        flowConfigurationFingerprint: "flow-config-1",
      },
    },
    ...overrides,
  });
}

function approval() {
  const semanticDecision = resolveResponseExecutionIntent({
    canonicalMessage: "Que horas voces atendem de segunda a sexta?",
    messageId: "message-1",
  });
  return createRuntimeV2ResponseExecutionApproval({
    companyId: "company-1",
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    expectedCanonicalComparisonHash: "hash-1",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "isolated router test",
    semanticDecisionVersion: semanticDecision.version,
    expectedSemanticDecisionFingerprint: semanticDecision.fingerprint,
    expectedIntent: semanticDecision.intent,
    flowConfigurationFingerprint: "flow-config-1",
  });
}

function approvedBusinessHoursDecision() {
  return resolveResponseExecutionIntent({
    canonicalMessage: "Que horas voces atendem de segunda a sexta?",
    messageId: "message-1",
  });
}

function compatibleFlowEvaluation() {
  return {
    v2Compatibility: "ALLOWED_WITH_FLOW_CONTEXT",
    flowConfigurationFingerprint: "flow-config-compatible",
    selectedFlowFingerprint: "flow-compatible",
    selectedFlowVersionFingerprint: "flow-version-compatible",
    flowMatchType: "KEYWORD_SCORED",
    declarativeContextFingerprint: "flow-instructions-compatible",
  };
}

function fakeCoordinator(input = {}) {
  const armed = input.approval ?? approval();
  return {
    async loadApproval() {
      input.onLoad?.();
      return armed;
    },
    async claim({ approval: claimedApproval }) {
      input.onClaim?.();
      return (
        input.claimResult ?? {
          status: "CLAIMED",
          approval: {
            ...claimedApproval,
            status: "CLAIMED",
            internalMessageId: "message-1",
            claimedAt: new Date().toISOString(),
            generationId: "generation-1",
          },
          generationId: "generation-1",
        }
      );
    },
    async beginV2Generation() {
      input.onBeginGeneration?.();
      return true;
    },
    async approveV2Candidate() {
      input.onApproveCandidate?.();
      return true;
    },
    async beginV1Fallback() {
      input.onFallback?.();
      return true;
    },
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

test("populated scope without a coordinator remains default-deny", async () => {
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

test("eligible single-use approval claims before V2 fake and suppresses V1", async () => {
  let v1 = 0;
  let v2 = 0;
  let claims = 0;
  const armed = approval();
  const router = new ResponseGenerationRouter({
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    coordinator: fakeCoordinator({ approval: armed, onClaim: () => (claims += 1) }),
    v2Executor: {
      execute: async () => {
        v2 += 1;
        return {
          responseText: "Horário oficial de teste.",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
        };
      },
    },
  });

  const result = await router.route(controlledInput());
  assert.deepEqual([claims, v2, v1], [1, 1, 0]);
  assert.equal(result.executionOwner, "V2_PRIMARY");
  assert.equal(result.route, "V2_SINGLE_USE");
  assert.equal(result.generationId, "generation-1");
  assert.equal(result.allowedCategory, "businessHours");
  assert.equal(result.allowedAuthority, "OFFICIAL_CONTEXT");
  assert.equal(result.candidateStatus, "CANDIDATE_APPROVED");
});

test("handoff explícito tem precedência e não entra no handler primário de horários", async () => {
  const handoffDecision = resolveResponseExecutionIntent({
    canonicalMessage: "Quero falar com humano, vocês estão abertos?",
    messageId: "message-1",
  });
  let approvalLookups = 0;
  let v2Calls = 0;
  const calls = [];
  const router = new ResponseGenerationRouter({
    executeV1: async (value) => {
      calls.push(value);
      return v1Response({ handoffRequired: true });
    },
    coordinator: {
      async loadApproval() {
        approvalLookups += 1;
        throw new Error("não deve carregar approval para handoff");
      },
    },
    v2Executor: {
      async execute() {
        v2Calls += 1;
        throw new Error("não deve executar V2 para handoff");
      },
    },
  });

  const result = await router.route(
    controlledInput({
      v2Eligibility: {
        standardEligible: false,
        category: handoffDecision.category,
        authority: handoffDecision.authority,
        semanticDecision: handoffDecision,
        flowEvaluation: { v2Compatibility: "ALLOWED", flowConfigurationFingerprint: "flow-config-1" },
      },
    }),
  );

  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(calls.length, 1);
  assert.equal(approvalLookups, 0);
  assert.equal(v2Calls, 0);
});

test("router default-denies a semantic decision that differs from the approval before claim", async () => {
  let claims = 0;
  let v2 = 0;
  const armed = approval();
  const router = new ResponseGenerationRouter({
    coordinator: fakeCoordinator({
      approval: armed,
      onClaim: () => {
        claims += 1;
      },
    }),
    executeV1: async () => v1Response(),
    v2Executor: {
      async execute() {
        v2 += 1;
        throw new Error("must not execute");
      },
    },
  });
  const mismatchedDecision = resolveResponseExecutionIntent({
    canonicalMessage: "Qual é o horário de funcionamento?",
    messageId: "message-1",
  });
  const result = await router.route(
    controlledInput({
      v2Eligibility: {
        standardEligible: true,
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        semanticDecision: { ...mismatchedDecision, fingerprint: "semantic-mismatch" },
        flowEvaluation: {
          v2Compatibility: "ALLOWED",
          flowConfigurationFingerprint: "flow-config-1",
        },
      },
    }),
  );
  assert.equal(result.route, "V1_DEFAULT");
  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(result.sanitizedTelemetry.reason, "RESPONSE_EXECUTION_SEMANTIC_MISMATCH");
  assert.equal(claims, 0);
  assert.equal(v2, 0);
});

test("router emits a contextual mismatch and does not claim a versioned follow-up approval", async () => {
  const context = buildResponseExecutionConversationContext({
    contextVersion: 1,
    messages: [
      { id: "direct", role: "user", content: "Que horas vocês atendem?", contextVersion: 1 },
    ],
  });
  const decision = resolveResponseExecutionIntent({
    canonicalMessage: "E até que horas?",
    messageId: "message-1",
    contextVersion: 1,
    conversationContext: context,
  });
  const armed = createRuntimeV2ResponseExecutionApproval({
    companyId: "company-1",
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    expectedCanonicalComparisonHash: "hash-1",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "context mismatch",
    semanticDecisionVersion: decision.version,
    expectedSemanticDecisionFingerprint: decision.fingerprint,
    expectedIntent: decision.intent,
    contextResolutionVersion: decision.contextResolutionVersion,
    expectedContextFingerprint: "different-context",
    expectedAntecedentFingerprint: decision.antecedentFingerprint,
    expectedAntecedentCategory: decision.antecedentCategory,
    expectedAntecedentIntent: decision.antecedentIntent,
    contextualResolution: decision.contextualResolution,
    flowConfigurationFingerprint: "flow-config-1",
  });
  let claims = 0;
  const router = new ResponseGenerationRouter({
    coordinator: fakeCoordinator({
      approval: armed,
      onClaim: () => {
        claims += 1;
      },
    }),
    executeV1: async () => v1Response(),
    v2Executor: {
      async execute() {
        throw new Error("must not execute");
      },
    },
  });
  const result = await router.route(
    controlledInput({
      v2Eligibility: {
        standardEligible: true,
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        semanticDecision: decision,
        flowEvaluation: {
          v2Compatibility: "ALLOWED",
          flowConfigurationFingerprint: "flow-config-1",
        },
      },
    }),
  );
  assert.equal(result.sanitizedTelemetry.reason, "RESPONSE_EXECUTION_CONTEXT_MISMATCH");
  assert.equal(claims, 0);
});

test("router claims a follow-up approval after an earlier V1 follow-up when the persisted context fingerprint is intact", async () => {
  const context = buildResponseExecutionConversationContext({
    contextVersion: 1,
    messages: [
      {
        id: "direct",
        role: "user",
        content: "Que horas vocês atendem de segunda a sexta?",
        contextVersion: 1,
      },
      {
        id: "direct-answer",
        role: "assistant",
        content: "Resposta de horário.",
        contextVersion: 1,
      },
      {
        id: "previous-follow-up",
        role: "user",
        content: "E até que horas vocês atendem?",
        contextVersion: 1,
      },
      {
        id: "previous-v1-answer",
        role: "assistant",
        content: "Resposta V1 de horário.",
        contextVersion: 1,
      },
    ],
  });
  const decision = resolveResponseExecutionIntent({
    canonicalMessage: "E até que horas vocês atendem?",
    messageId: "message-1",
    contextVersion: 1,
    conversationContext: context,
  });
  const armed = createRuntimeV2ResponseExecutionApproval({
    companyId: "company-1",
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    expectedCanonicalComparisonHash: "hash-1",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "follow-up after V1",
    semanticDecisionVersion: decision.version,
    expectedSemanticDecisionFingerprint: decision.fingerprint,
    expectedIntent: decision.intent,
    contextResolutionVersion: decision.contextResolutionVersion,
    expectedContextFingerprint: decision.contextFingerprint,
    expectedAntecedentFingerprint: decision.antecedentFingerprint,
    expectedAntecedentCategory: decision.antecedentCategory,
    expectedAntecedentIntent: decision.antecedentIntent,
    contextualResolution: decision.contextualResolution,
    flowConfigurationFingerprint: "flow-config-1",
  });
  let claims = 0;
  let v1 = 0;
  let v2 = 0;
  const router = new ResponseGenerationRouter({
    coordinator: fakeCoordinator({ approval: armed, onClaim: () => (claims += 1) }),
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    v2Executor: {
      async execute() {
        v2 += 1;
        return {
          responseText: "Até o horário oficial de encerramento.",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
        };
      },
    },
  });
  const result = await router.route(
    controlledInput({
      v2Eligibility: {
        standardEligible: true,
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        semanticDecision: decision,
        flowEvaluation: {
          v2Compatibility: "ALLOWED",
          flowConfigurationFingerprint: "flow-config-1",
        },
      },
    }),
  );

  assert.deepEqual([claims, v2, v1], [1, 1, 0]);
  assert.equal(result.route, "V2_SINGLE_USE");
  assert.equal(result.executionOwner, "V2_PRIMARY");
});

test("V2 fake failure falls back once to V1 before any sender", async () => {
  let v1 = 0;
  let v2 = 0;
  const router = new ResponseGenerationRouter({
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    coordinator: fakeCoordinator({
      claimResult: {
        status: "CLAIMED",
        approval: { ...approval(), status: "CLAIMED", internalMessageId: "message-1" },
        generationId: "generation-fallback",
      },
    }),
    v2Executor: {
      execute: async () => {
        v2 += 1;
        throw new Error("V2_PROVIDER_FAILED");
      },
    },
  });

  const result = await router.route(controlledInput());
  assert.deepEqual([v2, v1], [1, 1]);
  assert.equal(result.executionOwner, "V1_FALLBACK");
  assert.equal(result.route, "V2_SINGLE_USE");
  assert.equal(result.sanitizedTelemetry.decision, "V1_FALLBACK");
});

test("triage and other operationally ineligible turns stay V1 without an approval lookup", async () => {
  let lookups = 0;
  const router = new ResponseGenerationRouter({
    executeV1: async () => v1Response({ strategy: "TRIAGE" }),
    coordinator: fakeCoordinator({ onLoad: () => (lookups += 1) }),
    v2Executor: {
      execute: async () => {
        throw new Error("must not execute");
      },
    },
  });
  const result = await router.route(
    controlledInput({
      v2Eligibility: { standardEligible: false, category: null, authority: null },
      v1Input: { triageMode: true },
    }),
  );
  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(lookups, 0);
});

test("router rejects a changed flow configuration before claim and falls back safely after claim", async () => {
  let approvalLookups = 0;
  let v1Calls = 0;
  let v2Calls = 0;
  const coordinator = fakeCoordinator({ onLoad: () => (approvalLookups += 1) });
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => {
      v1Calls += 1;
      return v1Response();
    },
    v2Executor: {
      async execute() {
        v2Calls += 1;
        throw new Error("must not execute");
      },
    },
  });
  const changedBeforeClaim = await router.route(
    controlledInput({
      revalidateV2Flow: async () => ({
        v2Compatibility: "ALLOWED",
        flowConfigurationFingerprint: "changed-flow-config",
      }),
    }),
  );
  assert.equal(changedBeforeClaim.executionOwner, "V1_NORMAL");
  assert.equal(approvalLookups, 0);
  assert.equal(v1Calls, 1);

  let checks = 0;
  const changedAfterClaim = await router.route(
    controlledInput({
      revalidateV2Flow: async () => {
        checks += 1;
        return checks === 1
          ? { v2Compatibility: "ALLOWED", flowConfigurationFingerprint: "flow-config-1" }
          : { v2Compatibility: "BLOCKED", flowConfigurationFingerprint: "changed-flow-config" };
      },
    }),
  );
  assert.equal(changedAfterClaim.executionOwner, "V1_FALLBACK");
  assert.equal(v1Calls, 2);
  assert.equal(v2Calls, 0);
});

test("router permits only the approval-bound compatible flow context", async () => {
  const flow = compatibleFlowEvaluation();
  const semanticDecision = approvedBusinessHoursDecision();
  const flowApproval = createRuntimeV2ResponseExecutionApproval({
    companyId: "company-1",
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    expectedCanonicalComparisonHash: "hash-1",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "compatible flow test",
    semanticDecisionVersion: semanticDecision.version,
    expectedSemanticDecisionFingerprint: semanticDecision.fingerprint,
    expectedIntent: semanticDecision.intent,
    flowConfigurationFingerprint: flow.flowConfigurationFingerprint,
    expectedFlowFingerprint: flow.selectedFlowFingerprint,
    expectedFlowVersionFingerprint: flow.selectedFlowVersionFingerprint,
    expectedFlowMatchType: flow.flowMatchType,
    flowCompatibility: "STANDARD_COMPATIBLE",
    declarativeContextFingerprint: flow.declarativeContextFingerprint,
  });
  let v1 = 0;
  let v2 = 0;
  const router = new ResponseGenerationRouter({
    coordinator: fakeCoordinator({ approval: flowApproval }),
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    v2Executor: {
      async execute() {
        v2 += 1;
        return {
          responseText: "Atendemos de segunda a sexta, das 09:00 às 18:00.",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
        };
      },
    },
  });
  const result = await router.route(
    controlledInput({
      v2Eligibility: {
        standardEligible: true,
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        semanticDecision,
        flowEvaluation: flow,
      },
    }),
  );
  assert.equal(result.executionOwner, "V2_PRIMARY");
  assert.equal(v2, 1);
  assert.equal(v1, 0);
});

test("a compatible flow changed after generation falls back before the tail", async () => {
  const flow = compatibleFlowEvaluation();
  const semanticDecision = approvedBusinessHoursDecision();
  const flowApproval = createRuntimeV2ResponseExecutionApproval({
    companyId: "company-1",
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    expectedCanonicalComparisonHash: "hash-1",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "compatible flow tail revalidation",
    semanticDecisionVersion: semanticDecision.version,
    expectedSemanticDecisionFingerprint: semanticDecision.fingerprint,
    expectedIntent: semanticDecision.intent,
    flowConfigurationFingerprint: flow.flowConfigurationFingerprint,
    expectedFlowFingerprint: flow.selectedFlowFingerprint,
    expectedFlowVersionFingerprint: flow.selectedFlowVersionFingerprint,
    expectedFlowMatchType: flow.flowMatchType,
    flowCompatibility: "STANDARD_COMPATIBLE",
    declarativeContextFingerprint: flow.declarativeContextFingerprint,
  });
  let checks = 0;
  let v1 = 0;
  let v2 = 0;
  const router = new ResponseGenerationRouter({
    coordinator: fakeCoordinator({ approval: flowApproval }),
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    v2Executor: {
      async execute() {
        v2 += 1;
        return {
          responseText: "Atendemos de segunda a sexta, das 09:00 às 18:00.",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
        };
      },
    },
  });
  const result = await router.route(
    controlledInput({
      v2Eligibility: {
        standardEligible: true,
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        semanticDecision,
        flowEvaluation: flow,
      },
      revalidateV2Flow: async () => {
        checks += 1;
        return checks < 3
          ? flow
          : { ...flow, selectedFlowVersionFingerprint: "changed-after-generation" };
      },
    }),
  );
  assert.equal(result.executionOwner, "V1_FALLBACK");
  assert.equal(v2, 1);
  assert.equal(v1, 1);
});
