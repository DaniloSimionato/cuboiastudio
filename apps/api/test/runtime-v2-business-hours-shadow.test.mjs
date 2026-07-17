import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryConversationStateStore,
  RuntimeV2CandidateResponseGenerator,
  RuntimeV2ShadowIntegrationService,
  RuntimeV2ShadowOrchestrator,
  createEvidenceId,
  understandTurn,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "hours-company",
  assistantId: "hours-assistant",
  conversationId: "hours-conversation",
  contextVersion: 1,
};

const environment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
  RUNTIME_V2_RESPONSE_GENERATION_MODE: "SHADOW",
  RUNTIME_V2_RESPONSE_COMPARISON_MODE: "SHADOW",
  RUNTIME_V2_RESPONSE_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_RESPONSE_CONVERSATION_IDS: scope.conversationId,
  RUNTIME_V2_SHADOW_DISPATCH_BUDGET_MS: "250",
  RUNTIME_V2_CANDIDATE_GENERATION_TIMEOUT_MS: "10000",
};

function candidateContext() {
  return {
    promptInput: {
      assistant: { name: "Assistente Fixture", instructions: "Use somente fatos autorizados." },
      behavior: null,
      flow: null,
      securityRules: [],
      knowledgeItems: [],
      historyMessages: [],
      currentMessage: "Qual é o horário de atendimento?",
      officialBusinessContext: null,
      memoryContextBlock: null,
    },
    model: "fake-model",
    temperature: 0.2,
    v1ResponseAvailable: true,
    selectedFlowId: "hours-flow",
    candidateFlowIds: ["hours-flow"],
    flowSelectionReason: "FIXTURE_BUSINESS_HOURS",
    flowSelectionConfidence: 1,
    evidenceIds: [],
    memoryIds: [],
    officialDataKeys: ["business_hours"],
  };
}

function snapshot(id, message, extra = {}) {
  return {
    scope,
    correlationId: `hours-correlation-${id}`,
    internalMessageId: id,
    externalMessageId: `external-${id}`,
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: message,
    candidateContext: candidateContext(),
    ...extra,
  };
}

function officialHours(now) {
  const sourceId = "hours-fixture";
  return {
    contractVersion: 1,
    evidenceId: createEvidenceId({
      sourceType: "OFFICIAL_STRUCTURED",
      sourceId,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      category: "BUSINESS_HOURS",
      fieldKey: "business_hours",
    }),
    sourceType: "OFFICIAL_STRUCTURED",
    sourceId,
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    contactId: null,
    conversationId: null,
    contextVersion: null,
    category: "BUSINESS_HOURS",
    fieldKey: "business_hours",
    valueHash: "fixture-hours-v1",
    confidence: 1,
    authorityLevel: "AUTHORITATIVE",
    observedAt: now.toISOString(),
    validFrom: now.toISOString(),
    validUntil: null,
    freshnessStatus: "CURRENT",
    provenance: { sourceTable: "assistants", sourceRecordId: scope.assistantId },
    isSensitive: false,
    isAuthoritative: true,
    sourceStatus: "ACTIVE",
  };
}

function officialReader(now, present = true) {
  return {
    async read(input) {
      assert.equal(input.companyId, scope.companyId);
      assert.equal(input.assistantId, scope.assistantId);
      return {
        evidence: present ? [officialHours(now)] : [],
        missingCategories: present ? [] : ["BUSINESS_HOURS"],
        failures: [],
        scopeValidationFailures: [],
        adapterStatus: present ? "COMPLETED" : "EMPTY",
        emptyReason: present ? "SUCCESS" : "NO_STRUCTURED_VALUE",
        durationMs: 0,
      };
    },
  };
}

function fakePrisma() {
  const logs = [];
  return {
    logs,
    assistantRuntimeLog: {
      async create({ data, select }) {
        const id = `log-${logs.length + 1}`;
        logs.push({ ...data, id });
        return select?.id ? { id } : logs.at(-1);
      },
      async update({ where, data, select }) {
        const index = logs.findIndex((entry) => entry.id === where.id);
        if (index < 0) throw new Error("LOG_NOT_FOUND");
        logs[index] = { ...logs[index], ...data };
        return select?.id ? { id: logs[index].id } : logs[index];
      },
    },
  };
}

test("perguntas diretas e follow-up autorizado derivam BUSINESS_HOURS sem classificar agenda individual", () => {
  const direct = [
    "Qual é o horário de atendimento?",
    "Vocês atendem aos sábados?",
    "Qual o horário no sábado?",
    "Que horas vocês abrem de segunda a sexta?",
    "Vocês fecham para almoço?",
  ];
  for (const [index, message] of direct.entries()) {
    const understanding = understandTurn({ message, messageId: `direct-${index}` });
    assert.ok(understanding.requestedInformationCategories.includes("businessHours"), message);
  }
  const followUp = understandTurn({
    message: "E durante a semana?",
    messageId: "follow-up",
    recentBusinessHoursTopic: true,
  });
  assert.deepEqual(followUp.requestedInformationCategories, ["businessHours"]);
  assert.equal(followUp.requestedCategoryDerivation.businessHours, "RECENT_BUSINESS_HOURS_TOPIC");

  const ambiguousFollowUp = understandTurn({
    message: "E durante a semana?",
    messageId: "ambiguous-follow-up",
    recentBusinessHoursTopic: false,
  });
  assert.equal(ambiguousFollowUp.requiresClarification, true);
  assert.ok(ambiguousFollowUp.reasonCodes.includes("AMBIGUOUS_BUSINESS_HOURS_FOLLOW_UP"));

  for (const message of [
    "Qual o prazo de conserto?",
    "Que horas vocês entregam meu equipamento específico?",
    "Qual o tempo estimado do serviço?",
    "Qual o horário da minha visita ainda não confirmada?",
    "Podem agendar uma visita individual?",
  ]) {
    const understanding = understandTurn({ message, messageId: `negative-${message}` });
    assert.equal(
      understanding.requestedInformationCategories.includes("businessHours"),
      false,
      message,
    );
  }
});

test("geração Shadow com Evidence OFF consulta somente autoridade oficial aplicável", async () => {
  const now = new Date("2026-07-17T00:00:00.000Z");
  let providerCalls = 0;
  let ragReads = 0;
  let memoryReads = 0;
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate() {
      providerCalls += 1;
      return {
        provider: "fake",
        model: "fake-model",
        answer: "Atendemos conforme o horário oficial informado.",
        durationMs: 1,
      };
    },
  });
  const store = new InMemoryConversationStateStore();
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    store,
    environment,
    () => now,
    officialReader(now),
    {
      read() {
        ragReads += 1;
        throw new Error("RAG must remain disabled when Evidence Mode is OFF");
      },
    },
    {
      read() {
        memoryReads += 1;
        throw new Error("memory must remain disabled when Evidence Mode is OFF");
      },
    },
    generator,
  );

  const direct = await orchestrator.process(
    snapshot("direct-hours", "Vocês atendem aos sábados? Qual é o horário?"),
  );
  const followUp = await orchestrator.process(
    snapshot("follow-up-hours", "E durante a semana?", {
      usefulHistory: [
        {
          id: "history-hours",
          role: "user",
          content: "Vocês atendem aos sábados?",
          relevance: "objective",
        },
      ],
    }),
  );

  for (const result of [direct, followUp]) {
    assert.equal(result.manifest.responsePlanAction, "ANSWER");
    assert.deepEqual(result.manifest.authorityCategoriesAvailable, ["businessHours"]);
    assert.equal(result.manifest.candidateResponse.status, "CANDIDATE_APPROVED");
    assert.equal(
      result.manifest.candidateResponse.generationLifecycle.status,
      "GENERATION_COMPLETED",
    );
    assert.equal(result.manifest.candidateResponse.outboundAttempted, false);
    assert.equal(result.manifest.candidateResponse.outboundPerformed, false);
    assert.deepEqual(result.manifest.evidence.authorizedCategories, ["BUSINESS_HOURS"]);
    assert.deepEqual(result.manifest.evidence.authorityDecisionStatus, ["AUTHORIZED"]);
  }
  assert.equal(providerCalls, 2);
  assert.equal(ragReads, 0);
  assert.equal(memoryReads, 0);
});

test("ausência de BUSINESS_HOURS bloqueia antes do provider mesmo com geração Shadow habilitada", async () => {
  const now = new Date("2026-07-17T00:00:00.000Z");
  let providerCalls = 0;
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate() {
      providerCalls += 1;
      throw new Error("provider must not be called");
    },
  });
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    environment,
    () => now,
    officialReader(now, false),
    undefined,
    undefined,
    generator,
  );
  const result = await orchestrator.process(
    snapshot("missing-hours", "Qual é o horário de atendimento?"),
  );
  assert.equal(providerCalls, 0);
  assert.equal(result.manifest.candidateResponse.status, "CANDIDATE_BLOCKED");
  assert.equal(result.manifest.candidateResponse.generationLifecycle.status, "GENERATION_BLOCKED");
  assert.deepEqual(result.manifest.candidateResponse.qualitySignals, [
    "FACTUAL_AUTHORITY_UNAVAILABLE",
  ]);
  assert.equal(result.manifest.candidateResponse.outboundPerformed, false);
});

test("dispatch não bloqueia V1 e reconcilia PENDING para COMPLETED com provider lento autorizado", async () => {
  let currentTime = Date.parse("2026-07-17T00:00:00.000Z");
  const now = () => new Date(currentTime);
  let providerCalls = 0;
  let resolveProvider;
  const generator = new RuntimeV2CandidateResponseGenerator(
    {
      async generate() {
        providerCalls += 1;
        return new Promise((resolve) => {
          resolveProvider = resolve;
        });
      },
    },
    undefined,
    now,
  );
  const prisma = fakePrisma();
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    environment,
    now,
    officialReader(now()),
    undefined,
    undefined,
    generator,
  );
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, environment);
  const dispatch = integration.dispatch(
    snapshot("slow-authorized-hours", "Qual é o horário de atendimento?"),
  );
  assert.equal(dispatch.status, "ACCEPTED");
  assert.equal(dispatch.generationStatus, "GENERATION_PENDING");
  assert.equal(dispatch.v1WaitReleased, true);
  assert.ok(dispatch.dispatchLatencyMs < 250);

  for (let attempt = 0; providerCalls === 0 && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(providerCalls, 1);
  assert.equal(prisma.logs.length, 1);
  assert.equal(prisma.logs[0].metadata.generationStatus, "GENERATION_PENDING");

  currentTime += 1000;
  resolveProvider({
    provider: "fake",
    model: "fake-model",
    answer: "Atendemos conforme o horário oficial informado.",
    durationMs: 1000,
  });
  await integration.drain();

  assert.equal(prisma.logs.length, 1);
  assert.equal(prisma.logs[0].status, "COMPLETED");
  assert.equal(prisma.logs[0].metadata.generationStatus, "GENERATION_COMPLETED");
  assert.equal(prisma.logs[0].metadata.finalGenerationStatus, "GENERATION_COMPLETED");
  assert.equal(prisma.logs[0].metadata.providerCallCount, 1);
  assert.equal(prisma.logs[0].metadata.completedAfterV1Response, true);
  assert.equal(prisma.logs[0].metadata.outboundAttempted, false);
  assert.equal(prisma.logs[0].metadata.outboundPerformed, false);
});
