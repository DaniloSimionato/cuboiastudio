import type { Assistant, AssistantBehavior, AssistantFlow } from "@prisma/client";
import type { AiChatCompletionMessage, AiChatCompletionResult } from "../ai/ai.types";
import type { OfficialBusinessContext } from "../assistants/official-business-context";
import {
  isTriageResponseValid,
  PromptCompilerService,
  type TriageFlowContext,
  type TriageState,
} from "../prompt-compiler/prompt-compiler.service";

type TriageProvider = {
  generateChatCompletion(input: {
    companyId: string;
    messages: AiChatCompletionMessage[];
    model: string;
    temperature?: number;
    tools: [];
    response_format: { type: "json_object" };
  }): Promise<AiChatCompletionResult>;
};

type TriageCache = {
  set(key: string, value: TriageState | null, ttlSeconds: number): Promise<unknown>;
};

type TriageLogger = {
  error(message: string, stack?: string): unknown;
  warn(message: string): unknown;
};

export type TriagePromptCompiledEvent = {
  messages: AiChatCompletionMessage[];
  isSecondAttempt: boolean;
};

export type TriageResponseGenerationInput = {
  companyId: string;
  assistant: Partial<Assistant>;
  promptInstructions: string;
  behavior: AssistantBehavior | null | undefined;
  flow: AssistantFlow | null | undefined;
  securityRules: Array<{ name: string; ruleType: string; instruction: string }>;
  priorHistory: unknown[];
  customerIntentText: string;
  officialBusinessContext: OfficialBusinessContext | null;
  memoryContextBlock: string | null;
  loadedTriageState: TriageState | null;
  triageFlowContext: TriageFlowContext | null;
  triageCacheKey: string;
  userMessageId: string;
  requestedDetailKey: string | null;
  knownFieldKeys: string[];
  pendingFieldKeys: string[];
  model: string;
  temperature: number;
  provider: TriageProvider;
  compiler?: Pick<PromptCompilerService, "compile">;
  cache?: TriageCache;
  logger: TriageLogger;
  onPromptCompiled(event: TriagePromptCompiledEvent): void;
  now?: () => number;
};

export type TriageResponseGenerationResult = {
  answer: string;
  completion: AiChatCompletionResult | undefined;
  promptMessages: AiChatCompletionMessage[];
  providerCallCount: number;
  triageValidationPassed: boolean;
  triageAttemptCount: number;
  triageResolved: boolean;
  errorStage: "NONE" | "PROVIDER_ATTEMPT_1" | "PROVIDER_ATTEMPT_2";
};

function parseTriageAnswer(answer: string): {
  message: string;
  requestedDetail?: string;
  triageResolved: boolean;
} {
  return JSON.parse(answer.replace(/^```json\s*/i, "").replace(/\s*```$/, ""));
}

function buildTriageState(input: {
  loadedTriageState: TriageState | null;
  userMessageId: string;
  requestedDetail: string;
  requestedDetailKey: string | null;
  lastQuestion: string;
  attemptCount: number;
  knownFieldKeys: string[];
  pendingFieldKeys: string[];
  now: number;
}): TriageState {
  return {
    active: true,
    startedAt: input.loadedTriageState?.startedAt ?? new Date(input.now).toISOString(),
    sourceMessageId: input.userMessageId,
    requestedDetail: input.requestedDetail,
    requestedDetailKey: input.requestedDetailKey,
    lastQuestion: input.lastQuestion,
    attemptCount: input.attemptCount,
    resolved: false,
    expiresAt: input.loadedTriageState?.expiresAt ?? input.now + 3_600_000,
    knownFieldKeys: input.knownFieldKeys,
    pendingFieldKeys: input.pendingFieldKeys,
  };
}

function getErrorDetails(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export async function generateTriageResponse(
  input: TriageResponseGenerationInput,
): Promise<TriageResponseGenerationResult> {
  const compiler = input.compiler ?? new PromptCompilerService();
  const now = input.now ?? Date.now;
  let promptMessages: AiChatCompletionMessage[] = [];
  let completion: AiChatCompletionResult | undefined;
  let answer = "";
  let triageValidationPassed = false;
  let triageAttemptCount = 1;
  let triageResolved = false;
  let providerCallCount = 0;
  let errorStage: TriageResponseGenerationResult["errorStage"] = "NONE";

  const compilePrompt = (isSecondAttempt: boolean): AiChatCompletionMessage[] => {
    const messages = compiler.compile({
      assistant: {
        ...input.assistant,
        instructions: input.promptInstructions,
      },
      behavior: input.behavior,
      flow: input.flow,
      securityRules: input.securityRules,
      knowledgeItems: [],
      historyMessages: input.priorHistory,
      currentMessage: input.customerIntentText,
      officialBusinessContext: input.officialBusinessContext,
      calendarContext: null,
      memoryContextBlock: input.memoryContextBlock,
      triageMode: true,
      isSecondAttempt,
      triageState: input.loadedTriageState,
      triageFlowContext: input.triageFlowContext,
    });
    input.onPromptCompiled({ messages, isSecondAttempt });
    return messages;
  };

  const consumeCompletion = async (): Promise<void> => {
    if (!completion?.answer || !isTriageResponseValid(completion.answer)) return;

    const parsed = parseTriageAnswer(completion.answer);
    triageValidationPassed = true;
    answer = parsed.message;
    if (parsed.triageResolved) {
      triageResolved = true;
      return;
    }

    if (input.cache) {
      await input.cache.set(
        input.triageCacheKey,
        buildTriageState({
          loadedTriageState: input.loadedTriageState,
          userMessageId: input.userMessageId,
          requestedDetail: input.requestedDetailKey ?? parsed.requestedDetail ?? "",
          requestedDetailKey: input.requestedDetailKey,
          lastQuestion: parsed.message ?? "",
          attemptCount: triageAttemptCount,
          knownFieldKeys: input.knownFieldKeys,
          pendingFieldKeys: input.pendingFieldKeys,
          now: now(),
        }),
        3600,
      );
    }
  };

  const generateAttempt = async (attempt: 1 | 2): Promise<void> => {
    try {
      providerCallCount += 1;
      completion = await input.provider.generateChatCompletion({
        companyId: input.companyId,
        messages: promptMessages,
        model: input.model,
        temperature: input.temperature,
        tools: [],
        response_format: { type: "json_object" },
      });
      await consumeCompletion();
    } catch (error: unknown) {
      errorStage = attempt === 1 ? "PROVIDER_ATTEMPT_1" : "PROVIDER_ATTEMPT_2";
      const details = getErrorDetails(error);
      input.logger.error(
        `Error in triage mode attempt ${attempt}: ${details.message}`,
        details.stack,
      );
    }
  };

  promptMessages = compilePrompt(false);
  await generateAttempt(1);

  if (!triageValidationPassed) {
    triageAttemptCount = 2;
    promptMessages = compilePrompt(true);
    await generateAttempt(2);
  }

  if (!triageValidationPassed) {
    answer =
      "Consigo te ajudar com isso! Qual é o principal detalhe ou informação que você já consegue me passar?";
    if (input.cache) {
      await input.cache.set(
        input.triageCacheKey,
        buildTriageState({
          loadedTriageState: input.loadedTriageState,
          userMessageId: input.userMessageId,
          requestedDetail: input.loadedTriageState?.requestedDetail ?? "informações básicas",
          requestedDetailKey:
            input.loadedTriageState?.requestedDetailKey ?? input.requestedDetailKey,
          lastQuestion: answer,
          attemptCount: triageAttemptCount,
          knownFieldKeys: input.knownFieldKeys,
          pendingFieldKeys: input.pendingFieldKeys,
          now: now(),
        }),
        3600,
      );
    }
  }

  if (triageResolved && input.cache) {
    try {
      await input.cache.set(input.triageCacheKey, null, 1);
    } catch (error: unknown) {
      input.logger.warn(`Failed to clear triage cache: ${getErrorDetails(error).message}`);
    }
  }

  return {
    answer,
    completion,
    promptMessages,
    providerCallCount,
    triageValidationPassed,
    triageAttemptCount,
    triageResolved,
    errorStage,
  };
}
