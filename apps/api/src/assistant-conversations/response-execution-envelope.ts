import type {
  V1GeneratedResponse,
  V1ResponseGenerationStrategy,
} from "./v1-response-generation-executor";

export type ResponseExecutionOwner = "V1_NORMAL" | "V1_FALLBACK" | "V2_PRIMARY";
export type ResponseExecutionRoute = "V1_DEFAULT";

export type ResponseExecutionTurn = {
  companyId: string;
  assistantId: string;
  conversationId: string;
  internalMessageId: string;
  canonicalComparisonHash: string | null;
  canonicalVersion: string;
};

export type ResponseExecutionEnvelope = {
  executionOwner: ResponseExecutionOwner;
  route: ResponseExecutionRoute;
  turn: ResponseExecutionTurn;
  strategy: V1ResponseGenerationStrategy | null;
  responseText: string;
  providerCallCount: number;
  toolCallCount: number;
  providerMetadata: V1GeneratedResponse["providerMetadata"];
  generationMetadata: V1GeneratedResponse["generationMetadata"] | null;
  generatedResponse: V1GeneratedResponse | null;
  outboundAllowed: boolean;
  sanitizedTelemetry: {
    executionOwner: "V1_NORMAL";
    route: "V1_DEFAULT";
    strategy: V1ResponseGenerationStrategy | null;
    providerCallCount: number;
    toolCallCount: number;
    decision: "DEFAULT_DENY";
    reason: "EXECUTION_MODE_OFF" | "EXECUTION_SCOPE_EMPTY" | "V2_EXECUTION_NOT_CONNECTED";
  };
};

export function createV1NormalResponseExecutionEnvelope(input: {
  turn: ResponseExecutionTurn;
  response?: V1GeneratedResponse | null;
  responseText?: string;
  reason: "EXECUTION_MODE_OFF" | "EXECUTION_SCOPE_EMPTY" | "V2_EXECUTION_NOT_CONNECTED";
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
    envelope.turn.canonicalComparisonHash !== turn.canonicalComparisonHash ||
    envelope.turn.canonicalVersion !== turn.canonicalVersion
  ) {
    throw new Error("Response tail rejected a mismatched response execution envelope.");
  }
}
