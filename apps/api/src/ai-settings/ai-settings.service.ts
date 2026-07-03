import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, Status } from "@prisma/client";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { AiProviderRequestException, runOpenAiCompatibleChatCompletion } from "../ai/ai-runner";
import type {
  AiResolvedRuntimeConfig,
  AiProviderStatus,
  AiChatCompletionResult,
} from "../ai/ai.types";
import type { UpdateAiSettingsDto } from "./dto/update-ai-settings.dto";

const companyAiSettingsSelect = {
  id: true,
  companyId: true,
  runtimeEnabled: true,
  provider: true,
  baseUrl: true,
  model: true,
  encryptedApiKey: true,
  apiKeyIv: true,
  apiKeyAuthTag: true,
  requestTimeoutMs: true,
  status: true,
  lastTestAt: true,
  lastTestStatus: true,
  lastTestError: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CompanyAiSettingsSelect;

type CompanyAiSettingsRecord = Prisma.CompanyAiSettingsGetPayload<{
  select: typeof companyAiSettingsSelect;
}>;

type RuntimeSource = AiResolvedRuntimeConfig["source"];

export type SafeAiSettings = {
  runtimeEnabled: boolean;
  provider: string;
  baseUrl: string | null;
  model: string | null;
  apiKeyConfigured: boolean;
  requestTimeoutMs: number;
  lastTestAt: Date | null;
  lastTestStatus: string | null;
  source: RuntimeSource;
  tenantSettingsConfigured: boolean;
  envFallbackConfigured: boolean;
};

export type SaveAiSettingsResult = SafeAiSettings;

export type TestAiSettingsResult = AiChatCompletionResult & {
  ok: true;
};

export type AiSettingsOptions = {
  providers: Array<{
    id: string;
    label: string;
    baseUrl: string;
    models: string[];
  }>;
  timeoutOptionsMs: number[];
};

type EncryptedApiKeyPayload = {
  encryptedApiKey: string;
  apiKeyIv: string;
  apiKeyAuthTag: string;
};

@Injectable()
export class AiSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSafeSettings(companyId: string): Promise<SafeAiSettings> {
    const tenant = await this.findCompanySettings(companyId);
    const runtime = await this.resolveRuntimeConfig(companyId);
    return this.toSafeSettings(tenant, runtime);
  }

  getOptions(): AiSettingsOptions {
    return {
      providers: [
        {
          id: "openai-compatible",
          label: "OpenAI",
          baseUrl: "https://api.openai.com/v1",
          models: ["gpt-4o-mini", "gpt-4o"],
        },
        {
          id: "deepseek-compatible",
          label: "DeepSeek",
          baseUrl: "https://api.deepseek.com/v1",
          models: ["deepseek-chat"],
        },
        {
          id: "custom",
          label: "Custom",
          baseUrl: "",
          models: [],
        },
      ],
      timeoutOptionsMs: [10_000, 30_000, 60_000, 120_000],
    };
  }

  async saveSettings(companyId: string, dto: UpdateAiSettingsDto): Promise<SaveAiSettingsResult> {
    const existing = await this.findCompanySettings(companyId);
    const encryptedApiKey = await this.resolveEncryptedApiKey(dto.apiKey);
    const provider = this.resolveProviderInput(dto.provider);
    const baseUrl = this.resolveNullableTextInput(dto.baseUrl);
    const model = this.resolveNullableTextInput(dto.model);

    await this.prisma.companyAiSettings.upsert({
      where: { companyId },
      update: {
        runtimeEnabled: dto.runtimeEnabled ?? existing?.runtimeEnabled ?? false,
        provider: provider ?? existing?.provider ?? "openai-compatible",
        baseUrl: baseUrl !== undefined ? baseUrl : (existing?.baseUrl ?? null),
        model: model !== undefined ? model : (existing?.model ?? null),
        ...(encryptedApiKey
          ? encryptedApiKey
          : {
              encryptedApiKey: existing?.encryptedApiKey ?? null,
              apiKeyIv: existing?.apiKeyIv ?? null,
              apiKeyAuthTag: existing?.apiKeyAuthTag ?? null,
            }),
        requestTimeoutMs: dto.requestTimeoutMs ?? existing?.requestTimeoutMs ?? 30_000,
      },
      create: {
        companyId,
        runtimeEnabled: dto.runtimeEnabled ?? false,
        provider: provider ?? "openai-compatible",
        baseUrl: baseUrl ?? null,
        model: model ?? null,
        ...(encryptedApiKey
          ? encryptedApiKey
          : {
              encryptedApiKey: null,
              apiKeyIv: null,
              apiKeyAuthTag: null,
            }),
        requestTimeoutMs: dto.requestTimeoutMs ?? 30_000,
        status: Status.ACTIVE,
      },
    });

    return this.getSafeSettings(companyId);
  }

  async deleteApiKey(companyId: string): Promise<SaveAiSettingsResult> {
    await this.prisma.companyAiSettings.upsert({
      where: { companyId },
      update: {
        encryptedApiKey: null,
        apiKeyIv: null,
        apiKeyAuthTag: null,
      },
      create: {
        companyId,
        runtimeEnabled: false,
        provider: "openai-compatible",
        baseUrl: null,
        model: null,
        encryptedApiKey: null,
        apiKeyIv: null,
        apiKeyAuthTag: null,
        requestTimeoutMs: 30_000,
        status: Status.ACTIVE,
      },
    });

    return this.getSafeSettings(companyId);
  }

  async testTenantSettings(input: {
    companyId: string;
    message: string;
  }): Promise<TestAiSettingsResult> {
    const settings = await this.findCompanySettings(input.companyId);

    if (!settings) {
      throw new BadRequestException("AI settings are not configured for this tenant.");
    }

    if (!settings.runtimeEnabled) {
      throw new BadRequestException("AI runtime is disabled for this tenant.");
    }

    const runtimeConfig = await this.resolveRuntimeConfig(input.companyId);

    if (!runtimeConfig.apiKey || !runtimeConfig.baseUrl || !runtimeConfig.model) {
      throw new BadRequestException("AI settings are not fully configured for this tenant.");
    }

    try {
      const result = await runOpenAiCompatibleChatCompletion(runtimeConfig, {
        messages: [
          {
            role: "system",
            content: "Responda de forma curta, objetiva e sem expor detalhes internos.",
          },
          {
            role: "user",
            content: input.message,
          },
        ],
        model: runtimeConfig.model,
        temperature: 0.2,
        companyId: input.companyId,
      });

      await this.prisma.companyAiSettings.update({
        where: { companyId: input.companyId },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: "success",
          lastTestError: null,
        },
      });

      return {
        ok: true,
        ...result,
      };
    } catch (error) {
      const message = this.toSafeErrorMessage(error);

      await this.prisma.companyAiSettings.update({
        where: { companyId: input.companyId },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: "failed",
          lastTestError: message,
        },
      });

      if (error instanceof AiProviderRequestException) {
        throw error;
      }

      throw new ServiceUnavailableException(message);
    }
  }

  async resolveRuntimeConfig(companyId?: string): Promise<AiResolvedRuntimeConfig> {
    const envConfig = this.readEnvConfig();
    const tenant = companyId ? await this.findCompanySettings(companyId) : null;

    if (!tenant) {
      return {
        ...envConfig,
        source: envConfig.runtimeEnabled ? "env-fallback" : "unavailable",
        tenantSettingsConfigured: false,
        envFallbackConfigured: this.hasEnvFallback(envConfig),
        apiKeyConfigured: Boolean(envConfig.apiKey),
      };
    }

    const tenantApiKey = this.decryptApiKeyFromRecord(tenant);
    const tenantHasBaseUrl = (tenant.baseUrl?.trim().length ?? 0) > 0;
    const tenantHasModel = (tenant.model?.trim().length ?? 0) > 0;
    const tenantHasApiKey = tenantApiKey.length > 0;
    const runtimeEnabled = tenant.runtimeEnabled;
    const provider = tenant.provider?.trim() || envConfig.provider;
    const baseUrl = tenant.baseUrl?.trim() || envConfig.baseUrl;
    const model = tenant.model?.trim() || envConfig.model;
    const apiKey = tenantApiKey || envConfig.apiKey;
    const usesEnvFallback =
      (!tenantHasBaseUrl || !tenantHasModel || !tenantHasApiKey) && this.hasEnvFallback(envConfig);

    return {
      runtimeEnabled,
      provider,
      baseUrl,
      model,
      apiKey,
      requestTimeoutMs: tenant.requestTimeoutMs ?? envConfig.requestTimeoutMs,
      source: usesEnvFallback ? "mixed" : "tenant-settings",
      tenantSettingsConfigured: true,
      envFallbackConfigured: this.hasEnvFallback(envConfig),
      apiKeyConfigured: Boolean(apiKey),
    };
  }

  async getStatus(companyId?: string): Promise<AiProviderStatus> {
    const runtime = await this.resolveRuntimeConfig(companyId);

    return {
      runtimeEnabled: runtime.runtimeEnabled,
      provider: runtime.provider,
      baseUrlConfigured: runtime.baseUrl.length > 0,
      modelConfigured: runtime.model.length > 0,
      apiKeyConfigured: runtime.apiKeyConfigured,
      source: runtime.source,
      tenantSettingsConfigured: runtime.tenantSettingsConfigured,
      envFallbackConfigured: runtime.envFallbackConfigured,
      mode: "deterministic-fallback",
    };
  }

  async isRuntimeEnabled(companyId?: string): Promise<boolean> {
    const runtime = await this.resolveRuntimeConfig(companyId);
    return runtime.runtimeEnabled;
  }

  async isProviderConfigured(companyId?: string): Promise<boolean> {
    const runtime = await this.resolveRuntimeConfig(companyId);
    return runtime.baseUrl.length > 0 && runtime.model.length > 0 && runtime.apiKey.length > 0;
  }

  private async findCompanySettings(companyId: string): Promise<CompanyAiSettingsRecord | null> {
    return this.prisma.companyAiSettings.findUnique({
      where: { companyId },
      select: companyAiSettingsSelect,
    });
  }

  private toSafeSettings(
    settings: CompanyAiSettingsRecord | null,
    runtime: AiResolvedRuntimeConfig,
  ): SafeAiSettings {
    return {
      runtimeEnabled: runtime.runtimeEnabled,
      provider: runtime.provider,
      baseUrl: runtime.baseUrl.length > 0 ? runtime.baseUrl : null,
      model: runtime.model.length > 0 ? runtime.model : null,
      apiKeyConfigured: Boolean(settings?.encryptedApiKey),
      requestTimeoutMs: runtime.requestTimeoutMs,
      lastTestAt: settings?.lastTestAt ?? null,
      lastTestStatus: settings?.lastTestStatus ?? null,
      source: runtime.source,
      tenantSettingsConfigured: Boolean(settings),
      envFallbackConfigured: runtime.envFallbackConfigured,
    };
  }

  private readEnvConfig(): AiResolvedRuntimeConfig {
    const runtimeEnabled = this.configService.get<boolean>("AI_RUNTIME_ENABLED") ?? false;
    const provider = this.configService.get<string>("AI_PROVIDER")?.trim() || "openai-compatible";
    const baseUrl = this.configService.get<string>("AI_BASE_URL")?.trim() ?? "";
    const model = this.configService.get<string>("AI_MODEL")?.trim() ?? "";
    const apiKey = this.configService.get<string>("AI_API_KEY")?.trim() ?? "";
    const requestTimeoutMs = this.configService.get<number>("AI_REQUEST_TIMEOUT_MS") ?? 30_000;

    return {
      runtimeEnabled,
      provider,
      baseUrl,
      model,
      apiKey,
      requestTimeoutMs,
      source: runtimeEnabled ? "env-fallback" : "unavailable",
      tenantSettingsConfigured: false,
      envFallbackConfigured: this.hasEnvFallback({
        runtimeEnabled,
        baseUrl,
        model,
        apiKey,
      }),
      apiKeyConfigured: Boolean(apiKey),
    };
  }

  private hasEnvFallback(
    config: Pick<AiResolvedRuntimeConfig, "runtimeEnabled" | "baseUrl" | "model" | "apiKey">,
  ): boolean {
    return (
      config.runtimeEnabled ||
      config.baseUrl.length > 0 ||
      config.model.length > 0 ||
      config.apiKey.length > 0
    );
  }

  private resolveNullableTextInput(value?: string): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private resolveProviderInput(value?: string): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private async resolveEncryptedApiKey(
    apiKey?: string,
  ): Promise<EncryptedApiKeyPayload | undefined> {
    if (apiKey === undefined) {
      return undefined;
    }

    const trimmed = apiKey.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const encryptionKey = this.getEncryptionKeyBuffer();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedApiKey: encrypted.toString("base64"),
      apiKeyIv: iv.toString("base64"),
      apiKeyAuthTag: authTag.toString("base64"),
    };
  }

  private decryptApiKeyFromRecord(settings: CompanyAiSettingsRecord): string {
    if (!settings.encryptedApiKey || !settings.apiKeyIv || !settings.apiKeyAuthTag) {
      return "";
    }

    try {
      const encryptionKey = this.getEncryptionKeyBuffer();
      const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey,
        Buffer.from(settings.apiKeyIv, "base64"),
      );
      decipher.setAuthTag(Buffer.from(settings.apiKeyAuthTag, "base64"));

      return Buffer.concat([
        decipher.update(Buffer.from(settings.encryptedApiKey, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new BadRequestException("Stored AI API key could not be decrypted.");
    }
  }

  private getEncryptionKeyBuffer(): Buffer {
    const rawKey = this.configService.get<string>("APP_ENCRYPTION_KEY")?.trim() ?? "";

    if (!rawKey) {
      throw new BadRequestException("APP_ENCRYPTION_KEY is required to save provider API keys.");
    }

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      return Buffer.from(rawKey, "hex");
    }

    const base64Buffer = Buffer.from(rawKey, "base64");
    if (base64Buffer.length === 32) {
      return base64Buffer;
    }

    throw new BadRequestException(
      "APP_ENCRYPTION_KEY must be a 32-byte key encoded as hex or base64.",
    );
  }

  private toSafeErrorMessage(error: unknown): string {
    if (error instanceof AiProviderRequestException) {
      const detail =
        error.providerError.code ?? error.providerError.type ?? error.providerError.message;
      return `Provider HTTP ${error.providerStatus}: ${detail}`;
    }

    if (
      error instanceof BadRequestException ||
      error instanceof BadGatewayException ||
      error instanceof ServiceUnavailableException
    ) {
      const response = error.getResponse();
      if (typeof response === "string") {
        return response;
      }

      if (
        typeof response === "object" &&
        response !== null &&
        "message" in response &&
        typeof (response as { message?: unknown }).message === "string"
      ) {
        return (response as { message: string }).message;
      }
    }

    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return "AI provider test failed.";
  }
}
