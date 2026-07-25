import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OUTBOUND_DELIVERY_IDEMPOTENCY_ALGORITHM,
  OUTBOUND_DELIVERY_SCHEMA_VERSION,
  OUTBOUND_DELIVERY_STATUSES,
  createOutboundDeliveryIdempotencyKey,
  createOutboundDeliveryPlan,
  createOutboundPayloadFingerprint,
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
