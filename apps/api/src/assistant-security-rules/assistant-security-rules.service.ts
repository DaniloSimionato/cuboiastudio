import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Status } from "@prisma/client";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { type CreateAssistantSecurityRuleDto } from "./dto/create-assistant-security-rule.dto";
import { type UpdateAssistantSecurityRuleDto } from "./dto/update-assistant-security-rule.dto";

export type AssistantSecurityRuleItem = {
  id: string;
  companyId: string;
  assistantId: string;
  name: string;
  ruleType: string;
  instruction: string;
  status: Status;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type FindAllAssistantSecurityRulesResponse = {
  items: AssistantSecurityRuleItem[];
};

export type CreateAssistantSecurityRuleResponse = AssistantSecurityRuleItem;
export type UpdateAssistantSecurityRuleResponse = AssistantSecurityRuleItem;
export type DeleteAssistantSecurityRuleResponse = AssistantSecurityRuleItem;

const assistantSecurityRuleSelect = {
  id: true,
  companyId: true,
  assistantId: true,
  name: true,
  ruleType: true,
  instruction: true,
  status: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssistantSecurityRuleSelect;

type AssistantSecurityRuleRecord = Prisma.AssistantSecurityRuleGetPayload<{
  select: typeof assistantSecurityRuleSelect;
}>;

function toRuleItem(rule: AssistantSecurityRuleRecord): AssistantSecurityRuleItem {
  return {
    id: rule.id,
    companyId: rule.companyId,
    assistantId: rule.assistantId,
    name: rule.name,
    ruleType: rule.ruleType,
    instruction: rule.instruction,
    status: rule.status,
    sortOrder: rule.sortOrder,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

@Injectable()
export class AssistantSecurityRulesService {
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
      select: { id: true },
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }
  }

  async findAll(input: {
    assistantId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindAllAssistantSecurityRulesResponse> {
    await this.resolveAssistantOrThrow(input);

    const items = await this.prisma.assistantSecurityRule.findMany({
      where: {
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantSecurityRuleSelect,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return { items: items.map(toRuleItem) };
  }

  async findActiveForRuntime(input: {
    assistantId: string;
    companyId: string;
  }): Promise<AssistantSecurityRuleItem[]> {
    const items = await this.prisma.assistantSecurityRule.findMany({
      where: {
        assistantId: input.assistantId,
        companyId: input.companyId,
        status: Status.ACTIVE,
      },
      select: assistantSecurityRuleSelect,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return items.map(toRuleItem);
  }

  async create(input: {
    assistantId: string;
    dto: CreateAssistantSecurityRuleDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<CreateAssistantSecurityRuleResponse> {
    await this.resolveAssistantOrThrow(input);

    const sortOrder =
      input.dto.sortOrder ??
      (await this.prisma.assistantSecurityRule.count({
        where: {
          assistantId: input.assistantId,
          companyId: input.tenant.companyId,
        },
      }));

    const rule = await this.prisma.assistantSecurityRule.create({
      data: {
        companyId: input.tenant.companyId,
        assistantId: input.assistantId,
        name: input.dto.name,
        ruleType: input.dto.ruleType,
        instruction: input.dto.instruction,
        sortOrder,
        status: Status.ACTIVE,
      },
      select: assistantSecurityRuleSelect,
    });

    return toRuleItem(rule);
  }

  async update(input: {
    assistantId: string;
    ruleId: string;
    dto: UpdateAssistantSecurityRuleDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<UpdateAssistantSecurityRuleResponse> {
    await this.resolveAssistantOrThrow(input);

    const hasField = (field: keyof UpdateAssistantSecurityRuleDto) =>
      Object.prototype.hasOwnProperty.call(input.dto, field);
    const hasName = hasField("name");
    const hasRuleType = hasField("ruleType");
    const hasInstruction = hasField("instruction");
    const hasStatus = hasField("status");
    const hasSortOrder = hasField("sortOrder");

    if (!hasName && !hasRuleType && !hasInstruction && !hasStatus && !hasSortOrder) {
      throw new BadRequestException("At least one editable field must be provided.");
    }

    const existing = await this.prisma.assistantSecurityRule.findFirst({
      where: {
        id: input.ruleId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("Security rule not found.");
    }

    await this.prisma.assistantSecurityRule.updateMany({
      where: {
        id: input.ruleId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      data: {
        ...(hasName ? { name: input.dto.name } : {}),
        ...(hasRuleType ? { ruleType: input.dto.ruleType } : {}),
        ...(hasInstruction ? { instruction: input.dto.instruction } : {}),
        ...(hasStatus ? { status: input.dto.status } : {}),
        ...(hasSortOrder ? { sortOrder: input.dto.sortOrder } : {}),
      },
    });

    const updated = await this.prisma.assistantSecurityRule.findFirst({
      where: {
        id: input.ruleId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantSecurityRuleSelect,
    });

    if (!updated) {
      throw new NotFoundException("Security rule not found.");
    }

    return toRuleItem(updated);
  }

  async delete(input: {
    assistantId: string;
    ruleId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<DeleteAssistantSecurityRuleResponse> {
    await this.resolveAssistantOrThrow(input);

    const existing = await this.prisma.assistantSecurityRule.findFirst({
      where: {
        id: input.ruleId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantSecurityRuleSelect,
    });

    if (!existing) {
      throw new NotFoundException("Security rule not found.");
    }

    await this.prisma.assistantSecurityRule.deleteMany({
      where: {
        id: input.ruleId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
    });

    return toRuleItem(existing);
  }
}
