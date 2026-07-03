/** logsService — logs reais de runtime de IA. Segredos nunca saem do backend. */
import { apiFetch } from "./apiClient";
import type { AiRuntimeLogDetail, AiRuntimeLogListItem, AiRuntimeLogsQuery } from "@/types";

export const logsService = {
  async list(query: AiRuntimeLogsQuery = {}): Promise<AiRuntimeLogListItem[]> {
    const params = new URLSearchParams();

    if (query.assistantId) params.set("assistantId", query.assistantId);
    if (query.conversationId) params.set("conversationId", query.conversationId);
    if (query.mode) params.set("mode", query.mode);
    if (query.status) params.set("status", query.status);
    if (typeof query.fallback === "boolean") params.set("fallback", String(query.fallback));
    if (query.limit) params.set("limit", String(query.limit));

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await apiFetch<{ items: AiRuntimeLogListItem[] }>(`/logs/ai${suffix}`);
    return response.items;
  },

  async get(id: string): Promise<AiRuntimeLogDetail> {
    return apiFetch<AiRuntimeLogDetail>(`/logs/ai/${id}`);
  },
};
