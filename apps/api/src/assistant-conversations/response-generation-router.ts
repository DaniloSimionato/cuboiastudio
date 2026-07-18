import {
  V1ResponseGenerationExecutor,
  type V1GeneratedResponse,
  type V1ResponseGenerationExecutorInput,
} from "./v1-response-generation-executor";
import {
  createV1NormalResponseExecutionEnvelope,
  type ResponseExecutionEnvelope,
  type ResponseExecutionTurn,
} from "./response-execution-envelope";

export type ResponseGenerationRoute = ResponseExecutionEnvelope["route"];
export type ResponseGenerationRouterTurn = ResponseExecutionTurn;

export type ResponseGenerationRouterInput = {
  turn: ResponseGenerationRouterTurn;
  v1Input: V1ResponseGenerationExecutorInput;
  executionMode?: unknown;
  executionAssistantIds?: readonly string[] | null;
  executionConversationIds?: readonly string[] | null;
};

export type ResponseGenerationRouterResult = ResponseExecutionEnvelope;

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
    return createV1NormalResponseExecutionEnvelope({
      turn: input.turn,
      response,
      reason: resolveDefaultDenyReason(input),
    });
  }
}
