import assert from "node:assert/strict";
import test from "node:test";
import {
  EVIDENCE_CONTRACT_VERSION,
  DEFAULT_EVIDENCE_POLICIES,
  InMemoryOfficialEvidenceAdapter,
  InMemorySessionEvidenceAdapter,
  buildEvidenceManifestExtension,
  createEvidenceId,
  deserializeEvidenceContract,
  evaluateFreshness,
  redactRetrievalBundle,
  redactSourceEvidence,
  resolveAuthority,
  resolveRuntimeV2EvidenceMode,
  serializeEvidenceContract,
  validateEvidenceScope,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "company-contract-test",
  assistantId: "assistant-contract-test",
  contactId: "contact-contract-test",
  conversationId: "conversation-contract-test",
  contextVersion: 3,
};
const now = new Date("2026-07-15T12:00:00.000Z");
const validFrom = "2026-07-01T00:00:00.000Z";
const validUntil = "2026-08-01T00:00:00.000Z";

function evidence(overrides = {}) {
  const base = {
    contractVersion: EVIDENCE_CONTRACT_VERSION,
    evidenceId: "evidence-default",
    sourceType: "OFFICIAL_STRUCTURED",
    sourceId: "record-default",
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    category: "PRICE",
    fieldKey: "price",
    normalizedValue: "non-persisted-value",
    valueHash: "hash-default",
    confidence: 1,
    authorityLevel: "AUTHORITATIVE",
    observedAt: "2026-07-10T12:00:00.000Z",
    validFrom,
    validUntil,
    freshnessStatus: "CURRENT",
    provenance: { sourceTable: "test_source" },
    isSensitive: false,
    isAuthoritative: true,
    sourceStatus: "ACTIVE",
  };
  return { ...base, ...overrides };
}

test("1. contratos serializam e desserializam com versão explícita", () => {
  const serialized = serializeEvidenceContract(evidence());
  const restored = deserializeEvidenceContract(serialized);
  assert.equal(restored.contractVersion, 1);
  assert.equal(typeof restored.evidenceId, "string");
});

test("2. versão desconhecida é rejeitada", () => {
  assert.throws(() => serializeEvidenceContract({ contractVersion: 99 }), /VERSION_UNSUPPORTED/);
  assert.throws(
    () => deserializeEvidenceContract(JSON.stringify({ contractVersion: 99 })),
    /VERSION_UNSUPPORTED/,
  );
});

test("3. companyId ausente é rejeitado", () => {
  assert.equal(
    validateEvidenceScope(evidence({ companyId: "" }), scope).status,
    "REQUIRED_SCOPE_MISSING",
  );
});

test("4. companyId divergente é rejeitado", () => {
  assert.equal(
    validateEvidenceScope(evidence({ companyId: "other-company" }), scope).status,
    "COMPANY_SCOPE_MISMATCH",
  );
});

test("5. assistantId divergente é rejeitado", () => {
  assert.equal(
    validateEvidenceScope(evidence({ assistantId: "other-assistant" }), scope).status,
    "ASSISTANT_SCOPE_MISMATCH",
  );
});

test("6. contactId divergente é rejeitado", () => {
  assert.equal(
    validateEvidenceScope(
      evidence({ sourceType: "CONTACT_MEMORY", contactId: "other-contact" }),
      scope,
    ).status,
    "CONTACT_SCOPE_MISMATCH",
  );
});

test("7. conversationId divergente é rejeitado", () => {
  assert.equal(
    validateEvidenceScope(
      evidence({
        sourceType: "SESSION_FACT",
        conversationId: "other-conversation",
        contextVersion: 3,
      }),
      scope,
    ).status,
    "CONVERSATION_SCOPE_MISMATCH",
  );
});

test("8. contextVersion divergente é rejeitado", () => {
  assert.equal(
    validateEvidenceScope(
      evidence({
        sourceType: "SESSION_FACT",
        conversationId: scope.conversationId,
        contextVersion: 2,
      }),
      scope,
    ).status,
    "CONTEXT_VERSION_MISMATCH",
  );
});

test("9. CUID é preservado pela redaction", () => {
  const id = "cmrcunljc008rrq01d7urn2t5";
  assert.equal(redactSourceEvidence(evidence({ evidenceId: id, sourceId: id })).evidenceId, id);
});

test("10. UUID é preservado pela redaction", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  assert.equal(redactSourceEvidence(evidence({ evidenceId: id, sourceId: id })).sourceId, id);
});

test("11. ID numérico é preservado pela redaction", () => {
  const redacted = redactSourceEvidence(evidence({ evidenceId: "533", sourceId: "50" }));
  assert.equal(redacted.evidenceId, "533");
  assert.equal(redacted.sourceId, "50");
});

test("12. telefone não é persistido", () => {
  const redacted = redactSourceEvidence(
    evidence({ normalizedValue: "+5511999999999", isSensitive: true }),
  );
  assert.equal("normalizedValue" in redacted, false);
});

test("13. e-mail não é persistido", () => {
  const redacted = redactSourceEvidence(
    evidence({ normalizedValue: "cliente@example.test", isSensitive: true }),
  );
  assert.equal("normalizedValue" in redacted, false);
});

test("14. texto livre não autorizado não é persistido", () => {
  const redacted = redactSourceEvidence(
    evidence({ normalizedValue: "prompt e resposta integrais" }),
  );
  assert.equal("normalizedValue" in redacted, false);
  assert.equal("selectionReason" in redacted.provenance, false);
});

test("15. freshness CURRENT é determinística", () => {
  assert.deepEqual(
    evaluateFreshness({
      sourceType: "OFFICIAL_STRUCTURED",
      category: "PRICE",
      observedAt: "2026-07-10T12:00:00.000Z",
      validFrom,
      validUntil,
      currentTime: now,
    }),
    { status: "CURRENT", eligible: true, reason: "CURRENT" },
  );
});

test("16. freshness STALE respeita policy", () => {
  const result = evaluateFreshness({
    sourceType: "OFFICIAL_DOCUMENT",
    category: "PRICE",
    observedAt: "2026-07-01T00:00:00.000Z",
    policy: { ttlMs: 1_000 },
    currentTime: now,
  });
  assert.equal(result.status, "STALE");
  assert.equal(result.eligible, false);
});

test("17. freshness EXPIRED rejeita validUntil vencido", () => {
  const result = evaluateFreshness({
    sourceType: "OFFICIAL_STRUCTURED",
    category: "PRICE",
    observedAt: "2026-07-01T00:00:00.000Z",
    validUntil: "2026-07-10T00:00:00.000Z",
    currentTime: now,
  });
  assert.equal(result.status, "EXPIRED");
  assert.equal(result.eligible, false);
});

test("18. freshness UNKNOWN sem validade não vira autoridade automática", () => {
  const result = evaluateFreshness({
    sourceType: "OFFICIAL_DOCUMENT",
    category: "PRICE",
    observedAt: "2026-07-10T00:00:00.000Z",
    currentTime: now,
  });
  assert.equal(result.status, "UNKNOWN");
  assert.equal(result.eligible, false);
});

test("19. validFrom futuro permanece não vigente", () => {
  const result = evaluateFreshness({
    sourceType: "OFFICIAL_STRUCTURED",
    category: "PRICE",
    observedAt: "2026-07-10T00:00:00.000Z",
    validFrom: "2026-07-20T00:00:00.000Z",
    validUntil,
    currentTime: now,
  });
  assert.equal(result.reason, "NOT_YET_VALID");
  assert.equal(result.eligible, false);
});

test("20. MODEL_GENERATED é rejeitado como autoridade", () => {
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: [evidence({ sourceType: "MODEL_GENERATED", authorityLevel: "AUTHORITATIVE" })],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
});

test("21. histórico é rejeitado como autoridade", () => {
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: [evidence({ sourceType: "CONVERSATION_HISTORY" })],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
});

test("22. flow é rejeitado como autoridade isolada", () => {
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: [evidence({ sourceType: "FLOW_GUIDANCE" })],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
});

test("23. memória é rejeitada para preço", () => {
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: [evidence({ sourceType: "CONTACT_MEMORY", contactId: scope.contactId })],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
});

test("24. memória é rejeitada para horário da empresa", () => {
  const decision = resolveAuthority({
    requestedCategory: "BUSINESS_HOURS",
    candidates: [
      evidence({
        sourceType: "CONTACT_MEMORY",
        category: "BUSINESS_HOURS",
        contactId: scope.contactId,
      }),
    ],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
});

test("25. memória pode autorizar preferência do contato dentro da policy", () => {
  const decision = resolveAuthority({
    requestedCategory: "CONTACT_PREFERENCE",
    candidates: [
      evidence({
        sourceType: "CONTACT_MEMORY",
        category: "CONTACT_PREFERENCE",
        contactId: scope.contactId,
        validFrom,
        validUntil,
      }),
    ],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "AUTHORIZED");
});

test("26. customer-provided autoriza identidade do próprio cliente na sessão", () => {
  const decision = resolveAuthority({
    requestedCategory: "CUSTOMER_IDENTITY",
    candidates: [
      evidence({
        sourceType: "CUSTOMER_PROVIDED",
        category: "CUSTOMER_IDENTITY",
        conversationId: scope.conversationId,
        contextVersion: scope.contextVersion,
      }),
    ],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "AUTHORIZED");
});

test("27. customer-provided não autoriza política empresarial", () => {
  const decision = resolveAuthority({
    requestedCategory: "COMMERCIAL_POLICY",
    candidates: [
      evidence({
        sourceType: "CUSTOMER_PROVIDED",
        category: "COMMERCIAL_POLICY",
        conversationId: scope.conversationId,
        contextVersion: scope.contextVersion,
      }),
    ],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
});

test("28. estruturado oficial vence documento contextual", () => {
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: [
      evidence({
        evidenceId: "structured",
        sourceId: "structured",
        valueHash: "same",
        sourceType: "OFFICIAL_STRUCTURED",
      }),
      evidence({
        evidenceId: "document",
        sourceId: "document",
        valueHash: "other",
        sourceType: "OFFICIAL_DOCUMENT",
        authorityLevel: "CONTEXTUAL",
        isAuthoritative: false,
      }),
    ],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "AUTHORIZED");
  assert.deepEqual(decision.winningEvidenceIds, ["structured"]);
});

test("29. ferramenta atual vence para disponibilidade somente com coverage", () => {
  const decision = resolveAuthority({
    requestedCategory: "AVAILABILITY",
    candidates: [
      evidence({
        evidenceId: "tool-availability",
        sourceId: "tool-availability",
        sourceType: "TOOL_RESULT",
        category: "AVAILABILITY",
        provenance: { sourceTool: "read-only-test", coveredCategories: ["AVAILABILITY"] },
      }),
    ],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "AUTHORIZED");
});

test("30. horário de funcionamento não confirma disponibilidade", () => {
  const decision = resolveAuthority({
    requestedCategory: "AVAILABILITY",
    candidates: [evidence({ sourceType: "OFFICIAL_STRUCTURED", category: "BUSINESS_HOURS" })],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
});

test("31. documento sem versão fica UNKNOWN", () => {
  const result = evaluateFreshness({
    sourceType: "OFFICIAL_DOCUMENT",
    category: "PRICE",
    observedAt: "2026-07-10T00:00:00.000Z",
    currentTime: now,
  });
  assert.equal(result.status, "UNKNOWN");
});

test("32. duas fontes autoritativas conflitantes produzem CONFLICT", () => {
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: [
      evidence({ evidenceId: "price-a", sourceId: "price-a", valueHash: "a" }),
      evidence({ evidenceId: "price-b", sourceId: "price-b", valueHash: "b" }),
    ],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "CONFLICT");
  assert.equal(decision.conflictDetected, true);
  assert.deepEqual(decision.winningEvidenceIds, []);
});

test("33. ausência de fonte válida produz SAFE_UNAVAILABLE", () => {
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: [],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "SAFE_UNAVAILABLE");
});

test("34. fonte fora do tenant não participa", () => {
  const decision = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: [evidence({ companyId: "other-company" })],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
  assert.deepEqual(decision.winningEvidenceIds, []);
});

test("35. confirmação humana sem validade é rejeitada", () => {
  const decision = resolveAuthority({
    requestedCategory: "BUSINESS_HOURS_EXCEPTION",
    candidates: [
      evidence({
        sourceType: "HUMAN_CONFIRMED",
        category: "BUSINESS_HOURS_EXCEPTION",
        provenance: { confirmedCategory: "BUSINESS_HOURS_EXCEPTION" },
        validFrom: null,
        validUntil: null,
      }),
    ],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "INVALID_EVIDENCE");
});

test("36. confirmação humana válida e escopada pode autorizar a categoria", () => {
  const decision = resolveAuthority({
    requestedCategory: "BUSINESS_HOURS_EXCEPTION",
    candidates: [
      evidence({
        sourceType: "HUMAN_CONFIRMED",
        category: "BUSINESS_HOURS_EXCEPTION",
        provenance: { confirmedCategory: "BUSINESS_HOURS_EXCEPTION" },
      }),
    ],
    scope,
    currentTime: now,
  });
  assert.equal(decision.status, "AUTHORIZED");
});

test("37. manifesto sanitizado não contém conteúdo sensível", () => {
  const bundle = {
    contractVersion: 1,
    requestedCategories: ["PRICE"],
    officialEvidence: [evidence({ normalizedValue: "telefone ou prompt" })],
    documentEvidence: [],
    toolEvidence: [],
    humanEvidence: [],
    flowGuidance: [],
    memoryEvidence: [],
    customerEvidence: [],
    sessionEvidence: [],
    contextualEvidence: [],
    conflicts: [],
    missingCategories: [],
  };
  const redacted = redactRetrievalBundle(bundle);
  assert.equal(JSON.stringify(redacted).includes("telefone ou prompt"), false);
  assert.equal(JSON.stringify(redacted).includes("normalizedValue"), false);
});

test("38. adapters fake exigem ScopeContext e filtram escopo", async () => {
  const adapter = new InMemoryOfficialEvidenceAdapter();
  adapter.add(evidence());
  assert.equal((await adapter.read(scope)).length, 1);
  await assert.rejects(() => adapter.read(undefined));
});

test("39. feature de evidências permanece OFF por default", () => {
  assert.equal(resolveRuntimeV2EvidenceMode({}, {}), "OFF");
  assert.equal(resolveRuntimeV2EvidenceMode({ evidenceMode: "INVALID" }, {}), "OFF");
});

test("40. modo SHADOW_METADATA é somente configuração tipada e não ativa o Shadow V2", () => {
  assert.equal(
    resolveRuntimeV2EvidenceMode({ evidenceMode: "SHADOW_METADATA" }, {}),
    "SHADOW_METADATA",
  );
  assert.equal(
    resolveRuntimeV2EvidenceMode({}, { RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA" }),
    "SHADOW_METADATA",
  );
  assert.equal(
    resolveRuntimeV2EvidenceMode(
      {},
      { RUNTIME_V2_MODE: "OFF", RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA" },
    ),
    "SHADOW_METADATA",
  );
});

test("41. IDs determinísticos não dependem de valor livre", () => {
  const first = createEvidenceId({
    sourceType: "OFFICIAL_STRUCTURED",
    sourceId: "record",
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    category: "PRICE",
    fieldKey: "price",
  });
  const second = createEvidenceId({
    sourceType: "OFFICIAL_STRUCTURED",
    sourceId: "record",
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    category: "PRICE",
    fieldKey: "price",
  });
  assert.equal(first, second);
});

test("42. manifesto registra contagens sem valores de evidência", () => {
  const extension = buildEvidenceManifestExtension({
    requestedCategories: ["PRICE"],
    decisions: [
      resolveAuthority({
        requestedCategory: "PRICE",
        candidates: [evidence()],
        scope,
        currentTime: now,
      }),
    ],
    evidence: [evidence()],
  });
  assert.equal(extension.evidenceContractVersion, 1);
  assert.equal(extension.candidateEvidenceCount, 1);
  assert.deepEqual(extension.freshnessCounts, { CURRENT: 1 });
  assert.equal("normalizedValue" in extension, false);
});
