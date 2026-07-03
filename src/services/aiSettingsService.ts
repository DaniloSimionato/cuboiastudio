import { apiFetch } from "./apiClient";
import type {
  AiSettings,
  AiSettingsOptions,
  TestAiSettingsPayload,
  TestAiSettingsResponse,
  UpdateAiSettingsPayload,
} from "@/types";

export const aiSettingsService = {
  async get(): Promise<AiSettings> {
    return apiFetch<AiSettings>("/settings/ai");
  },

  async getOptions(): Promise<AiSettingsOptions> {
    return apiFetch<AiSettingsOptions>("/settings/ai/options");
  },

  async save(payload: UpdateAiSettingsPayload): Promise<AiSettings> {
    return apiFetch<AiSettings>("/settings/ai", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async test(payload: TestAiSettingsPayload = {}): Promise<TestAiSettingsResponse> {
    return apiFetch<TestAiSettingsResponse>("/settings/ai/test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteApiKey(): Promise<{ apiKeyConfigured: boolean }> {
    return apiFetch<{ apiKeyConfigured: boolean }>("/settings/ai/api-key", {
      method: "DELETE",
    });
  },
};
