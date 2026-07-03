import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import type { AuthenticatedUser } from "./auth.types";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  @Get("me")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Return the current development auth context" })
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
  @ApiHeader({
    name: "x-dev-user-name",
    required: false,
    description: "DEV ONLY. Optional display name for local testing.",
  })
  @ApiHeader({
    name: "x-dev-user-roles",
    required: false,
    description: "DEV ONLY. Optional comma-separated roles for local testing.",
  })
  @ApiHeader({
    name: "x-dev-user-permissions",
    required: false,
    description: "DEV ONLY. Optional comma-separated permissions for local testing.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "user_123" },
        companyId: { type: "string", example: "company_123" },
        email: { type: "string", example: "dev@cubo.chat" },
        name: { type: "string", example: "Development User" },
        roles: {
          type: "array",
          items: { type: "string" },
        },
        permissions: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["id", "companyId", "email", "name", "roles", "permissions"],
    },
  })
  @ApiUnauthorizedResponse({
    description:
      "Returned when development auth headers are missing or when mock auth is used in production.",
  })
  getMe(@CurrentUser() user: AuthenticatedUser | undefined): AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException("Authentication is required.");
    }

    return user;
  }
}
