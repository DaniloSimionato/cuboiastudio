import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OUTBOUND_ATTEMPT_SCHEMA_VERSION,
  OUTBOUND_DELIVERY_IDEMPOTENCY_ALGORITHM,
  OUTBOUND_DELIVERY_SCHEMA_VERSION,
  OUTBOUND_DELIVERY_STATUSES,
  OUTBOUND_RECOVERY_SCHEMA_VERSION,
  OUTBOUND_RETRY_SAFETIES,
  calculateOutboundBackoff,
  classifyOutboundFailure,
  createOutboundDeliveryIdempotencyKey,
  createOutboundDeliveryPlan,
  createOutboundPayloadFingerprint,
  evaluateOutboundRecoveryEligibility,
  isOutboundDeliveryStatus,
} from "../dist/assistant-conversations/outbound-delivery.js";

const identity = {
  turnExecutionId: "turn_v1_0123456789abcdef0123456789abcdef",
  decisionId: "decision_v1_0123456789abcdef0123456789abcdef",
  blockOrdinal: 1,
};

test("idempotency key é determinística, versionada e independente do conteúdo", () => {
  const first = createOutboundDeliveryIdempotencyKey(identity);
  const second = createOutboundDeliveryIdempotencyKey({
    ...identity,
    policyVersion: "V1_COMPATIBILITY_POLICY",
  });

  assert.equal(first, second);
  assert.match(first, /^outbound_v1_[a-f0-9]{32}$/);
  assert.equal(
    OUTBOUND_DELIVERY_IDEMPOTENCY_ALGORITHM,
    "sha256/assistant-outbound-delivery-v1",
  );
  assert.doesNotMatch(first, /telefone|conteúdo|token|authorization/i);
});

test("ordinal participa da unicidade do outbound lógico", () => {
  const first = createOutboundDeliveryIdempotencyKey(identity);
  const second = createOutboundDeliveryIdempotencyKey({
    ...identity,
    blockOrdinal: 2,
  });

  assert.notEqual(first, second);
});

test("plano contém somente fingerprint e tamanho, sem duplicar o payload", () => {
  const content = "Resposta sanitizada que não deve ser persistida no plano.";
  const plan = createOutboundDeliveryPlan({
    ...identity,
    expectedContextVersion: 2,
    expectedControlRevision: 7,
    sender: "CHATWOOT_V1",
    content,
  });

  assert.equal(plan.schemaVersion, OUTBOUND_DELIVERY_SCHEMA_VERSION);
  assert.equal(plan.policyVersion, "V1_COMPATIBILITY_POLICY");
  assert.equal(plan.expectedContextVersion, 2);
  assert.equal(plan.expectedControlRevision, 7);
  assert.equal(plan.payloadSize, Buffer.byteLength(content, "utf8"));
  assert.match(plan.payloadHash, /^sha256:[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(plan), new RegExp(content));
  assert.equal(Object.isFrozen(plan), true);
});

test("fingerprint muda com o payload sem alterar a identidade lógica", () => {
  const first = createOutboundPayloadFingerprint("primeiro");
  const second = createOutboundPayloadFingerprint("segundo");

  assert.notEqual(first.payloadHash, second.payloadHash);
  assert.equal(
    createOutboundDeliveryIdempotencyKey(identity),
    createOutboundDeliveryIdempotencyKey(identity),
  );
});

test("vocabulário de status distingue ack, falhas, incerteza e stale", () => {
  assert.deepEqual(OUTBOUND_DELIVERY_STATUSES, [
    "PENDING",
    "SENDING",
    "ACKNOWLEDGED",
    "FAILED_RETRYABLE",
    "FAILED_TERMINAL",
    "UNCERTAIN",
    "CANCELLED_STALE",
  ]);
  for (const status of OUTBOUND_DELIVERY_STATUSES) {
    assert.equal(isOutboundDeliveryStatus(status), true);
  }
  assert.equal(isOutboundDeliveryStatus("DELIVERED"), false);
});

test("retry safety é dimensão distinta do status e possui contrato versionado", () => {
  assert.equal(OUTBOUND_RECOVERY_SCHEMA_VERSION, "ASSISTANT_OUTBOUND_RECOVERY_V1");
  assert.equal(OUTBOUND_ATTEMPT_SCHEMA_VERSION, "ASSISTANT_OUTBOUND_ATTEMPT_V1");
  assert.deepEqual(OUTBOUND_RETRY_SAFETIES, [
    "PROVEN_SAFE",
    "RECONCILE_REQUIRED",
    "NOT_RETRYABLE",
    "UNKNOWN",
  ]);
});

test("5xx e timeout ambíguo exigem reconciliação, enquanto falha pré-fronteira é segura", () => {
  assert.deepEqual(
    classifyOutboundFailure({ kind: "HTTP", httpStatus: 503 }),
    {
      deliveryStatus: "UNCERTAIN",
      retrySafety: "RECONCILE_REQUIRED",
      errorClass: "CHATWOOT_HTTP_AFTER_BOUNDARY",
      errorCode: "HTTP_503",
      httpStatus: 503,
    },
  );
  assert.deepEqual(
    classifyOutboundFailure({
      kind: "TRANSPORT",
      errorCode: "UND_ERR_SOCKET",
    }),
    {
      deliveryStatus: "UNCERTAIN",
      retrySafety: "RECONCILE_REQUIRED",
      errorClass: "CHATWOOT_TRANSPORT_AMBIGUOUS",
      errorCode: "UND_ERR_SOCKET",
      httpStatus: null,
    },
  );
  assert.equal(
    classifyOutboundFailure({
      kind: "TRANSPORT",
      errorCode: "ECONNREFUSED",
    }).retrySafety,
    "PROVEN_SAFE",
  );
  assert.equal(
    classifyOutboundFailure({
      kind: "BEFORE_BOUNDARY",
      errorCode: "SERIALIZATION_FAILED",
    }).retrySafety,
    "PROVEN_SAFE",
  );
});

test("elegibilidade bloqueia safety desconhecida e nunca repete estado incerto diretamente", () => {
  const now = new Date("2026-07-25T18:00:00.000Z");
  const base = {
    attemptCount: 1,
    maxAttempts: 3,
    claimExpiresAt: null,
    nextEligibleAt: null,
    now,
  };
  assert.equal(
    evaluateOutboundRecoveryEligibility({
      ...base,
      status: "FAILED_RETRYABLE",
      retrySafety: "PROVEN_SAFE",
    }),
    "ELIGIBLE_PROVEN_SAFE_RETRY",
  );
  assert.equal(
    evaluateOutboundRecoveryEligibility({
      ...base,
      status: "FAILED_RETRYABLE",
      retrySafety: "UNKNOWN",
    }),
    "RECONCILIATION_REQUIRED",
  );
  assert.equal(
    evaluateOutboundRecoveryEligibility({
      ...base,
      status: "UNCERTAIN",
      retrySafety: "RECONCILE_REQUIRED",
    }),
    "RECONCILIATION_REQUIRED",
  );
});

test("lease e budget não são autorização implícita de retry", () => {
  const now = new Date("2026-07-25T18:00:00.000Z");
  const base = {
    status: "SENDING",
    retrySafety: "UNKNOWN",
    attemptCount: 1,
    maxAttempts: 3,
    nextEligibleAt: null,
    now,
  };
  assert.equal(
    evaluateOutboundRecoveryEligibility({
      ...base,
      claimExpiresAt: new Date(now.getTime() + 1_000),
    }),
    "LEASE_ACTIVE",
  );
  assert.equal(
    evaluateOutboundRecoveryEligibility({
      ...base,
      claimExpiresAt: new Date(now.getTime() - 1),
    }),
    "LEASE_EXPIRED",
  );
  assert.equal(
    evaluateOutboundRecoveryEligibility({
      ...base,
      status: "FAILED_RETRYABLE",
      retrySafety: "PROVEN_SAFE",
      attemptCount: 3,
      claimExpiresAt: null,
    }),
    "BUDGET_EXHAUSTED",
  );
  assert.equal(
    evaluateOutboundRecoveryEligibility({
      ...base,
      status: "UNCERTAIN",
      retrySafety: "RECONCILE_REQUIRED",
      attemptCount: 3,
      claimExpiresAt: null,
    }),
    "RECONCILIATION_REQUIRED",
  );
});

test("backoff é determinístico, cresce e respeita o teto", () => {
  const now = new Date("2026-07-25T18:00:00.000Z");
  const first = calculateOutboundBackoff({
    deliveryId: "delivery-safe",
    attemptNumber: 1,
    now,
    scheduleMs: [1_000, 5_000],
    capMs: 5_000,
    jitterRatio: 0,
  });
  const second = calculateOutboundBackoff({
    deliveryId: "delivery-safe",
    attemptNumber: 2,
    now,
    scheduleMs: [1_000, 5_000],
    capMs: 5_000,
    jitterRatio: 0,
  });
  assert.equal(first.delayMs, 1_000);
  assert.equal(second.delayMs, 5_000);
  assert.equal(first.nextEligibleAt.toISOString(), "2026-07-25T18:00:01.000Z");
  assert.equal(second.nextEligibleAt.toISOString(), "2026-07-25T18:00:05.000Z");
});
