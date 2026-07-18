import { createHash } from "node:crypto";
import {
  buildOfficialBusinessContext,
  isValidIanaTimezone,
  validateBusinessHoursSchedule,
} from "../assistants/official-business-context";
import type { AssistantSecurityRulesService } from "../assistant-security-rules/assistant-security-rules.service";
import {
  CANONICAL_INBOUND_MESSAGE_SCHEMA_VERSION,
  hashCanonicalInboundMessageContent,
} from "../inbound/canonical-inbound-message";
import { understandTurn } from "./turn-understanding";
import { evaluateV2PrimarySecurityRules } from "../assistant-conversations/v2-primary-security-gate";
import type { PrismaService } from "../database/prisma.service";
import {
  resolveRuntimeV2ResponseExecutionAssistantIds,
  resolveRuntimeV2ResponseExecutionConversationIds,
  resolveRuntimeV2ResponseExecutionMode,
} from "./runtime-v2-feature-flag";
import type { ConversationStateStore } from "./conversation-state-store";
import { ConversationStateResponseExecutionStore } from "./conversation-state-response-execution-store";
import { RuntimeV2ResponseExecutionCoordinator } from "./response-execution-coordinator";
import {
  createRuntimeV2ResponseExecutionApproval,
  type RuntimeV2ResponseExecutionApproval,
} from "./response-execution-approval";

export type RuntimeV2ResponseExecutionAdministrativeScope = {
  companyId: string;
  assistantId: string;
  conversationId: string;
};

export type RuntimeV2ResponseExecutionPreflightInput =
  RuntimeV2ResponseExecutionAdministrativeScope & {
    message: string;
    canonicalVersion: string;
    allowedCategory: "businessHours";
    allowedAuthority: "OFFICIAL_CONTEXT";
  };

export type RuntimeV2ResponseExecutionPreflightResult = {
  preflightStatus: "APPROVED" | "BLOCKED";
  scope: {
    companyIdFingerprint: string;
    assistantIdFingerprint: string;
    conversationIdFingerprint: string;
  };
  canonicalHashFingerprint: string | null;
  canonicalVersion: string;
  allowedCategory: "businessHours";
  allowedAuthority: "OFFICIAL_CONTEXT";
  contextVersion: number | null;
  securityRulesStatus: "ALLOWED" | "NO_ACTIVE_RULES" | "BLOCKED";
  securityRulesFingerprint: string | null;
  officialContextStatus: "AVAILABLE" | "BLOCKED";
  officialContextFingerprint: string | null;
  executionConfiguration: {
    mode: "OFF" | "CONTROLLED";
    assistantAllowlisted: boolean;
    conversationAllowlisted: boolean;
  };
  blockers: string[];
  redactionApplied: true;
};

export type RuntimeV2ResponseExecutionArmInput = RuntimeV2ResponseExecutionPreflightInput & {
  durationMinutes: number;
  operatorPurpose: string;
};

export type RuntimeV2ResponseExecutionStatusInput =
  | (RuntimeV2ResponseExecutionAdministrativeScope & { approvalFingerprint?: string })
  | { approvalFingerprint: string };

export type RuntimeV2ResponseExecutionStatusResult = {
  found: boolean;
  approvalFingerprint: string | null;
  status: RuntimeV2ResponseExecutionApproval["status"] | null;
  createdAt: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
  consumedAt: string | null;
  internalMessageIdFingerprint: string | null;
  generationIdFingerprint: string | null;
  owner: string | null;
  terminalStatus: string | null;
  outboundAttempted: boolean | null;
  outboundPerformed: boolean | null;
  externalMessageReferenceStatus: "PRESENT" | "MISSING" | null;
  externalMessageReferenceFingerprint: string | null;
  fallbackReason: string | null;
  reconciliationReason: string | null;
  redactionApplied: true;
};

export type RuntimeV2ResponseExecutionAdministrationDependencies = {
  prisma: Pick<
    PrismaService,
    | "company"
    | "assistant"
    | "assistantConversation"
    | "assistantFlow"
    | "assistantToolConfig"
    | "assistantConversationStateV2"
  >;
  securityRules: Pick<AssistantSecurityRulesService, "findActiveForRuntime">;
  stateStore: ConversationStateStore;
  responseExecutionStore: ConversationStateResponseExecutionStore;
  coordinator: RuntimeV2ResponseExecutionCoordinator;
  environment?: NodeJS.ProcessEnv;
  now?: () => Date;
};

function fingerprint(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function sortUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function hasScope(
  input: RuntimeV2ResponseExecutionStatusInput,
): input is RuntimeV2ResponseExecutionAdministrativeScope & {
  approvalFingerprint?: string;
} {
  return "companyId" in input && "assistantId" in input && "conversationId" in input;
}

function sanitizeOperatorPurpose(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120)
    throw new Error("RESPONSE_EXECUTION_OPERATOR_PURPOSE_INVALID");
  return `PURPOSE_${fingerprint(trimmed)}`;
}

function officialFingerprint(input: { timezone: string; businessHours: unknown }): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

function statusFromRecord(
  record: {
    approval: RuntimeV2ResponseExecutionApproval;
    owner: string;
    terminalStatus: string | null;
    outboundV2Attempted: boolean;
    outboundV2Performed: boolean | null;
    externalMessageId: string | null;
    fallbackReason: string | null;
    reconciliationReason: string | null;
  } | null,
  now = new Date(),
): RuntimeV2ResponseExecutionStatusResult {
  if (!record) {
    return {
      found: false,
      approvalFingerprint: null,
      status: null,
      createdAt: null,
      expiresAt: null,
      claimedAt: null,
      consumedAt: null,
      internalMessageIdFingerprint: null,
      generationIdFingerprint: null,
      owner: null,
      terminalStatus: null,
      outboundAttempted: null,
      outboundPerformed: null,
      externalMessageReferenceStatus: null,
      externalMessageReferenceFingerprint: null,
      fallbackReason: null,
      reconciliationReason: null,
      redactionApplied: true,
    };
  }
  const approval = record.approval;
  const status =
    approval.status === "ARMED" && Date.parse(approval.expiresAt) <= now.getTime()
      ? "EXPIRED"
      : approval.status;
  return {
    found: true,
    approvalFingerprint: approval.creationFingerprint.slice(0, 16),
    status,
    createdAt: approval.createdAt ?? null,
    expiresAt: approval.expiresAt,
    claimedAt: approval.claimedAt,
    consumedAt: approval.consumedAt,
    internalMessageIdFingerprint: fingerprint(approval.internalMessageId),
    generationIdFingerprint: fingerprint(approval.generationId),
    owner: record.owner,
    terminalStatus: record.terminalStatus,
    outboundAttempted: record.outboundV2Attempted,
    outboundPerformed: record.outboundV2Performed,
    externalMessageReferenceStatus: record.externalMessageId ? "PRESENT" : "MISSING",
    externalMessageReferenceFingerprint: fingerprint(record.externalMessageId),
    fallbackReason: record.fallbackReason,
    reconciliationReason: record.reconciliationReason,
    redactionApplied: true,
  };
}

/**
 * Administrative workflow for a single future inbound. It is deliberately
 * read-only until arm(), and never changes execution flags or allowlists.
 */
export class RuntimeV2ResponseExecutionAdministrationService {
  private readonly environment: NodeJS.ProcessEnv;
  private readonly now: () => Date;

  constructor(private readonly dependencies: RuntimeV2ResponseExecutionAdministrationDependencies) {
    this.environment = dependencies.environment ?? process.env;
    this.now = dependencies.now ?? (() => new Date());
  }

  async preflight(
    input: RuntimeV2ResponseExecutionPreflightInput,
  ): Promise<RuntimeV2ResponseExecutionPreflightResult> {
    const blockers: string[] = [];
    const canonicalHash = hashCanonicalInboundMessageContent(input.message);
    if (!canonicalHash) blockers.push("CANONICAL_MESSAGE_EMPTY");
    if (input.canonicalVersion !== CANONICAL_INBOUND_MESSAGE_SCHEMA_VERSION) {
      blockers.push("CANONICAL_VERSION_UNSUPPORTED");
    }
    if (input.allowedCategory !== "businessHours") blockers.push("CATEGORY_NOT_ALLOWED");
    if (input.allowedAuthority !== "OFFICIAL_CONTEXT") blockers.push("AUTHORITY_NOT_ALLOWED");
    const understanding = understandTurn({
      message: input.message,
      messageId: "preflight",
      contextVersion: 1,
      now: this.now(),
      recentHistory: [],
    });
    if (understanding.humanHandoffSignal.requested) {
      blockers.push("CUSTOMER_REQUESTED_HUMAN");
    }
    if (
      understanding.requiresClarification ||
      understanding.requestedInformationCategories.length !== 1 ||
      understanding.requestedInformationCategories[0] !== "businessHours"
    ) {
      blockers.push("TURN_NOT_STRICT_BUSINESS_HOURS");
    }

    const company = await this.dependencies.prisma.company.findUnique({
      where: { id: input.companyId },
      select: { id: true, name: true, timezone: true },
    });
    if (!company) blockers.push("COMPANY_NOT_FOUND");
    const assistant = await this.dependencies.prisma.assistant.findFirst({
      where: { id: input.assistantId, companyId: input.companyId },
      select: {
        id: true,
        companyId: true,
        name: true,
        timezone: true,
        description: true,
        businessAddress: true,
        businessCity: true,
        businessState: true,
        businessCityRegion: true,
        businessPostalCode: true,
        googleMapsUrl: true,
        latitude: true,
        longitude: true,
        businessPhone: true,
        businessWhatsapp: true,
        businessWhatsappSupport: true,
        websiteUrl: true,
        weeklySchedule: true,
        aiAlwaysAvailable: true,
      },
    });
    if (!assistant) blockers.push("ASSISTANT_NOT_FOUND");
    const conversation = await this.dependencies.prisma.assistantConversation.findFirst({
      where: {
        id: input.conversationId,
        companyId: input.companyId,
        assistantId: input.assistantId,
      },
      select: {
        id: true,
        aiActive: true,
        pausedByHuman: true,
        status: true,
        currentContextVersion: true,
      },
    });
    if (!conversation) blockers.push("CONVERSATION_NOT_FOUND");
    if (conversation && !conversation.aiActive) blockers.push("AI_INACTIVE");
    if (conversation?.pausedByHuman) blockers.push("HUMAN_ACTIVE");
    if (conversation && conversation.status !== "ACTIVE") blockers.push("CONVERSATION_NOT_ACTIVE");

    const contextVersion = conversation?.currentContextVersion ?? null;
    let activeHandoff = false;
    if (contextVersion !== null) {
      const state = await this.dependencies.stateStore.load({
        companyId: input.companyId,
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        contextVersion,
        runtimeVersion: "V2",
        mode: "SHADOW",
      });
      activeHandoff = Boolean(state?.handoffState?.activeHandoff);
      if (activeHandoff) blockers.push("HANDOFF_ACTIVE");
    }

    const [activeFlowCount, enabledToolCount] = assistant
      ? await Promise.all([
          this.dependencies.prisma.assistantFlow.count({
            where: { assistantId: assistant.id, active: true },
          }),
          this.dependencies.prisma.assistantToolConfig.count({
            where: { assistantId: assistant.id, enabled: true },
          }),
        ])
      : [0, 0];
    if (activeFlowCount > 0) blockers.push("FLOW_CONFIGURATION_PRESENT");
    if (enabledToolCount > 0) blockers.push("TOOL_CONFIGURATION_PRESENT");

    const securityRules = assistant
      ? await this.dependencies.securityRules.findActiveForRuntime({
          companyId: input.companyId,
          assistantId: assistant.id,
        })
      : [];
    const security = evaluateV2PrimarySecurityRules(securityRules, {
      companyId: input.companyId,
      assistantId: input.assistantId,
    });
    blockers.push(...security.blockers);

    let officialContextStatus: "AVAILABLE" | "BLOCKED" = "BLOCKED";
    let officialContextFingerprint: string | null = null;
    if (company && assistant) {
      const official = buildOfficialBusinessContext(
        {
          companyName: company.name,
          companyTimezone: company.timezone,
          assistantName: assistant.name,
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
        },
        this.now(),
      );
      if (
        isValidIanaTimezone(official.timezone) &&
        validateBusinessHoursSchedule(official.businessHours).length === 0 &&
        Object.values(official.businessHours).some((items) => items.length > 0)
      ) {
        officialContextStatus = "AVAILABLE";
        officialContextFingerprint = officialFingerprint({
          timezone: official.timezone,
          businessHours: official.businessHours,
        });
      } else {
        blockers.push("OFFICIAL_BUSINESS_HOURS_UNAVAILABLE");
      }
    }

    if (contextVersion !== null) {
      const record = await this.dependencies.responseExecutionStore.load({
        companyId: input.companyId,
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        contextVersion,
      });
      if (record && !record.terminalStatus) blockers.push("RESPONSE_EXECUTION_PENDING");
    }

    const executionMode = resolveRuntimeV2ResponseExecutionMode(this.environment);
    const assistantAllowlisted = resolveRuntimeV2ResponseExecutionAssistantIds(
      this.environment,
    ).includes(input.assistantId);
    const conversationAllowlisted = resolveRuntimeV2ResponseExecutionConversationIds(
      this.environment,
    ).includes(input.conversationId);
    return {
      preflightStatus: blockers.length === 0 ? "APPROVED" : "BLOCKED",
      scope: {
        companyIdFingerprint: fingerprint(input.companyId)!,
        assistantIdFingerprint: fingerprint(input.assistantId)!,
        conversationIdFingerprint: fingerprint(input.conversationId)!,
      },
      canonicalHashFingerprint: fingerprint(canonicalHash),
      canonicalVersion: input.canonicalVersion,
      allowedCategory: "businessHours",
      allowedAuthority: "OFFICIAL_CONTEXT",
      contextVersion,
      securityRulesStatus: security.allowed
        ? security.activeRuleCount > 0
          ? "ALLOWED"
          : "NO_ACTIVE_RULES"
        : "BLOCKED",
      securityRulesFingerprint: security.rulesFingerprint,
      officialContextStatus,
      officialContextFingerprint,
      executionConfiguration: {
        mode: executionMode,
        assistantAllowlisted,
        conversationAllowlisted,
      },
      blockers: sortUnique(blockers),
      redactionApplied: true,
    };
  }

  async arm(
    input: RuntimeV2ResponseExecutionArmInput,
  ): Promise<RuntimeV2ResponseExecutionStatusResult> {
    if (
      !Number.isInteger(input.durationMinutes) ||
      input.durationMinutes < 1 ||
      input.durationMinutes > 10
    ) {
      throw new Error("RESPONSE_EXECUTION_DURATION_INVALID");
    }
    const preflight = await this.preflight(input);
    if (preflight.preflightStatus !== "APPROVED" || !preflight.contextVersion) {
      throw new Error("RESPONSE_EXECUTION_PREFLIGHT_BLOCKED");
    }
    const canonicalHash = hashCanonicalInboundMessageContent(input.message);
    if (!canonicalHash) throw new Error("RESPONSE_EXECUTION_CANONICAL_HASH_REQUIRED");
    const approval = createRuntimeV2ResponseExecutionApproval({
      companyId: input.companyId,
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      expectedCanonicalComparisonHash: canonicalHash,
      canonicalVersion: input.canonicalVersion,
      expiresAt: new Date(this.now().getTime() + input.durationMinutes * 60_000),
      operatorPurpose: sanitizeOperatorPurpose(input.operatorPurpose),
      securityRulesFingerprint: preflight.securityRulesFingerprint,
      securityRulesStatus:
        preflight.securityRulesStatus === "NO_ACTIVE_RULES" ? "NO_ACTIVE_RULES" : "ALLOWED",
      officialContextFingerprint: preflight.officialContextFingerprint,
      officialContextStatus: "AVAILABLE",
      now: this.now(),
    });
    await this.dependencies.responseExecutionStore.arm({
      approval,
      contextVersion: preflight.contextVersion,
    });
    return statusFromRecord(
      await this.dependencies.responseExecutionStore.load({
        companyId: input.companyId,
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        contextVersion: preflight.contextVersion,
      }),
    );
  }

  async status(
    input: RuntimeV2ResponseExecutionStatusInput,
  ): Promise<RuntimeV2ResponseExecutionStatusResult> {
    if (!hasScope(input)) {
      const rows = await this.dependencies.prisma.assistantConversationStateV2.findMany({
        where: { mode: "SHADOW", expiresAt: { gt: this.now() } },
        select: { stateJson: true },
      });
      for (const row of rows) {
        const candidate =
          row.stateJson && typeof row.stateJson === "object" && !Array.isArray(row.stateJson)
            ? (row.stateJson as { responseExecution?: unknown }).responseExecution
            : null;
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
          const record = candidate as {
            approval?: { creationFingerprint?: unknown };
          };
          const candidateFingerprint =
            typeof record.approval?.creationFingerprint === "string"
              ? record.approval.creationFingerprint.slice(0, 16)
              : null;
          if (candidateFingerprint === input.approvalFingerprint) {
            return statusFromRecord(
              candidate as Parameters<typeof statusFromRecord>[0],
              this.now(),
            );
          }
        }
      }
      return statusFromRecord(null, this.now());
    }
    const conversation = await this.dependencies.prisma.assistantConversation.findFirst({
      where: {
        id: input.conversationId,
        companyId: input.companyId,
        assistantId: input.assistantId,
      },
      select: { currentContextVersion: true },
    });
    if (!conversation) return statusFromRecord(null, this.now());
    const record = await this.dependencies.responseExecutionStore.load({
      ...input,
      contextVersion: conversation.currentContextVersion,
    });
    if (
      record &&
      input.approvalFingerprint &&
      record.approval.creationFingerprint.slice(0, 16) !== input.approvalFingerprint
    ) {
      return statusFromRecord(null, this.now());
    }
    return statusFromRecord(record, this.now());
  }

  async cancel(
    input: RuntimeV2ResponseExecutionAdministrativeScope & { approvalFingerprint: string },
  ): Promise<RuntimeV2ResponseExecutionStatusResult> {
    const current = await this.status(input);
    if (!current.found || !current.approvalFingerprint) {
      throw new Error("RESPONSE_EXECUTION_CANCEL_NOT_ARMED");
    }
    if (current.status === "CANCELLED") return current;
    if (current.status !== "ARMED") throw new Error("RESPONSE_EXECUTION_CANCEL_NOT_ARMED");
    const conversation = await this.dependencies.prisma.assistantConversation.findFirst({
      where: {
        id: input.conversationId,
        companyId: input.companyId,
        assistantId: input.assistantId,
      },
      select: { currentContextVersion: true },
    });
    if (!conversation) throw new Error("RESPONSE_EXECUTION_CANCEL_SCOPE_INVALID");
    if (
      !(await this.dependencies.coordinator.cancel({
        ...input,
        contextVersion: conversation.currentContextVersion,
      }))
    ) {
      throw new Error("RESPONSE_EXECUTION_CANCEL_NOT_ALLOWED");
    }
    return this.status(input);
  }
}
