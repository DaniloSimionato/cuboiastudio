import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Status } from "@prisma/client";
import { COMPANY_ADMIN_ROLE_NAMES, DEFAULT_COMPANY_ROLE_PERMISSION_MAP } from "../auth/rbac.defaults";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { SetActiveCompanyDto } from "./dto/set-active-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

const companySelect = {
  id: true,
  name: true,
  legalName: true,
  document: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CompanySelect;

type CompanyRecord = Prisma.CompanyGetPayload<{ select: typeof companySelect }>;

export type CompanyListItem = CompanyRecord & {
  isActiveContext: boolean;
};

export type CompaniesListResponse = {
  items: CompanyListItem[];
};

export type CompanyResponse = CompanyRecord;

export type CurrentCompanyResponse = {
  company: CompanyListItem;
  user: {
    id: string;
    email: string;
    name: string;
  };
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccessibleCompanies(input: { user: AuthenticatedUser }): Promise<CompaniesListResponse> {
    const items = await this.prisma.company.findMany({
      where: {
        deletedAt: null,
        id: {
          in: input.user.memberships,
        },
      },
      select: companySelect,
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    return {
      items: items.map((company) => ({
        ...company,
        isActiveContext: company.id === input.user.activeCompanyId,
      })),
    };
  }

  async getCurrentCompany(input: {
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<CurrentCompanyResponse> {
    this.assertCompanyAccess(input.user, input.tenant.companyId);

    const company = await this.findCompanyOrThrow(input.tenant.companyId);

    return {
      company: {
        ...company,
        isActiveContext: true,
      },
      user: {
        id: input.user.id,
        email: input.user.email,
        name: input.user.name,
      },
    };
  }

  async findOne(input: { id: string; user: AuthenticatedUser }): Promise<CompanyResponse> {
    this.assertCompanyAccess(input.user, input.id);
    return this.findCompanyOrThrow(input.id);
  }

  async create(input: {
    dto: CreateCompanyDto;
    user: AuthenticatedUser;
  }): Promise<CompanyResponse> {
    this.assertCanManageCompanies(input.user);

    const createdCompany = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: input.dto.name.trim(),
          legalName: this.trimNullable(input.dto.legalName),
          document: this.trimNullable(input.dto.document),
          status: input.dto.status ?? Status.ACTIVE,
          notes: this.trimNullable(input.dto.notes),
        },
        select: companySelect,
      });

      await this.ensureDefaultRoles(tx, company.id);
      await this.ensureMembership(tx, input.user.id, company.id);
      await this.assignAdminRole(tx, input.user.id, company.id);

      if (input.dto.createDemoAssistant) {
        await tx.assistant.create({
          data: {
            companyId: company.id,
            name: "Assistente Demo",
            description: "Assistente inicial criado explicitamente durante o onboarding.",
            status: Status.ACTIVE,
          },
        });
      }

      return company;
    });

    return createdCompany;
  }

  async update(input: {
    id: string;
    dto: UpdateCompanyDto;
    user: AuthenticatedUser;
  }): Promise<CompanyResponse> {
    this.assertCanManageCompanies(input.user);
    this.assertCompanyAccess(input.user, input.id);
    await this.findCompanyOrThrow(input.id);

    return this.prisma.company.update({
      where: { id: input.id },
      data: {
        ...(input.dto.name !== undefined ? { name: input.dto.name.trim() } : {}),
        ...(input.dto.legalName !== undefined
          ? { legalName: this.trimNullable(input.dto.legalName) }
          : {}),
        ...(input.dto.document !== undefined
          ? { document: this.trimNullable(input.dto.document) }
          : {}),
        ...(input.dto.notes !== undefined ? { notes: this.trimNullable(input.dto.notes) } : {}),
        ...(input.dto.status !== undefined ? { status: input.dto.status } : {}),
      },
      select: companySelect,
    });
  }

  async setActiveCompany(input: {
    dto: SetActiveCompanyDto;
    user: AuthenticatedUser;
  }): Promise<CurrentCompanyResponse> {
    this.assertCompanyAccess(input.user, input.dto.companyId);

    const company = await this.findCompanyOrThrow(input.dto.companyId);
    if (company.status !== Status.ACTIVE) {
      throw new ForbiddenException("Inactive companies cannot be selected as the active context.");
    }

    await this.prisma.user.update({
      where: { id: input.user.id },
      data: { activeCompanyId: input.dto.companyId },
    });

    return {
      company: {
        ...company,
        isActiveContext: true,
      },
      user: {
        id: input.user.id,
        email: input.user.email,
        name: input.user.name,
      },
    };
  }

  private async ensureDefaultRoles(tx: Prisma.TransactionClient, companyId: string): Promise<void> {
    const permissionKeys = [
      ...new Set(Object.values(DEFAULT_COMPANY_ROLE_PERMISSION_MAP).flat()),
    ];

    const permissions = await Promise.all(
      permissionKeys.map((key) =>
        tx.permission.upsert({
          where: { key },
          update: {
            description: `${key} permission for multi-company onboarding`,
          },
          create: {
            key,
            description: `${key} permission for multi-company onboarding`,
          },
        }),
      ),
    );
    const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission]));

    for (const [roleName, permissionList] of Object.entries(DEFAULT_COMPANY_ROLE_PERMISSION_MAP)) {
      const role = await tx.role.create({
        data: {
          companyId,
          name: roleName,
          description: `${roleName} role for company onboarding`,
        },
      });

      for (const permissionKey of permissionList) {
        const permission = permissionByKey.get(permissionKey);
        if (!permission) {
          continue;
        }

        await tx.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }

  private async ensureMembership(
    tx: Prisma.TransactionClient,
    userId: string,
    companyId: string,
  ): Promise<void> {
    await tx.companyMembership.upsert({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      update: {
        status: Status.ACTIVE,
      },
      create: {
        userId,
        companyId,
        status: Status.ACTIVE,
      },
    });
  }

  private async assignAdminRole(
    tx: Prisma.TransactionClient,
    userId: string,
    companyId: string,
  ): Promise<void> {
    const adminRole = await tx.role.findFirst({
      where: {
        companyId,
        name: "admin",
      },
      select: {
        id: true,
      },
    });

    if (!adminRole) {
      throw new NotFoundException("Default admin role was not created for the company.");
    }

    await tx.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: adminRole.id,
      },
    });
  }

  private async findCompanyOrThrow(companyId: string): Promise<CompanyRecord> {
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
      select: companySelect,
    });

    if (!company) {
      throw new NotFoundException("Company not found.");
    }

    return company;
  }

  private assertCompanyAccess(user: AuthenticatedUser, companyId: string): void {
    if (!user.memberships.includes(companyId)) {
      throw new ForbiddenException("The authenticated user does not belong to this company.");
    }
  }

  private assertCanManageCompanies(user: AuthenticatedUser): void {
    const hasPermission = user.permissions.includes("companies:manage");
    const hasRole = user.roles.some((role) => COMPANY_ADMIN_ROLE_NAMES.has(role));

    if (!hasPermission && !hasRole) {
      throw new ForbiddenException("Only admin users can manage companies.");
    }
  }

  private trimNullable(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  }

  async deleteCompanyAndData(companyId: string): Promise<void> {
    const compId = companyId;

    await this.prisma.$transaction(async (tx) => {
      // 1. App integrations & logs
      await tx.appActionLog.deleteMany({ where: { companyId: compId } });
      await tx.appCredential.deleteMany({ where: { companyId: compId } });
      await tx.appInstallation.deleteMany({ where: { companyId: compId } });

      // 2. Google Calendar
      await tx.googleCalendarBooking.deleteMany({ where: { companyId: compId } });
      await tx.googleCalendarResource.deleteMany({ where: { companyId: compId } });

      // 3. Reservable resources
      await tx.reservableResourceAttribute.deleteMany({ where: { companyId: compId } });
      await tx.reservableResourceCategory.deleteMany({ where: { companyId: compId } });
      await tx.reservableResourceType.deleteMany({ where: { companyId: compId } });

      // 4. ChatwootConfigs & AISettings
      await tx.chatwootInboxConfig.deleteMany({ where: { companyId: compId } });
      await tx.companyAiSettings.deleteMany({ where: { companyId: compId } });

      // 5. Assistant conversations, messages, logs & knowledge
      await tx.assistantConversationMessage.deleteMany({ where: { companyId: compId } });
      await tx.assistantConversation.deleteMany({ where: { companyId: compId } });
      await tx.assistantPreviewLog.deleteMany({ where: { companyId: compId } });
      await tx.assistantRuntimeLog.deleteMany({ where: { companyId: compId } });
      await tx.assistantKnowledgeChunk.deleteMany({ where: { companyId: compId } });
      await tx.assistantKnowledge.deleteMany({ where: { companyId: compId } });

      // 6. Assistants
      await tx.assistant.deleteMany({ where: { companyId: compId } });

      // 7. Roles & permissions
      const roles = await tx.role.findMany({ where: { companyId: compId }, select: { id: true } });
      const roleIds = roles.map((r) => r.id);
      await tx.userRole.deleteMany({ where: { roleId: { in: roleIds } } });
      await tx.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
      await tx.role.deleteMany({ where: { companyId: compId } });

      // 8. Update users activeCompanyId to null/primary if they are pointing to this deleted company
      const usersToUpdate = await tx.user.findMany({
        where: { activeCompanyId: compId },
        select: { id: true, companyId: true }
      });
      for (const u of usersToUpdate) {
        await tx.user.update({
          where: { id: u.id },
          data: { activeCompanyId: u.companyId }
        });
      }

      // 9. Memberships & Company
      await tx.companyMembership.deleteMany({ where: { companyId: compId } });
      await tx.company.delete({ where: { id: compId } });
    });
  }
}
