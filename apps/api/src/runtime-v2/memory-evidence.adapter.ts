import { Injectable } from "@nestjs/common";
import {
  EVIDENCE_CONTRACT_VERSION,
  createEvidenceId,
  type FreshnessStatus,
  type ScopeContext,
  type SourceEvidence,
} from "./evidence-contracts";
import { evaluateFreshness } from "./evidence-freshness";
import { validateEvidenceScope, type ScopeValidationStatus } from "./evidence-scope";

export const MEMORY_RETRIEVAL_SOURCE = "V1_PIPELINE" as const;
export type MemoryNotExecutedReason =
  | "MEMORY_DISABLED"
  | "EXTRACTION_DISABLED"
  | "CATEGORY_NOT_ALLOWED"
  | "EXTRACTION_NO_RESULT"
  | "EXTRACTION_COMPLETED"
  | "RETRIEVAL_NOT_REQUIRED"
  | "RETRIEVAL_EMPTY"
  | "RETRIEVAL_WITH_RESULTS"
  | "BELOW_CONFIDENCE"
  | "EXPIRED"
  | "PIPELINE_ERROR";

export type MemoryRetrievalObservationItem = {
  memoryItemId: string;
  profileId: string;
  companyId: string;
  assistantId?: string | null;
  contactId: string;
  category: string;
  type?: string | null;
  status: string;
  confidence: number | null;
  temporary: boolean;
  expiresAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  sourceEventId?: string | null;
  sourceMessageId?: string | null;
  sourceConversationId?: string | null;
  contextVersion?: number | null;
  valueHash?: string | null;
  isSensitive: boolean;
  sharedAcrossAssistants: boolean;
  embeddingPresent: boolean;
  embeddingModel?: string | null;
  embeddingVersion?: string | null;
  provenance?: Record<string, string | number | boolean>;
};

export type MemoryRetrievalObservation = {
  retrievalExecuted: boolean;
  retrievalSource: typeof MEMORY_RETRIEVAL_SOURCE;
  companyId: string;
  assistantId: string;
  contactId: string;
  conversationId: string;
  contextVersion: number;
  internalMessageId: string;
  profileId?: string | null;
  observedAt: string;
  configurationSnapshot: {
    memoryEnabled: boolean;
    memoryExtractionEnabled: boolean;
    allowedCategories: string[] | null;
    confidenceThreshold: number | null;
    temporaryDefaultDays: number | null;
    sharedAcrossAssistants: boolean;
  };
  resultCount: number;
  items: MemoryRetrievalObservationItem[];
  notExecutedReason?: MemoryNotExecutedReason;
};

export type MemorySharingPolicy = "DENY" | "ALLOW";

export type MemoryEvidencePolicy = {
  sharingAcrossAssistants?: MemorySharingPolicy;
  minimumConfidence?: number;
  allowedContextCategories?: string[];
};

export type MemoryEvidenceAdapterStatus =
  "COMPLETED" | "PARTIAL" | "EMPTY" | "FAILED" | "NOT_EXECUTED";

export type MemoryEvidenceManifest = {
  memoryObservationReceived: boolean;
  memoryRetrievalExecuted: boolean;
  memoryResultCount: number;
  memoryEvidenceCount: number;
  memoryRejectedCount: number;
  memoryEvidenceIds: string[];
  memoryProfileIds: string[];
  memoryCategoryCounts: Record<string, number>;
  memoryStatusCounts: Record<string, number>;
  memoryFreshnessCounts: Partial<Record<FreshnessStatus, number>>;
  memoryConfidenceBuckets: Record<string, number>;
  memoryTemporaryCount: number;
  memoryExpiredRejected: number;
  memoryMissingExpiryRejected: number;
  memoryCategoryRejected: number;
  memorySensitiveRejected: number;
  memoryCrossTenantRejected: number;
  memoryCrossAssistantRejected: number;
  memoryCrossContactRejected: number;
  memoryContextVersionRejected: number;
  memorySharingDisabledRejected: number;
  memoryConflictDetected: boolean;
  memoryAdapterStatus: MemoryEvidenceAdapterStatus;
  memoryAdapterDurationMs: number;
  memoryContentPersisted: false;
  memoryWritePerformed: false;
  memoryEmbeddingGenerated: false;
  memoryNotExecutedReason: MemoryNotExecutedReason | null;
};

export type MemoryEvidenceAdapterResult = {
  evidence: SourceEvidence[];
  rejectedEvidenceIds: string[];
  missingCategories: string[];
  failures: string[];
  scopeValidationFailures: ScopeValidationStatus[];
  adapterStatus: MemoryEvidenceAdapterStatus;
  durationMs: number;
  manifest: MemoryEvidenceManifest;
};

const DEFAULT_CONTEXT_CATEGORIES = [
  "CUSTOMER_IDENTITY",
  "CONTACT_PREFERENCE",
  "TECHNICAL_INFORMATION",
];

function asDateString(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function confidenceBucket(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "INVALID";
  if (value < 0.7) return "0.0-0.7";
  if (value < 0.8) return "0.7-0.8";
  if (value < 0.9) return "0.8-0.9";
  return "0.9-1.0";
}

function mapCategory(category: string): string | null {
  const normalized = category.trim().toUpperCase();
  if (normalized === "IDENTITY" || normalized === "CUSTOMER_IDENTITY") {
    return "CUSTOMER_IDENTITY";
  }
  if (normalized === "PREFERENCE" || normalized === "CONTACT_PREFERENCE") {
    return "CONTACT_PREFERENCE";
  }
  if (normalized === "TECHNICAL_INFORMATION" || normalized === "TEMPORARY_CONTEXT") {
    return "TECHNICAL_INFORMATION";
  }
  return null;
}

function isActive(item: MemoryRetrievalObservationItem): boolean {
  return item.status.toUpperCase() === "ACTIVE";
}

function emptyManifest(
  observation: MemoryRetrievalObservation | null,
  status: MemoryEvidenceAdapterStatus,
): MemoryEvidenceManifest {
  return {
    memoryObservationReceived: observation !== null,
    memoryRetrievalExecuted: observation?.retrievalExecuted === true,
    memoryResultCount: observation?.resultCount ?? 0,
    memoryEvidenceCount: 0,
    memoryRejectedCount: 0,
    memoryEvidenceIds: [],
    memoryProfileIds: [],
    memoryCategoryCounts: {},
    memoryStatusCounts: {},
    memoryFreshnessCounts: {},
    memoryConfidenceBuckets: {},
    memoryTemporaryCount: observation?.items.filter((item) => item.temporary).length ?? 0,
    memoryExpiredRejected: 0,
    memoryMissingExpiryRejected: 0,
    memoryCategoryRejected: 0,
    memorySensitiveRejected: 0,
    memoryCrossTenantRejected: 0,
    memoryCrossAssistantRejected: 0,
    memoryCrossContactRejected: 0,
    memoryContextVersionRejected: 0,
    memorySharingDisabledRejected: 0,
    memoryConflictDetected: false,
    memoryAdapterStatus: status,
    memoryAdapterDurationMs: 0,
    memoryContentPersisted: false,
    memoryWritePerformed: false,
    memoryEmbeddingGenerated: false,
    memoryNotExecutedReason: observation?.notExecutedReason ?? null,
  };
}

export function createMemoryRetrievalObservation(input: {
  companyId: string;
  assistantId: string;
  contactId: string;
  conversationId: string;
  contextVersion: number;
  internalMessageId: string;
  profileId?: string | null;
  profileAssistantId?: string | null;
  observedAt?: Date;
  retrievalExecuted: boolean;
  notExecutedReason?: MemoryNotExecutedReason;
  configurationSnapshot: MemoryRetrievalObservation["configurationSnapshot"];
  selectedMemories?: Array<Record<string, unknown>>;
}): MemoryRetrievalObservation {
  const observedAt = input.observedAt ?? new Date();
  const items = (input.selectedMemories ?? []).flatMap((memory) => {
    const memoryItemId = typeof memory.id === "string" ? memory.id : null;
    if (!memoryItemId) return [];
    const expiresAt = asDateString(memory.expiresAt as Date | string | null | undefined);
    const updatedAt = asDateString(memory.updatedAt as Date | string | null | undefined);
    const createdAt = asDateString(memory.createdAt as Date | string | null | undefined);
    const sourceConversationId =
      typeof memory.sourceConversationId === "string" ? memory.sourceConversationId : null;
    const rawCategory = typeof memory.category === "string" ? memory.category : "UNKNOWN";
    return [
      {
        memoryItemId,
        profileId: input.profileId ?? input.contactId,
        companyId: input.companyId,
        assistantId:
          typeof memory.assistantId === "string"
            ? memory.assistantId
            : (input.profileAssistantId ?? null),
        contactId: input.contactId,
        category: rawCategory,
        type: rawCategory,
        status: memory.deletedAt ? "DELETED" : memory.active === false ? "INACTIVE" : "ACTIVE",
        confidence: typeof memory.confidence === "number" ? memory.confidence : null,
        temporary: rawCategory.toUpperCase() === "TEMPORARY_CONTEXT",
        expiresAt,
        createdAt,
        updatedAt,
        sourceMessageId: typeof memory.sourceMessageId === "string" ? memory.sourceMessageId : null,
        sourceConversationId,
        valueHash: typeof memory.contentHash === "string" ? memory.contentHash : null,
        isSensitive: memory.isSensitive === true || memory.sensitive === true,
        sharedAcrossAssistants: input.configurationSnapshot.sharedAcrossAssistants,
        embeddingPresent: memory.embeddingStatus === "READY" || memory.embeddingPresent === true,
        embeddingModel: typeof memory.embeddingModel === "string" ? memory.embeddingModel : null,
        embeddingVersion:
          typeof memory.embeddingVersion === "string" ? memory.embeddingVersion : null,
        provenance: { selectionReason: "V1_PIPELINE_MEMORY_OBSERVATION" },
      },
    ];
  });
  return {
    retrievalExecuted: input.retrievalExecuted,
    retrievalSource: MEMORY_RETRIEVAL_SOURCE,
    companyId: input.companyId,
    assistantId: input.assistantId,
    contactId: input.contactId,
    conversationId: input.conversationId,
    contextVersion: input.contextVersion,
    internalMessageId: input.internalMessageId,
    profileId: input.profileId ?? null,
    observedAt: observedAt.toISOString(),
    configurationSnapshot: input.configurationSnapshot,
    resultCount: items.length,
    items,
    notExecutedReason:
      input.notExecutedReason ??
      (input.retrievalExecuted
        ? items.length > 0
          ? "RETRIEVAL_WITH_RESULTS"
          : "RETRIEVAL_EMPTY"
        : "RETRIEVAL_NOT_REQUIRED"),
  };
}

@Injectable()
export class MemoryEvidenceAdapter {
  read(input: {
    scope: ScopeContext;
    requestedCategories: string[];
    observation?: MemoryRetrievalObservation | null;
    currentTime: Date;
    policy?: MemoryEvidencePolicy;
  }): MemoryEvidenceAdapterResult {
    const observation = input.observation ?? null;
    if (!observation || !observation.retrievalExecuted) {
      return {
        evidence: [],
        rejectedEvidenceIds: [],
        missingCategories: [...input.requestedCategories],
        failures: [],
        scopeValidationFailures: [],
        adapterStatus: "NOT_EXECUTED",
        durationMs: 0,
        manifest: emptyManifest(observation, "NOT_EXECUTED"),
      };
    }

    const manifest = emptyManifest(observation, "COMPLETED");
    const evidence: SourceEvidence[] = [];
    const rejectedEvidenceIds: string[] = [];
    const failures: string[] = [];
    const scopeValidationFailures: ScopeValidationStatus[] = [];
    const configuredCategories = observation.configurationSnapshot.allowedCategories ?? [];
    const allowedCategories = new Set(
      input.policy?.allowedContextCategories ??
        (configuredCategories.length > 0
          ? configuredCategories.map((category) => mapCategory(category) ?? category.toUpperCase())
          : DEFAULT_CONTEXT_CATEGORIES),
    );
    const minimumConfidence =
      input.policy?.minimumConfidence ??
      observation.configurationSnapshot.confidenceThreshold ??
      0.7;
    const sharingPolicy = input.policy?.sharingAcrossAssistants ?? "DENY";
    const categoryHashes = new Map<string, Set<string>>();

    const observationScopeMatches =
      observation.companyId === input.scope.companyId &&
      observation.assistantId === input.scope.assistantId &&
      observation.contactId === input.scope.contactId &&
      observation.conversationId === input.scope.conversationId &&
      observation.contextVersion === input.scope.contextVersion;
    if (!observationScopeMatches) {
      failures.push("MEMORY_OBSERVATION_SCOPE_MISMATCH");
      manifest.memoryCrossTenantRejected =
        observation.companyId !== input.scope.companyId ? observation.items.length : 0;
      manifest.memoryCrossAssistantRejected =
        observation.assistantId !== input.scope.assistantId ? observation.items.length : 0;
      manifest.memoryCrossContactRejected =
        observation.contactId !== input.scope.contactId ? observation.items.length : 0;
      manifest.memoryContextVersionRejected =
        observation.contextVersion !== input.scope.contextVersion ? observation.items.length : 0;
      return {
        evidence: [],
        rejectedEvidenceIds: [],
        missingCategories: [...input.requestedCategories],
        failures,
        scopeValidationFailures: ["COMPANY_SCOPE_MISMATCH"],
        adapterStatus: "FAILED",
        durationMs: 0,
        manifest: { ...manifest, memoryRejectedCount: observation.items.length },
      };
    }

    for (const item of observation.items) {
      const sourceType = item.temporary ? "TEMPORARY_MEMORY" : "CONTACT_MEMORY";
      const category = mapCategory(item.category);
      const evidenceId = createEvidenceId({
        sourceType,
        sourceId: item.memoryItemId,
        companyId: item.companyId,
        assistantId: item.assistantId ?? input.scope.assistantId,
        category: category ?? "UNKNOWN",
        fieldKey: item.memoryItemId,
      });
      rejectedEvidenceIds.push(evidenceId);
      manifest.memoryStatusCounts[item.status] =
        (manifest.memoryStatusCounts[item.status] ?? 0) + 1;
      const bucket = confidenceBucket(item.confidence);
      manifest.memoryConfidenceBuckets[bucket] =
        (manifest.memoryConfidenceBuckets[bucket] ?? 0) + 1;

      if (item.companyId !== input.scope.companyId) {
        manifest.memoryCrossTenantRejected++;
        scopeValidationFailures.push("COMPANY_SCOPE_MISMATCH");
        continue;
      }
      if (
        item.sharedAcrossAssistants &&
        item.assistantId !== input.scope.assistantId &&
        sharingPolicy !== "ALLOW"
      ) {
        manifest.memoryCrossAssistantRejected++;
        manifest.memorySharingDisabledRejected++;
        failures.push("CROSS_ASSISTANT_SHARING_DISABLED");
        continue;
      }
      if (item.assistantId && item.assistantId !== input.scope.assistantId) {
        manifest.memoryCrossAssistantRejected++;
        scopeValidationFailures.push("ASSISTANT_SCOPE_MISMATCH");
        continue;
      }
      if (item.contactId !== input.scope.contactId || !input.scope.contactId) {
        manifest.memoryCrossContactRejected++;
        scopeValidationFailures.push("CONTACT_SCOPE_MISMATCH");
        continue;
      }
      if (item.profileId !== observation.profileId && observation.profileId) {
        manifest.memoryCrossContactRejected++;
        failures.push("PROFILE_SCOPE_MISMATCH");
        continue;
      }
      if (!isActive(item)) continue;
      if (item.isSensitive) {
        manifest.memorySensitiveRejected++;
        continue;
      }
      if (
        !category ||
        !allowedCategories.has(category) ||
        (input.requestedCategories.length > 0 && !input.requestedCategories.includes(category))
      ) {
        manifest.memoryCategoryRejected++;
        continue;
      }
      if (
        item.confidence === null ||
        !Number.isFinite(item.confidence) ||
        item.confidence < minimumConfidence
      ) {
        continue;
      }
      if (item.temporary && !item.expiresAt) {
        manifest.memoryMissingExpiryRejected++;
        failures.push("TEMPORARY_MEMORY_EXPIRY_REQUIRED");
        continue;
      }
      if (
        item.temporary &&
        item.sourceConversationId &&
        item.sourceConversationId !== input.scope.conversationId
      ) {
        manifest.memoryContextVersionRejected++;
        scopeValidationFailures.push("CONVERSATION_SCOPE_MISMATCH");
        continue;
      }
      if (
        item.contextVersion !== null &&
        item.contextVersion !== undefined &&
        item.contextVersion !== input.scope.contextVersion
      ) {
        manifest.memoryContextVersionRejected++;
        scopeValidationFailures.push("CONTEXT_VERSION_MISMATCH");
        continue;
      }

      const freshness = evaluateFreshness({
        sourceType,
        category,
        observedAt: item.updatedAt ?? item.createdAt ?? observation.observedAt,
        validUntil: item.expiresAt,
        currentTime: input.currentTime,
      });
      manifest.memoryFreshnessCounts[freshness.status] =
        (manifest.memoryFreshnessCounts[freshness.status] ?? 0) + 1;
      if (!freshness.eligible && freshness.status !== "UNKNOWN") {
        if (freshness.status === "EXPIRED") manifest.memoryExpiredRejected++;
        continue;
      }

      const sourceEvidence: SourceEvidence = {
        contractVersion: EVIDENCE_CONTRACT_VERSION,
        evidenceId,
        sourceType,
        sourceId: item.memoryItemId,
        companyId: item.companyId,
        assistantId:
          item.assistantId !== input.scope.assistantId && sharingPolicy === "ALLOW"
            ? null
            : (item.assistantId ?? input.scope.assistantId),
        contactId: item.contactId,
        conversationId: item.temporary ? input.scope.conversationId : null,
        contextVersion: item.temporary ? input.scope.contextVersion : null,
        category,
        fieldKey: `memory:${item.category}`,
        valueHash: item.valueHash ?? undefined,
        confidence: item.confidence,
        authorityLevel: "CONTEXTUAL",
        observedAt: item.updatedAt ?? item.createdAt ?? observation.observedAt,
        validFrom: null,
        validUntil: item.expiresAt ?? null,
        freshnessStatus: freshness.status,
        provenance: {
          sourceTable: "contact_memory_items",
          sourceRecordId: item.memoryItemId,
          sourceMessageId: item.sourceMessageId ?? undefined,
          sourceVersion: item.embeddingVersion ?? undefined,
          selectionReason: "V1_PIPELINE_MEMORY_OBSERVATION",
        },
        isSensitive: false,
        isAuthoritative: false,
        sourceStatus: "ACTIVE",
      };
      const scopeResult = validateEvidenceScope(sourceEvidence, input.scope);
      if (!scopeResult.valid) {
        scopeValidationFailures.push(scopeResult.status);
        continue;
      }
      evidence.push(sourceEvidence);
      rejectedEvidenceIds.pop();
      manifest.memoryCategoryCounts[category] = (manifest.memoryCategoryCounts[category] ?? 0) + 1;
      manifest.memoryProfileIds.push(item.profileId);
      const hashes = categoryHashes.get(category) ?? new Set<string>();
      hashes.add(item.valueHash ?? `missing:${item.memoryItemId}`);
      categoryHashes.set(category, hashes);
    }

    manifest.memoryEvidenceIds = evidence.map((item) => item.evidenceId).sort();
    manifest.memoryProfileIds = [...new Set(manifest.memoryProfileIds)].sort();
    manifest.memoryEvidenceCount = evidence.length;
    manifest.memoryRejectedCount = rejectedEvidenceIds.length;
    manifest.memoryConflictDetected = [...categoryHashes.values()].some(
      (hashes) => hashes.size > 1,
    );
    manifest.memoryAdapterStatus =
      evidence.length === 0 ? "EMPTY" : failures.length ? "PARTIAL" : "COMPLETED";
    const durationMs = 0;
    manifest.memoryAdapterDurationMs = durationMs;
    return {
      evidence,
      rejectedEvidenceIds: [...new Set(rejectedEvidenceIds)].sort(),
      missingCategories: input.requestedCategories.filter(
        (category) => !evidence.some((item) => item.category === category),
      ),
      failures: [...new Set(failures)].sort(),
      scopeValidationFailures: [
        ...new Set(scopeValidationFailures),
      ].sort() as ScopeValidationStatus[],
      adapterStatus: manifest.memoryAdapterStatus,
      durationMs,
      manifest,
    };
  }
}
