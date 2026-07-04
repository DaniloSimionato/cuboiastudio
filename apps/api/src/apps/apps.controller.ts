import { Controller, Get, Param, Post, UseGuards, Query } from "@nestjs/common";
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
  type FindAllAppsResponse,
  type FindOneAppResponse,
} from "./apps.service";

@ApiTags("apps")
@Controller("apps")
@UseGuards(AuthGuard, PermissionsGuard)
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "List available apps in the app catalog" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Safe app catalog without credentials." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Missing tools:read permission." })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindAllAppsResponse> {
    return this.appsService.findAllApps({ user, tenant });
  }

  @Get(":slug")
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "Get app catalog details by slug" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Safe app detail without credentials." })
  findOne(
    @Param("slug") slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
    @Query("installationId") installationId?: string,
  ): Promise<FindOneAppResponse> {
    return this.appsService.findOneApp({ slug, installationId, user, tenant });
  }

  @Post(":slug/install")
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Install an app for the current tenant" })
  @ApiHeader({ name: "x-dev-user-id", required: true })
  @ApiHeader({ name: "x-dev-company-id", required: true })
  @ApiHeader({ name: "x-dev-user-email", required: true })
  @ApiOkResponse({ description: "Safe installation status without credentials." })
  install(
    @Param("slug") slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<AppInstallationResponse> {
    return this.appsService.installApp({ slug, user, tenant });
  }
}
