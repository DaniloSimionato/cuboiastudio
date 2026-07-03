import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
  AssistantKnowledgeService,
  type DeleteAssistantKnowledgeResponse,
  type CreateAssistantKnowledgeResponse,
  type FindAllAssistantKnowledgeResponse,
  type UpdateAssistantKnowledgeResponse,
} from "./assistant-knowledge.service";
import { CreateAssistantKnowledgeDto } from "./dto/create-assistant-knowledge.dto";
import { UpdateAssistantKnowledgeDto } from "./dto/update-assistant-knowledge.dto";

@ApiTags("assistant-knowledge")
@Controller("assistants/:assistantId/knowledge")
export class AssistantKnowledgeController {
  constructor(private readonly assistantKnowledgeService: AssistantKnowledgeService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "List manual knowledge items for an assistant" })
  @ApiParam({
    name: "assistantId",
    required: true,
    description: "Assistant id",
    example: "assistant_demo_cubo_ai_studio",
  })
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
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", example: "assistant_knowledge_demo_01" },
              title: { type: "string", example: "Horário de atendimento" },
              content: {
                type: "string",
                example: "Atendemos de segunda a sexta das 08h às 18h.",
              },
              status: { type: "string", example: "ACTIVE" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
            required: ["id", "title", "content", "status", "createdAt", "updatedAt"],
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
    description: "Returned when the authenticated user does not have assistants:read.",
  })
  @ApiNotFoundResponse({
    description: "Returned when the assistant does not exist in the current tenant.",
  })
  async findAll(
    @Param("assistantId") assistantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindAllAssistantKnowledgeResponse> {
    return this.assistantKnowledgeService.findAll({ assistantId, user, tenant });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Create a manual knowledge item for an assistant" })
  @ApiParam({
    name: "assistantId",
    required: true,
    description: "Assistant id",
    example: "assistant_demo_cubo_ai_studio",
  })
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
        title: { type: "string", example: "Horário de atendimento", maxLength: 160 },
        content: {
          type: "string",
          example: "Atendemos de segunda a sexta das 08h às 18h.",
          maxLength: 5000,
        },
      },
      required: ["title", "content"],
      additionalProperties: false,
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "assistant_knowledge_demo_01" },
        title: { type: "string", example: "Horário de atendimento" },
        content: {
          type: "string",
          example: "Atendemos de segunda a sexta das 08h às 18h.",
        },
        status: { type: "string", example: "ACTIVE" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      required: ["id", "title", "content", "status", "createdAt", "updatedAt"],
    },
  })
  @ApiBadRequestResponse({
    description: "Returned when the request body fails validation.",
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have assistants:write.",
  })
  @ApiNotFoundResponse({
    description: "Returned when the assistant does not exist in the current tenant.",
  })
  async create(
    @Param("assistantId") assistantId: string,
    @Body() dto: CreateAssistantKnowledgeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<CreateAssistantKnowledgeResponse> {
    return this.assistantKnowledgeService.create({ assistantId, dto, user, tenant });
  }

  @Patch(":knowledgeId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Update a manual knowledge item for an assistant" })
  @ApiParam({
    name: "assistantId",
    required: true,
    description: "Assistant id",
    example: "assistant_demo_cubo_ai_studio",
  })
  @ApiParam({
    name: "knowledgeId",
    required: true,
    description: "Knowledge item id",
    example: "assistant_knowledge_demo_01",
  })
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
        title: { type: "string", example: "Horário de atendimento atualizado", maxLength: 160 },
        content: {
          type: "string",
          example: "Atendemos de segunda a sexta das 08h às 19h.",
          maxLength: 5000,
        },
      },
      additionalProperties: false,
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "assistant_knowledge_demo_01" },
        title: { type: "string", example: "Horário de atendimento atualizado" },
        content: {
          type: "string",
          example: "Atendemos de segunda a sexta das 08h às 19h.",
        },
        status: { type: "string", example: "ACTIVE" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      required: ["id", "title", "content", "status", "createdAt", "updatedAt"],
    },
  })
  @ApiBadRequestResponse({
    description: "Returned when the request body fails validation.",
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have assistants:write.",
  })
  @ApiNotFoundResponse({
    description: "Returned when the assistant or knowledge item is missing in the tenant.",
  })
  async update(
    @Param("assistantId") assistantId: string,
    @Param("knowledgeId") knowledgeId: string,
    @Body() dto: UpdateAssistantKnowledgeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<UpdateAssistantKnowledgeResponse> {
    return this.assistantKnowledgeService.update({
      assistantId,
      knowledgeId,
      dto,
      user,
      tenant,
    });
  }

  @Delete(":knowledgeId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Remove a manual knowledge item from an assistant" })
  @ApiParam({
    name: "assistantId",
    required: true,
    description: "Assistant id",
    example: "assistant_demo_cubo_ai_studio",
  })
  @ApiParam({
    name: "knowledgeId",
    required: true,
    description: "Knowledge item id",
    example: "assistant_knowledge_demo_01",
  })
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
        id: { type: "string", example: "assistant_knowledge_demo_01" },
        title: { type: "string", example: "Horário de atendimento" },
        content: {
          type: "string",
          example: "Atendemos de segunda a sexta das 08h às 18h.",
        },
        status: { type: "string", example: "INACTIVE" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      required: ["id", "title", "content", "status", "createdAt", "updatedAt"],
    },
  })
  @ApiBadRequestResponse({
    description: "Returned when the request body fails validation.",
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have assistants:write.",
  })
  @ApiNotFoundResponse({
    description: "Returned when the assistant or knowledge item is missing in the tenant.",
  })
  async delete(
    @Param("assistantId") assistantId: string,
    @Param("knowledgeId") knowledgeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<DeleteAssistantKnowledgeResponse> {
    return this.assistantKnowledgeService.delete({ assistantId, knowledgeId, user, tenant });
  }
}
