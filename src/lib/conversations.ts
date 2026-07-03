import type {
  BackendConversationChannelType,
  BackendConversationItem,
  BackendConversationSource,
} from "../types/index.ts";

export function isOperationalConversationSource(source: BackendConversationSource | null | undefined): boolean {
  return source === "MANUAL_TEST";
}

export function isOperationalConversation(
  conversation: Pick<BackendConversationItem, "source" | "status"> | null | undefined,
): boolean {
  return Boolean(conversation) &&
    conversation.status === "ACTIVE" &&
    isOperationalConversationSource(conversation.source);
}

export function filterOperationalConversations(
  conversations: BackendConversationItem[],
): BackendConversationItem[] {
  return conversations.filter((conversation) => isOperationalConversation(conversation));
}

export function resolveOperationalConversationId(
  conversations: BackendConversationItem[],
  preferredConversationId?: string | null,
): string {
  const visibleConversations = filterOperationalConversations(conversations);

  if (!preferredConversationId) {
    return visibleConversations[0]?.id ?? "";
  }

  return visibleConversations.some((conversation) => conversation.id === preferredConversationId)
    ? preferredConversationId
    : (visibleConversations[0]?.id ?? "");
}

function isGenericManualTestTitle(title: string): boolean {
  return (
    title === "Atendimento de teste" ||
    title.startsWith("Teste manual - ") ||
    title.startsWith("Assistente Smoke Test")
  );
}

export function formatConversationPrimaryLabel(conversation: BackendConversationItem): string {
  const title = conversation.title?.trim();
  if (title && !isGenericManualTestTitle(title)) {
    return title;
  }

  return `Teste manual - ${formatConversationTimestamp(conversation.lastMessageAt ?? conversation.createdAt)}`;
}

export function formatConversationSecondaryLabel(conversation: BackendConversationItem): string {
  const parts = [
    formatConversationSourceLabel(conversation.source),
    formatConversationChannelLabel(conversation.channelType),
    conversation.externalConversationId ? `Ext ${conversation.externalConversationId}` : null,
    conversation.id ? `ID ${conversation.id}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" · ");
}

export function formatConversationSourceLabel(
  source: BackendConversationSource | null | undefined,
): string {
  switch (source) {
    case "MANUAL_TEST":
      return "Manual Test";
    case "CHATWOOT":
      return "Chatwoot";
    case "SMOKE":
      return "Smoke";
    case "SYSTEM":
      return "Sistema";
    default:
      return "Desconhecida";
  }
}

export function formatConversationChannelLabel(
  channelType: BackendConversationChannelType | null | undefined,
): string {
  switch (channelType) {
    case "WHATSAPP":
      return "WhatsApp";
    case "INSTAGRAM":
      return "Instagram";
    case "WEBCHAT":
      return "Webchat";
    default:
      return "";
  }
}

function formatConversationTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
