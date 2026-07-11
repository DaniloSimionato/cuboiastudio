import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { CreateAssistantFlowDto } from "./dto/create-assistant-flow.dto";
import { UpdateAssistantFlowDto } from "./dto/update-assistant-flow.dto";

@Injectable()
export class AssistantFlowsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, assistantId: string) {
    const assistant = await this.prisma.assistant.findFirst({
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
        assistant: {
          companyId,
        },
      },
      orderBy: {
        priority: "desc",
      },
    });
  }

  async findOne(companyId: string, assistantId: string, flowId: string) {
    const flow = await this.prisma.assistantFlow.findFirst({
      where: {
        id: flowId,
        assistantId,
        assistant: {
          companyId,
        },
      },
    });

    if (!flow) {
      throw new NotFoundException("Fluxo não encontrado.");
    }

    return flow;
  }

  async create(companyId: string, assistantId: string, dto: CreateAssistantFlowDto) {
    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: assistantId,
        companyId,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistente não encontrado.");
    }

    return this.prisma.assistantFlow.create({
      data: this.toAssistantFlowCreateData(assistantId, dto),
    });
  }

  async update(
    companyId: string,
    assistantId: string,
    flowId: string,
    dto: UpdateAssistantFlowDto,
  ) {
    await this.findOne(companyId, assistantId, flowId);

    return this.prisma.assistantFlow.update({
      where: {
        id: flowId,
      },
      data: this.toAssistantFlowUpdateData(dto),
    });
  }

  async delete(companyId: string, assistantId: string, flowId: string) {
    await this.findOne(companyId, assistantId, flowId);

    await this.prisma.assistantFlow.deleteMany({
      where: {
        id: flowId,
        assistantId,
        assistant: {
          companyId,
        },
      },
    });

    return { success: true };
  }

  private toAssistantFlowCreateData(
    assistantId: string,
    dto: CreateAssistantFlowDto,
  ): Prisma.AssistantFlowUncheckedCreateInput {
    return {
      assistantId,
      name: dto.name,
      description: dto.description,
      priority: dto.priority,
      triggerKeywords: dto.triggerKeywords,
      triggerDescription: dto.triggerDescription,
      triggerExamples: dto.triggerExamples,
      flowInstructions: dto.flowInstructions,
      allowedToolSlugs: dto.allowedToolSlugs,
      knowledgeScope: dto.knowledgeScope,
      finalAction: dto.finalAction,
      fixedMessage: dto.fixedMessage,
      handoffTeamId: dto.handoffTeamId,
      handoffTeamName: dto.handoffTeamName,
      chatwootLabels: dto.chatwootLabels,
      autoRespond: dto.autoRespond,
      requiresHuman: dto.requiresHuman,
      active: dto.active,
      toolContext: dto.toolContext
        ? (dto.toolContext as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };
  }

  private toAssistantFlowUpdateData(
    dto: UpdateAssistantFlowDto,
  ): Prisma.AssistantFlowUncheckedUpdateInput {
    const data: Prisma.AssistantFlowUncheckedUpdateInput = {};
    const hasField = (field: string) =>
      (dto as unknown as Record<string, unknown>)[field] !== undefined;

    if (hasField("name")) data.name = dto.name;
    if (hasField("description"))
      data.description = dto.description;
    if (hasField("priority")) data.priority = dto.priority;
    if (hasField("triggerKeywords"))
      data.triggerKeywords = dto.triggerKeywords;
    if (hasField("triggerDescription"))
      data.triggerDescription = dto.triggerDescription;
    if (hasField("triggerExamples"))
      data.triggerExamples = dto.triggerExamples;
    if (hasField("flowInstructions"))
      data.flowInstructions = dto.flowInstructions;
    if (hasField("allowedToolSlugs"))
      data.allowedToolSlugs = dto.allowedToolSlugs;
    if (hasField("knowledgeScope"))
      data.knowledgeScope = dto.knowledgeScope;
    if (hasField("finalAction"))
      data.finalAction = dto.finalAction;
    if (hasField("fixedMessage"))
      data.fixedMessage = dto.fixedMessage;
    if (hasField("handoffTeamId"))
      data.handoffTeamId = dto.handoffTeamId;
    if (hasField("handoffTeamName"))
      data.handoffTeamName = dto.handoffTeamName;
    if (hasField("chatwootLabels"))
      data.chatwootLabels = dto.chatwootLabels;
    if (hasField("autoRespond"))
      data.autoRespond = dto.autoRespond;
    if (hasField("requiresHuman"))
      data.requiresHuman = dto.requiresHuman;
    if (hasField("active")) data.active = dto.active;

    if (hasField("toolContext")) {
      data.toolContext = dto.toolContext
        ? (dto.toolContext as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }

    return data;
  }
}
