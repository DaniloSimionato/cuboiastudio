import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Status } from "@prisma/client";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { type CreateAssistantKnowledgeDto } from "./dto/create-assistant-knowledge.dto";
import { type UpdateAssistantKnowledgeDto } from "./dto/update-assistant-knowledge.dto";

export type AssistantKnowledgeItem = {
  id: string;
  title: string;
  content: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: true,
  updatedAt: true,
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
    createdAt: assistantKnowledge.createdAt,
    updatedAt: assistantKnowledge.updatedAt,
  };
}

@Injectable()
export class AssistantKnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

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
        status: Status.ACTIVE,
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

    if (!hasTitle && !hasContent) {
      throw new BadRequestException("At least one editable field must be provided.");
    }

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

    const updatedKnowledge = await this.prisma.assistantKnowledge.update({
      where: {
        id: input.knowledgeId,
      },
      data: {
        ...(hasTitle ? { title: input.dto.title } : {}),
        ...(hasContent ? { content: input.dto.content } : {}),
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
}
