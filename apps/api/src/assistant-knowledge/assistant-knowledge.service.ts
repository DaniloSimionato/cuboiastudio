import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Status } from "@prisma/client";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { AiService } from "../ai/ai.service";
import { type CreateAssistantKnowledgeDto } from "./dto/create-assistant-knowledge.dto";
import { type UpdateAssistantKnowledgeDto } from "./dto/update-assistant-knowledge.dto";

export type AssistantKnowledgeItem = {
  id: string;
  title: string;
  content: string;
  status: Status;
  processingStatus: string;
  chunkCount: number;
  processedAt?: Date | null;
  processingError?: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
};

export type FindAllAssistantKnowledgeResponse = {
  items: AssistantKnowledgeItem[];
};

export type CreateAssistantKnowledgeResponse = AssistantKnowledgeItem;

export type UpdateAssistantKnowledgeResponse = AssistantKnowledgeItem;

export type DeleteAssistantKnowledgeResponse = AssistantKnowledgeItem;

const assistantKnowledgeSafeSelect = {
  id: true,
  title: true,
  content: true,
  status: true,
  processingStatus: true,
  chunkCount: true,
  processedAt: true,
  processingError: true,
  createdAt: true,
  updatedAt: true,
  metadata: true,
} satisfies Prisma.AssistantKnowledgeSelect;

type AssistantKnowledgeSafeRecord = Prisma.AssistantKnowledgeGetPayload<{
  select: typeof assistantKnowledgeSafeSelect;
}>;

function toAssistantKnowledgeItem(
  assistantKnowledge: AssistantKnowledgeSafeRecord,
): AssistantKnowledgeItem {
  return {
    id: assistantKnowledge.id,
    title: assistantKnowledge.title,
    content: assistantKnowledge.content,
    status: assistantKnowledge.status,
    processingStatus: assistantKnowledge.processingStatus,
    chunkCount: assistantKnowledge.chunkCount,
    processedAt: assistantKnowledge.processedAt,
    processingError: assistantKnowledge.processingError,
    createdAt: assistantKnowledge.createdAt,
    updatedAt: assistantKnowledge.updatedAt,
    metadata: assistantKnowledge.metadata ?? undefined,
  };
}

@Injectable()
export class AssistantKnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  private async resolveAssistantOrThrow(input: {
    assistantId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<void> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: {
        id: true,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }
  }

  async findAll(input: {
    assistantId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindAllAssistantKnowledgeResponse> {
    await this.resolveAssistantOrThrow(input);

    const items = await this.prisma.assistantKnowledge.findMany({
      where: {
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantKnowledgeSafeSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return {
      items: items.map(toAssistantKnowledgeItem),
    };
  }

  async create(input: {
    assistantId: string;
    dto: CreateAssistantKnowledgeDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<CreateAssistantKnowledgeResponse> {
    await this.resolveAssistantOrThrow(input);

    const assistantKnowledge = await this.prisma.assistantKnowledge.create({
      data: {
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
        title: input.dto.title,
        content: input.dto.content,
        status: Status.ACTIVE,
        ...(input.dto.metadata !== undefined ? { metadata: input.dto.metadata } : {}),
      },
      select: assistantKnowledgeSafeSelect,
    });

    return toAssistantKnowledgeItem(assistantKnowledge);
  }

  async update(input: {
    assistantId: string;
    knowledgeId: string;
    dto: UpdateAssistantKnowledgeDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<UpdateAssistantKnowledgeResponse> {
    await this.resolveAssistantOrThrow(input);

    const hasTitle = typeof input.dto.title === "string";
    const hasContent = typeof input.dto.content === "string";
    const hasStatus = input.dto.status !== undefined;
    const hasMetadata = input.dto.metadata !== undefined;

    if (!hasTitle && !hasContent && !hasStatus && !hasMetadata) {
      throw new BadRequestException("At least one editable field must be provided.");
    }

    const knowledge = await this.prisma.assistantKnowledge.findFirst({
      where: {
        id: input.knowledgeId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: {
        id: true,
      },
    });

    if (!knowledge) {
      throw new NotFoundException("Knowledge item not found.");
    }

    const updatedKnowledge = await this.prisma.assistantKnowledge.update({
      where: {
        id: input.knowledgeId,
      },
      data: {
        ...(hasTitle ? { title: input.dto.title } : {}),
        ...(hasContent ? { content: input.dto.content } : {}),
        ...(hasStatus ? { status: input.dto.status } : {}),
        ...(hasMetadata ? { metadata: input.dto.metadata } : {}),
      },
      select: assistantKnowledgeSafeSelect,
    });

    return toAssistantKnowledgeItem(updatedKnowledge);
  }

  async delete(input: {
    assistantId: string;
    knowledgeId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<DeleteAssistantKnowledgeResponse> {
    await this.resolveAssistantOrThrow(input);

    const knowledge = await this.prisma.assistantKnowledge.findFirst({
      where: {
        id: input.knowledgeId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
        status: Status.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (!knowledge) {
      throw new NotFoundException("Knowledge item not found.");
    }

    const deletedKnowledge = await this.prisma.assistantKnowledge.update({
      where: {
        id: input.knowledgeId,
      },
      data: {
        status: Status.INACTIVE,
      },
      select: assistantKnowledgeSafeSelect,
    });

    return toAssistantKnowledgeItem(deletedKnowledge);
  }

  private chunkText(text: string, chunkSize: number = 1200, overlap: number = 100): string[] {
    const normalizedText = text.replace(/\r\n/g, "\n").trim();
    if (!normalizedText) return [];

    const chunks: string[] = [];
    let i = 0;

    while (i < normalizedText.length) {
      let end = i + chunkSize;
      if (end >= normalizedText.length) {
        chunks.push(normalizedText.slice(i));
        break;
      }

      // Tenta encontrar uma quebra natural perto do limite
      let breakPoint = normalizedText.lastIndexOf("\n\n", end);
      if (breakPoint <= i) {
        breakPoint = normalizedText.lastIndexOf("\n", end);
      }
      if (breakPoint <= i) {
        breakPoint = normalizedText.lastIndexOf(". ", end);
      }
      if (breakPoint > i) {
        end = breakPoint + 1; // +1 to include the period or newline if we want, or just break at the space
      }

      chunks.push(normalizedText.slice(i, end).trim());
      i = end - overlap;
      if (i < 0) i = 0;
    }

    return chunks.filter(c => c.length > 0);
  }

  async prepare(input: {
    assistantId: string;
    knowledgeId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AssistantKnowledgeItem> {
    await this.resolveAssistantOrThrow(input);

    const knowledge = await this.prisma.assistantKnowledge.findFirst({
      where: {
        id: input.knowledgeId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: {
        id: true,
        content: true,
      },
    });

    if (!knowledge) {
      throw new NotFoundException("Knowledge item not found.");
    }

    // Mark as PROCESSING
    await this.prisma.assistantKnowledge.update({
      where: { id: input.knowledgeId },
      data: {
        processingStatus: "PROCESSING",
        processingError: null,
      },
    });

    try {
      // Create chunks
      const textChunks = this.chunkText(knowledge.content);

      if (textChunks.length === 0) {
        throw new BadRequestException("Knowledge content is empty or could not be chunked.");
      }

      const generatedChunks: any[] = [];

      // For each chunk, generate embedding
      // We process sequentially to respect rate limits gently. In a real heavy system we'd batch this.
      for (let i = 0; i < textChunks.length; i++) {
        const textChunk = textChunks[i];
        
        const embeddingResult = await this.aiService.generateEmbedding({
          companyId: input.tenant.companyId,
          text: textChunk,
        });

        generatedChunks.push({
          companyId: input.tenant.companyId,
          assistantId: input.assistantId,
          knowledgeId: input.knowledgeId,
          chunkIndex: i,
          content: textChunk,
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model,
          embeddingDimension: embeddingResult.dimension,
          status: Status.ACTIVE,
        });
      }

      // Save to database within a transaction
      await this.prisma.$transaction(async (tx) => {
        // Delete old chunks
        await tx.assistantKnowledgeChunk.deleteMany({
          where: { knowledgeId: input.knowledgeId },
        });

        // Insert new chunks
        if (generatedChunks.length > 0) {
          // prisma.createMany is generally safe, but we'll use a loop if array sizes get crazy.
          // For now createMany is fine.
          await tx.assistantKnowledgeChunk.createMany({
            data: generatedChunks,
          });
        }

        // Update knowledge status
        await tx.assistantKnowledge.update({
          where: { id: input.knowledgeId },
          data: {
            processingStatus: "READY",
            chunkCount: generatedChunks.length,
            processedAt: new Date(),
          },
        });
      });

      // Refetch the updated record
      const updatedKnowledge = await this.prisma.assistantKnowledge.findUniqueOrThrow({
        where: { id: input.knowledgeId },
        select: assistantKnowledgeSafeSelect,
      });

      return toAssistantKnowledgeItem(updatedKnowledge);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error during AI preparation";
      
      const failedKnowledge = await this.prisma.assistantKnowledge.update({
        where: { id: input.knowledgeId },
        data: {
          processingStatus: "ERROR",
          processingError: errorMessage.substring(0, 500),
        },
        select: assistantKnowledgeSafeSelect,
      });

      return toAssistantKnowledgeItem(failedKnowledge);
    }
  }
}
