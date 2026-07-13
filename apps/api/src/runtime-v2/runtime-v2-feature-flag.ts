import { type RuntimeV2FeatureConfig, type RuntimeVersion } from "./runtime-v2.types";

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
