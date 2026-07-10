import { apiFetch } from "./apiClient";
import type {
  BackendAssistantListItem,
  BackendAssistantPreviewResponse,
  BackendAssistantResponse,
  BackendAssistantRunResponse,
  BackendStatus,
  AssistantSecurityRuleItem,
} from "@/types";

type AssistantsListResponse = {
  items: BackendAssistantListItem[];
};

type AssistantKnowledgeListResponse = {
  items: Array<{
    id: string;
    title: string;
    content: string;
    status: BackendStatus;
    processingStatus: string;
    chunkCount: number;
    processedAt?: string;
    processingError?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: any;
  }>;
};

export type AssistantKnowledgeSearchResult = {
  query: string;
  totalChunksScanned: number;
  results: Array<{
    knowledgeId: string;
    knowledgeTitle: string;
    chunkId: string;
    chunkIndex: number;
    contentPreview: string;
    score: number;
    metadata?: any;
  }>;
  warning?: string;
};

type PreviewLogsResponse = {
  items: Array<{
    id: string;
    question: string;
    answer: string;
    mode: string;
    sources: Array<{ id: string; title: string }>;
    createdAt: string;
  }>;
};

type AssistantSecurityRulesListResponse = {
  items: AssistantSecurityRuleItem[];
};

export const backendAssistantsService = {
  async list(options: { signal?: AbortSignal } = {}): Promise<BackendAssistantListItem[]> {
    const response = await apiFetch<AssistantsListResponse>("/assistants", {
      signal: options.signal,
    });
    return response.items;
  },

  async get(id: string): Promise<BackendAssistantResponse> {
    return apiFetch<BackendAssistantResponse>(`/assistants/${id}`);
  },

  async create(input: {
    name: string;
    description?: string | null;
    businessAddress?: string | null;
    businessCityRegion?: string | null;
    businessCity?: string | null;
    businessState?: string | null;
    businessPostalCode?: string | null;
    businessPhone?: string | null;
    businessWhatsapp?: string | null;
    businessWhatsappSupport?: string | null;
    websiteUrl?: string | null;
    timezone?: string | null;
    googleMapsUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    weeklySchedule?: any | null;
    aiAlwaysAvailable?: boolean;
    initialMessage?: string | null;
    instructions?: string | null;
    personality?: string | null;
    toneOfVoice?: string | null;
    avoidPhrases?: string | null;
    model?: string | null;
    temperature?: number | null;
    fallbackMessage?: string | null;
    safetyInstruction?: string | null;
    ragEnabled?: boolean;
    messageBufferEnabled?: boolean;
    messageBufferSeconds?: number;
    splitResponseEnabled?: boolean;
    splitResponseStyle?: string | null;
  }): Promise<BackendAssistantResponse> {
    return apiFetch<BackendAssistantResponse>("/assistants", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async update(
    id: string,
    input: {
      name?: string;
      description?: string | null;
      businessAddress?: string | null;
      businessCityRegion?: string | null;
      businessCity?: string | null;
      businessState?: string | null;
      businessPostalCode?: string | null;
      businessPhone?: string | null;
      businessWhatsapp?: string | null;
      businessWhatsappSupport?: string | null;
      websiteUrl?: string | null;
      timezone?: string | null;
      googleMapsUrl?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      weeklySchedule?: any | null;
      aiAlwaysAvailable?: boolean;
      initialMessage?: string | null;
      instructions?: string | null;
      personality?: string | null;
      toneOfVoice?: string | null;
      avoidPhrases?: string | null;
      model?: string | null;
      temperature?: number | null;
      fallbackMessage?: string | null;
      safetyInstruction?: string | null;
      ragEnabled?: boolean;
      messageBufferEnabled?: boolean;
      messageBufferSeconds?: number;
      splitResponseEnabled?: boolean;
      splitResponseStyle?: string | null;
    },
  ): Promise<BackendAssistantResponse> {
    return apiFetch<BackendAssistantResponse>(`/assistants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async updateStatus(id: string, status: BackendStatus): Promise<BackendAssistantResponse> {
    return apiFetch<BackendAssistantResponse>(`/assistants/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async preview(
    id: string,
    question: string,
    usePreparedKnowledge?: boolean,
  ): Promise<BackendAssistantPreviewResponse> {
    return apiFetch<BackendAssistantPreviewResponse>(`/assistants/${id}/preview`, {
      method: "POST",
      body: JSON.stringify({ question, usePreparedKnowledge }),
    });
  },

  async run(id: string, message: string): Promise<BackendAssistantRunResponse> {
    return apiFetch<BackendAssistantRunResponse>(`/assistants/${id}/run`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  async previewLogs(assistantId: string): Promise<PreviewLogsResponse> {
    return apiFetch<PreviewLogsResponse>(`/assistants/${assistantId}/preview-logs`);
  },

  async securityRulesList(assistantId: string): Promise<AssistantSecurityRuleItem[]> {
    const response = await apiFetch<AssistantSecurityRulesListResponse>(
      `/assistants/${assistantId}/security-rules`,
    );
    return response.items;
  },

  async securityRuleCreate(
    assistantId: string,
    input: {
      name: string;
      ruleType: string;
      instruction: string;
      sortOrder?: number;
    },
  ): Promise<AssistantSecurityRuleItem> {
    return apiFetch<AssistantSecurityRuleItem>(`/assistants/${assistantId}/security-rules`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async securityRuleUpdate(
    assistantId: string,
    ruleId: string,
    input: {
      name?: string;
      ruleType?: string;
      instruction?: string;
      status?: BackendStatus;
      sortOrder?: number;
    },
  ): Promise<AssistantSecurityRuleItem> {
    return apiFetch<AssistantSecurityRuleItem>(
      `/assistants/${assistantId}/security-rules/${ruleId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  async securityRuleDelete(
    assistantId: string,
    ruleId: string,
  ): Promise<AssistantSecurityRuleItem> {
    return apiFetch<AssistantSecurityRuleItem>(
      `/assistants/${assistantId}/security-rules/${ruleId}`,
      {
        method: "DELETE",
      },
    );
  },

  async knowledgeList(assistantId: string): Promise<AssistantKnowledgeListResponse["items"]> {
    const response = await apiFetch<AssistantKnowledgeListResponse>(
      `/assistants/${assistantId}/knowledge`,
    );
    return response.items;
  },

  async knowledgeCreate(
    assistantId: string,
    input: { title: string; content: string; metadata?: any },
  ): Promise<AssistantKnowledgeListResponse["items"][number]> {
    return apiFetch<AssistantKnowledgeListResponse["items"][number]>(
      `/assistants/${assistantId}/knowledge`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  },

  async knowledgeUpdate(
    assistantId: string,
    knowledgeId: string,
    input: { title?: string; content?: string; status?: BackendStatus; metadata?: any },
  ): Promise<AssistantKnowledgeListResponse["items"][number]> {
    return apiFetch<AssistantKnowledgeListResponse["items"][number]>(
      `/assistants/${assistantId}/knowledge/${knowledgeId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  async knowledgeDelete(
    assistantId: string,
    knowledgeId: string,
  ): Promise<AssistantKnowledgeListResponse["items"][number]> {
    return apiFetch<AssistantKnowledgeListResponse["items"][number]>(
      `/assistants/${assistantId}/knowledge/${knowledgeId}`,
      {
        method: "DELETE",
      },
    );
  },

  async knowledgePrepare(
    assistantId: string,
    knowledgeId: string,
  ): Promise<AssistantKnowledgeListResponse["items"][number]> {
    return apiFetch<AssistantKnowledgeListResponse["items"][number]>(
      `/assistants/${assistantId}/knowledge/${knowledgeId}/prepare`,
      {
        method: "POST",
      },
    );
  },

  async knowledgeSearch(
    assistantId: string,
    query: string,
    topK: number = 5,
  ): Promise<AssistantKnowledgeSearchResult> {
    return apiFetch<AssistantKnowledgeSearchResult>(`/assistants/${assistantId}/knowledge/search`, {
      method: "POST",
      body: JSON.stringify({ query, topK }),
    });
  },
};
