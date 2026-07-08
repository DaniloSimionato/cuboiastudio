import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../auth/tenant.decorator";
import type { RequestTenant } from "../auth/auth.types";
import { AssistantFlowsService } from "./assistant-flows.service";
import { CreateAssistantFlowDto } from "./dto/create-assistant-flow.dto";
import { UpdateAssistantFlowDto } from "./dto/update-assistant-flow.dto";

@ApiTags("assistants")
@UseGuards(AuthGuard, PermissionsGuard)
@Controller("assistants/:assistantId/flows")
export class AssistantFlowsController {
  constructor(private readonly assistantFlowsService: AssistantFlowsService) {}

  @Get()
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "List assistant flows" })
  async findAll(
    @Tenant() tenant: RequestTenant,
    @Param("assistantId") assistantId: string,
  ) {
    return this.assistantFlowsService.findAll(tenant.companyId, assistantId);
  }

  @Get(":flowId")
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "Get assistant flow" })
  async findOne(
    @Tenant() tenant: RequestTenant,
    @Param("assistantId") assistantId: string,
    @Param("flowId") flowId: string,
  ) {
    return this.assistantFlowsService.findOne(tenant.companyId, assistantId, flowId);
  }

  @Post()
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Create assistant flow" })
  async create(
    @Tenant() tenant: RequestTenant,
    @Param("assistantId") assistantId: string,
    @Body() dto: CreateAssistantFlowDto,
  ) {
    return this.assistantFlowsService.create(tenant.companyId, assistantId, dto);
  }

  @Put(":flowId")
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Update assistant flow" })
  async update(
    @Tenant() tenant: RequestTenant,
    @Param("assistantId") assistantId: string,
    @Param("flowId") flowId: string,
    @Body() dto: UpdateAssistantFlowDto,
  ) {
    return this.assistantFlowsService.update(tenant.companyId, assistantId, flowId, dto);
  }

  @Delete(":flowId")
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Delete assistant flow" })
  async delete(
    @Tenant() tenant: RequestTenant,
    @Param("assistantId") assistantId: string,
    @Param("flowId") flowId: string,
  ) {
    return this.assistantFlowsService.delete(tenant.companyId, assistantId, flowId);
  }
}
