import { createHash } from "node:crypto";
import type { AssistantFlow } from "@prisma/client";
import { flowIntentKeyForFlow, scoreFlowCandidates } from "../intent-router/intent-routing";

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
  matchType: "KEYWORD_SCORED";
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
  flowMatchType: "KEYWORD_SCORED" | null;
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
  blockerCode:
    | "FLOW_APPLICABLE_BLOCKS_V2"
    | "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED"
    | "FLOW_MATCH_AMBIGUOUS"
    | "FLOW_EVALUATION_INDETERMINATE"
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
  });
}

function isSafeDeclarativeInstruction(instruction: string): boolean {
  if (instruction.length > 1200) return false;
  return !/\b(?:ferramenta|tool|ação|acao|handoff|humano|atendente|encaminh|transfer|agend|calend[aá]rio|r\$|preço|preco|valor|estoque|garantia|prazo|documento|rag|base de conhecimento|mem[oó]ria|embedding|\b\d{1,2}:\d{2}\b)\b/i.test(
    instruction,
  );
}

function createCompatibleFlowExecutionContext(
  flow: AssistantFlow,
  matchType: "KEYWORD_SCORED",
): CompatibleFlowExecutionContext | null {
  const declarativeInstructions = flow.flowInstructions?.trim() || null;
  if (
    flowIntentKeyForFlow(flow) !== "company_information" ||
    Boolean(flow.knowledgeScope?.trim()) ||
    (declarativeInstructions !== null && !isSafeDeclarativeInstruction(declarativeInstructions))
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
    value.matchType === "KEYWORD_SCORED" &&
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
        isSafeDeclarativeInstruction(value.declarativeInstructions)))
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
      blockerCode: null,
      redactionApplied: true,
    };
  }

  const candidates = scoreFlowCandidates(input.message, activeFlows);
  const matched = candidates.filter((candidate) => candidate.score >= 2);
  const selected = matched[0];
  if (!selected) {
    const semanticFallbackRequired = activeFlows.some((flow) => flow.triggerDescription?.trim());
    return noMatch({
      status: semanticFallbackRequired ? "INDETERMINATE" : "NO_MATCH",
      activeFlows,
      flowConfigurationFingerprint,
    });
  }

  const selectedFlow = activeFlows.find((flow) => flow.id === selected.flowId);
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
  const compatibleFlowContext = standardCompatible
    ? createCompatibleFlowExecutionContext(selectedFlow, "KEYWORD_SCORED")
    : null;
  const flowBlockedByUnsupportedContext = standardCompatible && !compatibleFlowContext;

  return {
    flowConfigurationStatus: "ACTIVE_FLOWS_PRESENT",
    activeFlowCount: activeFlows.length,
    flowEvaluationStatus: standardCompatible ? "MATCHED_STANDARD_COMPATIBLE" : "MATCHED_BLOCKS_V2",
    matchedFlowCount: matched.length,
    selectedFlowFingerprint: fingerprint(selectedFlow.id),
    selectedFlowVersionFingerprint: flowVersionFingerprint(selectedFlow),
    selectedFlowType: flowIntentKeyForFlow(selectedFlow),
    flowMatchType: "KEYWORD_SCORED",
    declarativeContextFingerprint: compatibleFlowContext?.declarativeInstructionFingerprint ?? null,
    compatibleFlowContext,
    fixedMessageApplicable,
    requiresHuman,
    autoRespond,
    toolRequired,
    handoffRequired,
    categoryOverride: flowIntentKeyForFlow(selectedFlow),
    flowConfigurationFingerprint,
    v2Compatibility: compatibleFlowContext ? "ALLOWED_WITH_FLOW_CONTEXT" : "BLOCKED",
    blockerCode: flowBlockedByUnsupportedContext
      ? "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED"
      : standardCompatible
        ? null
        : "FLOW_APPLICABLE_BLOCKS_V2",
    redactionApplied: true,
  };
}
