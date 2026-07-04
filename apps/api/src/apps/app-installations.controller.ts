import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser, RequestTenant } from "../auth/auth.types";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../auth/tenant.decorator";
import {
  AppsService,
  type AppInstallationResponse,
  type FindAllAppInstallationsResponse,
} from "./apps.service";
import { UpdateAppInstallationStatusDto } from "./dto/update-app-installation-status.dto";

@ApiTags("app-installations")
@Controller("app-installations")
@UseGuards(AuthGuard, PermissionsGuard)
@ApiUnauthorizedResponse({ description: "Authentication is required." })
@ApiForbiddenResponse({ description: "Missing tools:read or tools:write permissions." })
export class AppInstallationsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "List apps installed in the current tenant" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Safe installation list without tokens or secrets." })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindAllAppInstallationsResponse> {
    return this.appsService.findAllInstallations({ user, tenant });
  }

  @Patch(":id/status")
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Activate or inactivate an app installation" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Safe installation status without tokens or secrets." })
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateAppInstallationStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<AppInstallationResponse> {
    return this.appsService.updateInstallationStatus({ id, dto, user, tenant });
  }

  @Delete(":id")
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Delete an app installation" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Returns the deleted app installation details." })
  delete(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<AppInstallationResponse> {
    return this.appsService.deleteInstallation({ id, user, tenant });
  }
}
