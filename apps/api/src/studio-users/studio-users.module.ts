import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StudioUsersController } from "./studio-users.controller";
import { StudioUsersService } from "./studio-users.service";

@Module({
  imports: [AuthModule],
  controllers: [StudioUsersController],
  providers: [StudioUsersService],
})
export class StudioUsersModule {}
