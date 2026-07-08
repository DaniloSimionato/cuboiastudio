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
  @ApiOperation({ summary: "Return the current authenticated user context" })
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
  @ApiHeader({
    name: "x-auth-user-id",
    required: false,
    description: "STAGING/PRODUCTION. User id injected by the trusted auth proxy.",
  })
  @ApiHeader({
    name: "x-auth-user-email",
    required: false,
    description: "STAGING/PRODUCTION. User email injected by the trusted auth proxy.",
  })
  @ApiHeader({
    name: "x-auth-user-name",
    required: false,
    description: "STAGING/PRODUCTION. User display name injected by the trusted auth proxy.",
  })
  @ApiHeader({
    name: "x-auth-timestamp",
    required: false,
    description: "STAGING/PRODUCTION. ISO timestamp signed by the trusted auth proxy.",
  })
  @ApiHeader({
    name: "x-auth-signature",
    required: false,
    description:
      "STAGING/PRODUCTION. HMAC signature proving the auth headers were injected by the trusted proxy.",
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
      "Returned when development auth headers are missing locally, or when trusted proxy headers are missing/invalid in staging and production.",
  })
  getMe(@CurrentUser() user: AuthenticatedUser | undefined): AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException("Authentication is required.");
    }

    return user;
  }
}
