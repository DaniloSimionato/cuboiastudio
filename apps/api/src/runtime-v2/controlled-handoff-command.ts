import { createHash } from "node:crypto";
import {
  applyHandoffExecutionEvent,
  ChatwootHandoffAdapter,
  ChatwootHandoffExecutionConfiguration,
  ControlledChatwootHandoffExecutor,
  createChatwootHandoffExecutionId,
  createChatwootHandoffPlan,
  createHandoffExecutionStateEvent,
  type ChatwootHandoffPlan,
} from "./chatwoot-handoff-executor";
import {
  resolveRuntimeV2HandoffAdapterMode,
  resolveRuntimeV2HandoffExecutionAssistantIds,
  resolveRuntimeV2HandoffExecutionConversationIds,
  resolveRuntimeV2HandoffExecutionMode,
  resolveRuntimeV2HandoffStateMode,
  resolveRuntimeV2Mode,
} from "./runtime-v2-feature-flag";
import {
  type ConversationState,
  type ControlledExecutionApprovalState,
  type ControlledExecutionRecord,
  type RuntimeV2Scope,
} from "./runtime-v2.types";
import {
  StateRevisionConflictError,
  type ConversationStateStore,
  type ConversationStateStoreScope,
} from "./conversation-state-store";
import type { HandoffRequest, HandoffStateScope } from "./handoff-state";
import type { ControlledChatwootReference } from "./controlled-chatwoot-reference";

export const CONTROLLED_HANDOFF_COMMAND_CONTRACT_VERSION = 1 as const;
export const CONTROLLED_HANDOFF_APPROVED_OPERATION = "PAUSE_AI_ONLY" as const;

export type ControlledHandoffCommandMode = "DRY_RUN" | "EXECUTE";

export type ControlledExecutionApproval = ControlledExecutionApprovalState;

export type ControlledHandoffCommandEventType =
  | "CONTROLLED_HANDOFF_DRY_RUN"
  | "CONTROLLED_HANDOFF_EXECUTION_APPROVED"
  | "CONTROLLED_HANDOFF_EXECUTION_STARTED"
  | "CONTROLLED_HANDOFF_EXECUTION_COMPLETED"
  | "CONTROLLED_HANDOFF_EXECUTION_REJECTED"
  | "CONTROLLED_HANDOFF_RECONCILIATION_REQUIRED";

export type ControlledHandoffCommandEvent = {
  eventId: string;
  eventType: ControlledHandoffCommandEventType;
  commandId: string;
  handoffId: string;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  previousStatus: string;
  nextStatus: string;
  timestamp: string;
  source: "RUNTIME_V2_CONTROLLED_COMMAND";
  reason: string;
  metadata: Record<string, string | number | boolean | null>;
  redactionApplied: true;
};

export type ControlledHandoffConfigurationReference = ControlledChatwootReference;

export type ControlledHandoffCommandInput = {
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  handoffId: string;
  expectedRevision: number;
  mode?: ControlledHandoffCommandMode;
  approvalId?: string | null;
  configurationReference?: ControlledHandoffConfigurationReference;
};

type ControlledHandoffCommandResultBase = {
  contractVersion: typeof CONTROLLED_HANDOFF_COMMAND_CONTRACT_VERSION;
  commandId: string;
  eligible: boolean;
  handoffId: string;
  status: string;
  resultCode: string | null;
  blockers: string[];
  expectedOperation: typeof CONTROLLED_HANDOFF_APPROVED_OPERATION | null;
  planHash: string | null;
  revisionBefore: number | null;
  revisionAfter: number | null;
  pauseAiAttempted: boolean;
  pauseAiConfirmed: boolean;
  humanAlreadyActive: boolean;
  reconciliationRequired: boolean;
  externalReadPerformed: boolean;
  externalMutationPerformed: boolean;
  externalEffectMayHaveOccurred: boolean;
  credentialResolved: boolean;
  structuralReferenceResolved: boolean;
  configurationPresent: boolean;
  channelBindingPresent: boolean;
  scopeValid: boolean;
  adapterResolved: boolean;
  initialReadPerformed: boolean;
  finalVerificationPerformed: boolean;
  redactionApplied: true;
};

export type ControlledHandoffDryRunResult = ControlledHandoffCommandResultBase & {
  mode: "DRY_RUN";
  executionId?: never;
  operationalExecutionCreated: false;
};

export type ControlledHandoffExecuteResult = ControlledHandoffCommandResultBase & {
  mode: "EXECUTE";
  executionId: string | null;
  operationalExecutionCreated: boolean;
};

export type ControlledHandoffCommandResult =
  ControlledHandoffDryRunResult | ControlledHandoffExecuteResult;

type MutableControlledHandoffCommandResult = ControlledHandoffCommandResultBase & {
  mode: ControlledHandoffCommandMode;
  executionId?: string | null;
  operationalExecutionCreated: boolean;
};

export type ControlledHandoffCommandDependencies = {
  stateStore: ConversationStateStore;
  resolveConfigurationReference?: (
    scope: HandoffStateScope,
  ) =>
    | ControlledHandoffConfigurationReference
    | null
    | Promise<ControlledHandoffConfigurationReference | null>;
  resolveAdapter?: (input: {
    environment: NodeJS.ProcessEnv;
    scope: HandoffStateScope;
    handoff: HandoffRequest;
  }) => ChatwootHandoffAdapter | null | Promise<ChatwootHandoffAdapter | null>;
  now?: () => Date;
  environment?: NodeJS.ProcessEnv;
};

type CommandScope = ConversationStateStoreScope & HandoffStateScope;

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

function commandId(input: ControlledHandoffCommandInput): string {
  return hashParts([
    input.companyId,
    input.assistantId,
    input.conversationId,
    input.contextVersion,
    input.handoffId,
    input.expectedRevision,
    input.mode ?? "DRY_RUN",
    input.approvalId ?? null,
  ]);
}

function scopeFromInput(input: ControlledHandoffCommandInput): CommandScope {
  return {
    companyId: input.companyId,
    assistantId: input.assistantId,
    conversationId: input.conversationId,
    contextVersion: input.contextVersion,
    contactId: null,
    runtimeVersion: "V2",
    mode: "SHADOW",
  };
}

function baseResult(input: ControlledHandoffCommandInput): MutableControlledHandoffCommandResult {
  return {
    contractVersion: CONTROLLED_HANDOFF_COMMAND_CONTRACT_VERSION,
    commandId: commandId(input),
    mode: input.mode ?? "DRY_RUN",
    eligible: false,
    handoffId: input.handoffId,
    status: "REJECTED",
    resultCode: null,
    blockers: [],
    expectedOperation: null,
    planHash: null,
    revisionBefore: null,
    revisionAfter: null,
    pauseAiAttempted: false,
    pauseAiConfirmed: false,
    humanAlreadyActive: false,
    reconciliationRequired: false,
    externalReadPerformed: false,
    externalMutationPerformed: false,
    externalEffectMayHaveOccurred: false,
    credentialResolved: false,
    structuralReferenceResolved: false,
    configurationPresent: false,
    channelBindingPresent: false,
    scopeValid: false,
    adapterResolved: false,
    initialReadPerformed: false,
    finalVerificationPerformed: false,
    operationalExecutionCreated: false,
    redactionApplied: true,
  };
}

function addBlocker(result: MutableControlledHandoffCommandResult, blocker: string): void {
  if (!result.blockers.includes(blocker)) result.blockers.push(blocker);
}

function finalizeResult(
  result: MutableControlledHandoffCommandResult,
): ControlledHandoffCommandResult {
  if (result.mode === "DRY_RUN") {
    const { executionId: _executionId, ...dryRunResult } = result;
    return {
      ...dryRunResult,
      mode: "DRY_RUN",
      operationalExecutionCreated: false,
    };
  }
  return { ...result, mode: "EXECUTE", executionId: result.executionId ?? null };
}

function flagsBlockers(environment: NodeJS.ProcessEnv, scope: HandoffStateScope): string[] {
  const blockers: string[] = [];
  if (resolveRuntimeV2Mode({}, environment) !== "SHADOW") {
    blockers.push("CONTROLLED_HANDOFF_DISABLED");
  }
  if (resolveRuntimeV2HandoffStateMode(environment) !== "SHADOW_STATE") {
    blockers.push("CONTROLLED_HANDOFF_DISABLED");
  }
  if (resolveRuntimeV2HandoffExecutionMode(environment) !== "CONTROLLED") {
    blockers.push("CONTROLLED_HANDOFF_DISABLED");
  }
  if (resolveRuntimeV2HandoffAdapterMode(environment) !== "CHATWOOT_CONTROLLED") {
    blockers.push("CONTROLLED_HANDOFF_DISABLED");
  }
  if (!resolveRuntimeV2HandoffExecutionAssistantIds(environment).includes(scope.assistantId)) {
    blockers.push("CONTROLLED_HANDOFF_NOT_ALLOWLISTED");
  }
  if (
    !resolveRuntimeV2HandoffExecutionConversationIds(environment).includes(scope.conversationId)
  ) {
    blockers.push("CONTROLLED_HANDOFF_NOT_ALLOWLISTED");
  }
  return blockers;
}

function scopeMatches(handoff: HandoffRequest, scope: HandoffStateScope): boolean {
  return (
    handoff.companyId === scope.companyId &&
    handoff.assistantId === scope.assistantId &&
    handoff.conversationId === scope.conversationId &&
    handoff.contextVersion === scope.contextVersion &&
    (scope.contactId === null || (handoff.contactId ?? null) === scope.contactId)
  );
}

function buildPlan(handoff: HandoffRequest, now: Date): ChatwootHandoffPlan {
  return createChatwootHandoffPlan({
    handoff,
    currentTime: now,
    configuration: {
      configured: true,
      inboxMatches: true,
      labelConfigured: false,
      assignmentConfigured: false,
      targetConfigured: false,
    },
  });
}

function planHashWithReference(
  plan: ChatwootHandoffPlan,
  reference: ControlledHandoffConfigurationReference | null,
): string {
  return hashParts([
    plan.contractVersion,
    plan.handoffId,
    plan.companyId,
    plan.assistantId,
    plan.conversationId,
    plan.contextVersion,
    plan.internalMessageId,
    plan.targetType,
    plan.targetIdHash,
    plan.reasonCode,
    plan.steps,
    plan.idempotencyKey,
    plan.expectedPreconditions,
    reference?.resolutionStatus ?? null,
    reference?.scopeValid ?? false,
    reference?.accountScopeHash ?? null,
    reference?.inboxScopeHash ?? null,
    reference?.externalConversationReferenceHash ?? null,
  ]);
}

function isOnlyPauseAiPlan(plan: ChatwootHandoffPlan): boolean {
  return (
    plan.steps.length === 4 &&
    plan.steps[0] === "VERIFY_CONVERSATION" &&
    plan.steps[1] === "VERIFY_AI_ACTIVE" &&
    plan.steps[2] === "PAUSE_AI" &&
    plan.steps[3] === "VERIFY_FINAL_STATE"
  );
}

function approvalMatches(
  approval: ControlledExecutionApprovalState | null | undefined,
  input: ControlledHandoffCommandInput,
  handoff: HandoffRequest,
  now: Date,
  expectedPlanHash: string,
): string | null {
  if (!input.approvalId) return "CONTROLLED_HANDOFF_APPROVAL_REQUIRED";
  if (!approval || approval.approvalId !== input.approvalId) {
    return "CONTROLLED_HANDOFF_APPROVAL_REQUIRED";
  }
  if (approval.status === "CONSUMED") {
    return "CONTROLLED_HANDOFF_APPROVAL_ALREADY_CONSUMED";
  }
  if (approval.expiresAt && now.getTime() >= Date.parse(approval.expiresAt)) {
    return "CONTROLLED_HANDOFF_APPROVAL_EXPIRED";
  }
  if (
    approval.handoffId !== handoff.handoffId ||
    approval.companyId !== input.companyId ||
    approval.assistantId !== input.assistantId ||
    approval.conversationId !== input.conversationId ||
    approval.contextVersion !== input.contextVersion ||
    approval.expectedRevision !== input.expectedRevision ||
    approval.approvedOperation !== CONTROLLED_HANDOFF_APPROVED_OPERATION ||
    approval.planHash !== expectedPlanHash ||
    approval.redactionApplied !== true
  ) {
    return approval.planHash !== expectedPlanHash
      ? "CONTROLLED_HANDOFF_PLAN_HASH_MISMATCH"
      : "CONTROLLED_HANDOFF_SCOPE_MISMATCH";
  }
  return null;
}

function withRevision(state: ConversationState, revision: number, now: Date): ConversationState {
  return { ...state, revision, updatedAt: now };
}

function executionRecord(input: {
  executionId: string;
  handoffId: string;
  status: string;
  resultCode: string | null;
  revisionBefore: number;
  revisionAfter: number | null;
  pauseAiAttempted?: boolean;
  pauseAiConfirmed?: boolean;
  humanAlreadyActive?: boolean;
  reconciliationRequired?: boolean;
  externalEffectMayHaveOccurred?: boolean;
  eventIds?: string[];
}): ControlledExecutionRecord {
  return {
    executionId: input.executionId,
    handoffId: input.handoffId,
    status: input.status,
    resultCode: input.resultCode,
    revisionBefore: input.revisionBefore,
    revisionAfter: input.revisionAfter,
    pauseAiAttempted: input.pauseAiAttempted ?? false,
    pauseAiConfirmed: input.pauseAiConfirmed ?? false,
    humanAlreadyActive: input.humanAlreadyActive ?? false,
    reconciliationRequired: input.reconciliationRequired ?? false,
    externalEffectMayHaveOccurred: input.externalEffectMayHaveOccurred ?? false,
    eventIds: input.eventIds ?? [],
    redactionApplied: true,
  };
}

export function createControlledHandoffCommandEvent(input: {
  eventType: ControlledHandoffCommandEventType;
  commandId: string;
  handoffId: string;
  scope: HandoffStateScope;
  previousStatus: string;
  nextStatus: string;
  timestamp: Date;
  reason: string;
  metadata?: Record<string, string | number | boolean | null>;
}): ControlledHandoffCommandEvent {
  const eventId = hashParts([
    input.eventType,
    input.commandId,
    input.handoffId,
    input.scope.companyId,
    input.scope.assistantId,
    input.scope.conversationId,
    input.scope.contextVersion,
    input.previousStatus,
    input.nextStatus,
  ]);
  return {
    eventId,
    eventType: input.eventType,
    commandId: input.commandId,
    handoffId: input.handoffId,
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contextVersion: input.scope.contextVersion,
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    timestamp: input.timestamp.toISOString(),
    source: "RUNTIME_V2_CONTROLLED_COMMAND",
    reason: input.reason,
    metadata: input.metadata ?? {},
    redactionApplied: true,
  };
}

function resolveFinalEventType(
  status: string,
): "HANDOFF_EXECUTION_SUCCEEDED" | "HANDOFF_EXECUTION_FAILED" | "HANDOFF_EXECUTION_TIMED_OUT" {
  if (
    status === "SUCCEEDED" ||
    status === "ALREADY_COMPLETED" ||
    status === "HUMAN_ALREADY_ACTIVE" ||
    status === "RECONCILED_SUCCEEDED"
  ) {
    return "HANDOFF_EXECUTION_SUCCEEDED";
  }
  if (
    status === "TIMED_OUT_UNKNOWN_EFFECT" ||
    status === "RECONCILIATION_REQUIRED" ||
    status === "RECONCILIATION_INCONCLUSIVE"
  ) {
    return "HANDOFF_EXECUTION_TIMED_OUT";
  }
  return "HANDOFF_EXECUTION_FAILED";
}

function isExecutionTerminal(status: string): boolean {
  return ["SUCCEEDED", "ALREADY_COMPLETED", "HUMAN_ALREADY_ACTIVE"].includes(status);
}

export function createControlledExecutionApproval(input: {
  approvalId: string;
  handoff: HandoffRequest;
  expectedRevision: number;
  issuedAt: Date;
  expiresAt: Date;
  nonceHash: string;
  planHash: string;
}): ControlledExecutionApproval {
  if (!input.approvalId || !input.nonceHash)
    throw new Error("CONTROLLED_HANDOFF_APPROVAL_REQUIRED");
  if (input.expiresAt.getTime() <= input.issuedAt.getTime()) {
    throw new Error("CONTROLLED_HANDOFF_APPROVAL_EXPIRED");
  }
  return {
    approvalId: input.approvalId,
    handoffId: input.handoff.handoffId,
    companyId: input.handoff.companyId,
    assistantId: input.handoff.assistantId,
    conversationId: input.handoff.conversationId,
    contextVersion: input.handoff.contextVersion,
    expectedRevision: input.expectedRevision,
    planHash: input.planHash,
    approvedOperation: CONTROLLED_HANDOFF_APPROVED_OPERATION,
    issuedAt: input.issuedAt.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    nonceHash: input.nonceHash,
    consumedAt: null,
    status: "ISSUED",
    redactionApplied: true,
  };
}

export class RuntimeV2ControlledHandoffCommand {
  private readonly now: () => Date;
  private readonly environment: NodeJS.ProcessEnv;

  constructor(private readonly dependencies: ControlledHandoffCommandDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.environment = dependencies.environment ?? process.env;
  }

  async run(input: ControlledHandoffCommandInput): Promise<ControlledHandoffCommandResult> {
    const result = baseResult(input);
    const mode = input.mode ?? "DRY_RUN";
    result.mode = mode;
    const scope = scopeFromInput(input);
    const blockers = flagsBlockers(this.environment, scope);
    blockers.forEach((blocker) => addBlocker(result, blocker));

    const state = await this.dependencies.stateStore.load(scope);
    if (!state) {
      addBlocker(result, "CONTROLLED_HANDOFF_SCOPE_MISMATCH");
      result.resultCode = "CONTROLLED_HANDOFF_SCOPE_MISMATCH";
      return finalizeResult(result);
    }
    result.revisionBefore = state.revision;
    const handoff = state.handoffState?.activeHandoff ?? null;
    if (!handoff) {
      if (state.controlledExecution?.handoffId === input.handoffId) {
        addBlocker(result, "CONTROLLED_HANDOFF_EXECUTION_DUPLICATE");
        result.resultCode = "CONTROLLED_HANDOFF_EXECUTION_DUPLICATE";
        return finalizeResult(result);
      }
      addBlocker(result, "CONTROLLED_HANDOFF_NOT_READY");
      result.resultCode = "CONTROLLED_HANDOFF_NOT_READY";
      return finalizeResult(result);
    }
    if (handoff.handoffId !== input.handoffId) {
      addBlocker(result, "CONTROLLED_HANDOFF_HANDOFF_ID_MISMATCH");
    }
    if (!scopeMatches(handoff, scope)) addBlocker(result, "CONTROLLED_HANDOFF_SCOPE_MISMATCH");
    const resolvedScope: CommandScope = { ...scope, contactId: handoff.contactId ?? null };
    if (handoff.contextVersion !== input.contextVersion) {
      addBlocker(result, "CONTROLLED_HANDOFF_CONTEXT_VERSION_MISMATCH");
    }
    if (state.revision !== input.expectedRevision) {
      addBlocker(result, "CONTROLLED_HANDOFF_REVISION_MISMATCH");
    }
    if (handoff.status !== "HANDOFF_READY") {
      addBlocker(result, "CONTROLLED_HANDOFF_NOT_READY");
    }
    if (!EXECUTION_REASON_CODES.has(handoff.reasonCode)) {
      addBlocker(result, "CONTROLLED_HANDOFF_REASON_NOT_AUTHORIZED");
    }
    const plan = buildPlan(handoff, this.now());
    result.planHash = planHashWithReference(plan, null);
    result.expectedOperation = isOnlyPauseAiPlan(plan)
      ? CONTROLLED_HANDOFF_APPROVED_OPERATION
      : null;
    if (!isOnlyPauseAiPlan(plan)) {
      addBlocker(result, "CONTROLLED_HANDOFF_PLAN_CONTAINS_DISABLED_OPERATION");
    }
    const configurationReference =
      input.configurationReference ??
      (this.dependencies.resolveConfigurationReference
        ? await this.dependencies.resolveConfigurationReference(scope)
        : null);
    if (!configurationReference) {
      addBlocker(result, "CONTROLLED_HANDOFF_REFERENCE_NOT_FOUND");
    } else {
      result.structuralReferenceResolved = true;
      result.configurationPresent = configurationReference.configurationPresent;
      result.channelBindingPresent = configurationReference.channelBindingPresent;
      result.scopeValid = configurationReference.scopeValid;
      result.planHash = planHashWithReference(plan, configurationReference);
      if (!isValidConfigurationReference(configurationReference, scope)) {
        addBlocker(result, configurationReferenceBlocker(configurationReference));
      }
    }
    if (mode === "EXECUTE") {
      const approvalError = approvalMatches(
        state.controlledExecutionApproval,
        input,
        handoff,
        this.now(),
        result.planHash,
      );
      if (approvalError) addBlocker(result, approvalError);
      if (!this.dependencies.resolveAdapter) {
        addBlocker(result, "CONTROLLED_HANDOFF_ADAPTER_UNAVAILABLE");
      }
    }
    if (mode === "DRY_RUN") {
      result.eligible = result.blockers.length === 0;
      result.status = result.eligible ? "DRY_RUN_APPROVED" : "DRY_RUN_BLOCKED";
      result.resultCode = result.eligible ? null : (result.blockers[0] ?? null);
      return finalizeResult(result);
    }
    if (mode !== "EXECUTE") {
      addBlocker(result, "CONTROLLED_HANDOFF_DRY_RUN_REQUIRED");
      result.resultCode = "CONTROLLED_HANDOFF_DRY_RUN_REQUIRED";
      return finalizeResult(result);
    }
    if (result.blockers.length > 0) {
      result.resultCode = result.blockers[0] ?? "CONTROLLED_HANDOFF_DISABLED";
      return finalizeResult(result);
    }
    if (state.controlledExecution?.handoffId === handoff.handoffId) {
      addBlocker(result, "CONTROLLED_HANDOFF_EXECUTION_DUPLICATE");
      result.resultCode = "CONTROLLED_HANDOFF_EXECUTION_DUPLICATE";
      return finalizeResult(result);
    }

    const adapter = await this.dependencies.resolveAdapter!({
      environment: this.environment,
      scope: resolvedScope,
      handoff,
    });
    if (!adapter) {
      result.blockers.push("CONTROLLED_HANDOFF_ADAPTER_UNAVAILABLE");
      result.resultCode = "CONTROLLED_HANDOFF_ADAPTER_UNAVAILABLE";
      return finalizeResult(result);
    }
    result.adapterResolved = true;

    // Create the operational identity only after all EXECUTE gates passed.
    // DRY_RUN never reaches this branch and therefore never calls this helper.
    const executionId = createChatwootHandoffExecutionId({
      handoffId: handoff.handoffId,
      companyId: handoff.companyId,
      assistantId: handoff.assistantId,
      conversationId: handoff.conversationId,
      contextVersion: handoff.contextVersion,
      idempotencyKey: handoff.idempotencyKey,
      attemptNumber: 1,
    });

    const initialRevision = state.revision;
    const pendingTime = this.now();
    const approvedAuditEvent = createControlledHandoffCommandEvent({
      eventType: "CONTROLLED_HANDOFF_EXECUTION_APPROVED",
      commandId: result.commandId,
      handoffId: handoff.handoffId,
      scope: resolvedScope,
      previousStatus: "HANDOFF_READY",
      nextStatus: "HANDOFF_EXECUTION_PENDING",
      timestamp: pendingTime,
      reason: handoff.reasonCode,
      metadata: { operation: CONTROLLED_HANDOFF_APPROVED_OPERATION },
    });
    const pendingEvent = createHandoffExecutionStateEvent({
      scope: resolvedScope,
      handoff,
      eventType: "HANDOFF_EXECUTION_PENDING",
      timestamp: pendingTime,
      reasonCode: handoff.reasonCode,
      metadata: { executionId, operation: CONTROLLED_HANDOFF_APPROVED_OPERATION },
    });
    const pendingHandoffState = applyHandoffExecutionEvent(state.handoffState!, pendingEvent, {
      scope: resolvedScope,
      currentTime: pendingTime,
    });
    const pendingApproval = {
      ...state.controlledExecutionApproval!,
      consumedAt: pendingTime.toISOString(),
      status: "CONSUMED" as const,
    };
    const pendingState = withRevision(
      {
        ...state,
        handoffState: pendingHandoffState,
        controlledExecutionApproval: pendingApproval,
        controlledExecution: executionRecord({
          executionId,
          handoffId: handoff.handoffId,
          status: "EXECUTION_PENDING",
          resultCode: null,
          revisionBefore: initialRevision,
          revisionAfter: null,
          eventIds: [approvedAuditEvent.eventId],
        }),
      },
      initialRevision + 1,
      pendingTime,
    );
    let currentState: ConversationState;
    try {
      currentState = await this.dependencies.stateStore.save(pendingState, initialRevision);
    } catch (error) {
      result.resultCode =
        error instanceof StateRevisionConflictError
          ? "CONTROLLED_HANDOFF_REVISION_MISMATCH"
          : "CONTROLLED_HANDOFF_APPROVAL_ALREADY_CONSUMED";
      addBlocker(result, result.resultCode);
      return finalizeResult(result);
    }

    result.executionId = executionId;
    result.operationalExecutionCreated = true;

    const startedTime = this.now();
    const startedHandoff = currentState.handoffState!.activeHandoff!;
    const startedAuditEvent = createControlledHandoffCommandEvent({
      eventType: "CONTROLLED_HANDOFF_EXECUTION_STARTED",
      commandId: result.commandId,
      handoffId: handoff.handoffId,
      scope: resolvedScope,
      previousStatus: "HANDOFF_EXECUTION_PENDING",
      nextStatus: "HANDOFF_EXECUTING",
      timestamp: startedTime,
      reason: startedHandoff.reasonCode,
      metadata: { operation: CONTROLLED_HANDOFF_APPROVED_OPERATION },
    });
    const startedEvent = createHandoffExecutionStateEvent({
      scope: resolvedScope,
      handoff: startedHandoff,
      eventType: "HANDOFF_EXECUTION_STARTED",
      timestamp: startedTime,
      reasonCode: startedHandoff.reasonCode,
      metadata: { executionId },
    });
    const startedHandoffState = applyHandoffExecutionEvent(
      currentState.handoffState!,
      startedEvent,
      {
        scope: resolvedScope,
        currentTime: startedTime,
      },
    );
    const startedState = withRevision(
      {
        ...currentState,
        handoffState: startedHandoffState,
        controlledExecution: executionRecord({
          executionId,
          handoffId: handoff.handoffId,
          status: "EXECUTING",
          resultCode: null,
          revisionBefore: initialRevision,
          revisionAfter: null,
          eventIds: [approvedAuditEvent.eventId, startedAuditEvent.eventId],
        }),
      },
      currentState.revision + 1,
      startedTime,
    );
    try {
      currentState = await this.dependencies.stateStore.save(startedState, currentState.revision);
    } catch {
      result.resultCode = "CONTROLLED_HANDOFF_REVISION_MISMATCH";
      addBlocker(result, result.resultCode);
      return finalizeResult(result);
    }

    const executor = new ControlledChatwootHandoffExecutor(adapter);
    const execution = await executor.execute({
      environment: this.environment,
      scope: resolvedScope,
      handoff: currentState.handoffState!.activeHandoff!,
      currentTime: this.now(),
      attemptNumber: 1,
      configuration: {
        configured: true,
        inboxMatches: true,
        labelConfigured: false,
        assignmentConfigured: false,
        targetConfigured: false,
      } satisfies ChatwootHandoffExecutionConfiguration,
    });
    result.status =
      execution.status === "SUCCEEDED" &&
      execution.confirmedSteps.includes("PAUSE_AI") &&
      !execution.attemptedSteps.includes("PAUSE_AI")
        ? "ALREADY_COMPLETED"
        : execution.status;
    result.resultCode = execution.errorCode;
    result.pauseAiAttempted = execution.attemptedSteps.includes("PAUSE_AI");
    result.pauseAiConfirmed = execution.confirmedSteps.includes("PAUSE_AI");
    result.humanAlreadyActive = execution.status === "HUMAN_ALREADY_ACTIVE";
    result.reconciliationRequired = execution.reconciliationStatus !== "NOT_REQUIRED";
    result.externalReadPerformed = execution.attemptedSteps.includes("VERIFY_CONVERSATION");
    result.initialReadPerformed = result.externalReadPerformed;
    result.finalVerificationPerformed = execution.attemptedSteps.includes("VERIFY_FINAL_STATE");
    result.externalMutationPerformed = result.pauseAiAttempted;
    result.externalEffectMayHaveOccurred = execution.externalEffectMayHaveOccurred;
    result.credentialResolved = result.externalReadPerformed;
    result.eligible = true;

    const finalTime = this.now();
    const finalHandoff = currentState.handoffState!.activeHandoff!;
    const finalEventType = resolveFinalEventType(execution.status);
    const finalAuditEvent = createControlledHandoffCommandEvent({
      eventType: result.reconciliationRequired
        ? "CONTROLLED_HANDOFF_RECONCILIATION_REQUIRED"
        : "CONTROLLED_HANDOFF_EXECUTION_COMPLETED",
      commandId: result.commandId,
      handoffId: handoff.handoffId,
      scope: resolvedScope,
      previousStatus: "HANDOFF_EXECUTING",
      nextStatus: result.reconciliationRequired
        ? "HANDOFF_RECONCILIATION_REQUIRED"
        : "HANDOFF_SUCCEEDED",
      timestamp: finalTime,
      reason: finalHandoff.reasonCode,
      metadata: {
        resultCode: execution.errorCode,
        externalEffectMayHaveOccurred: execution.externalEffectMayHaveOccurred,
      },
    });
    const finalEvent = createHandoffExecutionStateEvent({
      scope: resolvedScope,
      handoff: finalHandoff,
      eventType: finalEventType,
      timestamp: finalTime,
      reasonCode: finalHandoff.reasonCode,
      metadata: {
        executionId: execution.executionId,
        resultCode: execution.errorCode,
        externalEffectMayHaveOccurred: execution.externalEffectMayHaveOccurred,
      },
    });
    const finalHandoffState = applyHandoffExecutionEvent(currentState.handoffState!, finalEvent, {
      scope: resolvedScope,
      currentTime: finalTime,
    });
    const finalRevision = currentState.revision + 1;
    const finalState = withRevision(
      {
        ...currentState,
        handoffState: finalHandoffState,
        controlledExecution: executionRecord({
          executionId: execution.executionId,
          handoffId: execution.handoffId,
          status: result.status,
          resultCode: execution.errorCode,
          revisionBefore: initialRevision,
          revisionAfter: finalRevision,
          pauseAiAttempted: result.pauseAiAttempted,
          pauseAiConfirmed: result.pauseAiConfirmed,
          humanAlreadyActive: result.humanAlreadyActive,
          reconciliationRequired: result.reconciliationRequired,
          externalEffectMayHaveOccurred: execution.externalEffectMayHaveOccurred,
          eventIds: [
            approvedAuditEvent.eventId,
            startedAuditEvent.eventId,
            finalAuditEvent.eventId,
          ],
        }),
      },
      finalRevision,
      finalTime,
    );
    try {
      const persisted = await this.dependencies.stateStore.save(finalState, currentState.revision);
      result.revisionAfter = persisted.revision;
      return finalizeResult(result);
    } catch {
      result.status = "RECONCILIATION_REQUIRED";
      result.resultCode = "CONTROLLED_HANDOFF_RECONCILIATION_REQUIRED";
      result.reconciliationRequired = true;
      result.externalEffectMayHaveOccurred = result.externalMutationPerformed;
      addBlocker(result, result.resultCode);
      return finalizeResult(result);
    }
  }
}

const EXECUTION_REASON_CODES = new Set<HandoffRequest["reasonCode"]>([
  "CUSTOMER_REQUESTED_HUMAN",
  "FLOW_REQUIRED_HANDOFF",
  "MANUAL_OPERATOR_REQUEST",
]);

function isValidConfigurationReference(
  reference: ControlledHandoffConfigurationReference,
  scope: HandoffStateScope,
): boolean {
  return (
    reference.companyId === scope.companyId &&
    reference.assistantId === scope.assistantId &&
    reference.internalConversationId === scope.conversationId &&
    reference.contextVersion === scope.contextVersion &&
    reference.resolutionStatus === "RESOLVED" &&
    reference.scopeValid &&
    reference.channelBindingPresent &&
    reference.configurationPresent &&
    reference.configurationActive &&
    reference.redactionApplied === true
  );
}

function configurationReferenceBlocker(reference: ControlledHandoffConfigurationReference): string {
  switch (reference.resolutionStatus) {
    case "REFERENCE_NOT_FOUND":
      return "CONTROLLED_HANDOFF_REFERENCE_NOT_FOUND";
    case "CHANNEL_BINDING_MISSING":
      return "CONTROLLED_HANDOFF_CHANNEL_BINDING_MISSING";
    case "CONFIGURATION_MISSING":
      return "CONTROLLED_HANDOFF_CHATWOOT_CONFIGURATION_MISSING";
    case "CONFIGURATION_INACTIVE":
      return "CONTROLLED_HANDOFF_CHATWOOT_CONFIGURATION_INACTIVE";
    case "SCOPE_AMBIGUOUS":
      return "CONTROLLED_HANDOFF_CHATWOOT_SCOPE_AMBIGUOUS";
    default:
      return "CONTROLLED_HANDOFF_SCOPE_MISMATCH";
  }
}

export function createControlledHandoffPlanHash(
  handoff: HandoffRequest,
  now: Date,
  reference: ControlledHandoffConfigurationReference,
): string {
  return planHashWithReference(buildPlan(handoff, now), reference);
}
