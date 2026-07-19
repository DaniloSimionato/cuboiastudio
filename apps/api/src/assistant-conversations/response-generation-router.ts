import {
  V1ResponseGenerationExecutor,
  type V1GeneratedResponse,
  type V1ResponseGenerationExecutorInput,
} from "./v1-response-generation-executor";
import {
  createV1FallbackResponseExecutionEnvelope,
  createV1NormalResponseExecutionEnvelope,
  createV2PrimaryResponseExecutionEnvelope,
  type ResponseExecutionEnvelope,
  type ResponseExecutionTurn,
} from "./response-execution-envelope";
import type { RuntimeV2ResponseExecutionApproval } from "../runtime-v2/response-execution-approval";
import {
  RuntimeV2ResponseExecutionCoordinator,
  type ResponseExecutionClaimResult,
} from "../runtime-v2/response-execution-coordinator";
import type {
  V2PrimaryResponseExecutionContext,
  V2PrimaryResponseExecutor,
} from "./v2-primary-response-executor";
import type { FlowApplicabilityEvaluation } from "./flow-applicability-evaluator";
import type { ResponseExecutionSemanticDecision } from "../runtime-v2/response-execution-intent";

export type ResponseGenerationRoute = ResponseExecutionEnvelope["route"];
export type ResponseGenerationRouterTurn = ResponseExecutionTurn;

export type ResponseGenerationRouterInput = {
  turn: ResponseGenerationRouterTurn;
  v1Input: V1ResponseGenerationExecutorInput;
  executionMode?: unknown;
  executionAssistantIds?: readonly string[] | null;
  executionConversationIds?: readonly string[] | null;
  v2Eligibility?: {
    standardEligible: boolean;
    category: "businessHours" | null;
    authority: "OFFICIAL_CONTEXT" | null;
    semanticDecision?: ResponseExecutionSemanticDecision;
    flowEvaluation?: FlowApplicabilityEvaluation;
  };
  /** Re-checks current flow configuration at the only point V2 could claim a turn. */
  revalidateV2Flow?: () => Promise<FlowApplicabilityEvaluation | null>;
  /** Runtime-primary context is constructed only after V1's basic gates. */
  v2PrimaryContext?: V2PrimaryResponseExecutionContext;
};

export type ResponseGenerationDeferredResult = {
  state: "PENDING_OR_TERMINAL";
  sanitizedTelemetry: {
    decision: "SINGLE_USE_PENDING";
    reason: "CLAIM_LOST_OR_TERMINAL";
  };
};

export type ResponseGenerationRouterResult =
  ResponseExecutionEnvelope | ResponseGenerationDeferredResult;

export type ResponseGenerationRouterDependencies = {
  executeV1(input: V1ResponseGenerationExecutorInput): Promise<V1GeneratedResponse>;
  coordinator?: RuntimeV2ResponseExecutionCoordinator;
  v2Executor?: V2PrimaryResponseExecutor;
};

const defaultDependencies: ResponseGenerationRouterDependencies = {
  executeV1: (input) => new V1ResponseGenerationExecutor().execute(input),
};

function resolveDefaultDenyReason(
  input: ResponseGenerationRouterInput,
):
  | "EXECUTION_MODE_OFF"
  | "EXECUTION_SCOPE_EMPTY"
  | "V2_EXECUTION_NOT_CONNECTED"
  | "RESPONSE_EXECUTION_SEMANTIC_MISMATCH" {
  if (input.executionMode !== "CONTROLLED") return "EXECUTION_MODE_OFF";
  if (!input.executionAssistantIds?.length || !input.executionConversationIds?.length) {
    return "EXECUTION_SCOPE_EMPTY";
  }
  if (input.v2Eligibility?.semanticDecision && !input.v2Eligibility.semanticDecision.applicable) {
    return "RESPONSE_EXECUTION_SEMANTIC_MISMATCH";
  }
  return "V2_EXECUTION_NOT_CONNECTED";
}

function isExecutionScopeEnabled(input: ResponseGenerationRouterInput): boolean {
  return (
    input.executionMode === "CONTROLLED" &&
    Boolean(input.executionAssistantIds?.includes(input.turn.assistantId)) &&
    Boolean(input.executionConversationIds?.includes(input.turn.conversationId))
  );
}

function isEligibleForV2(input: ResponseGenerationRouterInput): boolean {
  return (
    input.v2Eligibility?.standardEligible === true &&
    input.v2Eligibility.category === "businessHours" &&
    input.v2Eligibility.authority === "OFFICIAL_CONTEXT" &&
    input.v2Eligibility.semanticDecision?.applicable === true &&
    (input.v2Eligibility.flowEvaluation?.v2Compatibility === "ALLOWED" ||
      input.v2Eligibility.flowEvaluation?.v2Compatibility === "ALLOWED_WITH_FLOW_CONTEXT")
  );
}

/**
 * Default-deny generation seam. The V2 path exists only when an explicitly injected
 * single-use coordinator, fake V2 executor, exact scope and eligible turn are all present.
 * Production registers no V2 executor in this phase.
 */
export class ResponseGenerationRouter {
  constructor(
    private readonly dependencies: ResponseGenerationRouterDependencies = defaultDependencies,
  ) {}

  async route(input: ResponseGenerationRouterInput): Promise<ResponseGenerationRouterResult> {
    if (
      !isExecutionScopeEnabled(input) ||
      !isEligibleForV2(input) ||
      !this.dependencies.coordinator ||
      !this.dependencies.v2Executor
    ) {
      return this.executeV1Normal(input);
    }

    const currentFlow = await this.currentFlowEvaluation(input);
    if (!this.isCurrentFlowEligible(input, currentFlow)) return this.executeV1Normal(input);

    const approval = await this.dependencies.coordinator.loadApproval(input.turn);
    if (!approval) return this.executeV1Normal(input);
    const semanticDecision = input.v2Eligibility?.semanticDecision;
    if (
      approval.semanticDecisionVersion !== semanticDecision?.version ||
      approval.expectedSemanticDecisionFingerprint !== semanticDecision?.fingerprint ||
      approval.expectedIntent !== semanticDecision?.intent
    ) {
      return this.executeV1Normal(input, "RESPONSE_EXECUTION_SEMANTIC_MISMATCH");
    }
    if (
      approval.status !== "ARMED" ||
      approval.companyId !== input.turn.companyId ||
      approval.assistantId !== input.turn.assistantId ||
      approval.conversationId !== input.turn.conversationId ||
      approval.canonicalVersion !== input.turn.canonicalVersion ||
      approval.expectedCanonicalComparisonHash !== input.turn.canonicalComparisonHash ||
      approval.allowedCategory !== "businessHours" ||
      approval.allowedAuthority !== "OFFICIAL_CONTEXT" ||
      approval.flowConfigurationFingerprint !== currentFlow.flowConfigurationFingerprint ||
      approval.expectedFlowFingerprint !== currentFlow.selectedFlowFingerprint ||
      approval.expectedFlowVersionFingerprint !== currentFlow.selectedFlowVersionFingerprint ||
      approval.expectedFlowMatchType !== currentFlow.flowMatchType ||
      approval.declarativeContextFingerprint !== currentFlow.declarativeContextFingerprint ||
      (approval.flowCompatibility === "STANDARD_COMPATIBLE") !==
        (currentFlow.v2Compatibility === "ALLOWED_WITH_FLOW_CONTEXT") ||
      Date.parse(approval.expiresAt) <= Date.now()
    ) {
      return this.executeV1Normal(input);
    }

    const claimed = await this.dependencies.coordinator.claim({
      ...input.turn,
      approval,
    });
    if (claimed.status !== "CLAIMED") return this.deferred(claimed);
    const flowAfterClaim = await this.currentFlowEvaluation(input);
    if (!this.isCurrentFlowEligible(input, flowAfterClaim)) {
      return this.executeV1Fallback(
        input,
        claimed.generationId,
        "FLOW_CONFIGURATION_CHANGED_AFTER_CLAIM",
      );
    }
    if (
      !(await this.dependencies.coordinator.beginV2Generation({
        ...input.turn,
        generationId: claimed.generationId,
      }))
    ) {
      return this.deferred({ status: "PENDING_OR_TERMINAL" });
    }
    try {
      const generated = await this.dependencies.v2Executor.execute({
        turn: input.turn,
        generationId: claimed.generationId,
        approval: claimed.approval,
        context: input.v2PrimaryContext,
        ownership: "V2_GENERATION_PENDING",
      });
      if (
        generated.category !== "businessHours" ||
        generated.authority !== "OFFICIAL_CONTEXT" ||
        generated.candidateStatus !== "CANDIDATE_APPROVED" ||
        generated.qualityGateResult !== "APPROVED" ||
        !generated.outboundAllowed
      ) {
        throw new Error("V2_CANDIDATE_BLOCKED");
      }
      const flowBeforeTail = await this.currentFlowEvaluation(input);
      if (!this.isCurrentFlowEligible(input, flowBeforeTail)) {
        return this.executeV1Fallback(
          input,
          claimed.generationId,
          "FLOW_CONFIGURATION_CHANGED_BEFORE_TAIL",
        );
      }
      if (
        !(await this.dependencies.coordinator.approveV2Candidate({
          ...input.turn,
          generationId: claimed.generationId,
        }))
      ) {
        return this.deferred({ status: "PENDING_OR_TERMINAL" });
      }
      return createV2PrimaryResponseExecutionEnvelope({
        turn: input.turn,
        responseText: generated.responseText,
        generationId: claimed.generationId,
        approvalFingerprint: claimed.approval.creationFingerprint.slice(0, 12),
        providerMetadata: generated.providerMetadata,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 80) : "V2_GENERATION_FAILED";
      return this.executeV1Fallback(input, claimed.generationId, reason);
    }
  }

  private async executeV1Normal(
    input: ResponseGenerationRouterInput,
    reason = resolveDefaultDenyReason(input),
  ): Promise<ResponseGenerationRouterResult> {
    const response = await this.dependencies.executeV1(input.v1Input);
    return createV1NormalResponseExecutionEnvelope({
      turn: input.turn,
      response,
      reason,
    });
  }

  getCoordinator(): RuntimeV2ResponseExecutionCoordinator | null {
    return this.dependencies.coordinator ?? null;
  }

  private async currentFlowEvaluation(
    input: ResponseGenerationRouterInput,
  ): Promise<FlowApplicabilityEvaluation | null> {
    try {
      return (await input.revalidateV2Flow?.()) ?? input.v2Eligibility?.flowEvaluation ?? null;
    } catch {
      return null;
    }
  }

  private isCurrentFlowEligible(
    input: ResponseGenerationRouterInput,
    evaluation: FlowApplicabilityEvaluation | null,
  ): evaluation is FlowApplicabilityEvaluation {
    return (
      (evaluation?.v2Compatibility === "ALLOWED" ||
        evaluation?.v2Compatibility === "ALLOWED_WITH_FLOW_CONTEXT") &&
      evaluation.flowConfigurationFingerprint ===
        input.v2Eligibility?.flowEvaluation?.flowConfigurationFingerprint &&
      evaluation.selectedFlowFingerprint ===
        input.v2Eligibility?.flowEvaluation?.selectedFlowFingerprint &&
      evaluation.selectedFlowVersionFingerprint ===
        input.v2Eligibility?.flowEvaluation?.selectedFlowVersionFingerprint &&
      evaluation.declarativeContextFingerprint ===
        input.v2Eligibility?.flowEvaluation?.declarativeContextFingerprint
    );
  }

  private async executeV1Fallback(
    input: ResponseGenerationRouterInput,
    generationId: string,
    reason: string,
  ): Promise<ResponseGenerationRouterResult> {
    const fallbackClaimed = await this.dependencies.coordinator!.beginV1Fallback({
      ...input.turn,
      generationId,
      reason,
    });
    if (!fallbackClaimed) return this.deferred({ status: "PENDING_OR_TERMINAL" });
    const response = await this.dependencies.executeV1(input.v1Input);
    return createV1FallbackResponseExecutionEnvelope({
      turn: input.turn,
      response,
      reason,
    });
  }

  private deferred(
    _claim: Exclude<ResponseExecutionClaimResult, { status: "CLAIMED" }>,
  ): ResponseGenerationDeferredResult {
    return {
      state: "PENDING_OR_TERMINAL",
      sanitizedTelemetry: {
        decision: "SINGLE_USE_PENDING",
        reason: "CLAIM_LOST_OR_TERMINAL",
      },
    };
  }
}
