import { createHash } from "node:crypto";
import {
  type HandoffEventType,
  type HandoffRequest,
  type HandoffStateEvent,
  type HandoffStateScope,
  type HandoffStatus,
  type RuntimeHandoffState,
  reduceRuntimeHandoffState,
  transitionHandoffStatus,
} from "./handoff-state";
import {
  resolveRuntimeV2HandoffExecutionAssistantIds,
  resolveRuntimeV2HandoffExecutionConversationIds,
  resolveRuntimeV2HandoffExecutionMode,
  resolveRuntimeV2HandoffStateMode,
  resolveRuntimeV2Mode,
  type RuntimeV2HandoffExecutionMode,
} from "./runtime-v2-feature-flag";

export const CHATWOOT_HANDOFF_EXECUTION_CONTRACT_VERSION = 1 as const;

export type ChatwootHandoffStep =
  | "VERIFY_CONVERSATION"
  | "VERIFY_AI_ACTIVE"
  | "PAUSE_AI"
  | "APPLY_LABEL"
  | "ASSIGN_TEAM"
  | "ASSIGN_AGENT"
  | "VERIFY_FINAL_STATE";

export type ChatwootHandoffExecutionStatus =
  | "PLANNED"
  | "EXECUTION_PENDING"
  | "EXECUTING"
  | "SUCCEEDED"
  | "FAILED"
  | "RECONCILIATION_REQUIRED"
  | "CANCELLED";

export type ChatwootHandoffResultStatus =
  | "SUCCEEDED"
  | "ALREADY_COMPLETED"
  | "FAILED_BEFORE_MUTATION"
  | "FAILED_AFTER_PARTIAL_MUTATION"
  | "TIMED_OUT_UNKNOWN_EFFECT"
  | "RECONCILIATION_REQUIRED"
  | "RECONCILED_SUCCEEDED"
  | "RECONCILED_PARTIAL"
  | "RECONCILED_FAILED"
  | "RECONCILIATION_INCONCLUSIVE"
  | "REJECTED"
  | "CANCELLED"
  | "HUMAN_ALREADY_ACTIVE";

export type ChatwootHandoffExecutionReconciliationStatus =
  | "NOT_REQUIRED"
  | "RECONCILIATION_REQUIRED"
  | "RECONCILED_SUCCEEDED"
  | "RECONCILED_PARTIAL"
  | "RECONCILED_FAILED"
  | "RECONCILIATION_INCONCLUSIVE";

export type ChatwootHandoffExecutionConfiguration = {
  configured: boolean;
  inboxMatches: boolean;
  labelConfigured: boolean;
  assignmentConfigured: boolean;
  targetConfigured: boolean;
  labelHash?: string | null;
};

export type ChatwootHandoffConversationState = {
  conversationExists?: boolean;
  accountScopeValid?: boolean;
  inboxScopeValid?: boolean;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId: string | null;
  contextVersion: number;
  inboxMatches: boolean;
  configReady: boolean;
  aiActive: boolean;
  humanActive: boolean;
  humanActivityDetected?: boolean;
  assigneePresent?: boolean;
  teamPresent?: boolean;
  conversationStatus?: string | null;
  fetchedAt?: string;
  stateHash?: string;
  labelApplied: boolean;
  teamAssigned: boolean;
  agentAssigned: boolean;
  finalStateVerified?: boolean;
};

export type ChatwootHandoffExecutionPlan = {
  contractVersion: typeof CHATWOOT_HANDOFF_EXECUTION_CONTRACT_VERSION;
  executionId: string;
  handoffId: string;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  internalMessageId: string;
  targetType: HandoffRequest["requestedTargetType"];
  targetIdHash: string | null;
  reasonCode: HandoffRequest["reasonCode"];
  steps: ChatwootHandoffStep[];
  idempotencyKey: string;
  expectedPreconditions: {
    companyId: string;
    assistantId: string;
    conversationId: string;
    contextVersion: number;
    handoffStatus: "HANDOFF_READY" | "HANDOFF_EXECUTION_PENDING" | "HANDOFF_EXECUTING";
    inboxRequired: true;
    humanMustBeInactive: true;
  };
  createdAt: string;
  expiresAt: string | null;
  status: ChatwootHandoffExecutionStatus;
  redactionApplied: true;
};

/**
 * A plan is safe to construct during validation and DRY_RUN. It deliberately
 * has no operational execution identity; that identity is added only by the
 * execution-plan factory used after EXECUTE has passed its gates.
 */
export type ChatwootHandoffPlan = Omit<ChatwootHandoffExecutionPlan, "executionId">;

export type ChatwootHandoffExecutionResult = {
  contractVersion: typeof CHATWOOT_HANDOFF_EXECUTION_CONTRACT_VERSION;
  executionId: string;
  handoffId: string;
  status: ChatwootHandoffResultStatus;
  attemptedSteps: ChatwootHandoffStep[];
  confirmedSteps: ChatwootHandoffStep[];
  aiActiveBefore: boolean | null;
  aiActiveAfter: boolean | null;
  labelApplied: boolean;
  assignmentChanged: boolean;
  finalStateVerified: boolean;
  partialMutation: boolean;
  externalEffectMayHaveOccurred: boolean;
  reconciliationStatus: ChatwootHandoffExecutionReconciliationStatus;
  errorCode: string | null;
  redactionApplied: true;
};

export type ChatwootHandoffAdapterContext = {
  plan: ChatwootHandoffExecutionPlan;
  handoff: HandoffRequest;
  conversationState?: ChatwootHandoffConversationState;
};

export interface ChatwootHandoffAdapter {
  getConversationState(
    context: ChatwootHandoffAdapterContext,
  ): Promise<ChatwootHandoffConversationState>;
  pauseAi(context: ChatwootHandoffAdapterContext): Promise<void>;
  applyLabel(context: ChatwootHandoffAdapterContext): Promise<void>;
  assignTeam(context: ChatwootHandoffAdapterContext): Promise<void>;
  assignAgent(context: ChatwootHandoffAdapterContext): Promise<void>;
  verifyFinalState(
    context: ChatwootHandoffAdapterContext,
  ): Promise<ChatwootHandoffConversationState>;
  reconcile(context: ChatwootHandoffAdapterContext): Promise<ChatwootHandoffConversationState>;
}

/**
 * Boundary for a future company-scoped Chatwoot integration. The Runtime V2
 * executor depends on this capability contract, never on credentials or an
 * HTTP client directly. The application must not construct an implementation
 * while handoff execution is OFF.
 */
export interface ChatwootOperationalHandoffClient {
  getConversationState(
    context: ChatwootHandoffAdapterContext,
  ): Promise<ChatwootHandoffConversationState>;
  pauseAi(context: ChatwootHandoffAdapterContext): Promise<void>;
  applyLabel(context: ChatwootHandoffAdapterContext): Promise<void>;
  assignTeam(context: ChatwootHandoffAdapterContext): Promise<void>;
  assignAgent(context: ChatwootHandoffAdapterContext): Promise<void>;
  verifyFinalState(
    context: ChatwootHandoffAdapterContext,
  ): Promise<ChatwootHandoffConversationState>;
  reconcile(context: ChatwootHandoffAdapterContext): Promise<ChatwootHandoffConversationState>;
}

export class ChatwootOperationalHandoffAdapter implements ChatwootHandoffAdapter {
  constructor(private readonly client: ChatwootOperationalHandoffClient) {}

  getConversationState(context: ChatwootHandoffAdapterContext) {
    return this.client.getConversationState(context);
  }

  pauseAi(context: ChatwootHandoffAdapterContext) {
    return this.client.pauseAi(context);
  }

  applyLabel(context: ChatwootHandoffAdapterContext) {
    return this.client.applyLabel(context);
  }

  assignTeam(context: ChatwootHandoffAdapterContext) {
    return this.client.assignTeam(context);
  }

  assignAgent(context: ChatwootHandoffAdapterContext) {
    return this.client.assignAgent(context);
  }

  verifyFinalState(context: ChatwootHandoffAdapterContext) {
    return this.client.verifyFinalState(context);
  }

  reconcile(context: ChatwootHandoffAdapterContext) {
    return this.client.reconcile(context);
  }
}

export type ChatwootHandoffAdapterErrorPhase = "BEFORE_MUTATION" | "AFTER_MUTATION";

export class ChatwootHandoffAdapterError extends Error {
  constructor(
    public readonly code: string,
    public readonly phase: ChatwootHandoffAdapterErrorPhase,
    public readonly externalEffectMayHaveOccurred = false,
  ) {
    super(code);
    this.name = "ChatwootHandoffAdapterError";
  }
}

const EXECUTION_REASONS = new Set<HandoffRequest["reasonCode"]>([
  "CUSTOMER_REQUESTED_HUMAN",
  "FLOW_REQUIRED_HANDOFF",
  "MANUAL_OPERATOR_REQUEST",
]);

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashParts(parts: unknown[]): string {
  return createHash("sha256").update(stableJson(parts)).digest("hex");
}

function isExpired(handoff: HandoffRequest, currentTime: Date): boolean {
  return Boolean(handoff.expiresAt && currentTime.getTime() >= Date.parse(handoff.expiresAt));
}

export function createChatwootHandoffExecutionId(input: {
  handoffId: string;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  idempotencyKey: string;
  attemptNumber: number;
}): string {
  return hashParts([
    input.handoffId,
    input.companyId,
    input.assistantId,
    input.conversationId,
    input.contextVersion,
    input.idempotencyKey,
    input.attemptNumber,
  ]);
}

export function validateChatwootHandoffExecutionPreconditions(input: {
  environment?: NodeJS.ProcessEnv;
  scope: HandoffStateScope;
  handoff: HandoffRequest;
  conversationState?: ChatwootHandoffConversationState | null;
  configuration?: ChatwootHandoffExecutionConfiguration;
  currentTime: Date;
}): { ok: true } | { ok: false; errorCode: string } {
  const environment = input.environment ?? process.env;
  if (
    resolveRuntimeV2Mode({}, environment) !== "SHADOW" ||
    resolveRuntimeV2HandoffStateMode(environment) !== "SHADOW_STATE" ||
    resolveRuntimeV2HandoffExecutionMode(environment) !== "CONTROLLED"
  ) {
    return { ok: false, errorCode: "HANDOFF_EXECUTION_DISABLED" };
  }
  if (
    !resolveRuntimeV2HandoffExecutionAssistantIds(environment).includes(input.scope.assistantId)
  ) {
    return { ok: false, errorCode: "HANDOFF_ASSISTANT_NOT_ALLOWLISTED" };
  }
  if (
    !resolveRuntimeV2HandoffExecutionConversationIds(environment).includes(
      input.scope.conversationId,
    )
  ) {
    return { ok: false, errorCode: "HANDOFF_CONVERSATION_NOT_ALLOWLISTED" };
  }
  if (
    input.handoff.status !== "HANDOFF_READY" &&
    input.handoff.status !== "HANDOFF_EXECUTION_PENDING" &&
    input.handoff.status !== "HANDOFF_EXECUTING"
  ) {
    return { ok: false, errorCode: "HANDOFF_NOT_READY" };
  }
  if (isExpired(input.handoff, input.currentTime)) {
    return { ok: false, errorCode: "HANDOFF_EXPIRED" };
  }
  if (!EXECUTION_REASONS.has(input.handoff.reasonCode)) {
    return { ok: false, errorCode: "HANDOFF_REASON_NOT_AUTHORIZED" };
  }
  if (
    (input.handoff.requestedTargetType === "TEAM" ||
      input.handoff.requestedTargetType === "AGENT" ||
      input.handoff.requestedTargetType === "SPECIALIZED_QUEUE") &&
    (!input.handoff.requestedTargetIdHash ||
      !input.configuration?.targetConfigured ||
      !input.configuration.assignmentConfigured)
  ) {
    return { ok: false, errorCode: "HANDOFF_ASSIGNMENT_NOT_CONFIGURED" };
  }
  if (
    input.handoff.companyId !== input.scope.companyId ||
    input.handoff.assistantId !== input.scope.assistantId ||
    input.handoff.conversationId !== input.scope.conversationId ||
    input.handoff.contextVersion !== input.scope.contextVersion ||
    (input.handoff.contactId ?? null) !== (input.scope.contactId ?? null)
  ) {
    return { ok: false, errorCode: "HANDOFF_SCOPE_MISMATCH" };
  }
  if (input.configuration && !input.configuration.configured) {
    return { ok: false, errorCode: "HANDOFF_CHATWOOT_NOT_CONFIGURED" };
  }
  if (input.configuration && !input.configuration.inboxMatches) {
    return { ok: false, errorCode: "HANDOFF_INBOX_MISMATCH" };
  }
  if (input.conversationState) {
    if (!input.conversationState.configReady) {
      return { ok: false, errorCode: "HANDOFF_CHATWOOT_NOT_CONFIGURED" };
    }
    if (!input.conversationState.inboxMatches) {
      return { ok: false, errorCode: "HANDOFF_INBOX_MISMATCH" };
    }
    if (input.conversationState.humanActive) {
      return { ok: false, errorCode: "HANDOFF_HUMAN_ALREADY_ACTIVE" };
    }
  }
  return { ok: true };
}

export function createChatwootHandoffPlan(input: {
  handoff: HandoffRequest;
  currentTime: Date;
  configuration: ChatwootHandoffExecutionConfiguration;
}): ChatwootHandoffPlan {
  const steps: ChatwootHandoffStep[] = ["VERIFY_CONVERSATION", "VERIFY_AI_ACTIVE", "PAUSE_AI"];
  if (input.configuration.labelConfigured) steps.push("APPLY_LABEL");
  if (input.handoff.requestedTargetType === "TEAM") steps.push("ASSIGN_TEAM");
  if (input.handoff.requestedTargetType === "AGENT") steps.push("ASSIGN_AGENT");
  steps.push("VERIFY_FINAL_STATE");
  return {
    contractVersion: CHATWOOT_HANDOFF_EXECUTION_CONTRACT_VERSION,
    handoffId: input.handoff.handoffId,
    companyId: input.handoff.companyId,
    assistantId: input.handoff.assistantId,
    conversationId: input.handoff.conversationId,
    contextVersion: input.handoff.contextVersion,
    internalMessageId: input.handoff.originatingInternalMessageId,
    targetType: input.handoff.requestedTargetType,
    targetIdHash: input.handoff.requestedTargetIdHash,
    reasonCode: input.handoff.reasonCode,
    steps,
    idempotencyKey: input.handoff.idempotencyKey,
    expectedPreconditions: {
      companyId: input.handoff.companyId,
      assistantId: input.handoff.assistantId,
      conversationId: input.handoff.conversationId,
      contextVersion: input.handoff.contextVersion,
      handoffStatus:
        input.handoff.status === "HANDOFF_EXECUTION_PENDING" ||
        input.handoff.status === "HANDOFF_EXECUTING"
          ? input.handoff.status
          : "HANDOFF_READY",
      inboxRequired: true,
      humanMustBeInactive: true,
    },
    createdAt: input.currentTime.toISOString(),
    expiresAt: input.handoff.expiresAt,
    status: "PLANNED",
    redactionApplied: true,
  };
}

export function createChatwootHandoffExecutionPlan(input: {
  handoff: HandoffRequest;
  currentTime: Date;
  attemptNumber: number;
  configuration: ChatwootHandoffExecutionConfiguration;
}): ChatwootHandoffExecutionPlan {
  const plan = createChatwootHandoffPlan({
    handoff: input.handoff,
    currentTime: input.currentTime,
    configuration: input.configuration,
  });
  return {
    ...plan,
    executionId: createChatwootHandoffExecutionId({
      handoffId: input.handoff.handoffId,
      companyId: input.handoff.companyId,
      assistantId: input.handoff.assistantId,
      conversationId: input.handoff.conversationId,
      contextVersion: input.handoff.contextVersion,
      idempotencyKey: input.handoff.idempotencyKey,
      attemptNumber: input.attemptNumber,
    }),
  };
}

function baseResult(plan: ChatwootHandoffExecutionPlan): ChatwootHandoffExecutionResult {
  return {
    contractVersion: CHATWOOT_HANDOFF_EXECUTION_CONTRACT_VERSION,
    executionId: plan.executionId,
    handoffId: plan.handoffId,
    status: "REJECTED",
    attemptedSteps: [],
    confirmedSteps: [],
    aiActiveBefore: null,
    aiActiveAfter: null,
    labelApplied: false,
    assignmentChanged: false,
    finalStateVerified: false,
    partialMutation: false,
    externalEffectMayHaveOccurred: false,
    reconciliationStatus: "NOT_REQUIRED",
    errorCode: null,
    redactionApplied: true,
  };
}

export class ControlledChatwootHandoffExecutor {
  constructor(private readonly adapter: ChatwootHandoffAdapter) {}

  async execute(input: {
    environment?: NodeJS.ProcessEnv;
    scope: HandoffStateScope;
    handoff: HandoffRequest;
    currentTime: Date;
    attemptNumber?: number;
    configuration: ChatwootHandoffExecutionConfiguration;
  }): Promise<ChatwootHandoffExecutionResult> {
    const plan = createChatwootHandoffExecutionPlan({
      handoff: input.handoff,
      currentTime: input.currentTime,
      attemptNumber: input.attemptNumber ?? 1,
      configuration: input.configuration,
    });
    const result = baseResult(plan);
    if (input.handoff.status === "HANDOFF_SUCCEEDED") {
      return { ...result, status: "ALREADY_COMPLETED" };
    }
    const staticPreconditions = validateChatwootHandoffExecutionPreconditions({
      environment: input.environment,
      scope: input.scope,
      handoff: input.handoff,
      configuration: input.configuration,
      currentTime: input.currentTime,
    });
    if (!staticPreconditions.ok) return { ...result, errorCode: staticPreconditions.errorCode };

    const context: ChatwootHandoffAdapterContext = { plan, handoff: input.handoff };
    let state: ChatwootHandoffConversationState;
    try {
      state = await this.adapter.getConversationState(context);
    } catch (error) {
      return { ...result, errorCode: errorCode(error, "HANDOFF_CONVERSATION_NOT_FOUND") };
    }
    const preconditions = validateChatwootHandoffExecutionPreconditions({
      environment: input.environment,
      scope: input.scope,
      handoff: input.handoff,
      conversationState: state,
      configuration: input.configuration,
      currentTime: input.currentTime,
    });
    if (!preconditions.ok) {
      return {
        ...result,
        status:
          preconditions.errorCode === "HANDOFF_HUMAN_ALREADY_ACTIVE"
            ? "HUMAN_ALREADY_ACTIVE"
            : "REJECTED",
        errorCode: preconditions.errorCode,
        aiActiveBefore: state.aiActive,
        aiActiveAfter: state.aiActive,
        finalStateVerified: true,
      };
    }
    context.conversationState = state;

    const attemptedSteps: ChatwootHandoffStep[] = ["VERIFY_CONVERSATION", "VERIFY_AI_ACTIVE"];
    const confirmedSteps: ChatwootHandoffStep[] = ["VERIFY_CONVERSATION", "VERIFY_AI_ACTIVE"];
    const aiActiveBefore = state.aiActive;
    try {
      if (state.humanActive)
        return {
          ...result,
          status: "HUMAN_ALREADY_ACTIVE",
          aiActiveBefore,
          aiActiveAfter: state.aiActive,
          confirmedSteps,
        };
      if (state.aiActive) {
        attemptedSteps.push("PAUSE_AI");
        await this.adapter.pauseAi(context);
        confirmedSteps.push("PAUSE_AI");
      } else {
        confirmedSteps.push("PAUSE_AI");
      }
      if (input.configuration.labelConfigured) {
        attemptedSteps.push("APPLY_LABEL");
        if (!state.labelApplied) {
          await this.adapter.applyLabel(context);
        }
        confirmedSteps.push("APPLY_LABEL");
      }
      if (input.handoff.requestedTargetType === "TEAM") {
        attemptedSteps.push("ASSIGN_TEAM");
        if (!state.teamAssigned) await this.adapter.assignTeam(context);
        confirmedSteps.push("ASSIGN_TEAM");
      }
      if (input.handoff.requestedTargetType === "AGENT") {
        attemptedSteps.push("ASSIGN_AGENT");
        if (!state.agentAssigned) await this.adapter.assignAgent(context);
        confirmedSteps.push("ASSIGN_AGENT");
      }
      attemptedSteps.push("VERIFY_FINAL_STATE");
      const finalState = await this.adapter.verifyFinalState(context);
      confirmedSteps.push("VERIFY_FINAL_STATE");
      if (finalState.humanActive) {
        return {
          ...result,
          status: "HUMAN_ALREADY_ACTIVE",
          attemptedSteps,
          confirmedSteps,
          aiActiveBefore,
          aiActiveAfter: finalState.aiActive,
          finalStateVerified: true,
        };
      }
      if (finalState.aiActive) {
        throw new ChatwootHandoffAdapterError(
          "HANDOFF_RECONCILIATION_REQUIRED",
          "AFTER_MUTATION",
          true,
        );
      }
      return {
        ...result,
        status: "SUCCEEDED",
        attemptedSteps,
        confirmedSteps,
        aiActiveBefore,
        aiActiveAfter: finalState.aiActive,
        labelApplied: finalState.labelApplied,
        assignmentChanged: finalState.teamAssigned || finalState.agentAssigned,
        finalStateVerified: finalState.finalStateVerified !== false,
      };
    } catch (error) {
      const adapterError = error instanceof ChatwootHandoffAdapterError ? error : null;
      const uncertain = Boolean(adapterError?.externalEffectMayHaveOccurred);
      const partialMutation = confirmedSteps.includes("PAUSE_AI");
      const requiresReconciliation = adapterError?.code === "HANDOFF_RECONCILIATION_REQUIRED";
      return {
        ...result,
        status: requiresReconciliation
          ? "RECONCILIATION_REQUIRED"
          : uncertain
            ? "TIMED_OUT_UNKNOWN_EFFECT"
            : partialMutation
              ? "FAILED_AFTER_PARTIAL_MUTATION"
              : "FAILED_BEFORE_MUTATION",
        attemptedSteps,
        confirmedSteps,
        aiActiveBefore,
        aiActiveAfter: partialMutation ? false : aiActiveBefore,
        partialMutation,
        externalEffectMayHaveOccurred: uncertain,
        reconciliationStatus: uncertain ? "RECONCILIATION_REQUIRED" : "NOT_REQUIRED",
        errorCode: errorCode(error, "HANDOFF_PARTIAL_MUTATION"),
      };
    }
  }

  async reconcile(input: {
    plan: ChatwootHandoffExecutionPlan;
    handoff: HandoffRequest;
  }): Promise<ChatwootHandoffExecutionResult> {
    const result = baseResult(input.plan);
    try {
      const state = await this.adapter.reconcile({ plan: input.plan, handoff: input.handoff });
      const requiredLabel = input.plan.steps.includes("APPLY_LABEL");
      const requiredTeam = input.plan.steps.includes("ASSIGN_TEAM");
      const requiredAgent = input.plan.steps.includes("ASSIGN_AGENT");
      const complete =
        !state.aiActive &&
        (!requiredLabel || state.labelApplied) &&
        (!requiredTeam || state.teamAssigned) &&
        (!requiredAgent || state.agentAssigned);
      const partial = !state.aiActive && !complete;
      return {
        ...result,
        status: complete
          ? "RECONCILED_SUCCEEDED"
          : partial
            ? "RECONCILED_PARTIAL"
            : "RECONCILED_FAILED",
        aiActiveAfter: state.aiActive,
        labelApplied: state.labelApplied,
        assignmentChanged: state.teamAssigned || state.agentAssigned,
        finalStateVerified: state.finalStateVerified === true,
        partialMutation: partial,
        externalEffectMayHaveOccurred: true,
        reconciliationStatus: complete
          ? "RECONCILED_SUCCEEDED"
          : partial
            ? "RECONCILED_PARTIAL"
            : "RECONCILED_FAILED",
      };
    } catch (error) {
      return {
        ...result,
        status: "RECONCILIATION_INCONCLUSIVE",
        externalEffectMayHaveOccurred: true,
        reconciliationStatus: "RECONCILIATION_INCONCLUSIVE",
        errorCode: errorCode(error, "HANDOFF_RECONCILIATION_REQUIRED"),
      };
    }
  }
}

function errorCode(error: unknown, fallback: string): string {
  return error instanceof ChatwootHandoffAdapterError
    ? error.code
    : error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : fallback;
}

export function buildChatwootHandoffExecutionManifest(input: {
  mode: RuntimeV2HandoffExecutionMode;
  result?: ChatwootHandoffExecutionResult | null;
  assistantAllowlisted: boolean;
  conversationAllowlisted: boolean;
  preconditionsValid: boolean;
  conversationVerified: boolean;
  humanAlreadyActive: boolean;
  labelConfigured: boolean;
  assignmentConfigured: boolean;
}): Record<string, unknown> {
  const result = input.result;
  return {
    handoffExecutionMode: input.mode,
    handoffExecutionEligible: input.preconditionsValid && input.mode === "CONTROLLED",
    handoffExecutionId: result?.executionId ?? null,
    handoffExecutionAttempt: null,
    handoffExecutionStatus: result?.status ?? null,
    handoffExecutionReasonAuthorized: input.preconditionsValid,
    handoffExecutionAssistantAllowlisted: input.assistantAllowlisted,
    handoffExecutionConversationAllowlisted: input.conversationAllowlisted,
    handoffPreconditionsValid: input.preconditionsValid,
    handoffConversationVerified: input.conversationVerified,
    handoffHumanAlreadyActive: input.humanAlreadyActive,
    handoffAiActiveBefore: result?.aiActiveBefore ?? null,
    handoffAiActiveAfter: result?.aiActiveAfter ?? null,
    handoffPauseAiAttempted: result?.attemptedSteps.includes("PAUSE_AI") ?? false,
    handoffPauseAiConfirmed: result?.confirmedSteps.includes("PAUSE_AI") ?? false,
    handoffLabelConfigured: input.labelConfigured,
    handoffLabelApplied: result?.labelApplied ?? false,
    handoffAssignmentConfigured: input.assignmentConfigured,
    handoffAssignmentChanged: result?.assignmentChanged ?? false,
    handoffFinalStateVerified: result?.finalStateVerified ?? false,
    handoffPartialMutation: result?.partialMutation ?? false,
    handoffExternalEffectMayHaveOccurred: result?.externalEffectMayHaveOccurred ?? false,
    handoffReconciliationStatus: result?.reconciliationStatus ?? null,
    handoffExecutionPersisted: false,
    handoffExecutionRedactionApplied: true,
    providerCalled: false,
    outboundSent: false,
  };
}

export function createHandoffExecutionStateEvent(input: {
  scope: HandoffStateScope;
  handoff: HandoffRequest;
  eventType: HandoffEventType;
  timestamp: Date;
  reasonCode: HandoffRequest["reasonCode"];
  metadata?: Record<string, string | number | boolean | null>;
}): HandoffStateEvent {
  const nextStatus = transitionHandoffStatus(input.handoff.status, input.eventType);
  return {
    contractVersion: 1,
    eventId: hashParts([
      input.handoff.handoffId,
      input.eventType,
      input.handoff.status,
      nextStatus,
      input.handoff.originatingInternalMessageId,
      input.timestamp.toISOString(),
    ]),
    handoffId: input.handoff.handoffId,
    previousStatus: input.handoff.status,
    nextStatus,
    eventType: input.eventType,
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contactId: input.scope.contactId ?? null,
    contextVersion: input.scope.contextVersion,
    internalMessageId: input.handoff.originatingInternalMessageId,
    timestamp: input.timestamp.toISOString(),
    reasonCode: input.reasonCode,
    metadata: input.metadata ?? {},
  };
}

export function applyHandoffExecutionEvent(
  state: RuntimeHandoffState,
  event: HandoffStateEvent,
  context: { scope: HandoffStateScope; currentTime: Date },
): RuntimeHandoffState {
  return reduceRuntimeHandoffState(state, event, context);
}
