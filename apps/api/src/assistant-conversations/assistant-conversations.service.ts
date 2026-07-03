import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ConversationChannelType,
  ConversationSource,
  Prisma,
  Status,
} from "@prisma/client";
import type { AiResolvedRuntimeConfig } from "../ai/ai.types";
import { AiService } from "../ai/ai.service";
import { AttachmentInterpreterService } from "../attachments/attachment-interpreter.service";
import type { AttachmentInterpreterInput } from "../attachments/attachment-interpreter.types";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { ChatwootInboxConfigService } from "../chatwoot/chatwoot-inbox-config.service";
import { PrismaService } from "../database/prisma.service";
import {
  persistInboundAttachment,
  type InboundAttachmentInput,
  type InboundAttachmentRecord,
  type InboundContactInput,
  type InboundLocationInput,
  type InboundMessageSource,
} from "./inbound-message";
import {
  buildDeterministicAssistantResponse,
  buildConversationPromptMessages,
  toAssistantRuntimeSources,
  type AssistantRuntimeSource,
} from "../assistants/assistant-runtime";
import { type CreateAssistantConversationDto } from "./dto/create-assistant-conversation.dto";
import { type SendAssistantConversationMessageDto } from "./dto/send-assistant-conversation-message.dto";
import { CalendarToolsService } from "../apps/calendar-tools.service";

export type AssistantConversationListItem = {
  id: string;
  title: string | null;
  source: ConversationSource;
  channelType: ConversationChannelType;
  sourceProvider?: string | null;
  externalConversationId?: string | null;
  externalAccountId?: string | null;
  externalContactId?: string | null;
  externalChannelId?: string | null;
  externalInboxId?: string | null;
  pausedByHuman?: boolean;
  lastMessageAt?: Date | null;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
};

export type FindAllAssistantConversationsResponse = {
  items: AssistantConversationListItem[];
};

export type CreateAssistantConversationResponse = AssistantConversationListItem;

export type AssistantConversationMessageItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string | null;
  messageType?: string | null;
  externalMessageId?: string | null;
  attachments?: InboundAttachmentRecord[];
  sources?: AssistantRuntimeSource[];
  mode?: string;
  createdAt: Date;
};

export type AssistantConversationRuntime = {
  mode: "ai-runtime" | "deterministic-runtime";
  assistant: {
    id: string;
    name: string;
  };
  provider?: string;
  model?: string;
  modelSource?: "assistant" | "runtime-config" | "not-configured";
  temperature: number;
  temperatureSource: "assistant" | "default";
  configurationSource: AiResolvedRuntimeConfig["source"];
  fallback: boolean;
  outcome: "success" | "fallback" | "needs_human" | "unknown";
  summary: string;
  context: {
    historyMessagesUsed: number;
    historyLimit: number;
    initialMessageIncluded: boolean;
    instructionsIncluded: boolean;
  };
  logId?: string;
  reason?:
    | "ai-runtime-disabled"
    | "ai-provider-not-configured"
    | "ai-model-not-configured"
    | "ai-provider-auth-error"
    | "ai-provider-quota-error"
    | "ai-provider-error";
  warning?: string;
};

export type FindConversationMessagesResponse = {
  items: AssistantConversationMessageItem[];
};

export type SendAssistantConversationMessageResponse = {
  conversationId: string;
  userMessage: AssistantConversationMessageItem;
  assistantMessage: AssistantConversationMessageItem;
  runtime: AssistantConversationRuntime;
};

const assistantConversationSafeSelect = {
  id: true,
  companyId: true,
  title: true,
  source: true,
  channelType: true,
  sourceProvider: true,
  externalConversationId: true,
  externalAccountId: true,
  externalContactId: true,
  externalChannelId: true,
  externalInboxId: true,
  pausedByHuman: true,
  lastMessageAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssistantConversationSelect;

type AssistantConversationSafeRecord = Prisma.AssistantConversationGetPayload<{
  select: typeof assistantConversationSafeSelect;
}>;

const assistantConversationMessageSafeSelect = {
  id: true,
  role: true,
  content: true,
  source: true,
  messageType: true,
  externalMessageId: true,
  externalPayload: true,
  attachments: true,
  sources: true,
  mode: true,
  createdAt: true,
} satisfies Prisma.AssistantConversationMessageSelect;

type AssistantConversationMessageSafeRecord = Prisma.AssistantConversationMessageGetPayload<{
  select: typeof assistantConversationMessageSafeSelect;
}>;

const assistantConversationAssistantSelect = {
  id: true,
  companyId: true,
  name: true,
  initialMessage: true,
  status: true,
} satisfies Prisma.AssistantSelect;

type AssistantConversationAssistantRecord = Prisma.AssistantGetPayload<{
  select: typeof assistantConversationAssistantSelect;
}>;

const assistantConversationRuntimeAssistantSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  initialMessage: true,
  instructions: true,
  model: true,
  temperature: true,
} satisfies Prisma.AssistantSelect;

type AssistantConversationRuntimeAssistantRecord = Prisma.AssistantGetPayload<{
  select: typeof assistantConversationRuntimeAssistantSelect;
}>;

const assistantConversationKnowledgeSelect = {
  id: true,
  title: true,
  content: true,
} satisfies Prisma.AssistantKnowledgeSelect;

const MAX_RUNTIME_HISTORY_MESSAGES = 10;
const MAX_RUNTIME_LOG_PROVIDER_ERROR_MESSAGE_LENGTH = 500;
const DEFAULT_MANUAL_TEST_TITLE_PREFIX = "Teste manual";

type RuntimeLogProviderErrorFields = {
  providerStatus?: number;
  providerErrorType?: string;
  providerErrorCode?: string;
  providerErrorMessage?: string;
};

function toConversationItem(
  conversation: AssistantConversationSafeRecord,
): AssistantConversationListItem {
  return {
    id: conversation.id,
    title: conversation.title,
    source: conversation.source,
    channelType: conversation.channelType,
    sourceProvider: conversation.sourceProvider,
    externalConversationId: conversation.externalConversationId,
    externalAccountId: conversation.externalAccountId,
    externalContactId: conversation.externalContactId,
    externalChannelId: conversation.externalChannelId,
    externalInboxId: conversation.externalInboxId,
    pausedByHuman: conversation.pausedByHuman,
    lastMessageAt: conversation.lastMessageAt,
    status: conversation.status,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function formatManualTestConversationTitle(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${DEFAULT_MANUAL_TEST_TITLE_PREFIX} - ${day}/${month}/${year} ${hours}:${minutes}`;
}

function toConversationMessageItem(
  message: AssistantConversationMessageSafeRecord,
): AssistantConversationMessageItem {
  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    content: message.content,
    ...(message.source !== null ? { source: message.source } : {}),
    ...(message.messageType !== null ? { messageType: message.messageType } : {}),
    ...(message.externalMessageId !== null ? { externalMessageId: message.externalMessageId } : {}),
    ...(message.attachments !== null ? { attachments: message.attachments as InboundAttachmentRecord[] } : {}),
    ...(message.sources !== null ? { sources: toAssistantRuntimeSources(message.sources) } : {}),
    ...(message.mode !== null ? { mode: message.mode } : {}),
    createdAt: message.createdAt,
  };
}

@Injectable()
export class AssistantConversationsService {
  private readonly logger = new Logger(AssistantConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly attachmentInterpreterService: AttachmentInterpreterService,
    private readonly chatwootInboxConfigService: ChatwootInboxConfigService,
    private readonly calendarToolsService: CalendarToolsService,
  ) {}

  private assertTenantContext(input: { user: AuthenticatedUser; tenant: RequestTenant }): void {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }
  }

  private normalizeConversationSource(
    value: CreateAssistantConversationDto["source"] | null | undefined,
  ): ConversationSource {
    return value === "SMOKE" ? ConversationSource.SMOKE : ConversationSource.MANUAL_TEST;
  }

  private resolveConversationChannelType(input: {
    source: ConversationSource;
    sourceProvider?: string | null;
    externalChannelId?: string | null;
    externalInboxId?: string | null;
    externalSenderIdentifier?: string | null;
    externalSenderPhone?: string | null;
  }): ConversationChannelType {
    if (input.source !== ConversationSource.CHATWOOT) {
      return ConversationChannelType.UNKNOWN;
    }

    const haystack = [
      input.sourceProvider,
      input.externalChannelId,
      input.externalInboxId,
      input.externalSenderIdentifier,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .toLowerCase();

    if (input.externalSenderPhone?.trim()) {
      return ConversationChannelType.WHATSAPP;
    }

    if (haystack.includes("instagram")) {
      return ConversationChannelType.INSTAGRAM;
    }

    if (haystack.includes("webchat") || haystack.includes("web chat")) {
      return ConversationChannelType.WEBCHAT;
    }

    if (haystack.includes("whatsapp") || haystack.includes("whats")) {
      return ConversationChannelType.WHATSAPP;
    }

    return ConversationChannelType.UNKNOWN;
  }

  private async resolveActiveAssistantOrThrow(input: {
    assistantId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AssistantConversationAssistantRecord> {
    this.assertTenantContext(input);

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantConversationAssistantSelect,
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    if (assistant.status !== Status.ACTIVE) {
      throw new BadRequestException("Assistant is inactive.");
    }

    return assistant;
  }

  private async resolveActiveAssistantByIdOrThrow(
    assistantId: string,
  ): Promise<{ id: string; companyId: string; name: string; status: Status }> {
    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: assistantId,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        status: true,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    if (assistant.status !== Status.ACTIVE) {
      throw new BadRequestException("Assistant is inactive.");
    }

    return assistant;
  }

  private async resolveRuntimeAssistantOrThrow(input: {
    assistantId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AssistantConversationRuntimeAssistantRecord> {
    this.assertTenantContext(input);

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantConversationRuntimeAssistantSelect,
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    if (assistant.status !== Status.ACTIVE) {
      throw new BadRequestException("Assistant is inactive.");
    }

    return assistant;
  }

  private async resolveConversationOrThrow(input: {
    assistantId: string;
    conversationId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AssistantConversationSafeRecord> {
    await this.resolveActiveAssistantOrThrow({
      assistantId: input.assistantId,
      user: input.user,
      tenant: input.tenant,
    });

    const conversation = await this.prisma.assistantConversation.findFirst({
      where: {
        id: input.conversationId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantConversationSafeSelect,
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    return conversation;
  }

  async ensureConversationFromInboundMessage(input: {
    assistantId: string;
    user?: AuthenticatedUser | null;
    tenant?: RequestTenant;
    createdByUserId?: string | null;
    sourceProvider: InboundMessageSource;
    externalConversationId: string;
    externalAccountId?: string | null;
    externalContactId?: string | null;
    externalChannelId?: string | null;
    externalInboxId?: string | null;
    externalSenderIdentifier?: string | null;
    externalSenderPhone?: string | null;
    title?: string | null;
  }): Promise<AssistantConversationSafeRecord> {
    const assistant = input.tenant
      ? await this.resolveActiveAssistantOrThrow({
          assistantId: input.assistantId,
          user:
            input.user ??
            ({
              id: input.createdByUserId ?? "system",
              companyId: input.tenant.companyId,
              email: "system@cubo.local",
              name: "System",
              roles: [],
              permissions: [],
            } as AuthenticatedUser),
          tenant: input.tenant,
        })
      : await this.resolveActiveAssistantByIdOrThrow(input.assistantId);

    if (input.user && input.tenant) {
      this.assertTenantContext({
        user: input.user,
        tenant: input.tenant,
      });
    }

    const existingConversation = await this.prisma.assistantConversation.findFirst({
      where: {
        assistantId: input.assistantId,
        companyId: input.tenant?.companyId ?? assistant.companyId,
        externalAccountId: input.externalAccountId ?? null,
        externalConversationId: input.externalConversationId,
      },
      select: assistantConversationSafeSelect,
    });

    if (existingConversation) {
      return existingConversation;
    }

    return this.prisma.assistantConversation.create({
      data: {
        companyId: input.tenant?.companyId ?? assistant.companyId,
        assistantId: assistant.id,
        userId: input.createdByUserId ?? null,
        title: input.title ?? null,
        source: ConversationSource.CHATWOOT,
        channelType: this.resolveConversationChannelType({
          source: ConversationSource.CHATWOOT,
          sourceProvider: input.sourceProvider,
          externalChannelId: input.externalChannelId ?? null,
          externalInboxId: input.externalInboxId ?? null,
          externalSenderIdentifier: input.externalSenderIdentifier ?? null,
          externalSenderPhone: input.externalSenderPhone ?? null,
        }),
        sourceProvider: input.sourceProvider,
        externalAccountId: input.externalAccountId ?? null,
        externalConversationId: input.externalConversationId,
        externalContactId: input.externalContactId ?? null,
        externalChannelId: input.externalChannelId ?? null,
        externalInboxId: input.externalInboxId ?? null,
        pausedByHuman: false,
        lastMessageAt: new Date(),
        status: Status.ACTIVE,
      },
      select: assistantConversationSafeSelect,
    });
  }

  async processPublicInboundMessage(input: {
    assistantId: string;
    sourceProvider: "chatwoot";
    dto: SendAssistantConversationMessageDto;
    conversationTitle?: string | null;
    externalAccountId?: string | null;
    externalConversationId: string;
    externalContactId?: string | null;
    externalChannelId?: string | null;
    externalInboxId?: string | null;
  }): Promise<SendAssistantConversationMessageResponse> {
    const assistant = await this.resolveActiveAssistantByIdOrThrow(input.assistantId);
    const tenant = { companyId: assistant.companyId } satisfies RequestTenant;
    const user = {
      id: `system_${input.sourceProvider}_${assistant.id}`,
      companyId: assistant.companyId,
      email: `system-${input.sourceProvider}@cubo.local`,
      name: `System ${input.sourceProvider}`,
      roles: [],
      permissions: [],
    } satisfies AuthenticatedUser;

    const conversation = await this.ensureConversationFromInboundMessage({
      assistantId: input.assistantId,
      createdByUserId: null,
      sourceProvider: input.sourceProvider,
      externalAccountId: input.externalAccountId ?? null,
      externalConversationId: input.externalConversationId,
      externalContactId: input.externalContactId,
      externalChannelId: input.externalChannelId,
      externalInboxId: input.externalInboxId,
      externalSenderIdentifier: input.dto.externalSenderIdentifier ?? null,
      externalSenderPhone: input.dto.externalSenderPhone ?? null,
      title: input.conversationTitle ?? null,
    });

    return this.sendMessage({
      assistantId: input.assistantId,
      conversationId: conversation.id,
      dto: input.dto,
      user,
      tenant,
    });
  }

  private resolveRuntimeModel(
    assistant: AssistantConversationRuntimeAssistantRecord,
    runtimeConfig: AiResolvedRuntimeConfig,
  ): {
    model: string;
    source: AssistantConversationRuntime["modelSource"];
  } {
    const assistantModel = assistant.model?.trim();
    if (assistantModel) {
      return {
        model: assistantModel,
        source: "assistant",
      };
    }

    if (runtimeConfig.model.trim().length > 0) {
      return {
        model: runtimeConfig.model.trim(),
        source: "runtime-config",
      };
    }

    return {
      model: "",
      source: "not-configured",
    };
  }

  private resolveRuntimeTemperature(
    assistant: AssistantConversationRuntimeAssistantRecord,
  ): number {
    if (
      typeof assistant.temperature === "number" &&
      assistant.temperature >= 0 &&
      assistant.temperature <= 2
    ) {
      return assistant.temperature;
    }

    return 0.2;
  }

  private resolveRuntimeTemperatureSource(
    assistant: AssistantConversationRuntimeAssistantRecord,
  ): AssistantConversationRuntime["temperatureSource"] {
    return typeof assistant.temperature === "number" &&
      assistant.temperature >= 0 &&
      assistant.temperature <= 2
      ? "assistant"
      : "default";
  }

  private buildRuntimeSummary(input: {
    question: string;
    mode: AssistantConversationRuntime["mode"];
    sourcesCount: number;
    outcome: AssistantConversationRuntime["outcome"];
    historyMessagesUsed: number;
  }): string {
    const modeLabel = input.mode === "ai-runtime" ? "IA real" : "determinístico";

    return [
      `Usuário perguntou: "${input.question}".`,
      `Assistente respondeu em modo: ${modeLabel}.`,
      `Histórico usado: ${input.historyMessagesUsed} mensagem(ns).`,
      `Fontes usadas: ${input.sourcesCount}.`,
      `Saída: ${input.outcome}.`,
    ].join(" ");
  }

  private buildDeterministicRuntimeWarning(
    reason: AssistantConversationRuntime["reason"],
  ): string | undefined {
    if (
      reason === "ai-provider-error" ||
      reason === "ai-provider-auth-error" ||
      reason === "ai-provider-quota-error"
    ) {
      return "IA real indisponível. Resposta gerada em modo determinístico.";
    }

    return undefined;
  }

  private resolveProviderFallbackReason(error: unknown): AssistantConversationRuntime["reason"] {
    if (!(error instanceof HttpException)) {
      return "ai-provider-error";
    }

    const response = error.getResponse();
    if (typeof response !== "object" || response === null || Array.isArray(response)) {
      return "ai-provider-error";
    }

    const providerStatus = (response as { providerStatus?: unknown }).providerStatus;
    if (providerStatus === 401 || providerStatus === 403) {
      return "ai-provider-auth-error";
    }

    if (providerStatus === 402 || providerStatus === 429) {
      return "ai-provider-quota-error";
    }

    return "ai-provider-error";
  }

  private extractProviderErrorLogFields(error: unknown): RuntimeLogProviderErrorFields {
    if (!(error instanceof HttpException)) {
      return {};
    }

    const response = error.getResponse();
    if (typeof response !== "object" || response === null || Array.isArray(response)) {
      return {};
    }

    const responseRecord = response as {
      providerStatus?: unknown;
      providerError?: unknown;
    };
    const providerError =
      typeof responseRecord.providerError === "object" &&
      responseRecord.providerError !== null &&
      !Array.isArray(responseRecord.providerError)
        ? (responseRecord.providerError as Record<string, unknown>)
        : undefined;

    return {
      ...(typeof responseRecord.providerStatus === "number"
        ? { providerStatus: responseRecord.providerStatus }
        : {}),
      ...this.readProviderErrorField(providerError, "type", "providerErrorType"),
      ...this.readProviderErrorField(providerError, "code", "providerErrorCode"),
      ...this.readProviderErrorField(providerError, "message", "providerErrorMessage"),
    };
  }

  private readProviderErrorField<
    TOutputKey extends "providerErrorType" | "providerErrorCode" | "providerErrorMessage",
  >(
    providerError: Record<string, unknown> | undefined,
    inputKey: "type" | "code" | "message",
    outputKey: TOutputKey,
  ): Partial<Record<TOutputKey, string>> {
    const value = providerError?.[inputKey];
    if (typeof value !== "string" || value.trim().length === 0) {
      return {};
    }

    return {
      [outputKey]: value.trim().slice(0, MAX_RUNTIME_LOG_PROVIDER_ERROR_MESSAGE_LENGTH),
    } as Partial<Record<TOutputKey, string>>;
  }

  private resolveRuntimeLogStatus(runtime: AssistantConversationRuntime): "success" | "fallback" {
    return runtime.fallback ? "fallback" : "success";
  }

  private toSerializableJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private async persistInboundAttachments(input: {
    conversationId: string;
    source: InboundMessageSource;
    externalMessageId?: string | null;
    attachments?: Array<{
      type: "image" | "document" | "audio" | "video" | "gif";
      fileName: string;
      mimeType: string;
      size?: number;
      dataUrl?: string;
      url?: string;
      thumbUrl?: string;
      caption?: string;
      durationSeconds?: number;
      extractedText?: string;
      transcript?: string;
      description?: string;
      buffer?: Buffer | null;
      sourceUrl?: string | null;
    }>;
  }): Promise<InboundAttachmentRecord[]> {
    const records: InboundAttachmentRecord[] = [];

    for (const attachment of input.attachments ?? []) {
      const record = await persistInboundAttachment({
        conversationId: input.conversationId,
        externalMessageId: input.externalMessageId ?? null,
        source: input.source,
        type: attachment.type,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        dataUrl: attachment.dataUrl,
        url: attachment.url,
        thumbUrl: attachment.thumbUrl,
        caption: attachment.caption,
        durationSeconds: attachment.durationSeconds,
        extractedText: attachment.extractedText,
        transcript: attachment.transcript,
        description: attachment.description,
        buffer: attachment.buffer ?? null,
        sourceUrl: attachment.sourceUrl ?? null,
      });

      records.push(record);
    }

    return records;
  }

  private buildInboundMessageType(input: {
    dto: SendAssistantConversationMessageDto;
    attachments: InboundAttachmentRecord[];
    contact?: InboundContactInput | null;
    location?: InboundLocationInput | null;
  }): string {
    if (input.dto.messageType?.trim()) {
      return input.dto.messageType.trim();
    }

    if (input.contact) {
      return "contact";
    }

    if (input.location) {
      return "location";
    }

    if (input.attachments.length > 0) {
      return input.attachments[0]?.type ?? "text";
    }

    return "text";
  }

  private buildRuntimeInputText(input: {
    message?: string | null;
    attachments: InboundAttachmentRecord[];
    contact?: InboundContactInput | null;
    location?: InboundLocationInput | null;
  }): string {
    return this.attachmentInterpreterService.buildRuntimeInputText({
      rawText: input.message,
      attachments: input.attachments,
      contact: input.contact ?? null,
      location: input.location ?? null,
    });
  }

  private toAttachmentInterpreterInput(input: {
    attachment: InboundAttachmentRecord;
    source: InboundMessageSource;
  }): AttachmentInterpreterInput {
    return {
      source: input.source,
      fileName: input.attachment.fileName,
      mimeType: input.attachment.mimeType,
      storagePath: input.attachment.storagePath,
      size: input.attachment.size,
      dataUrl: null,
      thumbUrl: input.attachment.thumbUrl ?? null,
      caption: input.attachment.caption ?? null,
      durationSeconds: input.attachment.durationSeconds ?? null,
    };
  }

  private async sendChatwootOutboundText(input: {
    conversation: AssistantConversationSafeRecord;
    assistantMessageId: string;
    content: string;
  }): Promise<void> {
    const accountIdentifier = (input.conversation.externalAccountId ?? "").trim();
    const inboxIdentifier = (input.conversation.externalInboxId ?? "").trim();
    const conversationIdentifier = (input.conversation.externalConversationId ?? "").trim();

    if (!accountIdentifier || !conversationIdentifier) {
      return;
    }

    const resolvedConfig = await this.chatwootInboxConfigService.resolveActiveForConversation({
      companyId: input.conversation.companyId,
      accountId: input.conversation.externalAccountId ?? null,
      inboxId: input.conversation.externalInboxId ?? null,
    });

    const baseUrl = resolvedConfig?.baseUrl?.trim() || "";
    if (!baseUrl) {
      return;
    }

    const outboundUrl = `${baseUrl.replace(/\/$/, "")}/api/v1/accounts/${encodeURIComponent(
      accountIdentifier,
    )}/conversations/${encodeURIComponent(
      conversationIdentifier,
    )}/messages`;
    const outboundBody = {
      content: input.content,
      message_type: "outgoing",
      private: false,
    };

    try {
      this.logger.log(
        `Chatwoot outbound started: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} messageType=${outboundBody.message_type} private=${outboundBody.private} contentLength=${input.content.length}`,
      );
      const response = await fetch(outboundUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(resolvedConfig?.apiAccessToken
            ? {
                api_access_token: resolvedConfig.apiAccessToken,
              }
            : {}),
        },
        body: JSON.stringify(outboundBody),
      });
      const responseBody =
        typeof response.text === "function" ? await response.text().catch(() => "") : "";
      const safeResponseBody = this.summarizeOutboundResponseBody(responseBody);

      if (!response.ok) {
        this.logger.warn(
          `Chatwoot outbound failed: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} status=${response.status} responseBody=${safeResponseBody}`,
        );
        return;
      }

      this.logger.log(
        `Chatwoot outbound completed: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} status=${response.status} responseBody=${safeResponseBody}`,
      );
    } catch (error) {
      this.logger.warn(
        `Chatwoot outbound failed: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} error=${this.summarizeOutboundError(error)}`,
      );
      // Non-blocking by design. The conversation turn still succeeds locally.
    }
  }

  private summarizeOutboundResponseBody(body: string): string {
    const trimmed = body.trim();
    if (!trimmed) {
      return "[empty]";
    }

    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(this.sanitizeOutboundValue(parsed)).slice(0, 1000);
    } catch {
      return `[non-json body length=${trimmed.length}]`;
    }
  }

  private sanitizeOutboundValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeOutboundValue(item));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, child]) => {
          const normalizedKey = key.toLowerCase();
          if (
            normalizedKey.includes("token") ||
            normalizedKey.includes("secret") ||
            normalizedKey.includes("content") ||
            normalizedKey.includes("phone") ||
            normalizedKey.includes("data_url")
          ) {
            return [key, "[redacted]"];
          }

          return [key, this.sanitizeOutboundValue(child)];
        }),
      );
    }

    if (typeof value === "string" && value.length > 200) {
      return `${value.slice(0, 200)}...[truncated]`;
    }

    return value;
  }

  private summarizeOutboundError(error: unknown): string {
    if (error instanceof Error) {
      return error.message.slice(0, 300);
    }

    return String(error).slice(0, 300);
  }

  async create(input: {
    assistantId: string;
    dto: CreateAssistantConversationDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<CreateAssistantConversationResponse> {
    const assistant = await this.resolveActiveAssistantOrThrow({
      assistantId: input.assistantId,
      user: input.user,
      tenant: input.tenant,
    });

    const conversationSource = this.normalizeConversationSource(input.dto.source);
    const createdAt = new Date();
    const conversationTitle =
      input.dto.title?.trim() ||
      (conversationSource === ConversationSource.MANUAL_TEST
        ? formatManualTestConversationTitle(createdAt)
        : null);

    const conversation = await this.prisma.$transaction(async (tx) => {
      const createdConversation = await tx.assistantConversation.create({
        data: {
          companyId: input.tenant.companyId,
          assistantId: input.assistantId,
          userId: input.user.id,
          title: conversationTitle,
          source: conversationSource,
          channelType: ConversationChannelType.UNKNOWN,
          sourceProvider: conversationSource === ConversationSource.SMOKE ? "tests" : "manual",
          status: Status.ACTIVE,
          lastMessageAt: createdAt,
        },
        select: assistantConversationSafeSelect,
      });

      const initialMessage = assistant.initialMessage?.trim();
      if (initialMessage) {
        await tx.assistantConversationMessage.create({
          data: {
            companyId: input.tenant.companyId,
            assistantId: input.assistantId,
            conversationId: createdConversation.id,
            role: "assistant",
            content: initialMessage,
            sources: Prisma.JsonNull,
            mode: "initial-message",
          },
          select: {
            id: true,
          },
        });
      }

      return createdConversation;
    });

    return toConversationItem(conversation);
  }

  async findAll(input: {
    assistantId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindAllAssistantConversationsResponse> {
    await this.resolveActiveAssistantOrThrow({
      assistantId: input.assistantId,
      user: input.user,
      tenant: input.tenant,
    });

    const items = await this.prisma.assistantConversation.findMany({
      where: {
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
        source: ConversationSource.MANUAL_TEST,
        status: Status.ACTIVE,
      },
      select: assistantConversationSafeSelect,
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    return {
      items: items.map(toConversationItem),
    };
  }

  async findMessages(input: {
    assistantId: string;
    conversationId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindConversationMessagesResponse> {
    await this.resolveConversationOrThrow({
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      user: input.user,
      tenant: input.tenant,
    });

    const items = await this.prisma.assistantConversationMessage.findMany({
      where: {
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        companyId: input.tenant.companyId,
      },
      select: assistantConversationMessageSafeSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return {
      items: items.map(toConversationMessageItem),
    };
  }

  async sendMessage(input: {
    assistantId: string;
    conversationId: string;
    dto: SendAssistantConversationMessageDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
    preparedAttachments?: InboundAttachmentRecord[];
  }): Promise<SendAssistantConversationMessageResponse> {
    const runtimeStartedAt = Date.now();
    const assistant = await this.resolveRuntimeAssistantOrThrow({
      assistantId: input.assistantId,
      user: input.user,
      tenant: input.tenant,
    });

    const conversation = await this.resolveConversationOrThrow({
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      user: input.user,
      tenant: input.tenant,
    });

    const source = input.dto.source ?? "manual";
    const attachmentSource: InboundMessageSource = source === "chatwoot" ? "chatwoot" : "tests";
    const persistedAttachments =
      input.preparedAttachments ??
      (await this.persistInboundAttachments({
        conversationId: conversation.id,
        source: attachmentSource,
        externalMessageId: input.dto.externalMessageId ?? null,
        attachments: input.dto.attachments,
      }));
    const initialContent =
      input.dto.message?.trim() ||
      (input.dto.messageType === "contact"
        ? "Contato recebido."
        : input.dto.messageType === "location"
          ? "Localização recebida."
          : input.dto.attachments?.length
            ? "Mensagem multimodal recebida."
            : "Mensagem recebida.");
    const conversationSourceUpdate =
      source === "chatwoot" ? ConversationSource.CHATWOOT : conversation.source;
    const channelTypeUpdate =
      source === "chatwoot"
        ? this.resolveConversationChannelType({
            source: ConversationSource.CHATWOOT,
            sourceProvider: source,
            externalChannelId: input.dto.externalChannelId ?? conversation.externalChannelId ?? null,
            externalInboxId: input.dto.externalInboxId ?? conversation.externalInboxId ?? null,
            externalSenderIdentifier: input.dto.externalSenderIdentifier ?? null,
            externalSenderPhone: input.dto.externalSenderPhone ?? null,
          })
        : conversation.channelType;

    const { userMessage } = await this.prisma.$transaction(async (tx) => {
      const createdUserMessage = await tx.assistantConversationMessage.create({
        data: {
          companyId: input.tenant.companyId,
          assistantId: input.assistantId,
          conversationId: conversation.id,
          role: "user",
          content: initialContent,
          source,
          messageType: input.dto.messageType ?? null,
          externalMessageId: input.dto.externalMessageId ?? null,
          externalPayload: this.toSerializableJsonValue({
            source,
            message: input.dto.message ?? null,
            messageType: input.dto.messageType ?? null,
            externalMessageId: input.dto.externalMessageId ?? null,
            externalAccountId: input.dto.externalAccountId ?? null,
            externalConversationId: input.dto.externalConversationId ?? null,
            externalContactId: input.dto.externalContactId ?? null,
            externalSenderId: input.dto.externalSenderId ?? null,
            externalSenderIdentifier: input.dto.externalSenderIdentifier ?? null,
            externalSenderName: input.dto.externalSenderName ?? null,
            externalSenderPhone: input.dto.externalSenderPhone ?? null,
            externalChannelId: input.dto.externalChannelId ?? null,
            externalInboxId: input.dto.externalInboxId ?? null,
            contact: input.dto.contact ?? null,
            location: input.dto.location ?? null,
            attachments: persistedAttachments,
            interpretedMessage: initialContent,
          }),
          attachments: this.toSerializableJsonValue(persistedAttachments),
          sources: Prisma.JsonNull,
          mode: null,
        },
        select: assistantConversationMessageSafeSelect,
      });

      await tx.assistantConversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          source: conversationSourceUpdate,
          channelType: channelTypeUpdate,
          sourceProvider: source,
          externalAccountId: input.dto.externalAccountId ?? conversation.externalAccountId ?? null,
          externalConversationId:
            input.dto.externalConversationId ?? conversation.externalConversationId ?? null,
          externalContactId: input.dto.externalContactId ?? conversation.externalContactId ?? null,
          externalChannelId: input.dto.externalChannelId ?? conversation.externalChannelId ?? null,
          externalInboxId: input.dto.externalInboxId ?? conversation.externalInboxId ?? null,
          lastMessageAt: new Date(),
        },
        select: {
          id: true,
        },
      });

      return {
        userMessage: createdUserMessage,
      };
    });

    const processedAttachments = [];
    for (let index = 0; index < persistedAttachments.length; index += 1) {
      const persistedAttachment = persistedAttachments[index];
      const dtoAttachment = input.dto.attachments?.[index];
      const interpreterInput = this.toAttachmentInterpreterInput({
        attachment: persistedAttachment,
        source: attachmentSource,
      });
      const processed = dtoAttachment
        ? persistedAttachment.processingStatus === "failed"
          ? {
              processingStatus: "failed" as const,
              extractedText: persistedAttachment.extractedText ?? null,
              interpretedSummary: persistedAttachment.interpretedSummary ?? null,
              transcript: persistedAttachment.transcript ?? null,
              processingError: persistedAttachment.processingError ?? null,
              metadataJson: persistedAttachment.metadataJson ?? null,
            }
          : await this.attachmentInterpreterService.processAttachment(interpreterInput)
        : {
            processingStatus: "completed" as const,
            extractedText: persistedAttachment.extractedText ?? null,
            interpretedSummary: persistedAttachment.interpretedSummary ?? null,
            transcript: persistedAttachment.transcript ?? null,
            processingError: null,
            metadataJson: persistedAttachment.metadataJson ?? null,
          };

      processedAttachments.push({
        ...persistedAttachment,
        processingStatus: processed.processingStatus,
        extractedText: processed.extractedText ?? null,
        interpretedSummary: processed.interpretedSummary ?? null,
        transcript: processed.transcript ?? null,
        processingError: processed.processingError ?? null,
        metadataJson: processed.metadataJson ?? null,
      });
    }

    const interpretedMessage = this.buildRuntimeInputText({
      message: input.dto.message,
      attachments: processedAttachments,
      contact: input.dto.contact ?? null,
      location: input.dto.location ?? null,
    });

    if (!interpretedMessage.trim()) {
      throw new BadRequestException("Message content or multimodal payload is required.");
    }

    const messageType = this.buildInboundMessageType({
      dto: input.dto,
      attachments: processedAttachments,
      contact: input.dto.contact ?? null,
      location: input.dto.location ?? null,
    });

    await this.prisma.assistantConversationMessage.update({
      where: {
        id: userMessage.id,
      },
      data: {
        content: interpretedMessage,
        messageType,
        attachments: this.toSerializableJsonValue(processedAttachments),
        externalPayload: this.toSerializableJsonValue({
          source,
          message: input.dto.message ?? null,
          messageType,
          externalMessageId: input.dto.externalMessageId ?? null,
          externalAccountId: input.dto.externalAccountId ?? null,
          externalConversationId: input.dto.externalConversationId ?? null,
          externalContactId: input.dto.externalContactId ?? null,
          externalSenderId: input.dto.externalSenderId ?? null,
          externalSenderIdentifier: input.dto.externalSenderIdentifier ?? null,
          externalSenderName: input.dto.externalSenderName ?? null,
          externalSenderPhone: input.dto.externalSenderPhone ?? null,
          externalChannelId: input.dto.externalChannelId ?? null,
          externalInboxId: input.dto.externalInboxId ?? null,
          contact: input.dto.contact ?? null,
          location: input.dto.location ?? null,
          attachments: processedAttachments,
          interpretedMessage,
        }),
      },
      select: {
        id: true,
      },
    });

    const knowledgeItems = await this.prisma.assistantKnowledge.findMany({
      where: {
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
        status: Status.ACTIVE,
      },
      select: assistantConversationKnowledgeSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    const recentMessages = await this.prisma.assistantConversationMessage.findMany({
      where: {
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        companyId: input.tenant.companyId,
      },
      select: assistantConversationMessageSafeSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MAX_RUNTIME_HISTORY_MESSAGES,
    });

    const conversationHistory = [...recentMessages].reverse();
    const priorHistory = conversationHistory.slice(0, -1).map((message) => {
      const payload = message.externalPayload && typeof message.externalPayload === "object" ? (message.externalPayload as any) : {};
      return {
        role: message.role as "user" | "assistant" | "tool",
        content: message.content,
        ...(payload.tool_calls ? { tool_calls: payload.tool_calls } : {}),
        ...(payload.tool_call_id ? { tool_call_id: payload.tool_call_id } : {}),
        ...(payload.name ? { name: payload.name } : {}),
      };
    });
    const contextMetadata = {
      historyMessagesUsed: priorHistory.length,
      historyLimit: MAX_RUNTIME_HISTORY_MESSAGES,
      initialMessageIncluded: Boolean(assistant.initialMessage?.trim()),
      instructionsIncluded: Boolean(assistant.instructions?.trim()),
    };

    const deterministicRuntime = buildDeterministicAssistantResponse({
      question: interpretedMessage,
      assistantName: assistant.name,
      instructions: assistant.instructions,
      knowledgeItems,
    });

    const runtimeConfig = await this.aiService.resolveRuntimeConfig(input.tenant.companyId);
    const resolvedModel = this.resolveRuntimeModel(assistant, runtimeConfig);
    const temperature = this.resolveRuntimeTemperature(assistant);
    const temperatureSource = this.resolveRuntimeTemperatureSource(assistant);
    let answer = deterministicRuntime.answer;
    const sources = deterministicRuntime.sources;
    let providerErrorLogFields: RuntimeLogProviderErrorFields = {};
    let runtime: AssistantConversationRuntime = {
      mode: "deterministic-runtime",
      assistant: {
        id: assistant.id,
        name: assistant.name,
      },
      ...(resolvedModel.model ? { model: resolvedModel.model } : {}),
      modelSource: resolvedModel.source,
      temperature,
      temperatureSource,
      configurationSource: runtimeConfig.source,
      fallback: true,
      outcome: "fallback",
      summary: "",
      context: contextMetadata,
      reason: "ai-runtime-disabled",
    };

    if (runtimeConfig.runtimeEnabled) {
      const configured = await this.aiService.isProviderConfigured(
        input.tenant.companyId,
        resolvedModel.model,
      );

      if (!configured) {
        const fallbackReason =
          resolvedModel.source === "not-configured"
            ? "ai-model-not-configured"
            : "ai-provider-not-configured";

        runtime = {
          ...runtime,
          mode: "deterministic-runtime",
          fallback: true,
          outcome: "fallback",
          reason: fallbackReason,
        };
      } else {
        try {
          const calendarToolsActive = await this.areGoogleCalendarToolsAvailable(input.tenant.companyId);
          const contactPhone = await this.resolveContactPhone(conversation.id, input.tenant.companyId, input.dto);
          const tools = calendarToolsActive ? this.getGoogleCalendarToolsDefinitions() : undefined;

          const promptMessages = buildConversationPromptMessages({
            assistantName: assistant.name,
            assistantDescription: assistant.description,
            initialMessage: assistant.initialMessage,
            instructions: assistant.instructions,
            knowledgeItems,
            historyMessages: priorHistory,
            currentMessage: interpretedMessage,
            calendarContext: calendarToolsActive ? {
              conversationId: conversation.id,
              contactPhone,
            } : null,
          });

          let loopCount = 0;
          let toolCallsResolved = false;
          let completion: any;

          while (loopCount < 5 && !toolCallsResolved) {
            completion = await this.aiService.generateChatCompletion({
              companyId: input.tenant.companyId,
              messages: promptMessages,
              model: resolvedModel.model,
              temperature,
              tools,
            });

            if (completion.toolCalls && completion.toolCalls.length > 0) {
              promptMessages.push({
                role: "assistant",
                content: completion.answer || "",
                tool_calls: completion.toolCalls,
              } as any);

              await this.prisma.assistantConversationMessage.create({
                data: {
                  companyId: input.tenant.companyId,
                  assistantId: input.assistantId,
                  conversationId: conversation.id,
                  role: "assistant",
                  content: completion.answer || "",
                  externalPayload: this.toSerializableJsonValue({
                    tool_calls: completion.toolCalls,
                  }),
                  mode: "ai-runtime",
                },
              });

              for (const toolCall of completion.toolCalls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);
                let resultString = "";

                try {
                  const isMutating = ["calendar.createBooking", "calendar.rescheduleBooking", "calendar.cancelBooking"].includes(toolName);
                  if (isMutating) {
                    await this.logToolAction(input.tenant.companyId, "confirmation_required", { toolName, args: toolArgs });

                    const isConfirmed = /(sim|pode|confirmo|confirmar|isso\s+mesmo|ok|fechado|perfeito|pode\s+reservar|pode\s+cancelar|pode\s+remarcar)/i.test(interpretedMessage);
                    if (!isConfirmed) {
                      await this.logToolAction(input.tenant.companyId, "confirmation_missing", { toolName, args: toolArgs });
                      resultString = JSON.stringify({
                        error: "Confirmação pendente. Você deve apresentar os detalhes da ação (resumo claro) e pedir confirmação explícita ao usuário (ex: 'Confirmando: ..., posso confirmar?') antes de prosseguir."
                      });
                    } else {
                      await this.logToolAction(input.tenant.companyId, "confirmation_received", { toolName, args: toolArgs });
                      resultString = await this.executeTool(input.tenant.companyId, toolName, toolArgs);
                    }
                  } else {
                    resultString = await this.executeTool(input.tenant.companyId, toolName, toolArgs);
                  }
                } catch (err) {
                  const errMsg = err instanceof Error ? err.message : "Erro desconhecido na chamada da ferramenta.";
                  resultString = JSON.stringify({ error: errMsg });
                }

                promptMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  name: toolName,
                  content: resultString,
                } as any);

                await this.prisma.assistantConversationMessage.create({
                  data: {
                    companyId: input.tenant.companyId,
                    assistantId: input.assistantId,
                    conversationId: conversation.id,
                    role: "tool",
                    content: resultString,
                    externalPayload: this.toSerializableJsonValue({
                      tool_call_id: toolCall.id,
                      name: toolName,
                    }),
                    mode: "ai-runtime",
                  },
                });
              }

              loopCount++;
            } else {
              toolCallsResolved = true;
            }
          }

          answer = completion.answer;
          runtime = {
            ...runtime,
            mode: "ai-runtime",
            fallback: false,
            outcome: "success",
            provider: completion.provider,
            model: completion.model,
            reason: undefined,
          };
        } catch (error) {
          console.error("COMPLETION ERROR TRACE:", error);
          const fallbackReason = this.resolveProviderFallbackReason(error);
          providerErrorLogFields = this.extractProviderErrorLogFields(error);
          runtime = {
            ...runtime,
            mode: "deterministic-runtime",
            fallback: true,
            outcome: "fallback",
            reason: fallbackReason,
            warning: this.buildDeterministicRuntimeWarning(fallbackReason),
          };
        }
      }
    }

    runtime = {
      ...runtime,
      summary: this.buildRuntimeSummary({
        question: interpretedMessage,
        mode: runtime.mode,
        sourcesCount: sources.length,
        outcome: runtime.outcome,
        historyMessagesUsed: runtime.context.historyMessagesUsed,
      }),
    };

    const { assistantMessage, runtimeLogId } = await this.prisma.$transaction(async (tx) => {
      const createdAssistantMessage = await tx.assistantConversationMessage.create({
        data: {
          companyId: input.tenant.companyId,
          assistantId: input.assistantId,
          conversationId: conversation.id,
          role: "assistant",
          content: answer,
          sources,
          mode: runtime.mode,
        },
        select: assistantConversationMessageSafeSelect,
      });

      const runtimeLog = await tx.assistantRuntimeLog.create({
        data: {
          companyId: input.tenant.companyId,
          assistantId: assistant.id,
          conversationId: conversation.id,
          userMessageId: userMessage.id,
          assistantMessageId: createdAssistantMessage.id,
          mode: runtime.mode,
          status: this.resolveRuntimeLogStatus(runtime),
          provider: runtime.provider ?? runtimeConfig.provider ?? null,
          model: (runtime.model ?? resolvedModel.model) || null,
          configurationSource: runtime.configurationSource,
          fallback: runtime.fallback,
          fallbackReason: runtime.reason ?? null,
          outcome: runtime.outcome,
          durationMs: Date.now() - runtimeStartedAt,
          providerStatus: providerErrorLogFields.providerStatus ?? null,
          providerErrorType: providerErrorLogFields.providerErrorType ?? null,
          providerErrorCode: providerErrorLogFields.providerErrorCode ?? null,
          providerErrorMessage: providerErrorLogFields.providerErrorMessage ?? null,
          knowledgeCount: knowledgeItems.length,
          historyMessagesUsed: runtime.context.historyMessagesUsed,
          historyLimit: runtime.context.historyLimit,
          initialMessageIncluded: runtime.context.initialMessageIncluded,
          instructionsIncluded: runtime.context.instructionsIncluded,
        },
        select: {
          id: true,
        },
      });

      await tx.assistantConversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          title: conversation.title,
        },
        select: {
          id: true,
        },
      });

      return {
        assistantMessage: createdAssistantMessage,
        runtimeLogId: runtimeLog.id,
      };
    });

    runtime = {
      ...runtime,
      logId: runtimeLogId,
    };

    if (source === "chatwoot") {
      await this.sendChatwootOutboundText({
        conversation: {
          ...conversation,
          sourceProvider: source,
          externalConversationId:
            input.dto.externalConversationId ?? conversation.externalConversationId,
          externalContactId: input.dto.externalContactId ?? conversation.externalContactId,
          externalInboxId: input.dto.externalInboxId ?? conversation.externalInboxId,
          externalChannelId: input.dto.externalChannelId ?? conversation.externalChannelId,
        },
        assistantMessageId: assistantMessage.id,
        content: answer,
      });
    }

    return {
      conversationId: conversation.id,
      userMessage: toConversationMessageItem(userMessage),
      assistantMessage: toConversationMessageItem(assistantMessage),
      runtime,
    };
  }

  private async resolveContactPhone(
    conversationId: string,
    companyId: string,
    dto: SendAssistantConversationMessageDto
  ): Promise<string> {
    if (dto.externalSenderPhone?.trim()) {
      return dto.externalSenderPhone.trim();
    }
    if (dto.contact?.phone?.trim()) {
      return dto.contact.phone.trim();
    }

    const lastUserMsg = await this.prisma.assistantConversationMessage.findFirst({
      where: {
        conversationId,
        companyId,
        role: "user",
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastUserMsg && lastUserMsg.externalPayload) {
      const payload = lastUserMsg.externalPayload as any;
      if (payload.externalSenderPhone) return payload.externalSenderPhone;
      if (payload.contact?.phone) return payload.contact.phone;
    }

    return "";
  }

  private async areGoogleCalendarToolsAvailable(companyId: string): Promise<boolean> {
    try {
      const app = await this.prisma.app.findUnique({
        where: { slug: "google_calendar" },
        select: { id: true },
      });
      if (!app) return false;

      const installation = await this.prisma.appInstallation.findUnique({
        where: {
          companyId_appId: {
            companyId,
            appId: app.id,
          },
        },
        select: { status: true, id: true },
      });
      if (!installation || installation.status !== "ACTIVE") return false;

      const credential = await this.prisma.appCredential.findFirst({
        where: {
          companyId,
          installationId: installation.id,
          provider: "google",
          status: "ACTIVE",
        },
      });
      if (!credential) return false;

      const activeResource = await this.prisma.googleCalendarResource.findFirst({
        where: {
          companyId,
          installationId: installation.id,
          active: true,
        },
      });
      return !!activeResource;
    } catch {
      return false;
    }
  }

  private getGoogleCalendarToolsDefinitions() {
    return [
      {
        type: "function",
        function: {
          name: "calendar.checkAvailability",
          description: "Consulta horários disponíveis (slots livres) em recursos conectados ao Google Agenda para um esporte, tipo de recurso ou cobertura específica em uma data e intervalo de horas.",
          parameters: {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "A data no formato YYYY-MM-DD (ex: 2026-07-04)"
              },
              timeFrom: {
                type: "string",
                description: "O horário de início no formato HH:MM (ex: 08:00)"
              },
              timeTo: {
                type: "string",
                description: "O horário de fim no formato HH:MM (ex: 18:00)"
              },
              sportType: {
                type: "string",
                description: "Opcional. Tipo de esporte (ex: beach_tennis, padel, futebol)"
              },
              resourceType: {
                type: "string",
                description: "Opcional. Tipo de recurso/quadra (ex: aberta, coberta, quadra)"
              },
              isCovered: {
                type: "boolean",
                description: "Opcional. Se o recurso deve ser coberto (true) ou descoberto (false)"
              },
              durationMinutes: {
                type: "integer",
                description: "Opcional. Duração do agendamento em minutos. Padrão é 60."
              }
            },
            required: ["date", "timeFrom", "timeTo"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "calendar.createBooking",
          description: "Cria uma nova reserva localmente e no Google Agenda. ATENÇÃO: Esta ação exige confirmação explícita prévia do cliente (como 'sim', 'confirmo', 'pode reservar') contendo um resumo claro dos detalhes antes de ser executada.",
          parameters: {
            type: "object",
            properties: {
              resourceId: {
                type: "string",
                description: "O ID do recurso (quadra/sala) a ser reservado"
              },
              contactName: {
                type: "string",
                description: "Nome do contato para a reserva"
              },
              contactPhone: {
                type: "string",
                description: "Telefone do contato para a reserva"
              },
              startAt: {
                type: "string",
                description: "Data e hora de início no formato ISO 8601 (ex: 2026-07-04T13:00:00.000Z)"
              },
              endAt: {
                type: "string",
                description: "Data e hora de fim no formato ISO 8601 (ex: 2026-07-04T14:00:00.000Z)"
              },
              notes: {
                type: "string",
                description: "Opcional. Observações ou notas adicionais para a reserva"
              }
            },
            required: ["resourceId", "contactName", "contactPhone", "startAt", "endAt"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "calendar.getBookingsByContact",
          description: "Lista agendamentos/reservas futuras ativas de um cliente baseado no número de telefone do contato.",
          parameters: {
            type: "object",
            properties: {
              contactPhone: {
                type: "string",
                description: "O número de telefone do contato (ex: 67999999999)"
              }
            },
            required: ["contactPhone"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "calendar.rescheduleBooking",
          description: "Remarca uma reserva confirmada para uma nova data, horário e opcionalmente um novo recurso. ATENÇÃO: Esta ação exige confirmação explícita prévia do cliente contendo um resumo claro antes de ser executada.",
          parameters: {
            type: "object",
            properties: {
              bookingId: {
                type: "string",
                description: "O ID da reserva existente a ser remarcada"
              },
              newStartAt: {
                type: "string",
                description: "Nova data e hora de início no formato ISO 8601 (ex: 2026-07-04T15:00:00.000Z)"
              },
              newEndAt: {
                type: "string",
                description: "Nova data e hora de fim no formato ISO 8601 (ex: 2026-07-04T16:00:00.000Z)"
              },
              newResourceId: {
                type: "string",
                description: "Opcional. Novo ID do recurso se estiver mudando de quadra/sala"
              },
              reason: {
                type: "string",
                description: "Opcional. Motivo da remarcação"
              }
            },
            required: ["bookingId", "newStartAt", "newEndAt"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "calendar.cancelBooking",
          description: "Cancela uma reserva confirmada existente e a remove do Google Agenda. ATENÇÃO: Esta ação exige confirmação explícita prévia do cliente contendo um resumo claro antes de ser executada.",
          parameters: {
            type: "object",
            properties: {
              bookingId: {
                type: "string",
                description: "O ID da reserva a ser cancelada"
              },
              reason: {
                type: "string",
                description: "Opcional. Motivo do cancelamento"
              }
            },
            required: ["bookingId"]
          }
        }
      }
    ];
  }

  private async executeTool(companyId: string, toolName: string, args: any): Promise<string> {
    const startedAt = Date.now();
    await this.logToolAction(companyId, "tool_call_requested", { toolName, arguments: args });

    try {
      let result: any;
      if (toolName === "calendar.checkAvailability") {
        result = await this.calendarToolsService.checkAvailability({
          companyId,
          dto: args,
        });
      } else if (toolName === "calendar.createBooking") {
        result = await this.calendarToolsService.createBooking({
          companyId,
          dto: args,
        });
      } else if (toolName === "calendar.getBookingsByContact") {
        result = await this.calendarToolsService.getBookingsByContact({
          companyId,
          query: args,
        });
      } else if (toolName === "calendar.rescheduleBooking") {
        result = await this.calendarToolsService.rescheduleBooking({
          companyId,
          bookingId: args.bookingId,
          dto: args,
        });
      } else if (toolName === "calendar.cancelBooking") {
        result = await this.calendarToolsService.cancelBooking({
          companyId,
          bookingId: args.bookingId,
          dto: args,
        });
      } else {
        throw new Error(`Tool not found: ${toolName}`);
      }

      await this.logToolAction(companyId, "tool_call_completed", { toolName, durationMs: Date.now() - startedAt });
      return JSON.stringify(result);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro na chamada do Google Agenda.";
      await this.logToolAction(companyId, "tool_call_failed", { toolName, error: errMsg }, "ERROR");
      throw err;
    }
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata) return metadata;
    try {
      const str = JSON.stringify(metadata);
      const sanitized = str
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
        .replace(/"[^"]*token[^"]*"\s*:\s*"[^"]*"/gi, (match) => {
          const parts = match.split(":");
          return `${parts[0]}:"[redacted]"`;
        })
        .replace(/"[^"]*secret[^"]*"\s*:\s*"[^"]*"/gi, (match) => {
          const parts = match.split(":");
          return `${parts[0]}:"[redacted]"`;
        })
        .replace(/access_token\s*[:=]\s*[^\s,;}]+/gi, "access_token: [redacted]")
        .replace(/refresh_token\s*[:=]\s*[^\s,;}]+/gi, "refresh_token: [redacted]")
        .replace(/client_secret\s*[:=]\s*[^\s,;}]+/gi, "client_secret: [redacted]");
      return JSON.parse(sanitized);
    } catch {
      return metadata;
    }
  }

  private async logToolAction(
    companyId: string,
    action: string,
    metadata: any,
    status: "SUCCESS" | "ERROR" = "SUCCESS"
  ): Promise<void> {
    try {
      const app = await this.prisma.app.findFirst({
        where: { slug: "google_calendar" },
        select: { id: true },
      });
      if (!app) return;

      const installation = await this.prisma.appInstallation.findUnique({
        where: {
          companyId_appId: {
            companyId,
            appId: app.id,
          },
        },
        select: { id: true },
      });

      const sanitizedMetadata = this.sanitizeMetadata(metadata);

      await this.prisma.appActionLog.create({
        data: {
          companyId,
          appId: app.id,
          installationId: installation?.id ?? null,
          action,
          status,
          metadata: this.toSerializableJsonValue(sanitizedMetadata),
        },
      });
    } catch (err) {
      this.logger.error("Failed to write safe log for Google Calendar tool", err);
    }
  }
}
