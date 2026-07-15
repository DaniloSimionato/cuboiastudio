import { createHash } from "node:crypto";

export const EVIDENCE_CONTRACT_VERSION = 1 as const;

export type EvidenceContractVersion = typeof EVIDENCE_CONTRACT_VERSION;

export type SourceType =
  | "OFFICIAL_STRUCTURED"
  | "OFFICIAL_DOCUMENT"
  | "RAG_DOCUMENT"
  | "TOOL_RESULT"
  | "HUMAN_CONFIRMED"
  | "FLOW_GUIDANCE"
  | "CONTACT_MEMORY"
  | "TEMPORARY_MEMORY"
  | "CUSTOMER_PROVIDED"
  | "SESSION_FACT"
  | "CONVERSATION_HISTORY"
  | "EXTERNAL_METADATA"
  | "MODEL_GENERATED";

export type AuthorityLevel = "NONE" | "CONTEXTUAL" | "AUTHORITATIVE";

export type FreshnessStatus = "CURRENT" | "STALE" | "EXPIRED" | "UNKNOWN";

export type AuthorityDecisionStatus =
  "AUTHORIZED" | "SAFE_UNAVAILABLE" | "CONFLICT" | "OUT_OF_SCOPE" | "INVALID_EVIDENCE";

export type EvidenceSourceStatus =
  "ACTIVE" | "INACTIVE" | "READY" | "PENDING" | "ERROR" | "UNKNOWN";

export type EvidenceJsonValue =
  string | number | boolean | null | EvidenceJsonValue[] | { [key: string]: EvidenceJsonValue };

export type ScopeContext = {
  companyId: string;
  assistantId?: string | null;
  contactId?: string | null;
  conversationId?: string | null;
  contextVersion?: number | null;
};

export type EvidenceProvenance = {
  sourceTable?: string;
  sourceRecordId?: string;
  sourceMessageId?: string;
  sourceChunkId?: string;
  sourceTool?: string;
  sourceVersion?: string;
  coveredCategories?: string[];
  selectionReason?: string;
  confirmedCategory?: string;
};

export type SourceEvidence = {
  contractVersion: EvidenceContractVersion;
  evidenceId: string;
  sourceType: SourceType;
  sourceId: string;
  companyId: string;
  assistantId?: string | null;
  contactId?: string | null;
  conversationId?: string | null;
  contextVersion?: number | null;
  category: string;
  fieldKey: string;
  normalizedValue?: EvidenceJsonValue;
  valueHash?: string;
  confidence: number;
  authorityLevel: AuthorityLevel;
  observedAt: string;
  validFrom?: string | null;
  validUntil?: string | null;
  freshnessStatus: FreshnessStatus;
  provenance: EvidenceProvenance;
  isSensitive: boolean;
  isAuthoritative: boolean;
  sourceStatus: EvidenceSourceStatus;
};

export type AuthorityDecision = {
  contractVersion: EvidenceContractVersion;
  requestedCategory: string;
  status: AuthorityDecisionStatus;
  candidateEvidenceIds: string[];
  winningEvidenceIds: string[];
  rejectedEvidenceIds: string[];
  conflictDetected: boolean;
  conflictReason: string | null;
  resolutionMethod:
    | "CATEGORY_POLICY"
    | "TOOL_COVERAGE"
    | "FRESHNESS"
    | "NO_AUTHORITY"
    | "SCOPE_REJECTION"
    | "CONFLICT_SAFE"
    | "INVALID_EVIDENCE";
  fallbackCategory: string;
  evaluatedAt: string;
  policyVersion: string;
  sanitisedMetadata: {
    candidateCount: number;
    winningCount: number;
    rejectedCount: number;
  };
};

export type RetrievalBundle = {
  contractVersion: EvidenceContractVersion;
  requestedCategories: string[];
  officialEvidence: SourceEvidence[];
  documentEvidence: SourceEvidence[];
  toolEvidence: SourceEvidence[];
  humanEvidence: SourceEvidence[];
  flowGuidance: SourceEvidence[];
  memoryEvidence: SourceEvidence[];
  customerEvidence: SourceEvidence[];
  sessionEvidence: SourceEvidence[];
  contextualEvidence: SourceEvidence[];
  conflicts: AuthorityDecision[];
  missingCategories: string[];
};

export function isEvidenceContractVersion(value: unknown): value is EvidenceContractVersion {
  return value === EVIDENCE_CONTRACT_VERSION;
}

export function assertEvidenceContractVersion(
  value: unknown,
): asserts value is EvidenceContractVersion {
  if (!isEvidenceContractVersion(value)) {
    throw new Error("EVIDENCE_CONTRACT_VERSION_UNSUPPORTED");
  }
}

export function createEvidenceId(input: {
  sourceType: SourceType;
  sourceId: string;
  companyId: string;
  assistantId?: string | null;
  contactId?: string | null;
  conversationId?: string | null;
  contextVersion?: number | null;
  category: string;
  fieldKey: string;
}): string {
  const canonical = JSON.stringify([
    EVIDENCE_CONTRACT_VERSION,
    input.sourceType,
    input.sourceId,
    input.companyId,
    input.assistantId ?? null,
    input.contactId ?? null,
    input.conversationId ?? null,
    input.contextVersion ?? null,
    input.category,
    input.fieldKey,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

export function serializeEvidenceContract(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("EVIDENCE_CONTRACT_INVALID");
  }
  const record = value as Record<string, unknown>;
  assertEvidenceContractVersion(record.contractVersion);
  return JSON.stringify(value);
}

export function deserializeEvidenceContract<T extends { contractVersion: unknown }>(
  serialized: string,
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("EVIDENCE_CONTRACT_JSON_INVALID");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("EVIDENCE_CONTRACT_INVALID");
  }
  assertEvidenceContractVersion((parsed as Record<string, unknown>).contractVersion);
  return parsed as T;
}
