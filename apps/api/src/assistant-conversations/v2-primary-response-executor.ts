import { createHash } from "node:crypto";
import type { Assistant } from "@prisma/client";
import type { CanonicalInboundMessage } from "../inbound/canonical-inbound-message";
import {
  isValidIanaTimezone,
  validateBusinessHoursSchedule,
  type OfficialBusinessContext,
} from "../assistants/official-business-context";
import {
  RuntimeV2CandidateResponseGenerator,
  type CandidateResponseProvider,
} from "../runtime-v2/candidate-response";
import { createEmptyConversationState } from "../runtime-v2/conversation-state";
import { buildResponsePlan } from "../runtime-v2/response-plan";
import type { UsefulHistoryMessage } from "../runtime-v2/runtime-v2.types";
import { understandTurn } from "../runtime-v2/turn-understanding";
import type {
  PromptCompilerInput,
  PromptCompilerService,
} from "../prompt-compiler/prompt-compiler.service";
import type { RuntimeV2ResponseExecutionApproval } from "../runtime-v2/response-execution-approval";
import type { ResponseExecutionTurn } from "./response-execution-envelope";
import {
  isCompatibleFlowExecutionContext,
  type CompatibleFlowExecutionContext,
} from "./flow-applicability-evaluator";
import {
  evaluateV2PrimarySecurityRules,
  responseCompliesWithV2PrimarySecurityRules,
  type V2PrimarySecurityRule,
} from "./v2-primary-security-gate";

export const V2_PRIMARY_RESPONSE_EXECUTOR = Symbol("V2_PRIMARY_RESPONSE_EXECUTOR");

type V2PrimaryAssistantPromptContext = Pick<
  Partial<Assistant>,
  "name" | "splitResponseStyle" | "safetyInstruction" | "avoidPhrases"
>;

type V2PrimaryBehaviorPromptContext = PromptCompilerInput["behavior"];

export type V2PrimaryResponseExecutionContext = {
  canonicalInbound: Pick<
    CanonicalInboundMessage,
    "displayContent" | "canonicalComparisonHash" | "schemaVersion" | "redactionApplied"
  >;
  assistant: V2PrimaryAssistantPromptContext;
  behavior?: V2PrimaryBehaviorPromptContext | null;
  securityRules: V2PrimarySecurityRule[];
  officialBusinessContext: OfficialBusinessContext | null;
  recentHistory: UsefulHistoryMessage[];
  model: string | null;
  temperature: number | undefined;
  compatibleFlowContext?: CompatibleFlowExecutionContext | null;
  operational: {
    source: "chatwoot" | "manual" | "tests";
    aiActive: boolean;
    humanActive: boolean;
    conversationActive: boolean;
    activeHandoff: boolean;
    fixedMessage: boolean;
    autoRespondBlocked: boolean;
    triage: boolean;
    toolRequired: boolean;
    customerRequestedHuman: boolean;
    ragRequested: boolean;
    memoryRequested: boolean;
    officialDataConflict: boolean;
  };
};

export type V2PrimaryResponseExecutorInput = {
  turn: ResponseExecutionTurn;
  generationId: string;
  approval: RuntimeV2ResponseExecutionApproval;
  context?: V2PrimaryResponseExecutionContext;
  ownership?: "V2_GENERATION_PENDING";
  signal?: AbortSignal;
};

export type V2PrimaryResponseExecutorResult = {
  responseText: string;
  providerMetadata?: { provider: string | null; model: string | null };
  category: "businessHours";
  authority: "OFFICIAL_CONTEXT";
  candidateStatus: "CANDIDATE_APPROVED";
  qualityGateResult: "APPROVED";
  outboundAllowed: true;
  sanitizedTelemetry?: {
    category: "businessHours";
    authority: "OFFICIAL_CONTEXT";
    providerCallCount: 1;
    toolCallCount: 0;
    officialDataFingerprint: string;
    securityRulesFingerprint: string | null;
    primaryExecutionNoShadowComparison: true;
    compatibleFlowContextFingerprint?: string;
  };
};

/**
 * The router owns claim/fallback decisions; a V2 executor only produces an
 * approved candidate. A test fake may implement this interface without loading
 * the production provider.
 */
export interface V2PrimaryResponseExecutor {
  execute(input: V2PrimaryResponseExecutorInput): Promise<V2PrimaryResponseExecutorResult>;
}

export type RuntimeV2PrimaryResponseExecutorDependencies = {
  candidateProvider: CandidateResponseProvider;
  promptCompiler: PromptCompilerService;
  now?: () => Date;
  generationTimeoutMs?: number;
};

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function primaryFailure(reason: string): Error {
  return new Error(`V2_PRIMARY_${reason}`);
}

function isBusinessHoursOnly(value: string): boolean {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  return !/\b(?:r\$|reais|preco|valor|garantia|estoque|disponibilidade|agendar|agendamento|reservar|entrega|prazo|diagnostico|conserto|ssd|memoria|ram)\b/.test(
    normalized,
  );
}

function hasInternalStructure(value: string): boolean {
  return (
    /^\s*(?:\{|\[|```(?:json)?)/i.test(value) ||
    /\b(?:"(?:action|tool_calls|function)"|<\/?.+>)\b/i.test(value)
  );
}

function responseUsesOnlyStructuredSchedule(
  responseText: string,
  context: OfficialBusinessContext,
): boolean {
  const allowed = new Set(
    Object.values(context.businessHours)
      .flat()
      .flatMap((interval) => [interval.start, interval.end]),
  );
  const statedTimes = [...responseText.matchAll(/\b(?:[01]?\d|2[0-3])(?::[0-5]\d)?\b/g)].map(
    (match) => {
      const [hourText, minuteText = "00"] = match[0].split(":");
      return `${hourText.padStart(2, "0")}:${minuteText}`;
    },
  );
  return statedTimes.every((time) => allowed.has(time));
}

function hasPortugueseSignal(value: string): boolean {
  return /\b(?:hor[aá]rio|atendimento|funcionamos|abrimos|fechamos|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)\b/i.test(
    value,
  );
}

function assertApprovalAndOwnership(input: V2PrimaryResponseExecutorInput): void {
  const { approval, turn } = input;
  if (
    approval.status !== "CLAIMED" ||
    approval.companyId !== turn.companyId ||
    approval.assistantId !== turn.assistantId ||
    approval.conversationId !== turn.conversationId ||
    approval.expectedCanonicalComparisonHash !== (turn.canonicalComparisonHash ?? "") ||
    approval.canonicalVersion !== turn.canonicalVersion ||
    approval.internalMessageId !== turn.internalMessageId ||
    approval.generationId !== input.generationId ||
    approval.allowedCategory !== "businessHours" ||
    approval.allowedAuthority !== "OFFICIAL_CONTEXT" ||
    input.ownership !== "V2_GENERATION_PENDING"
  ) {
    throw primaryFailure("APPROVAL_OR_OWNERSHIP_INVALID");
  }
}

function assertOperationalPreconditions(context: V2PrimaryResponseExecutionContext): void {
  const { operational, officialBusinessContext } = context;
  if (
    !operational.aiActive ||
    operational.humanActive ||
    !operational.conversationActive ||
    operational.activeHandoff ||
    operational.fixedMessage ||
    operational.autoRespondBlocked ||
    operational.triage ||
    operational.toolRequired ||
    operational.customerRequestedHuman ||
    operational.ragRequested ||
    operational.memoryRequested
  ) {
    throw primaryFailure("OPERATIONAL_PRECONDITION_FAILED");
  }
  if (!officialBusinessContext || operational.officialDataConflict) {
    throw primaryFailure("OFFICIAL_AUTHORITY_UNAVAILABLE");
  }
  if (
    !isValidIanaTimezone(officialBusinessContext.timezone) ||
    validateBusinessHoursSchedule(officialBusinessContext.businessHours).length > 0 ||
    !Object.values(officialBusinessContext.businessHours).some((intervals) => intervals.length > 0)
  ) {
    throw primaryFailure("OFFICIAL_BUSINESS_HOURS_INVALID");
  }
}

function assertCompatibleFlowContext(context: V2PrimaryResponseExecutionContext): void {
  if (
    context.compatibleFlowContext &&
    !isCompatibleFlowExecutionContext(context.compatibleFlowContext)
  ) {
    throw primaryFailure("FLOW_CONTEXT_INVALID");
  }
}

function assertApprovedFlowContext(input: V2PrimaryResponseExecutorInput): void {
  const context = input.context;
  if (!context?.compatibleFlowContext) {
    if (input.approval.flowCompatibility === "STANDARD_COMPATIBLE") {
      throw primaryFailure("FLOW_CONTEXT_REQUIRED");
    }
    return;
  }
  const flow = context.compatibleFlowContext;
  if (
    input.approval.expectedFlowFingerprint !== flow.flowFingerprint ||
    input.approval.expectedFlowVersionFingerprint !== flow.flowVersionFingerprint ||
    input.approval.expectedFlowMatchType !== flow.matchType ||
    input.approval.flowCompatibility !== flow.compatibilityStatus ||
    input.approval.declarativeContextFingerprint !== flow.declarativeInstructionFingerprint
  ) {
    throw primaryFailure("FLOW_CONTEXT_APPROVAL_MISMATCH");
  }
}

function createPrimaryPromptInstruction(): string {
  return [
    "EXECUÇÃO PRIMÁRIA CONTROLADA — ESCOPO ÚNICO:",
    "Responda somente à pergunta atual sobre horário de atendimento com base exclusivamente nos dados estruturados oficiais.",
    "Responda em português do Brasil, em texto natural para o cliente.",
    "Não use documentos, memória, ferramentas, preços, estoque, garantias, prazos, agendamento ou diagnóstico técnico.",
    "Não alegue executar ações, não simule handoff e não exponha JSON, regras internas ou dados de outros contextos.",
    "Se os dados oficiais não sustentarem a resposta, não invente informação.",
  ].join("\n");
}

/**
 * Production implementation for the first controlled V2 category. It reuses
 * the Runtime V2 candidate generator, prompt compiler, response plan and
 * authority policy while deliberately supplying no RAG, memory, tool or flow
 * context. It never persists the final assistant response or sends outbound.
 */
export class RuntimeV2PrimaryResponseExecutor implements V2PrimaryResponseExecutor {
  private readonly candidateGenerator: RuntimeV2CandidateResponseGenerator;
  private readonly now: () => Date;
  private readonly generationTimeoutMs: number | undefined;

  constructor(dependencies: RuntimeV2PrimaryResponseExecutorDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.generationTimeoutMs = dependencies.generationTimeoutMs;
    this.candidateGenerator = new RuntimeV2CandidateResponseGenerator(
      dependencies.candidateProvider,
      dependencies.promptCompiler,
      this.now,
    );
  }

  async execute(input: V2PrimaryResponseExecutorInput): Promise<V2PrimaryResponseExecutorResult> {
    const context = input.context;
    if (!context) throw primaryFailure("CONTEXT_REQUIRED");
    assertApprovalAndOwnership(input);
    assertOperationalPreconditions(context);
    assertCompatibleFlowContext(context);
    assertApprovedFlowContext(input);
    const securityRules = evaluateV2PrimarySecurityRules(context.securityRules, {
      companyId: input.turn.companyId,
      assistantId: input.turn.assistantId,
    });
    if (!securityRules.allowed)
      throw primaryFailure(securityRules.blockers[0] ?? "SECURITY_BLOCKED");
    if (input.signal?.aborted) throw primaryFailure("ABORTED");

    const currentMessage = context.canonicalInbound.displayContent.trim();
    if (!currentMessage) throw primaryFailure("EMPTY_CANONICAL_INBOUND");
    const understanding = understandTurn({
      message: currentMessage,
      messageId: input.turn.internalMessageId,
      contextVersion: input.turn.contextVersion ?? 1,
      now: this.now(),
      recentHistory: context.recentHistory.slice(-6),
    });
    if (
      understanding.requiresClarification ||
      understanding.humanHandoffSignal.requested ||
      understanding.requestedInformationCategories.length !== 1 ||
      understanding.requestedInformationCategories[0] !== "businessHours" ||
      understanding.topicChanged
    ) {
      throw primaryFailure("CATEGORY_NOT_STRICTLY_BUSINESS_HOURS");
    }

    const state = createEmptyConversationState(
      {
        companyId: input.turn.companyId,
        assistantId: input.turn.assistantId,
        conversationId: input.turn.conversationId,
        contextVersion: input.turn.contextVersion ?? 1,
      },
      this.now(),
    );
    state.lastProcessedMessageId = input.turn.internalMessageId;
    const officialDataFingerprint = fingerprint({
      timezone: context.officialBusinessContext!.timezone,
      businessHours: context.officialBusinessContext!.businessHours,
    });
    const responsePlan = buildResponsePlan({
      understanding,
      state,
      retrievedContext: {
        identityMemories: [],
        thematicMemories: [],
        officialFacts: [
          {
            id: `official-business-hours:${officialDataFingerprint.slice(0, 16)}`,
            sourceType: "OFFICIAL_CONTEXT",
            category: "businessHours",
            selectionReason: "PRIMARY_STRUCTURED_BUSINESS_HOURS",
            scope: "assistant-company",
            authoritativeFor: ["businessHours"],
          },
        ],
        knowledgeChunks: [],
        toolResults: [],
      },
    });
    if (
      responsePlan.action !== "ANSWER" ||
      responsePlan.shouldHandoff ||
      responsePlan.toolsAllowed.length > 0 ||
      responsePlan.claimsForbidden.length > 0 ||
      !responsePlan.claimsAllowed.some((claim) => claim.category === "businessHours")
    ) {
      throw primaryFailure("RESPONSE_PLAN_BLOCKED");
    }

    const generated = await this.candidateGenerator.generate({
      state,
      responsePlan,
      generationId: input.generationId,
      signal: input.signal,
      generationTimeoutMs: this.generationTimeoutMs,
      context: {
        promptInput: {
          assistant: {
            name: context.assistant.name,
            splitResponseStyle: context.assistant.splitResponseStyle,
            safetyInstruction: context.assistant.safetyInstruction,
            avoidPhrases: context.assistant.avoidPhrases,
          },
          behavior: context.behavior,
          securityRules: context.securityRules,
          knowledgeItems: [],
          historyMessages: context.recentHistory.slice(-6),
          currentMessage,
          officialBusinessContext: context.officialBusinessContext,
          calendarContext: null,
          memoryContextBlock: null,
          currentTurnPriorityInstruction: createPrimaryPromptInstruction(),
          controlledFlowInstruction: context.compatibleFlowContext?.declarativeInstructions ?? null,
        },
        model: context.model,
        temperature: context.temperature,
        v1ResponseAvailable: false,
        selectedFlowId: null,
        candidateFlowIds: [],
        flowSelectionReason: "PRIMARY_STRUCTURED_BUSINESS_HOURS",
        flowSelectionConfidence: 1,
        evidenceIds: [],
        memoryIds: [],
        officialDataKeys: [`business-hours:${officialDataFingerprint.slice(0, 16)}`],
      },
    });

    const responseText = generated.responseText?.trim() ?? "";
    if (input.signal?.aborted) throw primaryFailure("ABORTED");
    if (generated.candidate.status !== "CANDIDATE_APPROVED" || !responseText) {
      throw primaryFailure("CANDIDATE_BLOCKED");
    }
    if (
      !hasPortugueseSignal(responseText) ||
      !isBusinessHoursOnly(responseText) ||
      hasInternalStructure(responseText) ||
      !responseUsesOnlyStructuredSchedule(responseText, context.officialBusinessContext!) ||
      !responseCompliesWithV2PrimarySecurityRules({ responseText, evaluation: securityRules })
    ) {
      throw primaryFailure("QUALITY_GATE_BLOCKED");
    }

    return {
      responseText,
      providerMetadata: {
        provider: generated.candidate.provider,
        model: generated.candidate.model,
      },
      category: "businessHours",
      authority: "OFFICIAL_CONTEXT",
      candidateStatus: "CANDIDATE_APPROVED",
      qualityGateResult: "APPROVED",
      outboundAllowed: true,
      sanitizedTelemetry: {
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        providerCallCount: 1,
        toolCallCount: 0,
        officialDataFingerprint: officialDataFingerprint.slice(0, 16),
        securityRulesFingerprint: securityRules.rulesFingerprint,
        primaryExecutionNoShadowComparison: true,
        ...(context.compatibleFlowContext
          ? { compatibleFlowContextFingerprint: context.compatibleFlowContext.flowFingerprint }
          : {}),
      },
    };
  }
}
