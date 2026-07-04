import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  AppActionStatus,
  GoogleCalendarBookingStatus,
  Prisma,
  type GoogleCalendarBooking,
  type GoogleCalendarResource,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  CancelCalendarBookingDto,
  CreateCalendarBookingDto,
  FindCalendarBookingsQueryDto,
  RescheduleCalendarBookingDto,
} from "../dto/calendar-tool.dto";
import { GoogleCalendarOAuthService } from "./google-calendar-oauth.service";
import { GoogleCalendarAvailabilityService } from "./google-calendar-availability.service";
import {
  buildIdempotencyKey,
  maskPhone,
  normalizePhone,
  parseDateTime,
  sanitizeText,
} from "./google-calendar-tools.util";

type FetchLike = typeof fetch;

type BookingRecord = Pick<
  GoogleCalendarBooking,
  | "id"
  | "companyId"
  | "installationId"
  | "resourceId"
  | "googleEventId"
  | "conversationId"
  | "contactName"
  | "contactPhone"
  | "contactPhoneNormalized"
  | "startAt"
  | "endAt"
  | "status"
  | "createdBy"
  | "source"
  | "idempotencyKey"
  | "cancelledAt"
  | "rescheduledFromBookingId"
  | "metadata"
  | "createdAt"
  | "updatedAt"
> & {
  resource: Pick<GoogleCalendarResource, "id" | "name" | "calendarId" | "timezone">;
};

export type CreateCalendarBookingResponse = {
  success: true;
  bookingId: string;
  googleEventId: string;
  resourceName: string;
  startAt: string;
  endAt: string;
  status: GoogleCalendarBookingStatus;
};

export type CalendarBookingListResponse = {
  bookings: Array<{
    bookingId: string;
    resourceName: string;
    startAt: string;
    endAt: string;
    status: GoogleCalendarBookingStatus;
  }>;
};

export type RescheduleCalendarBookingResponse = {
  success: true;
  bookingId: string;
  oldStartAt: string;
  newStartAt: string;
  resourceName: string;
  status: GoogleCalendarBookingStatus;
};

export type CancelCalendarBookingResponse = {
  success: true;
  bookingId: string;
  status: GoogleCalendarBookingStatus;
  cancelledAt: string;
};

@Injectable()
export class GoogleCalendarBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauthService: GoogleCalendarOAuthService,
    private readonly availabilityService: GoogleCalendarAvailabilityService,
    @Inject("GOOGLE_CALENDAR_FETCH")
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async createBooking(input: {
    companyId: string;
    dto: CreateCalendarBookingDto;
  }): Promise<CreateCalendarBookingResponse> {
    const startAt = parseDateTime(input.dto.startAt);
    const endAt = parseDateTime(input.dto.endAt);

    if (endAt <= startAt) {
      throw new BadRequestException("endAt must be after startAt.");
    }

    const idempotencyKey = buildIdempotencyKey({
      conversationId: input.dto.conversationId,
      resourceId: input.dto.resourceId,
      startAt,
      endAt,
    });
    const existing = await this.findByIdempotencyKey(input.companyId, idempotencyKey);

    if (existing) {
      return toCreateResponse(existing);
    }

    const resourceRecord = await this.prisma.googleCalendarResource.findFirst({
      where: { id: input.dto.resourceId, companyId: input.companyId },
      select: { installationId: true },
    });
    if (!resourceRecord) {
      throw new BadRequestException("Calendar resource not found or inactive.");
    }
    const credential = await this.oauthService.getAuthorizedCredential(input.companyId, resourceRecord.installationId);
    await this.logAction({
      companyId: input.companyId,
      appId: credential.appId,
      installationId: credential.installationId,
      action: "booking_create_attempt",
      status: AppActionStatus.SUCCESS,
      metadata: { resourceId: input.dto.resourceId },
    });

    try {
      const resource = await this.availabilityService.assertSlotAvailable({
        companyId: input.companyId,
        resourceId: input.dto.resourceId,
        startAt,
        endAt,
      });
      const event = await this.createGoogleEvent({
        accessToken: credential.accessToken,
        calendarId: resource.calendarId,
        timezone: resource.timezone,
        summary: `Reserva - ${sanitizeText(input.dto.contactName, 80) ?? "Cliente"}`,
        description: buildBookingDescription({
          contactPhone: input.dto.contactPhone,
          conversationId: input.dto.conversationId,
          notes: input.dto.notes,
        }),
        startAt,
        endAt,
      });
      const booking = await this.prisma.googleCalendarBooking.create({
        data: {
          companyId: input.companyId,
          installationId: credential.installationId,
          resourceId: resource.id,
          googleEventId: event.id,
          conversationId: input.dto.conversationId ?? null,
          contactName: sanitizeText(input.dto.contactName, 120),
          contactPhone: input.dto.contactPhone,
          contactPhoneNormalized: normalizePhone(input.dto.contactPhone),
          startAt,
          endAt,
          status: GoogleCalendarBookingStatus.CONFIRMED,
          createdBy: "ai_tool",
          source: "ai_tool",
          idempotencyKey,
          metadata: {
            notes: sanitizeText(input.dto.notes),
          },
        },
        select: bookingSelect,
      });

      await this.logAction({
        companyId: input.companyId,
        appId: credential.appId,
        installationId: credential.installationId,
        action: "booking_created",
        status: AppActionStatus.SUCCESS,
        targetType: "google_calendar_booking",
        targetId: booking.id,
        metadata: {
          resourceId: resource.id,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        },
      });

      return toCreateResponse(booking);
    } catch (error) {
      await this.logAction({
        companyId: input.companyId,
        appId: credential.appId,
        installationId: credential.installationId,
        action: "booking_create_failed",
        status: AppActionStatus.ERROR,
        errorCode: "booking_create_failed",
        errorMessage: this.safeError(error),
        metadata: { resourceId: input.dto.resourceId },
      });
      throw error;
    }
  }

  async findBookingsByContact(input: {
    companyId: string;
    query: FindCalendarBookingsQueryDto;
  }): Promise<CalendarBookingListResponse> {
    const phone = normalizePhone(input.query.contactPhone);

    if (!phone) {
      return { bookings: [] };
    }

    const statuses = input.query.status?.length
      ? input.query.status
      : [GoogleCalendarBookingStatus.CONFIRMED];
    const bookings = await this.prisma.googleCalendarBooking.findMany({
      where: {
        companyId: input.companyId,
        contactPhoneNormalized: phone,
        status: { in: statuses },
        ...(input.query.fromNow === false ? {} : { startAt: { gte: new Date() } }),
      },
      select: bookingSelect,
      orderBy: [{ startAt: "asc" }],
      take: 20,
    });

    return {
      bookings: bookings.map((booking) => ({
        bookingId: booking.id,
        resourceName: booking.resource.name,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        status: booking.status,
      })),
    };
  }

  async rescheduleBooking(input: {
    companyId: string;
    bookingId: string;
    dto: RescheduleCalendarBookingDto;
  }): Promise<RescheduleCalendarBookingResponse> {
    const booking = await this.findTenantBookingOrThrow(input.companyId, input.bookingId);
    const newResourceId = input.dto.newResourceId ?? booking.resourceId;
    const newStartAt = parseDateTime(input.dto.newStartAt);
    const newEndAt = parseDateTime(input.dto.newEndAt);

    if (newEndAt <= newStartAt) {
      throw new BadRequestException("newEndAt must be after newStartAt.");
    }

    const newResourceRecord = await this.prisma.googleCalendarResource.findFirst({
      where: { id: newResourceId, companyId: input.companyId },
      select: { installationId: true },
    });
    if (!newResourceRecord) {
      throw new BadRequestException("Calendar resource not found or inactive.");
    }
    const credential = await this.oauthService.getAuthorizedCredential(input.companyId, newResourceRecord.installationId);
    await this.logAction({
      companyId: input.companyId,
      appId: credential.appId,
      installationId: credential.installationId,
      action: "booking_reschedule_attempt",
      status: AppActionStatus.SUCCESS,
      targetType: "google_calendar_booking",
      targetId: booking.id,
    });

    try {
      const newResource = await this.availabilityService.assertSlotAvailable({
        companyId: input.companyId,
        resourceId: newResourceId,
        startAt: newStartAt,
        endAt: newEndAt,
        excludeBookingId: booking.id,
      });
      const oldStartAt = booking.startAt;

      if (newResource.calendarId === booking.resource.calendarId) {
        await this.patchGoogleEvent({
          accessToken: credential.accessToken,
          calendarId: newResource.calendarId,
          eventId: booking.googleEventId,
          timezone: newResource.timezone,
          startAt: newStartAt,
          endAt: newEndAt,
          description: buildBookingDescription({
            contactPhone: booking.contactPhone,
            conversationId: booking.conversationId ?? undefined,
            notes: input.dto.reason,
          }),
        });
      } else {
        const newEvent = await this.createGoogleEvent({
          accessToken: credential.accessToken,
          calendarId: newResource.calendarId,
          timezone: newResource.timezone,
          summary: `Reserva - ${sanitizeText(booking.contactName, 80) ?? "Cliente"}`,
          description: buildBookingDescription({
            contactPhone: booking.contactPhone,
            conversationId: booking.conversationId ?? undefined,
            notes: input.dto.reason,
          }),
          startAt: newStartAt,
          endAt: newEndAt,
        });
        await this.deleteGoogleEvent({
          accessToken: credential.accessToken,
          calendarId: booking.resource.calendarId,
          eventId: booking.googleEventId,
        });
        booking.googleEventId = newEvent.id;
      }

      const updated = await this.prisma.googleCalendarBooking.update({
        where: { id: booking.id },
        data: {
          resourceId: newResource.id,
          googleEventId: booking.googleEventId,
          startAt: newStartAt,
          endAt: newEndAt,
          status: GoogleCalendarBookingStatus.CONFIRMED,
          metadata: {
            rescheduledAt: new Date().toISOString(),
            oldStartAt: oldStartAt.toISOString(),
            reason: sanitizeText(input.dto.reason),
          },
        },
        select: bookingSelect,
      });

      await this.logAction({
        companyId: input.companyId,
        appId: credential.appId,
        installationId: credential.installationId,
        action: "booking_rescheduled",
        status: AppActionStatus.SUCCESS,
        targetType: "google_calendar_booking",
        targetId: booking.id,
        metadata: {
          oldStartAt: oldStartAt.toISOString(),
          newStartAt: newStartAt.toISOString(),
          resourceId: newResource.id,
        },
      });

      return {
        success: true,
        bookingId: updated.id,
        oldStartAt: oldStartAt.toISOString(),
        newStartAt: updated.startAt.toISOString(),
        resourceName: updated.resource.name,
        status: updated.status,
      };
    } catch (error) {
      await this.logAction({
        companyId: input.companyId,
        appId: credential.appId,
        installationId: credential.installationId,
        action: "booking_reschedule_failed",
        status: AppActionStatus.ERROR,
        targetType: "google_calendar_booking",
        targetId: booking.id,
        errorCode: "booking_reschedule_failed",
        errorMessage: this.safeError(error),
      });
      throw error;
    }
  }

  async cancelBooking(input: {
    companyId: string;
    bookingId: string;
    dto: CancelCalendarBookingDto;
  }): Promise<CancelCalendarBookingResponse> {
    const booking = await this.findTenantBookingOrThrow(input.companyId, input.bookingId);
    const credential = await this.oauthService.getAuthorizedCredential(input.companyId, booking.installationId);

    await this.logAction({
      companyId: input.companyId,
      appId: credential.appId,
      installationId: credential.installationId,
      action: "booking_cancel_attempt",
      status: AppActionStatus.SUCCESS,
      targetType: "google_calendar_booking",
      targetId: booking.id,
    });

    try {
      await this.deleteGoogleEvent({
        accessToken: credential.accessToken,
        calendarId: booking.resource.calendarId,
        eventId: booking.googleEventId,
      });

      const cancelledAt = new Date();
      const updated = await this.prisma.googleCalendarBooking.update({
        where: { id: booking.id },
        data: {
          status: GoogleCalendarBookingStatus.CANCELLED,
          cancelledAt,
          metadata: {
            cancelledAt: cancelledAt.toISOString(),
            reason: sanitizeText(input.dto.reason),
          },
        },
        select: bookingSelect,
      });

      await this.logAction({
        companyId: input.companyId,
        appId: credential.appId,
        installationId: credential.installationId,
        action: "booking_cancelled",
        status: AppActionStatus.SUCCESS,
        targetType: "google_calendar_booking",
        targetId: booking.id,
        metadata: {
          cancelledAt: cancelledAt.toISOString(),
        },
      });

      return {
        success: true,
        bookingId: updated.id,
        status: GoogleCalendarBookingStatus.CANCELLED,
        cancelledAt: cancelledAt.toISOString(),
      };
    } catch (error) {
      await this.logAction({
        companyId: input.companyId,
        appId: credential.appId,
        installationId: credential.installationId,
        action: "booking_cancel_failed",
        status: AppActionStatus.ERROR,
        targetType: "google_calendar_booking",
        targetId: booking.id,
        errorCode: "booking_cancel_failed",
        errorMessage: this.safeError(error),
      });
      throw error;
    }
  }

  private async findByIdempotencyKey(
    companyId: string,
    idempotencyKey: string,
  ): Promise<BookingRecord | null> {
    return this.prisma.googleCalendarBooking.findFirst({
      where: {
        companyId,
        idempotencyKey,
        status: GoogleCalendarBookingStatus.CONFIRMED,
      },
      select: bookingSelect,
    });
  }

  private async findTenantBookingOrThrow(
    companyId: string,
    bookingId: string,
  ): Promise<BookingRecord> {
    const booking = await this.prisma.googleCalendarBooking.findFirst({
      where: {
        id: bookingId,
        companyId,
      },
      select: bookingSelect,
    });

    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }

    if (booking.status !== GoogleCalendarBookingStatus.CONFIRMED) {
      throw new BadRequestException("Only confirmed bookings can be changed.");
    }

    return booking;
  }

  private async createGoogleEvent(input: {
    accessToken: string;
    calendarId: string;
    timezone: string;
    summary: string;
    description: string;
    startAt: Date;
    endAt: Date;
  }): Promise<{ id: string }> {
    const response = await this.fetchImpl(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          start: {
            dateTime: input.startAt.toISOString(),
            timeZone: input.timezone,
          },
          end: {
            dateTime: input.endAt.toISOString(),
            timeZone: input.timezone,
          },
        }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as { id?: string; error?: unknown };

    if (!response.ok || !payload.id || payload.error) {
      throw new BadRequestException(this.oauthService.sanitizeGoogleError(payload.error ?? payload));
    }

    return { id: payload.id };
  }

  private async patchGoogleEvent(input: {
    accessToken: string;
    calendarId: string;
    eventId: string;
    timezone: string;
    startAt: Date;
    endAt: Date;
    description: string;
  }): Promise<void> {
    const response = await this.fetchImpl(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: input.description,
          start: {
            dateTime: input.startAt.toISOString(),
            timeZone: input.timezone,
          },
          end: {
            dateTime: input.endAt.toISOString(),
            timeZone: input.timezone,
          },
        }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as { error?: unknown };

    if (!response.ok || payload.error) {
      throw new BadRequestException(this.oauthService.sanitizeGoogleError(payload.error ?? payload));
    }
  }

  private async deleteGoogleEvent(input: {
    accessToken: string;
    calendarId: string;
    eventId: string;
  }): Promise<void> {
    const response = await this.fetchImpl(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
        },
      },
    );

    if (!response.ok && response.status !== 404 && response.status !== 410) {
      const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
      throw new BadRequestException(this.oauthService.sanitizeGoogleError(payload.error ?? payload));
    }
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
      // Booking logs must not break the operational path.
    }
  }

  private safeError(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, 300);
    }

    return "Google Calendar booking operation failed.";
  }
}

const bookingSelect = {
  id: true,
  companyId: true,
  installationId: true,
  resourceId: true,
  googleEventId: true,
  conversationId: true,
  contactName: true,
  contactPhone: true,
  contactPhoneNormalized: true,
  startAt: true,
  endAt: true,
  status: true,
  createdBy: true,
  source: true,
  idempotencyKey: true,
  cancelledAt: true,
  rescheduledFromBookingId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  resource: {
    select: {
      id: true,
      name: true,
      calendarId: true,
      timezone: true,
    },
  },
} satisfies Prisma.GoogleCalendarBookingSelect;

function toCreateResponse(booking: BookingRecord): CreateCalendarBookingResponse {
  return {
    success: true,
    bookingId: booking.id,
    googleEventId: booking.googleEventId,
    resourceName: booking.resource.name,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    status: booking.status,
  };
}

function buildBookingDescription(input: {
  contactPhone?: string | null;
  conversationId?: string | null;
  notes?: string | null;
}): string {
  return [
    "Origem: CuboIAStudio",
    `Telefone: ${maskPhone(input.contactPhone) ?? "não informado"}`,
    `Conversa: ${sanitizeText(input.conversationId, 120) ?? "não informada"}`,
    sanitizeText(input.notes) ? `Observações: ${sanitizeText(input.notes)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
