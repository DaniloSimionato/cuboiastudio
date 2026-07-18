import type { AiChatCompletionMessage, AiChatCompletionResult } from "../ai/ai.types";

type StandardResponseProvider = {
  generateChatCompletion(input: {
    companyId: string;
    messages: AiChatCompletionMessage[];
    model: string;
    temperature: number;
    tools: unknown[] | undefined;
  }): Promise<AiChatCompletionResult>;
};

export type StandardToolCallsEvent = {
  completion: AiChatCompletionResult;
  promptMessages: AiChatCompletionMessage[];
  toolCalls: NonNullable<AiChatCompletionResult["toolCalls"]>;
  toolCallCount: number;
};

export type StandardResponseGenerationInput = {
  companyId: string;
  promptMessages: AiChatCompletionMessage[];
  model: string;
  temperature: number;
  tools: unknown[] | undefined;
  provider: StandardResponseProvider;
  onToolCalls(event: StandardToolCallsEvent): Promise<void>;
  onToolCallCount?(toolCallCount: number): void;
  maxIterations?: number;
};

export type StandardResponseGenerationResult = {
  completion: AiChatCompletionResult | undefined;
  providerCallCount: number;
  toolCallCount: number;
  loopCount: number;
  promptMessages: AiChatCompletionMessage[];
};

export async function generateStandardResponse(
  input: StandardResponseGenerationInput,
): Promise<StandardResponseGenerationResult> {
  const maxIterations = input.maxIterations ?? 5;
  let completion: AiChatCompletionResult | undefined;
  let loopCount = 0;
  let providerCallCount = 0;
  let toolCallCount = 0;
  let toolCallsResolved = false;

  while (loopCount < maxIterations && !toolCallsResolved) {
    providerCallCount += 1;
    completion = await input.provider.generateChatCompletion({
      companyId: input.companyId,
      messages: input.promptMessages,
      model: input.model,
      temperature: input.temperature,
      tools: input.tools,
    });

    if (completion.toolCalls && completion.toolCalls.length > 0) {
      toolCallCount += completion.toolCalls.length;
      input.onToolCallCount?.(toolCallCount);
      await input.onToolCalls({
        completion,
        promptMessages: input.promptMessages,
        toolCalls: completion.toolCalls,
        toolCallCount,
      });
      loopCount += 1;
      continue;
    }

    toolCallsResolved = true;
  }

  return {
    completion,
    providerCallCount,
    toolCallCount,
    loopCount,
    promptMessages: input.promptMessages,
  };
}
