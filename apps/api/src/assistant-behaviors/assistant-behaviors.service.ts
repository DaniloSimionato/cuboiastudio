import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { UpsertAssistantBehaviorDto } from "./dto/upsert-assistant-behavior.dto";

@Injectable()
export class AssistantBehaviorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAssistantId(companyId: string, assistantId: string) {
    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: assistantId,
        companyId,
      },
      include: {
        behavior: true,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistente não encontrado.");
    }

    return assistant.behavior;
  }

  async upsert(companyId: string, assistantId: string, dto: UpsertAssistantBehaviorDto) {
    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: assistantId,
        companyId,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistente não encontrado.");
    }

    return this.prisma.assistantBehavior.upsert({
      where: {
        assistantId,
      },
      update: {
        ...dto,
      },
      create: {
        assistantId,
        ...dto,
      },
    });
  }
}
