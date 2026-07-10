import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
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
import { AppsService } from "./apps.service";
import { CreateWebhookActionDto } from "./dto/create-webhook-action.dto";
import { UpdateWebhookActionDto } from "./dto/update-webhook-action.dto";

@ApiTags("webhook-actions")
@Controller("webhook-actions")
@UseGuards(AuthGuard, PermissionsGuard)
@ApiHeader({ name: "x-dev-user-id", required: true })
@ApiHeader({ name: "x-dev-company-id", required: true })
@ApiHeader({ name: "x-dev-user-email", required: true })
@ApiUnauthorizedResponse({ description: "Authentication is required." })
@ApiForbiddenResponse({ description: "Missing permissions." })
export class WebhookActionsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "List custom webhook actions for the current tenant" })
  @ApiOkResponse({ description: "List of webhook actions." })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.appsService.listWebhookActions(tenant.companyId);
  }

  @Post()
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Create a custom webhook action" })
  @ApiOkResponse({ description: "The created webhook action." })
  create(
    @Body() dto: CreateWebhookActionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.appsService.createWebhookAction(tenant.companyId, dto);
  }

  @Patch(":id")
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Update a custom webhook action" })
  @ApiOkResponse({ description: "The updated webhook action." })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateWebhookActionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.appsService.updateWebhookAction(tenant.companyId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Delete a custom webhook action" })
  @ApiOkResponse({ description: "Success status." })
  delete(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ) {
    return this.appsService.deleteWebhookAction(tenant.companyId, id);
  }
}
