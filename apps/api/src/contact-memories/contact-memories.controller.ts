import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ContactMemoryCategory,
  ContactMemorySourceType,
  ConversationChannelType,
} from "@prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../auth/tenant.decorator";
import { ContactMemoriesExtractionService } from "./contact-memories-extraction.service";
import { ContactMemoriesService } from "./contact-memories.service";
import { CreateContactMemoryDto } from "./dto/create-contact-memory.dto";
import { ReindexContactMemoryDto } from "./dto/reindex-contact-memory.dto";
import { ExtractContactMemoryDto } from "./dto/extract-contact-memory.dto";
import { UpdateContactMemoryDto } from "./dto/update-contact-memory.dto";

@Controller("contact-memories")
export class ContactMemoriesController {
  constructor(
    private readonly contactMemoriesService: ContactMemoriesService,
    private readonly contactMemoriesExtractionService: ContactMemoriesExtractionService,
  ) {}

  @Get("profiles")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  async listProfiles(
    @Tenant() tenant: RequestTenant,
    @Query("channelType") channelType?: ConversationChannelType,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.contactMemoriesService.listProfiles({
      companyId: tenant.companyId,
      channelType,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get("profiles/:profileId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  async getProfileWithItems(
    @Tenant() tenant: RequestTenant,
    @Param("profileId") profileId: string,
  ) {
    return this.contactMemoriesService.getProfileWithItems({
      profileId,
      companyId: tenant.companyId,
    });
  }

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  async listItems(
    @Tenant() tenant: RequestTenant,
    @Query("profileId") profileId?: string,
    @Query("channelType") channelType?: ConversationChannelType,
    @Query("category") category?: ContactMemoryCategory,
    @Query("active") active?: string,
    @Query("expired") expired?: string,
    @Query("sourceType") sourceType?: ContactMemorySourceType,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.contactMemoriesService.listItems({
      companyId: tenant.companyId,
      profileId,
      channelType,
      category,
      active: active === "true" ? true : active === "false" ? false : undefined,
      expired: expired === "true" ? true : expired === "false" ? false : undefined,
      sourceType,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get("items")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  async listItemsLegacy(
    @Tenant() tenant: RequestTenant,
    @Query("profileId") profileId?: string,
    @Query("channelType") channelType?: ConversationChannelType,
    @Query("category") category?: ContactMemoryCategory,
    @Query("active") active?: string,
    @Query("expired") expired?: string,
    @Query("sourceType") sourceType?: ContactMemorySourceType,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.listItems(
      tenant,
      profileId,
      channelType,
      category,
      active,
      expired,
      sourceType,
      search,
      page,
      limit,
    );
  }

  @Get("stats")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  async getStats(@Tenant() tenant: RequestTenant) {
    return this.contactMemoriesService.getStats(tenant.companyId);
  }

  @Get(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  async getItem(@Tenant() tenant: RequestTenant, @Param("id") id: string) {
    return this.contactMemoriesService.getItemById({
      id,
      companyId: tenant.companyId,
    });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  async createItem(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
    @Body() body: CreateContactMemoryDto,
  ) {
    return this.contactMemoriesService.upsertMemoryItem({
      profileId: body.profileId,
      companyId: tenant.companyId,
      category: body.category,
      key: body.key,
      value: body.value,
      valueJson: body.valueJson,
      confidence: body.confidence ?? 1,
      sourceType: ContactMemorySourceType.MANUAL,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      userId: user.id,
    });
  }

  @Post("items")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  async createItemLegacy(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
    @Body() body: CreateContactMemoryDto,
  ) {
    return this.createItem(user, tenant, body);
  }

  @Patch(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
    @Body() body: UpdateContactMemoryDto,
  ) {
    return this.contactMemoriesService.updateItem({
      id,
      companyId: tenant.companyId,
      category: body.category,
      key: body.key,
      value: body.value,
      valueJson: body.valueJson,
      confidence: body.confidence,
      expiresAt:
        body.expiresAt !== undefined
          ? body.expiresAt
            ? new Date(body.expiresAt)
            : null
          : undefined,
      active: body.active,
      userId: user.id,
    });
  }

  @Patch("items/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  async updateItemLegacy(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
    @Body() body: UpdateContactMemoryDto,
  ) {
    return this.updateItem(user, tenant, id, body);
  }

  @Delete(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  async deleteItem(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
  ) {
    const item = await this.contactMemoriesService.deleteItem({
      id,
      companyId: tenant.companyId,
      userId: user.id,
    });
    return { success: true, item };
  }

  @Delete("items/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  async deleteItemLegacy(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
    @Param("id") id: string,
  ) {
    return this.deleteItem(user, tenant, id);
  }

  @Get(":id/events")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  async getItemEvents(@Tenant() tenant: RequestTenant, @Param("id") id: string) {
    return this.contactMemoriesService.getItemEvents({
      memoryItemId: id,
      companyId: tenant.companyId,
    });
  }

  @Get("items/:id/events")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:read")
  async getItemEventsLegacy(@Tenant() tenant: RequestTenant, @Param("id") id: string) {
    return this.getItemEvents(tenant, id);
  }

  @Post("extract")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  async extractForTest(@Tenant() tenant: RequestTenant, @Body() body: ExtractContactMemoryDto) {
    const existingMemories = await this.contactMemoriesService.getActiveMemories({
      profileId: body.profileId,
      companyId: tenant.companyId,
      confidenceThreshold: 0.7,
      categories: body.allowedCategories,
    });

    return this.contactMemoriesExtractionService.extractMemories({
      companyId: tenant.companyId,
      assistantId: body.assistantId,
      profileId: body.profileId,
      currentMessage: body.currentMessage,
      recentMessages: body.recentMessages,
      existingMemories,
      sourceConversationId: body.sourceConversationId,
      sourceMessageId: body.sourceMessageId,
      allowedCategories: body.allowedCategories,
    });
  }

  @Post("reindex")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("assistants:write")
  async reindex(@Tenant() tenant: RequestTenant, @Body() body: ReindexContactMemoryDto) {
    return this.contactMemoriesService.reindexMemories({
      companyId: tenant.companyId,
      assistantId: body.assistantId,
      memoryId: body.memoryItemId || body.memoryId,
      status: body.status,
      version: body.version,
    });
  }
}
