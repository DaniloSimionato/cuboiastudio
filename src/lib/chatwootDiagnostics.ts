import type { ChatwootInboxConfigItem } from "@/types";

export type ChannelChecklistItem = {
  label: string;
  complete: boolean;
};

function isResponseAfterWebhook(channel: ChatwootInboxConfigItem): boolean {
  if (!channel.lastWebhookAt || !channel.lastResponseAt) {
    return false;
  }
  return new Date(channel.lastResponseAt).getTime() >= new Date(channel.lastWebhookAt).getTime();
}

export function getChannelChecklist(channel: ChatwootInboxConfigItem): ChannelChecklistItem[] {
  return [
    { label: "Configuração salva", complete: true },
    {
      label: "Token de API validado",
      complete: channel.apiAccessTokenConfigured && channel.lastApiTestOk === true,
    },
    {
      label: "Assistente vinculado",
      complete: Boolean(channel.assistantId && channel.assistantStatus === "ACTIVE"),
    },
    {
      label: "Webhook cadastrado no Cubo.Chat",
      complete: Boolean(channel.lastWebhookAt),
    },
    { label: "Último webhook recebido", complete: Boolean(channel.lastWebhookAt) },
    { label: "Última resposta enviada", complete: isResponseAfterWebhook(channel) },
  ];
}

export function getWebhookDiagnosticSummary(channel: ChatwootInboxConfigItem): {
  tone: "neutral" | "warning" | "success";
  title: string;
  detail: string;
} {
  if (!channel.lastWebhookAt) {
    return {
      tone: "neutral",
      title: "Último webhook recebido: nunca",
      detail: "O Studio ainda não recebeu eventos deste account/inbox.",
    };
  }

  const event = channel.lastWebhookEvent?.trim().toLowerCase() ?? "";
  if (event === "test") {
    return {
      tone: "warning",
      title: "Webhook de teste recebido",
      detail: "Recebido evento de teste, mas não é mensagem de cliente.",
    };
  }

  if (channel.lastWebhookIgnoredReason) {
    return {
      tone: "warning",
      title: "Webhook recebido e ignorado",
      detail: channel.lastWebhookIgnoredReason,
    };
  }

  if (event === "message_created" && isResponseAfterWebhook(channel)) {
    return {
      tone: "success",
      title: "Entrada e saída OK",
      detail: "O Studio recebeu a mensagem e enviou uma resposta.",
    };
  }

  return {
    tone: "success",
    title: "Webhook recebido",
    detail:
      event === "message_created"
        ? "Mensagem recebida e encaminhada para processamento."
        : `Evento recebido: ${channel.lastWebhookEvent ?? "desconhecido"}.`,
  };
}
