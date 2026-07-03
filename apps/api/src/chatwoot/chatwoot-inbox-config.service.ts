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

  async upsert(companyId: string, dto: UpsertChatwootInboxConfigDto): Promise<SafeChatwootInboxConfig> {
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
    const metadataJson = this.resolveMetadataJsonInput(dto.metadataJson, existing?.metadataJson ?? null);
    const baseUrl = this.resolveRequiredTextInput(dto.baseUrl, "Chatwoot baseUrl is required.");
    const name = this.resolveRequiredTextInput(dto.name, "Chatwoot inbox name is required.");
    const accountId = this.resolveRequiredTextInput(dto.accountId, "Chatwoot accountId is required.");
    const inboxId = this.resolveRequiredTextInput(dto.inboxId, "Chatwoot inboxId is required.");
    const assistantId = this.resolveAssistantIdForWrite(dto.assistantId, existing?.assistantId ?? null);

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
    const metadataJson = this.resolveMetadataJsonInput(dto.metadataJson, existing.metadataJson ?? null);
    const baseUrl = this.resolveRequiredTextInput(dto.baseUrl, "Chatwoot baseUrl is required.");
    const name = this.resolveRequiredTextInput(dto.name, "Chatwoot inbox name is required.");
    const accountId = this.resolveRequiredTextInput(dto.accountId, "Chatwoot accountId is required.");
    const inboxId = this.resolveRequiredTextInput(dto.inboxId, "Chatwoot inboxId is required.");
    const assistantId = this.resolveAssistantIdForWrite(dto.assistantId, existing.assistantId ?? null);

    if (dto.assistantId !== undefined && assistantId) {
      await this.ensureAssistantBelongsToCompany(companyId, assistantId);
    }

    try {
      const record = await this.prisma.chatwootInboxConfig.update({
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
        select: chatwootInboxConfigSelect,
      });

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

  async testConnectionById(
    companyId: string,
    id: string,
  ): Promise<ChatwootInboxConfigTestResult> {
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
        return {
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
      }

      return {
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
    } catch (error) {
      return {
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
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toResolvedConfig(record: ChatwootInboxConfigRecord): ResolvedChatwootInboxConfig {
    return {
      ...this.toSafeConfig(record),
      apiAccessToken: this.decryptSecret(record.apiAccessTokenEncrypted, record.apiAccessTokenIv, record.apiAccessTokenAuthTag),
      webhookSecret: this.decryptSecret(record.webhookSecretEncrypted, record.webhookSecretIv, record.webhookSecretAuthTag),
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

  private resolveAssistantIdForWrite(value: string | undefined, fallback: string | null): string | null {
    if (value === undefined) {
      return fallback;
    }

    const trimmed = trimNullableText(value);
    return trimmed ?? fallback;
  }

  private async ensureAssistantBelongsToCompany(companyId: string, assistantId: string): Promise<void> {
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
