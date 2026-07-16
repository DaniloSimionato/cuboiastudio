import { createHash } from "node:crypto";
import {
  ACTION_CONTRACT_VERSION,
  type ActionCategory,
  type ActionJsonValue,
  type ActionType,
  type EffectType,
  type ToolExecutionResult,
  toolResultToEvidence,
  type ToolResultEvidenceDecision,
} from "./action-contracts";
import type { ScopeContext } from "./evidence-contracts";
import {
  resolveRuntimeV2ToolObservationMode,
  type RuntimeV2ToolObservationMode,
} from "./runtime-v2-feature-flag";

export const TOOL_OBSERVATION_CONTRACT_VERSION = 1 as const;

export type ToolObservationExecutionStatus = ToolExecutionResult["status"];
export type ToolObservationReconciliationStatus = ToolExecutionResult["reconciliationStatus"];

export type ToolObservationActionCorrelationStatus =
  | "MATCHED"
  | "NO_ACTIVE_ACTION"
  | "ACTION_TYPE_MISMATCH"
  | "CATEGORY_MISMATCH"
  | "ARGUMENTS_HASH_MISMATCH"
  | "CONTEXT_VERSION_MISMATCH"
  | "SCOPE_MISMATCH";

export type V1ToolExecutionObservation = {
  contractVersion: typeof TOOL_OBSERVATION_CONTRACT_VERSION;
  observationId: string;
  observationSource: "V1_PIPELINE";
  executionAttemptId: string;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contactId?: string | null;
  contextVersion: number;
  internalMessageId: string;
  flowId?: string | null;
  toolName: string;
  toolVersion: string;
  operationName: string;
  actionType: ActionType;
  actionCategory: ActionCategory;
  effectType: EffectType;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  timeoutMs: number;
  inputSchemaVersion: string;
  argumentKeys: string[];
  argumentsHash: string;
  idempotencyKeyHash?: string | null;
  executionStatus: ToolObservationExecutionStatus;
  resultCategory: string;
  authorityCategories: string[];
  validFrom?: string | null;
  validUntil?: string | null;
  resultHash?: string | null;
  externalReferenceHash?: string | null;
  externalEffectMayHaveOccurred: boolean;
  retryCount: number;
  duplicateSuppressed: boolean;
  reconciliationStatus: ToolObservationReconciliationStatus;
  errorCode?: string | null;
  provenanceMetadata: Record<string, ActionJsonValue>;
  linkedActionId?: string | null;
  actionCorrelationStatus: ToolObservationActionCorrelationStatus;
  redactionApplied: true;
  sanitizedResultMetadata: Record<string, ActionJsonValue>;
};

export type ToolObservationEvidenceResult = ToolResultEvidenceDecision & {
  result: ToolExecutionResult;
};

type ToolDescriptor = Pick<
  V1ToolExecutionObservation,
  | "actionType"
  | "actionCategory"
  | "effectType"
  | "operationName"
  | "resultCategory"
  | "authorityCategories"
>;

const TOOL_DESCRIPTORS: Record<string, ToolDescriptor> = {
  calendar_checkAvailability: {
    actionType: "READ_AVAILABILITY",
    actionCategory: "AVAILABILITY",
    effectType: "READ_ONLY_EXTERNAL",
    operationName: "checkAvailability",
    resultCategory: "AVAILABILITY",
    authorityCategories: ["AVAILABILITY"],
  },
  calendar_createBooking: {
    actionType: "CREATE_BOOKING",
    actionCategory: "BOOKING",
    effectType: "REVERSIBLE_EXTERNAL_MUTATION",
    operationName: "createBooking",
    resultCategory: "BOOKING",
    authorityCategories: ["BOOKING"],
  },
  calendar_getBookingsByContact: {
    actionType: "LIST_BOOKINGS",
    actionCategory: "EXTERNAL_LOOKUP",
    effectType: "READ_ONLY_EXTERNAL",
    operationName: "listBookings",
    resultCategory: "BOOKING_LOOKUP",
    authorityCategories: [],
  },
  calendar_rescheduleBooking: {
    actionType: "RESCHEDULE_BOOKING",
    actionCategory: "BOOKING",
    effectType: "REVERSIBLE_EXTERNAL_MUTATION",
    operationName: "rescheduleBooking",
    resultCategory: "BOOKING",
    authorityCategories: ["BOOKING"],
  },
  calendar_cancelBooking: {
    actionType: "CANCEL_BOOKING",
    actionCategory: "BOOKING",
    effectType: "REVERSIBLE_EXTERNAL_MUTATION",
    operationName: "cancelBooking",
    resultCategory: "BOOKING",
    authorityCategories: ["BOOKING"],
  },
};

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

function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function hashText(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

function iso(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("TOOL_OBSERVATION_TIMESTAMP_INVALID");
  return parsed.toISOString();
}

function descriptorForTool(toolName: string, metadata?: Record<string, unknown>): ToolDescriptor {
  const known = TOOL_DESCRIPTORS[toolName];
  if (known) return known;
  if (!toolName.startsWith("webhook_")) throw new Error("TOOL_OBSERVATION_TOOL_UNSUPPORTED");
  const method = String(metadata?.webhookMethod ?? "POST").toUpperCase();
  const readOnly = method === "GET" || method === "HEAD";
  return {
    actionType: readOnly ? "CUSTOM_WEBHOOK_READ" : "CUSTOM_WEBHOOK_WRITE",
    actionCategory: readOnly ? "EXTERNAL_LOOKUP" : "EXTERNAL_MUTATION",
    effectType: readOnly ? "READ_ONLY_EXTERNAL" : "REVERSIBLE_EXTERNAL_MUTATION",
    operationName: metadata?.webhookOperationName
      ? String(metadata.webhookOperationName)
      : toolName.replace(/^webhook_/, ""),
    resultCategory: readOnly ? "EXTERNAL_LOOKUP" : "EXTERNAL_MUTATION",
    authorityCategories: Array.isArray(metadata?.authorityCategories)
      ? metadata.authorityCategories
          .filter((item): item is string => typeof item === "string")
          .sort()
      : [],
  };
}

function statusForError(input: {
  errorCode?: string | null;
  executionStarted: boolean;
  duplicateSuppressed: boolean;
}): ToolObservationExecutionStatus {
  if (input.duplicateSuppressed) return "DUPLICATE_SUPPRESSED";
  if (!input.executionStarted) return "REJECTED";
  if (/TIMEOUT|TIMED_OUT|DEADLINE/i.test(input.errorCode ?? "")) {
    return "TIMED_OUT_UNKNOWN_EFFECT";
  }
  return "FAILED";
}

function safeErrorCode(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim();
  if (/^[A-Z][A-Z0-9_:-]{2,79}$/.test(normalized)) return normalized;
  if (/TIMEOUT|TIMED_OUT|DEADLINE/i.test(normalized)) return "TOOL_TIMEOUT";
  if (/outside selected flow|scope/i.test(normalized)) return "SCOPE_MISMATCH";
  if (/valid|parameter|schema|JSON/i.test(normalized)) return "INVALID_PARAMETER";
  if (/not configured|not active|not found|disabled/i.test(normalized)) {
    return "TOOL_NOT_CONFIGURED";
  }
  return "TOOL_FAILED";
}

function extractResultMetadata(result: string | null | undefined): {
  validFrom: string | null;
  validUntil: string | null;
  externalReferenceHash: string | null;
  metadata: Record<string, ActionJsonValue>;
} {
  if (!result)
    return { validFrom: null, validUntil: null, externalReferenceHash: null, metadata: {} };
  try {
    const parsed: unknown = JSON.parse(result);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { validFrom: null, validUntil: null, externalReferenceHash: null, metadata: {} };
    }
    const record = parsed as Record<string, unknown>;
    const firstOption = Array.isArray(record.options)
      ? (record.options.find((item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object"),
        ) ?? null)
      : null;
    const validFrom = typeof record.validFrom === "string" ? iso(record.validFrom) : null;
    const validUntil =
      typeof record.validUntil === "string"
        ? iso(record.validUntil)
        : typeof record.endAt === "string"
          ? iso(record.endAt)
          : typeof firstOption?.endAt === "string"
            ? iso(firstOption.endAt)
            : null;
    const reference = record.bookingId ?? record.externalReferenceId ?? record.id;
    return {
      validFrom,
      validUntil,
      externalReferenceHash: typeof reference === "string" ? hashText(reference) : null,
      metadata: {
        ...(typeof record.available === "boolean" ? { available: record.available } : {}),
        ...(Array.isArray(record.options) ? { optionCount: record.options.length } : {}),
        ...(Array.isArray(record.bookings) ? { bookingCount: record.bookings.length } : {}),
        ...(typeof record.status === "string" ? { status: record.status.slice(0, 40) } : {}),
      },
    };
  } catch {
    return { validFrom: null, validUntil: null, externalReferenceHash: null, metadata: {} };
  }
}

export function isRuntimeV2ToolObservationEnabled(
  input: { assistantId?: string | null },
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  if (resolveRuntimeV2ToolObservationMode(environment) !== "SHADOW_METADATA") return false;
  if (environment.RUNTIME_V2_MODE !== "SHADOW" || !input.assistantId) return false;
  return (
    environment.RUNTIME_V2_SHADOW_ASSISTANT_IDS?.split(",").some(
      (item) => item.trim() === input.assistantId,
    ) ?? false
  );
}

export function createToolObservationId(input: {
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  internalMessageId: string;
  toolName: string;
  operationName: string;
  executionAttemptId: string;
  argumentsHash: string;
}): string {
  return `tool_observation_${sha256([TOOL_OBSERVATION_CONTRACT_VERSION, input])}`;
}

export function createV1ToolExecutionObservation(input: {
  scope: ScopeContext & {
    companyId: string;
    assistantId: string;
    conversationId: string;
    contextVersion: number;
  };
  internalMessageId: string;
  executionAttemptId: string;
  toolName: string;
  arguments: Record<string, ActionJsonValue>;
  startedAt: Date | string;
  completedAt: Date | string;
  timeoutMs: number;
  result?: string | null;
  errorCode?: string | null;
  executionStarted?: boolean;
  duplicateSuppressed?: boolean;
  retryCount?: number;
  flowId?: string | null;
  linkedActionId?: string | null;
  actionCorrelationStatus?: ToolObservationActionCorrelationStatus;
  metadata?: Record<string, unknown>;
}): V1ToolExecutionObservation {
  const descriptor = descriptorForTool(input.toolName, input.metadata);
  const startedAt = iso(input.startedAt);
  const completedAt = iso(input.completedAt);
  const argumentsHash = sha256(input.arguments);
  const resultMetadata = extractResultMetadata(input.result);
  const executionStarted = input.executionStarted ?? false;
  const duplicateSuppressed = input.duplicateSuppressed ?? false;
  const executionStatus =
    input.errorCode || !executionStarted
      ? statusForError({
          errorCode: input.errorCode,
          executionStarted,
          duplicateSuppressed,
        })
      : "SUCCEEDED";
  const externalEffectMayHaveOccurred = executionStatus === "TIMED_OUT_UNKNOWN_EFFECT";
  const observationId = createToolObservationId({
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contextVersion: input.scope.contextVersion,
    internalMessageId: input.internalMessageId,
    toolName: input.toolName,
    operationName: descriptor.operationName,
    executionAttemptId: input.executionAttemptId,
    argumentsHash,
  });
  const durationMs = Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
  return {
    contractVersion: TOOL_OBSERVATION_CONTRACT_VERSION,
    observationId,
    observationSource: "V1_PIPELINE",
    executionAttemptId: input.executionAttemptId,
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contactId: input.scope.contactId ?? null,
    contextVersion: input.scope.contextVersion,
    internalMessageId: input.internalMessageId,
    flowId: input.flowId ?? null,
    toolName: input.toolName,
    toolVersion: String(input.metadata?.toolVersion ?? "V1"),
    operationName: descriptor.operationName,
    actionType: descriptor.actionType,
    actionCategory: descriptor.actionCategory,
    effectType: descriptor.effectType,
    startedAt,
    completedAt,
    durationMs,
    timeoutMs: Math.max(1, Math.round(input.timeoutMs)),
    inputSchemaVersion: String(input.metadata?.inputSchemaVersion ?? "V1"),
    argumentKeys: Object.keys(input.arguments).sort(),
    argumentsHash,
    idempotencyKeyHash: hashText(String(input.metadata?.idempotencyKey ?? "")),
    executionStatus,
    resultCategory: descriptor.resultCategory,
    authorityCategories: [...descriptor.authorityCategories].sort(),
    validFrom: resultMetadata.validFrom ?? startedAt,
    validUntil: resultMetadata.validUntil,
    resultHash: hashText(input.result),
    externalReferenceHash: resultMetadata.externalReferenceHash,
    externalEffectMayHaveOccurred,
    retryCount: Math.max(0, Math.round(input.retryCount ?? 0)),
    duplicateSuppressed,
    reconciliationStatus:
      executionStatus === "TIMED_OUT_UNKNOWN_EFFECT" ? "PENDING" : "NOT_REQUIRED",
    errorCode: safeErrorCode(input.errorCode),
    provenanceMetadata: {
      source: "V1_PIPELINE",
      ...(input.flowId ? { flowId: input.flowId } : {}),
      ...(input.metadata?.webhookOperationName
        ? { operation: String(input.metadata.webhookOperationName).slice(0, 80) }
        : {}),
    },
    linkedActionId: input.linkedActionId ?? null,
    actionCorrelationStatus: input.actionCorrelationStatus ?? "NO_ACTIVE_ACTION",
    redactionApplied: true,
    sanitizedResultMetadata: resultMetadata.metadata,
  };
}

export function v1ToolObservationToCanonicalResult(
  observation: V1ToolExecutionObservation,
): ToolExecutionResult {
  return {
    contractVersion: ACTION_CONTRACT_VERSION,
    executionId: observation.executionAttemptId,
    actionId: observation.linkedActionId ?? observation.observationId,
    toolName: observation.toolName,
    status: observation.executionStatus,
    startedAt: observation.startedAt,
    completedAt: observation.completedAt,
    externalReferenceId: null,
    resultCategory: observation.resultCategory,
    authorityCategories: [...observation.authorityCategories],
    validFrom: observation.validFrom ?? null,
    validUntil: observation.validUntil ?? null,
    resultHash: observation.resultHash ?? null,
    sanitizedResultMetadata: observation.sanitizedResultMetadata,
    externalEffectMayHaveOccurred: observation.externalEffectMayHaveOccurred,
    reconciliationStatus: observation.reconciliationStatus,
    error: observation.errorCode
      ? { code: "TOOL_FAILED", retryable: observation.executionStatus === "FAILED" }
      : null,
    provenance: {
      source: "V1_PIPELINE",
      sourceMessageId: observation.internalMessageId,
      sourceTool: observation.toolName,
      sourceVersion: observation.toolVersion,
    },
    companyId: observation.companyId,
    assistantId: observation.assistantId,
    conversationId: observation.conversationId,
    contextVersion: observation.contextVersion,
  };
}

export function toolObservationToEvidence(input: {
  observation: V1ToolExecutionObservation;
  scope: ScopeContext;
  currentTime: Date;
}): ToolObservationEvidenceResult {
  const result = v1ToolObservationToCanonicalResult(input.observation);
  return {
    result,
    ...toolResultToEvidence({ result, scope: input.scope, currentTime: input.currentTime }),
  };
}

export function redactToolObservation(
  observation: V1ToolExecutionObservation,
): V1ToolExecutionObservation {
  return {
    ...observation,
    argumentKeys: [...observation.argumentKeys].sort(),
    authorityCategories: [...observation.authorityCategories].sort(),
    provenanceMetadata: {
      source: "V1_PIPELINE",
      ...(observation.flowId ? { flowId: observation.flowId } : {}),
    },
    sanitizedResultMetadata: { ...observation.sanitizedResultMetadata },
    redactionApplied: true,
  };
}

export function observationToManifest(observation: V1ToolExecutionObservation) {
  const safe = redactToolObservation(observation);
  return {
    observationId: safe.observationId,
    executionAttemptId: safe.executionAttemptId,
    linkedActionId: safe.linkedActionId ?? null,
    actionCorrelationStatus: safe.actionCorrelationStatus,
    observedToolName: safe.toolName,
    observedOperationName: safe.operationName,
    observedActionType: safe.actionType,
    observedActionCategory: safe.actionCategory,
    observedEffectType: safe.effectType,
    observedExecutionStatus: safe.executionStatus,
    observedStartedAt: safe.startedAt,
    observedCompletedAt: safe.completedAt,
    observedDurationMs: safe.durationMs,
    observedTimeoutMs: safe.timeoutMs,
    observedArgumentsHash: safe.argumentsHash,
    observedIdempotencyKeyHash: safe.idempotencyKeyHash ?? null,
    observedResultHash: safe.resultHash ?? null,
    observedAuthorityCategories: [...safe.authorityCategories],
    observedValidFrom: safe.validFrom ?? null,
    observedValidUntil: safe.validUntil ?? null,
    observedExternalReferenceHash: safe.externalReferenceHash ?? null,
    observedExternalEffectMayHaveOccurred: safe.externalEffectMayHaveOccurred,
    observedRetryCount: safe.retryCount,
    observedDuplicateSuppressed: safe.duplicateSuppressed,
    observedReconciliationStatus: safe.reconciliationStatus,
    observedErrorCode: safe.errorCode ?? null,
    toolObservationRedactionApplied: true,
  };
}

export type ToolObservationManifest = ReturnType<typeof observationToManifest>;
