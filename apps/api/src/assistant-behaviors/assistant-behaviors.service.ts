import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { UpsertAssistantBehaviorDto } from "./dto/upsert-assistant-behavior.dto";

@Injectable()
export class AssistantBehaviorsService {
  private readonly logger = new Logger(AssistantBehaviorsService.name);

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

  async upsert(
    companyId: string,
    assistantId: string,
    dto: UpsertAssistantBehaviorDto,
    context: { requestId?: string } = {},
  ) {
    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: assistantId,
        companyId,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistente não encontrado.");
    }

    const fields = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );

    const behavior = await this.prisma.$transaction(async (tx) => {
      if (dto.personality !== undefined || dto.toneOfVoice !== undefined || dto.greetingMessage !== undefined) {
        await tx.assistant.updateMany({
          where: { id: assistantId, companyId },
          data: {
            ...(dto.personality !== undefined ? { personality: dto.personality } : {}),
            ...(dto.toneOfVoice !== undefined ? { toneOfVoice: dto.toneOfVoice } : {}),
            ...(dto.greetingMessage !== undefined ? { initialMessage: dto.greetingMessage } : {}),
          },
        });
      }

      return tx.assistantBehavior.upsert({
        where: { assistantId },
        update: fields as Prisma.AssistantBehaviorUpdateInput,
        create: {
          assistantId,
          ...fields,
        } as Prisma.AssistantBehaviorUncheckedCreateInput,
      });
    });

    this.logger.log(
      JSON.stringify({
        operation: "upsert",
        companyId,
        assistantId,
        changedFields: Object.keys(fields),
        source: "assistant-behavior-api",
        requestId: context.requestId ?? null,
        persistedAt: behavior.updatedAt.toISOString(),
      }),
      "assistant-behavior",
    );

    return behavior;
  }
}
