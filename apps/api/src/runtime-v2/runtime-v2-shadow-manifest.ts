import { createHash } from "node:crypto";
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
import { type RuntimeV2Mode } from "./runtime-v2-feature-flag";

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
  objectiveAction: ObjectiveAction;
  currentObjective: string | null;
  previousObjective: string | null;
  confirmedFactKeysAdded: string[];
  confirmedFactKeysUpdated: string[];
  confirmedFactKeysPreserved: string[];
  pendingFieldKeys: string[];
  lastRelevantQuestionKey: string | null;
  lastRelevantQuestionContextVersion: number | null;
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
  providerCalled: false;
  toolCalls: 0;
  outboundSent: false;
  v1Comparison: {
    selectedFlowId: string | null;
    selectedIntent: string | null;
    triageMode: string | null;
    toolsExposed: string[];
  };
};

function hashMessage(message: string): string | null {
  return message.trim() ? createHash("sha256").update(message).digest("hex") : null;
}

export function buildRuntimeV2ShadowManifest(input: {
  scope: RuntimeV2Scope;
  mode: RuntimeV2Mode;
  correlationId: string;
  currentMessage: string;
  audioMessage?: boolean;
  transcriptionAvailable?: boolean;
  transcriptionPersisted?: boolean;
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
    currentMessageHash: hashMessage(input.currentMessage),
    audioMessage: input.audioMessage ?? false,
    transcriptionAvailable: input.transcriptionAvailable ?? false,
    transcriptionPersisted: input.transcriptionPersisted ?? false,
    messageAlreadyProcessed: input.messageAlreadyProcessed,
    turnIntent: input.understanding.turnIntent,
    intentConfidence: input.understanding.confidence,
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
    providerCalled: false,
    toolCalls: 0,
    outboundSent: false,
    v1Comparison: {
      selectedFlowId: comparison.selectedFlowId ?? null,
      selectedIntent: comparison.selectedIntent ?? null,
      triageMode: comparison.triageMode ?? null,
      toolsExposed: comparison.toolsExposed ?? [],
    },
  };
}
