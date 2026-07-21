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
import type { RuntimeV2ResponseExecutionAdministrationService } from "../runtime-v2/response-execution-administration";

export type ResponseGenerationRoute = ResponseExecutionEnvelope["route"];
export type ResponseGenerationRouterTurn = ResponseExecutionTurn;

export type ResponseGenerationRouterInput = {
  turn: ResponseGenerationRouterTurn;
  v1Input: V1ResponseGenerationExecutorInput;
  executionMode?: unknown;
  executionAssistantIds?: readonly string[] | null;
  executionConversationIds?: readonly string[] | null;
  executionConversationScope?: unknown;
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
  messageText?: string;
  approvalMode?: unknown;
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
  administration?: RuntimeV2ResponseExecutionAdministrationService;
};

const defaultDependencies: ResponseGenerationRouterDependencies = {
  executeV1: (input) => new V1ResponseGenerationExecutor().execute(input),
};

function contextApprovalState(
  approval: RuntimeV2ResponseExecutionApproval,
): "LEGACY" | "VERSIONED" | "INVALID" {
  const allFieldsAreNullish =
    approval.contextResolutionVersion == null &&
    approval.expectedContextFingerprint == null &&
    approval.expectedAntecedentFingerprint == null &&
    approval.expectedAntecedentCategory == null &&
    approval.expectedAntecedentIntent == null &&
    approval.contextualResolution == null;
  if (allFieldsAreNullish) return "LEGACY";
  if (
    approval.contextResolutionVersion != null &&
    approval.expectedContextFingerprint != null &&
    approval.expectedAntecedentFingerprint !== undefined &&
    approval.expectedAntecedentCategory !== undefined &&
    approval.expectedAntecedentIntent !== undefined &&
    typeof approval.contextualResolution === "boolean"
  ) {
    return "VERSIONED";
  }
  return "INVALID";
}

function resolveDefaultDenyReason(
  input: ResponseGenerationRouterInput,
):
  | "EXECUTION_MODE_OFF"
  | "EXECUTION_SCOPE_EMPTY"
  | "V2_EXECUTION_NOT_CONNECTED"
  | "RESPONSE_EXECUTION_SEMANTIC_MISMATCH" {
  if (input.executionMode !== "CONTROLLED") return "EXECUTION_MODE_OFF";
  const scope = input.executionConversationScope ?? "EXPLICIT_CONVERSATIONS";
  if (scope === "ASSISTANT_WIDE") {
    if (
      !input.executionAssistantIds?.length ||
      (input.executionConversationIds && input.executionConversationIds.length > 0)
    ) {
      return "EXECUTION_SCOPE_EMPTY";
    }
  } else {
    if (!input.executionAssistantIds?.length || !input.executionConversationIds?.length) {
      return "EXECUTION_SCOPE_EMPTY";
    }
  }
  if (input.v2Eligibility?.semanticDecision && !input.v2Eligibility.semanticDecision.applicable) {
    return "RESPONSE_EXECUTION_SEMANTIC_MISMATCH";
  }
  return "V2_EXECUTION_NOT_CONNECTED";
}

function isExecutionScopeEnabled(input: ResponseGenerationRouterInput): boolean {
  if (input.executionMode !== "CONTROLLED") return false;
  if (!input.executionAssistantIds?.includes(input.turn.assistantId)) return false;

  const scope = input.executionConversationScope ?? "EXPLICIT_CONVERSATIONS";
  if (scope === "ASSISTANT_WIDE") {
    if (!input.executionAssistantIds || input.executionAssistantIds.length === 0) return false;
    if (input.executionConversationIds && input.executionConversationIds.length > 0) return false;
    return true;
  }
  if (scope === "EXPLICIT_CONVERSATIONS") {
    return Boolean(input.executionConversationIds?.includes(input.turn.conversationId));
  }
  return false;
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

    let currentFlow = await this.currentFlowEvaluation(input);
    const approvalMode =
      input.approvalMode === "AUTO_SINGLE_USE"
        ? "AUTO_SINGLE_USE"
        : input.approvalMode === "MANUAL" || input.approvalMode == null
          ? "MANUAL"
          : "INVALID";
    if (!this.isCurrentFlowEligible(input, currentFlow)) return this.executeV1Normal(input);

    if (approvalMode === "INVALID") {
      return this.executeV1Normal(input, "AUTO_APPROVAL_MODE_INVALID");
    }

    let approval = await this.dependencies.coordinator.loadApproval(input.turn);
    if (
      approval &&
      approvalMode === "AUTO_SINGLE_USE" &&
      approval.status !== "ARMED" &&
      approval.status !== "CLAIMED"
    ) {
      // A terminal approval from an earlier turn must not prevent the new inbound
      // from reaching the canonical preflight/arm path. A terminal AUTO approval
      // bound to this same inbound is a replay and must remain terminal.
      if (
        approval.approvalSource === "AUTO_SINGLE_USE" &&
        approval.internalMessageId === input.turn.internalMessageId
      ) {
        return this.deferred({ status: "PENDING_OR_TERMINAL" });
      }
      approval = null;
    }

    if (!approval && approvalMode === "AUTO_SINGLE_USE") {
      // Validar restrições estritas do primeiro escopo suportado
      const flowEval = input.v2Eligibility?.flowEvaluation;
      if (
        !flowEval ||
        flowEval.flowRuntimeScope !== "V2_CONTROLLED" ||
        flowEval.explicitRuntimeCategory !== "businessHours" ||
        flowEval.explicitRuntimeIntent !== "ask_business_hours" ||
        flowEval.explicitRuntimeAuthority !== "OFFICIAL_CONTEXT" ||
        flowEval.runtimeDirectOnly !== true ||
        flowEval.flowScopeCompatibility !== "EXPLICIT_V2_MATCH" ||
        input.v2Eligibility?.semanticDecision?.contextualResolution !== false ||
        flowEval.requiresHuman ||
        flowEval.toolRequired ||
        flowEval.handoffRequired ||
        flowEval.fixedMessageApplicable ||
        flowEval.autoRespond === false
      ) {
        return this.executeV1Normal(input, "AUTO_APPROVAL_FLOW_INELIGIBLE");
      }

      if (!input.turn.canonicalComparisonHash || !input.turn.internalMessageId) {
        return this.executeV1Normal(input, "AUTO_APPROVAL_IDENTITY_UNAVAILABLE");
      }

      if (!this.dependencies.administration) {
        return this.executeV1Normal(input, "AUTO_APPROVAL_PREFLIGHT_BLOCKED");
      }

      // Reutilizar validações puras de preflight
      const preflight = await this.dependencies.administration.preflight({
        companyId: input.turn.companyId,
        assistantId: input.turn.assistantId,
        conversationId: input.turn.conversationId,
        message: input.messageText ?? "",
        canonicalVersion: input.turn.canonicalVersion,
        allowedCategory: "businessHours",
        allowedAuthority: "OFFICIAL_CONTEXT",
        currentInboundMessageId: input.turn.internalMessageId,
      });

      if (!preflight.executionConfiguration.scopeEligibility) {
        return this.executeV1Normal(input, "AUTO_APPROVAL_SCOPE_BLOCKED");
      }

      if (preflight.preflightStatus !== "APPROVED") {
        return this.executeV1Normal(input, "AUTO_APPROVAL_PREFLIGHT_BLOCKED");
      }

      if (preflight.officialContextStatus !== "AVAILABLE") {
        return this.executeV1Normal(input, "AUTO_APPROVAL_CONTEXT_UNAVAILABLE");
      }
      if (
        preflight.resolvedCategory !== "businessHours" ||
        preflight.resolvedIntent !== "ask_business_hours" ||
        preflight.contextualResolution !== false
      ) {
        return this.executeV1Normal(input, "AUTO_APPROVAL_PREFLIGHT_BLOCKED");
      }

      // Armar approval de forma idempotente
      try {
        await this.dependencies.administration.arm({
          companyId: input.turn.companyId,
          assistantId: input.turn.assistantId,
          conversationId: input.turn.conversationId,
          message: input.messageText ?? "",
          canonicalVersion: input.turn.canonicalVersion,
          allowedCategory: "businessHours",
          allowedAuthority: "OFFICIAL_CONTEXT",
          currentInboundMessageId: input.turn.internalMessageId,
          expectedCanonicalComparisonHash: input.turn.canonicalComparisonHash,
          approvalSource: "AUTO_SINGLE_USE",
          durationMinutes: 5, // Curta validade (ex: 5 minutos)
          operatorPurpose: "AUTO_SINGLE_USE_EXPLICIT_V2_INBOUND",
        });

        // Carregar a approval recém-criada
        approval = await this.dependencies.coordinator.loadApproval(input.turn);
        if (!approval) {
          return this.executeV1Normal(input, "AUTO_APPROVAL_CLAIM_FAILED");
        }
        currentFlow = await this.currentFlowEvaluation(input);
        if (!this.isCurrentFlowEligible(input, currentFlow)) {
          await this.cancelAutomaticApproval(input, approval);
          return this.executeV1Normal(input, "AUTO_APPROVAL_FLOW_INELIGIBLE");
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "";
        if (msg.includes("RESPONSE_EXECUTION_ACTIVE")) {
          // A concurrent worker might have already created it! Try reloading first
          approval = await this.dependencies.coordinator.loadApproval(input.turn);
          if (!approval) {
            return this.executeV1Normal(input, "AUTO_APPROVAL_CREATE_CONFLICT");
          }
        } else {
          return this.executeV1Normal(input, "AUTO_APPROVAL_PREFLIGHT_BLOCKED");
        }
      }
    }

    if (!approval) {
      return this.executeV1Normal(input);
    }
    if (!this.isCurrentFlowEligible(input, currentFlow)) {
      await this.cancelAutomaticApproval(input, approval);
      return this.executeV1Normal(input, "AUTO_APPROVAL_FLOW_INELIGIBLE");
    }
    if (
      approval.approvalSource === "AUTO_SINGLE_USE" &&
      approval.internalMessageId !== input.turn.internalMessageId
    ) {
      return this.executeV1Normal(input, "AUTO_APPROVAL_IDENTITY_UNAVAILABLE");
    }

    const semanticDecision = input.v2Eligibility?.semanticDecision;
    if (
      approval.semanticDecisionVersion !== semanticDecision?.version ||
      approval.expectedSemanticDecisionFingerprint !== semanticDecision?.fingerprint ||
      approval.expectedIntent !== semanticDecision?.intent
    ) {
      await this.cancelAutomaticApproval(input, approval);
      return this.executeV1Normal(input, "RESPONSE_EXECUTION_SEMANTIC_MISMATCH");
    }
    const approvalContextState = contextApprovalState(approval);
    if (
      approvalContextState === "INVALID" ||
      (approvalContextState === "VERSIONED" &&
        (approval.contextResolutionVersion !== semanticDecision?.contextResolutionVersion ||
          approval.expectedContextFingerprint !== semanticDecision?.contextFingerprint ||
          approval.expectedAntecedentFingerprint !== semanticDecision?.antecedentFingerprint ||
          approval.expectedAntecedentCategory !== semanticDecision?.antecedentCategory ||
          approval.expectedAntecedentIntent !== semanticDecision?.antecedentIntent ||
          approval.contextualResolution !== semanticDecision?.contextualResolution))
    ) {
      await this.cancelAutomaticApproval(input, approval);
      return this.executeV1Normal(input, "RESPONSE_EXECUTION_CONTEXT_MISMATCH");
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
      await this.cancelAutomaticApproval(input, approval);
      return this.executeV1Normal(input);
    }

    const claimed = await this.dependencies.coordinator.claim({
      ...input.turn,
      approval,
    });
    if (claimed.status !== "CLAIMED") {
      if (claimed.status === "PENDING_OR_TERMINAL") {
        return this.deferred(claimed);
      }
      if (approvalMode === "AUTO_SINGLE_USE") {
        return this.executeV1Normal(input, "AUTO_APPROVAL_CLAIM_FAILED");
      }
      return this.deferred(claimed);
    }

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
        providerCallCount: 0,
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
        providerCallCount: generated.sanitizedTelemetry?.providerCallCount ?? 0,
        deterministicTelemetry: generated.sanitizedTelemetry
          ? {
              deterministicResponderCount: generated.sanitizedTelemetry.deterministicResponderCount,
              requestedScheduleScope: generated.sanitizedTelemetry.requestedScheduleScope,
              deterministicBranch: generated.sanitizedTelemetry.deterministicBranch,
              requestedDay: generated.sanitizedTelemetry.requestedDay,
              scheduleSource: generated.sanitizedTelemetry.scheduleSource,
              missingScheduleConfiguration:
                generated.sanitizedTelemetry.missingScheduleConfiguration,
              scheduleValidationIssueCount:
                generated.sanitizedTelemetry.scheduleValidationIssueCount,
              normalizedScheduleDayCount: generated.sanitizedTelemetry.normalizedScheduleDayCount,
              normalizedScheduleIntervalCount:
                generated.sanitizedTelemetry.normalizedScheduleIntervalCount,
              isOpenNow: generated.sanitizedTelemetry.isOpenNow,
            }
          : undefined,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 80) : "V2_GENERATION_FAILED";
      return this.executeV1Fallback(input, claimed.generationId, reason);
    }
  }

  private async executeV1Normal(
    input: ResponseGenerationRouterInput,
    reason:
      | "EXECUTION_MODE_OFF"
      | "EXECUTION_SCOPE_EMPTY"
      | "V2_EXECUTION_NOT_CONNECTED"
      | "RESPONSE_EXECUTION_SEMANTIC_MISMATCH"
      | "RESPONSE_EXECUTION_CONTEXT_MISMATCH"
      | "AUTO_APPROVAL_MODE_INVALID"
      | "AUTO_APPROVAL_SCOPE_BLOCKED"
      | "AUTO_APPROVAL_FLOW_INELIGIBLE"
      | "AUTO_APPROVAL_PREFLIGHT_BLOCKED"
      | "AUTO_APPROVAL_CONTEXT_UNAVAILABLE"
      | "AUTO_APPROVAL_IDENTITY_UNAVAILABLE"
      | "AUTO_APPROVAL_CREATE_CONFLICT"
      | "AUTO_APPROVAL_CLAIM_FAILED" = resolveDefaultDenyReason(input),
  ): Promise<ResponseGenerationRouterResult> {
    const response = await this.dependencies.executeV1(input.v1Input);
    return createV1NormalResponseExecutionEnvelope({
      turn: input.turn,
      response,
      reason,
    });
  }

  private async cancelAutomaticApproval(
    input: ResponseGenerationRouterInput,
    approval: RuntimeV2ResponseExecutionApproval,
  ): Promise<void> {
    if (
      approval.approvalSource !== "AUTO_SINGLE_USE" ||
      approval.internalMessageId !== input.turn.internalMessageId
    ) {
      return;
    }
    await this.dependencies.coordinator?.cancel({
      ...input.turn,
      approvalFingerprint: approval.creationFingerprint.slice(0, 16),
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
