import { createHash } from "node:crypto";
import type { AssistantFlow } from "@prisma/client";
import { flowIntentKeyForFlow, scoreFlowCandidates } from "../intent-router/intent-routing";
import {
  isExplicitBusinessHoursRuntimeV2Flow,
  isSafeRuntimeV2FlowInstruction,
  resolveRuntimeV2FlowScope,
  validateRuntimeV2FlowScope,
  type RuntimeV2FlowScope,
} from "../assistant-flows/runtime-v2-flow-scope";
import type { ResponseExecutionSemanticDecision } from "../runtime-v2/response-execution-intent";

export type FlowConfigurationStatus = "FLOW_NOT_CONFIGURED" | "ACTIVE_FLOWS_PRESENT";
export type FlowEvaluationStatus =
  "NO_MATCH" | "MATCHED_STANDARD_COMPATIBLE" | "MATCHED_BLOCKS_V2" | "INDETERMINATE";
export type V2FlowCompatibility = "ALLOWED" | "ALLOWED_WITH_FLOW_CONTEXT" | "BLOCKED";

/**
 * Ephemeral, declarative-only input for the first controlled V2 primary
 * response. It is never persisted in an approval; the approval retains only
 * the fingerprints that bind this context to a future inbound turn.
 */
export type CompatibleFlowExecutionContext = {
  flowFingerprint: string;
  flowVersionFingerprint: string;
  matchType: "KEYWORD_SCORED" | "EXPLICIT_RUNTIME_SCOPE";
  category: "businessHours";
  declarativeInstructionFingerprint: string | null;
  declarativeInstructions: string | null;
  factualAuthorityType: "OFFICIAL_CONTEXT";
  hasFixedMessage: false;
  requiresHuman: false;
  handoffRequired: false;
  toolRequired: false;
  actionRequired: false;
  autoRespondAllowed: true;
  compatibilityStatus: "STANDARD_COMPATIBLE";
  redactionApplied: true;
};

export type FlowApplicabilityEvaluation = {
  flowConfigurationStatus: FlowConfigurationStatus;
  activeFlowCount: number;
  flowEvaluationStatus: FlowEvaluationStatus;
  matchedFlowCount: number;
  selectedFlowFingerprint: string | null;
  selectedFlowVersionFingerprint: string | null;
  selectedFlowType: string | null;
  flowMatchType: "KEYWORD_SCORED" | "EXPLICIT_RUNTIME_SCOPE" | null;
  declarativeContextFingerprint: string | null;
  compatibleFlowContext: CompatibleFlowExecutionContext | null;
  fixedMessageApplicable: boolean;
  requiresHuman: boolean;
  autoRespond: boolean | null;
  toolRequired: boolean;
  handoffRequired: boolean;
  categoryOverride: string | null;
  flowConfigurationFingerprint: string;
  v2Compatibility: V2FlowCompatibility;
  flowRuntimeScope: RuntimeV2FlowScope | null;
  explicitRuntimeCategory: "businessHours" | null;
  explicitRuntimeIntent: "ask_business_hours" | null;
  explicitRuntimeAuthority: "OFFICIAL_CONTEXT" | null;
  runtimeDirectOnly: boolean | null;
  flowScopeCompatibility: "EXPLICIT_V2_MATCH" | "LEGACY_V1_ONLY" | "NOT_APPLICABLE";
  legacyFlowIgnoredForExplicitV2Match: boolean;
  blockerCode:
    | "FLOW_APPLICABLE_BLOCKS_V2"
    | "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED"
    | "FLOW_MATCH_AMBIGUOUS"
    | "FLOW_EVALUATION_INDETERMINATE"
    | "FLOW_EXPLICIT_SCOPE_INVALID"
    | null;
  redactionApplied: true;
};

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function hasConfiguredTool(flow: AssistantFlow): boolean {
  return Boolean(flow.allowedToolSlugs?.trim() || flow.toolContext);
}

function hasConfiguredHandoff(flow: AssistantFlow): boolean {
  return Boolean(flow.handoffTeamId?.trim() || flow.handoffTeamName?.trim());
}

function flowVersionFingerprint(flow: AssistantFlow): string {
  return fingerprint({
    id: flow.id,
    updatedAt: flow.updatedAt?.toISOString?.() ?? String(flow.updatedAt ?? ""),
    priority: flow.priority,
    triggerKeywords: flow.triggerKeywords,
    triggerDescription: flow.triggerDescription,
    triggerExamples: flow.triggerExamples,
    flowInstructions: flow.flowInstructions,
    knowledgeScope: flow.knowledgeScope,
    finalAction: flow.finalAction,
    fixedMessage: flow.fixedMessage,
    requiresHuman: flow.requiresHuman,
    autoRespond: flow.autoRespond,
    allowedToolSlugs: flow.allowedToolSlugs,
    handoffTeamId: flow.handoffTeamId,
    handoffTeamName: flow.handoffTeamName,
    toolContext: flow.toolContext,
    runtimeScope: flow.runtimeScope,
    runtimeCategory: flow.runtimeCategory,
    runtimeIntent: flow.runtimeIntent,
    runtimeAuthority: flow.runtimeAuthority,
    runtimeDirectOnly: flow.runtimeDirectOnly,
  });
}

function createCompatibleFlowExecutionContext(
  flow: AssistantFlow,
  matchType: "EXPLICIT_RUNTIME_SCOPE",
): CompatibleFlowExecutionContext | null {
  const declarativeInstructions = flow.flowInstructions?.trim() || null;
  if (
    !isExplicitBusinessHoursRuntimeV2Flow(flow) ||
    !validateRuntimeV2FlowScope(flow).valid ||
    (declarativeInstructions !== null && !isSafeRuntimeV2FlowInstruction(declarativeInstructions))
  ) {
    return null;
  }
  return {
    flowFingerprint: fingerprint(flow.id),
    flowVersionFingerprint: flowVersionFingerprint(flow),
    matchType,
    category: "businessHours",
    declarativeInstructionFingerprint: declarativeInstructions
      ? fingerprint(declarativeInstructions)
      : null,
    declarativeInstructions,
    factualAuthorityType: "OFFICIAL_CONTEXT",
    hasFixedMessage: false,
    requiresHuman: false,
    handoffRequired: false,
    toolRequired: false,
    actionRequired: false,
    autoRespondAllowed: true,
    compatibilityStatus: "STANDARD_COMPATIBLE",
    redactionApplied: true,
  };
}

export function isCompatibleFlowExecutionContext(value: CompatibleFlowExecutionContext): boolean {
  return (
    value.matchType === "EXPLICIT_RUNTIME_SCOPE" &&
    value.category === "businessHours" &&
    value.factualAuthorityType === "OFFICIAL_CONTEXT" &&
    value.hasFixedMessage === false &&
    value.requiresHuman === false &&
    value.handoffRequired === false &&
    value.toolRequired === false &&
    value.actionRequired === false &&
    value.autoRespondAllowed === true &&
    value.compatibilityStatus === "STANDARD_COMPATIBLE" &&
    value.redactionApplied === true &&
    Boolean(value.flowFingerprint) &&
    Boolean(value.flowVersionFingerprint) &&
    (value.declarativeInstructions === null ||
      (Boolean(value.declarativeInstructionFingerprint) &&
        value.declarativeInstructionFingerprint === fingerprint(value.declarativeInstructions) &&
        isSafeRuntimeV2FlowInstruction(value.declarativeInstructions)))
  );
}

function configurationFingerprint(flows: AssistantFlow[]): string {
  return fingerprint(
    flows
      .filter((flow) => flow.active)
      .map((flow) => ({
        id: flow.id,
        updatedAt: flow.updatedAt?.toISOString?.() ?? String(flow.updatedAt ?? ""),
        priority: flow.priority,
        triggerKeywords: flow.triggerKeywords,
        triggerDescription: flow.triggerDescription,
        triggerExamples: flow.triggerExamples,
        flowInstructions: flow.flowInstructions,
        knowledgeScope: flow.knowledgeScope,
        finalAction: flow.finalAction,
        fixedMessage: flow.fixedMessage,
        requiresHuman: flow.requiresHuman,
        autoRespond: flow.autoRespond,
        allowedToolSlugs: flow.allowedToolSlugs,
        handoffTeamId: flow.handoffTeamId,
        handoffTeamName: flow.handoffTeamName,
        toolContext: flow.toolContext,
        runtimeScope: flow.runtimeScope,
        runtimeCategory: flow.runtimeCategory,
        runtimeIntent: flow.runtimeIntent,
        runtimeAuthority: flow.runtimeAuthority,
        runtimeDirectOnly: flow.runtimeDirectOnly,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  );
}

function noMatch(input: {
  status: "NO_MATCH" | "INDETERMINATE";
  activeFlows: AssistantFlow[];
  flowConfigurationFingerprint: string;
}): FlowApplicabilityEvaluation {
  const indeterminate = input.status === "INDETERMINATE";
  return {
    flowConfigurationStatus: "ACTIVE_FLOWS_PRESENT",
    activeFlowCount: input.activeFlows.length,
    flowEvaluationStatus: input.status,
    matchedFlowCount: 0,
    selectedFlowFingerprint: null,
    selectedFlowVersionFingerprint: null,
    selectedFlowType: null,
    flowMatchType: null,
    declarativeContextFingerprint: null,
    compatibleFlowContext: null,
    fixedMessageApplicable: false,
    requiresHuman: false,
    autoRespond: null,
    toolRequired: false,
    handoffRequired: false,
    categoryOverride: null,
    flowConfigurationFingerprint: input.flowConfigurationFingerprint,
    v2Compatibility: indeterminate ? "BLOCKED" : "ALLOWED",
    flowRuntimeScope: null,
    explicitRuntimeCategory: null,
    explicitRuntimeIntent: null,
    explicitRuntimeAuthority: null,
    runtimeDirectOnly: null,
    flowScopeCompatibility: "NOT_APPLICABLE",
    legacyFlowIgnoredForExplicitV2Match: false,
    blockerCode: indeterminate ? "FLOW_EVALUATION_INDETERMINATE" : null,
    redactionApplied: true,
  };
}

/**
 * Read-only deterministic subset of V1 flow routing. V1 may fall back to an
 * LLM semantic router when keywords do not decide; that fallback is deliberately
 * indeterminate here so controlled V2 execution remains fail-closed.
 */
export function evaluateFlowApplicability(input: {
  message: string;
  flows: AssistantFlow[];
  semanticDecision?: ResponseExecutionSemanticDecision;
}): FlowApplicabilityEvaluation {
  const activeFlows = input.flows.filter((flow) => flow.active);
  const flowConfigurationFingerprint = configurationFingerprint(activeFlows);
  if (activeFlows.length === 0) {
    return {
      flowConfigurationStatus: "FLOW_NOT_CONFIGURED",
      activeFlowCount: 0,
      flowEvaluationStatus: "NO_MATCH",
      matchedFlowCount: 0,
      selectedFlowFingerprint: null,
      selectedFlowVersionFingerprint: null,
      selectedFlowType: null,
      flowMatchType: null,
      declarativeContextFingerprint: null,
      compatibleFlowContext: null,
      fixedMessageApplicable: false,
      requiresHuman: false,
      autoRespond: null,
      toolRequired: false,
      handoffRequired: false,
      categoryOverride: null,
      flowConfigurationFingerprint,
      v2Compatibility: "ALLOWED",
      flowRuntimeScope: null,
      explicitRuntimeCategory: null,
      explicitRuntimeIntent: null,
      explicitRuntimeAuthority: null,
      runtimeDirectOnly: null,
      flowScopeCompatibility: "NOT_APPLICABLE",
      legacyFlowIgnoredForExplicitV2Match: false,
      blockerCode: null,
      redactionApplied: true,
    };
  }

  const explicitlyScopedFlows = activeFlows.filter(
    (flow) => resolveRuntimeV2FlowScope(flow) === "V2_CONTROLLED",
  );
  const invalidExplicitScope = explicitlyScopedFlows.find(
    (flow) => !validateRuntimeV2FlowScope(flow).valid,
  );
  if (invalidExplicitScope) {
    return {
      ...noMatch({ status: "INDETERMINATE", activeFlows, flowConfigurationFingerprint }),
      selectedFlowFingerprint: fingerprint(invalidExplicitScope.id),
      selectedFlowVersionFingerprint: flowVersionFingerprint(invalidExplicitScope),
      selectedFlowType: "explicit_runtime_scope",
      flowRuntimeScope: "V2_CONTROLLED",
      flowScopeCompatibility: "NOT_APPLICABLE",
      blockerCode: "FLOW_EXPLICIT_SCOPE_INVALID",
    };
  }

  const directBusinessHours =
    input.semanticDecision?.applicable === true &&
    input.semanticDecision.category === "businessHours" &&
    input.semanticDecision.intent === "ask_business_hours" &&
    input.semanticDecision.authority === "OFFICIAL_CONTEXT" &&
    input.semanticDecision.contextualResolution === false;
  const explicitMatches = directBusinessHours
    ? explicitlyScopedFlows.filter((flow) => isExplicitBusinessHoursRuntimeV2Flow(flow))
    : [];
  if (explicitMatches.length > 0) {
    const selectedFlow = [...explicitMatches].sort(
      (left, right) => right.priority - left.priority || left.id.localeCompare(right.id),
    )[0];
    const equallyRanked = explicitMatches.filter((flow) => flow.priority === selectedFlow.priority);
    if (equallyRanked.length > 1) {
      return {
        ...noMatch({ status: "INDETERMINATE", activeFlows, flowConfigurationFingerprint }),
        matchedFlowCount: explicitMatches.length,
        flowRuntimeScope: "V2_CONTROLLED",
        flowScopeCompatibility: "NOT_APPLICABLE",
        blockerCode: "FLOW_MATCH_AMBIGUOUS",
      };
    }
    const compatibleFlowContext = createCompatibleFlowExecutionContext(
      selectedFlow,
      "EXPLICIT_RUNTIME_SCOPE",
    );
    if (!compatibleFlowContext) {
      return {
        ...noMatch({ status: "INDETERMINATE", activeFlows, flowConfigurationFingerprint }),
        matchedFlowCount: explicitMatches.length,
        selectedFlowFingerprint: fingerprint(selectedFlow.id),
        selectedFlowVersionFingerprint: flowVersionFingerprint(selectedFlow),
        selectedFlowType: "explicit_runtime_scope",
        flowRuntimeScope: "V2_CONTROLLED",
        explicitRuntimeCategory: "businessHours",
        explicitRuntimeIntent: "ask_business_hours",
        explicitRuntimeAuthority: "OFFICIAL_CONTEXT",
        runtimeDirectOnly: true,
        flowScopeCompatibility: "NOT_APPLICABLE",
        blockerCode: "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED",
      };
    }
    return {
      flowConfigurationStatus: "ACTIVE_FLOWS_PRESENT",
      activeFlowCount: activeFlows.length,
      flowEvaluationStatus: "MATCHED_STANDARD_COMPATIBLE",
      matchedFlowCount: explicitMatches.length,
      selectedFlowFingerprint: fingerprint(selectedFlow.id),
      selectedFlowVersionFingerprint: flowVersionFingerprint(selectedFlow),
      selectedFlowType: "businessHours",
      flowMatchType: "EXPLICIT_RUNTIME_SCOPE",
      declarativeContextFingerprint: compatibleFlowContext.declarativeInstructionFingerprint,
      compatibleFlowContext,
      fixedMessageApplicable: false,
      requiresHuman: false,
      autoRespond: true,
      toolRequired: false,
      handoffRequired: false,
      categoryOverride: "businessHours",
      flowConfigurationFingerprint,
      v2Compatibility: "ALLOWED_WITH_FLOW_CONTEXT",
      flowRuntimeScope: "V2_CONTROLLED",
      explicitRuntimeCategory: "businessHours",
      explicitRuntimeIntent: "ask_business_hours",
      explicitRuntimeAuthority: "OFFICIAL_CONTEXT",
      runtimeDirectOnly: true,
      flowScopeCompatibility: "EXPLICIT_V2_MATCH",
      legacyFlowIgnoredForExplicitV2Match: activeFlows.some(
        (flow) => resolveRuntimeV2FlowScope(flow) === "V1_ONLY",
      ),
      blockerCode: null,
      redactionApplied: true,
    };
  }

  const legacyFlows = activeFlows.filter((flow) => resolveRuntimeV2FlowScope(flow) === "V1_ONLY");
  const candidates = scoreFlowCandidates(input.message, legacyFlows);
  const matched = candidates.filter((candidate) => candidate.score >= 2);
  const selected = matched[0];
  if (!selected) {
    const semanticFallbackRequired = legacyFlows.some((flow) => flow.triggerDescription?.trim());
    return noMatch({
      status: semanticFallbackRequired ? "INDETERMINATE" : "NO_MATCH",
      activeFlows,
      flowConfigurationFingerprint,
    });
  }

  const selectedFlow = legacyFlows.find((flow) => flow.id === selected.flowId);
  if (!selectedFlow) {
    return noMatch({ status: "INDETERMINATE", activeFlows, flowConfigurationFingerprint });
  }
  const finalAction = selectedFlow.finalAction || "respond";
  const fixedMessageApplicable =
    finalAction === "fixed_message" || Boolean(selectedFlow.fixedMessage?.trim());
  const requiresHuman = Boolean(selectedFlow.requiresHuman);
  const autoRespond = selectedFlow.autoRespond;
  const toolRequired = hasConfiguredTool(selectedFlow);
  const handoffRequired = finalAction === "handoff" || hasConfiguredHandoff(selectedFlow);
  const standardCompatible =
    finalAction === "respond" &&
    !fixedMessageApplicable &&
    !requiresHuman &&
    autoRespond !== false &&
    !toolRequired &&
    !handoffRequired;
  const equallyRanked = matched.filter(
    (candidate) => candidate.score === selected.score && candidate.priority === selected.priority,
  );
  if (equallyRanked.length > 1) {
    return {
      ...noMatch({ status: "INDETERMINATE", activeFlows, flowConfigurationFingerprint }),
      matchedFlowCount: matched.length,
      blockerCode: "FLOW_MATCH_AMBIGUOUS",
    };
  }
  const compatibleFlowContext = null;
  const flowBlockedByUnsupportedContext = standardCompatible;

  return {
    flowConfigurationStatus: "ACTIVE_FLOWS_PRESENT",
    activeFlowCount: activeFlows.length,
    flowEvaluationStatus: standardCompatible ? "MATCHED_STANDARD_COMPATIBLE" : "MATCHED_BLOCKS_V2",
    matchedFlowCount: matched.length,
    selectedFlowFingerprint: fingerprint(selectedFlow.id),
    selectedFlowVersionFingerprint: flowVersionFingerprint(selectedFlow),
    selectedFlowType: flowIntentKeyForFlow(selectedFlow),
    flowMatchType: "KEYWORD_SCORED",
    declarativeContextFingerprint: null,
    compatibleFlowContext,
    fixedMessageApplicable,
    requiresHuman,
    autoRespond,
    toolRequired,
    handoffRequired,
    categoryOverride: flowIntentKeyForFlow(selectedFlow),
    flowConfigurationFingerprint,
    v2Compatibility: compatibleFlowContext ? "ALLOWED_WITH_FLOW_CONTEXT" : "BLOCKED",
    flowRuntimeScope: "V1_ONLY",
    explicitRuntimeCategory: null,
    explicitRuntimeIntent: null,
    explicitRuntimeAuthority: null,
    runtimeDirectOnly: null,
    flowScopeCompatibility: "LEGACY_V1_ONLY",
    legacyFlowIgnoredForExplicitV2Match: false,
    blockerCode: flowBlockedByUnsupportedContext
      ? "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED"
      : standardCompatible
        ? null
        : "FLOW_APPLICABLE_BLOCKS_V2",
    redactionApplied: true,
  };
}
