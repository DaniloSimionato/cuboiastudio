import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { type UpsertChatwootInboxConfigDto } from "./dto/upsert-chatwoot-inbox-config.dto";

const chatwootInboxConfigSelect = {
  id: true,
  companyId: true,
  assistantId: true,
  name: true,
  baseUrl: true,
  accountId: true,
  inboxId: true,
  apiAccessTokenEncrypted: true,
  apiAccessTokenIv: true,
  apiAccessTokenAuthTag: true,
  webhookSecretEncrypted: true,
  webhookSecretIv: true,
  webhookSecretAuthTag: true,
  isActive: true,
  metadataJson: true,
  lastApiTestAt: true,
  lastApiTestOk: true,
  lastWebhookAt: true,
  lastWebhookEvent: true,
  lastWebhookAccountId: true,
  lastWebhookInboxId: true,
  lastWebhookConversationId: true,
  lastWebhookMessageType: true,
  lastWebhookIgnoredReason: true,
  lastWebhookRequestId: true,
  lastResponseAt: true,
  createdAt: true,
  updatedAt: true,
  assistant: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
} satisfies Prisma.ChatwootInboxConfigSelect;

type ChatwootInboxConfigRecord = Prisma.ChatwootInboxConfigGetPayload<{
  select: typeof chatwootInboxConfigSelect;
}>;

type AssistantRecord = Prisma.AssistantGetPayload<{
  select: {
    id: true;
    name: true;
    status: true;
  };
}>;

type EncryptedSecretPayload = {
  encryptedValue: string;
  valueIv: string;
  valueAuthTag: string;
};

export type SafeChatwootInboxConfig = {
  id: string;
  companyId: string;
  assistantId: string | null;
  assistantName: string | null;
  assistantStatus: AssistantRecord["status"] | null;
  name: string;
  baseUrl: string;
  accountId: string;
  inboxId: string;
  isActive: boolean;
  metadataJson: Prisma.JsonValue | null;
  apiAccessTokenConfigured: boolean;
  webhookSecretConfigured: boolean;
  lastApiTestAt: Date | null;
  lastApiTestOk: boolean | null;
  lastWebhookAt: Date | null;
  lastWebhookEvent: string | null;
  lastWebhookAccountId: string | null;
  lastWebhookInboxId: string | null;
  lastWebhookConversationId: string | null;
  lastWebhookMessageType: string | null;
  lastWebhookIgnoredReason: string | null;
  lastWebhookRequestId: string | null;
  lastResponseAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ResolvedChatwootInboxConfig = SafeChatwootInboxConfig & {
  apiAccessToken: string | null;
  webhookSecret: string | null;
};

export type ChatwootInboxConfigTestResult = {
  ok: boolean;
  message: string;
  reason?: string;
  details?: {
    accountId: string;
    inboxId: string;
    baseUrl: string;
    canReadInbox: boolean;
    webhookUrlTemplate: string;
    assistantId: string | null;
    assistantName: string | null;
    assistantStatus: AssistantRecord["status"] | null;
    assistantConfigured: boolean;
  };
};

export type ChatwootWebhookDiagnosticTarget = {
  configId: string | null;
  diagnosticId: string | null;
};

function trimNullableText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveNullableTextInput(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function safeDiagnosticText(value: string | null, maxLength = 200): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

@Injectable()
export class ChatwootInboxConfigService {
  private readonly logger = new Logger(ChatwootInboxConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async list(companyId: string): Promise<SafeChatwootInboxConfig[]> {
    const configs = await this.prisma.chatwootInboxConfig.findMany({
      where: { companyId },
      select: chatwootInboxConfigSelect,
      orderBy: [{ createdAt: "desc" }],
    });

    return configs.map((config) => this.toSafeConfig(config));
  }

  async findById(companyId: string, id: string): Promise<SafeChatwootInboxConfig> {
    const config = await this.prisma.chatwootInboxConfig.findFirst({
      where: { companyId, id },
      select: chatwootInboxConfigSelect,
    });

    if (!config) {
      throw new NotFoundException("Chatwoot inbox config not found.");
    }

    return this.toSafeConfig(config);
  }

  async upsert(
    companyId: string,
    dto: UpsertChatwootInboxConfigDto,
  ): Promise<SafeChatwootInboxConfig> {
    const existing = await this.prisma.chatwootInboxConfig.findUnique({
      where: {
        companyId_accountId_inboxId: {
          companyId,
          accountId: dto.accountId,
          inboxId: dto.inboxId,
        },
      },
      select: chatwootInboxConfigSelect,
    });

    const apiAccessToken = await this.resolveEncryptedSecret(dto.apiAccessToken);
    const webhookSecret = await this.resolveEncryptedSecret(dto.webhookSecret);
    const metadataJson = this.resolveMetadataJsonInput(
      dto.metadataJson,
      existing?.metadataJson ?? null,
    );
    const baseUrl = this.resolveRequiredTextInput(dto.baseUrl, "Chatwoot baseUrl is required.");
    const name = this.resolveRequiredTextInput(dto.name, "Chatwoot inbox name is required.");
    const accountId = this.resolveRequiredTextInput(
      dto.accountId,
      "Chatwoot accountId is required.",
    );
    const inboxId = this.resolveRequiredTextInput(dto.inboxId, "Chatwoot inboxId is required.");
    const assistantId = this.resolveAssistantIdForWrite(
      dto.assistantId,
      existing?.assistantId ?? null,
    );

    if (dto.assistantId !== undefined && assistantId) {
      await this.ensureAssistantBelongsToCompany(companyId, assistantId);
    }

    try {
      const record = await this.prisma.chatwootInboxConfig.upsert({
        where: {
          companyId_accountId_inboxId: {
            companyId,
            accountId,
            inboxId,
          },
        },
        update: {
          name,
          baseUrl,
          assistantId,
          accountId,
          inboxId,
          isActive: dto.isActive ?? existing?.isActive ?? true,
          metadataJson,
          ...this.buildApiAccessTokenWriteFields(apiAccessToken, existing),
          ...this.buildWebhookSecretWriteFields(webhookSecret, existing),
        },
        create: {
          companyId,
          assistantId,
          name,
          baseUrl,
          accountId,
          inboxId,
          isActive: dto.isActive ?? true,
          metadataJson: this.resolveMetadataJsonInput(dto.metadataJson, null),
          ...this.buildApiAccessTokenWriteFields(apiAccessToken, null),
          ...this.buildWebhookSecretWriteFields(webhookSecret, null),
        },
        select: chatwootInboxConfigSelect,
      });

      return this.toSafeConfig(record);
    } catch (error) {
      this.logger.error(
        `Failed to upsert Chatwoot inbox config for company=${companyId} account=${accountId} inbox=${inboxId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException("Não foi possível salvar a configuração do Chatwoot.");
    }
  }

  async updateById(
    companyId: string,
    id: string,
    dto: UpsertChatwootInboxConfigDto,
  ): Promise<SafeChatwootInboxConfig> {
    const existing = await this.prisma.chatwootInboxConfig.findFirst({
      where: { companyId, id },
      select: chatwootInboxConfigSelect,
    });

    if (!existing) {
      throw new NotFoundException("Chatwoot inbox config not found.");
    }

    const apiAccessToken = await this.resolveEncryptedSecret(dto.apiAccessToken);
    const webhookSecret = await this.resolveEncryptedSecret(dto.webhookSecret);
    const metadataJson = this.resolveMetadataJsonInput(
      dto.metadataJson,
      existing.metadataJson ?? null,
    );
    const baseUrl = this.resolveRequiredTextInput(dto.baseUrl, "Chatwoot baseUrl is required.");
    const name = this.resolveRequiredTextInput(dto.name, "Chatwoot inbox name is required.");
    const accountId = this.resolveRequiredTextInput(
      dto.accountId,
      "Chatwoot accountId is required.",
    );
    const inboxId = this.resolveRequiredTextInput(dto.inboxId, "Chatwoot inboxId is required.");
    const assistantId = this.resolveAssistantIdForWrite(
      dto.assistantId,
      existing.assistantId ?? null,
    );

    if (dto.assistantId !== undefined && assistantId) {
      await this.ensureAssistantBelongsToCompany(companyId, assistantId);
    }

    try {
      if (typeof this.prisma.chatwootInboxConfig.updateMany === "function") {
        await this.prisma.chatwootInboxConfig.updateMany({
          where: { id, companyId },
          data: {
            name,
            baseUrl,
            assistantId,
            accountId,
            inboxId,
            isActive: dto.isActive ?? existing.isActive,
            metadataJson,
            ...this.buildApiAccessTokenWriteFields(apiAccessToken, existing),
            ...this.buildWebhookSecretWriteFields(webhookSecret, existing),
          },
        });
      } else {
        await this.prisma.chatwootInboxConfig.update({
          where: { id },
          data: {
            name,
            baseUrl,
            assistantId,
            accountId,
            inboxId,
            isActive: dto.isActive ?? existing.isActive,
            metadataJson,
            ...this.buildApiAccessTokenWriteFields(apiAccessToken, existing),
            ...this.buildWebhookSecretWriteFields(webhookSecret, existing),
          },
        });
      }

      const record = await this.prisma.chatwootInboxConfig.findFirst({
        where: { id, companyId },
        select: chatwootInboxConfigSelect,
      });

      if (!record) {
        throw new NotFoundException("Chatwoot inbox config not found.");
      }

      return this.toSafeConfig(record);
    } catch (error) {
      this.logger.error(
        `Failed to update Chatwoot inbox config id=${id} for company=${companyId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException("Não foi possível salvar a configuração do Chatwoot.");
    }
  }

  async delete(companyId: string, id: string): Promise<void> {
    const result = await this.prisma.chatwootInboxConfig.deleteMany({
      where: { companyId, id },
    });

    if (result.count === 0) {
      throw new NotFoundException("Chatwoot inbox config not found.");
    }
  }

  async testConnectionById(companyId: string, id: string): Promise<ChatwootInboxConfigTestResult> {
    const record = await this.prisma.chatwootInboxConfig.findFirst({
      where: { companyId, id, isActive: true },
      select: chatwootInboxConfigSelect,
    });

    if (!record) {
      throw new NotFoundException("Chatwoot inbox config not found.");
    }

    const resolved = this.toResolvedConfig(record);
    const assistantConfigured = Boolean(
      resolved.assistantId && resolved.assistantStatus === "ACTIVE",
    );
    const baseUrl = resolved.baseUrl.replace(/\/$/, "");
    const endpoint = new URL(
      `/api/v1/accounts/${encodeURIComponent(resolved.accountId)}/inboxes/${encodeURIComponent(
        resolved.inboxId,
      )}`,
      baseUrl,
    ).toString();

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(resolved.apiAccessToken
            ? {
                api_access_token: resolved.apiAccessToken,
              }
            : {}),
        },
      });

      if (!response.ok) {
        const result = {
          ok: false,
          message: "Não foi possível validar a configuração.",
          reason: `Chatwoot respondeu com HTTP ${response.status}.`,
          details: {
            accountId: resolved.accountId,
            inboxId: resolved.inboxId,
            baseUrl: resolved.baseUrl,
            canReadInbox: false,
            webhookUrlTemplate: this.buildWebhookUrlTemplate(),
            assistantId: resolved.assistantId,
            assistantName: resolved.assistantName,
            assistantStatus: resolved.assistantStatus,
            assistantConfigured,
          },
        };
        await this.recordApiTest(record.id, false);
        return result;
      }

      const result = {
        ok: true,
        message: assistantConfigured
          ? "Conexão com Chatwoot validada e assistente vinculado."
          : "Chatwoot validado, mas nenhum assistente foi vinculado.",
        details: {
          accountId: resolved.accountId,
          inboxId: resolved.inboxId,
          baseUrl: resolved.baseUrl,
          canReadInbox: true,
          webhookUrlTemplate: this.buildWebhookUrlTemplate(),
          assistantId: resolved.assistantId,
          assistantName: resolved.assistantName,
          assistantStatus: resolved.assistantStatus,
          assistantConfigured,
        },
      };
      await this.recordApiTest(record.id, true);
      return result;
    } catch (error) {
      const result = {
        ok: false,
        message: "Não foi possível validar a configuração.",
        reason: error instanceof Error ? error.message.slice(0, 300) : "Erro inesperado.",
        details: {
          accountId: resolved.accountId,
          inboxId: resolved.inboxId,
          baseUrl: resolved.baseUrl,
          canReadInbox: false,
          webhookUrlTemplate: this.buildWebhookUrlTemplate(),
          assistantId: resolved.assistantId,
          assistantName: resolved.assistantName,
          assistantStatus: resolved.assistantStatus,
          assistantConfigured,
        },
      };
      await this.recordApiTest(record.id, false);
      return result;
    }
  }

  async recordWebhookReceived(input: {
    event: string | null;
    accountId: string | null;
    inboxId: string | null;
    conversationId: string | null;
    messageType: string | null;
    requestId: string | null;
  }): Promise<ChatwootWebhookDiagnosticTarget> {
    const receivedAt = new Date();
    const event = safeDiagnosticText(input.event, 100);
    const accountId = safeDiagnosticText(input.accountId);
    const inboxId = safeDiagnosticText(input.inboxId);
    const conversationId = safeDiagnosticText(input.conversationId);
    const messageType = safeDiagnosticText(input.messageType, 100);
    const requestId = safeDiagnosticText(input.requestId);

    try {
      const matches =
        accountId && inboxId
          ? await this.prisma.chatwootInboxConfig.findMany({
              where: {
                accountId,
                inboxId,
              },
              select: { id: true },
              orderBy: [{ createdAt: "asc" }],
              take: 2,
            })
          : [];
      const configId = matches.length === 1 ? matches[0].id : null;
      const ignoredReason =
        matches.length > 1 ? "AMBIGUOUS_ACCOUNT_INBOX" : configId ? null : "UNKNOWN_ACCOUNT_INBOX";

      if (configId) {
        await this.prisma.chatwootInboxConfig.update({
          where: { id: configId },
          data: {
            lastWebhookAt: receivedAt,
            lastWebhookEvent: event,
            lastWebhookAccountId: accountId,
            lastWebhookInboxId: inboxId,
            lastWebhookConversationId: conversationId,
            lastWebhookMessageType: messageType,
            lastWebhookIgnoredReason: null,
            lastWebhookRequestId: requestId,
          },
        });
      }

      const diagnostic = await this.prisma.chatwootWebhookDiagnostic.create({
        data: {
          configId,
          receivedAt,
          event,
          accountId,
          inboxId,
          conversationId,
          messageType,
          ignoredReason,
          requestId,
        },
        select: { id: true },
      });

      return { configId, diagnosticId: diagnostic.id };
    } catch (error) {
      this.logger.warn(
        `Could not persist Chatwoot webhook diagnostic: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { configId: null, diagnosticId: null };
    }
  }

  async completeWebhookDiagnostic(
    target: ChatwootWebhookDiagnosticTarget,
    input: { ignoredReason: string | null; responseSent: boolean },
  ): Promise<void> {
    try {
      if (target.configId) {
        await this.prisma.chatwootInboxConfig.update({
          where: { id: target.configId },
          data: {
            lastWebhookIgnoredReason: input.ignoredReason,
            ...(input.responseSent ? { lastResponseAt: new Date() } : {}),
          },
        });
      }

      if (target.diagnosticId) {
        await this.prisma.chatwootWebhookDiagnostic.update({
          where: { id: target.diagnosticId },
          data: { ignoredReason: input.ignoredReason },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Could not finalize Chatwoot webhook diagnostic: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async recordResponseSent(configId: string): Promise<void> {
    try {
      await this.prisma.chatwootInboxConfig.update({
        where: { id: configId },
        data: { lastResponseAt: new Date(), lastWebhookIgnoredReason: null },
      });
    } catch (error) {
      this.logger.warn(
        `Could not persist Chatwoot response diagnostic for config=${configId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async resolveActiveByWebhook(input: {
    accountId: string;
    inboxId: string;
  }): Promise<ResolvedChatwootInboxConfig | null> {
    const records = await this.prisma.chatwootInboxConfig.findMany({
      where: {
        accountId: input.accountId,
        inboxId: input.inboxId,
        isActive: true,
      },
      select: chatwootInboxConfigSelect,
      orderBy: [{ createdAt: "asc" }],
    });

    if (records.length === 0) {
      return null;
    }

    if (records.length > 1) {
      throw new BadRequestException(
        "Ambiguous Chatwoot webhook tenant resolution for the given accountId and inboxId.",
      );
    }

    return this.toResolvedConfig(records[0]);
  }

  async resolveActiveForConversation(input: {
    companyId: string;
    accountId?: string | null;
    inboxId?: string | null;
  }): Promise<ResolvedChatwootInboxConfig | null> {
    const where: Prisma.ChatwootInboxConfigWhereInput = {
      companyId: input.companyId,
      isActive: true,
    };

    if (input.accountId) {
      where.accountId = input.accountId;
    }

    if (input.inboxId) {
      where.inboxId = input.inboxId;
    }

    const record = await this.prisma.chatwootInboxConfig.findFirst({
      where,
      select: chatwootInboxConfigSelect,
    });

    return record ? this.toResolvedConfig(record) : null;
  }

  async resolveActiveForAssistantConversation(input: {
    companyId: string;
    assistantId: string;
    accountId: string;
    inboxId: string;
  }): Promise<ResolvedChatwootInboxConfig | null> {
    const records = await this.prisma.chatwootInboxConfig.findMany({
      where: {
        companyId: input.companyId,
        assistantId: input.assistantId,
        accountId: input.accountId,
        inboxId: input.inboxId,
      },
      select: chatwootInboxConfigSelect,
      orderBy: [{ createdAt: "asc" }],
    });

    const activeRecords = records.filter((record) => record.isActive);
    if (activeRecords.length > 1) {
      throw new BadRequestException("CHATWOOT_SCOPE_AMBIGUOUS");
    }

    const record = activeRecords[0] ?? records[0] ?? null;
    return record ? this.toResolvedConfig(record) : null;
  }

  async isWebhookSecureModeAllowed(): Promise<boolean> {
    const nodeEnv = this.configService.get<string>("NODE_ENV")?.trim() ?? "development";
    if (nodeEnv !== "production") {
      return true;
    }

    return this.configService.get<boolean>("CHATWOOT_ALLOW_INSECURE_WEBHOOKS") === true;
  }

  private toSafeConfig(record: ChatwootInboxConfigRecord): SafeChatwootInboxConfig {
    return {
      id: record.id,
      companyId: record.companyId,
      assistantId: record.assistantId ?? null,
      assistantName: record.assistant?.name ?? null,
      assistantStatus: record.assistant?.status ?? null,
      name: record.name,
      baseUrl: record.baseUrl,
      accountId: record.accountId,
      inboxId: record.inboxId,
      isActive: record.isActive,
      metadataJson: record.metadataJson ?? null,
      apiAccessTokenConfigured: Boolean(record.apiAccessTokenEncrypted),
      webhookSecretConfigured: Boolean(record.webhookSecretEncrypted),
      lastApiTestAt: record.lastApiTestAt ?? null,
      lastApiTestOk: record.lastApiTestOk ?? null,
      lastWebhookAt: record.lastWebhookAt ?? null,
      lastWebhookEvent: record.lastWebhookEvent ?? null,
      lastWebhookAccountId: record.lastWebhookAccountId ?? null,
      lastWebhookInboxId: record.lastWebhookInboxId ?? null,
      lastWebhookConversationId: record.lastWebhookConversationId ?? null,
      lastWebhookMessageType: record.lastWebhookMessageType ?? null,
      lastWebhookIgnoredReason: record.lastWebhookIgnoredReason ?? null,
      lastWebhookRequestId: record.lastWebhookRequestId ?? null,
      lastResponseAt: record.lastResponseAt ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private async recordApiTest(configId: string, ok: boolean): Promise<void> {
    try {
      await this.prisma.chatwootInboxConfig.update({
        where: { id: configId },
        data: { lastApiTestAt: new Date(), lastApiTestOk: ok },
      });
    } catch (error) {
      this.logger.warn(
        `Could not persist Chatwoot API test diagnostic for config=${configId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private toResolvedConfig(record: ChatwootInboxConfigRecord): ResolvedChatwootInboxConfig {
    return {
      ...this.toSafeConfig(record),
      apiAccessToken: this.decryptSecret(
        record.apiAccessTokenEncrypted,
        record.apiAccessTokenIv,
        record.apiAccessTokenAuthTag,
      ),
      webhookSecret: this.decryptSecret(
        record.webhookSecretEncrypted,
        record.webhookSecretIv,
        record.webhookSecretAuthTag,
      ),
    };
  }

  private async resolveEncryptedSecret(
    value?: string | null,
  ): Promise<EncryptedSecretPayload | undefined> {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value?.trim() ?? "";
    if (trimmed.length === 0) {
      return undefined;
    }

    const encryptionKey = this.getEncryptionKeyBuffer();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedValue: encrypted.toString("base64"),
      valueIv: iv.toString("base64"),
      valueAuthTag: authTag.toString("base64"),
    };
  }

  private buildApiAccessTokenWriteFields(
    secret: EncryptedSecretPayload | undefined,
    existing: ChatwootInboxConfigRecord | null,
  ): {
    apiAccessTokenEncrypted: string | null;
    apiAccessTokenIv: string | null;
    apiAccessTokenAuthTag: string | null;
  } {
    if (secret) {
      return {
        apiAccessTokenEncrypted: secret.encryptedValue,
        apiAccessTokenIv: secret.valueIv,
        apiAccessTokenAuthTag: secret.valueAuthTag,
      };
    }

    if (!existing) {
      return {
        apiAccessTokenEncrypted: null,
        apiAccessTokenIv: null,
        apiAccessTokenAuthTag: null,
      };
    }

    return {
      apiAccessTokenEncrypted: existing.apiAccessTokenEncrypted ?? null,
      apiAccessTokenIv: existing.apiAccessTokenIv ?? null,
      apiAccessTokenAuthTag: existing.apiAccessTokenAuthTag ?? null,
    };
  }

  private buildWebhookSecretWriteFields(
    secret: EncryptedSecretPayload | undefined,
    existing: ChatwootInboxConfigRecord | null,
  ): {
    webhookSecretEncrypted: string | null;
    webhookSecretIv: string | null;
    webhookSecretAuthTag: string | null;
  } {
    if (secret) {
      return {
        webhookSecretEncrypted: secret.encryptedValue,
        webhookSecretIv: secret.valueIv,
        webhookSecretAuthTag: secret.valueAuthTag,
      };
    }

    if (!existing) {
      return {
        webhookSecretEncrypted: null,
        webhookSecretIv: null,
        webhookSecretAuthTag: null,
      };
    }

    return {
      webhookSecretEncrypted: existing.webhookSecretEncrypted ?? null,
      webhookSecretIv: existing.webhookSecretIv ?? null,
      webhookSecretAuthTag: existing.webhookSecretAuthTag ?? null,
    };
  }

  private decryptSecret(
    encryptedValue?: string | null,
    valueIv?: string | null,
    valueAuthTag?: string | null,
  ): string | null {
    if (!encryptedValue || !valueIv || !valueAuthTag) {
      return null;
    }

    try {
      const encryptionKey = this.getEncryptionKeyBuffer();
      const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey,
        Buffer.from(valueIv, "base64"),
      );
      decipher.setAuthTag(Buffer.from(valueAuthTag, "base64"));

      return Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new BadRequestException("Stored Chatwoot secret could not be decrypted.");
    }
  }

  private resolveMetadataJsonInput(
    value: Record<string, unknown> | undefined,
    fallback: Prisma.InputJsonValue | typeof Prisma.JsonNull | null,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value !== undefined) {
      return value as Prisma.InputJsonValue;
    }

    if (fallback === null) {
      return Prisma.JsonNull;
    }

    return fallback;
  }

  private getEncryptionKeyBuffer(): Buffer {
    const rawKey = this.configService.get<string>("APP_ENCRYPTION_KEY")?.trim() ?? "";

    if (!rawKey) {
      throw new BadRequestException("APP_ENCRYPTION_KEY is required to save Chatwoot secrets.");
    }

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      return Buffer.from(rawKey, "hex");
    }

    const base64Buffer = Buffer.from(rawKey, "base64");
    if (base64Buffer.length === 32) {
      return base64Buffer;
    }

    throw new BadRequestException(
      "APP_ENCRYPTION_KEY must be a 32-byte key encoded as hex (64 chars) or base64.",
    );
  }

  private resolveRequiredTextInput(value: string, errorMessage: string): string {
    const trimmed = trimNullableText(value);
    if (!trimmed) {
      throw new BadRequestException(errorMessage);
    }

    return trimmed;
  }

  private resolveAssistantIdForWrite(
    value: string | undefined,
    fallback: string | null,
  ): string | null {
    if (value === undefined) {
      return fallback;
    }

    const trimmed = trimNullableText(value);
    return trimmed;
  }

  private async ensureAssistantBelongsToCompany(
    companyId: string,
    assistantId: string,
  ): Promise<void> {
    const assistant = await this.prisma.assistant.findFirst({
      where: {
        companyId,
        id: assistantId,
      },
      select: {
        id: true,
        status: true,
        name: true,
      },
    });

    if (!assistant) {
      throw new BadRequestException("Assistente inválido para este tenant.");
    }

    if (assistant.status !== "ACTIVE") {
      throw new BadRequestException("Assistente vinculado está inativo.");
    }
  }

  private buildWebhookUrlTemplate(): string {
    const apiBaseUrl = this.configService.get<string>("CHATWOOT_WEBHOOK_BASE_URL")?.trim();
    const baseUrl = apiBaseUrl || "https://SEU_BACKEND";
    return `${baseUrl.replace(/\/$/, "")}/webhooks/chatwoot?secret=SEU_SECRET_CONFIGURADO`;
  }
}
