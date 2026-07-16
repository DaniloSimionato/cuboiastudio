import { Injectable, Logger, Optional } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { isRuntimeV2ShadowEnabled, resolveRuntimeV2Mode } from "./runtime-v2-feature-flag";
import {
  RuntimeV2ShadowOrchestrator,
  type RuntimeV2ShadowResult,
  type RuntimeV2ShadowSnapshot,
} from "./runtime-v2-shadow-orchestrator";
import type { RuntimeV2ShadowManifest } from "./runtime-v2-shadow-manifest";

export type RuntimeV2ShadowIntegrationStatus =
  | "COMPLETED"
  | "SKIPPED_OFF"
  | "SKIPPED_NOT_ALLOWLISTED"
  | "SKIPPED_INVALID_INPUT"
  | "ALREADY_PROCESSED"
  | "TIMEOUT"
  | "CAPACITY_EXCEEDED"
  | "FAILED";

export type RuntimeV2ShadowIntegrationResult = {
  status: RuntimeV2ShadowIntegrationStatus;
  manifest: RuntimeV2ShadowManifest | null;
  logId: string | null;
  logPersisted: boolean;
};

const SHADOW_LOG_MODE = "runtime-v2-shadow";
const MAX_ERROR_CODE_LENGTH = 80;

function safeErrorCode(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value
    .trim()
    .replace(/[^A-Za-z0-9_.:-]/g, "_")
    .slice(0, MAX_ERROR_CODE_LENGTH);
}

function hashMessage(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  return createHash("sha256").update(value).digest("hex");
}

function integrationKey(snapshot: RuntimeV2ShadowSnapshot): string {
  return [
    snapshot.scope.companyId,
    snapshot.scope.assistantId,
    snapshot.scope.conversationId,
    snapshot.scope.contextVersion,
    snapshot.internalMessageId,
  ].join(":");
}

function scopeKey(snapshot: RuntimeV2ShadowSnapshot): string {
  return [
    "V2",
    "SHADOW",
    snapshot.scope.companyId,
    snapshot.scope.assistantId,
    snapshot.scope.conversationId,
    snapshot.scope.contextVersion,
  ]
    .map((value) => encodeURIComponent(String(value)))
    .join(":");
}

function isValidSnapshot(
  snapshot: RuntimeV2ShadowSnapshot | null | undefined,
): snapshot is RuntimeV2ShadowSnapshot {
  return Boolean(
    snapshot?.scope.companyId?.trim() &&
    snapshot.scope.assistantId?.trim() &&
    snapshot.scope.conversationId?.trim() &&
    Number.isInteger(snapshot.scope.contextVersion) &&
    snapshot.scope.contextVersion >= 0 &&
    snapshot.internalMessageId?.trim() &&
    typeof snapshot.currentMessage === "string",
  );
}

function classifyResult(result: RuntimeV2ShadowResult): RuntimeV2ShadowIntegrationStatus {
  const manifest = result.manifest;
  if (!manifest) return "FAILED";
  if (manifest.messageAlreadyProcessed || manifest.persistenceResult === "DUPLICATE") {
    return "ALREADY_PROCESSED";
  }
  if (manifest.shadowErrorCode === "SHADOW_TIMEOUT") return "TIMEOUT";
  if (manifest.shadowErrorCode === "SHADOW_CAPACITY_EXCEEDED") {
    return "CAPACITY_EXCEEDED";
  }
  if (manifest.shadowErrorCode || manifest.validationResult === "ERROR") return "FAILED";
  return "COMPLETED";
}

@Injectable()
export class RuntimeV2ShadowIntegrationService {
  private readonly logger = new Logger(RuntimeV2ShadowIntegrationService.name);
  private readonly pending = new Set<Promise<RuntimeV2ShadowIntegrationResult>>();
  private readonly inFlight = new Set<string>();
  private readonly scopeTails = new Map<string, Promise<void>>();
  private readonly scheduledMessages = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: RuntimeV2ShadowOrchestrator,
    @Optional() private readonly environment?: NodeJS.ProcessEnv,
  ) {}

  schedule(
    snapshot: RuntimeV2ShadowSnapshot | null | undefined,
  ): Promise<RuntimeV2ShadowIntegrationResult> {
    if (!isValidSnapshot(snapshot)) {
      return this.process(snapshot);
    }

    const messageKey = integrationKey(snapshot);
    if (this.scheduledMessages.has(messageKey)) {
      return Promise.resolve({
        status: "ALREADY_PROCESSED",
        manifest: null,
        logId: null,
        logPersisted: false,
      });
    }

    this.scheduledMessages.add(messageKey);
    const sessionKey = scopeKey(snapshot);
    const previous = this.scopeTails.get(sessionKey) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() => this.process(snapshot))
      .finally(() => {
        this.scheduledMessages.delete(messageKey);
      });
    const tail = task.then(
      () => undefined,
      () => undefined,
    );
    this.scopeTails.set(sessionKey, tail);
    void tail.then(() => {
      if (this.scopeTails.get(sessionKey) === tail) {
        this.scopeTails.delete(sessionKey);
      }
    });

    this.pending.add(task);
    void task.then(
      () => this.pending.delete(task),
      () => this.pending.delete(task),
    );
    return task;
  }

  async drain(): Promise<void> {
    for (;;) {
      const pending = [...this.pending];
      if (pending.length > 0) {
        await Promise.allSettled(pending);
        continue;
      }

      // Allow a fire-and-forget schedule that was started by the current
      // event-loop turn to register its promise before declaring the queue
      // drained. This method is only a deterministic test hook.
      await new Promise<void>((resolve) => setImmediate(resolve));
      if (this.pending.size === 0) return;
    }
  }

  private async process(
    snapshot: RuntimeV2ShadowSnapshot | null | undefined,
  ): Promise<RuntimeV2ShadowIntegrationResult> {
    if (!isValidSnapshot(snapshot)) {
      return { status: "SKIPPED_INVALID_INPUT", manifest: null, logId: null, logPersisted: false };
    }

    const environment = this.environment ?? process.env;
    const mode = resolveRuntimeV2Mode({}, environment);
    if (mode === "OFF") {
      return { status: "SKIPPED_OFF", manifest: null, logId: null, logPersisted: false };
    }
    if (!isRuntimeV2ShadowEnabled({ assistantId: snapshot.scope.assistantId }, environment)) {
      return {
        status: "SKIPPED_NOT_ALLOWLISTED",
        manifest: null,
        logId: null,
        logPersisted: false,
      };
    }

    const key = integrationKey(snapshot);
    if (this.inFlight.has(key)) {
      return {
        status: "ALREADY_PROCESSED",
        manifest: null,
        logId: null,
        logPersisted: false,
      };
    }

    this.inFlight.add(key);
    try {
      const result = await this.orchestrator.process(snapshot);
      const status = classifyResult(result);
      const logId = await this.persistResult(snapshot, result, status);
      return { status, manifest: result.manifest, logId, logPersisted: Boolean(logId) };
    } catch (error) {
      const status: RuntimeV2ShadowIntegrationStatus = "FAILED";
      const logId = await this.persistResult(snapshot, null, status, error);
      return { status, manifest: null, logId, logPersisted: Boolean(logId) };
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async persistResult(
    snapshot: RuntimeV2ShadowSnapshot,
    result: RuntimeV2ShadowResult | null,
    status: RuntimeV2ShadowIntegrationStatus,
    error?: unknown,
  ): Promise<string | null> {
    const manifest = result?.manifest ?? null;
    const shadowErrorCode = safeErrorCode(manifest?.shadowErrorCode ?? errorCode(error));
    const metadata = {
      eventType: "RUNTIME_V2_SHADOW",
      runtimeVersion: "V2",
      mode: "SHADOW",
      correlationId: snapshot.correlationId,
      companyId: snapshot.scope.companyId,
      assistantId: snapshot.scope.assistantId,
      conversationId: snapshot.scope.conversationId,
      contextVersion: snapshot.scope.contextVersion,
      internalMessageId: snapshot.internalMessageId,
      externalMessageId: snapshot.externalMessageId ?? null,
      actionStateMode: manifest?.actionState?.actionStateMode ?? "OFF",
      activeActionPresent: manifest?.actionState?.activeActionPresent ?? false,
      activeActionId: manifest?.actionState?.activeActionId ?? null,
      activeActionType: manifest?.actionState?.activeActionType ?? null,
      activeActionCategory: manifest?.actionState?.activeActionCategory ?? null,
      activeActionStatus: manifest?.actionState?.activeActionStatus ?? null,
      activeActionContextVersion: manifest?.actionState?.activeActionContextVersion ?? null,
      actionAwaitingConfirmation: manifest?.actionState?.actionAwaitingConfirmation ?? false,
      actionConfirmationType: manifest?.actionState?.actionConfirmationType ?? null,
      actionConfirmationAccepted: manifest?.actionState?.actionConfirmationAccepted ?? false,
      actionConfirmationRejectedReason:
        manifest?.actionState?.actionConfirmationRejectedReason ?? null,
      actionExpired: manifest?.actionState?.actionExpired ?? false,
      actionSuperseded: manifest?.actionState?.actionSuperseded ?? false,
      actionIntentCompatibility: manifest?.actionState?.actionIntentCompatibility ?? null,
      actionMissingParameterCount: manifest?.actionState?.actionMissingParameterCount ?? 0,
      actionRequiredParameterCount: manifest?.actionState?.actionRequiredParameterCount ?? 0,
      actionArgumentsHash: manifest?.actionState?.actionArgumentsHash ?? null,
      actionIdempotencyKeyHash: manifest?.actionState?.actionIdempotencyKeyHash ?? null,
      actionStateRevisionBefore: manifest?.actionState?.actionStateRevisionBefore ?? null,
      actionStateRevisionAfter: manifest?.actionState?.actionStateRevisionAfter ?? null,
      actionEventIds: manifest?.actionState?.actionEventIds ?? [],
      actionStatePersisted: manifest?.actionState?.actionStatePersisted ?? false,
      actionExecutionPerformed: false,
      actionExternalEffectMayHaveOccurred: false,
      actionRedactionApplied: manifest?.actionState?.actionRedactionApplied ?? true,
      handoffStateMode: manifest?.handoff?.handoffStateMode ?? "OFF",
      v1HandoffObservationReceived: manifest?.handoff?.v1HandoffObservationReceived ?? false,
      handoffObservationId: manifest?.handoff?.handoffObservationId ?? null,
      activeHandoffPresent: manifest?.handoff?.activeHandoffPresent ?? false,
      activeHandoffId: manifest?.handoff?.activeHandoffId ?? null,
      activeHandoffStatus: manifest?.handoff?.activeHandoffStatus ?? null,
      handoffReasonCode: manifest?.handoff?.handoffReasonCode ?? null,
      handoffUrgency: manifest?.handoff?.handoffUrgency ?? null,
      handoffRequestedTargetType: manifest?.handoff?.handoffRequestedTargetType ?? null,
      handoffCustomerRequested: manifest?.handoff?.handoffCustomerRequested ?? false,
      handoffHumanActiveObserved: manifest?.handoff?.handoffHumanActiveObserved ?? false,
      handoffAiActiveObserved: manifest?.handoff?.handoffAiActiveObserved ?? false,
      handoffPausedByHumanObserved: manifest?.handoff?.handoffPausedByHumanObserved ?? false,
      handoffActionId: manifest?.handoff?.handoffActionId ?? null,
      handoffContextVersion: manifest?.handoff?.handoffContextVersion ?? null,
      handoffCompatibility: manifest?.handoff?.handoffCompatibility ?? null,
      handoffStateRevisionBefore: manifest?.handoff?.handoffStateRevisionBefore ?? null,
      handoffStateRevisionAfter: manifest?.handoff?.handoffStateRevisionAfter ?? null,
      handoffEventIds: manifest?.handoff?.handoffEventIds ?? [],
      handoffStatePersisted: manifest?.handoff?.handoffStatePersisted ?? false,
      handoffExecutionPerformed: false,
      chatwootMutationPerformed: false,
      labelApplied: false,
      assignmentChanged: false,
      conversationStatusChanged: false,
      aiActiveChanged: false,
      handoffRedactionApplied: manifest?.handoff?.handoffRedactionApplied ?? true,
      handoffErrorCode: manifest?.handoff?.handoffErrorCode ?? null,
      currentMessageHash: manifest?.currentMessageHash ?? hashMessage(snapshot.currentMessage),
      status,
      revisionBefore: manifest?.revisionBefore ?? null,
      revisionAfter: manifest?.revisionAfter ?? null,
      turnIntent: manifest?.turnIntent ?? null,
      intentConfidence: manifest?.intentConfidence ?? null,
      objectiveAction: manifest?.objectiveAction ?? null,
      previousObjective: manifest?.previousObjective ?? null,
      currentObjective: manifest?.currentObjective ?? null,
      confirmedFactKeysAdded: manifest?.confirmedFactKeysAdded ?? [],
      confirmedFactKeysUpdated: manifest?.confirmedFactKeysUpdated ?? [],
      confirmedFactKeysPreserved: manifest?.confirmedFactKeysPreserved ?? [],
      pendingFieldKeys: manifest?.pendingFieldKeys ?? [],
      lastRelevantQuestionKey: manifest?.lastRelevantQuestionKey ?? null,
      lastRelevantQuestionContextVersion: manifest?.lastRelevantQuestionContextVersion ?? null,
      lastRelevantQuestionUpdated: manifest?.lastRelevantQuestionUpdated ?? false,
      lastRelevantQuestionUpdateReason: manifest?.lastRelevantQuestionUpdateReason ?? "UNCHANGED",
      lastRelevantQuestionCleared: manifest?.lastRelevantQuestionCleared ?? false,
      staleQuestionRemoved: manifest?.staleQuestionRemoved ?? false,
      v2TriageSignalReceived: manifest?.v2TriageSignalReceived ?? false,
      customerUnableToAnswer: manifest?.customerUnableToAnswer ?? false,
      retrievalPlanCategories: manifest?.retrievalPlanCategories ?? [],
      authorityCategoriesRequested: manifest?.authorityCategoriesRequested ?? [],
      authorityCategoriesAvailable: manifest?.authorityCategoriesAvailable ?? [],
      authorityCategoriesMissing: manifest?.authorityCategoriesMissing ?? [],
      authorityConflictDetected: manifest?.authorityConflictDetected ?? false,
      authorityConflictCategories: manifest?.authorityConflictCategories ?? [],
      winningSourceTypes: manifest?.winningSourceTypes ?? [],
      rejectedSourceTypes: manifest?.rejectedSourceTypes ?? [],
      responsePlanAction: manifest?.responsePlanAction ?? null,
      validationResult: manifest?.validationResult ?? null,
      repeatedQuestionDetected: manifest?.repeatedQuestionDetected ?? false,
      v1SelectedIntent: manifest?.v1Comparison.selectedIntent ?? null,
      v1SelectedFlowId: manifest?.v1Comparison.selectedFlowId ?? null,
      v1TriageMode: manifest?.v1Comparison.triageMode ?? null,
      v1ToolsExposed: manifest?.v1Comparison.toolsExposed ?? [],
      v1CustomerUnableToAnswer: manifest?.v1Comparison.customerUnableToAnswer ?? false,
      v1TriageExitReason: manifest?.v1Comparison.triageExitReason ?? null,
      v1ConversationalOutcome: manifest?.v1Comparison.conversationalOutcome ?? null,
      v1FlowSelectionReason: manifest?.v1Comparison.flowSelectionReason ?? null,
      v1FlowCandidateCount: manifest?.v1Comparison.flowCandidateCount ?? 0,
      v1IntentChangedFromPreviousTurn:
        manifest?.v1Comparison.intentChangedFromPreviousTurn ?? false,
      persistenceResult: manifest?.persistenceResult ?? null,
      processingDurationMs: manifest?.processingDurationMs ?? null,
      errorCode: shadowErrorCode,
      providerCalled: manifest?.providerCalled ?? false,
      toolCalls: 0,
      outboundSent: false,
      candidateResponseStatus: manifest?.candidateResponse?.status ?? null,
      candidateGenerationId: manifest?.candidateResponse?.generationId ?? null,
      candidateResponsePlanId: manifest?.candidateResponse?.responsePlanId ?? null,
      candidateProvider: manifest?.candidateResponse?.provider ?? null,
      candidateModel: manifest?.candidateResponse?.model ?? null,
      candidateLatencyMs: manifest?.candidateResponse?.latencyMs ?? null,
      candidateOutboundAttempted: false,
      candidateOutboundPerformed: false,
      candidateRedactionApplied: manifest?.candidateResponse?.redactionApplied ?? true,
      responseComparisonAvailable: manifest?.responseComparison !== null,
      responseQualityGateResult: manifest?.responseComparison?.qualityGateResult ?? null,
      toolObservationMode: manifest?.toolObservationMode ?? "OFF",
      v1ToolExecutionObserved: manifest?.v1ToolExecutionObserved ?? false,
      toolObservationId: manifest?.toolObservationId ?? null,
      executionAttemptId: manifest?.executionAttemptId ?? null,
      linkedActionId: manifest?.linkedActionId ?? null,
      actionCorrelationStatus: manifest?.actionCorrelationStatus ?? null,
      observedToolName: manifest?.observedToolName ?? null,
      observedOperationName: manifest?.observedOperationName ?? null,
      observedActionType: manifest?.observedActionType ?? null,
      observedActionCategory: manifest?.observedActionCategory ?? null,
      observedEffectType: manifest?.observedEffectType ?? null,
      observedExecutionStatus: manifest?.observedExecutionStatus ?? null,
      observedStartedAt: manifest?.observedStartedAt ?? null,
      observedCompletedAt: manifest?.observedCompletedAt ?? null,
      observedDurationMs: manifest?.observedDurationMs ?? null,
      observedTimeoutMs: manifest?.observedTimeoutMs ?? null,
      observedArgumentsHash: manifest?.observedArgumentsHash ?? null,
      observedIdempotencyKeyHash: manifest?.observedIdempotencyKeyHash ?? null,
      observedResultHash: manifest?.observedResultHash ?? null,
      observedAuthorityCategories: manifest?.observedAuthorityCategories ?? [],
      observedValidFrom: manifest?.observedValidFrom ?? null,
      observedValidUntil: manifest?.observedValidUntil ?? null,
      observedExternalReferenceHash: manifest?.observedExternalReferenceHash ?? null,
      observedExternalEffectMayHaveOccurred:
        manifest?.observedExternalEffectMayHaveOccurred ?? false,
      observedRetryCount: manifest?.observedRetryCount ?? 0,
      observedDuplicateSuppressed: manifest?.observedDuplicateSuppressed ?? false,
      observedReconciliationStatus: manifest?.observedReconciliationStatus ?? null,
      observedErrorCode: manifest?.observedErrorCode ?? null,
      toolObservationPersisted: manifest?.toolObservationPersisted ?? false,
      toolObservationRedactionApplied: manifest?.toolObservationRedactionApplied ?? true,
      toolObservations: manifest?.toolObservations ?? [],
      syntheticExecution: manifest?.syntheticExecution ?? null,
      evidenceMode: manifest?.evidence?.evidenceMode ?? "OFF",
      evidenceContractVersion: manifest?.evidence?.evidenceContractVersion ?? null,
      requestedEvidenceCategories: manifest?.evidence?.requestedEvidenceCategories ?? [],
      officialEvidenceCount: manifest?.evidence?.officialEvidenceCount ?? 0,
      officialEvidenceIds: manifest?.evidence?.officialEvidenceIds ?? [],
      officialAdapterEmptyReason: manifest?.evidence?.officialAdapterEmptyReason ?? null,
      requestedCategoryDerivation: manifest?.evidence?.requestedCategoryDerivation ?? {},
      evidenceCountsByCategory: manifest?.evidence?.evidenceCountsByCategory ?? {},
      evidenceCountsBySourceType: manifest?.evidence?.evidenceCountsBySourceType ?? {},
      winningEvidenceIds: manifest?.evidence?.winningEvidenceIds ?? [],
      rejectedEvidenceIds: manifest?.evidence?.rejectedEvidenceIds ?? [],
      conflictDetected: manifest?.evidence?.conflictDetected ?? false,
      conflictCategories: manifest?.evidence?.conflictCategories ?? [],
      missingCategories: manifest?.evidence?.missingCategories ?? [],
      authorityDecisionStatus: manifest?.evidence?.authorityDecisionStatus ?? [],
      authorityPolicyVersion: manifest?.evidence?.authorityPolicyVersion ?? null,
      freshnessCounts: manifest?.evidence?.freshnessCounts ?? {},
      scopeValidationFailures: manifest?.evidence?.scopeValidationFailures ?? [],
      adapterStatus: manifest?.evidence?.adapterStatus ?? "SKIPPED",
      adapterDurationMs: manifest?.evidence?.adapterDurationMs ?? 0,
      redactionApplied: manifest?.evidence?.redactionApplied ?? true,
      ragObservationReceived: manifest?.evidence?.rag?.ragObservationReceived ?? false,
      ragRetrievalExecuted: manifest?.evidence?.rag?.ragRetrievalExecuted ?? false,
      ragThreshold: manifest?.evidence?.rag?.ragThreshold ?? null,
      ragThresholdSource: manifest?.evidence?.rag?.ragThresholdSource ?? null,
      ragResultCount: manifest?.evidence?.rag?.ragResultCount ?? 0,
      ragEvidenceCount: manifest?.evidence?.rag?.ragEvidenceCount ?? 0,
      ragRejectedCount: manifest?.evidence?.rag?.ragRejectedCount ?? 0,
      ragEvidenceIds: manifest?.evidence?.rag?.ragEvidenceIds ?? [],
      ragKnowledgeIds: manifest?.evidence?.rag?.ragKnowledgeIds ?? [],
      ragDocumentIds: manifest?.evidence?.rag?.ragDocumentIds ?? [],
      ragChunkIds: manifest?.evidence?.rag?.ragChunkIds ?? [],
      ragScoreBuckets: manifest?.evidence?.rag?.ragScoreBuckets ?? {},
      ragStatusCounts: manifest?.evidence?.rag?.ragStatusCounts ?? {},
      ragFreshnessCounts: manifest?.evidence?.rag?.ragFreshnessCounts ?? {},
      ragCategoryCounts: manifest?.evidence?.rag?.ragCategoryCounts ?? {},
      ragContentHashes: manifest?.evidence?.rag?.ragContentHashes ?? [],
      ragCrossTenantRejected: manifest?.evidence?.rag?.ragCrossTenantRejected ?? 0,
      ragInactiveRejected: manifest?.evidence?.rag?.ragInactiveRejected ?? 0,
      ragBelowThresholdRejected: manifest?.evidence?.rag?.ragBelowThresholdRejected ?? 0,
      ragMissingProvenanceRejected: manifest?.evidence?.rag?.ragMissingProvenanceRejected ?? 0,
      ragConflictDetected: manifest?.evidence?.rag?.ragConflictDetected ?? false,
      ragAdapterStatus: manifest?.evidence?.rag?.ragAdapterStatus ?? "NOT_EXECUTED",
      ragAdapterDurationMs: manifest?.evidence?.rag?.ragAdapterDurationMs ?? 0,
      ragContentPersisted: false,
      ragNotExecutedReason: manifest?.evidence?.rag?.ragNotExecutedReason ?? null,
      memoryObservationReceived: manifest?.evidence?.memory?.memoryObservationReceived ?? false,
      memoryRetrievalExecuted: manifest?.evidence?.memory?.memoryRetrievalExecuted ?? false,
      memoryResultCount: manifest?.evidence?.memory?.memoryResultCount ?? 0,
      memoryEvidenceCount: manifest?.evidence?.memory?.memoryEvidenceCount ?? 0,
      memoryRejectedCount: manifest?.evidence?.memory?.memoryRejectedCount ?? 0,
      memoryEvidenceIds: manifest?.evidence?.memory?.memoryEvidenceIds ?? [],
      memoryProfileIds: manifest?.evidence?.memory?.memoryProfileIds ?? [],
      memoryCategoryCounts: manifest?.evidence?.memory?.memoryCategoryCounts ?? {},
      memoryStatusCounts: manifest?.evidence?.memory?.memoryStatusCounts ?? {},
      memoryFreshnessCounts: manifest?.evidence?.memory?.memoryFreshnessCounts ?? {},
      memoryConfidenceBuckets: manifest?.evidence?.memory?.memoryConfidenceBuckets ?? {},
      memoryTemporaryCount: manifest?.evidence?.memory?.memoryTemporaryCount ?? 0,
      memoryExpiredRejected: manifest?.evidence?.memory?.memoryExpiredRejected ?? 0,
      memoryMissingExpiryRejected: manifest?.evidence?.memory?.memoryMissingExpiryRejected ?? 0,
      memoryCategoryRejected: manifest?.evidence?.memory?.memoryCategoryRejected ?? 0,
      memorySensitiveRejected: manifest?.evidence?.memory?.memorySensitiveRejected ?? 0,
      memoryCrossTenantRejected: manifest?.evidence?.memory?.memoryCrossTenantRejected ?? 0,
      memoryCrossAssistantRejected: manifest?.evidence?.memory?.memoryCrossAssistantRejected ?? 0,
      memoryCrossContactRejected: manifest?.evidence?.memory?.memoryCrossContactRejected ?? 0,
      memoryContextVersionRejected: manifest?.evidence?.memory?.memoryContextVersionRejected ?? 0,
      memorySharingDisabledRejected: manifest?.evidence?.memory?.memorySharingDisabledRejected ?? 0,
      memoryConflictDetected: manifest?.evidence?.memory?.memoryConflictDetected ?? false,
      memoryAdapterStatus: manifest?.evidence?.memory?.memoryAdapterStatus ?? "NOT_EXECUTED",
      memoryAdapterDurationMs: manifest?.evidence?.memory?.memoryAdapterDurationMs ?? 0,
      memoryContentPersisted: false,
      memoryWritePerformed: false,
      memoryEmbeddingGenerated: false,
      memoryNotExecutedReason: manifest?.evidence?.memory?.memoryNotExecutedReason ?? null,
      retrievalBundleVersion: manifest?.evidence?.retrievalBundleVersion ?? null,
      adapterExecutionOrder: manifest?.evidence?.adapterExecutionOrder ?? [],
      adapterStatuses: manifest?.evidence?.adapterStatuses ?? {},
      totalEvidenceCount: manifest?.evidence?.totalEvidenceCount ?? 0,
      deduplicatedEvidenceCount: manifest?.evidence?.deduplicatedEvidenceCount ?? 0,
      duplicateEvidenceRejected: manifest?.evidence?.duplicateEvidenceRejected ?? 0,
      authorityDecisionsByCategory: manifest?.evidence?.authorityDecisionsByCategory ?? {},
      decisionStatusCounts: manifest?.evidence?.decisionStatusCounts ?? {},
      winningEvidenceIdsByCategory: manifest?.evidence?.winningEvidenceIdsByCategory ?? {},
      rejectedEvidenceIdsByCategory: manifest?.evidence?.rejectedEvidenceIdsByCategory ?? {},
      winningSourceTypesByCategory: manifest?.evidence?.winningSourceTypesByCategory ?? {},
      conflictReasons: manifest?.evidence?.conflictReasons ?? [],
      invalidEvidenceCount: manifest?.evidence?.invalidEvidenceCount ?? 0,
      customerEvidenceCount: manifest?.evidence?.customerEvidenceCount ?? 0,
      sessionEvidenceCount: manifest?.evidence?.sessionEvidenceCount ?? 0,
      sessionRawCandidateCount: manifest?.evidence?.sessionRawCandidateCount ?? 0,
      sessionDeduplicatedCount: manifest?.evidence?.sessionDeduplicatedCount ?? 0,
      sessionDuplicateRejectedCount: manifest?.evidence?.sessionDuplicateRejectedCount ?? 0,
      authorizedEvidenceCategories: manifest?.evidence?.authorizedCategories ?? [],
      contextualOnlyEvidenceCategories: manifest?.evidence?.contextualOnlyCategories ?? [],
      unavailableEvidenceCategories: manifest?.evidence?.unavailableCategories ?? [],
      winningEvidenceSourceTypes: manifest?.evidence?.winningSourceTypes ?? [],
      evidencePipelineError: manifest?.evidence?.evidencePipelineError ?? null,
      officialValuePersisted: false,
      customerContentPersisted: false,
      sessionContentPersisted: false,
    } satisfies Prisma.InputJsonValue;

    try {
      const log = await this.prisma.assistantRuntimeLog.create({
        data: {
          companyId: snapshot.scope.companyId,
          assistantId: snapshot.scope.assistantId,
          conversationId: snapshot.scope.conversationId,
          userMessageId: snapshot.internalMessageId,
          assistantMessageId: null,
          mode: SHADOW_LOG_MODE,
          status,
          provider: null,
          model: null,
          configurationSource: "runtime-v2-shadow",
          fallback: false,
          fallbackReason: null,
          outcome: status === "COMPLETED" ? "shadow_completed" : `shadow_${status.toLowerCase()}`,
          durationMs: manifest?.processingDurationMs ?? null,
          providerStatus: null,
          providerErrorType: null,
          providerErrorCode: shadowErrorCode,
          providerErrorMessage: null,
          knowledgeCount: null,
          historyMessagesUsed: null,
          historyLimit: null,
          initialMessageIncluded: false,
          instructionsIncluded: false,
          detectedIntent: manifest?.turnIntent ?? null,
          selectedFlowId: manifest?.v1Comparison.selectedFlowId ?? null,
          selectedFlowName: null,
          intentConfidence: manifest?.intentConfidence ?? null,
          metadata,
        },
        select: { id: true },
      });
      return log.id;
    } catch (logError) {
      this.logger.warn({
        event: "runtime_v2_shadow_log_failed",
        companyId: snapshot.scope.companyId,
        assistantId: snapshot.scope.assistantId,
        conversationId: snapshot.scope.conversationId,
        internalMessageId: snapshot.internalMessageId,
        errorCode: safeErrorCode(errorCode(logError)),
      });
      return null;
    }
  }
}

function errorCode(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `PRISMA_${error.code}`;
  }
  if (error instanceof Error && /^[A-Z][A-Z0-9_.:-]{2,79}$/.test(error.name)) {
    return error.name;
  }
  if (error instanceof Error && error.constructor?.name === "PrismaClientKnownRequestError") {
    return "PRISMA_KNOWN_REQUEST_ERROR";
  }
  if (error instanceof Error && /^[A-Za-z][A-Za-z0-9_.:-]{2,79}$/.test(error.message.trim())) {
    return error.message.trim();
  }
  if (error instanceof Error) return "SHADOW_INTEGRATION_ERROR";
  if (error != null) return "SHADOW_INTEGRATION_ERROR";
  return null;
}
