import { createHash } from "node:crypto";
import type { AssistantFlow } from "@prisma/client";
import { flowIntentKeyForFlow, scoreFlowCandidates } from "../intent-router/intent-routing";

export type FlowConfigurationStatus = "FLOW_NOT_CONFIGURED" | "ACTIVE_FLOWS_PRESENT";
export type FlowEvaluationStatus =
  "NO_MATCH" | "MATCHED_STANDARD_COMPATIBLE" | "MATCHED_BLOCKS_V2" | "INDETERMINATE";
export type V2FlowCompatibility = "ALLOWED" | "BLOCKED";

export type FlowApplicabilityEvaluation = {
  flowConfigurationStatus: FlowConfigurationStatus;
  activeFlowCount: number;
  flowEvaluationStatus: FlowEvaluationStatus;
  matchedFlowCount: number;
  selectedFlowFingerprint: string | null;
  selectedFlowType: string | null;
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
    | "FLOW_APPLICABLE_STANDARD_COMPATIBLE"
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
    selectedFlowType: null,
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
      selectedFlowType: null,
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

  return {
    flowConfigurationStatus: "ACTIVE_FLOWS_PRESENT",
    activeFlowCount: activeFlows.length,
    flowEvaluationStatus: standardCompatible ? "MATCHED_STANDARD_COMPATIBLE" : "MATCHED_BLOCKS_V2",
    matchedFlowCount: matched.length,
    selectedFlowFingerprint: fingerprint(selectedFlow.id),
    selectedFlowType: flowIntentKeyForFlow(selectedFlow),
    fixedMessageApplicable,
    requiresHuman,
    autoRespond,
    toolRequired,
    handoffRequired,
    categoryOverride: flowIntentKeyForFlow(selectedFlow),
    flowConfigurationFingerprint,
    // The first primary outbound intentionally permits only no applicable flow.
    v2Compatibility: "BLOCKED",
    blockerCode: standardCompatible
      ? "FLOW_APPLICABLE_STANDARD_COMPATIBLE"
      : "FLOW_APPLICABLE_BLOCKS_V2",
    redactionApplied: true,
  };
}
