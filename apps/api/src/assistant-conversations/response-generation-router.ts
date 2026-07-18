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
import type { V2PrimaryResponseExecutor } from "./v2-primary-response-executor";

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
  };
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
): "EXECUTION_MODE_OFF" | "EXECUTION_SCOPE_EMPTY" | "V2_EXECUTION_NOT_CONNECTED" {
  if (input.executionMode !== "CONTROLLED") return "EXECUTION_MODE_OFF";
  if (!input.executionAssistantIds?.length || !input.executionConversationIds?.length) {
    return "EXECUTION_SCOPE_EMPTY";
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
    input.v2Eligibility.authority === "OFFICIAL_CONTEXT"
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

    const approval = await this.dependencies.coordinator.loadApproval(input.turn);
    if (!approval) return this.executeV1Normal(input);
    if (
      approval.status !== "ARMED" ||
      approval.companyId !== input.turn.companyId ||
      approval.assistantId !== input.turn.assistantId ||
      approval.conversationId !== input.turn.conversationId ||
      approval.canonicalVersion !== input.turn.canonicalVersion ||
      approval.expectedCanonicalComparisonHash !== input.turn.canonicalComparisonHash ||
      approval.allowedCategory !== "businessHours" ||
      approval.allowedAuthority !== "OFFICIAL_CONTEXT" ||
      Date.parse(approval.expiresAt) <= Date.now()
    ) {
      return this.executeV1Normal(input);
    }

    const claimed = await this.dependencies.coordinator.claim({
      ...input.turn,
      approval,
    });
    if (claimed.status !== "CLAIMED") return this.deferred(claimed);
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
      const fallbackClaimed = await this.dependencies.coordinator.beginV1Fallback({
        ...input.turn,
        generationId: claimed.generationId,
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
  }

  private async executeV1Normal(
    input: ResponseGenerationRouterInput,
  ): Promise<ResponseGenerationRouterResult> {
    const response = await this.dependencies.executeV1(input.v1Input);
    return createV1NormalResponseExecutionEnvelope({
      turn: input.turn,
      response,
      reason: resolveDefaultDenyReason(input),
    });
  }

  getCoordinator(): RuntimeV2ResponseExecutionCoordinator | null {
    return this.dependencies.coordinator ?? null;
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
