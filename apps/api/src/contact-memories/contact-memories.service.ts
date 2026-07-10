import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  ContactMemoryCategory,
  ContactMemoryEventType,
  ContactMemorySourceType,
  ConversationChannelType,
  Prisma,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { validateMemorySafety } from "./contact-memories-security.utils";
import { AiService } from "../ai/ai.service";
import { CacheService } from "../cache/cache.service";

export const EMBEDDING_VERSION = "v1";

function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function buildSemanticContent(category: string, key: string, value: string): string {
  const normCategory = collapseWhitespace(category).toLowerCase();
  const normKey = collapseWhitespace(key).toLowerCase();
  const normValue = collapseWhitespace(value).normalize("NFC");
  return `Categoria: ${normCategory}\nChave: ${normKey}\nConteúdo: ${normValue}`;
}

export function generateContentHash(semanticContent: string): string {
  return createHash("sha256").update(semanticContent).digest("hex");
}

type FindOrCreateProfileInput = {
  companyId: string;
  channelType: ConversationChannelType;
  externalAccountId?: string | null;
  externalContactId?: string | null;
  externalInboxId?: string | null;
  chatwootContactId?: string | null;
  phoneNormalized?: string | null;
  displayName?: string | null;
  assistantId?: string | null;
  sharedAcrossAssistants?: boolean;
};

type UpsertMemoryItemInput = {
  profileId: string;
  companyId: string;
  category: ContactMemoryCategory;
  key: string;
  value: string;
  valueJson?: Prisma.InputJsonValue | null;
  confidence: number;
  sourceType: ContactMemorySourceType;
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
  expiresAt?: Date | null;
  userId?: string | null;
};

const MAX_MEMORY_KEY_LENGTH = 120;
const MAX_MEMORY_VALUE_LENGTH = 500;

function normalizePhone(value?: string | null): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function sanitizeMemoryKey(value?: string | null): string | null {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_MEMORY_KEY_LENGTH);

  return normalized.length > 0 ? normalized : null;
}

function sanitizeMemoryValue(value?: string | null): string | null {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_MEMORY_VALUE_LENGTH);
  return normalized.length > 0 ? normalized : null;
}

function sanitizeProfileLabel(value?: string | null): string | null {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  return normalized.length > 0 ? normalized : null;
}

function toPrismaJsonValue(
  value: Prisma.InputJsonValue | Prisma.JsonValue | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function isTemporaryCategory(category: ContactMemoryCategory): boolean {
  return category === ContactMemoryCategory.TEMPORARY_CONTEXT;
}

@Injectable()
export class ContactMemoriesService implements OnModuleInit {
  private readonly logger = new Logger(ContactMemoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly cacheService: CacheService,
  ) {}

  async onModuleInit() {
    void this.reprocessPendingMemories().catch((err) => {
      this.logger.error(
        `Error during startup pending memories reindexing: ${err.message}`,
        err.stack,
      );
    });
  }

  async reprocessPendingMemories() {
    this.logger.log("Checking for any stale PENDING or PROCESSING memories on startup...");
    const items = await this.prisma.contactMemoryItem.findMany({
      where: {
        deletedAt: null,
        OR: [
          { embeddingStatus: null },
          { embeddingStatus: "PENDING" },
          { embeddingStatus: "PROCESSING" },
        ],
      },
      take: 100,
    });

    if (items.length === 0) {
      this.logger.log("No pending memories to vectorize on startup.");
      return;
    }

    this.logger.log(
      `Found ${items.length} pending memories to vectorize on startup. Vectorizing...`,
    );
    let successes = 0;
    let failures = 0;
    for (const item of items) {
      try {
        await this.vectorizeMemoryItem(item.id, item.companyId);
        successes++;
      } catch (err: any) {
        failures++;
        this.logger.error(`Startup vectorization failed for memory ${item.id}: ${err.message}`);
      }
    }
    this.logger.log(
      `Startup pending memories vectorization completed: ${successes} succeeded, ${failures} failed.`,
    );
  }

  private buildAssistantScope(input: {
    assistantId?: string | null;
    sharedAcrossAssistants?: boolean;
  }): string {
    if (input.sharedAcrossAssistants !== false || !input.assistantId) {
      return "shared";
    }

    return `assistant:${input.assistantId}`;
  }

  private buildIdentityKey(input: FindOrCreateProfileInput): string {
    const assistantScope = this.buildAssistantScope(input);
    const phone = normalizePhone(input.phoneNormalized);
    const externalAccountId = sanitizeProfileLabel(input.externalAccountId);
    const externalInboxId = sanitizeProfileLabel(input.externalInboxId);
    const externalContactId = sanitizeProfileLabel(input.externalContactId);
    const chatwootContactId = sanitizeProfileLabel(input.chatwootContactId);
    const displayName = sanitizeProfileLabel(input.displayName)?.toLowerCase().replace(/\s+/g, "-");

    const parts = [`scope:${assistantScope}`, `channel:${input.channelType}`];

    if (chatwootContactId) {
      if (externalAccountId) parts.push(`account:${externalAccountId}`);
      if (externalInboxId) parts.push(`inbox:${externalInboxId}`);
      parts.push(`chatwoot:${chatwootContactId}`);
      return parts.join("|");
    }

    if (externalContactId) {
      if (externalAccountId) parts.push(`account:${externalAccountId}`);
      if (externalInboxId) parts.push(`inbox:${externalInboxId}`);
      parts.push(`external:${externalContactId}`);
      return parts.join("|");
    }

    if (phone) {
      parts.push(`phone:${phone}`);
      return parts.join("|");
    }

    if (displayName) {
      this.logger.warn(
        `Falling back to displayName for contact memory identity. companyId=${input.companyId} channelType=${input.channelType}`,
      );
      parts.push(`display:${displayName}`);
      return parts.join("|");
    }

    parts.push("anonymous");
    return parts.join("|");
  }

  private buildProfileFallbackWhere(
    input: FindOrCreateProfileInput,
  ): Prisma.ContactMemoryProfileWhereInput {
    const phone = normalizePhone(input.phoneNormalized);
    const scopeAssistantId =
      input.sharedAcrossAssistants === false ? (input.assistantId ?? null) : null;
    const assistantScopeFilter: Prisma.ContactMemoryProfileWhereInput =
      input.sharedAcrossAssistants === false
        ? { assistantId: scopeAssistantId }
        : { OR: [{ assistantId: null }, { assistantId: input.assistantId ?? null }] };
    const identityFilters: Prisma.ContactMemoryProfileWhereInput[] = [
      input.chatwootContactId
        ? {
            chatwootContactId: sanitizeProfileLabel(input.chatwootContactId),
            ...(input.externalAccountId
              ? { externalAccountId: sanitizeProfileLabel(input.externalAccountId) }
              : {}),
            ...(input.externalInboxId
              ? { externalInboxId: sanitizeProfileLabel(input.externalInboxId) }
              : {}),
          }
        : undefined,
      input.externalContactId
        ? {
            externalContactId: sanitizeProfileLabel(input.externalContactId),
            channelType: input.channelType,
          }
        : undefined,
      phone ? { phoneNormalized: phone } : undefined,
    ].filter(Boolean) as Prisma.ContactMemoryProfileWhereInput[];

    return {
      companyId: input.companyId,
      AND: [assistantScopeFilter, { OR: identityFilters }],
    };
  }

  private async enforceCategoryLimit(
    tx: Prisma.TransactionClient,
    companyId: string,
    profileId: string,
    category: ContactMemoryCategory,
  ): Promise<void> {
    const limit = {
      [ContactMemoryCategory.IDENTITY]: 10,
      [ContactMemoryCategory.BUSINESS_CONTEXT]: 30,
      [ContactMemoryCategory.PREFERENCE]: 30,
      [ContactMemoryCategory.TEMPORARY_CONTEXT]: 20,
      [ContactMemoryCategory.RELATIONSHIP_SUMMARY]: 1,
    }[category];

    if (!limit) return;

    const activeItems = await tx.contactMemoryItem.findMany({
      where: {
        profileId,
        category,
        active: true,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    if (activeItems.length >= limit) {
      const now = new Date();
      const scoredItems = activeItems.map((item) => {
        const isExpired = item.expiresAt && new Date(item.expiresAt) <= now;
        const score = item.confidence + (item.usageCount ?? 0) * 0.1;
        return { item, isExpired, score };
      });

      scoredItems.sort((a, b) => {
        if (a.isExpired && !b.isExpired) return -1;
        if (!a.isExpired && b.isExpired) return 1;
        if (a.score !== b.score) return a.score - b.score;
        return new Date(a.item.createdAt).getTime() - new Date(b.item.createdAt).getTime();
      });

      const toRemoveCount = activeItems.length - limit + 1;
      const itemsToRemove = scoredItems.slice(0, toRemoveCount);

      for (const remove of itemsToRemove) {
        await tx.contactMemoryItem.update({
          where: { id: remove.item.id },
          data: { active: false, deletedAt: new Date() },
        });

        await tx.contactMemoryEvent.create({
          data: {
            memoryItemId: remove.item.id,
            companyId,
            eventType: ContactMemoryEventType.DELETED,
            previousValue: remove.item.value,
            newValue: "REMOVED_BY_LIMIT",
            sourceType: ContactMemorySourceType.SYSTEM,
          },
        });
      }
    }
  }

  async findOrCreateProfile(input: FindOrCreateProfileInput) {
    const identityKey = this.buildIdentityKey(input);
    const displayName = sanitizeProfileLabel(input.displayName);
    const externalAccountId = sanitizeProfileLabel(input.externalAccountId);
    const externalContactId = sanitizeProfileLabel(input.externalContactId);
    const externalInboxId = sanitizeProfileLabel(input.externalInboxId);
    const chatwootContactId = sanitizeProfileLabel(input.chatwootContactId);
    const phoneNormalized = normalizePhone(input.phoneNormalized);
    const scopedAssistantId =
      input.sharedAcrossAssistants === false ? (input.assistantId ?? null) : null;

    let profile = await this.prisma.contactMemoryProfile.findUnique({
      where: {
        companyId_identityKey: {
          companyId: input.companyId,
          identityKey,
        },
      },
    });

    if (!profile && (chatwootContactId || externalContactId || phoneNormalized)) {
      profile = await this.prisma.contactMemoryProfile.findFirst({
        where: this.buildProfileFallbackWhere(input),
      });
    }

    if (!profile) {
      return this.prisma.contactMemoryProfile.create({
        data: {
          companyId: input.companyId,
          assistantId: scopedAssistantId,
          identityKey,
          channelType: input.channelType,
          externalAccountId,
          externalContactId,
          externalInboxId,
          chatwootContactId,
          phoneNormalized,
          displayName,
        },
      });
    }

    return this.prisma.contactMemoryProfile.update({
      where: { id: profile.id },
      data: {
        assistantId: profile.assistantId ?? scopedAssistantId,
        identityKey,
        channelType: input.channelType,
        externalAccountId: externalAccountId ?? profile.externalAccountId,
        externalContactId: externalContactId ?? profile.externalContactId,
        externalInboxId: externalInboxId ?? profile.externalInboxId,
        chatwootContactId: chatwootContactId ?? profile.chatwootContactId,
        phoneNormalized: phoneNormalized ?? profile.phoneNormalized,
        displayName: displayName ?? profile.displayName,
        lastInteractionAt: new Date(),
      },
    });
  }

  async findProfileById(input: { profileId: string; companyId: string }) {
    return this.prisma.contactMemoryProfile.findFirst({
      where: { id: input.profileId, companyId: input.companyId },
    });
  }

  async hasExtractionForSourceMessage(input: { companyId: string; sourceMessageId: string }) {
    const existing = await this.prisma.contactMemoryItem.findFirst({
      where: {
        companyId: input.companyId,
        sourceMessageId: input.sourceMessageId,
        sourceType: ContactMemorySourceType.AI_EXTRACTED,
      },
      select: { id: true },
    });

    return Boolean(existing);
  }

  async getActiveMemories(input: {
    profileId: string;
    companyId: string;
    confidenceThreshold?: number;
    categories?: ContactMemoryCategory[];
  }) {
    const threshold = input.confidenceThreshold ?? 0.7;
    const now = new Date();

    // Cleanup expired memories asynchronously
    const expiredItems = await this.prisma.contactMemoryItem.findMany({
      where: {
        profileId: input.profileId,
        companyId: input.companyId,
        deletedAt: null,
        active: true,
        expiresAt: { lte: now },
      },
    });

    if (expiredItems.length > 0) {
      void this.prisma
        .$transaction(async (tx) => {
          for (const item of expiredItems) {
            await tx.contactMemoryItem.update({
              where: { id: item.id },
              data: { active: false },
            });
            await tx.contactMemoryEvent.create({
              data: {
                memoryItemId: item.id,
                companyId: input.companyId,
                eventType: ContactMemoryEventType.DEACTIVATED,
                previousValue: item.value,
                newValue: "EXPIRED",
                sourceType: ContactMemorySourceType.SYSTEM,
              },
            });
          }
        })
        .catch((err) => {
          this.logger.error(`Failed to cleanup expired items: ${err.message}`);
        });
    }

    return this.prisma.contactMemoryItem.findMany({
      where: {
        profileId: input.profileId,
        companyId: input.companyId,
        deletedAt: null,
        active: true,
        confidence: { gte: threshold },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(input.categories && input.categories.length > 0
          ? { category: { in: input.categories } }
          : {}),
      },
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
  }

  async upsertMemoryItem(input: UpsertMemoryItemInput) {
    const key = sanitizeMemoryKey(input.key);
    const value = sanitizeMemoryValue(input.value);

    if (!key || !value) {
      throw new BadRequestException("Memory key and value are required.");
    }

    validateMemorySafety(key, value);

    if (isTemporaryCategory(input.category) && !input.expiresAt) {
      throw new BadRequestException("Temporary memory items must include expiresAt.");
    }

    const profile = await this.prisma.contactMemoryProfile.findFirst({
      where: {
        id: input.profileId,
        companyId: input.companyId,
      },
      select: { id: true },
    });

    if (!profile) {
      throw new BadRequestException("Contact memory profile not found for the current tenant.");
    }

    const semanticContent = buildSemanticContent(input.category, key, value);
    const contentHash = generateContentHash(semanticContent);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.contactMemoryItem.findUnique({
        where: {
          profileId_category_key: {
            profileId: input.profileId,
            category: input.category,
            key,
          },
        },
      });

      const now = new Date();
      const normalizedConfidence = Math.min(Math.max(input.confidence, 0), 1);

      if (existing) {
        if (existing.active && existing.deletedAt === null && existing.value === value) {
          return existing;
        }

        if (existing.value === value) {
          const shouldReactivate = !existing.active || existing.deletedAt !== null;
          if (shouldReactivate) {
            await this.enforceCategoryLimit(tx, input.companyId, input.profileId, input.category);

            const updated = await tx.contactMemoryItem.update({
              where: { id: existing.id },
              data: {
                confidence: Math.max(existing.confidence, normalizedConfidence),
                valueJson: toPrismaJsonValue(input.valueJson ?? existing.valueJson),
                sourceType: input.sourceType,
                sourceConversationId: input.sourceConversationId ?? existing.sourceConversationId,
                sourceMessageId: input.sourceMessageId ?? existing.sourceMessageId,
                expiresAt: input.expiresAt !== undefined ? input.expiresAt : existing.expiresAt,
                lastSeenAt: now,
                active: true,
                deletedAt: null,
              },
            });

            await tx.contactMemoryEvent.create({
              data: {
                memoryItemId: existing.id,
                companyId: input.companyId,
                eventType: ContactMemoryEventType.REACTIVATED,
                previousValue: existing.value,
                newValue: value,
                sourceType: input.sourceType,
                sourceConversationId: input.sourceConversationId,
                sourceMessageId: input.sourceMessageId,
                userId: input.userId,
              },
            });

            return updated;
          }
        }

        const willBecomeActive = !existing.active || existing.deletedAt !== null;
        if (willBecomeActive) {
          await this.enforceCategoryLimit(tx, input.companyId, input.profileId, input.category);
        }

        const updated = await tx.contactMemoryItem.update({
          where: { id: existing.id },
          data: {
            value,
            valueJson: toPrismaJsonValue(input.valueJson ?? existing.valueJson),
            confidence: normalizedConfidence,
            sourceType: input.sourceType,
            sourceConversationId: input.sourceConversationId,
            sourceMessageId: input.sourceMessageId,
            expiresAt: input.expiresAt !== undefined ? input.expiresAt : existing.expiresAt,
            lastSeenAt: now,
            active: true,
            deletedAt: null,
            embeddingStatus: "PENDING",
            contentHash,
          },
        });

        await tx.contactMemoryEvent.create({
          data: {
            memoryItemId: existing.id,
            companyId: input.companyId,
            eventType: ContactMemoryEventType.UPDATED,
            previousValue: existing.value,
            newValue: value,
            sourceType: input.sourceType,
            sourceConversationId: input.sourceConversationId,
            sourceMessageId: input.sourceMessageId,
            userId: input.userId,
          },
        });

        return updated;
      }

      await this.enforceCategoryLimit(tx, input.companyId, input.profileId, input.category);

      const created = await tx.contactMemoryItem.create({
        data: {
          profileId: input.profileId,
          companyId: input.companyId,
          category: input.category,
          key,
          value,
          valueJson: toPrismaJsonValue(input.valueJson),
          confidence: normalizedConfidence,
          sourceType: input.sourceType,
          sourceConversationId: input.sourceConversationId,
          sourceMessageId: input.sourceMessageId,
          expiresAt: input.expiresAt,
          lastSeenAt: now,
          embeddingStatus: "PENDING",
          contentHash,
        },
      });

      await tx.contactMemoryEvent.create({
        data: {
          memoryItemId: created.id,
          companyId: input.companyId,
          eventType: ContactMemoryEventType.CREATED,
          newValue: value,
          sourceType: input.sourceType,
          sourceConversationId: input.sourceConversationId,
          sourceMessageId: input.sourceMessageId,
          userId: input.userId,
        },
      });

      return created;
    });

    if (result && result.embeddingStatus === "PENDING") {
      void this.vectorizeMemoryItem(result.id, input.companyId).catch((err) => {
        this.logger.error(`Background vectorization error for memory ${result.id}: ${err.message}`);
      });
    }

    return result;
  }

  async deactivateItem(input: {
    id: string;
    companyId: string;
    userId?: string | null;
    sourceType?: ContactMemorySourceType;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.contactMemoryItem.findFirst({
        where: { id: input.id, companyId: input.companyId },
      });
      if (!item) return null;

      const updated = await tx.contactMemoryItem.update({
        where: { id: item.id },
        data: { active: false },
      });

      await tx.contactMemoryEvent.create({
        data: {
          memoryItemId: item.id,
          companyId: input.companyId,
          eventType: ContactMemoryEventType.DEACTIVATED,
          previousValue: item.value,
          newValue: item.value,
          sourceType: input.sourceType ?? ContactMemorySourceType.SYSTEM,
          userId: input.userId,
        },
      });
      return updated;
    });
  }

  async deleteItem(input: { id: string; companyId: string; userId?: string | null }) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.contactMemoryItem.findFirst({
        where: { id: input.id, companyId: input.companyId },
      });
      if (!item) return null;

      const updated = await tx.contactMemoryItem.update({
        where: { id: item.id },
        data: {
          active: false,
          deletedAt: new Date(),
        },
      });

      await tx.contactMemoryEvent.create({
        data: {
          memoryItemId: item.id,
          companyId: input.companyId,
          eventType: ContactMemoryEventType.DELETED,
          previousValue: item.value,
          newValue: item.value,
          sourceType: ContactMemorySourceType.MANUAL,
          userId: input.userId,
        },
      });

      return updated;
    });
  }

  async updateItem(input: {
    id: string;
    companyId: string;
    category?: ContactMemoryCategory;
    key?: string;
    value?: string;
    valueJson?: Prisma.InputJsonValue | null;
    confidence?: number;
    expiresAt?: Date | null;
    active?: boolean;
    userId?: string | null;
  }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.contactMemoryItem.findFirst({
        where: { id: input.id, companyId: input.companyId },
      });
      if (!item) return null;

      const nextCategory = input.category ?? item.category;
      const nextKey = input.key !== undefined ? sanitizeMemoryKey(input.key) : item.key;
      const nextValue = input.value !== undefined ? sanitizeMemoryValue(input.value) : item.value;

      if (!nextKey || !nextValue) {
        throw new BadRequestException("Memory key and value are required.");
      }

      validateMemorySafety(nextKey, nextValue);

      if (
        isTemporaryCategory(nextCategory) &&
        ((input.expiresAt === undefined && !item.expiresAt) || input.expiresAt === null)
      ) {
        throw new BadRequestException("Temporary memory items must include expiresAt.");
      }

      if (input.category !== undefined || input.key !== undefined) {
        const duplicate = await tx.contactMemoryItem.findUnique({
          where: {
            profileId_category_key: {
              profileId: item.profileId,
              category: nextCategory,
              key: nextKey,
            },
          },
        });

        if (duplicate && duplicate.id !== item.id) {
          throw new BadRequestException("Another memory item already uses this category and key.");
        }
      }

      const nextActive = input.active ?? item.active;

      const categoryChanged = input.category !== undefined && input.category !== item.category;
      const reactivated = !item.active && nextActive;
      const willBecomeActiveInTargetCategory =
        (categoryChanged && nextActive) || (reactivated && nextActive);

      if (willBecomeActiveInTargetCategory) {
        await this.enforceCategoryLimit(tx, input.companyId, item.profileId, nextCategory);
      }

      const nextDeletedAt =
        item.deletedAt && nextActive
          ? null
          : input.active === false
            ? item.deletedAt
            : item.deletedAt;
      let eventType: ContactMemoryEventType = ContactMemoryEventType.UPDATED;

      if (!item.active && nextActive) {
        eventType = ContactMemoryEventType.REACTIVATED;
      } else if (item.active && input.active === false) {
        eventType = ContactMemoryEventType.DEACTIVATED;
      }

      const nextSemanticContent = buildSemanticContent(nextCategory, nextKey, nextValue);
      const nextContentHash = generateContentHash(nextSemanticContent);
      const contentChanged = nextContentHash !== item.contentHash;

      const updated = await tx.contactMemoryItem.update({
        where: { id: item.id },
        data: {
          category: nextCategory,
          key: nextKey,
          value: nextValue,
          valueJson: toPrismaJsonValue(
            input.valueJson !== undefined ? input.valueJson : item.valueJson,
          ),
          confidence:
            input.confidence !== undefined
              ? Math.min(Math.max(input.confidence, 0), 1)
              : item.confidence,
          expiresAt: input.expiresAt !== undefined ? input.expiresAt : item.expiresAt,
          active: nextActive,
          deletedAt: nextDeletedAt,
          lastSeenAt: new Date(),
          ...(contentChanged
            ? {
                embeddingStatus: "PENDING",
                contentHash: nextContentHash,
              }
            : {}),
        },
      });

      await tx.contactMemoryEvent.create({
        data: {
          memoryItemId: item.id,
          companyId: input.companyId,
          eventType,
          previousValue: item.value,
          newValue: nextValue,
          sourceType: ContactMemorySourceType.MANUAL,
          userId: input.userId,
        },
      });

      return updated;
    });

    if (result && result.embeddingStatus === "PENDING") {
      void this.vectorizeMemoryItem(result.id, input.companyId).catch((err) => {
        this.logger.error(`Background vectorization error for memory ${result.id}: ${err.message}`);
      });
    }

    return result;
  }

  async listProfiles(input: {
    companyId: string;
    channelType?: ConversationChannelType;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ContactMemoryProfileWhereInput = {
      companyId: input.companyId,
      ...(input.channelType ? { channelType: input.channelType } : {}),
      ...(input.search
        ? {
            OR: [
              { displayName: { contains: input.search, mode: "insensitive" } },
              { phoneNormalized: { contains: input.search.replace(/\D/g, "") } },
              { summary: { contains: input.search, mode: "insensitive" } },
              { externalContactId: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.contactMemoryProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastInteractionAt: "desc" },
        include: {
          _count: {
            select: { items: true },
          },
        },
      }),
      this.prisma.contactMemoryProfile.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getProfileStats(companyId: string, profile: any) {
    const items = await this.prisma.contactMemoryItem.findMany({
      where: { profileId: profile.id, companyId, deletedAt: null },
    });

    const now = new Date();
    const totalCount = items.length;
    const activeCount = items.filter(
      (item) => item.active && (item.expiresAt === null || new Date(item.expiresAt) > now),
    ).length;
    const expiredCount = items.filter(
      (item) => item.active && item.expiresAt !== null && new Date(item.expiresAt) <= now,
    ).length;

    let lastUpdatedAt = profile.updatedAt;
    for (const item of items) {
      if (item.updatedAt > lastUpdatedAt) {
        lastUpdatedAt = item.updatedAt;
      }
    }

    let lastUsedAt: Date | null = null;
    for (const item of items) {
      if (item.lastUsedAt && (!lastUsedAt || item.lastUsedAt > lastUsedAt)) {
        lastUsedAt = item.lastUsedAt;
      }
    }

    const identityFilters: Prisma.AssistantConversationWhereInput[] = [];
    if (profile.externalContactId) {
      identityFilters.push({ externalContactId: profile.externalContactId });
    }
    if (profile.externalAccountId) {
      identityFilters.push({ externalAccountId: profile.externalAccountId });
    }

    let firstConversationAt = profile.createdAt;
    let lastConversationAt = profile.lastInteractionAt;

    if (identityFilters.length > 0) {
      const firstConv = await this.prisma.assistantConversation.findFirst({
        where: {
          companyId,
          OR: identityFilters,
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      if (firstConv) {
        firstConversationAt = firstConv.createdAt;
      }

      const lastConv = await this.prisma.assistantConversation.findFirst({
        where: {
          companyId,
          OR: identityFilters,
        },
        orderBy: { createdAt: "desc" },
        select: { lastMessageAt: true, createdAt: true },
      });
      if (lastConv) {
        lastConversationAt = lastConv.lastMessageAt ?? lastConv.createdAt;
      }
    }

    return {
      totalCount,
      activeCount,
      expiredCount,
      lastUpdatedAt,
      lastUsedAt,
      firstConversationAt,
      lastConversationAt,
    };
  }

  async getProfileWithItems(input: { profileId: string; companyId: string }) {
    const profile = await this.prisma.contactMemoryProfile.findFirst({
      where: { id: input.profileId, companyId: input.companyId },
      include: {
        items: {
          orderBy: [{ deletedAt: "asc" }, { category: "asc" }, { key: "asc" }],
        },
      },
    });

    if (!profile) return null;

    const stats = await this.getProfileStats(input.companyId, profile);
    return {
      ...profile,
      stats,
    };
  }

  async getStats(companyId: string) {
    const now = new Date();

    const [totalMemories, activeMemories, temporaryMemories, expiredMemories, totalProfiles] =
      await Promise.all([
        this.prisma.contactMemoryItem.count({
          where: { companyId, deletedAt: null },
        }),
        this.prisma.contactMemoryItem.count({
          where: {
            companyId,
            deletedAt: null,
            active: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        }),
        this.prisma.contactMemoryItem.count({
          where: {
            companyId,
            deletedAt: null,
            active: true,
            category: ContactMemoryCategory.TEMPORARY_CONTEXT,
          },
        }),
        this.prisma.contactMemoryItem.count({
          where: {
            companyId,
            deletedAt: null,
            active: true,
            expiresAt: { lte: now },
          },
        }),
        this.prisma.contactMemoryProfile.count({
          where: { companyId },
        }),
      ]);

    const categoryGroups = await this.prisma.contactMemoryItem.groupBy({
      by: ["category"],
      where: { companyId, deletedAt: null, active: true },
      _count: { _all: true },
    });

    const topCategories = categoryGroups
      .map((g) => ({
        category: g.category,
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const averagePerContact =
      totalProfiles > 0 ? parseFloat((activeMemories / totalProfiles).toFixed(2)) : 0;

    const topProfiles = await this.prisma.contactMemoryProfile.findMany({
      where: { companyId },
      select: {
        id: true,
        displayName: true,
        phoneNormalized: true,
        _count: {
          select: {
            items: {
              where: { deletedAt: null, active: true },
            },
          },
        },
      },
      orderBy: {
        items: {
          _count: "desc",
        },
      },
      take: 5,
    });

    const topContacts = topProfiles.map((p) => ({
      profileId: p.id,
      displayName: p.displayName ?? "Contato sem nome",
      phoneNormalized: p.phoneNormalized ?? "",
      count: p._count.items,
    }));

    return {
      totalMemories,
      activeMemories,
      temporaryMemories,
      expiredMemories,
      averagePerContact,
      topCategories,
      topContacts,
    };
  }

  async incrementUsage(ids: string[]) {
    if (ids.length === 0) return;
    try {
      await this.prisma.contactMemoryItem.updateMany({
        where: { id: { in: ids } },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to increment usage counts: ${err.message}`);
    }
  }

  async listItems(input: {
    companyId: string;
    profileId?: string;
    channelType?: ConversationChannelType;
    category?: ContactMemoryCategory;
    active?: boolean;
    expired?: boolean;
    sourceType?: ContactMemorySourceType;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;
    const andFilters: Prisma.ContactMemoryItemWhereInput[] = [];

    const where: Prisma.ContactMemoryItemWhereInput = {
      companyId: input.companyId,
      ...(input.profileId ? { profileId: input.profileId } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.sourceType ? { sourceType: input.sourceType } : {}),
      ...(input.channelType ? { profile: { channelType: input.channelType } } : {}),
    };

    if (input.search) {
      andFilters.push({
        OR: [
          { key: { contains: input.search, mode: "insensitive" } },
          { value: { contains: input.search, mode: "insensitive" } },
          {
            profile: {
              displayName: { contains: input.search, mode: "insensitive" },
            },
          },
          {
            profile: {
              phoneNormalized: { contains: input.search.replace(/\D/g, "") },
            },
          },
        ],
      });
    }

    if (input.expired !== undefined) {
      if (input.expired) {
        andFilters.push({ expiresAt: { lt: new Date() } });
      } else {
        andFilters.push({ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });
      }
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const [items, total] = await Promise.all([
      this.prisma.contactMemoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ deletedAt: "desc" }, { updatedAt: "desc" }],
        include: {
          profile: {
            select: {
              id: true,
              displayName: true,
              phoneNormalized: true,
              channelType: true,
              externalContactId: true,
              externalAccountId: true,
              externalInboxId: true,
              summary: true,
            },
          },
        },
      }),
      this.prisma.contactMemoryItem.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getItemById(input: { id: string; companyId: string }) {
    return this.prisma.contactMemoryItem.findFirst({
      where: { id: input.id, companyId: input.companyId },
      include: {
        profile: true,
      },
    });
  }

  async getItemEvents(input: { memoryItemId: string; companyId: string }) {
    return this.prisma.contactMemoryEvent.findMany({
      where: { memoryItemId: input.memoryItemId, companyId: input.companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateProfileSummary(input: {
    profileId: string;
    companyId: string;
    summary: string | null;
  }) {
    const profile = await this.prisma.contactMemoryProfile.findFirst({
      where: { id: input.profileId, companyId: input.companyId },
      select: { id: true },
    });

    if (!profile) {
      return null;
    }

    return this.prisma.contactMemoryProfile.update({
      where: { id: profile.id },
      data: {
        summary: sanitizeMemoryValue(input.summary) ?? null,
      },
    });
  }

  async vectorizeMemoryItem(
    id: string,
    companyId: string,
    targetVersion = EMBEDDING_VERSION,
  ): Promise<boolean> {
    const claimed = await this.claimMemoryItemForProcessing(id, companyId, targetVersion);
    if (!claimed) {
      this.logger.log(
        `Memory item ${id} was already claimed or processed by another worker. Skipping.`,
      );
      return false;
    }

    const item = await this.prisma.contactMemoryItem.findFirst({
      where: { id, companyId },
    });
    if (!item) {
      throw new NotFoundException(`Memory item ${id} not found.`);
    }

    const semanticContent = buildSemanticContent(item.category, item.key, item.value);
    const contentHash = generateContentHash(semanticContent);

    try {
      this.logger.debug(`Generating embedding for memory ${id} of company ${companyId}`);

      const result = await this.aiService.generateEmbedding({
        text: semanticContent,
        companyId,
      });

      if (!result.embedding || result.embedding.length !== 1536) {
        throw new Error(
          `Invalid embedding dimension: expected 1536, got ${result.embedding?.length ?? 0}`,
        );
      }

      const vectorStr = `[${result.embedding.join(",")}]`;

      await this.prisma.$executeRawUnsafe(
        `UPDATE contact_memory_items
         SET embedding = $1::vector,
             "embeddingStatus" = 'READY',
             "embeddingModel" = $2,
             "embeddingVersion" = $3,
             "embeddedAt" = $4,
             "contentHash" = $5,
             "embeddingProcessingAt" = NULL,
             "embeddingError" = NULL
         WHERE id = $6 AND "companyId" = $7`,
        vectorStr,
        result.model,
        targetVersion,
        new Date(),
        contentHash,
        id,
        companyId,
      );
      this.logger.log(`Successfully vectorized memory ${id} of company ${companyId}`);
      return true;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to generate embedding for memory ${id}: ${err.message}`, err.stack);
      await this.prisma.contactMemoryItem.update({
        where: { id },
        data: {
          embeddingStatus: "ERROR",
          embeddingError: err.message ?? "Unknown embedding error",
          embeddingProcessingAt: null,
        },
      });
      throw err;
    }
  }

  async claimMemoryItemForProcessing(
    id: string,
    companyId: string,
    targetVersion = EMBEDDING_VERSION,
  ): Promise<boolean> {
    const now = new Date();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await this.prisma.contactMemoryItem.updateMany({
      where: {
        id,
        companyId,
        deletedAt: null,
        OR: [
          { embeddingStatus: null },
          { embeddingStatus: "PENDING" },
          { embeddingStatus: "ERROR" },
          {
            embeddingStatus: "READY",
            OR: [
              { embeddingVersion: null },
              { embeddingVersion: { not: targetVersion } },
            ],
          },
          {
            embeddingStatus: "PROCESSING",
            OR: [
              { embeddingProcessingAt: null },
              { embeddingProcessingAt: { lt: fiveMinutesAgo } },
            ],
          },
        ],
      },
      data: {
        embeddingStatus: "PROCESSING",
        embeddingProcessingAt: now,
      },
    });

    return result.count === 1;
  }

  async searchSemanticMemories(input: {
    companyId: string;
    profileId: string;
    query: string;
    threshold?: number;
    maxCandidates?: number;
    assistantId?: string;
    provider?: string;
  }) {
    const normalizedQuery = input.query.trim();
    if (!normalizedQuery) {
      return [];
    }

    const threshold = input.threshold ?? 0.7;
    const maxCandidates = input.maxCandidates ?? 20;

    let embedding: number[] | null = null;
    let cacheHit = false;

    // Resolve default config for model/version (fallback text-embedding-3-small)
    const assistantId = input.assistantId ?? "global";
    const provider = input.provider ?? "openai";
    const model = "text-embedding-3-small";
    const version = EMBEDDING_VERSION;
    const cacheKey = `embedding:${input.companyId}:${assistantId}:${provider}:${model}:${version}:${generateContentHash(normalizedQuery.toLowerCase())}`;

    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<number[]>(cacheKey);
        if (cached) {
          embedding = cached;
          cacheHit = true;
          this.logger.debug(`Cache HIT for query embedding: ${cacheKey}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to read from cache: ${err.message}`);
      }
    }

    if (!embedding) {
      const embedResult = await this.aiService.generateEmbedding({
        text: normalizedQuery,
        companyId: input.companyId,
        model,
      });
      embedding = embedResult.embedding;

      if (this.cacheService) {
        try {
          await this.cacheService.set(cacheKey, embedding, 3600); // 1 hour TTL
          this.logger.debug(`Cache SET for query embedding: ${cacheKey}`);
        } catch (err: any) {
          this.logger.warn(`Failed to write to cache: ${err.message}`);
        }
      }
    }

    const now = new Date();
    const queryVectorStr = `[${embedding.join(",")}]`;

    const results = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "profileId", "companyId", category, key, value, "valueJson", confidence, "sourceType", "sourceConversationId", "sourceMessageId", "expiresAt", "lastSeenAt", active, "deletedAt", "usageCount", "lastUsedAt", "createdAt", "updatedAt",
              (1 - (embedding <=> $1::vector)) as similarity
       FROM contact_memory_items
       WHERE "companyId" = $2
         AND "profileId" = $3
         AND active = true
         AND "deletedAt" IS NULL
         AND ("expiresAt" IS NULL OR "expiresAt" > $4)
         AND "embeddingStatus" = 'READY'
         AND embedding IS NOT NULL
         AND (1 - (embedding <=> $1::vector)) >= $5
       ORDER BY similarity DESC
       LIMIT $6`,
      queryVectorStr,
      input.companyId,
      input.profileId,
      now,
      threshold,
      maxCandidates,
    );

    return results.map((row) => ({
      id: row.id,
      profileId: row.profileId,
      companyId: row.companyId,
      category: row.category,
      key: row.key,
      value: row.value,
      valueJson: row.valueJson,
      confidence: row.confidence,
      sourceType: row.sourceType,
      sourceConversationId: row.sourceConversationId,
      sourceMessageId: row.sourceMessageId,
      expiresAt: row.expiresAt,
      lastSeenAt: row.lastSeenAt,
      active: row.active,
      deletedAt: row.deletedAt,
      usageCount: row.usageCount,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      similarity: Number(row.similarity),
      cacheHit,
    }));
  }

  async reindexMemories(input: {
    companyId: string;
    assistantId?: string;
    memoryId?: string;
    status?: string;
    version?: string;
  }) {
    const start = Date.now();
    let processed = 0;
    let successes = 0;
    let failures = 0;
    let ignored = 0;
    const maxExecutionLimit = 50;
    const targetVersion = input.version ?? EMBEDDING_VERSION;

    // Validate that the assistant belongs to the company (if provided)
    if (input.assistantId) {
      const assistant = await this.prisma.assistant.findFirst({
        where: { id: input.assistantId, companyId: input.companyId },
      });
      if (!assistant) {
        throw new BadRequestException("Assistant does not belong to this company");
      }
    }

    const whereClause: Prisma.ContactMemoryItemWhereInput = {
      companyId: input.companyId,
      deletedAt: null,
    };

    if (input.memoryId) {
      whereClause.id = input.memoryId;
    }

    if (input.assistantId) {
      whereClause.profile = { assistantId: input.assistantId };
    }

    if (input.status) {
      if (input.status === "OUTDATED") {
        whereClause.OR = [
          { embeddingVersion: { not: targetVersion } },
          { embeddingVersion: null },
          { embeddingStatus: { not: "READY" } },
        ];
      } else if (input.status === "MISSING") {
        whereClause.OR = [{ embeddingStatus: null }, { embeddingStatus: "PENDING" }];
      } else {
        whereClause.embeddingStatus = input.status;
      }
    }

    // `version` represents the target/current embedding version used to locate outdated items.
    if (input.version && input.status !== "OUTDATED") {
      whereClause.OR = [{ embeddingVersion: { not: targetVersion } }, { embeddingVersion: null }];
    }

    // Pull items to process up to maxExecutionLimit
    const items = await this.prisma.contactMemoryItem.findMany({
      where: whereClause,
      take: maxExecutionLimit,
      orderBy: { id: "asc" },
    });

    for (const item of items) {
      processed++;
      try {
        const vectorized = await this.vectorizeMemoryItem(item.id, input.companyId, targetVersion);
        if (vectorized) {
          successes++;
        } else {
          ignored++;
        }
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        failures++;
        this.logger.error(`Reindexing memory ${item.id} failed: ${err.message}`);
      }
    }

    const durationMs = Date.now() - start;
    return {
      processed,
      successes,
      failures,
      ignored,
      durationMs,
    };
  }
}
