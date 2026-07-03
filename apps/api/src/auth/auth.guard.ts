import {
  Injectable,
  Logger,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Status } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { AuthenticatedRequest, AuthenticatedUser } from "./auth.types";

function readHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

function parseListHeader(value: string | string[] | undefined): string[] {
  const rawValue = readHeaderValue(value);

  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") {
      return false;
    }

    if (process.env.NODE_ENV === "production") {
      throw new UnauthorizedException("Authentication is not configured for production yet.");
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = readHeaderValue(request.headers["x-dev-user-id"]);
    const companyId = readHeaderValue(request.headers["x-dev-company-id"]);
    const email = readHeaderValue(request.headers["x-dev-user-email"]).toLowerCase();
    const name = readHeaderValue(request.headers["x-dev-user-name"]) || "Development User";
    const roles = parseListHeader(request.headers["x-dev-user-roles"]);
    const permissions = parseListHeader(request.headers["x-dev-user-permissions"]);

    if (!userId || !companyId || !email) {
      throw new UnauthorizedException(
        "Missing development auth headers. Set x-dev-user-id, x-dev-company-id and x-dev-user-email.",
      );
    }

    const user = await this.tryLoadPersistedUser(userId, companyId);
    const resolvedUser: AuthenticatedUser =
      user ??
      ({
        id: userId,
        companyId,
        email,
        name,
        roles,
        permissions,
      } satisfies AuthenticatedUser);

    request.user = resolvedUser;
    request.tenant = { companyId };
    request.isAuthenticated = true;

    this.logger.debug(
      {
        userId,
        companyId,
        rolesCount: resolvedUser.roles.length,
        permissionsCount: resolvedUser.permissions.length,
        source: user ? "database" : "development-header",
      },
      "Development auth context attached to request",
    );

    return true;
  }

  private async tryLoadPersistedUser(
    userId: string,
    companyId: string,
  ): Promise<AuthenticatedUser | null> {
    try {
      const user = await this.prisma.withQueryTimeout(
        this.prisma.user.findFirst({
          where: {
            id: userId,
            companyId,
            status: Status.ACTIVE,
            deletedAt: null,
          },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        }),
        "development auth user lookup",
      );

      if (!user) {
        return null;
      }

      const roleIds = user.userRoles.map((userRole) => userRole.roleId);
      const rolePermissions = await this.prisma.withQueryTimeout(
        this.prisma.rolePermission.findMany({
          where: {
            roleId: {
              in: roleIds,
            },
          },
          select: {
            permission: {
              select: {
                key: true,
              },
            },
          },
        }),
        "development auth role permissions lookup",
      );

      const roles = new Set(user.userRoles.map((userRole) => userRole.role.name));
      const permissions = new Set(rolePermissions.map((item) => item.permission.key));

      return {
        id: user.id,
        companyId: user.companyId,
        email: user.email,
        name: user.name,
        roles: Array.from(roles),
        permissions: Array.from(permissions),
      };
    } catch (error: unknown) {
      this.logger.debug(
        {
          err: error,
          userId,
          companyId,
        },
        "Falling back to development auth headers because persisted RBAC lookup failed",
      );

      return null;
    }
  }
}
