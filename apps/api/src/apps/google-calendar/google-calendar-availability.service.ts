import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  AppActionStatus,
  GoogleCalendarBookingStatus,
  Prisma,
  type GoogleCalendarResource,
  AppInstallationStatus,
  Status,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CheckCalendarAvailabilityDto } from "../dto/calendar-tool.dto";
import { GoogleCalendarOAuthService } from "./google-calendar-oauth.service";
import {
  addMinutes,
  formatDateTimeForLabel,
  minutesToMs,
  overlapRanges,
  zonedDateTimeToDate,
} from "./google-calendar-tools.util";
import {
  filterResourcesByCalendarToolScope,
  matchesCalendarToolScope,
  normalizeCalendarToolScope,
  type CalendarToolScope,
} from "./google-calendar-tool-scope";

const GOOGLE_FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";
const GOOGLE_CALENDAR_SLUG = "google_calendar";

type FetchLike = typeof fetch;

type ResourceRecord = Pick<
  GoogleCalendarResource,
  | "id"
  | "companyId"
  | "installationId"
  | "calendarId"
  | "name"
  | "resourceType"
  | "sportType"
  | "isCovered"
  | "timezone"
  | "slotMinutes"
  | "defaultDurationMinutes"
  | "minAdvanceMinutes"
  | "maxDaysAhead"
  | "active"
> & {
  resourceTypeId?: string | null;
  categoryId?: string | null;
  attributeId?: string | null;
  resourceTypeRef?: { name: string; slug: string } | null;
  categoryRef?: { name: string; slug: string } | null;
  attributeRef?: { name: string; slug: string } | null;
  installation: { appId: string };
};

type BusyBlock = {
  start: Date;
  end: Date;
};

type FreeBusyResponse = {
  calendars?: Record<
    string,
    {
      busy?: Array<{
        start?: string;
        end?: string;
      }>;
    }
  >;
  error?: unknown;
};

export type CalendarAvailabilityOption = {
  resourceId: string;
  resourceName: string;
  calendarId: string;
  startAt: string;
  endAt: string;
  label: string;
};

export type CalendarAvailabilityResponse = {
  available: boolean;
  date: string;
  durationMinutes: number;
  options: CalendarAvailabilityOption[];
};

@Injectable()
export class GoogleCalendarAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauthService: GoogleCalendarOAuthService,
    @Inject("GOOGLE_CALENDAR_FETCH")
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async checkAvailability(input: {
    companyId: string;
    dto: CheckCalendarAvailabilityDto;
  }): Promise<CalendarAvailabilityResponse> {
    const app = await this.prisma.app.findUnique({
      where: { slug: GOOGLE_CALENDAR_SLUG },
      select: { id: true },
    });
    if (!app) {
      throw new BadRequestException("Google Agenda is not available in the app catalog.");
    }
    const installations = await this.prisma.appInstallation.findMany({
      where: { companyId: input.companyId, appId: app.id },
      select: { id: true, status: true },
    });
    if (installations.length === 0) {
      throw new BadRequestException("Install Google Agenda before configuring resources.");
    }
    const activeInstallations = installations.filter(
      (i) => i.status === AppInstallationStatus.ACTIVE,
    );
    if (activeInstallations.length === 0) {
      throw new BadRequestException("Google Agenda installation is not active.");
    }

    const credential = await this.prisma.appCredential.findFirst({
      where: {
        companyId: input.companyId,
        installationId: { in: activeInstallations.map((i) => i.id) },
        provider: "google",
        status: Status.ACTIVE,
      },
      select: { id: true },
    });
    if (!credential) {
      throw new BadRequestException("Google Agenda is not connected.");
    }

    const resources = await this.findCandidateResources({
      companyId: input.companyId,
      dto: input.dto,
    });
    const durationMinutes = input.dto.durationMinutes ?? resources[0]?.defaultDurationMinutes ?? 60;

    if (durationMinutes <= 0) {
      throw new BadRequestException("durationMinutes must be greater than zero.");
    }

    if (resources.length === 0) {
      return {
        available: false,
        date: input.dto.date,
        durationMinutes,
        options: [],
      };
    }

    const windows = this.buildSearchWindows({
      resources,
      date: input.dto.date,
      timeFrom: input.dto.timeFrom,
      timeTo: input.dto.timeTo,
      durationMinutes,
    });

    const searchStart = new Date(Math.min(...windows.map((window) => window.start.getTime())));
    const searchEnd = new Date(Math.max(...windows.map((window) => window.end.getTime())));

    // Group resources by installationId to fetch FreeBusy from correct accounts
    const resourcesByInstId = new Map<string, ResourceRecord[]>();
    for (const r of resources) {
      const list = resourcesByInstId.get(r.installationId) ?? [];
      list.push(r);
      resourcesByInstId.set(r.installationId, list);
    }

    const googleBusyByCalendarId = new Map<string, BusyBlock[]>();
    const freeBusyPromises = Array.from(resourcesByInstId.entries()).map(
      async ([instId, instResources]) => {
        try {
          const credential = await this.oauthService.getAuthorizedCredential(
            input.companyId,
            instId,
          );
          const freeBusy = await this.fetchFreeBusy({
            accessToken: credential.accessToken,
            calendarIds: instResources.map((r) => r.calendarId),
            timeMin: searchStart,
            timeMax: searchEnd,
          });
          for (const [calId, blocks] of freeBusy.entries()) {
            googleBusyByCalendarId.set(calId, blocks);
          }
        } catch (err) {
          console.error(`Failed to fetch FreeBusy for installation ${instId}:`, err);
        }
      },
    );

    const [_, localBusyByResourceId] = await Promise.all([
      Promise.all(freeBusyPromises),
      this.findLocalBusy({
        companyId: input.companyId,
        resourceIds: resources.map((resource) => resource.id),
        searchStart,
        searchEnd,
      }),
    ]);

    const options = this.buildOptions({
      resources,
      windows,
      googleBusyByCalendarId,
      localBusyByResourceId,
      durationMinutes,
      maxOptions: input.dto.maxOptions ?? 5,
    });

    const refResource = resources[0];
    if (refResource) {
      await this.logAction({
        companyId: input.companyId,
        appId: refResource.installation.appId,
        installationId: refResource.installationId,
        action: "availability_check",
        status: AppActionStatus.SUCCESS,
        metadata: {
          resources: resources.length,
          options: options.length,
          date: input.dto.date,
          durationMinutes,
        },
      });
    }

    return {
      available: options.length > 0,
      date: input.dto.date,
      durationMinutes,
      options,
    };
  }

  async assertSlotAvailable(input: {
    companyId: string;
    resourceId: string;
    startAt: Date;
    endAt: Date;
    excludeBookingId?: string | null;
  }): Promise<ResourceRecord> {
    const resource = await this.prisma.googleCalendarResource.findFirst({
      where: {
        id: input.resourceId,
        companyId: input.companyId,
        active: true,
      },
      select: resourceSelect,
    });

    if (!resource) {
      throw new BadRequestException("Calendar resource not found or inactive.");
    }

    const credential = await this.oauthService.getAuthorizedCredential(
      input.companyId,
      resource.installationId,
    );

    const now = new Date();
    if (input.startAt.getTime() < now.getTime() + minutesToMs(resource.minAdvanceMinutes)) {
      throw new BadRequestException("Requested time is too soon for this resource.");
    }

    if (input.startAt.getTime() > now.getTime() + minutesToMs(resource.maxDaysAhead * 24 * 60)) {
      throw new BadRequestException("Requested time is beyond the allowed booking window.");
    }

    const googleBusyByCalendarId = await this.fetchFreeBusy({
      accessToken: credential.accessToken,
      calendarIds: [resource.calendarId],
      timeMin: input.startAt,
      timeMax: input.endAt,
    });
    const localBusyByResourceId = await this.findLocalBusy({
      companyId: input.companyId,
      resourceIds: [resource.id],
      searchStart: input.startAt,
      searchEnd: input.endAt,
      excludeBookingId: input.excludeBookingId,
    });
    const busy = [
      ...(googleBusyByCalendarId.get(resource.calendarId) ?? []),
      ...(localBusyByResourceId.get(resource.id) ?? []),
    ];
    const hasConflict = busy.some((block) =>
      overlapRanges(input.startAt, input.endAt, block.start, block.end),
    );

    if (hasConflict) {
      throw new BadRequestException("Requested time is not available.");
    }

    return resource;
  }

  private async findCandidateResources(input: {
    companyId: string;
    dto: CheckCalendarAvailabilityDto;
  }): Promise<ResourceRecord[]> {
    const resources = await this.prisma.googleCalendarResource.findMany({
      where: {
        companyId: input.companyId,
        active: true,
      },
      select: resourceSelect,
      orderBy: [{ name: "asc" }],
    });

    const scope = normalizeCalendarToolScope({
      category: input.dto.category,
      sportType: input.dto.sportType,
      resourceType: input.dto.resourceType,
      attribute: input.dto.attribute,
      isCovered: input.dto.isCovered,
    });

    return filterResourcesByCalendarToolScope(resources, scope);
  }

  private buildSearchWindows(input: {
    resources: ResourceRecord[];
    date: string;
    timeFrom: string;
    timeTo: string;
    durationMinutes: number;
  }): Array<{ resourceId: string; start: Date; end: Date; timezone: string; dayOffset: number }> {
    const windows: Array<{
      resourceId: string;
      start: Date;
      end: Date;
      timezone: string;
      dayOffset: number;
    }> = [];

    for (const resource of input.resources) {
      const maxDaysToSearch = Math.min(resource.maxDaysAhead, 7);

      for (let dayOffset = 0; dayOffset <= maxDaysToSearch; dayOffset += 1) {
        const date = addDays(input.date, dayOffset);
        const start = zonedDateTimeToDate(date, input.timeFrom, resource.timezone);
        const end = zonedDateTimeToDate(date, input.timeTo, resource.timezone);

        if (end <= start) {
          throw new BadRequestException("timeTo must be after timeFrom.");
        }

        if (end.getTime() - start.getTime() >= minutesToMs(input.durationMinutes)) {
          windows.push({
            resourceId: resource.id,
            start,
            end,
            timezone: resource.timezone,
            dayOffset,
          });
        }
      }
    }

    return windows;
  }

  private async fetchFreeBusy(input: {
    accessToken: string;
    calendarIds: string[];
    timeMin: Date;
    timeMax: Date;
  }): Promise<Map<string, BusyBlock[]>> {
    const response = await this.fetchImpl(GOOGLE_FREEBUSY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: input.timeMin.toISOString(),
        timeMax: input.timeMax.toISOString(),
        items: Array.from(new Set(input.calendarIds)).map((id) => ({ id })),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as FreeBusyResponse;

    if (!response.ok || payload.error) {
      throw new BadRequestException(
        this.oauthService.sanitizeGoogleError(payload.error ?? payload),
      );
    }

    const busyByCalendarId = new Map<string, BusyBlock[]>();

    for (const [calendarId, value] of Object.entries(payload.calendars ?? {})) {
      busyByCalendarId.set(
        calendarId,
        (value.busy ?? [])
          .filter((block) => block.start && block.end)
          .map((block) => ({
            start: new Date(block.start as string),
            end: new Date(block.end as string),
          })),
      );
    }

    return busyByCalendarId;
  }

  private async findLocalBusy(input: {
    companyId: string;
    resourceIds: string[];
    searchStart: Date;
    searchEnd: Date;
    excludeBookingId?: string | null;
  }): Promise<Map<string, BusyBlock[]>> {
    const bookings = await this.prisma.googleCalendarBooking.findMany({
      where: {
        companyId: input.companyId,
        resourceId: { in: input.resourceIds },
        status: GoogleCalendarBookingStatus.CONFIRMED,
        startAt: { lt: input.searchEnd },
        endAt: { gt: input.searchStart },
        ...(input.excludeBookingId ? { id: { not: input.excludeBookingId } } : {}),
      },
      select: {
        resourceId: true,
        startAt: true,
        endAt: true,
      },
    });
    const busyByResourceId = new Map<string, BusyBlock[]>();

    for (const booking of bookings) {
      const current = busyByResourceId.get(booking.resourceId) ?? [];
      current.push({ start: booking.startAt, end: booking.endAt });
      busyByResourceId.set(booking.resourceId, current);
    }

    return busyByResourceId;
  }

  private buildOptions(input: {
    resources: ResourceRecord[];
    windows: Array<{
      resourceId: string;
      start: Date;
      end: Date;
      timezone: string;
      dayOffset: number;
    }>;
    googleBusyByCalendarId: Map<string, BusyBlock[]>;
    localBusyByResourceId: Map<string, BusyBlock[]>;
    durationMinutes: number;
    maxOptions: number;
  }): CalendarAvailabilityOption[] {
    const now = new Date();
    const resourceById = new Map(input.resources.map((resource) => [resource.id, resource]));
    const options: CalendarAvailabilityOption[] = [];

    for (const window of input.windows.sort(
      (a, b) => a.dayOffset - b.dayOffset || a.start.getTime() - b.start.getTime(),
    )) {
      const resource = resourceById.get(window.resourceId);
      if (!resource) continue;

      for (
        let slotStart = new Date(window.start);
        slotStart.getTime() + minutesToMs(input.durationMinutes) <= window.end.getTime();
        slotStart = addMinutes(slotStart, resource.slotMinutes)
      ) {
        const slotEnd = addMinutes(slotStart, input.durationMinutes);
        if (slotStart.getTime() < now.getTime() + minutesToMs(resource.minAdvanceMinutes)) {
          continue;
        }
        if (slotStart.getTime() > now.getTime() + minutesToMs(resource.maxDaysAhead * 24 * 60)) {
          continue;
        }

        const busy = [
          ...(input.googleBusyByCalendarId.get(resource.calendarId) ?? []),
          ...(input.localBusyByResourceId.get(resource.id) ?? []),
        ];
        const hasConflict = busy.some((block) =>
          overlapRanges(slotStart, slotEnd, block.start, block.end),
        );

        if (!hasConflict) {
          const timeLabel = formatDateTimeForLabel(slotStart, resource.timezone);
          options.push({
            resourceId: resource.id,
            resourceName: resource.name,
            calendarId: resource.calendarId,
            startAt: slotStart.toISOString(),
            endAt: slotEnd.toISOString(),
            label: `${resource.name} às ${timeLabel}`,
          });
        }

        if (options.length >= input.maxOptions) {
          return options;
        }
      }
    }

    return options;
  }

  private async logAction(input: {
    companyId: string;
    appId: string;
    installationId?: string | null;
    action: string;
    status: AppActionStatus;
    metadata?: Prisma.InputJsonValue;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.appActionLog.create({
        data: {
          companyId: input.companyId,
          appId: input.appId,
          installationId: input.installationId ?? null,
          action: input.action,
          status: input.status,
          errorCode: input.errorCode ?? null,
          errorMessage: input.errorMessage ?? null,
          metadata: input.metadata ?? Prisma.JsonNull,
        },
      });
    } catch {
      // Availability logs must not break the operational path.
    }
  }
}

const resourceSelect = {
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
  resourceTypeId: true,
  categoryId: true,
  attributeId: true,
  resourceTypeRef: {
    select: {
      name: true,
      slug: true,
    },
  },
  categoryRef: {
    select: {
      name: true,
      slug: true,
    },
  },
  attributeRef: {
    select: {
      name: true,
      slug: true,
    },
  },
  installation: {
    select: {
      appId: true,
    },
  },
} satisfies Prisma.GoogleCalendarResourceSelect;

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function resourceMatchesCalendarScope(
  resource: ResourceRecord,
  scope: CalendarToolScope | null | undefined,
): boolean {
  return matchesCalendarToolScope(resource, scope);
}
