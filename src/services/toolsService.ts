import { apiFetch } from "./apiClient";

export interface CustomWebhookAction {
  id: string;
  companyId: string;
  installationId: string;
  name: string;
  displayName: string;
  descriptionAdmin?: string | null;
  descriptionAi?: string | null;
  method: string;
  url: string;
  headers?: any;
  authType?: string | null;
  authConfig?: any;
  bodyTemplate?: string | null;
  parameterSchema?: any;
  timeoutMs: number;
  permissionType: string;
  requiresConfirmation: boolean;
  responseFilter?: any;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const toolsService = {
  async list(): Promise<CustomWebhookAction[]> {
    return apiFetch<CustomWebhookAction[]>("/webhook-actions");
  },

  async create(input: Partial<CustomWebhookAction>): Promise<CustomWebhookAction> {
    return apiFetch<CustomWebhookAction>("/webhook-actions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async update(id: string, input: Partial<CustomWebhookAction>): Promise<CustomWebhookAction> {
    return apiFetch<CustomWebhookAction>(`/webhook-actions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/webhook-actions/${id}`, {
      method: "DELETE",
    });
  },
};
