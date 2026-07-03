import type { AiChatCompletionMessage } from "../ai/ai.types";

type AssistantKnowledgeInput = {
  id: string;
  title: string;
  content: string;
};

type AssistantConversationHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantRuntimeSource = {
  id: string;
  title: string;
};

type AssistantConversationPromptInput = {
  assistantName: string;
  assistantDescription?: string | null;
  initialMessage?: string | null;
  instructions?: string | null;
  knowledgeItems: AssistantKnowledgeInput[];
  historyMessages: AssistantConversationHistoryMessage[];
  currentMessage: string;
};

const MAX_PROMPT_TEXT_LENGTH = 1200;
const MAX_HISTORY_MESSAGE_LENGTH = 1000;

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}…`;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function extractKeywords(question: string): string[] {
  return Array.from(
    new Set(
      normalizeText(question)
        .split(/[^a-z0-9]+/iu)
        .filter((term) => term.length >= 3),
    ),
  );
}

function scoreKnowledgeItem(
  knowledge: AssistantKnowledgeInput,
  keywords: string[],
  fallbackIndex: number,
): number {
  if (keywords.length === 0) {
    return 1000 - fallbackIndex;
  }

  const searchableText = normalizeText(`${knowledge.title} ${knowledge.content}`);
  let score = 0;

  for (const keyword of keywords) {
    if (searchableText.includes(keyword)) {
      score += 10;

      if (normalizeText(knowledge.title).includes(keyword)) {
        score += 5;
      }
    }
  }

  return score > 0 ? score * 1000 - fallbackIndex : -fallbackIndex;
}

export function buildDeterministicAssistantResponse(input: {
  question: string;
  assistantName?: string | null;
  instructions?: string | null;
  knowledgeItems: AssistantKnowledgeInput[];
}): {
  answer: string;
  sources: AssistantRuntimeSource[];
} {
  const keywords = extractKeywords(input.question);
  const rankedKnowledge = [...input.knowledgeItems].sort((left, right) => {
    const leftIndex = input.knowledgeItems.indexOf(left);
    const rightIndex = input.knowledgeItems.indexOf(right);

    return (
      scoreKnowledgeItem(right, keywords, rightIndex) -
      scoreKnowledgeItem(left, keywords, leftIndex)
    );
  });

  const selectedKnowledge = rankedKnowledge.slice(0, 5);
  const sources = selectedKnowledge.map((knowledge) => ({
    id: knowledge.id,
    title: knowledge.title,
  }));

  const assistantName = input.assistantName?.trim() || "este assistente";
  const persona = input.instructions?.trim()
    ? `Seguindo a persona/instruções configuradas para ${assistantName},`
    : `Como ${assistantName},`;
  const answer =
    sources.length === 0
      ? `${persona} ainda não tenho conhecimento cadastrado suficiente para responder com segurança.`
      : `${persona} encontrei estes conteúdos relacionados na base de conhecimento: ${selectedKnowledge
          .map((knowledge) => `${knowledge.title}: ${knowledge.content}`)
          .join(" | ")}`;

  return {
    answer,
    sources,
  };
}

export function buildConversationPromptMessages(
  input: AssistantConversationPromptInput,
): AiChatCompletionMessage[] {
  const messages: AiChatCompletionMessage[] = [
    {
      role: "system",
      content:
        "Você é um assistente configurado no Cubo AI Studio. Responda em português do Brasil, salvo se o usuário pedir outro idioma. Siga as instruções do assistente. Use a base de conhecimento fornecida quando ela for relevante. Se não souber a resposta, diga que não sabe. Não invente informações que não estejam no contexto.",
    },
  ];

  const assistantIdentity = [
    `Nome do assistente: ${input.assistantName}`,
    input.assistantDescription?.trim()
      ? `Descrição do assistente: ${truncateText(input.assistantDescription.trim(), 500)}`
      : null,
  ].filter((line): line is string => line !== null);

  messages.push({
    role: "system",
    content: assistantIdentity.join("\n"),
  });

  const initialMessage = input.initialMessage?.trim();
  if (initialMessage) {
    messages.push({
      role: "system",
      content: `Mensagem inicial configurada do assistente:\n${truncateText(initialMessage, MAX_HISTORY_MESSAGE_LENGTH)}`,
    });
  }

  const instructions = input.instructions?.trim();
  if (instructions) {
    messages.push({
      role: "system",
      content: `Instruções do assistente:\n${instructions}`,
    });
  }

  if (input.knowledgeItems.length > 0) {
    messages.push({
      role: "system",
      content: [
        "Base de conhecimento:",
        ...input.knowledgeItems.map(
          (item, index) =>
            `${index + 1}. Título: ${item.title}\n   Conteúdo: ${truncateText(item.content, MAX_PROMPT_TEXT_LENGTH)}`,
        ),
      ].join("\n"),
    });
  }

  for (const message of input.historyMessages) {
    messages.push({
      role: message.role,
      content: truncateText(message.content, MAX_HISTORY_MESSAGE_LENGTH),
    });
  }

  messages.push({
    role: "user",
    content: truncateText(input.currentMessage, MAX_HISTORY_MESSAGE_LENGTH),
  });

  return messages;
}

export function toAssistantRuntimeSources(value: unknown): AssistantRuntimeSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "title" in item &&
        typeof (item as { id: unknown }).id === "string" &&
        typeof (item as { title: unknown }).title === "string"
      ) {
        return {
          id: (item as { id: string }).id,
          title: (item as { title: string }).title,
        };
      }

      return null;
    })
    .filter((item): item is AssistantRuntimeSource => item !== null);
}
