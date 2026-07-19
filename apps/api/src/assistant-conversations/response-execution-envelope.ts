import type {
  V1GeneratedResponse,
  V1ResponseGenerationStrategy,
} from "./v1-response-generation-executor";

export type ResponseExecutionOwner = "V1_NORMAL" | "V1_FALLBACK" | "V2_PRIMARY";
export type ResponseExecutionRoute = "V1_DEFAULT" | "V2_SINGLE_USE";
export type ResponseExecutionStrategy = V1ResponseGenerationStrategy | "V2_BUSINESS_HOURS" | null;

export type ResponseExecutionTurn = {
  companyId: string;
  assistantId: string;
  conversationId: string;
  internalMessageId: string;
  contextVersion?: number;
  canonicalComparisonHash: string | null;
  canonicalVersion: string;
};

export type ResponseExecutionEnvelope = {
  executionOwner: ResponseExecutionOwner;
  route: ResponseExecutionRoute;
  turn: ResponseExecutionTurn;
  strategy: ResponseExecutionStrategy;
  responseText: string;
  providerCallCount: number;
  toolCallCount: number;
  providerMetadata: V1GeneratedResponse["providerMetadata"];
  generationMetadata: V1GeneratedResponse["generationMetadata"] | null;
  generatedResponse: V1GeneratedResponse | null;
  outboundAllowed: boolean;
  generationId: string | null;
  approvalFingerprint: string | null;
  allowedCategory: "businessHours" | null;
  allowedAuthority: "OFFICIAL_CONTEXT" | null;
  candidateStatus: "CANDIDATE_APPROVED" | null;
  qualityGateResult: "APPROVED" | null;
  sanitizedTelemetry: {
    executionOwner: ResponseExecutionOwner;
    route: ResponseExecutionRoute;
    strategy: ResponseExecutionStrategy;
    providerCallCount: number;
    toolCallCount: number;
    decision: "DEFAULT_DENY" | "SINGLE_USE_V2" | "V1_FALLBACK";
    reason: string;
  };
};

export function createV1NormalResponseExecutionEnvelope(input: {
  turn: ResponseExecutionTurn;
  response?: V1GeneratedResponse | null;
  responseText?: string;
  reason:
    | "EXECUTION_MODE_OFF"
    | "EXECUTION_SCOPE_EMPTY"
    | "V2_EXECUTION_NOT_CONNECTED"
    | "RESPONSE_EXECUTION_SEMANTIC_MISMATCH"
    | "RESPONSE_EXECUTION_CONTEXT_MISMATCH";
}): ResponseExecutionEnvelope {
  const response = input.response ?? null;
  const responseText = input.responseText ?? response?.responseText ?? "";
  const strategy = response?.strategy ?? null;
  const providerCallCount = response?.providerCallCount ?? 0;
  const toolCallCount = response?.toolCallCount ?? 0;

  return {
    executionOwner: "V1_NORMAL",
    route: "V1_DEFAULT",
    turn: input.turn,
    strategy,
    responseText,
    providerCallCount,
    toolCallCount,
    providerMetadata: response?.providerMetadata ?? { provider: null, model: null },
    generationMetadata: response?.generationMetadata ?? null,
    generatedResponse: response,
    outboundAllowed: true,
    generationId: null,
    approvalFingerprint: null,
    allowedCategory: null,
    allowedAuthority: null,
    candidateStatus: null,
    qualityGateResult: null,
    sanitizedTelemetry: {
      executionOwner: "V1_NORMAL",
      route: "V1_DEFAULT",
      strategy,
      providerCallCount,
      toolCallCount,
      decision: "DEFAULT_DENY",
      reason: input.reason,
    },
  };
}

export function createV2PrimaryResponseExecutionEnvelope(input: {
  turn: ResponseExecutionTurn;
  responseText: string;
  generationId: string;
  approvalFingerprint: string;
  providerMetadata?: { provider: string | null; model: string | null };
}): ResponseExecutionEnvelope {
  return {
    executionOwner: "V2_PRIMARY",
    route: "V2_SINGLE_USE",
    turn: input.turn,
    strategy: "V2_BUSINESS_HOURS",
    responseText: input.responseText,
    providerCallCount: 1,
    toolCallCount: 0,
    providerMetadata: input.providerMetadata ?? { provider: "v2-fake", model: "v2-fake" },
    generationMetadata: null,
    generatedResponse: null,
    outboundAllowed: true,
    generationId: input.generationId,
    approvalFingerprint: input.approvalFingerprint,
    allowedCategory: "businessHours",
    allowedAuthority: "OFFICIAL_CONTEXT",
    candidateStatus: "CANDIDATE_APPROVED",
    qualityGateResult: "APPROVED",
    sanitizedTelemetry: {
      executionOwner: "V2_PRIMARY",
      route: "V2_SINGLE_USE",
      strategy: "V2_BUSINESS_HOURS",
      providerCallCount: 1,
      toolCallCount: 0,
      decision: "SINGLE_USE_V2",
      reason: "APPROVAL_CLAIMED",
    },
  };
}

export function createV1FallbackResponseExecutionEnvelope(input: {
  turn: ResponseExecutionTurn;
  response: V1GeneratedResponse;
  reason: string;
}): ResponseExecutionEnvelope {
  return {
    ...createV1NormalResponseExecutionEnvelope({
      turn: input.turn,
      response: input.response,
      reason: "V2_EXECUTION_NOT_CONNECTED",
    }),
    executionOwner: "V1_FALLBACK",
    route: "V2_SINGLE_USE",
    sanitizedTelemetry: {
      executionOwner: "V1_FALLBACK",
      route: "V2_SINGLE_USE",
      strategy: input.response.strategy,
      providerCallCount: input.response.providerCallCount,
      toolCallCount: input.response.toolCallCount,
      decision: "V1_FALLBACK",
      reason: input.reason,
    },
  };
}

export function validateV1NormalResponseExecutionEnvelope(input: {
  envelope: ResponseExecutionEnvelope;
  turn: ResponseExecutionTurn;
}): void {
  const { envelope, turn } = input;
  if (envelope.executionOwner !== "V1_NORMAL") {
    throw new Error("Response tail rejected an unsupported execution owner.");
  }
  if (envelope.route !== "V1_DEFAULT") {
    throw new Error("Response tail rejected an unsupported response route.");
  }
  if (!envelope.outboundAllowed) {
    throw new Error("Response tail rejected an outbound-disabled response envelope.");
  }
  if (typeof envelope.responseText !== "string") {
    throw new Error("Response tail rejected an invalid response envelope.");
  }
  if (
    envelope.turn.companyId !== turn.companyId ||
    envelope.turn.assistantId !== turn.assistantId ||
    envelope.turn.conversationId !== turn.conversationId ||
    envelope.turn.internalMessageId !== turn.internalMessageId ||
    envelope.turn.contextVersion !== turn.contextVersion ||
    envelope.turn.canonicalComparisonHash !== turn.canonicalComparisonHash ||
    envelope.turn.canonicalVersion !== turn.canonicalVersion
  ) {
    throw new Error("Response tail rejected a mismatched response execution envelope.");
  }
}

export function validateResponseExecutionEnvelope(input: {
  envelope: ResponseExecutionEnvelope;
  turn: ResponseExecutionTurn;
}): void {
  const { envelope, turn } = input;
  if (!envelope.outboundAllowed || typeof envelope.responseText !== "string") {
    throw new Error("Response tail rejected an invalid response envelope.");
  }
  if (
    envelope.turn.companyId !== turn.companyId ||
    envelope.turn.assistantId !== turn.assistantId ||
    envelope.turn.conversationId !== turn.conversationId ||
    envelope.turn.internalMessageId !== turn.internalMessageId ||
    envelope.turn.contextVersion !== turn.contextVersion ||
    envelope.turn.canonicalComparisonHash !== turn.canonicalComparisonHash ||
    envelope.turn.canonicalVersion !== turn.canonicalVersion
  ) {
    throw new Error("Response tail rejected a mismatched response execution envelope.");
  }
  if (envelope.executionOwner === "V1_NORMAL") {
    validateV1NormalResponseExecutionEnvelope(input);
    return;
  }
  if (envelope.executionOwner === "V1_FALLBACK") {
    if (envelope.route !== "V2_SINGLE_USE" || !envelope.generatedResponse) {
      throw new Error("Response tail rejected an invalid V1 fallback envelope.");
    }
    return;
  }
  if (
    envelope.route !== "V2_SINGLE_USE" ||
    !envelope.generationId ||
    !envelope.approvalFingerprint ||
    envelope.allowedCategory !== "businessHours" ||
    envelope.allowedAuthority !== "OFFICIAL_CONTEXT" ||
    envelope.candidateStatus !== "CANDIDATE_APPROVED" ||
    envelope.qualityGateResult !== "APPROVED" ||
    envelope.toolCallCount !== 0
  ) {
    throw new Error("Response tail rejected an invalid V2 primary envelope.");
  }
}
