import { apiFetch } from "../apiClient";
import { type AssistantBehavior } from "../../types/assistant-behavior.types";

export const assistantBehaviorsService = {
  findByAssistantId: async (assistantId: string): Promise<AssistantBehavior | null> => {
    try {
      return await apiFetch<AssistantBehavior>(`/assistants/${assistantId}/behavior`);
    } catch (error: any) {
      if (error.status === 404 || error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  upsert: async (assistantId: string, data: Partial<AssistantBehavior>): Promise<AssistantBehavior> => {
    return await apiFetch<AssistantBehavior>(`/assistants/${assistantId}/behavior`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
  },
};
