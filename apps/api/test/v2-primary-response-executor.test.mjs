import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildOfficialBusinessContext } from "../dist/assistants/official-business-context.js";
import {
  createRuntimeV2ResponseExecutionApproval,
  resolveResponseExecutionIntent,
} from "../dist/runtime-v2/index.js";
import { RuntimeV2ResponseExecutionCoordinator } from "../dist/runtime-v2/response-execution-coordinator.js";
import { ResponseGenerationRouter } from "../dist/assistant-conversations/response-generation-router.js";
import { ResponseTailLifecycleHooks } from "../dist/assistant-conversations/response-tail-lifecycle-hooks.js";
import { RuntimeV2PrimaryResponseExecutor } from "../dist/assistant-conversations/v2-primary-response-executor.js";

const turn = {
  companyId: "company-v2-primary",
  assistantId: "assistant-v2-primary",
  conversationId: "conversation-v2-primary",
  internalMessageId: "message-v2-primary",
  contextVersion: 1,
  canonicalComparisonHash: "canonical-hash-v2-primary",
  canonicalVersion: "canonical-inbound-message-v1",
};

const semanticDecision = resolveResponseExecutionIntent({
  canonicalMessage: "Qual é o horário de atendimento?",
  messageId: turn.internalMessageId,
});

function officialContext(overrides = {}, now) {
  return buildOfficialBusinessContext({
    companyName: "Empresa de teste",
    assistantName: "Heloísa",
    companyTimezone: "America/Sao_Paulo",
    assistantTimezone: "America/Sao_Paulo",
    weeklySchedule: {
      monday: [{ start: "09:00", end: "18:00" }],
      tuesday: [{ start: "09:00", end: "18:00" }],
      wednesday: [{ start: "09:00", end: "18:00" }],
      thursday: [{ start: "09:00", end: "18:00" }],
      friday: [{ start: "09:00", end: "18:00" }],
      saturday: [],
      sunday: [],
    },
    ...overrides,
  }, now);
}

function claimedApproval(overrides = {}) {
  const armed = createRuntimeV2ResponseExecutionApproval({
    companyId: turn.companyId,
    assistantId: turn.assistantId,
    conversationId: turn.conversationId,
    expectedCanonicalComparisonHash: turn.canonicalComparisonHash,
    canonicalVersion: turn.canonicalVersion,
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "teste local do executor primário",
    semanticDecisionVersion: semanticDecision.version,
    expectedSemanticDecisionFingerprint: semanticDecision.fingerprint,
    expectedIntent: semanticDecision.intent,
    flowConfigurationFingerprint: "flow-config-primary",
  });
  return {
    ...armed,
    status: "CLAIMED",
    claimedAt: new Date().toISOString(),
    internalMessageId: turn.internalMessageId,
    generationId: "generation-v2-primary",
    ...overrides,
  };
}

function context(overrides = {}) {
  return {
    canonicalInbound: {
      displayContent: "Qual é o horário de atendimento?",
      canonicalComparisonHash: turn.canonicalComparisonHash,
      schemaVersion: turn.canonicalVersion,
      redactionApplied: true,
    },
    assistant: {
      name: "Heloísa",
      splitResponseStyle: "SINGLE",
      safetyInstruction: "Não invente informações.",
      avoidPhrases: null,
    },
    behavior: null,
    securityRules: [],
    officialBusinessContext: officialContext(),
    recentHistory: [],
    model: "fake-v2-model",
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
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    turn,
    generationId: "generation-v2-primary",
    approval: claimedApproval(),
    context: context(),
    ownership: "V2_GENERATION_PENDING",
    ...overrides,
  };
}

function executor() {
  return new RuntimeV2PrimaryResponseExecutor();
}

test("executor primário renderiza businessHours estruturado sem provider", async () => {
  const calls = [];
  const result = await executor({
    async generate(value) {
      calls.push(value);
      return {
        provider: "fake-v2-provider",
        model: "fake-v2-model",
        answer: "Nosso horário de atendimento é de segunda a sexta, das 09:00 às 18:00.",
        durationMs: 1,
      };
    },
  }).execute(input());

  assert.equal(calls.length, 0);
  assert.equal(result.category, "businessHours");
  assert.equal(result.authority, "OFFICIAL_CONTEXT");
  assert.equal(result.candidateStatus, "CANDIDATE_APPROVED");
  assert.equal(result.qualityGateResult, "APPROVED");
  assert.equal(result.outboundAllowed, true);
  assert.equal(result.sanitizedTelemetry.providerCallCount, 0);
  assert.equal(result.sanitizedTelemetry.deterministicResponderCount, 1);
  assert.equal(result.sanitizedTelemetry.responseStrategy, "V2_BUSINESS_HOURS_DETERMINISTIC");
  assert.equal(result.sanitizedTelemetry.deterministicBranch, "WEEKLY_SUMMARY");
  assert.equal(result.sanitizedTelemetry.normalizedScheduleDayCount, 5);
  assert.equal(result.sanitizedTelemetry.normalizedScheduleIntervalCount, 5);
  assert.equal(result.sanitizedTelemetry.isOpenNow, null);
  assert.equal(result.sanitizedTelemetry.toolCallCount, 0);
  assert.equal(result.sanitizedTelemetry.primaryExecutionNoShadowComparison, true);
  assert.match(result.responseText, /segunda a sexta/i);
  assert.match(result.responseText, /sábado/i);
});

test("handler primário ignora histórico incorreto e usa a agenda oficial da quarta-feira", async () => {
  const weeklySchedule = {
    monday: [{ start: "08:00", end: "22:00" }],
    tuesday: [{ start: "08:00", end: "23:00" }],
    wednesday: [
      { start: "08:00", end: "11:00" },
      { start: "13:00", end: "21:00" },
    ],
    thursday: [{ start: "08:00", end: "18:00" }],
    friday: [{ start: "08:00", end: "18:00" }],
    saturday: [{ start: "07:30", end: "12:00" }],
    sunday: [],
  };
  const result = await new RuntimeV2PrimaryResponseExecutor({
    now: () => new Date("2026-07-22T14:00:00.000Z"),
  }).execute(
    input({
      context: context({
        officialBusinessContext: officialContext(
          { weeklySchedule },
          new Date("2026-07-22T14:00:00.000Z"),
        ),
        canonicalInbound: {
          ...context().canonicalInbound,
          displayContent: "Qual horário de quarta?",
        },
        // This property is intentionally ignored by the typed primary context.
        // It models a wrong V1 answer retained in the conversation history.
        recentHistory: [
          { id: "old-wrong-answer", role: "assistant", content: "Quarta até 22h." },
        ],
      }),
    }),
  );

  assert.equal(result.sanitizedTelemetry.providerCallCount, 0);
  assert.equal(result.sanitizedTelemetry.deterministicResponderCount, 1);
  assert.equal(result.sanitizedTelemetry.deterministicBranch, "SPECIFIC_DAY");
  assert.match(result.responseText, /quartas-feiras.*08h às 11h.*13h às 21h/i);
  assert.doesNotMatch(result.responseText, /22h/i);
});

test("handler primário responde OPEN_NOW e almoço somente pela agenda oficial", async () => {
  const weeklySchedule = {
    monday: [
      { start: "08:00", end: "11:00" },
      { start: "13:00", end: "21:00" },
    ],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
  const now = new Date("2026-07-20T17:30:00.000Z");
  const businessContext = officialContext({ weeklySchedule }, now);
  for (const [message, branch, expectedText] of [
    ["Vocês estão abertos agora?", "OPEN_NOW", /estamos abertos agora.*13:00 às 21:00/i],
    ["Vocês fecham para almoço?", "WEEKLY_SUMMARY", /fechamos para almoço.*11:00.*13:00/i],
  ]) {
    const result = await new RuntimeV2PrimaryResponseExecutor({ now: () => now }).execute(
      input({
        context: context({
          officialBusinessContext: businessContext,
          canonicalInbound: { ...context().canonicalInbound, displayContent: message },
        }),
      }),
    );
    assert.equal(result.sanitizedTelemetry.providerCallCount, 0, message);
    assert.equal(result.sanitizedTelemetry.deterministicResponderCount, 1, message);
    assert.equal(result.sanitizedTelemetry.deterministicBranch, branch, message);
    assert.match(result.responseText, expectedText, message);
  }
});

test("executor primário cobre agenda fechada, aberta, atual, ausente e inválida sem provider", async () => {
  const baseSchedule = {
    monday: [{ start: "08:00", end: "18:00" }],
    tuesday: [{ start: "08:00", end: "18:00" }],
    wednesday: [{ start: "08:00", end: "18:00" }],
    thursday: [{ start: "08:00", end: "18:00" }],
    friday: [{ start: "08:00", end: "18:00" }],
    saturday: [{ start: "07:30", end: "12:00" }],
    sunday: [],
  };
  const cases = [
    {
      name: "domingo fechado",
      message: "Vocês abrem domingo?",
      now: "2026-07-12T15:00:00.000Z",
      expectedBranch: "SPECIFIC_DAY",
      expectedScope: "specific_day",
      expectedOpenNow: null,
      expectedText: "Não, aos domingos estamos fechados.",
    },
    {
      name: "sábado aberto",
      message: "Vocês abrem sábado?",
      now: "2026-07-11T15:00:00.000Z",
      expectedBranch: "SPECIFIC_DAY",
      expectedScope: "specific_day",
      expectedOpenNow: null,
      expectedText: /Sim\. Aos sábados atendemos das 07h30 às 12h\./,
    },
    {
      name: "OPEN_NOW aberto",
      message: "Vocês estão abertos agora?",
      now: "2026-07-20T17:00:00.000Z",
      expectedBranch: "OPEN_NOW",
      expectedScope: "open_now",
      expectedOpenNow: true,
      expectedText: /estamos abertos agora/i,
    },
    {
      name: "OPEN_NOW fechado",
      message: "Vocês estão abertos agora?",
      now: "2026-07-20T23:00:00.000Z",
      expectedBranch: "CLOSED_NOW",
      expectedScope: "open_now",
      expectedOpenNow: false,
      expectedText: /estamos fechados/i,
    },
    {
      name: "TODAY aberto",
      message: "Qual o horário de hoje?",
      now: "2026-07-20T17:00:00.000Z",
      expectedBranch: "TODAY",
      expectedScope: "today",
      expectedOpenNow: null,
      expectedText: /Hoje, segunda-feira, atendemos das 08h às 18h\./,
    },
    {
      name: "TODAY fechado",
      message: "Qual o horário de hoje?",
      now: "2026-07-12T15:00:00.000Z",
      expectedBranch: "TODAY",
      expectedScope: "today",
      expectedOpenNow: null,
      expectedText: /Hoje, domingo, não há atendimento\./,
    },
    {
      name: "agenda ausente",
      message: "Qual o horário de atendimento?",
      now: "2026-07-20T17:00:00.000Z",
      schedule: {},
      expectedBranch: "MISSING_SCHEDULE",
      expectedScope: "weekly",
      expectedOpenNow: null,
      expectedText: /não tenho o horário confirmado/i,
    },
    {
      name: "agenda inválida",
      message: "Qual o horário de atendimento?",
      now: "2026-07-20T17:00:00.000Z",
      schedule: { ...baseSchedule, monday: [{ start: "99:00", end: "18:00" }] },
      expectedBranch: "MISSING_SCHEDULE",
      expectedScope: "weekly",
      expectedOpenNow: null,
      expectedText: /não tenho o horário confirmado/i,
    },
  ];

  for (const scenario of cases) {
    const businessContext = officialContext(
      { weeklySchedule: scenario.schedule ?? baseSchedule },
      new Date(scenario.now),
    );
    const executionContext = context({
      officialBusinessContext: businessContext,
      canonicalInbound: {
        ...context().canonicalInbound,
        displayContent: scenario.message,
      },
    });
    const result = await new RuntimeV2PrimaryResponseExecutor({
      now: () => new Date(scenario.now),
    }).execute(input({ context: executionContext }));

    assert.equal(result.candidateStatus, "CANDIDATE_APPROVED", scenario.name);
    assert.equal(result.qualityGateResult, "APPROVED", scenario.name);
    assert.equal(result.outboundAllowed, true, scenario.name);
    assert.equal(result.sanitizedTelemetry.providerCallCount, 0, scenario.name);
    assert.equal(result.sanitizedTelemetry.deterministicResponderCount, 1, scenario.name);
    assert.equal(result.sanitizedTelemetry.deterministicBranch, scenario.expectedBranch, scenario.name);
    assert.equal(
      result.sanitizedTelemetry.requestedScheduleScope,
      scenario.expectedScope,
      scenario.name,
    );
    assert.equal(result.sanitizedTelemetry.isOpenNow, scenario.expectedOpenNow, scenario.name);
    if (typeof scenario.expectedText === "string") {
      assert.equal(result.responseText, scenario.expectedText, scenario.name);
    } else {
      assert.match(result.responseText, scenario.expectedText, scenario.name);
    }
    assert.doesNotMatch(result.responseText, /fora do funcionamento oficial/i, scenario.name);
  }
});

test("executor usa somente o contexto declarativo de flow vinculado à approval", async () => {
  const declarativeInstructions = "Responda de forma objetiva e cordial.";
  const compatibleFlowContext = {
    flowFingerprint: "flow-compatible",
    flowVersionFingerprint: "flow-version-compatible",
    matchType: "EXPLICIT_RUNTIME_SCOPE",
    category: "businessHours",
    declarativeInstructionFingerprint: createHash("sha256")
      .update(JSON.stringify(declarativeInstructions))
      .digest("hex")
      .slice(0, 16),
    declarativeInstructions,
    factualAuthorityType: "OFFICIAL_CONTEXT",
    hasFixedMessage: false,
    requiresHuman: false,
    handoffRequired: false,
    toolRequired: false,
    actionRequired: false,
    autoRespondAllowed: true,
    compatibilityStatus: "STANDARD_COMPATIBLE",
    redactionApplied: true,
  };
  const calls = [];
  const result = await executor({
    async generate(value) {
      calls.push(value);
      return {
        provider: "fake-v2-provider",
        model: "fake-v2-model",
        answer: "Atendemos de segunda a sexta, das 09:00 às 18:00.",
        durationMs: 1,
      };
    },
  }).execute(
    input({
      approval: claimedApproval({
        expectedFlowFingerprint: compatibleFlowContext.flowFingerprint,
        expectedFlowVersionFingerprint: compatibleFlowContext.flowVersionFingerprint,
        expectedFlowMatchType: compatibleFlowContext.matchType,
        flowCompatibility: compatibleFlowContext.compatibilityStatus,
        declarativeContextFingerprint: compatibleFlowContext.declarativeInstructionFingerprint,
      }),
      context: context({ compatibleFlowContext }),
    }),
  );
  assert.equal(calls.length, 0);
  assert.equal(result.sanitizedTelemetry.compatibleFlowContextFingerprint, "flow-compatible");
});

test("executor blocks a flow context that differs from the claimed approval before the provider", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      executor({
        async generate() {
          calls += 1;
          throw new Error("provider não deveria ser chamado");
        },
      }).execute(
        input({
          approval: claimedApproval({ flowCompatibility: "STANDARD_COMPATIBLE" }),
          context: context({
            compatibleFlowContext: {
              flowFingerprint: "flow-compatible",
              flowVersionFingerprint: "flow-version-compatible",
              matchType: "EXPLICIT_RUNTIME_SCOPE",
              category: "businessHours",
              declarativeInstructionFingerprint: null,
              declarativeInstructions: null,
              factualAuthorityType: "OFFICIAL_CONTEXT",
              hasFixedMessage: false,
              requiresHuman: false,
              handoffRequired: false,
              toolRequired: false,
              actionRequired: false,
              autoRespondAllowed: true,
              compatibilityStatus: "STANDARD_COMPATIBLE",
              redactionApplied: true,
            },
          }),
        }),
      ),
    /V2_PRIMARY_FLOW_CONTEXT_APPROVAL_MISMATCH/,
  );
  assert.equal(calls, 0);
});

test("executor bloqueia preconditions, categoria e autoridade antes do provider", async () => {
  for (const invalidContext of [
    context({ operational: { ...context().operational, ragRequested: true } }),
    context({ operational: { ...context().operational, memoryRequested: true } }),
    context({ operational: { ...context().operational, toolRequired: true } }),
    context({ operational: { ...context().operational, customerRequestedHuman: true } }),
    context({
      canonicalInbound: { ...context().canonicalInbound, displayContent: "Quanto custa?" },
    }),
    context({ officialBusinessContext: null }),
  ]) {
    let calls = 0;
    await assert.rejects(
      () =>
        executor({
          async generate() {
            calls += 1;
            throw new Error("provider não deveria ser chamado");
          },
        }).execute(input({ context: invalidContext })),
      /V2_PRIMARY_/,
    );
    assert.equal(calls, 0);
  }
});

test("executor bloqueia regra ativa que exige ferramenta ou handoff antes do provider", async () => {
  for (const instruction of [
    "Use uma ferramenta externa antes de responder.",
    "Encaminhe sempre ao atendente humano.",
  ]) {
    let calls = 0;
    await assert.rejects(
      () =>
        executor({
          async generate() {
            calls += 1;
            throw new Error("provider não deveria ser chamado");
          },
        }).execute(
          input({
            context: context({
              securityRules: [{ name: "Regra", ruleType: "Segurança", instruction }],
            }),
          }),
        ),
      /V2_PRIMARY_SECURITY_RULE/,
    );
    assert.equal(calls, 0);
  }
});

test("executor não permite que provider adversarial substitua a agenda", async () => {
  let calls = 0;
  const result = await executor({
    async generate() {
      calls += 1;
      return { provider: "fake-v2-provider", model: "fake-v2-model", answer: "Sábado fechado." };
    },
  }).execute(input());
  assert.equal(calls, 0);
  assert.doesNotMatch(result.responseText, /sábado fechado/i);
});

test("executor bloqueia abort, escopo da approval e horários estruturados inválidos", async () => {
  let calls = 0;
  const controller = new AbortController();
  controller.abort();
  const fakeProvider = {
    async generate() {
      calls += 1;
      throw new Error("provider não deveria ser chamado");
    },
  };
  await assert.rejects(
    () => executor(fakeProvider).execute(input({ signal: controller.signal })),
    /V2_PRIMARY_ABORTED/,
  );
  await assert.rejects(
    () =>
      executor(fakeProvider).execute(
        input({ approval: claimedApproval({ generationId: "generation-errada" }) }),
      ),
    /V2_PRIMARY_APPROVAL_OR_OWNERSHIP_INVALID/,
  );
  const missingSchedule = await executor(fakeProvider).execute(
    input({ context: context({ officialBusinessContext: officialContext({ weeklySchedule: {} }) }) }),
  );
  assert.equal(missingSchedule.sanitizedTelemetry.missingScheduleConfiguration, true);
  assert.match(missingSchedule.responseText, /não tenho o horário confirmado/i);
  assert.equal(calls, 0);
});

test("router, executor real e tail fake produzem um único V2_PRIMARY sem V1 paralelo", async () => {
  const approval = claimedApproval({
    status: "ARMED",
    claimedAt: null,
    internalMessageId: null,
    generationId: null,
  });
  let record = {
    approval,
    owner: "V1_OWNED",
    revision: 0,
    contextVersion: 1,
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
  const store = {
    async load() {
      return structuredClone(record);
    },
    async compareAndSet({ expectedRevision, next }) {
      if (record.revision !== expectedRevision) return false;
      record = structuredClone(next);
      return true;
    },
  };
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let providerCalls = 0;
  let v1Calls = 0;
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => {
      v1Calls += 1;
      throw new Error("V1 não deveria executar");
    },
    v2Executor: executor({
      async generate() {
        providerCalls += 1;
        return {
          provider: "fake-v2-provider",
          model: "fake-v2-model",
          answer: "Nosso horário de atendimento é de segunda a sexta, das 09:00 às 18:00.",
          durationMs: 1,
        };
      },
    }),
  });

  const envelope = await router.route({
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
        flowConfigurationFingerprint: "flow-config-primary",
      },
    },
    v2PrimaryContext: context(),
  });

  assert.equal(envelope.executionOwner, "V2_PRIMARY");
  assert.equal(envelope.strategy, "V2_BUSINESS_HOURS_DETERMINISTIC");
  assert.equal(providerCalls, 0);
  assert.equal(v1Calls, 0);

  const hooks = new ResponseTailLifecycleHooks(undefined, coordinator, turn);
  const metadata = {
    executionOwner: envelope.executionOwner,
    route: envelope.route,
    strategy: envelope.strategy,
    internalMessageId: turn.internalMessageId,
    generationId: envelope.generationId,
    persistedResponseId: "persisted-v2-primary",
    outboundAttempted: true,
    outboundPerformed: "CONFIRMED",
    externalMessageReferenceFingerprint: "fingerprint-only",
  };
  await hooks.beforeOutbound(metadata);
  await hooks.afterOutboundConfirmed(metadata, "external-fake-v2-primary");
  assert.equal(record.terminalStatus, "V2_OUTBOUND_SENT");
  assert.equal(record.approval.status, "CONSUMED");
  assert.equal(record.providerV2CallCount, 0);
});

test("falha de segurança pré-sender do executor real faz fallback seguro sem provider", async () => {
  const approval = claimedApproval({
    status: "ARMED",
    claimedAt: null,
    internalMessageId: null,
    generationId: null,
  });
  let record = {
    approval,
    owner: "V1_OWNED",
    revision: 0,
    contextVersion: 1,
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
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({
    store: {
      async load() {
        return structuredClone(record);
      },
      async compareAndSet({ expectedRevision, next }) {
        if (record.revision !== expectedRevision) return false;
        record = structuredClone(next);
        return true;
      },
    },
  });
  let v1Calls = 0;
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => {
      v1Calls += 1;
      return {
        owner: "V1",
        strategy: "STANDARD",
        responseText: "Fallback V1 fake.",
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
    },
    v2Executor: executor(),
  });
  const envelope = await router.route({
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
        flowConfigurationFingerprint: "flow-config-primary",
      },
    },
    v2PrimaryContext: context({
      securityRules: [{ name: "Regra", ruleType: "Segurança", instruction: "Use uma ferramenta externa." }],
    }),
  });
  assert.equal(envelope.executionOwner, "V1_FALLBACK");
  assert.equal(v1Calls, 0);
  assert.equal(record.outboundV2Attempted, false);
  assert.equal(record.providerV2CallCount, 0);
  assert.equal(record.providerV1FallbackCallCount, 0);
});
