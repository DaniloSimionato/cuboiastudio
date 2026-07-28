import { apiFetch } from "./apiClient";

export type UsageSummary = {
  source: "openai" | "not_configured" | "unavailable";
  message: string | null;
  generatedAt: string;
  currency: "USD";
  month: {
    totalTokens: number;
    requests: number;
    actualCost: number;
    previousActualCost: number;
  };
  dailyCosts: Array<{ date: string; cost: number }>;
  byModel: Array<{ model: string; tokens: number; requests: number; share: number }>;
  runtime: {
    averageResponseMs: number;
    resolvedConversations: number;
    handoffs: number;
  };
};

export const usageService = {
  getSummary(): Promise<UsageSummary> {
    return apiFetch<UsageSummary>("/usage/summary");
  },
};
