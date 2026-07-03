import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_PERMISSIONS_KEY, type AuthenticatedRequest } from "./auth.types";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") {
      return false;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(AUTH_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("Authentication is required.");
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const userPermissions = new Set(user.permissions);
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException("Missing required permissions.");
    }

    return true;
  }
}
