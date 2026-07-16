import { type RuntimeV2FeatureConfig, type RuntimeVersion } from "./runtime-v2.types";

export type RuntimeV2Mode = "OFF" | "SHADOW";
export type RuntimeV2StateStoreMode = "MEMORY" | "POSTGRES";
export type RuntimeV2EvidenceMode = "OFF" | "SHADOW_METADATA";
export type RuntimeV2ActionStateMode = "OFF" | "SHADOW_STATE";
export type RuntimeV2ToolObservationMode = "OFF" | "SHADOW_METADATA";
export type RuntimeV2SyntheticExecutionMode = "OFF" | "SYNTHETIC_ONLY";
export type RuntimeV2HandoffStateMode = "OFF" | "SHADOW_STATE";
export type RuntimeV2HandoffExecutionMode = "OFF" | "CONTROLLED";
export type RuntimeV2HandoffAdapterMode = "OFF" | "CHATWOOT_CONTROLLED";
export type RuntimeV2ResponseGenerationMode = "OFF" | "SHADOW";
export type RuntimeV2ResponseComparisonMode = "OFF" | "SHADOW";

export type RuntimeV2ShadowConfig = RuntimeV2FeatureConfig & {
  assistantId?: string | null;
};

export function resolveRuntimeVersion(config: RuntimeV2FeatureConfig = {}): RuntimeVersion {
  if (config.runtimeVersion === "V2") return "V2";
  if (config.runtimeV2Enabled === true) return "V2";
  return "V1";
}

export function shouldRunV2(config: RuntimeV2FeatureConfig = {}): boolean {
  return resolveRuntimeVersion(config) === "V2";
}

export function isShadowMode(config: RuntimeV2FeatureConfig = {}): boolean {
  return shouldRunV2(config) && config.shadowMode === true;
}

function parseAllowlist(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveRuntimeV2Mode(
  config: RuntimeV2FeatureConfig = {},
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2Mode {
  const configuredMode = config.mode ?? environment.RUNTIME_V2_MODE ?? "OFF";
  if (configuredMode === "OFF") return "OFF";
  if (configuredMode === "SHADOW") return "SHADOW";
  return "OFF";
}

export function isRuntimeV2ShadowEnabled(
  input: RuntimeV2ShadowConfig = {},
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  if (resolveRuntimeV2Mode(input, environment) !== "SHADOW") return false;
  const allowlist =
    input.shadowAssistantIds ?? parseAllowlist(environment.RUNTIME_V2_SHADOW_ASSISTANT_IDS);
  return Boolean(input.assistantId && allowlist.includes(input.assistantId));
}

export function resolveRuntimeV2StateStoreMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2StateStoreMode {
  return environment.RUNTIME_V2_STATE_STORE === "POSTGRES" ? "POSTGRES" : "MEMORY";
}

export function resolveRuntimeV2EvidenceMode(
  config: Pick<RuntimeV2FeatureConfig, "evidenceMode"> = {},
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2EvidenceMode {
  const configuredMode = config.evidenceMode ?? environment.RUNTIME_V2_EVIDENCE_MODE ?? "OFF";
  return configuredMode === "SHADOW_METADATA" ? "SHADOW_METADATA" : "OFF";
}

export function resolveRuntimeV2ActionStateMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2ActionStateMode {
  return environment.RUNTIME_V2_ACTION_STATE_MODE === "SHADOW_STATE" ? "SHADOW_STATE" : "OFF";
}

export function resolveRuntimeV2ToolObservationMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2ToolObservationMode {
  return environment.RUNTIME_V2_TOOL_OBSERVATION_MODE === "SHADOW_METADATA"
    ? "SHADOW_METADATA"
    : "OFF";
}

export function resolveRuntimeV2SyntheticExecutionMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2SyntheticExecutionMode {
  return environment.RUNTIME_V2_SYNTHETIC_EXECUTION_MODE === "SYNTHETIC_ONLY"
    ? "SYNTHETIC_ONLY"
    : "OFF";
}

export function resolveRuntimeV2HandoffStateMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2HandoffStateMode {
  return environment.RUNTIME_V2_HANDOFF_STATE_MODE === "SHADOW_STATE" ? "SHADOW_STATE" : "OFF";
}

export function resolveRuntimeV2HandoffExecutionMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2HandoffExecutionMode {
  return environment.RUNTIME_V2_HANDOFF_EXECUTION_MODE === "CONTROLLED" ? "CONTROLLED" : "OFF";
}

export function resolveRuntimeV2HandoffExecutionAssistantIds(
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  return parseAllowlist(environment.RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS);
}

export function resolveRuntimeV2HandoffExecutionConversationIds(
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  return parseAllowlist(environment.RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS);
}

export function resolveRuntimeV2HandoffAdapterMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2HandoffAdapterMode {
  return environment.RUNTIME_V2_HANDOFF_ADAPTER_MODE === "CHATWOOT_CONTROLLED"
    ? "CHATWOOT_CONTROLLED"
    : "OFF";
}

export function resolveRuntimeV2ResponseGenerationMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2ResponseGenerationMode {
  return environment.RUNTIME_V2_RESPONSE_GENERATION_MODE === "SHADOW" ? "SHADOW" : "OFF";
}

export function resolveRuntimeV2ResponseComparisonMode(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeV2ResponseComparisonMode {
  return environment.RUNTIME_V2_RESPONSE_COMPARISON_MODE === "SHADOW" ? "SHADOW" : "OFF";
}

export function resolveRuntimeV2ResponseAssistantIds(
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  return parseAllowlist(environment.RUNTIME_V2_RESPONSE_ASSISTANT_IDS);
}

export function resolveRuntimeV2ResponseConversationIds(
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  return parseAllowlist(environment.RUNTIME_V2_RESPONSE_CONVERSATION_IDS);
}

export function isRuntimeV2ResponseGenerationEnabled(
  input: { assistantId: string; conversationId: string },
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    isRuntimeV2ShadowEnabled({ assistantId: input.assistantId }, environment) &&
    resolveRuntimeV2ResponseGenerationMode(environment) === "SHADOW" &&
    resolveRuntimeV2ResponseAssistantIds(environment).includes(input.assistantId) &&
    resolveRuntimeV2ResponseConversationIds(environment).includes(input.conversationId)
  );
}

export function assertNoDualOutbound(input: {
  runtimeVersion: RuntimeVersion;
  v1OutboundSent: boolean;
  v2OutboundSent: boolean;
}): void {
  if (input.v1OutboundSent && input.v2OutboundSent) {
    throw new Error("RUNTIME_DUAL_OUTBOUND_BLOCKED");
  }
  if (input.runtimeVersion === "V1" && input.v2OutboundSent) {
    throw new Error("RUNTIME_V2_OUTBOUND_BLOCKED_WHEN_V1_ACTIVE");
  }
}
