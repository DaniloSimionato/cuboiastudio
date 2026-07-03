import { Body, Controller, Delete, Get, HttpCode, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser, RequestTenant } from "../auth/auth.types";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../auth/tenant.decorator";
import {
  type AiSettingsOptions,
  type SaveAiSettingsResult,
  type TestAiSettingsResult,
} from "./ai-settings.service";
import { TestAiSettingsDto } from "./dto/test-ai-settings.dto";
import { UpdateAiSettingsDto } from "./dto/update-ai-settings.dto";
import { AiSettingsService } from "./ai-settings.service";

@ApiTags("settings")
@Controller("settings/ai")
export class AiSettingsController {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  @Get("options")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:read")
  @ApiOperation({ summary: "Return safe AI provider presets for the settings UI" })
  @ApiHeader({
    name: "x-dev-user-id",
    required: true,
    description: "DEV ONLY. Local authentication user id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-company-id",
    required: true,
    description: "DEV ONLY. Local tenant/company id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-user-email",
    required: true,
    description: "DEV ONLY. Local authentication email. Never use in production.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        providers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", example: "openai-compatible" },
              label: { type: "string", example: "OpenAI" },
              baseUrl: { type: "string", example: "https://api.openai.com/v1" },
              models: {
                type: "array",
                items: { type: "string" },
                example: ["gpt-4o-mini", "gpt-4o"],
              },
            },
            required: ["id", "label", "baseUrl", "models"],
          },
        },
        timeoutOptionsMs: {
          type: "array",
          items: { type: "number" },
          example: [10000, 30000, 60000, 120000],
        },
      },
      required: ["providers", "timeoutOptionsMs"],
    },
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have settings:read.",
  })
  getOptions(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): AiSettingsOptions {
    void user;
    void tenant;
    return this.aiSettingsService.getOptions();
  }

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:read")
  @ApiOperation({ summary: "Return the current tenant AI settings without exposing secrets" })
  @ApiHeader({
    name: "x-dev-user-id",
    required: true,
    description: "DEV ONLY. Local authentication user id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-company-id",
    required: true,
    description: "DEV ONLY. Local tenant/company id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-user-email",
    required: true,
    description: "DEV ONLY. Local authentication email. Never use in production.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        runtimeEnabled: { type: "boolean", example: false },
        provider: { type: "string", example: "openai-compatible" },
        baseUrl: { type: "string", nullable: true, example: "https://api.openai.com/v1" },
        model: { type: "string", nullable: true, example: "gpt-4o-mini" },
        apiKeyConfigured: { type: "boolean", example: false },
        requestTimeoutMs: { type: "number", example: 30000 },
        lastTestAt: { type: "string", nullable: true, example: null },
        lastTestStatus: { type: "string", nullable: true, example: null },
        source: { type: "string", example: "env-fallback" },
        tenantSettingsConfigured: { type: "boolean", example: false },
        envFallbackConfigured: { type: "boolean", example: true },
      },
      required: [
        "runtimeEnabled",
        "provider",
        "baseUrl",
        "model",
        "apiKeyConfigured",
        "requestTimeoutMs",
        "lastTestAt",
        "lastTestStatus",
        "source",
        "tenantSettingsConfigured",
        "envFallbackConfigured",
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have settings:read.",
  })
  async getSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<SaveAiSettingsResult> {
    void user;
    return this.aiSettingsService.getSafeSettings(tenant.companyId);
  }

  @Patch()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:write")
  @ApiOperation({ summary: "Save tenant AI settings" })
  @ApiHeader({
    name: "x-dev-user-id",
    required: true,
    description: "DEV ONLY. Local authentication user id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-company-id",
    required: true,
    description: "DEV ONLY. Local tenant/company id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-user-email",
    required: true,
    description: "DEV ONLY. Local authentication email. Never use in production.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        runtimeEnabled: { type: "boolean", example: true },
        provider: { type: "string", example: "openai-compatible" },
        baseUrl: { type: "string", example: "https://api.openai.com/v1" },
        model: { type: "string", example: "gpt-4o-mini" },
        apiKey: { type: "string", example: "provider-api-key" },
        requestTimeoutMs: { type: "number", example: 30000 },
      },
      additionalProperties: false,
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        runtimeEnabled: { type: "boolean", example: true },
        provider: { type: "string", example: "openai-compatible" },
        baseUrl: { type: "string", nullable: true, example: "https://api.openai.com/v1" },
        model: { type: "string", nullable: true, example: "gpt-4o-mini" },
        apiKeyConfigured: { type: "boolean", example: true },
        requestTimeoutMs: { type: "number", example: 30000 },
        lastTestAt: { type: "string", nullable: true, example: null },
        lastTestStatus: { type: "string", nullable: true, example: null },
        source: { type: "string", example: "tenant-settings" },
        tenantSettingsConfigured: { type: "boolean", example: true },
        envFallbackConfigured: { type: "boolean", example: false },
      },
      required: [
        "runtimeEnabled",
        "provider",
        "baseUrl",
        "model",
        "apiKeyConfigured",
        "requestTimeoutMs",
        "lastTestAt",
        "lastTestStatus",
        "source",
        "tenantSettingsConfigured",
        "envFallbackConfigured",
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have settings:write.",
  })
  async patchSettings(
    @Body() body: UpdateAiSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<SaveAiSettingsResult> {
    void user;
    return this.aiSettingsService.saveSettings(tenant.companyId, body);
  }

  @Delete("api-key")
  @HttpCode(200)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:write")
  @ApiOperation({ summary: "Remove the stored tenant API key" })
  @ApiHeader({
    name: "x-dev-user-id",
    required: true,
    description: "DEV ONLY. Local authentication user id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-company-id",
    required: true,
    description: "DEV ONLY. Local tenant/company id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-user-email",
    required: true,
    description: "DEV ONLY. Local authentication email. Never use in production.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        apiKeyConfigured: { type: "boolean", example: false },
      },
      required: ["apiKeyConfigured"],
    },
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have settings:write.",
  })
  async deleteApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<{ apiKeyConfigured: boolean }> {
    void user;
    const settings = await this.aiSettingsService.deleteApiKey(tenant.companyId);
    return { apiKeyConfigured: settings.apiKeyConfigured };
  }

  @Post("test")
  @HttpCode(200)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:write")
  @ApiOperation({ summary: "Test the tenant AI settings" })
  @ApiHeader({
    name: "x-dev-user-id",
    required: true,
    description: "DEV ONLY. Local authentication user id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-company-id",
    required: true,
    description: "DEV ONLY. Local tenant/company id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-user-email",
    required: true,
    description: "DEV ONLY. Local authentication email. Never use in production.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Responda apenas: ok",
          maxLength: 300,
        },
      },
      additionalProperties: false,
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        provider: { type: "string", example: "openai-compatible" },
        model: { type: "string", example: "gpt-4o-mini" },
        answer: { type: "string", example: "ok" },
        durationMs: { type: "number", example: 1234 },
      },
      required: ["ok", "provider", "model", "answer", "durationMs"],
    },
  })
  @ApiBadRequestResponse({
    description:
      "Returned when the tenant AI settings are incomplete or when the provider rejects the request with a sanitized 4xx error.",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        message: { type: "string", example: "Provider authentication failed." },
        providerStatus: { type: "number", example: 401 },
        providerError: {
          type: "object",
          properties: {
            message: { type: "string", example: "Incorrect API key provided" },
            type: { type: "string", example: "invalid_request_error" },
            code: { type: "string", example: "invalid_api_key" },
            param: { type: "string", example: "model" },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have settings:write.",
  })
  @ApiServiceUnavailableResponse({
    description:
      "Returned when the AI provider times out, is unreachable, or returns a sanitized 5xx error.",
  })
  async testSettings(
    @Body() body: TestAiSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<TestAiSettingsResult> {
    void user;
    return this.aiSettingsService.testTenantSettings({
      companyId: tenant.companyId,
      message: body.message?.trim() || "Responda apenas: ok",
    });
  }
}
