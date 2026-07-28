import { Controller, Get, UseGuards } from "@nestjs/common";
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
import { type UsageSummary, UsageService } from "./usage.service";

@ApiTags("usage")
@Controller("usage")
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get("summary")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("usage:read")
  @ApiOperation({
    summary:
      "Return official OpenAI usage and invoice-reconcilable costs for the current tenant project",
  })
  @ApiHeader({
    name: "x-dev-user-id",
    required: true,
    description: "DEV ONLY. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-company-id",
    required: true,
    description: "DEV ONLY. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-user-email",
    required: true,
    description: "DEV ONLY. Never use in production.",
  })
  @ApiOkResponse({
    description: "No secrets, project IDs, or raw provider responses are returned.",
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({ description: "Returned when the user lacks usage:read." })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<UsageSummary> {
    return this.usageService.getSummary({ user, tenant });
  }
}
