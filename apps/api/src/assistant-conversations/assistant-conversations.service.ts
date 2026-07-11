import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { ConversationChannelType, ConversationSource, Prisma, Status } from "@prisma/client";
import type { AiResolvedRuntimeConfig } from "../ai/ai.types";
import { AiService } from "../ai/ai.service";
import { AttachmentInterpreterService } from "../attachments/attachment-interpreter.service";
import type { AttachmentInterpreterInput } from "../attachments/attachment-interpreter.types";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { ChatwootInboxConfigService } from "../chatwoot/chatwoot-inbox-config.service";
import { PrismaService } from "../database/prisma.service";
import { CacheService } from "../cache/cache.service";
import {
  persistInboundAttachment,
  type InboundAttachmentInput,
  type InboundAttachmentRecord,
  type InboundContactInput,
  type InboundLocationInput,
  type InboundMessageSource,
} from "./inbound-message";
import {
  buildDeterministicAssistantResponse,
  toAssistantRuntimeSources,
  type AssistantRuntimeSource,
} from "../assistants/assistant-runtime";
import {
  buildOfficialBusinessContext,
  buildOutsideBusinessHoursReply,
  type OfficialBusinessContext,
} from "../assistants/official-business-context";
import { type CreateAssistantConversationDto } from "./dto/create-assistant-conversation.dto";
import { type SendAssistantConversationMessageDto } from "./dto/send-assistant-conversation-message.dto";
import { CalendarToolsService } from "../apps/calendar-tools.service";
import { ContactMemoriesService } from "../contact-memories/contact-memories.service";
import { ContactMemoriesExtractionService } from "../contact-memories/contact-memories-extraction.service";
import { AssistantKnowledgeRetrievalService } from "../assistant-knowledge/assistant-knowledge-retrieval.service";
import {
  isMultiNeedTriageMessage,
  isTriageResponseValid,
  PROMPT_COMPILER_VERSION,
  PromptCompilerService,
  TriageState,
} from "../prompt-compiler/prompt-compiler.service";
import { modelSupportsTemperature } from "../ai/ai-runner";
import { IntentRouterService } from "../intent-router/intent-router.service";
import {
  AssistantSecurityRulesService,
  type AssistantSecurityRuleItem,
} from "../assistant-security-rules/assistant-security-rules.service";
import {
  filterResourcesByCalendarToolScope,
  hasCalendarToolScope,
  matchesCalendarToolScope,
  normalizeAssistantFlowToolContext,
  type CalendarToolScope,
  type ScopedCalendarResource,
} from "../apps/google-calendar/google-calendar-tool-scope";
import { secureFetch, validateJsonSchema, validateJsonDepth } from "../common/security";
import { decryptData, getOrMigrateWebhookCredentials } from "../common/encryption";

export type AssistantConversationListItem = {
  id: string;
  title: string | null;
  source: ConversationSource;
  channelType: ConversationChannelType;
  sourceProvider?: string | null;
  externalConversationId?: string | null;
  externalAccountId?: string | null;
  externalContactId?: string | null;
  externalChannelId?: string | null;
  externalInboxId?: string | null;
  pausedByHuman?: boolean;
  lastMessageAt?: Date | null;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
};

export type FindAllAssistantConversationsResponse = {
  items: AssistantConversationListItem[];
};

export type CreateAssistantConversationResponse = AssistantConversationListItem;

export type AssistantConversationMessageItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string | null;
  messageType?: string | null;
  externalMessageId?: string | null;
  attachments?: InboundAttachmentRecord[];
  sources?: AssistantRuntimeSource[];
  mode?: string;
  contextVersion?: number;
  createdAt: Date;
};

export type AssistantConversationRuntime = {
  mode: "ai-runtime" | "deterministic-runtime" | "ai-runtime-rag" | "flow-bypass";
  assistant: {
    id: string;
    name: string;
  };
  provider?: string;
  model?: string;
  modelSource?: "assistant" | "runtime-config" | "not-configured";
  temperature: number;
  temperatureSource: "assistant" | "default";
  configurationSource: AiResolvedRuntimeConfig["source"];
  fallback: boolean;
  outcome: "success" | "fallback" | "needs_human" | "unknown" | "handoff";
  summary: string;
  context: {
    requestId?: string | null;
    correlationId?: string | null;
    historyMessagesUsed: number;
    historyLimit: number;
    initialMessageIncluded: boolean;
    instructionsIncluded: boolean;
    safetyInstructionIncluded?: boolean;
    activeSecurityRulesCount?: number;
    detectedIntent?: string | null;
    selectedFlowId?: string | null;
    selectedFlowName?: string | null;
    intentConfidence?: number | null;
    finalAction?: string | null;
    llmSkipped?: boolean | null;
    handoffPending?: boolean | null;
    autoRespond?: boolean | null;
    calendarScopeApplied?: boolean | null;
    calendarScope?: CalendarToolScope | null;
    toolArgsOverridden?: boolean | null;
    resourceScopeApplied?: boolean | null;
    blockedByToolScope?: boolean | null;
    blockReason?: string | null;
    officialTimezoneUsed?: string | null;
    officialLocalDate?: string | null;
    officialLocalTime?: string | null;
    officialOpenNow?: boolean | null;
    officialOnBreak?: boolean | null;
    officialDataSource?: string | null;
    outsideBusinessHours?: boolean | null;
    outsideBusinessHoursPolicy?: string | null;
    promptVersion?: string | null;
    promptHash?: string | null;
    promptSections?: string[];
    behaviorId?: string | null;
    behaviorUpdatedAt?: Date | null;
    assistantUpdatedAt?: Date | null;
    behaviorResponseStyle?: string | null;
    splitResponseStyle?: string | null;
    temperature?: number | null;
    temperatureParameterApplied?: boolean | null;
    triageMode?: boolean;
    triageValidationPassed?: boolean;
    triageAttemptCount?: number;
    responseMode?: string;
    outboundBlockCountPlanned?: number;
    outboundBlockCountSent?: number;
    outboundBlockCount?: number;
    triageStateActive?: boolean;
    triageRequestedDetail?: string;
    triageResolved?: boolean;
    triageContinuation?: boolean;
    schedulingExplicitlyRequested?: boolean;
    validationFailureReason?: string;
    knowledgeLimit?: number;
    knowledgeChunkCount?: number;
    knowledgeChunkIds?: string[];
  };
  logId?: string;
  reason?:
    | "ai-runtime-disabled"
    | "ai-provider-not-configured"
    | "ai-model-not-configured"
    | "ai-provider-auth-error"
    | "ai-provider-quota-error"
    | "ai-provider-error"
    | "conversation-reset-executed"
    | "conversation-reset-executed-duplicate";
  warning?: string;
  ragData?: any;
};

export type FindConversationMessagesResponse = {
  items: AssistantConversationMessageItem[];
};

export type SendAssistantConversationMessageResponse = {
  conversationId: string;
  userMessage: AssistantConversationMessageItem;
  assistantMessage: AssistantConversationMessageItem;
  runtime: AssistantConversationRuntime;
};

export function splitNaturalResponseBlocks(content: string): string[] {
  const normalized = content.trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const containsListStructure = lines.some((line) =>
    /^\s*(?:[-*•]|\d+[.)])\s+/.test(line),
  );
  const containsMarkdownHeading = lines.some((line) =>
    /^\s*(?:#{1,6}\s+|\*\*[^*]{2,80}\*\*\s*:?)\s*$/.test(line),
  );

  // Keep provider-generated catalogs in one outbound instead of fragmenting
  // every item into an independent WhatsApp message.
  if (containsListStructure || containsMarkdownHeading) return [normalized];

  const blocks: string[] = [];
  for (const rawBlock of normalized.split(/\n\n+/)) {
    const block = rawBlock.trim();
    if (!block) continue;
    if (blocks.length > 0 && block.length < 50) {
      blocks[blocks.length - 1] += `\n\n${block}`;
    } else {
      blocks.push(block);
    }
  }
  return blocks;
}

function hashPromptMessages(messages: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(messages)).digest("hex");
}

function getPromptSectionLabels(messages: Array<{ role: string; content?: unknown }>): string[] {
  return messages
    .filter((message) => message.role === "system")
    .map((message) => String(message.content ?? "").split("\n", 1)[0])
    .map((firstLine) => {
      if (firstLine.startsWith("REGRAS DE SEGURANÇA")) return "security";
      if (firstLine.startsWith("IDENTIDADE E ESCOPO")) return "identity";
      if (firstLine.startsWith("INSTRUÇÕES GERAIS")) return "assistant-instructions";
      if (firstLine.startsWith("POLÍTICA DE CONVERSA")) return "behavior";
      if (firstLine.startsWith("EXPRESSÕES A EVITAR")) return "avoid-phrases";
      if (firstLine.startsWith("CONTEXTO OFICIAL")) return "official-context";
      if (firstLine.startsWith("INSTRUÇÕES DO SISTEMA DE RESERVAS")) return "calendar";
      if (firstLine.startsWith("MEMÓRIA")) return "memory";
      if (firstLine.startsWith("MENSAGEM INICIAL")) return "initial-message";
      if (firstLine.startsWith("INSTRUÇÕES DO FLUXO")) return "flow";
      if (firstLine.startsWith("BASE DE CONHECIMENTO")) return "knowledge";
      if (firstLine.startsWith("HISTÓRICO DA CONVERSA")) return "history-policy";
      return "system-context";
    });
}

const assistantConversationSafeSelect = {
  id: true,
  companyId: true,
  title: true,
  source: true,
  channelType: true,
  sourceProvider: true,
  externalConversationId: true,
  externalAccountId: true,
  externalContactId: true,
  externalChannelId: true,
  externalInboxId: true,
  pausedByHuman: true,
  lastMessageAt: true,
  status: true,
  currentContextVersion: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssistantConversationSelect;

type AssistantConversationSafeRecord = Prisma.AssistantConversationGetPayload<{
  select: typeof assistantConversationSafeSelect;
}>;

const assistantConversationMessageSafeSelect = {
  id: true,
  role: true,
  content: true,
  source: true,
  messageType: true,
  externalMessageId: true,
  externalPayload: true,
  attachments: true,
  sources: true,
  mode: true,
  contextVersion: true,
  createdAt: true,
} satisfies Prisma.AssistantConversationMessageSelect;

type AssistantConversationMessageSafeRecord = Prisma.AssistantConversationMessageGetPayload<{
  select: typeof assistantConversationMessageSafeSelect;
}>;

const assistantConversationAssistantSelect = {
  id: true,
  companyId: true,
  name: true,
  initialMessage: true,
  status: true,
} satisfies Prisma.AssistantSelect;

type AssistantConversationAssistantRecord = Prisma.AssistantGetPayload<{
  select: typeof assistantConversationAssistantSelect;
}>;

const assistantConversationRuntimeAssistantSelect = {
  id: true,
  companyId: true,
  name: true,
  description: true,
  businessAddress: true,
  businessCityRegion: true,
  businessCity: true,
  businessState: true,
  businessPostalCode: true,
  businessPhone: true,
  businessWhatsapp: true,
  businessWhatsappSupport: true,
  websiteUrl: true,
  timezone: true,
  googleMapsUrl: true,
  status: true,
  updatedAt: true,
  weeklySchedule: true,
  aiAlwaysAvailable: true,
  initialMessage: true,
  instructions: true,
  model: true,
  temperature: true,
  ragEnabled: true,
  conversationResetEnabled: true,
  conversationResetKeywords: true,
  conversationResetConfirmationMessage: true,
  conversationResetPreserveMemories: true,
  conversationResetSendInitialMessage: true,
  fallbackMessage: true,
  safetyInstruction: true,
  avoidPhrases: true,
  splitResponseEnabled: true,
  splitResponseStyle: true,
  memoryEnabled: true,
  memoryPrePromptEnabled: true,
  memoryExtractionEnabled: true,
  memoryAllowedCategories: true,
  memoryConfidenceThreshold: true,
  memoryTempDefaultDays: true,
  memorySharedAcrossAssistants: true,
  semanticMemoryEnabled: true,
  semanticMemoryThreshold: true,
  semanticMemoryMaxCandidates: true,
  semanticMemoryMaxResults: true,
  latitude: true,
  longitude: true,
  behavior: true,
  flows: true,
  company: {
    select: {
      name: true,
      timezone: true,
    },
  },
} satisfies Prisma.AssistantSelect;

type AssistantConversationRuntimeAssistantRecord = Prisma.AssistantGetPayload<{
  select: typeof assistantConversationRuntimeAssistantSelect;
}>;

const assistantConversationKnowledgeSelect = {
  id: true,
  title: true,
  content: true,
} satisfies Prisma.AssistantKnowledgeSelect;

const calendarScopeResourceSelect = {
  id: true,
  calendarId: true,
  sportType: true,
  resourceType: true,
  isCovered: true,
  categoryRef: {
    select: {
      name: true,
      slug: true,
    },
  },
  resourceTypeRef: {
    select: {
      name: true,
      slug: true,
    },
  },
  attributeRef: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.GoogleCalendarResourceSelect;

const calendarScopeBookingSelect = {
  id: true,
  resourceId: true,
  resource: {
    select: calendarScopeResourceSelect,
  },
} satisfies Prisma.GoogleCalendarBookingSelect;

const MAX_RUNTIME_HISTORY_MESSAGES = 10;
const MAX_RUNTIME_LOG_PROVIDER_ERROR_MESSAGE_LENGTH = 500;
const DEFAULT_MANUAL_TEST_TITLE_PREFIX = "Teste manual";

type RuntimeLogProviderErrorFields = {
  providerStatus?: number;
  providerErrorType?: string;
  providerErrorCode?: string;
  providerErrorMessage?: string;
};

type PreparedToolExecution = {
  args: Record<string, any>;
  metadata: {
    calendarScopeApplied: boolean;
    calendarScope: CalendarToolScope | null;
    toolArgsOverridden: boolean;
    resourceScopeApplied: boolean;
    blockedByToolScope: boolean;
    blockReason?: string;
  };
};

type ScopedBookingRecord = {
  id: string;
  resourceId: string;
  resource: ScopedCalendarResource;
};

function toConversationItem(
  conversation: AssistantConversationSafeRecord,
): AssistantConversationListItem {
  return {
    id: conversation.id,
    title: conversation.title,
    source: conversation.source,
    channelType: conversation.channelType,
    sourceProvider: conversation.sourceProvider,
    externalConversationId: conversation.externalConversationId,
    externalAccountId: conversation.externalAccountId,
    externalContactId: conversation.externalContactId,
    externalChannelId: conversation.externalChannelId,
    externalInboxId: conversation.externalInboxId,
    pausedByHuman: conversation.pausedByHuman,
    lastMessageAt: conversation.lastMessageAt,
    status: conversation.status,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function formatManualTestConversationTitle(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${DEFAULT_MANUAL_TEST_TITLE_PREFIX} - ${day}/${month}/${year} ${hours}:${minutes}`;
}

function toConversationMessageItem(
  message: AssistantConversationMessageSafeRecord,
): AssistantConversationMessageItem {
  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    content: message.content,
    ...(message.source !== null ? { source: message.source } : {}),
    ...(message.messageType !== null ? { messageType: message.messageType } : {}),
    ...(message.externalMessageId !== null ? { externalMessageId: message.externalMessageId } : {}),
    ...(message.attachments !== null
      ? { attachments: message.attachments as InboundAttachmentRecord[] }
      : {}),
    ...(message.sources !== null ? { sources: toAssistantRuntimeSources(message.sources) } : {}),
    ...(message.mode !== null ? { mode: message.mode } : {}),
    ...(message.contextVersion !== undefined && message.contextVersion !== null
      ? { contextVersion: message.contextVersion }
      : {}),
    createdAt: message.createdAt,
  };
}

@Injectable()
export class AssistantConversationsService {
  private readonly logger = new Logger(AssistantConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly attachmentInterpreterService: AttachmentInterpreterService,
    private readonly chatwootInboxConfigService: ChatwootInboxConfigService,
    private readonly calendarToolsService?: CalendarToolsService,
    private readonly assistantKnowledgeRetrievalService?: AssistantKnowledgeRetrievalService,
    private readonly promptCompilerService?: PromptCompilerService,
    private readonly intentRouterService?: IntentRouterService,
    private readonly assistantSecurityRulesService?: AssistantSecurityRulesService,
    private readonly contactMemoriesService?: ContactMemoriesService,
    private readonly contactMemoriesExtractionService?: ContactMemoriesExtractionService,
    private readonly cacheService?: CacheService,
  ) {}

  private assertTenantContext(input: { user: AuthenticatedUser; tenant: RequestTenant }): void {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }
  }

  private logOfficialBusinessContext(input: {
    assistantId: string;
    companyId: string;
    context: OfficialBusinessContext;
  }): void {
    this.logger.log(
      [
        "[OfficialBusinessContext]",
        `companyId=${input.companyId}`,
        `assistantId=${input.assistantId}`,
        `timezone=${input.context.timezone}`,
        `localDate=${input.context.businessStatus.localDate}`,
        `localTime=${input.context.businessStatus.localTime}`,
        `status=${
          input.context.businessStatus.isOnBreak
            ? "break"
            : input.context.businessStatus.isOpenNow
              ? "open"
              : "closed"
        }`,
        "businessHoursSource=structured-assistant-company",
      ].join(" "),
    );
  }

  private normalizeConversationSource(
    value: CreateAssistantConversationDto["source"] | null | undefined,
  ): ConversationSource {
    return value === "SMOKE" ? ConversationSource.SMOKE : ConversationSource.MANUAL_TEST;
  }

  private resolveConversationChannelType(input: {
    source: ConversationSource;
    sourceProvider?: string | null;
    externalChannelId?: string | null;
    externalInboxId?: string | null;
    externalSenderIdentifier?: string | null;
    externalSenderPhone?: string | null;
  }): ConversationChannelType {
    if (input.source !== ConversationSource.CHATWOOT) {
      return ConversationChannelType.UNKNOWN;
    }

    const haystack = [
      input.sourceProvider,
      input.externalChannelId,
      input.externalInboxId,
      input.externalSenderIdentifier,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .toLowerCase();

    if (input.externalSenderPhone?.trim()) {
      return ConversationChannelType.WHATSAPP;
    }

    if (haystack.includes("instagram")) {
      return ConversationChannelType.INSTAGRAM;
    }

    if (haystack.includes("webchat") || haystack.includes("web chat")) {
      return ConversationChannelType.WEBCHAT;
    }

    if (haystack.includes("whatsapp") || haystack.includes("whats")) {
      return ConversationChannelType.WHATSAPP;
    }

    return ConversationChannelType.UNKNOWN;
  }

  private async resolveActiveAssistantOrThrow(input: {
    assistantId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AssistantConversationAssistantRecord> {
    this.assertTenantContext(input);

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantConversationAssistantSelect,
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    if (assistant.status !== Status.ACTIVE) {
      throw new BadRequestException("Assistant is inactive.");
    }

    return assistant;
  }

  private async resolveActiveAssistantByIdOrThrow(
    assistantId: string,
  ): Promise<{ id: string; companyId: string; name: string; status: Status }> {
    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: assistantId,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        status: true,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    if (assistant.status !== Status.ACTIVE) {
      throw new BadRequestException("Assistant is inactive.");
    }

    return assistant;
  }

  private async resolveRuntimeAssistantOrThrow(input: {
    assistantId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AssistantConversationRuntimeAssistantRecord> {
    this.assertTenantContext(input);

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantConversationRuntimeAssistantSelect,
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    if (assistant.status !== Status.ACTIVE) {
      throw new BadRequestException("Assistant is inactive.");
    }

    return assistant;
  }

  private async resolveConversationOrThrow(input: {
    assistantId: string;
    conversationId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<AssistantConversationSafeRecord> {
    await this.resolveActiveAssistantOrThrow({
      assistantId: input.assistantId,
      user: input.user,
      tenant: input.tenant,
    });

    const conversation = await this.prisma.assistantConversation.findFirst({
      where: {
        id: input.conversationId,
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
      },
      select: assistantConversationSafeSelect,
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    return conversation;
  }

  async ensureConversationFromInboundMessage(input: {
    assistantId: string;
    user?: AuthenticatedUser | null;
    tenant?: RequestTenant;
    createdByUserId?: string | null;
    sourceProvider: InboundMessageSource;
    externalConversationId: string;
    externalAccountId?: string | null;
    externalContactId?: string | null;
    externalChannelId?: string | null;
    externalInboxId?: string | null;
    externalSenderIdentifier?: string | null;
    externalSenderPhone?: string | null;
    title?: string | null;
  }): Promise<AssistantConversationSafeRecord> {
    const assistant = input.tenant
      ? await this.resolveActiveAssistantOrThrow({
          assistantId: input.assistantId,
          user:
            input.user ??
            ({
              id: input.createdByUserId ?? "system",
              companyId: input.tenant.companyId,
              primaryCompanyId: input.tenant.companyId,
              activeCompanyId: input.tenant.companyId,
              email: "system@cubo.local",
              name: "System",
              memberships: [input.tenant.companyId],
              roles: [],
              permissions: [],
            } as AuthenticatedUser),
          tenant: input.tenant,
        })
      : await this.resolveActiveAssistantByIdOrThrow(input.assistantId);

    if (input.user && input.tenant) {
      this.assertTenantContext({
        user: input.user,
        tenant: input.tenant,
      });
    }

    const existingConversation = await this.prisma.assistantConversation.findFirst({
      where: {
        assistantId: input.assistantId,
        companyId: input.tenant?.companyId ?? assistant.companyId,
        externalAccountId: input.externalAccountId ?? null,
        externalConversationId: input.externalConversationId,
      },
      select: assistantConversationSafeSelect,
    });

    if (existingConversation) {
      return existingConversation;
    }

    return this.prisma.assistantConversation.create({
      data: {
        companyId: input.tenant?.companyId ?? assistant.companyId,
        assistantId: assistant.id,
        userId: input.createdByUserId ?? null,
        title: input.title ?? null,
        source: ConversationSource.CHATWOOT,
        channelType: this.resolveConversationChannelType({
          source: ConversationSource.CHATWOOT,
          sourceProvider: input.sourceProvider,
          externalChannelId: input.externalChannelId ?? null,
          externalInboxId: input.externalInboxId ?? null,
          externalSenderIdentifier: input.externalSenderIdentifier ?? null,
          externalSenderPhone: input.externalSenderPhone ?? null,
        }),
        sourceProvider: input.sourceProvider,
        externalAccountId: input.externalAccountId ?? null,
        externalConversationId: input.externalConversationId,
        externalContactId: input.externalContactId ?? null,
        externalChannelId: input.externalChannelId ?? null,
        externalInboxId: input.externalInboxId ?? null,
        pausedByHuman: false,
        lastMessageAt: new Date(),
        status: Status.ACTIVE,
      },
      select: assistantConversationSafeSelect,
    });
  }

  async processPublicInboundMessage(input: {
    assistantId: string;
    sourceProvider: "chatwoot";
    dto: SendAssistantConversationMessageDto;
    conversationTitle?: string | null;
    externalAccountId?: string | null;
    externalConversationId: string;
    externalContactId?: string | null;
    externalChannelId?: string | null;
    externalInboxId?: string | null;
  }): Promise<SendAssistantConversationMessageResponse> {
    const assistant = await this.resolveActiveAssistantByIdOrThrow(input.assistantId);
    const tenant = { companyId: assistant.companyId } satisfies RequestTenant;
    const user = {
      id: `system_${input.sourceProvider}_${assistant.id}`,
      companyId: assistant.companyId,
      primaryCompanyId: assistant.companyId,
      activeCompanyId: assistant.companyId,
      email: `system-${input.sourceProvider}@cubo.local`,
      name: `System ${input.sourceProvider}`,
      memberships: [assistant.companyId],
      roles: [],
      permissions: [],
    } satisfies AuthenticatedUser;

    const conversation = await this.ensureConversationFromInboundMessage({
      assistantId: input.assistantId,
      createdByUserId: null,
      sourceProvider: input.sourceProvider,
      externalAccountId: input.externalAccountId ?? null,
      externalConversationId: input.externalConversationId,
      externalContactId: input.externalContactId,
      externalChannelId: input.externalChannelId,
      externalInboxId: input.externalInboxId,
      externalSenderIdentifier: input.dto.externalSenderIdentifier ?? null,
      externalSenderPhone: input.dto.externalSenderPhone ?? null,
      title: input.conversationTitle ?? null,
    });

    return this.sendMessage({
      assistantId: input.assistantId,
      conversationId: conversation.id,
      dto: input.dto,
      user,
      tenant,
    });
  }

  private resolveRuntimeModel(
    assistant: AssistantConversationRuntimeAssistantRecord,
    runtimeConfig: AiResolvedRuntimeConfig,
  ): {
    model: string;
    source: AssistantConversationRuntime["modelSource"];
  } {
    const assistantModel = assistant.model?.trim();
    if (assistantModel) {
      return {
        model: assistantModel,
        source: "assistant",
      };
    }

    if (runtimeConfig.model.trim().length > 0) {
      return {
        model: runtimeConfig.model.trim(),
        source: "runtime-config",
      };
    }

    return {
      model: "",
      source: "not-configured",
    };
  }

  private resolveRuntimeTemperature(
    assistant: AssistantConversationRuntimeAssistantRecord,
  ): number {
    if (
      typeof assistant.temperature === "number" &&
      assistant.temperature >= 0 &&
      assistant.temperature <= 2
    ) {
      return assistant.temperature;
    }

    return 0.2;
  }

  private resolveRuntimeTemperatureSource(
    assistant: AssistantConversationRuntimeAssistantRecord,
  ): AssistantConversationRuntime["temperatureSource"] {
    return typeof assistant.temperature === "number" &&
      assistant.temperature >= 0 &&
      assistant.temperature <= 2
      ? "assistant"
      : "default";
  }

  private buildRuntimeSummary(input: {
    question: string;
    mode: AssistantConversationRuntime["mode"];
    sourcesCount: number;
    outcome: AssistantConversationRuntime["outcome"];
    historyMessagesUsed: number;
  }): string {
    const modeLabel = input.mode === "ai-runtime" ? "IA real" : "determinístico";

    return [
      `Usuário perguntou: "${input.question}".`,
      `Assistente respondeu em modo: ${modeLabel}.`,
      `Histórico usado: ${input.historyMessagesUsed} mensagem(ns).`,
      `Fontes usadas: ${input.sourcesCount}.`,
      `Saída: ${input.outcome}.`,
    ].join(" ");
  }

  private buildDeterministicRuntimeWarning(
    reason: AssistantConversationRuntime["reason"],
  ): string | undefined {
    if (
      reason === "ai-provider-error" ||
      reason === "ai-provider-auth-error" ||
      reason === "ai-provider-quota-error"
    ) {
      return "IA real indisponível. Resposta gerada em modo determinístico.";
    }

    return undefined;
  }

  private resolveProviderFallbackReason(error: unknown): AssistantConversationRuntime["reason"] {
    if (!(error instanceof HttpException)) {
      return "ai-provider-error";
    }

    const response = error.getResponse();
    if (typeof response !== "object" || response === null || Array.isArray(response)) {
      return "ai-provider-error";
    }

    const providerStatus = (response as { providerStatus?: unknown }).providerStatus;
    if (providerStatus === 401 || providerStatus === 403) {
      return "ai-provider-auth-error";
    }

    if (providerStatus === 402 || providerStatus === 429) {
      return "ai-provider-quota-error";
    }

    return "ai-provider-error";
  }

  private extractProviderErrorLogFields(error: unknown): RuntimeLogProviderErrorFields {
    if (!(error instanceof HttpException)) {
      return {};
    }

    const response = error.getResponse();
    if (typeof response !== "object" || response === null || Array.isArray(response)) {
      return {};
    }

    const responseRecord = response as {
      providerStatus?: unknown;
      providerError?: unknown;
    };
    const providerError =
      typeof responseRecord.providerError === "object" &&
      responseRecord.providerError !== null &&
      !Array.isArray(responseRecord.providerError)
        ? (responseRecord.providerError as Record<string, unknown>)
        : undefined;

    return {
      ...(typeof responseRecord.providerStatus === "number"
        ? { providerStatus: responseRecord.providerStatus }
        : {}),
      ...this.readProviderErrorField(providerError, "type", "providerErrorType"),
      ...this.readProviderErrorField(providerError, "code", "providerErrorCode"),
      ...this.readProviderErrorField(providerError, "message", "providerErrorMessage"),
    };
  }

  private readProviderErrorField<
    TOutputKey extends "providerErrorType" | "providerErrorCode" | "providerErrorMessage",
  >(
    providerError: Record<string, unknown> | undefined,
    inputKey: "type" | "code" | "message",
    outputKey: TOutputKey,
  ): Partial<Record<TOutputKey, string>> {
    const value = providerError?.[inputKey];
    if (typeof value !== "string" || value.trim().length === 0) {
      return {};
    }

    return {
      [outputKey]: value.trim().slice(0, MAX_RUNTIME_LOG_PROVIDER_ERROR_MESSAGE_LENGTH),
    } as Partial<Record<TOutputKey, string>>;
  }

  private resolveRuntimeLogStatus(runtime: AssistantConversationRuntime): "success" | "fallback" {
    return runtime.fallback ? "fallback" : "success";
  }

  private toSerializableJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private async persistInboundAttachments(input: {
    conversationId: string;
    source: InboundMessageSource;
    externalMessageId?: string | null;
    attachments?: Array<{
      type: "image" | "document" | "audio" | "video" | "gif";
      fileName: string;
      mimeType: string;
      size?: number;
      dataUrl?: string;
      url?: string;
      thumbUrl?: string;
      caption?: string;
      durationSeconds?: number;
      extractedText?: string;
      transcript?: string;
      description?: string;
      buffer?: Buffer | null;
      sourceUrl?: string | null;
    }>;
  }): Promise<InboundAttachmentRecord[]> {
    const records: InboundAttachmentRecord[] = [];

    for (const attachment of input.attachments ?? []) {
      const record = await persistInboundAttachment({
        conversationId: input.conversationId,
        externalMessageId: input.externalMessageId ?? null,
        source: input.source,
        type: attachment.type,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        dataUrl: attachment.dataUrl,
        url: attachment.url,
        thumbUrl: attachment.thumbUrl,
        caption: attachment.caption,
        durationSeconds: attachment.durationSeconds,
        extractedText: attachment.extractedText,
        transcript: attachment.transcript,
        description: attachment.description,
        buffer: attachment.buffer ?? null,
        sourceUrl: attachment.sourceUrl ?? null,
      });

      records.push(record);
    }

    return records;
  }

  private buildInboundMessageType(input: {
    dto: SendAssistantConversationMessageDto;
    attachments: InboundAttachmentRecord[];
    contact?: InboundContactInput | null;
    location?: InboundLocationInput | null;
  }): string {
    if (input.dto.messageType?.trim()) {
      return input.dto.messageType.trim();
    }

    if (input.contact) {
      return "contact";
    }

    if (input.location) {
      return "location";
    }

    if (input.attachments.length > 0) {
      return input.attachments[0]?.type ?? "text";
    }

    return "text";
  }

  private buildRuntimeInputText(input: {
    message?: string | null;
    attachments: InboundAttachmentRecord[];
    contact?: InboundContactInput | null;
    location?: InboundLocationInput | null;
  }): string {
    return this.attachmentInterpreterService.buildRuntimeInputText({
      rawText: input.message,
      attachments: input.attachments,
      contact: input.contact ?? null,
      location: input.location ?? null,
    });
  }

  private toAttachmentInterpreterInput(input: {
    attachment: InboundAttachmentRecord;
    source: InboundMessageSource;
  }): AttachmentInterpreterInput {
    return {
      source: input.source,
      fileName: input.attachment.fileName,
      mimeType: input.attachment.mimeType,
      storagePath: input.attachment.storagePath,
      size: input.attachment.size,
      dataUrl: null,
      thumbUrl: input.attachment.thumbUrl ?? null,
      caption: input.attachment.caption ?? null,
      durationSeconds: input.attachment.durationSeconds ?? null,
    };
  }

  private async sendChatwootOutboundText(input: {
    conversation: AssistantConversationSafeRecord;
    assistantMessageId: string;
    assistantId: string;
    content: string;
    handoff?: boolean;
  }): Promise<void> {
    const accountIdentifier = (input.conversation.externalAccountId ?? "").trim();
    const inboxIdentifier = (input.conversation.externalInboxId ?? "").trim();
    const conversationIdentifier = (input.conversation.externalConversationId ?? "").trim();

    if (!accountIdentifier || !conversationIdentifier) {
      return;
    }

    const resolvedConfig = await this.chatwootInboxConfigService.resolveActiveForConversation({
      companyId: input.conversation.companyId,
      accountId: input.conversation.externalAccountId ?? null,
      inboxId: input.conversation.externalInboxId ?? null,
    });

    const baseUrl = resolvedConfig?.baseUrl?.trim() || "";
    if (!baseUrl) {
      return;
    }

    const outboundUrl = `${baseUrl.replace(/\/$/, "")}/api/v1/accounts/${encodeURIComponent(
      accountIdentifier,
    )}/conversations/${encodeURIComponent(conversationIdentifier)}/messages`;
    const outboundBody = {
      content: input.content,
      message_type: "outgoing",
      private: false,
      sender_type: "Captain::Assistant",
      content_attributes: {
        automation_rule_id: "cubo_ai_studio",
        source: "cubo_ai_studio",
        assistant_id: input.assistantId,
        internal_conversation_id: input.conversation.id,
        ...(input.handoff ? { handoff: true } : {}),
      },
    };

    try {
      this.logger.log(
        `Chatwoot outbound started: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} messageType=${outboundBody.message_type} senderType=${outboundBody.sender_type} private=${outboundBody.private} contentLength=${input.content.length}`,
      );
      this.logger.log(
        `Chatwoot outbound payload (secure): ${JSON.stringify({ ...outboundBody, content: "[REDACTED]" })}`,
      );

      const response = await fetch(outboundUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(resolvedConfig?.apiAccessToken
            ? {
                api_access_token: resolvedConfig.apiAccessToken,
              }
            : {}),
        },
        body: JSON.stringify(outboundBody),
      });
      const responseBody =
        typeof response.text === "function" ? await response.text().catch(() => "") : "";
      const safeResponseBody = this.summarizeOutboundResponseBody(responseBody);

      if (!response.ok) {
        this.logger.warn(
          `Chatwoot outbound failed: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} status=${response.status} responseBody=${safeResponseBody}`,
        );
        return;
      }

      this.logger.log(
        `Chatwoot outbound completed: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} status=${response.status} responseBody=${safeResponseBody}`,
      );
    } catch (error) {
      this.logger.warn(
        `Chatwoot outbound failed: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} error=${this.summarizeOutboundError(error)}`,
      );
      // Non-blocking by design. The conversation turn still succeeds locally.
    }
  }

  public async setExternalConversationAiActive(input: {
    conversationId: string;
    aiActive: boolean;
    reason?: string;
  }): Promise<void> {
    const conversation = await this.prisma.assistantConversation.findFirst({
      where: { id: input.conversationId },
    });
    if (!conversation || conversation.source !== "CHATWOOT") {
      return;
    }

    const accountIdentifier = (conversation.externalAccountId ?? "").trim();
    const inboxIdentifier = (conversation.externalInboxId ?? "").trim();
    const conversationIdentifier = (conversation.externalConversationId ?? "").trim();

    if (!accountIdentifier || !conversationIdentifier) {
      return;
    }

    const resolvedConfig = await this.chatwootInboxConfigService.resolveActiveForConversation({
      companyId: conversation.companyId,
      accountId: accountIdentifier,
      inboxId: inboxIdentifier || null,
    });

    const baseUrl = resolvedConfig?.baseUrl?.trim() || "";
    if (!baseUrl) {
      return;
    }

    const apiUrl = `${baseUrl.replace(/\/$/, "")}/api/v1/accounts/${encodeURIComponent(
      accountIdentifier,
    )}/conversations/${encodeURIComponent(conversationIdentifier)}`;

    const body = {
      ai_active: input.aiActive,
    };

    try {
      this.logger.log(
        `Chatwoot updating ai_active: company=${conversation.companyId} apiUrl=${apiUrl} aiActive=${input.aiActive} reason=${input.reason || "none"}`,
      );
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...(resolvedConfig?.apiAccessToken
            ? {
                api_access_token: resolvedConfig.apiAccessToken,
              }
            : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        this.logger.warn(
          `Chatwoot update ai_active failed: company=${conversation.companyId} status=${response.status} responseBody=${errorText}`,
        );
      } else {
        // Also update local DB tracking
        await this.prisma.assistantConversation.updateMany({
          where: { id: conversation.id, companyId: conversation.companyId },
          data: {
            aiActive: input.aiActive,
            ...(input.aiActive
              ? { lastAiActiveAt: new Date(), resumeReason: input.reason }
              : { lastAiPausedAt: new Date(), pauseReason: input.reason }),
          },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Chatwoot update ai_active failed: company=${conversation.companyId} error=${this.summarizeOutboundError(error)}`,
      );
    }
  }

  private summarizeOutboundResponseBody(body: string): string {
    const trimmed = body.trim();
    if (!trimmed) {
      return "[empty]";
    }

    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(this.sanitizeOutboundValue(parsed)).slice(0, 1000);
    } catch {
      return `[non-json body length=${trimmed.length}]`;
    }
  }

  private sanitizeOutboundValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeOutboundValue(item));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, child]) => {
          const normalizedKey = key.toLowerCase();
          if (
            normalizedKey.includes("token") ||
            normalizedKey.includes("secret") ||
            normalizedKey.includes("content") ||
            normalizedKey.includes("phone") ||
            normalizedKey.includes("data_url")
          ) {
            return [key, "[redacted]"];
          }

          return [key, this.sanitizeOutboundValue(child)];
        }),
      );
    }

    if (typeof value === "string" && value.length > 200) {
      return `${value.slice(0, 200)}...[truncated]`;
    }

    return value;
  }

  private summarizeOutboundError(error: unknown): string {
    if (error instanceof Error) {
      return error.message.slice(0, 300);
    }

    return String(error).slice(0, 300);
  }

  async create(input: {
    assistantId: string;
    dto: CreateAssistantConversationDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<CreateAssistantConversationResponse> {
    const assistant = await this.resolveActiveAssistantOrThrow({
      assistantId: input.assistantId,
      user: input.user,
      tenant: input.tenant,
    });

    const conversationSource = this.normalizeConversationSource(input.dto.source);
    const createdAt = new Date();
    const conversationTitle =
      input.dto.title?.trim() ||
      (conversationSource === ConversationSource.MANUAL_TEST
        ? formatManualTestConversationTitle(createdAt)
        : null);

    const conversation = await this.prisma.$transaction(async (tx) => {
      const createdConversation = await tx.assistantConversation.create({
        data: {
          companyId: input.tenant.companyId,
          assistantId: input.assistantId,
          userId: input.user.id,
          title: conversationTitle,
          source: conversationSource,
          channelType: ConversationChannelType.UNKNOWN,
          sourceProvider: conversationSource === ConversationSource.SMOKE ? "tests" : "manual",
          status: Status.ACTIVE,
          lastMessageAt: createdAt,
        },
        select: assistantConversationSafeSelect,
      });

      const initialMessage = assistant.initialMessage?.trim();
      if (initialMessage) {
        await tx.assistantConversationMessage.create({
          data: {
            companyId: input.tenant.companyId,
            assistantId: input.assistantId,
            conversationId: createdConversation.id,
            role: "assistant",
            content: initialMessage,
            sources: Prisma.JsonNull,
            mode: "initial-message",
          },
          select: {
            id: true,
          },
        });
      }

      return createdConversation;
    });

    return toConversationItem(conversation);
  }

  async findAll(input: {
    assistantId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindAllAssistantConversationsResponse> {
    await this.resolveActiveAssistantOrThrow({
      assistantId: input.assistantId,
      user: input.user,
      tenant: input.tenant,
    });

    const items = await this.prisma.assistantConversation.findMany({
      where: {
        assistantId: input.assistantId,
        companyId: input.tenant.companyId,
        source: ConversationSource.MANUAL_TEST,
        status: Status.ACTIVE,
      },
      select: assistantConversationSafeSelect,
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    return {
      items: items.map(toConversationItem),
    };
  }

  async findMessages(input: {
    assistantId: string;
    conversationId: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindConversationMessagesResponse> {
    await this.resolveConversationOrThrow({
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      user: input.user,
      tenant: input.tenant,
    });

    const items = await this.prisma.assistantConversationMessage.findMany({
      where: {
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        companyId: input.tenant.companyId,
      },
      select: assistantConversationMessageSafeSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return {
      items: items.map(toConversationMessageItem),
    };
  }

  private async checkAndExecuteReset(input: {
    assistant: AssistantConversationRuntimeAssistantRecord;
    conversation: AssistantConversationSafeRecord;
    dto: SendAssistantConversationMessageDto;
    tenant: RequestTenant;
    user: AuthenticatedUser;
    runtimeStartedAt: number;
    preparedAttachments?: InboundAttachmentRecord[];
  }): Promise<SendAssistantConversationMessageResponse | null> {
    const rawMessage = input.dto.message;
    if (!rawMessage || typeof rawMessage !== "string") {
      return null;
    }

    if (!input.assistant.conversationResetEnabled) {
      return null;
    }

    // Only text: sem attachments / media
    const hasAttachments =
      (input.preparedAttachments && input.preparedAttachments.length > 0) ||
      (input.dto.attachments && input.dto.attachments.length > 0);
    if (hasAttachments) {
      return null;
    }

    // Normalization
    const normalizedMessage = rawMessage.normalize("NFKC").trim().toLowerCase();

    // Check exact keyword match
    const keywords = (input.assistant.conversationResetKeywords as string[]) || ["reset"];
    const matchedKeyword = keywords.find((kw) => kw.normalize("NFKC").trim().toLowerCase() === normalizedMessage);
    if (!matchedKeyword) {
      return null;
    }

    // Idempotency: using the ID of the message received from Chatwoot/tests
    if (input.dto.externalMessageId) {
      const existingRequest = await this.prisma.assistantConversationMessage.findFirst({
        where: {
          companyId: input.tenant.companyId,
          conversationId: input.conversation.id,
          externalMessageId: input.dto.externalMessageId,
          mode: "reset-request",
        },
      });

      if (existingRequest) {
        const existingReply = await this.prisma.assistantConversationMessage.findFirst({
          where: {
            companyId: input.tenant.companyId,
            conversationId: input.conversation.id,
            mode: "reset-reply",
            contextVersion: (existingRequest.contextVersion ?? 1) + 1,
          },
        });

        if (existingReply) {
          return {
            conversationId: input.conversation.id,
            userMessage: toConversationMessageItem(existingRequest),
            assistantMessage: toConversationMessageItem(existingReply),
            runtime: {
              mode: "deterministic-runtime",
              assistant: {
                id: input.assistant.id,
                name: input.assistant.name,
              },
              temperature: input.assistant.temperature ?? 0.7,
              temperatureSource: "assistant",
              configurationSource: "tenant-settings",
              fallback: false,
              outcome: "success",
              reason: "conversation-reset-executed-duplicate",
              summary: "Conversation reset executed (duplicate request)",
              context: {
                historyMessagesUsed: 0,
                resetExecuted: true,
              } as any,
            },
          };
        }
      }
    }

    // 1. Persistir a mensagem de reset com identificação especial (mode: "reset-request")
    const currentVersion = input.conversation.currentContextVersion ?? 1;
    const userMessage = await this.prisma.assistantConversationMessage.create({
      data: {
        companyId: input.tenant.companyId,
        assistantId: input.assistant.id,
        conversationId: input.conversation.id,
        role: "user",
        content: rawMessage,
        source: input.dto.source ?? "manual",
        messageType: input.dto.messageType ?? "text",
        externalMessageId: input.dto.externalMessageId ?? null,
        contextVersion: currentVersion,
        mode: "reset-request",
      },
    });

    // 2. Buscar as mensagens da sessão que está sendo encerrada para extração de memória
    const sessionMessages = await this.prisma.assistantConversationMessage.findMany({
      where: {
        companyId: input.tenant.companyId,
        conversationId: input.conversation.id,
        contextVersion: currentVersion,
      },
      orderBy: { createdAt: "asc" },
    });

    // Excluir a mensagem de reset-request
    const messagesToExtract = sessionMessages.filter((m) => m.mode !== "reset-request");

    let extractionStatus = "COMPLETED";
    let extractedCount = 0;
    let contactMemoryProfileId: string | null = null;

    if (
      input.assistant.memoryEnabled &&
      this.contactMemoriesService
    ) {
      try {
        const profile = await this.contactMemoriesService.findOrCreateProfile({
          companyId: input.tenant.companyId,
          channelType: input.conversation.channelType,
          externalAccountId: input.conversation.externalAccountId,
          externalContactId: input.conversation.externalContactId,
          externalInboxId: input.conversation.externalInboxId,
          chatwootContactId: input.conversation.externalContactId ?? input.conversation.externalAccountId,
          phoneNormalized: input.dto.externalSenderPhone,
          displayName: input.dto.externalSenderName,
          assistantId: input.assistant.id,
          sharedAcrossAssistants: input.assistant.memorySharedAcrossAssistants,
        });

        contactMemoryProfileId = profile.id;

        if (
          input.assistant.memoryExtractionEnabled &&
          input.assistant.conversationResetPreserveMemories &&
          this.contactMemoriesExtractionService &&
          messagesToExtract.length > 0
        ) {
          const lastUserMsgIndex = [...messagesToExtract].reverse().findIndex((m) => m.role === "user");
          if (lastUserMsgIndex !== -1) {
            const actualIndex = messagesToExtract.length - 1 - lastUserMsgIndex;
            const currentMsg = messagesToExtract[actualIndex];
            const priorMsgs = messagesToExtract.slice(0, actualIndex);

            let categories;
            try {
              categories = input.assistant.memoryAllowedCategories
                ? JSON.parse(input.assistant.memoryAllowedCategories)
                : undefined;
            } catch (e) {}

            const existingMemories = await this.contactMemoriesService.getActiveMemories({
              profileId: profile.id,
              companyId: input.tenant.companyId,
              confidenceThreshold: input.assistant.memoryConfidenceThreshold,
              categories,
            });

            // Timeout de 5s para não bloquear o reset
            const extResult = await Promise.race([
              this.contactMemoriesExtractionService.extractMemories({
                companyId: input.tenant.companyId,
                assistantId: input.assistant.id,
                profileId: profile.id,
                currentMessage: currentMsg.content,
                recentMessages: priorMsgs.map((m) => ({ role: m.role, content: m.content })),
                existingMemories,
                sourceConversationId: input.conversation.id,
                sourceMessageId: currentMsg.id,
                allowedCategories: categories,
                tempDefaultDays: input.assistant.memoryTempDefaultDays,
              }),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout de extração de memória")), 5000)),
            ]);

            extractedCount = extResult.extracted?.length ?? 0;
          }
        }
      } catch (err: any) {
        this.logger.error(`Erro na extração de memória antes de reset: ${err.message}`, err.stack);
        extractionStatus = "ERROR";
      }
    }

    // 3. Encerrar a sessão anterior no banco
    await this.prisma.assistantConversationSession.create({
      data: {
        companyId: input.tenant.companyId,
        assistantId: input.assistant.id,
        conversationId: input.conversation.id,
        contextVersion: currentVersion,
        status: "RESET",
        endedAt: new Date(),
        resetReason: "user_command",
        resetMessageId: userMessage.id,
        memoryExtractionStatus: extractionStatus,
        summary: `Session reset by command. Extracted ${extractedCount} memories.`,
      },
    });

    // Limpar triage state do cache no reset de conversa
    if (this.cacheService) {
      const triageCacheKey = `triage:${input.tenant.companyId}:${input.conversation.id}`;
      try {
        await this.cacheService.set(triageCacheKey, null, 1);
      } catch (err: any) {
        this.logger.warn(`Failed to clear triage cache on reset: ${err.message}`);
      }
    }

    // 4. Limpar apenas contexto temporário pertencente a este perfil/conversa.
    if (contactMemoryProfileId) {
      await this.prisma.contactMemoryItem.deleteMany({
        where: {
          companyId: input.tenant.companyId,
          profileId: contactMemoryProfileId,
          category: "TEMPORARY_CONTEXT",
          OR: [
            { sourceConversationId: null },
            { sourceConversationId: input.conversation.id },
          ],
        },
      });
    }

    // 5. Incrementar contextVersion e criar nova sessão ativa
    const newContextVersion = currentVersion + 1;
    await this.prisma.assistantConversation.update({
      where: { id: input.conversation.id },
      data: { currentContextVersion: newContextVersion },
    });

    await this.prisma.assistantConversationSession.create({
      data: {
        companyId: input.tenant.companyId,
        assistantId: input.assistant.id,
        conversationId: input.conversation.id,
        contextVersion: newContextVersion,
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });

    // 6. Enviar confirmação e saudação inicial se configurado
    let replyContent = input.assistant.conversationResetConfirmationMessage;
    if (input.assistant.conversationResetSendInitialMessage && input.assistant.initialMessage?.trim()) {
      replyContent = `${input.assistant.conversationResetConfirmationMessage}\n\n${input.assistant.initialMessage.trim()}`;
    }

    const replyAssistantMessage = await this.prisma.assistantConversationMessage.create({
      data: {
        companyId: input.tenant.companyId,
        assistantId: input.assistant.id,
        conversationId: input.conversation.id,
        role: "assistant",
        content: replyContent,
        source: input.dto.source ?? "manual",
        contextVersion: newContextVersion,
        mode: "reset-reply",
      },
    });

    if (input.dto.source === "chatwoot") {
      await this.sendChatwootOutboundText({
        conversation: {
          ...input.conversation,
          sourceProvider: input.dto.source,
          externalConversationId:
            input.dto.externalConversationId ?? input.conversation.externalConversationId,
          externalContactId: input.dto.externalContactId ?? input.conversation.externalContactId,
          externalInboxId: input.dto.externalInboxId ?? input.conversation.externalInboxId,
          externalChannelId: input.dto.externalChannelId ?? input.conversation.externalChannelId,
        },
        assistantMessageId: replyAssistantMessage.id,
        assistantId: input.assistant.id,
        content: replyContent,
      });
    }

    // 7. Registrar log estruturado
    this.logger.log(
      JSON.stringify({
        event: "CONVERSATION_SESSION_RESET",
        requestId: input.dto.externalMessageId ?? null,
        companyId: input.tenant.companyId,
        assistantId: input.assistant.id,
        conversationId: input.conversation.id,
        contactId: contactMemoryProfileId ?? null,
        oldContextVersion: currentVersion,
        newContextVersion,
        resetMessageId: userMessage.id,
        keywordMatched: matchedKeyword,
        memoryExtractionStatus: extractionStatus,
        temporaryStatesCleared: true,
        durationMs: Date.now() - input.runtimeStartedAt,
      }),
    );

    return {
      conversationId: input.conversation.id,
      userMessage: toConversationMessageItem(userMessage),
      assistantMessage: toConversationMessageItem(replyAssistantMessage),
      runtime: {
        mode: "deterministic-runtime",
        assistant: {
          id: input.assistant.id,
          name: input.assistant.name,
        },
        temperature: input.assistant.temperature ?? 0.7,
        temperatureSource: "assistant",
        configurationSource: "tenant-settings",
        fallback: false,
        outcome: "success",
        reason: "conversation-reset-executed",
        summary: "Conversation reset executed successfully",
        context: {
          historyMessagesUsed: 0,
          resetExecuted: true,
        } as any,
      },
    };
  }

  async sendMessage(input: {
    assistantId: string;
    conversationId: string;
    dto: SendAssistantConversationMessageDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
    requestId?: string | null;
    correlationId?: string | null;
    preparedAttachments?: InboundAttachmentRecord[];
  }): Promise<SendAssistantConversationMessageResponse> {
    const runtimeStartedAt = Date.now();
    const assistant = await this.resolveRuntimeAssistantOrThrow({
      assistantId: input.assistantId,
      user: input.user,
      tenant: input.tenant,
    });

    const conversation = await this.resolveConversationOrThrow({
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      user: input.user,
      tenant: input.tenant,
    });

    const isReset = await this.checkAndExecuteReset({
      assistant,
      conversation,
      dto: input.dto,
      tenant: input.tenant,
      user: input.user,
      runtimeStartedAt,
      preparedAttachments: input.preparedAttachments,
    });

    if (isReset) {
      return isReset;
    }

    const source = input.dto.source ?? "manual";
    const attachmentSource: InboundMessageSource = source === "chatwoot" ? "chatwoot" : "tests";
    const persistedAttachments =
      input.preparedAttachments ??
      (await this.persistInboundAttachments({
        conversationId: conversation.id,
        source: attachmentSource,
        externalMessageId: input.dto.externalMessageId ?? null,
        attachments: input.dto.attachments,
      }));
    const initialContent =
      input.dto.message?.trim() ||
      (input.dto.messageType === "contact"
        ? "Contato recebido."
        : input.dto.messageType === "location"
          ? "Localização recebida."
          : input.dto.attachments?.length
            ? "Mensagem multimodal recebida."
            : "Mensagem recebida.");
    const conversationSourceUpdate =
      source === "chatwoot" ? ConversationSource.CHATWOOT : conversation.source;
    const channelTypeUpdate =
      source === "chatwoot"
        ? this.resolveConversationChannelType({
            source: ConversationSource.CHATWOOT,
            sourceProvider: source,
            externalChannelId:
              input.dto.externalChannelId ?? conversation.externalChannelId ?? null,
            externalInboxId: input.dto.externalInboxId ?? conversation.externalInboxId ?? null,
            externalSenderIdentifier: input.dto.externalSenderIdentifier ?? null,
            externalSenderPhone: input.dto.externalSenderPhone ?? null,
          })
        : conversation.channelType;

    const { userMessage } = await this.prisma.$transaction(async (tx) => {
      const createdUserMessage = await tx.assistantConversationMessage.create({
        data: {
          companyId: input.tenant.companyId,
          assistantId: input.assistantId,
          conversationId: conversation.id,
          role: "user",
          content: initialContent,
          source,
          messageType: input.dto.messageType ?? null,
          externalMessageId: input.dto.externalMessageId ?? null,
          contextVersion: conversation.currentContextVersion ?? 1,
          externalPayload: this.toSerializableJsonValue({
            source,
            message: input.dto.message ?? null,
            messageType: input.dto.messageType ?? null,
            externalMessageId: input.dto.externalMessageId ?? null,
            externalAccountId: input.dto.externalAccountId ?? null,
            externalConversationId: input.dto.externalConversationId ?? null,
            externalContactId: input.dto.externalContactId ?? null,
            externalSenderId: input.dto.externalSenderId ?? null,
            externalSenderIdentifier: input.dto.externalSenderIdentifier ?? null,
            externalSenderName: input.dto.externalSenderName ?? null,
            externalSenderPhone: input.dto.externalSenderPhone ?? null,
            externalChannelId: input.dto.externalChannelId ?? null,
            externalInboxId: input.dto.externalInboxId ?? null,
            contact: input.dto.contact ?? null,
            location: input.dto.location ?? null,
            attachments: persistedAttachments,
            interpretedMessage: initialContent,
          }),
          attachments: this.toSerializableJsonValue(persistedAttachments),
          sources: Prisma.JsonNull,
          mode: null,
        },
        select: assistantConversationMessageSafeSelect,
      });

      await tx.assistantConversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          source: conversationSourceUpdate,
          channelType: channelTypeUpdate,
          sourceProvider: source,
          externalAccountId: input.dto.externalAccountId ?? conversation.externalAccountId ?? null,
          externalConversationId:
            input.dto.externalConversationId ?? conversation.externalConversationId ?? null,
          externalContactId: input.dto.externalContactId ?? conversation.externalContactId ?? null,
          externalChannelId: input.dto.externalChannelId ?? conversation.externalChannelId ?? null,
          externalInboxId: input.dto.externalInboxId ?? conversation.externalInboxId ?? null,
          lastMessageAt: new Date(),
        },
        select: {
          id: true,
        },
      });

      return {
        userMessage: createdUserMessage,
      };
    });

    const processedAttachments = [];
    for (let index = 0; index < persistedAttachments.length; index += 1) {
      const persistedAttachment = persistedAttachments[index];
      const dtoAttachment = input.dto.attachments?.[index];
      const interpreterInput = this.toAttachmentInterpreterInput({
        attachment: persistedAttachment,
        source: attachmentSource,
      });
      const processed = dtoAttachment
        ? persistedAttachment.processingStatus === "failed"
          ? {
              processingStatus: "failed" as const,
              extractedText: persistedAttachment.extractedText ?? null,
              interpretedSummary: persistedAttachment.interpretedSummary ?? null,
              transcript: persistedAttachment.transcript ?? null,
              processingError: persistedAttachment.processingError ?? null,
              metadataJson: persistedAttachment.metadataJson ?? null,
            }
          : await this.attachmentInterpreterService.processAttachment(interpreterInput, input.tenant.companyId)
        : {
            processingStatus: "completed" as const,
            extractedText: persistedAttachment.extractedText ?? null,
            interpretedSummary: persistedAttachment.interpretedSummary ?? null,
            transcript: persistedAttachment.transcript ?? null,
            processingError: null,
            metadataJson: persistedAttachment.metadataJson ?? null,
          };

      processedAttachments.push({
        ...persistedAttachment,
        processingStatus: processed.processingStatus,
        extractedText: processed.extractedText ?? null,
        interpretedSummary: processed.interpretedSummary ?? null,
        transcript: processed.transcript ?? null,
        processingError: processed.processingError ?? null,
        metadataJson: processed.metadataJson ?? null,
      });
    }

    const interpretedMessage = this.buildRuntimeInputText({
      message: input.dto.message,
      attachments: processedAttachments,
      contact: input.dto.contact ?? null,
      location: input.dto.location ?? null,
    });

    if (!interpretedMessage.trim()) {
      throw new BadRequestException("Message content or multimodal payload is required.");
    }

    const messageType = this.buildInboundMessageType({
      dto: input.dto,
      attachments: processedAttachments,
      contact: input.dto.contact ?? null,
      location: input.dto.location ?? null,
    });

    await this.prisma.assistantConversationMessage.update({
      where: {
        id: userMessage.id,
      },
      data: {
        content: interpretedMessage,
        messageType,
        attachments: this.toSerializableJsonValue(processedAttachments),
        externalPayload: this.toSerializableJsonValue({
          source,
          message: input.dto.message ?? null,
          messageType,
          externalMessageId: input.dto.externalMessageId ?? null,
          externalAccountId: input.dto.externalAccountId ?? null,
          externalConversationId: input.dto.externalConversationId ?? null,
          externalContactId: input.dto.externalContactId ?? null,
          externalSenderId: input.dto.externalSenderId ?? null,
          externalSenderIdentifier: input.dto.externalSenderIdentifier ?? null,
          externalSenderName: input.dto.externalSenderName ?? null,
          externalSenderPhone: input.dto.externalSenderPhone ?? null,
          externalChannelId: input.dto.externalChannelId ?? null,
          externalInboxId: input.dto.externalInboxId ?? null,
          contact: input.dto.contact ?? null,
          location: input.dto.location ?? null,
          attachments: processedAttachments,
          interpretedMessage,
        }),
      },
      select: {
        id: true,
      },
    });

    let memoryContextBlock: string | null = null;
    let contactMemoryProfileId: string | null = null;
    let existingMemories: any[] = [];

    if (
      assistant.memoryEnabled &&
      this.contactMemoriesService &&
      this.contactMemoriesExtractionService
    ) {
      try {
        const profile = await this.contactMemoriesService.findOrCreateProfile({
          companyId: input.tenant.companyId,
          channelType: channelTypeUpdate,
          externalAccountId: input.dto.externalAccountId,
          externalContactId: input.dto.externalContactId,
          externalInboxId: input.dto.externalInboxId,
          chatwootContactId: input.dto.externalContactId ?? input.dto.externalSenderId,
          phoneNormalized: input.dto.externalSenderPhone,
          displayName: input.dto.externalSenderName,
          assistantId: input.assistantId,
          sharedAcrossAssistants: assistant.memorySharedAcrossAssistants,
        });

        contactMemoryProfileId = profile.id;

        if (assistant.memoryPrePromptEnabled) {
          let categories;
          try {
            categories = assistant.memoryAllowedCategories
              ? JSON.parse(assistant.memoryAllowedCategories)
              : undefined;
          } catch (e) {}

          const memories = await this.contactMemoriesService.getActiveMemories({
            profileId: profile.id,
            companyId: input.tenant.companyId,
            confidenceThreshold: assistant.memoryConfidenceThreshold,
            categories,
          });

          const startSemantic = Date.now();
          let semanticMemories: any[] = [];
          let topSemanticScore = 0;
          let cacheHit = false;
          let fallbackUsed = false;
          let errorCode = null;

          if (assistant.semanticMemoryEnabled) {
            try {
              semanticMemories = await this.contactMemoriesService.searchSemanticMemories({
                companyId: input.tenant.companyId,
                profileId: profile.id,
                query: interpretedMessage,
                threshold: assistant.semanticMemoryThreshold ?? 0.7,
                maxCandidates: assistant.semanticMemoryMaxCandidates ?? 20,
                assistantId: input.assistantId,
                provider: assistant.model ? "openai" : "openai",
              });

              if (semanticMemories.length > 0) {
                topSemanticScore = Math.max(...semanticMemories.map((m) => m.similarity ?? 0));
                cacheHit = semanticMemories[0].cacheHit ?? false;
              }
            } catch (err: any) {
              fallbackUsed = true;
              errorCode = err.code ?? err.message ?? "UNKNOWN_ERROR";
              this.logger.error(
                `Semantic memory search failed, falling back to structured memory: ${err.message}`,
                err.stack,
              );
            }
          }

          const semanticDurationMs = Date.now() - startSemantic;

          existingMemories = memories;
          const selectedMemories =
            this.contactMemoriesExtractionService.selectHybridMemoriesForPrompt({
              structuredMemories: memories,
              semanticMemories,
              currentMessage: interpretedMessage,
              summary: profile.summary,
              limit: assistant.semanticMemoryMaxResults ?? 15,
            });

          // Log structured semantic query info
          this.logger.log({
            message: "Semantic memory search executed",
            companyId: input.tenant.companyId,
            assistantId: input.assistantId,
            conversationId: input.conversationId,
            contactId: profile.id,
            semanticMemoryEnabled: assistant.semanticMemoryEnabled,
            embeddingModel: "text-embedding-3-small",
            embeddingVersion: "v1",
            structuredCandidateCount: memories.length,
            semanticCandidateCount: semanticMemories.length,
            selectedMemoryCount: selectedMemories.length,
            threshold: assistant.semanticMemoryThreshold ?? 0.7,
            topSemanticScore,
            cacheHit,
            durationMs: semanticDurationMs,
            fallbackUsed,
            errorCode,
          });

          memoryContextBlock =
            this.contactMemoriesExtractionService.buildMemoryContextBlock(selectedMemories);

          // Increment usage stats in the background for selected database memories
          const selectedIds = selectedMemories
            .map((m) => m.id)
            .filter((id): id is string => typeof id === "string");
          if (selectedIds.length > 0) {
            void this.contactMemoriesService.incrementUsage(selectedIds);
          }
        }
      } catch (err: any) {
        this.logger.error(`Error loading contact memory: ${err.message}`, err.stack);
      }
    }

    let triageMode = isMultiNeedTriageMessage(interpretedMessage);
    const triageCacheKey = `triage:${input.tenant.companyId}:${conversation.id}`;
    let loadedTriageState: TriageState | null = null;

    if (this.cacheService) {
      try {
        loadedTriageState = await this.cacheService.get<TriageState>(triageCacheKey);
      } catch (err: any) {
        this.logger.warn(`Failed to read triage state cache: ${err.message}`);
      }
    }

    let shouldClearTriage = false;
    let triageContinuation = false;

    if (loadedTriageState && loadedTriageState.active && loadedTriageState.expiresAt > Date.now()) {
      const isPriceQuery = /(quanto\s+fica|quanto\s+custa|valores?|preços?|custos?|precos?|tabela)/i.test(interpretedMessage);
      const isScheduleQuery = /(agendar|agendamento|marcar|horário|horario|reserva|agenda)/i.test(interpretedMessage);
      const isListQuery = /\b(me\s+)?(envie|mande|passa|quero|lista|quais|tabela)\b.*\b(lista|serviços|opções|opcoes|catalogo|catálogo)\b/i.test(interpretedMessage);
      const isHandoffQuery = /(humano|atendente|atendimento\s+humano|falar\s+com\s+alguém)/i.test(interpretedMessage);

      if (isPriceQuery || isScheduleQuery || isListQuery || isHandoffQuery) {
        shouldClearTriage = true;
      } else {
        triageMode = true;
        triageContinuation = true;
      }
    }

    if (shouldClearTriage && this.cacheService) {
      try {
        await this.cacheService.set(triageCacheKey, null, 1);
        loadedTriageState = null;
      } catch (err: any) {
        this.logger.warn(`Failed to clear triage state: ${err.message}`);
      }
    }

    const knowledgeLimit = triageMode ? 2 : 5;
    let knowledgeItems: { id: string; title: string; content: string }[] = [];
    let ragLogData: any = null;

    if (assistant.ragEnabled && this.assistantKnowledgeRetrievalService) {
      const searchResult = await this.assistantKnowledgeRetrievalService.searchRelevantKnowledge({
        tenant: input.tenant,
        assistantId: input.assistantId,
        query: interpretedMessage,
        topK: knowledgeLimit,
      });

      ragLogData = {
        ragEnabled: true,
        requestedTopK: knowledgeLimit,
        totalChunksScanned: searchResult.totalChunksScanned,
        warning: searchResult.warning,
        usedKnowledge: searchResult.results.map((r) => ({
          knowledgeId: r.knowledgeId,
          title: r.knowledgeTitle,
          chunkId: r.chunkId,
          score: r.score,
        })),
      };

      if (searchResult.results.length > 0) {
        knowledgeItems = searchResult.results.map((res) => ({
          id: res.chunkId,
          title: res.knowledgeTitle,
          content: res.contentPreview,
        }));
      }

      this.logger.log(
        `[RAG Runtime] Assistant ${input.assistantId} | Scanned: ${ragLogData.totalChunksScanned} | Found: ${ragLogData.usedKnowledge.length}`,
      );
    } else {
      knowledgeItems = await this.prisma.assistantKnowledge.findMany({
        where: {
          assistantId: input.assistantId,
          companyId: input.tenant.companyId,
          status: Status.ACTIVE,
        },
        select: assistantConversationKnowledgeSelect,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: knowledgeLimit,
      });
    }

    const activeSecurityRules: AssistantSecurityRuleItem[] = this.assistantSecurityRulesService
      ? await this.assistantSecurityRulesService.findActiveForRuntime({
          assistantId: input.assistantId,
          companyId: input.tenant.companyId,
        })
      : [];

    const officialBusinessContext = buildOfficialBusinessContext({
      companyName: assistant.company.name,
      assistantName: assistant.name,
      companyTimezone: assistant.company.timezone,
      assistantTimezone: assistant.timezone,
      description: assistant.description,
      businessAddress: assistant.businessAddress,
      businessCity: assistant.businessCity,
      businessState: assistant.businessState,
      businessCityRegion: assistant.businessCityRegion,
      businessPostalCode: assistant.businessPostalCode,
      googleMapsUrl: assistant.googleMapsUrl,
      latitude: assistant.latitude,
      longitude: assistant.longitude,
      businessPhone: assistant.businessPhone,
      businessWhatsapp: assistant.businessWhatsapp,
      businessWhatsappSupport: assistant.businessWhatsappSupport,
      websiteUrl: assistant.websiteUrl,
      weeklySchedule: assistant.weeklySchedule,
      aiAlwaysAvailable: assistant.aiAlwaysAvailable,
    });

    this.logOfficialBusinessContext({
      assistantId: assistant.id,
      companyId: input.tenant.companyId,
      context: officialBusinessContext,
    });

    const promptInstructions = assistant.instructions || "";
    const safetyInstructionBlock = [
      assistant.safetyInstruction?.trim()
        ? `Regra legada de segurança:\n${assistant.safetyInstruction.trim()}`
        : null,
      activeSecurityRules.length > 0
        ? [
            "Regras de segurança ativas:",
            ...activeSecurityRules.map(
              (rule, index) => `${index + 1}. ${rule.name} (${rule.ruleType}): ${rule.instruction}`,
            ),
          ].join("\n")
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    const effectiveInstructions = [promptInstructions, safetyInstructionBlock]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const recentMessages = await this.prisma.assistantConversationMessage.findMany({
      where: {
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        companyId: input.tenant.companyId,
        contextVersion: conversation.currentContextVersion ?? 1,
      },
      select: assistantConversationMessageSafeSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MAX_RUNTIME_HISTORY_MESSAGES,
    });

    const conversationHistory = [...recentMessages].reverse();
    const priorHistory = conversationHistory.slice(0, -1).map((message) => {
      const payload =
        message.externalPayload && typeof message.externalPayload === "object"
          ? (message.externalPayload as any)
          : {};
      return {
        role: message.role as "user" | "assistant" | "tool",
        content: message.content,
        ...(payload.tool_calls ? { tool_calls: payload.tool_calls } : {}),
        ...(payload.tool_call_id ? { tool_call_id: payload.tool_call_id } : {}),
        ...(payload.name ? { name: payload.name } : {}),
      };
    });
    const contextMetadata: Record<string, any> = {
      requestId: input.requestId ?? input.dto.externalMessageId ?? null,
      correlationId: input.correlationId ?? null,
      triageMode,
      knowledgeLimit,
      historyMessagesUsed: priorHistory.length,
      historyLimit: MAX_RUNTIME_HISTORY_MESSAGES,
      initialMessageIncluded: Boolean(assistant.initialMessage?.trim()),
      instructionsIncluded: Boolean(assistant.instructions?.trim()),
      safetyInstructionIncluded: Boolean(assistant.safetyInstruction?.trim()),
      activeSecurityRulesCount: activeSecurityRules.length,
      officialTimezoneUsed: officialBusinessContext.timezone,
      officialLocalDate: officialBusinessContext.businessStatus.localDate,
      officialLocalTime: officialBusinessContext.businessStatus.localTime,
      officialOpenNow: officialBusinessContext.businessStatus.isOpenNow,
      officialOnBreak: officialBusinessContext.businessStatus.isOnBreak,
      officialDataSource: "structured-assistant-company",
    };

    const deterministicRuntime = buildDeterministicAssistantResponse({
      question: interpretedMessage,
      assistantName: assistant.name,
      instructions: effectiveInstructions,
      knowledgeItems,
      officialBusinessContext,
    });

    const runtimeConfig = await this.aiService.resolveRuntimeConfig(input.tenant.companyId);
    const resolvedModel = this.resolveRuntimeModel(assistant, runtimeConfig);
    const temperature = this.resolveRuntimeTemperature(assistant);
    const temperatureSource = this.resolveRuntimeTemperatureSource(assistant);
    let answer = deterministicRuntime.answer;
    let sources = deterministicRuntime.sources;
    let providerErrorLogFields: RuntimeLogProviderErrorFields = {};
    let runtime: AssistantConversationRuntime = {
      mode: "deterministic-runtime",
      assistant: {
        id: assistant.id,
        name: assistant.name,
      },
      ...(resolvedModel.model ? { model: resolvedModel.model } : {}),
      modelSource: resolvedModel.source,
      temperature,
      temperatureSource,
      configurationSource: runtimeConfig.source,
      fallback: true,
      outcome: "fallback",
      summary: "",
      context: contextMetadata as any,
      reason: "ai-runtime-disabled",
    };

    const isDebugLogsEnabled =
      process.env.CALENDAR_DEBUG_LOGS === "true" || process.env.NODE_ENV === "development";

    if (isDebugLogsEnabled) {
      // DIAGNOSTIC: runtime gate check
      console.log("\n=== DIAGNOSTIC: RUNTIME GATE CHECK ===");
      console.log("CompanyId:", input.tenant.companyId);
      console.log("AssistantId:", assistant.id);
      console.log("Source:", source);
      console.log("RuntimeEnabled:", runtimeConfig.runtimeEnabled);
      console.log("RuntimeSource:", runtimeConfig.source);
      console.log("Model:", resolvedModel.model);
      console.log("ModelSource:", resolvedModel.source);
      console.log("=== END RUNTIME GATE CHECK ===\n");
    }

    if (
      !officialBusinessContext.aiRespondsOutsideBusinessHours &&
      !officialBusinessContext.businessStatus.isOpenNow
    ) {
      answer =
        assistant.fallbackMessage?.trim() ||
        buildOutsideBusinessHoursReply(officialBusinessContext);
      sources = [
        {
          id: "official-structured-data",
          title: "Dados oficiais da empresa",
        },
      ];
      Object.assign(contextMetadata, {
        llmSkipped: true,
        outsideBusinessHours: true,
        outsideBusinessHoursPolicy: "assistant-disabled",
      });
      runtime = {
        ...runtime,
        mode: "deterministic-runtime",
        fallback: false,
        outcome: "success",
        reason: undefined,
      };
    } else if (runtimeConfig.runtimeEnabled) {
      const configured = await this.aiService.isProviderConfigured(
        input.tenant.companyId,
        resolvedModel.model,
      );

      if (!configured) {
        const fallbackReason =
          resolvedModel.source === "not-configured"
            ? "ai-model-not-configured"
            : "ai-provider-not-configured";

        if (isDebugLogsEnabled) {
          // DIAGNOSTIC: provider not configured
          console.log("\n=== DIAGNOSTIC: AI PROVIDER NOT CONFIGURED ===");
          console.log("CompanyId:", input.tenant.companyId);
          console.log("Model:", resolvedModel.model);
          console.log("ModelSource:", resolvedModel.source);
          console.log("FallbackReason:", fallbackReason);
          console.log("=== END DIAGNOSTIC ===\n");
        }

        runtime = {
          ...runtime,
          mode: "deterministic-runtime",
          fallback: true,
          outcome: "fallback",
          reason: fallbackReason,
        };
      } else {
        try {
          const calendarToolsActive = await this.areGoogleCalendarToolsAvailable(
            input.tenant.companyId,
          );
          const contactPhone = await this.resolveContactPhone(
            conversation.id,
            input.tenant.companyId,
            input.dto,
          );

          // 1. Intent Routing
          const routeResult = this.intentRouterService
            ? await this.intentRouterService.route({
                companyId: input.tenant.companyId,
                assistantId: input.assistantId,
                message: interpretedMessage,
                flows: assistant.flows ?? [],
                model: resolvedModel.model,
                temperature,
              })
            : {
                flowId: null,
                flowName: null,
                confidence: 0,
                reason: "Intent router unavailable",
              };

          const selectedFlow = routeResult.flowId
            ? (assistant.flows ?? []).find((f) => f.id === routeResult.flowId)
            : null;
          const flowToolContext = this.resolveFlowToolContext(selectedFlow ?? null);
          const calendarScope = flowToolContext?.calendar ?? null;

          let resolvedTools = await this.resolveAssistantTools({
            companyId: input.tenant.companyId,
            assistantId: input.assistantId,
          });

          // Filtro de ferramentas (Phase 1.5)
          if (selectedFlow) {
            const finalAction = selectedFlow.finalAction || "respond";
            if (
              finalAction === "fixed_message" ||
              finalAction === "handoff" ||
              selectedFlow.autoRespond === false
            ) {
              resolvedTools = []; // Nenhuma ferramenta se for bypass
            } else if (selectedFlow.allowedToolSlugs) {
              try {
                const allowedSlugs = JSON.parse(selectedFlow.allowedToolSlugs);
                if (Array.isArray(allowedSlugs)) {
                  resolvedTools = resolvedTools.filter((t) =>
                    allowedSlugs.includes(t.function.name),
                  );
                }
              } catch (e) {
                // Ignore invalid JSON
              }
            }
          }

          let tools = resolvedTools.length > 0 ? resolvedTools : undefined;

          const resourcesContext = calendarToolsActive
            ? await this.getCalendarResourcesContext(input.tenant.companyId, calendarScope)
            : "";
          const serverTime = calendarToolsActive ? new Date().toISOString() : null;

          // Update context metadata for logs
          Object.assign(contextMetadata, {
            detectedIntent: routeResult.reason || null,
            selectedFlowId: routeResult.flowId,
            selectedFlowName: routeResult.flowName,
            intentConfidence: routeResult.confidence,
            calendarScopeApplied: hasCalendarToolScope(calendarScope),
            calendarScope: calendarScope,
            toolArgsOverridden: false,
            resourceScopeApplied: hasCalendarToolScope(calendarScope),
            blockedByToolScope: false,
            blockReason: null,
          });

          let toolCallsResolved = false;

          // Short-circuit logic (Phase 1.5)
          if (selectedFlow) {
            const finalAction = selectedFlow.finalAction || "respond";
            const autoRespond = selectedFlow.autoRespond !== false; // true unless explicitly false

            if (finalAction === "fixed_message") {
              Object.assign(contextMetadata, { finalAction, llmSkipped: true, autoRespond });
              answer = selectedFlow.fixedMessage || "Agradecemos o contato.";
              runtime = {
                ...runtime,
                mode: "flow-bypass",
                fallback: false,
                outcome: "success",
                reason: undefined,
              };
              // Skip LLM
              toolCallsResolved = true;
            } else if (finalAction === "handoff" || selectedFlow.requiresHuman || !autoRespond) {
              if (this.cacheService) {
                const triageCacheKey = `triage:${input.tenant.companyId}:${conversation.id}`;
                try {
                  await this.cacheService.set(triageCacheKey, null, 1);
                } catch (err: any) {
                  this.logger.warn(`Failed to clear triage cache on handoff: ${err.message}`);
                }
              }
              Object.assign(contextMetadata, {
                finalAction,
                llmSkipped: true,
                handoffPending: true,
                autoRespond,
              });
              // We don't implement real chatwoot handoff yet, but we skip LLM.
              // If we shouldn't respond at all, we could throw or return early, but sendMessage expects an answer.
              // So we provide an internal fallback answer.
              answer = "Transferindo para um atendente...";
              runtime = {
                ...runtime,
                mode: "flow-bypass",
                fallback: false,
                outcome: "handoff",
                reason: undefined,
              };
              // Skip LLM
              toolCallsResolved = true;
            }
          }

          let promptMessages: any[] = [];
          if (!toolCallsResolved) {
            // Every Chatwoot path uses the same compiler, even if dependency injection is absent.
            const compiler = this.promptCompilerService ?? new PromptCompilerService();
            promptMessages = compiler.compile({
              assistant: {
                ...assistant,
                instructions: promptInstructions,
              },
              behavior: assistant.behavior,
              flow: selectedFlow,
              securityRules: activeSecurityRules,
              knowledgeItems,
              historyMessages: priorHistory,
              currentMessage: interpretedMessage,
              officialBusinessContext,
              calendarContext: calendarToolsActive
                ? {
                    conversationId: conversation.id,
                    contactPhone,
                    resourcesContext,
                    serverTime,
                  }
                : null,
              memoryContextBlock,
            });

            Object.assign(contextMetadata, {
              promptVersion: PROMPT_COMPILER_VERSION,
              promptHash: hashPromptMessages(promptMessages),
              promptSections: getPromptSectionLabels(promptMessages),
              behaviorId: assistant.behavior?.id ?? null,
              behaviorUpdatedAt: assistant.behavior?.updatedAt ?? null,
              assistantUpdatedAt: assistant.updatedAt,
              behaviorResponseStyle: assistant.behavior?.responseStyle ?? null,
              splitResponseStyle: assistant.splitResponseStyle ?? "SINGLE",
              temperature,
              temperatureParameterApplied: modelSupportsTemperature(resolvedModel.model),
              triageMode,
              knowledgeLimit,
              knowledgeChunkCount: knowledgeItems.length,
              knowledgeChunkIds: knowledgeItems.map((item) => item.id),
            });

            if (process.env.AI_RUNTIME_TRACE === "true") {
              this.logger.log(
                `[Assistant Runtime Trace] ${JSON.stringify({
                  requestId: contextMetadata.requestId,
                  correlationId: contextMetadata.correlationId,
                  companyId: input.tenant.companyId,
                  assistantId: assistant.id,
                  behaviorId: contextMetadata.behaviorId,
                  assistantUpdatedAt: contextMetadata.assistantUpdatedAt,
                  behaviorUpdatedAt: contextMetadata.behaviorUpdatedAt,
                  promptVersion: contextMetadata.promptVersion,
                  promptHash: contextMetadata.promptHash,
                  promptSections: contextMetadata.promptSections,
                  selectedFlowId: selectedFlow?.id ?? null,
                  triageMode,
                  knowledgeLimit,
                  knowledgeChunkCount: knowledgeItems.length,
                  historyMessagesUsed: priorHistory.length,
                  model: resolvedModel.model,
                  provider: runtimeConfig.provider,
                  temperature,
                  temperatureParameterApplied: contextMetadata.temperatureParameterApplied,
                })}`,
              );
            }
          }

          if (isDebugLogsEnabled && !toolCallsResolved) {
            // TEMPORARY DIAGNOSTIC LOGS
            console.log("\n=== TEMPORARY DIAGNOSTIC LOGS: START ===");
            console.log("Source:", input.dto.source || conversation.source);
            console.log("CompanyId (Tenant):", input.tenant.companyId);
            console.log("AssistantId:", assistant.id);
            console.log("Assistant CompanyId:", input.tenant.companyId);
            console.log("CalendarToolsActive:", calendarToolsActive);
            console.log("Tools count:", tools?.length || 0);
            console.log(
              "Has calendar_checkAvailability:",
              tools?.some((t) => t.function.name === "calendar_checkAvailability") || false,
            );
            console.log(
              "ResourcesContext populated:",
              !!resourcesContext,
              "| Length:",
              resourcesContext?.length || 0,
            );
            console.log(
              "Prompt Messages Calendar Context:",
              promptMessages.some(
                (m) =>
                  typeof m.content === "string" &&
                  m.content.includes("Instruções do Sistema de Reservas"),
              ),
            );
            console.log("=== TEMPORARY DIAGNOSTIC LOGS: END ===\n");
          }

          let completion: any;
          let triageValidationPassed = false;
          let triageAttemptCount = 0;
          let responseMode = "ai-runtime";
          let triageResolved = false;
          let triageContinuationLogged = triageContinuation;
          let schedulingExplicitlyRequested = false;

          if (triageMode) {
            responseMode = "TRIAGE_ONLY";
            triageAttemptCount = 1;

            const compiler = this.promptCompilerService ?? new PromptCompilerService();
            promptMessages = compiler.compile({
              assistant: {
                ...assistant,
                instructions: promptInstructions,
              },
              behavior: assistant.behavior,
              flow: selectedFlow,
              securityRules: activeSecurityRules,
              knowledgeItems: [], // zero chunks in triage
              historyMessages: [], // zero history in triage
              currentMessage: interpretedMessage,
              officialBusinessContext,
              calendarContext: null,
              memoryContextBlock,
              triageMode: true,
              isSecondAttempt: false,
              triageState: loadedTriageState,
            });

            // Update prompt metadata
            Object.assign(contextMetadata, {
              promptVersion: PROMPT_COMPILER_VERSION,
              promptHash: hashPromptMessages(promptMessages),
              promptSections: getPromptSectionLabels(promptMessages),
            });

            try {
              completion = await this.aiService.generateChatCompletion({
                companyId: input.tenant.companyId,
                messages: promptMessages,
                model: resolvedModel.model,
                temperature,
                tools: [], // zero tools in triage
                response_format: { type: "json_object" },
              });

              if (completion && completion.answer && isTriageResponseValid(completion.answer)) {
                const parsed = JSON.parse(completion.answer.replace(/^```json\s*/i, "").replace(/\s*```$/, ""));
                if (parsed.triageResolved) {
                  triageResolved = true;
                  triageValidationPassed = true;
                  answer = parsed.message;
                } else {
                  triageValidationPassed = true;
                  answer = parsed.message;
                  // Persist triage state
                  if (this.cacheService) {
                    const triageState: TriageState = {
                      active: true,
                      startedAt: loadedTriageState?.startedAt ?? new Date().toISOString(),
                      sourceMessageId: userMessage.id,
                      requestedDetail: parsed.requestedDetail ?? "",
                      lastQuestion: parsed.message ?? "",
                      attemptCount: triageAttemptCount,
                      resolved: false,
                      expiresAt: loadedTriageState?.expiresAt ?? (Date.now() + 3600000),
                    };
                    await this.cacheService.set(triageCacheKey, triageState, 3600);
                  }
                }
              }
            } catch (err: any) {
              this.logger.error(`Error in triage mode attempt 1: ${err.message}`, err.stack);
            }

            // Attempt 2
            if (!triageValidationPassed) {
              triageAttemptCount = 2;

              promptMessages = compiler.compile({
                assistant: {
                  ...assistant,
                  instructions: promptInstructions,
                },
                behavior: assistant.behavior,
                flow: selectedFlow,
                securityRules: activeSecurityRules,
                knowledgeItems: [],
                historyMessages: [],
                currentMessage: interpretedMessage,
                officialBusinessContext,
                calendarContext: null,
                memoryContextBlock,
                triageMode: true,
                isSecondAttempt: true,
                triageState: loadedTriageState,
              });

              // Update prompt metadata for second attempt
              Object.assign(contextMetadata, {
                promptVersion: PROMPT_COMPILER_VERSION,
                promptHash: hashPromptMessages(promptMessages),
                promptSections: getPromptSectionLabels(promptMessages),
              });

              try {
                completion = await this.aiService.generateChatCompletion({
                  companyId: input.tenant.companyId,
                  messages: promptMessages,
                  model: resolvedModel.model,
                  temperature,
                  tools: [], // zero tools in triage
                  response_format: { type: "json_object" },
                });

                if (completion && completion.answer && isTriageResponseValid(completion.answer)) {
                  const parsed = JSON.parse(completion.answer.replace(/^```json\s*/i, "").replace(/\s*```$/, ""));
                  if (parsed.triageResolved) {
                    triageResolved = true;
                    triageValidationPassed = true;
                    answer = parsed.message;
                  } else {
                    triageValidationPassed = true;
                    answer = parsed.message;
                    // Persist triage state
                    if (this.cacheService) {
                      const triageState: TriageState = {
                        active: true,
                        startedAt: loadedTriageState?.startedAt ?? new Date().toISOString(),
                        sourceMessageId: userMessage.id,
                        requestedDetail: parsed.requestedDetail ?? "",
                        lastQuestion: parsed.message ?? "",
                        attemptCount: triageAttemptCount,
                        resolved: false,
                        expiresAt: loadedTriageState?.expiresAt ?? (Date.now() + 3600000),
                      };
                      await this.cacheService.set(triageCacheKey, triageState, 3600);
                    }
                  }
                }
              } catch (err: any) {
                this.logger.error(`Error in triage mode attempt 2: ${err.message}`, err.stack);
              }
            }

            // Fallback genérico se falhar
            if (!triageValidationPassed) {
              answer = "Consigo te ajudar com isso! Qual é o principal detalhe ou informação que você já consegue me passar?";
              if (this.cacheService) {
                const triageState: TriageState = {
                  active: true,
                  startedAt: loadedTriageState?.startedAt ?? new Date().toISOString(),
                  sourceMessageId: userMessage.id,
                  requestedDetail: loadedTriageState?.requestedDetail ?? "informações básicas",
                  lastQuestion: answer,
                  attemptCount: triageAttemptCount,
                  resolved: false,
                  expiresAt: loadedTriageState?.expiresAt ?? (Date.now() + 3600000),
                };
                await this.cacheService.set(triageCacheKey, triageState, 3600);
              }
            }

            // Se a triagem foi resolvida com sucesso
            if (triageResolved) {
              // Limpa o cache
              if (this.cacheService) {
                try {
                  await this.cacheService.set(triageCacheKey, null, 1);
                } catch (err: any) {
                  this.logger.warn(`Failed to clear triage cache: ${err.message}`);
                }
              }

              triageMode = false;

              runtime = {
                ...runtime,
                mode: "ai-runtime",
                fallback: false,
                outcome: "success",
                provider: completion?.provider ?? runtimeConfig.provider ?? null,
                model: completion?.model ?? resolvedModel.model ?? null,
                reason: undefined,
                ragData: ragLogData,
              };

              Object.assign(contextMetadata, {
                responseMode: "TRIAGE_ONLY",
                triageMode: true,
                triageStateActive: false,
                triageResolved: true,
                triageContinuation: triageContinuationLogged,
                triageAttemptCount,
                schedulingExplicitlyRequested,
                triageValidationPassed: true,
              });

              toolCallsResolved = true; // Bypasses normal loop
            } else {
              // Mapeamento normal para triage persistente
              runtime = {
                ...runtime,
                mode: "ai-runtime",
                fallback: !triageValidationPassed,
                outcome: "success",
                provider: completion?.provider ?? runtimeConfig.provider ?? null,
                model: completion?.model ?? resolvedModel.model ?? null,
                reason: undefined,
                ragData: ragLogData,
              };

              Object.assign(contextMetadata, {
                responseMode,
                triageMode: true,
                triageStateActive: true,
                triageRequestedDetail: loadedTriageState?.requestedDetail ?? "",
                triageResolved: false,
                triageContinuation: triageContinuationLogged,
                triageAttemptCount,
                schedulingExplicitlyRequested,
                triageValidationPassed,
              });

              toolCallsResolved = true; // Bypasses normal loop
            }
          }

          let loopCount = 0;

          while (loopCount < 5 && !toolCallsResolved) {
            completion = await this.aiService.generateChatCompletion({
              companyId: input.tenant.companyId,
              messages: promptMessages,
              model: resolvedModel.model,
              temperature,
              tools,
            });

            if (completion.toolCalls && completion.toolCalls.length > 0) {
              promptMessages.push({
                role: "assistant",
                content: completion.answer || "",
                tool_calls: completion.toolCalls,
              } as any);

              await this.prisma.assistantConversationMessage.create({
                data: {
                  companyId: input.tenant.companyId,
                  assistantId: input.assistantId,
                  conversationId: conversation.id,
                  role: "assistant",
                  content: completion.answer || "",
                  externalPayload: this.toSerializableJsonValue({
                    tool_calls: completion.toolCalls,
                  }),
                  mode: "ai-runtime",
                  contextVersion: conversation.currentContextVersion ?? 1,
                },
              });

              for (const toolCall of completion.toolCalls) {
                const toolName = this.normalizeCalendarToolName(toolCall.function.name);
                const toolArgs = JSON.parse(toolCall.function.arguments);
                let resultString = "";

                try {
                  const preparedTool = await this.prepareToolExecution({
                    companyId: input.tenant.companyId,
                    assistantId: input.assistantId,
                    selectedFlow: selectedFlow ?? null,
                    toolName,
                    args: toolArgs,
                  });
                  const effectiveToolArgs = preparedTool.args;
                  Object.assign(contextMetadata, preparedTool.metadata);

                  let requiresConfirmation = false;
                  if (toolName.startsWith("webhook_")) {
                    const actionName = toolName.replace("webhook_", "");
                    const action = await this.prisma.customWebhookAction.findFirst({
                      where: { companyId: input.tenant.companyId, name: actionName, active: true },
                    });
                    if (action) {
                      const appInst = await this.prisma.appInstallation.findFirst({
                        where: {
                          companyId: input.tenant.companyId,
                          app: { slug: "custom_webhook" },
                        },
                      });
                      const override = appInst
                        ? await this.prisma.assistantToolConfig.findFirst({
                            where: {
                              assistantId: input.assistantId,
                              appId: appInst.appId,
                              toolName,
                            },
                          })
                        : null;
                      requiresConfirmation = override
                        ? override.requiresConfirmation
                        : action.requiresConfirmation;
                    }
                  } else {
                    const isMutating = [
                      "calendar_createBooking",
                      "calendar_rescheduleBooking",
                      "calendar_cancelBooking",
                    ].includes(toolName);
                    const appInst = await this.prisma.appInstallation.findFirst({
                      where: {
                        companyId: input.tenant.companyId,
                        app: { slug: "google_calendar" },
                      },
                    });
                    const override = appInst
                      ? await this.prisma.assistantToolConfig.findFirst({
                          where: { assistantId: input.assistantId, appId: appInst.appId, toolName },
                        })
                      : null;
                    requiresConfirmation = override ? override.requiresConfirmation : isMutating;
                  }

                  if (requiresConfirmation) {
                    await this.logToolAction(input.tenant.companyId, "confirmation_required", {
                      toolName,
                      args: effectiveToolArgs,
                      ...preparedTool.metadata,
                    });

                    const isConfirmed =
                      /(sim|pode|confirmo|confirmar|isso\s+mesmo|ok|fechado|perfeito|pode\s+reservar|pode\s+cancelar|pode\s+remarcar)/i.test(
                        interpretedMessage,
                      );
                    if (!isConfirmed) {
                      await this.logToolAction(input.tenant.companyId, "confirmation_missing", {
                        toolName,
                        args: effectiveToolArgs,
                        ...preparedTool.metadata,
                      });
                      resultString = JSON.stringify({
                        error:
                          "Confirmação pendente. Você deve apresentar os detalhes da ação (resumo claro) e pedir confirmação explícita ao usuário (ex: 'Confirmando: ..., posso confirmar?') antes de prosseguir.",
                      });
                    } else {
                      await this.logToolAction(input.tenant.companyId, "confirmation_received", {
                        toolName,
                        args: effectiveToolArgs,
                        ...preparedTool.metadata,
                      });
                      resultString = await this.executeTool(
                        input.tenant.companyId,
                        toolName,
                        effectiveToolArgs,
                        preparedTool.metadata,
                        input.assistantId,
                        selectedFlow,
                      );
                    }
                  } else {
                    resultString = await this.executeTool(
                      input.tenant.companyId,
                      toolName,
                      effectiveToolArgs,
                      preparedTool.metadata,
                      input.assistantId,
                      selectedFlow,
                    );
                  }
                } catch (err) {
                  const errMsg =
                    err instanceof Error
                      ? err.message
                      : "Erro desconhecido na chamada da ferramenta.";
                  if (errMsg.includes("outside selected flow calendar scope")) {
                    Object.assign(contextMetadata, {
                      blockedByToolScope: true,
                      blockReason: errMsg,
                      resourceScopeApplied: true,
                    });
                  }
                  resultString = JSON.stringify({ error: errMsg });
                }

                if (isDebugLogsEnabled) {
                  console.log(`\n=== DIAGNOSTIC: TOOL EXECUTION: ${toolName} ===`);
                  const isError = resultString.includes('"error"');
                  console.log("Status:", isError ? "ERROR" : "SUCCESS");
                  if (isError) {
                    console.log("Result (sanitized):", resultString);
                  }
                  console.log("=== END TOOL ===\n");
                }

                promptMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  name: toolName,
                  content: resultString,
                } as any);

                await this.prisma.assistantConversationMessage.create({
                  data: {
                    companyId: input.tenant.companyId,
                    assistantId: input.assistantId,
                    conversationId: conversation.id,
                    role: "tool",
                    content: resultString,
                    externalPayload: this.toSerializableJsonValue({
                      tool_call_id: toolCall.id,
                      name: toolName,
                    }),
                    mode: "ai-runtime",
                    contextVersion: conversation.currentContextVersion ?? 1,
                  },
                });
              }

              loopCount++;
            } else {
              toolCallsResolved = true;
            }
          }

          if (!runtime || runtime.mode !== "flow-bypass") {
            answer = completion.answer;
            runtime = {
              ...runtime,
              mode: assistant.ragEnabled ? "ai-runtime-rag" : "ai-runtime",
              fallback: false,
              outcome: "success",
              provider: completion.provider,
              model: completion.model,
              reason: undefined,
              ragData: ragLogData,
            };
          }
        } catch (error) {
          console.error("COMPLETION ERROR TRACE:", error);
          const fallbackReason = this.resolveProviderFallbackReason(error);
          providerErrorLogFields = this.extractProviderErrorLogFields(error);
          runtime = {
            ...runtime,
            mode: "deterministic-runtime",
            fallback: true,
            outcome: "fallback",
            reason: fallbackReason,
            warning: this.buildDeterministicRuntimeWarning(fallbackReason),
          };
        }
      }
    }

    runtime = {
      ...runtime,
      summary: this.buildRuntimeSummary({
        question: interpretedMessage,
        mode: runtime.mode,
        sourcesCount: sources.length,
        outcome: runtime.outcome,
        historyMessagesUsed: runtime.context.historyMessagesUsed,
      }),
    };

    let blocks = [answer];
    if (source === "chatwoot") {
      if (assistant.splitResponseStyle === "NATURAL_BLOCKS") {
        blocks = splitNaturalResponseBlocks(answer);
        if (blocks.length === 0) blocks = [answer];
      }
    }
    const outboundBlockCountPlanned = blocks.length;
    Object.assign(contextMetadata, {
      outboundBlockCountPlanned,
      outboundBlockCountSent: 0,
      outboundBlockCount: 0,
    });

    const { assistantMessage, runtimeLogId } = await this.prisma.$transaction(async (tx) => {
      const createdAssistantMessage = await tx.assistantConversationMessage.create({
        data: {
          companyId: input.tenant.companyId,
          assistantId: input.assistantId,
          conversationId: conversation.id,
          role: "assistant",
          content: answer,
          sources,
          mode: runtime.mode,
          contextVersion: conversation.currentContextVersion ?? 1,
        },
        select: assistantConversationMessageSafeSelect,
      });

      const runtimeLog = await tx.assistantRuntimeLog.create({
        data: {
          companyId: input.tenant.companyId,
          assistantId: assistant.id,
          conversationId: conversation.id,
          userMessageId: userMessage.id,
          assistantMessageId: createdAssistantMessage.id,
          mode: runtime.mode,
          status: this.resolveRuntimeLogStatus(runtime),
          provider: runtime.provider ?? runtimeConfig.provider ?? null,
          model: (runtime.model ?? resolvedModel.model) || null,
          configurationSource: runtime.configurationSource,
          fallback: runtime.fallback,
          fallbackReason: runtime.reason ?? null,
          outcome: runtime.outcome,
          durationMs: Date.now() - runtimeStartedAt,
          providerStatus: providerErrorLogFields.providerStatus ?? null,
          providerErrorType: providerErrorLogFields.providerErrorType ?? null,
          providerErrorCode: providerErrorLogFields.providerErrorCode ?? null,
          providerErrorMessage: providerErrorLogFields.providerErrorMessage ?? null,
          knowledgeCount: runtime.ragData?.usedKnowledge?.length ?? knowledgeItems.length,
          historyMessagesUsed: runtime.context.historyMessagesUsed,
          historyLimit: runtime.context.historyLimit,
          initialMessageIncluded: runtime.context.initialMessageIncluded,
          instructionsIncluded: runtime.context.instructionsIncluded,
          detectedIntent: runtime.context.detectedIntent,
          selectedFlowId: runtime.context.selectedFlowId,
          selectedFlowName: runtime.context.selectedFlowName,
          intentConfidence: runtime.context.intentConfidence,
          metadata: this.toSerializableJsonValue({
            finalAction: runtime.context.finalAction,
            llmSkipped: runtime.context.llmSkipped,
            handoffPending: runtime.context.handoffPending,
            autoRespond: runtime.context.autoRespond,
            calendarScopeApplied: runtime.context.calendarScopeApplied,
            calendarScope: runtime.context.calendarScope,
            toolArgsOverridden: runtime.context.toolArgsOverridden,
            resourceScopeApplied: runtime.context.resourceScopeApplied,
            blockedByToolScope: runtime.context.blockedByToolScope,
            blockReason: runtime.context.blockReason,
            safetyInstructionIncluded: runtime.context.safetyInstructionIncluded,
            activeSecurityRulesCount: runtime.context.activeSecurityRulesCount,
            activeSecurityRuleIds: activeSecurityRules.map((rule) => rule.id),
            officialTimezoneUsed: runtime.context.officialTimezoneUsed,
            officialLocalDate: runtime.context.officialLocalDate,
            officialLocalTime: runtime.context.officialLocalTime,
            officialOpenNow: runtime.context.officialOpenNow,
            officialOnBreak: runtime.context.officialOnBreak,
            officialDataSource: runtime.context.officialDataSource,
            outsideBusinessHours: runtime.context.outsideBusinessHours,
            outsideBusinessHoursPolicy: runtime.context.outsideBusinessHoursPolicy,
            requestId: runtime.context.requestId,
            correlationId: runtime.context.correlationId,
            promptVersion: runtime.context.promptVersion,
            promptHash: runtime.context.promptHash,
            promptSections: runtime.context.promptSections,
            behaviorId: runtime.context.behaviorId,
            behaviorUpdatedAt: runtime.context.behaviorUpdatedAt,
            assistantUpdatedAt: runtime.context.assistantUpdatedAt,
            behaviorResponseStyle: runtime.context.behaviorResponseStyle,
            splitResponseStyle: runtime.context.splitResponseStyle,
            temperature: runtime.context.temperature,
            temperatureParameterApplied: runtime.context.temperatureParameterApplied,
            triageMode: runtime.context.triageMode,
            triageValidationPassed: runtime.context.triageValidationPassed,
            triageAttemptCount: runtime.context.triageAttemptCount,
            responseMode: runtime.context.responseMode,
            triageStateActive: runtime.context.triageStateActive,
            triageRequestedDetail: runtime.context.triageRequestedDetail,
            triageResolved: runtime.context.triageResolved,
            triageContinuation: runtime.context.triageContinuation,
            schedulingExplicitlyRequested: runtime.context.schedulingExplicitlyRequested,
            validationFailureReason: runtime.context.validationFailureReason,
            outboundBlockCountPlanned: runtime.context.outboundBlockCountPlanned,
            outboundBlockCountSent: runtime.context.outboundBlockCountSent,
            outboundBlockCount: runtime.context.outboundBlockCount,
            knowledgeCount: runtime.ragData?.usedKnowledge?.length ?? knowledgeItems.length,
            knowledgeLimit: runtime.context.knowledgeLimit,
            knowledgeChunkCount: runtime.context.knowledgeChunkCount,
            knowledgeChunkIds: runtime.context.knowledgeChunkIds,
          }),
        },
        select: {
          id: true,
        },
      });

      await tx.assistantConversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          title: conversation.title,
        },
        select: {
          id: true,
        },
      });

      return {
        assistantMessage: createdAssistantMessage,
        runtimeLogId: runtimeLog.id,
      };
    });

    runtime = {
      ...runtime,
      logId: runtimeLogId,
    };

    if (source === "chatwoot") {
      if (process.env.AI_RUNTIME_TRACE === "true") {
        this.logger.log(
          `[Assistant Runtime Outbound Trace] ${JSON.stringify({
            requestId: contextMetadata.requestId,
            correlationId: contextMetadata.correlationId,
            companyId: input.tenant.companyId,
            assistantId: assistant.id,
            splitResponseStyle: assistant.splitResponseStyle ?? "SINGLE",
            rawResponseLength: assistantMessage.content.length,
            outboundBlockCount: blocks.length,
          })}`,
        );
      }

      let blocksSent = 0;
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        try {
          await this.sendChatwootOutboundText({
            conversation: {
              ...conversation,
              sourceProvider: source,
              externalConversationId:
                input.dto.externalConversationId ?? conversation.externalConversationId,
              externalContactId: input.dto.externalContactId ?? conversation.externalContactId,
              externalInboxId: input.dto.externalInboxId ?? conversation.externalInboxId,
              externalChannelId: input.dto.externalChannelId ?? conversation.externalChannelId,
            },
            assistantMessageId: assistantMessage.id,
            assistantId: input.assistantId,
            content: block,
          });
          blocksSent++;
        } catch (err: any) {
          this.logger.error(`Error sending Chatwoot block ${i}: ${err.message}`, err.stack);
          break;
        }

        // Adiciona um pequeno delay entre as mensagens fatiadas
        if (i < blocks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      // Update runtime log metadata with sent blocks count!
      try {
        if (
          this.prisma.assistantRuntimeLog &&
          typeof this.prisma.assistantRuntimeLog.findUnique === "function" &&
          typeof this.prisma.assistantRuntimeLog.update === "function"
        ) {
          const log = await this.prisma.assistantRuntimeLog.findUnique({ where: { id: runtimeLogId } });
          if (log && log.metadata) {
            const currentMeta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
            const updatedMeta = {
              ...currentMeta,
              outboundBlockCountSent: blocksSent,
              outboundBlockCount: blocksSent,
            };
            await this.prisma.assistantRuntimeLog.update({
              where: { id: runtimeLogId },
              data: { metadata: updatedMeta },
            });
          }
        }
      } catch (err: any) {
        this.logger.error(`Failed to update outboundBlockCountSent: ${err.message}`);
      }
    }

    // Async memory extraction
    if (
      assistant.memoryEnabled &&
      assistant.memoryExtractionEnabled &&
      this.contactMemoriesExtractionService &&
      contactMemoryProfileId
    ) {
      // Execute in background
      void this.contactMemoriesExtractionService
        .extractMemories({
          companyId: input.tenant.companyId,
          assistantId: assistant.id,
          profileId: contactMemoryProfileId,
          currentMessage: interpretedMessage,
          recentMessages: priorHistory.slice(-5).map((m) => ({ role: m.role, content: m.content })),
          existingMemories,
          sourceConversationId: conversation.id,
          sourceMessageId: userMessage.id,
          allowedCategories: (() => {
            try {
              return assistant.memoryAllowedCategories
                ? JSON.parse(assistant.memoryAllowedCategories)
                : undefined;
            } catch {
              return undefined;
            }
          })(),
          tempDefaultDays: assistant.memoryTempDefaultDays,
        })
        .catch((err) => {
          this.logger.error(`Background memory extraction failed: ${err.message}`);
        });
    }

    return {
      conversationId: conversation.id,
      userMessage: toConversationMessageItem(userMessage),
      assistantMessage: toConversationMessageItem(assistantMessage),
      runtime,
    };
  }

  private async resolveContactPhone(
    conversationId: string,
    companyId: string,
    dto: SendAssistantConversationMessageDto,
  ): Promise<string> {
    if (dto.externalSenderPhone?.trim()) {
      return dto.externalSenderPhone.trim();
    }
    if (dto.contact?.phone?.trim()) {
      return dto.contact.phone.trim();
    }

    const findFirstMessage = this.prisma.assistantConversationMessage.findFirst?.bind(
      this.prisma.assistantConversationMessage,
    );
    if (!findFirstMessage) {
      return "";
    }

    const lastUserMsg = await findFirstMessage({
      where: {
        conversationId,
        companyId,
        role: "user",
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastUserMsg && lastUserMsg.externalPayload) {
      const payload = lastUserMsg.externalPayload as any;
      if (payload.externalSenderPhone) return payload.externalSenderPhone;
      if (payload.contact?.phone) return payload.contact.phone;
    }

    return "";
  }

  private async areGoogleCalendarToolsAvailable(companyId: string): Promise<boolean> {
    if (!this.calendarToolsService) {
      return false;
    }

    try {
      const app = await this.prisma.app.findUnique({
        where: { slug: "google_calendar" },
        select: { id: true },
      });
      if (!app) return false;

      const installation = await this.prisma.appInstallation.findFirst({
        where: {
          companyId,
          appId: app.id,
        },
        select: { status: true, id: true },
      });
      if (!installation || installation.status !== "ACTIVE") return false;

      const credential = await this.prisma.appCredential.findFirst({
        where: {
          companyId,
          installationId: installation.id,
          provider: "google",
          status: "ACTIVE",
        },
      });
      if (!credential) return false;

      const activeResource = await this.prisma.googleCalendarResource.findFirst({
        where: {
          companyId,
          installationId: installation.id,
          active: true,
        },
      });
      return !!activeResource;
    } catch {
      return false;
    }
  }

  private getGoogleCalendarToolsDefinitions() {
    return [
      {
        type: "function",
        function: {
          name: "calendar_checkAvailability",
          description:
            "Consulta horários disponíveis (slots livres) em recursos ou serviços conectados ao Google Agenda para uma data e intervalo de horas.",
          parameters: {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "A data no formato YYYY-MM-DD (ex: 2026-07-04)",
              },
              timeFrom: {
                type: "string",
                description: "O horário de início no formato HH:MM (ex: 08:00)",
              },
              timeTo: {
                type: "string",
                description: "O horário de fim no formato HH:MM (ex: 18:00)",
              },
              category: {
                type: "string",
                description:
                  "Opcional. Categoria, modalidade ou serviço do recurso (ex: Beach Tennis, Padel, Consulta Médica, Reunião Comercial)",
              },
              sportType: {
                type: "string",
                description:
                  "Opcional. Modalidade principal do recurso quando aplicável (ex: Padel, Beach Tennis).",
              },
              resourceType: {
                type: "string",
                description:
                  "Opcional. Tipo do recurso (ex: Quadra, Sala, Consultório, Profissional)",
              },
              attribute: {
                type: "string",
                description:
                  "Opcional. Característica ou atributo específico do recurso (ex: Coberta, Aberta, Com Ar, VIP)",
              },
              durationMinutes: {
                type: "integer",
                description: "Opcional. Duração do agendamento em minutos. Padrão é 60.",
              },
            },
            required: ["date", "timeFrom", "timeTo"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "calendar_createBooking",
          description:
            "Cria um novo agendamento/reserva localmente e no Google Agenda. ATENÇÃO: Esta ação exige confirmação explícita prévia do cliente (como 'sim', 'confirmo', 'pode reservar') contendo um resumo claro dos detalhes antes de ser executada.",
          parameters: {
            type: "object",
            properties: {
              resourceId: {
                type: "string",
                description: "O ID do recurso/serviço a ser reservado",
              },
              contactName: {
                type: "string",
                description: "Nome do contato para o agendamento",
              },
              contactPhone: {
                type: "string",
                description: "Telefone do contato para o agendamento",
              },
              startAt: {
                type: "string",
                description:
                  "Data e hora de início no formato ISO 8601 (ex: 2026-07-04T13:00:00.000Z)",
              },
              endAt: {
                type: "string",
                description:
                  "Data e hora de fim no formato ISO 8601 (ex: 2026-07-04T14:00:00.000Z)",
              },
              notes: {
                type: "string",
                description: "Opcional. Observações ou notas adicionais para o agendamento",
              },
            },
            required: ["resourceId", "contactName", "contactPhone", "startAt", "endAt"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "calendar_getBookingsByContact",
          description:
            "Lista agendamentos/reservas futuras ativas de um cliente baseado no número de telefone do contato.",
          parameters: {
            type: "object",
            properties: {
              contactPhone: {
                type: "string",
                description: "O número de telefone do contato (ex: 67999999999)",
              },
            },
            required: ["contactPhone"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "calendar_rescheduleBooking",
          description:
            "Remarca um agendamento/reserva para uma nova data, horário e opcionalmente um novo recurso. ATENÇÃO: Esta ação exige confirmação explícita prévia do cliente contendo um resumo claro antes de ser executada.",
          parameters: {
            type: "object",
            properties: {
              bookingId: {
                type: "string",
                description: "O ID do agendamento existente a ser remarcado",
              },
              newStartAt: {
                type: "string",
                description:
                  "Nova data e hora de início no formato ISO 8601 (ex: 2026-07-04T15:00:00.000Z)",
              },
              newEndAt: {
                type: "string",
                description:
                  "Nova data e hora de fim no formato ISO 8601 (ex: 2026-07-04T16:00:00.000Z)",
              },
              newResourceId: {
                type: "string",
                description: "Opcional. Novo ID do recurso se estiver mudando de recurso/serviço",
              },
              reason: {
                type: "string",
                description: "Opcional. Motivo da remarcação",
              },
            },
            required: ["bookingId", "newStartAt", "newEndAt"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "calendar_cancelBooking",
          description:
            "Cancela um agendamento/reserva existente e a remove do Google Agenda. ATENÇÃO: Esta ação exige confirmação explícita prévia do cliente contendo um resumo claro antes de ser executada.",
          parameters: {
            type: "object",
            properties: {
              bookingId: {
                type: "string",
                description: "O ID do agendamento a ser cancelado",
              },
              reason: {
                type: "string",
                description: "Opcional. Motivo do cancelamento",
              },
            },
            required: ["bookingId"],
          },
        },
      },
    ];
  }

  private normalizeCalendarToolName(toolName: string): string {
    const normalized = toolName.trim();

    switch (normalized) {
      case "calendar.checkAvailability":
        return "calendar_checkAvailability";
      case "calendar.createBooking":
        return "calendar_createBooking";
      case "calendar.getBookingsByContact":
        return "calendar_getBookingsByContact";
      case "calendar.rescheduleBooking":
        return "calendar_rescheduleBooking";
      case "calendar.cancelBooking":
        return "calendar_cancelBooking";
      default:
        return normalized;
    }
  }

  private resolveFlowToolContext(
    selectedFlow: AssistantConversationRuntimeAssistantRecord["flows"][number] | null,
  ) {
    return normalizeAssistantFlowToolContext(selectedFlow?.toolContext ?? null);
  }

  private async prepareToolExecution(input: {
    companyId: string;
    assistantId: string;
    selectedFlow: AssistantConversationRuntimeAssistantRecord["flows"][number] | null;
    toolName: string;
    args: Record<string, any>;
  }): Promise<PreparedToolExecution> {
    const flowToolContext = this.resolveFlowToolContext(input.selectedFlow);
    const calendarScope = flowToolContext?.calendar ?? null;
    const metadata: PreparedToolExecution["metadata"] = {
      calendarScopeApplied: hasCalendarToolScope(calendarScope),
      calendarScope,
      toolArgsOverridden: false,
      resourceScopeApplied: hasCalendarToolScope(calendarScope),
      blockedByToolScope: false,
    };

    if (!hasCalendarToolScope(calendarScope)) {
      return { args: input.args, metadata };
    }

    if (input.toolName === "calendar_checkAvailability") {
      const scopedArgs = {
        ...input.args,
        ...(calendarScope.category ? { category: calendarScope.category } : {}),
        ...(calendarScope.sportType ? { sportType: calendarScope.sportType } : {}),
        ...(calendarScope.resourceType ? { resourceType: calendarScope.resourceType } : {}),
        ...(calendarScope.attribute ? { attribute: calendarScope.attribute } : {}),
        ...(calendarScope.durationMinutes
          ? { durationMinutes: calendarScope.durationMinutes }
          : {}),
        ...(calendarScope.isCovered !== null && calendarScope.isCovered !== undefined
          ? { isCovered: calendarScope.isCovered }
          : {}),
      };

      metadata.toolArgsOverridden = JSON.stringify(input.args) !== JSON.stringify(scopedArgs);

      return {
        args: scopedArgs,
        metadata,
      };
    }

    if (
      input.toolName === "calendar_createBooking" ||
      input.toolName === "calendar_rescheduleBooking" ||
      input.toolName === "calendar_cancelBooking"
    ) {
      await this.assertToolCallWithinCalendarScope({
        companyId: input.companyId,
        toolName: input.toolName,
        args: input.args,
        calendarScope,
        selectedFlow: input.selectedFlow,
      });
    }

    return { args: input.args, metadata };
  }

  private async assertToolCallWithinCalendarScope(input: {
    companyId: string;
    toolName: string;
    args: Record<string, any>;
    calendarScope: CalendarToolScope;
    selectedFlow: AssistantConversationRuntimeAssistantRecord["flows"][number] | null;
  }): Promise<void> {
    const failScope = async (blockReason: string) => {
      await this.logToolAction(
        input.companyId,
        "tool_call_blocked_by_scope",
        {
          toolName: input.toolName,
          args: input.args,
          blockedByToolScope: true,
          blockReason,
          calendarScope: input.calendarScope,
          selectedFlowId: input.selectedFlow?.id ?? null,
          selectedFlowName: input.selectedFlow?.name ?? null,
        },
        "ERROR",
      );

      throw new BadRequestException(blockReason);
    };

    if (input.toolName === "calendar_createBooking") {
      const resource = await this.findResourceForScope(
        input.companyId,
        String(input.args.resourceId ?? ""),
      );
      if (!resource || !matchesCalendarToolScope(resource, input.calendarScope)) {
        await failScope("Resource outside selected flow calendar scope");
      }
      return;
    }

    if (input.toolName === "calendar_rescheduleBooking") {
      const booking = await this.findBookingForScope(
        input.companyId,
        String(input.args.bookingId ?? ""),
      );
      if (!booking || !matchesCalendarToolScope(booking.resource, input.calendarScope)) {
        await failScope("Booking resource outside selected flow calendar scope");
        return;
      }

      const targetResourceId = input.args.newResourceId ?? booking.resourceId;
      const resource = await this.findResourceForScope(input.companyId, String(targetResourceId));
      if (!resource || !matchesCalendarToolScope(resource, input.calendarScope)) {
        await failScope("Resource outside selected flow calendar scope");
      }
      return;
    }

    if (input.toolName === "calendar_cancelBooking") {
      const booking = await this.findBookingForScope(
        input.companyId,
        String(input.args.bookingId ?? ""),
      );
      if (!booking || !matchesCalendarToolScope(booking.resource, input.calendarScope)) {
        await failScope("Booking resource outside selected flow calendar scope");
      }
    }
  }

  private async findResourceForScope(companyId: string, resourceId: string) {
    if (!resourceId) {
      return null;
    }

    return this.prisma.googleCalendarResource.findFirst({
      where: {
        id: resourceId,
        companyId,
      },
      select: calendarScopeResourceSelect,
    });
  }

  private async findBookingForScope(
    companyId: string,
    bookingId: string,
  ): Promise<ScopedBookingRecord | null> {
    if (!bookingId) {
      return null;
    }

    return this.prisma.googleCalendarBooking.findFirst({
      where: {
        id: bookingId,
        companyId,
      },
      select: calendarScopeBookingSelect,
    });
  }

  private async getCalendarResourcesContext(
    companyId: string,
    calendarScope?: CalendarToolScope | null,
  ): Promise<string> {
    try {
      const app = await this.prisma.app.findUnique({
        where: { slug: "google_calendar" },
        select: { id: true },
      });
      if (!app) return "";

      const installation = await this.prisma.appInstallation.findFirst({
        where: {
          companyId,
          appId: app.id,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!installation) return "";

      const allResources = await this.prisma.googleCalendarResource.findMany({
        where: {
          companyId,
          installationId: installation.id,
          active: true,
        },
        include: {
          resourceTypeRef: { select: { name: true } },
          categoryRef: { select: { name: true } },
          attributeRef: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      });
      const resources = filterResourcesByCalendarToolScope(allResources, calendarScope);

      if (resources.length === 0) return "";

      const lines = ["Recursos/Serviços disponíveis para agendamento:"];
      for (const r of resources) {
        const typeStr = r.resourceTypeRef?.name || r.resourceType || "—";
        const catStr = r.categoryRef?.name || r.sportType || "—";
        const attrStr =
          r.attributeRef?.name ||
          (r.isCovered ? "Coberta" : r.isCovered === false ? "Aberta" : "—");
        lines.push(
          `- "${r.name}" (ID: ${r.id}) — Tipo: ${typeStr} | Categoria: ${catStr} | Característica: ${attrStr} | Fuso horário: ${r.timezone} | Duração padrão: ${r.defaultDurationMinutes} min`,
        );
      }
      return lines.join("\n");
    } catch (err) {
      this.logger.error("Failed to load calendar resources context for prompt", err);
      return "";
    }
  }

  private async executeTool(
    companyId: string,
    toolName: string,
    args: any,
    metadata: Record<string, any> = {},
    assistantId?: string,
    selectedFlow?: any,
  ): Promise<string> {
    const startedAt = Date.now();

    // --- GATEKEEPER VALIDATION (Fase 2) ---
    if (!assistantId) {
      throw new Error("Erro de execução: assistente não informado.");
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: { id: assistantId, companyId },
    });
    if (!assistant) {
      throw new Error("Erro de execução: assistente inválido ou não pertencente a esta empresa.");
    }

    // Validate selectedFlow allowedToolSlugs
    if (selectedFlow) {
      const finalAction = selectedFlow.finalAction || "respond";
      if (
        finalAction === "fixed_message" ||
        finalAction === "handoff" ||
        selectedFlow.autoRespond === false
      ) {
        throw new Error("Erro de execução: ação não permitida neste fluxo.");
      }
      if (selectedFlow.allowedToolSlugs) {
        try {
          const allowedSlugs = JSON.parse(selectedFlow.allowedToolSlugs);
          if (Array.isArray(allowedSlugs) && !allowedSlugs.includes(toolName)) {
            throw new Error(
              `Erro de execução: a ferramenta '${toolName}' não está autorizada no fluxo atual.`,
            );
          }
        } catch {
          // Ignore invalid JSON in flow config but fail safe
        }
      }
    }

    let isWebhook = toolName.startsWith("webhook_");
    let isCalendar = toolName.startsWith("calendar_");

    if (!isWebhook && !isCalendar) {
      throw new Error(`Erro de execução: tipo de ferramenta '${toolName}' não suportado.`);
    }

    if (isCalendar) {
      // 1. Verify Google Calendar App is installed and active for company
      const appInst = await this.prisma.appInstallation.findFirst({
        where: { companyId, app: { slug: "google_calendar" }, status: "ACTIVE" },
      });
      if (!appInst) {
        throw new Error("Erro de execução: extensão Google Agenda não está instalada ou ativa.");
      }

      // 2. Verify tool configuration is enabled for assistant
      const config = await this.prisma.assistantToolConfig.findFirst({
        where: { assistantId, appId: appInst.appId, toolName },
      });
      if (config && !config.enabled) {
        throw new Error(
          `Erro de execução: a ferramenta '${toolName}' está desabilitada para este assistente.`,
        );
      }
      if (
        config?.permissionType === "READ" &&
        [
          "calendar_createBooking",
          "calendar_rescheduleBooking",
          "calendar_cancelBooking",
        ].includes(toolName)
      ) {
        throw new Error(
          `Erro de execução: a ferramenta '${toolName}' exige permissão de escrita para este assistente.`,
        );
      }

      // 3. Verify calendar tools are active in environment
      if (!this.calendarToolsService) {
        throw new Error("Erro de execução: serviço de Google Agenda inativo no servidor.");
      }

      await this.logToolAction(companyId, "tool_call_requested", {
        toolName,
        arguments: args,
        ...metadata,
      });

      try {
        let result: any;
        if (toolName === "calendar_checkAvailability") {
          result = await this.calendarToolsService.checkAvailability({
            companyId,
            dto: args,
          });
        } else if (toolName === "calendar_createBooking") {
          result = await this.calendarToolsService.createBooking({
            companyId,
            dto: args,
          });
        } else if (toolName === "calendar_getBookingsByContact") {
          result = await this.calendarToolsService.getBookingsByContact({
            companyId,
            query: args,
          });
        } else if (toolName === "calendar_rescheduleBooking") {
          result = await this.calendarToolsService.rescheduleBooking({
            companyId,
            bookingId: args.bookingId,
            dto: args,
          });
        } else if (toolName === "calendar_cancelBooking") {
          result = await this.calendarToolsService.cancelBooking({
            companyId,
            bookingId: args.bookingId,
            dto: args,
          });
        } else {
          throw new Error(`Tool not found: ${toolName}`);
        }

        await this.logToolAction(companyId, "tool_call_completed", {
          toolName,
          durationMs: Date.now() - startedAt,
          ...metadata,
        });
        return JSON.stringify(result);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erro na chamada do Google Agenda.";
        await this.logToolAction(
          companyId,
          "tool_call_failed",
          { toolName, error: errMsg, ...metadata },
          "ERROR",
        );
        throw err;
      }
    }

    if (isWebhook) {
      const actionName = toolName.replace("webhook_", "");

      // 1. Get Custom Webhook Action and check active status
      const action = await this.prisma.customWebhookAction.findFirst({
        where: { companyId, name: actionName, active: true },
      });
      if (!action) {
        throw new Error(
          `Erro de execução: ação de webhook '${actionName}' não encontrada ou inativa.`,
        );
      }

      if (
        action.authConfig &&
        action.authType &&
        action.authType !== "NONE" &&
        !(action.authConfig as any).encryptedData
      ) {
        const migrated = await getOrMigrateWebhookCredentials(
          this.prisma,
          action.id,
          action.authType || "NONE",
          action.authConfig,
        );
        if (migrated) {
          action.authConfig = migrated;
        }
      }

      // 2. Verify custom_webhook App is installed and active for company
      const appInst = await this.prisma.appInstallation.findFirst({
        where: {
          id: action.installationId,
          companyId,
          app: { slug: "custom_webhook" },
          status: "ACTIVE",
        },
      });
      if (!appInst) {
        throw new Error(
          "Erro de execução: extensão Webhook Personalizado não está ativa para esta ação.",
        );
      }

      // 3. Verify tool configuration is enabled for assistant
      const config = await this.prisma.assistantToolConfig.findFirst({
        where: { assistantId, appId: appInst.appId, toolName },
      });
      if (config && !config.enabled) {
        throw new Error(
          `Erro de execução: a ferramenta '${toolName}' está desabilitada para este assistente.`,
        );
      }
      const effectivePermissionType = config?.permissionType ?? action.permissionType;
      if (effectivePermissionType === "READ" && !["GET", "HEAD"].includes(action.method)) {
        throw new Error(
          `Erro de execução: o webhook '${actionName}' exige permissão de escrita para este assistente.`,
        );
      }

      // 4. Log start
      await this.logToolAction(companyId, "tool_call_requested", {
        toolName,
        arguments: args,
        ...metadata,
      });

      try {
        const params = args || {};

        // Parse allowed parameters from schema to restrict placeholder injection
        const allowedParams = new Set<string>();
        if (action.parameterSchema) {
          const paramSchema =
            typeof action.parameterSchema === "string"
              ? JSON.parse(action.parameterSchema)
              : action.parameterSchema;
          if (paramSchema && paramSchema.properties) {
            for (const key of Object.keys(paramSchema.properties)) {
              allowedParams.add(key);
            }
          }
          // Validate JSON Schema
          try {
            validateJsonDepth(params, 5); // Limit depth
            validateJsonSchema(paramSchema, params);
          } catch (valErr: any) {
            throw new Error(`Validação de parâmetros falhou: ${valErr.message}`);
          }
        }

        // Replace placeholders safely in URL
        let url = action.url;
        url = url.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const trimKey = key.trim();
          if (!allowedParams.has(trimKey)) {
            throw new Error(
              `Placeholder '{{${trimKey}}}' não está declarado no schema de parâmetros.`,
            );
          }
          return params[trimKey] !== undefined ? encodeURIComponent(String(params[trimKey])) : "";
        });

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (action.headers) {
          const customHeaders =
            typeof action.headers === "string" ? JSON.parse(action.headers) : action.headers;
          for (const [k, v] of Object.entries(customHeaders)) {
            let headerVal = String(v);
            headerVal = headerVal.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
              const trimKey = key.trim();
              if (!allowedParams.has(trimKey)) {
                throw new Error(
                  `Placeholder '{{${trimKey}}}' não está declarado no schema de parâmetros.`,
                );
              }
              return params[trimKey] !== undefined ? String(params[trimKey]) : "";
            });
            headers[k] = headerVal;
          }
        }

        // Decrypt authConfig credentials
        if (action.authType && action.authType !== "NONE" && action.authConfig) {
          const authConfigRaw =
            typeof action.authConfig === "string"
              ? JSON.parse(action.authConfig)
              : action.authConfig;
          let auth = authConfigRaw;
          if (
            authConfigRaw &&
            authConfigRaw.encryptedData &&
            authConfigRaw.iv &&
            authConfigRaw.authTag
          ) {
            try {
              const decryptedStr = decryptData(authConfigRaw);
              auth = JSON.parse(decryptedStr);
            } catch (decErr) {
              this.logger.error("Failed to decrypt custom webhook action credentials", decErr);
              throw new Error("Falha ao descriptografar credenciais do webhook.");
            }
          }

          if (auth) {
            if (action.authType === "BEARER" && auth.token) {
              headers["Authorization"] = `Bearer ${auth.token}`;
            } else if (action.authType === "BASIC" && auth.username && auth.password) {
              const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString(
                "base64",
              );
              headers["Authorization"] = `Basic ${credentials}`;
            } else if (action.authType === "API_KEY" && auth.keyName && auth.keyValue) {
              headers[auth.keyName] = auth.keyValue;
            }
          }
        }

        let body: string | undefined = undefined;
        if (["POST", "PUT", "PATCH", "DELETE"].includes(action.method.toUpperCase())) {
          if (action.bodyTemplate) {
            body = action.bodyTemplate.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
              const trimKey = key.trim();
              if (!allowedParams.has(trimKey)) {
                throw new Error(
                  `Placeholder '{{${trimKey}}}' não está declarado no schema de parâmetros.`,
                );
              }
              return params[trimKey] !== undefined
                ? typeof params[trimKey] === "object"
                  ? JSON.stringify(params[trimKey])
                  : String(params[trimKey])
                : "";
            });
            // Validate JSON output
            try {
              JSON.parse(body);
            } catch {
              throw new Error(
                "O corpo do request gerado a partir do template não é um JSON válido.",
              );
            }
          } else {
            body = JSON.stringify(params);
          }
        }

        // Call the secureFetch client containing SSRF and resource limit controls
        const { status: responseStatus, text: responseText } = await secureFetch(
          url,
          action.method,
          headers,
          body,
          action.timeoutMs || 5000,
        );

        let finalResult: any = responseText;
        try {
          const jsonRes = JSON.parse(responseText);
          if (action.responseFilter) {
            const filterKeys =
              typeof action.responseFilter === "string"
                ? JSON.parse(action.responseFilter)
                : action.responseFilter;
            if (Array.isArray(filterKeys) && filterKeys.length > 0) {
              const filtered: Record<string, any> = {};
              for (const k of filterKeys) {
                if (jsonRes[k] !== undefined) {
                  filtered[k] = jsonRes[k];
                }
              }
              finalResult = filtered;
            } else {
              finalResult = jsonRes;
            }
          } else {
            finalResult = jsonRes;
          }
        } catch {
          // Keep response text if not JSON
        }

        const durationMs = Date.now() - startedAt;

        await this.logToolAction(companyId, "tool_call_completed", {
          toolName,
          durationMs,
          url: url.split("?")[0], // Remove query parameters from logs
          method: action.method,
          status: responseStatus,
          ...metadata,
        });

        return typeof finalResult === "string" ? finalResult : JSON.stringify(finalResult);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erro na chamada do webhook.";
        await this.logToolAction(
          companyId,
          "tool_call_failed",
          { toolName, error: errMsg, ...metadata },
          "ERROR",
        );
        throw err;
      }
    }

    throw new Error(`Erro de execução: tipo de ferramenta '${toolName}' não suportado.`);
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata) return metadata;
    try {
      const str = JSON.stringify(metadata);
      const sanitized = str
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
        .replace(/"[^"]*token[^"]*"\s*:\s*"[^"]*"/gi, (match) => {
          const parts = match.split(":");
          return `${parts[0]}:"[redacted]"`;
        })
        .replace(/"[^"]*secret[^"]*"\s*:\s*"[^"]*"/gi, (match) => {
          const parts = match.split(":");
          return `${parts[0]}:"[redacted]"`;
        })
        .replace(/access_token\s*[:=]\s*[^\s,;}]+/gi, "access_token: [redacted]")
        .replace(/refresh_token\s*[:=]\s*[^\s,;}]+/gi, "refresh_token: [redacted]")
        .replace(/client_secret\s*[:=]\s*[^\s,;}]+/gi, "client_secret: [redacted]");
      return JSON.parse(sanitized);
    } catch {
      return metadata;
    }
  }

  private async logToolAction(
    companyId: string,
    action: string,
    metadata: any,
    status: "SUCCESS" | "ERROR" = "SUCCESS",
  ): Promise<void> {
    try {
      const toolName = metadata?.toolName || "";
      const appSlug = toolName.startsWith("webhook_") ? "custom_webhook" : "google_calendar";

      const app = await this.prisma.app.findFirst({
        where: { slug: appSlug },
        select: { id: true },
      });
      if (!app) return;

      const installation = await this.prisma.appInstallation.findFirst({
        where: {
          companyId,
          appId: app.id,
        },
        select: { id: true },
      });

      const sanitizedMetadata = this.sanitizeMetadata(metadata);

      await this.prisma.appActionLog.create({
        data: {
          companyId,
          appId: app.id,
          installationId: installation?.id ?? null,
          action,
          status,
          metadata: this.toSerializableJsonValue(sanitizedMetadata),
        },
      });
    } catch (err) {
      this.logger.error("Failed to write safe log for app action", err);
    }
  }

  private async resolveAssistantTools(input: { companyId: string; assistantId: string }) {
    const installations = await this.prisma.appInstallation.findMany({
      where: {
        companyId: input.companyId,
        status: "ACTIVE",
      },
      include: {
        app: true,
      },
    });

    const configs = await this.prisma.assistantToolConfig.findMany({
      where: {
        assistantId: input.assistantId,
      },
    });

    const configMap = new Map<string, (typeof configs)[number]>();
    for (const c of configs) {
      configMap.set(`${c.appId}:${c.toolName}`, c);
    }

    const resolvedTools: any[] = [];

    for (const inst of installations) {
      const appSlug = inst.app.slug;

      if (appSlug === "google_calendar") {
        const calendarActive = await this.areGoogleCalendarToolsAvailable(input.companyId);
        if (calendarActive) {
          const calendarDefinitions = this.getGoogleCalendarToolsDefinitions();

          for (const def of calendarDefinitions) {
            const name = def.function.name;
            const key = `${inst.app.id}:${name}`;
            const config = configMap.get(key);

            if (!config || config.enabled) {
              resolvedTools.push(def);
            }
          }
        }
      } else if (appSlug === "custom_webhook") {
        const webhookActions = await this.prisma.customWebhookAction.findMany({
          where: {
            companyId: input.companyId,
            installationId: inst.id,
            active: true,
          },
        });

        for (const action of webhookActions) {
          const toolName = `webhook_${action.name}`;
          const key = `${inst.app.id}:${toolName}`;
          const config = configMap.get(key);

          if (!config || config.enabled) {
            const paramSchema = action.parameterSchema
              ? typeof action.parameterSchema === "string"
                ? JSON.parse(action.parameterSchema)
                : action.parameterSchema
              : { type: "object", properties: {}, required: [] };

            resolvedTools.push({
              type: "function",
              function: {
                name: toolName,
                description:
                  action.descriptionAi ||
                  action.displayName ||
                  "Executa uma chamada de webhook externo.",
                parameters: paramSchema,
              },
            });
          }
        }
      }
    }

    return resolvedTools;
  }

  public async resumeConversation(input: {
    assistantId: string;
    conversationId: string;
    runAi: boolean;
    reason?: string;
    tenant: RequestTenant;
  }): Promise<void> {
    const conversation = await this.prisma.assistantConversation.findFirst({
      where: { id: input.conversationId, companyId: input.tenant.companyId },
      include: {
        assistant: true,
      },
    });

    if (!conversation || conversation.assistantId !== input.assistantId) {
      throw new BadRequestException("Conversa não encontrada.");
    }

    // 1. Atualizar state local e enviar comando PUT para Chatwoot
    await this.setExternalConversationAiActive({
      conversationId: conversation.id,
      aiActive: true,
      reason: input.reason || "resume_endpoint",
    });

    // 2. Se runAi for verdadeiro, fazemos o fetch do histórico do Chatwoot e rodamos a AI
    if (input.runAi) {
      const messages = await this.fetchExternalConversationMessages(conversation.id);

      // Monta as promptMessages
      const promptMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

      for (const msg of messages) {
        if (msg.message_type === 0 || msg.message_type === "incoming") {
          promptMessages.push({ role: "user", content: msg.content });
        } else if (msg.message_type === 1 || msg.message_type === "outgoing") {
          // Se tiver automation_rule_id é bot, se não é humano
          const isBot = msg.content_attributes?.automation_rule_id === "cubo_ai_studio";
          promptMessages.push({
            role: isBot ? "assistant" : "system",
            content: isBot ? msg.content : `[MENSAGEM DE ATENDENTE HUMANO]\n${msg.content}`,
          });
        }
      }

      promptMessages.push({
        role: "system",
        content: `[AVISO DE SISTEMA] O atendimento estava em modo humano e agora foi transferido novamente para você. Analise o histórico recente. Se o usuário estiver esperando uma resposta, continue o atendimento de forma natural. Se a última mensagem humana resolver a questão ou se despedir, você pode dar uma resposta curta ou não responder nada.`,
      });

      // Remove provider/apikey hard checks for simplicity.
      // Runtime engine will validate and throw/fallback correctly if provider is missing.

      // Chama a IA redirecionando para sendMessage com o histórico incluído em uma mensagem de usuário
      const messagesText = promptMessages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");
      const hiddenMessage = `[AVISO DE SISTEMA]\nO atendimento estava com um humano e acabou de ser devolvido para você.\nHistórico recente da conversa com o humano:\n${messagesText}\n\nPor favor, analise e continue o atendimento a partir daqui de forma natural (não mencione que você é uma IA retomando, apenas continue o fluxo).`;

      const resumeDto: SendAssistantConversationMessageDto = {
        message: hiddenMessage,
        source: "chatwoot",
        externalConversationId: conversation.externalConversationId ?? undefined,
        externalAccountId: conversation.externalAccountId ?? undefined,
        externalInboxId: conversation.externalInboxId ?? undefined,
      };

      // Nós podemos apenas chamar this.sendMessage(...)
      // que vai salvar no banco local, rodar as rules, e enviar resposta ao Chatwoot.
      const mockUser: any = {
        id: "system",
        email: "system@localhost",
        roles: [],
        companyId: input.tenant.companyId,
        primaryCompanyId: input.tenant.companyId,
        activeCompanyId: input.tenant.companyId,
        memberships: [input.tenant.companyId],
        name: "System",
        permissions: [],
      };
      await this.sendMessage({
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        dto: resumeDto,
        user: mockUser,
        tenant: input.tenant,
      });
    }
  }

  private async fetchExternalConversationMessages(conversationId: string): Promise<any[]> {
    const conversation = await this.prisma.assistantConversation.findFirst({
      where: { id: conversationId },
    });
    if (!conversation || conversation.source !== "CHATWOOT") return [];

    const accountIdentifier = (conversation.externalAccountId ?? "").trim();
    const inboxIdentifier = (conversation.externalInboxId ?? "").trim();
    const conversationIdentifier = (conversation.externalConversationId ?? "").trim();

    if (!accountIdentifier || !conversationIdentifier) return [];

    const resolvedConfig = await this.chatwootInboxConfigService.resolveActiveForConversation({
      companyId: conversation.companyId,
      accountId: accountIdentifier,
      inboxId: inboxIdentifier || null,
    });

    const baseUrl = resolvedConfig?.baseUrl?.trim() || "";
    if (!baseUrl || !resolvedConfig?.apiAccessToken) return [];

    const apiUrl = `${baseUrl.replace(/\/$/, "")}/api/v1/accounts/${encodeURIComponent(
      accountIdentifier,
    )}/conversations/${encodeURIComponent(conversationIdentifier)}/messages`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          api_access_token: resolvedConfig.apiAccessToken,
        },
      });
      if (!response.ok) return [];
      const json = (await response.json()) as any;
      const payloadMessages = json?.payload ?? [];

      // Ordena por data (crescente)
      payloadMessages.sort((a: any, b: any) => a.created_at - b.created_at);

      // Retorna as últimas 20 mensagens
      return payloadMessages.slice(-20);
    } catch (err) {
      this.logger.warn(
        `Failed to fetch Chatwoot messages for conversation ${conversationId}: ${err}`,
      );
      return [];
    }
  }
}
