import { createHash } from "node:crypto";
import {
  EVIDENCE_CONTRACT_VERSION,
  createEvidenceId,
  type AuthorityDecision,
  type RetrievalBundle,
  type ScopeContext,
  type SourceEvidence,
} from "./evidence-contracts";
import { DEFAULT_EVIDENCE_POLICIES, type EvidenceCategory } from "./authority-evidence-policy";
import { evaluateFreshness } from "./evidence-freshness";
import { validateEvidenceScope, type ScopeValidationStatus } from "./evidence-scope";
import { resolveAuthority } from "./authority-evidence-resolver";
import type { ConfirmedFact, ConversationState } from "./runtime-v2.types";

export const RETRIEVAL_BUNDLE_VERSION = 1 as const;

export type CombinedAdapterStatus =
  "COMPLETED" | "PARTIAL" | "EMPTY" | "FAILED" | "NOT_EXECUTED" | "SKIPPED";

export type CombinedAdapterStatuses = Record<string, CombinedAdapterStatus>;

export type CombinedEvidenceResult = {
  bundle: RetrievalBundle;
  evidence: SourceEvidence[];
  decisions: AuthorityDecision[];
  rejectedEvidenceIds: string[];
  duplicateEvidenceRejected: number;
  invalidEvidenceCount: number;
  scopeValidationFailures: ScopeValidationStatus[];
  adapterStatuses: CombinedAdapterStatuses;
  adapterExecutionOrder: string[];
  conflicts: AuthorityDecision[];
  missingCategories: string[];
};

export type CustomerEvidenceInput = {
  scope: ScopeContext;
  internalMessageId: string;
  observedAt: Date;
  fieldKeys: string[];
  requestedCategories?: string[];
};

export type SessionEvidenceInput = {
  scope: ScopeContext;
  state: ConversationState;
};

export type SessionEvidenceDetails = {
  evidence: SourceEvidence[];
  rawCandidateCount: number;
  deduplicatedCount: number;
  duplicateRejectedCount: number;
};

function hashValue(value: unknown): string {
  return createHash("sha256")
    .update(
      JSON.stringify(value, (_key, item) => (item instanceof Date ? item.toISOString() : item)),
    )
    .digest("hex");
}

function normalizeCategory(value: string): EvidenceCategory | null {
  const normalized = value.trim().toUpperCase();
  return (Object.keys(DEFAULT_EVIDENCE_POLICIES) as EvidenceCategory[]).includes(
    normalized as EvidenceCategory,
  )
    ? (normalized as EvidenceCategory)
    : null;
}

function categoryForField(fieldKey: string, requestedCategories: string[] = []): EvidenceCategory {
  const requested = requestedCategories.map(normalizeCategory).find(Boolean);
  if (
    requested &&
    ["CUSTOMER_IDENTITY", "CONTACT_PREFERENCE", "TECHNICAL_INFORMATION"].includes(requested)
  ) {
    return requested;
  }
  const key = fieldKey.toLowerCase();
  if (/(?:name|identity|customer|contact|role|company)/.test(key)) return "CUSTOMER_IDENTITY";
  if (/(?:preference|language|channel|contact)/.test(key)) return "CONTACT_PREFERENCE";
  return "TECHNICAL_INFORMATION";
}

function sourceEvidenceForFact(input: {
  sourceType: "CUSTOMER_PROVIDED" | "SESSION_FACT";
  sourceId: string;
  fieldKey: string;
  category: EvidenceCategory;
  scope: ScopeContext;
  observedAt: Date;
  valueHash: string;
  sourceMessageId: string;
  validUntil?: Date | null;
  authorityLevel: SourceEvidence["authorityLevel"];
}): SourceEvidence {
  return {
    contractVersion: EVIDENCE_CONTRACT_VERSION,
    evidenceId: createEvidenceId({
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      companyId: input.scope.companyId,
      assistantId: input.scope.assistantId,
      contactId: input.scope.contactId,
      conversationId: input.scope.conversationId,
      contextVersion: input.scope.contextVersion,
      category: input.category,
      fieldKey: input.fieldKey,
    }),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    contactId: input.scope.contactId ?? null,
    conversationId: input.scope.conversationId,
    contextVersion: input.scope.contextVersion,
    category: input.category,
    fieldKey: input.fieldKey,
    valueHash: input.valueHash,
    confidence: 1,
    authorityLevel: input.authorityLevel,
    observedAt: input.observedAt.toISOString(),
    validFrom: input.observedAt.toISOString(),
    validUntil: input.validUntil?.toISOString() ?? null,
    freshnessStatus:
      input.validUntil && input.validUntil.getTime() < input.observedAt.getTime()
        ? "EXPIRED"
        : "CURRENT",
    provenance: {
      sourceMessageId: input.sourceMessageId,
      selectionReason:
        input.sourceType === "CUSTOMER_PROVIDED"
          ? "CURRENT_TURN_STRUCTURED_FACT"
          : "CURRENT_SESSION_CONFIRMED_FACT",
      confirmedCategory: input.category,
    },
    isSensitive: false,
    isAuthoritative: input.authorityLevel === "AUTHORITATIVE",
    sourceStatus: "ACTIVE",
  };
}

export function buildCustomerEvidence(input: CustomerEvidenceInput): SourceEvidence[] {
  return [...new Set(input.fieldKeys.filter((key) => key.trim()))].map((fieldKey) => {
    const category = categoryForField(fieldKey, input.requestedCategories);
    return sourceEvidenceForFact({
      sourceType: "CUSTOMER_PROVIDED",
      sourceId: `${input.internalMessageId}:${fieldKey}`,
      fieldKey,
      category,
      scope: input.scope,
      observedAt: input.observedAt,
      valueHash: hashValue([input.internalMessageId, fieldKey]),
      sourceMessageId: input.internalMessageId,
      authorityLevel:
        category === "CUSTOMER_IDENTITY" || category === "CONTACT_PREFERENCE"
          ? "AUTHORITATIVE"
          : "CONTEXTUAL",
    });
  });
}

function sessionCategoryForFact(key: string): EvidenceCategory {
  const normalized = key.toLowerCase();
  if (/(?:name|identity|customer|contact|role)/.test(normalized)) return "CUSTOMER_IDENTITY";
  if (/(?:preference|language|channel)/.test(normalized)) return "CONTACT_PREFERENCE";
  if (
    /(?:price|availability|booking|hours|address|pickup|delivery|warranty|policy)/.test(normalized)
  ) {
    if (normalized.includes("price")) return "PRICE";
    if (normalized.includes("availability")) return "AVAILABILITY";
    if (normalized.includes("booking")) return "BOOKING";
    if (normalized.includes("hours")) return "BUSINESS_HOURS";
    if (normalized.includes("address")) return "ADDRESS";
    if (normalized.includes("pickup") || normalized.includes("delivery")) return "PICKUP_DELIVERY";
    if (normalized.includes("warranty")) return "WARRANTY";
    return "COMMERCIAL_POLICY";
  }
  return "TECHNICAL_INFORMATION";
}

function factsFromState(state: ConversationState): Array<[string, ConfirmedFact]> {
  return [...Object.entries(state.confirmedFacts), ...Object.entries(state.temporaryFacts)];
}

export function buildSessionEvidenceDetails(input: SessionEvidenceInput): SessionEvidenceDetails {
  if (
    input.state.companyId !== input.scope.companyId ||
    input.state.assistantId !== input.scope.assistantId ||
    input.state.conversationId !== input.scope.conversationId ||
    input.state.contextVersion !== input.scope.contextVersion
  ) {
    return { evidence: [], rawCandidateCount: 0, deduplicatedCount: 0, duplicateRejectedCount: 0 };
  }
  const rawEvidence = factsFromState(input.state).flatMap(([fieldKey, fact]) => {
    if (!fact.sourceMessageId || !(fact.confirmedAt instanceof Date)) return [];
    const category = sessionCategoryForFact(fieldKey);
    return [
      sourceEvidenceForFact({
        sourceType: "SESSION_FACT",
        sourceId: `${fact.sourceMessageId}:${fieldKey}`,
        fieldKey,
        category,
        scope: input.scope,
        observedAt: fact.confirmedAt,
        valueHash: hashValue(fact.value),
        sourceMessageId: fact.sourceMessageId,
        validUntil: fact.expiresAt ?? null,
        authorityLevel: "CONTEXTUAL",
      }),
    ];
  });
  const unique = new Map<string, SourceEvidence>();
  let duplicateRejectedCount = 0;
  for (const item of rawEvidence.sort((left, right) =>
    left.evidenceId.localeCompare(right.evidenceId),
  )) {
    const key = [
      item.category,
      item.fieldKey,
      item.valueHash ?? "",
      item.contextVersion ?? "",
      item.provenance.sourceMessageId ?? "",
    ].join("|");
    if (unique.has(key)) {
      duplicateRejectedCount += 1;
      continue;
    }
    unique.set(key, item);
  }
  const evidence = [...unique.values()].sort((left, right) =>
    left.evidenceId.localeCompare(right.evidenceId),
  );
  return {
    evidence,
    rawCandidateCount: rawEvidence.length,
    deduplicatedCount: evidence.length,
    duplicateRejectedCount,
  };
}

export function buildSessionEvidence(input: SessionEvidenceInput): SourceEvidence[] {
  return buildSessionEvidenceDetails(input).evidence;
}

export function deriveRequestedEvidenceCategories(input: {
  requestedCategories: string[];
  includeContactIdentity?: boolean;
}): EvidenceCategory[] {
  const aliases: Record<string, EvidenceCategory> = {
    price: "PRICE",
    address: "ADDRESS",
    official_contact: "OFFICIAL_CONTACT",
    officialcontact: "OFFICIAL_CONTACT",
    contact: "OFFICIAL_CONTACT",
    phone: "OFFICIAL_CONTACT",
    whatsapp: "OFFICIAL_CONTACT",
    business_hours: "BUSINESS_HOURS",
    businesshours: "BUSINESS_HOURS",
    hours: "BUSINESS_HOURS",
    availability: "AVAILABILITY",
    booking: "BOOKING",
    pickup: "PICKUP_DELIVERY",
    delivery: "PICKUP_DELIVERY",
    warranty: "WARRANTY",
    garantia: "WARRANTY",
    commercial_policy: "COMMERCIAL_POLICY",
    commercialpolicy: "COMMERCIAL_POLICY",
    technical_information: "TECHNICAL_INFORMATION",
    technicalinformation: "TECHNICAL_INFORMATION",
    contact_preference: "CONTACT_PREFERENCE",
    contactpreference: "CONTACT_PREFERENCE",
    customer_identity: "CUSTOMER_IDENTITY",
    company_identity: "COMPANY_IDENTITY",
  };
  const categories: EvidenceCategory[] = [];
  const add = (value: string) => {
    const normalized = value.trim().toLowerCase().replace(/[-\s]/g, "_");
    const category = aliases[normalized] ?? normalizeCategory(value);
    if (category && !categories.includes(category)) categories.push(category);
  };
  if (input.includeContactIdentity) add("COMPANY_IDENTITY");
  input.requestedCategories.forEach(add);
  return categories;
}

function evidenceCollections(bundle: RetrievalBundle): SourceEvidence[] {
  return [
    ...bundle.officialEvidence,
    ...bundle.documentEvidence,
    ...bundle.toolEvidence,
    ...bundle.humanEvidence,
    ...bundle.flowGuidance,
    ...bundle.memoryEvidence,
    ...bundle.customerEvidence,
    ...bundle.sessionEvidence,
    ...bundle.contextualEvidence,
  ];
}

export function combineEvidence(input: {
  scope: ScopeContext;
  requestedCategories: string[];
  officialEvidence?: SourceEvidence[];
  ragEvidence?: SourceEvidence[];
  memoryEvidence?: SourceEvidence[];
  customerEvidence?: SourceEvidence[];
  sessionEvidence?: SourceEvidence[];
  toolEvidence?: SourceEvidence[];
  humanEvidence?: SourceEvidence[];
  flowGuidance?: SourceEvidence[];
  adapterStatuses?: CombinedAdapterStatuses;
  adapterExecutionOrder?: string[];
  currentTime: Date;
}): CombinedEvidenceResult {
  const raw = [
    ...(input.officialEvidence ?? []),
    ...(input.ragEvidence ?? []),
    ...(input.memoryEvidence ?? []),
    ...(input.customerEvidence ?? []),
    ...(input.sessionEvidence ?? []),
    ...(input.toolEvidence ?? []),
    ...(input.humanEvidence ?? []),
    ...(input.flowGuidance ?? []),
  ];
  const unique = new Map<string, SourceEvidence>();
  const rejected = new Set<string>();
  const scopeFailures = new Set<ScopeValidationStatus>();
  let duplicateEvidenceRejected = 0;
  let invalidEvidenceCount = 0;
  for (const evidence of raw) {
    const scopeResult = validateEvidenceScope(evidence, input.scope);
    if (!scopeResult.valid) {
      scopeFailures.add(scopeResult.status);
      rejected.add(evidence.evidenceId);
      invalidEvidenceCount++;
      continue;
    }
    const freshness = evaluateFreshness({
      sourceType: evidence.sourceType,
      category: evidence.category,
      observedAt: evidence.observedAt,
      validFrom: evidence.validFrom,
      validUntil: evidence.validUntil,
      currentTime: input.currentTime,
    });
    if (freshness.status === "EXPIRED") {
      rejected.add(evidence.evidenceId);
      invalidEvidenceCount++;
      continue;
    }
    const existing = unique.get(evidence.evidenceId);
    if (!existing) {
      unique.set(evidence.evidenceId, evidence);
      continue;
    }
    duplicateEvidenceRejected++;
    const sameHash = existing.valueHash === evidence.valueHash;
    if (!sameHash) {
      unique.delete(evidence.evidenceId);
      rejected.add(evidence.evidenceId);
      invalidEvidenceCount++;
    }
  }
  const evidence = [...unique.values()].filter((item) => !rejected.has(item.evidenceId));
  const requestedCategories = [...new Set(input.requestedCategories)].sort();
  const decisions = requestedCategories.map((category) =>
    resolveAuthority({
      requestedCategory: category,
      candidates: evidence.filter((item) => item.category === category),
      scope: input.scope,
      policy: DEFAULT_EVIDENCE_POLICIES[category as EvidenceCategory],
      currentTime: input.currentTime,
    }),
  );
  const bundle: RetrievalBundle = {
    contractVersion: EVIDENCE_CONTRACT_VERSION,
    retrievalBundleVersion: RETRIEVAL_BUNDLE_VERSION,
    requestedCategories,
    officialEvidence: evidence.filter((item) => item.sourceType === "OFFICIAL_STRUCTURED"),
    documentEvidence: evidence.filter((item) =>
      ["OFFICIAL_DOCUMENT", "RAG_DOCUMENT"].includes(item.sourceType),
    ),
    toolEvidence: evidence.filter((item) => item.sourceType === "TOOL_RESULT"),
    humanEvidence: evidence.filter((item) => item.sourceType === "HUMAN_CONFIRMED"),
    flowGuidance: evidence.filter((item) => item.sourceType === "FLOW_GUIDANCE"),
    memoryEvidence: evidence.filter((item) =>
      ["CONTACT_MEMORY", "TEMPORARY_MEMORY"].includes(item.sourceType),
    ),
    customerEvidence: evidence.filter((item) => item.sourceType === "CUSTOMER_PROVIDED"),
    sessionEvidence: evidence.filter((item) => item.sourceType === "SESSION_FACT"),
    contextualEvidence: evidence.filter((item) =>
      ["CONVERSATION_HISTORY", "EXTERNAL_METADATA", "MODEL_GENERATED"].includes(item.sourceType),
    ),
    adapterStatuses: Object.fromEntries(
      Object.entries(input.adapterStatuses ?? {}).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    adapterExecutionOrder: [...new Set(input.adapterExecutionOrder ?? [])].sort(),
    conflicts: decisions.filter((decision) => decision.conflictDetected),
    missingCategories: decisions
      .filter((decision) => decision.status !== "AUTHORIZED")
      .map((decision) => decision.requestedCategory),
  };
  return {
    bundle,
    evidence: evidenceCollections(bundle),
    decisions,
    rejectedEvidenceIds: [...rejected].sort(),
    duplicateEvidenceRejected,
    invalidEvidenceCount,
    scopeValidationFailures: [...scopeFailures].sort(),
    adapterStatuses: Object.fromEntries(
      Object.entries(input.adapterStatuses ?? {}).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    adapterExecutionOrder: [...new Set(input.adapterExecutionOrder ?? [])].sort(),
    conflicts: bundle.conflicts,
    missingCategories: [...new Set(bundle.missingCategories)].sort(),
  };
}

export function buildEvidenceDecisionMetadata(result: CombinedEvidenceResult) {
  const authorizedCategories = result.decisions
    .filter((decision) => decision.status === "AUTHORIZED")
    .map((decision) => decision.requestedCategory);
  const contextualOnlyCategories = result.evidence
    .filter((item) => item.authorityLevel === "CONTEXTUAL")
    .map((item) => item.category);
  return {
    authorizedCategories: [...new Set(authorizedCategories)].sort(),
    contextualOnlyCategories: [...new Set(contextualOnlyCategories)].sort(),
    unavailableCategories: result.decisions
      .filter((decision) => decision.status !== "AUTHORIZED")
      .map((decision) => decision.requestedCategory),
    conflictCategories: result.conflicts.map((decision) => decision.requestedCategory).sort(),
    winningSourceTypes: [
      ...new Set(
        result.decisions.flatMap((decision) =>
          result.evidence
            .filter((item) => decision.winningEvidenceIds.includes(item.evidenceId))
            .map((item) => item.sourceType),
        ),
      ),
    ].sort(),
  };
}

export type CombinedEvidenceManifestMetadata = ReturnType<typeof buildEvidenceDecisionMetadata> & {
  retrievalBundleVersion: typeof RETRIEVAL_BUNDLE_VERSION;
  adapterExecutionOrder: string[];
  adapterStatuses: CombinedAdapterStatuses;
  totalEvidenceCount: number;
  deduplicatedEvidenceCount: number;
  duplicateEvidenceRejected: number;
  evidenceCountsBySourceType: Record<string, number>;
  evidenceCountsByCategory: Record<string, number>;
  authorityDecisionsByCategory: Record<string, AuthorityDecision["status"]>;
  decisionStatusCounts: Record<string, number>;
  winningEvidenceIdsByCategory: Record<string, string[]>;
  rejectedEvidenceIdsByCategory: Record<string, string[]>;
  winningSourceTypesByCategory: Record<string, string[]>;
  missingCategories: string[];
  conflictDetected: boolean;
  conflictCategories: string[];
  conflictReasons: string[];
  scopeValidationFailures: string[];
  invalidEvidenceCount: number;
  customerEvidenceCount: number;
  sessionEvidenceCount: number;
  sessionRawCandidateCount: number;
  sessionDeduplicatedCount: number;
  sessionDuplicateRejectedCount: number;
  ragContentPersisted: false;
  memoryContentPersisted: false;
  officialValuePersisted: false;
  customerContentPersisted: false;
  sessionContentPersisted: false;
};

export function buildCombinedEvidenceManifest(
  result: CombinedEvidenceResult,
  rawEvidenceCount: number,
  sessionStats?: Pick<
    SessionEvidenceDetails,
    "rawCandidateCount" | "deduplicatedCount" | "duplicateRejectedCount"
  >,
): CombinedEvidenceManifestMetadata {
  const decisionMetadata = buildEvidenceDecisionMetadata(result);
  const evidenceCountsBySourceType: Record<string, number> = {};
  const evidenceCountsByCategory: Record<string, number> = {};
  for (const item of result.evidence) {
    evidenceCountsBySourceType[item.sourceType] =
      (evidenceCountsBySourceType[item.sourceType] ?? 0) + 1;
    evidenceCountsByCategory[item.category] = (evidenceCountsByCategory[item.category] ?? 0) + 1;
  }
  const decisionStatusCounts: Record<string, number> = {};
  const authorityDecisionsByCategory: Record<string, AuthorityDecision["status"]> = {};
  const winningEvidenceIdsByCategory: Record<string, string[]> = {};
  const rejectedEvidenceIdsByCategory: Record<string, string[]> = {};
  const winningSourceTypesByCategory: Record<string, string[]> = {};
  for (const decision of result.decisions) {
    authorityDecisionsByCategory[decision.requestedCategory] = decision.status;
    decisionStatusCounts[decision.status] = (decisionStatusCounts[decision.status] ?? 0) + 1;
    winningEvidenceIdsByCategory[decision.requestedCategory] = [...decision.winningEvidenceIds];
    rejectedEvidenceIdsByCategory[decision.requestedCategory] = [...decision.rejectedEvidenceIds];
    winningSourceTypesByCategory[decision.requestedCategory] = [
      ...new Set(
        result.evidence
          .filter((item) => decision.winningEvidenceIds.includes(item.evidenceId))
          .map((item) => item.sourceType),
      ),
    ].sort();
  }
  return {
    ...decisionMetadata,
    retrievalBundleVersion: RETRIEVAL_BUNDLE_VERSION,
    adapterExecutionOrder: [...result.adapterExecutionOrder].sort(),
    adapterStatuses: Object.fromEntries(
      Object.entries(result.adapterStatuses).sort(([left], [right]) => left.localeCompare(right)),
    ),
    totalEvidenceCount: rawEvidenceCount,
    deduplicatedEvidenceCount: result.evidence.length,
    duplicateEvidenceRejected: result.duplicateEvidenceRejected,
    evidenceCountsBySourceType: Object.fromEntries(
      Object.entries(evidenceCountsBySourceType).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    evidenceCountsByCategory: Object.fromEntries(
      Object.entries(evidenceCountsByCategory).sort(([left], [right]) => left.localeCompare(right)),
    ),
    authorityDecisionsByCategory: Object.fromEntries(
      Object.entries(authorityDecisionsByCategory).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    decisionStatusCounts: Object.fromEntries(
      Object.entries(decisionStatusCounts).sort(([left], [right]) => left.localeCompare(right)),
    ),
    winningEvidenceIdsByCategory: Object.fromEntries(
      Object.entries(winningEvidenceIdsByCategory).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    rejectedEvidenceIdsByCategory: Object.fromEntries(
      Object.entries(rejectedEvidenceIdsByCategory).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    winningSourceTypesByCategory: Object.fromEntries(
      Object.entries(winningSourceTypesByCategory).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    missingCategories: [...result.missingCategories].sort(),
    conflictDetected: result.conflicts.length > 0,
    conflictCategories: result.conflicts.map((decision) => decision.requestedCategory).sort(),
    conflictReasons: result.conflicts
      .map((decision) => decision.conflictReason)
      .filter((reason): reason is string => Boolean(reason)),
    scopeValidationFailures: result.scopeValidationFailures,
    invalidEvidenceCount: result.invalidEvidenceCount,
    customerEvidenceCount: result.bundle.customerEvidence.length,
    sessionEvidenceCount: result.bundle.sessionEvidence.length,
    sessionRawCandidateCount:
      sessionStats?.rawCandidateCount ?? result.bundle.sessionEvidence.length,
    sessionDeduplicatedCount:
      sessionStats?.deduplicatedCount ?? result.bundle.sessionEvidence.length,
    sessionDuplicateRejectedCount: sessionStats?.duplicateRejectedCount ?? 0,
    ragContentPersisted: false,
    memoryContentPersisted: false,
    officialValuePersisted: false,
    customerContentPersisted: false,
    sessionContentPersisted: false,
  };
}
