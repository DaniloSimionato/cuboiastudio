import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiNotFoundResponse,
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
  type ChatwootInboxConfigTestResult,
  type SafeChatwootInboxConfig,
  ChatwootInboxConfigService,
} from "./chatwoot-inbox-config.service";
import { UpsertChatwootInboxConfigDto } from "./dto/upsert-chatwoot-inbox-config.dto";

@ApiTags("settings")
@Controller("settings/chatwoot/inboxes")
export class ChatwootSettingsController {
  constructor(private readonly chatwootInboxConfigService: ChatwootInboxConfigService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:read")
  @ApiOperation({ summary: "List Chatwoot inbox configs for the current tenant" })
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
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          companyId: { type: "string" },
          assistantId: { type: "string", nullable: true },
          assistantName: { type: "string", nullable: true },
          assistantStatus: { type: "string", nullable: true },
          name: { type: "string" },
          baseUrl: { type: "string" },
          accountId: { type: "string" },
          inboxId: { type: "string" },
          isActive: { type: "boolean" },
          metadataJson: { type: "object", nullable: true },
          apiAccessTokenConfigured: { type: "boolean" },
          webhookSecretConfigured: { type: "boolean" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
        },
        required: [
          "id",
          "companyId",
          "assistantId",
          "assistantName",
          "assistantStatus",
          "name",
          "baseUrl",
          "accountId",
          "inboxId",
          "isActive",
          "metadataJson",
          "apiAccessTokenConfigured",
          "webhookSecretConfigured",
          "createdAt",
          "updatedAt",
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: "Returned when the request is missing authentication context." })
  @ApiForbiddenResponse({ description: "Returned when the authenticated user does not have settings:read." })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<SafeChatwootInboxConfig[]> {
    void user;
    return this.chatwootInboxConfigService.list(tenant.companyId);
  }

  @Get(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:read")
  @ApiOperation({ summary: "Return a single Chatwoot inbox config without secrets" })
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
        id: { type: "string" },
        companyId: { type: "string" },
        assistantId: { type: "string", nullable: true },
        assistantName: { type: "string", nullable: true },
        assistantStatus: { type: "string", nullable: true },
        name: { type: "string" },
        baseUrl: { type: "string" },
        accountId: { type: "string" },
        inboxId: { type: "string" },
        isActive: { type: "boolean" },
        metadataJson: { type: "object", nullable: true },
        apiAccessTokenConfigured: { type: "boolean" },
        webhookSecretConfigured: { type: "boolean" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: [
        "id",
        "companyId",
        "assistantId",
        "assistantName",
        "assistantStatus",
        "name",
        "baseUrl",
        "accountId",
        "inboxId",
        "isActive",
        "metadataJson",
        "apiAccessTokenConfigured",
        "webhookSecretConfigured",
        "createdAt",
        "updatedAt",
      ],
    },
  })
  @ApiNotFoundResponse({ description: "Returned when the config does not exist in the current tenant." })
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<SafeChatwootInboxConfig> {
    void user;
    return this.chatwootInboxConfigService.findById(tenant.companyId, id);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:write")
  @ApiOperation({ summary: "Create a Chatwoot inbox config for the current tenant" })
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
        name: { type: "string", example: "WhatsApp Principal" },
        baseUrl: { type: "string", example: "https://chatwoot.example.com" },
        accountId: { type: "string", example: "1" },
        inboxId: { type: "string", example: "12" },
        assistantId: { type: "string", nullable: true, example: "assistant-1" },
        apiAccessToken: { type: "string", nullable: true, example: "token" },
        webhookSecret: { type: "string", nullable: true, example: "webhook-secret" },
        isActive: { type: "boolean", example: true },
        metadataJson: { type: "object", nullable: true },
      },
      required: ["name", "baseUrl", "accountId", "inboxId"],
      additionalProperties: false,
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        companyId: { type: "string" },
        assistantId: { type: "string", nullable: true },
        assistantName: { type: "string", nullable: true },
        assistantStatus: { type: "string", nullable: true },
        name: { type: "string" },
        baseUrl: { type: "string" },
        accountId: { type: "string" },
        inboxId: { type: "string" },
        isActive: { type: "boolean" },
        metadataJson: { type: "object", nullable: true },
        apiAccessTokenConfigured: { type: "boolean" },
        webhookSecretConfigured: { type: "boolean" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: [
        "id",
        "companyId",
        "assistantId",
        "assistantName",
        "assistantStatus",
        "name",
        "baseUrl",
        "accountId",
        "inboxId",
        "isActive",
        "metadataJson",
        "apiAccessTokenConfigured",
        "webhookSecretConfigured",
        "createdAt",
        "updatedAt",
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: "Returned when the request is missing authentication context." })
  @ApiForbiddenResponse({ description: "Returned when the authenticated user does not have settings:write." })
  @ApiBadRequestResponse({ description: "Returned when the config payload is invalid." })
  async create(
    @Body() body: UpsertChatwootInboxConfigDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<SafeChatwootInboxConfig> {
    void user;
    return this.chatwootInboxConfigService.upsert(tenant.companyId, body);
  }

  @Patch(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:write")
  @ApiOperation({ summary: "Update a Chatwoot inbox config" })
  @ApiParam({
    name: "id",
    required: true,
    description: "Chatwoot inbox config id",
  })
  @ApiUnauthorizedResponse({ description: "Returned when the request is missing authentication context." })
  @ApiForbiddenResponse({ description: "Returned when the authenticated user does not have settings:write." })
  @ApiBadRequestResponse({ description: "Returned when the config payload is invalid." })
  @ApiNotFoundResponse({ description: "Returned when the config does not exist." })
  async update(
    @Param("id") id: string,
    @Body() body: UpsertChatwootInboxConfigDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<SafeChatwootInboxConfig> {
    void user;
    return this.chatwootInboxConfigService.updateById(tenant.companyId, id, body);
  }

  @Post(":id/test")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:read")
  @ApiOperation({ summary: "Test a Chatwoot inbox config connection" })
  @ApiParam({
    name: "id",
    required: true,
    description: "Chatwoot inbox config id",
  })
  @ApiUnauthorizedResponse({ description: "Returned when the request is missing authentication context." })
  @ApiForbiddenResponse({ description: "Returned when the authenticated user does not have settings:read." })
  @ApiNotFoundResponse({ description: "Returned when the config does not exist in the current tenant." })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        message: { type: "string", example: "Conexão com Chatwoot validada com sucesso." },
        reason: { type: "string", nullable: true, example: null },
        details: {
          type: "object",
          nullable: true,
          properties: {
            accountId: { type: "string" },
            inboxId: { type: "string" },
            baseUrl: { type: "string" },
            canReadInbox: { type: "boolean" },
            webhookUrlTemplate: { type: "string" },
            assistantId: { type: "string", nullable: true },
            assistantName: { type: "string", nullable: true },
            assistantStatus: { type: "string", nullable: true },
            assistantConfigured: { type: "boolean" },
          },
          required: [
            "accountId",
            "inboxId",
            "baseUrl",
            "canReadInbox",
            "webhookUrlTemplate",
            "assistantId",
            "assistantName",
            "assistantStatus",
            "assistantConfigured",
          ],
        },
      },
      required: ["ok", "message"],
    },
  })
  async testConnection(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<ChatwootInboxConfigTestResult> {
    void user;
    return this.chatwootInboxConfigService.testConnectionById(tenant.companyId, id);
  }

  @Delete(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:write")
  @ApiOperation({ summary: "Delete a Chatwoot inbox config" })
  @ApiUnauthorizedResponse({ description: "Returned when the request is missing authentication context." })
  @ApiForbiddenResponse({ description: "Returned when the authenticated user does not have settings:write." })
  @ApiNotFoundResponse({ description: "Returned when the config does not exist in the current tenant." })
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<{ ok: true }> {
    void user;
    await this.chatwootInboxConfigService.delete(tenant.companyId, id);
    return { ok: true };
  }
}
