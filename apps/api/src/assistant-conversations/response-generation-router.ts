import {
  V1ResponseGenerationExecutor,
  type V1GeneratedResponse,
  type V1ResponseGenerationExecutorInput,
} from "./v1-response-generation-executor";

export type ResponseGenerationRoute = "V1_DEFAULT";

export type ResponseGenerationRouterTurn = {
  companyId: string;
  assistantId: string;
  conversationId: string;
  internalMessageId: string;
  canonicalComparisonHash: string | null;
  canonicalVersion: string;
};

export type ResponseGenerationRouterInput = {
  turn: ResponseGenerationRouterTurn;
  v1Input: V1ResponseGenerationExecutorInput;
  executionMode?: unknown;
  executionAssistantIds?: readonly string[] | null;
  executionConversationIds?: readonly string[] | null;
};

export type ResponseGenerationRouterResult = {
  route: ResponseGenerationRoute;
  response: V1GeneratedResponse;
  sanitizedTelemetry: {
    route: ResponseGenerationRoute;
    decision: "DEFAULT_DENY";
    reason: "EXECUTION_MODE_OFF" | "EXECUTION_SCOPE_EMPTY" | "V2_EXECUTION_NOT_CONNECTED";
  };
};

export type ResponseGenerationRouterDependencies = {
  executeV1(input: V1ResponseGenerationExecutorInput): Promise<V1GeneratedResponse>;
};

const defaultDependencies: ResponseGenerationRouterDependencies = {
  executeV1: (input) => new V1ResponseGenerationExecutor().execute(input),
};

function resolveDefaultDenyReason(
  input: ResponseGenerationRouterInput,
): "EXECUTION_MODE_OFF" | "EXECUTION_SCOPE_EMPTY" | "V2_EXECUTION_NOT_CONNECTED" {
  if (input.executionMode !== "CONTROLLED") return "EXECUTION_MODE_OFF";
  if (!input.executionAssistantIds?.length || !input.executionConversationIds?.length) {
    return "EXECUTION_SCOPE_EMPTY";
  }
  return "V2_EXECUTION_NOT_CONNECTED";
}

/**
 * Deliberately V1-only seam. It owns no persistence, provider, sender, approval,
 * coordinator, or Runtime V2 execution behavior. Future controlled execution must
 * be added explicitly rather than inferred from a mode or allowlist.
 */
export class ResponseGenerationRouter {
  constructor(
    private readonly dependencies: ResponseGenerationRouterDependencies = defaultDependencies,
  ) {}

  async route(input: ResponseGenerationRouterInput): Promise<ResponseGenerationRouterResult> {
    const response = await this.dependencies.executeV1(input.v1Input);
    return {
      route: "V1_DEFAULT",
      response,
      sanitizedTelemetry: {
        route: "V1_DEFAULT",
        decision: "DEFAULT_DENY",
        reason: resolveDefaultDenyReason(input),
      },
    };
  }
}
