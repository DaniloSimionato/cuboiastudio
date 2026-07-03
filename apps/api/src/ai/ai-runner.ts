import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  AiChatCompletionInput,
  AiChatCompletionMessage,
  AiChatCompletionResult,
  AiProviderErrorDetails,
  AiProviderErrorResponse,
  AiResolvedRuntimeConfig,
} from "./ai.types";

type OpenAiCompatibleChoice = {
  message?: {
    content?: string;
  };
  text?: string;
};

type OpenAiCompatibleResponse = {
  choices?: OpenAiCompatibleChoice[];
};

type ProviderErrorPayload = {
  error?: unknown;
  message?: unknown;
};

const MAX_PROVIDER_ERROR_TEXT_LENGTH = 500;

export class AiProviderRequestException extends HttpException {
  constructor(
    public readonly providerStatus: number,
    public readonly providerError: AiProviderErrorDetails,
  ) {
    super(
      {
        message: resolveProviderErrorMessage(providerStatus),
        providerStatus,
        providerError,
      } satisfies AiProviderErrorResponse,
      mapProviderStatusToHttpStatus(providerStatus),
    );
  }
}

export async function runOpenAiCompatibleChatCompletion(
  config: AiResolvedRuntimeConfig,
  input: AiChatCompletionInput,
): Promise<AiChatCompletionResult> {
  if (!config.runtimeEnabled) {
    throw new BadRequestException("AI runtime is disabled.");
  }

  const model = input.model?.trim() || config.model;

  if (model.length === 0) {
    throw new BadRequestException("AI model is not configured.");
  }

  if (config.baseUrl.length === 0 || config.apiKey.length === 0) {
    throw new BadRequestException("AI provider is enabled but not fully configured.");
  }

  if (input.messages.length === 0) {
    throw new BadRequestException("At least one chat message is required.");
  }

  const messages = normalizeMessages(input.messages);

  if (messages.length === 0) {
    throw new BadRequestException("At least one non-empty chat message is required.");
  }

  const payload = {
    model,
    messages,
    temperature: typeof input.temperature === "number" ? input.temperature : 0.2,
  };
  const url = buildChatCompletionsUrl(config.baseUrl);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AiProviderRequestException(
        response.status,
        await sanitizeAiProviderError(response),
      );
    }

    const data = (await response.json().catch(() => null)) as OpenAiCompatibleResponse | null;
    const answer = extractAnswer(data);

    if (!answer) {
      throw new BadGatewayException("AI provider returned an invalid response.");
    }

    return {
      provider: config.provider,
      model,
      answer,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (
      error instanceof BadRequestException ||
      error instanceof BadGatewayException ||
      error instanceof AiProviderRequestException
    ) {
      throw error;
    }

    if (isAbortError(error)) {
      throw new ServiceUnavailableException("AI provider request timed out.");
    }

    throw new ServiceUnavailableException("AI provider request failed.");
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function normalizeMessages(messages: AiChatCompletionMessage[]): AiChatCompletionMessage[] {
  return messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);
}

function buildChatCompletionsUrl(baseUrl: string): string {
  try {
    return new URL("chat/completions", `${baseUrl.replace(/\/$/, "")}/`).toString();
  } catch {
    throw new BadRequestException("AI provider base URL is invalid.");
  }
}

function extractAnswer(payload: OpenAiCompatibleResponse | null): string {
  if (!payload || !Array.isArray(payload.choices) || payload.choices.length === 0) {
    return "";
  }

  const [choice] = payload.choices;
  const messageContent = choice?.message?.content?.trim();

  if (messageContent) {
    return messageContent;
  }

  const textContent = choice?.text?.trim();
  if (textContent) {
    return textContent;
  }

  return "";
}

async function sanitizeAiProviderError(response: Response): Promise<AiProviderErrorDetails> {
  const body = await response.text().catch(() => "");
  const fallbackMessage = body.trim().length > 0 ? body : `Provider HTTP ${response.status}`;

  try {
    const parsed = JSON.parse(body) as ProviderErrorPayload;
    const providerError = isPlainRecord(parsed.error) ? parsed.error : parsed;

    return {
      message: sanitizeProviderText(readStringField(providerError, "message") ?? fallbackMessage),
      ...readOptionalSanitizedField(providerError, "type"),
      ...readOptionalSanitizedField(providerError, "code"),
      ...readOptionalSanitizedField(providerError, "param"),
    };
  } catch {
    return {
      message: sanitizeProviderText(fallbackMessage),
    };
  }
}

function readOptionalSanitizedField(
  payload: Record<string, unknown>,
  key: "type" | "code" | "param",
): Partial<Pick<AiProviderErrorDetails, "type" | "code" | "param">> {
  const value = readStringField(payload, key);
  return value ? { [key]: sanitizeProviderText(value) } : {};
}

function readStringField(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeProviderText(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/authorization\s*[:=]\s*[^\s,;}]+/gi, "authorization: [redacted]")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-[redacted]")
    .slice(0, MAX_PROVIDER_ERROR_TEXT_LENGTH);
}

function resolveProviderErrorMessage(providerStatus: number): string {
  if (providerStatus === 401 || providerStatus === 403) {
    return "Provider authentication failed.";
  }

  if (providerStatus === 402 || providerStatus === 429) {
    return "AI provider rate limit or quota error.";
  }

  if (providerStatus === 404) {
    return "AI provider endpoint or model was not found.";
  }

  if (providerStatus >= 500) {
    return "AI provider is temporarily unavailable.";
  }

  return "AI provider rejected the request.";
}

function mapProviderStatusToHttpStatus(providerStatus: number): HttpStatus {
  if (providerStatus === 401 || providerStatus === 403 || providerStatus === 404) {
    return HttpStatus.BAD_REQUEST;
  }

  if (providerStatus === 402 || providerStatus === 429) {
    return HttpStatus.TOO_MANY_REQUESTS;
  }

  if (providerStatus >= 500) {
    return HttpStatus.SERVICE_UNAVAILABLE;
  }

  if (providerStatus === 400) {
    return HttpStatus.BAD_REQUEST;
  }

  return HttpStatus.BAD_GATEWAY;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}
