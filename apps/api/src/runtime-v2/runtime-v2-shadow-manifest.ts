import { hashCanonicalInboundMessageContent } from "../inbound/canonical-inbound-message";
import { CONVERSATION_STATE_VERSION } from "./conversation-state";
import {
  type ObjectiveAction,
  type ResponsePlanAction,
  type ResponseValidationResult,
  type RuntimeV2Scope,
  type TurnUnderstanding,
  type ConversationState,
  type RetrievalPlan,
} from "./runtime-v2.types";
import { type RuntimeV2Mode, type RuntimeV2ToolObservationMode } from "./runtime-v2-feature-flag";
import { type EvidenceManifestExtension } from "./evidence-manifest";
import { type RuntimeV2ActionManifest } from "./action-contracts";
import { type ActionStateManifest } from "./action-state";
import { type ToolObservationManifest } from "./tool-observation";
import type { SyntheticExecutionManifest } from "./synthetic-execution";
import type { HandoffStateManifest } from "./handoff-state";
import type { RuntimeResponseComparison, RuntimeV2CandidateResponse } from "./runtime-v2.types";

export type RuntimeV2ShadowManifest = {
  runtimeVersion: "V2";
  mode: RuntimeV2Mode;
  correlationId: string;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  schemaVersion: string;
  revisionBefore: number;
  revisionAfter: number;
  currentMessageHash: string | null;
  audioMessage: boolean;
  transcriptionAvailable: boolean;
  transcriptionPersisted: boolean;
  messageAlreadyProcessed: boolean;
  turnIntent: string;
  intentConfidence: number;
  explicitIntentDetected: boolean;
  followUpDetected: boolean;
  followUpResolutionStatus: string;
  inheritedTopic: string | null;
  historyMessagesConsidered: number;
  inheritedFromMessageFingerprint: string | null;
  inheritedFromConversationId: string | null;
  inheritedFromRecentContext: boolean;
  resolutionConfidence: number | null;
  ambiguityDetected: boolean;
  topicChanged: boolean;
  previousTopic: string | null;
  currentTopic: string | null;
  topicChangeReason: string | null;
  inheritedTopicSuppressed: boolean;
  inheritanceEvaluated: boolean;
  inheritanceAllowed: boolean;
  inheritanceBlockReason: string | null;
  resolutionReasonCode: string | null;
  humanRequested: boolean;
  humanRequestConfidence: number;
  handoffRequired: boolean;
  handoffReason: string | null;
  handoffExecutionAllowed: false;
  handoffExecutionAttempted: false;
  handoffExecuted: false;
  handoffStatus: "NOT_REQUIRED" | "REQUIRED_NOT_EXECUTED";
  objectiveAction: ObjectiveAction;
  currentObjective: string | null;
  previousObjective: string | null;
  confirmedFactKeysAdded: string[];
  confirmedFactKeysUpdated: string[];
  confirmedFactKeysPreserved: string[];
  pendingFieldKeys: string[];
  lastRelevantQuestionKey: string | null;
  lastRelevantQuestionContextVersion: number | null;
  lastRelevantQuestionUpdated: boolean;
  lastRelevantQuestionUpdateReason: string;
  lastRelevantQuestionCleared: boolean;
  staleQuestionRemoved: boolean;
  v2TriageSignalReceived: boolean;
  customerUnableToAnswer: boolean;
  retrievalPlanCategories: string[];
  authorityCategoriesRequested: string[];
  authorityCategoriesAvailable: string[];
  authorityCategoriesMissing: string[];
  authorityConflictDetected: boolean;
  authorityConflictCategories: string[];
  winningSourceTypes: string[];
  rejectedSourceTypes: string[];
  responsePlanAction: ResponsePlanAction;
  repeatedQuestionDetected: boolean;
  validationResult: ResponseValidationResult["result"] | "ERROR";
  persistenceResult:
    | "CREATED"
    | "UPDATED"
    | "DUPLICATE"
    | "STALE_CONTEXT"
    | "STALE_EVENT"
    | "CONFLICT"
    | "DISABLED"
    | "ERROR";
  processingDurationMs: number;
  shadowErrorCode: string | null;
  providerCalled: boolean;
  toolCalls: 0;
  outboundSent: false;
  action?: RuntimeV2ActionManifest;
  actionState?: ActionStateManifest;
  handoff?: HandoffStateManifest;
  toolObservationMode: RuntimeV2ToolObservationMode;
  v1ToolExecutionObserved: boolean;
  toolObservationId: string | null;
  executionAttemptId: string | null;
  linkedActionId: string | null;
  actionCorrelationStatus: string | null;
  observedToolName: string | null;
  observedOperationName: string | null;
  observedActionType: string | null;
  observedActionCategory: string | null;
  observedEffectType: string | null;
  observedExecutionStatus: string | null;
  observedStartedAt: string | null;
  observedCompletedAt: string | null;
  observedDurationMs: number | null;
  observedTimeoutMs: number | null;
  observedArgumentsHash: string | null;
  observedIdempotencyKeyHash: string | null;
  observedResultHash: string | null;
  observedAuthorityCategories: string[];
  observedValidFrom: string | null;
  observedValidUntil: string | null;
  observedExternalReferenceHash: string | null;
  observedExternalEffectMayHaveOccurred: boolean;
  observedRetryCount: number;
  observedDuplicateSuppressed: boolean;
  observedReconciliationStatus: string | null;
  observedErrorCode: string | null;
  toolObservationPersisted: boolean;
  toolObservationRedactionApplied: boolean;
  toolObservations: ToolObservationManifest[];
  syntheticExecution: SyntheticExecutionManifest | null;
  candidateResponse: RuntimeV2CandidateResponse | null;
  responseComparison: RuntimeResponseComparison | null;
  evidence?: EvidenceManifestExtension;
  v1Comparison: {
    selectedFlowId: string | null;
    selectedIntent: string | null;
    triageMode: string | null;
    toolsExposed: string[];
    customerUnableToAnswer?: boolean;
    triageExitReason?: string | null;
    conversationalOutcome?: string | null;
    flowSelectionReason: string | null;
    flowCandidateCount: number;
    intentChangedFromPreviousTurn: boolean;
  };
};

export function buildRuntimeV2ShadowManifest(input: {
  scope: RuntimeV2Scope;
  mode: RuntimeV2Mode;
  correlationId: string;
  currentMessage: string;
  audioMessage?: boolean;
  transcriptionAvailable?: boolean;
  transcriptionPersisted?: boolean;
  lastRelevantQuestionUpdated?: boolean;
  lastRelevantQuestionUpdateReason?: string;
  lastRelevantQuestionCleared?: boolean;
  staleQuestionRemoved?: boolean;
  v2TriageSignalReceived?: boolean;
  beforeState: ConversationState;
  afterState: ConversationState;
  understanding: TurnUnderstanding;
  retrievalPlan: RetrievalPlan;
  authorityCategoriesRequested: string[];
  authorityCategoriesAvailable?: string[];
  authorityCategoriesMissing: string[];
  authorityConflictDetected?: boolean;
  authorityConflictCategories?: string[];
  winningSourceTypes?: string[];
  rejectedSourceTypes?: string[];
  responsePlanAction: ResponsePlanAction;
  repeatedQuestionDetected: boolean;
  validationResult: ResponseValidationResult["result"] | "ERROR";
  persistenceResult: RuntimeV2ShadowManifest["persistenceResult"];
  processingDurationMs: number;
  messageAlreadyProcessed: boolean;
  shadowErrorCode?: string | null;
  evidence?: EvidenceManifestExtension;
  action?: RuntimeV2ActionManifest;
  actionState?: ActionStateManifest;
  handoff?: HandoffStateManifest;
  toolObservationMode?: RuntimeV2ToolObservationMode;
  toolObservations?: ToolObservationManifest[];
  syntheticExecution?: SyntheticExecutionManifest | null;
  candidateResponse?: RuntimeV2CandidateResponse | null;
  responseComparison?: RuntimeResponseComparison | null;
  v1Comparison?: Partial<RuntimeV2ShadowManifest["v1Comparison"]>;
}): RuntimeV2ShadowManifest {
  const beforeFactKeys = Object.keys(input.beforeState.confirmedFacts);
  const afterFactKeys = Object.keys(input.afterState.confirmedFacts);
  const added = afterFactKeys.filter((key) => !beforeFactKeys.includes(key));
  const preserved = afterFactKeys.filter(
    (key) =>
      beforeFactKeys.includes(key) &&
      JSON.stringify(input.beforeState.confirmedFacts[key]) ===
        JSON.stringify(input.afterState.confirmedFacts[key]),
  );
  const updated = afterFactKeys.filter(
    (key) => beforeFactKeys.includes(key) && !preserved.includes(key),
  );
  const comparison = input.v1Comparison ?? {};
  const toolObservations = [...(input.toolObservations ?? [])].sort((left, right) =>
    left.observationId.localeCompare(right.observationId),
  );
  const firstToolObservation = toolObservations[0] ?? null;

  return {
    runtimeVersion: "V2",
    mode: input.mode,
    correlationId: input.correlationId,
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contextVersion: input.scope.contextVersion,
    schemaVersion: input.afterState.schemaVersion,
    revisionBefore: input.beforeState.revision,
    revisionAfter: input.afterState.revision,
    currentMessageHash: hashCanonicalInboundMessageContent(input.currentMessage),
    audioMessage: input.audioMessage ?? false,
    transcriptionAvailable: input.transcriptionAvailable ?? false,
    transcriptionPersisted: input.transcriptionPersisted ?? false,
    messageAlreadyProcessed: input.messageAlreadyProcessed,
    turnIntent: input.understanding.turnIntent,
    intentConfidence: input.understanding.confidence,
    explicitIntentDetected: Object.values(
      input.understanding.requestedCategoryDerivation ?? {},
    ).some((reason) => reason.startsWith("EXPLICIT_")),
    followUpDetected: input.understanding.followUpDetected ?? false,
    followUpResolutionStatus: input.understanding.followUpResolutionStatus ?? "NOT_APPLICABLE",
    inheritedTopic: input.understanding.inheritedTopic ?? null,
    historyMessagesConsidered: input.understanding.historyMessagesConsidered ?? 0,
    inheritedFromMessageFingerprint: input.understanding.inheritedFromMessageFingerprint ?? null,
    inheritedFromConversationId: input.understanding.inheritedFromConversationId ?? null,
    inheritedFromRecentContext: input.understanding.inheritedFromRecentContext ?? false,
    resolutionConfidence: input.understanding.resolutionConfidence ?? null,
    ambiguityDetected: input.understanding.ambiguityDetected ?? false,
    topicChanged: input.understanding.topicChanged ?? false,
    previousTopic: input.understanding.previousTopic ?? null,
    currentTopic: input.understanding.currentTopic ?? null,
    topicChangeReason: input.understanding.topicChangeReason ?? null,
    inheritedTopicSuppressed: input.understanding.inheritedTopicSuppressed ?? false,
    inheritanceEvaluated: input.understanding.inheritanceEvaluated ?? false,
    inheritanceAllowed: input.understanding.inheritanceAllowed ?? false,
    inheritanceBlockReason: input.understanding.inheritanceBlockReason ?? null,
    resolutionReasonCode: input.understanding.resolutionReasonCode ?? null,
    humanRequested: input.understanding.humanHandoffSignal.requested,
    humanRequestConfidence: input.understanding.humanHandoffSignal.confidence,
    handoffRequired: input.understanding.humanHandoffSignal.requested,
    handoffReason: input.understanding.humanHandoffSignal.reasonCode,
    handoffExecutionAllowed: false,
    handoffExecutionAttempted: false,
    handoffExecuted: false,
    handoffStatus: input.understanding.humanHandoffSignal.requested
      ? "REQUIRED_NOT_EXECUTED"
      : "NOT_REQUIRED",
    objectiveAction: input.understanding.objectiveAction,
    currentObjective: input.afterState.objective?.key ?? null,
    previousObjective: input.beforeState.objective?.key ?? null,
    confirmedFactKeysAdded: added,
    confirmedFactKeysUpdated: updated,
    confirmedFactKeysPreserved: preserved,
    pendingFieldKeys: input.afterState.pendingFields,
    lastRelevantQuestionKey: input.afterState.lastRelevantQuestion?.key ?? null,
    lastRelevantQuestionContextVersion:
      input.afterState.lastRelevantQuestion?.contextVersion ?? null,
    lastRelevantQuestionUpdated: input.lastRelevantQuestionUpdated ?? false,
    lastRelevantQuestionUpdateReason: input.lastRelevantQuestionUpdateReason ?? "UNCHANGED",
    lastRelevantQuestionCleared: input.lastRelevantQuestionCleared ?? false,
    staleQuestionRemoved: input.staleQuestionRemoved ?? false,
    v2TriageSignalReceived:
      input.v2TriageSignalReceived ??
      Boolean(
        input.v1Comparison?.customerUnableToAnswer ||
        input.v1Comparison?.triageExitReason ||
        input.v1Comparison?.conversationalOutcome,
      ),
    customerUnableToAnswer:
      input.understanding.reasonCodes.includes("CUSTOMER_UNABLE_TO_ANSWER") ||
      Boolean(input.v1Comparison?.customerUnableToAnswer),
    retrievalPlanCategories: [
      ...input.retrievalPlan.memoryTopics,
      ...input.retrievalPlan.officialFactCategories,
      ...input.retrievalPlan.knowledgeQueries,
    ],
    authorityCategoriesRequested: [...input.authorityCategoriesRequested],
    authorityCategoriesAvailable: [...(input.authorityCategoriesAvailable ?? [])],
    authorityCategoriesMissing: [...input.authorityCategoriesMissing],
    authorityConflictDetected: input.authorityConflictDetected ?? false,
    authorityConflictCategories: [...(input.authorityConflictCategories ?? [])],
    winningSourceTypes: [...(input.winningSourceTypes ?? [])],
    rejectedSourceTypes: [...(input.rejectedSourceTypes ?? [])],
    responsePlanAction: input.responsePlanAction,
    repeatedQuestionDetected: input.repeatedQuestionDetected,
    validationResult: input.validationResult,
    persistenceResult: input.persistenceResult,
    processingDurationMs: Math.max(0, Math.round(input.processingDurationMs)),
    shadowErrorCode: input.shadowErrorCode ?? null,
    providerCalled: Boolean(input.candidateResponse?.provider),
    toolCalls: 0,
    outboundSent: false,
    toolObservationMode: input.toolObservationMode ?? "OFF",
    v1ToolExecutionObserved: toolObservations.length > 0,
    toolObservationId: firstToolObservation?.observationId ?? null,
    executionAttemptId: firstToolObservation?.executionAttemptId ?? null,
    linkedActionId: firstToolObservation?.linkedActionId ?? null,
    actionCorrelationStatus: firstToolObservation?.actionCorrelationStatus ?? null,
    observedToolName: firstToolObservation?.observedToolName ?? null,
    observedOperationName: firstToolObservation?.observedOperationName ?? null,
    observedActionType: firstToolObservation?.observedActionType ?? null,
    observedActionCategory: firstToolObservation?.observedActionCategory ?? null,
    observedEffectType: firstToolObservation?.observedEffectType ?? null,
    observedExecutionStatus: firstToolObservation?.observedExecutionStatus ?? null,
    observedStartedAt: firstToolObservation?.observedStartedAt ?? null,
    observedCompletedAt: firstToolObservation?.observedCompletedAt ?? null,
    observedDurationMs: firstToolObservation?.observedDurationMs ?? null,
    observedTimeoutMs: firstToolObservation?.observedTimeoutMs ?? null,
    observedArgumentsHash: firstToolObservation?.observedArgumentsHash ?? null,
    observedIdempotencyKeyHash: firstToolObservation?.observedIdempotencyKeyHash ?? null,
    observedResultHash: firstToolObservation?.observedResultHash ?? null,
    observedAuthorityCategories: firstToolObservation?.observedAuthorityCategories ?? [],
    observedValidFrom: firstToolObservation?.observedValidFrom ?? null,
    observedValidUntil: firstToolObservation?.observedValidUntil ?? null,
    observedExternalReferenceHash: firstToolObservation?.observedExternalReferenceHash ?? null,
    observedExternalEffectMayHaveOccurred:
      firstToolObservation?.observedExternalEffectMayHaveOccurred ?? false,
    observedRetryCount: firstToolObservation?.observedRetryCount ?? 0,
    observedDuplicateSuppressed: firstToolObservation?.observedDuplicateSuppressed ?? false,
    observedReconciliationStatus: firstToolObservation?.observedReconciliationStatus ?? null,
    observedErrorCode: firstToolObservation?.observedErrorCode ?? null,
    toolObservationPersisted: toolObservations.length > 0,
    toolObservationRedactionApplied: true,
    toolObservations,
    syntheticExecution: input.syntheticExecution ?? null,
    candidateResponse: input.candidateResponse ?? null,
    responseComparison: input.responseComparison ?? null,
    ...(input.action ? { action: input.action } : {}),
    ...(input.actionState ? { actionState: input.actionState } : {}),
    ...(input.handoff ? { handoff: input.handoff } : {}),
    ...(input.evidence ? { evidence: input.evidence } : {}),
    v1Comparison: {
      selectedFlowId: comparison.selectedFlowId ?? null,
      selectedIntent: comparison.selectedIntent ?? null,
      triageMode: comparison.triageMode ?? null,
      toolsExposed: comparison.toolsExposed ?? [],
      customerUnableToAnswer: comparison.customerUnableToAnswer ?? false,
      triageExitReason: comparison.triageExitReason ?? null,
      conversationalOutcome: comparison.conversationalOutcome ?? null,
      flowSelectionReason: comparison.flowSelectionReason ?? null,
      flowCandidateCount: comparison.flowCandidateCount ?? 0,
      intentChangedFromPreviousTurn: comparison.intentChangedFromPreviousTurn ?? false,
    },
  };
}
