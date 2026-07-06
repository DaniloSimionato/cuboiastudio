import type { SendAssistantConversationMessageDto } from "../assistant-conversations/dto/send-assistant-conversation-message.dto";

type ChatwootRawAttachment = Record<string, unknown>;
type ChatwootRawPayload = Record<string, unknown>;

export type NormalizedChatwootAttachment = {
  type: "image" | "document" | "audio" | "video" | "gif";
  fileName: string;
  mimeType: string;
  size?: number;
  dataUrl?: string | null;
  url?: string | null;
  thumbUrl?: string | null;
  attachmentStoragePending?: boolean | null;
  caption?: string | null;
  durationSeconds?: number | null;
  extractedText?: string | null;
  transcript?: string | null;
  description?: string | null;
};

export type NormalizedChatwootMessage = {
  eventName: string | null;
  accountId: string | null;
  conversationTitle: string | null;
  messageId: string | null;
  messageType: string | null;
  isPrivate: boolean;
  aiActive: boolean | null;
  externalConversationId: string;
  externalContactId: string | null;
  externalChannelId: string | null;
  externalInboxId: string | null;
  sourceId: string | null;
  senderId: string | null;
  senderIdentifier: string | null;
  senderPhoneNumber: string | null;
  senderType: string | null;
  senderName: string | null;
  conversationMetaSender: string | null;
  dto: SendAssistantConversationMessageDto;
};

function trimString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return trimString(value);
}

function readIdentifier(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return trimString(value);
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = readString(value);
    if (text) {
      return text;
    }
  }

  return null;
}

function pickFirstIdentifier(...values: unknown[]): string | null {
  for (const value of values) {
    const text = readIdentifier(value);
    if (text) {
      return text;
    }
  }

  return null;
}

export function summarizeChatwootPayloadStructure(payload: unknown) {
  const raw = readObject(payload) ?? {};
  const data = readObject(raw.data);
  const message = readObject(raw.message) ?? readObject(data?.message) ?? null;
  const conversation = readObject(raw.conversation) ?? readObject(data?.conversation) ?? null;
  const account = readObject(raw.account) ?? readObject(data?.account) ?? null;
  const inbox = readObject(raw.inbox) ?? readObject(data?.inbox) ?? null;
  const messageConversation = readObject(message?.conversation);
  const attachments = readArray(message?.attachments ?? raw.attachments ?? data?.attachments);

  return {
    event: readString(raw.event ?? raw.event_type ?? data?.event ?? data?.event_type),
    id: readIdentifier(raw.id ?? message?.id ?? data?.id),
    message_type: readString(message?.message_type ?? raw.message_type ?? data?.message_type),
    private: readBoolean(message?.private ?? raw.private ?? data?.private),
    "account?.id": readIdentifier(account?.id),
    account_id: readIdentifier(raw.account_id ?? data?.account_id),
    "inbox?.id": readIdentifier(inbox?.id),
    inbox_id: readIdentifier(raw.inbox_id ?? data?.inbox_id),
    "conversation?.id": readIdentifier(conversation?.id),
    "conversation?.display_id": readIdentifier(conversation?.display_id),
    conversation_id: readIdentifier(raw.conversation_id ?? data?.conversation_id),
    conversationId: readIdentifier(raw.conversationId ?? data?.conversationId),
    "message?.conversation?.id": readIdentifier(messageConversation?.id),
    "message?.conversation_id": readIdentifier(message?.conversation_id),
    "Object.keys(payload)": Object.keys(raw),
    "Object.keys(payload.conversation || {})": Object.keys(conversation ?? {}),
    "Object.keys(payload.message || {})": Object.keys(message ?? {}),
    attachmentsCount: attachments.length,
  };
}

function normalizeAttachment(item: ChatwootRawAttachment, index: number): NormalizedChatwootAttachment {
  const fileName =
    pickFirstString(item.file_name, item.filename, item.name, item.title) ?? `attachment-${index + 1}`;
  const mimeType =
    pickFirstString(item.mime_type, item.content_type, item.type, item.file_mime_type) ??
    "application/octet-stream";
  const type = resolveAttachmentType(mimeType, item);

  return {
    type,
    fileName,
    mimeType,
    size: toNumber(item.size) ?? toNumber(item.file_size),
    dataUrl: pickFirstString(item.data_url, item.dataUrl),
    url: pickFirstString(item.url),
    thumbUrl: pickFirstString(item.thumb_url, item.thumbUrl),
    attachmentStoragePending: readBoolean(item.attachment_storage_pending),
    caption: pickFirstString(item.caption, item.content),
    durationSeconds: toNumber(item.duration) ?? toNumber(item.duration_seconds),
    extractedText: pickFirstString(item.extracted_text, item.text),
    transcript: pickFirstString(item.transcribed_text, item.transcript, item.transcription),
    description: pickFirstString(item.description, item.summary),
  };
}

function resolveAttachmentType(mimeType: string, item: ChatwootRawAttachment) {
  const rawType = pickFirstString(item.type, item.category, item.message_type)?.toLowerCase();

  if (rawType === "image" || rawType === "document" || rawType === "audio" || rawType === "video" || rawType === "gif") {
    return rawType;
  }

  if (mimeType.startsWith("image/")) {
    return mimeType.includes("gif") ? "gif" : "image";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "document";
}

export function normalizeChatwootMessageCreatedPayload(
  payload: unknown,
): NormalizedChatwootMessage {
  const raw = readObject(payload) ?? {};
  const data = readObject(raw.data);
  const message = readObject(raw.message) ?? readObject(data?.message) ?? raw;
  const conversation = readObject(raw.conversation) ?? readObject(data?.conversation) ?? {};
  const contact = readObject(raw.contact) ?? readObject(raw.sender) ?? readObject(data?.contact) ?? {};
  const sender = readObject(message.sender) ?? readObject(raw.sender) ?? readObject(data?.sender) ?? contact;
  const inbox = readObject(raw.inbox) ?? readObject(data?.inbox) ?? {};
  const account = readObject(raw.account) ?? readObject(data?.account) ?? {};
  const messageConversation = readObject(message.conversation);
  const conversationInbox = readObject(conversation.inbox);
  const additionalAttributes = readObject(raw.additional_attributes) ?? readObject(data?.additional_attributes) ?? {};
  const payloadMeta = readObject(raw.meta) ?? readObject(data?.meta) ?? {};
  const messageAttachments = readArray(message.attachments ?? raw.attachments ?? data?.attachments);
  const conversationMeta = readObject(conversation.meta);
  const conversationMetaSender = normalizeSenderSummary(conversationMeta?.sender);

  const normalizedAttachments = messageAttachments
    .map((item, index) => readObject(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item, index) => normalizeAttachment(item, index));
  const normalizedAttachmentDtos = normalizedAttachments as SendAssistantConversationMessageDto["attachments"];

  const conversationId =
    pickFirstIdentifier(
      conversation.id,
      conversation.display_id,
      raw.conversation_id,
      raw.conversationId,
      messageConversation?.id,
      message.conversation_id,
      additionalAttributes.conversation_id,
      payloadMeta.conversation_id,
      data?.conversation_id,
      data?.conversationId,
      conversation.external_id,
      raw.external_conversation_id,
    ) ?? "";
  const accountId =
    pickFirstIdentifier(account.id, raw.account_id, raw.accountId, data?.account_id, data?.accountId) ?? null;
  const inboxId =
    pickFirstIdentifier(
      inbox.id,
      raw.inbox_id,
      raw.inboxId,
      conversation.inbox_id,
      conversationInbox?.id,
      data?.inbox_id,
      data?.inboxId,
      inbox.identifier,
      raw.inbox_identifier,
    ) ?? null;

  const dto: SendAssistantConversationMessageDto = {
    message: pickFirstString(message.content, raw.content, raw.message, raw.text) ?? undefined,
    source: "chatwoot",
    externalMessageId:
      pickFirstIdentifier(message.id, raw.message_id, raw.external_message_id, data?.message_id) ?? undefined,
    externalAccountId: accountId ?? undefined,
    externalConversationId: conversationId,
    externalContactId:
      pickFirstIdentifier(contact.id, contact.external_id, raw.contact_id, raw.sender_id) ?? undefined,
    externalSenderId: pickFirstIdentifier(sender.id, contact.id, raw.sender_id, data?.sender_id) ?? undefined,
    externalSenderIdentifier:
      pickFirstString(sender.identifier, contact.identifier, raw.sender_identifier, data?.sender_identifier) ??
      undefined,
    externalSenderName: pickFirstString(sender.name, contact.name, contact.pushname) ?? undefined,
    externalSenderPhone:
      pickFirstString(
        sender.phone_number,
        sender.phone,
        contact.phone_number,
        contact.phone,
        raw.sender_phone_number,
        data?.sender_phone_number,
      ) ?? undefined,
    externalChannelId: pickFirstIdentifier(inboxId, inbox.external_id, raw.external_channel_id) ?? undefined,
    externalInboxId: inboxId ?? undefined,
    messageType: pickFirstString(message.message_type, raw.message_type, data?.message_type) ?? undefined,
    attachments: normalizedAttachmentDtos && normalizedAttachmentDtos.length > 0 ? normalizedAttachmentDtos : undefined,
    contact:
      pickFirstString(contact.name, contact.pushname) || pickFirstString(contact.phone_number, contact.phone)
        ? {
            name: pickFirstString(contact.name, contact.pushname) ?? "Contato do Chatwoot",
            phone: pickFirstString(contact.phone_number, contact.phone) ?? "não informado",
          }
        : undefined,
    location: normalizeLocation(message.location ?? raw.location ?? data?.location),
  };

  return {
    eventName: pickFirstString(raw.event, raw.event_type, data?.event, data?.event_type) ?? null,
    accountId,
    conversationTitle:
      pickFirstString(
        readObject(conversation.meta)?.title,
        conversation.title,
        raw.conversation_title,
        raw.subject,
      ) ?? null,
    messageId: dto.externalMessageId ?? null,
    messageType: pickFirstString(message.message_type, raw.message_type, data?.message_type) ?? null,
    isPrivate: readBoolean(message.private ?? raw.private ?? data?.private) ?? false,
    aiActive:
      readBoolean(conversation.ai_active) ??
      readBoolean(readObject(conversation.custom_attributes)?.ai_active) ??
      readBoolean(readObject(conversation.additional_attributes)?.ai_active) ??
      readBoolean(readObject(conversation.meta)?.ai_active) ??
      null,
    externalConversationId: conversationId,
    externalContactId: dto.externalContactId ?? null,
    externalChannelId: dto.externalChannelId ?? null,
    externalInboxId: dto.externalInboxId ?? null,
    sourceId: pickFirstIdentifier(message.source_id, raw.source_id, data?.source_id) ?? null,
    senderId: pickFirstIdentifier(sender.id, contact.id, raw.sender_id, data?.sender_id) ?? null,
    senderIdentifier: pickFirstString(sender.identifier, contact.identifier, raw.sender_identifier, data?.sender_identifier) ?? null,
    senderPhoneNumber: pickFirstString(
      sender.phone_number,
      sender.phone,
      contact.phone_number,
      contact.phone,
      raw.sender_phone_number,
      data?.sender_phone_number,
    ) ?? null,
    senderType: pickFirstString(sender.type, message.sender_type, raw.sender_type, data?.sender_type) ?? null,
    senderName: pickFirstString(sender.name, contact.name, contact.pushname) ?? null,
    conversationMetaSender,
    dto,
  };
}

function normalizeSenderSummary(value: unknown): string | null {
  if (typeof value === "string") {
    return trimString(value);
  }

  const sender = readObject(value);
  if (!sender) {
    return null;
  }

  return (
    pickFirstString(sender.name, sender.identifier, sender.type, sender.phone_number, sender.id) ?? null
  );
}

function normalizeLocation(value: unknown) {
  const location = readObject(value);
  if (!location) {
    return undefined;
  }

  const latitude = toNumber(location.latitude ?? location.lat);
  const longitude = toNumber(location.longitude ?? location.lng ?? location.lon);
  const label = pickFirstString(location.label, location.name, location.address, location.title);

  if (!label && latitude === undefined && longitude === undefined) {
    return undefined;
  }

  return {
    label: label ?? undefined,
    latitude,
    longitude,
  };
}
