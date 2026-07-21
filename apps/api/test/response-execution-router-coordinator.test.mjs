import assert from "node:assert/strict";
import test from "node:test";
import {
  RuntimeV2ResponseExecutionCoordinator,
  createRuntimeV2ResponseExecutionApproval,
  resolveResponseExecutionIntent,
} from "../dist/runtime-v2/index.js";
import { ResponseGenerationRouter } from "../dist/assistant-conversations/response-generation-router.js";
import { ResponseTailLifecycleHooks } from "../dist/assistant-conversations/response-tail-lifecycle-hooks.js";
import { RuntimeV2PrimaryResponseExecutor } from "../dist/assistant-conversations/v2-primary-response-executor.js";
import { buildOfficialBusinessContext } from "../dist/assistants/official-business-context.js";

const turn = {
  companyId: "company-c1",
  assistantId: "assistant-c1",
  conversationId: "conversation-c1",
  internalMessageId: "message-c1",
  contextVersion: 1,
  canonicalComparisonHash: "canonical-hash-c1",
  canonicalVersion: "canonical-inbound-message-v1",
};

const semanticDecision = resolveResponseExecutionIntent({
  canonicalMessage: "Que horas vocês atendem de segunda a sexta?",
  messageId: turn.internalMessageId,
});

function createApproval() {
  return createRuntimeV2ResponseExecutionApproval({
    companyId: turn.companyId,
    assistantId: turn.assistantId,
    conversationId: turn.conversationId,
    expectedCanonicalComparisonHash: turn.canonicalComparisonHash,
    canonicalVersion: turn.canonicalVersion,
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "test-only single-use coordinator integration",
    semanticDecisionVersion: semanticDecision.version,
    expectedSemanticDecisionFingerprint: semanticDecision.fingerprint,
    expectedIntent: semanticDecision.intent,
    flowConfigurationFingerprint: "flow-config-c1",
  });
}

function createStore(approval = createApproval()) {
  let value = {
    approval,
    owner: "V1_OWNED",
    revision: 0,
    contextVersion: turn.contextVersion,
    providerV2CallCount: 0,
    providerV1FallbackCallCount: 0,
    outboundV2Attempted: false,
    outboundV2Performed: false,
    outboundV1Performed: false,
    externalMessageId: null,
    fallbackReason: null,
    reconciliationReason: null,
    terminalStatus: null,
    redactionApplied: true,
  };
  return {
    async load() {
      return structuredClone(value);
    },
    async compareAndSet({ expectedRevision, next }) {
      if (value.revision !== expectedRevision) return false;
      value = structuredClone(next);
      return true;
    },
    value: () => structuredClone(value),
  };
}

function v1Response() {
  return {
    owner: "V1",
    strategy: "STANDARD",
    responseText: "Resposta V1 fake.",
    providerCallCount: 1,
    providerMetadata: { provider: "v1-fake", model: "v1-fake" },
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
  };
}

function routerInput() {
  return {
    turn,
    v1Input: { triageMode: false },
    executionMode: "CONTROLLED",
    executionAssistantIds: [turn.assistantId],
    executionConversationIds: [turn.conversationId],
    v2Eligibility: {
      standardEligible: true,
      category: "businessHours",
      authority: "OFFICIAL_CONTEXT",
      semanticDecision,
      flowEvaluation: {
        v2Compatibility: "ALLOWED",
        flowConfigurationFingerprint: "flow-config-c1",
      },
    },
  };
}

function metadata(envelope) {
  return {
    executionOwner: envelope.executionOwner,
    route: envelope.route,
    strategy: envelope.strategy,
    internalMessageId: turn.internalMessageId,
    generationId: envelope.generationId,
    persistedResponseId: "assistant-response-c1",
    outboundAttempted: true,
    outboundPerformed: "CONFIRMED",
    externalMessageReferenceFingerprint: "fingerprint-c1",
  };
}

test("authorized V2 fake owns one turn and the shared tail consumes the approval", async () => {
  const store = createStore();
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let v1 = 0;
  let v2 = 0;
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    v2Executor: {
      async execute() {
        v2 += 1;
        return {
          responseText: "Horário oficial fake.",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
        };
      },
    },
  });

  const envelope = await router.route(routerInput());
  assert.equal(envelope.executionOwner, "V2_PRIMARY");
  assert.deepEqual([v2, v1], [1, 0]);

  const hooks = new ResponseTailLifecycleHooks(undefined, coordinator, turn);
  await hooks.beforeOutbound(metadata(envelope));
  await hooks.afterOutboundConfirmed(metadata(envelope), "external-fake-c1");

  const persisted = store.value();
  assert.equal(persisted.owner, "V2_OUTBOUND_SENT");
  assert.equal(persisted.terminalStatus, "V2_OUTBOUND_SENT");
  assert.equal(persisted.approval.status, "CONSUMED");
  assert.equal(persisted.providerV2CallCount, 0);
  assert.equal(persisted.outboundV2Attempted, true);
  assert.equal(persisted.outboundV2Performed, true);
  assert.equal(persisted.externalMessageId, "external-fake-c1");
});

test("inbounds reais de domingo e OPEN_NOW percorrem V2 até um único outbound", async () => {
  const schedule = {
    monday: [{ start: "08:00", end: "18:00" }],
    tuesday: [{ start: "08:00", end: "18:00" }],
    wednesday: [{ start: "08:00", end: "18:00" }],
    thursday: [{ start: "08:00", end: "18:00" }],
    friday: [{ start: "08:00", end: "18:00" }],
    saturday: [{ start: "07:30", end: "12:00" }],
    sunday: [],
  };
  const scenarios = [
    {
      message: "Vocês abrem domingo?",
      now: "2026-07-12T15:00:00.000Z",
      branch: "SPECIFIC_DAY",
      expected: "Não, aos domingos estamos fechados.",
    },
    {
      message: "Vocês estão abertos agora?",
      now: "2026-07-20T23:00:00.000Z",
      branch: "CLOSED_NOW",
      expected: /No momento estamos fechados\. Nosso próximo atendimento será amanhã às 08:00\./,
    },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    const scenarioTurn = {
      ...turn,
      internalMessageId: `message-real-${index}`,
      canonicalComparisonHash: `canonical-hash-real-${index}`,
    };
    const semantic = resolveResponseExecutionIntent({
      canonicalMessage: scenario.message,
      messageId: scenarioTurn.internalMessageId,
    });
    assert.equal(semantic.applicable, true, scenario.message);
    const armed = createRuntimeV2ResponseExecutionApproval({
      companyId: scenarioTurn.companyId,
      assistantId: scenarioTurn.assistantId,
      conversationId: scenarioTurn.conversationId,
      expectedCanonicalComparisonHash: scenarioTurn.canonicalComparisonHash,
      canonicalVersion: scenarioTurn.canonicalVersion,
      expiresAt: new Date(Date.now() + 60_000),
      operatorPurpose: "real inbound regression",
      semanticDecisionVersion: semantic.version,
      expectedSemanticDecisionFingerprint: semantic.fingerprint,
      expectedIntent: semantic.intent,
      flowConfigurationFingerprint: "flow-config-real",
    });
    const store = createStore(armed);
    const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
    const officialBusinessContext = buildOfficialBusinessContext(
      {
        companyName: "Empresa de teste",
        assistantTimezone: "America/Campo_Grande",
        weeklySchedule: schedule,
      },
      new Date(scenario.now),
    );
    let v1Count = 0;
    let outboundCount = 0;
    const router = new ResponseGenerationRouter({
      coordinator,
      executeV1: async () => {
        v1Count += 1;
        return v1Response();
      },
      v2Executor: new RuntimeV2PrimaryResponseExecutor({ now: () => new Date(scenario.now) }),
    });
    const envelope = await router.route({
      turn: scenarioTurn,
      v1Input: { triageMode: false },
      executionMode: "CONTROLLED",
      executionAssistantIds: [scenarioTurn.assistantId],
      executionConversationIds: [scenarioTurn.conversationId],
      v2Eligibility: {
        standardEligible: true,
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        semanticDecision: semantic,
        flowEvaluation: {
          v2Compatibility: "ALLOWED",
          flowConfigurationFingerprint: "flow-config-real",
        },
      },
      v2PrimaryContext: {
        canonicalInbound: {
          displayContent: scenario.message,
          canonicalComparisonHash: scenarioTurn.canonicalComparisonHash,
          schemaVersion: scenarioTurn.canonicalVersion,
          redactionApplied: true,
        },
        assistant: {},
        securityRules: [],
        officialBusinessContext,
        recentHistory: [],
        model: null,
        temperature: 0,
        operational: {
          source: "tests",
          aiActive: true,
          humanActive: false,
          conversationActive: true,
          activeHandoff: false,
          fixedMessage: false,
          autoRespondBlocked: false,
          triage: false,
          toolRequired: false,
          customerRequestedHuman: false,
          ragRequested: false,
          memoryRequested: false,
          officialDataConflict: false,
        },
      },
    });

    assert.equal(envelope.executionOwner, "V2_PRIMARY", scenario.message);
    assert.equal(envelope.providerCallCount, 0, scenario.message);
    assert.equal(envelope.sanitizedTelemetry.deterministicResponderCount, 1, scenario.message);
    assert.equal(envelope.sanitizedTelemetry.deterministicBranch, scenario.branch, scenario.message);
    assert.equal(v1Count, 0, scenario.message);
    if (typeof scenario.expected === "string") {
      assert.equal(envelope.responseText, scenario.expected, scenario.message);
    } else {
      assert.match(envelope.responseText, scenario.expected, scenario.message);
    }

    const hooks = new ResponseTailLifecycleHooks(undefined, coordinator, scenarioTurn);
    const outboundMetadata = {
      executionOwner: envelope.executionOwner,
      route: envelope.route,
      strategy: envelope.strategy,
      internalMessageId: scenarioTurn.internalMessageId,
      generationId: envelope.generationId,
      persistedResponseId: `persisted-real-${index}`,
      outboundAttempted: true,
      outboundPerformed: "CONFIRMED",
      externalMessageReferenceFingerprint: `external-real-${index}`,
    };
    await hooks.beforeOutbound(outboundMetadata);
    outboundCount += 1;
    await hooks.afterOutboundConfirmed(outboundMetadata, `external-real-${index}`);
    assert.equal(outboundCount, 1, scenario.message);
    assert.equal(store.value().providerV2CallCount, 0, scenario.message);
    assert.equal(store.value().outboundV2Performed, true, scenario.message);
  }
});

test("V2 fake failure claims one provider-free safety fallback before the shared sender", async () => {
  const store = createStore();
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let v1 = 0;
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    v2Executor: {
      execute: async () => {
        throw new Error("V2_PROVIDER_FAILED");
      },
    },
  });

  const envelope = await router.route(routerInput());
  assert.equal(envelope.executionOwner, "V1_FALLBACK");
  assert.equal(v1, 0);
  assert.equal(store.value().outboundV2Attempted, false);

  const hooks = new ResponseTailLifecycleHooks(undefined, coordinator, turn);
  await hooks.beforeOutbound(metadata(envelope));
  await hooks.afterOutboundConfirmed(metadata(envelope), "external-fallback-c1");
  const persisted = store.value();
  assert.equal(persisted.terminalStatus, "V1_FALLBACK_SENT");
  assert.equal(persisted.providerV1FallbackCallCount, 0);
  assert.equal(persisted.outboundV1Performed, true);
});

test("uncertain V2 sender enters reconciliation and never permits V1 fallback", async () => {
  const store = createStore();
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => v1Response(),
    v2Executor: {
      execute: async () => ({
        responseText: "Horário oficial fake.",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
      }),
    },
  });
  const envelope = await router.route(routerInput());
  const hooks = new ResponseTailLifecycleHooks(undefined, coordinator, turn);
  await hooks.beforeOutbound(metadata(envelope));
  await hooks.afterOutboundUncertain({ ...metadata(envelope), outboundPerformed: "UNKNOWN" });

  const persisted = store.value();
  assert.equal(persisted.owner, "RECONCILIATION_REQUIRED");
  assert.equal(persisted.outboundV2Performed, null);
  assert.equal(persisted.terminalStatus, "RECONCILIATION_REQUIRED");
  assert.equal(
    await coordinator.beginV1Fallback({
      ...turn,
      generationId: envelope.generationId,
      reason: "must-not-run",
    }),
    false,
  );
});

test("two concurrent routers produce one claim and the loser never falls through to V1", async () => {
  const store = createStore();
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let v1 = 0;
  let v2 = 0;
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    v2Executor: {
      async execute() {
        v2 += 1;
        return {
          responseText: "Horário oficial fake.",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
        };
      },
    },
  });

  const [first, second] = await Promise.all([
    router.route(routerInput()),
    router.route(routerInput()),
  ]);
  const results = [first, second];
  assert.equal(results.filter((result) => result.executionOwner === "V2_PRIMARY").length, 1);
  assert.equal(results.filter((result) => result.state === "PENDING_OR_TERMINAL").length, 1);
  assert.deepEqual([v2, v1], [1, 0]);
});
