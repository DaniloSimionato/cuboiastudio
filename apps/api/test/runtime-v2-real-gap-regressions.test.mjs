import assert from "node:assert/strict";
import { test } from "node:test";
import {
  InMemoryConversationStateStore,
  MemoryEvidenceAdapter,
  RuntimeV2ShadowOrchestrator,
  buildSessionEvidenceDetails,
  createEvidenceId,
  understandTurn,
} from "../dist/runtime-v2/index.js";
import { IntentRouterService } from "../dist/intent-router/intent-router.service.js";
import { extractCustomerStructuredFields } from "../dist/intent-router/intent-routing.js";
import { OfficialStructuredEvidenceAdapter } from "../dist/runtime-v2/official-structured-evidence.adapter.js";
import { createMemoryRetrievalObservation } from "../dist/runtime-v2/memory-evidence.adapter.js";
import { createRagRetrievalObservation, RagEvidenceAdapter } from "../dist/runtime-v2/rag-evidence.adapter.js";

const now = new Date("2026-07-15T12:00:00.000Z");

test("os sete cenários derivam categorias factuais distintas", () => {
  const cases = [
    ["hours", "Qual é o horário de atendimento no domingo?", ["businessHours"]],
    ["contact", "Qual é o WhatsApp ou telefone oficial da empresa?", ["officialContact"]],
    ["price", "Quanto custa um produto instalado?", ["price"]],
    ["availability", "Vocês têm disponibilidade amanhã às 14 horas para fazer o serviço?", ["availability"]],
    ["technical", "Vocês fazem upgrade para SSD de 500 GB e 16 GB de memória RAM em notebook?", ["technicalInformation"]],
    ["preference", "Para este atendimento, prefiro receber retorno pelo WhatsApp.", ["contactPreference"]],
    ["preference-followup", "Como eu prefiro receber retorno?", ["contactPreference"]],
  ];
  for (const [id, message, expected] of cases) {
    const understanding = understandTurn({ message, messageId: `message-${id}`, contextVersion: 1, now });
    assert.deepEqual(understanding.requestedInformationCategories, expected, id);
    assert.ok(understanding.requestedCategoryDerivation);
  }
  const hours = understandTurn({
    message: cases[0][1],
    messageId: "hours-negative",
    contextVersion: 1,
    now,
  });
  assert.equal(hours.requestedInformationCategories.includes("availability"), false);
  assert.ok(
    extractCustomerStructuredFields(cases[5][1]).knownFieldKeys.includes(
      "contact_preference_channel",
    ),
  );
});

test("adapter oficial distingue categoria ausente de valor estruturado", async () => {
  const record = {
    id: "assistant-official-fixture",
    companyId: "company-official-fixture",
    businessAddress: null,
    businessCityRegion: null,
    businessCity: null,
    businessState: null,
    businessPostalCode: null,
    businessPhone: null,
    businessWhatsapp: null,
    businessWhatsappSupport: null,
    websiteUrl: null,
    timezone: "America/Sao_Paulo",
    weeklySchedule: {
      monday: [{ start: "08:00", end: "18:00" }],
      sunday: [],
    },
    updatedAt: now,
    company: {
      id: "company-official-fixture",
      name: "Empresa Fixture",
      timezone: "America/Sao_Paulo",
      status: "ACTIVE",
      updatedAt: now,
    },
  };
  const adapter = new OfficialStructuredEvidenceAdapter({
    assistant: { findFirst: async () => record },
  });
  const none = await adapter.read({
    companyId: record.companyId,
    assistantId: record.id,
    requestedCategories: [],
    currentTime: now,
  });
  assert.equal(none.emptyReason, "NO_REQUESTED_CATEGORY");
  const hours = await adapter.read({
    companyId: record.companyId,
    assistantId: record.id,
    requestedCategories: ["BUSINESS_HOURS"],
    currentTime: now,
  });
  assert.equal(hours.emptyReason, "SUCCESS");
  const contact = await adapter.read({
    companyId: record.companyId,
    assistantId: record.id,
    requestedCategories: ["OFFICIAL_CONTACT"],
    currentTime: now,
  });
  assert.equal(contact.emptyReason, "NO_STRUCTURED_VALUE");
});

test("observações RAG e memória carregam motivos sem iniciar recuperação", () => {
  const rag = createRagRetrievalObservation({
    companyId: "company-fixture",
    assistantId: "assistant-fixture",
    internalMessageId: "message-fixture",
    retrievalExecuted: false,
    notExecutedReason: "FLOW_SUPPRESSED",
    threshold: 0.7,
    thresholdSource: "default",
    results: [],
  });
  assert.equal(rag.notExecutedReason, "FLOW_SUPPRESSED");
  assert.equal(rag.items.length, 0);
  const memory = createMemoryRetrievalObservation({
    companyId: "company-fixture",
    assistantId: "assistant-fixture",
    contactId: "contact-fixture",
    conversationId: "conversation-fixture",
    contextVersion: 1,
    internalMessageId: "message-fixture",
    retrievalExecuted: false,
    notExecutedReason: "RETRIEVAL_NOT_REQUIRED",
    configurationSnapshot: {
      memoryEnabled: true,
      memoryExtractionEnabled: true,
      allowedCategories: ["CONTACT_PREFERENCE"],
      confidenceThreshold: 0.7,
      temporaryDefaultDays: 7,
      sharedAcrossAssistants: false,
    },
    selectedMemories: [],
  });
  assert.equal(memory.notExecutedReason, "RETRIEVAL_NOT_REQUIRED");
  assert.equal(memory.items.length, 0);
});

test("sessão deduplica candidatos equivalentes antes da resolução", () => {
  const state = {
    companyId: "company-session-fixture",
    assistantId: "assistant-session-fixture",
    conversationId: "conversation-session-fixture",
    contextVersion: 2,
    confirmedFacts: {
      technical_capacity: {
        key: "technical_capacity",
        value: 500,
        confidence: 1,
        sourceType: "CUSTOMER_TEXT",
        sourceMessageId: "message-session",
        confirmedAt: now,
      },
    },
    temporaryFacts: {
      technical_capacity: {
        key: "technical_capacity",
        value: 500,
        confidence: 1,
        sourceType: "CUSTOMER_TEXT",
        sourceMessageId: "message-session",
        confirmedAt: now,
      },
    },
  };
  const details = buildSessionEvidenceDetails({
    scope: { ...state, contactId: "contact-session-fixture" },
    state,
  });
  assert.equal(details.rawCandidateCount, 2);
  assert.equal(details.deduplicatedCount, 1);
  assert.equal(details.duplicateRejectedCount, 1);
});

test("LLM não seleciona visita externa sem evidência explícita de deslocamento", async () => {
  const router = new IntentRouterService({
    generateChatCompletion: async () => ({ answer: "flow-external" }),
  });
  const result = await router.route({
    companyId: "company-routing-fixture",
    assistantId: "assistant-routing-fixture",
    message: "Vocês têm disponibilidade amanhã às 14 horas para fazer o serviço?",
    flows: [
      {
        id: "flow-external",
        assistantId: "assistant-routing-fixture",
        name: "Nome configurado externamente",
        priority: 100,
        active: true,
        triggerKeywords: JSON.stringify(["serviço"]),
        triggerDescription: "atendimento com visita técnica externa",
      },
    ],
  });
  assert.equal(result.flowId, null);
  assert.equal(result.reason, "LLM_EXTERNAL_VISIT_WITHOUT_EVIDENCE");
});

function officialEvidence({ companyId, assistantId, category }) {
  const sourceId = `official-fixture-${category}`;
  return {
    contractVersion: 1,
    evidenceId: createEvidenceId({
      sourceType: "OFFICIAL_STRUCTURED",
      sourceId,
      companyId,
      assistantId,
      category,
      fieldKey: category,
    }),
    sourceType: "OFFICIAL_STRUCTURED",
    sourceId,
    companyId,
    assistantId,
    category,
    fieldKey: category,
    valueHash: `hash-${category}`,
    confidence: 1,
    authorityLevel: "AUTHORITATIVE",
    observedAt: now.toISOString(),
    validFrom: now.toISOString(),
    validUntil: null,
    freshnessStatus: "CURRENT",
    provenance: { sourceTable: "fixture", sourceRecordId: sourceId },
    isSensitive: false,
    isAuthoritative: true,
    sourceStatus: "ACTIVE",
  };
}

test("pipeline Shadow local reproduz os sete turnos sem provider ou outbound V2", async () => {
  const environment = {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: "assistant-seven-fixture",
    RUNTIME_V2_SHADOW_CONVERSATION_IDS: "conversation-seven-fixture",
    RUNTIME_V2_SHADOW_TIMEOUT_MS: "1000",
  };
  const companyId = "company-seven-fixture";
  const assistantId = "assistant-seven-fixture";
  const conversationId = "conversation-seven-fixture";
  const contactId = "contact-seven-fixture";
  const messages = [
    "Qual é o horário de atendimento no domingo?",
    "Qual é o WhatsApp ou telefone oficial da empresa?",
    "Quanto custa um produto instalado?",
    "Vocês têm disponibilidade amanhã às 14 horas para fazer o serviço?",
    "Vocês fazem upgrade para SSD de 500 GB e 16 GB de memória RAM em notebook?",
    "Para este atendimento, prefiro receber retorno pelo WhatsApp.",
    "Como eu prefiro receber retorno?",
  ];
  const store = new InMemoryConversationStateStore();
  const official = {
    async read({ companyId: c, assistantId: a, requestedCategories }) {
      const supported = requestedCategories.filter((category) =>
        ["BUSINESS_HOURS", "OFFICIAL_CONTACT"].includes(category),
      );
      return {
        evidence: supported.map((category) => officialEvidence({ companyId: c, assistantId: a, category })),
        missingCategories: requestedCategories.filter((category) => !supported.includes(category)),
        failures: [],
        scopeValidationFailures: [],
        adapterStatus: supported.length ? "COMPLETED" : "EMPTY",
        emptyReason: supported.length ? "SUCCESS" : "NO_STRUCTURED_VALUE",
        durationMs: 0,
      };
    },
  };
  const memoryAdapter = new MemoryEvidenceAdapter();
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    store,
    environment,
    () => now,
    official,
    new RagEvidenceAdapter(),
    memoryAdapter,
  );
  const results = [];
  for (let index = 0; index < messages.length; index += 1) {
    const id = `message-seven-${index + 1}`;
    const snapshot = {
      scope: { companyId, assistantId, contactId, conversationId, contextVersion: 1 },
      correlationId: `correlation-${id}`,
      internalMessageId: id,
      source: "CUSTOMER",
      messageType: "TEXT",
      currentMessage: messages[index],
      customerEvidenceFields: index === 5 ? ["contact_preference_channel"] : [],
      ragObservation:
        index === 4
          ? createRagRetrievalObservation({
              companyId,
              assistantId,
              internalMessageId: id,
              retrievalExecuted: true,
              threshold: 0.7,
              thresholdSource: "default",
              results: [
                {
                  knowledgeId: "knowledge-technical-fixture",
                  chunkId: "chunk-technical-fixture",
                  contentPreview: "conteúdo sintético não persistido",
                  score: 0.86,
                  metadata: { category: "TECHNICAL_INFORMATION" },
                },
              ],
            })
          : undefined,
      memoryObservation:
        index === 6
          ? createMemoryRetrievalObservation({
              companyId,
              assistantId,
              contactId,
              conversationId,
              contextVersion: 1,
              internalMessageId: id,
              profileId: "profile-seven-fixture",
              retrievalExecuted: true,
              configurationSnapshot: {
                memoryEnabled: true,
                memoryExtractionEnabled: true,
                allowedCategories: ["CONTACT_PREFERENCE"],
                confidenceThreshold: 0.7,
                temporaryDefaultDays: 7,
                sharedAcrossAssistants: false,
              },
              selectedMemories: [
                {
                  id: "memory-preference-fixture",
                  category: "PREFERENCE",
                  confidence: 0.95,
                  active: true,
                  contentHash: "memory-hash-fixture",
                  updatedAt: now,
                },
              ],
            })
          : undefined,
    };
    results.push(await orchestrator.process(snapshot));
  }
  assert.equal(results.length, 7);
  assert.equal(results[0].manifest.evidence.authorityDecisionsByCategory.BUSINESS_HOURS, "AUTHORIZED");
  assert.equal(results[1].manifest.evidence.authorityDecisionsByCategory.OFFICIAL_CONTACT, "AUTHORIZED");
  assert.equal(results[2].manifest.evidence.authorityDecisionsByCategory.PRICE, "SAFE_UNAVAILABLE");
  assert.equal(results[3].manifest.evidence.authorityDecisionsByCategory.AVAILABILITY, "SAFE_UNAVAILABLE");
  assert.equal(results[4].manifest.evidence.rag.ragRetrievalExecuted, true);
  assert.equal(results[5].manifest.evidence.authorityDecisionsByCategory.CONTACT_PREFERENCE, "AUTHORIZED");
  assert.equal(results[6].manifest.evidence.memory.memoryRetrievalExecuted, true);
  assert.ok(results.every((result) => result.manifest.providerCalled === false));
  assert.ok(results.every((result) => result.manifest.toolCalls === 0));
  assert.ok(results.every((result) => result.manifest.outboundSent === false));
  assert.deepEqual(results.map((result) => [result.manifest.revisionBefore, result.manifest.revisionAfter]), [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
  ]);
});
