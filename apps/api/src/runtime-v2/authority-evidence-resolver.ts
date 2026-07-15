import { evaluateFreshness } from "./evidence-freshness";
import {
  EVIDENCE_CONTRACT_VERSION,
  type AuthorityDecision,
  type ScopeContext,
  type SourceEvidence,
} from "./evidence-contracts";
import {
  DEFAULT_EVIDENCE_POLICIES,
  type CategoryEvidencePolicy,
  type EvidenceCategory,
  EVIDENCE_POLICY_VERSION,
} from "./authority-evidence-policy";
import { validateEvidenceScope } from "./evidence-scope";

function isValidConfidence(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function hasToolCoverage(evidence: SourceEvidence, category: string): boolean {
  return evidence.provenance.coveredCategories?.includes(category) === true;
}

function candidateValueKey(evidence: SourceEvidence): string {
  if (evidence.valueHash) return evidence.valueHash;
  if (evidence.normalizedValue === undefined) return `missing:${evidence.evidenceId}`;
  return JSON.stringify(evidence.normalizedValue);
}

function baseDecision(input: {
  requestedCategory: string;
  status: AuthorityDecision["status"];
  candidates: SourceEvidence[];
  winningEvidenceIds?: string[];
  rejectedEvidenceIds?: string[];
  conflictDetected?: boolean;
  conflictReason?: string | null;
  resolutionMethod: AuthorityDecision["resolutionMethod"];
  evaluatedAt: Date;
  policyVersion: string;
  fallbackCategory?: string;
}): AuthorityDecision {
  const winningEvidenceIds = [...(input.winningEvidenceIds ?? [])].sort();
  const rejectedEvidenceIds = [...(input.rejectedEvidenceIds ?? [])].sort();
  return {
    contractVersion: EVIDENCE_CONTRACT_VERSION,
    requestedCategory: input.requestedCategory,
    status: input.status,
    candidateEvidenceIds: input.candidates.map((item) => item.evidenceId).sort(),
    winningEvidenceIds,
    rejectedEvidenceIds,
    conflictDetected: input.conflictDetected ?? false,
    conflictReason: input.conflictReason ?? null,
    resolutionMethod: input.resolutionMethod,
    fallbackCategory: input.fallbackCategory ?? input.requestedCategory,
    evaluatedAt: input.evaluatedAt.toISOString(),
    policyVersion: input.policyVersion,
    sanitisedMetadata: {
      candidateCount: input.candidates.length,
      winningCount: winningEvidenceIds.length,
      rejectedCount: rejectedEvidenceIds.length,
    },
  };
}

function evidenceIsPotentiallyAuthoritative(
  evidence: SourceEvidence,
  policy: CategoryEvidencePolicy,
  requestedCategory: string,
): boolean {
  if (!policy.authoritativeSourceTypes.includes(evidence.sourceType)) return false;
  if (evidence.category !== requestedCategory) return false;
  if (evidence.authorityLevel !== "AUTHORITATIVE" || evidence.isAuthoritative !== true)
    return false;
  if (evidence.sourceStatus === "INACTIVE" || evidence.sourceStatus === "ERROR") return false;
  if (evidence.sourceType === "TOOL_RESULT" && !hasToolCoverage(evidence, requestedCategory)) {
    return false;
  }
  if (evidence.sourceType === "HUMAN_CONFIRMED") {
    if (!policy.allowHumanConfirmed || !evidence.provenance.confirmedCategory) return false;
    if (evidence.provenance.confirmedCategory !== requestedCategory) return false;
    if (!evidence.validFrom || !evidence.validUntil) return false;
    if (!evidence.provenance.sourceTool && !evidence.provenance.sourceTable) return false;
  }
  return true;
}

export function resolveAuthority(input: {
  requestedCategory: EvidenceCategory | string;
  candidates: SourceEvidence[];
  scope: ScopeContext;
  policy?: CategoryEvidencePolicy;
  currentTime: Date;
}): AuthorityDecision {
  const policy =
    input.policy ?? DEFAULT_EVIDENCE_POLICIES[input.requestedCategory as EvidenceCategory];
  const evaluatedAt = input.currentTime;
  if (!policy) {
    return baseDecision({
      requestedCategory: input.requestedCategory,
      status: "SAFE_UNAVAILABLE",
      candidates: input.candidates,
      rejectedEvidenceIds: input.candidates.map((item) => item.evidenceId),
      resolutionMethod: "NO_AUTHORITY",
      evaluatedAt,
      policyVersion: EVIDENCE_POLICY_VERSION,
    });
  }

  const rejected = new Set<string>();
  const eligible: SourceEvidence[] = [];
  for (const evidence of input.candidates) {
    if (!isValidConfidence(evidence.confidence)) {
      rejected.add(evidence.evidenceId);
      continue;
    }
    const scopeResult = validateEvidenceScope(evidence, input.scope);
    if (!scopeResult.valid) {
      rejected.add(evidence.evidenceId);
      continue;
    }
    if (!evidenceIsPotentiallyAuthoritative(evidence, policy, input.requestedCategory)) {
      rejected.add(evidence.evidenceId);
      continue;
    }
    const freshness = evaluateFreshness({
      sourceType: evidence.sourceType,
      category: input.requestedCategory,
      observedAt: evidence.observedAt,
      validFrom: evidence.validFrom,
      validUntil: evidence.validUntil,
      policy: {
        ttlMs: policy.freshnessTtlMs,
        allowStaleAsAuthority: policy.allowStaleAsAuthority,
        allowUnknownAsAuthority: policy.allowUnknownAsAuthority,
      },
      currentTime: input.currentTime,
    });
    if (freshness.status === "EXPIRED" || !freshness.eligible) {
      rejected.add(evidence.evidenceId);
      continue;
    }
    eligible.push(evidence);
  }

  if (eligible.length === 0) {
    const status =
      input.candidates.length > 0 && rejected.size === input.candidates.length
        ? "INVALID_EVIDENCE"
        : "SAFE_UNAVAILABLE";
    return baseDecision({
      requestedCategory: input.requestedCategory,
      status,
      candidates: input.candidates,
      rejectedEvidenceIds: [...rejected],
      resolutionMethod: status === "INVALID_EVIDENCE" ? "INVALID_EVIDENCE" : "NO_AUTHORITY",
      evaluatedAt,
      policyVersion: policy.policyVersion,
    });
  }

  const values = new Map<string, SourceEvidence[]>();
  for (const evidence of eligible) {
    const key = candidateValueKey(evidence);
    const group = values.get(key) ?? [];
    group.push(evidence);
    values.set(key, group);
  }
  if (values.size > 1) {
    return baseDecision({
      requestedCategory: input.requestedCategory,
      status: "CONFLICT",
      candidates: input.candidates,
      rejectedEvidenceIds: [...rejected],
      conflictDetected: true,
      conflictReason: "AUTHORITATIVE_EVIDENCE_VALUES_CONFLICT",
      resolutionMethod: "CONFLICT_SAFE",
      evaluatedAt,
      policyVersion: policy.policyVersion,
    });
  }

  const winningEvidenceIds = [...eligible]
    .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId))
    .map((item) => item.evidenceId);
  return baseDecision({
    requestedCategory: input.requestedCategory,
    status: "AUTHORIZED",
    candidates: input.candidates,
    winningEvidenceIds,
    rejectedEvidenceIds: [...rejected],
    resolutionMethod: "CATEGORY_POLICY",
    evaluatedAt,
    policyVersion: policy.policyVersion,
  });
}
