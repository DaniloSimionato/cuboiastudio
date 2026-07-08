import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Status } from "@prisma/client";
import { hashPassword } from "../auth/password";
import {
  CreateStudioUserDto,
  StudioCompanyRole,
  StudioGlobalRole,
  UpdateStudioUserDto,
  type StudioUserMembershipDto,
} from "./dto/save-studio-user.dto";
import { PrismaService } from "../database/prisma.service";

const GLOBAL_ROLE_NAMES: Record<StudioGlobalRole, string> = {
  STUDIO_ADMIN: "studio_admin",
  STUDIO_OPERATOR: "studio_operator",
  STUDIO_VIEWER: "studio_viewer",
};

const GLOBAL_ROLE_IDS: Record<StudioGlobalRole, string> = {
  STUDIO_ADMIN: "role_studio_admin",
  STUDIO_OPERATOR: "role_studio_operator",
  STUDIO_VIEWER: "role_studio_viewer",
};

const COMPANY_ROLE_NAMES: Record<StudioCompanyRole, string> = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
};

const studioUserInclude = {
  memberships: {
    include: {
      company: { select: { id: true, name: true } },
    },
    orderBy: { company: { name: "asc" } },
  },
  userRoles: {
    include: {
      role: { select: { id: true, name: true, companyId: true } },
    },
  },
} satisfies Prisma.UserInclude;

type StudioUserRecord = Prisma.UserGetPayload<{ include: typeof studioUserInclude }>;

@Injectable()
export class StudioUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: studioUserInclude,
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    return { items: users.map((user) => this.toResponse(user)) };
  }

  async create(dto: CreateStudioUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException("Já existe um usuário com este e-mail.");
    }

    const passwordHash = await hashPassword(dto.temporaryPassword);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          passwordHash,
          status: dto.status,
          companyId: dto.memberships[0]?.companyId ?? null,
          activeCompanyId: null,
        },
      });

      await this.syncGlobalRole(tx, created.id, dto.globalRole);
      await this.syncMemberships(tx, created.id, dto.memberships);
      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: studioUserInclude,
      });
    });

    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateStudioUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Usuário do Studio não encontrado.");
    }

    if (dto.email) {
      const duplicate = await this.prisma.user.findFirst({
        where: { email: dto.email.trim().toLowerCase(), id: { not: id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException("Já existe um usuário com este e-mail.");
      }
    }

    const passwordHash = dto.temporaryPassword
      ? await hashPassword(dto.temporaryPassword)
      : undefined;

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(passwordHash !== undefined ? { passwordHash } : {}),
          ...(dto.memberships !== undefined
            ? {
                companyId: dto.memberships[0]?.companyId ?? null,
                activeCompanyId: null,
              }
            : {}),
        },
      });

      if (dto.globalRole) {
        await this.syncGlobalRole(tx, id, dto.globalRole);
      }
      if (dto.memberships) {
        await this.syncMemberships(tx, id, dto.memberships);
      }

      return tx.user.findUniqueOrThrow({ where: { id }, include: studioUserInclude });
    });

    return this.toResponse(user);
  }

  private async syncGlobalRole(
    tx: Prisma.TransactionClient,
    userId: string,
    globalRole: StudioGlobalRole,
  ): Promise<void> {
    const role = await tx.role.upsert({
      where: { id: GLOBAL_ROLE_IDS[globalRole] },
      update: { name: GLOBAL_ROLE_NAMES[globalRole], companyId: null },
      create: {
        id: GLOBAL_ROLE_IDS[globalRole],
        name: GLOBAL_ROLE_NAMES[globalRole],
        companyId: null,
        description: `${globalRole} global role`,
      },
    });

    const globalRoles = await tx.role.findMany({
      where: { companyId: null, name: { startsWith: "studio_" } },
      select: { id: true },
    });
    await tx.userRole.deleteMany({
      where: { userId, roleId: { in: globalRoles.map((item) => item.id) } },
    });
    await tx.userRole.create({ data: { userId, roleId: role.id } });
  }

  private async syncMemberships(
    tx: Prisma.TransactionClient,
    userId: string,
    memberships: StudioUserMembershipDto[],
  ): Promise<void> {
    const uniqueCompanyIds = [...new Set(memberships.map((item) => item.companyId))];
    if (uniqueCompanyIds.length !== memberships.length) {
      throw new ConflictException("Cada empresa pode aparecer apenas uma vez por usuário.");
    }

    const companies = await tx.company.findMany({
      where: { id: { in: uniqueCompanyIds }, deletedAt: null },
      select: { id: true },
    });
    if (companies.length !== uniqueCompanyIds.length) {
      throw new NotFoundException("Uma ou mais empresas selecionadas não existem.");
    }

    const companyRoles = await tx.role.findMany({
      where: { companyId: { not: null } },
      select: { id: true, companyId: true },
    });
    await tx.userRole.deleteMany({
      where: { userId, roleId: { in: companyRoles.map((role) => role.id) } },
    });
    await tx.companyMembership.deleteMany({
      where: { userId, companyId: { notIn: uniqueCompanyIds } },
    });

    for (const membership of memberships) {
      await tx.companyMembership.upsert({
        where: { userId_companyId: { userId, companyId: membership.companyId } },
        update: { status: Status.ACTIVE },
        create: { userId, companyId: membership.companyId, status: Status.ACTIVE },
      });

      const role = await tx.role.findFirst({
        where: {
          companyId: membership.companyId,
          name: COMPANY_ROLE_NAMES[membership.role],
        },
        select: { id: true },
      });
      if (!role) {
        throw new NotFoundException(
          `Papel ${membership.role} não está configurado para a empresa selecionada.`,
        );
      }
      await tx.userRole.create({ data: { userId, roleId: role.id } });
    }
  }

  private toResponse(user: StudioUserRecord) {
    const globalRoleName = user.userRoles.find((item) => item.role.companyId === null)?.role.name;
    const globalRole =
      (Object.entries(GLOBAL_ROLE_NAMES).find(([, name]) => name === globalRoleName)?.[0] as
        | StudioGlobalRole
        | undefined) ?? StudioGlobalRole.STUDIO_VIEWER;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      globalRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberships: user.memberships.map((membership) => {
        const roleName = user.userRoles.find(
          (item) => item.role.companyId === membership.companyId,
        )?.role.name;
        const role =
          (Object.entries(COMPANY_ROLE_NAMES).find(([, name]) => name === roleName)?.[0] as
            | StudioCompanyRole
            | undefined) ?? StudioCompanyRole.VIEWER;

        return {
          companyId: membership.companyId,
          companyName: membership.company.name,
          status: membership.status,
          role,
        };
      }),
    };
  }
}
