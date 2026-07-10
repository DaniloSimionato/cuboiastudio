import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AppActionStatus,
  AppInstallationStatus,
  Prisma,
  Status,
  type AppInstallation,
  type GoogleCalendarResource,
} from "@prisma/client";
import type { AuthenticatedUser, RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import type { UpdateAppInstallationStatusDto } from "./dto/update-app-installation-status.dto";
import type { CreateGoogleCalendarResourceDto } from "./dto/create-google-calendar-resource.dto";
import type { UpdateGoogleCalendarResourceDto } from "./dto/update-google-calendar-resource.dto";
import { CreateWebhookActionDto } from "./dto/create-webhook-action.dto";
import { UpdateWebhookActionDto } from "./dto/update-webhook-action.dto";
import { encryptData, decryptData, getOrMigrateWebhookCredentials } from "../common/encryption";

function validateWebhookSlug(name: string) {
  if (!name) {
    throw new BadRequestException("O nome identificador da ação não pode ser vazio.");
  }
  if (name.length > 50) {
    throw new BadRequestException("O nome identificador da ação não pode exceder 50 caracteres.");
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new BadRequestException("O identificador deve conter apenas letras minúsculas, números e sublinhados (_).");
  }
  if (name.startsWith("calendar_")) {
    throw new BadRequestException("O prefixo 'calendar_' é reservado para ferramentas nativas.");
  }
  const reserved = ["webhook", "custom_webhook", "google_calendar", "google_agenda"];
  if (reserved.includes(name)) {
    throw new BadRequestException(`O nome identificador '${name}' é reservado e não pode ser utilizado.`);
  }
}

function validateWebhookUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      throw new BadRequestException("Credenciais embutidas na URL não são permitidas.");
    }
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException("URL fornecida é inválida.");
  }
}

export function redactWebhookConfig(action: any) {
  if (!action) return null;
  const actionObj = { ...action };
  if (actionObj.authConfig && actionObj.authType && actionObj.authType !== "NONE") {
    try {
      const decryptedStr = decryptData(actionObj.authConfig as any);
      const auth = JSON.parse(decryptedStr);
      const redactedAuth: Record<string, string> = {};
      for (const [k, v] of Object.entries(auth)) {
        if (k === "token" || k === "password" || k === "keyValue") {
          redactedAuth[k] = "••••••••";
        } else {
          redactedAuth[k] = String(v);
        }
      }
      actionObj.authConfig = redactedAuth;
    } catch {
      actionObj.authConfig = null;
    }
  } else {
    actionObj.authConfig = null;
  }
  return actionObj;
}

const GOOGLE_CALENDAR_SLUG = "google_calendar";

const appSafeSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  category: true,
  icon: true,
  availability: true,
  sortOrder: true,
  isFeatured: true,
  status: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AppSelect;

const installationSafeSelect = {
  id: true,
  companyId: true,
  appId: true,
  status: true,
  lastErrorCode: true,
  lastErrorMessage: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  app: {
    select: appSafeSelect,
  },
  credentials: {
    select: {
      id: true,
      status: true,
      providerAccountEmail: true,
      expiresAt: true,
    },
  },
} satisfies Prisma.AppInstallationSelect;

const googleCalendarResourceSafeSelect = {
  id: true,
  companyId: true,
  installationId: true,
  calendarId: true,
  name: true,
  resourceType: true,
  sportType: true,
  isCovered: true,
  timezone: true,
  slotMinutes: true,
  defaultDurationMinutes: true,
  minAdvanceMinutes: true,
  maxDaysAhead: true,
  active: true,
  metadata: true,
  resourceTypeId: true,
  categoryId: true,
  attributeId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GoogleCalendarResourceSelect;

type AppSafeRecord = Prisma.AppGetPayload<{ select: typeof appSafeSelect }>;
type InstallationSafeRecord = Prisma.AppInstallationGetPayload<{
  select: typeof installationSafeSelect;
}>;
type GoogleCalendarResourceSafeRecord = Prisma.GoogleCalendarResourceGetPayload<{
  select: typeof googleCalendarResourceSafeSelect;
}>;

export type AppCatalogItem = AppSafeRecord & {
  installation: {
    id: string;
    status: AppInstallationStatus;
    credentialsConfigured: boolean;
  } | null;
};

export type FindAllAppsResponse = {
  items: AppCatalogItem[];
};

export type FindOneAppResponse = AppCatalogItem;

export type AppInstallationItem = Omit<InstallationSafeRecord, "credentials"> & {
  credentialsConfigured: boolean;
  providerAccountEmail: string | null;
  credentialExpiresAt: Date | null;
};

export type FindAllAppInstallationsResponse = {
  items: AppInstallationItem[];
};

export type AppInstallationResponse = AppInstallationItem;

export type GoogleCalendarResourceItem = GoogleCalendarResourceSafeRecord;

export type FindAllGoogleCalendarResourcesResponse = {
  items: GoogleCalendarResourceItem[];
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replaceAll("-", "_");
}

function assertTenant(input: { user: AuthenticatedUser; tenant: RequestTenant }): void {
  const memberships = input.user.memberships || [input.user.companyId];
  if (!memberships.includes(input.tenant.companyId)) {
    throw new ForbiddenException("The authenticated user does not belong to this company.");
  }
}

function hasConfiguredCredential(installation: InstallationSafeRecord): boolean {
  return installation.credentials.some((credential) => credential.status === Status.ACTIVE);
}

function toInstallationResponse(installation: InstallationSafeRecord): AppInstallationItem {
  const activeCredential =
    installation.credentials.find((credential) => credential.status === Status.ACTIVE) ??
    installation.credentials[0] ??
    null;

  return {
    id: installation.id,
    companyId: installation.companyId,
    appId: installation.appId,
    status: installation.status,
    lastErrorCode: installation.lastErrorCode,
    lastErrorMessage: installation.lastErrorMessage,
    metadata: installation.metadata,
    createdAt: installation.createdAt,
    updatedAt: installation.updatedAt,
    app: installation.app,
    credentialsConfigured: hasConfiguredCredential(installation),
    providerAccountEmail: activeCredential?.providerAccountEmail ?? null,
    credentialExpiresAt: activeCredential?.expiresAt ?? null,
  };
}

function toAppCatalogItem(
  app: AppSafeRecord,
  installation?: InstallationSafeRecord | null,
): AppCatalogItem {
  return {
    ...app,
    installation: installation
      ? {
          id: installation.id,
          status: installation.status,
          credentialsConfigured: hasConfiguredCredential(installation),
        }
      : null,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

@Injectable()
export class AppsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllApps(input: {
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindAllAppsResponse> {
    assertTenant(input);

    const [apps, installations] = await Promise.all([
      this.prisma.app.findMany({
        where: { status: Status.ACTIVE },
        select: appSafeSelect,
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      }),
      this.prisma.appInstallation.findMany({
        where: { companyId: input.tenant.companyId },
        select: installationSafeSelect,
      }),
    ]);

    const installationByAppId = new Map(
      installations.map((installation) => [installation.appId, installation]),
    );

    return {
      items: apps.map((app) => toAppCatalogItem(app, installationByAppId.get(app.id))),
    };
  }

  async findOneApp(input: {
    slug: string;
    installationId?: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindOneAppResponse> {
    assertTenant(input);

    const app = await this.findActiveAppBySlug(input.slug);
    let installation = null;
    if (input.installationId) {
      installation = await this.prisma.appInstallation.findFirst({
        where: {
          id: input.installationId,
          companyId: input.tenant.companyId,
          appId: app.id,
        },
        select: installationSafeSelect,
      });

      if (!installation) {
        throw new BadRequestException(
          "Google Agenda installation not found or cross-tenant access denied.",
        );
      }
    } else {
      installation = await this.prisma.appInstallation.findFirst({
        where: {
          companyId: input.tenant.companyId,
          appId: app.id,
        },
        select: installationSafeSelect,
      });
    }

    return toAppCatalogItem(app, installation);
  }

  async findAllInstallations(input: {
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindAllAppInstallationsResponse> {
    assertTenant(input);

    const items = await this.prisma.appInstallation.findMany({
      where: { companyId: input.tenant.companyId },
      select: installationSafeSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return {
      items: items.map(toInstallationResponse),
    };
  }

  async installApp(input: {
    slug: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AppInstallationResponse> {
    assertTenant(input);

    const app = await this.findActiveAppBySlug(input.slug);

    if (app.availability === "COMING_SOON") {
      throw new BadRequestException("Este aplicativo ainda não está disponível para instalação.");
    }

    const installation = await this.prisma.appInstallation.create({
      data: {
        companyId: input.tenant.companyId,
        appId: app.id,
        status: AppInstallationStatus.ACTIVE,
        installedByUserId: input.user.id,
      },
      select: installationSafeSelect,
    });

    await this.logAction({
      companyId: input.tenant.companyId,
      appId: app.id,
      installationId: installation.id,
      action: "app.install",
      status: AppActionStatus.SUCCESS,
      targetType: "app_installation",
      targetId: installation.id,
      metadata: { slug: app.slug },
    });

    return toInstallationResponse(installation);
  }

  async updateInstallationStatus(input: {
    id: string;
    dto: UpdateAppInstallationStatusDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AppInstallationResponse> {
    assertTenant(input);

    const existing = await this.prisma.appInstallation.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: {
        id: true,
        appId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("App installation not found.");
    }

    if (typeof this.prisma.appInstallation.updateMany === "function") {
      await this.prisma.appInstallation.updateMany({
        where: { id: existing.id, companyId: input.tenant.companyId },
        data: {
          status: input.dto.status,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
    } else {
      await this.prisma.appInstallation.update({
        where: { id: existing.id },
        data: {
          status: input.dto.status,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
    }

    const installation = await this.prisma.appInstallation.findFirst({
      where: { id: existing.id, companyId: input.tenant.companyId },
      select: installationSafeSelect,
    });

    if (!installation) {
      throw new NotFoundException("App installation not found.");
    }

    await this.logAction({
      companyId: input.tenant.companyId,
      appId: existing.appId,
      installationId: installation.id,
      action: "app.status.update",
      status: AppActionStatus.SUCCESS,
      targetType: "app_installation",
      targetId: installation.id,
      metadata: { status: input.dto.status },
    });

    return toInstallationResponse(installation);
  }

  async findGoogleCalendarResources(input: {
    installationId?: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindAllGoogleCalendarResourcesResponse> {
    assertTenant(input);

    const installation = await this.findGoogleCalendarInstallation(
      input.tenant.companyId,
      false,
      input.installationId,
    );

    if (!installation) {
      return { items: [] };
    }

    const resources = await this.prisma.googleCalendarResource.findMany({
      where: {
        companyId: input.tenant.companyId,
        installationId: installation.id,
      },
      select: googleCalendarResourceSafeSelect,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    return { items: resources };
  }

  async createGoogleCalendarResource(input: {
    dto: CreateGoogleCalendarResourceDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<GoogleCalendarResourceItem> {
    assertTenant(input);

    const installation = await this.findGoogleCalendarInstallation(
      input.tenant.companyId,
      true,
      input.dto.installationId,
    );

    try {
      const resource = await this.prisma.googleCalendarResource.create({
        data: {
          companyId: input.tenant.companyId,
          installationId: installation.id,
          calendarId: input.dto.calendarId,
          name: input.dto.name,
          resourceType: input.dto.resourceType ?? "",
          sportType: input.dto.sportType ?? "",
          isCovered: input.dto.isCovered ?? false,
          timezone: input.dto.timezone ?? "America/Campo_Grande",
          slotMinutes: input.dto.slotMinutes ?? 30,
          defaultDurationMinutes: input.dto.defaultDurationMinutes ?? 60,
          minAdvanceMinutes: input.dto.minAdvanceMinutes ?? 60,
          maxDaysAhead: input.dto.maxDaysAhead ?? 14,
          active: input.dto.active ?? true,
          resourceTypeId: input.dto.resourceTypeId ?? null,
          categoryId: input.dto.categoryId ?? null,
          attributeId: input.dto.attributeId ?? null,
        },
        select: googleCalendarResourceSafeSelect,
      });

      await this.logGoogleCalendarResourceAction({
        companyId: input.tenant.companyId,
        installation,
        action: "google_calendar.resource.create",
        resource,
      });

      return resource;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("This Google calendar is already linked to this tenant.");
      }

      throw error;
    }
  }

  async updateGoogleCalendarResource(input: {
    id: string;
    dto: UpdateGoogleCalendarResourceDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<GoogleCalendarResourceItem> {
    assertTenant(input);

    const existing = await this.prisma.googleCalendarResource.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: {
        id: true,
        installationId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Google Calendar resource not found.");
    }

    const installation = await this.findGoogleCalendarInstallation(input.tenant.companyId, true);

    if (existing.installationId !== installation.id) {
      throw new NotFoundException("Google Calendar resource not found.");
    }

    try {
      if (typeof this.prisma.googleCalendarResource.updateMany === "function") {
        await this.prisma.googleCalendarResource.updateMany({
          where: { id: existing.id, companyId: input.tenant.companyId },
          data: this.toGoogleCalendarResourceUpdateData(input.dto),
        });
      } else {
        await this.prisma.googleCalendarResource.update({
          where: { id: existing.id },
          data: this.toGoogleCalendarResourceUpdateData(input.dto),
        });
      }

      const resource = await this.prisma.googleCalendarResource.findFirst({
        where: { id: existing.id, companyId: input.tenant.companyId },
        select: googleCalendarResourceSafeSelect,
      });

      if (!resource) {
        throw new NotFoundException("Google Calendar resource not found.");
      }

      await this.logGoogleCalendarResourceAction({
        companyId: input.tenant.companyId,
        installation,
        action: "google_calendar.resource.update",
        resource,
      });

      return resource;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("This Google calendar is already linked to this tenant.");
      }

      throw error;
    }
  }

  async deactivateGoogleCalendarResource(input: {
    id: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<GoogleCalendarResourceItem> {
    assertTenant(input);

    const installation = await this.findGoogleCalendarInstallation(input.tenant.companyId, true);
    const existing = await this.prisma.googleCalendarResource.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
        installationId: installation.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Google Calendar resource not found.");
    }

    if (typeof this.prisma.googleCalendarResource.updateMany === "function") {
      await this.prisma.googleCalendarResource.updateMany({
        where: {
          id: existing.id,
          companyId: input.tenant.companyId,
          installationId: installation.id,
        },
        data: { active: false },
      });
    } else {
      await this.prisma.googleCalendarResource.update({
        where: { id: existing.id },
        data: { active: false },
      });
    }

    const resource = await this.prisma.googleCalendarResource.findFirst({
      where: {
        id: existing.id,
        companyId: input.tenant.companyId,
        installationId: installation.id,
      },
      select: googleCalendarResourceSafeSelect,
    });

    if (!resource) {
      throw new NotFoundException("Google Calendar resource not found.");
    }

    await this.logGoogleCalendarResourceAction({
      companyId: input.tenant.companyId,
      installation,
      action: "google_calendar.resource.deactivate",
      resource,
    });

    return resource;
  }

  private async findActiveAppBySlug(slug: string): Promise<AppSafeRecord> {
    const app = await this.prisma.app.findUnique({
      where: { slug: normalizeSlug(slug) },
      select: appSafeSelect,
    });

    if (!app || app.status !== Status.ACTIVE) {
      throw new NotFoundException("App not found.");
    }

    return app;
  }

  private async findGoogleCalendarInstallation(
    companyId: string,
    requireActive: true,
    installationId?: string,
  ): Promise<Pick<AppInstallation, "id" | "appId" | "status">>;
  private async findGoogleCalendarInstallation(
    companyId: string,
    requireActive: false,
    installationId?: string,
  ): Promise<Pick<AppInstallation, "id" | "appId" | "status"> | null>;
  private async findGoogleCalendarInstallation(
    companyId: string,
    requireActive: boolean,
    installationId?: string,
  ): Promise<Pick<AppInstallation, "id" | "appId" | "status"> | null> {
    const app = await this.prisma.app.findUnique({
      where: { slug: GOOGLE_CALENDAR_SLUG },
      select: { id: true },
    });

    if (!app) {
      if (requireActive) {
        throw new BadRequestException("Google Agenda is not available in the app catalog.");
      }

      return null;
    }

    if (installationId) {
      const installation = await this.prisma.appInstallation.findFirst({
        where: {
          id: installationId,
          companyId,
          appId: app.id,
        },
        select: {
          id: true,
          appId: true,
          status: true,
        },
      });

      if (!installation && requireActive) {
        throw new BadRequestException(
          "Google Agenda installation not found or cross-tenant access denied.",
        );
      }
      if (installation && requireActive && installation.status !== AppInstallationStatus.ACTIVE) {
        throw new BadRequestException("Google Agenda installation is not active.");
      }
      return installation;
    }

    const installation = await this.prisma.appInstallation.findFirst({
      where: {
        companyId,
        appId: app.id,
      },
      select: {
        id: true,
        appId: true,
        status: true,
      },
    });

    if (!installation) {
      if (requireActive) {
        throw new BadRequestException("Install Google Agenda before configuring resources.");
      }

      return null;
    }

    if (requireActive && installation.status !== AppInstallationStatus.ACTIVE) {
      throw new BadRequestException("Google Agenda installation is not active.");
    }

    return installation;
  }

  private toGoogleCalendarResourceUpdateData(
    dto: UpdateGoogleCalendarResourceDto,
  ): Prisma.GoogleCalendarResourceUncheckedUpdateInput {
    const hasField = (field: keyof UpdateGoogleCalendarResourceDto) =>
      Object.prototype.hasOwnProperty.call(dto, field);

    const data: Prisma.GoogleCalendarResourceUncheckedUpdateInput = {};

    if (hasField("name")) data.name = dto.name;
    if (hasField("calendarId")) data.calendarId = dto.calendarId;
    if (hasField("resourceType")) data.resourceType = dto.resourceType;
    if (hasField("sportType")) data.sportType = dto.sportType;
    if (hasField("isCovered")) data.isCovered = dto.isCovered;
    if (hasField("timezone")) data.timezone = dto.timezone;
    if (hasField("slotMinutes")) data.slotMinutes = dto.slotMinutes;
    if (hasField("defaultDurationMinutes")) {
      data.defaultDurationMinutes = dto.defaultDurationMinutes;
    }
    if (hasField("minAdvanceMinutes")) data.minAdvanceMinutes = dto.minAdvanceMinutes;
    if (hasField("maxDaysAhead")) data.maxDaysAhead = dto.maxDaysAhead;
    if (hasField("active")) data.active = dto.active;
    if (hasField("resourceTypeId")) data.resourceTypeId = dto.resourceTypeId ?? null;
    if (hasField("categoryId")) data.categoryId = dto.categoryId ?? null;
    if (hasField("attributeId")) data.attributeId = dto.attributeId ?? null;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("At least one editable field must be provided.");
    }

    return data;
  }

  private async logGoogleCalendarResourceAction(input: {
    companyId: string;
    installation: Pick<AppInstallation, "id" | "appId">;
    action: string;
    resource: Pick<
      GoogleCalendarResource,
      "id" | "name" | "resourceType" | "sportType" | "isCovered" | "active"
    >;
  }): Promise<void> {
    await this.logAction({
      companyId: input.companyId,
      appId: input.installation.appId,
      installationId: input.installation.id,
      action: input.action,
      status: AppActionStatus.SUCCESS,
      targetType: "google_calendar_resource",
      targetId: input.resource.id,
      metadata: {
        name: input.resource.name,
        resourceType: input.resource.resourceType,
        sportType: input.resource.sportType,
        isCovered: input.resource.isCovered,
        active: input.resource.active,
      },
    });
  }

  private async logAction(input: {
    companyId: string;
    appId: string;
    installationId?: string | null;
    action: string;
    status: AppActionStatus;
    targetType?: string | null;
    targetId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    try {
      await this.prisma.appActionLog.create({
        data: {
          companyId: input.companyId,
          appId: input.appId,
          installationId: input.installationId ?? null,
          action: input.action,
          status: input.status,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          errorCode: input.errorCode ?? null,
          errorMessage: input.errorMessage ?? null,
          metadata: input.metadata ?? Prisma.JsonNull,
        },
      });
    } catch {
      // App action logs must never break the operational request path.
    }
  }

  // ── Resource Classification CRUD ──────────────────────────────────

  async findResourceTypes(companyId: string) {
    return this.prisma.reservableResourceType.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async createResourceType(
    companyId: string,
    data: { name: string; slug: string; description?: string },
  ) {
    try {
      return await this.prisma.reservableResourceType.create({
        data: {
          companyId,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Já existe um tipo com este slug nesta empresa.");
      }
      throw error;
    }
  }

  async updateResourceType(
    companyId: string,
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      active?: boolean;
      sortOrder?: number;
    },
  ) {
    const existing = await this.prisma.reservableResourceType.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException("Tipo de recurso não encontrado.");
    try {
      if (typeof this.prisma.reservableResourceType.updateMany === "function") {
        await this.prisma.reservableResourceType.updateMany({ where: { id, companyId }, data });
      } else {
        await this.prisma.reservableResourceType.update({ where: { id }, data });
      }
      const updated = await this.prisma.reservableResourceType.findFirst({
        where: { id, companyId },
      });
      if (!updated) {
        throw new NotFoundException("Tipo de recurso não encontrado.");
      }
      return updated;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Já existe um tipo com este slug nesta empresa.");
      }
      throw error;
    }
  }

  async deleteResourceType(companyId: string, id: string) {
    const existing = await this.prisma.reservableResourceType.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException("Tipo de recurso não encontrado.");
    const inUse = await this.prisma.googleCalendarResource.count({ where: { resourceTypeId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        "Este tipo está em uso por recursos existentes. Remova a associação primeiro.",
      );
    }
    if (typeof this.prisma.reservableResourceType.deleteMany === "function") {
      await this.prisma.reservableResourceType.deleteMany({ where: { id, companyId } });
    } else {
      await this.prisma.reservableResourceType.delete({ where: { id } });
    }
    return { deleted: true };
  }

  async findResourceCategories(companyId: string) {
    return this.prisma.reservableResourceCategory.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async createResourceCategory(
    companyId: string,
    data: { name: string; slug: string; description?: string },
  ) {
    try {
      return await this.prisma.reservableResourceCategory.create({
        data: {
          companyId,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Já existe uma categoria com este slug nesta empresa.");
      }
      throw error;
    }
  }

  async updateResourceCategory(
    companyId: string,
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      active?: boolean;
      sortOrder?: number;
    },
  ) {
    const existing = await this.prisma.reservableResourceCategory.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException("Categoria de recurso não encontrada.");
    try {
      if (typeof this.prisma.reservableResourceCategory.updateMany === "function") {
        await this.prisma.reservableResourceCategory.updateMany({ where: { id, companyId }, data });
      } else {
        await this.prisma.reservableResourceCategory.update({ where: { id }, data });
      }
      const updated = await this.prisma.reservableResourceCategory.findFirst({
        where: { id, companyId },
      });
      if (!updated) {
        throw new NotFoundException("Categoria de recurso não encontrada.");
      }
      return updated;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Já existe uma categoria com este slug nesta empresa.");
      }
      throw error;
    }
  }

  async deleteResourceCategory(companyId: string, id: string) {
    const existing = await this.prisma.reservableResourceCategory.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException("Categoria de recurso não encontrada.");
    const inUse = await this.prisma.googleCalendarResource.count({ where: { categoryId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        "Esta categoria está em uso por recursos existentes. Remova a associação primeiro.",
      );
    }
    if (typeof this.prisma.reservableResourceCategory.deleteMany === "function") {
      await this.prisma.reservableResourceCategory.deleteMany({ where: { id, companyId } });
    } else {
      await this.prisma.reservableResourceCategory.delete({ where: { id } });
    }
    return { deleted: true };
  }

  async findResourceAttributes(companyId: string) {
    return this.prisma.reservableResourceAttribute.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async createResourceAttribute(
    companyId: string,
    data: { name: string; slug: string; description?: string },
  ) {
    try {
      return await this.prisma.reservableResourceAttribute.create({
        data: {
          companyId,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Já existe uma característica com este slug nesta empresa.");
      }
      throw error;
    }
  }

  async updateResourceAttribute(
    companyId: string,
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      active?: boolean;
      sortOrder?: number;
    },
  ) {
    const existing = await this.prisma.reservableResourceAttribute.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException("Característica de recurso não encontrada.");
    try {
      if (typeof this.prisma.reservableResourceAttribute.updateMany === "function") {
        await this.prisma.reservableResourceAttribute.updateMany({
          where: { id, companyId },
          data,
        });
      } else {
        await this.prisma.reservableResourceAttribute.update({ where: { id }, data });
      }
      const updated = await this.prisma.reservableResourceAttribute.findFirst({
        where: { id, companyId },
      });
      if (!updated) {
        throw new NotFoundException("Característica de recurso não encontrada.");
      }
      return updated;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Já existe uma característica com este slug nesta empresa.");
      }
      throw error;
    }
  }

  async deleteResourceAttribute(companyId: string, id: string) {
    const existing = await this.prisma.reservableResourceAttribute.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException("Característica de recurso não encontrada.");
    const inUse = await this.prisma.googleCalendarResource.count({ where: { attributeId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        "Esta característica está em uso por recursos existentes. Remova a associação primeiro.",
      );
    }
    if (typeof this.prisma.reservableResourceAttribute.deleteMany === "function") {
      await this.prisma.reservableResourceAttribute.deleteMany({ where: { id, companyId } });
    } else {
      await this.prisma.reservableResourceAttribute.delete({ where: { id } });
    }
    return { deleted: true };
  }

  async deleteInstallation(input: {
    id: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AppInstallationResponse> {
    assertTenant(input);

    const installation = await this.prisma.appInstallation.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      include: {
        credentials: true,
        googleCalendarResources: true,
        googleCalendarBookings: true,
      },
    });

    if (!installation) {
      throw new BadRequestException("Instalação não encontrada.");
    }

    if ((installation.googleCalendarBookings ?? []).length > 0) {
      throw new BadRequestException(
        "Não é possível excluir a conexão pois existem reservas associadas a ela. Por favor, inative-a.",
      );
    }
    if ((installation.googleCalendarResources ?? []).length > 0) {
      throw new BadRequestException(
        "Não é possível excluir a conexão pois existem recursos vinculados. Por favor, inative-a.",
      );
    }
    if ((installation.credentials ?? []).length > 0) {
      throw new BadRequestException(
        "Não é possível excluir a conexão pois existe uma conta Google conectada. Por favor, desconecte a conta ou inative a extensão primeiro.",
      );
    }

    await this.prisma.appActionLog.deleteMany({
      where: { installationId: installation.id },
    });

    const deleted = await this.prisma.appInstallation.findFirst({
      where: { id: installation.id, companyId: input.tenant.companyId },
      select: installationSafeSelect,
    });

    if (typeof this.prisma.appInstallation.deleteMany === "function") {
      await this.prisma.appInstallation.deleteMany({
        where: { id: installation.id, companyId: input.tenant.companyId },
      });
    } else {
      await this.prisma.appInstallation.delete({
        where: { id: installation.id },
      });
    }

    if (!deleted) {
      throw new BadRequestException("Instalação não encontrada.");
    }

    return toInstallationResponse(deleted);
  }

  async listWebhookActions(companyId: string) {
    const items = await this.prisma.customWebhookAction.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    const migratedItems = [];
    for (const item of items) {
      if (item.authConfig && item.authType !== "NONE" && !(item.authConfig as any).encryptedData) {
        const newConfig = await getOrMigrateWebhookCredentials(this.prisma, item.id, item.authType || "NONE", item.authConfig);
        if (newConfig) {
          item.authConfig = newConfig;
        }
      }
      migratedItems.push(redactWebhookConfig(item));
    }
    return migratedItems;
  }

  async createWebhookAction(companyId: string, dto: CreateWebhookActionDto) {
    const installation = await this.prisma.appInstallation.findFirst({
      where: { id: dto.installationId, companyId },
      include: { app: true },
    });
    if (!installation) {
      throw new NotFoundException("Instalação do app não encontrada.");
    }
    if (installation.app.slug !== "custom_webhook") {
      throw new BadRequestException("A instalação informada não é do app Webhook Personalizado.");
    }

    validateWebhookSlug(dto.name);
    validateWebhookUrl(dto.url);

    const methodUpper = dto.method.toUpperCase();
    const resolvedPermissionType = ["GET", "HEAD"].includes(methodUpper) ? "READ" : "WRITE";
    const resolvedRequiresConfirmation = resolvedPermissionType === "WRITE" ? (dto.requiresConfirmation ?? false) : false;

    let authConfig: any = null;
    if (dto.authType && dto.authType !== "NONE" && dto.authConfig) {
      const authStr = typeof dto.authConfig === "string" ? dto.authConfig : JSON.stringify(dto.authConfig);
      authConfig = encryptData(authStr);
    }

    try {
      const created = await this.prisma.customWebhookAction.create({
        data: {
          companyId,
          installationId: dto.installationId,
          name: dto.name,
          displayName: dto.displayName,
          descriptionAdmin: dto.descriptionAdmin ?? null,
          descriptionAi: dto.descriptionAi ?? null,
          method: methodUpper,
          url: dto.url,
          headers: (dto.headers ?? null) as any,
          authType: dto.authType ?? "NONE",
          authConfig: (authConfig ?? null) as any,
          bodyTemplate: dto.bodyTemplate ?? null,
          parameterSchema: (dto.parameterSchema ?? null) as any,
          timeoutMs: dto.timeoutMs ?? 5000,
          permissionType: resolvedPermissionType,
          requiresConfirmation: resolvedRequiresConfirmation,
          responseFilter: (dto.responseFilter ?? null) as any,
          active: dto.active ?? true,
        },
      });
      return redactWebhookConfig(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Já existe uma ação com este nome identificador nesta empresa.");
      }
      throw err;
    }
  }

  async updateWebhookAction(companyId: string, id: string, dto: UpdateWebhookActionDto) {
    const existing = await this.prisma.customWebhookAction.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundException("Ação de webhook não encontrada.");
    }

    if (dto.url) {
      validateWebhookUrl(dto.url);
    }

    const methodUpper = (dto.method || existing.method).toUpperCase();
    const resolvedPermissionType = ["GET", "HEAD"].includes(methodUpper) ? "READ" : "WRITE";
    const resolvedRequiresConfirmation = resolvedPermissionType === "WRITE" 
      ? (dto.requiresConfirmation !== undefined ? dto.requiresConfirmation : existing.requiresConfirmation)
      : false;

    let authConfig = existing.authConfig;
    const authType = dto.authType || existing.authType;
    if (authType && authType !== "NONE") {
      if (dto.authConfig) {
        const authStr = typeof dto.authConfig === "string" ? dto.authConfig : JSON.stringify(dto.authConfig);
        const containsMask = authStr.includes("••••••••") || authStr.includes("••••");
        if (!containsMask) {
          authConfig = encryptData(authStr);
        }
      }
    } else {
      authConfig = null;
    }

    const updated = await this.prisma.customWebhookAction.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        descriptionAdmin: dto.descriptionAdmin,
        descriptionAi: dto.descriptionAi,
        method: methodUpper,
        url: dto.url,
        headers: (dto.headers ?? null) as any,
        authType: dto.authType ?? null,
        authConfig: (authConfig ?? null) as any,
        bodyTemplate: dto.bodyTemplate,
        parameterSchema: (dto.parameterSchema ?? null) as any,
        timeoutMs: dto.timeoutMs,
        permissionType: resolvedPermissionType,
        requiresConfirmation: resolvedRequiresConfirmation,
        responseFilter: (dto.responseFilter ?? null) as any,
        active: dto.active,
      },
    });
    return redactWebhookConfig(updated);
  }

  async deleteWebhookAction(companyId: string, id: string) {
    const existing = await this.prisma.customWebhookAction.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundException("Ação de webhook não encontrada.");
    }

    const toolName = `webhook_${existing.name}`;
    await this.prisma.assistantToolConfig.deleteMany({
      where: {
        toolName,
        assistant: {
          companyId,
        },
      },
    });

    await this.prisma.customWebhookAction.delete({
      where: { id },
    });

    return { success: true };
  }
}
