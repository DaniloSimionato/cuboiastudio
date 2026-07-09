import {
  ForbiddenException,
  Injectable,
  Logger,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, Status } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { AuthenticatedRequest, AuthenticatedUser } from "./auth.types";
import { DEFAULT_TRUSTED_AUTH_MAX_SKEW_MS, verifyTrustedAuthSignature } from "./trusted-auth";

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

type ResolvedIdentityHeaders = {
  source: "development" | "trusted";
  userId: string;
  email: string;
  name: string;
  companyOverrideId: string;
  roles: string[];
  permissions: string[];
};

type PersistedUserRecord = Awaited<ReturnType<AuthGuard["tryLoadPersistedUser"]>>;

type PersistedUserPayload = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        company: {
          select: {
            id: true;
            status: true;
            deletedAt: true;
          };
        };
      };
    };
    company: {
      select: {
        id: true;
        status: true;
        deletedAt: true;
      };
    };
    activeCompany: {
      select: {
        id: true;
        status: true;
        deletedAt: true;
      };
    };
    userRoles: {
      include: {
        role: true;
      };
    };
  };
}>;

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") {
      return false;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identity = this.resolveIdentityHeaders(request);
    const persistedUser = await this.tryLoadPersistedUser(identity.userId, identity.email);

    if (!persistedUser) {
      if (identity.source !== "development") {
        throw new UnauthorizedException("Authenticated user was not found.");
      }

      if (!identity.companyOverrideId) {
        throw new UnauthorizedException(
          "Development auth fallback requires x-dev-company-id when the user is not persisted.",
        );
      }

      request.user = {
        id: identity.userId,
        companyId: identity.companyOverrideId,
        primaryCompanyId: identity.companyOverrideId,
        activeCompanyId: identity.companyOverrideId,
        email: identity.email,
        name: identity.name,
        memberships: [identity.companyOverrideId],
        roles: identity.roles,
        permissions: identity.permissions,
      };
      request.tenant = { companyId: identity.companyOverrideId };
      request.isAuthenticated = true;
      return true;
    }

    const activeCompanyId = this.resolveActiveCompanyId(persistedUser, identity.companyOverrideId);
    const roles = persistedUser.userRoles
      .filter((userRole) => {
        const roleCompanyId = userRole.role.companyId;
        return roleCompanyId === null || roleCompanyId === activeCompanyId;
      })
      .map((userRole) => userRole.role.name);
    const roleIds = persistedUser.userRoles
      .filter((userRole) => {
        const roleCompanyId = userRole.role.companyId;
        return roleCompanyId === null || roleCompanyId === activeCompanyId;
      })
      .map((userRole) => userRole.roleId);

    const rolePermissions = roleIds.length
      ? await this.prisma.withQueryTimeout(
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
          "authenticated role permissions lookup",
        )
      : [];

    const resolvedUser: AuthenticatedUser = {
      id: persistedUser.id,
      companyId: activeCompanyId ?? "",
      primaryCompanyId: persistedUser.companyId,
      activeCompanyId,
      email: persistedUser.email,
      name: persistedUser.name,
      memberships: Array.from(new Set(persistedUser.memberships.map((item) => item.companyId))),
      roles: Array.from(new Set(roles)),
      permissions: Array.from(new Set(rolePermissions.map((item) => item.permission.key))),
    };

    request.user = resolvedUser;
    request.tenant = { companyId: activeCompanyId ?? "" };
    request.isAuthenticated = true;

    this.logger.debug(
      {
        userId: resolvedUser.id,
        companyId: resolvedUser.companyId,
        rolesCount: resolvedUser.roles.length,
        permissionsCount: resolvedUser.permissions.length,
        source: identity.source,
      },
      "Authenticated request context attached",
    );

    return true;
  }

  private isDevelopmentHeaderModeAllowed(): boolean {
    return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  }

  private resolveIdentityHeaders(request: AuthenticatedRequest): ResolvedIdentityHeaders {
    const allowDevelopmentHeaders = this.isDevelopmentHeaderModeAllowed();
    const devUserId = readHeaderValue(request.headers["x-dev-user-id"]);
    const devEmail = readHeaderValue(request.headers["x-dev-user-email"]).toLowerCase();

    if (allowDevelopmentHeaders && devUserId && devEmail) {
      return {
        source: "development",
        userId: devUserId,
        email: devEmail,
        name: readHeaderValue(request.headers["x-dev-user-name"]) || "Development User",
        companyOverrideId: readHeaderValue(request.headers["x-dev-company-id"]),
        roles: parseListHeader(request.headers["x-dev-user-roles"]),
        permissions: parseListHeader(request.headers["x-dev-user-permissions"]),
      };
    }

    const trustMode = this.configService.get<"off" | "signed-headers">("AUTH_TRUST_MODE") ?? "off";
    const trustedUserId = readHeaderValue(request.headers["x-auth-user-id"]);
    const trustedEmail = readHeaderValue(request.headers["x-auth-user-email"]).toLowerCase();
    const trustedName =
      readHeaderValue(request.headers["x-auth-user-name"]) || "Authenticated User";
    const trustedTimestamp = readHeaderValue(request.headers["x-auth-timestamp"]);
    const trustedSignature = readHeaderValue(request.headers["x-auth-signature"]);

    if (!trustedUserId || !trustedEmail) {
      if (allowDevelopmentHeaders) {
        throw new UnauthorizedException(
          "Missing local auth headers. Set x-dev-user-id and x-dev-user-email, or configure trusted auth headers.",
        );
      }

      throw new UnauthorizedException(
        "Missing trusted auth headers. Configure x-auth-user-id and x-auth-user-email in the upstream authenticated environment.",
      );
    }

    if (trustMode !== "signed-headers") {
      throw new UnauthorizedException(
        "Trusted auth is disabled. Configure AUTH_TRUST_MODE=signed-headers behind a trusted proxy for staging/production.",
      );
    }

    const sharedSecret = this.configService.get<string>("AUTH_PROXY_SHARED_SECRET")?.trim() ?? "";
    if (!sharedSecret) {
      throw new UnauthorizedException(
        "Trusted auth is not configured. Missing AUTH_PROXY_SHARED_SECRET for signed header validation.",
      );
    }

    if (!trustedTimestamp || !trustedSignature) {
      throw new UnauthorizedException(
        "Missing trusted auth proof headers. Expected x-auth-timestamp and x-auth-signature from the trusted proxy.",
      );
    }

    const validation = verifyTrustedAuthSignature({
      userId: trustedUserId,
      email: trustedEmail,
      name: trustedName,
      timestamp: trustedTimestamp,
      providedSignature: trustedSignature,
      secret: sharedSecret,
      maxSkewMs:
        this.configService.get<number>("AUTH_PROXY_SIGNATURE_TTL_MS") ??
        DEFAULT_TRUSTED_AUTH_MAX_SKEW_MS,
    });

    if (!validation.ok) {
      this.logger.warn(
        {
          userId: trustedUserId,
          email: trustedEmail,
          reason: validation.reason,
        },
        "Rejected untrusted auth headers",
      );
      throw new UnauthorizedException(
        "Invalid trusted auth signature. Staging/production requests must come through the signed upstream authentication proxy.",
      );
    }

    return {
      source: "trusted",
      userId: trustedUserId,
      email: trustedEmail,
      name: trustedName,
      companyOverrideId: "",
      roles: [],
      permissions: [],
    };
  }

  private async tryLoadPersistedUser(
    userId: string,
    email: string,
  ): Promise<PersistedUserPayload | null> {
    try {
      const conditions =
        userId && email
          ? [{ id: userId }, { email }]
          : userId
            ? [{ id: userId }]
            : email
              ? [{ email }]
              : [];

      if (conditions.length === 0) {
        return null;
      }

      return await this.prisma.withQueryTimeout(
        this.prisma.user.findFirst({
          where: {
            OR: conditions,
            status: Status.ACTIVE,
            deletedAt: null,
          },
          include: {
            memberships: {
              where: {
                status: Status.ACTIVE,
              },
              include: {
                company: {
                  select: {
                    id: true,
                    status: true,
                    deletedAt: true,
                  },
                },
              },
            },
            company: {
              select: {
                id: true,
                status: true,
                deletedAt: true,
              },
            },
            activeCompany: {
              select: {
                id: true,
                status: true,
                deletedAt: true,
              },
            },
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        }),
        "authenticated user lookup",
      );
    } catch (error: unknown) {
      this.logger.error(
        {
          err: error,
          userId,
          email,
        },
        "Failed to load persisted authenticated user",
      );

      return null;
    }
  }

  private resolveActiveCompanyId(
    persistedUser: NonNullable<PersistedUserRecord>,
    companyOverrideId: string,
  ): string | null {
    const activeMembershipCompanyIds = persistedUser.memberships
      .filter(
        (membership) =>
          membership.company.status === Status.ACTIVE && membership.company.deletedAt === null,
      )
      .map((membership) => membership.companyId);

    const fallbackCandidates = [
      persistedUser.activeCompany?.status === Status.ACTIVE &&
      persistedUser.activeCompany.deletedAt === null
        ? persistedUser.activeCompanyId
        : null,
      persistedUser.company?.status === Status.ACTIVE && persistedUser.company.deletedAt === null
        ? persistedUser.companyId
        : null,
      ...activeMembershipCompanyIds,
    ].filter((value): value is string => Boolean(value));

    const accessibleCompanyIds = new Set<string>([
      ...activeMembershipCompanyIds,
      ...(persistedUser.company?.status === Status.ACTIVE && persistedUser.company.deletedAt === null
        ? [persistedUser.companyId]
        : []),
    ].filter((value): value is string => Boolean(value)));

    const desiredCompanyId = companyOverrideId || fallbackCandidates[0] || "";

    if (!desiredCompanyId) {
      return null;
    }

    if (!accessibleCompanyIds.has(desiredCompanyId)) {
      throw new ForbiddenException(
        "The authenticated user does not belong to the requested company.",
      );
    }

    return desiredCompanyId;
  }
}
