import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  ContactMemoryCategory,
  ContactMemoryEventType,
  ContactMemorySourceType,
  ConversationChannelType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

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
export class ContactMemoriesService {
  private readonly logger = new Logger(ContactMemoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  private buildProfileFallbackWhere(input: FindOrCreateProfileInput): Prisma.ContactMemoryProfileWhereInput {
    const phone = normalizePhone(input.phoneNormalized);
    const scopeAssistantId = input.sharedAcrossAssistants === false ? input.assistantId ?? null : null;
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

  async findOrCreateProfile(input: FindOrCreateProfileInput) {
    const identityKey = this.buildIdentityKey(input);
    const displayName = sanitizeProfileLabel(input.displayName);
    const externalAccountId = sanitizeProfileLabel(input.externalAccountId);
    const externalContactId = sanitizeProfileLabel(input.externalContactId);
    const externalInboxId = sanitizeProfileLabel(input.externalInboxId);
    const chatwootContactId = sanitizeProfileLabel(input.chatwootContactId);
    const phoneNormalized = normalizePhone(input.phoneNormalized);
    const scopedAssistantId =
      input.sharedAcrossAssistants === false ? input.assistantId ?? null : null;

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

    return this.prisma.contactMemoryItem.findMany({
      where: {
        profileId: input.profileId,
        companyId: input.companyId,
        deletedAt: null,
        active: true,
        confidence: { gte: threshold },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        ...(input.categories && input.categories.length > 0 ? { category: { in: input.categories } } : {}),
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

    return this.prisma.$transaction(async (tx) => {
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
        const sameMessage =
          input.sourceMessageId &&
          existing.sourceMessageId === input.sourceMessageId &&
          existing.sourceType === input.sourceType;

        if (sameMessage && existing.value === value) {
          return existing;
        }

        if (existing.value === value) {
          const shouldReactivate = !existing.active || existing.deletedAt !== null;
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

          if (shouldReactivate) {
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
          }

          return updated;
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
    return this.prisma.$transaction(async (tx) => {
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
            input.confidence !== undefined ? Math.min(Math.max(input.confidence, 0), 1) : item.confidence,
          expiresAt: input.expiresAt !== undefined ? input.expiresAt : item.expiresAt,
          active: nextActive,
          deletedAt: nextDeletedAt,
          lastSeenAt: new Date(),
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

  async getProfileWithItems(input: { profileId: string; companyId: string }) {
    return this.prisma.contactMemoryProfile.findFirst({
      where: { id: input.profileId, companyId: input.companyId },
      include: {
        items: {
          orderBy: [{ deletedAt: "asc" }, { category: "asc" }, { key: "asc" }],
        },
      },
    });
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

  async updateProfileSummary(input: { profileId: string; companyId: string; summary: string | null }) {
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
}
