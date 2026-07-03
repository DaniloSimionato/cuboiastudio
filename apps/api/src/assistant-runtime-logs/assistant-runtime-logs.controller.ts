import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
  AssistantRuntimeLogsService,
  type FindAllAssistantRuntimeLogsResponse,
  type FindOneAssistantRuntimeLogResponse,
} from "./assistant-runtime-logs.service";

type RuntimeLogsQuery = {
  assistantId?: string;
  conversationId?: string;
  mode?: string;
  status?: string;
  fallback?: string;
  limit?: string;
};

@ApiTags("logs")
@Controller("logs/ai")
export class AssistantRuntimeLogsController {
  constructor(private readonly assistantRuntimeLogsService: AssistantRuntimeLogsService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("logs:read")
  @ApiOperation({ summary: "List safe AI runtime logs for the current tenant" })
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
  @ApiQuery({ name: "assistantId", required: false, type: String })
  @ApiQuery({ name: "conversationId", required: false, type: String })
  @ApiQuery({ name: "mode", required: false, type: String, example: "ai-runtime" })
  @ApiQuery({ name: "status", required: false, type: String, example: "success" })
  @ApiQuery({ name: "fallback", required: false, type: Boolean })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 50 })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              assistantId: { type: "string", nullable: true },
              assistantName: { type: "string", nullable: true },
              conversationId: { type: "string", nullable: true },
              mode: { type: "string", example: "ai-runtime" },
              status: { type: "string", example: "success" },
              provider: { type: "string", nullable: true, example: "openai-compatible" },
              model: { type: "string", nullable: true, example: "gpt-4o-mini" },
              configurationSource: { type: "string", nullable: true, example: "tenant-settings" },
              fallback: { type: "boolean", example: false },
              fallbackReason: { type: "string", nullable: true },
              outcome: { type: "string", nullable: true, example: "success" },
              durationMs: { type: "number", nullable: true, example: 1234 },
              providerStatus: { type: "number", nullable: true },
              providerErrorCode: { type: "string", nullable: true },
              knowledgeCount: { type: "number", nullable: true, example: 2 },
              historyMessagesUsed: { type: "number", nullable: true, example: 4 },
              historyLimit: { type: "number", nullable: true, example: 10 },
              initialMessageIncluded: { type: "boolean", example: true },
              instructionsIncluded: { type: "boolean", example: true },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
      required: ["items"],
    },
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have logs:read.",
  })
  findAll(
    @Query() query: RuntimeLogsQuery,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindAllAssistantRuntimeLogsResponse> {
    return this.assistantRuntimeLogsService.findAll({ query, user, tenant });
  }

  @Get(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("logs:read")
  @ApiOperation({ summary: "Get one safe AI runtime log for the current tenant" })
  @ApiParam({ name: "id", required: true, description: "AI runtime log id" })
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
    description:
      "Returns metadata only. It never includes API keys, authorization headers or full prompts.",
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have logs:read.",
  })
  @ApiNotFoundResponse({
    description: "Returned when the log does not exist in the current tenant.",
  })
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindOneAssistantRuntimeLogResponse> {
    return this.assistantRuntimeLogsService.findOne({ id, user, tenant });
  }
}
