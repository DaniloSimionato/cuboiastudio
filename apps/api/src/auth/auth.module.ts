import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { PermissionsGuard } from "./permissions.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthGuard, PermissionsGuard],
  exports: [AuthGuard, PermissionsGuard],
})
export class AuthModule {}
