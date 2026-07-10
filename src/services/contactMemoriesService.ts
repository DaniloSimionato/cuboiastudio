import type { ContactMemoryCategory } from "@/types";
import { apiFetch } from "./apiClient";

export interface ProfileStats {
  totalCount: number;
  activeCount: number;
  expiredCount: number;
  lastUpdatedAt: string;
  lastUsedAt: string | null;
  firstConversationAt: string;
  lastConversationAt: string;
}

export interface ContactMemoryProfile {
  id: string;
  companyId: string;
  assistantId: string | null;
  identityKey: string;
  channelType: string;
  externalAccountId: string | null;
  externalContactId: string | null;
  externalInboxId: string | null;
  chatwootContactId: string | null;
  phoneNormalized: string | null;
  displayName: string | null;
  summary: string | null;
  lastInteractionAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: ProfileStats;
}

export interface ContactMemoryItem {
  id: string;
  profileId: string;
  companyId: string;
  category: ContactMemoryCategory;
  key: string;
  value: string;
  valueJson: any;
  confidence: number;
  active: boolean;
  sourceType: string;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  expiresAt: string | null;
  lastSeenAt: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: ContactMemoryProfile;
}

export interface ContactMemoryEvent {
  id: string;
  memoryItemId: string;
  companyId: string;
  eventType: string;
  previousValue: string | null;
  newValue: string | null;
  sourceType: string;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  userId: string | null;
  createdAt: string;
}

export interface ContactMemoriesListResponse {
  items: ContactMemoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactMemoryProfilesListResponse {
  items: (ContactMemoryProfile & { _count: { items: number } })[];
  total: number;
  page: number;
  limit: number;
}

function toQueryString(query: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) return;
    params.set(key, String(value));
  });
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
}

export const contactMemoriesService = {
  async listItems(
    query: {
      profileId?: string;
      channelType?: string;
      category?: string;
      active?: boolean;
      expired?: boolean;
      sourceType?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<ContactMemoriesListResponse> {
    return apiFetch<ContactMemoriesListResponse>(
      `/contact-memories${toQueryString({
        profileId: query.profileId,
        channelType: query.channelType,
        category: query.category,
        active: typeof query.active === "boolean" ? query.active : undefined,
        expired: typeof query.expired === "boolean" ? query.expired : undefined,
        sourceType: query.sourceType,
        search: query.search,
        page: query.page,
        limit: query.limit,
      })}`,
    );
  },

  async getItem(id: string): Promise<ContactMemoryItem> {
    return apiFetch<ContactMemoryItem>(`/contact-memories/${id}`);
  },

  async listProfiles(
    query: {
      channelType?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<ContactMemoryProfilesListResponse> {
    return apiFetch<ContactMemoryProfilesListResponse>(
      `/contact-memories/profiles${toQueryString({
        channelType: query.channelType,
        search: query.search,
        page: query.page,
        limit: query.limit,
      })}`,
    );
  },

  async getProfile(
    profileId: string,
  ): Promise<ContactMemoryProfile & { items: ContactMemoryItem[] }> {
    return apiFetch<ContactMemoryProfile & { items: ContactMemoryItem[] }>(
      `/contact-memories/profiles/${profileId}`,
    );
  },

  async createItem(input: {
    profileId: string;
    category: ContactMemoryCategory;
    key: string;
    value: string;
    valueJson?: any;
    confidence?: number;
    expiresAt?: string | null;
  }): Promise<ContactMemoryItem> {
    return apiFetch<ContactMemoryItem>("/contact-memories", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateItem(
    id: string,
    updates: Partial<
      Pick<ContactMemoryItem, "category" | "key" | "value" | "valueJson" | "confidence" | "active">
    > & { expiresAt?: string | null },
  ): Promise<ContactMemoryItem> {
    return apiFetch<ContactMemoryItem>(`/contact-memories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async deleteItem(id: string): Promise<{ success: boolean; item: ContactMemoryItem | null }> {
    return apiFetch<{ success: boolean; item: ContactMemoryItem | null }>(
      `/contact-memories/${id}`,
      {
        method: "DELETE",
      },
    );
  },

  async getEvents(id: string): Promise<ContactMemoryEvent[]> {
    return apiFetch<ContactMemoryEvent[]>(`/contact-memories/${id}/events`);
  },

  async getStats(): Promise<ContactMemoryStatsResponse> {
    return apiFetch<ContactMemoryStatsResponse>("/contact-memories/stats");
  },
};

export interface ContactMemoryStatsResponse {
  totalMemories: number;
  activeMemories: number;
  temporaryMemories: number;
  expiredMemories: number;
  averagePerContact: number;
  topCategories: Array<{ category: ContactMemoryCategory; count: number }>;
  topContacts: Array<{
    profileId: string;
    displayName: string;
    phoneNormalized: string;
    count: number;
  }>;
}
