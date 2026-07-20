import { createHash } from "node:crypto";
import {
  buildOfficialBusinessContext,
  isValidIanaTimezone,
  validateBusinessHoursSchedule,
} from "../assistants/official-business-context";
import type { AssistantSecurityRulesService } from "../assistant-security-rules/assistant-security-rules.service";
import {
  CANONICAL_INBOUND_MESSAGE_SCHEMA_VERSION,
  canonicalizeInboundMessageForComparison,
} from "../inbound/canonical-inbound-message";
import {
  resolveResponseExecutionIntent,
  type ResponseExecutionSemanticDecision,
} from "./response-execution-intent";
import { buildResponseExecutionConversationContext } from "./response-execution-conversation-context";
import { evaluateV2PrimarySecurityRules } from "../assistant-conversations/v2-primary-security-gate";
import { evaluateFlowApplicability } from "../assistant-conversations/flow-applicability-evaluator";
import type { PrismaService } from "../database/prisma.service";
import {
  evaluateResponseExecutionScope,
  resolveRuntimeV2ResponseExecutionAssistantIds,
  resolveRuntimeV2ResponseExecutionConversationIds,
  resolveRuntimeV2ResponseExecutionMode,
} from "./runtime-v2-feature-flag";
import type { ConversationStateStore } from "./conversation-state-store";
import { ConversationStateResponseExecutionStore } from "./conversation-state-response-execution-store";
import { RuntimeV2ResponseExecutionCoordinator } from "./response-execution-coordinator";
import {
  canArmNewResponseExecution,
  isResponseExecutionActive,
  type ResponseExecutionRecord,
} from "./response-execution-coordinator";
import { responseExecutionSnapshotFromState } from "./conversation-state-response-execution-store";
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
  resolvedCategory: "businessHours" | null;
  resolvedIntent: "ask_business_hours" | null;
  semanticDecisionVersion: string;
  semanticDecisionFingerprint: string;
  semanticApplicable: boolean;
  contextResolutionVersion: string;
  contextFingerprint: string;
  antecedentFingerprint: string | null;
  antecedentCategory: "businessHours" | null;
  antecedentIntent: "ask_business_hours" | null;
  contextualResolution: boolean;
  contextVersion: number | null;
  securityRulesStatus: "ALLOWED" | "NO_ACTIVE_RULES" | "BLOCKED";
  securityRulesFingerprint: string | null;
  officialContextStatus: "AVAILABLE" | "BLOCKED";
  officialContextFingerprint: string | null;
  flowConfigurationStatus: "FLOW_NOT_CONFIGURED" | "ACTIVE_FLOWS_PRESENT";
  activeFlowCount: number;
  flowEvaluationStatus:
    "NO_MATCH" | "MATCHED_STANDARD_COMPATIBLE" | "MATCHED_BLOCKS_V2" | "INDETERMINATE";
  matchedFlowCount: number;
  selectedFlowFingerprint: string | null;
  selectedFlowVersionFingerprint: string | null;
  flowMatchType: "KEYWORD_SCORED" | "EXPLICIT_RUNTIME_SCOPE" | null;
  declarativeContextFingerprint: string | null;
  v2FlowCompatibility: "ALLOWED" | "ALLOWED_WITH_FLOW_CONTEXT" | "BLOCKED";
  flowConfigurationFingerprint: string;
  flowBlockerCode:
    | "FLOW_APPLICABLE_BLOCKS_V2"
    | "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED"
    | "FLOW_MATCH_AMBIGUOUS"
    | "FLOW_EVALUATION_INDETERMINATE"
    | "FLOW_EXPLICIT_SCOPE_INVALID"
    | null;
  flowRuntimeScope: "V1_ONLY" | "V2_CONTROLLED" | null;
  explicitRuntimeCategory: "businessHours" | null;
  explicitRuntimeIntent: "ask_business_hours" | null;
  explicitRuntimeAuthority: "OFFICIAL_CONTEXT" | null;
  runtimeDirectOnly: boolean | null;
  flowScopeCompatibility: "EXPLICIT_V2_MATCH" | "LEGACY_V1_ONLY" | "NOT_APPLICABLE";
  legacyFlowIgnoredForExplicitV2Match: boolean;
  executionConfiguration: {
    mode: "OFF" | "CONTROLLED";
    conversationScope: string;
    assistantAllowlisted: boolean;
    conversationExplicitlyAllowlisted: boolean;
    assistantWideEligible: boolean;
    assistantOwnershipCompatible: boolean;
    companyCompatible: boolean;
    inboxCompatible: boolean;
    scopeEligibility: boolean;
    rejectionCode: string | null;
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
  executionFingerprint: string | null;
  status: RuntimeV2ResponseExecutionApproval["status"] | null;
  canonicalVersion: string | null;
  canonicalHashFingerprint: string | null;
  semanticDecisionVersion: string | null;
  semanticDecisionFingerprint: string | null;
  expectedIntent: "ask_business_hours" | null;
  contextResolutionVersion: string | null;
  contextFingerprint: string | null;
  antecedentFingerprint: string | null;
  antecedentCategory: "businessHours" | null;
  antecedentIntent: "ask_business_hours" | null;
  contextualResolution: boolean | null;
  allowedCategory: "businessHours" | null;
  allowedAuthority: "OFFICIAL_CONTEXT" | null;
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
  executionIdFingerprint: string | null;
  attemptNumber: number | null;
  historyCount: number;
  isCurrentAttempt: boolean | null;
  currentAttemptNumber: number | null;
  hasActiveExecution: boolean;
  activeExecution: boolean;
  canArmNew: boolean;
  canArmNewResponseExecution: boolean;
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
    | "chatwootInboxConfig"
  > &
    Partial<Pick<PrismaService, "assistantConversationMessage">>;
  securityRules: Pick<AssistantSecurityRulesService, "findActiveForRuntime">;
  stateStore: ConversationStateStore;
  responseExecutionStore: ConversationStateResponseExecutionStore;
  coordinator: RuntimeV2ResponseExecutionCoordinator;
  environment?: NodeJS.ProcessEnv;
  now?: () => Date;
};

type RuntimeV2ResponseExecutionPreflightEvaluation = {
  result: RuntimeV2ResponseExecutionPreflightResult;
  canonicalComparisonHash: string | null;
  canonicalMessage: string;
  semanticDecision: ResponseExecutionSemanticDecision;
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
  historyCount = 0,
  currentRecord: ResponseExecutionRecord | null = record as ResponseExecutionRecord | null,
): RuntimeV2ResponseExecutionStatusResult {
  if (!record) {
    return {
      found: false,
      approvalFingerprint: null,
      executionFingerprint: null,
      status: null,
      canonicalVersion: null,
      canonicalHashFingerprint: null,
      semanticDecisionVersion: null,
      semanticDecisionFingerprint: null,
      expectedIntent: null,
      contextResolutionVersion: null,
      contextFingerprint: null,
      antecedentFingerprint: null,
      antecedentCategory: null,
      antecedentIntent: null,
      contextualResolution: null,
      allowedCategory: null,
      allowedAuthority: null,
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
      executionIdFingerprint: null,
      attemptNumber: null,
      historyCount,
      isCurrentAttempt: null,
      currentAttemptNumber: null,
      hasActiveExecution: false,
      activeExecution: false,
      canArmNew: true,
      canArmNewResponseExecution: true,
      redactionApplied: true,
    };
  }
  const approval = record.approval;
  const status =
    approval.status === "ARMED" && Date.parse(approval.expiresAt) <= now.getTime()
      ? "EXPIRED"
      : approval.status;
  const hasActiveExecution = currentRecord ? isResponseExecutionActive(currentRecord, now) : false;
  const canArmNew = canArmNewResponseExecution(currentRecord, now);
  const executionFingerprint = fingerprint((record as ResponseExecutionRecord).executionId);
  return {
    found: true,
    approvalFingerprint: approval.creationFingerprint.slice(0, 16),
    executionFingerprint,
    status,
    canonicalVersion: approval.canonicalVersion,
    canonicalHashFingerprint: fingerprint(approval.expectedCanonicalComparisonHash),
    semanticDecisionVersion: approval.semanticDecisionVersion ?? null,
    semanticDecisionFingerprint: fingerprint(approval.expectedSemanticDecisionFingerprint),
    expectedIntent: approval.expectedIntent ?? null,
    contextResolutionVersion: approval.contextResolutionVersion ?? null,
    contextFingerprint: fingerprint(approval.expectedContextFingerprint),
    antecedentFingerprint: fingerprint(approval.expectedAntecedentFingerprint),
    antecedentCategory: approval.expectedAntecedentCategory ?? null,
    antecedentIntent: approval.expectedAntecedentIntent ?? null,
    contextualResolution: approval.contextualResolution ?? null,
    allowedCategory: approval.allowedCategory,
    allowedAuthority: approval.allowedAuthority,
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
    executionIdFingerprint: executionFingerprint,
    attemptNumber: (record as ResponseExecutionRecord).attemptNumber ?? null,
    historyCount,
    isCurrentAttempt:
      currentRecord === null
        ? null
        : currentRecord.executionId === (record as ResponseExecutionRecord).executionId,
    currentAttemptNumber: currentRecord?.attemptNumber ?? null,
    hasActiveExecution,
    activeExecution: hasActiveExecution,
    canArmNew,
    canArmNewResponseExecution: canArmNew,
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
    return (await this.evaluatePreflight(input)).result;
  }

  private async evaluatePreflight(
    input: RuntimeV2ResponseExecutionPreflightInput,
  ): Promise<RuntimeV2ResponseExecutionPreflightEvaluation> {
    const blockers: string[] = [];
    const canonical = canonicalizeInboundMessageForComparison(input.message);
    const canonicalHash = canonical.canonicalComparisonHash;
    const canonicalMessage = canonical.canonicalComparisonContent;
    if (!canonicalHash) blockers.push("CANONICAL_MESSAGE_EMPTY");
    if (input.canonicalVersion !== CANONICAL_INBOUND_MESSAGE_SCHEMA_VERSION) {
      blockers.push("CANONICAL_VERSION_UNSUPPORTED");
    }
    if (input.allowedCategory !== "businessHours") blockers.push("CATEGORY_NOT_ALLOWED");
    if (input.allowedAuthority !== "OFFICIAL_CONTEXT") blockers.push("AUTHORITY_NOT_ALLOWED");
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
    const recentHistoryRepository = this.dependencies.prisma.assistantConversationMessage;
    const recentHistory =
      conversation && recentHistoryRepository
        ? await recentHistoryRepository.findMany({
            where: {
              companyId: input.companyId,
              assistantId: input.assistantId,
              conversationId: input.conversationId,
              contextVersion: contextVersion ?? 1,
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 6,
            select: { id: true, role: true, content: true, createdAt: true, contextVersion: true },
          })
        : [];
    const conversationContext = buildResponseExecutionConversationContext({
      contextVersion: contextVersion ?? 1,
      messages: recentHistory,
    });
    const semanticDecision = resolveResponseExecutionIntent({
      canonicalMessage,
      messageId: "preflight",
      contextVersion: contextVersion ?? 1,
      now: this.now(),
      conversationContext,
    });
    if (!semanticDecision.applicable) blockers.push("TURN_NOT_STRICT_BUSINESS_HOURS");
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

    const [activeFlows, enabledToolCount] = assistant
      ? await Promise.all([
          this.dependencies.prisma.assistantFlow.findMany({
            where: { assistantId: assistant.id, active: true },
          }),
          this.dependencies.prisma.assistantToolConfig.count({
            where: { assistantId: assistant.id, enabled: true },
          }),
        ])
      : [[], 0];
    const flowEvaluation = evaluateFlowApplicability({
      message: canonicalMessage,
      flows: activeFlows,
      semanticDecision,
    });
    if (flowEvaluation.blockerCode) blockers.push(flowEvaluation.blockerCode);
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
      if (record && !canArmNewResponseExecution(record, this.now())) {
        blockers.push("RESPONSE_EXECUTION_PENDING");
      }
    }

    const executionMode = resolveRuntimeV2ResponseExecutionMode(this.environment);
    const inboxConfigCount = assistant
      ? await this.dependencies.prisma.chatwootInboxConfig.count({
          where: { assistantId: assistant.id },
        })
      : 0;
    const inboxCompatible = inboxConfigCount > 0;

    const evaluationScopeResult = evaluateResponseExecutionScope({
      environment: this.environment,
      companyId: input.companyId,
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      conversationExists: Boolean(conversation),
      companyExists: Boolean(company),
      inboxExists: inboxCompatible,
    });

    return {
      canonicalComparisonHash: canonicalHash,
      canonicalMessage,
      semanticDecision,
      result: {
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
        resolvedCategory: semanticDecision.category,
        resolvedIntent: semanticDecision.intent,
        semanticDecisionVersion: semanticDecision.version,
        semanticDecisionFingerprint: fingerprint(semanticDecision.fingerprint)!,
        semanticApplicable: semanticDecision.applicable,
        contextResolutionVersion: semanticDecision.contextResolutionVersion,
        contextFingerprint: fingerprint(semanticDecision.contextFingerprint)!,
        antecedentFingerprint: fingerprint(semanticDecision.antecedentFingerprint),
        antecedentCategory: semanticDecision.antecedentCategory,
        antecedentIntent: semanticDecision.antecedentIntent,
        contextualResolution: semanticDecision.contextualResolution,
        contextVersion,
        securityRulesStatus: security.allowed
          ? security.activeRuleCount > 0
            ? "ALLOWED"
            : "NO_ACTIVE_RULES"
          : "BLOCKED",
        securityRulesFingerprint: security.rulesFingerprint,
        officialContextStatus,
        officialContextFingerprint,
        flowConfigurationStatus: flowEvaluation.flowConfigurationStatus,
        activeFlowCount: flowEvaluation.activeFlowCount,
        flowEvaluationStatus: flowEvaluation.flowEvaluationStatus,
        matchedFlowCount: flowEvaluation.matchedFlowCount,
        selectedFlowFingerprint: flowEvaluation.selectedFlowFingerprint,
        selectedFlowVersionFingerprint: flowEvaluation.selectedFlowVersionFingerprint,
        flowMatchType: flowEvaluation.flowMatchType,
        declarativeContextFingerprint: flowEvaluation.declarativeContextFingerprint,
        v2FlowCompatibility: flowEvaluation.v2Compatibility,
        flowConfigurationFingerprint: flowEvaluation.flowConfigurationFingerprint,
        flowBlockerCode: flowEvaluation.blockerCode,
        flowRuntimeScope: flowEvaluation.flowRuntimeScope,
        explicitRuntimeCategory: flowEvaluation.explicitRuntimeCategory,
        explicitRuntimeIntent: flowEvaluation.explicitRuntimeIntent,
        explicitRuntimeAuthority: flowEvaluation.explicitRuntimeAuthority,
        runtimeDirectOnly: flowEvaluation.runtimeDirectOnly,
        flowScopeCompatibility: flowEvaluation.flowScopeCompatibility,
        legacyFlowIgnoredForExplicitV2Match: flowEvaluation.legacyFlowIgnoredForExplicitV2Match,
        executionConfiguration: {
          mode: executionMode,
          conversationScope: evaluationScopeResult.conversationScope,
          assistantAllowlisted: evaluationScopeResult.assistantAllowlisted,
          conversationExplicitlyAllowlisted:
            evaluationScopeResult.conversationExplicitlyAllowlisted,
          assistantWideEligible: evaluationScopeResult.assistantWideEligible,
          assistantOwnershipCompatible: evaluationScopeResult.assistantOwnershipCompatible,
          companyCompatible: evaluationScopeResult.companyCompatible,
          inboxCompatible: evaluationScopeResult.inboxCompatible,
          scopeEligibility: evaluationScopeResult.allowed,
          rejectionCode: evaluationScopeResult.rejectionCode,
        },
        blockers: sortUnique(blockers),
        redactionApplied: true,
      },
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
    const preflightEvaluation = await this.evaluatePreflight(input);
    const preflight = preflightEvaluation.result;
    if (preflight.preflightStatus !== "APPROVED" || !preflight.contextVersion) {
      throw new Error("RESPONSE_EXECUTION_PREFLIGHT_BLOCKED");
    }
    const canonicalHash = preflightEvaluation.canonicalComparisonHash;
    if (!canonicalHash) throw new Error("RESPONSE_EXECUTION_CANONICAL_HASH_REQUIRED");
    const approval = createRuntimeV2ResponseExecutionApproval({
      companyId: input.companyId,
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      expectedCanonicalComparisonHash: canonicalHash,
      canonicalVersion: input.canonicalVersion,
      semanticDecisionVersion: preflightEvaluation.semanticDecision.version,
      expectedSemanticDecisionFingerprint: preflightEvaluation.semanticDecision.fingerprint,
      expectedIntent: preflightEvaluation.semanticDecision.intent ?? undefined,
      contextResolutionVersion: preflightEvaluation.semanticDecision.contextResolutionVersion,
      expectedContextFingerprint: preflightEvaluation.semanticDecision.contextFingerprint,
      expectedAntecedentFingerprint: preflightEvaluation.semanticDecision.antecedentFingerprint,
      expectedAntecedentCategory: preflightEvaluation.semanticDecision.antecedentCategory,
      expectedAntecedentIntent: preflightEvaluation.semanticDecision.antecedentIntent,
      contextualResolution: preflightEvaluation.semanticDecision.contextualResolution,
      expiresAt: new Date(this.now().getTime() + input.durationMinutes * 60_000),
      operatorPurpose: sanitizeOperatorPurpose(input.operatorPurpose),
      securityRulesFingerprint: preflight.securityRulesFingerprint,
      securityRulesStatus:
        preflight.securityRulesStatus === "NO_ACTIVE_RULES" ? "NO_ACTIVE_RULES" : "ALLOWED",
      officialContextFingerprint: preflight.officialContextFingerprint,
      officialContextStatus: "AVAILABLE",
      flowConfigurationFingerprint: preflight.flowConfigurationFingerprint,
      expectedFlowFingerprint: preflight.selectedFlowFingerprint,
      expectedFlowVersionFingerprint: preflight.selectedFlowVersionFingerprint,
      expectedFlowMatchType: preflight.flowMatchType,
      flowCompatibility:
        preflight.v2FlowCompatibility === "ALLOWED_WITH_FLOW_CONTEXT"
          ? "STANDARD_COMPATIBLE"
          : null,
      declarativeContextFingerprint: preflight.declarativeContextFingerprint,
      now: this.now(),
    });
    if (approval.expectedCanonicalComparisonHash !== canonicalHash) {
      throw new Error("ARM_CANONICAL_HASH_MISMATCH");
    }
    const armed = await this.dependencies.responseExecutionStore.arm({
      approval,
      contextVersion: preflight.contextVersion,
    });
    const persistedSnapshot = await this.dependencies.responseExecutionStore.loadSnapshot({
      companyId: input.companyId,
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      contextVersion: preflight.contextVersion,
    });
    const persisted = persistedSnapshot?.current ?? null;
    if (
      !persistedSnapshot ||
      persistedSnapshot.invalid ||
      !persisted ||
      persisted.approval.approvalId !== armed.approval.approvalId ||
      persisted.approval.expectedCanonicalComparisonHash !== canonicalHash
    ) {
      const cancelled = await this.dependencies.coordinator.cancel({
        companyId: input.companyId,
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        contextVersion: preflight.contextVersion,
        approvalFingerprint: armed.approval.creationFingerprint.slice(0, 16),
      });
      const afterCancellation = await this.dependencies.responseExecutionStore.load({
        companyId: input.companyId,
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        contextVersion: preflight.contextVersion,
      });
      if (!cancelled || afterCancellation?.approval.status === "ARMED") {
        throw new Error("ARM_CANONICAL_HASH_MISMATCH");
      }
      throw new Error("ARM_CANONICAL_HASH_MISMATCH");
    }
    return statusFromRecord(
      persisted,
      this.now(),
      persistedSnapshot.history.length,
      persistedSnapshot.current,
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
        const snapshot = responseExecutionSnapshotFromState(row.stateJson as never);
        if (snapshot.invalid) continue;
        const records = [snapshot.current, ...snapshot.history].filter(
          (record): record is ResponseExecutionRecord => record !== null,
        );
        const record = records.find(
          (candidate) =>
            candidate.approval.creationFingerprint.slice(0, 16) === input.approvalFingerprint,
        );
        if (record) {
          return statusFromRecord(record, this.now(), snapshot.history.length, snapshot.current);
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
    const snapshot = await this.dependencies.responseExecutionStore.loadSnapshot({
      ...input,
      contextVersion: conversation.currentContextVersion,
    });
    if (!snapshot || snapshot.invalid) return statusFromRecord(null, this.now());
    const records = [snapshot.current, ...snapshot.history].filter(
      (record): record is ResponseExecutionRecord => record !== null,
    );
    const record = input.approvalFingerprint
      ? (records.find(
          (candidate) =>
            candidate.approval.creationFingerprint.slice(0, 16) === input.approvalFingerprint,
        ) ?? null)
      : snapshot.current;
    if (!record) {
      return statusFromRecord(null, this.now(), snapshot.history.length);
    }
    return statusFromRecord(record, this.now(), snapshot.history.length, snapshot.current);
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
