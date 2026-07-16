import { createHash } from "node:crypto";
import type { AiChatCompletionMessage, AiChatCompletionResult } from "../ai/ai.types";
import {
  PROMPT_COMPILER_VERSION,
  type PromptCompilerInput,
  PromptCompilerService,
} from "../prompt-compiler/prompt-compiler.service";
import { validateResponse } from "./response-validator-v2";
import type {
  ConversationState,
  ResponsePlan,
  RuntimeResponseComparison,
  RuntimeV2CandidateResponse,
} from "./runtime-v2.types";

export const CANDIDATE_RESPONSE_SCHEMA_VERSION = "runtime-v2-candidate-response-v1" as const;
export const RESPONSE_COMPARISON_SCHEMA_VERSION = "runtime-v2-response-comparison-v1" as const;
export const MAX_RECENT_CANDIDATE_RESPONSES = 8;
export const MAX_CANDIDATE_RESPONSE_TEXT_LENGTH = 1200;

export type RuntimeV2CandidateContext = {
  promptInput: PromptCompilerInput;
  model: string | null;
  temperature: number | undefined;
  v1ResponseAvailable: boolean;
  selectedFlowId: string | null;
  candidateFlowIds: string[];
  flowSelectionReason: string | null;
  flowSelectionConfidence: number | null;
  evidenceIds: string[];
  memoryIds: string[];
  officialDataKeys: string[];
};

export type CandidateResponseProvider = {
  generate(input: {
    companyId: string;
    messages: AiChatCompletionMessage[];
    model: string | null;
    temperature: number | undefined;
    idempotencyKey: string;
  }): Promise<AiChatCompletionResult>;
};

export type CandidateResponseGenerationResult = {
  candidate: RuntimeV2CandidateResponse;
  comparison: RuntimeResponseComparison;
  messages: AiChatCompletionMessage[];
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export function createResponsePlanId(input: {
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  internalMessageId: string;
  responsePlan: ResponsePlan;
}): string {
  return sha256(JSON.stringify(input));
}

export function createCandidateGenerationId(input: {
  responsePlanId: string;
  internalMessageId: string;
}): string {
  return sha256(`${input.responsePlanId}:${input.internalMessageId}:candidate-v1`);
}

function redactCandidateText(value: string): string {
  return value
    .trim()
    .slice(0, MAX_CANDIDATE_RESPONSE_TEXT_LENGTH)
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED]")
    .replace(/(?<!\d)\+?\d[\d\s().-]{7,}\d(?![\d-])/g, "[REDACTED]");
}

function preconditionReasons(input: {
  plan: ResponsePlan;
  state: ConversationState;
  context: RuntimeV2CandidateContext;
}): { status: RuntimeV2CandidateResponse["status"]; reasons: string[] } | null {
  if (input.plan.shouldHandoff || input.state.handoffState?.activeHandoff) {
    return { status: "CANDIDATE_REQUIRES_HANDOFF", reasons: ["HANDOFF_REQUIRED"] };
  }
  if (input.plan.action === "USE_TOOL" || input.plan.toolsAllowed.length > 0) {
    return { status: "CANDIDATE_BLOCKED", reasons: ["TOOL_EXECUTION_NOT_AVAILABLE"] };
  }
  if (
    input.plan.claimsForbidden.length > 0 ||
    input.plan.evidenceMetadata?.conflictCategories.length
  ) {
    return { status: "CANDIDATE_BLOCKED", reasons: ["FACTUAL_AUTHORITY_UNAVAILABLE"] };
  }
  if (input.plan.action === "SAFE_UNAVAILABLE") {
    return { status: "CANDIDATE_BLOCKED", reasons: ["UNANSWERABLE_WITH_AUTHORIZED_EVIDENCE"] };
  }
  if (!input.context.promptInput.currentMessage.trim()) {
    return { status: "CANDIDATE_BLOCKED", reasons: ["EMPTY_CURRENT_MESSAGE"] };
  }
  return null;
}

function validateCandidateAnswer(input: {
  answer: string;
  responsePlan: ResponsePlan;
  state: ConversationState;
}): string[] {
  const reasons: string[] = [];
  const answer = input.answer.trim();
  if (!answer) reasons.push("EMPTY_RESPONSE");
  if (/^\s*(?:\{|\[|```(?:json)?)/i.test(answer)) reasons.push("INTERNAL_STRUCTURE_EXPOSED");
  if (/\b(?:reservei|agendei|consultei|alterei|cancelei)\b/i.test(answer)) {
    reasons.push("UNSUPPORTED_TOOL_EXECUTION_CLAIM");
  }
  const validation = validateResponse({
    answer,
    responsePlan: input.responsePlan,
    conversationState: input.state,
  });
  if (validation.unsupportedClaimDetected) reasons.push("UNSUPPORTED_CLAIM");
  if (validation.repeatedQuestionDetected) reasons.push("REPEATED_QUESTION");
  if (validation.result === "BLOCK") reasons.push(...validation.reasonCodes);
  if (answer.length > MAX_CANDIDATE_RESPONSE_TEXT_LENGTH) reasons.push("EXCESSIVE_LENGTH");
  return unique(reasons);
}

function buildComparison(input: {
  candidate: RuntimeV2CandidateResponse;
  context: RuntimeV2CandidateContext;
  responsePlan: ResponsePlan;
  reasons: string[];
}): RuntimeResponseComparison {
  const blocked = input.candidate.status !== "CANDIDATE_APPROVED";
  return {
    schemaVersion: RESPONSE_COMPARISON_SCHEMA_VERSION,
    generationId: input.candidate.generationId,
    originatingInternalMessageId: input.candidate.originatingInternalMessageId,
    v1ResponseAvailable: input.context.v1ResponseAvailable,
    v2CandidateAvailable: input.candidate.responseTextRedacted !== null,
    intentAgreement: null,
    flowAgreement:
      input.context.selectedFlowId === null
        ? null
        : input.candidate.flowIdsUsed.includes(input.context.selectedFlowId),
    handoffAgreement:
      input.responsePlan.shouldHandoff || input.candidate.status === "CANDIDATE_REQUIRES_HANDOFF"
        ? true
        : null,
    factualAuthorityAgreement: !input.reasons.includes("FACTUAL_AUTHORITY_UNAVAILABLE"),
    answerabilityAgreement: !input.reasons.includes("UNANSWERABLE_WITH_AUTHORIZED_EVIDENCE"),
    languageAgreement: null,
    toneAgreement: null,
    repetitionRisk: input.reasons.some((reason) => reason.includes("REPEATED")),
    contradictionRisk: input.reasons.some((reason) => reason.includes("AUTHORITY")),
    unsupportedClaimRisk: input.reasons.some((reason) => reason.includes("UNSUPPORTED")),
    missingRequiredQuestionRisk: false,
    excessiveLengthRisk: input.reasons.includes("EXCESSIVE_LENGTH"),
    qualityGateResult: input.candidate.status,
    qualityGateReasons: unique(input.reasons),
    generatedAt: input.candidate.generatedAt,
    redactionApplied: true,
  };
}

export class RuntimeV2CandidateResponseGenerator {
  constructor(
    private readonly provider: CandidateResponseProvider,
    private readonly promptCompiler: PromptCompilerService = new PromptCompilerService(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async generate(input: {
    state: ConversationState;
    responsePlan: ResponsePlan;
    context: RuntimeV2CandidateContext;
  }): Promise<CandidateResponseGenerationResult> {
    const { state, responsePlan, context } = input;
    const responsePlanId = createResponsePlanId({
      companyId: state.companyId,
      assistantId: state.assistantId,
      conversationId: state.conversationId,
      contextVersion: state.contextVersion,
      internalMessageId: state.lastProcessedMessageId ?? "",
      responsePlan,
    });
    const generationId = createCandidateGenerationId({
      responsePlanId,
      internalMessageId: state.lastProcessedMessageId ?? "",
    });
    const base = {
      schemaVersion: CANDIDATE_RESPONSE_SCHEMA_VERSION,
      companyId: state.companyId,
      assistantId: state.assistantId,
      conversationId: state.conversationId,
      contextVersion: state.contextVersion,
      originatingInternalMessageId: state.lastProcessedMessageId ?? "",
      responsePlanId,
      generationId,
      promptCompilerVersion: PROMPT_COMPILER_VERSION,
      flowIdsUsed: unique(context.selectedFlowId ? [context.selectedFlowId] : []),
      candidateFlowIds: unique(context.candidateFlowIds),
      flowSelectionReason: context.flowSelectionReason,
      flowSelectionConfidence: context.flowSelectionConfidence,
      evidenceIdsUsed: unique(context.evidenceIds),
      memoryIdsUsed: unique(context.memoryIds),
      officialDataKeysUsed: unique(context.officialDataKeys),
      toolPlan: [],
      handoffDecision: responsePlan.shouldHandoff
        ? ("REQUIRES_HANDOFF" as const)
        : ("NONE" as const),
      generatedAt: this.now().toISOString(),
      idempotencyKey: sha256(`${generationId}:provider-call`),
      redactionApplied: true as const,
      outboundAttempted: false as const,
      outboundPerformed: false as const,
    };
    const precondition = preconditionReasons({ plan: responsePlan, state, context });
    if (precondition) {
      const candidate: RuntimeV2CandidateResponse = {
        ...base,
        status: precondition.status,
        responseTextRedacted: null,
        provider: null,
        model: context.model,
        finishReason: "BLOCKED",
        latencyMs: 0,
        safetyDecision: "BLOCK",
        qualitySignals: precondition.reasons,
      };
      return {
        candidate,
        comparison: buildComparison({
          candidate,
          context,
          responsePlan,
          reasons: precondition.reasons,
        }),
        messages: [],
      };
    }

    const messages = this.promptCompiler.compile({
      ...context.promptInput,
      calendarContext: null,
    });
    try {
      const completion = await this.provider.generate({
        companyId: state.companyId,
        messages,
        model: context.model,
        temperature: context.temperature,
        idempotencyKey: base.idempotencyKey,
      });
      const reasons = validateCandidateAnswer({ answer: completion.answer, responsePlan, state });
      const candidate: RuntimeV2CandidateResponse = {
        ...base,
        status: reasons.length ? "CANDIDATE_BLOCKED" : "CANDIDATE_APPROVED",
        responseTextRedacted: redactCandidateText(completion.answer),
        provider: completion.provider,
        model: completion.model,
        finishReason: reasons.length ? "BLOCKED" : "STOP",
        latencyMs: Math.max(0, Math.round(completion.durationMs)),
        safetyDecision: reasons.length ? "BLOCK" : "PASS",
        qualitySignals: reasons,
      };
      return {
        candidate,
        comparison: buildComparison({ candidate, context, responsePlan, reasons }),
        messages,
      };
    } catch {
      const reasons = ["PROVIDER_GENERATION_FAILED"];
      const candidate: RuntimeV2CandidateResponse = {
        ...base,
        status: "CANDIDATE_GENERATION_FAILED",
        responseTextRedacted: null,
        provider: null,
        model: context.model,
        finishReason: "FAILED",
        latencyMs: 0,
        safetyDecision: "BLOCK",
        qualitySignals: reasons,
      };
      return {
        candidate,
        comparison: buildComparison({ candidate, context, responsePlan, reasons }),
        messages,
      };
    }
  }
}

export function appendCandidateTelemetry(input: {
  state: ConversationState;
  candidate: RuntimeV2CandidateResponse;
  comparison: RuntimeResponseComparison | null;
}): ConversationState {
  const candidates = (input.state.candidateResponses ?? []).filter(
    (item) => item.generationId !== input.candidate.generationId,
  );
  const comparisons = input.comparison
    ? (input.state.responseComparisons ?? []).filter(
        (item) => item.generationId !== input.comparison!.generationId,
      )
    : (input.state.responseComparisons ?? []);
  return {
    ...input.state,
    candidateResponses: [...candidates, input.candidate].slice(-MAX_RECENT_CANDIDATE_RESPONSES),
    responseComparisons: input.comparison
      ? [...comparisons, input.comparison].slice(-MAX_RECENT_CANDIDATE_RESPONSES)
      : comparisons,
  };
}
