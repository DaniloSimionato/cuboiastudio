export type AiRuntimeMode = "deterministic-fallback" | "ai-provider-test";

export interface AiProviderStatus {
  runtimeEnabled: boolean;
  provider: string;
  baseUrlConfigured: boolean;
  modelConfigured: boolean;
  apiKeyConfigured: boolean;
  source: "tenant-settings" | "env-fallback" | "mixed" | "unavailable";
  tenantSettingsConfigured: boolean;
  envFallbackConfigured: boolean;
  mode: "deterministic-fallback";
}

export interface AiRuntimeConfig {
  runtimeEnabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  requestTimeoutMs: number;
}

export interface AiResolvedRuntimeConfig extends AiRuntimeConfig {
  source: "tenant-settings" | "env-fallback" | "mixed" | "unavailable";
  tenantSettingsConfigured: boolean;
  envFallbackConfigured: boolean;
  apiKeyConfigured: boolean;
}

export interface AiChatCompletionMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface AiChatCompletionInput {
  messages: AiChatCompletionMessage[];
  temperature?: number;
  model?: string;
  companyId?: string;
  tools?: any[];
}

export interface AiChatCompletionResult {
  provider: string;
  model: string;
  answer: string;
  durationMs: number;
  toolCalls?: any[];
}

export interface AiEmbeddingInput {
  text: string;
  model?: string;
  companyId?: string;
}

export interface AiEmbeddingResult {
  provider: string;
  model: string;
  embedding: number[];
  dimension: number;
  durationMs: number;
}

export interface AiProviderErrorDetails {
  message: string;
  type?: string;
  code?: string;
  param?: string;
}

export interface AiProviderErrorResponse {
  message: string;
  providerStatus: number;
  providerError: AiProviderErrorDetails;
}

export interface AiProviderTestDisabledResponse {
  mode: AiRuntimeMode;
  runtimeEnabled: boolean;
  provider: string;
  message: string;
}

export interface AiProviderTestSuccessResponse extends AiChatCompletionResult {
  mode: AiRuntimeMode;
}

export const AI_PROVIDER_TEST_DEFAULT_MESSAGE = "Responda apenas: ok";
