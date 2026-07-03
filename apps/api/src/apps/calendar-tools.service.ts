import { Injectable } from "@nestjs/common";
import {
  CancelCalendarBookingDto,
  CheckCalendarAvailabilityDto,
  CreateCalendarBookingDto,
  FindCalendarBookingsQueryDto,
  RescheduleCalendarBookingDto,
} from "./dto/calendar-tool.dto";
import {
  CalendarAvailabilityResponse,
  GoogleCalendarAvailabilityService,
} from "./google-calendar/google-calendar-availability.service";
import {
  CalendarBookingListResponse,
  CancelCalendarBookingResponse,
  CreateCalendarBookingResponse,
  GoogleCalendarBookingService,
  RescheduleCalendarBookingResponse,
} from "./google-calendar/google-calendar-booking.service";

@Injectable()
export class CalendarToolsService {
  constructor(
    private readonly availabilityService: GoogleCalendarAvailabilityService,
    private readonly bookingService: GoogleCalendarBookingService,
  ) {}

  checkAvailability(input: {
    companyId: string;
    dto: CheckCalendarAvailabilityDto;
  }): Promise<CalendarAvailabilityResponse> {
    return this.availabilityService.checkAvailability(input);
  }

  createBooking(input: {
    companyId: string;
    dto: CreateCalendarBookingDto;
  }): Promise<CreateCalendarBookingResponse> {
    return this.bookingService.createBooking(input);
  }

  getBookingsByContact(input: {
    companyId: string;
    query: FindCalendarBookingsQueryDto;
  }): Promise<CalendarBookingListResponse> {
    return this.bookingService.findBookingsByContact(input);
  }

  rescheduleBooking(input: {
    companyId: string;
    bookingId: string;
    dto: RescheduleCalendarBookingDto;
  }): Promise<RescheduleCalendarBookingResponse> {
    return this.bookingService.rescheduleBooking(input);
  }

  cancelBooking(input: {
    companyId: string;
    bookingId: string;
    dto: CancelCalendarBookingDto;
  }): Promise<CancelCalendarBookingResponse> {
    return this.bookingService.cancelBooking(input);
  }
}
