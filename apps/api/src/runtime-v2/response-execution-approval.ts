import { createHash, randomUUID } from "node:crypto";

export type RuntimeV2TurnOwner =
  | "V1_OWNED"
  | "V2_CLAIM_PENDING"
  | "V2_OWNED"
  | "V2_GENERATION_PENDING"
  | "V2_CANDIDATE_APPROVED"
  | "V2_OUTBOUND_PENDING"
  | "V2_OUTBOUND_SENT"
  | "V1_FALLBACK_REQUIRED"
  | "V1_FALLBACK_PENDING"
  | "V1_FALLBACK_SENT"
  | "RECONCILIATION_REQUIRED"
  | "TERMINAL_BLOCKED";

export type RuntimeV2ResponseExecutionApproval = {
  approvalId: string;
  companyId: string;
  assistantId: string;
  conversationId: string;
  expectedCanonicalComparisonHash: string;
  canonicalVersion: string;
  allowedCategory: "businessHours";
  allowedAuthority: "OFFICIAL_CONTEXT";
  semanticDecisionVersion?: string;
  expectedSemanticDecisionFingerprint?: string;
  expectedIntent?: "ask_business_hours";
  contextResolutionVersion?: string;
  expectedContextFingerprint?: string;
  expectedAntecedentFingerprint?: string | null;
  expectedAntecedentCategory?: "businessHours" | null;
  expectedAntecedentIntent?: "ask_business_hours" | null;
  contextualResolution?: boolean;
  expiresAt: string;
  createdAt?: string;
  maxUses: 1;
  status: "ARMED" | "CLAIMED" | "CONSUMED" | "CANCELLED" | "EXPIRED";
  claimedAt: string | null;
  consumedAt: string | null;
  generationId: string | null;
  internalMessageId: string | null;
  creationFingerprint: string;
  operatorPurpose: string;
  securityRulesFingerprint?: string | null;
  securityRulesStatus?: "ALLOWED" | "NO_ACTIVE_RULES";
  officialContextFingerprint?: string | null;
  officialContextStatus?: "AVAILABLE";
  flowConfigurationFingerprint?: string | null;
  expectedFlowFingerprint?: string | null;
  expectedFlowVersionFingerprint?: string | null;
  expectedFlowMatchType?: "KEYWORD_SCORED" | "EXPLICIT_RUNTIME_SCOPE" | null;
  flowCompatibility?: "STANDARD_COMPATIBLE" | null;
  declarativeContextFingerprint?: string | null;
  redactionApplied: true;
};

export type RuntimeV2ResponseExecutionClaim =
  | { allowed: true; approval: RuntimeV2ResponseExecutionApproval; owner: "V2_OWNED" }
  | { allowed: false; reason: string; owner: "V1_OWNED" | "TERMINAL_BLOCKED" };

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createRuntimeV2ResponseExecutionApproval(input: {
  companyId: string;
  assistantId: string;
  conversationId: string;
  expectedCanonicalComparisonHash: string;
  canonicalVersion: string;
  semanticDecisionVersion?: string;
  expectedSemanticDecisionFingerprint?: string;
  expectedIntent?: "ask_business_hours";
  contextResolutionVersion?: string;
  expectedContextFingerprint?: string;
  expectedAntecedentFingerprint?: string | null;
  expectedAntecedentCategory?: "businessHours" | null;
  expectedAntecedentIntent?: "ask_business_hours" | null;
  contextualResolution?: boolean;
  expiresAt: Date;
  operatorPurpose: string;
  securityRulesFingerprint?: string | null;
  securityRulesStatus?: "ALLOWED" | "NO_ACTIVE_RULES";
  officialContextFingerprint?: string | null;
  officialContextStatus?: "AVAILABLE";
  flowConfigurationFingerprint?: string | null;
  expectedFlowFingerprint?: string | null;
  expectedFlowVersionFingerprint?: string | null;
  expectedFlowMatchType?: "KEYWORD_SCORED" | "EXPLICIT_RUNTIME_SCOPE" | null;
  flowCompatibility?: "STANDARD_COMPATIBLE" | null;
  declarativeContextFingerprint?: string | null;
  now?: Date;
}): RuntimeV2ResponseExecutionApproval {
  const now = input.now ?? new Date();
  if (
    input.expiresAt.getTime() <= now.getTime() ||
    input.expiresAt.getTime() - now.getTime() > 10 * 60_000
  ) {
    throw new Error("Response execution approval must expire within ten minutes.");
  }
  const approvalId = randomUUID();
  return {
    approvalId,
    companyId: input.companyId,
    assistantId: input.assistantId,
    conversationId: input.conversationId,
    expectedCanonicalComparisonHash: input.expectedCanonicalComparisonHash,
    canonicalVersion: input.canonicalVersion,
    allowedCategory: "businessHours",
    allowedAuthority: "OFFICIAL_CONTEXT",
    expiresAt: input.expiresAt.toISOString(),
    createdAt: now.toISOString(),
    maxUses: 1,
    status: "ARMED",
    claimedAt: null,
    consumedAt: null,
    generationId: null,
    internalMessageId: null,
    creationFingerprint: fingerprint(
      `${approvalId}:${input.companyId}:${input.assistantId}:${input.conversationId}:${input.expectedCanonicalComparisonHash}`,
    ),
    operatorPurpose: input.operatorPurpose.slice(0, 120),
    ...(input.semanticDecisionVersion !== undefined
      ? { semanticDecisionVersion: input.semanticDecisionVersion }
      : {}),
    ...(input.expectedSemanticDecisionFingerprint !== undefined
      ? { expectedSemanticDecisionFingerprint: input.expectedSemanticDecisionFingerprint }
      : {}),
    ...(input.expectedIntent !== undefined ? { expectedIntent: input.expectedIntent } : {}),
    ...(input.contextResolutionVersion !== undefined
      ? { contextResolutionVersion: input.contextResolutionVersion }
      : {}),
    ...(input.expectedContextFingerprint !== undefined
      ? { expectedContextFingerprint: input.expectedContextFingerprint }
      : {}),
    ...(input.expectedAntecedentFingerprint !== undefined
      ? { expectedAntecedentFingerprint: input.expectedAntecedentFingerprint }
      : {}),
    ...(input.expectedAntecedentCategory !== undefined
      ? { expectedAntecedentCategory: input.expectedAntecedentCategory }
      : {}),
    ...(input.expectedAntecedentIntent !== undefined
      ? { expectedAntecedentIntent: input.expectedAntecedentIntent }
      : {}),
    ...(input.contextualResolution !== undefined
      ? { contextualResolution: input.contextualResolution }
      : {}),
    ...(input.securityRulesFingerprint !== undefined
      ? { securityRulesFingerprint: input.securityRulesFingerprint }
      : {}),
    ...(input.securityRulesStatus !== undefined
      ? { securityRulesStatus: input.securityRulesStatus }
      : {}),
    ...(input.officialContextFingerprint !== undefined
      ? { officialContextFingerprint: input.officialContextFingerprint }
      : {}),
    ...(input.officialContextStatus !== undefined
      ? { officialContextStatus: input.officialContextStatus }
      : {}),
    ...(input.flowConfigurationFingerprint !== undefined
      ? { flowConfigurationFingerprint: input.flowConfigurationFingerprint }
      : {}),
    ...(input.expectedFlowFingerprint !== undefined
      ? { expectedFlowFingerprint: input.expectedFlowFingerprint }
      : {}),
    ...(input.expectedFlowVersionFingerprint !== undefined
      ? { expectedFlowVersionFingerprint: input.expectedFlowVersionFingerprint }
      : {}),
    ...(input.expectedFlowMatchType !== undefined
      ? { expectedFlowMatchType: input.expectedFlowMatchType }
      : {}),
    ...(input.flowCompatibility !== undefined
      ? { flowCompatibility: input.flowCompatibility }
      : {}),
    ...(input.declarativeContextFingerprint !== undefined
      ? { declarativeContextFingerprint: input.declarativeContextFingerprint }
      : {}),
    redactionApplied: true,
  };
}

export function claimRuntimeV2ResponseExecution(input: {
  approval: RuntimeV2ResponseExecutionApproval | null | undefined;
  companyId: string;
  assistantId: string;
  conversationId: string;
  canonicalComparisonHash: string;
  internalMessageId: string;
  now?: Date;
}): RuntimeV2ResponseExecutionClaim {
  const approval = input.approval;
  const now = input.now ?? new Date();
  if (!approval) return { allowed: false, reason: "APPROVAL_REQUIRED", owner: "V1_OWNED" };
  if (approval.status !== "ARMED")
    return { allowed: false, reason: `APPROVAL_${approval.status}`, owner: "TERMINAL_BLOCKED" };
  if (Date.parse(approval.expiresAt) <= now.getTime())
    return { allowed: false, reason: "APPROVAL_EXPIRED", owner: "TERMINAL_BLOCKED" };
  if (
    approval.companyId !== input.companyId ||
    approval.assistantId !== input.assistantId ||
    approval.conversationId !== input.conversationId
  )
    return { allowed: false, reason: "APPROVAL_SCOPE_MISMATCH", owner: "V1_OWNED" };
  if (approval.expectedCanonicalComparisonHash !== input.canonicalComparisonHash)
    return { allowed: false, reason: "APPROVAL_HASH_MISMATCH", owner: "V1_OWNED" };
  return {
    allowed: true,
    owner: "V2_OWNED",
    approval: {
      ...approval,
      status: "CLAIMED",
      claimedAt: now.toISOString(),
      internalMessageId: input.internalMessageId,
    },
  };
}
