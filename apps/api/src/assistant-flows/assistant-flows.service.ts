import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateAssistantFlowDto } from "./dto/create-assistant-flow.dto";
import { UpdateAssistantFlowDto } from "./dto/update-assistant-flow.dto";

@Injectable()
export class AssistantFlowsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, assistantId: string) {
    const assistant = await this.prisma.assistant.findUnique({
      where: {
        id: assistantId,
        companyId,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistente não encontrado.");
    }

    return this.prisma.assistantFlow.findMany({
      where: {
        assistantId,
      },
      orderBy: {
        priority: "desc",
      },
    });
  }

  async findOne(companyId: string, assistantId: string, flowId: string) {
    const flow = await this.prisma.assistantFlow.findUnique({
      where: {
        id: flowId,
      },
    });

    if (!flow || flow.assistantId !== assistantId) {
      throw new NotFoundException("Fluxo não encontrado.");
    }

    const assistant = await this.prisma.assistant.findUnique({
      where: { id: assistantId, companyId },
    });
    if (!assistant) {
      throw new NotFoundException("Assistente não encontrado.");
    }

    return flow;
  }

  async create(companyId: string, assistantId: string, dto: CreateAssistantFlowDto) {
    const assistant = await this.prisma.assistant.findUnique({
      where: {
        id: assistantId,
        companyId,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistente não encontrado.");
    }

    return this.prisma.assistantFlow.create({
      data: {
        assistantId,
        ...dto,
      },
    });
  }

  async update(companyId: string, assistantId: string, flowId: string, dto: UpdateAssistantFlowDto) {
    await this.findOne(companyId, assistantId, flowId);

    return this.prisma.assistantFlow.update({
      where: {
        id: flowId,
      },
      data: {
        ...dto,
      },
    });
  }

  async delete(companyId: string, assistantId: string, flowId: string) {
    await this.findOne(companyId, assistantId, flowId);

    await this.prisma.assistantFlow.delete({
      where: {
        id: flowId,
      },
    });

    return { success: true };
  }
}
