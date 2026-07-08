import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

export type AssistantRuntimeLogListItem = {
  id: string;
  assistantId: string | null;
  assistantName: string | null;
  conversationId: string | null;
  conversationSource: string | null;
  conversationChannelType: string | null;
  mode: string;
  status: string;
  provider: string | null;
  model: string | null;
  configurationSource: string | null;
  fallback: boolean;
  fallbackReason: string | null;
  outcome: string | null;
  durationMs: number | null;
  providerStatus: number | null;
  providerErrorCode: string | null;
  knowledgeCount: number | null;
  historyMessagesUsed: number | null;
  historyLimit: number | null;
  initialMessageIncluded: boolean;
  instructionsIncluded: boolean;
  createdAt: Date;
};

export type AssistantRuntimeLogDetail = AssistantRuntimeLogListItem & {
  userMessageId: string | null;
  assistantMessageId: string | null;
  providerErrorType: string | null;
  providerErrorMessage: string | null;
};

export type FindAllAssistantRuntimeLogsResponse = {
  items: AssistantRuntimeLogListItem[];
};

export type FindOneAssistantRuntimeLogResponse = AssistantRuntimeLogDetail;

type RuntimeLogsQuery = {
  assistantId?: string;
  conversationId?: string;
  mode?: string;
  status?: string;
  fallback?: string;
  limit?: string;
};

const MAX_LOG_LIMIT = 100;
const DEFAULT_LOG_LIMIT = 50;

const assistantRuntimeLogListSelect = {
  id: true,
  assistantId: true,
  conversationId: true,
  mode: true,
  status: true,
  provider: true,
  model: true,
  configurationSource: true,
  fallback: true,
  fallbackReason: true,
  outcome: true,
  durationMs: true,
  providerStatus: true,
  providerErrorCode: true,
  knowledgeCount: true,
  historyMessagesUsed: true,
  historyLimit: true,
  initialMessageIncluded: true,
  instructionsIncluded: true,
  createdAt: true,
  assistant: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.AssistantRuntimeLogSelect;

const assistantRuntimeLogDetailSelect = {
  ...assistantRuntimeLogListSelect,
  userMessageId: true,
  assistantMessageId: true,
  providerErrorType: true,
  providerErrorMessage: true,
} satisfies Prisma.AssistantRuntimeLogSelect;

type AssistantRuntimeLogListRecord = Prisma.AssistantRuntimeLogGetPayload<{
  select: typeof assistantRuntimeLogListSelect;
}>;

type AssistantRuntimeLogDetailRecord = Prisma.AssistantRuntimeLogGetPayload<{
  select: typeof assistantRuntimeLogDetailSelect;
}>;

@Injectable()
export class AssistantRuntimeLogsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertTenantContext(input: { user: AuthenticatedUser; tenant: RequestTenant }): void {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }
  }

  async findAll(input: {
    user: AuthenticatedUser;
    tenant: RequestTenant;
    query: RuntimeLogsQuery;
  }): Promise<FindAllAssistantRuntimeLogsResponse> {
    this.assertTenantContext(input);

    const items = await this.prisma.assistantRuntimeLog.findMany({
      where: this.buildWhere(input.tenant.companyId, input.query),
      select: assistantRuntimeLogListSelect,
      orderBy: {
        createdAt: "desc",
      },
      take: this.resolveLimit(input.query.limit),
    });

    const conversationMap = await this.buildConversationMetadataMap(
      input.tenant.companyId,
      items.map((item) => item.conversationId),
    );

    return {
      items: items.map((item) => toListItem(item, conversationMap.get(item.conversationId ?? "") ?? null)),
    };
  }

  async findOne(input: {
    id: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindOneAssistantRuntimeLogResponse> {
    this.assertTenantContext(input);

    const item = await this.prisma.assistantRuntimeLog.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: assistantRuntimeLogDetailSelect,
    });

    if (!item) {
      throw new NotFoundException("AI runtime log not found.");
    }

    const conversationMap = await this.buildConversationMetadataMap(input.tenant.companyId, [
      item.conversationId,
    ]);
    return toDetail(item, conversationMap.get(item.conversationId ?? "") ?? null);
  }

  private async buildConversationMetadataMap(
    companyId: string,
    conversationIds: Array<string | null>,
  ): Promise<
    Map<
      string,
      {
        source: string;
        channelType: string;
      }
    >
  > {
    const uniqueConversationIds = [...new Set(conversationIds.filter((value): value is string => Boolean(value)))];
    if (uniqueConversationIds.length === 0) {
      return new Map();
    }

    const conversations = await this.prisma.assistantConversation.findMany({
      where: {
        companyId,
        id: { in: uniqueConversationIds },
      },
      select: {
        id: true,
        source: true,
        channelType: true,
      },
    });

    return new Map(
      conversations.map((conversation) => [
        conversation.id,
        {
          source: conversation.source,
          channelType: conversation.channelType,
        },
      ]),
    );
  }

  private buildWhere(
    companyId: string,
    query: RuntimeLogsQuery,
  ): Prisma.AssistantRuntimeLogWhereInput {
    return {
      companyId,
      ...(query.assistantId ? { assistantId: query.assistantId } : {}),
      ...(query.conversationId ? { conversationId: query.conversationId } : {}),
      ...(query.mode ? { mode: query.mode } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...this.buildFallbackFilter(query.fallback),
    };
  }

  private buildFallbackFilter(
    value: string | undefined,
  ): Pick<Prisma.AssistantRuntimeLogWhereInput, "fallback"> {
    if (value === "true") {
      return { fallback: true };
    }

    if (value === "false") {
      return { fallback: false };
    }

    return {};
  }

  private resolveLimit(value: string | undefined): number {
    if (!value) {
      return DEFAULT_LOG_LIMIT;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return DEFAULT_LOG_LIMIT;
    }

    return Math.min(parsed, MAX_LOG_LIMIT);
  }
}

function toListItem(
  record: AssistantRuntimeLogListRecord,
  conversationMetadata: { source: string; channelType: string } | null,
): AssistantRuntimeLogListItem {
  return {
    id: record.id,
    assistantId: record.assistantId,
    assistantName: record.assistant?.name ?? null,
    conversationId: record.conversationId,
    conversationSource: conversationMetadata?.source ?? null,
    conversationChannelType: conversationMetadata?.channelType ?? null,
    mode: record.mode,
    status: record.status,
    provider: record.provider,
    model: record.model,
    configurationSource: record.configurationSource,
    fallback: record.fallback,
    fallbackReason: record.fallbackReason,
    outcome: record.outcome,
    durationMs: record.durationMs,
    providerStatus: record.providerStatus,
    providerErrorCode: record.providerErrorCode,
    knowledgeCount: record.knowledgeCount,
    historyMessagesUsed: record.historyMessagesUsed,
    historyLimit: record.historyLimit,
    initialMessageIncluded: record.initialMessageIncluded,
    instructionsIncluded: record.instructionsIncluded,
    createdAt: record.createdAt,
  };
}

function toDetail(
  record: AssistantRuntimeLogDetailRecord,
  conversationMetadata: { source: string; channelType: string } | null,
): AssistantRuntimeLogDetail {
  return {
    ...toListItem(record, conversationMetadata),
    userMessageId: record.userMessageId,
    assistantMessageId: record.assistantMessageId,
    providerErrorType: record.providerErrorType,
    providerErrorMessage: record.providerErrorMessage,
  };
}
