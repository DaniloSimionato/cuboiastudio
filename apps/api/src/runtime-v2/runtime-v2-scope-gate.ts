import { createHash } from "node:crypto";
import type { RuntimeV2Mode } from "./runtime-v2-feature-flag";

export const RUNTIME_V2_SCOPE_GATE_VERSION = "runtime-v2-scope-gate-v1" as const;

export type RuntimeV2ScopeFeature =
  | "BASE_SHADOW"
  | "EVIDENCE"
  | "ACTION_STATE"
  | "TOOL_OBSERVATION"
  | "SYNTHETIC_EXECUTION"
  | "HANDOFF_STATE"
  | "HANDOFF_EXECUTION"
  | "RESPONSE_GENERATION"
  | "RESPONSE_COMPARISON";

export type RuntimeV2ScopeGateReasonCode =
  | "RUNTIME_V2_SCOPE_ALLOWED"
  | "RUNTIME_V2_SCOPE_MODE_OFF"
  | "RUNTIME_V2_SCOPE_COMPANY_MISMATCH"
  | "RUNTIME_V2_SCOPE_ASSISTANT_NOT_ALLOWLISTED"
  | "RUNTIME_V2_SCOPE_CONVERSATION_NOT_ALLOWLISTED"
  | "RUNTIME_V2_SCOPE_INVALID";

export type RuntimeV2ScopeGateInput = {
  mode: RuntimeV2Mode;
  companyId: string | null | undefined;
  assistantId: string | null | undefined;
  conversationId: string | null | undefined;
  feature: RuntimeV2ScopeFeature;
  assistantAllowlist: readonly string[];
  conversationAllowlist: readonly string[];
  expectedCompanyId?: string | null;
  evaluatedAt: string;
};

export type RuntimeV2ScopeGateResult = {
  schemaVersion: typeof RUNTIME_V2_SCOPE_GATE_VERSION;
  allowed: boolean;
  reasonCode: RuntimeV2ScopeGateReasonCode;
  companyAllowed: boolean;
  assistantAllowed: boolean;
  conversationAllowed: boolean;
  featureAllowed: boolean;
  scopeFingerprint: string;
  evaluatedAt: string;
};

function normalizedId(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function normalizedAllowlist(values: readonly string[]): Set<string> {
  return new Set(values.map((value) => value.trim()).filter(Boolean));
}

function fingerprint(input: {
  companyId: string | null;
  assistantId: string | null;
  conversationId: string | null;
  feature: RuntimeV2ScopeFeature;
}): string {
  return createHash("sha256").update(JSON.stringify(input), "utf8").digest("hex");
}

/**
 * Pure, default-deny boundary for every Runtime V2 Shadow feature. The
 * caller supplies the clock value so the decision remains deterministic in
 * tests and does not need to persist conversation metadata when it rejects.
 */
export function evaluateRuntimeV2ScopeGate(
  input: RuntimeV2ScopeGateInput,
): RuntimeV2ScopeGateResult {
  const companyId = normalizedId(input.companyId);
  const assistantId = normalizedId(input.assistantId);
  const conversationId = normalizedId(input.conversationId);
  const expectedCompanyId = normalizedId(input.expectedCompanyId);
  const companyAllowed =
    Boolean(companyId) && (!expectedCompanyId || companyId === expectedCompanyId);
  const assistantAllowed =
    assistantId !== null && normalizedAllowlist(input.assistantAllowlist).has(assistantId);
  const conversationAllowed =
    conversationId !== null && normalizedAllowlist(input.conversationAllowlist).has(conversationId);
  const featureAllowed = input.mode === "SHADOW";

  const reasonCode: RuntimeV2ScopeGateReasonCode =
    !companyId || !assistantId || !conversationId
      ? "RUNTIME_V2_SCOPE_INVALID"
      : !featureAllowed
        ? "RUNTIME_V2_SCOPE_MODE_OFF"
        : !companyAllowed
          ? "RUNTIME_V2_SCOPE_COMPANY_MISMATCH"
          : !assistantAllowed
            ? "RUNTIME_V2_SCOPE_ASSISTANT_NOT_ALLOWLISTED"
            : !conversationAllowed
              ? "RUNTIME_V2_SCOPE_CONVERSATION_NOT_ALLOWLISTED"
              : "RUNTIME_V2_SCOPE_ALLOWED";

  return {
    schemaVersion: RUNTIME_V2_SCOPE_GATE_VERSION,
    allowed: reasonCode === "RUNTIME_V2_SCOPE_ALLOWED",
    reasonCode,
    companyAllowed,
    assistantAllowed,
    conversationAllowed,
    featureAllowed,
    scopeFingerprint: fingerprint({
      companyId,
      assistantId,
      conversationId,
      feature: input.feature,
    }),
    evaluatedAt: input.evaluatedAt,
  };
}
