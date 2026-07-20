import assert from "node:assert/strict";
import test from "node:test";
import { ResponseGenerationRouter } from "../dist/assistant-conversations/response-generation-router.js";
import { InMemoryConversationStateStore } from "../dist/runtime-v2/conversation-state-store.js";
import { ConversationStateResponseExecutionStore } from "../dist/runtime-v2/conversation-state-response-execution-store.js";
import { RuntimeV2ResponseExecutionCoordinator } from "../dist/runtime-v2/response-execution-coordinator.js";
import { createRuntimeV2ResponseExecutionApproval } from "../dist/runtime-v2/response-execution-approval.js";
import { resolveRuntimeV2ResponseExecutionApprovalMode } from "../dist/runtime-v2/runtime-v2-feature-flag.js";

const scope = {
  companyId: "company-auto",
  assistantId: "assistant-auto",
  conversationId: "conversation-auto",
};

function createMockAdministration(overrides = {}) {
  return {
    preflight: async (input) => {
      if (overrides.preflightBlocked) {
        return {
          executionConfiguration: { scopeEligibility: overrides.scopeEligibility ?? true },
          preflightStatus: "BLOCKED",
          officialContextStatus: overrides.officialContextStatus ?? "AVAILABLE",
          resolvedCategory: "businessHours",
          resolvedIntent: "ask_business_hours",
          contextualResolution: false,
        };
      }
      return {
        executionConfiguration: { scopeEligibility: overrides.scopeEligibility ?? true },
        preflightStatus: "APPROVED",
        officialContextStatus: overrides.officialContextStatus ?? "AVAILABLE",
        resolvedCategory: "businessHours",
        resolvedIntent: "ask_business_hours",
        contextualResolution: false,
      };
    },
    arm: async (input) => {
      if (overrides.armFails) {
        throw new Error("RESPONSE_EXECUTION_ACTIVE");
      }
      // Simula a criação de uma approval no store
      const store = overrides.store;
      const approval = {
        approvalId: "approval-auto-id",
        companyId: input.companyId,
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        expectedCanonicalComparisonHash: "hash-123",
        canonicalVersion: input.canonicalVersion,
        semanticDecisionVersion: "v1",
        expectedSemanticDecisionFingerprint: "decision-fp",
        expectedIntent: "ask_business_hours",
        contextResolutionVersion: null,
        expectedContextFingerprint: null,
        expectedAntecedentFingerprint: null,
        expectedAntecedentCategory: null,
        expectedAntecedentIntent: null,
        contextualResolution: null,
        expiresAt: new Date(Date.now() + 5000 * 60).toISOString(),
        operatorPurpose: input.operatorPurpose,
        securityRulesFingerprint: "rules-fp",
        securityRulesStatus: "NO_ACTIVE_RULES",
        officialContextFingerprint: "official-fp",
        officialContextStatus: "AVAILABLE",
        flowConfigurationFingerprint: "flow-cfg-fp",
        expectedFlowFingerprint: "flow-fp",
        expectedFlowVersionFingerprint: "flow-ver-fp",
        expectedFlowMatchType: "EXPLICIT_RUNTIME_SCOPE",
        flowCompatibility: "STANDARD_COMPATIBLE",
        declarativeContextFingerprint: "decl-fp",
        creationFingerprint: "create-fp",
        allowedCategory: "businessHours",
        allowedAuthority: "OFFICIAL_CONTEXT",
        status: "ARMED",
        internalMessageId: input.currentInboundMessageId ?? null,
        approvalSource: input.approvalSource ?? "MANUAL",
        generationId: null,
      };
      await store.arm({ approval, contextVersion: 1 });
      return { executionId: "approval-auto-id" };
    },
  };
}

function mockEligibility(overrides = {}) {
  const baseFlow = {
    flowRuntimeScope: "V2_CONTROLLED",
    explicitRuntimeCategory: "businessHours",
    explicitRuntimeIntent: "ask_business_hours",
    explicitRuntimeAuthority: "OFFICIAL_CONTEXT",
    runtimeDirectOnly: true,
    flowScopeCompatibility: "EXPLICIT_V2_MATCH",
    requiresHuman: false,
    toolRequired: false,
    handoffRequired: false,
    fixedMessageApplicable: false,
    autoRespond: true,
    v2Compatibility: "ALLOWED_WITH_FLOW_CONTEXT",
    flowConfigurationFingerprint: "flow-cfg-fp",
    selectedFlowFingerprint: "flow-fp",
    selectedFlowVersionFingerprint: "flow-ver-fp",
    flowMatchType: "EXPLICIT_RUNTIME_SCOPE",
    declarativeContextFingerprint: "decl-fp",
  };
  const baseEligibility = {
    standardEligible: true,
    category: "businessHours",
    authority: "OFFICIAL_CONTEXT",
    semanticDecision: {
      applicable: true,
      version: "v1",
      fingerprint: "decision-fp",
      intent: "ask_business_hours",
      contextualResolution: false,
    },
  };

  // Destructure flowEvaluation from overrides to avoid double-spread overwriting
  const { flowEvaluation: flowOverrides, ...restOverrides } = overrides;

  const finalFlow = flowOverrides ? { ...baseFlow, ...flowOverrides } : baseFlow;

  return {
    ...baseEligibility,
    ...restOverrides,
    flowEvaluation: finalFlow,
  };
}

function testTurn(overrides = {}) {
  return {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    internalMessageId: "msg-1",
    canonicalComparisonHash: "hash-123",
    canonicalVersion: "canonical-inbound-message-v1",
    contextVersion: 1,
    ...overrides,
  };
}

function armedApproval(turn, overrides = {}) {
  return createRuntimeV2ResponseExecutionApproval({
    companyId: turn.companyId,
    assistantId: turn.assistantId,
    conversationId: turn.conversationId,
    expectedCanonicalComparisonHash: turn.canonicalComparisonHash,
    canonicalVersion: turn.canonicalVersion,
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "router test approval",
    semanticDecisionVersion: "v1",
    expectedSemanticDecisionFingerprint: "decision-fp",
    expectedIntent: "ask_business_hours",
    flowConfigurationFingerprint: "flow-cfg-fp",
    expectedFlowFingerprint: "flow-fp",
    expectedFlowVersionFingerprint: "flow-ver-fp",
    expectedFlowMatchType: "EXPLICIT_RUNTIME_SCOPE",
    flowCompatibility: "STANDARD_COMPATIBLE",
    declarativeContextFingerprint: "decl-fp",
    ...overrides,
  });
}

test("approvalMode defaults to MANUAL and fails closed for unknown values", () => {
  assert.equal(resolveRuntimeV2ResponseExecutionApprovalMode({}), "MANUAL");
  assert.equal(
    resolveRuntimeV2ResponseExecutionApprovalMode({
      RUNTIME_V2_RESPONSE_EXECUTION_APPROVAL_MODE: "MANUAL",
    }),
    "MANUAL",
  );
  assert.equal(
    resolveRuntimeV2ResponseExecutionApprovalMode({
      RUNTIME_V2_RESPONSE_EXECUTION_APPROVAL_MODE: "AUTO_SINGLE_USE",
    }),
    "AUTO_SINGLE_USE",
  );
  assert.equal(
    resolveRuntimeV2ResponseExecutionApprovalMode({
      RUNTIME_V2_RESPONSE_EXECUTION_APPROVAL_MODE: "unexpected",
    }),
    "INVALID",
  );
});

test("MANUAL continua sendo o padrão e sem approval desvia para a V1", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const resStore = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store: resStore });
  const administration = createMockAdministration({ store: resStore });

  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => ({
        responseText: "V2 Resp",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
        providerMetadata: { provider: "gemini" },
      }),
    },
    administration,
  });

  const turn = {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    internalMessageId: "msg-1",
    canonicalComparisonHash: "hash-123",
    canonicalVersion: "canonical-inbound-message-v1",
    contextVersion: 1,
  };

  const result = await router.route({
    turn,
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility(),
    revalidateV2Flow: async () => mockEligibility().flowEvaluation,
    v1Input: {},
  });

  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(result.sanitizedTelemetry.reason, "V2_EXECUTION_NOT_CONNECTED");
});

test("AUTO_SINGLE_USE com horário direto cria, claims e executa V2", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const resStore = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store: resStore });
  const administration = createMockAdministration({ store: resStore });

  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => ({
        responseText: "V2 Resp",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
        providerMetadata: { provider: "gemini" },
      }),
    },
    administration,
  });

  const turn = {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    internalMessageId: "msg-1",
    canonicalComparisonHash: "hash-123",
    canonicalVersion: "canonical-inbound-message-v1",
    contextVersion: 1,
  };

  const result = await router.route({
    turn,
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility(),
    revalidateV2Flow: async () => mockEligibility().flowEvaluation,
    approvalMode: "AUTO_SINGLE_USE",
    messageText: "Qual o horário?",
    v1Input: {},
  });

  assert.equal(result.executionOwner, "V2_PRIMARY", JSON.stringify(result.sanitizedTelemetry));
  assert.equal(result.responseText, "V2 Resp");
});

test("AUTO_SINGLE_USE substitui uma approval MANUAL terminal antes do preflight do novo inbound", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const store = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  const priorTurn = testTurn({
    internalMessageId: "manual-inbound",
    canonicalComparisonHash: "manual-hash",
  });
  await store.arm({
    approval: armedApproval(priorTurn, {
      expectedSemanticDecisionFingerprint: "manual-decision-fp",
      internalMessageId: null,
      approvalSource: "MANUAL",
    }),
    contextVersion: 1,
  });
  const priorApproval = await coordinator.loadApproval(priorTurn);
  const claimed = await coordinator.claim({ ...priorTurn, approval: priorApproval });
  assert.equal(claimed.status, "CLAIMED");
  if (claimed.status !== "CLAIMED") throw new Error("Expected the legacy approval to claim.");
  assert.equal(
    await coordinator.beginV2Generation({ ...priorTurn, generationId: claimed.generationId }),
    true,
  );
  assert.equal(
    await coordinator.approveV2Candidate({ ...priorTurn, generationId: claimed.generationId }),
    true,
  );
  assert.equal(
    await coordinator.beforeOutbound({
      ...priorTurn,
      owner: "V2_PRIMARY",
      generationId: claimed.generationId,
    }),
    true,
  );
  assert.equal(
    await coordinator.afterOutboundConfirmed({
      ...priorTurn,
      owner: "V2_PRIMARY",
      generationId: claimed.generationId,
      externalMessageId: "external-manual",
    }),
    true,
  );

  let preflightCalls = 0;
  const administration = createMockAdministration({ store });
  const originalPreflight = administration.preflight;
  administration.preflight = async (input) => {
    preflightCalls += 1;
    return originalPreflight(input);
  };
  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    administration,
    v2Executor: {
      execute: async () => ({
        responseText: "V2 Resp",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
        providerMetadata: {},
      }),
    },
  });
  const result = await router.route({
    turn: testTurn({ internalMessageId: "auto-inbound" }),
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility(),
    revalidateV2Flow: async () => mockEligibility().flowEvaluation,
    approvalMode: "AUTO_SINGLE_USE",
    messageText: "Qual o horário de atendimento?",
    v1Input: {},
  });

  assert.equal(result.executionOwner, "V2_PRIMARY", JSON.stringify(result.sanitizedTelemetry));
  assert.equal(preflightCalls, 1);
});

test("AUTO_SINGLE_USE mantém terminal o replay do mesmo inbound automático", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const store = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  const turn = testTurn({ internalMessageId: "auto-replay-inbound" });
  await store.arm({
    approval: armedApproval(turn, {
      approvalSource: "AUTO_SINGLE_USE",
      internalMessageId: turn.internalMessageId,
    }),
    contextVersion: 1,
  });
  const approval = await coordinator.loadApproval(turn);
  const claimed = await coordinator.claim({ ...turn, approval });
  assert.equal(claimed.status, "CLAIMED");
  if (claimed.status !== "CLAIMED") throw new Error("Expected the AUTO approval to claim.");
  assert.equal(
    await coordinator.beginV2Generation({ ...turn, generationId: claimed.generationId }),
    true,
  );
  assert.equal(
    await coordinator.approveV2Candidate({ ...turn, generationId: claimed.generationId }),
    true,
  );
  assert.equal(
    await coordinator.beforeOutbound({
      ...turn,
      owner: "V2_PRIMARY",
      generationId: claimed.generationId,
    }),
    true,
  );
  assert.equal(
    await coordinator.afterOutboundConfirmed({
      ...turn,
      owner: "V2_PRIMARY",
      generationId: claimed.generationId,
      externalMessageId: "external-auto",
    }),
    true,
  );

  let v1Calls = 0;
  let v2Calls = 0;
  let preflightCalls = 0;
  const administration = createMockAdministration({ store });
  administration.preflight = async () => {
    preflightCalls += 1;
    throw new Error("A terminal replay must not run preflight.");
  };
  const router = new ResponseGenerationRouter({
    executeV1: async () => {
      v1Calls += 1;
      return { responseText: "V1 Resp", providerMetadata: {} };
    },
    coordinator,
    administration,
    v2Executor: {
      execute: async () => {
        v2Calls += 1;
        throw new Error("A terminal replay must not run V2.");
      },
    },
  });
  const result = await router.route({
    turn,
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility(),
    revalidateV2Flow: async () => mockEligibility().flowEvaluation,
    approvalMode: "AUTO_SINGLE_USE",
    messageText: "Qual o horário de atendimento?",
    v1Input: {},
  });

  assert.equal(result.state, "PENDING_OR_TERMINAL");
  assert.equal(preflightCalls, 0);
  assert.equal(v1Calls, 0);
  assert.equal(v2Calls, 0);
});

test("AUTO_SINGLE_USE accepts an exact conversation scope and rejects scope misses before preflight", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const store = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let preflightCalls = 0;
  const administration = createMockAdministration({
    store,
    preflightBlocked: false,
  });
  const originalPreflight = administration.preflight;
  administration.preflight = async (input) => {
    preflightCalls += 1;
    return originalPreflight(input);
  };
  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => ({
        responseText: "V2 Resp",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
        providerMetadata: {},
      }),
    },
    administration,
  });
  const approved = await router.route({
    turn: testTurn({ internalMessageId: "explicit-message" }),
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [scope.conversationId],
    executionConversationScope: "EXPLICIT_CONVERSATIONS",
    v2Eligibility: mockEligibility(),
    revalidateV2Flow: async () => mockEligibility().flowEvaluation,
    approvalMode: "AUTO_SINGLE_USE",
    messageText: "Qual o horário?",
    v1Input: {},
  });
  assert.equal(approved.executionOwner, "V2_PRIMARY");
  assert.equal(preflightCalls, 1);

  const blocked = await router.route({
    turn: testTurn({ conversationId: "not-allowlisted", internalMessageId: "other-message" }),
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [scope.conversationId],
    executionConversationScope: "EXPLICIT_CONVERSATIONS",
    v2Eligibility: mockEligibility(),
    approvalMode: "AUTO_SINGLE_USE",
    messageText: "Qual o horário?",
    v1Input: {},
  });
  assert.equal(blocked.executionOwner, "V1_NORMAL");
  assert.equal(preflightCalls, 1);
});

test("AUTO_SINGLE_USE falha se o approvalMode for inválido", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const resStore = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store: resStore });

  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => ({
        responseText: "V2 Resp",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
        providerMetadata: {},
      }),
    },
  });

  const result = await router.route({
    turn: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      internalMessageId: "msg-1",
      canonicalComparisonHash: "hash-123",
      canonicalVersion: "canonical-inbound-message-v1",
      contextVersion: 1,
    },
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility(),
    approvalMode: "INVALID",
    v1Input: {},
  });

  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(result.sanitizedTelemetry.reason, "AUTO_APPROVAL_MODE_INVALID");
});

test("AUTO_SINGLE_USE falha se o fluxo for inelegível (ex:RequiresHuman)", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const resStore = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store: resStore });

  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => ({
        responseText: "V2 Resp",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
        providerMetadata: {},
      }),
    },
  });

  const result = await router.route({
    turn: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      internalMessageId: "msg-1",
      canonicalComparisonHash: "hash-123",
      canonicalVersion: "canonical-inbound-message-v1",
      contextVersion: 1,
    },
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility({
      flowEvaluation: {
        requiresHuman: true,
      },
    }),
    approvalMode: "AUTO_SINGLE_USE",
    v1Input: {},
  });

  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(result.sanitizedTelemetry.reason, "AUTO_APPROVAL_FLOW_INELIGIBLE");
});

test("AUTO_SINGLE_USE leaves an elliptical follow-up in V1 without creating approval", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const store = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let preflightCalls = 0;
  const administration = createMockAdministration({ store });
  const originalPreflight = administration.preflight;
  administration.preflight = async (input) => {
    preflightCalls += 1;
    return originalPreflight(input);
  };
  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => ({
        responseText: "V2 Resp",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
        providerMetadata: {},
      }),
    },
    administration,
  });
  const result = await router.route({
    turn: testTurn(),
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility({
      semanticDecision: {
        applicable: true,
        version: "v1",
        fingerprint: "decision-fp",
        intent: "ask_business_hours",
        contextualResolution: true,
      },
    }),
    approvalMode: "AUTO_SINGLE_USE",
    messageText: "E até que horas?",
    v1Input: {},
  });
  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(result.sanitizedTelemetry.reason, "AUTO_APPROVAL_FLOW_INELIGIBLE");
  assert.equal(preflightCalls, 0);
  assert.equal(await coordinator.loadApproval(testTurn()), null);
});

test("AUTO_SINGLE_USE cancels an unclaimed approval when the flow changes during arming", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const store = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  const administration = createMockAdministration({ store });
  let evaluations = 0;
  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => {
        throw new Error("must not execute");
      },
    },
    administration,
  });
  const result = await router.route({
    turn: testTurn({ internalMessageId: "flow-change-inbound" }),
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility(),
    revalidateV2Flow: async () => {
      evaluations += 1;
      return evaluations < 2
        ? mockEligibility().flowEvaluation
        : { ...mockEligibility().flowEvaluation, flowConfigurationFingerprint: "changed-flow" };
    },
    approvalMode: "AUTO_SINGLE_USE",
    messageText: "Qual o horário?",
    v1Input: {},
  });
  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(result.sanitizedTelemetry.reason, "AUTO_APPROVAL_FLOW_INELIGIBLE");
  const record = await store.load({ ...testTurn(), contextVersion: 1 });
  assert.equal(record.approval.status, "CANCELLED");
  assert.equal(record.terminalStatus, "TERMINAL_BLOCKED");
});

test("AUTO_SINGLE_USE concorrência: duplo request resolve apenas um V2", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const resStore = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store: resStore });
  const administration = createMockAdministration({ store: resStore });

  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => ({
        responseText: "V2 Resp",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
        providerMetadata: {},
      }),
    },
    administration,
  });

  const turn = {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    internalMessageId: "msg-concur",
    canonicalComparisonHash: "hash-123",
    canonicalVersion: "canonical-inbound-message-v1",
    contextVersion: 1,
  };

  // Executa simultaneamente
  const [res1, res2] = await Promise.all([
    router.route({
      turn,
      executionMode: "CONTROLLED",
      executionAssistantIds: [scope.assistantId],
      executionConversationIds: [],
      executionConversationScope: "ASSISTANT_WIDE",
      v2Eligibility: mockEligibility(),
      revalidateV2Flow: async () => mockEligibility().flowEvaluation,
      approvalMode: "AUTO_SINGLE_USE",
      messageText: "Qual o horário?",
      v1Input: {},
    }),
    router.route({
      turn,
      executionMode: "CONTROLLED",
      executionAssistantIds: [scope.assistantId],
      executionConversationIds: [],
      executionConversationScope: "ASSISTANT_WIDE",
      v2Eligibility: mockEligibility(),
      revalidateV2Flow: async () => mockEligibility().flowEvaluation,
      approvalMode: "AUTO_SINGLE_USE",
      messageText: "Qual o horário?",
      v1Input: {},
    }),
  ]);

  // Apenas um deve conseguir V2_PRIMARY; o outro deve ser SINGLE_USE_PENDING / PENDING_OR_TERMINAL
  const successCount = [res1, res2].filter((r) => r.executionOwner === "V2_PRIMARY").length;
  const deferredCount = [res1, res2].filter(
    (r) => "state" in r && r.state === "PENDING_OR_TERMINAL",
  ).length;

  assert.equal(successCount, 1);
  assert.equal(deferredCount, 1);
});

test("AUTO_SINGLE_USE binds the approval to the exact inbound and never claims another turn", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const store = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  const wrongInboundApproval = armedApproval(testTurn(), {
    approvalSource: "AUTO_SINGLE_USE",
    internalMessageId: "another-inbound",
  });
  await store.arm({ approval: wrongInboundApproval, contextVersion: 1 });
  let v2Calls = 0;
  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => {
        v2Calls += 1;
        return {
          responseText: "V2 Resp",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
          providerMetadata: {},
        };
      },
    },
  });

  const result = await router.route({
    turn: testTurn(),
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility(),
    revalidateV2Flow: async () => mockEligibility().flowEvaluation,
    approvalMode: "AUTO_SINGLE_USE",
    v1Input: {},
  });

  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(result.sanitizedTelemetry.reason, "AUTO_APPROVAL_IDENTITY_UNAVAILABLE");
  assert.equal(v2Calls, 0);
});

test("legacy null context remains compatible, but partial context fails closed before claim", async () => {
  const buildResult = async (approval) => {
    const stateStore = new InMemoryConversationStateStore();
    const store = new ConversationStateResponseExecutionStore(stateStore);
    await store.arm({ approval, contextVersion: 1 });
    const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
    let v1Calls = 0;
    let v2Calls = 0;
    const router = new ResponseGenerationRouter({
      executeV1: async () => {
        v1Calls += 1;
        return { responseText: "V1 Resp", providerMetadata: {} };
      },
      coordinator,
      v2Executor: {
        execute: async () => {
          v2Calls += 1;
          return {
            responseText: "V2 Resp",
            category: "businessHours",
            authority: "OFFICIAL_CONTEXT",
            candidateStatus: "CANDIDATE_APPROVED",
            qualityGateResult: "APPROVED",
            outboundAllowed: true,
            providerMetadata: {},
          };
        },
      },
    });
    const result = await router.route({
      turn: testTurn(),
      executionMode: "CONTROLLED",
      executionAssistantIds: [scope.assistantId],
      executionConversationIds: [],
      executionConversationScope: "ASSISTANT_WIDE",
      v2Eligibility: mockEligibility(),
      revalidateV2Flow: async () => mockEligibility().flowEvaluation,
      v1Input: {},
    });
    return { result, v1Calls, v2Calls };
  };

  const legacy = await buildResult(
    armedApproval(testTurn(), {
      contextResolutionVersion: null,
      expectedContextFingerprint: null,
      expectedAntecedentFingerprint: null,
      expectedAntecedentCategory: null,
      expectedAntecedentIntent: null,
      contextualResolution: null,
    }),
  );
  assert.equal(
    legacy.result.executionOwner,
    "V2_PRIMARY",
    JSON.stringify(legacy.result.sanitizedTelemetry),
  );
  assert.equal(legacy.v1Calls, 0);
  assert.equal(legacy.v2Calls, 1);

  const partial = await buildResult(
    armedApproval(testTurn(), {
      contextResolutionVersion: null,
      expectedContextFingerprint: "unexpected-context-fingerprint",
      expectedAntecedentFingerprint: null,
      expectedAntecedentCategory: null,
      expectedAntecedentIntent: null,
      contextualResolution: null,
    }),
  );
  assert.equal(partial.result.executionOwner, "V1_NORMAL");
  assert.equal(partial.result.sanitizedTelemetry.reason, "RESPONSE_EXECUTION_CONTEXT_MISMATCH");
  assert.equal(partial.v1Calls, 1);
  assert.equal(partial.v2Calls, 0);
});

test("versioned context must match byte-for-byte before the AUTO claim", async () => {
  const turn = testTurn();
  const semanticDecision = {
    version: "v1",
    fingerprint: "decision-fp",
    intent: "ask_business_hours",
    applicable: true,
    contextResolutionVersion: "context-v1",
    contextFingerprint: "context-fingerprint",
    antecedentFingerprint: null,
    antecedentCategory: null,
    antecedentIntent: null,
    contextualResolution: false,
  };
  const stateStore = new InMemoryConversationStateStore();
  const store = new ConversationStateResponseExecutionStore(stateStore);
  await store.arm({
    approval: armedApproval(turn, {
      contextResolutionVersion: semanticDecision.contextResolutionVersion,
      expectedContextFingerprint: semanticDecision.contextFingerprint,
      expectedAntecedentFingerprint: semanticDecision.antecedentFingerprint,
      expectedAntecedentCategory: semanticDecision.antecedentCategory,
      expectedAntecedentIntent: semanticDecision.antecedentIntent,
      contextualResolution: semanticDecision.contextualResolution,
    }),
    contextVersion: 1,
  });
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let v2Calls = 0;
  const router = new ResponseGenerationRouter({
    executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
    coordinator,
    v2Executor: {
      execute: async () => {
        v2Calls += 1;
        return {
          responseText: "V2 Resp",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
          providerMetadata: {},
        };
      },
    },
  });

  const result = await router.route({
    turn,
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [],
    executionConversationScope: "ASSISTANT_WIDE",
    v2Eligibility: mockEligibility({ semanticDecision }),
    revalidateV2Flow: async () => mockEligibility({ semanticDecision }).flowEvaluation,
    approvalMode: "AUTO_SINGLE_USE",
    v1Input: {},
  });
  assert.equal(result.executionOwner, "V2_PRIMARY", JSON.stringify(result.sanitizedTelemetry));
  assert.equal(v2Calls, 1);
});

test("version, context and antecedent mismatches fail closed before a claim", async () => {
  const baseDecision = {
    version: "v1",
    fingerprint: "decision-fp",
    intent: "ask_business_hours",
    applicable: true,
    contextResolutionVersion: "context-v1",
    contextFingerprint: "context-fingerprint",
    antecedentFingerprint: "antecedent-fingerprint",
    antecedentCategory: "businessHours",
    antecedentIntent: "ask_business_hours",
    contextualResolution: true,
  };
  for (const decision of [
    { ...baseDecision, contextResolutionVersion: "context-v2" },
    { ...baseDecision, contextFingerprint: "other-context-fingerprint" },
    { ...baseDecision, antecedentFingerprint: "other-antecedent-fingerprint" },
  ]) {
    const turn = testTurn({ internalMessageId: `mismatch-${decision.contextFingerprint}` });
    const stateStore = new InMemoryConversationStateStore();
    const store = new ConversationStateResponseExecutionStore(stateStore);
    await store.arm({
      approval: armedApproval(turn, {
        contextResolutionVersion: baseDecision.contextResolutionVersion,
        expectedContextFingerprint: baseDecision.contextFingerprint,
        expectedAntecedentFingerprint: baseDecision.antecedentFingerprint,
        expectedAntecedentCategory: baseDecision.antecedentCategory,
        expectedAntecedentIntent: baseDecision.antecedentIntent,
        contextualResolution: baseDecision.contextualResolution,
      }),
      contextVersion: 1,
    });
    const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
    let v2Calls = 0;
    const router = new ResponseGenerationRouter({
      executeV1: async () => ({ responseText: "V1 Resp", providerMetadata: {} }),
      coordinator,
      v2Executor: {
        execute: async () => {
          v2Calls += 1;
          throw new Error("must not execute");
        },
      },
    });
    const result = await router.route({
      turn,
      executionMode: "CONTROLLED",
      executionAssistantIds: [scope.assistantId],
      executionConversationIds: [],
      executionConversationScope: "ASSISTANT_WIDE",
      v2Eligibility: mockEligibility({ semanticDecision: decision }),
      revalidateV2Flow: async () => mockEligibility({ semanticDecision: decision }).flowEvaluation,
      approvalMode: "MANUAL",
      v1Input: {},
    });
    assert.equal(result.executionOwner, "V1_NORMAL");
    assert.equal(result.sanitizedTelemetry.reason, "RESPONSE_EXECUTION_CONTEXT_MISMATCH");
    assert.equal(v2Calls, 0);
  }
});

test("approval JSON round-trip preserves nulls and opaque fingerprints without runtime redaction", () => {
  const approval = armedApproval(testTurn(), {
    contextResolutionVersion: null,
    expectedContextFingerprint: null,
    expectedAntecedentFingerprint: null,
    expectedAntecedentCategory: null,
    expectedAntecedentIntent: null,
    contextualResolution: null,
    expectedSemanticDecisionFingerprint: "opaque-5511999990000-fingerprint",
  });
  const restored = JSON.parse(JSON.stringify(approval));
  assert.equal(restored.contextResolutionVersion, null);
  assert.equal(restored.expectedContextFingerprint, null);
  assert.equal(restored.expectedAntecedentFingerprint, null);
  assert.equal(restored.expectedSemanticDecisionFingerprint, "opaque-5511999990000-fingerprint");
  assert.equal(JSON.stringify(restored).includes("[REDACTED]"), false);
});
