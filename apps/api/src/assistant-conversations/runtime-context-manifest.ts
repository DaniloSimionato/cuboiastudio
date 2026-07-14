import { createHash } from "node:crypto";

export const RUNTIME_CONTEXT_MANIFEST_VERSION = "runtime-context-v1";

export type RuntimePromptSectionManifest = {
  name: string;
  role: string;
  charCount: number;
};

export type RuntimeKnowledgeSearchResult = {
  knowledgeId: string;
  knowledgeTitle: string;
  chunkId: string;
  contentPreview: string;
  score?: number | null;
};

export const DEFAULT_RAG_SCORE_THRESHOLD = 0.7;

export function hashRuntimeText(value: string | null | undefined): string | null {
  const normalized = typeof value === "string" ? value : "";
  return normalized.trim().length > 0
    ? createHash("sha256").update(normalized).digest("hex")
    : null;
}

function labelPromptSection(message: { role: string; content?: unknown }): string {
  const firstLine = String(message.content ?? "").split("\n", 1)[0];

  if (firstLine.startsWith("REGRAS DE SEGURANÇA")) return "security";
  if (firstLine.startsWith("IDENTIDADE E ESCOPO")) return "identity";
  if (firstLine.startsWith("INSTRUÇÕES GERAIS")) return "assistant-instructions";
  if (firstLine.startsWith("POLÍTICA DE CONVERSA")) return "behavior";
  if (firstLine.startsWith("EXPRESSÕES A EVITAR")) return "avoid-phrases";
  if (firstLine.startsWith("ESCOPO OPERACIONAL")) return "operational-scope";
  if (firstLine.startsWith("CONTEXTO OFICIAL")) return "official-context";
  if (firstLine.startsWith("INSTRUÇÕES DO SISTEMA DE RESERVAS")) return "calendar";
  if (firstLine.startsWith("MEMÓRIA")) return "memory";
  if (firstLine.startsWith("MENSAGEM INICIAL")) return "initial-message";
  if (firstLine.startsWith("INSTRUÇÕES DO FLUXO")) return "flow";
  if (firstLine.startsWith("CONTEXTO ESTRUTURADO DO FLOW")) return "triage-flow-context";
  if (firstLine.startsWith("BASE DE CONHECIMENTO")) return "knowledge";
  if (firstLine.startsWith("DECISÃO DE TRIAGEM")) return "triage";
  if (firstLine.startsWith("HISTÓRICO DA CONVERSA")) return "history-policy";

  if (message.role === "user") return "current-message";
  if (message.role === "assistant") return "history-assistant";
  if (message.role === "tool") return "history-tool";
  return "system-context";
}

export function buildPromptSectionManifest(
  messages: Array<{ role: string; content?: unknown }>,
): RuntimePromptSectionManifest[] {
  return messages.map((message) => ({
    name: labelPromptSection(message),
    role: message.role,
    charCount: String(message.content ?? "").length,
  }));
}

export function selectRuntimeKnowledgeItems(input: {
  ragEnabled: boolean;
  results?: RuntimeKnowledgeSearchResult[] | null;
  threshold?: number | null;
  filteredOutCount?: number;
  filteredOutScoreRange?: { min: number; max: number } | null;
  warning?: string | null;
}) {
  const threshold =
    typeof input.threshold === "number" && Number.isFinite(input.threshold)
      ? input.threshold
      : DEFAULT_RAG_SCORE_THRESHOLD;

  if (!input.ragEnabled) {
    return {
      items: [] as Array<{ id: string; title: string; content: string }>,
      manifest: {
        ragEnabled: false,
        threshold,
        selectedCount: 0,
        selectedItems: [],
        rejectedCount: 0,
        rejectedScoreRange: null,
        rejectionReason: "rag_disabled",
        warning: null,
      },
    };
  }

  const results = input.results ?? [];
  return {
    items: results.map((result) => ({
      id: result.chunkId,
      title: result.knowledgeTitle,
      content: result.contentPreview,
    })),
    manifest: {
      ragEnabled: true,
      threshold,
      selectedCount: results.length,
      selectedItems: results.map((result) => ({
        knowledgeId: result.knowledgeId,
        chunkId: result.chunkId,
        score: result.score ?? null,
        reason: "score_at_or_above_threshold",
      })),
      rejectedCount: input.filteredOutCount ?? 0,
      rejectedScoreRange: input.filteredOutScoreRange ?? null,
      rejectionReason:
        (input.filteredOutCount ?? 0) > 0 ? "score_below_threshold" : null,
      warning: input.warning ?? null,
    },
  };
}

export function normalizeRagScoreThreshold(value: unknown): {
  threshold: number;
  source: "default" | "explicit" | "default_invalid";
} {
  if (value === undefined || value === null || value === "") {
    return { threshold: DEFAULT_RAG_SCORE_THRESHOLD, source: "default" };
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return { threshold: DEFAULT_RAG_SCORE_THRESHOLD, source: "default_invalid" };
  }

  return { threshold: parsed, source: "explicit" };
}

export function resolveRuntimeFallbackAnswer(input: {
  configuredFallbackMessage?: string | null;
  deterministicAnswer: string;
}): { answer: string; configuredMessageUsed: boolean } {
  const configuredMessage = input.configuredFallbackMessage?.trim() || null;
  return {
    answer: configuredMessage || input.deterministicAnswer,
    configuredMessageUsed: Boolean(configuredMessage),
  };
}
