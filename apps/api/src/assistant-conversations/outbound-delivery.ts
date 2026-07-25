import { createHash } from "node:crypto";
import { V1_COMPATIBILITY_POLICY } from "./turn-execution-manifest";

export const OUTBOUND_DELIVERY_SCHEMA_VERSION = "ASSISTANT_OUTBOUND_DELIVERY_V1";
export const OUTBOUND_DELIVERY_IDEMPOTENCY_ALGORITHM =
  "sha256/assistant-outbound-delivery-v1";

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
