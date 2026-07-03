import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiHeader,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiServiceUnavailableResponse,
} from "@nestjs/swagger";
import { AiService } from "../ai/ai.service";
import {
  AI_PROVIDER_TEST_DEFAULT_MESSAGE,
  type AiProviderStatus,
  type AiProviderTestDisabledResponse,
  type AiProviderTestSuccessResponse,
} from "../ai/ai.types";
import type { AuthenticatedUser, RequestTenant } from "../auth/auth.types";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../auth/tenant.decorator";
import { TestAiProviderDto } from "./dto/test-ai-provider.dto";

@ApiTags("diagnostics")
@Controller("diagnostics")
export class DiagnosticsController {
  constructor(private readonly aiService: AiService) {}

  @Get("rbac")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:read")
  @ApiOperation({ summary: "Validate RBAC and tenant context" })
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
        status: { type: "string", example: "ok" },
        user: {
          type: "object",
          properties: {
            id: { type: "string", example: "user_demo_cubo_ai_studio" },
            companyId: { type: "string", example: "company_demo_cubo_ai_studio" },
            email: { type: "string", example: "demo@cubo.chat" },
            roles: { type: "array", items: { type: "string" } },
            permissions: { type: "array", items: { type: "string" } },
          },
          required: ["id", "companyId", "email", "roles", "permissions"],
        },
        tenant: {
          type: "object",
          properties: {
            companyId: { type: "string", example: "company_demo_cubo_ai_studio" },
          },
          required: ["companyId"],
        },
        requiredPermission: { type: "string", example: "settings:read" },
      },
      required: ["status", "user", "tenant", "requiredPermission"],
    },
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have settings:read.",
  })
  getRbac(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): {
    status: "ok";
    user: AuthenticatedUser;
    tenant: RequestTenant;
    requiredPermission: "settings:read";
  } {
    return {
      status: "ok",
      user,
      tenant,
      requiredPermission: "settings:read",
    };
  }

  @Get("ai")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:read")
  @ApiOperation({ summary: "Inspect AI provider status without calling the provider" })
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
        baseUrlConfigured: { type: "boolean", example: false },
        modelConfigured: { type: "boolean", example: false },
        apiKeyConfigured: { type: "boolean", example: false },
        source: { type: "string", example: "env-fallback" },
        tenantSettingsConfigured: { type: "boolean", example: false },
        envFallbackConfigured: { type: "boolean", example: false },
        mode: { type: "string", example: "deterministic-fallback" },
      },
      required: [
        "runtimeEnabled",
        "provider",
        "baseUrlConfigured",
        "modelConfigured",
        "apiKeyConfigured",
        "source",
        "tenantSettingsConfigured",
        "envFallbackConfigured",
        "mode",
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have settings:read.",
  })
  async getAiStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<AiProviderStatus> {
    void user;
    return this.aiService.getStatus(tenant.companyId);
  }

  @Post("ai/test")
  @HttpCode(200)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:read")
  @ApiOperation({ summary: "Manually test the AI provider when enabled and configured" })
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
      oneOf: [
        {
          type: "object",
          properties: {
            mode: { type: "string", example: "deterministic-fallback" },
            runtimeEnabled: { type: "boolean", example: false },
            provider: { type: "string", example: "openai-compatible" },
            message: {
              type: "string",
              example: "AI real is disabled. Deterministic fallback remains active.",
            },
          },
          required: ["mode", "runtimeEnabled", "provider", "message"],
        },
        {
          type: "object",
          properties: {
            mode: { type: "string", example: "ai-provider-test" },
            provider: { type: "string", example: "openai-compatible" },
            model: { type: "string", example: "gpt-4o-mini" },
            answer: { type: "string", example: "ok" },
            durationMs: { type: "number", example: 1234 },
          },
          required: ["mode", "provider", "model", "answer", "durationMs"],
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: "Returned when AI runtime is enabled but not fully configured.",
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have settings:read.",
  })
  @ApiServiceUnavailableResponse({
    description: "Returned when the AI provider times out or is unreachable.",
  })
  async testAiProvider(
    @Body() body: TestAiProviderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<AiProviderTestDisabledResponse | AiProviderTestSuccessResponse> {
    void user;
    void tenant;

    const message = body.message?.trim() || AI_PROVIDER_TEST_DEFAULT_MESSAGE;
    const status = await this.aiService.getStatus();

    if (!status.runtimeEnabled) {
      return {
        mode: "deterministic-fallback",
        runtimeEnabled: false,
        provider: status.provider,
        message: "AI real is disabled. Deterministic fallback remains active.",
      };
    }

    if (!(await this.aiService.isProviderConfigured())) {
      throw new BadRequestException("AI runtime is enabled but not fully configured.");
    }

    const result = await this.aiService.generateChatCompletion({
      messages: [
        {
          role: "system",
          content: "Responda de forma curta, objetiva e sem expor detalhes internos.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.2,
    });

    return {
      mode: "ai-provider-test",
      provider: result.provider,
      model: result.model,
      answer: result.answer,
      durationMs: result.durationMs,
    };
  }
}
