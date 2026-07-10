import {
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContactMemoryCategory, Prisma, Status } from "@prisma/client";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { buildDeterministicAssistantResponse } from "./assistant-runtime";
import { AiService } from "../ai/ai.service";
import { AssistantKnowledgeRetrievalService } from "../assistant-knowledge/assistant-knowledge-retrieval.service";
import { toAssistantRuntimeSources, type AssistantRuntimeSource } from "./assistant-runtime";
import { type CreateAssistantDto } from "./dto/create-assistant.dto";
import { type PreviewAssistantDto } from "./dto/preview-assistant.dto";
import { type RunAssistantDto } from "./dto/run-assistant.dto";
import { type UpdateAssistantStatusDto } from "./dto/update-assistant-status.dto";
import { type UpdateAssistantDto } from "./dto/update-assistant.dto";
import { UpdateAssistantToolsDto } from "./dto/update-assistant-tools.dto";
import {
  buildOfficialBusinessContext,
  isValidIanaTimezone,
  validateBusinessHoursSchedule,
} from "./official-business-context";

export type AssistantListItem = {
  id: string;
  name: string;
  description: string | null;
  businessAddress: string | null;
  businessCityRegion: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPostalCode: string | null;
  businessPhone: string | null;
  businessWhatsapp: string | null;
  businessWhatsappSupport: string | null;
  websiteUrl: string | null;
  timezone: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  weeklySchedule?: any;
  aiAlwaysAvailable: boolean;
  initialMessage: string | null;
  instructions: string | null;
  personality: string | null;
  toneOfVoice: string | null;
  avoidPhrases: string | null;
  model: string | null;
  temperature: number | null;
  fallbackMessage: string | null;
  safetyInstruction: string | null;
  ragEnabled: boolean;
  memoryEnabled: boolean;
  memoryPrePromptEnabled: boolean;
  memoryExtractionEnabled: boolean;
  memoryAllowedCategories: ContactMemoryCategory[] | null;
  memoryConfidenceThreshold: number;
  memoryTempDefaultDays: number;
  memorySharedAcrossAssistants: boolean;
  messageBufferEnabled: boolean;
  messageBufferSeconds: number;
  splitResponseEnabled: boolean;
  splitResponseStyle: string | null;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
};

export type FindAllAssistantsResponse = {
  items: AssistantListItem[];
};

export type FindOneAssistantResponse = AssistantListItem;

export type CreateAssistantResponse = AssistantListItem;

export type UpdateAssistantResponse = AssistantListItem;

export type UpdateAssistantStatusResponse = AssistantListItem;

export type PreviewAssistantResponse = {
  previewLogId: string;
  assistant: {
    id: string;
    name: string;
  };
  question: string;
  answer: string;
  sources: AssistantRuntimeSource[];
  mode: "deterministic-preview" | "ai-preview-rag";
  usedKnowledge?: Array<{
    knowledgeId: string;
    title: string;
    chunkId: string;
    score: number;
    contentPreview: string;
  }>;
  ragEnabled?: boolean;
  totalChunksScanned?: number;
};

export type RunAssistantResponse = {
  runLogId: string;
  assistant: {
    id: string;
    name: string;
  };
  input: {
    message: string;
  };
  output: {
    answer: string;
  };
  sources: AssistantRuntimeSource[];
  mode: "deterministic-runtime";
};

export type PreviewAssistantLogItem = {
  id: string;
  question: string;
  answer: string;
  mode: string;
  sources: AssistantRuntimeSource[];
  createdAt: Date;
};

export type FindAllPreviewAssistantLogsResponse = {
  items: PreviewAssistantLogItem[];
};

const assistantSafeSelect = {
  id: true,
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
  latitude: true,
  longitude: true,
  weeklySchedule: true,
  aiAlwaysAvailable: true,
  initialMessage: true,
  instructions: true,
  personality: true,
  toneOfVoice: true,
  avoidPhrases: true,
  model: true,
  temperature: true,
  fallbackMessage: true,
  safetyInstruction: true,
  ragEnabled: true,
  memoryEnabled: true,
  memoryPrePromptEnabled: true,
  memoryExtractionEnabled: true,
  memoryAllowedCategories: true,
  memoryConfidenceThreshold: true,
  memoryTempDefaultDays: true,
  memorySharedAcrossAssistants: true,
  messageBufferEnabled: true,
  messageBufferSeconds: true,
  splitResponseEnabled: true,
  splitResponseStyle: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssistantSelect;

type AssistantSafeRecord = Prisma.AssistantGetPayload<{
  select: typeof assistantSafeSelect;
}>;

const assistantPreviewAssistantSelect = {
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
  latitude: true,
  longitude: true,
  weeklySchedule: true,
  aiAlwaysAvailable: true,
  instructions: true,
  model: true,
  temperature: true,
  status: true,
  company: {
    select: {
      name: true,
      timezone: true,
    },
  },
} satisfies Prisma.AssistantSelect;

type AssistantPreviewAssistantRecord = Prisma.AssistantGetPayload<{
  select: typeof assistantPreviewAssistantSelect;
}>;

const assistantPreviewKnowledgeSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssistantKnowledgeSelect;

type AssistantPreviewKnowledgeRecord = Prisma.AssistantKnowledgeGetPayload<{
  select: typeof assistantPreviewKnowledgeSelect;
}>;

const assistantPreviewLogSelect = {
  id: true,
  question: true,
  answer: true,
  mode: true,
  sources: true,
  createdAt: true,
} as const;

type AssistantPreviewLogRecord = {
  id: string;
  question: string;
  answer: string;
  mode: string;
  sources: Prisma.JsonValue | null;
  createdAt: Date;
};

type AssistantPreviewLogCreateArgs = {
  data: {
    companyId: string;
    assistantId: string;
    userId: string | null;
    question: string;
    answer: string;
    mode: string;
    sources: Prisma.InputJsonValue;
  };
  select: typeof assistantPreviewLogSelect;
};

type AssistantPreviewLogFindManyArgs = {
  where: {
    assistantId: string;
    companyId: string;
  };
  select: typeof assistantPreviewLogSelect;
  orderBy: {
    createdAt: "desc";
  };
  take: number;
};

type AssistantPreviewLogDelegate = {
  create(args: Omit<AssistantPreviewLogCreateArgs, "select">): Promise<{ id: string }>;
  findMany(args: AssistantPreviewLogFindManyArgs): Promise<AssistantPreviewLogRecord[]>;
};

type DeterministicExecutionResult = {
  assistant: AssistantPreviewAssistantRecord;
  answer: string;
  sources: AssistantRuntimeSource[];
};

function parseMemoryAllowedCategories(
  value: string | null,
): ContactMemoryCategory[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ContactMemoryCategory[]) : null;
  } catch {
    return null;
  }
}

function toAssistantResponse(assistant: AssistantSafeRecord): AssistantListItem {
  return {
    id: assistant.id,
    name: assistant.name,
    description: assistant.description,
    businessAddress: assistant.businessAddress,
    businessCityRegion: assistant.businessCityRegion,
    businessCity: assistant.businessCity,
    businessState: assistant.businessState,
    businessPostalCode: assistant.businessPostalCode,
    businessPhone: assistant.businessPhone,
    businessWhatsapp: assistant.businessWhatsapp,
    businessWhatsappSupport: assistant.businessWhatsappSupport,
    websiteUrl: assistant.websiteUrl,
    timezone: assistant.timezone,
    googleMapsUrl: assistant.googleMapsUrl,
    latitude: assistant.latitude,
    longitude: assistant.longitude,
    weeklySchedule: assistant.weeklySchedule ?? undefined,
    aiAlwaysAvailable: assistant.aiAlwaysAvailable,
    initialMessage: assistant.initialMessage,
    instructions: assistant.instructions,
    personality: assistant.personality,
    toneOfVoice: assistant.toneOfVoice,
    avoidPhrases: assistant.avoidPhrases,
    model: assistant.model,
    temperature: assistant.temperature,
    fallbackMessage: assistant.fallbackMessage,
    safetyInstruction: assistant.safetyInstruction,
    ragEnabled: assistant.ragEnabled,
    memoryEnabled: assistant.memoryEnabled,
    memoryPrePromptEnabled: assistant.memoryPrePromptEnabled,
    memoryExtractionEnabled: assistant.memoryExtractionEnabled,
    memoryAllowedCategories: parseMemoryAllowedCategories(assistant.memoryAllowedCategories),
    memoryConfidenceThreshold: assistant.memoryConfidenceThreshold,
    memoryTempDefaultDays: assistant.memoryTempDefaultDays,
    memorySharedAcrossAssistants: assistant.memorySharedAcrossAssistants,
    messageBufferEnabled: assistant.messageBufferEnabled,
    messageBufferSeconds: assistant.messageBufferSeconds,
    splitResponseEnabled: assistant.splitResponseEnabled,
    splitResponseStyle: assistant.splitResponseStyle,
    status: assistant.status,
    createdAt: assistant.createdAt,
    updatedAt: assistant.updatedAt,
  };
}

function toPreviewLogItem(record: AssistantPreviewLogRecord): PreviewAssistantLogItem {
  return {
    id: record.id,
    question: record.question,
    answer: record.answer,
    mode: record.mode,
    sources: toAssistantRuntimeSources(record.sources),
    createdAt: record.createdAt,
  };
}

@Injectable()
export class AssistantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly retrievalService: AssistantKnowledgeRetrievalService,
  ) {}

  private validateOfficialBusinessFields(
    dto: Pick<CreateAssistantDto & UpdateAssistantDto, "weeklySchedule" | "timezone">,
  ): void {
    if (dto.timezone !== undefined && dto.timezone !== null && !isValidIanaTimezone(dto.timezone)) {
      throw new BadRequestException("Timezone inválido. Use um timezone IANA válido.");
    }

    if (dto.weeklySchedule !== undefined) {
      const issues = validateBusinessHoursSchedule(dto.weeklySchedule);
      if (issues.length > 0) {
        throw new BadRequestException(
          `Horário de atendimento inválido: ${issues[0].message} (${issues[0].day}).`,
        );
      }
    }
  }

  private async loadDeterministicExecution(input: {
    id: string;
    question: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<DeterministicExecutionResult> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: assistantPreviewAssistantSelect,
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    if (assistant.status !== Status.ACTIVE) {
      throw new BadRequestException("Assistant is inactive.");
    }

    const knowledgeItems = await this.prisma.assistantKnowledge.findMany({
      where: {
        assistantId: input.id,
        companyId: input.tenant.companyId,
        status: Status.ACTIVE,
      },
      select: assistantPreviewKnowledgeSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    const { answer, sources } = buildDeterministicAssistantResponse({
      question: input.question,
      assistantName: assistant.name,
      instructions: assistant.instructions ?? null,
      knowledgeItems,
      officialBusinessContext: buildOfficialBusinessContext({
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
      }),
    });

    return {
      assistant,
      answer,
      sources,
    };
  }

  private async persistDeterministicExecutionLog(input: {
    assistantId: string;
    companyId: string;
    userId: string | null;
    question: string;
    answer: string;
    mode: "deterministic-preview" | "deterministic-runtime" | "ai-preview-rag";
    sources: AssistantRuntimeSource[];
  }): Promise<{ id: string }> {
    const previewLogClient = this.prisma as unknown as {
      assistantPreviewLog: AssistantPreviewLogDelegate;
    };

    return previewLogClient.assistantPreviewLog.create({
      data: {
        companyId: input.companyId,
        assistantId: input.assistantId,
        userId: input.userId,
        question: input.question,
        answer: input.answer,
        mode: input.mode,
        sources: input.sources,
      },
    });
  }

  async findAll(input: {
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindAllAssistantsResponse> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    let assistants: AssistantSafeRecord[];

    try {
      assistants = await this.prisma.withQueryTimeout(
        this.prisma.assistant.findMany({
          where: {
            companyId: input.tenant.companyId,
          },
          select: assistantSafeSelect,
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        }),
        "assistants list query",
      );
    } catch {
      throw new GatewayTimeoutException("Não foi possível consultar os assistentes agora.");
    }

    return {
      items: assistants.map(toAssistantResponse),
    };
  }

  async create(input: {
    dto: CreateAssistantDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<CreateAssistantResponse> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    this.validateOfficialBusinessFields(input.dto);

    const assistant = await this.prisma.assistant.create({
      data: {
        companyId: input.tenant.companyId,
        name: input.dto.name,
        description: input.dto.description ?? null,
        businessAddress: input.dto.businessAddress ?? null,
        businessCityRegion: input.dto.businessCityRegion ?? null,
        businessCity: input.dto.businessCity ?? null,
        businessState: input.dto.businessState ?? null,
        businessPostalCode: input.dto.businessPostalCode ?? null,
        businessPhone: input.dto.businessPhone ?? null,
        businessWhatsapp: input.dto.businessWhatsapp ?? null,
        businessWhatsappSupport: input.dto.businessWhatsappSupport ?? null,
        websiteUrl: input.dto.websiteUrl ?? null,
        timezone: input.dto.timezone ?? null,
        googleMapsUrl: input.dto.googleMapsUrl ?? null,
        latitude: input.dto.latitude ?? null,
        longitude: input.dto.longitude ?? null,
        weeklySchedule: input.dto.weeklySchedule ?? null,
        aiAlwaysAvailable: input.dto.aiAlwaysAvailable ?? true,
        initialMessage: input.dto.initialMessage ?? null,
        instructions: input.dto.instructions ?? null,
        personality: input.dto.personality ?? null,
        toneOfVoice: input.dto.toneOfVoice ?? null,
        avoidPhrases: input.dto.avoidPhrases ?? null,
        model: input.dto.model ?? null,
        temperature: input.dto.temperature ?? null,
        fallbackMessage: input.dto.fallbackMessage ?? null,
        safetyInstruction: input.dto.safetyInstruction ?? null,
        ragEnabled: input.dto.ragEnabled ?? false,
        memoryEnabled: input.dto.memoryEnabled ?? false,
        memoryPrePromptEnabled: input.dto.memoryPrePromptEnabled ?? true,
        memoryExtractionEnabled: input.dto.memoryExtractionEnabled ?? true,
        memoryAllowedCategories: input.dto.memoryAllowedCategories
          ? JSON.stringify(input.dto.memoryAllowedCategories)
          : null,
        memoryConfidenceThreshold: input.dto.memoryConfidenceThreshold ?? 0.7,
        memoryTempDefaultDays: input.dto.memoryTempDefaultDays ?? 7,
        memorySharedAcrossAssistants: input.dto.memorySharedAcrossAssistants ?? true,
        messageBufferEnabled: input.dto.messageBufferEnabled ?? true,
        messageBufferSeconds: input.dto.messageBufferSeconds ?? 6,
        splitResponseEnabled: input.dto.splitResponseEnabled ?? false,
        splitResponseStyle: input.dto.splitResponseStyle ?? null,
        status: Status.ACTIVE,
      },
      select: assistantSafeSelect,
    });

    return toAssistantResponse(assistant);
  }

  async findOne(input: {
    id: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindOneAssistantResponse> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: assistantSafeSelect,
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    return toAssistantResponse(assistant);
  }

  async update(input: {
    id: string;
    dto: UpdateAssistantDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<UpdateAssistantResponse> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const hasField = (field: keyof UpdateAssistantDto) =>
      Object.prototype.hasOwnProperty.call(input.dto, field);
    const hasName = typeof input.dto.name === "string";
    const hasDescription = hasField("description");
    const hasBusinessAddress = hasField("businessAddress");
    const hasBusinessCityRegion = hasField("businessCityRegion");
    const hasBusinessCity = hasField("businessCity");
    const hasBusinessState = hasField("businessState");
    const hasBusinessPostalCode = hasField("businessPostalCode");
    const hasBusinessPhone = hasField("businessPhone");
    const hasBusinessWhatsapp = hasField("businessWhatsapp");
    const hasBusinessWhatsappSupport = hasField("businessWhatsappSupport");
    const hasWebsiteUrl = hasField("websiteUrl");
    const hasTimezone = hasField("timezone");
    const hasWeeklySchedule = hasField("weeklySchedule");
    const hasAiAlwaysAvailable = hasField("aiAlwaysAvailable");
    const hasInitialMessage = hasField("initialMessage");
    const hasInstructions = hasField("instructions");
    const hasPersonality = hasField("personality");
    const hasToneOfVoice = hasField("toneOfVoice");
    const hasAvoidPhrases = hasField("avoidPhrases");
    const hasGoogleMapsUrl = hasField("googleMapsUrl");
    const hasLatitude = hasField("latitude");
    const hasLongitude = hasField("longitude");
    const hasModel = hasField("model");
    const hasTemperature = hasField("temperature");
    const hasFallbackMessage = hasField("fallbackMessage");
    const hasSafetyInstruction = hasField("safetyInstruction");
    const hasRagEnabled = hasField("ragEnabled");
    const hasMemoryEnabled = hasField("memoryEnabled");
    const hasMemoryPrePromptEnabled = hasField("memoryPrePromptEnabled");
    const hasMemoryExtractionEnabled = hasField("memoryExtractionEnabled");
    const hasMemoryAllowedCategories = hasField("memoryAllowedCategories");
    const hasMemoryConfidenceThreshold = hasField("memoryConfidenceThreshold");
    const hasMemoryTempDefaultDays = hasField("memoryTempDefaultDays");
    const hasMemorySharedAcrossAssistants = hasField("memorySharedAcrossAssistants");
    const hasMessageBufferEnabled = hasField("messageBufferEnabled");
    const hasMessageBufferSeconds = hasField("messageBufferSeconds");
    const hasSplitResponseEnabled = hasField("splitResponseEnabled");
    const hasSplitResponseStyle = hasField("splitResponseStyle");

    if (
      !hasName &&
      !hasDescription &&
      !hasBusinessAddress &&
      !hasBusinessCityRegion &&
      !hasBusinessCity &&
      !hasBusinessState &&
      !hasBusinessPostalCode &&
      !hasBusinessPhone &&
      !hasBusinessWhatsapp &&
      !hasBusinessWhatsappSupport &&
      !hasWebsiteUrl &&
      !hasTimezone &&
      !hasWeeklySchedule &&
      !hasAiAlwaysAvailable &&
      !hasInitialMessage &&
      !hasInstructions &&
      !hasPersonality &&
      !hasToneOfVoice &&
      !hasAvoidPhrases &&
      !hasGoogleMapsUrl &&
      !hasLatitude &&
      !hasLongitude &&
      !hasModel &&
      !hasTemperature &&
      !hasFallbackMessage &&
      !hasSafetyInstruction &&
      !hasRagEnabled &&
      !hasMemoryEnabled &&
      !hasMemoryPrePromptEnabled &&
      !hasMemoryExtractionEnabled &&
      !hasMemoryAllowedCategories &&
      !hasMemoryConfidenceThreshold &&
      !hasMemoryTempDefaultDays &&
      !hasMemorySharedAcrossAssistants &&
      !hasMessageBufferEnabled &&
      !hasMessageBufferSeconds &&
      !hasSplitResponseEnabled &&
      !hasSplitResponseStyle
    ) {
      throw new BadRequestException("At least one editable field must be provided.");
    }

    this.validateOfficialBusinessFields(input.dto);

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: {
        id: true,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    await this.prisma.assistant.updateMany({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      data: {
        ...(hasName ? { name: input.dto.name } : {}),
        ...(hasDescription ? { description: input.dto.description ?? null } : {}),
        ...(hasBusinessAddress ? { businessAddress: input.dto.businessAddress ?? null } : {}),
        ...(hasBusinessCityRegion
          ? { businessCityRegion: input.dto.businessCityRegion ?? null }
          : {}),
        ...(hasBusinessCity ? { businessCity: input.dto.businessCity ?? null } : {}),
        ...(hasBusinessState ? { businessState: input.dto.businessState ?? null } : {}),
        ...(hasBusinessPostalCode
          ? { businessPostalCode: input.dto.businessPostalCode ?? null }
          : {}),
        ...(hasBusinessPhone ? { businessPhone: input.dto.businessPhone ?? null } : {}),
        ...(hasBusinessWhatsapp ? { businessWhatsapp: input.dto.businessWhatsapp ?? null } : {}),
        ...(hasBusinessWhatsappSupport
          ? { businessWhatsappSupport: input.dto.businessWhatsappSupport ?? null }
          : {}),
        ...(hasWebsiteUrl ? { websiteUrl: input.dto.websiteUrl ?? null } : {}),
        ...(hasTimezone ? { timezone: input.dto.timezone ?? null } : {}),
        ...(hasGoogleMapsUrl ? { googleMapsUrl: input.dto.googleMapsUrl ?? null } : {}),
        ...(hasLatitude ? { latitude: input.dto.latitude ?? null } : {}),
        ...(hasLongitude ? { longitude: input.dto.longitude ?? null } : {}),
        ...(hasWeeklySchedule ? { weeklySchedule: input.dto.weeklySchedule ?? null } : {}),
        ...(hasAiAlwaysAvailable ? { aiAlwaysAvailable: input.dto.aiAlwaysAvailable ?? true } : {}),
        ...(hasInitialMessage ? { initialMessage: input.dto.initialMessage ?? null } : {}),
        ...(hasInstructions ? { instructions: input.dto.instructions ?? null } : {}),
        ...(hasPersonality ? { personality: input.dto.personality ?? null } : {}),
        ...(hasToneOfVoice ? { toneOfVoice: input.dto.toneOfVoice ?? null } : {}),
        ...(hasAvoidPhrases ? { avoidPhrases: input.dto.avoidPhrases ?? null } : {}),
        ...(hasModel ? { model: input.dto.model ?? null } : {}),
        ...(hasTemperature ? { temperature: input.dto.temperature ?? null } : {}),
        ...(hasFallbackMessage ? { fallbackMessage: input.dto.fallbackMessage ?? null } : {}),
        ...(hasSafetyInstruction ? { safetyInstruction: input.dto.safetyInstruction ?? null } : {}),
        ...(hasRagEnabled ? { ragEnabled: input.dto.ragEnabled ?? false } : {}),
        ...(hasMemoryEnabled ? { memoryEnabled: input.dto.memoryEnabled ?? false } : {}),
        ...(hasMemoryPrePromptEnabled
          ? { memoryPrePromptEnabled: input.dto.memoryPrePromptEnabled ?? true }
          : {}),
        ...(hasMemoryExtractionEnabled
          ? { memoryExtractionEnabled: input.dto.memoryExtractionEnabled ?? true }
          : {}),
        ...(hasMemoryAllowedCategories
          ? {
              memoryAllowedCategories: input.dto.memoryAllowedCategories
                ? JSON.stringify(input.dto.memoryAllowedCategories)
                : null,
            }
          : {}),
        ...(hasMemoryConfidenceThreshold
          ? { memoryConfidenceThreshold: input.dto.memoryConfidenceThreshold ?? 0.7 }
          : {}),
        ...(hasMemoryTempDefaultDays
          ? { memoryTempDefaultDays: input.dto.memoryTempDefaultDays ?? 7 }
          : {}),
        ...(hasMemorySharedAcrossAssistants
          ? { memorySharedAcrossAssistants: input.dto.memorySharedAcrossAssistants ?? true }
          : {}),
        ...(hasMessageBufferEnabled
          ? { messageBufferEnabled: input.dto.messageBufferEnabled ?? true }
          : {}),
        ...(hasMessageBufferSeconds
          ? { messageBufferSeconds: input.dto.messageBufferSeconds ?? 6 }
          : {}),
        ...(hasSplitResponseEnabled
          ? { splitResponseEnabled: input.dto.splitResponseEnabled ?? false }
          : {}),
        ...(hasSplitResponseStyle
          ? { splitResponseStyle: input.dto.splitResponseStyle ?? null }
          : {}),
      },
    });

    const updatedAssistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: assistantSafeSelect,
    });

    if (!updatedAssistant) {
      throw new NotFoundException("Assistant not found.");
    }

    return toAssistantResponse(updatedAssistant);
  }

  async updateStatus(input: {
    id: string;
    dto: UpdateAssistantStatusDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<UpdateAssistantStatusResponse> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: {
        id: true,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    await this.prisma.assistant.updateMany({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      data: {
        status: input.dto.status,
      },
    });

    const updatedAssistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: assistantSafeSelect,
    });

    if (!updatedAssistant) {
      throw new NotFoundException("Assistant not found.");
    }

    return toAssistantResponse(updatedAssistant);
  }

  async preview(input: {
    id: string;
    dto: PreviewAssistantDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<PreviewAssistantResponse> {
    if (input.dto.usePreparedKnowledge) {
      // 1. Validar Assistente
      const assistant = await this.prisma.assistant.findFirst({
        where: { id: input.id, companyId: input.tenant.companyId },
        select: assistantPreviewAssistantSelect,
      });
      if (!assistant) throw new NotFoundException("Assistant not found.");

      // 2. Buscar RAG Chunks
      const ragSearch = await this.retrievalService.searchRelevantKnowledge({
        assistantId: assistant.id,
        companyId: input.tenant.companyId,
        query: input.dto.question,
        topK: 5,
        user: input.user,
        tenant: input.tenant,
      });

      // 3. Montar Contexto
      let contextBlock = "";
      let answer = "";
      const usedKnowledge: any[] = [];

      if (ragSearch.results.length > 0) {
        contextBlock =
          `\n\nConhecimentos relevantes encontrados:\n` +
          ragSearch.results
            .map((r, i) => `[${i + 1}] Título: ${r.knowledgeTitle}\nTrecho: ${r.contentPreview}`)
            .join("\n\n") +
          `\n\nUse essas informações apenas quando forem relevantes para responder. Se a resposta não estiver nos conhecimentos, não invente.`;
        usedKnowledge.push(...ragSearch.results);
      } else {
        contextBlock = `\n\n(Nenhum conhecimento relevante encontrado na base para esta pergunta.)`;
      }

      // 4. Chamar LLM Real (apenas se Provider configurado)
      try {
        const isProviderConfigured = await this.aiService.isProviderConfigured(
          input.tenant.companyId,
        );
        if (!isProviderConfigured) {
          answer = "ERRO: Provedor de IA não configurado para realizar o teste de RAG.";
        } else {
          const officialContext = buildOfficialBusinessContext({
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
          const sysPrompt = [
            officialContext.promptBlock,
            assistant.instructions || "",
            contextBlock,
          ]
            .filter(Boolean)
            .join("\n\n---\n\n");
          const completion = await this.aiService.generateChatCompletion({
            companyId: input.tenant.companyId,
            model: assistant.model || undefined,
            temperature: assistant.temperature || 0.2,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: input.dto.question },
            ],
          });
          answer = completion.answer;
        }
      } catch (err) {
        answer = "ERRO AO CHAMAR IA: " + (err instanceof Error ? err.message : String(err));
      }

      const previewLog = await this.persistDeterministicExecutionLog({
        assistantId: assistant.id,
        companyId: input.tenant.companyId,
        userId: input.user.id,
        question: input.dto.question,
        answer,
        mode: "ai-preview-rag",
        sources: [], // Fake deterministic sources
      });

      return {
        previewLogId: previewLog.id,
        assistant: { id: assistant.id, name: assistant.name },
        question: input.dto.question,
        answer,
        sources: [],
        mode: "ai-preview-rag",
        usedKnowledge,
        ragEnabled: true,
        totalChunksScanned: ragSearch.totalChunksScanned,
      };
    }

    // Comportamento Antigo Determinístico
    const { assistant, answer, sources } = await this.loadDeterministicExecution({
      id: input.id,
      question: input.dto.question,
      user: input.user,
      tenant: input.tenant,
    });

    const previewLog = await this.persistDeterministicExecutionLog({
      assistantId: assistant.id,
      companyId: input.tenant.companyId,
      userId: input.user.id,
      question: input.dto.question,
      answer,
      mode: "deterministic-preview",
      sources,
    });

    return {
      previewLogId: previewLog.id,
      assistant: {
        id: assistant.id,
        name: assistant.name,
      },
      question: input.dto.question,
      answer,
      sources,
      mode: "deterministic-preview",
    };
  }

  async run(input: {
    id: string;
    dto: RunAssistantDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<RunAssistantResponse> {
    const { assistant, answer, sources } = await this.loadDeterministicExecution({
      id: input.id,
      question: input.dto.message,
      user: input.user,
      tenant: input.tenant,
    });

    const runLog = await this.persistDeterministicExecutionLog({
      assistantId: assistant.id,
      companyId: input.tenant.companyId,
      userId: input.user.id,
      question: input.dto.message,
      answer,
      mode: "deterministic-runtime",
      sources,
    });

    return {
      runLogId: runLog.id,
      assistant: {
        id: assistant.id,
        name: assistant.name,
      },
      input: {
        message: input.dto.message,
      },
      output: {
        answer,
      },
      sources,
      mode: "deterministic-runtime",
    };
  }

  async findPreviewLogs(input: {
    id: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<FindAllPreviewAssistantLogsResponse> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
      select: {
        id: true,
      },
    });

    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    const previewLogClient = this.prisma as unknown as {
      assistantPreviewLog: AssistantPreviewLogDelegate;
    };

    const items = await previewLogClient.assistantPreviewLog.findMany({
      where: {
        assistantId: input.id,
        companyId: input.tenant.companyId,
      },
      select: assistantPreviewLogSelect,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return {
      items: items.map(toPreviewLogItem),
    };
  }

  async findTools(input: {
    id: string;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }) {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
    });
    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    const installations = await this.prisma.appInstallation.findMany({
      where: {
        companyId: input.tenant.companyId,
        status: "ACTIVE",
      },
      include: {
        app: true,
      },
    });

    const configs = await this.prisma.assistantToolConfig.findMany({
      where: {
        assistantId: assistant.id,
      },
    });

    const configMap = new Map<string, typeof configs[number]>();
    for (const c of configs) {
      configMap.set(`${c.appId}:${c.toolName}`, c);
    }

    const resultList: any[] = [];

    for (const inst of installations) {
      const appSlug = inst.app.slug;
      
      if (appSlug === "google_calendar") {
        const calendarTools = [
          { name: "calendar_checkAvailability", label: "Consultar disponibilidade", desc: "Consultar horários livres nas agendas.", defaultPerm: "READ", defaultConf: false },
          { name: "calendar_getBookingsByContact", label: "Consultar agendamentos", desc: "Listar agendamentos futuros do cliente pelo telefone.", defaultPerm: "READ", defaultConf: false },
          { name: "calendar_createBooking", label: "Criar agendamento", desc: "Marcar um novo horário.", defaultPerm: "WRITE", defaultConf: true },
          { name: "calendar_rescheduleBooking", label: "Remarcar agendamento", desc: "Mudar data ou horário de reserva existente.", defaultPerm: "WRITE", defaultConf: true },
          { name: "calendar_cancelBooking", label: "Cancelar agendamento", desc: "Excluir reserva existente.", defaultPerm: "WRITE", defaultConf: true }
        ];

        for (const t of calendarTools) {
          const key = `${inst.app.id}:${t.name}`;
          const existing = configMap.get(key);
          resultList.push({
            appId: inst.app.id,
            appSlug: inst.app.slug,
            appName: inst.app.name,
            toolName: t.name,
            displayName: t.label,
            description: t.desc,
            enabled: existing ? existing.enabled : true,
            permissionType: existing ? existing.permissionType : t.defaultPerm,
            requiresConfirmation: existing ? existing.requiresConfirmation : t.defaultConf,
          });
        }
      } else if (appSlug === "custom_webhook") {
        const webhookActions = await this.prisma.customWebhookAction.findMany({
          where: {
            companyId: input.tenant.companyId,
            installationId: inst.id,
            active: true,
          },
        });

        for (const action of webhookActions) {
          const toolName = `webhook_${action.name}`;
          const key = `${inst.app.id}:${toolName}`;
          const existing = configMap.get(key);
          resultList.push({
            appId: inst.app.id,
            appSlug: inst.app.slug,
            appName: inst.app.name,
            toolName: toolName,
            displayName: action.displayName,
            description: action.descriptionAdmin || action.descriptionAi || "Ação de webhook customizado.",
            enabled: existing ? existing.enabled : true,
            permissionType: existing ? existing.permissionType : action.permissionType,
            requiresConfirmation: existing ? existing.requiresConfirmation : action.requiresConfirmation,
          });
        }
      }
    }

    return { items: resultList };
  }

  async updateTools(input: {
    id: string;
    dto: UpdateAssistantToolsDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }) {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const assistant = await this.prisma.assistant.findFirst({
      where: {
        id: input.id,
        companyId: input.tenant.companyId,
      },
    });
    if (!assistant) {
      throw new NotFoundException("Assistant not found.");
    }

    await this.prisma.$transaction(
      input.dto.tools.map((t) =>
        this.prisma.assistantToolConfig.upsert({
          where: {
            assistantId_appId_toolName: {
              assistantId: assistant.id,
              appId: t.appId,
              toolName: t.toolName,
            },
          },
          update: {
            enabled: t.enabled,
            permissionType: t.permissionType,
            requiresConfirmation: t.requiresConfirmation,
          },
          create: {
            assistantId: assistant.id,
            appId: t.appId,
            toolName: t.toolName,
            enabled: t.enabled,
            permissionType: t.permissionType,
            requiresConfirmation: t.requiresConfirmation,
          },
        })
      )
    );

    return { success: true };
  }
}
