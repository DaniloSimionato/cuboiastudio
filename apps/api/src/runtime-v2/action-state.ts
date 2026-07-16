import { createHash } from "node:crypto";
import {
  ACTION_CONTRACT_VERSION,
  createActionEventId,
  createActionId,
  createConfirmationId,
  createIdempotencyKey,
  hashActionArguments,
  isTerminalActionStatus,
  transitionActionStatus,
  validateActionRequest,
  type ActionConfirmation,
  type ActionCategory,
  type ActionEventType,
  type ActionJsonValue,
  type ActionProvenance,
  type ActionRequest,
  type ActionStatus,
  type ActionType,
  type ConfirmationPolicy,
  type EffectType,
  type FlowActionProposal,
} from "./action-contracts";
import type { RuntimeV2Scope } from "./runtime-v2.types";
import type { RuntimeV2ActionStateMode } from "./runtime-v2-feature-flag";

export const ACTION_STATE_CONTRACT_VERSION = 1 as const;
export const MAX_RECENT_TERMINAL_ACTIONS = 10;
export const MAX_RECENT_ACTION_EVENTS = 32;

export type ActionStateReason =
  | "ACTION_CREATED"
  | "CONFIRMATION_REQUIRED"
  | "NO_PENDING_ACTION"
  | "CONFIRMATION_MISMATCH"
  | "CONFIRMATION_EXPIRED"
  | "CUSTOMER_CANCELLED"
  | "SUPERSEDED_BY_NEW_ACTION"
  | "INTENT_CHANGED"
  | "CONTEXT_VERSION_CHANGED"
  | "HUMAN_TAKEOVER"
  | "ACTION_EXPIRED"
  | "PARAMETERS_CHANGED"
  | "FLOW_CHANGED"
  | "RESET_OCCURRED"
  | "AMBIGUOUS_CONFIRMATION"
  | "ACTION_STATE_SCOPE_MISMATCH"
  | "ACTION_STATE_REVISION_CONFLICT"
  | "ACTION_STATE_INVALID_TRANSITION"
  | "ACTION_STATE_IDEMPOTENCY_CONFLICT"
  | "ACTION_STATE_REDACTION_FAILURE";

export type ConfirmationState = {
  required: boolean;
  confirmationType: "CUSTOMER" | "HUMAN" | null;
  accepted: boolean;
  rejected: boolean;
  confirmationId: string | null;
  confirmingMessageId: string | null;
  confirmedAt: string | null;
};

export type ExecutionState = {
  executionPlanned: false;
  executionQueued: false;
  executionStarted: false;
  executionPerformed: false;
  externalEffectMayHaveOccurred: false;
};

export type PendingActionState = {
  contractVersion: typeof ACTION_STATE_CONTRACT_VERSION;
  actionId: string;
  actionType: ActionType;
  actionCategory: ActionCategory;
  effectType: EffectType;
  status: ActionStatus;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId: string | null;
  contextVersion: number;
  originatingInternalMessageId: string;
  flowId: string | null;
  sourceIntent: string;
  confirmationPolicy: ConfirmationPolicy;
  requiredParameters: string[];
  collectedParameterKeys: string[];
  missingParameters: string[];
  argumentsHash: string;
  idempotencyKeyHash: string;
  requestedAt: string;
  expiresAt: string;
  lastTransitionAt: string;
  confirmationState: ConfirmationState;
  executionState: ExecutionState;
  provenanceMetadata: Record<string, ActionJsonValue>;
  redactionApplied: true;
};

export type RecentTerminalAction = {
  actionId: string;
  actionType: ActionType;
  finalStatus: ActionStatus;
  argumentsHash: string;
  finalizedAt: string;
  reason: ActionStateReason;
};

export type RuntimeActionStateEvent = {
  contractVersion: typeof ACTION_STATE_CONTRACT_VERSION;
  eventId: string;
  actionId: string;
  actionType: ActionType;
  previousStatus: ActionStatus;
  nextStatus: ActionStatus;
  eventType: ActionEventType;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId: string | null;
  contextVersion: number;
  internalMessageId: string;
  timestamp: string;
  reason: ActionStateReason;
  metadata: Record<string, ActionJsonValue>;
  action?: PendingActionState | null;
};

export type RuntimeActionState = {
  contractVersion: typeof ACTION_STATE_CONTRACT_VERSION;
  activeAction: PendingActionState | null;
  recentTerminalActions: RecentTerminalAction[];
  lastActionEventId: string | null;
  updatedAt: string;
  recentActionEvents: RuntimeActionStateEvent[];
};

export type StructuredConfirmationSignal = {
  signalType: "CONFIRM" | "REJECT" | "AMBIGUOUS";
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId?: string | null;
  contextVersion: number;
  confirmingMessageId: string;
  actionId?: string | null;
  detectedAt: string;
  provenanceMetadata?: Record<string, ActionJsonValue>;
};

export type ActionStateScope = RuntimeV2Scope & {
  runtimeVersion: "V2";
  mode: "SHADOW";
};

export type ActionStateReducerContext = {
  scope: ActionStateScope;
  currentTime: Date;
};

export type ActionStateTransitionResult = {
  state: RuntimeActionState;
  event: RuntimeActionStateEvent | null;
  reason: ActionStateReason;
};

export type ActionStateProposalInput = {
  scope: ActionStateScope;
  proposal: FlowActionProposal;
  internalMessageId: string;
  currentTime: Date;
  expiresAt: string;
  normalizedArguments: Record<string, ActionJsonValue>;
  collectedParameterKeys: string[];
  missingParameters: string[];
  provenance: ActionProvenance;
};

export type ActionStateProposalResult = {
  request: ActionRequest;
  state: RuntimeActionState;
  events: RuntimeActionStateEvent[];
};

export type ActionCompatibilityInput = {
  contextVersion: number;
  turnIntent?: string | null;
  actionType?: ActionType | null;
  flowId?: string | null;
  requestedAction?: string | null;
  confirmationSignal?: StructuredConfirmationSignal["signalType"] | null;
  reset?: boolean;
  humanTakeover?: boolean;
};

export type ActionCompatibility =
  | "COMPATIBLE_CONTINUATION"
  | "PARAMETER_UPDATE"
  | "EXPLICIT_CONFIRMATION"
  | "EXPLICIT_REJECTION"
  | "UNRELATED_MESSAGE"
  | "INCOMPATIBLE_INTENT"
  | "NEW_ACTION"
  | "HUMAN_TAKEOVER"
  | "RESET";

export type ActionStateManifest = {
  actionStateMode: RuntimeV2ActionStateMode;
  activeActionPresent: boolean;
  activeActionId: string | null;
  activeActionType: ActionType | null;
  activeActionCategory: string | null;
  activeActionStatus: ActionStatus | null;
  activeActionContextVersion: number | null;
  actionAwaitingConfirmation: boolean;
  actionConfirmationType: "CUSTOMER" | "HUMAN" | null;
  actionConfirmationAccepted: boolean;
  actionConfirmationRejectedReason: ActionStateReason | null;
  actionExpired: boolean;
  actionSuperseded: boolean;
  actionIntentCompatibility: ActionCompatibility | null;
  actionMissingParameterCount: number;
  actionRequiredParameterCount: number;
  actionArgumentsHash: string | null;
  actionIdempotencyKeyHash: string | null;
  actionStateRevisionBefore: number | null;
  actionStateRevisionAfter: number | null;
  actionEventIds: string[];
  actionStatePersisted: boolean;
  actionExecutionPerformed: false;
  actionExternalEffectMayHaveOccurred: false;
  actionRedactionApplied: true;
  actionErrorCode: ActionStateReason | null;
};

function assertIso(value: string, label: string): Date {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error(`${label}_INVALID`);
  return parsed;
}

function assertScope(
  scope: ActionStateScope,
  value: {
    companyId: string;
    assistantId: string;
    conversationId: string;
    contextVersion: number;
    contactId?: string | null;
  },
): void {
  if (
    scope.companyId !== value.companyId ||
    scope.assistantId !== value.assistantId ||
    scope.conversationId !== value.conversationId ||
    scope.contextVersion !== value.contextVersion ||
    (scope.contactId ?? null) !== (value.contactId ?? null)
  ) {
    throw new Error("ACTION_STATE_SCOPE_MISMATCH");
  }
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sanitizeMetadata(
  metadata: Record<string, ActionJsonValue> | undefined,
): Record<string, ActionJsonValue> {
  const forbidden =
    /^(message|prompt|phone|email|token|secret|credential|password|payload|arguments|normalizedArguments|normalizedValue|content|value)$/i;
  const sanitize = (value: ActionJsonValue): ActionJsonValue | undefined => {
    if (typeof value === "string") return value.length <= 160 ? value : value.slice(0, 160);
    if (Array.isArray(value))
      return value.flatMap((item) => {
        const sanitized = sanitize(item);
        return sanitized === undefined ? [] : [sanitized];
      });
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).flatMap(([key, child]) => {
          if (forbidden.test(key)) return [];
          const sanitized = sanitize(child);
          return sanitized === undefined ? [] : [[key, sanitized]];
        }),
      );
    }
    return value;
  };
  return (sanitize(metadata ?? {}) as Record<string, ActionJsonValue>) ?? {};
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()))].sort();
}

function confirmationTypeForPolicy(policy: ConfirmationPolicy): "CUSTOMER" | "HUMAN" | null {
  if (policy === "EXPLICIT_CUSTOMER_CONFIRMATION" || policy === "CUSTOMER_AND_HUMAN_CONFIRMATION") {
    return "CUSTOMER";
  }
  if (policy === "EXPLICIT_HUMAN_CONFIRMATION" || policy === "FORBIDDEN_AUTOMATIC_EXECUTION") {
    return "HUMAN";
  }
  return null;
}

function isAwaitingConfirmation(status: ActionStatus): boolean {
  return status === "AWAITING_CUSTOMER_CONFIRMATION" || status === "AWAITING_HUMAN_CONFIRMATION";
}

function statusForProposal(policy: ConfirmationPolicy, missingParameters: string[]): ActionStatus {
  if (missingParameters.length > 0) return "ACTION_PROPOSED";
  if (policy === "EXPLICIT_CUSTOMER_CONFIRMATION" || policy === "CUSTOMER_AND_HUMAN_CONFIRMATION") {
    return "AWAITING_CUSTOMER_CONFIRMATION";
  }
  if (policy === "EXPLICIT_HUMAN_CONFIRMATION" || policy === "FORBIDDEN_AUTOMATIC_EXECUTION") {
    return "AWAITING_HUMAN_CONFIRMATION";
  }
  return "ACTION_PROPOSED";
}

function actionCategoryForType(actionType: ActionType): ActionCategory {
  if (actionType === "READ_AVAILABILITY" || actionType === "LIST_BOOKINGS") return "AVAILABILITY";
  if (
    actionType === "CREATE_BOOKING" ||
    actionType === "RESCHEDULE_BOOKING" ||
    actionType === "CANCEL_BOOKING"
  ) {
    return "BOOKING";
  }
  if (actionType === "CUSTOM_WEBHOOK_READ") return "EXTERNAL_LOOKUP";
  if (actionType === "CUSTOM_WEBHOOK_WRITE") return "EXTERNAL_MUTATION";
  if (actionType === "CHATWOOT_HANDOFF") return "HANDOFF";
  return "CONVERSATION_OPERATION";
}

function createEmptyExecutionState(): ExecutionState {
  return {
    executionPlanned: false,
    executionQueued: false,
    executionStarted: false,
    executionPerformed: false,
    externalEffectMayHaveOccurred: false,
  };
}

function createConfirmationState(
  policy: ConfirmationPolicy,
  status: ActionStatus,
): ConfirmationState {
  return {
    required: policy !== "NONE",
    confirmationType: isAwaitingConfirmation(status) ? confirmationTypeForPolicy(policy) : null,
    accepted: false,
    rejected: false,
    confirmationId: null,
    confirmingMessageId: null,
    confirmedAt: null,
  };
}

function pendingFromRequest(input: {
  request: ActionRequest;
  proposal: FlowActionProposal;
  collectedParameterKeys: string[];
  missingParameters: string[];
  currentTime: Date;
}): PendingActionState {
  const status = input.request.status;
  return {
    contractVersion: ACTION_STATE_CONTRACT_VERSION,
    actionId: input.request.actionId,
    actionType: input.request.actionType,
    actionCategory: input.request.actionCategory,
    effectType: input.request.effectType,
    status,
    companyId: input.request.companyId,
    assistantId: input.request.assistantId,
    conversationId: input.request.conversationId,
    contactId: input.request.contactId ?? null,
    contextVersion: input.request.contextVersion,
    originatingInternalMessageId: input.request.internalMessageId,
    flowId: input.request.flowId ?? null,
    sourceIntent: input.request.sourceIntent,
    confirmationPolicy: input.request.confirmationPolicy,
    requiredParameters: sortedUnique(input.request.requiredParameters),
    collectedParameterKeys: sortedUnique(input.collectedParameterKeys),
    missingParameters: sortedUnique(input.missingParameters),
    argumentsHash: input.request.argumentsHash,
    idempotencyKeyHash: hashValue(input.request.idempotencyKey),
    requestedAt: input.request.requestedAt,
    expiresAt: input.request.expiresAt,
    lastTransitionAt: input.currentTime.toISOString(),
    confirmationState: createConfirmationState(input.request.confirmationPolicy, status),
    executionState: createEmptyExecutionState(),
    provenanceMetadata: sanitizeMetadata({
      source: input.request.provenance.source,
      sourceMessageId: input.request.provenance.sourceMessageId ?? null,
      sourceFlowId: input.request.provenance.sourceFlowId ?? input.proposal.flowId,
      sourceVersion: input.request.provenance.sourceVersion ?? null,
      reasonCode: input.request.provenance.reasonCode ?? null,
    }),
    redactionApplied: true,
  };
}

export function createEmptyRuntimeActionState(now: Date): RuntimeActionState {
  return {
    contractVersion: ACTION_STATE_CONTRACT_VERSION,
    activeAction: null,
    recentTerminalActions: [],
    lastActionEventId: null,
    updatedAt: now.toISOString(),
    recentActionEvents: [],
  };
}

function terminalReference(
  action: PendingActionState,
  reason: ActionStateReason,
  finalizedAt: string,
): RecentTerminalAction {
  return {
    actionId: action.actionId,
    actionType: action.actionType,
    finalStatus: action.status,
    argumentsHash: action.argumentsHash,
    finalizedAt,
    reason,
  };
}

function appendEvent(
  state: RuntimeActionState,
  event: RuntimeActionStateEvent,
  currentTime: Date,
): RuntimeActionState {
  const events = [
    ...state.recentActionEvents.filter((item) => item.eventId !== event.eventId),
    event,
  ]
    .sort(
      (left, right) =>
        left.timestamp.localeCompare(right.timestamp) || left.eventId.localeCompare(right.eventId),
    )
    .slice(-MAX_RECENT_ACTION_EVENTS);
  return {
    ...state,
    lastActionEventId: event.eventId,
    updatedAt: currentTime.toISOString(),
    recentActionEvents: events,
  };
}

function eventId(input: {
  actionId: string;
  eventType: ActionEventType;
  previousStatus: ActionStatus;
  nextStatus: ActionStatus;
  timestamp: string;
}): string {
  return createActionEventId(input);
}

function makeEvent(input: {
  scope: ActionStateScope;
  action: PendingActionState;
  eventType: ActionEventType;
  previousStatus: ActionStatus;
  nextStatus: ActionStatus;
  internalMessageId: string;
  timestamp: string;
  reason: ActionStateReason;
  metadata?: Record<string, ActionJsonValue>;
  includeAction?: boolean;
}): RuntimeActionStateEvent {
  return {
    contractVersion: ACTION_STATE_CONTRACT_VERSION,
    eventId: eventId({
      actionId: input.action.actionId,
      eventType: input.eventType,
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
      timestamp: input.timestamp,
    }),
    actionId: input.action.actionId,
    actionType: input.action.actionType,
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    eventType: input.eventType,
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contactId: input.scope.contactId ?? null,
    contextVersion: input.scope.contextVersion,
    internalMessageId: input.internalMessageId,
    timestamp: input.timestamp,
    reason: input.reason,
    metadata: sanitizeMetadata(input.metadata),
    ...(input.includeAction ? { action: input.action } : {}),
  };
}

export function proposePendingAction(input: ActionStateProposalInput): ActionStateProposalResult {
  assertIso(input.expiresAt, "EXPIRES_AT");
  if (!input.internalMessageId.trim()) throw new Error("INTERNAL_MESSAGE_ID_REQUIRED");
  assertScope(input.scope, {
    ...input.scope,
    contactId: input.scope.contactId,
  });
  const argumentsHash = hashActionArguments(input.normalizedArguments);
  const idempotencyKey = createIdempotencyKey({
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contextVersion: input.scope.contextVersion,
    actionType: input.proposal.proposedActionType,
    argumentsHash,
  });
  const status = statusForProposal(input.proposal.confirmationPolicy, input.missingParameters);
  const request: ActionRequest = {
    contractVersion: ACTION_CONTRACT_VERSION,
    actionId: createActionId({
      companyId: input.scope.companyId,
      assistantId: input.scope.assistantId,
      conversationId: input.scope.conversationId,
      contextVersion: input.scope.contextVersion,
      internalMessageId: input.internalMessageId,
      actionType: input.proposal.proposedActionType,
      argumentsHash,
    }),
    actionType: input.proposal.proposedActionType,
    actionCategory: actionCategoryForType(input.proposal.proposedActionType),
    effectType:
      input.proposal.proposedActionType === "READ_AVAILABILITY" ||
      input.proposal.proposedActionType === "LIST_BOOKINGS"
        ? "READ_ONLY_EXTERNAL"
        : input.proposal.proposedActionType === "CHATWOOT_HANDOFF"
          ? "HUMAN_OPERATION"
          : "REVERSIBLE_EXTERNAL_MUTATION",
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contactId: input.scope.contactId ?? null,
    contextVersion: input.scope.contextVersion,
    internalMessageId: input.internalMessageId,
    flowId: input.proposal.flowId,
    sourceIntent: input.proposal.intent,
    requestedAt: input.currentTime.toISOString(),
    expiresAt: input.expiresAt,
    confirmationPolicy: input.proposal.confirmationPolicy,
    requiredParameters: input.proposal.requiredParameters,
    normalizedArguments: input.normalizedArguments,
    argumentsHash,
    idempotencyKey,
    executionPolicy: {
      retryPolicy: "NEVER",
      reconciliationPolicy: "NONE",
      maxAttempts: 1,
      timeoutMs: 1,
    },
    provenance: input.provenance,
    status,
  };
  const pending = pendingFromRequest({
    request,
    proposal: input.proposal,
    collectedParameterKeys: input.collectedParameterKeys,
    missingParameters: input.missingParameters,
    currentTime: input.currentTime,
  });
  validateActionRequest(request, { allowMissingParameters: input.missingParameters.length > 0 });
  const created = makeEvent({
    scope: input.scope,
    action: pending,
    eventType: "ACTION_CREATED",
    previousStatus: "ACTION_PROPOSED",
    nextStatus: status,
    internalMessageId: input.internalMessageId,
    timestamp: input.currentTime.toISOString(),
    reason: "ACTION_CREATED",
    includeAction: true,
  });
  let state = appendEvent(
    createEmptyRuntimeActionState(input.currentTime),
    created,
    input.currentTime,
  );
  const events = [created];
  if (isAwaitingConfirmation(status)) {
    const confirmationRequested = makeEvent({
      scope: input.scope,
      action: pending,
      eventType:
        pending.confirmationState.confirmationType === "HUMAN"
          ? "HUMAN_CONFIRMATION_REQUESTED"
          : "CUSTOMER_CONFIRMATION_REQUESTED",
      previousStatus: status,
      nextStatus: status,
      internalMessageId: input.internalMessageId,
      timestamp: input.currentTime.toISOString(),
      reason: "CONFIRMATION_REQUIRED",
    });
    state = appendEvent(state, confirmationRequested, input.currentTime);
    events.push(confirmationRequested);
  }
  state = { ...state, activeAction: pending };
  return { request, state, events };
}

function transitionForEvent(event: RuntimeActionStateEvent): ActionStatus {
  if (
    event.eventType === "ACTION_SUPERSEDED" ||
    event.eventType === "ACTION_INVALIDATED_BY_RESET" ||
    event.eventType === "ACTION_INVALIDATED_BY_INTENT_CHANGE"
  )
    return "CANCELLED";
  return transitionActionStatus(event.previousStatus, event.eventType);
}

export function reduceRuntimeActionState(
  currentState: RuntimeActionState,
  event: RuntimeActionStateEvent,
  context: ActionStateReducerContext,
): RuntimeActionState {
  assertScope(context.scope, event);
  assertIso(event.timestamp, "EVENT_TIMESTAMP");
  if (event.contextVersion !== context.scope.contextVersion)
    throw new Error("ACTION_STATE_SCOPE_MISMATCH");
  if (currentState.recentActionEvents.some((item) => item.eventId === event.eventId))
    return currentState;
  if (
    currentState.updatedAt &&
    new Date(event.timestamp).getTime() < new Date(currentState.updatedAt).getTime()
  ) {
    throw new Error("ACTION_STATE_EVENT_OUT_OF_ORDER");
  }
  if (event.eventType === "ACTION_CREATED") {
    if (!event.action) throw new Error("ACTION_STATE_ACTION_REQUIRED");
    if (currentState.activeAction) {
      if (
        currentState.activeAction.actionId === event.action.actionId &&
        currentState.activeAction.argumentsHash === event.action.argumentsHash
      ) {
        throw new Error("ACTION_STATE_IDEMPOTENCY_CONFLICT");
      }
      throw new Error("ACTION_STATE_ACTIVE_ACTION_EXISTS");
    }
    return appendEvent({ ...currentState, activeAction: event.action }, event, context.currentTime);
  }
  const active = currentState.activeAction;
  if (!active || active.actionId !== event.actionId)
    throw new Error("ACTION_STATE_NO_ACTIVE_ACTION");
  if (active.status !== event.previousStatus) throw new Error("ACTION_STATE_INVALID_TRANSITION");
  const nextStatus = transitionForEvent(event);
  if (nextStatus !== event.nextStatus) throw new Error("ACTION_STATE_INVALID_TRANSITION");
  const transitioned = {
    ...active,
    status: nextStatus,
    lastTransitionAt: event.timestamp,
    confirmationState: {
      ...active.confirmationState,
      accepted:
        event.eventType === "CUSTOMER_CONFIRMED" ||
        event.eventType === "HUMAN_CONFIRMED" ||
        active.confirmationState.accepted,
      rejected: event.eventType === "CONFIRMATION_REJECTED" || active.confirmationState.rejected,
    },
  } satisfies PendingActionState;
  const terminal = isTerminalActionStatus(nextStatus);
  const nextState = terminal
    ? {
        ...currentState,
        activeAction: null,
        recentTerminalActions: [
          terminalReference(transitioned, event.reason, event.timestamp),
          ...currentState.recentTerminalActions.filter(
            (item) => item.actionId !== transitioned.actionId,
          ),
        ].slice(0, MAX_RECENT_TERMINAL_ACTIONS),
      }
    : { ...currentState, activeAction: transitioned };
  return appendEvent(nextState, event, context.currentTime);
}

export function evaluateActionCompatibility(
  activeAction: PendingActionState | null,
  nextTurn: ActionCompatibilityInput,
): ActionCompatibility {
  if (nextTurn.reset) return "RESET";
  if (nextTurn.humanTakeover) return "HUMAN_TAKEOVER";
  if (nextTurn.confirmationSignal === "CONFIRM") return "EXPLICIT_CONFIRMATION";
  if (nextTurn.confirmationSignal === "REJECT") return "EXPLICIT_REJECTION";
  if (!activeAction) return nextTurn.actionType ? "NEW_ACTION" : "UNRELATED_MESSAGE";
  if (activeAction.contextVersion !== nextTurn.contextVersion) return "RESET";
  if (nextTurn.actionType && nextTurn.actionType === activeAction.actionType) {
    return nextTurn.requestedAction === "PARAMETER_UPDATE"
      ? "PARAMETER_UPDATE"
      : "COMPATIBLE_CONTINUATION";
  }
  if (
    nextTurn.requestedAction === activeAction.sourceIntent ||
    nextTurn.flowId === activeAction.flowId
  )
    return "COMPATIBLE_CONTINUATION";
  if (nextTurn.turnIntent && nextTurn.turnIntent !== activeAction.sourceIntent)
    return "INCOMPATIBLE_INTENT";
  return "UNRELATED_MESSAGE";
}

export function applyActionExpiration(
  state: RuntimeActionState,
  context: ActionStateReducerContext,
  internalMessageId: string,
): ActionStateTransitionResult {
  const active = state.activeAction;
  if (!active) return { state, event: null, reason: "NO_PENDING_ACTION" };
  if (context.currentTime.getTime() < assertIso(active.expiresAt, "EXPIRES_AT").getTime()) {
    return { state, event: null, reason: "ACTION_CREATED" };
  }
  const event = makeEvent({
    scope: context.scope,
    action: active,
    eventType: "ACTION_EXPIRED",
    previousStatus: active.status,
    nextStatus: "EXPIRED",
    internalMessageId,
    timestamp: context.currentTime.toISOString(),
    reason: "ACTION_EXPIRED",
  });
  return {
    state: reduceRuntimeActionState(state, event, context),
    event,
    reason: "ACTION_EXPIRED",
  };
}

export function applyStructuredConfirmation(
  state: RuntimeActionState,
  signal: StructuredConfirmationSignal,
  context: ActionStateReducerContext,
): {
  state: RuntimeActionState;
  event: RuntimeActionStateEvent | null;
  confirmation: ActionConfirmation | null;
  reason: ActionStateReason;
} {
  const active = state.activeAction;
  if (!active) return { state, event: null, confirmation: null, reason: "NO_PENDING_ACTION" };
  assertScope(context.scope, signal);
  if (signal.signalType === "AMBIGUOUS")
    return { state, event: null, confirmation: null, reason: "AMBIGUOUS_CONFIRMATION" };
  if (!isAwaitingConfirmation(active.status))
    return { state, event: null, confirmation: null, reason: "CONFIRMATION_MISMATCH" };
  if (signal.actionId && signal.actionId !== active.actionId)
    return { state, event: null, confirmation: null, reason: "CONFIRMATION_MISMATCH" };
  if (active.confirmationState.confirmingMessageId === signal.confirmingMessageId) {
    return { state, event: null, confirmation: null, reason: "CONFIRMATION_MISMATCH" };
  }
  if (context.currentTime.getTime() >= assertIso(active.expiresAt, "EXPIRES_AT").getTime()) {
    return { state, event: null, confirmation: null, reason: "CONFIRMATION_EXPIRED" };
  }
  const eventType: ActionEventType =
    signal.signalType === "CONFIRM"
      ? active.confirmationState.confirmationType === "HUMAN"
        ? "HUMAN_CONFIRMED"
        : "CUSTOMER_CONFIRMED"
      : "CONFIRMATION_REJECTED";
  const nextStatus = signal.signalType === "CONFIRM" ? "ACTION_CONFIRMED" : "CANCELLED";
  const event = makeEvent({
    scope: context.scope,
    action: active,
    eventType,
    previousStatus: active.status,
    nextStatus,
    internalMessageId: signal.confirmingMessageId,
    timestamp: signal.detectedAt,
    reason: signal.signalType === "CONFIRM" ? "CONFIRMATION_REQUIRED" : "CUSTOMER_CANCELLED",
    metadata: { confirmingMessageId: signal.confirmingMessageId },
  });
  const nextState = reduceRuntimeActionState(state, event, context);
  if (signal.signalType === "REJECT") {
    return {
      state: {
        ...nextState,
        recentActionEvents: nextState.recentActionEvents,
      },
      event,
      confirmation: null,
      reason: "CUSTOMER_CANCELLED",
    };
  }
  const confirmation: ActionConfirmation = {
    contractVersion: ACTION_CONTRACT_VERSION,
    confirmationId: createConfirmationId({
      actionId: active.actionId,
      confirmingMessageId: signal.confirmingMessageId,
      confirmedAt: signal.detectedAt,
    }),
    actionId: active.actionId,
    companyId: active.companyId,
    assistantId: active.assistantId,
    conversationId: active.conversationId,
    contactId: active.contactId,
    contextVersion: active.contextVersion,
    confirmingMessageId: signal.confirmingMessageId,
    confirmationType: active.confirmationState.confirmationType ?? "CUSTOMER",
    confirmedAt: signal.detectedAt,
    expiresAt: active.expiresAt,
    parametersHash: active.argumentsHash,
    status: "VALIDATED",
    provenance: {
      source: "V2_SHADOW",
      sourceMessageId: signal.confirmingMessageId,
      reasonCode: "STRUCTURED_CONFIRMATION",
    },
  };
  const confirmedAction = nextState.activeAction
    ? {
        ...nextState,
        activeAction: {
          ...nextState.activeAction,
          confirmationState: {
            ...nextState.activeAction.confirmationState,
            accepted: true,
            confirmationId: confirmation.confirmationId,
            confirmingMessageId: confirmation.confirmingMessageId,
            confirmedAt: confirmation.confirmedAt,
          },
        },
      }
    : nextState;
  return { state: confirmedAction, event, confirmation, reason: "CONFIRMATION_REQUIRED" };
}

export function invalidateAction(
  state: RuntimeActionState,
  context: ActionStateReducerContext,
  internalMessageId: string,
  eventType:
    "ACTION_SUPERSEDED" | "ACTION_INVALIDATED_BY_RESET" | "ACTION_INVALIDATED_BY_INTENT_CHANGE",
  reason:
    | "SUPERSEDED_BY_NEW_ACTION"
    | "RESET_OCCURRED"
    | "INTENT_CHANGED"
    | "PARAMETERS_CHANGED"
    | "FLOW_CHANGED"
    | "HUMAN_TAKEOVER",
): ActionStateTransitionResult {
  const active = state.activeAction;
  if (!active) return { state, event: null, reason: "NO_PENDING_ACTION" };
  const event = makeEvent({
    scope: context.scope,
    action: active,
    eventType,
    previousStatus: active.status,
    nextStatus: "CANCELLED",
    internalMessageId,
    timestamp: context.currentTime.toISOString(),
    reason,
  });
  return { state: reduceRuntimeActionState(state, event, context), event, reason };
}

export function redactRuntimeActionState(state: RuntimeActionState): RuntimeActionState {
  const redacted: RuntimeActionState = {
    contractVersion: ACTION_STATE_CONTRACT_VERSION,
    activeAction: state.activeAction
      ? {
          ...state.activeAction,
          provenanceMetadata: sanitizeMetadata(state.activeAction.provenanceMetadata),
          requiredParameters: sortedUnique(state.activeAction.requiredParameters),
          collectedParameterKeys: sortedUnique(state.activeAction.collectedParameterKeys),
          missingParameters: sortedUnique(state.activeAction.missingParameters),
          redactionApplied: true,
        }
      : null,
    recentTerminalActions: state.recentTerminalActions.slice(0, MAX_RECENT_TERMINAL_ACTIONS),
    lastActionEventId: state.lastActionEventId,
    updatedAt: assertIso(state.updatedAt, "ACTION_STATE_UPDATED_AT").toISOString(),
    recentActionEvents: state.recentActionEvents.slice(-MAX_RECENT_ACTION_EVENTS).map((event) => ({
      ...event,
      metadata: sanitizeMetadata(event.metadata),
      ...(event.action
        ? {
            action: redactRuntimeActionState({
              contractVersion: ACTION_STATE_CONTRACT_VERSION,
              activeAction: event.action,
              recentTerminalActions: [],
              lastActionEventId: null,
              updatedAt: event.timestamp,
              recentActionEvents: [],
            }).activeAction,
          }
        : {}),
    })),
  };
  return redacted;
}

export function buildActionStateManifest(input: {
  mode: RuntimeV2ActionStateMode;
  before: RuntimeActionState | null | undefined;
  after: RuntimeActionState | null | undefined;
  revisionBefore: number | null;
  revisionAfter: number | null;
  compatibility?: ActionCompatibility | null;
  persisted: boolean;
  errorCode?: ActionStateReason | null;
}): ActionStateManifest {
  const active = input.after?.activeAction ?? null;
  const previous = input.before?.activeAction ?? null;
  const terminalReference = previous
    ? (input.after?.recentTerminalActions.find((item) => item.actionId === previous.actionId) ??
      null)
    : null;
  const terminalized = Boolean(previous && !active && terminalReference);
  return {
    actionStateMode: input.mode,
    activeActionPresent: Boolean(active),
    activeActionId: active?.actionId ?? null,
    activeActionType: active?.actionType ?? null,
    activeActionCategory: active?.actionCategory ?? null,
    activeActionStatus: active?.status ?? null,
    activeActionContextVersion: active?.contextVersion ?? null,
    actionAwaitingConfirmation: Boolean(active && isAwaitingConfirmation(active.status)),
    actionConfirmationType: active?.confirmationState.confirmationType ?? null,
    actionConfirmationAccepted: Boolean(active?.confirmationState.accepted),
    actionConfirmationRejectedReason:
      terminalized && terminalReference?.reason === "CUSTOMER_CANCELLED"
        ? "CUSTOMER_CANCELLED"
        : null,
    actionExpired: Boolean(terminalized && terminalReference?.finalStatus === "EXPIRED"),
    actionSuperseded: Boolean(
      terminalized &&
      terminalReference?.finalStatus === "CANCELLED" &&
      terminalReference.reason !== "CUSTOMER_CANCELLED",
    ),
    actionIntentCompatibility: input.compatibility ?? null,
    actionMissingParameterCount: active?.missingParameters.length ?? 0,
    actionRequiredParameterCount: active?.requiredParameters.length ?? 0,
    actionArgumentsHash: active?.argumentsHash ?? previous?.argumentsHash ?? null,
    actionIdempotencyKeyHash: active?.idempotencyKeyHash ?? previous?.idempotencyKeyHash ?? null,
    actionStateRevisionBefore: input.revisionBefore,
    actionStateRevisionAfter: input.revisionAfter,
    actionEventIds: (input.after?.recentActionEvents ?? []).map((event) => event.eventId).sort(),
    actionStatePersisted: input.persisted,
    actionExecutionPerformed: false,
    actionExternalEffectMayHaveOccurred: false,
    actionRedactionApplied: true,
    actionErrorCode: input.errorCode ?? null,
  };
}
