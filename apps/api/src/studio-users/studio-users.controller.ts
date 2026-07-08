import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { CreateStudioUserDto, UpdateStudioUserDto } from "./dto/save-studio-user.dto";
import { StudioUsersService } from "./studio-users.service";

@ApiTags("studio-users")
@Controller("studio-users")
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions("users:manage")
export class StudioUsersController {
  constructor(private readonly studioUsersService: StudioUsersService) {}

  @Get()
  @ApiOperation({ summary: "List Studio users and their company memberships" })
  list() {
    return this.studioUsersService.list();
  }

  @Post()
  @ApiOperation({ summary: "Create a Studio user with a temporary password" })
  create(@Body() dto: CreateStudioUserDto) {
    return this.studioUsersService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a Studio user and synchronize memberships" })
  update(@Param("id") id: string, @Body() dto: UpdateStudioUserDto) {
    return this.studioUsersService.update(id, dto);
  }
}
