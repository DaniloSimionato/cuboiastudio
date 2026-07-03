import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest, RequestTenant } from "./auth.types";

export const Tenant = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.tenant as RequestTenant | undefined;
});
