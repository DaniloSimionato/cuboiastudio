import { apiFetch } from "./apiClient";
import type {
  BackendConversationItem,
  BackendConversationMessageItem,
  BackendConversationSendRequest,
  BackendConversationSendResponse,
} from "@/types";

type ConversationsResponse = {
  items: BackendConversationItem[];
};

type MessagesResponse = {
  items: BackendConversationMessageItem[];
};

export const backendConversationsService = {
  async create(
    assistantId: string,
    input: { title?: string },
    options: { signal?: AbortSignal } = {},
  ): Promise<BackendConversationItem> {
    return apiFetch<BackendConversationItem>(`/assistants/${assistantId}/conversations`, {
      method: "POST",
      body: JSON.stringify(input ?? {}),
      signal: options.signal,
    });
  },

  async list(
    assistantId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<BackendConversationItem[]> {
    const response = await apiFetch<ConversationsResponse>(
      `/assistants/${assistantId}/conversations`,
      { signal: options.signal },
    );
    return response.items;
  },

  async messages(
    assistantId: string,
    conversationId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<BackendConversationMessageItem[]> {
    const response = await apiFetch<MessagesResponse>(
      `/assistants/${assistantId}/conversations/${conversationId}/messages`,
      { signal: options.signal },
    );
    return response.items;
  },

  async send(
    assistantId: string,
    conversationId: string,
    input: BackendConversationSendRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<BackendConversationSendResponse> {
    return apiFetch<BackendConversationSendResponse>(
      `/assistants/${assistantId}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(input ?? {}),
        signal: options.signal,
      },
    );
  },

  async sendMultipart(
    assistantId: string,
    conversationId: string,
    input: BackendConversationSendRequest,
    files: Blob[],
    options: { signal?: AbortSignal } = {},
  ): Promise<BackendConversationSendResponse> {
    const formData = new FormData();
    formData.append("payload", JSON.stringify(input ?? {}));

    files.forEach((file, index) => {
      const attachment = input.attachments?.[index];
      formData.append("attachments", file, attachment?.fileName ?? `attachment-${index + 1}`);
    });

    return apiFetch<BackendConversationSendResponse>(
      `/assistants/${assistantId}/conversations/${conversationId}/messages/multipart`,
      {
        method: "POST",
        body: formData,
        signal: options.signal,
      },
    );
  },
};
