import { apiFetch } from "./apiClient";
import type {
  ChatwootInboxConfigItem,
  ChatwootInboxConfigTestResponse,
  UpsertChatwootInboxConfigPayload,
} from "@/types";

export const chatwootSettingsService = {
  async list(): Promise<ChatwootInboxConfigItem[]> {
    return apiFetch<ChatwootInboxConfigItem[]>("/settings/chatwoot/inboxes");
  },

  async get(id: string): Promise<ChatwootInboxConfigItem> {
    return apiFetch<ChatwootInboxConfigItem>(`/settings/chatwoot/inboxes/${id}`);
  },

  async create(payload: UpsertChatwootInboxConfigPayload): Promise<ChatwootInboxConfigItem> {
    return apiFetch<ChatwootInboxConfigItem>("/settings/chatwoot/inboxes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(
    id: string,
    payload: UpsertChatwootInboxConfigPayload,
  ): Promise<ChatwootInboxConfigItem> {
    return apiFetch<ChatwootInboxConfigItem>(`/settings/chatwoot/inboxes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<{ ok: true }> {
    return apiFetch<{ ok: true }>(`/settings/chatwoot/inboxes/${id}`, {
      method: "DELETE",
    });
  },

  async test(id: string): Promise<ChatwootInboxConfigTestResponse> {
    return apiFetch<ChatwootInboxConfigTestResponse>(`/settings/chatwoot/inboxes/${id}/test`, {
      method: "POST",
    });
  },
};
