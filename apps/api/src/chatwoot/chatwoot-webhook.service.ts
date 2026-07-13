import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import { AssistantConversationsService } from "../assistant-conversations/assistant-conversations.service";
import {
  persistInboundAttachment,
  type InboundAttachmentRecord,
} from "../assistant-conversations/inbound-message";
import { PrismaService } from "../database/prisma.service";
import {
  normalizeChatwootMessageCreatedPayload,
  summarizeChatwootPayloadStructure,
  type NormalizedChatwootAttachment,
  type NormalizedChatwootMessage,
} from "../webhooks/chatwoot-normalizer";
import { ChatwootAttachmentDownloaderService } from "./chatwoot-attachment-downloader.service";
import {
  ChatwootInboxConfigService,
  type ResolvedChatwootInboxConfig,
  type ChatwootWebhookDiagnosticTarget,
} from "./chatwoot-inbox-config.service";

export type ChatwootWebhookProcessResult = {
  ok: true;
  source: "chatwoot";
  conversationId?: string;
  messageId?: string;
  ignored?: boolean;
  reason?: string;
};

@Injectable()
export class ChatwootWebhookService {
  private readonly logger = new Logger(ChatwootWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatwootInboxConfigService: ChatwootInboxConfigService,
    private readonly chatwootAttachmentDownloaderService: ChatwootAttachmentDownloaderService,
    private readonly assistantConversationsService: AssistantConversationsService,
  ) {}

  private readonly conversationBuffer = new Map<
    string,
    {
      version: number;
      timeoutId: NodeJS.Timeout;
      items: {
        dto: any;
        attachments: InboundAttachmentRecord[];
        messageId: string | null;
      }[];
    }
  >();

  async processMessageCreated(input: {
    assistantId?: string | null;
    payload: unknown;
    webhookSecret?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
  }): Promise<ChatwootWebhookProcessResult> {
    const traceLabel = this.buildTraceLabel(input.requestId ?? null, input.correlationId ?? null);
    this.logger.log(
      `Chatwoot webhook payload structure${traceLabel}: ${JSON.stringify(
        summarizeChatwootPayloadStructure(input.payload),
      )}`,
    );
    const normalized = normalizeChatwootMessageCreatedPayload(input.payload);
    const diagnostic = await this.recordWebhookReceived({
      event: normalized.eventName,
      accountId: normalized.accountId,
      inboxId: normalized.externalInboxId,
      conversationId: normalized.externalConversationId || null,
      messageType: normalized.messageType,
      requestId: input.requestId ?? null,
    });
    const finish = async (
      result: ChatwootWebhookProcessResult,
      responseSent = false,
    ): Promise<ChatwootWebhookProcessResult> => {
      await this.completeWebhookDiagnostic(diagnostic, {
        ignoredReason: result.ignored ? (result.reason ?? "IGNORED") : null,
        responseSent,
      });
      return result;
    };
    this.logger.log(
      `Chatwoot webhook received${traceLabel}: event=${normalized.eventName ?? "unknown"} account=${normalized.accountId ?? "unknown"} inbox=${normalized.externalInboxId ?? "unknown"}`,
    );

    const preConfigIgnoreReason = this.resolveIgnoreReason(normalized, true, {
      allowUnknownAiActive: true,
    });
    if (preConfigIgnoreReason) {
      this.logger.log(`Chatwoot webhook ignored${traceLabel}: ${preConfigIgnoreReason}`);
      return finish(this.ignore(preConfigIgnoreReason));
    }

    if (!normalized.externalConversationId) {
      await this.completeWebhookDiagnostic(diagnostic, {
        ignoredReason: "MISSING_CONVERSATION_ID",
        responseSent: false,
      });
      throw new BadRequestException("Payload do CuboChat sem identificador de conversa.");
    }

    let config: ResolvedChatwootInboxConfig | null;
    try {
      config = await this.resolveConfigOrIgnore(
        normalized,
        input.webhookSecret ?? null,
        traceLabel,
      );
    } catch (error) {
      await this.completeWebhookDiagnostic(diagnostic, {
        ignoredReason:
          error instanceof ForbiddenException ? "WEBHOOK_AUTH_FAILED" : "CONFIG_RESOLUTION_FAILED",
        responseSent: false,
      });
      throw error;
    }
    if (!config) {
      return finish(this.ignore("Nenhuma configuração ativa encontrada para o inbox."));
    }

    // Safely check AI active status. If null, fetch from API.
    let finalAiActive = normalized.aiActive;
    if (finalAiActive === null) {
      this.logger.log(`Chatwoot webhook aiActive is null${traceLabel}, fetching from API...`);
      finalAiActive = await this.fetchConversationAiActiveStatus(
        config,
        normalized.externalConversationId,
        traceLabel,
      );
      this.logger.log(`Chatwoot webhook aiActive from API${traceLabel}: ${finalAiActive}`);
    }

    const ignoreReason = this.resolveIgnoreReason(normalized, finalAiActive);
    if (ignoreReason) {
      this.logger.log(`Chatwoot webhook ignored${traceLabel}: ${ignoreReason}`);
      return finish(this.ignore(ignoreReason));
    }

    const assistantId = await this.resolveAssistantIdOrIgnore(
      config,
      input.assistantId ?? null,
      traceLabel,
    );
    if (!assistantId) {
      return finish(this.ignore("Nenhum assistente ativo foi vinculado a esta inbox."));
    }

    const duplicate = await this.findDuplicateMessage(config.companyId, normalized.messageId);
    if (duplicate) {
      this.logger.log(
        `Chatwoot duplicate message ignored${traceLabel}: company=${config.companyId} messageId=${normalized.messageId ?? "unknown"}`,
      );
      return finish({
        ok: true,
        source: "chatwoot",
        conversationId: duplicate.conversationId,
        messageId: duplicate.id,
        ignored: true,
        reason: "duplicate",
      });
    }

    try {
      const tenant = { companyId: config.companyId };
      const user = {
        id: `system_chatwoot_${config.companyId}`,
        companyId: config.companyId,
        primaryCompanyId: config.companyId,
        activeCompanyId: config.companyId,
        email: "system-chatwoot@cubo.local",
        name: "System Chatwoot",
        memberships: [config.companyId],
        roles: [],
        permissions: [],
      };

      const conversation =
        await this.assistantConversationsService.ensureConversationFromInboundMessage({
          assistantId,
          createdByUserId: null,
          sourceProvider: "chatwoot",
          externalAccountId: normalized.accountId ?? config.accountId,
          externalConversationId: normalized.externalConversationId,
          externalContactId: normalized.externalContactId,
          externalChannelId: normalized.externalChannelId,
          externalInboxId: normalized.externalInboxId,
          externalSenderIdentifier: normalized.senderIdentifier,
          externalSenderPhone: normalized.senderPhoneNumber,
          title: normalized.conversationTitle ?? null,
          tenant,
          user,
        });

      const preparedAttachments = await this.downloadAndPersistAttachments({
        conversationId: conversation.id,
        source: "chatwoot",
        externalMessageId: normalized.messageId,
        config,
        attachments: normalized.dto.attachments ?? [],
        traceLabel,
      });

      const assistantSettings = await this.prisma.assistant.findFirst({
        where: { id: assistantId, companyId: config.companyId },
        select: { messageBufferEnabled: true, messageBufferSeconds: true },
      });

      if (assistantSettings?.messageBufferEnabled && assistantSettings.messageBufferSeconds > 0) {
        const bufferedResult = await this.handleBufferedMessage({
          conversationId: conversation.id,
          assistantId,
          config,
          normalized,
          preparedAttachments,
          traceLabel,
          bufferSeconds: assistantSettings.messageBufferSeconds,
          user,
          tenant,
          requestId: input.requestId ?? null,
          correlationId: input.correlationId ?? null,
        });
        return finish(bufferedResult);
      }

      this.logger.log(
        `Chatwoot runtime call started${traceLabel}: company=${config.companyId} assistant=${assistantId} attachments=${preparedAttachments.length}`,
      );
      const response = await this.assistantConversationsService.sendMessage({
        assistantId,
        conversationId: conversation.id,
        dto: normalized.dto,
        user,
        tenant,
        requestId: input.requestId ?? null,
        correlationId: input.correlationId ?? null,
        preparedAttachments,
      });

      this.logger.log(
        `Chatwoot webhook processed${traceLabel}: company=${config.companyId} conversation=${response.conversationId} attachments=${preparedAttachments.length}`,
      );

      return finish(
        {
          ok: true,
          source: "chatwoot",
          conversationId: response.conversationId,
          messageId: response.assistantMessage?.id ?? response.userMessage.id,
        },
        true,
      );
    } catch (error) {
      await this.completeWebhookDiagnostic(diagnostic, {
        ignoredReason: "PROCESSING_ERROR",
        responseSent: false,
      });
      if (error instanceof HttpException) {
        throw error;
      }

      if (this.isPrismaForeignKeyError(error)) {
        this.logger.warn(
          `Chatwoot webhook rejected${traceLabel}: foreign key constraint while processing inbound message. company=${config.companyId} assistant=${assistantId} account=${normalized.accountId ?? "unknown"} inbox=${normalized.externalInboxId ?? "unknown"} conversation=${normalized.externalConversationId}`,
        );
        throw new BadRequestException(
          "Não foi possível processar o webhook do CuboChat com os dados recebidos.",
        );
      }

      throw error;
    }
  }

  private async handleBufferedMessage(input: {
    conversationId: string;
    assistantId: string;
    config: ResolvedChatwootInboxConfig;
    normalized: NormalizedChatwootMessage;
    preparedAttachments: InboundAttachmentRecord[];
    traceLabel: string;
    bufferSeconds: number;
    user: any;
    tenant: any;
    requestId: string | null;
    correlationId: string | null;
  }): Promise<ChatwootWebhookProcessResult> {
    const { conversationId, bufferSeconds } = input;

    let buffer = this.conversationBuffer.get(conversationId);
    let jobSkippedBecauseNewerExists = false;

    if (buffer) {
      clearTimeout(buffer.timeoutId);
      jobSkippedBecauseNewerExists = true;
      buffer.version++;
    } else {
      buffer = { version: 1, timeoutId: null as any, items: [] };
      this.conversationBuffer.set(conversationId, buffer);
    }

    buffer.items.push({
      dto: input.normalized.dto,
      attachments: input.preparedAttachments,
      messageId: input.normalized.messageId ?? null,
    });

    const bufferedMessageCount = buffer.items.length;
    const scheduledVersion = buffer.version;

    this.logger.log(
      `Chatwoot message buffered${input.traceLabel}: conversation=${conversationId} ` +
        `bufferVersion=${scheduledVersion} bufferedMessageCount=${bufferedMessageCount} ` +
        `skippedOldTimer=${jobSkippedBecauseNewerExists} receivedMessageId=${input.normalized.messageId ?? "unknown"}`,
    );

    buffer.timeoutId = setTimeout(async () => {
      const currentBuffer = this.conversationBuffer.get(conversationId);
      if (!currentBuffer || currentBuffer.version !== scheduledVersion) {
        this.logger.log(
          `Chatwoot timer aborted for conversation=${conversationId} (scheduledVersion=${scheduledVersion}, currentVersion=${currentBuffer?.version ?? "deleted"})`,
        );
        return;
      }

      // Remove from map to start a fresh buffer for future messages
      this.conversationBuffer.delete(conversationId);

      const itemsToProcess = currentBuffer.items;
      if (itemsToProcess.length === 0) return;

      // Combine DTOs
      const combinedMessage = itemsToProcess
        .map((i) => i.dto.message)
        .filter((m) => m && typeof m === "string" && m.trim().length > 0)
        .join("\n");

      const textPreview =
        combinedMessage.length > 120 ? combinedMessage.substring(0, 120) + "..." : combinedMessage;
      this.logger.log(
        `Chatwoot flushing buffer for conversation=${conversationId}: processedMessageCount=${itemsToProcess.length}, preview="${textPreview}"`,
      );

      const combinedAttachments = itemsToProcess.flatMap((i) => i.attachments);

      const combinedDto = {
        ...itemsToProcess[0].dto, // Use base fields from the first message
        message: combinedMessage,
        attachments: itemsToProcess.flatMap((i) => i.dto.attachments || []),
      };

      try {
        await this.assistantConversationsService.sendMessage({
          assistantId: input.assistantId,
          conversationId: input.conversationId,
          dto: combinedDto,
          user: input.user,
          tenant: input.tenant,
          requestId: input.requestId,
          correlationId: input.correlationId,
          preparedAttachments: combinedAttachments,
        });
        await this.recordResponseSent(input.config.id);
      } catch (err) {
        this.logger.error(
          `Error processing buffered messages for conversation=${conversationId}: ${err}`,
        );
      }
    }, bufferSeconds * 1000);

    return {
      ok: true,
      source: "chatwoot",
      conversationId,
      messageId: input.normalized.messageId ?? undefined,
    };
  }

  private async resolveAssistantIdOrIgnore(
    config: ResolvedChatwootInboxConfig,
    legacyAssistantId: string | null,
    traceLabel: string,
  ): Promise<string | null> {
    const configuredAssistantId = config.assistantId?.trim() ?? null;
    if (configuredAssistantId) {
      if (config.assistantStatus !== "ACTIVE") {
        this.logger.warn(
          `Chatwoot webhook ignored${traceLabel}: configured assistant is not active. company=${config.companyId} assistant=${configuredAssistantId}`,
        );
        return null;
      }

      return configuredAssistantId;
    }

    const requestedAssistantId = legacyAssistantId?.trim() ?? null;
    if (!requestedAssistantId) {
      this.logger.warn(
        `Chatwoot webhook ignored${traceLabel}: no assistant configured for company=${config.companyId} account=${config.accountId} inbox=${config.inboxId}.`,
      );
      return null;
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        companyId: config.companyId,
        id: requestedAssistantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    if (!assistant) {
      this.logger.warn(
        `Chatwoot webhook ignored${traceLabel}: legacy assistant not found or inactive. company=${config.companyId} assistant=${requestedAssistantId}`,
      );
      return null;
    }

    return assistant.id;
  }

  private async resolveConfigOrIgnore(
    normalized: NormalizedChatwootMessage,
    webhookSecret: string | null,
    traceLabel: string,
  ): Promise<ResolvedChatwootInboxConfig | null> {
    if (!normalized.accountId || !normalized.externalInboxId) {
      this.logger.warn(
        `Chatwoot webhook ignored${traceLabel}: missing account or inbox identifiers.`,
      );
      return null;
    }

    const config = await this.chatwootInboxConfigService.resolveActiveByWebhook({
      accountId: normalized.accountId,
      inboxId: normalized.externalInboxId,
    });

    if (!config) {
      this.logger.warn(
        `Chatwoot webhook ignored${traceLabel}: no active config for account=${normalized.accountId} inbox=${normalized.externalInboxId}.`,
      );
      return null;
    }

    const secureModeAllowed = await this.chatwootInboxConfigService.isWebhookSecureModeAllowed();
    if (config.webhookSecret) {
      if (!webhookSecret || !this.isSecretMatch(webhookSecret, config.webhookSecret)) {
        throw new ForbiddenException("Invalid Chatwoot webhook secret.");
      }
    } else if (!secureModeAllowed) {
      throw new ForbiddenException("Chatwoot webhook secret is required in production.");
    }

    this.logger.log(
      `Chatwoot tenant resolved${traceLabel}: company=${config.companyId} account=${config.accountId} inbox=${config.inboxId} assistant=${config.assistantId ?? "none"}`,
    );
    return config;
  }

  private resolveIgnoreReason(
    normalized: NormalizedChatwootMessage,
    finalAiActive: boolean | null,
    options?: {
      allowUnknownAiActive?: boolean;
    },
  ): string | null {
    const eventName = normalized.eventName?.trim().toLowerCase() ?? "";
    if (eventName && eventName !== "message_created") {
      return "event=non_message_created";
    }

    if (normalized.isPrivate) {
      return "PRIVATE_MESSAGE";
    }

    const messageType =
      normalized.messageType?.trim().toLowerCase() ??
      normalized.dto.messageType?.trim().toLowerCase() ??
      "";
    if (messageType === "outgoing") {
      return "AUTOMATED_OUTGOING_MESSAGE";
    }

    if (messageType !== "incoming") {
      return "NOT_INCOMING_MESSAGE";
    }

    const senderType = normalized.senderType?.trim().toLowerCase() ?? "";
    if (
      senderType === "agent_bot" ||
      senderType === "bot" ||
      senderType === "assistant" ||
      senderType === "agent"
    ) {
      return `sender_type=${senderType}`;
    }

    if (finalAiActive === false) {
      return "AI_INACTIVE";
    }

    if (finalAiActive === null && options?.allowUnknownAiActive !== true) {
      return null;
    }

    return null;
  }

  private isSecretMatch(providedSecret: string, expectedSecret: string): boolean {
    const providedBuffer = Buffer.from(providedSecret.trim());
    const expectedBuffer = Buffer.from(expectedSecret.trim());

    if (providedBuffer.byteLength !== expectedBuffer.byteLength) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }

  private isPrismaForeignKeyError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
  }

  private async downloadAndPersistAttachments(input: {
    conversationId: string;
    source: "chatwoot";
    externalMessageId: string | null;
    config: ResolvedChatwootInboxConfig;
    attachments: NormalizedChatwootAttachment[];
    traceLabel: string;
  }): Promise<InboundAttachmentRecord[]> {
    const records: InboundAttachmentRecord[] = [];

    for (const attachment of input.attachments) {
      this.logger.log(
        `Chatwoot attachment found${input.traceLabel}: file=${attachment.fileName} type=${attachment.type} mime=${attachment.mimeType}`,
      );

      const hasDownloadCandidate = Boolean(
        attachment.dataUrl?.trim() || attachment.url?.trim() || attachment.thumbUrl?.trim(),
      );
      const pendingDownload = !hasDownloadCandidate && Boolean(attachment.attachmentStoragePending);
      if (pendingDownload) {
        const placeholder = await persistInboundAttachment({
          conversationId: input.conversationId,
          externalMessageId: input.externalMessageId,
          source: input.source,
          type: attachment.type,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          size: attachment.size ?? 0,
          buffer: Buffer.alloc(0),
          caption: attachment.caption ?? undefined,
          durationSeconds: attachment.durationSeconds ?? undefined,
          extractedText: attachment.extractedText ?? undefined,
          transcript: attachment.transcript ?? undefined,
          description: attachment.description ?? undefined,
        });

        records.push({
          ...placeholder,
          processingStatus: "pending",
          processingError: null,
          interpretedSummary: "Anexo ainda não estava pronto neste webhook inicial.",
          metadataJson: {
            kind: "pending-download",
            attachmentStoragePending: attachment.attachmentStoragePending === true,
            originalFileName: attachment.fileName,
            originalMimeType: attachment.mimeType,
          },
        });

        this.logger.log(
          `Chatwoot attachment pending${input.traceLabel}: file=${attachment.fileName} type=${attachment.type}`,
        );
        continue;
      }

      try {
        const downloaded = await this.chatwootAttachmentDownloaderService.downloadAttachment({
          config: input.config,
          attachment,
          traceLabel: input.traceLabel,
        });

        const record = await persistInboundAttachment({
          conversationId: input.conversationId,
          externalMessageId: input.externalMessageId,
          source: input.source,
          type: downloaded.resolvedType,
          fileName: downloaded.fileName,
          mimeType: downloaded.mimeType,
          size: downloaded.sizeBytes,
          buffer: downloaded.buffer,
          sourceUrl: downloaded.sourceUrl,
          thumbUrl: downloaded.thumbUrl ?? undefined,
          caption: attachment.caption ?? undefined,
          durationSeconds: attachment.durationSeconds ?? undefined,
          extractedText: attachment.extractedText ?? undefined,
          transcript: attachment.transcript ?? undefined,
          description: attachment.description ?? undefined,
        });

        records.push({
          ...record,
          type: downloaded.resolvedType,
          sourceUrl: downloaded.sourceUrl,
          metadataJson: downloaded.metadataJson,
        });
      } catch (error) {
        const errorCode =
          error instanceof Error && "code" in error && typeof error.code === "string"
            ? error.code
            : "DOWNLOAD_FAILED";
        const placeholder = await persistInboundAttachment({
          conversationId: input.conversationId,
          externalMessageId: input.externalMessageId,
          source: input.source,
          type: attachment.type,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          size: attachment.size ?? 0,
          buffer: Buffer.alloc(0),
          caption: attachment.caption ?? undefined,
          durationSeconds: attachment.durationSeconds ?? undefined,
          extractedText: attachment.extractedText ?? undefined,
          transcript: attachment.transcript ?? undefined,
          description: attachment.description ?? undefined,
        });

        records.push({
          ...placeholder,
          processingStatus: "failed",
          processingError:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Falha ao baixar anexo do Chatwoot.",
          interpretedSummary: "Anexo do Chatwoot não pôde ser baixado nesta tentativa.",
          metadataJson: {
            kind: "download-failed",
            errorCode,
            originalFileName: attachment.fileName,
            originalMimeType: attachment.mimeType,
          },
        });

        this.logger.warn(
          `Chatwoot attachment download failed${input.traceLabel}: file=${attachment.fileName} type=${attachment.type} errorCode=${errorCode}`,
        );
      }
    }

    return records;
  }

  private async findDuplicateMessage(
    companyId: string,
    externalMessageId: string | null,
  ): Promise<{ id: string; conversationId: string } | null> {
    if (!externalMessageId) {
      return null;
    }

    const existing = await this.prisma.assistantConversationMessage.findFirst({
      where: {
        companyId,
        source: "chatwoot",
        externalMessageId,
      },
      select: {
        id: true,
        conversationId: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return existing ?? null;
  }

  private ignore(reason: string): ChatwootWebhookProcessResult {
    return {
      ok: true,
      source: "chatwoot",
      ignored: true,
      reason,
    };
  }

  private async recordWebhookReceived(input: {
    event: string | null;
    accountId: string | null;
    inboxId: string | null;
    conversationId: string | null;
    messageType: string | null;
    requestId: string | null;
  }): Promise<ChatwootWebhookDiagnosticTarget> {
    const service = this.chatwootInboxConfigService as ChatwootInboxConfigService & {
      recordWebhookReceived?: ChatwootInboxConfigService["recordWebhookReceived"];
    };
    if (typeof service.recordWebhookReceived !== "function") {
      return { configId: null, diagnosticId: null };
    }
    return service.recordWebhookReceived(input);
  }

  private async completeWebhookDiagnostic(
    target: ChatwootWebhookDiagnosticTarget,
    input: { ignoredReason: string | null; responseSent: boolean },
  ): Promise<void> {
    const service = this.chatwootInboxConfigService as ChatwootInboxConfigService & {
      completeWebhookDiagnostic?: ChatwootInboxConfigService["completeWebhookDiagnostic"];
    };
    if (typeof service.completeWebhookDiagnostic === "function") {
      await service.completeWebhookDiagnostic(target, input);
    }
  }

  private async recordResponseSent(configId: string): Promise<void> {
    const service = this.chatwootInboxConfigService as ChatwootInboxConfigService & {
      recordResponseSent?: ChatwootInboxConfigService["recordResponseSent"];
    };
    if (typeof service.recordResponseSent === "function") {
      await service.recordResponseSent(configId);
    }
  }

  private buildTraceLabel(requestId: string | null, correlationId: string | null): string {
    const parts = [
      requestId ? `requestId=${requestId}` : null,
      correlationId ? `correlationId=${correlationId}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? ` [${parts.join(" ")}]` : "";
  }

  private async fetchConversationAiActiveStatus(
    config: ResolvedChatwootInboxConfig,
    conversationId: string | null,
    traceLabel: string,
  ): Promise<boolean | null> {
    if (!conversationId || !config.baseUrl || !config.apiAccessToken) return null;

    const accountIdentifier = config.accountId;
    const baseUrl = config.baseUrl.trim().replace(/\/$/, "");
    const apiUrl = `${baseUrl}/api/v1/accounts/${encodeURIComponent(accountIdentifier)}/conversations/${encodeURIComponent(conversationId)}`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          api_access_token: config.apiAccessToken,
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch conversation status from Chatwoot API${traceLabel}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const json = (await response.json()) as any;
      const customAttributes = json?.custom_attributes || {};
      const additionalAttributes = json?.additional_attributes || {};
      const meta = json?.meta || {};

      const aiActive =
        json?.ai_active ??
        customAttributes?.ai_active ??
        additionalAttributes?.ai_active ??
        meta?.ai_active ??
        null;

      if (aiActive !== null) {
        return Boolean(aiActive);
      }

      return null;
    } catch (err) {
      this.logger.warn(
        `Failed to fetch conversation status from Chatwoot API${traceLabel}: ${err}`,
      );
      return null;
    }
  }
}
