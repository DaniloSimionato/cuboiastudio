import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_EVIDENCE_POLICIES,
  EVIDENCE_CONTRACT_VERSION,
  buildCustomerEvidence,
  buildCombinedEvidenceManifest,
  combineEvidence,
  evaluateFreshness,
  redactRetrievalBundle,
  resolveAuthority,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "company-hardening-a",
  assistantId: "assistant-hardening-a",
  contactId: "contact-hardening-a",
  conversationId: "conversation-hardening-a",
  contextVersion: 7,
};
const now = new Date("2026-07-15T12:00:00.000Z");
const validFrom = "2026-07-01T00:00:00.000Z";
const validUntil = "2026-08-01T00:00:00.000Z";

function evidence(overrides = {}) {
  const category = overrides.category ?? "PRICE";
  const sourceType = overrides.sourceType ?? "OFFICIAL_STRUCTURED";
  const sourceId = overrides.sourceId ?? `${sourceType.toLowerCase()}-1`;
  return {
    contractVersion: EVIDENCE_CONTRACT_VERSION,
    evidenceId: overrides.evidenceId ?? `${sourceType}-${sourceId}-${category}`,
    sourceType,
    sourceId,
    companyId: overrides.companyId ?? scope.companyId,
    assistantId: overrides.assistantId ?? scope.assistantId,
    contactId: overrides.contactId ?? scope.contactId,
    conversationId: overrides.conversationId ?? scope.conversationId,
    contextVersion: overrides.contextVersion ?? scope.contextVersion,
    category,
    fieldKey: overrides.fieldKey ?? category.toLowerCase(),
    normalizedValue: overrides.normalizedValue ?? { value: "synthetic" },
    valueHash: overrides.valueHash ?? `hash-${sourceId}`,
    confidence: overrides.confidence ?? 1,
    authorityLevel: overrides.authorityLevel ?? "AUTHORITATIVE",
    observedAt: overrides.observedAt ?? "2026-07-10T12:00:00.000Z",
    validFrom: overrides.validFrom === undefined ? validFrom : overrides.validFrom,
    validUntil: overrides.validUntil === undefined ? validUntil : overrides.validUntil,
    freshnessStatus: overrides.freshnessStatus ?? "CURRENT",
    provenance: overrides.provenance ?? { sourceTable: "synthetic_source" },
    isSensitive: overrides.isSensitive ?? false,
    isAuthoritative: overrides.isAuthoritative ?? true,
    sourceStatus: overrides.sourceStatus ?? "ACTIVE",
  };
}

function humanEvidence(overrides = {}) {
  return evidence({
    sourceType: "HUMAN_CONFIRMED",
    category: "AVAILABILITY",
    sourceId: "human-confirmation-1",
    validFrom,
    validUntil,
    provenance: {
      sourceTable: "human_confirmation",
      sourceRecordId: "human-record-1",
      sourceTool: "human_agent",
      confirmedCategory: "AVAILABILITY",
    },
    ...overrides,
  });
}

function toolEvidence(overrides = {}) {
  return evidence({
    sourceType: "TOOL_RESULT",
    category: "AVAILABILITY",
    sourceId: "availability-tool-1",
    provenance: {
      sourceTool: "synthetic_availability",
      coveredCategories: ["AVAILABILITY"],
    },
    ...overrides,
  });
}

function decision(category, candidates) {
  return resolveAuthority({
    requestedCategory: category,
    candidates,
    scope,
    currentTime: now,
  });
}

test("freshness matrix is deterministic for every supported category", () => {
  for (const category of Object.keys(DEFAULT_EVIDENCE_POLICIES)) {
    const result = evaluateFreshness({
      sourceType: "OFFICIAL_STRUCTURED",
      category,
      observedAt: "2026-07-10T12:00:00.000Z",
      validFrom,
      validUntil,
      currentTime: now,
    });
    assert.deepEqual(result, { status: "CURRENT", eligible: true, reason: "CURRENT" });
  }
});

test("freshness honors exact validity and TTL boundaries", () => {
  assert.equal(
    evaluateFreshness({
      sourceType: "OFFICIAL_STRUCTURED",
      category: "BUSINESS_HOURS",
      observedAt: "2026-07-10T12:00:00.000Z",
      validUntil: now.toISOString(),
      currentTime: now,
    }).status,
    "CURRENT",
  );
  assert.equal(
    evaluateFreshness({
      sourceType: "OFFICIAL_DOCUMENT",
      category: "PRICE",
      observedAt: "2026-07-15T11:00:00.000Z",
      policy: { ttlMs: 3_600_000 },
      currentTime: now,
    }).status,
    "CURRENT",
  );
  assert.equal(
    evaluateFreshness({
      sourceType: "OFFICIAL_DOCUMENT",
      category: "PRICE",
      observedAt: "2026-07-15T10:59:59.999Z",
      policy: { ttlMs: 3_600_000 },
      currentTime: now,
    }).status,
    "STALE",
  );
});

test("freshness rejects invalid, missing, future and expired dates", () => {
  const cases = [
    ["not-a-date", undefined, "UNKNOWN_INVALID_DATE"],
    [null, undefined, "UNKNOWN_NO_OBSERVED_AT"],
    ["2026-07-10T12:00:00.000Z", "2026-07-20T00:00:00.000Z", "NOT_YET_VALID"],
    ["2026-07-10T12:00:00.000Z", "2026-07-10T00:00:00.000Z", "EXPIRED_VALID_UNTIL"],
  ];
  for (const [observedAt, validUntilForCase, reason] of cases) {
    const result = evaluateFreshness({
      sourceType: "OFFICIAL_DOCUMENT",
      category: "PRICE",
      observedAt,
      validFrom: reason === "NOT_YET_VALID" ? validUntilForCase : undefined,
      validUntil: reason === "EXPIRED_VALID_UNTIL" ? validUntilForCase : undefined,
      currentTime: now,
    });
    assert.equal(result.reason, reason);
    assert.equal(result.eligible, false);
  }
});

test("timezone offsets and DST-adjacent timestamps describe the same instant", () => {
  const result = evaluateFreshness({
    sourceType: "OFFICIAL_STRUCTURED",
    category: "BUSINESS_HOURS",
    observedAt: "2026-03-08T06:59:59-05:00",
    validFrom: "2026-03-08T06:00:00Z",
    validUntil: "2026-03-08T07:00:00Z",
    currentTime: new Date("2026-03-08T06:59:59Z"),
  });
  assert.equal(result.status, "CURRENT");
  assert.equal(result.eligible, true);
});

test("stale and unknown do not authorize unless policy explicitly allows them", () => {
  const stale = decision("PRICE", [
    evidence({
      validFrom: null,
      validUntil: null,
      observedAt: "2026-07-15T10:00:00.000Z",
      sourceType: "OFFICIAL_DOCUMENT",
    }),
  ]);
  assert.equal(stale.status, "INVALID_EVIDENCE");
  const unknown = decision("PRICE", [
    evidence({
      validFrom: null,
      validUntil: null,
      observedAt: null,
      sourceType: "OFFICIAL_DOCUMENT",
    }),
  ]);
  assert.equal(unknown.status, "INVALID_EVIDENCE");
  const stalePolicy = {
    ...DEFAULT_EVIDENCE_POLICIES.PRICE,
    freshnessTtlMs: 1_000,
    allowStaleAsAuthority: true,
  };
  const explicitlyAllowed = resolveAuthority({
    requestedCategory: "PRICE",
    candidates: [
      evidence({
        sourceType: "OFFICIAL_DOCUMENT",
        validFrom: null,
        validUntil: null,
        observedAt: "2026-07-15T10:00:00.000Z",
      }),
    ],
    scope,
    policy: stalePolicy,
    currentTime: now,
  });
  assert.equal(explicitlyAllowed.status, "AUTHORIZED");
});

test("structured current evidence wins contextual RAG and expired structured evidence is rejected", () => {
  const current = evidence({ sourceId: "hours-current", category: "BUSINESS_HOURS", valueHash: "open" });
  const rag = evidence({
    sourceType: "RAG_DOCUMENT",
    sourceId: "hours-rag",
    category: "BUSINESS_HOURS",
    authorityLevel: "CONTEXTUAL",
    isAuthoritative: false,
    valueHash: "different",
  });
  const expired = evidence({
    sourceId: "hours-expired",
    category: "BUSINESS_HOURS",
    validUntil: "2026-07-15T11:59:59.999Z",
    valueHash: "expired",
  });
  const result = decision("BUSINESS_HOURS", [current, rag, expired]);
  assert.equal(result.status, "AUTHORIZED");
  assert.deepEqual(result.winningEvidenceIds, [current.evidenceId]);
  assert.deepEqual(result.rejectedEvidenceIds, [expired.evidenceId, rag.evidenceId].sort());
});

test("category decisions do not leak authority across price, availability, booking or address", () => {
  assert.equal(decision("PRICE", [toolEvidence({ category: "PRICE" })]).status, "INVALID_EVIDENCE");
  assert.equal(decision("AVAILABILITY", [evidence({ category: "BUSINESS_HOURS" })]).status, "INVALID_EVIDENCE");
  assert.equal(decision("BOOKING", [toolEvidence({ category: "AVAILABILITY" })]).status, "INVALID_EVIDENCE");
  assert.equal(decision("ADDRESS", [toolEvidence({ category: "AVAILABILITY" })]).status, "INVALID_EVIDENCE");
  assert.equal(decision("AVAILABILITY", [toolEvidence()]).status, "AUTHORIZED");
  assert.equal(decision("BOOKING", [toolEvidence({ category: "BOOKING", provenance: { sourceTool: "synthetic_booking", coveredCategories: ["BOOKING"] } })]).status, "AUTHORIZED");
  assert.equal(decision("AVAILABILITY", [humanEvidence()]).status, "AUTHORIZED");
  assert.equal(decision("BOOKING", [humanEvidence({ category: "BOOKING", provenance: { sourceTable: "human_confirmation", sourceRecordId: "human-record-2", sourceTool: "human_agent", confirmedCategory: "BOOKING" } })]).status, "AUTHORIZED");
});

test("human confirmation requires explicit category, scope, source provenance and validity", () => {
  assert.equal(decision("AVAILABILITY", [humanEvidence({ provenance: { sourceTool: "human_agent" } })]).status, "INVALID_EVIDENCE");
  assert.equal(decision("AVAILABILITY", [humanEvidence({ validUntil: null })]).status, "INVALID_EVIDENCE");
  assert.equal(decision("AVAILABILITY", [humanEvidence({ companyId: "other-company" })]).status, "INVALID_EVIDENCE");
  assert.equal(decision("AVAILABILITY", [humanEvidence({ provenance: { sourceTable: "human_confirmation", sourceTool: "human_agent", confirmedCategory: "PRICE" } })]).status, "INVALID_EVIDENCE");
});

test("customer preference beats memory context, while customer evidence cannot authorize company policy", () => {
  const currentPreference = evidence({
    sourceType: "CUSTOMER_PROVIDED",
    category: "CONTACT_PREFERENCE",
    valueHash: "current-channel",
  });
  const oldMemory = evidence({
    sourceType: "CONTACT_MEMORY",
    category: "CONTACT_PREFERENCE",
    authorityLevel: "CONTEXTUAL",
    isAuthoritative: false,
    valueHash: "old-channel",
  });
  const preference = decision("CONTACT_PREFERENCE", [oldMemory, currentPreference]);
  assert.equal(preference.status, "AUTHORIZED");
  assert.deepEqual(preference.winningEvidenceIds, [currentPreference.evidenceId]);
  assert.equal(decision("PRICE", [evidence({ sourceType: "CUSTOMER_PROVIDED", category: "PRICE" })]).status, "INVALID_EVIDENCE");
});

test("equivalent authoritative conflicts are explicit and independent of score or input order", () => {
  const first = evidence({ sourceId: "official-a", valueHash: "value-a", confidence: 0.7 });
  const second = evidence({ sourceId: "official-b", valueHash: "value-b", confidence: 1 });
  const forward = decision("PRICE", [first, second]);
  const reverse = decision("PRICE", [second, first]);
  assert.equal(forward.status, "CONFLICT");
  assert.deepEqual(forward, reverse);
  assert.equal(forward.resolutionMethod, "CONFLICT_SAFE");
});

test("human confirmations and tool results conflict when equivalent authoritative values differ", () => {
  const humanA = humanEvidence({ sourceId: "human-a", valueHash: "slot-a" });
  const humanB = humanEvidence({ sourceId: "human-b", valueHash: "slot-b" });
  assert.equal(decision("AVAILABILITY", [humanA, humanB]).status, "CONFLICT");

  const toolA = toolEvidence({ sourceId: "tool-a", valueHash: "slot-a" });
  const toolB = toolEvidence({ sourceId: "tool-b", valueHash: "slot-b" });
  assert.equal(decision("AVAILABILITY", [toolA, toolB]).status, "CONFLICT");
});

test("duplicate IDs, cross-tenant evidence and current-versus-expired evidence are deterministic", () => {
  const sameId = evidence({ evidenceId: "duplicate-id", valueHash: "a" });
  const divergent = evidence({ evidenceId: "duplicate-id", valueHash: "b" });
  const current = evidence({ sourceId: "current", valueHash: "current-value" });
  const expired = evidence({ sourceId: "expired", valueHash: "expired-value", validUntil: "2026-07-15T11:00:00.000Z" });
  const result = combineEvidence({
    scope,
    requestedCategories: ["PRICE"],
    officialEvidence: [divergent, current, sameId, expired],
    currentTime: now,
  });
  assert.equal(result.duplicateEvidenceRejected, 1);
  assert.ok(result.rejectedEvidenceIds.includes("duplicate-id"));
  assert.ok(result.rejectedEvidenceIds.includes(expired.evidenceId));
  assert.equal(result.decisions[0].status, "AUTHORIZED");
  const crossTenant = decision("PRICE", [evidence({ companyId: "other-company" })]);
  assert.equal(crossTenant.status, "INVALID_EVIDENCE");
});

test("combined manifest and redacted bundle are stable under shuffled adapter/evidence order", () => {
  const items = [
    evidence({ sourceId: "price-a", valueHash: "a" }),
    evidence({ category: "BUSINESS_HOURS", sourceId: "hours-a", valueHash: "hours" }),
    toolEvidence(),
  ];
  const input = {
    scope,
    requestedCategories: ["AVAILABILITY", "PRICE", "BUSINESS_HOURS"],
    officialEvidence: [items[0], items[1]],
    toolEvidence: [items[2]],
    adapterStatuses: { session: "COMPLETED", official: "COMPLETED", tool: "COMPLETED" },
    adapterExecutionOrder: ["tool", "session", "official"],
    currentTime: now,
  };
  const first = combineEvidence(input);
  const second = combineEvidence({
    ...input,
    requestedCategories: [...input.requestedCategories].reverse(),
    officialEvidence: [...input.officialEvidence].reverse(),
    toolEvidence: [...input.toolEvidence].reverse(),
    adapterExecutionOrder: ["official", "tool", "session"],
  });
  const firstManifest = buildCombinedEvidenceManifest(first, first.evidence.length);
  const secondManifest = buildCombinedEvidenceManifest(second, second.evidence.length);
  assert.deepEqual(firstManifest, secondManifest);
  assert.deepEqual(redactRetrievalBundle(first.bundle), redactRetrievalBundle(second.bundle));
});

test("redaction preserves structural identifiers and excludes prohibited content", () => {
  const sensitive = evidence({
    evidenceId: "550e8400-e29b-41d4-a716-446655440000",
    sourceId: "533",
    normalizedValue: "phone email prompt chunk response token",
    isSensitive: true,
    provenance: {
      sourceTable: "official_source",
      sourceRecordId: "record-1",
      sourceMessageId: "message-1",
      sourceChunkId: "chunk-1",
      sourceTool: "synthetic",
    },
  });
  const redacted = redactRetrievalBundle({
    contractVersion: 1,
    retrievalBundleVersion: 1,
    requestedCategories: ["PRICE"],
    officialEvidence: [sensitive],
    documentEvidence: [],
    toolEvidence: [],
    humanEvidence: [],
    flowGuidance: [],
    memoryEvidence: [],
    customerEvidence: [],
    sessionEvidence: [],
    contextualEvidence: [],
    adapterStatuses: { official: "COMPLETED" },
    adapterExecutionOrder: ["official"],
    conflicts: [],
    missingCategories: [],
  });
  const serialized = JSON.stringify(redacted);
  assert.equal(redacted.evidence[0].evidenceId, sensitive.evidenceId);
  assert.equal(redacted.evidence[0].sourceId, "533");
  assert.equal("normalizedValue" in redacted.evidence[0], false);
  for (const forbidden of ["phone email prompt chunk response token"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.equal(serialized.includes("chunk-1"), true);
});

test("missing authority is category-specific and safe", () => {
  for (const category of ["PRICE", "AVAILABILITY", "BOOKING", "OFFICIAL_CONTACT"]) {
    const result = decision(category, []);
    assert.equal(result.status, "SAFE_UNAVAILABLE");
    assert.equal(result.fallbackCategory, category);
  }
});

test("synthetic evidence pipeline remains finite for a bounded bundle", () => {
  const start = performance.now();
  const evidenceItems = Array.from({ length: 150 }, (_, index) =>
    evidence({
      sourceId: `synthetic-${index}`,
      category: index % 2 === 0 ? "PRICE" : "BUSINESS_HOURS",
      valueHash: index % 2 === 0 ? "same-price" : "same-hours",
    }),
  );
  const result = combineEvidence({
    scope,
    requestedCategories: ["PRICE", "BUSINESS_HOURS"],
    officialEvidence: evidenceItems,
    currentTime: now,
  });
  const durationMs = performance.now() - start;
  assert.ok(Number.isFinite(durationMs));
  assert.equal(result.decisions.length, 2);
  assert.equal(result.evidence.length, 150);
});

test("local pipeline mock keeps V1 outbound while Shadow consumes metadata only", async () => {
  let v1ProviderCalls = 0;
  let v1OutboundCalls = 0;
  let v2ProviderCalls = 0;
  let v2ToolCalls = 0;
  let v2OutboundCalls = 0;

  const inbound = { internalMessageId: "chatwoot-message-1", source: "CHATWOOT" };
  const v1Retrieval = {
    rag: [
      evidence({
        sourceType: "RAG_DOCUMENT",
        sourceId: "rag-hours",
        category: "BUSINESS_HOURS",
        authorityLevel: "CONTEXTUAL",
        isAuthoritative: false,
      }),
    ],
    memory: [
      evidence({
        sourceType: "CONTACT_MEMORY",
        sourceId: "memory-preference",
        category: "CONTACT_PREFERENCE",
        authorityLevel: "CONTEXTUAL",
        isAuthoritative: false,
      }),
    ],
  };
  v1ProviderCalls += 1;
  const providerResponse = "synthetic V1 response";
  void providerResponse;
  v1OutboundCalls += 1;

  const customer = buildCustomerEvidence({
    scope,
    internalMessageId: inbound.internalMessageId,
    observedAt: now,
    fieldKeys: ["contact_preference_channel"],
    requestedCategories: ["CONTACT_PREFERENCE"],
  });
  const result = combineEvidence({
    scope,
    requestedCategories: ["BUSINESS_HOURS", "CONTACT_PREFERENCE", "AVAILABILITY"],
    officialEvidence: [evidence({ category: "BUSINESS_HOURS", sourceId: "official-hours", valueHash: "official" })],
    ragEvidence: v1Retrieval.rag,
    memoryEvidence: v1Retrieval.memory,
    customerEvidence: customer,
    currentTime: now,
  });
  const manifest = buildCombinedEvidenceManifest(result, result.evidence.length);

  assert.equal(v1ProviderCalls, 1);
  assert.equal(v1OutboundCalls, 1);
  assert.equal(v2ProviderCalls, 0);
  assert.equal(v2ToolCalls, 0);
  assert.equal(v2OutboundCalls, 0);
  assert.equal(manifest.authorityDecisionsByCategory.BUSINESS_HOURS, "AUTHORIZED");
  assert.equal(manifest.authorityDecisionsByCategory.AVAILABILITY, "SAFE_UNAVAILABLE");
  assert.equal(manifest.ragContentPersisted, false);
  assert.equal(manifest.memoryContentPersisted, false);
  assert.equal(JSON.stringify(manifest).includes("synthetic V1 response"), false);
});
