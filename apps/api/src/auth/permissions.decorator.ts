import { SetMetadata } from "@nestjs/common";
import { AUTH_PERMISSIONS_KEY } from "./auth.types";

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(AUTH_PERMISSIONS_KEY, permissions);
