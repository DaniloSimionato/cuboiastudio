import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
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
import { CompaniesService } from "./companies.service";

@ApiTags("companies")
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get("current")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings:read")
  @ApiOperation({ summary: "Return the current company for the authenticated tenant" })
  @ApiHeader({
    name: "x-dev-user-id",
    required: true,
    description: "DEV ONLY. Local authentication user id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-company-id",
    required: true,
    description: "DEV ONLY. Local tenant/company id. Never use in production.",
  })
  @ApiHeader({
    name: "x-dev-user-email",
    required: true,
    description: "DEV ONLY. Local authentication email. Never use in production.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        company: {
          type: "object",
          properties: {
            id: { type: "string", example: "company_demo_cubo_ai_studio" },
            name: { type: "string", example: "Cubo AI Studio Demo" },
            document: { type: "string", nullable: true, example: null },
            status: { type: "string", example: "ACTIVE" },
          },
          required: ["id", "name", "document", "status"],
        },
        user: {
          type: "object",
          properties: {
            id: { type: "string", example: "user_demo_cubo_ai_studio" },
            email: { type: "string", example: "demo@cubo.chat" },
            name: { type: "string", example: "Demo Admin" },
          },
          required: ["id", "email", "name"],
        },
      },
      required: ["company", "user"],
    },
  })
  @ApiUnauthorizedResponse({
    description: "Returned when the request is missing authentication context.",
  })
  @ApiForbiddenResponse({
    description: "Returned when the authenticated user does not have settings:read.",
  })
  @ApiNotFoundResponse({
    description: "Returned when the current company cannot be resolved by tenant.",
  })
  async getCurrentCompany(@CurrentUser() user: AuthenticatedUser, @Tenant() tenant: RequestTenant) {
    return this.companiesService.getCurrentCompany({ user, tenant });
  }
}
