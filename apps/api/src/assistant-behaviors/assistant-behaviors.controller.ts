import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Tenant } from "../auth/tenant.decorator";
import type { RequestTenant } from "../auth/auth.types";
import { AssistantBehaviorsService } from "./assistant-behaviors.service";
import { UpsertAssistantBehaviorDto } from "./dto/upsert-assistant-behavior.dto";

@ApiTags("assistants")
@UseGuards(AuthGuard)
@Controller("assistants/:assistantId/behavior")
export class AssistantBehaviorsController {
  constructor(private readonly assistantBehaviorsService: AssistantBehaviorsService) {}

  @Get()
  @ApiOperation({ summary: "Find assistant behavior" })
  async findByAssistantId(
    @Tenant() tenant: RequestTenant,
    @Param("assistantId") assistantId: string,
  ) {
    return this.assistantBehaviorsService.findByAssistantId(tenant.companyId, assistantId);
  }

  @Put()
  @ApiOperation({ summary: "Upsert assistant behavior" })
  async upsert(
    @Tenant() tenant: RequestTenant,
    @Param("assistantId") assistantId: string,
    @Body() dto: UpsertAssistantBehaviorDto,
  ) {
    return this.assistantBehaviorsService.upsert(tenant.companyId, assistantId, dto);
  }
}
