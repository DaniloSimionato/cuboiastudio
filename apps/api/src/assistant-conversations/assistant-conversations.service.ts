import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { ConversationChannelType, ConversationSource, Prisma, Status } from "@prisma/client";
import type { AssistantFlow } from "@prisma/client";
import type { AiResolvedRuntimeConfig } from "../ai/ai.types";
import { AiService } from "../ai/ai.service";
import { AttachmentInterpreterService } from "../attachments/attachment-interpreter.service";
import type { AttachmentInterpreterInput } from "../attachments/attachment-interpreter.types";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { ChatwootInboxConfigService } from "../chatwoot/chatwoot-inbox-config.service";
import { PrismaService } from "../database/prisma.service";
import { CacheService } from "../cache/cache.service";
import {
  createCanonicalInboundMessage,
  toCanonicalInboundMessageTelemetry,
} from "../inbound/canonical-inbound-message";
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
  PROMPT_COMPILER_VERSION,
  PromptCompilerService,
  summarizeTriageHistory,
  TriageState,
  TriageFlowContext,
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
import {
  buildPromptSectionManifest,
  DEFAULT_RAG_SCORE_THRESHOLD,
  normalizeRagScoreThreshold,
  RUNTIME_CONTEXT_MANIFEST_VERSION,
  resolveRuntimeFallbackAnswer,
  selectRuntimeKnowledgeItems,
} from "./runtime-context-manifest";
import {
  compactRepeatedAssistantHistoryMessages,
  formatImportedHumanHistoryMessage,
} from "./conversation-history-format";
import {
  isActionableAssistantQuestion,
  type RuntimeV2ShadowSnapshot,
} from "../runtime-v2/runtime-v2-shadow-orchestrator";
import {
  createRagRetrievalObservation,
  type RagRetrievalObservation,
} from "../runtime-v2/rag-evidence.adapter";
import {
  createMemoryRetrievalObservation,
  type MemoryRetrievalObservation,
} from "../runtime-v2/memory-evidence.adapter";
import {
  createV1ToolExecutionObservation,
  isRuntimeV2ToolObservationEnabled,
  type V1ToolExecutionObservation,
} from "../runtime-v2/tool-observation";
import { createV1HandoffObservation } from "../runtime-v2/handoff-state";
import { deriveHumanHandoffSignal } from "../runtime-v2/turn-understanding";
import { RuntimeV2ShadowIntegrationService } from "../runtime-v2/runtime-v2-shadow-integration.service";
import type { RuntimeV2CandidateContext } from "../runtime-v2/candidate-response";
import {
  deriveExpectedAuthorityCategory,
  validateV1AnswerAuthority,
} from "./runtime-authority-guard";
import {
  extractCustomerStructuredFields,
  getCustomerUnableToAnswerReason,
  flowIntentKeyForFlow,
  flowObjectiveForFlow,
} from "../intent-router/intent-routing";
import { generateTriageResponse } from "./triage-response-generation-strategy";

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
    historyWindowLimit?: number;
    historyMessagesSelected?: number;
    historyMessagesDropped?: number;
    historyDuplicateResponsesRemoved?: number;
    audioMessage?: boolean;
    transcriptionAvailable?: boolean;
    transcriptionPersisted?: boolean;
    triageHistoryMessageCount?: number;
    triageCustomerMessageCount?: number;
    triageAssistantReferenceCount?: number;
    initialMessageIncluded: boolean;
    instructionsIncluded: boolean;
    safetyInstructionIncluded?: boolean;
    activeSecurityRulesCount?: number;
    detectedIntent?: string | null;
    intentInputSource?: "CUSTOMER_TEXT" | "TRANSCRIPTION";
    metadataExcludedFromIntent?: boolean;
    selectedFlowId?: string | null;
    selectedFlowName?: string | null;
    flowSelectionMethod?: string | null;
    flowScore?: number | null;
    flowConfidence?: number | null;
    candidateFlowIds?: string[];
    candidateScores?: Array<{ flowId: string; score: number }>;
    matchedAliases?: string[];
    secondaryIntentKeys?: string[];
    triageFlowIncluded?: boolean;
    knownFieldKeys?: string[];
    pendingFieldKeys?: string[];
    requestedDetailKey?: string | null;
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
    promptSectionManifest?: Array<{
      name: string;
      role: string;
      charCount: number;
    }>;
    promptCharCount?: number;
    contextManifest?: Record<string, any>;
    fallbackIncluded?: boolean;
    fallbackUsed?: boolean;
    fallbackMessageUsed?: boolean;
    fallbackCategory?: string | null;
    ragEnabled?: boolean;
    ragScoreThreshold?: number;
    ragScoreThresholdSource?: string;
    ragItemCount?: number;
    ragItemIds?: string[];
    ragItems?: any[];
    ragRejectedCount?: number;
    ragRejectedScoreRange?: { min: number; max: number } | null;
    ragSelectionReason?: string | null;
    externalIdentifiers?: Record<string, string | null>;
    currentMessageHash?: string | null;
    historyMessageIds?: string[];
    memoryCount?: number;
    memoryIds?: string[];
    memoryItems?: any[];
    officialContextIncluded?: boolean;
    toolsExposed?: string[];
    toolCallCount?: number;
    persistenceStatus?: string;
    outboundStatus?: string;
    authorityConflictDetected?: boolean;
    authorityConflictCategories?: string[];
    winningSourceTypes?: string[];
    rejectedSourceTypes?: string[];
    v1UnsupportedClaimDetected?: boolean;
    v1UnsupportedClaimCategories?: string[];
    expectedAuthorityCategory?: string | null;
    generatedClaimCategory?: string | null;
    finalSafeResponseCategory?: string | null;
    authorityCategorySource?: string | null;
    conversationalOutcome?: string | null;
    triageResponseProtected?: boolean;
    replacementReason?: string | null;
    officialHoursEvaluated?: boolean;
    requestedDayOpen?: boolean | null;
    requestedTimeWithinHours?: boolean | null;
    officialContactAvailable?: boolean;
    officialContactSource?: string | null;
    staleQuestionRemoved?: boolean;
    v2TriageSignalReceived?: boolean;
    lastRelevantQuestionCleared?: boolean;
    triageExitReason?: string | null;
    requestedDetailBefore?: string | null;
    requestedDetailAfter?: string | null;
    requestedDetailChangeReason?: string | null;
    customerUnableToAnswer?: boolean;
    currentIntentOverrodeHistory?: boolean;
    lastRelevantQuestionUpdated?: boolean;
    lastRelevantQuestionUpdateReason?: string | null;
    behaviorId?: string | null;
    behaviorUpdatedAt?: Date | null;
    assistantUpdatedAt?: Date | null;
    behaviorResponseStyle?: string | null;
    splitResponseStyle?: string | null;
    temperature?: number | null;
    temperatureParameterApplied?: boolean | null;
    temperatureOmissionReason?: string | null;
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
    | "conversation-reset-executed-duplicate"
    | "duplicate-external-message-id";
  warning?: string;
  ragData?: any;
};

export type FindConversationMessagesResponse = {
  items: AssistantConversationMessageItem[];
};

export type SendAssistantConversationMessageResponse = {
  conversationId: string;
  userMessage: AssistantConversationMessageItem;
  assistantMessage: AssistantConversationMessageItem | null;
  runtime: AssistantConversationRuntime;
};

export function splitNaturalResponseBlocks(content: string): string[] {
  const normalized = content.trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const containsListStructure = lines.some((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line));
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
  return buildPromptSectionManifest(messages)
    .filter((section) => section.role === "system")
    .map((section) => section.name);
}

function isExternalMessageIdUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (!Array.isArray(target)) return false;
  return (
    target.length === 3 &&
    target.includes("companyId") &&
    target.includes("source") &&
    target.includes("externalMessageId")
  );
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
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
  aiActive: true,
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
  assistantId: true,
  conversationId: true,
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

// Keep enough complete turns for continuity while preserving the existing
// per-message truncation and deterministic history selection.
const MAX_RUNTIME_HISTORY_MESSAGES = 24;
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

function answerRepeatsRefusedDetail(answer: string, requestedDetailKey: string | null): boolean {
  if (!requestedDetailKey || !answer.includes("?")) return false;
  const normalized = answer
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const patterns: Record<string, RegExp> = {
    component_interface: /\b(?:sata|nvme|interface|conexao|formato)\b/,
    ssd_interface: /\b(?:sata|nvme|interface|conexao|formato)\b/,
    device_model: /\b(?:modelo|equipamento|notebook|computador)\b/,
    component_compatibility: /\bcompatibilidade\b/,
  };
  return patterns[requestedDetailKey]?.test(normalized) ?? false;
}

function buildTriageExitAnswer(): string {
  return "Sem problema. Já registrei as informações que você conseguiu fornecer. A equipe pode verificar o detalhe técnico pendente durante a avaliação.";
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
  private readonly resumeMessageLocks = new Map<string, Promise<void>>();

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
    @Optional() private readonly runtimeV2ShadowIntegration?: RuntimeV2ShadowIntegrationService,
  ) {}

  private scheduleRuntimeV2Shadow(input: RuntimeV2ShadowSnapshot): void {
    if (!this.runtimeV2ShadowIntegration) return;
    this.runtimeV2ShadowIntegration.dispatch(input);
  }

  private async findExistingExternalMessage(input: {
    companyId: string;
    assistantId: string;
    conversationId: string;
    source: string;
    externalMessageId?: string | null;
  }): Promise<AssistantConversationMessageSafeRecord | null> {
    const externalMessageId = input.externalMessageId?.trim();
    if (!externalMessageId) return null;

    if (typeof this.prisma.assistantConversationMessage.findFirst !== "function") {
      return null;
    }

    return this.prisma.assistantConversationMessage.findFirst({
      where: {
        companyId: input.companyId,
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        source: input.source,
        externalMessageId,
      },
      select: assistantConversationMessageSafeSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }

  private async buildIdempotentMessageResponse(input: {
    assistant: AssistantConversationRuntimeAssistantRecord;
    companyId: string;
    conversationId: string;
    existingMessage: AssistantConversationMessageSafeRecord;
  }): Promise<SendAssistantConversationMessageResponse> {
    const runtimeLog = await this.prisma.assistantRuntimeLog.findFirst({
      where: {
        companyId: input.companyId,
        assistantId: input.assistant.id,
        conversationId: input.conversationId,
        userMessageId: input.existingMessage.id,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        assistantMessageId: true,
        mode: true,
        provider: true,
        model: true,
        configurationSource: true,
        fallback: true,
        outcome: true,
        durationMs: true,
      },
    });

    const assistantMessage = runtimeLog?.assistantMessageId
      ? await this.prisma.assistantConversationMessage.findUnique({
          where: { id: runtimeLog.assistantMessageId },
          select: assistantConversationMessageSafeSelect,
        })
      : await this.prisma.assistantConversationMessage.findFirst({
          where: {
            companyId: input.companyId,
            assistantId: input.assistant.id,
            conversationId: input.conversationId,
            role: "assistant",
            createdAt: { gte: input.existingMessage.createdAt },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: assistantConversationMessageSafeSelect,
        });

    return {
      conversationId: input.conversationId,
      userMessage: toConversationMessageItem(input.existingMessage),
      assistantMessage: assistantMessage ? toConversationMessageItem(assistantMessage) : null,
      runtime: {
        mode: "deterministic-runtime",
        assistant: {
          id: input.assistant.id,
          name: input.assistant.name,
        },
        ...(runtimeLog?.provider ? { provider: runtimeLog.provider } : {}),
        ...(runtimeLog?.model ? { model: runtimeLog.model } : {}),
        temperature: input.assistant.temperature ?? 0.7,
        temperatureSource: "assistant",
        configurationSource: "tenant-settings",
        fallback: runtimeLog?.fallback ?? false,
        outcome:
          runtimeLog?.outcome === "fallback"
            ? "fallback"
            : runtimeLog?.outcome === "needs_human"
              ? "needs_human"
              : "success",
        reason: "duplicate-external-message-id",
        summary: "Message already processed; existing result returned",
        context: {
          historyMessagesUsed: 0,
          historyLimit: MAX_RUNTIME_HISTORY_MESSAGES,
          initialMessageIncluded: false,
          instructionsIncluded: false,
        },
      },
    };
  }

  private isResetCommand(input: {
    assistant: AssistantConversationRuntimeAssistantRecord;
    dto: SendAssistantConversationMessageDto;
  }): boolean {
    if (!input.assistant.conversationResetEnabled || typeof input.dto.message !== "string") {
      return false;
    }
    if ((input.dto.attachments?.length ?? 0) > 0) return false;
    const normalized = input.dto.message.normalize("NFKC").trim().toLowerCase();
    const keywords = (input.assistant.conversationResetKeywords as string[]) || ["reset"];
    return keywords.some(
      (keyword) => keyword.normalize("NFKC").trim().toLowerCase() === normalized,
    );
  }

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

  private buildCustomerIntentText(input: {
    message?: string | null;
    attachments: InboundAttachmentRecord[];
  }): string {
    const interpreter = this.attachmentInterpreterService as AttachmentInterpreterService & {
      buildCustomerIntentText?: (value: {
        rawText?: string | null;
        attachments: Array<{
          extractedText?: string | null;
          interpretedSummary?: string | null;
          transcript?: string | null;
        }>;
      }) => string;
    };
    if (typeof interpreter.buildCustomerIntentText === "function") {
      return interpreter.buildCustomerIntentText({
        rawText: input.message,
        attachments: input.attachments,
      });
    }

    // Compatibility with narrow test doubles and older adapters.
    return [
      typeof input.message === "string" && input.message.trim() ? input.message : "",
      ...input.attachments
        .map((attachment) =>
          [attachment.transcript, attachment.extractedText, attachment.interpretedSummary].find(
            (value) => Boolean(value?.trim()),
          ),
        )
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim()),
    ]
      .filter(Boolean)
      .join("\n\n");
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
  }): Promise<"sent" | "skipped" | "failed"> {
    const accountIdentifier = (input.conversation.externalAccountId ?? "").trim();
    const inboxIdentifier = (input.conversation.externalInboxId ?? "").trim();
    const conversationIdentifier = (input.conversation.externalConversationId ?? "").trim();

    if (!accountIdentifier || !conversationIdentifier) {
      return "skipped";
    }

    const resolvedConfig = await this.chatwootInboxConfigService.resolveActiveForConversation({
      companyId: input.conversation.companyId,
      accountId: input.conversation.externalAccountId ?? null,
      inboxId: input.conversation.externalInboxId ?? null,
    });

    const baseUrl = resolvedConfig?.baseUrl?.trim() || "";
    if (!baseUrl) {
      return "skipped";
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
        return "failed";
      }

      this.logger.log(
        `Chatwoot outbound completed: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} status=${response.status} responseBody=${safeResponseBody}`,
      );
      return "sent";
    } catch (error) {
      this.logger.warn(
        `Chatwoot outbound failed: company=${input.conversation.companyId} outboundUrl=${outboundUrl} account=${accountIdentifier} externalConversation=${conversationIdentifier} inbox=${inboxIdentifier || "unknown"} assistantMessageId=${input.assistantMessageId} error=${this.summarizeOutboundError(error)}`,
      );
      // Non-blocking by design. The conversation turn still succeeds locally.
      return "failed";
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
    const matchedKeyword = keywords.find(
      (kw) => kw.normalize("NFKC").trim().toLowerCase() === normalizedMessage,
    );
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

    if (input.assistant.memoryEnabled && this.contactMemoriesService) {
      try {
        const profile = await this.contactMemoriesService.findOrCreateProfile({
          companyId: input.tenant.companyId,
          channelType: input.conversation.channelType,
          externalAccountId: input.conversation.externalAccountId,
          externalContactId: input.conversation.externalContactId,
          externalInboxId: input.conversation.externalInboxId,
          chatwootContactId:
            input.conversation.externalContactId ?? input.conversation.externalAccountId,
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
          const lastUserMsgIndex = [...messagesToExtract]
            .reverse()
            .findIndex((m) => m.role === "user");
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
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Timeout de extração de memória")), 5000),
              ),
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
          OR: [{ sourceConversationId: null }, { sourceConversationId: input.conversation.id }],
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
    if (
      input.assistant.conversationResetSendInitialMessage &&
      input.assistant.initialMessage?.trim()
    ) {
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

    const source = input.dto.source ?? "manual";
    const existingExternalMessage = this.isResetCommand({ assistant, dto: input.dto })
      ? null
      : await this.findExistingExternalMessage({
          companyId: input.tenant.companyId,
          assistantId: input.assistantId,
          conversationId: conversation.id,
          source,
          externalMessageId: input.dto.externalMessageId,
        });
    if (existingExternalMessage) {
      return this.buildIdempotentMessageResponse({
        assistant,
        companyId: input.tenant.companyId,
        conversationId: conversation.id,
        existingMessage: existingExternalMessage,
      });
    }

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

    const toolObservations: V1ToolExecutionObservation[] = [];
    const observeV1Tools = isRuntimeV2ToolObservationEnabled(
      { assistantId: input.assistantId },
      process.env,
    );

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
      (typeof input.dto.message === "string" && input.dto.message.trim()
        ? input.dto.message
        : "") ||
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

    let userMessage: AssistantConversationMessageSafeRecord;
    try {
      ({ userMessage } = await this.prisma.$transaction(async (tx) => {
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
            externalAccountId:
              input.dto.externalAccountId ?? conversation.externalAccountId ?? null,
            externalConversationId:
              input.dto.externalConversationId ?? conversation.externalConversationId ?? null,
            externalContactId:
              input.dto.externalContactId ?? conversation.externalContactId ?? null,
            externalChannelId:
              input.dto.externalChannelId ?? conversation.externalChannelId ?? null,
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
      }));
    } catch (error) {
      if (!isExternalMessageIdUniqueConstraintError(error) || !input.dto.externalMessageId) {
        throw error;
      }

      const collision = await this.prisma.assistantConversationMessage.findFirst({
        where: {
          companyId: input.tenant.companyId,
          source,
          externalMessageId: input.dto.externalMessageId,
        },
        select: assistantConversationMessageSafeSelect,
      });
      if (!collision) throw error;
      if (
        collision.assistantId !== input.assistantId ||
        collision.conversationId !== conversation.id
      ) {
        throw new ConflictException("externalMessageId is already used in another conversation.");
      }

      return this.buildIdempotentMessageResponse({
        assistant,
        companyId: input.tenant.companyId,
        conversationId: conversation.id,
        existingMessage: collision,
      });
    }

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
          : await this.attachmentInterpreterService.processAttachment(
              interpreterInput,
              input.tenant.companyId,
            )
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
    const customerIntentText = this.buildCustomerIntentText({
      message: input.dto.message,
      attachments: processedAttachments,
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
    const canonicalInboundMessage = createCanonicalInboundMessage({
      companyId: input.tenant.companyId,
      assistantId: input.assistantId,
      conversationId: conversation.id,
      internalMessageId: userMessage.id,
      externalMessageReference: input.dto.externalMessageId ?? null,
      contentType: messageType,
      // This is the exact customer-authored representation shared by V1
      // prompting and the ephemeral V2 Shadow snapshot.
      displayContent: customerIntentText,
      sourceSnapshotContent: input.dto.message ?? null,
      receivedAt: new Date(),
      attachmentMetadata: {
        count: processedAttachments.length,
        hasCaption: processedAttachments.some((attachment) => Boolean(attachment.caption?.trim())),
        hasQuotedMessage: false,
      },
      quotedMessagePresent: false,
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
          canonicalInbound: toCanonicalInboundMessageTelemetry(canonicalInboundMessage),
        }),
      },
      select: {
        id: true,
      },
    });

    let memoryContextBlock: string | null = null;
    let contactMemoryProfileId: string | null = null;
    let existingMemories: any[] = [];
    let selectedMemoryManifest: Array<{
      id: string | null;
      type: string | null;
      score: number | null;
      reason: string | null;
    }> = [];
    let memoryObservation: MemoryRetrievalObservation = createMemoryRetrievalObservation({
      companyId: input.tenant.companyId,
      assistantId: input.assistantId,
      contactId: "unresolved",
      conversationId: conversation.id,
      contextVersion: conversation.currentContextVersion ?? 1,
      internalMessageId: userMessage.id,
      retrievalExecuted: false,
      notExecutedReason: !assistant.memoryEnabled
        ? "MEMORY_DISABLED"
        : !this.contactMemoriesService || !this.contactMemoriesExtractionService
          ? "PIPELINE_ERROR"
          : !assistant.memoryPrePromptEnabled
            ? "RETRIEVAL_NOT_REQUIRED"
            : "RETRIEVAL_EMPTY",
      configurationSnapshot: {
        memoryEnabled: Boolean(assistant.memoryEnabled),
        memoryExtractionEnabled: Boolean(assistant.memoryExtractionEnabled),
        allowedCategories: null,
        confidenceThreshold: assistant.memoryConfidenceThreshold ?? null,
        temporaryDefaultDays: assistant.memoryTempDefaultDays ?? null,
        sharedAcrossAssistants: Boolean(assistant.memorySharedAcrossAssistants),
      },
      selectedMemories: [],
    });

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

          memoryObservation = createMemoryRetrievalObservation({
            companyId: input.tenant.companyId,
            assistantId: input.assistantId,
            contactId: profile.id,
            conversationId: conversation.id,
            contextVersion: conversation.currentContextVersion ?? 1,
            internalMessageId: userMessage.id,
            profileId: profile.id,
            profileAssistantId: profile.assistantId,
            retrievalExecuted: true,
            notExecutedReason:
              selectedMemories.length > 0 ? "RETRIEVAL_WITH_RESULTS" : "RETRIEVAL_EMPTY",
            configurationSnapshot: {
              memoryEnabled: Boolean(assistant.memoryEnabled),
              memoryExtractionEnabled: Boolean(assistant.memoryExtractionEnabled),
              allowedCategories: Array.isArray(categories) ? categories.map(String) : null,
              confidenceThreshold: assistant.memoryConfidenceThreshold ?? null,
              temporaryDefaultDays: assistant.memoryTempDefaultDays ?? null,
              sharedAcrossAssistants: Boolean(assistant.memorySharedAcrossAssistants),
            },
            selectedMemories,
          });

          selectedMemoryManifest = selectedMemories.map((memory: any) => ({
            id: typeof memory.id === "string" ? memory.id : null,
            type: typeof memory.category === "string" ? memory.category : null,
            score:
              typeof memory.finalScore === "number"
                ? memory.finalScore
                : typeof memory.similarity === "number"
                  ? memory.similarity
                  : null,
            reason: typeof memory.reason === "string" ? memory.reason : null,
          }));

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

    let triageMode = isMultiNeedTriageMessage(customerIntentText);
    const humanHandoffSignal = deriveHumanHandoffSignal(customerIntentText);
    const customerRequestedHuman = humanHandoffSignal.requested;
    const isExplicitPriceQuery =
      /(quanto\s+fica|quanto\s+custa|valores?|preços?|custos?|precos?|tabela|orçamento|orcamento)/i.test(
        customerIntentText,
      );
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
    let triageExitReason: string | null = null;
    let requestedDetailBefore: string | null = null;
    let requestedDetailChangeReason: string | null = null;
    const customerUnableToAnswer = Boolean(
      loadedTriageState?.active && getCustomerUnableToAnswerReason(customerIntentText),
    );

    if (loadedTriageState && loadedTriageState.active && loadedTriageState.expiresAt > Date.now()) {
      if (customerUnableToAnswer) {
        shouldClearTriage = true;
        triageMode = false;
        triageExitReason = getCustomerUnableToAnswerReason(customerIntentText);
        requestedDetailBefore =
          loadedTriageState.requestedDetailKey ?? loadedTriageState.requestedDetail;
        requestedDetailChangeReason = "CUSTOMER_UNABLE_TO_PROVIDE_DETAIL";
      }
      const isScheduleQuery = /(agendar|agendamento|marcar|horário|horario|reserva|agenda)/i.test(
        customerIntentText,
      );
      const isListQuery =
        /\b(me\s+)?(envie|mande|passa|quero|lista|quais|tabela)\b.*\b(lista|serviços|opções|opcoes|catalogo|catálogo)\b/i.test(
          customerIntentText,
        );
      const isHandoffQuery = customerRequestedHuman;

      if (
        !customerUnableToAnswer &&
        (isExplicitPriceQuery || isScheduleQuery || isListQuery || isHandoffQuery)
      ) {
        shouldClearTriage = true;
      } else {
        if (!customerUnableToAnswer) {
          triageMode = true;
          triageContinuation = true;
        }
      }
    }

    if (shouldClearTriage && this.cacheService) {
      try {
        await this.cacheService.set(triageCacheKey, null, 1);
        if (!customerUnableToAnswer) loadedTriageState = null;
      } catch (err: any) {
        this.logger.warn(`Failed to clear triage state: ${err.message}`);
      }
    }

    const conversationalOutcome =
      customerUnableToAnswer && !isExplicitPriceQuery ? "technical_evaluation" : null;

    const knowledgeLimit = triageMode ? 2 : 5;
    let knowledgeItems: { id: string; title: string; content: string }[] = [];
    const ragThresholdConfig = normalizeRagScoreThreshold(undefined);
    let ragLogData: any = {
      ragEnabled: Boolean(assistant.ragEnabled),
      scoreThreshold: ragThresholdConfig.threshold,
      scoreThresholdSource: ragThresholdConfig.source,
      requestedTopK: knowledgeLimit,
      totalChunksScanned: 0,
      scoredChunkCount: 0,
      filteredOutCount: 0,
      selectedCount: 0,
      usedKnowledge: [],
      selectionReason: assistant.ragEnabled ? "not_executed" : "rag_disabled",
      warning: null,
    };
    let ragObservation: RagRetrievalObservation = createRagRetrievalObservation({
      companyId: input.tenant.companyId,
      assistantId: input.assistantId,
      internalMessageId: userMessage.id,
      queryCategory: "KNOWLEDGE",
      retrievalExecuted: false,
      notExecutedReason: !assistant.ragEnabled
        ? "DISABLED"
        : !this.assistantKnowledgeRetrievalService
          ? "PIPELINE_ERROR"
          : interpretedMessage.trim()
            ? "NOT_REQUIRED"
            : "NO_QUERY",
      threshold: ragThresholdConfig.threshold,
      thresholdSource: ragThresholdConfig.source,
      results: [],
    });

    if (assistant.ragEnabled && this.assistantKnowledgeRetrievalService) {
      const searchResult = await this.assistantKnowledgeRetrievalService.searchRelevantKnowledge({
        tenant: input.tenant,
        assistantId: input.assistantId,
        query: interpretedMessage,
        topK: knowledgeLimit,
      });

      const knowledgeSelection = selectRuntimeKnowledgeItems({
        ragEnabled: true,
        results: searchResult.results,
        threshold: searchResult.scoreThreshold,
        filteredOutCount: searchResult.filteredOutCount,
        filteredOutScoreRange: searchResult.filteredOutScoreRange,
        warning: searchResult.warning,
      });

      ragLogData = {
        ragEnabled: true,
        requestedTopK: knowledgeLimit,
        totalChunksScanned: searchResult.totalChunksScanned,
        scoredChunkCount: searchResult.scoredChunkCount,
        scoreThreshold: searchResult.scoreThreshold,
        scoreThresholdSource: searchResult.scoreThresholdSource,
        filteredOutCount: searchResult.filteredOutCount,
        filteredOutScoreRange: searchResult.filteredOutScoreRange,
        selectedCount: knowledgeSelection.items.length,
        selectionReason:
          knowledgeSelection.items.length > 0 ? "score_at_or_above_threshold" : "no_valid_results",
        warning: searchResult.warning,
        usedKnowledge: searchResult.results.map((r) => ({
          knowledgeId: r.knowledgeId,
          title: r.knowledgeTitle,
          chunkId: r.chunkId,
          score: r.score,
          reason: "score_at_or_above_threshold",
        })),
      };

      knowledgeItems = knowledgeSelection.items;

      ragObservation = createRagRetrievalObservation({
        companyId: input.tenant.companyId,
        assistantId: input.assistantId,
        internalMessageId: userMessage.id,
        queryCategory: "KNOWLEDGE",
        retrievalExecuted: true,
        notExecutedReason:
          searchResult.results.length > 0 ? "EXECUTED_WITH_RESULTS" : "EXECUTED_EMPTY",
        threshold: searchResult.scoreThreshold,
        thresholdSource: searchResult.scoreThresholdSource,
        results: searchResult.results,
      });

      this.logger.log(
        `[RAG Runtime] Assistant ${input.assistantId} | Scanned: ${ragLogData.totalChunksScanned} | Found: ${ragLogData.usedKnowledge.length}`,
      );
    } else if (assistant.ragEnabled) {
      ragLogData = {
        ...ragLogData,
        selectionReason: "retrieval_unavailable",
        warning: "RAG retrieval service is unavailable.",
      };
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
    const rawPriorHistory = conversationHistory.slice(0, -1).map((message) => {
      const payload =
        message.externalPayload && typeof message.externalPayload === "object"
          ? (message.externalPayload as any)
          : {};
      const isImportedHuman = message.messageType === "resume-human" || payload.speaker === "human";
      return {
        id: message.id,
        role: isImportedHuman ? "assistant" : (message.role as "user" | "assistant" | "tool"),
        content: isImportedHuman
          ? formatImportedHumanHistoryMessage(message.content)
          : message.content,
        ...(payload.tool_calls ? { tool_calls: payload.tool_calls } : {}),
        ...(payload.tool_call_id ? { tool_call_id: payload.tool_call_id } : {}),
        ...(payload.name ? { name: payload.name } : {}),
      };
    });
    const compactedHistory = compactRepeatedAssistantHistoryMessages(rawPriorHistory);
    const priorHistory = compactedHistory.messages;
    const historyDuplicateResponsesRemoved = compactedHistory.removedCount;
    const historyMessagesDropped = Math.max(
      0,
      (typeof this.prisma.assistantConversationMessage.count === "function"
        ? await this.prisma.assistantConversationMessage.count({
            where: {
              assistantId: input.assistantId,
              conversationId: input.conversationId,
              companyId: input.tenant.companyId,
              contextVersion: conversation.currentContextVersion ?? 1,
            },
          })
        : recentMessages.length) -
        1 -
        priorHistory.length,
    );
    const triageHistorySummary = triageMode
      ? summarizeTriageHistory(priorHistory)
      : {
          block: null,
          historyMessageCount: 0,
          customerMessageCount: 0,
          assistantReferenceCount: 0,
        };
    const audioMessage = processedAttachments.some((attachment) => attachment.type === "audio");
    const transcriptionAvailable = processedAttachments.some(
      (attachment) => attachment.type === "audio" && Boolean(attachment.transcript?.trim()),
    );
    const extractedCustomerFields = extractCustomerStructuredFields(customerIntentText);
    const mergedKnownFieldKeys = [
      ...new Set([
        ...(loadedTriageState?.knownFieldKeys ?? []),
        ...extractedCustomerFields.knownFieldKeys,
      ]),
    ];
    const mergedPendingFieldKeys = [...new Set(extractedCustomerFields.pendingFieldKeys)].filter(
      (key) => !mergedKnownFieldKeys.includes(key),
    );
    const intentInputSource =
      audioMessage && transcriptionAvailable ? "TRANSCRIPTION" : "CUSTOMER_TEXT";
    const contextMetadata: Record<string, any> = {
      requestId: input.requestId ?? input.dto.externalMessageId ?? null,
      correlationId: input.correlationId ?? null,
      triageMode,
      knowledgeLimit,
      historyMessagesUsed: priorHistory.length,
      historyLimit: MAX_RUNTIME_HISTORY_MESSAGES,
      historyWindowLimit: MAX_RUNTIME_HISTORY_MESSAGES,
      historyMessagesSelected: priorHistory.length,
      historyMessagesDropped,
      historyDuplicateResponsesRemoved,
      audioMessage,
      transcriptionAvailable,
      transcriptionPersisted: transcriptionAvailable,
      triageHistoryMessageCount: triageHistorySummary.historyMessageCount,
      triageCustomerMessageCount: triageHistorySummary.customerMessageCount,
      triageAssistantReferenceCount: triageHistorySummary.assistantReferenceCount,
      intentInputSource,
      metadataExcludedFromIntent: true,
      selectedFlowId: null,
      flowSelectionMethod: "none",
      flowScore: 0,
      flowConfidence: 0,
      candidateFlowIds: [],
      candidateScores: [],
      matchedAliases: [],
      secondaryIntentKeys: extractedCustomerFields.secondaryIntentKeys,
      triageFlowIncluded: false,
      knownFieldKeys: mergedKnownFieldKeys,
      pendingFieldKeys: mergedPendingFieldKeys,
      requestedDetailKey: extractedCustomerFields.requestedDetailKey,
      initialMessageIncluded: false,
      fallbackIncluded: false,
      fallbackUsed: false,
      fallbackMessageUsed: false,
      fallbackCategory: null,
      triageExitReason,
      requestedDetailBefore,
      requestedDetailAfter: null,
      requestedDetailChangeReason,
      customerUnableToAnswer,
      conversationalOutcome,
      triageResponseProtected: false,
      replacementReason: null,
      officialHoursEvaluated: false,
      requestedDayOpen: null,
      requestedTimeWithinHours: null,
      officialContactAvailable: Boolean(
        assistant.businessPhone?.trim() ||
        assistant.businessWhatsapp?.trim() ||
        assistant.businessWhatsappSupport?.trim(),
      ),
      officialContactSource: "structured-assistant-company",
      staleQuestionRemoved: false,
      v2TriageSignalReceived: false,
      lastRelevantQuestionCleared: false,
      currentIntentOverrodeHistory: false,
      lastRelevantQuestionUpdated: false,
      lastRelevantQuestionUpdateReason: null,
      instructionsIncluded: Boolean(assistant.instructions?.trim()),
      safetyInstructionIncluded: Boolean(assistant.safetyInstruction?.trim()),
      activeSecurityRulesCount: activeSecurityRules.length,
      ragEnabled: Boolean(assistant.ragEnabled),
      ragScoreThreshold: ragLogData.scoreThreshold ?? DEFAULT_RAG_SCORE_THRESHOLD,
      ragScoreThresholdSource: ragLogData.scoreThresholdSource ?? "default",
      ragItemCount: ragLogData.selectedCount ?? 0,
      ragItemIds: (ragLogData.usedKnowledge ?? []).map((item: any) => item.chunkId),
      ragItems: ragLogData.usedKnowledge ?? [],
      ragRejectedCount: ragLogData.filteredOutCount ?? 0,
      ragRejectedScoreRange: ragLogData.filteredOutScoreRange ?? null,
      ragSelectionReason: ragLogData.selectionReason ?? null,
      memoryCount: selectedMemoryManifest.length,
      memoryIds: selectedMemoryManifest.map((memory) => memory.id).filter(Boolean),
      memoryItems: selectedMemoryManifest,
      officialContextIncluded: Boolean(officialBusinessContext.promptBlock),
      currentMessageHash: canonicalInboundMessage.canonicalComparisonHash,
      historyMessageIds: priorHistory
        .map((message) => message.id)
        .filter((id): id is string => typeof id === "string"),
      externalIdentifiers: {
        conversationId: conversation.externalConversationId ?? null,
        accountId: conversation.externalAccountId ?? null,
        contactId: conversation.externalContactId ?? null,
        channelId: conversation.externalChannelId ?? null,
        inboxId: conversation.externalInboxId ?? null,
      },
      contextVersion: conversation.currentContextVersion ?? 1,
      model: null,
      modelSource: null,
      temperature: null,
      temperatureParameterApplied: null,
      temperatureOmissionReason: null,
      toolsExposed: [],
      toolCallCount: 0,
      persistenceStatus: "pending",
      outboundStatus: "pending",
      officialTimezoneUsed: officialBusinessContext.timezone,
      officialLocalDate: officialBusinessContext.businessStatus.localDate,
      officialLocalTime: officialBusinessContext.businessStatus.localTime,
      officialOpenNow: officialBusinessContext.businessStatus.isOpenNow,
      officialOnBreak: officialBusinessContext.businessStatus.isOnBreak,
      officialDataSource: "structured-assistant-company",
    };

    const shadowSnapshot: RuntimeV2ShadowSnapshot = {
      scope: {
        companyId: input.tenant.companyId,
        assistantId: input.assistantId,
        contactId:
          memoryObservation.contactId === "unresolved" ? null : memoryObservation.contactId,
        conversationId: conversation.id,
        contextVersion: conversation.currentContextVersion ?? 1,
      },
      correlationId:
        input.correlationId ?? input.requestId ?? input.dto.externalMessageId ?? userMessage.id,
      internalMessageId: userMessage.id,
      externalMessageId: input.dto.externalMessageId ?? null,
      source: "CUSTOMER",
      messageType:
        audioMessage || messageType === "audio"
          ? "AUDIO"
          : processedAttachments.length > 0
            ? "ATTACHMENT"
            : "TEXT",
      currentMessage: customerIntentText,
      // A V1 question may be used only as a timestamped reference. The V2
      // orchestrator rejects it when it predates the V2 session boundary.
      lastRelevantQuestion: (() => {
        const question = [...priorHistory]
          .reverse()
          .find(
            (message) =>
              message.role === "assistant" &&
              !message.content.startsWith("MENSAGEM HISTÓRICA DE ATENDENTE HUMANO ANTERIOR.") &&
              isActionableAssistantQuestion(message.content),
          );
        return question
          ? {
              key: `question:${question.id}`,
              prompt: question.content,
              sourceMessageId: question.id,
              contextVersion: conversation.currentContextVersion ?? 1,
              askedAt:
                recentMessages.find((message) => message.id === question.id)?.createdAt ??
                new Date(0),
            }
          : null;
      })(),
      usefulHistory: priorHistory.slice(-6).map((message) => ({
        id: message.id,
        role: message.role as "user" | "assistant" | "tool",
        content: message.content,
        relevance:
          message.role === "assistant" && message.content.includes("?")
            ? "question-reference"
            : "objective",
      })),
      audioMessage,
      transcriptionAvailable,
      transcriptionPersisted: transcriptionAvailable,
      v1TriageSignal: {
        customerUnableToAnswer,
        triageExitReason,
        requestedDetailKey: requestedDetailBefore ?? extractedCustomerFields.requestedDetailKey,
        conversationalOutcome,
      },
      // Only structured field keys cross into Shadow Metadata. Values and the
      // customer message remain in the V1 pipeline and are never persisted by V2.
      customerEvidenceFields: extractedCustomerFields.knownFieldKeys,
      ragObservation,
      memoryObservation: memoryObservation.contactId === "unresolved" ? null : memoryObservation,
      memoryNotExecutedReason: memoryObservation.notExecutedReason,
      toolObservations: observeV1Tools ? toolObservations : [],
    };

    contextMetadata.contextManifest = {
      version: RUNTIME_CONTEXT_MANIFEST_VERSION,
      companyId: input.tenant.companyId,
      assistantId: assistant.id,
      conversationId: conversation.id,
      externalIdentifiers: contextMetadata.externalIdentifiers,
      contextVersion: contextMetadata.contextVersion,
      currentMessageHash: contextMetadata.currentMessageHash,
      historyMessageCount: contextMetadata.historyMessagesUsed,
      historyMessageIds: contextMetadata.historyMessageIds,
      historyWindowLimit: contextMetadata.historyWindowLimit,
      historyMessagesSelected: contextMetadata.historyMessagesSelected,
      historyMessagesDropped: contextMetadata.historyMessagesDropped,
      historyDuplicateResponsesRemoved: contextMetadata.historyDuplicateResponsesRemoved,
      audioMessage: contextMetadata.audioMessage,
      transcriptionAvailable: contextMetadata.transcriptionAvailable,
      transcriptionPersisted: contextMetadata.transcriptionPersisted,
      triageHistoryMessageCount: contextMetadata.triageHistoryMessageCount,
      triageCustomerMessageCount: contextMetadata.triageCustomerMessageCount,
      triageAssistantReferenceCount: contextMetadata.triageAssistantReferenceCount,
      intentInputSource: contextMetadata.intentInputSource,
      metadataExcludedFromIntent: contextMetadata.metadataExcludedFromIntent,
      selectedFlowId: contextMetadata.selectedFlowId,
      flowSelectionMethod: contextMetadata.flowSelectionMethod,
      flowScore: contextMetadata.flowScore,
      flowConfidence: contextMetadata.flowConfidence,
      candidateFlowIds: contextMetadata.candidateFlowIds,
      candidateScores: contextMetadata.candidateScores,
      matchedAliases: contextMetadata.matchedAliases,
      secondaryIntentKeys: contextMetadata.secondaryIntentKeys,
      triageFlowIncluded: contextMetadata.triageFlowIncluded,
      knownFieldKeys: contextMetadata.knownFieldKeys,
      pendingFieldKeys: contextMetadata.pendingFieldKeys,
      requestedDetailKey: contextMetadata.requestedDetailKey,
      triageExitReason: contextMetadata.triageExitReason,
      requestedDetailBefore: contextMetadata.requestedDetailBefore,
      requestedDetailAfter: contextMetadata.requestedDetailAfter,
      requestedDetailChangeReason: contextMetadata.requestedDetailChangeReason,
      customerUnableToAnswer: contextMetadata.customerUnableToAnswer,
      conversationalOutcome: contextMetadata.conversationalOutcome,
      triageResponseProtected: contextMetadata.triageResponseProtected,
      replacementReason: contextMetadata.replacementReason,
      officialHoursEvaluated: contextMetadata.officialHoursEvaluated,
      requestedDayOpen: contextMetadata.requestedDayOpen,
      requestedTimeWithinHours: contextMetadata.requestedTimeWithinHours,
      officialContactAvailable: contextMetadata.officialContactAvailable,
      officialContactSource: contextMetadata.officialContactSource,
      staleQuestionRemoved: contextMetadata.staleQuestionRemoved,
      v2TriageSignalReceived: contextMetadata.v2TriageSignalReceived,
      lastRelevantQuestionCleared: contextMetadata.lastRelevantQuestionCleared,
      expectedAuthorityCategory: contextMetadata.expectedAuthorityCategory,
      generatedClaimCategory: contextMetadata.generatedClaimCategory,
      finalSafeResponseCategory: contextMetadata.finalSafeResponseCategory,
      authorityCategorySource: contextMetadata.authorityCategorySource,
      currentIntentOverrodeHistory: contextMetadata.currentIntentOverrodeHistory,
      lastRelevantQuestionUpdated: contextMetadata.lastRelevantQuestionUpdated,
      lastRelevantQuestionUpdateReason: contextMetadata.lastRelevantQuestionUpdateReason,
      promptSections: [],
      promptCharCount: 0,
      initialMessageIncluded: false,
      fallbackIncluded: false,
      fallbackMessageUsed: false,
      officialContextIncluded: contextMetadata.officialContextIncluded,
      memoryCount: contextMetadata.memoryCount,
      memoryItems: contextMetadata.memoryItems,
      ragEnabled: contextMetadata.ragEnabled,
      ragItemCount: contextMetadata.ragItemCount,
      ragItems: contextMetadata.ragItems,
      ragRejectedCount: contextMetadata.ragRejectedCount,
      ragRejectedScoreRange: contextMetadata.ragRejectedScoreRange,
      ragThreshold: contextMetadata.ragScoreThreshold,
      ragSelectionReason: contextMetadata.ragSelectionReason,
      intent: null,
      flow: null,
      toolsExposed: [],
      model: contextMetadata.model,
      temperature: contextMetadata.temperature,
      temperatureParameterApplied: contextMetadata.temperatureParameterApplied,
      temperatureOmissionReason: contextMetadata.temperatureOmissionReason,
      mode: null,
      fallback: null,
      toolCallCount: 0,
      persistenceStatus: "pending",
      outboundStatus: "pending",
    };

    const deterministicRuntime = buildDeterministicAssistantResponse({
      question: interpretedMessage,
      assistantName: assistant.name,
      instructions: effectiveInstructions,
      knowledgeItems,
      officialBusinessContext,
    });
    const deterministicFallbackCategory =
      deterministicRuntime.sources.length > 0 ? "deterministic_response" : "no_information";

    const runtimeConfig = await this.aiService.resolveRuntimeConfig(input.tenant.companyId);
    const resolvedModel = this.resolveRuntimeModel(assistant, runtimeConfig);
    const temperature = this.resolveRuntimeTemperature(assistant);
    const temperatureSource = this.resolveRuntimeTemperatureSource(assistant);
    Object.assign(contextMetadata, {
      model: resolvedModel.model ?? null,
      modelSource: resolvedModel.source,
      temperature,
      temperatureParameterApplied: modelSupportsTemperature(resolvedModel.model),
      temperatureOmissionReason: modelSupportsTemperature(resolvedModel.model)
        ? null
        : "model_does_not_support_temperature",
    });
    contextMetadata.contextManifest = {
      ...contextMetadata.contextManifest,
      model: resolvedModel.model ?? null,
      temperature,
      temperatureParameterApplied: modelSupportsTemperature(resolvedModel.model),
      temperatureOmissionReason: contextMetadata.temperatureOmissionReason,
    };
    Object.assign(contextMetadata, {
      fallbackUsed: true,
      fallbackCategory: runtimeConfig.runtimeEnabled
        ? deterministicFallbackCategory
        : "runtime_disabled",
    });
    contextMetadata.contextManifest = {
      ...contextMetadata.contextManifest,
      mode: "deterministic-runtime",
      fallback: {
        used: true,
        category: contextMetadata.fallbackCategory,
        includedInPrompt: false,
      },
    };
    let answer = deterministicRuntime.answer;
    let selectedFlowForAuthority: AssistantFlow | null = null;
    const configuredFallbackMessage = assistant.fallbackMessage?.trim() || null;
    const resolveFallbackAnswer = (deterministicAnswer: string) =>
      resolveRuntimeFallbackAnswer({
        configuredFallbackMessage,
        deterministicAnswer,
      });
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
      const outsideHoursFallback = resolveFallbackAnswer(
        buildOutsideBusinessHoursReply(officialBusinessContext),
      );
      answer = outsideHoursFallback.answer;
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
        fallbackUsed: true,
        fallbackCategory: "outside_business_hours",
        fallbackMessageUsed: outsideHoursFallback.configuredMessageUsed,
      });
      contextMetadata.contextManifest = {
        ...contextMetadata.contextManifest,
        mode: "outside-business-hours",
        fallback: {
          used: true,
          category: "outside_business_hours",
          includedInPrompt: false,
          messageUsed: outsideHoursFallback.configuredMessageUsed,
        },
      };
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

        Object.assign(contextMetadata, {
          fallbackUsed: true,
          fallbackCategory: "provider_unavailable",
          fallbackMessageUsed: Boolean(configuredFallbackMessage),
        });
        const providerUnavailableFallback = resolveFallbackAnswer(deterministicRuntime.answer);
        answer = providerUnavailableFallback.answer;
        contextMetadata.contextManifest = {
          ...contextMetadata.contextManifest,
          fallback: {
            used: true,
            category: "provider_unavailable",
            includedInPrompt: false,
            messageUsed: providerUnavailableFallback.configuredMessageUsed,
          },
        };

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
                message: customerIntentText,
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
          const triageFlowContext: TriageFlowContext | null = selectedFlow
            ? {
                flowId: selectedFlow.id,
                flowName: selectedFlow.name,
                objective: flowObjectiveForFlow(selectedFlow),
                requiredFieldKeys:
                  flowIntentKeyForFlow(selectedFlow) === "technical_support"
                    ? ["device_model", "service_details"]
                    : flowIntentKeyForFlow(selectedFlow) === "pricing"
                      ? ["service_details"]
                      : flowIntentKeyForFlow(selectedFlow) === "pickup_delivery"
                        ? ["pickup_or_delivery_policy"]
                        : ["requested_information"],
                knownFieldKeys: mergedKnownFieldKeys,
                pendingFieldKeys: mergedPendingFieldKeys,
                nextQuestionKey: extractedCustomerFields.requestedDetailKey,
                relevantRuleKeys: ["one_question_at_a_time", "do_not_repeat_known_fields"],
                allowedToolSlugs: (() => {
                  if (!selectedFlow.allowedToolSlugs) return [];
                  try {
                    const parsed = JSON.parse(selectedFlow.allowedToolSlugs);
                    return Array.isArray(parsed)
                      ? parsed.filter((value): value is string => typeof value === "string")
                      : [];
                  } catch {
                    return [];
                  }
                })(),
              }
            : null;
          selectedFlowForAuthority = selectedFlow ?? null;
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

          Object.assign(contextMetadata, {
            toolsExposed: (tools ?? []).map((tool: any) => tool?.function?.name).filter(Boolean),
          });

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
            flowSelectionMethod: routeResult.flowSelectionMethod ?? "none",
            flowScore: routeResult.score ?? 0,
            flowConfidence: routeResult.confidence,
            candidateFlowIds: (routeResult.candidates ?? []).map((candidate) => candidate.flowId),
            candidateScores: (routeResult.candidates ?? []).map((candidate) => ({
              flowId: candidate.flowId,
              score: candidate.score,
            })),
            matchedAliases: routeResult.matchedAliases ?? [],
            secondaryIntentKeys: [
              ...new Set([
                ...(routeResult.secondaryIntentKeys ?? []),
                ...extractedCustomerFields.secondaryIntentKeys,
              ]),
            ],
            intentSelectionMethod:
              routeResult.flowSelectionMethod === "keyword_scored"
                ? "keyword"
                : routeResult.reason?.startsWith("LLM")
                  ? "llm"
                  : routeResult.flowId
                    ? "other"
                    : "none",
            calendarScopeApplied: hasCalendarToolScope(calendarScope),
            calendarScope: calendarScope,
            toolArgsOverridden: false,
            resourceScopeApplied: hasCalendarToolScope(calendarScope),
            blockedByToolScope: false,
            blockReason: null,
          });
          contextMetadata.contextManifest = {
            ...contextMetadata.contextManifest,
            intentInputSource: contextMetadata.intentInputSource,
            metadataExcludedFromIntent: true,
            selectedFlowId: contextMetadata.selectedFlowId,
            flowSelectionMethod: contextMetadata.flowSelectionMethod,
            flowScore: contextMetadata.flowScore,
            flowConfidence: contextMetadata.flowConfidence,
            candidateFlowIds: contextMetadata.candidateFlowIds,
            candidateScores: contextMetadata.candidateScores,
            matchedAliases: contextMetadata.matchedAliases,
            secondaryIntentKeys: contextMetadata.secondaryIntentKeys,
            knownFieldKeys: contextMetadata.knownFieldKeys,
            pendingFieldKeys: contextMetadata.pendingFieldKeys,
            requestedDetailKey: contextMetadata.requestedDetailKey,
          };

          const expectedAuthority = deriveExpectedAuthorityCategory({
            currentMessage: customerIntentText,
            normalizedIntent: routeResult.flowName,
            selectedFlowKey: selectedFlow ? flowIntentKeyForFlow(selectedFlow) : null,
            conversationalOutcome,
            officialBusinessContext,
          });
          Object.assign(contextMetadata, {
            expectedAuthorityCategory: expectedAuthority.category,
            authorityCategorySource: expectedAuthority.source,
            currentIntentOverrodeHistory: Boolean(
              expectedAuthority.category &&
              (historyDuplicateResponsesRemoved > 0 || triageExitReason || priorHistory.length > 8),
            ),
          });
          contextMetadata.contextManifest = {
            ...contextMetadata.contextManifest,
            expectedAuthorityCategory: expectedAuthority.category,
            authorityCategorySource: expectedAuthority.source,
            currentIntentOverrodeHistory: contextMetadata.currentIntentOverrodeHistory,
          };

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
              currentMessage: customerIntentText,
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
              currentTurnPriorityInstruction: [
                "PRIORIDADE DO TURNO ATUAL:",
                "Responda primeiro à mensagem atual do cliente. O histórico é apenas contexto e não pode substituir a intenção explícita deste turno.",
                `Categoria factual esperada para este turno: ${expectedAuthority.category ?? "nenhuma"}.`,
                conversationalOutcome
                  ? `Resultado conversacional protegido: ${conversationalOutcome}. Esta saída prevalece sobre qualquer categoria inferida da resposta do modelo.`
                  : "A categoria factual deve seguir a intenção atual; não reutilize a categoria de respostas antigas.",
                selectedFlow
                  ? `Flow atual selecionado: ${selectedFlow.id}. Execute somente o objetivo configurado para este flow.`
                  : "Nenhum flow foi selecionado para este turno.",
                triageExitReason
                  ? "O cliente não consegue fornecer o detalhe técnico solicitado. Não repita a pergunta; reconheça os dados já informados e indique que a avaliação técnica poderá verificar o detalhe pendente."
                  : "Não reutilize respostas antigas de fallback quando elas não responderem à intenção atual.",
              ].join("\n"),
            });

            const promptSectionManifest = buildPromptSectionManifest(promptMessages);
            const promptCharCount = promptSectionManifest.reduce(
              (total, section) => total + section.charCount,
              0,
            );

            Object.assign(contextMetadata, {
              promptVersion: PROMPT_COMPILER_VERSION,
              promptHash: hashPromptMessages(promptMessages),
              promptSections: getPromptSectionLabels(promptMessages),
              promptSectionManifest,
              promptCharCount,
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

            contextMetadata.contextManifest = {
              ...contextMetadata.contextManifest,
              promptSections: promptSectionManifest,
              promptCharCount,
              intent: {
                selected: routeResult.flowName ?? null,
                method: contextMetadata.intentSelectionMethod,
                confidence: routeResult.confidence ?? null,
              },
              flow: selectedFlow ? { id: selectedFlow.id, name: selectedFlow.name } : null,
              toolsExposed: contextMetadata.toolsExposed,
              mode: "ai-runtime",
            };

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
            const triageResult = await generateTriageResponse({
              companyId: input.tenant.companyId,
              assistant,
              promptInstructions,
              behavior: assistant.behavior,
              flow: selectedFlow,
              securityRules: activeSecurityRules,
              priorHistory,
              customerIntentText,
              officialBusinessContext,
              memoryContextBlock,
              loadedTriageState,
              triageFlowContext,
              triageCacheKey,
              userMessageId: userMessage.id,
              requestedDetailKey: extractedCustomerFields.requestedDetailKey,
              knownFieldKeys: mergedKnownFieldKeys,
              pendingFieldKeys: mergedPendingFieldKeys,
              model: resolvedModel.model,
              temperature,
              provider: this.aiService,
              compiler: this.promptCompilerService,
              cache: this.cacheService,
              logger: this.logger,
              onPromptCompiled: ({ messages, isSecondAttempt }) => {
                const triagePromptSectionManifest = buildPromptSectionManifest(messages);
                Object.assign(contextMetadata, {
                  promptVersion: PROMPT_COMPILER_VERSION,
                  promptHash: hashPromptMessages(messages),
                  promptSections: getPromptSectionLabels(messages),
                  promptSectionManifest: triagePromptSectionManifest,
                  promptCharCount: triagePromptSectionManifest.reduce(
                    (total, section) => total + section.charCount,
                    0,
                  ),
                  triageFlowIncluded: Boolean(triageFlowContext),
                });
                contextMetadata.contextManifest = {
                  ...contextMetadata.contextManifest,
                  promptSections: triagePromptSectionManifest,
                  promptCharCount: contextMetadata.promptCharCount,
                  mode: isSecondAttempt ? "triage-second-attempt" : "triage",
                  triageFlowIncluded: Boolean(triageFlowContext),
                };
              },
            });
            completion = triageResult.completion;
            promptMessages = triageResult.promptMessages;
            answer = triageResult.answer;
            triageValidationPassed = triageResult.triageValidationPassed;
            triageAttemptCount = triageResult.triageAttemptCount;
            triageResolved = triageResult.triageResolved;

            // Se a triagem foi resolvida com sucesso
            if (triageResolved) {
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
          let toolCallCount = 0;

          while (loopCount < 5 && !toolCallsResolved) {
            completion = await this.aiService.generateChatCompletion({
              companyId: input.tenant.companyId,
              messages: promptMessages,
              model: resolvedModel.model,
              temperature,
              tools,
            });

            if (completion.toolCalls && completion.toolCalls.length > 0) {
              toolCallCount += completion.toolCalls.length;
              contextMetadata.toolCallCount = toolCallCount;
              if (contextMetadata.contextManifest) {
                contextMetadata.contextManifest.toolCallCount = toolCallCount;
              }
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
                const observationStartedAt = new Date();
                let observationExecutionStarted = false;
                let observationErrorCode: string | null = null;
                let observationMetadata: Record<string, unknown> = {};

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
                  observationMetadata = { ...preparedTool.metadata };

                  let requiresConfirmation = false;
                  if (toolName.startsWith("webhook_")) {
                    const actionName = toolName.replace("webhook_", "");
                    const action = await this.prisma.customWebhookAction.findFirst({
                      where: { companyId: input.tenant.companyId, name: actionName, active: true },
                    });
                    if (action) {
                      observationMetadata = {
                        ...observationMetadata,
                        webhookMethod: action.method,
                        webhookOperationName: actionName,
                      };
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
                    observationMetadata = {
                      ...observationMetadata,
                      inputSchemaVersion: "calendar-v1",
                    };
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
                      observationExecutionStarted = true;
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
                    observationExecutionStarted = true;
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
                  observationErrorCode = errMsg;
                  if (errMsg.includes("outside selected flow calendar scope")) {
                    Object.assign(contextMetadata, {
                      blockedByToolScope: true,
                      blockReason: errMsg,
                      resourceScopeApplied: true,
                    });
                  }
                  resultString = JSON.stringify({ error: errMsg });
                }

                if (observeV1Tools) {
                  toolObservations.push(
                    createV1ToolExecutionObservation({
                      scope: {
                        companyId: input.tenant.companyId,
                        assistantId: input.assistantId,
                        conversationId: conversation.id,
                        contactId: conversation.externalContactId ?? null,
                        contextVersion: conversation.currentContextVersion ?? 1,
                      },
                      internalMessageId: userMessage.id,
                      executionAttemptId: toolCall.id,
                      toolName,
                      arguments: toolArgs,
                      startedAt: observationStartedAt,
                      completedAt: new Date(),
                      timeoutMs: Number(observationMetadata.timeoutMs ?? 5000),
                      result: resultString,
                      errorCode: observationErrorCode,
                      executionStarted: observationExecutionStarted,
                      flowId: selectedFlow?.id ?? null,
                      metadata: observationMetadata,
                    }),
                  );
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

          if (!runtime || (runtime.mode !== "flow-bypass" && responseMode !== "TRIAGE_ONLY")) {
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
          Object.assign(contextMetadata, {
            fallbackUsed: true,
            fallbackCategory: "provider_error",
            fallbackMessageUsed: Boolean(configuredFallbackMessage),
          });
          answer = resolveFallbackAnswer(deterministicRuntime.answer).answer;
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

    if (!runtimeConfig.runtimeEnabled && configuredFallbackMessage) {
      const runtimeDisabledFallback = resolveFallbackAnswer(deterministicRuntime.answer);
      answer = runtimeDisabledFallback.answer;
      contextMetadata.fallbackMessageUsed = runtimeDisabledFallback.configuredMessageUsed;
    }

    if (runtime.mode === "flow-bypass") {
      Object.assign(contextMetadata, {
        fallbackUsed: false,
        fallbackCategory: null,
      });
    } else if (runtime.mode === "ai-runtime" || runtime.mode === "ai-runtime-rag") {
      Object.assign(contextMetadata, {
        fallbackUsed: false,
        fallbackCategory: null,
      });
    }

    contextMetadata.contextManifest = {
      ...contextMetadata.contextManifest,
      mode: runtime.mode,
      fallback: {
        used: Boolean(contextMetadata.fallbackUsed),
        category: contextMetadata.fallbackCategory ?? null,
        includedInPrompt: false,
        messageUsed: Boolean(contextMetadata.fallbackMessageUsed),
      },
      toolsExposed: contextMetadata.toolsExposed ?? [],
      toolCallCount: contextMetadata.toolCallCount ?? 0,
    };

    if (customerUnableToAnswer && answerRepeatsRefusedDetail(answer, requestedDetailBefore)) {
      answer = buildTriageExitAnswer();
      contextMetadata.triageExitReason =
        contextMetadata.triageExitReason ?? "CUSTOMER_UNABLE_TO_PROVIDE_DETAIL";
      contextMetadata.requestedDetailAfter = null;
      contextMetadata.requestedDetailChangeReason = "CUSTOMER_UNABLE_TO_PROVIDE_DETAIL";
    }

    const expectedAuthority = deriveExpectedAuthorityCategory({
      currentMessage: customerIntentText,
      normalizedIntent: contextMetadata.detectedIntent,
      selectedFlowKey: selectedFlowForAuthority
        ? flowIntentKeyForFlow(selectedFlowForAuthority)
        : null,
      conversationalOutcome,
      officialBusinessContext,
    });
    const authorityGuard = validateV1AnswerAuthority({
      answer,
      currentMessage: customerIntentText,
      sources,
      officialBusinessContext,
      flowText: selectedFlowForAuthority
        ? `${selectedFlowForAuthority.flowInstructions ?? ""} ${selectedFlowForAuthority.fixedMessage ?? ""}`
        : null,
      normalizedIntent: contextMetadata.detectedIntent,
      selectedFlowId: contextMetadata.selectedFlowId,
      selectedFlowKey: selectedFlowForAuthority
        ? flowIntentKeyForFlow(selectedFlowForAuthority)
        : null,
      expectedAuthorityCategory: expectedAuthority.category,
      conversationalOutcome,
      triageExitReason,
      customerUnableToAnswer,
      officialHoursEvaluation: expectedAuthority.officialHours,
      officialContactAvailable: contextMetadata.officialContactAvailable,
      currentCustomerIntentSource: contextMetadata.intentInputSource,
      currentTurnIsExplicitIntent: Boolean(expectedAuthority.category),
    });
    if (
      authorityGuard.unsupportedClaimDetected ||
      authorityGuard.triageResponseProtected ||
      authorityGuard.replacementReason
    ) {
      answer = authorityGuard.answer;
      sources = [
        {
          id: "official-authority-guard",
          title: "Proteção de autoridade factual",
        },
      ];
    }
    Object.assign(contextMetadata, {
      v1UnsupportedClaimDetected: authorityGuard.unsupportedClaimDetected,
      v1UnsupportedClaimCategories: authorityGuard.blockedCategories,
      expectedAuthorityCategory: expectedAuthority.category,
      generatedClaimCategory: authorityGuard.generatedClaimCategory,
      finalSafeResponseCategory: authorityGuard.finalSafeResponseCategory,
      authorityCategorySource: authorityGuard.authorityCategorySource,
      authorityConflictDetected: authorityGuard.authorityConflictDetected,
      authorityConflictCategories: authorityGuard.authorityConflictCategories,
      winningSourceTypes: authorityGuard.winningSourceTypes,
      rejectedSourceTypes: authorityGuard.rejectedSourceTypes,
      conversationalOutcome,
      triageResponseProtected: authorityGuard.triageResponseProtected,
      replacementReason: authorityGuard.replacementReason,
      officialHoursEvaluated: expectedAuthority.officialHours.evaluated,
      requestedDayOpen: expectedAuthority.officialHours.requestedDayOpen,
      requestedTimeWithinHours: expectedAuthority.officialHours.requestedTimeWithinHours,
      officialContactAvailable: contextMetadata.officialContactAvailable,
      officialContactSource: contextMetadata.officialContactSource,
    });
    contextMetadata.contextManifest = {
      ...contextMetadata.contextManifest,
      authorityConflictDetected: authorityGuard.authorityConflictDetected,
      authorityConflictCategories: authorityGuard.authorityConflictCategories,
      winningSourceTypes: authorityGuard.winningSourceTypes,
      rejectedSourceTypes: authorityGuard.rejectedSourceTypes,
      v1UnsupportedClaimDetected: authorityGuard.unsupportedClaimDetected,
      v1UnsupportedClaimCategories: authorityGuard.blockedCategories,
      expectedAuthorityCategory: expectedAuthority.category,
      generatedClaimCategory: authorityGuard.generatedClaimCategory,
      finalSafeResponseCategory: authorityGuard.finalSafeResponseCategory,
      authorityCategorySource: authorityGuard.authorityCategorySource,
      conversationalOutcome,
      triageResponseProtected: authorityGuard.triageResponseProtected,
      replacementReason: authorityGuard.replacementReason,
      officialHoursEvaluated: expectedAuthority.officialHours.evaluated,
      requestedDayOpen: expectedAuthority.officialHours.requestedDayOpen,
      requestedTimeWithinHours: expectedAuthority.officialHours.requestedTimeWithinHours,
      officialContactAvailable: contextMetadata.officialContactAvailable,
      officialContactSource: contextMetadata.officialContactSource,
    };

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
      persistenceStatus: "persisted",
    });
    contextMetadata.contextManifest = {
      ...contextMetadata.contextManifest,
      persistenceStatus: "persisted",
    };

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
            promptSectionManifest: runtime.context.promptSectionManifest,
            promptCharCount: runtime.context.promptCharCount,
            contextManifest: runtime.context.contextManifest,
            behaviorId: runtime.context.behaviorId,
            behaviorUpdatedAt: runtime.context.behaviorUpdatedAt,
            assistantUpdatedAt: runtime.context.assistantUpdatedAt,
            behaviorResponseStyle: runtime.context.behaviorResponseStyle,
            splitResponseStyle: runtime.context.splitResponseStyle,
            temperature: runtime.context.temperature,
            temperatureParameterApplied: runtime.context.temperatureParameterApplied,
            temperatureOmissionReason: runtime.context.temperatureOmissionReason,
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
            authorityConflictDetected: runtime.context.authorityConflictDetected,
            authorityConflictCategories: runtime.context.authorityConflictCategories,
            winningSourceTypes: runtime.context.winningSourceTypes,
            rejectedSourceTypes: runtime.context.rejectedSourceTypes,
            v1UnsupportedClaimDetected: runtime.context.v1UnsupportedClaimDetected,
            v1UnsupportedClaimCategories: runtime.context.v1UnsupportedClaimCategories,
            expectedAuthorityCategory: runtime.context.expectedAuthorityCategory,
            generatedClaimCategory: runtime.context.generatedClaimCategory,
            finalSafeResponseCategory: runtime.context.finalSafeResponseCategory,
            authorityCategorySource: runtime.context.authorityCategorySource,
            triageExitReason: runtime.context.triageExitReason,
            conversationalOutcome: runtime.context.conversationalOutcome,
            triageResponseProtected: runtime.context.triageResponseProtected,
            replacementReason: runtime.context.replacementReason,
            officialHoursEvaluated: runtime.context.officialHoursEvaluated,
            requestedDayOpen: runtime.context.requestedDayOpen,
            requestedTimeWithinHours: runtime.context.requestedTimeWithinHours,
            officialContactAvailable: runtime.context.officialContactAvailable,
            officialContactSource: runtime.context.officialContactSource,
            requestedDetailBefore: runtime.context.requestedDetailBefore,
            requestedDetailAfter: runtime.context.requestedDetailAfter,
            requestedDetailChangeReason: runtime.context.requestedDetailChangeReason,
            customerUnableToAnswer: runtime.context.customerUnableToAnswer,
            v2TriageSignalReceived: runtime.context.v2TriageSignalReceived,
            staleQuestionRemoved: runtime.context.staleQuestionRemoved,
            lastRelevantQuestionCleared: runtime.context.lastRelevantQuestionCleared,
            currentIntentOverrodeHistory: runtime.context.currentIntentOverrodeHistory,
            lastRelevantQuestionUpdated: runtime.context.lastRelevantQuestionUpdated,
            lastRelevantQuestionUpdateReason: runtime.context.lastRelevantQuestionUpdateReason,
            historyDuplicateResponsesRemoved: runtime.context.historyDuplicateResponsesRemoved,
            knowledgeCount: runtime.ragData?.usedKnowledge?.length ?? knowledgeItems.length,
            knowledgeLimit: runtime.context.knowledgeLimit,
            knowledgeChunkCount: runtime.context.knowledgeChunkCount,
            knowledgeChunkIds: runtime.context.knowledgeChunkIds,
            ragEnabled: runtime.context.ragEnabled,
            ragScoreThreshold: runtime.context.ragScoreThreshold,
            ragScoreThresholdSource: runtime.context.ragScoreThresholdSource,
            ragItemCount: runtime.context.ragItemCount,
            ragItemIds: runtime.context.ragItemIds,
            ragItems: runtime.context.ragItems,
            ragRejectedCount: runtime.context.ragRejectedCount,
            ragRejectedScoreRange: runtime.context.ragRejectedScoreRange,
            ragSelectionReason: runtime.context.ragSelectionReason,
            fallbackIncluded: runtime.context.fallbackIncluded,
            fallbackUsed: runtime.context.fallbackUsed,
            fallbackCategory: runtime.context.fallbackCategory,
            fallbackMessageUsed: runtime.context.fallbackMessageUsed,
            externalIdentifiers: runtime.context.externalIdentifiers,
            currentMessageHash: runtime.context.currentMessageHash,
            historyMessageIds: runtime.context.historyMessageIds,
            memoryCount: runtime.context.memoryCount,
            memoryIds: runtime.context.memoryIds,
            memoryItems: runtime.context.memoryItems,
            officialContextIncluded: runtime.context.officialContextIncluded,
            toolsExposed: runtime.context.toolsExposed,
            toolCallCount: runtime.context.toolCallCount,
            persistenceStatus: "persisted",
            outboundStatus: runtime.context.outboundStatus,
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
          const outboundResult = await this.sendChatwootOutboundText({
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
          if (outboundResult === "sent") {
            blocksSent++;
          }
          contextMetadata.outboundStatus =
            outboundResult === "sent"
              ? "sent"
              : outboundResult === "skipped"
                ? "skipped"
                : "failed";
        } catch (err: any) {
          this.logger.error(`Error sending Chatwoot block ${i}: ${err.message}`, err.stack);
          contextMetadata.outboundStatus = "failed";
          break;
        }

        // Adiciona um pequeno delay entre as mensagens fatiadas
        if (i < blocks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      contextMetadata.outboundStatus =
        blocksSent === blocks.length
          ? "sent"
          : blocksSent > 0
            ? "partial"
            : contextMetadata.outboundStatus === "skipped"
              ? "skipped"
              : "failed";
      if (contextMetadata.contextManifest) {
        contextMetadata.contextManifest = {
          ...contextMetadata.contextManifest,
          outboundStatus: contextMetadata.outboundStatus,
        };
      }

      // Update runtime log metadata with sent blocks count!
      try {
        if (
          this.prisma.assistantRuntimeLog &&
          typeof this.prisma.assistantRuntimeLog.findUnique === "function" &&
          typeof this.prisma.assistantRuntimeLog.update === "function"
        ) {
          const log = await this.prisma.assistantRuntimeLog.findUnique({
            where: { id: runtimeLogId },
          });
          if (log && log.metadata) {
            const currentMeta =
              typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
            const updatedMeta = {
              ...currentMeta,
              outboundBlockCountSent: blocksSent,
              outboundBlockCount: blocksSent,
              outboundStatus: contextMetadata.outboundStatus,
              contextManifest: {
                ...(currentMeta.contextManifest ?? {}),
                outboundStatus: contextMetadata.outboundStatus,
              },
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

    // O cliente já foi persistido e o V1 concluiu sua própria persistência e
    // outbound. O shadow permanece assíncrono e não participa da resposta V1.
    const candidateContext: RuntimeV2CandidateContext = {
      // This object is deliberately ephemeral: it is passed only to the
      // asynchronous Shadow worker and is never serialized into stateJson/logs.
      promptInput: {
        assistant: {
          ...assistant,
          instructions: promptInstructions,
        },
        behavior: assistant.behavior,
        flow: selectedFlowForAuthority,
        securityRules: activeSecurityRules,
        knowledgeItems,
        historyMessages: priorHistory,
        currentMessage: customerIntentText,
        officialBusinessContext,
        calendarContext: null,
        memoryContextBlock,
        currentTurnPriorityInstruction: [
          "PRIORIDADE DO TURNO SHADOW:",
          "Responda à mensagem atual usando somente fatos autorizados.",
          "Não afirme execução de ferramenta, reserva, consulta ou alteração.",
          "Nunca envie mensagens: esta é uma resposta candidata interna.",
        ].join("\n"),
      },
      model: resolvedModel.model ?? null,
      temperature,
      v1ResponseAvailable: Boolean(assistantMessage.content.trim()),
      selectedFlowId: selectedFlowForAuthority?.id ?? null,
      candidateFlowIds: contextMetadata.candidateFlowIds ?? [],
      flowSelectionReason: contextMetadata.detectedIntent ?? null,
      flowSelectionConfidence: contextMetadata.flowConfidence ?? null,
      evidenceIds: [
        ...(ragObservation.items ?? []).map((item) => item.chunkId),
        ...(memoryObservation.items ?? []).map((item) => item.memoryItemId),
      ],
      memoryIds: selectedMemoryManifest
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string"),
      officialDataKeys: ["business_hours", "address", "official_contact", "company_identity"],
    };

    this.scheduleRuntimeV2Shadow({
      ...shadowSnapshot,
      candidateContext,
      v1HandoffObservation:
        contextMetadata.handoffPending ||
        humanHandoffSignal.requested ||
        Boolean(conversation.pausedByHuman)
          ? createV1HandoffObservation({
              companyId: input.tenant.companyId,
              assistantId: assistant.id,
              conversationId: conversation.id,
              contactId:
                memoryObservation.contactId === "unresolved" ? null : memoryObservation.contactId,
              contextVersion: conversation.currentContextVersion ?? 1,
              internalMessageId: userMessage.id,
              flowId: contextMetadata.selectedFlowId ?? null,
              handoffPendingObserved: Boolean(contextMetadata.handoffPending),
              reasonCode: contextMetadata.handoffPending
                ? contextMetadata.finalAction === "handoff" ||
                  selectedFlowForAuthority?.requiresHuman
                  ? "FLOW_REQUIRED_HANDOFF"
                  : humanHandoffSignal.requested
                    ? (humanHandoffSignal.reasonCode ?? "CUSTOMER_REQUESTED_HUMAN")
                    : "OTHER_STRUCTURED_REASON"
                : humanHandoffSignal.requested
                  ? (humanHandoffSignal.reasonCode ?? "CUSTOMER_REQUESTED_HUMAN")
                  : "HUMAN_ALREADY_ACTIVE",
              customerRequested: humanHandoffSignal.customerRequested,
              humanActiveObserved: Boolean(conversation.pausedByHuman),
              aiActiveObserved: Boolean(conversation.aiActive),
              pausedByHumanObserved: Boolean(conversation.pausedByHuman),
              requestedTargetType: humanHandoffSignal.requestedTargetType ?? "ANY_HUMAN",
              requestedTargetIdHash: null,
              collectedContextKeys: [
                ...(contextMetadata.handoffPending ? ["handoff_pending"] : []),
                ...(humanHandoffSignal.requested ? ["customer_requested_human"] : []),
                ...(contextMetadata.selectedFlowId ? ["selected_flow"] : []),
                ...(conversation.pausedByHuman ? ["paused_by_human"] : []),
              ],
              contextHash: "",
              provenance: {
                source: "V1_PIPELINE",
                sourceMessageId: userMessage.id,
                sourceFlowId: contextMetadata.selectedFlowId ?? null,
                sourceVersion: "handoff-v1-observation",
                reasonCode: null,
              },
            })
          : null,
      v1Comparison: {
        selectedFlowId: contextMetadata.selectedFlowId ?? null,
        selectedIntent: contextMetadata.detectedIntent ?? null,
        triageMode: contextMetadata.triageMode ? "TRIAGE" : null,
        toolsExposed: contextMetadata.toolsExposed ?? [],
        customerUnableToAnswer,
        triageExitReason,
        conversationalOutcome,
        flowSelectionReason: contextMetadata.detectedIntent ?? null,
        flowCandidateCount: (contextMetadata.candidateFlowIds ?? []).length,
        intentChangedFromPreviousTurn: Boolean(contextMetadata.currentIntentOverrodeHistory),
      },
    });

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
        ["calendar_createBooking", "calendar_rescheduleBooking", "calendar_cancelBooking"].includes(
          toolName,
        )
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

    // 2. Se runAi for verdadeiro, importa apenas o histórico estruturado e roda a IA
    // somente sobre a última mensagem real recebida pelo cliente.
    if (input.runAi) {
      const messages = await this.fetchExternalConversationMessages(conversation.id);

      const incomingMessages = messages.filter(
        (msg) =>
          (msg.message_type === 0 || msg.message_type === "incoming") &&
          typeof msg.content === "string" &&
          msg.content.trim().length > 0,
      );
      const currentMessage = incomingMessages[incomingMessages.length - 1];

      if (!currentMessage) {
        return;
      }

      const currentExternalMessageId =
        currentMessage.id !== undefined && currentMessage.id !== null
          ? String(currentMessage.id)
          : null;

      // Importa somente mensagens anteriores, mantendo os papéis sem serializá-las
      // em uma nova mensagem de usuário.
      for (const msg of messages) {
        if (msg === currentMessage || typeof msg.content !== "string" || !msg.content.trim()) {
          continue;
        }

        const isIncoming = msg.message_type === 0 || msg.message_type === "incoming";
        const isOutgoing = msg.message_type === 1 || msg.message_type === "outgoing";
        if (!isIncoming && !isOutgoing) continue;

        const isBot = msg.content_attributes?.automation_rule_id === "cubo_ai_studio";
        // Chatwoot does not expose a provider-compatible "human" role. Keep
        // the speaker identity in messageType/externalPayload, but represent
        // an imported human reply as assistant output rather than a system
        // instruction or a customer message.
        const role = isIncoming ? "user" : "assistant";
        const speaker = isIncoming ? "customer" : isBot ? "assistant" : "human";
        const externalMessageId = msg.id !== undefined && msg.id !== null ? String(msg.id) : null;

        const existing = externalMessageId
          ? await this.prisma.assistantConversationMessage.findFirst({
              where: {
                companyId: conversation.companyId,
                conversationId: conversation.id,
                externalMessageId,
              },
              select: { id: true },
            })
          : null;

        if (existing) continue;

        try {
          await this.prisma.assistantConversationMessage.create({
            data: {
              companyId: conversation.companyId,
              assistantId: conversation.assistantId,
              conversationId: conversation.id,
              role,
              content: msg.content.trim(),
              source: "chatwoot",
              messageType: `resume-${speaker}`,
              externalMessageId,
              mode: "resume-import",
              contextVersion: conversation.currentContextVersion ?? 1,
              externalPayload: this.toSerializableJsonValue({
                source: "resume-import",
                speaker,
                externalMessageId,
                messageType: msg.message_type,
              }),
            },
          });
        } catch (error) {
          // The existing company/source/externalMessageId unique key is the
          // cross-request guard for overlapping resume calls.
          if (!isPrismaUniqueConstraintError(error)) throw error;
        }
      }

      const resumeLockKey = [
        conversation.companyId,
        conversation.id,
        currentExternalMessageId,
      ].join(":");
      const activeResume = this.resumeMessageLocks.get(resumeLockKey);
      if (activeResume) {
        await activeResume;
        return;
      }

      let releaseResumeLock!: () => void;
      const resumeLock = new Promise<void>((resolve) => {
        releaseResumeLock = resolve;
      });
      this.resumeMessageLocks.set(resumeLockKey, resumeLock);

      try {
        const currentAlreadyPersisted = currentExternalMessageId
          ? await this.prisma.assistantConversationMessage.findFirst({
              where: {
                companyId: conversation.companyId,
                conversationId: conversation.id,
                source: "chatwoot",
                externalMessageId: currentExternalMessageId,
              },
              select: { id: true },
            })
          : null;

        // Do not remove the external ID to force a second execution.
        if (currentAlreadyPersisted) return;

        const resumeDto: SendAssistantConversationMessageDto = {
          message: currentMessage.content.trim(),
          source: "chatwoot",
          ...(currentExternalMessageId ? { externalMessageId: currentExternalMessageId } : {}),
          externalConversationId: conversation.externalConversationId ?? undefined,
          externalAccountId: conversation.externalAccountId ?? undefined,
          externalContactId: conversation.externalContactId ?? undefined,
          externalInboxId: conversation.externalInboxId ?? undefined,
        };

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
        try {
          await this.sendMessage({
            assistantId: input.assistantId,
            conversationId: input.conversationId,
            dto: resumeDto,
            user: mockUser,
            tenant: input.tenant,
          });
        } catch (error) {
          // A concurrent process may win the existing unique key between the
          // idempotency read and sendMessage. Treat it as already claimed only
          // when the current external message now exists.
          if (!currentExternalMessageId || !isPrismaUniqueConstraintError(error)) throw error;

          const claimedMessage = await this.prisma.assistantConversationMessage.findFirst({
            where: {
              companyId: conversation.companyId,
              conversationId: conversation.id,
              source: "chatwoot",
              externalMessageId: currentExternalMessageId,
            },
            select: { id: true },
          });
          if (!claimedMessage) throw error;
        }
      } finally {
        releaseResumeLock();
        if (this.resumeMessageLocks.get(resumeLockKey) === resumeLock) {
          this.resumeMessageLocks.delete(resumeLockKey);
        }
      }
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
