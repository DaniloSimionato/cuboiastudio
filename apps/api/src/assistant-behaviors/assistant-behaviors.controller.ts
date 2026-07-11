import { Body, Controller, Get, Headers, Param, Put, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../auth/tenant.decorator";
import type { RequestTenant } from "../auth/auth.types";
import { AssistantBehaviorsService } from "./assistant-behaviors.service";
import { UpsertAssistantBehaviorDto } from "./dto/upsert-assistant-behavior.dto";

@ApiTags("assistants")
@UseGuards(AuthGuard, PermissionsGuard)
@Controller("assistants/:assistantId/behavior")
export class AssistantBehaviorsController {
  constructor(private readonly assistantBehaviorsService: AssistantBehaviorsService) {}

  @Get()
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "Find assistant behavior" })
  async findByAssistantId(
    @Tenant() tenant: RequestTenant,
    @Param("assistantId") assistantId: string,
  ) {
    return this.assistantBehaviorsService.findByAssistantId(tenant.companyId, assistantId);
  }

  @Put()
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Upsert assistant behavior" })
  async upsert(
    @Tenant() tenant: RequestTenant,
    @Param("assistantId") assistantId: string,
    @Body() dto: UpsertAssistantBehaviorDto,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.assistantBehaviorsService.upsert(tenant.companyId, assistantId, dto, {
      requestId: requestId ?? correlationId,
    });
  }
}
