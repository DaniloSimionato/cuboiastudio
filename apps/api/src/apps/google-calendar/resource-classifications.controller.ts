import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard } from "../../auth/auth.guard";
import { RequirePermissions } from "../../auth/permissions.decorator";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Tenant } from "../../auth/tenant.decorator";
import type { RequestTenant } from "../../auth/auth.types";
import { AppsService } from "../apps.service";
import {
  CreateResourceClassificationDto,
  UpdateResourceClassificationDto,
} from "../dto/resource-classification.dto";

@ApiTags("resource-classifications")
@Controller("apps/google-calendar")
export class ResourceClassificationsController {
  constructor(private readonly appsService: AppsService) {}

  // ── Types ──────────────────────────────────────────────────────────

  @Get("resource-types")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "List resource types for the tenant" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  @ApiOkResponse({ description: "List of resource types" })
  async listResourceTypes(@Tenant() tenant: RequestTenant) {
    const items = await this.appsService.findResourceTypes(tenant.companyId);
    return { items };
  }

  @Post("resource-types")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Create a resource type" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  async createResourceType(
    @Tenant() tenant: RequestTenant,
    @Body() dto: CreateResourceClassificationDto,
  ) {
    return this.appsService.createResourceType(tenant.companyId, dto);
  }

  @Patch("resource-types/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Update a resource type" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  async updateResourceType(
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
    @Body() dto: UpdateResourceClassificationDto,
  ) {
    return this.appsService.updateResourceType(tenant.companyId, id, dto);
  }

  @Delete("resource-types/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Delete a resource type" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  async deleteResourceType(
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
  ) {
    return this.appsService.deleteResourceType(tenant.companyId, id);
  }

  // ── Categories ─────────────────────────────────────────────────────

  @Get("resource-categories")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "List resource categories for the tenant" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  @ApiOkResponse({ description: "List of resource categories" })
  async listResourceCategories(@Tenant() tenant: RequestTenant) {
    const items = await this.appsService.findResourceCategories(tenant.companyId);
    return { items };
  }

  @Post("resource-categories")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Create a resource category" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  async createResourceCategory(
    @Tenant() tenant: RequestTenant,
    @Body() dto: CreateResourceClassificationDto,
  ) {
    return this.appsService.createResourceCategory(tenant.companyId, dto);
  }

  @Patch("resource-categories/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Update a resource category" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  async updateResourceCategory(
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
    @Body() dto: UpdateResourceClassificationDto,
  ) {
    return this.appsService.updateResourceCategory(tenant.companyId, id, dto);
  }

  @Delete("resource-categories/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Delete a resource category" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  async deleteResourceCategory(
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
  ) {
    return this.appsService.deleteResourceCategory(tenant.companyId, id);
  }

  // ── Attributes ─────────────────────────────────────────────────────

  @Get("resource-attributes")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:read")
  @ApiOperation({ summary: "List resource attributes for the tenant" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  @ApiOkResponse({ description: "List of resource attributes" })
  async listResourceAttributes(@Tenant() tenant: RequestTenant) {
    const items = await this.appsService.findResourceAttributes(tenant.companyId);
    return { items };
  }

  @Post("resource-attributes")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Create a resource attribute" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  async createResourceAttribute(
    @Tenant() tenant: RequestTenant,
    @Body() dto: CreateResourceClassificationDto,
  ) {
    return this.appsService.createResourceAttribute(tenant.companyId, dto);
  }

  @Patch("resource-attributes/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Update a resource attribute" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  async updateResourceAttribute(
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
    @Body() dto: UpdateResourceClassificationDto,
  ) {
    return this.appsService.updateResourceAttribute(tenant.companyId, id, dto);
  }

  @Delete("resource-attributes/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("tools:write")
  @ApiOperation({ summary: "Delete a resource attribute" })
  @ApiHeader({ name: "x-dev-user-id", required: false })
  @ApiHeader({ name: "x-dev-company-id", required: false })
  @ApiHeader({ name: "x-dev-user-email", required: false })
  async deleteResourceAttribute(
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
  ) {
    return this.appsService.deleteResourceAttribute(tenant.companyId, id);
  }
}
