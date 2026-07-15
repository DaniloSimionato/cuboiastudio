import assert from "node:assert/strict";
import { test } from "node:test";
import {
  InMemoryConversationStateStore,
  RuntimeV2ShadowOrchestrator,
  buildCustomerEvidence,
  buildSessionEvidence,
  combineEvidence,
  createEvidenceId,
  resolveAuthority,
} from "../dist/runtime-v2/index.js";

const now = new Date("2026-07-15T12:00:00.000Z");
const scope = {
  companyId: "bundle-company-a",
  assistantId: "bundle-assistant-a",
  contactId: "bundle-contact-a",
  conversationId: "bundle-conversation-a",
  contextVersion: 4,
};

function evidence(overrides = {}) {
  const sourceType = overrides.sourceType ?? "OFFICIAL_STRUCTURED";
  const sourceId = overrides.sourceId ?? "source-a";
  const category = overrides.category ?? "BUSINESS_HOURS";
  const fieldKey = overrides.fieldKey ?? "business_hours";
  return {
    contractVersion: 1,
    evidenceId:
      overrides.evidenceId ??
      createEvidenceId({
        sourceType,
        sourceId,
        companyId: overrides.companyId ?? scope.companyId,
        assistantId: overrides.assistantId ?? scope.assistantId,
        category,
        fieldKey,
      }),
    sourceType,
    sourceId,
    companyId: overrides.companyId ?? scope.companyId,
    assistantId: overrides.assistantId ?? scope.assistantId,
    contactId: overrides.contactId ?? null,
    conversationId: overrides.conversationId ?? null,
    contextVersion: overrides.contextVersion ?? null,
    category,
    fieldKey,
    valueHash: overrides.valueHash ?? "value-a",
    confidence: overrides.confidence ?? 1,
    authorityLevel: overrides.authorityLevel ?? "AUTHORITATIVE",
    observedAt: now.toISOString(),
    validFrom: now.toISOString(),
    validUntil: overrides.validUntil ?? null,
    freshnessStatus: overrides.freshnessStatus ?? "CURRENT",
    provenance: overrides.provenance ?? { sourceTable: "fixture" },
    isSensitive: false,
    isAuthoritative: overrides.isAuthoritative ?? true,
    sourceStatus: "ACTIVE",
  };
}

test("bundle combinado preserva as coleções por fonte e decide por categoria", () => {
  const result = combineEvidence({
    scope,
    requestedCategories: ["BUSINESS_HOURS", "PRICE", "CONTACT_PREFERENCE"],
    officialEvidence: [evidence()],
    ragEvidence: [
      evidence({
        sourceType: "RAG_DOCUMENT",
        sourceId: "rag-hours",
        authorityLevel: "CONTEXTUAL",
        isAuthoritative: false,
      }),
    ],
    memoryEvidence: [
      evidence({
        sourceType: "CONTACT_MEMORY",
        sourceId: "memory-preference",
        category: "CONTACT_PREFERENCE",
        fieldKey: "preference",
        authorityLevel: "CONTEXTUAL",
        isAuthoritative: false,
        contactId: scope.contactId,
      }),
    ],
    customerEvidence: buildCustomerEvidence({
      scope,
      internalMessageId: "current-message",
      observedAt: now,
      fieldKeys: ["contact_preference_channel"],
      requestedCategories: ["CONTACT_PREFERENCE"],
    }),
    currentTime: now,
    adapterStatuses: { official: "COMPLETED", rag: "COMPLETED", memory: "COMPLETED" },
    adapterExecutionOrder: ["official", "rag", "memory", "customer", "session"],
  });

  assert.equal(result.bundle.officialEvidence.length, 1);
  assert.equal(result.bundle.documentEvidence.length, 1);
  assert.equal(result.bundle.memoryEvidence.length, 1);
  assert.equal(result.bundle.customerEvidence.length, 1);
  assert.equal(result.decisions.find((item) => item.requestedCategory === "BUSINESS_HOURS").status, "AUTHORIZED");
  assert.equal(result.decisions.find((item) => item.requestedCategory === "CONTACT_PREFERENCE").status, "AUTHORIZED");
  assert.equal(result.decisions.find((item) => item.requestedCategory === "PRICE").status, "SAFE_UNAVAILABLE");
});

test("deduplicação mantém uma evidência idêntica e rejeita hash divergente", () => {
  const first = evidence({ evidenceId: "duplicate-id", valueHash: "same" });
  const same = { ...first };
  const different = { ...first, valueHash: "different" };
  const result = combineEvidence({
    scope,
    requestedCategories: ["BUSINESS_HOURS"],
    officialEvidence: [first, same, different],
    currentTime: now,
  });
  assert.equal(result.duplicateEvidenceRejected, 2);
  assert.equal(result.evidence.length, 0);
  assert.deepEqual(result.rejectedEvidenceIds, ["duplicate-id"]);
  assert.equal(result.invalidEvidenceCount, 1);
});

test("cliente atual vence memória para preferência sem transformar memória em autoridade comercial", () => {
  const customer = buildCustomerEvidence({
    scope,
    internalMessageId: "message-current",
    observedAt: now,
    fieldKeys: ["contact_preference_channel"],
    requestedCategories: ["CONTACT_PREFERENCE"],
  });
  const memory = evidence({
    sourceType: "CONTACT_MEMORY",
    sourceId: "memory-old",
    category: "CONTACT_PREFERENCE",
    fieldKey: "contact_preference_channel",
    contactId: scope.contactId,
    authorityLevel: "CONTEXTUAL",
    isAuthoritative: false,
  });
  const result = combineEvidence({
    scope,
    requestedCategories: ["CONTACT_PREFERENCE", "PRICE"],
    customerEvidence: customer,
    memoryEvidence: [memory],
    currentTime: now,
  });
  const preference = result.decisions.find((item) => item.requestedCategory === "CONTACT_PREFERENCE");
  assert.equal(preference.status, "AUTHORIZED");
  assert.deepEqual(preference.winningEvidenceIds, [customer[0].evidenceId]);
  assert.equal(result.decisions.find((item) => item.requestedCategory === "PRICE").fallbackCategory, "PRICE");
});

test("sessão atual exige escopo e permanece contextual", () => {
  const state = {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    contextVersion: scope.contextVersion,
    confirmedFacts: {
      requested_ssd_capacity_gb: {
        key: "requested_ssd_capacity_gb",
        value: 500,
        confidence: 1,
        sourceType: "CUSTOMER_TEXT",
        sourceMessageId: "session-message",
        confirmedAt: now,
      },
    },
    temporaryFacts: {},
  };
  const session = buildSessionEvidence({ scope, state });
  assert.equal(session.length, 1);
  assert.equal(session[0].sourceType, "SESSION_FACT");
  assert.equal(session[0].authorityLevel, "CONTEXTUAL");
  assert.equal(session[0].normalizedValue, undefined);
  const result = combineEvidence({
    scope,
    requestedCategories: ["PRICE", "TECHNICAL_INFORMATION"],
    sessionEvidence: session,
    currentTime: now,
  });
  assert.equal(result.decisions.find((item) => item.requestedCategory === "PRICE").status, "SAFE_UNAVAILABLE");
  assert.equal(result.bundle.sessionEvidence.length, 1);
});

test("evidência fora do tenant e fonte expirada não entram na decisão", () => {
  const result = combineEvidence({
    scope,
    requestedCategories: ["BUSINESS_HOURS"],
    officialEvidence: [
      evidence({ companyId: "bundle-company-b", sourceId: "cross-tenant" }),
      evidence({
        sourceId: "expired",
        validUntil: "2020-01-01T00:00:00.000Z",
        freshnessStatus: "EXPIRED",
      }),
    ],
    currentTime: now,
  });
  assert.equal(result.evidence.length, 0);
  assert.ok(result.scopeValidationFailures.includes("COMPANY_SCOPE_MISMATCH"));
  assert.equal(result.decisions[0].status, "SAFE_UNAVAILABLE");
});

test("orquestrador Shadow persiste apenas decisões e metadata do bundle", async () => {
  const official = {
    async read({ companyId, assistantId, currentTime }) {
      return {
        evidence: [
          evidence({
            companyId,
            assistantId,
            category: "ADDRESS",
            fieldKey: "address",
            sourceId: "official-address",
          }),
        ],
        missingCategories: [],
        failures: [],
        scopeValidationFailures: [],
        adapterStatus: "COMPLETED",
        durationMs: 1,
      };
    },
  };
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
      RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
    },
    () => now,
    official,
  );
  const result = await orchestrator.process({
    scope: { ...scope, contactId: null },
    correlationId: "bundle-correlation",
    internalMessageId: "bundle-message",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Qual e o endereco?",
    customerEvidenceFields: ["device_model"],
  });
  assert.equal(result.manifest.evidence.retrievalBundleVersion, 1);
  assert.equal(result.manifest.evidence.providerCalled, undefined);
  assert.equal(result.manifest.providerCalled, false);
  assert.equal(result.manifest.evidence.customerEvidenceCount, 1);
  assert.equal(result.manifest.evidence.officialValuePersisted, false);
  assert.equal(result.manifest.evidence.memoryContentPersisted, false);
  assert.equal(result.manifest.evidence.authorityDecisionsByCategory.ADDRESS, "AUTHORIZED");
});

test("falha de adapter permanece fail-safe e não altera os sinais do V2", async () => {
  const failingOfficial = {
    async read() {
      throw new Error("adapter details must not escape");
    },
  };
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
      RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
    },
    () => now,
    failingOfficial,
  );
  const result = await orchestrator.process({
    scope,
    correlationId: "bundle-failure",
    internalMessageId: "bundle-failure-message",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Qual e o endereco?",
  });
  assert.equal(result.manifest.shadowErrorCode, null);
  assert.equal(result.manifest.providerCalled, false);
  assert.equal(result.manifest.toolCalls, 0);
  assert.equal(result.manifest.outboundSent, false);
  assert.equal(result.manifest.evidence.adapterStatuses.official, "FAILED");
  assert.equal(result.manifest.evidence.evidencePipelineError, null);
  assert.deepEqual(result.manifest.evidence.missingCategories, ["ADDRESS"]);
});
