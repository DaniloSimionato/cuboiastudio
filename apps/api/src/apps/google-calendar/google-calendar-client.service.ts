import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { AppActionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { GoogleCalendarOAuthService } from "./google-calendar-oauth.service";
import type { CreateGoogleCalendarResourceDto } from "../dto/create-google-calendar-resource.dto";
import type { GoogleCalendarResourceItem } from "../apps.service";

const GOOGLE_CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList";

type FetchLike = typeof fetch;

type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  description?: string;
  timeZone?: string;
  accessRole?: string;
  primary?: boolean;
  selected?: boolean;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  description: string | null;
  timeZone: string | null;
  accessRole: string | null;
  primary: boolean;
  selected: boolean;
  mapped: boolean;
};

export type GoogleCalendarListResponseSafe = {
  items: GoogleCalendarListItem[];
};

@Injectable()
export class GoogleCalendarClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauthService: GoogleCalendarOAuthService,
    @Inject("GOOGLE_CALENDAR_FETCH")
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async listCalendars(companyId: string, installationId?: string): Promise<GoogleCalendarListResponseSafe> {
    const credential = await this.oauthService.getAuthorizedCredential(companyId, installationId);
    const calendars = await this.fetchCalendarList(credential.accessToken);
    const resources = await this.prisma.googleCalendarResource.findMany({
      where: {
        companyId,
        installationId: credential.installationId,
      },
      select: {
        calendarId: true,
      },
    });
    const mappedCalendarIds = new Set(resources.map((resource) => resource.calendarId));

    await this.logAction({
      companyId,
      appId: credential.appId,
      installationId: credential.installationId,
      action: "google_calendar.calendars.list",
      status: AppActionStatus.SUCCESS,
      targetType: "app_credential",
      targetId: credential.credentialId,
      metadata: { count: calendars.length },
    });

    return {
      items: calendars.map((calendar) => ({
        ...calendar,
        mapped: mappedCalendarIds.has(calendar.id),
      })),
    };
  }

  async createResourceFromCalendar(input: {
    companyId: string;
    dto: CreateGoogleCalendarResourceDto;
  }): Promise<GoogleCalendarResourceItem> {
    const credential = await this.oauthService.getAuthorizedCredential(input.companyId);
    const calendars = await this.fetchCalendarList(credential.accessToken);
    const calendar = calendars.find((item) => item.id === input.dto.calendarId);

    if (!calendar) {
      throw new BadRequestException("Google calendar was not found in the connected account.");
    }

    if (!this.hasWritableAccess(calendar.accessRole)) {
      throw new BadRequestException("Connected Google account does not have write access to this calendar.");
    }

    const existing = await this.prisma.googleCalendarResource.findFirst({
      where: {
        companyId: input.companyId,
        installationId: credential.installationId,
        calendarId: input.dto.calendarId,
      },
      select: {
        id: true,
      },
    });

    const data = {
      name: input.dto.name,
      resourceType: input.dto.resourceType ?? "",
      sportType: input.dto.sportType ?? "",
      isCovered: input.dto.isCovered ?? false,
      timezone: input.dto.timezone ?? calendar.timeZone ?? "America/Campo_Grande",
      slotMinutes: input.dto.slotMinutes ?? 30,
      defaultDurationMinutes: input.dto.defaultDurationMinutes ?? 60,
      minAdvanceMinutes: input.dto.minAdvanceMinutes ?? 60,
      maxDaysAhead: input.dto.maxDaysAhead ?? 14,
      active: input.dto.active ?? true,
      resourceTypeId: input.dto.resourceTypeId ?? null,
      categoryId: input.dto.categoryId ?? null,
      attributeId: input.dto.attributeId ?? null,
      metadata: {
        source: "google_calendar_list",
        accessRole: calendar.accessRole,
        primary: calendar.primary,
      },
    };

    const resource = existing
      ? await this.prisma.googleCalendarResource.update({
          where: { id: existing.id },
          data,
          select: googleCalendarResourceSafeSelect,
        })
      : await this.prisma.googleCalendarResource.create({
          data: {
            companyId: input.companyId,
            installationId: credential.installationId,
            calendarId: input.dto.calendarId,
            ...data,
          },
          select: googleCalendarResourceSafeSelect,
        });

    await this.logAction({
      companyId: input.companyId,
      appId: credential.appId,
      installationId: credential.installationId,
      action: existing
        ? "google_calendar.resource.from_calendar.update"
        : "google_calendar.resource.from_calendar.create",
      status: AppActionStatus.SUCCESS,
      targetType: "google_calendar_resource",
      targetId: resource.id,
      metadata: {
        name: resource.name,
        resourceType: resource.resourceType,
        sportType: resource.sportType,
        isCovered: resource.isCovered,
        active: resource.active,
      },
    });

    return resource;
  }

  private async fetchCalendarList(accessToken: string): Promise<GoogleCalendarListItem[]> {
    const response = await this.fetchImpl(`${GOOGLE_CALENDAR_LIST_URL}?minAccessRole=reader`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json().catch(() => ({}))) as GoogleCalendarListResponse;

    if (!response.ok || payload.error) {
      throw new BadRequestException(this.oauthService.sanitizeGoogleError(payload.error ?? payload));
    }

    return (payload.items ?? [])
      .filter((item): item is Required<Pick<GoogleCalendarListEntry, "id">> & GoogleCalendarListEntry =>
        typeof item.id === "string" && item.id.trim().length > 0,
      )
      .map((item) => ({
        id: item.id,
        summary: item.summary?.trim() || item.id,
        description: item.description?.trim() || null,
        timeZone: item.timeZone?.trim() || null,
        accessRole: item.accessRole?.trim() || null,
        primary: Boolean(item.primary),
        selected: Boolean(item.selected),
        mapped: false,
      }));
  }

  private hasWritableAccess(accessRole: string | null): boolean {
    return accessRole === "writer" || accessRole === "owner";
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
      // Calendar listing logs must not break the user-facing flow.
    }
  }
}

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
