import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiNotFoundResponse,
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
  AssistantsService,
  type CreateAssistantResponse,
  type FindAllAssistantsResponse,
  type FindOneAssistantResponse,
  type FindAllPreviewAssistantLogsResponse,
  type PreviewAssistantResponse,
  type RunAssistantResponse,
  type UpdateAssistantStatusResponse,
  type UpdateAssistantResponse,
} from "./assistants.service";
import { CreateAssistantDto } from "./dto/create-assistant.dto";
import { PreviewAssistantDto } from "./dto/preview-assistant.dto";
import { RunAssistantDto } from "./dto/run-assistant.dto";
import { UpdateAssistantStatusDto } from "./dto/update-assistant-status.dto";
import { UpdateAssistantDto } from "./dto/update-assistant.dto";
import { UpdateAssistantToolsDto } from "./dto/update-assistant-tools.dto";

@ApiTags("assistants")
@Controller("assistants")
export class AssistantsController {
  constructor(private readonly assistantsService: AssistantsService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "List assistants for the current tenant" })
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
              id: { type: "string", example: "assistant_demo_01" },
              name: { type: "string", example: "Atendimento IA" },
              description: { type: "string", nullable: true, example: "Assistente principal" },
              initialMessage: {
                type: "string",
                nullable: true,
                example: "Olá! Sou seu assistente. Como posso ajudar?",
              },
              instructions: {
                type: "string",
                nullable: true,
                example: "Você é um atendente da Cubo.Chat.",
              },
              model: { type: "string", nullable: true, example: "gpt-4o-mini" },
              temperature: { type: "number", nullable: true, example: 0.2 },
              status: { type: "string", example: "ACTIVE" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
            required: [
              "id",
              "name",
              "description",
              "initialMessage",
              "instructions",
              "model",
              "temperature",
              "status",
              "createdAt",
              "updatedAt",
            ],
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
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindAllAssistantsResponse> {
    return this.assistantsService.findAll({ user, tenant });
  }

  @Get(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "Get an assistant by id for the current tenant" })
  @ApiParam({
    name: "id",
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
        id: { type: "string", example: "assistant_demo_cubo_ai_studio" },
        name: { type: "string", example: "Assistente Demo" },
        description: {
          type: "string",
          nullable: true,
          example: "Assistente inicial para validacao do modulo de Assistentes IA.",
        },
        initialMessage: {
          type: "string",
          nullable: true,
          example: "Olá! Sou seu assistente. Como posso ajudar?",
        },
        instructions: {
          type: "string",
          nullable: true,
          example: "Você é um atendente da Cubo.Chat.",
        },
        model: { type: "string", nullable: true, example: "gpt-4o-mini" },
        temperature: { type: "number", nullable: true, example: 0.2 },
        status: { type: "string", example: "ACTIVE" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      required: [
        "id",
        "name",
        "description",
        "initialMessage",
        "instructions",
        "model",
        "temperature",
        "status",
        "createdAt",
        "updatedAt",
      ],
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
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindOneAssistantResponse> {
    return this.assistantsService.findOne({ id, user, tenant });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Create an assistant for the current tenant" })
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
        name: { type: "string", example: "Atendente Comercial", maxLength: 120 },
        description: {
          type: "string",
          nullable: true,
          example: "Assistente responsavel pelo primeiro atendimento comercial.",
          maxLength: 500,
        },
        instructions: {
          type: "string",
          nullable: true,
          example: "Você é um atendente da Cubo.Chat.",
          maxLength: 4000,
        },
        initialMessage: {
          type: "string",
          nullable: true,
          example: "Olá! Sou seu assistente. Como posso ajudar?",
          maxLength: 1000,
        },
        model: {
          type: "string",
          nullable: true,
          example: "gpt-4o-mini",
          maxLength: 100,
        },
        temperature: {
          type: "number",
          nullable: true,
          example: 0.2,
          minimum: 0,
          maximum: 2,
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "assistant_demo_01" },
        name: { type: "string", example: "Atendente Comercial" },
        description: {
          type: "string",
          nullable: true,
          example: "Assistente responsavel pelo primeiro atendimento comercial.",
        },
        initialMessage: {
          type: "string",
          nullable: true,
          example: "Olá! Sou seu assistente. Como posso ajudar?",
        },
        instructions: {
          type: "string",
          nullable: true,
          example: "Você é um atendente da Cubo.Chat.",
        },
        model: { type: "string", nullable: true, example: "gpt-4o-mini" },
        temperature: { type: "number", nullable: true, example: 0.2 },
        status: { type: "string", example: "ACTIVE" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      required: [
        "id",
        "name",
        "description",
        "initialMessage",
        "instructions",
        "model",
        "temperature",
        "status",
        "createdAt",
        "updatedAt",
      ],
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
  async create(
    @Body() dto: CreateAssistantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<CreateAssistantResponse> {
    return this.assistantsService.create({ dto, user, tenant });
  }

  @Post(":id/preview")
  @HttpCode(200)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({
    summary: "Run a deterministic preview using the assistant manual knowledge base",
    description:
      "This is a deterministic simulation only. It does not call AI providers, embeddings or external APIs.",
  })
  @ApiParam({
    name: "id",
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
        question: {
          type: "string",
          example: "Qual é o horário de atendimento?",
          maxLength: 1000,
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        previewLogId: { type: "string", example: "assistant_preview_log_01" },
        assistant: {
          type: "object",
          properties: {
            id: { type: "string", example: "assistant_demo_cubo_ai_studio" },
            name: { type: "string", example: "Assistente Demo" },
          },
          required: ["id", "name"],
        },
        question: { type: "string", example: "Qual é o horário de atendimento?" },
        answer: {
          type: "string",
          example:
            "Com base na base de conhecimento cadastrada, encontrei os seguintes conteúdos relacionados para consulta: Horário de atendimento: Atendemos de segunda a sexta das 08h às 18h.",
        },
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", example: "assistant_knowledge_demo_01" },
              title: { type: "string", example: "Horário de atendimento" },
            },
            required: ["id", "title"],
          },
        },
        mode: { type: "string", example: "deterministic-preview" },
      },
      required: ["previewLogId", "assistant", "question", "answer", "sources", "mode"],
    },
  })
  @ApiBadRequestResponse({
    description: "Returned when the request body fails validation or the assistant is inactive.",
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
  async preview(
    @Param("id") id: string,
    @Body() dto: PreviewAssistantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<PreviewAssistantResponse> {
    return this.assistantsService.preview({ id, dto, user, tenant });
  }

  @Post(":id/run")
  @HttpCode(200)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({
    summary: "Run the deterministic runtime for an assistant using active knowledge",
    description:
      "This is a deterministic runtime simulation only. It does not call AI providers, embeddings or external APIs.",
  })
  @ApiParam({
    name: "id",
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
        message: {
          type: "string",
          example: "Qual é o horário de atendimento?",
          maxLength: 1000,
        },
      },
      required: ["message"],
      additionalProperties: false,
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        runLogId: { type: "string", example: "assistant_preview_log_01" },
        assistant: {
          type: "object",
          properties: {
            id: { type: "string", example: "assistant_demo_cubo_ai_studio" },
            name: { type: "string", example: "Assistente Demo" },
          },
          required: ["id", "name"],
        },
        input: {
          type: "object",
          properties: {
            message: { type: "string", example: "Qual é o horário de atendimento?" },
          },
          required: ["message"],
        },
        output: {
          type: "object",
          properties: {
            answer: {
              type: "string",
              example:
                "Com base na base de conhecimento cadastrada, encontrei os seguintes conteúdos relacionados para consulta: Horário de atendimento: Atendemos de segunda a sexta das 08h às 18h.",
            },
          },
          required: ["answer"],
        },
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", example: "assistant_knowledge_demo_01" },
              title: { type: "string", example: "Horário de atendimento" },
            },
            required: ["id", "title"],
          },
        },
        mode: { type: "string", example: "deterministic-runtime" },
      },
      required: ["runLogId", "assistant", "input", "output", "sources", "mode"],
    },
  })
  @ApiBadRequestResponse({
    description: "Returned when the request body fails validation or the assistant is inactive.",
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
  async run(
    @Param("id") id: string,
    @Body() dto: RunAssistantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<RunAssistantResponse> {
    return this.assistantsService.run({ id, dto, user, tenant });
  }

  @Get(":assistantId/preview-logs")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({
    summary: "List deterministic execution logs for an assistant",
    description:
      "This shared log history includes both deterministic preview and deterministic runtime executions, differentiated by mode.",
  })
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
              id: { type: "string", example: "assistant_preview_log_01" },
              question: { type: "string", example: "Qual é o horário de atendimento?" },
              answer: {
                type: "string",
                example:
                  "Com base na base de conhecimento cadastrada, encontrei os seguintes conteúdos relacionados para consulta: Horário de atendimento: Atendemos de segunda a sexta das 08h às 18h.",
              },
              mode: { type: "string", example: "deterministic-preview" },
              sources: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", example: "assistant_knowledge_demo_01" },
                    title: { type: "string", example: "Horário de atendimento" },
                  },
                  required: ["id", "title"],
                },
              },
              createdAt: { type: "string", format: "date-time" },
            },
            required: ["id", "question", "answer", "mode", "sources", "createdAt"],
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
  async findPreviewLogs(
    @Param("assistantId") assistantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindAllPreviewAssistantLogsResponse> {
    return this.assistantsService.findPreviewLogs({ id: assistantId, user, tenant });
  }

  @Patch(":id/status")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Update assistant status for the current tenant" })
  @ApiParam({
    name: "id",
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
        status: {
          type: "string",
          example: "INACTIVE",
          enum: ["ACTIVE", "INACTIVE"],
        },
      },
      required: ["status"],
      additionalProperties: false,
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "assistant_demo_cubo_ai_studio" },
        name: { type: "string", example: "Assistente Demo" },
        description: {
          type: "string",
          nullable: true,
          example: "Assistente inicial para validacao do modulo de Assistentes IA.",
        },
        initialMessage: {
          type: "string",
          nullable: true,
          example: "Olá! Sou seu assistente. Como posso ajudar?",
        },
        instructions: {
          type: "string",
          nullable: true,
          example: "Você é um atendente da Cubo.Chat.",
        },
        model: { type: "string", nullable: true, example: "gpt-4o-mini" },
        temperature: { type: "number", nullable: true, example: 0.2 },
        status: { type: "string", example: "INACTIVE" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      required: [
        "id",
        "name",
        "description",
        "initialMessage",
        "instructions",
        "model",
        "temperature",
        "status",
        "createdAt",
        "updatedAt",
      ],
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
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateAssistantStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<UpdateAssistantStatusResponse> {
    return this.assistantsService.updateStatus({ id, dto, user, tenant });
  }

  @Patch(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Update an assistant for the current tenant" })
  @ApiParam({
    name: "id",
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
        name: { type: "string", example: "Novo nome do assistente", maxLength: 120 },
        description: {
          type: "string",
          nullable: true,
          example: "Nova descricao do assistente.",
          maxLength: 500,
        },
        instructions: {
          type: "string",
          nullable: true,
          example: "Você é um atendente da Cubo.Chat.",
          maxLength: 4000,
        },
        initialMessage: {
          type: "string",
          nullable: true,
          example: "Olá! Sou seu assistente. Como posso ajudar?",
          maxLength: 1000,
        },
        model: {
          type: "string",
          nullable: true,
          example: "gpt-4o-mini",
          maxLength: 100,
        },
        temperature: {
          type: "number",
          nullable: true,
          example: 0.2,
          minimum: 0,
          maximum: 2,
        },
      },
      additionalProperties: false,
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "assistant_demo_cubo_ai_studio" },
        name: { type: "string", example: "Novo nome do assistente" },
        description: {
          type: "string",
          nullable: true,
          example: "Nova descricao do assistente.",
        },
        initialMessage: {
          type: "string",
          nullable: true,
          example: "Olá! Sou seu assistente. Como posso ajudar?",
        },
        instructions: {
          type: "string",
          nullable: true,
          example: "Você é um atendente da Cubo.Chat.",
        },
        model: { type: "string", nullable: true, example: "gpt-4o-mini" },
        temperature: { type: "number", nullable: true, example: 0.2 },
        status: { type: "string", example: "ACTIVE" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      required: [
        "id",
        "name",
        "description",
        "initialMessage",
        "instructions",
        "model",
        "temperature",
        "status",
        "createdAt",
        "updatedAt",
      ],
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
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAssistantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<UpdateAssistantResponse> {
    return this.assistantsService.update({ id, dto, user, tenant });
  }

  @Get(":id/tools")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "Get assistant tool configurations" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  async findTools(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.assistantsService.findTools({ id, user, tenant });
  }

  @Patch(":id/tools")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Update assistant tool configurations" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  async updateTools(
    @Param("id") id: string,
    @Body() dto: UpdateAssistantToolsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.assistantsService.updateTools({ id, dto, user, tenant });
  }
}
