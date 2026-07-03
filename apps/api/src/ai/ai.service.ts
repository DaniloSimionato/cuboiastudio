import { Injectable } from "@nestjs/common";
import { AiSettingsService } from "../ai-settings/ai-settings.service";
import { runOpenAiCompatibleChatCompletion } from "./ai-runner";
import type {
  AiChatCompletionInput,
  AiChatCompletionResult,
  AiProviderStatus,
  AiResolvedRuntimeConfig,
} from "./ai.types";

@Injectable()
export class AiService {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  async getStatus(companyId?: string): Promise<AiProviderStatus> {
    return this.aiSettingsService.getStatus(companyId);
  }

  async isRuntimeEnabled(companyId?: string): Promise<boolean> {
    return this.aiSettingsService.isRuntimeEnabled(companyId);
  }

  async isProviderConfigured(companyId?: string, model?: string): Promise<boolean> {
    const runtime = await this.resolveRuntimeConfig(companyId);
    const resolvedModel = model?.trim() || runtime.model;

    return runtime.baseUrl.length > 0 && resolvedModel.length > 0 && runtime.apiKey.length > 0;
  }

  async resolveRuntimeConfig(companyId?: string): Promise<AiResolvedRuntimeConfig> {
    return this.aiSettingsService.resolveRuntimeConfig(companyId);
  }

  async generateChatCompletion(input: AiChatCompletionInput): Promise<AiChatCompletionResult> {
    const runtime = await this.resolveRuntimeConfig(input.companyId);

    return runOpenAiCompatibleChatCompletion(runtime, input);
  }
}
