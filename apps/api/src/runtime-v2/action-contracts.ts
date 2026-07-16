import { createHash } from "node:crypto";
import {
  EVIDENCE_CONTRACT_VERSION,
  createEvidenceId,
  type ScopeContext,
  type SourceEvidence,
} from "./evidence-contracts";

export const ACTION_CONTRACT_VERSION = 1 as const;
export type ActionContractVersion = typeof ACTION_CONTRACT_VERSION;

export type ActionType =
  | "READ_AVAILABILITY"
  | "CREATE_BOOKING"
  | "RESCHEDULE_BOOKING"
  | "CANCEL_BOOKING"
  | "LIST_BOOKINGS"
  | "CUSTOM_WEBHOOK_READ"
  | "CUSTOM_WEBHOOK_WRITE"
  | "CHATWOOT_HANDOFF"
  | "CHATWOOT_ASSIGN"
  | "CHATWOOT_LABEL"
  | "CHATWOOT_STATUS_CHANGE";

export type ActionCategory =
  | "AVAILABILITY"
  | "BOOKING"
  | "EXTERNAL_LOOKUP"
  | "EXTERNAL_MUTATION"
  | "HANDOFF"
  | "CONVERSATION_OPERATION";

export type EffectType =
  | "NO_EXTERNAL_EFFECT"
  | "READ_ONLY_EXTERNAL"
  | "REVERSIBLE_EXTERNAL_MUTATION"
  | "IRREVERSIBLE_EXTERNAL_MUTATION"
  | "HUMAN_OPERATION";

export type ConfirmationPolicy =
  | "NONE"
  | "EXPLICIT_CUSTOMER_CONFIRMATION"
  | "EXPLICIT_HUMAN_CONFIRMATION"
  | "CUSTOMER_AND_HUMAN_CONFIRMATION"
  | "FORBIDDEN_AUTOMATIC_EXECUTION";

export type ActionStatus =
  | "ACTION_PROPOSED"
  | "AWAITING_CUSTOMER_CONFIRMATION"
  | "AWAITING_HUMAN_CONFIRMATION"
  | "ACTION_CONFIRMED"
  | "EXECUTION_QUEUED"
  | "EXECUTING"
  | "SUCCEEDED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "RECONCILIATION_REQUIRED"
  | "RECONCILED_SUCCEEDED"
  | "RECONCILED_FAILED";

export type ActionEventType =
  | "ACTION_CREATED"
  | "CUSTOMER_CONFIRMATION_REQUESTED"
  | "HUMAN_CONFIRMATION_REQUESTED"
  | "CUSTOMER_CONFIRMED"
  | "HUMAN_CONFIRMED"
  | "CONFIRMATION_REJECTED"
  | "EXECUTION_REQUESTED"
  | "EXECUTION_STARTED"
  | "EXECUTION_SUCCEEDED"
  | "EXECUTION_FAILED"
  | "EXECUTION_TIMED_OUT"
  | "ACTION_EXPIRED"
  | "ACTION_CANCELLED"
  | "RECONCILIATION_STARTED"
  | "RECONCILIATION_SUCCEEDED"
  | "RECONCILIATION_FAILED";

export type ToolExecutionStatus =
  | "SUCCEEDED"
  | "FAILED"
  | "TIMED_OUT_UNKNOWN_EFFECT"
  | "CANCELLED"
  | "REJECTED"
  | "DUPLICATE_SUPPRESSED";

export type RetryPolicy =
  "NEVER" | "SAFE_READ_RETRY" | "IDEMPOTENT_WRITE_RETRY" | "RECONCILE_BEFORE_RETRY";

export type ReconciliationPolicy =
  | "NONE"
  | "RECONCILE_AFTER_TIMEOUT"
  | "RECONCILE_BEFORE_RETRY"
  | "RECONCILE_AFTER_PERSISTENCE_FAILURE";

export type ActionErrorCode =
  | "INVALID_ACTION"
  | "INVALID_TRANSITION"
  | "ACTION_EXPIRED"
  | "CONFIRMATION_REQUIRED"
  | "CONFIRMATION_MISMATCH"
  | "CONFIRMATION_EXPIRED"
  | "ACTION_ALREADY_TERMINAL"
  | "IDEMPOTENCY_CONFLICT"
  | "SCOPE_MISMATCH"
  | "MISSING_PARAMETER"
  | "INVALID_PARAMETER"
  | "TOOL_NOT_ALLOWED"
  | "TOOL_NOT_CONFIGURED"
  | "TOOL_TIMEOUT"
  | "TOOL_FAILED"
  | "EXTERNAL_EFFECT_UNKNOWN"
  | "RECONCILIATION_REQUIRED"
  | "REDACTION_FAILURE";

export type ActionJsonValue =
  string | number | boolean | null | ActionJsonValue[] | { [key: string]: ActionJsonValue };

export type ActionProvenance = {
  source: "V1_PIPELINE" | "V2_SHADOW" | "HUMAN" | "SYSTEM";
  sourceMessageId?: string | null;
  sourceFlowId?: string | null;
  sourceTool?: string | null;
  sourceVersion?: string | null;
  reasonCode?: string | null;
};

export type ActionExecutionPolicy = {
  retryPolicy: RetryPolicy;
  reconciliationPolicy: ReconciliationPolicy;
  maxAttempts: number;
  timeoutMs: number;
};

export type ActionRequest = {
  contractVersion: ActionContractVersion;
  actionId: string;
  actionType: ActionType;
  actionCategory: ActionCategory;
  effectType: EffectType;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId?: string | null;
  contextVersion: number;
  internalMessageId: string;
  flowId?: string | null;
  sourceIntent: string;
  requestedAt: string;
  expiresAt: string;
  confirmationPolicy: ConfirmationPolicy;
  requiredParameters: string[];
  normalizedArguments: Record<string, ActionJsonValue>;
  argumentsHash: string;
  idempotencyKey: string;
  executionPolicy: ActionExecutionPolicy;
  provenance: ActionProvenance;
  status: ActionStatus;
};

export type ActionConfirmationType = "CUSTOMER" | "HUMAN";
export type ActionConfirmationStatus = "VALIDATED" | "REJECTED" | "EXPIRED" | "CONSUMED";

export type ActionConfirmation = {
  contractVersion: ActionContractVersion;
  confirmationId: string;
  actionId: string;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId?: string | null;
  contextVersion: number;
  confirmingMessageId: string;
  confirmationType: ActionConfirmationType;
  confirmedAt: string;
  expiresAt: string;
  parametersHash: string;
  status: ActionConfirmationStatus;
  provenance: ActionProvenance;
};

export type ActionConfirmationProof = {
  confirmationId: string;
  actionId: string;
  parametersHash: string;
  contextVersion: number;
  validatedAt: string;
};

export type ScopeProof = ScopeContext & {
  valid: boolean;
  checkedAt: string;
};

export type ToolExecutionRequest = {
  contractVersion: ActionContractVersion;
  executionId: string;
  actionId: string;
  toolName: string;
  toolVersion: string;
  effectType: EffectType;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  idempotencyKey: string;
  arguments: Record<string, ActionJsonValue>;
  argumentsHash: string;
  requestedAt: string;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  reconciliationPolicy: ReconciliationPolicy;
  confirmationProof?: ActionConfirmationProof | null;
  scopeProof: ScopeProof;
  provenance: ActionProvenance;
};

export type ToolExecutionError = {
  code: ActionErrorCode;
  retryable: boolean;
  safeMessage?: string;
};

export type ToolExecutionResult = {
  contractVersion: ActionContractVersion;
  executionId: string;
  actionId: string;
  toolName: string;
  status: ToolExecutionStatus;
  startedAt: string;
  completedAt: string;
  externalReferenceId?: string | null;
  resultCategory: string;
  authorityCategories: string[];
  validFrom?: string | null;
  validUntil?: string | null;
  resultHash?: string | null;
  sanitizedResultMetadata: Record<string, ActionJsonValue>;
  externalEffectMayHaveOccurred: boolean;
  reconciliationStatus: "NOT_REQUIRED" | "PENDING" | "SUCCEEDED" | "FAILED";
  error?: ToolExecutionError | null;
  provenance: ActionProvenance;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
};

export type ActionEvent = {
  contractVersion: ActionContractVersion;
  eventId: string;
  actionId: string;
  previousStatus: ActionStatus;
  nextStatus: ActionStatus;
  timestamp: string;
  contextVersion: number;
  source: ActionProvenance["source"];
  reasonCode: string;
  eventType: ActionEventType;
  metadata: Record<string, ActionJsonValue>;
};

export type FlowActionProposal = {
  contractVersion: ActionContractVersion;
  flowId: string;
  intent: string;
  proposedActionType: ActionType;
  requiredParameters: string[];
  collectedParameters: string[];
  missingParameters: string[];
  confirmationPolicy: ConfirmationPolicy;
  toolContext: Record<string, ActionJsonValue> | null;
  provenance: ActionProvenance;
};

export type RuntimeV2ActionManifest = {
  actionContractVersion: ActionContractVersion;
  actionId: string | null;
  actionType: ActionType | null;
  actionCategory: ActionCategory | null;
  effectType: EffectType | null;
  actionStatus: ActionStatus | null;
  confirmationPolicy: ConfirmationPolicy | null;
  confirmationRequired: boolean;
  confirmationPresent: boolean;
  confirmationValid: boolean;
  toolExecutionPlanned: boolean;
  toolExecutionPerformed: false;
  toolName: string | null;
  argumentsHash: string | null;
  idempotencyKeyHash: string | null;
  retryPolicy: RetryPolicy | null;
  reconciliationPolicy: ReconciliationPolicy | null;
  externalEffectMayHaveOccurred: false;
  actionErrorCode: ActionErrorCode | null;
  actionRedactionApplied: true;
};

const TERMINAL_ACTION_STATUSES = new Set<ActionStatus>([
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
  "RECONCILED_SUCCEEDED",
  "RECONCILED_FAILED",
]);

const ACTION_TYPES = new Set<ActionType>([
  "READ_AVAILABILITY",
  "CREATE_BOOKING",
  "RESCHEDULE_BOOKING",
  "CANCEL_BOOKING",
  "LIST_BOOKINGS",
  "CUSTOM_WEBHOOK_READ",
  "CUSTOM_WEBHOOK_WRITE",
  "CHATWOOT_HANDOFF",
  "CHATWOOT_ASSIGN",
  "CHATWOOT_LABEL",
  "CHATWOOT_STATUS_CHANGE",
]);

function assertNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label}_REQUIRED`);
}

function assertIso(value: string, label: string): Date {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error(`${label}_INVALID`);
  return parsed;
}

function assertHash(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label}_INVALID`);
}

function assertVersion(value: unknown): asserts value is ActionContractVersion {
  if (value !== ACTION_CONTRACT_VERSION) throw new Error("ACTION_CONTRACT_VERSION_UNSUPPORTED");
}

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

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function hashActionArguments(argumentsValue: Record<string, ActionJsonValue>): string {
  return createHash("sha256").update(stableJsonStringify(argumentsValue)).digest("hex");
}

function hashIdentity(parts: unknown[]): string {
  return createHash("sha256").update(stableJsonStringify(parts)).digest("hex");
}

export function createActionId(input: {
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  internalMessageId: string;
  actionType: ActionType;
  argumentsHash: string;
}): string {
  return `action_${hashIdentity([
    ACTION_CONTRACT_VERSION,
    input.companyId,
    input.assistantId,
    input.conversationId,
    input.contextVersion,
    input.internalMessageId,
    input.actionType,
    input.argumentsHash,
  ])}`;
}

export function createIdempotencyKey(input: {
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  actionType: ActionType;
  argumentsHash: string;
}): string {
  return `idempotency_${hashIdentity([
    ACTION_CONTRACT_VERSION,
    input.companyId,
    input.assistantId,
    input.conversationId,
    input.contextVersion,
    input.actionType,
    input.argumentsHash,
  ])}`;
}

export function createExecutionId(input: {
  actionId: string;
  attempt: number;
  requestedAt: string;
}): string {
  return `execution_${hashIdentity([ACTION_CONTRACT_VERSION, input.actionId, input.attempt, input.requestedAt])}`;
}

export function createConfirmationId(input: {
  actionId: string;
  confirmingMessageId: string;
  confirmedAt: string;
}): string {
  return `confirmation_${hashIdentity([
    ACTION_CONTRACT_VERSION,
    input.actionId,
    input.confirmingMessageId,
    input.confirmedAt,
  ])}`;
}

export function createActionEventId(input: {
  actionId: string;
  eventType: ActionEventType;
  previousStatus: ActionStatus;
  nextStatus: ActionStatus;
  timestamp: string;
}): string {
  return `action_event_${hashIdentity([
    ACTION_CONTRACT_VERSION,
    input.actionId,
    input.eventType,
    input.previousStatus,
    input.nextStatus,
    input.timestamp,
  ])}`;
}

export function validateActionRequest(action: ActionRequest): void {
  assertVersion(action.contractVersion);
  assertNonEmpty(action.actionId, "ACTION_ID");
  assertNonEmpty(action.companyId, "COMPANY_ID");
  assertNonEmpty(action.assistantId, "ASSISTANT_ID");
  assertNonEmpty(action.conversationId, "CONVERSATION_ID");
  assertNonEmpty(action.internalMessageId, "INTERNAL_MESSAGE_ID");
  assertNonEmpty(action.sourceIntent, "SOURCE_INTENT");
  assertHash(action.argumentsHash, "ARGUMENTS_HASH");
  assertNonEmpty(action.idempotencyKey, "IDEMPOTENCY_KEY");
  if (!Number.isInteger(action.contextVersion) || action.contextVersion < 0) {
    throw new Error("CONTEXT_VERSION_INVALID");
  }
  const requestedAt = assertIso(action.requestedAt, "REQUESTED_AT");
  const expiresAt = assertIso(action.expiresAt, "EXPIRES_AT");
  if (expiresAt.getTime() <= requestedAt.getTime()) throw new Error("EXPIRES_AT_INVALID");
  if (!ACTION_TYPES.has(action.actionType)) throw new Error("ACTION_TYPE_INVALID");
  if (
    action.executionPolicy.maxAttempts < 1 ||
    !Number.isInteger(action.executionPolicy.maxAttempts)
  ) {
    throw new Error("MAX_ATTEMPTS_INVALID");
  }
  if (action.executionPolicy.timeoutMs < 1 || !Number.isInteger(action.executionPolicy.timeoutMs)) {
    throw new Error("TIMEOUT_INVALID");
  }
  if (hashActionArguments(action.normalizedArguments) !== action.argumentsHash) {
    throw new Error("ARGUMENTS_HASH_MISMATCH");
  }
  for (const parameter of action.requiredParameters) {
    if (!Object.prototype.hasOwnProperty.call(action.normalizedArguments, parameter)) {
      throw new Error("MISSING_PARAMETER");
    }
  }
}

export function serializeActionContract(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ACTION_CONTRACT_INVALID");
  }
  assertVersion((value as Record<string, unknown>).contractVersion);
  return stableJsonStringify(value);
}

export function deserializeActionContract<T extends { contractVersion: unknown }>(
  serialized: string,
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("ACTION_CONTRACT_JSON_INVALID");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("ACTION_CONTRACT_INVALID");
  }
  assertVersion((parsed as Record<string, unknown>).contractVersion);
  return parsed as T;
}

export function isTerminalActionStatus(status: ActionStatus): boolean {
  return TERMINAL_ACTION_STATUSES.has(status);
}

export type ActionTransitionContext = {
  confirmationPolicy?: ConfirmationPolicy;
};

export function transitionActionStatus(
  currentStatus: ActionStatus,
  event: ActionEventType,
  context: ActionTransitionContext = {},
): ActionStatus {
  if (isTerminalActionStatus(currentStatus)) throw new Error("ACTION_ALREADY_TERMINAL");

  if (event === "ACTION_EXPIRED") return "EXPIRED";
  if (event === "ACTION_CANCELLED") return "CANCELLED";

  if (currentStatus === "ACTION_PROPOSED") {
    if (event === "CUSTOMER_CONFIRMATION_REQUESTED") return "AWAITING_CUSTOMER_CONFIRMATION";
    if (event === "HUMAN_CONFIRMATION_REQUESTED") return "AWAITING_HUMAN_CONFIRMATION";
    if (event === "EXECUTION_REQUESTED" && context.confirmationPolicy === "NONE") {
      return "EXECUTION_QUEUED";
    }
  }

  if (currentStatus === "AWAITING_CUSTOMER_CONFIRMATION") {
    if (event === "CUSTOMER_CONFIRMED") return "ACTION_CONFIRMED";
    if (event === "CONFIRMATION_REJECTED") return "CANCELLED";
  }

  if (currentStatus === "AWAITING_HUMAN_CONFIRMATION") {
    if (event === "HUMAN_CONFIRMED") return "ACTION_CONFIRMED";
    if (event === "CONFIRMATION_REJECTED") return "CANCELLED";
  }

  if (currentStatus === "ACTION_CONFIRMED" && event === "EXECUTION_REQUESTED") {
    return "EXECUTION_QUEUED";
  }

  if (currentStatus === "EXECUTION_QUEUED" && event === "EXECUTION_STARTED") {
    return "EXECUTING";
  }

  if (currentStatus === "EXECUTING") {
    if (event === "EXECUTION_SUCCEEDED") return "SUCCEEDED";
    if (event === "EXECUTION_FAILED") return "FAILED";
    if (event === "EXECUTION_TIMED_OUT") return "RECONCILIATION_REQUIRED";
  }

  if (currentStatus === "RECONCILIATION_REQUIRED") {
    if (event === "RECONCILIATION_STARTED") return "RECONCILIATION_REQUIRED";
    if (event === "RECONCILIATION_SUCCEEDED") return "RECONCILED_SUCCEEDED";
    if (event === "RECONCILIATION_FAILED") return "RECONCILED_FAILED";
  }

  throw new Error("INVALID_TRANSITION");
}

export function createActionEvent(input: {
  actionId: string;
  previousStatus: ActionStatus;
  eventType: ActionEventType;
  nextStatus: ActionStatus;
  timestamp: string;
  contextVersion: number;
  source: ActionProvenance["source"];
  reasonCode: string;
  metadata?: Record<string, ActionJsonValue>;
}): ActionEvent {
  assertNonEmpty(input.actionId, "ACTION_ID");
  assertIso(input.timestamp, "TIMESTAMP");
  assertNonEmpty(input.reasonCode, "REASON_CODE");
  return {
    contractVersion: ACTION_CONTRACT_VERSION,
    eventId: createActionEventId(input),
    actionId: input.actionId,
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    timestamp: input.timestamp,
    contextVersion: input.contextVersion,
    source: input.source,
    reasonCode: input.reasonCode,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
  };
}

export function validateActionConfirmation(input: {
  confirmation: ActionConfirmation;
  action: Pick<
    ActionRequest,
    | "actionId"
    | "companyId"
    | "assistantId"
    | "conversationId"
    | "contactId"
    | "contextVersion"
    | "argumentsHash"
    | "expiresAt"
    | "status"
  >;
  currentTime: Date;
}): { valid: true } | { valid: false; error: ActionErrorCode } {
  const { confirmation, action, currentTime } = input;
  try {
    assertVersion(confirmation.contractVersion);
    assertIso(confirmation.confirmedAt, "CONFIRMED_AT");
    const expiresAt = assertIso(confirmation.expiresAt, "CONFIRMATION_EXPIRES_AT");
    if (confirmation.status !== "VALIDATED")
      return { valid: false, error: "CONFIRMATION_MISMATCH" };
    if (currentTime.getTime() >= expiresAt.getTime())
      return { valid: false, error: "CONFIRMATION_EXPIRED" };
    if (
      action.status !== "AWAITING_CUSTOMER_CONFIRMATION" &&
      action.status !== "AWAITING_HUMAN_CONFIRMATION"
    ) {
      return { valid: false, error: "CONFIRMATION_MISMATCH" };
    }
    const sameScope =
      confirmation.actionId === action.actionId &&
      confirmation.companyId === action.companyId &&
      confirmation.assistantId === action.assistantId &&
      confirmation.conversationId === action.conversationId &&
      (confirmation.contactId ?? null) === (action.contactId ?? null) &&
      confirmation.contextVersion === action.contextVersion &&
      confirmation.parametersHash === action.argumentsHash;
    return sameScope ? { valid: true } : { valid: false, error: "CONFIRMATION_MISMATCH" };
  } catch {
    return { valid: false, error: "CONFIRMATION_MISMATCH" };
  }
}

export function redactActionMetadata(input: {
  action?: Partial<ActionRequest> | null;
  confirmation?: Partial<ActionConfirmation> | null;
  execution?: Partial<ToolExecutionRequest> | null;
  result?: Partial<ToolExecutionResult> | null;
}): RuntimeV2ActionManifest {
  const action = input.action;
  const confirmation = input.confirmation;
  const execution = input.execution;
  const result = input.result;
  const confirmationPolicy = action?.confirmationPolicy ?? null;
  const confirmationRequired = Boolean(confirmationPolicy && confirmationPolicy !== "NONE");
  return {
    actionContractVersion: ACTION_CONTRACT_VERSION,
    actionId: typeof action?.actionId === "string" ? action.actionId : null,
    actionType: (action?.actionType as ActionType | undefined) ?? null,
    actionCategory: (action?.actionCategory as ActionCategory | undefined) ?? null,
    effectType: (action?.effectType as EffectType | undefined) ?? null,
    actionStatus: (action?.status as ActionStatus | undefined) ?? null,
    confirmationPolicy,
    confirmationRequired,
    confirmationPresent: Boolean(confirmation),
    confirmationValid: confirmation?.status === "VALIDATED",
    toolExecutionPlanned: Boolean(execution),
    toolExecutionPerformed: false,
    toolName: typeof execution?.toolName === "string" ? execution.toolName : null,
    argumentsHash:
      typeof action?.argumentsHash === "string"
        ? action.argumentsHash
        : typeof execution?.argumentsHash === "string"
          ? execution.argumentsHash
          : null,
    idempotencyKeyHash:
      typeof action?.idempotencyKey === "string" ? hashIdentity([action.idempotencyKey]) : null,
    retryPolicy: action?.executionPolicy?.retryPolicy ?? execution?.retryPolicy ?? null,
    reconciliationPolicy:
      action?.executionPolicy?.reconciliationPolicy ?? execution?.reconciliationPolicy ?? null,
    externalEffectMayHaveOccurred: false,
    actionErrorCode: result?.error?.code ?? null,
    actionRedactionApplied: true,
  };
}

export type ToolResultEvidenceDecision = {
  evidence: SourceEvidence | null;
  reason:
    | "AUTHORIZED"
    | "RESULT_NOT_SUCCESSFUL"
    | "RESULT_SCOPE_MISMATCH"
    | "RESULT_EXPIRED"
    | "RESULT_EFFECT_UNKNOWN"
    | "RESULT_CATEGORY_MISSING"
    | "RESULT_PROVENANCE_MISSING";
};

export function toolResultToEvidence(input: {
  result: ToolExecutionResult;
  scope: ScopeContext;
  currentTime: Date;
}): ToolResultEvidenceDecision {
  const result = input.result;
  if (result.status !== "SUCCEEDED") return { evidence: null, reason: "RESULT_NOT_SUCCESSFUL" };
  if (result.externalEffectMayHaveOccurred || result.reconciliationStatus === "PENDING") {
    return { evidence: null, reason: "RESULT_EFFECT_UNKNOWN" };
  }
  if (!result.authorityCategories.length || !result.resultCategory) {
    return { evidence: null, reason: "RESULT_CATEGORY_MISSING" };
  }
  if (
    result.companyId !== input.scope.companyId ||
    (input.scope.assistantId && result.assistantId !== input.scope.assistantId) ||
    (input.scope.conversationId && result.conversationId !== input.scope.conversationId) ||
    (input.scope.contextVersion !== undefined &&
      result.contextVersion !== input.scope.contextVersion)
  ) {
    return { evidence: null, reason: "RESULT_SCOPE_MISMATCH" };
  }
  if (!result.provenance.sourceTool && !result.provenance.sourceVersion) {
    return { evidence: null, reason: "RESULT_PROVENANCE_MISSING" };
  }
  const observedAt = assertIso(result.completedAt, "COMPLETED_AT");
  const validFrom = result.validFrom ? assertIso(result.validFrom, "VALID_FROM") : observedAt;
  const validUntil = result.validUntil ? assertIso(result.validUntil, "VALID_UNTIL") : null;
  if (
    validFrom.getTime() > input.currentTime.getTime() ||
    (validUntil && validUntil.getTime() <= input.currentTime.getTime())
  ) {
    return { evidence: null, reason: "RESULT_EXPIRED" };
  }
  const category = result.authorityCategories[0];
  const evidenceId = createEvidenceId({
    sourceType: "TOOL_RESULT",
    sourceId: result.executionId,
    companyId: result.companyId,
    assistantId: result.assistantId,
    conversationId: result.conversationId,
    contextVersion: result.contextVersion,
    category,
    fieldKey: result.resultCategory,
  });
  return {
    reason: "AUTHORIZED",
    evidence: {
      contractVersion: EVIDENCE_CONTRACT_VERSION,
      evidenceId,
      sourceType: "TOOL_RESULT",
      sourceId: result.executionId,
      companyId: result.companyId,
      assistantId: result.assistantId,
      conversationId: result.conversationId,
      contextVersion: result.contextVersion,
      category,
      fieldKey: result.resultCategory,
      valueHash: result.resultHash ?? hashIdentity([result.executionId, result.resultCategory]),
      confidence: 1,
      authorityLevel: "AUTHORITATIVE",
      observedAt: observedAt.toISOString(),
      validFrom: validFrom.toISOString(),
      validUntil: validUntil?.toISOString() ?? null,
      freshnessStatus: "CURRENT",
      provenance: {
        ...(result.provenance.sourceTool ? { sourceTool: result.provenance.sourceTool } : {}),
        ...(result.provenance.sourceVersion
          ? { sourceVersion: result.provenance.sourceVersion }
          : {}),
        ...(result.provenance.sourceMessageId
          ? { sourceMessageId: result.provenance.sourceMessageId }
          : {}),
        coveredCategories: [...result.authorityCategories].sort(),
      },
      isSensitive: false,
      isAuthoritative: true,
      sourceStatus: "ACTIVE",
    },
  };
}
