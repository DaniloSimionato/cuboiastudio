import {
  EVIDENCE_CONTRACT_VERSION,
  type AuthorityDecisionStatus,
  type FreshnessStatus,
  type SourceType,
} from "./evidence-contracts";
import { redactAuthorityDecision } from "./evidence-redaction";
import { type AuthorityDecision } from "./evidence-contracts";
import { EVIDENCE_POLICY_VERSION } from "./authority-evidence-policy";

export type EvidenceManifestExtension = {
  evidenceMode: "OFF" | "SHADOW_METADATA";
  evidenceContractVersion: typeof EVIDENCE_CONTRACT_VERSION;
  requestedEvidenceCategories: string[];
  officialEvidenceCount: number;
  officialEvidenceIds: string[];
  evidenceCountsByCategory: Record<string, number>;
  candidateEvidenceCount: number;
  evidenceCountsBySourceType: Partial<Record<SourceType, number>>;
  winningEvidenceIds: string[];
  rejectedEvidenceIds: string[];
  conflictDetected: boolean;
  conflictCategories: string[];
  missingCategories: string[];
  authorityDecisionStatus: AuthorityDecisionStatus[];
  authorityPolicyVersion: string;
  freshnessCounts: Partial<Record<FreshnessStatus, number>>;
  scopeValidationFailures: string[];
  adapterStatus: "COMPLETED" | "PARTIAL" | "EMPTY" | "FAILED" | "SKIPPED";
  adapterDurationMs: number;
  redactionApplied: true;
};

export function buildEvidenceManifestExtension(input: {
  evidenceMode?: "OFF" | "SHADOW_METADATA";
  requestedCategories: string[];
  decisions: AuthorityDecision[];
  evidence: Array<{
    sourceType: SourceType;
    freshnessStatus: FreshnessStatus;
    category?: string;
    evidenceId?: string;
  }>;
  scopeValidationFailures?: string[];
  adapterStatus?: EvidenceManifestExtension["adapterStatus"];
  adapterDurationMs?: number;
}): EvidenceManifestExtension {
  const evidenceCountsBySourceType: Partial<Record<SourceType, number>> = {};
  const evidenceCountsByCategory: Record<string, number> = {};
  const freshnessCounts: Partial<Record<FreshnessStatus, number>> = {};
  for (const item of input.evidence) {
    evidenceCountsBySourceType[item.sourceType] =
      (evidenceCountsBySourceType[item.sourceType] ?? 0) + 1;
    if (item.category) {
      evidenceCountsByCategory[item.category] = (evidenceCountsByCategory[item.category] ?? 0) + 1;
    }
    freshnessCounts[item.freshnessStatus] = (freshnessCounts[item.freshnessStatus] ?? 0) + 1;
  }
  const decisions = input.decisions.map(redactAuthorityDecision);
  return {
    evidenceMode: input.evidenceMode ?? "OFF",
    evidenceContractVersion: EVIDENCE_CONTRACT_VERSION,
    requestedEvidenceCategories: [...input.requestedCategories],
    officialEvidenceCount: input.evidence.length,
    officialEvidenceIds: input.evidence
      .map((item) => item.evidenceId)
      .filter((item): item is string => Boolean(item))
      .sort(),
    evidenceCountsByCategory,
    candidateEvidenceCount: input.evidence.length,
    evidenceCountsBySourceType,
    winningEvidenceIds: [...new Set(decisions.flatMap((item) => item.winningEvidenceIds))].sort(),
    rejectedEvidenceIds: [...new Set(decisions.flatMap((item) => item.rejectedEvidenceIds))].sort(),
    conflictDetected: decisions.some((item) => item.conflictDetected),
    conflictCategories: decisions
      .filter((item) => item.conflictDetected)
      .map((item) => item.requestedCategory)
      .sort(),
    missingCategories: [
      ...new Set(
        decisions
          .filter((item) => item.status !== "AUTHORIZED")
          .map((item) => item.requestedCategory),
      ),
    ].sort(),
    authorityDecisionStatus: decisions.map((item) => item.status),
    authorityPolicyVersion: EVIDENCE_POLICY_VERSION,
    freshnessCounts,
    scopeValidationFailures: [...(input.scopeValidationFailures ?? [])],
    adapterStatus: input.adapterStatus ?? "SKIPPED",
    adapterDurationMs: Math.max(0, Math.round(input.adapterDurationMs ?? 0)),
    redactionApplied: true,
  };
}
