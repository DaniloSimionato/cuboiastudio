import {
  type AuthorityDecision,
  type EvidenceProvenance,
  type RetrievalBundle,
  type SourceEvidence,
} from "./evidence-contracts";

export type SanitizedSourceEvidence = Omit<SourceEvidence, "normalizedValue" | "provenance"> & {
  provenance: Pick<
    EvidenceProvenance,
    | "sourceTable"
    | "sourceRecordId"
    | "sourceMessageId"
    | "sourceChunkId"
    | "sourceTool"
    | "sourceVersion"
    | "coveredCategories"
    | "confirmedCategory"
  >;
  redactionApplied: true;
};

export type SanitizedAuthorityDecision = AuthorityDecision & {
  redactionApplied: true;
};

const SAFE_PROVENANCE_KEYS = [
  "sourceTable",
  "sourceRecordId",
  "sourceMessageId",
  "sourceChunkId",
  "sourceTool",
  "sourceVersion",
  "coveredCategories",
  "confirmedCategory",
] as const;

function sanitizeProvenance(provenance: EvidenceProvenance): SanitizedSourceEvidence["provenance"] {
  const result: Record<string, unknown> = {};
  for (const key of SAFE_PROVENANCE_KEYS) {
    const value = provenance[key];
    if (value === undefined) continue;
    if (key === "coveredCategories" && Array.isArray(value)) {
      result[key] = value.filter((item): item is string => typeof item === "string");
      continue;
    }
    if (typeof value === "string") result[key] = value;
  }
  return result as SanitizedSourceEvidence["provenance"];
}

export function redactSourceEvidence(evidence: SourceEvidence): SanitizedSourceEvidence {
  return {
    contractVersion: evidence.contractVersion,
    evidenceId: evidence.evidenceId,
    sourceType: evidence.sourceType,
    sourceId: evidence.sourceId,
    companyId: evidence.companyId,
    assistantId: evidence.assistantId,
    contactId: evidence.contactId,
    conversationId: evidence.conversationId,
    contextVersion: evidence.contextVersion,
    category: evidence.category,
    fieldKey: evidence.fieldKey,
    valueHash: evidence.valueHash,
    confidence: evidence.confidence,
    authorityLevel: evidence.authorityLevel,
    observedAt: evidence.observedAt,
    validFrom: evidence.validFrom,
    validUntil: evidence.validUntil,
    freshnessStatus: evidence.freshnessStatus,
    provenance: sanitizeProvenance(evidence.provenance),
    isSensitive: evidence.isSensitive,
    isAuthoritative: evidence.isAuthoritative,
    sourceStatus: evidence.sourceStatus,
    redactionApplied: true,
  };
}

export function redactAuthorityDecision(decision: AuthorityDecision): SanitizedAuthorityDecision {
  return {
    ...decision,
    candidateEvidenceIds: [...decision.candidateEvidenceIds],
    winningEvidenceIds: [...decision.winningEvidenceIds],
    rejectedEvidenceIds: [...decision.rejectedEvidenceIds],
    sanitisedMetadata: { ...decision.sanitisedMetadata },
    redactionApplied: true,
  };
}

export function redactRetrievalBundle(bundle: RetrievalBundle): {
  contractVersion: RetrievalBundle["contractVersion"];
  retrievalBundleVersion: RetrievalBundle["retrievalBundleVersion"];
  requestedCategories: string[];
  adapterStatuses: Record<string, string>;
  adapterExecutionOrder: string[];
  evidence: SanitizedSourceEvidence[];
  conflicts: SanitizedAuthorityDecision[];
  missingCategories: string[];
  redactionApplied: true;
} {
  const evidence = [
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
  return {
    contractVersion: bundle.contractVersion,
    retrievalBundleVersion: bundle.retrievalBundleVersion ?? 1,
    requestedCategories: [...bundle.requestedCategories],
    adapterStatuses: { ...(bundle.adapterStatuses ?? {}) },
    adapterExecutionOrder: [...(bundle.adapterExecutionOrder ?? [])],
    evidence: evidence.map(redactSourceEvidence),
    conflicts: bundle.conflicts.map(redactAuthorityDecision),
    missingCategories: [...bundle.missingCategories],
    redactionApplied: true,
  };
}
