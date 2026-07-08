import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { PermissionsGuard } from "./permissions.guard";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthGuard, PermissionsGuard, AuthService],
  exports: [AuthGuard, PermissionsGuard],
})
export class AuthModule {}
