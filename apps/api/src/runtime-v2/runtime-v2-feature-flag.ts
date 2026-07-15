import { type RuntimeV2FeatureConfig, type RuntimeVersion } from "./runtime-v2.types";

export type RuntimeV2Mode = "OFF" | "SHADOW";
export type RuntimeV2StateStoreMode = "MEMORY" | "POSTGRES";
export type RuntimeV2EvidenceMode = "OFF" | "SHADOW_METADATA";

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
