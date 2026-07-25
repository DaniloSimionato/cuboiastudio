import { createHash } from "node:crypto";
import { V1_COMPATIBILITY_POLICY } from "./turn-execution-manifest";

export const OUTBOUND_DELIVERY_SCHEMA_VERSION = "ASSISTANT_OUTBOUND_DELIVERY_V1";
export const OUTBOUND_DELIVERY_IDEMPOTENCY_ALGORITHM =
  "sha256/assistant-outbound-delivery-v1";
export const OUTBOUND_RECOVERY_SCHEMA_VERSION = "ASSISTANT_OUTBOUND_RECOVERY_V1";
export const OUTBOUND_ATTEMPT_SCHEMA_VERSION = "ASSISTANT_OUTBOUND_ATTEMPT_V1";
export const OUTBOUND_REMOTE_REFERENCE_ATTRIBUTE = "cubo_outbound_delivery_id";
export const OUTBOUND_RECOVERABLE_PAYLOAD_CONTRACT = "CHATWOOT_TEXT_V1_RECOVERABLE";
export const OUTBOUND_LEGACY_PAYLOAD_CONTRACT = "V1_LEGACY_UNVERIFIED";
export const DEFAULT_OUTBOUND_LEASE_MS = 60_000;
export const DEFAULT_OUTBOUND_MAX_ATTEMPTS = 3;
export const DEFAULT_OUTBOUND_BACKOFF_MS = [60_000, 300_000, 1_800_000] as const;
export const DEFAULT_OUTBOUND_BACKOFF_CAP_MS = 3_600_000;

export const OUTBOUND_DELIVERY_STATUSES = [
  "PENDING",
  "SENDING",
  "ACKNOWLEDGED",
  "FAILED_RETRYABLE",
  "FAILED_TERMINAL",
  "UNCERTAIN",
  "CANCELLED_STALE",
] as const;

export type OutboundDeliveryStatus = (typeof OUTBOUND_DELIVERY_STATUSES)[number];

export const OUTBOUND_RETRY_SAFETIES = [
  "PROVEN_SAFE",
  "RECONCILE_REQUIRED",
  "NOT_RETRYABLE",
  "UNKNOWN",
] as const;

export type OutboundRetrySafety = (typeof OUTBOUND_RETRY_SAFETIES)[number];

export type OutboundTransportClassification = Readonly<{
  deliveryStatus: Exclude<OutboundDeliveryStatus, "PENDING" | "SENDING" | "ACKNOWLEDGED">;
  retrySafety: OutboundRetrySafety;
  errorClass: string;
  errorCode: string;
  httpStatus: number | null;
}>;

const PROVEN_PRE_ACCEPTANCE_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
]);

export function classifyOutboundFailure(input: {
  kind: "HTTP" | "TRANSPORT" | "BEFORE_BOUNDARY" | "CONFIGURATION";
  httpStatus?: number | null;
  errorCode?: string | null;
}): OutboundTransportClassification {
  const errorCode = (input.errorCode ?? "UNKNOWN_OUTBOUND_ERROR").toUpperCase();
  if (input.kind === "CONFIGURATION") {
    return {
      deliveryStatus: "FAILED_TERMINAL",
      retrySafety: "NOT_RETRYABLE",
      errorClass: "OUTBOUND_CONFIGURATION",
      errorCode,
      httpStatus: null,
    };
  }
  if (input.kind === "BEFORE_BOUNDARY") {
    return {
      deliveryStatus: "FAILED_RETRYABLE",
      retrySafety: "PROVEN_SAFE",
      errorClass: "OUTBOUND_BEFORE_BOUNDARY",
      errorCode,
      httpStatus: null,
    };
  }
  if (input.kind === "HTTP") {
    const status = input.httpStatus ?? 0;
    if (status >= 500 || [408, 425, 429].includes(status)) {
      return {
        deliveryStatus: "UNCERTAIN",
        retrySafety: "RECONCILE_REQUIRED",
        errorClass: "CHATWOOT_HTTP_AFTER_BOUNDARY",
        errorCode: `HTTP_${status}`,
        httpStatus: status,
      };
    }
    return {
      deliveryStatus: "FAILED_TERMINAL",
      retrySafety: "NOT_RETRYABLE",
      errorClass: "CHATWOOT_HTTP",
      errorCode: `HTTP_${status}`,
      httpStatus: status,
    };
  }
  if (PROVEN_PRE_ACCEPTANCE_ERROR_CODES.has(errorCode)) {
    return {
      deliveryStatus: "FAILED_RETRYABLE",
      retrySafety: "PROVEN_SAFE",
      errorClass: "CHATWOOT_CONNECTION",
      errorCode,
      httpStatus: null,
    };
  }
  return {
    deliveryStatus: "UNCERTAIN",
    retrySafety: "RECONCILE_REQUIRED",
    errorClass: "CHATWOOT_TRANSPORT_AMBIGUOUS",
    errorCode,
    httpStatus: null,
  };
}

export function calculateOutboundBackoff(input: {
  deliveryId: string;
  attemptNumber: number;
  now: Date;
  scheduleMs?: readonly number[];
  capMs?: number;
  jitterRatio?: number;
}): { delayMs: number; nextEligibleAt: Date } {
  const schedule = input.scheduleMs ?? DEFAULT_OUTBOUND_BACKOFF_MS;
  const cap = input.capMs ?? DEFAULT_OUTBOUND_BACKOFF_CAP_MS;
  const base = Math.min(
    schedule[Math.min(Math.max(input.attemptNumber - 1, 0), schedule.length - 1)] ?? cap,
    cap,
  );
  const jitterRatio = Math.max(0, Math.min(input.jitterRatio ?? 0.1, 0.5));
  const entropy = Number.parseInt(
    digest(["outbound-backoff-v1", input.deliveryId, input.attemptNumber]).slice(0, 8),
    16,
  );
  const jitter = Math.floor(base * jitterRatio * (entropy / 0xffffffff));
  const delayMs = Math.min(base + jitter, cap);
  return {
    delayMs,
    nextEligibleAt: new Date(input.now.getTime() + delayMs),
  };
}

export type OutboundRecoveryEligibility =
  | "ELIGIBLE_PENDING"
  | "ELIGIBLE_PROVEN_SAFE_RETRY"
  | "RECONCILIATION_REQUIRED"
  | "LEASE_ACTIVE"
  | "LEASE_EXPIRED"
  | "BACKOFF"
  | "BUDGET_EXHAUSTED"
  | "TERMINAL";

export function evaluateOutboundRecoveryEligibility(input: {
  status: string;
  retrySafety: string;
  attemptCount: number;
  maxAttempts: number;
  claimExpiresAt: Date | null;
  nextEligibleAt: Date | null;
  now: Date;
}): OutboundRecoveryEligibility {
  if (
    input.status === "ACKNOWLEDGED" ||
    input.status === "FAILED_TERMINAL" ||
    input.status === "CANCELLED_STALE"
  ) {
    return "TERMINAL";
  }
  if (input.status === "SENDING") {
    return input.claimExpiresAt && input.claimExpiresAt.getTime() > input.now.getTime()
      ? "LEASE_ACTIVE"
      : "LEASE_EXPIRED";
  }
  if (input.status === "UNCERTAIN") return "RECONCILIATION_REQUIRED";
  if (input.attemptCount >= input.maxAttempts) return "BUDGET_EXHAUSTED";
  if (input.status === "PENDING" && input.attemptCount === 0) {
    return "ELIGIBLE_PENDING";
  }
  if (input.status === "FAILED_RETRYABLE" && input.retrySafety === "PROVEN_SAFE") {
    if (input.nextEligibleAt && input.nextEligibleAt.getTime() > input.now.getTime()) {
      return "BACKOFF";
    }
    return "ELIGIBLE_PROVEN_SAFE_RETRY";
  }
  if (
    input.retrySafety === "RECONCILE_REQUIRED" ||
    input.retrySafety === "UNKNOWN"
  ) {
    return "RECONCILIATION_REQUIRED";
  }
  return "TERMINAL";
}

export type OutboundDeliveryPlan = Readonly<{
  schemaVersion: typeof OUTBOUND_DELIVERY_SCHEMA_VERSION;
  idempotencyKey: string;
  idempotencyAlgorithm: typeof OUTBOUND_DELIVERY_IDEMPOTENCY_ALGORITHM;
  turnExecutionId: string;
  decisionId: string;
  blockOrdinal: number;
  policyVersion: typeof V1_COMPATIBILITY_POLICY;
  expectedContextVersion: number;
  expectedControlRevision: number;
  sender: string;
  payloadHash: string;
  payloadSize: number;
}>;

function digest(parts: readonly unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function createOutboundDeliveryIdempotencyKey(input: {
  turnExecutionId: string;
  decisionId: string;
  blockOrdinal: number;
  policyVersion?: string;
}): string {
  const value = digest([
    OUTBOUND_DELIVERY_IDEMPOTENCY_ALGORITHM,
    input.policyVersion ?? V1_COMPATIBILITY_POLICY,
    input.turnExecutionId,
    input.decisionId,
    input.blockOrdinal,
  ]);
  return `outbound_v1_${value.slice(0, 32)}`;
}

export function createOutboundPayloadFingerprint(content: string): {
  payloadHash: string;
  payloadSize: number;
} {
  return {
    payloadHash: `sha256:${createHash("sha256").update(content).digest("hex")}`,
    payloadSize: Buffer.byteLength(content, "utf8"),
  };
}

export function createOutboundDeliveryPlan(input: {
  turnExecutionId: string;
  decisionId: string;
  blockOrdinal: number;
  expectedContextVersion: number;
  expectedControlRevision: number;
  sender: string;
  content: string;
}): OutboundDeliveryPlan {
  const payload = createOutboundPayloadFingerprint(input.content);
  return Object.freeze({
    schemaVersion: OUTBOUND_DELIVERY_SCHEMA_VERSION,
    idempotencyKey: createOutboundDeliveryIdempotencyKey(input),
    idempotencyAlgorithm: OUTBOUND_DELIVERY_IDEMPOTENCY_ALGORITHM,
    turnExecutionId: input.turnExecutionId,
    decisionId: input.decisionId,
    blockOrdinal: input.blockOrdinal,
    policyVersion: V1_COMPATIBILITY_POLICY,
    expectedContextVersion: input.expectedContextVersion,
    expectedControlRevision: input.expectedControlRevision,
    sender: input.sender,
    ...payload,
  });
}

export function isOutboundDeliveryStatus(value: string): value is OutboundDeliveryStatus {
  return (OUTBOUND_DELIVERY_STATUSES as readonly string[]).includes(value);
}
