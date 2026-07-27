import { createHash } from "node:crypto";
import type { OperationalHandoffStatus } from "./operational-handoff";

export const HANDOFF_RECOVERY_SCHEMA_VERSION = "ASSISTANT_HANDOFF_RECOVERY_V1";
export const HANDOFF_ATTEMPT_SCHEMA_VERSION = "ASSISTANT_HANDOFF_ATTEMPT_V1";
export const OPERATIONAL_HANDOFF_CONFIRMATION_CONTRACT_VERSION =
  "OPERATIONAL_HANDOFF_CONFIRMATION_V1";
export const OPERATIONAL_HANDOFF_CONFIRMATION_TEXT =
  "Transferindo para um atendente...";

export const DEFAULT_HANDOFF_RECOVERY_LEASE_MS = 60_000;
export const DEFAULT_HANDOFF_RECOVERY_MAX_ATTEMPTS = 3;
export const DEFAULT_HANDOFF_RECOVERY_BACKOFF_MS = [
  60_000,
  300_000,
  1_800_000,
] as const;
export const DEFAULT_HANDOFF_RECOVERY_BACKOFF_CAP_MS = 3_600_000;

export const HANDOFF_RECOVERY_SAFETIES = [
  "PROVEN_SAFE",
  "VERIFY_REMOTE_FIRST",
  "NOT_RETRYABLE",
  "UNKNOWN",
] as const;

export type HandoffRecoverySafety = (typeof HANDOFF_RECOVERY_SAFETIES)[number];

export const HANDOFF_RECOVERY_ELIGIBILITIES = [
  "ELIGIBLE_REQUESTED",
  "ELIGIBLE_FIRST_MUTATION",
  "ELIGIBLE_PROVEN_SAFE_RETRY",
  "VERIFY_REMOTE_FIRST",
  "REMOTE_CONFIRMED_READY",
  "OUTBOUND_RECOVERY_ONLY",
  "LEASE_ACTIVE",
  "LEASE_EXPIRED",
  "BACKOFF",
  "MUTATION_BUDGET_EXHAUSTED_RECONCILE_ONLY",
  "INCONSISTENT_STATE",
  "TERMINAL",
] as const;

export type HandoffRecoveryEligibility =
  (typeof HANDOFF_RECOVERY_ELIGIBILITIES)[number];

export const HANDOFF_RECOVERY_ATTEMPT_RESULTS = [
  "CLAIMED",
  "REMOTE_BOUNDARY_STARTED",
  "MUTATION_ACKNOWLEDGED",
  "MUTATION_FAILED_SAFE",
  "MUTATION_AMBIGUOUS",
  "REMOTE_CONFIRMED",
  "CONFIRMATION_PENDING",
  "RECONCILIATION_REQUIRED",
  "REMOTE_READ_FAILED",
  "DESTINATION_UNRESOLVED",
  "MUTATION_BLOCKED_REMOTE_SCOPE",
  "MUTATION_BLOCKED_UNSAFE",
  "REMOTE_NOT_CONFIRMED",
  "REMOTE_VERIFICATION_FAILED",
  "VERIFICATION_FAILED",
  "BACKOFF",
  "BUDGET_EXHAUSTED",
  "CLAIM_LOST",
  "FAILED_TERMINAL",
  "SUPERSEDED",
  "ABANDONED_BEFORE_BOUNDARY",
  "ABANDONED_AFTER_BOUNDARY",
  "LEASE_EXPIRED_BEFORE_BOUNDARY",
  "LEASE_EXPIRED_AFTER_BOUNDARY",
] as const;

export type HandoffRecoveryAttemptResult =
  (typeof HANDOFF_RECOVERY_ATTEMPT_RESULTS)[number];

export type HandoffRecoveryLeasePlan = Readonly<{
  schemaVersion: typeof HANDOFF_ATTEMPT_SCHEMA_VERSION;
  operationId: string;
  attemptNumber: number;
  owner: string;
  startedAt: Date;
  expiresAt: Date;
}>;

export type HandoffRecoveryMutationClassification = Readonly<{
  result: Extract<
    HandoffRecoveryAttemptResult,
    "MUTATION_FAILED_SAFE" | "MUTATION_AMBIGUOUS" | "FAILED_TERMINAL"
  >;
  recoverySafety: HandoffRecoverySafety;
  operationStatus: Extract<
    OperationalHandoffStatus,
    "LOCALLY_BLOCKED" | "RECONCILIATION_REQUIRED" | "FAILED_TERMINAL"
  >;
  httpStatus: number | null;
  errorClass: string;
  errorCode: string;
}>;

export type OperationalHandoffConfirmationContract = Readonly<{
  schemaVersion: typeof OPERATIONAL_HANDOFF_CONFIRMATION_CONTRACT_VERSION;
  turnExecutionId: string;
  decisionId: string;
  contextVersion: number;
  blockOrdinal: 1;
  content: typeof OPERATIONAL_HANDOFF_CONFIRMATION_TEXT;
  contentHash: string;
}>;

const PROVEN_PRE_BOUNDARY_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function digest(parts: readonly unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function normalizeTechnicalIdentifier(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  return candidate &&
    candidate.length <= 180 &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(candidate)
    ? candidate
    : null;
}

export function sanitizeHandoffRecoveryTechnicalCode(
  value: unknown,
  fallback = "HANDOFF_RECOVERY_UNKNOWN",
): string {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const status =
    typeof record.status === "number" && Number.isInteger(record.status)
      ? record.status
      : typeof record.statusCode === "number" && Number.isInteger(record.statusCode)
        ? record.statusCode
        : null;
  if (status !== null && status >= 100 && status <= 599) return `HTTP_${status}`;
  const raw =
    typeof record.code === "string"
      ? record.code
      : value instanceof Error
        ? value.message
        : typeof value === "string"
          ? value
          : "";
  const candidate = raw.trim().toUpperCase();
  if (/^[A-Z][A-Z0-9_:-]{0,119}$/.test(candidate)) return candidate;
  const safeFallback = fallback.trim().toUpperCase();
  return /^[A-Z][A-Z0-9_:-]{0,119}$/.test(safeFallback)
    ? safeFallback
    : "HANDOFF_RECOVERY_UNKNOWN";
}

export function fingerprintHandoffRecoveryLeaseOwner(owner: string | null): string | null {
  return owner
    ? `lease_${createHash("sha256").update(owner).digest("hex").slice(0, 16)}`
    : null;
}

export function createHandoffRecoveryLeasePlan(input: {
  operationId: string;
  attemptNumber: number;
  owner: string;
  startedAt: Date;
  leaseMs?: number;
}): HandoffRecoveryLeasePlan {
  const operationId = normalizeTechnicalIdentifier(input.operationId);
  const owner = normalizeTechnicalIdentifier(input.owner);
  const leaseMs = input.leaseMs ?? DEFAULT_HANDOFF_RECOVERY_LEASE_MS;
  if (!operationId) throw new Error("HANDOFF_RECOVERY_OPERATION_ID_INVALID");
  if (!owner) throw new Error("HANDOFF_RECOVERY_LEASE_OWNER_INVALID");
  if (!Number.isInteger(input.attemptNumber) || input.attemptNumber < 1) {
    throw new Error("HANDOFF_RECOVERY_ATTEMPT_NUMBER_INVALID");
  }
  if (!Number.isFinite(input.startedAt.getTime())) {
    throw new Error("HANDOFF_RECOVERY_LEASE_START_INVALID");
  }
  if (!Number.isInteger(leaseMs) || leaseMs < 1 || leaseMs > 86_400_000) {
    throw new Error("HANDOFF_RECOVERY_LEASE_DURATION_INVALID");
  }
  return Object.freeze({
    schemaVersion: HANDOFF_ATTEMPT_SCHEMA_VERSION,
    operationId,
    attemptNumber: input.attemptNumber,
    owner,
    startedAt: new Date(input.startedAt),
    expiresAt: new Date(input.startedAt.getTime() + leaseMs),
  });
}

export function calculateHandoffRecoveryBackoff(input: {
  operationId: string;
  attemptNumber: number;
  now: Date;
  scheduleMs?: readonly number[];
  capMs?: number;
  jitterRatio?: number;
}): { delayMs: number; nextEligibleAt: Date } {
  const operationId = normalizeTechnicalIdentifier(input.operationId);
  if (!operationId) throw new Error("HANDOFF_RECOVERY_OPERATION_ID_INVALID");
  if (!Number.isInteger(input.attemptNumber) || input.attemptNumber < 1) {
    throw new Error("HANDOFF_RECOVERY_ATTEMPT_NUMBER_INVALID");
  }
  if (!Number.isFinite(input.now.getTime())) {
    throw new Error("HANDOFF_RECOVERY_CLOCK_INVALID");
  }
  const schedule =
    input.scheduleMs?.length && input.scheduleMs.every((value) => value >= 0)
      ? input.scheduleMs
      : DEFAULT_HANDOFF_RECOVERY_BACKOFF_MS;
  const cap = Math.max(1, input.capMs ?? DEFAULT_HANDOFF_RECOVERY_BACKOFF_CAP_MS);
  const base = Math.min(
    schedule[Math.min(input.attemptNumber - 1, schedule.length - 1)] ?? cap,
    cap,
  );
  const jitterRatio = Math.max(0, Math.min(input.jitterRatio ?? 0.1, 0.5));
  const entropy = Number.parseInt(
    digest([
      HANDOFF_RECOVERY_SCHEMA_VERSION,
      "backoff",
      operationId,
      input.attemptNumber,
    ]).slice(0, 8),
    16,
  );
  const jitter = Math.floor(base * jitterRatio * (entropy / 0xffffffff));
  const delayMs = Math.min(base + jitter, cap);
  return {
    delayMs,
    nextEligibleAt: new Date(input.now.getTime() + delayMs),
  };
}

export function evaluateHandoffRecoveryEligibility(input: {
  status: string;
  recoverySafety: string;
  attemptCount: number;
  maxAttempts: number;
  attemptOwner: string | null;
  claimExpiresAt: Date | null;
  nextEligibleAt: Date | null;
  now: Date;
}): HandoffRecoveryEligibility {
  if (
    input.status === "COMPLETED" ||
    input.status === "FAILED_TERMINAL" ||
    input.status === "SUPERSEDED"
  ) {
    return "TERMINAL";
  }
  if (
    (input.attemptOwner === null) !== (input.claimExpiresAt === null) ||
    input.attemptCount < 0 ||
    input.maxAttempts < 1
  ) {
    return "INCONSISTENT_STATE";
  }
  if (input.attemptOwner && input.claimExpiresAt) {
    return input.claimExpiresAt.getTime() > input.now.getTime()
      ? "LEASE_ACTIVE"
      : "LEASE_EXPIRED";
  }
  if (input.status === "REMOTE_CONFIRMED") return "REMOTE_CONFIRMED_READY";
  if (input.status === "CONFIRMATION_PENDING") return "OUTBOUND_RECOVERY_ONLY";
  if (
    input.status === "REMOTE_PENDING" ||
    input.status === "RECONCILIATION_REQUIRED"
  ) {
    return "VERIFY_REMOTE_FIRST";
  }
  if (input.status === "REQUESTED") {
    return input.attemptCount === 0 ? "ELIGIBLE_REQUESTED" : "INCONSISTENT_STATE";
  }
  if (input.status !== "LOCALLY_BLOCKED") return "TERMINAL";
  if (input.attemptCount === 0) return "ELIGIBLE_FIRST_MUTATION";
  if (input.attemptCount >= input.maxAttempts) {
    return "MUTATION_BUDGET_EXHAUSTED_RECONCILE_ONLY";
  }
  if (input.recoverySafety !== "PROVEN_SAFE") return "VERIFY_REMOTE_FIRST";
  if (input.nextEligibleAt && input.nextEligibleAt.getTime() > input.now.getTime()) {
    return "BACKOFF";
  }
  return "ELIGIBLE_PROVEN_SAFE_RETRY";
}

export function classifyExpiredHandoffLease(input: {
  boundaryStartedAt: Date | null;
}): Readonly<{
  result: Extract<
    HandoffRecoveryAttemptResult,
    "LEASE_EXPIRED_BEFORE_BOUNDARY" | "LEASE_EXPIRED_AFTER_BOUNDARY"
  >;
  recoverySafety: Extract<HandoffRecoverySafety, "PROVEN_SAFE" | "VERIFY_REMOTE_FIRST">;
  operationStatus: Extract<
    OperationalHandoffStatus,
    "LOCALLY_BLOCKED" | "RECONCILIATION_REQUIRED"
  >;
}> {
  return input.boundaryStartedAt
    ? Object.freeze({
        result: "LEASE_EXPIRED_AFTER_BOUNDARY" as const,
        recoverySafety: "VERIFY_REMOTE_FIRST" as const,
        operationStatus: "RECONCILIATION_REQUIRED" as const,
      })
    : Object.freeze({
        result: "LEASE_EXPIRED_BEFORE_BOUNDARY" as const,
        recoverySafety: "PROVEN_SAFE" as const,
        operationStatus: "LOCALLY_BLOCKED" as const,
      });
}

export function classifyHandoffMutationFailure(input: {
  kind: "BEFORE_BOUNDARY" | "HTTP" | "TRANSPORT";
  boundaryStarted: boolean;
  httpStatus?: number | null;
  errorCode?: string | null;
}): HandoffRecoveryMutationClassification {
  const errorCode = sanitizeHandoffRecoveryTechnicalCode(
    input.errorCode ??
      (input.httpStatus ? `HTTP_${input.httpStatus}` : "HANDOFF_MUTATION_FAILED"),
    "HANDOFF_MUTATION_FAILED",
  );
  if (input.kind === "BEFORE_BOUNDARY") {
    return Object.freeze({
      result: "MUTATION_FAILED_SAFE",
      recoverySafety: "PROVEN_SAFE",
      operationStatus: "LOCALLY_BLOCKED",
      httpStatus: null,
      errorClass: "HANDOFF_MUTATION_BEFORE_BOUNDARY",
      errorCode,
    });
  }
  if (input.kind === "HTTP") {
    const httpStatus = input.httpStatus ?? null;
    const terminal4xx =
      httpStatus !== null &&
      httpStatus >= 400 &&
      httpStatus < 500 &&
      ![408, 425, 429].includes(httpStatus);
    return terminal4xx
      ? Object.freeze({
          result: "FAILED_TERMINAL" as const,
          recoverySafety: "NOT_RETRYABLE" as const,
          operationStatus: "FAILED_TERMINAL" as const,
          httpStatus,
          errorClass: "CHATWOOT_HANDOFF_HTTP",
          errorCode: `HTTP_${httpStatus}`,
        })
      : Object.freeze({
          result: "MUTATION_AMBIGUOUS" as const,
          recoverySafety: "VERIFY_REMOTE_FIRST" as const,
          operationStatus: "RECONCILIATION_REQUIRED" as const,
          httpStatus,
          errorClass: "CHATWOOT_HANDOFF_HTTP_AFTER_BOUNDARY",
          errorCode: httpStatus ? `HTTP_${httpStatus}` : errorCode,
        });
  }
  if (!input.boundaryStarted && PROVEN_PRE_BOUNDARY_ERROR_CODES.has(errorCode)) {
    return Object.freeze({
      result: "MUTATION_FAILED_SAFE",
      recoverySafety: "PROVEN_SAFE",
      operationStatus: "LOCALLY_BLOCKED",
      httpStatus: null,
      errorClass: "CHATWOOT_HANDOFF_CONNECTION",
      errorCode,
    });
  }
  return Object.freeze({
    result: "MUTATION_AMBIGUOUS",
    recoverySafety: input.boundaryStarted ? "VERIFY_REMOTE_FIRST" : "UNKNOWN",
    operationStatus: "RECONCILIATION_REQUIRED",
    httpStatus: null,
    errorClass: input.boundaryStarted
      ? "CHATWOOT_HANDOFF_TRANSPORT_AFTER_BOUNDARY"
      : "CHATWOOT_HANDOFF_TRANSPORT_UNKNOWN",
    errorCode,
  });
}

export function createOperationalHandoffConfirmationContract(input: {
  turnExecutionId: string;
  decisionId: string;
  contextVersion: number;
}): OperationalHandoffConfirmationContract {
  const turnExecutionId = normalizeTechnicalIdentifier(input.turnExecutionId);
  const decisionId = normalizeTechnicalIdentifier(input.decisionId);
  if (!turnExecutionId) throw new Error("HANDOFF_CONFIRMATION_TURN_ID_INVALID");
  if (!decisionId) throw new Error("HANDOFF_CONFIRMATION_DECISION_ID_INVALID");
  if (!Number.isInteger(input.contextVersion) || input.contextVersion < 1) {
    throw new Error("HANDOFF_CONFIRMATION_CONTEXT_VERSION_INVALID");
  }
  return Object.freeze({
    schemaVersion: OPERATIONAL_HANDOFF_CONFIRMATION_CONTRACT_VERSION,
    turnExecutionId,
    decisionId,
    contextVersion: input.contextVersion,
    blockOrdinal: 1,
    content: OPERATIONAL_HANDOFF_CONFIRMATION_TEXT,
    contentHash: createHash("sha256")
      .update(OPERATIONAL_HANDOFF_CONFIRMATION_TEXT)
      .digest("hex"),
  });
}
