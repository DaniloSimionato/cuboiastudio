import assert from "node:assert/strict";
import { test } from "node:test";
import {
  InMemoryConversationStateStore,
  RagEvidenceAdapter,
  RuntimeV2ShadowOrchestrator,
  createRagRetrievalObservation,
  resolveAuthority,
  redactSourceEvidence,
} from "../dist/runtime-v2/index.js";

const now = new Date("2026-07-15T12:00:00.000Z");
const scope = {
  companyId: "rag-company-a",
  assistantId: "rag-assistant-a",
  conversationId: "rag-conversation-a",
  contextVersion: 1,
};

function observation(overrides = {}) {
  return {
    retrievalExecuted: true,
    retrievalSource: "V1_PIPELINE",
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    internalMessageId: "rag-message-1",
    queryCategory: "KNOWLEDGE",
    threshold: 0.7,
    thresholdSource: "default",
    resultCount: 1,
    observedAt: now.toISOString(),
    items: [
      {
        knowledgeId: "knowledge-a",
        documentId: "knowledge-a",
        chunkId: "chunk-a",
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        similarityScore: 0.91,
        documentStatus: "ACTIVE",
        processingStatus: "READY",
        category: "PRICE",
        sourceMetadata: {},
        contentHash: "hash-a",
      },
    ],
    ...overrides,
  };
}

test("observação V1 não executada não inicia busca no adapter", () => {
  const result = new RagEvidenceAdapter().read({
    scope,
    requestedCategories: ["PRICE"],
    observation: createRagRetrievalObservation({
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      internalMessageId: "message-not-executed",
      retrievalExecuted: false,
      threshold: 0.7,
      thresholdSource: "default",
      results: [],
      observedAt: now,
    }),
    currentTime: now,
  });
  assert.equal(result.adapterStatus, "NOT_EXECUTED");
  assert.deepEqual(result.evidence, []);
  assert.deepEqual(result.missingCategories, ["PRICE"]);
  assert.equal(result.manifest.ragContentPersisted, false);
});

test("observação sanitizada preserva somente IDs, score, status e hash", () => {
  const result = createRagRetrievalObservation({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    internalMessageId: "message-observation",
    retrievalExecuted: true,
    threshold: 0.7,
    thresholdSource: "default",
    observedAt: now,
    results: [
      {
        knowledgeId: "knowledge-a",
        knowledgeTitle: "título não deve ser transportado",
        chunkId: "chunk-a",
        contentPreview: "conteúdo não deve ser transportado",
        score: 0.88,
        metadata: {
          category: "PRICE",
          official: false,
          secretText: "remover",
          validUntil: "2026-12-31T00:00:00.000Z",
        },
      },
    ],
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /título não deve ser transportado/);
  assert.doesNotMatch(serialized, /conteúdo não deve ser transportado/);
  assert.doesNotMatch(serialized, /remover/);
  assert.match(serialized, /chunk-a/);
  assert.match(serialized, /validUntil/);
  assert.match(serialized, /contentHash/);
});

test("adapter aceita resultado acima do threshold e rejeita abaixo, status inválido e categoria ausente", () => {
  const result = new RagEvidenceAdapter().read({
    scope,
    requestedCategories: ["PRICE"],
    observation: observation({
      resultCount: 4,
      items: [
        observation().items[0],
        { ...observation().items[0], chunkId: "chunk-below", similarityScore: 0.69 },
        { ...observation().items[0], chunkId: "chunk-inactive", documentStatus: "INACTIVE" },
        { ...observation().items[0], chunkId: "chunk-no-category", category: null },
      ],
    }),
    currentTime: now,
  });
  assert.equal(result.evidence.length, 1);
  assert.equal(result.rejectedEvidenceIds.length, 3);
  assert.equal(result.manifest.ragBelowThresholdRejected, 1);
  assert.equal(result.manifest.ragInactiveRejected, 1);
  assert.equal(result.manifest.ragMissingProvenanceRejected, 1);
});

test("RAG contextual não autoriza preço apenas pelo score", () => {
  const result = new RagEvidenceAdapter().read({
    scope,
    requestedCategories: ["PRICE"],
    observation: observation(),
    currentTime: now,
  });
  assert.equal(result.evidence[0].sourceType, "RAG_DOCUMENT");
  assert.equal(result.evidence[0].authorityLevel, "CONTEXTUAL");
  assert.equal(result.evidence[0].isAuthoritative, false);
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: result.evidence,
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
  assert.equal(decision.winningEvidenceIds.length, 0);
});

test("RAG estático não autoriza availability nem booking", () => {
  for (const category of ["AVAILABILITY", "BOOKING"]) {
    const result = new RagEvidenceAdapter().read({
      scope,
      requestedCategories: [category],
      observation: observation({
        items: [{ ...observation().items[0], category }],
      }),
      currentTime: now,
    });
    const decision = resolveAuthority({
      requestedCategory: category,
      candidates: result.evidence,
      scope,
      currentTime: now,
    });
    assert.equal(decision.status, "INVALID_EVIDENCE");
  }
});

test("threshold explícito é observado e freshness sem validade permanece UNKNOWN", () => {
  const result = new RagEvidenceAdapter().read({
    scope,
    requestedCategories: ["TECHNICAL_INFORMATION"],
    observation: observation({
      threshold: 0.8,
      thresholdSource: "explicit",
      items: [
        { ...observation().items[0], category: "TECHNICAL_INFORMATION", similarityScore: 0.81 },
      ],
    }),
    currentTime: now,
  });
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].freshnessStatus, "UNKNOWN");
  assert.equal(result.manifest.ragThreshold, 0.8);
  assert.equal(result.manifest.ragThresholdSource, "explicit");
});

test("documento explicitamente oficial com validade pode ser resolvido por categoria", () => {
  const result = new RagEvidenceAdapter().read({
    scope,
    requestedCategories: ["PRICE"],
    observation: observation({
      items: [
        {
          ...observation().items[0],
          sourceMetadata: {
            official: true,
            category: "PRICE",
            validFrom: "2026-01-01T00:00:00.000Z",
            validUntil: "2026-12-31T00:00:00.000Z",
          },
        },
      ],
    }),
    currentTime: now,
  });
  assert.equal(result.evidence[0].sourceType, "OFFICIAL_DOCUMENT");
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: result.evidence,
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "AUTHORIZED");
});

test("dois documentos explicitamente oficiais conflitantes produzem CONFLICT", () => {
  const base = observation().items[0];
  const result = new RagEvidenceAdapter().read({
    scope,
    requestedCategories: ["PRICE"],
    observation: observation({
      resultCount: 2,
      items: [
        {
          ...base,
          chunkId: "official-price-a",
          contentHash: "official-price-a-hash",
          sourceMetadata: {
            official: true,
            category: "PRICE",
            validFrom: "2026-01-01T00:00:00.000Z",
            validUntil: "2026-12-31T00:00:00.000Z",
          },
        },
        {
          ...base,
          chunkId: "official-price-b",
          contentHash: "official-price-b-hash",
          sourceMetadata: {
            official: true,
            category: "PRICE",
            validFrom: "2026-01-01T00:00:00.000Z",
            validUntil: "2026-12-31T00:00:00.000Z",
          },
        },
      ],
    }),
    currentTime: now,
  });
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: result.evidence,
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "CONFLICT");
  assert.equal(decision.conflictDetected, true);
});

test("escopo divergente rejeita evidência sem consultar outra fonte", () => {
  const result = new RagEvidenceAdapter().read({
    scope,
    requestedCategories: ["PRICE"],
    observation: observation({ companyId: "rag-company-b" }),
    currentTime: now,
  });
  assert.equal(result.adapterStatus, "FAILED");
  assert.deepEqual(result.evidence, []);
  assert.equal(result.manifest.ragCrossTenantRejected, 1);
  assert.ok(result.scopeValidationFailures.includes("COMPANY_SCOPE_MISMATCH"));
});

test("manifesto redigido não contém conteúdo, query ou embedding", () => {
  const result = new RagEvidenceAdapter().read({
    scope,
    requestedCategories: ["PRICE"],
    observation: observation(),
    currentTime: now,
  });
  const redacted = redactSourceEvidence(result.evidence[0]);
  const serialized = JSON.stringify({ redacted, manifest: result.manifest });
  assert.doesNotMatch(serialized, /conteúdo integral|query original|embedding payload/i);
  assert.match(serialized, /hash-a/);
});

test("Shadow Metadata combina observação RAG sem provider, ferramenta ou outbound V2", async () => {
  const ragAdapter = new RagEvidenceAdapter();
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
      RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
    },
    () => now,
    undefined,
    ragAdapter,
  );
  const result = await orchestrator.process({
    scope,
    correlationId: "rag-correlation-1",
    internalMessageId: "rag-orchestrator-message",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Qual é o preço?",
    ragObservation: observation(),
  });
  assert.equal(result.manifest.evidence.evidenceMode, "SHADOW_METADATA");
  assert.equal(result.manifest.evidence.rag.ragRetrievalExecuted, true);
  assert.equal(result.manifest.evidence.rag.ragEvidenceCount, 1);
  assert.equal(result.manifest.evidence.rag.ragContentPersisted, false);
  assert.equal(result.manifest.providerCalled, false);
  assert.equal(result.manifest.toolCalls, 0);
  assert.equal(result.manifest.outboundSent, false);
});

test("OFF e SHADOW sem metadata não observam RAG", async () => {
  let calls = 0;
  const adapter = {
    read(input) {
      calls += 1;
      return new RagEvidenceAdapter().read(input);
    },
  };
  const snapshot = {
    scope,
    correlationId: "rag-off-correlation",
    internalMessageId: "rag-off-message",
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Qual é o preço?",
    ragObservation: observation(),
  };
  const off = new RuntimeV2ShadowOrchestrator(new InMemoryConversationStateStore(), {}, () => now);
  assert.equal((await off.process(snapshot)).manifest, null);
  const shadow = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    { RUNTIME_V2_MODE: "SHADOW", RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId },
    () => now,
    undefined,
    adapter,
  );
  const result = await shadow.process(snapshot);
  assert.equal(result.manifest.evidence.evidenceMode, "OFF");
  assert.equal(calls, 0);
});
