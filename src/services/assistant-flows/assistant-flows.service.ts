import { apiFetch } from "../apiClient";
import { type AssistantFlow, type CreateAssistantFlowDto, type UpdateAssistantFlowDto } from "../../types/assistant-flow.types";

export const assistantFlowsService = {
  findAll: async (assistantId: string): Promise<AssistantFlow[]> => {
    return await apiFetch<AssistantFlow[]>(`/assistants/${assistantId}/flows`);
  },

  findOne: async (assistantId: string, flowId: string): Promise<AssistantFlow> => {
    return await apiFetch<AssistantFlow>(`/assistants/${assistantId}/flows/${flowId}`);
  },

  create: async (assistantId: string, data: CreateAssistantFlowDto): Promise<AssistantFlow> => {
    return await apiFetch<AssistantFlow>(`/assistants/${assistantId}/flows`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
  },

  update: async (assistantId: string, flowId: string, data: UpdateAssistantFlowDto): Promise<AssistantFlow> => {
    return await apiFetch<AssistantFlow>(`/assistants/${assistantId}/flows/${flowId}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
  },

  delete: async (assistantId: string, flowId: string): Promise<void> => {
    await apiFetch(`/assistants/${assistantId}/flows/${flowId}`, {
      method: "DELETE",
    });
  },
};
