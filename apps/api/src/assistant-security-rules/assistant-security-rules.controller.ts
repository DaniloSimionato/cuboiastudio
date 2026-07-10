import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser, RequestTenant } from "../auth/auth.types";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../auth/tenant.decorator";
import {
  AssistantSecurityRulesService,
  type CreateAssistantSecurityRuleResponse,
  type DeleteAssistantSecurityRuleResponse,
  type FindAllAssistantSecurityRulesResponse,
  type UpdateAssistantSecurityRuleResponse,
} from "./assistant-security-rules.service";
import { CreateAssistantSecurityRuleDto } from "./dto/create-assistant-security-rule.dto";
import { UpdateAssistantSecurityRuleDto } from "./dto/update-assistant-security-rule.dto";

@ApiTags("assistant-security-rules")
@Controller("assistants/:assistantId/security-rules")
export class AssistantSecurityRulesController {
  constructor(private readonly service: AssistantSecurityRulesService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  @ApiOperation({ summary: "List security rules for an assistant" })
  @ApiParam({ name: "assistantId", required: true })
  @ApiOkResponse({ description: "Security rules returned." })
  @ApiUnauthorizedResponse({ description: "Missing authentication context." })
  @ApiForbiddenResponse({ description: "Missing assistants:read permission." })
  @ApiNotFoundResponse({ description: "Assistant not found in the current tenant." })
  async findAll(
    @Param("assistantId") assistantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<FindAllAssistantSecurityRulesResponse> {
    return this.service.findAll({ assistantId, user, tenant });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Create a security rule for an assistant" })
  @ApiParam({ name: "assistantId", required: true })
  @ApiCreatedResponse({ description: "Security rule created." })
  @ApiBadRequestResponse({ description: "Invalid security rule payload." })
  @ApiUnauthorizedResponse({ description: "Missing authentication context." })
  @ApiForbiddenResponse({ description: "Missing assistants:write permission." })
  @ApiNotFoundResponse({ description: "Assistant not found in the current tenant." })
  async create(
    @Param("assistantId") assistantId: string,
    @Body() body: CreateAssistantSecurityRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<CreateAssistantSecurityRuleResponse> {
    return this.service.create({ assistantId, dto: body, user, tenant });
  }

  @Patch(":ruleId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Update a security rule for an assistant" })
  @ApiParam({ name: "assistantId", required: true })
  @ApiParam({ name: "ruleId", required: true })
  @ApiOkResponse({ description: "Security rule updated." })
  @ApiBadRequestResponse({ description: "Invalid update payload." })
  @ApiUnauthorizedResponse({ description: "Missing authentication context." })
  @ApiForbiddenResponse({ description: "Missing assistants:write permission." })
  @ApiNotFoundResponse({ description: "Assistant or security rule not found." })
  async update(
    @Param("assistantId") assistantId: string,
    @Param("ruleId") ruleId: string,
    @Body() body: UpdateAssistantSecurityRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<UpdateAssistantSecurityRuleResponse> {
    return this.service.update({ assistantId, ruleId, dto: body, user, tenant });
  }

  @Delete(":ruleId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  @ApiOperation({ summary: "Delete a security rule for an assistant" })
  @ApiParam({ name: "assistantId", required: true })
  @ApiParam({ name: "ruleId", required: true })
  @ApiOkResponse({ description: "Security rule deleted." })
  @ApiUnauthorizedResponse({ description: "Missing authentication context." })
  @ApiForbiddenResponse({ description: "Missing assistants:write permission." })
  @ApiNotFoundResponse({ description: "Assistant or security rule not found." })
  async delete(
    @Param("assistantId") assistantId: string,
    @Param("ruleId") ruleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<DeleteAssistantSecurityRuleResponse> {
    return this.service.delete({ assistantId, ruleId, user, tenant });
  }
}
