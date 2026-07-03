import {
  BadRequestException,
  ForbiddenException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Status } from "@prisma/client";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import {
  buildDeterministicAssistantResponse,
  toAssistantRuntimeSources,
  type AssistantRuntimeSource,
} from "./assistant-runtime";
import { type CreateAssistantDto } from "./dto/create-assistant.dto";
import { type PreviewAssistantDto } from "./dto/preview-assistant.dto";
import { type RunAssistantDto } from "./dto/run-assistant.dto";
import { type UpdateAssistantStatusDto } from "./dto/update-assistant-status.dto";
import { type UpdateAssistantDto } from "./dto/update-assistant.dto";

export type AssistantListItem = {
  id: string;
  name: string;
  description: string | null;
  initialMessage: string | null;
  instructions: string | null;
  model: string | null;
  temperature: number | null;
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
  mode: "deterministic-preview";
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
  initialMessage: true,
  instructions: true,
  model: true,
  temperature: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssistantSelect;

type AssistantSafeRecord = Prisma.AssistantGetPayload<{
  select: typeof assistantSafeSelect;
}>;

const assistantPreviewAssistantSelect = {
  id: true,
  name: true,
  status: true,
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

function toAssistantResponse(assistant: AssistantSafeRecord): AssistantListItem {
  return {
    id: assistant.id,
    name: assistant.name,
    description: assistant.description,
    initialMessage: assistant.initialMessage,
    instructions: assistant.instructions,
    model: assistant.model,
    temperature: assistant.temperature,
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
  constructor(private readonly prisma: PrismaService) {}

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
      knowledgeItems,
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
    mode: "deterministic-preview" | "deterministic-runtime";
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

    const assistant = await this.prisma.assistant.create({
      data: {
        companyId: input.tenant.companyId,
        name: input.dto.name,
        description: input.dto.description ?? null,
        initialMessage: input.dto.initialMessage ?? null,
        instructions: input.dto.instructions ?? null,
        model: input.dto.model ?? null,
        temperature: input.dto.temperature ?? null,
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
    const hasInitialMessage = hasField("initialMessage");
    const hasInstructions = hasField("instructions");
    const hasModel = hasField("model");
    const hasTemperature = hasField("temperature");

    if (
      !hasName &&
      !hasDescription &&
      !hasInitialMessage &&
      !hasInstructions &&
      !hasModel &&
      !hasTemperature
    ) {
      throw new BadRequestException("At least one editable field must be provided.");
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

    const updatedAssistant = await this.prisma.assistant.update({
      where: {
        id: input.id,
      },
      data: {
        ...(hasName ? { name: input.dto.name } : {}),
        ...(hasDescription ? { description: input.dto.description ?? null } : {}),
        ...(hasInitialMessage ? { initialMessage: input.dto.initialMessage ?? null } : {}),
        ...(hasInstructions ? { instructions: input.dto.instructions ?? null } : {}),
        ...(hasModel ? { model: input.dto.model ?? null } : {}),
        ...(hasTemperature ? { temperature: input.dto.temperature ?? null } : {}),
      },
      select: assistantSafeSelect,
    });

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

    const updatedAssistant = await this.prisma.assistant.update({
      where: {
        id: input.id,
      },
      data: {
        status: input.dto.status,
      },
      select: assistantSafeSelect,
    });

    return toAssistantResponse(updatedAssistant);
  }

  async preview(input: {
    id: string;
    dto: PreviewAssistantDto;
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<PreviewAssistantResponse> {
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
}
