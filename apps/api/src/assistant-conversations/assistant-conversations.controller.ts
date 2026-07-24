import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
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
  AssistantConversationsService,
  type AdminSilentResetConversationResponse,
  type CreateAssistantConversationResponse,
  type FindAllAssistantConversationsResponse,
  type FindConversationMessagesResponse,
  type SendAssistantConversationMessageResponse,
} from "./assistant-conversations.service";
import { AdminSilentResetConversationDto } from "./dto/admin-silent-reset-conversation.dto";
import { CreateAssistantConversationDto } from "./dto/create-assistant-conversation.dto";
import { SendAssistantConversationMessageDto } from "./dto/send-assistant-conversation-message.dto";

type UploadedAttachmentFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
};

type MultipartMessageBody = Record<string, unknown> & {
  payload?: string;
};

type MultipartAttachmentMetadata = {
  type?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  caption?: string;
  durationSeconds?: number;
};

const MB = 1024 * 1024;
const UPLOAD_LIMITS = {
  image: 10 * MB,
  gif: 10 * MB,
  audio: 25 * MB,
  document: 20 * MB,
  video: 20 * MB,
} satisfies Record<"image" | "gif" | "audio" | "document" | "video", number>;

function trimText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeMimeType(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().split(";")[0]?.trim() || "application/octet-stream"
    : "application/octet-stream";
}

function fileExtension(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  return match?.[1]?.toLowerCase() ?? "";
}

function isAllowedMimeType(
  type: keyof typeof UPLOAD_LIMITS,
  mimeType: string,
  fileName: string,
): boolean {
  const mime = mimeType.toLowerCase();
  const extension = fileExtension(fileName);

  switch (type) {
    case "image":
      return mime.startsWith("image/") && mime !== "image/svg+xml";
    case "gif":
      return mime === "image/gif" || extension === "gif";
    case "audio":
      return (
        mime.startsWith("audio/") ||
        ["webm", "ogg", "mp3", "mpeg", "m4a", "mp4", "wav", "aac", "flac"].includes(extension)
      );
    case "document":
      return (
        mime.includes("pdf") ||
        mime.startsWith("text/") ||
        mime.includes("csv") ||
        mime.includes("json") ||
        mime.includes("word") ||
        mime.includes("document") ||
        mime.includes("excel") ||
        mime.includes("sheet") ||
        mime.includes("officedocument") ||
        ["pdf", "txt", "csv", "doc", "docx", "xls", "xlsx"].includes(extension)
      );
    case "video":
      return mime.startsWith("video/") || ["mp4", "mov", "webm"].includes(extension);
  }
}

function formatLimit(bytes: number): string {
  return `${Math.round(bytes / MB)} MB`;
}

@ApiTags("assistants")
@Controller("assistants/:assistantId/conversations")
export class AssistantConversationsController {
  private readonly logger = new Logger(AssistantConversationsController.name);

  constructor(private readonly assistantConversationsService: AssistantConversationsService) {}

  private parseMultipartPayload(body: MultipartMessageBody): SendAssistantConversationMessageDto {
    if (!body.payload) {
      return body as SendAssistantConversationMessageDto;
    }

    if (typeof body.payload !== "string") {
      throw new BadRequestException("Payload da mensagem inválido.");
    }

    try {
      return JSON.parse(body.payload) as SendAssistantConversationMessageDto;
    } catch {
      throw new BadRequestException("Payload da mensagem inválido.");
    }
  }

  private buildMultipartDto(
    body: MultipartMessageBody,
    files: UploadedAttachmentFile[],
  ): SendAssistantConversationMessageDto {
    const dto = this.parseMultipartPayload(body);
    const metadata = Array.isArray(dto.attachments)
      ? (dto.attachments as MultipartAttachmentMetadata[])
      : [];

    if (files.length === 0) {
      return dto;
    }

    if (metadata.length !== files.length) {
      throw new BadRequestException("Metadados dos anexos não correspondem aos arquivos enviados.");
    }

    const attachments = files.map((file, index) => {
      const item = metadata[index] ?? {};
      const type = item.type;
      if (!type || !(type in UPLOAD_LIMITS)) {
        throw new BadRequestException("Tipo de anexo inválido.");
      }

      const attachmentType = type as keyof typeof UPLOAD_LIMITS;
      const fileName = trimText(item.fileName) ?? file.originalname;
      const mimeType = normalizeMimeType(item.mimeType ?? file.mimetype);
      const limit = UPLOAD_LIMITS[attachmentType];

      if (!file.buffer || file.buffer.byteLength <= 0 || file.size <= 0) {
        throw new BadRequestException("Arquivo vazio ou inválido.");
      }

      if (file.size > limit) {
        throw new BadRequestException(`Arquivo muito grande. Limite: ${formatLimit(limit)}.`);
      }

      if (!isAllowedMimeType(attachmentType, mimeType, fileName)) {
        throw new BadRequestException("Tipo de arquivo não suportado para este anexo.");
      }

      return {
        type: attachmentType,
        fileName,
        mimeType,
        size: file.size,
        caption: trimText(item.caption),
        durationSeconds:
          typeof item.durationSeconds === "number" ? item.durationSeconds : undefined,
        buffer: file.buffer,
      };
    });

    return {
      ...dto,
      attachments,
    } as SendAssistantConversationMessageDto;
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Create a conversation for the current assistant and tenant" })
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
        title: { type: "string", nullable: true, maxLength: 120, example: "Atendimento de teste" },
      },
      additionalProperties: false,
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "assistant_conversation_demo_01" },
        title: { type: "string", nullable: true, example: "Atendimento de teste" },
        status: { type: "string", example: "ACTIVE" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      required: ["id", "title", "status", "createdAt", "updatedAt"],
    },
  })
  @ApiBadRequestResponse({
    description: "Returned when the request body fails validation or the assistant is inactive.",
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
    @Body() dto: CreateAssistantConversationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<CreateAssistantConversationResponse> {
    const startedAt = Date.now();
    this.logger.log({
      event: "tests.conversation.create.start",
      assistantId,
      companyId: tenant.companyId,
    });

    try {
      const response = await this.assistantConversationsService.create({
        assistantId,
        dto,
        user,
        tenant,
      });
      this.logger.log({
        event: "tests.conversation.create.success",
        assistantId,
        conversationId: response.id,
        companyId: tenant.companyId,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      this.logger.warn({
        event: "tests.conversation.create.failed",
        assistantId,
        companyId: tenant.companyId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "unknown-error",
      });
      throw error;
    }
  }

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "List conversations for the current assistant and tenant" })
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
              id: { type: "string", example: "assistant_conversation_demo_01" },
              title: { type: "string", nullable: true, example: "Atendimento de teste" },
              status: { type: "string", example: "ACTIVE" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
            required: ["id", "title", "status", "createdAt", "updatedAt"],
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
  ): Promise<FindAllAssistantConversationsResponse> {
    const startedAt = Date.now();
    this.logger.log({
      event: "tests.conversation.list.start",
      assistantId,
      companyId: tenant.companyId,
    });

    try {
      const response = await this.assistantConversationsService.findAll({
        assistantId,
        user,
        tenant,
      });
      this.logger.log({
        event: "tests.conversation.list.success",
        assistantId,
        companyId: tenant.companyId,
        count: response.items.length,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      this.logger.warn({
        event: "tests.conversation.list.failed",
        assistantId,
        companyId: tenant.companyId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "unknown-error",
      });
      throw error;
    }
  }

  @Get(":conversationId/messages")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "List messages for a conversation in the current assistant and tenant" })
  @ApiParam({
    name: "assistantId",
    required: true,
    description: "Assistant id",
    example: "assistant_demo_cubo_ai_studio",
  })
  @ApiParam({
    name: "conversationId",
    required: true,
    description: "Conversation id",
    example: "assistant_conversation_demo_01",
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
              id: { type: "string", example: "assistant_conversation_message_demo_01" },
              role: { type: "string", example: "user" },
              content: { type: "string", example: "Qual é o horário de atendimento?" },
              sources: {
                type: "array",
                nullable: true,
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", example: "assistant_knowledge_demo_01" },
                    title: { type: "string", example: "Horário de atendimento" },
                  },
                  required: ["id", "title"],
                },
              },
              mode: { type: "string", nullable: true, example: "deterministic-runtime" },
              createdAt: { type: "string", format: "date-time" },
            },
            required: ["id", "role", "content", "createdAt"],
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
    description: "Returned when the conversation does not exist in the current tenant.",
  })
  async findMessages(
    @Param("assistantId") assistantId: string,
    @Param("conversationId") conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindConversationMessagesResponse> {
    const startedAt = Date.now();
    this.logger.log({
      event: "tests.conversation.messages.start",
      assistantId,
      conversationId,
      companyId: tenant.companyId,
    });

    try {
      const response = await this.assistantConversationsService.findMessages({
        assistantId,
        conversationId,
        user,
        tenant,
      });
      this.logger.log({
        event: "tests.conversation.messages.success",
        assistantId,
        conversationId,
        companyId: tenant.companyId,
        count: response.items.length,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      this.logger.warn({
        event: "tests.conversation.messages.failed",
        assistantId,
        conversationId,
        companyId: tenant.companyId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "unknown-error",
      });
      throw error;
    }
  }

  @Post(":conversationId/messages")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({
    summary: "Send a message to a conversation using AI runtime with deterministic fallback",
    description:
      "This flow tries the AI provider when it is enabled and configured, then falls back to the deterministic runtime when needed.",
  })
  @ApiParam({
    name: "assistantId",
    required: true,
    description: "Assistant id",
    example: "assistant_demo_cubo_ai_studio",
  })
  @ApiParam({
    name: "conversationId",
    required: true,
    description: "Conversation id",
    example: "assistant_conversation_demo_01",
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
        message: { type: "string", nullable: true, example: "Qual é o horário de atendimento?" },
        source: { type: "string", nullable: true, example: "tests" },
        externalMessageId: { type: "string", nullable: true, example: "chatwoot_msg_123" },
        externalConversationId: { type: "string", nullable: true, example: "chatwoot_conv_123" },
        externalContactId: { type: "string", nullable: true, example: "contact_123" },
        externalChannelId: { type: "string", nullable: true, example: "inbox_123" },
        externalInboxId: { type: "string", nullable: true, example: "inbox_identifier_123" },
        messageType: { type: "string", nullable: true, example: "image" },
        attachments: {
          type: "array",
          nullable: true,
          items: {
            type: "object",
            properties: {
              type: { type: "string", example: "image" },
              fileName: { type: "string", example: "image.jpg" },
              mimeType: { type: "string", example: "image/jpeg" },
              size: { type: "number", nullable: true, example: 12345 },
              dataUrl: { type: "string", nullable: true },
              url: { type: "string", nullable: true },
              thumbUrl: { type: "string", nullable: true },
              caption: { type: "string", nullable: true },
              durationSeconds: { type: "number", nullable: true },
              extractedText: { type: "string", nullable: true },
              transcript: { type: "string", nullable: true },
              description: { type: "string", nullable: true },
            },
            required: ["type", "fileName", "mimeType"],
          },
        },
        contact: {
          type: "object",
          nullable: true,
          properties: {
            name: { type: "string", example: "João da Silva" },
            phone: { type: "string", example: "+55 67 99999-9999" },
          },
          required: ["name", "phone"],
        },
        location: {
          type: "object",
          nullable: true,
          properties: {
            label: { type: "string", nullable: true, example: "Recepção do clube" },
            latitude: { type: "number", nullable: true, example: -20.4697 },
            longitude: { type: "number", nullable: true, example: -54.6201 },
          },
        },
      },
      additionalProperties: false,
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: "object",
      properties: {
        conversationId: { type: "string", example: "assistant_conversation_demo_01" },
        userMessage: {
          type: "object",
          properties: {
            id: { type: "string", example: "assistant_conversation_message_demo_01" },
            role: { type: "string", example: "user" },
            content: { type: "string", example: "Qual é o horário de atendimento?" },
            createdAt: { type: "string", format: "date-time" },
          },
          required: ["id", "role", "content", "createdAt"],
        },
        assistantMessage: {
          type: "object",
          nullable: true,
          properties: {
            id: { type: "string", example: "assistant_conversation_message_demo_02" },
            role: { type: "string", example: "assistant" },
            content: {
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
            mode: { type: "string", example: "deterministic-runtime" },
            createdAt: { type: "string", format: "date-time" },
          },
          required: ["id", "role", "content", "sources", "mode", "createdAt"],
        },
        runtime: {
          type: "object",
          properties: {
            mode: { type: "string", example: "deterministic-runtime" },
            assistant: {
              type: "object",
              properties: {
                id: { type: "string", example: "assistant_demo_cubo_ai_studio" },
                name: { type: "string", example: "Assistente Demo" },
              },
              required: ["id", "name"],
            },
            provider: { type: "string", nullable: true, example: "openai-compatible" },
            model: { type: "string", nullable: true, example: "gpt-4o-mini" },
            modelSource: { type: "string", example: "runtime-config" },
            temperature: { type: "number", example: 0.2 },
            temperatureSource: { type: "string", example: "assistant" },
            configurationSource: { type: "string", example: "tenant-settings" },
            fallback: { type: "boolean", example: true },
            outcome: { type: "string", example: "fallback" },
            summary: {
              type: "string",
              example:
                'Usuário perguntou: "Qual é o horário de atendimento?". Assistente respondeu em modo: determinístico. Fontes usadas: 1. Saída: fallback.',
            },
            reason: {
              type: "string",
              nullable: true,
              example: "ai-runtime-disabled",
            },
            warning: {
              type: "string",
              nullable: true,
              example: "IA real indisponível. Resposta gerada em modo determinístico.",
            },
          },
          required: [
            "mode",
            "assistant",
            "temperature",
            "temperatureSource",
            "configurationSource",
            "fallback",
            "outcome",
            "summary",
          ],
        },
      },
      required: ["conversationId", "userMessage", "assistantMessage", "runtime"],
    },
  })
  @ApiBadRequestResponse({
    description: "Returned when the request body fails validation or the assistant is inactive.",
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have assistants:write.",
  })
  @ApiNotFoundResponse({
    description: "Returned when the conversation does not exist in the current tenant.",
  })
  async sendMessage(
    @Param("assistantId") assistantId: string,
    @Param("conversationId") conversationId: string,
    @Body() dto: SendAssistantConversationMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<SendAssistantConversationMessageResponse> {
    const startedAt = Date.now();
    this.logger.log({
      event: "tests.conversation.send.start",
      assistantId,
      conversationId,
      companyId: tenant.companyId,
      attachmentCount: dto.attachments?.length ?? 0,
    });

    try {
      const response = await this.assistantConversationsService.sendMessage({
        assistantId,
        conversationId,
        dto,
        user,
        tenant,
      });
      this.logger.log({
        event: "tests.conversation.send.success",
        assistantId,
        conversationId,
        companyId: tenant.companyId,
        attachmentCount: dto.attachments?.length ?? 0,
        runtimeOutcome: response.runtime.outcome,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      this.logger.warn({
        event: "tests.conversation.send.failed",
        assistantId,
        conversationId,
        companyId: tenant.companyId,
        attachmentCount: dto.attachments?.length ?? 0,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "unknown-error",
      });
      throw error;
    }
  }

  @Post(":conversationId/messages/multipart")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @UseInterceptors(AnyFilesInterceptor({ limits: { files: 10, fileSize: 30 * MB } }))
  @ApiOperation({
    summary: "Send a test message with real files using multipart/form-data",
    description: "Used by the /testes screen to avoid sending base64/dataUrl payloads inside JSON.",
  })
  sendMessageMultipart(
    @Param("assistantId") assistantId: string,
    @Param("conversationId") conversationId: string,
    @Body() body: MultipartMessageBody,
    @UploadedFiles() files: UploadedAttachmentFile[] = [],
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<SendAssistantConversationMessageResponse> {
    const startedAt = Date.now();
    const fileMetadata = files.map((file) => ({
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    }));

    this.logger.log({
      event: "tests.conversation.send-multipart.start",
      assistantId,
      conversationId,
      companyId: tenant.companyId,
      attachmentCount: files.length,
      files: fileMetadata,
    });

    let dto: SendAssistantConversationMessageDto;

    try {
      dto = this.buildMultipartDto(body, files);
    } catch (error) {
      this.logger.warn({
        event: "tests.conversation.send-multipart.failed",
        assistantId,
        conversationId,
        companyId: tenant.companyId,
        attachmentCount: files.length,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "unknown-error",
      });
      throw error;
    }

    return this.assistantConversationsService
      .sendMessage({
        assistantId,
        conversationId,
        dto,
        user,
        tenant,
      })
      .then((response) => {
        this.logger.log({
          event: "tests.conversation.send-multipart.success",
          assistantId,
          conversationId,
          companyId: tenant.companyId,
          attachmentCount: files.length,
          runtimeOutcome: response.runtime.outcome,
          durationMs: Date.now() - startedAt,
        });
        return response;
      })
      .catch((error) => {
        this.logger.warn({
          event: "tests.conversation.send-multipart.failed",
          assistantId,
          conversationId,
          companyId: tenant.companyId,
          attachmentCount: files.length,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : "unknown-error",
        });
        throw error;
      });
  }

  @Post(":conversationId/resume")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Resume an AI conversation that was paused or handed off to human" })
  @ApiParam({ name: "assistantId", required: true, example: "assistant_demo" })
  @ApiParam({ name: "conversationId", required: true, example: "conv_demo" })
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
        runAi: { type: "boolean", default: true },
        reason: { type: "string", nullable: true },
      },
    },
  })
  async resumeConversation(
    @Param("assistantId") assistantId: string,
    @Param("conversationId") conversationId: string,
    @Body() body: { runAi?: boolean; reason?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ) {
    if (process.env.ENABLE_RESUME_AND_RUN !== "true") {
      throw new BadRequestException("O recurso Resume And Run está desativado neste ambiente.");
    }

    this.logger.log({
      event: "tests.conversation.resume.start",
      assistantId,
      conversationId,
      companyId: tenant.companyId,
    });

    return this.assistantConversationsService.resumeConversation({
      assistantId,
      conversationId,
      runAi: body.runAi ?? true,
      reason: body.reason,
      tenant,
    });
  }

  @Post(":conversationId/admin-context-reset")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write", "settings:write")
  @ApiOperation({
    summary: "Silently reset one conversation context without processing or outbound",
  })
  @ApiParam({ name: "assistantId", required: true, example: "assistant_demo" })
  @ApiParam({ name: "conversationId", required: true, example: "conv_demo" })
  @ApiBody({ type: AdminSilentResetConversationDto })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        conversationId: { type: "string" },
        previousContextVersion: { type: "integer" },
        currentContextVersion: { type: "integer" },
        aiActive: { type: "boolean" },
        pausedByHuman: { type: "boolean" },
        resetSource: { type: "string", example: "ADMIN_SILENT_CONTEXT_RESET" },
        resetAt: { type: "string", format: "date-time" },
      },
      required: [
        "conversationId",
        "previousContextVersion",
        "currentContextVersion",
        "aiActive",
        "pausedByHuman",
        "resetSource",
        "resetAt",
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({
    description: "Administrative assistant and settings write permissions are required.",
  })
  @ApiNotFoundResponse({
    description: "Conversation not found in the current assistant and tenant.",
  })
  @ApiConflictResponse({
    description: "The expected context version no longer matches the conversation.",
  })
  adminSilentResetConversation(
    @Param("assistantId") assistantId: string,
    @Param("conversationId") conversationId: string,
    @Body() dto: AdminSilentResetConversationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<AdminSilentResetConversationResponse> {
    return this.assistantConversationsService.adminSilentResetConversation({
      assistantId,
      conversationId,
      expectedContextVersion: dto.expectedContextVersion,
      resumeAfterReset: dto.resumeAfterReset,
      actor: user,
      tenant,
    });
  }
}
