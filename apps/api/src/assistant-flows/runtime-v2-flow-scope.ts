import type { AssistantFlow } from "@prisma/client";

export const RUNTIME_V2_FLOW_SCOPES = ["V1_ONLY", "V2_CONTROLLED"] as const;
export type RuntimeV2FlowScope = (typeof RUNTIME_V2_FLOW_SCOPES)[number];

export const RUNTIME_V2_FLOW_BUSINESS_HOURS_CONTRACT = {
  category: "businessHours",
  intent: "ask_business_hours",
  authority: "OFFICIAL_CONTEXT",
  directOnly: true,
} as const;

export type RuntimeV2FlowContract = {
  runtimeScope?: string | null;
  runtimeCategory?: string | null;
  runtimeIntent?: string | null;
  runtimeAuthority?: string | null;
  runtimeDirectOnly?: boolean | null;
  knowledgeScope?: string | null;
  toolContext?: unknown;
  allowedToolSlugs?: string | null;
  finalAction?: string | null;
  fixedMessage?: string | null;
  handoffTeamId?: string | null;
  handoffTeamName?: string | null;
  requiresHuman?: boolean | null;
  autoRespond?: boolean | null;
  flowInstructions?: string | null;
};

export type RuntimeV2FlowScopeValidationResult =
  | { valid: true; scope: "V1_ONLY" | "V2_CONTROLLED" }
  | { valid: false; code: RuntimeV2FlowScopeValidationCode };

export type RuntimeV2FlowScopeValidationCode =
  | "RUNTIME_V2_FLOW_SCOPE_INVALID"
  | "RUNTIME_V2_FLOW_CONTRACT_INCOMPLETE"
  | "RUNTIME_V2_FLOW_CONTRACT_UNSUPPORTED"
  | "RUNTIME_V2_FLOW_CONTRACT_NON_STANDARD";

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasToolContext(value: unknown): boolean {
  return value !== null && value !== undefined;
}

/**
 * The V2 controlled path accepts behavior-only instructions. Facts remain in
 * structured official context, never in a flow instruction.
 */
export function isSafeRuntimeV2FlowInstruction(instruction: string): boolean {
  if (instruction.length > 1200) return false;
  return !/\b(?:ferramenta|tool|ação|acao|handoff|humano|atendente|encaminh|transfer|agend|calend[aá]rio|r\$|preço|preco|valor|estoque|garantia|prazo|documento|rag|base de conhecimento|mem[oó]ria|embedding|\d+)\b/i.test(
    instruction,
  );
}

/** Existing flows are deliberately fail-closed for V2 until they opt in. */
export function resolveRuntimeV2FlowScope(flow: RuntimeV2FlowContract): RuntimeV2FlowScope {
  return flow.runtimeScope === "V2_CONTROLLED" ? "V2_CONTROLLED" : "V1_ONLY";
}

export function isExplicitBusinessHoursRuntimeV2Flow(flow: RuntimeV2FlowContract): boolean {
  return (
    resolveRuntimeV2FlowScope(flow) === "V2_CONTROLLED" &&
    flow.runtimeCategory === RUNTIME_V2_FLOW_BUSINESS_HOURS_CONTRACT.category &&
    flow.runtimeIntent === RUNTIME_V2_FLOW_BUSINESS_HOURS_CONTRACT.intent &&
    flow.runtimeAuthority === RUNTIME_V2_FLOW_BUSINESS_HOURS_CONTRACT.authority &&
    flow.runtimeDirectOnly === true
  );
}

export function validateRuntimeV2FlowScope(
  flow: RuntimeV2FlowContract,
): RuntimeV2FlowScopeValidationResult {
  const scope = flow.runtimeScope;
  const hasExplicitIdentity = [
    flow.runtimeCategory,
    flow.runtimeIntent,
    flow.runtimeAuthority,
    flow.runtimeDirectOnly,
  ].some((value) => value !== undefined && value !== null);

  if (scope === undefined || scope === null) {
    return hasExplicitIdentity
      ? { valid: false, code: "RUNTIME_V2_FLOW_CONTRACT_INCOMPLETE" }
      : { valid: true, scope: "V1_ONLY" };
  }
  if (!RUNTIME_V2_FLOW_SCOPES.includes(scope as RuntimeV2FlowScope)) {
    return { valid: false, code: "RUNTIME_V2_FLOW_SCOPE_INVALID" };
  }
  if (scope === "V1_ONLY") {
    return hasExplicitIdentity
      ? { valid: false, code: "RUNTIME_V2_FLOW_CONTRACT_INCOMPLETE" }
      : { valid: true, scope: "V1_ONLY" };
  }
  if (!isExplicitBusinessHoursRuntimeV2Flow(flow)) {
    return { valid: false, code: "RUNTIME_V2_FLOW_CONTRACT_UNSUPPORTED" };
  }

  const finalAction = flow.finalAction ?? "respond";
  const instruction = flow.flowInstructions?.trim() ?? "";
  const standard =
    !hasText(flow.knowledgeScope) &&
    !hasToolContext(flow.toolContext) &&
    !hasText(flow.allowedToolSlugs) &&
    finalAction === "respond" &&
    !hasText(flow.fixedMessage) &&
    !hasText(flow.handoffTeamId) &&
    !hasText(flow.handoffTeamName) &&
    !flow.requiresHuman &&
    flow.autoRespond !== false &&
    (!instruction || isSafeRuntimeV2FlowInstruction(instruction));
  return standard
    ? { valid: true, scope: "V2_CONTROLLED" }
    : { valid: false, code: "RUNTIME_V2_FLOW_CONTRACT_NON_STANDARD" };
}

export type RuntimeV2FlowScopedAssistantFlow = Pick<
  AssistantFlow,
  "runtimeScope" | "runtimeCategory" | "runtimeIntent" | "runtimeAuthority" | "runtimeDirectOnly"
>;
