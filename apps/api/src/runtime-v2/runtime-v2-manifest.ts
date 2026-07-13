import { createHash } from "node:crypto";
import { CONVERSATION_STATE_VERSION } from "./conversation-state";
import {
  type CompiledPrompt,
  type ConversationState,
  type ResponsePlan,
  type ResponseValidationResult,
  type RetrievalPlan,
  type RuntimeV2Manifest,
  type RuntimeV2Scope,
  type TurnUnderstanding,
  type RetrievedContext,
} from "./runtime-v2.types";

function hashMessage(message: string): string | null {
  return message.trim() ? createHash("sha256").update(message).digest("hex") : null;
}

export function buildRuntimeV2Manifest(input: {
  scope: RuntimeV2Scope;
  currentMessage: string;
  state: ConversationState;
  understanding: TurnUnderstanding;
  retrievalPlan: RetrievalPlan;
  retrievedContext: RetrievedContext;
  responsePlan: ResponsePlan;
  prompt: CompiledPrompt;
  validation: ResponseValidationResult;
  memoryRejectedReasons?: string[];
}): RuntimeV2Manifest {
  return {
    runtimeVersion: "V2",
    conversationStateVersion: CONVERSATION_STATE_VERSION,
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contextVersion: input.scope.contextVersion,
    currentMessageHash: hashMessage(input.currentMessage),
    currentObjective: input.state.objective?.key ?? null,
    objectiveAction: input.understanding.objectiveAction,
    turnIntent: input.understanding.turnIntent,
    intentConfidence: input.understanding.confidence,
    selectedFlowId: input.state.selectedFlowId,
    flowStage: input.state.flowStage,
    confirmedFactKeys: Object.keys(input.state.confirmedFacts),
    pendingFieldKeys: input.state.pendingFields,
    answeredQuestionKeys: input.state.answeredQuestions,
    identityMemoryCount: input.retrievedContext.identityMemories.length,
    thematicMemoryCount: input.retrievedContext.thematicMemories.length,
    memoryRejectedReasons: input.memoryRejectedReasons ?? [],
    knowledgeChunkIds: input.retrievedContext.knowledgeChunks.map((item) => item.id),
    authorityCategoriesAvailable: input.responsePlan.claimsAllowed.map((claim) => claim.category),
    authorityCategoriesMissing: input.responsePlan.factsMissing,
    toolsExposed: input.responsePlan.toolsAllowed,
    responsePlanAction: input.responsePlan.action,
    unsupportedClaimDetected: input.validation.unsupportedClaimDetected,
    unsupportedClaimCategories: input.validation.unsupportedClaimCategories,
    repeatedQuestionDetected: input.validation.repeatedQuestionDetected,
    responseValidationResult: input.validation.result,
    promptSections: input.prompt.sections.map((section) => ({
      name: section.name,
      role: section.role,
      charCount: section.content.length,
    })),
    promptCharCount: input.prompt.charCount,
    tokenEstimate: input.prompt.tokenEstimate,
    persistenceStatus: "not_persisted",
    outboundStatus: "not_sent",
  };
}
