import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthGuard } from "../../auth/auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";
import type { AuthenticatedUser, RequestTenant } from "../../auth/auth.types";
import { RequirePermissions } from "../../auth/permissions.decorator";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Tenant } from "../../auth/tenant.decorator";
import {
  AppsService,
  type FindAllGoogleCalendarResourcesResponse,
  type GoogleCalendarResourceItem,
} from "../apps.service";
import { CalendarToolsService } from "../calendar-tools.service";
import {
  CancelCalendarBookingDto,
  CheckCalendarAvailabilityDto,
  CreateCalendarBookingDto,
  FindCalendarBookingsQueryDto,
  RescheduleCalendarBookingDto,
} from "../dto/calendar-tool.dto";
import { CreateGoogleCalendarResourceDto } from "../dto/create-google-calendar-resource.dto";
import { UpdateGoogleCalendarResourceDto } from "../dto/update-google-calendar-resource.dto";
import {
  GoogleCalendarOAuthService,
  type GoogleCalendarOAuthStatus,
} from "./google-calendar-oauth.service";
import {
  GoogleCalendarClientService,
  type GoogleCalendarListResponseSafe,
} from "./google-calendar-client.service";
import type { Response } from "express";

@ApiTags("google-calendar")
@Controller("apps/google-calendar")
export class GoogleCalendarController {
  constructor(
    private readonly appsService: AppsService,
    private readonly oauthService: GoogleCalendarOAuthService,
    private readonly calendarClientService: GoogleCalendarClientService,
    private readonly calendarToolsService: CalendarToolsService,
  ) {}

  @Get("oauth/start")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Start Google Calendar OAuth flow" })
  async startOAuth(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
    @Res() response: Response,
  ): Promise<void> {
    const authorizationUrl = await this.oauthService.buildAuthorizationUrl({
      companyId: tenant.companyId,
      userId: user.id,
    });

    response.redirect(authorizationUrl);
  }

  @Get("oauth/callback")
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Handle Google Calendar OAuth callback" })
  async oauthCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    if (!code || !state) {
      response.redirect("/apps/google-calendar?connected=0");
      return;
    }

    const result = await this.oauthService.handleCallback({ code, state });
    response.redirect(result.redirectUrl);
  }

  @Post("oauth/disconnect")
  @HttpCode(200)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Disconnect Google Calendar OAuth credential" })
  disconnectOAuth(@Tenant() tenant: RequestTenant): Promise<GoogleCalendarOAuthStatus> {
    return this.oauthService.disconnect({ companyId: tenant.companyId });
  }

  @Get("oauth/status")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "Return safe Google Calendar OAuth status" })
  getOAuthStatus(@Tenant() tenant: RequestTenant): Promise<GoogleCalendarOAuthStatus> {
    return this.oauthService.getStatus(tenant.companyId);
  }

  @Get("calendars")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "List calendars from connected Google account" })
  listCalendars(@Tenant() tenant: RequestTenant): Promise<GoogleCalendarListResponseSafe> {
    return this.calendarClientService.listCalendars(tenant.companyId);
  }

  @Get("resources")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "List Google Calendar resources configured for the tenant" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Calendar resources without credentials." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Missing tools:read permission." })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindAllGoogleCalendarResourcesResponse> {
    return this.appsService.findGoogleCalendarResources({ user, tenant });
  }

  @Post("resources")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Create a manual Google calendar to reservable resource binding" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Created resource without credentials." })
  create(
    @Body() dto: CreateGoogleCalendarResourceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<GoogleCalendarResourceItem> {
    return this.appsService.createGoogleCalendarResource({ dto, user, tenant });
  }

  @Post("resources/from-calendar")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Create or update a resource from a connected Google calendar" })
  createFromCalendar(
    @Body() dto: CreateGoogleCalendarResourceDto,
    @Tenant() tenant: RequestTenant,
  ): Promise<GoogleCalendarResourceItem> {
    return this.calendarClientService.createResourceFromCalendar({
      companyId: tenant.companyId,
      dto,
    });
  }

  @Patch("resources/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Update a Google Calendar resource binding" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Updated resource without credentials." })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateGoogleCalendarResourceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<GoogleCalendarResourceItem> {
    return this.appsService.updateGoogleCalendarResource({ id, dto, user, tenant });
  }

  @Delete("resources/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Inactivate a Google Calendar resource binding" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Inactivated resource without physical deletion." })
  deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<GoogleCalendarResourceItem> {
    return this.appsService.deactivateGoogleCalendarResource({ id, user, tenant });
  }

  @Post("availability/check")
  @HttpCode(200)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Internal tool: check Google Calendar availability" })
  checkAvailability(
    @Body() dto: CheckCalendarAvailabilityDto,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.calendarToolsService.checkAvailability({
      companyId: tenant.companyId,
      dto,
    });
  }

  @Post("bookings")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Internal tool: create a Google Calendar booking" })
  createBooking(
    @Body() dto: CreateCalendarBookingDto,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.calendarToolsService.createBooking({
      companyId: tenant.companyId,
      dto,
    });
  }

  @Get("bookings")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "Internal tool: list future bookings by contact" })
  getBookings(
    @Query() query: FindCalendarBookingsQueryDto,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.calendarToolsService.getBookingsByContact({
      companyId: tenant.companyId,
      query,
    });
  }

  @Post("bookings/:id/reschedule")
  @HttpCode(200)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Internal tool: reschedule a Google Calendar booking" })
  rescheduleBooking(
    @Param("id") id: string,
    @Body() dto: RescheduleCalendarBookingDto,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.calendarToolsService.rescheduleBooking({
      companyId: tenant.companyId,
      bookingId: id,
      dto,
    });
  }

  @Post("bookings/:id/cancel")
  @HttpCode(200)
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Internal tool: cancel a Google Calendar booking" })
  cancelBooking(
    @Param("id") id: string,
    @Body() dto: CancelCalendarBookingDto,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.calendarToolsService.cancelBooking({
      companyId: tenant.companyId,
      bookingId: id,
      dto,
    });
  }
}
