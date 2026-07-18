import type { AssistantFlow } from "@prisma/client";
import {
  generateFlowBypassResponse,
  requiresFlowBypassGeneration,
  type FlowBypassResponseGenerationInput,
  type FlowBypassResponseGenerationResult,
} from "./flow-bypass-response-generation-strategy";
import {
  generateStandardResponse,
  type StandardResponseGenerationInput,
  type StandardResponseGenerationResult,
} from "./standard-response-generation-strategy";
import {
  generateTriageResponse,
  type TriageResponseGenerationInput,
  type TriageResponseGenerationResult,
} from "./triage-response-generation-strategy";

export type V1ResponseGenerationStrategy = "FLOW_BYPASS" | "TRIAGE" | "STANDARD";

export type V1GeneratedResponse = {
  owner: "V1";
  strategy: V1ResponseGenerationStrategy;
  responseText: string;
  providerCallCount: number;
  providerMetadata: {
    provider: string | null;
    model: string | null;
  };
  toolCallCount: number;
  toolExecutionMetadata: {
    loopCount: number;
  };
  handoffRequired: boolean;
  requiresHuman: boolean;
  autoRespond: boolean | null;
  generationMetadata: {
    finalAction: string | null;
    outcome: string | null;
    triageValidationPassed: boolean | null;
    triageAttemptCount: number | null;
    triageResolved: boolean | null;
  };
  sanitizedTelemetry: {
    strategy: V1ResponseGenerationStrategy;
    providerCallCount: number;
    toolCallCount: number;
  };
  errorStage: string | null;
};

export type V1ResponseGenerationExecutorInput = {
  flow: AssistantFlow | null | undefined;
  triageMode: boolean;
  createFlowBypassInput(): Promise<FlowBypassResponseGenerationInput>;
  createTriageInput(): Promise<TriageResponseGenerationInput>;
  createStandardInput(): Promise<StandardResponseGenerationInput>;
};

export type V1ResponseGenerationExecutorDependencies = {
  generateFlowBypassResponse(
    input: FlowBypassResponseGenerationInput,
  ): Promise<FlowBypassResponseGenerationResult>;
  generateTriageResponse(
    input: TriageResponseGenerationInput,
  ): Promise<TriageResponseGenerationResult>;
  generateStandardResponse(
    input: StandardResponseGenerationInput,
  ): Promise<StandardResponseGenerationResult>;
};

const defaultDependencies: V1ResponseGenerationExecutorDependencies = {
  generateFlowBypassResponse,
  generateTriageResponse,
  generateStandardResponse,
};

export function selectV1ResponseGenerationStrategy(input: {
  flow: AssistantFlow | null | undefined;
  triageMode: boolean;
}): V1ResponseGenerationStrategy {
  if (requiresFlowBypassGeneration(input.flow)) return "FLOW_BYPASS";
  return input.triageMode ? "TRIAGE" : "STANDARD";
}

export class V1ResponseGenerationExecutor {
  constructor(
    private readonly dependencies: V1ResponseGenerationExecutorDependencies = defaultDependencies,
  ) {}

  async execute(input: V1ResponseGenerationExecutorInput): Promise<V1GeneratedResponse> {
    const strategy = selectV1ResponseGenerationStrategy(input);

    if (strategy === "FLOW_BYPASS") {
      const result = await this.dependencies.generateFlowBypassResponse(
        await input.createFlowBypassInput(),
      );
      if (result.kind === "NONE") {
        throw new Error("Flow bypass selection did not produce a bypass response");
      }
      return {
        owner: "V1",
        strategy,
        responseText: result.answer,
        providerCallCount: result.providerCallCount,
        providerMetadata: { provider: null, model: null },
        toolCallCount: 0,
        toolExecutionMetadata: { loopCount: 0 },
        handoffRequired: result.handoffPending,
        requiresHuman: result.handoffPending,
        autoRespond: result.autoRespond,
        generationMetadata: {
          finalAction: result.finalAction,
          outcome: result.outcome,
          triageValidationPassed: null,
          triageAttemptCount: null,
          triageResolved: null,
        },
        sanitizedTelemetry: { strategy, providerCallCount: 0, toolCallCount: 0 },
        errorStage: null,
      };
    }

    if (strategy === "TRIAGE") {
      const result = await this.dependencies.generateTriageResponse(
        await input.createTriageInput(),
      );
      return this.fromTriageResult(result);
    }

    const result = await this.dependencies.generateStandardResponse(
      await input.createStandardInput(),
    );
    return this.fromStandardResult(result);
  }

  private fromTriageResult(result: TriageResponseGenerationResult): V1GeneratedResponse {
    return {
      owner: "V1",
      strategy: "TRIAGE",
      responseText: result.answer,
      providerCallCount: result.providerCallCount,
      providerMetadata: {
        provider: result.completion?.provider ?? null,
        model: result.completion?.model ?? null,
      },
      toolCallCount: 0,
      toolExecutionMetadata: { loopCount: 0 },
      handoffRequired: false,
      requiresHuman: false,
      autoRespond: null,
      generationMetadata: {
        finalAction: null,
        outcome: null,
        triageValidationPassed: result.triageValidationPassed,
        triageAttemptCount: result.triageAttemptCount,
        triageResolved: result.triageResolved,
      },
      sanitizedTelemetry: {
        strategy: "TRIAGE",
        providerCallCount: result.providerCallCount,
        toolCallCount: 0,
      },
      errorStage: result.errorStage,
    };
  }

  private fromStandardResult(result: StandardResponseGenerationResult): V1GeneratedResponse {
    const completion = result.completion;
    if (!completion) {
      throw new Error("Standard response generation completed without a provider result");
    }
    return {
      owner: "V1",
      strategy: "STANDARD",
      responseText: completion.answer,
      providerCallCount: result.providerCallCount,
      providerMetadata: { provider: completion.provider, model: completion.model },
      toolCallCount: result.toolCallCount,
      toolExecutionMetadata: { loopCount: result.loopCount },
      handoffRequired: false,
      requiresHuman: false,
      autoRespond: null,
      generationMetadata: {
        finalAction: null,
        outcome: null,
        triageValidationPassed: null,
        triageAttemptCount: null,
        triageResolved: null,
      },
      sanitizedTelemetry: {
        strategy: "STANDARD",
        providerCallCount: result.providerCallCount,
        toolCallCount: result.toolCallCount,
      },
      errorStage: null,
    };
  }
}
