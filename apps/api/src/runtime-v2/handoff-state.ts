import { createHash } from "node:crypto";
import type { ActionJsonValue, ActionProvenance } from "./action-contracts";
import type { RuntimeV2Scope } from "./runtime-v2.types";

export const HANDOFF_CONTRACT_VERSION = 1 as const;
export const MAX_RECENT_TERMINAL_HANDOFFS = 10;
export const MAX_RECENT_HANDOFF_EVENT_IDS = 32;

export type HandoffReasonCode =
  | "CUSTOMER_REQUESTED_HUMAN"
  | "LOW_CONFIDENCE"
  | "UNSUPPORTED_REQUEST"
  | "AUTHORITY_CONFLICT"
  | "MISSING_AUTHORITATIVE_INFORMATION"
  | "TOOL_REQUIRED_BUT_UNAVAILABLE"
  | "TOOL_FAILED"
  | "REPEATED_FAILURE"
  | "SENSITIVE_OPERATION"
  | "COMMERCIAL_EXCEPTION"
  | "BUSINESS_RULE"
  | "FLOW_REQUIRED_HANDOFF"
  | "HUMAN_ALREADY_ACTIVE"
  | "MANUAL_OPERATOR_REQUEST"
  | "SAFETY_POLICY"
  | "OTHER_STRUCTURED_REASON";

export type HandoffUrgency = "NORMAL" | "HIGH" | "CRITICAL";
export type HandoffTargetType =
  "ANY_HUMAN" | "TEAM" | "AGENT" | "SPECIALIZED_QUEUE" | "EXISTING_ASSIGNEE";

export type HandoffStatus =
  | "HANDOFF_PROPOSED"
  | "HANDOFF_READY"
  | "HANDOFF_EXECUTION_PENDING"
  | "HANDOFF_EXECUTING"
  | "HANDOFF_SUCCEEDED"
  | "HANDOFF_FAILED"
  | "HANDOFF_CANCELLED"
  | "HANDOFF_EXPIRED"
  | "HANDOFF_RECONCILIATION_REQUIRED"
  | "HANDOFF_SUPERSEDED";

export type HandoffEventType =
  | "HANDOFF_PROPOSED"
  | "HANDOFF_READY"
  | "HANDOFF_CANCELLED"
  | "HANDOFF_EXPIRED"
  | "HANDOFF_SUPERSEDED"
  | "HANDOFF_INVALIDATED_BY_RESET"
  | "HANDOFF_INVALIDATED_BY_CONTEXT_CHANGE"
  | "HANDOFF_HUMAN_ALREADY_ACTIVE"
  | "HANDOFF_OBSERVATION_RECEIVED"
  | "HANDOFF_EXECUTION_PENDING"
  | "HANDOFF_EXECUTION_STARTED"
  | "HANDOFF_EXECUTION_SUCCEEDED"
  | "HANDOFF_EXECUTION_FAILED"
  | "HANDOFF_EXECUTION_TIMED_OUT"
  | "HANDOFF_RECONCILIATION_STARTED"
  | "HANDOFF_RECONCILIATION_SUCCEEDED"
  | "HANDOFF_RECONCILIATION_FAILED";

export type HandoffCompatibility =
  | "SAME_HANDOFF"
  | "HANDOFF_STILL_REQUIRED"
  | "CUSTOMER_CANCELLED"
  | "HUMAN_ALREADY_ACTIVE"
  | "ISSUE_RESOLVED"
  | "INCOMPATIBLE_INTENT"
  | "CONTEXT_VERSION_CHANGED"
  | "RESET_OCCURRED"
  | "NEW_HANDOFF"
  | "UNRELATED_MESSAGE";

export type HandoffRequest = {
  contractVersion: typeof HANDOFF_CONTRACT_VERSION;
  handoffId: string;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId: string | null;
  contextVersion: number;
  originatingInternalMessageId: string;
  actionId: string | null;
  flowId: string | null;
  sourceIntent: string;
  reasonCode: HandoffReasonCode;
  urgency: HandoffUrgency;
  requestedTargetType: HandoffTargetType;
  requestedTargetIdHash: string | null;
  customerRequested: boolean;
  humanConfirmationRequired: boolean;
  collectedContextKeys: string[];
  contextHash: string;
  requestedAt: string;
  expiresAt: string | null;
  idempotencyKey: string;
  status: HandoffStatus;
  provenance: ActionProvenance;
  redactionApplied: true;
};

export type V1HandoffObservation = {
  contractVersion: typeof HANDOFF_CONTRACT_VERSION;
  observationId: string;
  observationSource: "V1_PIPELINE";
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId: string | null;
  contextVersion: number;
  internalMessageId: string;
  actionId?: string | null;
  flowId: string | null;
  handoffPendingObserved: boolean;
  reasonCode: HandoffReasonCode | null;
  customerRequested: boolean;
  humanActiveObserved: boolean;
  aiActiveObserved: boolean;
  pausedByHumanObserved: boolean;
  requestedTargetType: HandoffTargetType;
  requestedTargetIdHash: string | null;
  collectedContextKeys: string[];
  contextHash: string;
  observedAt: string;
  provenance: ActionProvenance;
  redactionApplied: true;
};

export type RecentTerminalHandoff = {
  handoffId: string;
  reasonCode: HandoffReasonCode;
  finalStatus: HandoffStatus;
  finalizedAt: string;
  targetType: HandoffTargetType;
  reason: HandoffReasonCode;
};

export type RuntimeHandoffState = {
  contractVersion: typeof HANDOFF_CONTRACT_VERSION;
  activeHandoff: HandoffRequest | null;
  recentTerminalHandoffs: RecentTerminalHandoff[];
  lastHandoffEventId: string | null;
  updatedAt: string;
  recentHandoffEventIds: string[];
  recentHandoffEvents: HandoffStateEvent[];
};

export type HandoffStateScope = RuntimeV2Scope & {
  runtimeVersion: "V2";
  mode: "SHADOW";
};

export type HandoffStateEvent = {
  contractVersion: typeof HANDOFF_CONTRACT_VERSION;
  eventId: string;
  handoffId: string;
  previousStatus: HandoffStatus;
  nextStatus: HandoffStatus;
  eventType: HandoffEventType;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId: string | null;
  contextVersion: number;
  internalMessageId: string;
  timestamp: string;
  reasonCode: HandoffReasonCode;
  metadata: Record<string, ActionJsonValue>;
  handoff?: HandoffRequest | null;
};

export type HandoffStateContext = {
  scope: HandoffStateScope;
  currentTime: Date;
};

export type HandoffObservationInput = Omit<
  V1HandoffObservation,
  "contractVersion" | "observationId" | "observationSource" | "observedAt" | "redactionApplied"
> & {
  observedAt?: Date;
};

export type HandoffTurnInput = {
  scope: HandoffStateScope;
  state?: RuntimeHandoffState | null;
  observation: V1HandoffObservation | null;
  currentTime: Date;
  actionId?: string | null;
  reset?: boolean;
  internalMessageId?: string;
};

export type HandoffTurnResult = {
  state: RuntimeHandoffState;
  before: RuntimeHandoffState | null;
  after: RuntimeHandoffState;
  events: HandoffStateEvent[];
  compatibility: HandoffCompatibility | null;
  request: HandoffRequest | null;
  observation: V1HandoffObservation | null;
  errorCode: string | null;
};

export type HandoffStateManifest = {
  handoffStateMode: "OFF" | "SHADOW_STATE";
  v1HandoffObservationReceived: boolean;
  handoffObservationId: string | null;
  activeHandoffPresent: boolean;
  activeHandoffId: string | null;
  activeHandoffStatus: HandoffStatus | null;
  handoffReasonCode: HandoffReasonCode | null;
  handoffUrgency: HandoffUrgency | null;
  handoffRequestedTargetType: HandoffTargetType | null;
  handoffCustomerRequested: boolean;
  handoffHumanActiveObserved: boolean;
  handoffAiActiveObserved: boolean;
  handoffPausedByHumanObserved: boolean;
  handoffActionId: string | null;
  handoffContextVersion: number | null;
  handoffCompatibility: HandoffCompatibility | null;
  handoffStateRevisionBefore: number | null;
  handoffStateRevisionAfter: number | null;
  handoffEventIds: string[];
  handoffStatePersisted: boolean;
  handoffExecutionPerformed: false;
  chatwootMutationPerformed: false;
  labelApplied: false;
  assignmentChanged: false;
  conversationStatusChanged: false;
  aiActiveChanged: false;
  outboundSent: false;
  handoffRedactionApplied: true;
  handoffErrorCode: string | null;
  handoffExecutionMode: "OFF" | "CONTROLLED";
  handoffExecutionEligible: boolean;
  handoffExecutionId: string | null;
  handoffExecutionAttempt: number | null;
  handoffExecutionStatus: string | null;
  handoffExecutionReasonAuthorized: boolean;
  handoffExecutionAssistantAllowlisted: boolean;
  handoffExecutionConversationAllowlisted: boolean;
  handoffPreconditionsValid: boolean;
  handoffConversationVerified: boolean;
  handoffHumanAlreadyActive: boolean;
  handoffAiActiveBefore: boolean | null;
  handoffAiActiveAfter: boolean | null;
  handoffPauseAiAttempted: boolean;
  handoffPauseAiConfirmed: boolean;
  handoffLabelConfigured: boolean;
  handoffLabelApplied: boolean;
  handoffAssignmentConfigured: boolean;
  handoffAssignmentChanged: boolean;
  handoffFinalStateVerified: boolean;
  handoffPartialMutation: boolean;
  handoffExternalEffectMayHaveOccurred: boolean;
  handoffReconciliationStatus: string | null;
  handoffExecutionPersisted: boolean;
  handoffExecutionRedactionApplied: boolean;
  handoffAdapterMode: "OFF" | "CHATWOOT_CONTROLLED";
  operationalAdapterEligible: boolean;
  operationalAdapterResolved: boolean;
  chatwootConfigurationResolved: boolean;
  chatwootScopeValidated: boolean;
  chatwootConversationReadAttempted: boolean;
  chatwootConversationReadSucceeded: boolean;
  chatwootAiActiveBefore: boolean | null;
  chatwootPauseAiAttempted: boolean;
  chatwootPauseAiHttpOutcome: string | null;
  chatwootFinalVerificationAttempted: boolean;
  chatwootFinalVerificationStatus: string | null;
  chatwootAiActiveAfter: boolean | null;
  chatwootReconciliationReadOnly: boolean;
  chatwootExternalEffectMayHaveOccurred: boolean;
  chatwootAdapterErrorCode: string | null;
  chatwootPayloadPersisted: false;
  chatwootTokenPersisted: false;
  chatwootMessageSent: false;
  chatwootLabelApplied: false;
  chatwootAssignmentChanged: false;
  chatwootStatusChanged: false;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function hashParts(parts: unknown[]): string {
  return createHash("sha256").update(stableJson(parts)).digest("hex");
}

function assertIso(value: string, label: string): Date {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error(`${label}_INVALID`);
  return parsed;
}

function assertScope(
  scope: HandoffStateScope,
  value: Pick<
    HandoffRequest,
    "companyId" | "assistantId" | "conversationId" | "contextVersion" | "contactId"
  >,
): void {
  if (
    scope.companyId !== value.companyId ||
    scope.assistantId !== value.assistantId ||
    scope.conversationId !== value.conversationId ||
    scope.contextVersion !== value.contextVersion ||
    (scope.contactId ?? null) !== (value.contactId ?? null)
  ) {
    throw new Error("HANDOFF_SCOPE_MISMATCH");
  }
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()))].sort();
}

function sanitizeMetadata(
  metadata: Record<string, ActionJsonValue> | undefined,
): Record<string, ActionJsonValue> {
  const forbidden =
    /^(message|prompt|phone|email|token|secret|credential|password|payload|content|value|summary|label|name)$/i;
  const sanitize = (value: ActionJsonValue): ActionJsonValue | undefined => {
    if (typeof value === "string") return value.length <= 160 ? value : value.slice(0, 160);
    if (Array.isArray(value)) {
      return value.flatMap((item) => {
        const next = sanitize(item);
        return next === undefined ? [] : [next];
      });
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).flatMap(([key, child]) => {
          if (forbidden.test(key)) return [];
          const next = sanitize(child);
          return next === undefined ? [] : [[key, next]];
        }),
      );
    }
    return value;
  };
  return (sanitize(metadata ?? {}) as Record<string, ActionJsonValue>) ?? {};
}

export function createHandoffId(input: {
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  originatingInternalMessageId: string;
  reasonCode: HandoffReasonCode;
  requestedTargetType: HandoffTargetType;
  actionId?: string | null;
  contextHash: string;
}): string {
  return hashParts([
    input.companyId,
    input.assistantId,
    input.conversationId,
    input.contextVersion,
    input.originatingInternalMessageId,
    input.reasonCode,
    input.requestedTargetType,
    input.actionId ?? null,
    input.contextHash,
  ]);
}

export function createHandoffObservationId(input: {
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  internalMessageId: string;
  flowId?: string | null;
  handoffPendingObserved: boolean;
  reasonCode?: HandoffReasonCode | null;
  contextHash: string;
}): string {
  return hashParts([
    input.companyId,
    input.assistantId,
    input.conversationId,
    input.contextVersion,
    input.internalMessageId,
    input.flowId ?? null,
    input.handoffPendingObserved,
    input.reasonCode ?? null,
    input.contextHash,
  ]);
}

export function createHandoffContextHash(input: {
  collectedContextKeys: string[];
  reasonCode: HandoffReasonCode | null;
  requestedTargetType: HandoffTargetType;
}): string {
  return hashParts([
    sortedUnique(input.collectedContextKeys),
    input.reasonCode,
    input.requestedTargetType,
  ]);
}

export function createV1HandoffObservation(input: HandoffObservationInput): V1HandoffObservation {
  if (!input.internalMessageId.trim()) throw new Error("INTERNAL_MESSAGE_ID_REQUIRED");
  if (!input.companyId || !input.assistantId || !input.conversationId) {
    throw new Error("HANDOFF_SCOPE_REQUIRED");
  }
  if (!Number.isInteger(input.contextVersion) || input.contextVersion < 0) {
    throw new Error("HANDOFF_CONTEXT_VERSION_INVALID");
  }
  const contextHash =
    input.contextHash ||
    createHandoffContextHash({
      collectedContextKeys: input.collectedContextKeys,
      reasonCode: input.reasonCode,
      requestedTargetType: input.requestedTargetType,
    });
  const observationId = createHandoffObservationId({
    companyId: input.companyId,
    assistantId: input.assistantId,
    conversationId: input.conversationId,
    contextVersion: input.contextVersion,
    internalMessageId: input.internalMessageId,
    flowId: input.flowId,
    handoffPendingObserved: input.handoffPendingObserved,
    reasonCode: input.reasonCode,
    contextHash,
  });
  return {
    ...input,
    contractVersion: HANDOFF_CONTRACT_VERSION,
    observationSource: "V1_PIPELINE",
    observationId,
    collectedContextKeys: sortedUnique(input.collectedContextKeys),
    contextHash,
    observedAt: (input.observedAt ?? new Date()).toISOString(),
    requestedTargetIdHash: input.requestedTargetIdHash ?? null,
    contactId: input.contactId ?? null,
    provenance: {
      source: "V1_PIPELINE",
      sourceMessageId: input.internalMessageId,
      sourceFlowId: input.flowId ?? null,
      sourceVersion: "handoff-v1-observation",
      reasonCode: input.reasonCode,
    },
    redactionApplied: true,
  };
}

export function createHandoffRequestFromObservation(input: {
  scope: HandoffStateScope;
  observation: V1HandoffObservation;
  currentTime: Date;
  actionId?: string | null;
  expiresAt?: string | null;
}): HandoffRequest | null {
  const observation = input.observation;
  assertScope(input.scope, observation);
  if (
    !observation.handoffPendingObserved &&
    !observation.customerRequested &&
    !observation.humanActiveObserved
  ) {
    return null;
  }
  const reasonCode =
    observation.reasonCode ??
    (observation.humanActiveObserved ? "HUMAN_ALREADY_ACTIVE" : "OTHER_STRUCTURED_REASON");
  const handoffId = createHandoffId({
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contextVersion: input.scope.contextVersion,
    originatingInternalMessageId: observation.internalMessageId,
    reasonCode,
    requestedTargetType: observation.requestedTargetType,
    actionId: input.actionId ?? null,
    contextHash: observation.contextHash,
  });
  const status: HandoffStatus = observation.humanActiveObserved
    ? "HANDOFF_CANCELLED"
    : "HANDOFF_READY";
  return {
    contractVersion: HANDOFF_CONTRACT_VERSION,
    handoffId,
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contactId: input.scope.contactId ?? null,
    contextVersion: input.scope.contextVersion,
    originatingInternalMessageId: observation.internalMessageId,
    actionId: input.actionId ?? null,
    flowId: observation.flowId,
    sourceIntent: observation.customerRequested ? "CUSTOMER_REQUESTED_HUMAN" : reasonCode,
    reasonCode,
    urgency: "NORMAL",
    requestedTargetType: observation.requestedTargetType,
    requestedTargetIdHash: observation.requestedTargetIdHash,
    customerRequested: observation.customerRequested,
    humanConfirmationRequired: false,
    collectedContextKeys: sortedUnique(observation.collectedContextKeys),
    contextHash: observation.contextHash,
    requestedAt: input.currentTime.toISOString(),
    expiresAt: input.expiresAt ?? null,
    idempotencyKey: hashParts(["handoff", handoffId, observation.contextHash]),
    status,
    provenance: observation.provenance,
    redactionApplied: true,
  };
}

export function createEmptyRuntimeHandoffState(now: Date): RuntimeHandoffState {
  return {
    contractVersion: HANDOFF_CONTRACT_VERSION,
    activeHandoff: null,
    recentTerminalHandoffs: [],
    lastHandoffEventId: null,
    updatedAt: now.toISOString(),
    recentHandoffEventIds: [],
    recentHandoffEvents: [],
  };
}

const TERMINAL_HANDOFF_STATUSES = new Set<HandoffStatus>([
  "HANDOFF_SUCCEEDED",
  "HANDOFF_FAILED",
  "HANDOFF_CANCELLED",
  "HANDOFF_EXPIRED",
  "HANDOFF_RECONCILIATION_REQUIRED",
  "HANDOFF_SUPERSEDED",
]);

export function isTerminalHandoffStatus(status: HandoffStatus): boolean {
  return TERMINAL_HANDOFF_STATUSES.has(status);
}

export function transitionHandoffStatus(
  currentStatus: HandoffStatus,
  event: HandoffEventType,
): HandoffStatus {
  if (event === "HANDOFF_PROPOSED") {
    if (currentStatus === "HANDOFF_PROPOSED") return "HANDOFF_PROPOSED";
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_OBSERVATION_RECEIVED") {
    if (currentStatus === "HANDOFF_PROPOSED" || currentStatus === "HANDOFF_READY") {
      return currentStatus;
    }
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_READY") {
    if (currentStatus === "HANDOFF_PROPOSED") return "HANDOFF_READY";
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_CANCELLED" || event === "HANDOFF_HUMAN_ALREADY_ACTIVE") {
    if (currentStatus === "HANDOFF_PROPOSED" || currentStatus === "HANDOFF_READY") {
      return "HANDOFF_CANCELLED";
    }
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_EXPIRED") {
    if (currentStatus === "HANDOFF_PROPOSED" || currentStatus === "HANDOFF_READY") {
      return "HANDOFF_EXPIRED";
    }
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_SUPERSEDED") {
    if (currentStatus === "HANDOFF_PROPOSED" || currentStatus === "HANDOFF_READY") {
      return "HANDOFF_SUPERSEDED";
    }
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_EXECUTION_PENDING") {
    if (currentStatus === "HANDOFF_READY") return "HANDOFF_EXECUTION_PENDING";
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_EXECUTION_STARTED") {
    if (currentStatus === "HANDOFF_EXECUTION_PENDING") return "HANDOFF_EXECUTING";
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_EXECUTION_SUCCEEDED") {
    if (currentStatus === "HANDOFF_EXECUTING") return "HANDOFF_SUCCEEDED";
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_EXECUTION_FAILED") {
    if (currentStatus === "HANDOFF_EXECUTING") return "HANDOFF_FAILED";
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_EXECUTION_TIMED_OUT") {
    if (currentStatus === "HANDOFF_EXECUTING") return "HANDOFF_RECONCILIATION_REQUIRED";
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_RECONCILIATION_STARTED") {
    if (currentStatus === "HANDOFF_RECONCILIATION_REQUIRED") {
      return "HANDOFF_RECONCILIATION_REQUIRED";
    }
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_RECONCILIATION_SUCCEEDED") {
    if (currentStatus === "HANDOFF_RECONCILIATION_REQUIRED") return "HANDOFF_SUCCEEDED";
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (event === "HANDOFF_RECONCILIATION_FAILED") {
    if (currentStatus === "HANDOFF_RECONCILIATION_REQUIRED") return "HANDOFF_FAILED";
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  if (
    event === "HANDOFF_INVALIDATED_BY_RESET" ||
    event === "HANDOFF_INVALIDATED_BY_CONTEXT_CHANGE"
  ) {
    if (currentStatus === "HANDOFF_PROPOSED" || currentStatus === "HANDOFF_READY") {
      return "HANDOFF_CANCELLED";
    }
    throw new Error("HANDOFF_INVALID_TRANSITION");
  }
  throw new Error("HANDOFF_INVALID_TRANSITION");
}

function terminalReference(handoff: HandoffRequest, reason: HandoffReasonCode, timestamp: string) {
  return {
    handoffId: handoff.handoffId,
    reasonCode: handoff.reasonCode,
    finalStatus: handoff.status,
    finalizedAt: timestamp,
    targetType: handoff.requestedTargetType,
    reason,
  } satisfies RecentTerminalHandoff;
}

function makeEvent(input: {
  scope: HandoffStateScope;
  handoff: HandoffRequest;
  eventType: HandoffEventType;
  previousStatus: HandoffStatus;
  nextStatus: HandoffStatus;
  internalMessageId: string;
  timestamp: string;
  reasonCode: HandoffReasonCode;
  metadata?: Record<string, ActionJsonValue>;
  includeHandoff?: boolean;
}): HandoffStateEvent {
  return {
    contractVersion: HANDOFF_CONTRACT_VERSION,
    eventId: hashParts([
      input.handoff.handoffId,
      input.eventType,
      input.previousStatus,
      input.nextStatus,
      input.internalMessageId,
      input.timestamp,
    ]),
    handoffId: input.handoff.handoffId,
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
    reasonCode: input.reasonCode,
    metadata: sanitizeMetadata(input.metadata),
    ...(input.includeHandoff ? { handoff: input.handoff } : {}),
  };
}

function appendEvent(
  state: RuntimeHandoffState,
  event: HandoffStateEvent,
  currentTime: Date,
): RuntimeHandoffState {
  return {
    ...state,
    lastHandoffEventId: event.eventId,
    updatedAt: currentTime.toISOString(),
    recentHandoffEventIds: [
      ...state.recentHandoffEventIds.filter((id) => id !== event.eventId),
      event.eventId,
    ].slice(-MAX_RECENT_HANDOFF_EVENT_IDS),
    recentHandoffEvents: [
      ...state.recentHandoffEvents.filter((item) => item.eventId !== event.eventId),
      event,
    ].slice(-MAX_RECENT_HANDOFF_EVENT_IDS),
  };
}

export function reduceRuntimeHandoffState(
  currentState: RuntimeHandoffState,
  event: HandoffStateEvent,
  context: HandoffStateContext,
): RuntimeHandoffState {
  if (
    event.companyId !== context.scope.companyId ||
    event.assistantId !== context.scope.assistantId ||
    event.conversationId !== context.scope.conversationId ||
    event.contextVersion !== context.scope.contextVersion ||
    (event.contactId ?? null) !== (context.scope.contactId ?? null)
  ) {
    throw new Error("HANDOFF_SCOPE_MISMATCH");
  }
  assertIso(event.timestamp, "HANDOFF_EVENT_TIMESTAMP");
  if (currentState.recentHandoffEventIds.includes(event.eventId)) return currentState;

  if (event.eventType === "HANDOFF_PROPOSED") {
    if (!event.handoff) throw new Error("HANDOFF_REQUEST_REQUIRED");
    assertScope(context.scope, event.handoff);
    if (currentState.activeHandoff) {
      if (
        currentState.activeHandoff.handoffId === event.handoff.handoffId &&
        currentState.activeHandoff.contextHash === event.handoff.contextHash
      ) {
        return appendEvent(currentState, event, context.currentTime);
      }
      throw new Error("HANDOFF_IDEMPOTENCY_CONFLICT");
    }
    return appendEvent(
      { ...currentState, activeHandoff: { ...event.handoff, status: "HANDOFF_PROPOSED" } },
      event,
      context.currentTime,
    );
  }

  const active = currentState.activeHandoff;
  if (!active || active.handoffId !== event.handoffId) {
    throw new Error("HANDOFF_NO_ACTIVE_HANDOFF");
  }
  if (active.status !== event.previousStatus) throw new Error("HANDOFF_INVALID_TRANSITION");
  const nextStatus = transitionHandoffStatus(active.status, event.eventType);
  if (nextStatus !== event.nextStatus) throw new Error("HANDOFF_INVALID_TRANSITION");
  const transitioned = { ...active, status: nextStatus };
  if (isTerminalHandoffStatus(nextStatus)) {
    return appendEvent(
      {
        ...currentState,
        activeHandoff: null,
        recentTerminalHandoffs: [
          terminalReference(transitioned, event.reasonCode, event.timestamp),
          ...currentState.recentTerminalHandoffs.filter(
            (item) => item.handoffId !== transitioned.handoffId,
          ),
        ].slice(0, MAX_RECENT_TERMINAL_HANDOFFS),
      },
      event,
      context.currentTime,
    );
  }
  return appendEvent({ ...currentState, activeHandoff: transitioned }, event, context.currentTime);
}

export function evaluateHandoffCompatibility(
  activeHandoff: HandoffRequest | null,
  nextTurn: {
    contextVersion: number;
    handoffRequested?: boolean;
    customerCancelled?: boolean;
    humanActive?: boolean;
    issueResolved?: boolean;
    reset?: boolean;
    reasonCode?: HandoffReasonCode | null;
    requestedTargetType?: HandoffTargetType | null;
    contextHash?: string | null;
  },
): HandoffCompatibility {
  if (nextTurn.reset) return "RESET_OCCURRED";
  if (nextTurn.contextVersion !== (activeHandoff?.contextVersion ?? nextTurn.contextVersion)) {
    return activeHandoff ? "CONTEXT_VERSION_CHANGED" : "NEW_HANDOFF";
  }
  if (nextTurn.humanActive) return "HUMAN_ALREADY_ACTIVE";
  if (nextTurn.customerCancelled) return "CUSTOMER_CANCELLED";
  if (nextTurn.issueResolved) return activeHandoff ? "ISSUE_RESOLVED" : "UNRELATED_MESSAGE";
  if (!activeHandoff) return nextTurn.handoffRequested ? "NEW_HANDOFF" : "UNRELATED_MESSAGE";
  if (!nextTurn.handoffRequested) return "UNRELATED_MESSAGE";
  if (
    (nextTurn.reasonCode ?? activeHandoff.reasonCode) === activeHandoff.reasonCode &&
    (nextTurn.requestedTargetType ?? activeHandoff.requestedTargetType) ===
      activeHandoff.requestedTargetType &&
    (nextTurn.contextHash ?? activeHandoff.contextHash) === activeHandoff.contextHash
  ) {
    return "SAME_HANDOFF";
  }
  return "INCOMPATIBLE_INTENT";
}

function addTerminal(
  state: RuntimeHandoffState,
  handoff: HandoffRequest,
  reasonCode: HandoffReasonCode,
  status: HandoffStatus,
  timestamp: string,
): RuntimeHandoffState {
  return {
    ...state,
    activeHandoff: null,
    recentTerminalHandoffs: [
      {
        handoffId: handoff.handoffId,
        reasonCode: handoff.reasonCode,
        finalStatus: status,
        finalizedAt: timestamp,
        targetType: handoff.requestedTargetType,
        reason: reasonCode,
      },
      ...state.recentTerminalHandoffs.filter((item) => item.handoffId !== handoff.handoffId),
    ].slice(0, MAX_RECENT_TERMINAL_HANDOFFS),
  };
}

export function applyHandoffExpiration(
  state: RuntimeHandoffState,
  context: HandoffStateContext,
  internalMessageId: string,
): { state: RuntimeHandoffState; event: HandoffStateEvent | null } {
  const active = state.activeHandoff;
  if (!active || !active.expiresAt) return { state, event: null };
  if (context.currentTime.getTime() < assertIso(active.expiresAt, "HANDOFF_EXPIRES_AT").getTime()) {
    return { state, event: null };
  }
  const event = makeEvent({
    scope: context.scope,
    handoff: active,
    eventType: "HANDOFF_EXPIRED",
    previousStatus: active.status,
    nextStatus: "HANDOFF_EXPIRED",
    internalMessageId,
    timestamp: context.currentTime.toISOString(),
    reasonCode: "OTHER_STRUCTURED_REASON",
  });
  return { state: reduceRuntimeHandoffState(state, event, context), event };
}

export function applyHandoffTurn(input: HandoffTurnInput): HandoffTurnResult {
  let state = input.state ?? createEmptyRuntimeHandoffState(input.currentTime);
  const before = state;
  const initialState = state;
  const context: HandoffStateContext = { scope: input.scope, currentTime: input.currentTime };
  const events: HandoffStateEvent[] = [];
  let compatibility: HandoffCompatibility | null = null;
  let request: HandoffRequest | null = null;
  try {
    if (state.activeHandoff) assertScope(input.scope, state.activeHandoff);
    const expiration = applyHandoffExpiration(
      state,
      context,
      input.observation?.internalMessageId ?? input.internalMessageId ?? "handoff-expiration",
    );
    state = expiration.state;
    if (expiration.event) events.push(expiration.event);

    const observation = input.observation;
    if (input.reset && state.activeHandoff) {
      const active = state.activeHandoff;
      const event = makeEvent({
        scope: input.scope,
        handoff: active,
        eventType: "HANDOFF_INVALIDATED_BY_RESET",
        previousStatus: active.status,
        nextStatus: "HANDOFF_CANCELLED",
        internalMessageId:
          observation?.internalMessageId ?? input.internalMessageId ?? "handoff-reset",
        timestamp: input.currentTime.toISOString(),
        reasonCode: "OTHER_STRUCTURED_REASON",
      });
      state = reduceRuntimeHandoffState(state, event, context);
      events.push(event);
    }
    if (!observation) {
      return {
        state,
        before: initialState,
        after: state,
        events,
        compatibility,
        request,
        observation,
        errorCode: null,
      };
    }
    request = createHandoffRequestFromObservation({
      scope: input.scope,
      observation,
      currentTime: input.currentTime,
      actionId: input.actionId,
    });
    compatibility = evaluateHandoffCompatibility(state.activeHandoff, {
      contextVersion: input.scope.contextVersion,
      handoffRequested: Boolean(request),
      humanActive: observation.humanActiveObserved,
      reasonCode: request?.reasonCode,
      requestedTargetType: request?.requestedTargetType,
      contextHash: request?.contextHash,
      reset: input.reset,
    });

    if (!request) {
      return {
        state,
        before: initialState,
        after: state,
        events,
        compatibility,
        request,
        observation,
        errorCode: null,
      };
    }
    if (observation.humanActiveObserved) {
      if (state.activeHandoff) {
        const active = state.activeHandoff;
        const event = makeEvent({
          scope: input.scope,
          handoff: active,
          eventType: "HANDOFF_HUMAN_ALREADY_ACTIVE",
          previousStatus: active.status,
          nextStatus: "HANDOFF_CANCELLED",
          internalMessageId: observation.internalMessageId,
          timestamp: input.currentTime.toISOString(),
          reasonCode: "HUMAN_ALREADY_ACTIVE",
        });
        state = reduceRuntimeHandoffState(state, event, context);
        events.push(event);
      }
      return {
        state,
        before: initialState,
        after: state,
        events,
        compatibility,
        request,
        observation,
        errorCode: null,
      };
    }
    if (compatibility === "SAME_HANDOFF") {
      const event = makeEvent({
        scope: input.scope,
        handoff: state.activeHandoff!,
        eventType: "HANDOFF_OBSERVATION_RECEIVED",
        previousStatus: state.activeHandoff!.status,
        nextStatus: state.activeHandoff!.status,
        internalMessageId: observation.internalMessageId,
        timestamp: observation.observedAt,
        reasonCode: request.reasonCode,
      });
      state = reduceRuntimeHandoffState(state, event, context);
      events.push(event);
      return {
        state,
        before: initialState,
        after: state,
        events,
        compatibility,
        request,
        observation,
        errorCode: null,
      };
    }
    if (state.activeHandoff) {
      const active = state.activeHandoff;
      const supersede = makeEvent({
        scope: input.scope,
        handoff: active,
        eventType: "HANDOFF_SUPERSEDED",
        previousStatus: active.status,
        nextStatus: "HANDOFF_SUPERSEDED",
        internalMessageId: observation.internalMessageId,
        timestamp: input.currentTime.toISOString(),
        reasonCode: "OTHER_STRUCTURED_REASON",
      });
      state = reduceRuntimeHandoffState(state, supersede, context);
      events.push(supersede);
    }
    const proposed = makeEvent({
      scope: input.scope,
      handoff: request,
      eventType: "HANDOFF_PROPOSED",
      previousStatus: "HANDOFF_PROPOSED",
      nextStatus: "HANDOFF_PROPOSED",
      internalMessageId: observation.internalMessageId,
      timestamp: input.currentTime.toISOString(),
      reasonCode: request.reasonCode,
      includeHandoff: true,
    });
    state = reduceRuntimeHandoffState(state, proposed, context);
    events.push(proposed);
    if (request.status === "HANDOFF_READY") {
      const ready = makeEvent({
        scope: input.scope,
        handoff: request,
        eventType: "HANDOFF_READY",
        previousStatus: "HANDOFF_PROPOSED",
        nextStatus: "HANDOFF_READY",
        internalMessageId: observation.internalMessageId,
        timestamp: input.currentTime.toISOString(),
        reasonCode: request.reasonCode,
      });
      state = reduceRuntimeHandoffState(state, ready, context);
      events.push(ready);
    }
    const observed = makeEvent({
      scope: input.scope,
      handoff: state.activeHandoff!,
      eventType: "HANDOFF_OBSERVATION_RECEIVED",
      previousStatus: state.activeHandoff!.status,
      nextStatus: state.activeHandoff!.status,
      internalMessageId: observation.internalMessageId,
      timestamp: observation.observedAt,
      reasonCode: request.reasonCode,
    });
    state = reduceRuntimeHandoffState(state, observed, context);
    events.push(observed);
    return {
      state,
      before: initialState,
      after: state,
      events,
      compatibility,
      request,
      observation,
      errorCode: null,
    };
  } catch (error) {
    return {
      state: initialState,
      before: initialState,
      after: initialState,
      events,
      compatibility,
      request,
      observation: input.observation,
      errorCode: error instanceof Error ? error.message : "HANDOFF_STATE_REDACTION_FAILURE",
    };
  }
}

export function buildHandoffStateManifest(input: {
  mode: "OFF" | "SHADOW_STATE";
  observation: V1HandoffObservation | null;
  before: RuntimeHandoffState | null | undefined;
  after: RuntimeHandoffState | null | undefined;
  revisionBefore: number | null;
  revisionAfter: number | null;
  compatibility: HandoffCompatibility | null;
  eventIds: string[];
  persisted: boolean;
  errorCode?: string | null;
}): HandoffStateManifest {
  const active = input.after?.activeHandoff ?? null;
  return {
    handoffStateMode: input.mode,
    v1HandoffObservationReceived: Boolean(input.observation),
    handoffObservationId: input.observation?.observationId ?? null,
    activeHandoffPresent: Boolean(active),
    activeHandoffId: active?.handoffId ?? null,
    activeHandoffStatus: active?.status ?? null,
    handoffReasonCode: active?.reasonCode ?? input.observation?.reasonCode ?? null,
    handoffUrgency: active?.urgency ?? (input.observation ? "NORMAL" : null),
    handoffRequestedTargetType:
      active?.requestedTargetType ?? input.observation?.requestedTargetType ?? null,
    handoffCustomerRequested:
      active?.customerRequested ?? input.observation?.customerRequested ?? false,
    handoffHumanActiveObserved: input.observation?.humanActiveObserved ?? false,
    handoffAiActiveObserved: input.observation?.aiActiveObserved ?? false,
    handoffPausedByHumanObserved: input.observation?.pausedByHumanObserved ?? false,
    handoffActionId: active?.actionId ?? input.observation?.actionId ?? null,
    handoffContextVersion: active?.contextVersion ?? input.observation?.contextVersion ?? null,
    handoffCompatibility: input.compatibility,
    handoffStateRevisionBefore: input.revisionBefore,
    handoffStateRevisionAfter: input.revisionAfter,
    handoffEventIds: [...input.eventIds].sort(),
    handoffStatePersisted: input.persisted,
    handoffExecutionPerformed: false,
    chatwootMutationPerformed: false,
    labelApplied: false,
    assignmentChanged: false,
    conversationStatusChanged: false,
    aiActiveChanged: false,
    outboundSent: false,
    handoffRedactionApplied: true,
    handoffErrorCode: input.errorCode ?? null,
    handoffExecutionMode: "OFF",
    handoffExecutionEligible: false,
    handoffExecutionId: null,
    handoffExecutionAttempt: null,
    handoffExecutionStatus: null,
    handoffExecutionReasonAuthorized: false,
    handoffExecutionAssistantAllowlisted: false,
    handoffExecutionConversationAllowlisted: false,
    handoffPreconditionsValid: false,
    handoffConversationVerified: false,
    handoffHumanAlreadyActive: false,
    handoffAiActiveBefore: null,
    handoffAiActiveAfter: null,
    handoffPauseAiAttempted: false,
    handoffPauseAiConfirmed: false,
    handoffLabelConfigured: false,
    handoffLabelApplied: false,
    handoffAssignmentConfigured: false,
    handoffAssignmentChanged: false,
    handoffFinalStateVerified: false,
    handoffPartialMutation: false,
    handoffExternalEffectMayHaveOccurred: false,
    handoffReconciliationStatus: null,
    handoffExecutionPersisted: false,
    handoffExecutionRedactionApplied: true,
    handoffAdapterMode: "OFF",
    operationalAdapterEligible: false,
    operationalAdapterResolved: false,
    chatwootConfigurationResolved: false,
    chatwootScopeValidated: false,
    chatwootConversationReadAttempted: false,
    chatwootConversationReadSucceeded: false,
    chatwootAiActiveBefore: null,
    chatwootPauseAiAttempted: false,
    chatwootPauseAiHttpOutcome: null,
    chatwootFinalVerificationAttempted: false,
    chatwootFinalVerificationStatus: null,
    chatwootAiActiveAfter: null,
    chatwootReconciliationReadOnly: false,
    chatwootExternalEffectMayHaveOccurred: false,
    chatwootAdapterErrorCode: null,
    chatwootPayloadPersisted: false,
    chatwootTokenPersisted: false,
    chatwootMessageSent: false,
    chatwootLabelApplied: false,
    chatwootAssignmentChanged: false,
    chatwootStatusChanged: false,
  };
}
