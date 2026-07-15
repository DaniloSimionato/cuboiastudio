import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  EVIDENCE_CONTRACT_VERSION,
  createEvidenceId,
  type FreshnessStatus,
  type SourceEvidence,
} from "./evidence-contracts";
import { EVIDENCE_CATEGORIES, type EvidenceCategory } from "./authority-evidence-policy";
import { evaluateFreshness } from "./evidence-freshness";
import { validateEvidenceScope, type ScopeValidationStatus } from "./evidence-scope";
import type { ScopeContext } from "./evidence-contracts";

export const RAG_RETRIEVAL_SOURCE = "V1_PIPELINE" as const;
export type RagNotExecutedReason =
  | "DISABLED"
  | "NOT_REQUIRED"
  | "FLOW_SUPPRESSED"
  | "NO_QUERY"
  | "EXECUTED_EMPTY"
  | "EXECUTED_WITH_RESULTS"
  | "PIPELINE_ERROR";

export type RagRetrievalObservationItem = {
  knowledgeId: string;
  documentId?: string | null;
  chunkId: string;
  companyId: string;
  assistantId: string;
  similarityScore: number;
  documentStatus?: string | null;
  processingStatus?: string | null;
  embeddingModel?: string | null;
  embeddingVersion?: string | null;
  embeddingDimension?: number | null;
  documentUpdatedAt?: string | null;
  chunkUpdatedAt?: string | null;
  sourceMetadata?: Record<string, unknown>;
  category?: string | null;
  contentHash?: string | null;
};

export type RagRetrievalObservation = {
  retrievalExecuted: boolean;
  retrievalSource: typeof RAG_RETRIEVAL_SOURCE;
  companyId: string;
  assistantId: string;
  internalMessageId: string;
  queryCategory: string | null;
  threshold: number | null;
  thresholdSource: string | null;
  resultCount: number;
  observedAt: string;
  items: RagRetrievalObservationItem[];
  notExecutedReason?: RagNotExecutedReason;
};

export type RagEvidenceAdapterStatus =
  "COMPLETED" | "PARTIAL" | "EMPTY" | "FAILED" | "NOT_EXECUTED";

export type RagEvidenceManifest = {
  ragObservationReceived: boolean;
  ragRetrievalExecuted: boolean;
  ragThreshold: number | null;
  ragThresholdSource: string | null;
  ragResultCount: number;
  ragEvidenceCount: number;
  ragRejectedCount: number;
  ragEvidenceIds: string[];
  ragKnowledgeIds: string[];
  ragDocumentIds: string[];
  ragChunkIds: string[];
  ragScoreBuckets: Record<string, number>;
  ragStatusCounts: Record<string, number>;
  ragFreshnessCounts: Partial<Record<FreshnessStatus, number>>;
  ragCategoryCounts: Record<string, number>;
  ragContentHashes: string[];
  ragCrossTenantRejected: number;
  ragInactiveRejected: number;
  ragBelowThresholdRejected: number;
  ragMissingProvenanceRejected: number;
  ragConflictDetected: boolean;
  ragAdapterStatus: RagEvidenceAdapterStatus;
  ragAdapterDurationMs: number;
  ragContentPersisted: false;
  ragNotExecutedReason: RagNotExecutedReason | null;
};

export type RagEvidenceAdapterResult = {
  evidence: SourceEvidence[];
  rejectedEvidenceIds: string[];
  missingCategories: string[];
  failures: string[];
  scopeValidationFailures: ScopeValidationStatus[];
  adapterStatus: RagEvidenceAdapterStatus;
  durationMs: number;
  manifest: RagEvidenceManifest;
};

type SanitizedSourceMetadata = Record<string, string | number | boolean>;

const SAFE_METADATA_KEYS = new Set([
  "official",
  "sourceType",
  "category",
  "authorityCategory",
  "factCategory",
  "validFrom",
  "validUntil",
  "version",
  "documentVersion",
  "status",
  "processingStatus",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sanitizeMetadata(value: unknown): SanitizedSourceMetadata {
  const record = asRecord(value);
  if (!record) return {};
  const result: SanitizedSourceMetadata = {};
  for (const [key, raw] of Object.entries(record)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      result[key] = raw;
    }
  }
  return result;
}

function normalizeCategory(value: unknown): EvidenceCategory | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return (EVIDENCE_CATEGORIES as readonly string[]).includes(normalized)
    ? (normalized as EvidenceCategory)
    : null;
}

function declaredCategory(metadata: Record<string, unknown>): EvidenceCategory | null {
  return (
    normalizeCategory(metadata.category) ??
    normalizeCategory(metadata.authorityCategory) ??
    normalizeCategory(metadata.factCategory)
  );
}

function isExplicitOfficial(metadata: Record<string, unknown>): boolean {
  return metadata.official === true || metadata.sourceType === "OFFICIAL_DOCUMENT";
}

function clampScore(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function scoreBucket(score: number): string {
  const start = Math.floor(clampScore(score) * 10) / 10;
  return `${start.toFixed(1)}-${Math.min(1, start + 0.1).toFixed(1)}`;
}

function hashPreview(value: string): string | null {
  return value.trim() ? createHash("sha256").update(value).digest("hex") : null;
}

export function createRagRetrievalObservation(input: {
  companyId: string;
  assistantId: string;
  internalMessageId: string;
  observedAt?: Date;
  queryCategory?: string | null;
  retrievalExecuted: boolean;
  notExecutedReason?: RagNotExecutedReason;
  threshold?: number | null;
  thresholdSource?: string | null;
  results?: Array<{
    knowledgeId: string;
    knowledgeTitle?: string;
    chunkId: string;
    contentPreview?: string;
    score?: number | null;
    metadata?: unknown;
  }>;
}): RagRetrievalObservation {
  const observedAt = input.observedAt ?? new Date();
  const results = input.results ?? [];
  return {
    retrievalExecuted: input.retrievalExecuted,
    retrievalSource: RAG_RETRIEVAL_SOURCE,
    companyId: input.companyId,
    assistantId: input.assistantId,
    internalMessageId: input.internalMessageId,
    queryCategory: input.queryCategory ?? null,
    threshold: input.threshold ?? null,
    thresholdSource: input.thresholdSource ?? null,
    resultCount: results.length,
    observedAt: observedAt.toISOString(),
    items: results.map((result) => {
      const metadata = sanitizeMetadata(result.metadata);
      return {
        knowledgeId: result.knowledgeId,
        documentId: result.knowledgeId,
        chunkId: result.chunkId,
        companyId: input.companyId,
        assistantId: input.assistantId,
        similarityScore: Number(result.score ?? 0),
        documentStatus: "ACTIVE",
        processingStatus: "READY",
        sourceMetadata: metadata,
        category: declaredCategory(metadata),
        contentHash: hashPreview(result.contentPreview ?? ""),
      };
    }),
    notExecutedReason:
      input.notExecutedReason ??
      (input.retrievalExecuted
        ? results.length > 0
          ? "EXECUTED_WITH_RESULTS"
          : "EXECUTED_EMPTY"
        : "NOT_REQUIRED"),
  };
}

function emptyManifest(input: {
  observation: RagRetrievalObservation | null;
  adapterStatus: RagEvidenceAdapterStatus;
  durationMs: number;
  evidence: SourceEvidence[];
  rejectedCount: number;
  rejected: {
    crossTenant: number;
    inactive: number;
    belowThreshold: number;
    missingProvenance: number;
  };
  freshnessCounts: Partial<Record<FreshnessStatus, number>>;
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  conflictDetected?: boolean;
}): RagEvidenceManifest {
  const observation = input.observation;
  const scoreBuckets: Record<string, number> = {};
  for (const item of observation?.items ?? []) {
    const bucket = scoreBucket(item.similarityScore);
    scoreBuckets[bucket] = (scoreBuckets[bucket] ?? 0) + 1;
  }
  return {
    ragObservationReceived: observation !== null,
    ragRetrievalExecuted: observation?.retrievalExecuted === true,
    ragThreshold: observation?.threshold ?? null,
    ragThresholdSource: observation?.thresholdSource ?? null,
    ragResultCount: observation?.resultCount ?? 0,
    ragEvidenceCount: input.evidence.length,
    ragRejectedCount: input.rejectedCount,
    ragEvidenceIds: input.evidence.map((item) => item.evidenceId).sort(),
    ragKnowledgeIds: input.evidence
      .map((item) => item.provenance.sourceRecordId)
      .filter((item): item is string => Boolean(item))
      .sort(),
    ragDocumentIds: input.evidence
      .map((item) => item.provenance.sourceRecordId)
      .filter((item): item is string => Boolean(item))
      .sort(),
    ragChunkIds: input.evidence
      .map((item) => item.provenance.sourceChunkId)
      .filter((item): item is string => Boolean(item))
      .sort(),
    ragScoreBuckets: scoreBuckets,
    ragStatusCounts: input.statusCounts,
    ragFreshnessCounts: input.freshnessCounts,
    ragCategoryCounts: input.categoryCounts,
    ragContentHashes: input.evidence
      .map((item) => item.valueHash)
      .filter((item): item is string => Boolean(item))
      .sort(),
    ragCrossTenantRejected: input.rejected.crossTenant,
    ragInactiveRejected: input.rejected.inactive,
    ragBelowThresholdRejected: input.rejected.belowThreshold,
    ragMissingProvenanceRejected: input.rejected.missingProvenance,
    ragConflictDetected: input.conflictDetected ?? false,
    ragAdapterStatus: input.adapterStatus,
    ragAdapterDurationMs: Math.max(0, Math.round(input.durationMs)),
    ragContentPersisted: false,
    ragNotExecutedReason: observation?.notExecutedReason ?? null,
  };
}

@Injectable()
export class RagEvidenceAdapter {
  read(input: {
    scope: ScopeContext;
    requestedCategories: string[];
    observation?: RagRetrievalObservation | null;
    currentTime: Date;
  }): RagEvidenceAdapterResult {
    const startedAt = input.currentTime.getTime();
    const observation = input.observation ?? null;
    const evidence: SourceEvidence[] = [];
    const rejectedEvidenceIds: string[] = [];
    const failures: string[] = [];
    const scopeValidationFailures: ScopeValidationStatus[] = [];
    const freshnessCounts: Partial<Record<FreshnessStatus, number>> = {};
    const categoryCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const rejected = {
      crossTenant: 0,
      inactive: 0,
      belowThreshold: 0,
      missingProvenance: 0,
    };

    if (!observation || !observation.retrievalExecuted) {
      const missing = [...input.requestedCategories];
      return {
        evidence: [],
        rejectedEvidenceIds: [],
        missingCategories: missing,
        failures: [],
        scopeValidationFailures: [],
        adapterStatus: "NOT_EXECUTED",
        durationMs: 0,
        manifest: emptyManifest({
          observation,
          adapterStatus: "NOT_EXECUTED",
          durationMs: 0,
          evidence: [],
          rejectedCount: 0,
          rejected,
          freshnessCounts,
          categoryCounts,
          statusCounts,
        }),
      };
    }

    if (
      observation.companyId !== input.scope.companyId ||
      (input.scope.assistantId && observation.assistantId !== input.scope.assistantId)
    ) {
      failures.push("RAG_OBSERVATION_SCOPE_MISMATCH");
      rejected.crossTenant += observation.items.length;
      return {
        evidence: [],
        rejectedEvidenceIds: [],
        missingCategories: [...input.requestedCategories],
        failures,
        scopeValidationFailures: ["COMPANY_SCOPE_MISMATCH"],
        adapterStatus: "FAILED",
        durationMs: 0,
        manifest: emptyManifest({
          observation,
          adapterStatus: "FAILED",
          durationMs: 0,
          evidence: [],
          rejectedCount: observation.items.length,
          rejected,
          freshnessCounts,
          categoryCounts,
          statusCounts,
        }),
      };
    }

    for (const item of observation.items) {
      const sourceType = isExplicitOfficial(item.sourceMetadata ?? {})
        ? "OFFICIAL_DOCUMENT"
        : "RAG_DOCUMENT";
      const category = item.category ? normalizeCategory(item.category) : null;
      const evidenceId = createEvidenceId({
        sourceType,
        sourceId: item.chunkId,
        companyId: item.companyId,
        assistantId: item.assistantId,
        category: category ?? "UNKNOWN",
        fieldKey: item.chunkId,
      });
      const status = `${item.documentStatus ?? "UNKNOWN"}:${item.processingStatus ?? "UNKNOWN"}`;
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;

      if (
        item.companyId !== input.scope.companyId ||
        item.assistantId !== input.scope.assistantId
      ) {
        rejected.crossTenant += 1;
        rejectedEvidenceIds.push(evidenceId);
        scopeValidationFailures.push(
          item.companyId !== input.scope.companyId
            ? "COMPANY_SCOPE_MISMATCH"
            : "ASSISTANT_SCOPE_MISMATCH",
        );
        continue;
      }
      if (item.documentStatus !== "ACTIVE" || item.processingStatus !== "READY") {
        rejected.inactive += 1;
        rejectedEvidenceIds.push(evidenceId);
        continue;
      }
      if (
        !category ||
        !item.knowledgeId ||
        !item.chunkId ||
        observation.retrievalSource !== RAG_RETRIEVAL_SOURCE
      ) {
        rejected.missingProvenance += 1;
        rejectedEvidenceIds.push(evidenceId);
        failures.push("RAG_PROVENANCE_INCOMPLETE");
        continue;
      }
      if (observation.threshold !== null && item.similarityScore < observation.threshold) {
        rejected.belowThreshold += 1;
        rejectedEvidenceIds.push(evidenceId);
        continue;
      }

      const freshness = evaluateFreshness({
        sourceType,
        category,
        observedAt: observation.observedAt,
        validFrom:
          typeof item.sourceMetadata?.validFrom === "string" ? item.sourceMetadata.validFrom : null,
        validUntil:
          typeof item.sourceMetadata?.validUntil === "string"
            ? item.sourceMetadata.validUntil
            : null,
        currentTime: input.currentTime,
      });
      freshnessCounts[freshness.status] = (freshnessCounts[freshness.status] ?? 0) + 1;
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

      const sourceId = item.chunkId;
      const sourceEvidence: SourceEvidence = {
        contractVersion: EVIDENCE_CONTRACT_VERSION,
        evidenceId,
        sourceType,
        sourceId,
        companyId: item.companyId,
        assistantId: item.assistantId,
        category,
        fieldKey: `rag:${item.knowledgeId}:${item.chunkId}`,
        valueHash: item.contentHash ?? undefined,
        confidence: clampScore(item.similarityScore),
        authorityLevel: sourceType === "OFFICIAL_DOCUMENT" ? "AUTHORITATIVE" : "CONTEXTUAL",
        observedAt: observation.observedAt,
        validFrom:
          typeof item.sourceMetadata?.validFrom === "string" ? item.sourceMetadata.validFrom : null,
        validUntil:
          typeof item.sourceMetadata?.validUntil === "string"
            ? item.sourceMetadata.validUntil
            : null,
        freshnessStatus: freshness.status,
        provenance: {
          sourceTable: "assistant_knowledge_chunks",
          sourceRecordId: item.knowledgeId,
          sourceChunkId: item.chunkId,
          sourceVersion:
            typeof item.sourceMetadata?.documentVersion === "string"
              ? item.sourceMetadata.documentVersion
              : typeof item.sourceMetadata?.version === "string"
                ? item.sourceMetadata.version
                : undefined,
          selectionReason: "V1_PIPELINE_RAG_OBSERVATION",
        },
        isSensitive: false,
        isAuthoritative: sourceType === "OFFICIAL_DOCUMENT",
        sourceStatus: "READY",
      };
      evidence.push(sourceEvidence);
    }

    const missingCategories = input.requestedCategories.filter(
      (category) => !evidence.some((item) => item.category === category),
    );
    const adapterStatus =
      evidence.length === 0 ? "EMPTY" : failures.length > 0 ? "PARTIAL" : "COMPLETED";
    const durationMs = Math.max(0, input.currentTime.getTime() - startedAt);
    return {
      evidence,
      rejectedEvidenceIds: [...new Set(rejectedEvidenceIds)].sort(),
      missingCategories,
      failures: [...new Set(failures)].sort(),
      scopeValidationFailures: [
        ...new Set(scopeValidationFailures),
      ].sort() as ScopeValidationStatus[],
      adapterStatus,
      durationMs,
      manifest: emptyManifest({
        observation,
        adapterStatus,
        durationMs,
        evidence,
        rejectedCount: rejectedEvidenceIds.length,
        rejected,
        freshnessCounts,
        categoryCounts,
        statusCounts,
      }),
    };
  }
}
