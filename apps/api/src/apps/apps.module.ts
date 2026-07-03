import { Module } from "@nestjs/common";
import { AppInstallationsController } from "./app-installations.controller";
import { AppsController } from "./apps.controller";
import { AppsService } from "./apps.service";
import { CalendarToolsService } from "./calendar-tools.service";
import { GoogleCalendarAvailabilityService } from "./google-calendar/google-calendar-availability.service";
import { GoogleCalendarBookingService } from "./google-calendar/google-calendar-booking.service";
import { GoogleCalendarClientService } from "./google-calendar/google-calendar-client.service";
import { GoogleCalendarController } from "./google-calendar/google-calendar.controller";
import { GoogleCalendarOAuthService } from "./google-calendar/google-calendar-oauth.service";

@Module({
  controllers: [AppsController, AppInstallationsController, GoogleCalendarController],
  providers: [
    AppsService,
    GoogleCalendarOAuthService,
    GoogleCalendarClientService,
    GoogleCalendarAvailabilityService,
    GoogleCalendarBookingService,
    CalendarToolsService,
  ],
  exports: [
    AppsService,
    GoogleCalendarOAuthService,
    GoogleCalendarClientService,
    GoogleCalendarAvailabilityService,
    GoogleCalendarBookingService,
    CalendarToolsService,
  ],
})
export class AppsModule {}
