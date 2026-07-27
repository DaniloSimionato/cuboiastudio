import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_HANDOFF_RECOVERY_LEASE_MS,
  HANDOFF_ATTEMPT_SCHEMA_VERSION,
  HANDOFF_RECOVERY_SCHEMA_VERSION,
  OPERATIONAL_HANDOFF_CONFIRMATION_CONTRACT_VERSION,
  OPERATIONAL_HANDOFF_CONFIRMATION_TEXT,
  calculateHandoffRecoveryBackoff,
  classifyExpiredHandoffLease,
  classifyHandoffMutationFailure,
  createHandoffRecoveryLeasePlan,
  createOperationalHandoffConfirmationContract,
  evaluateHandoffRecoveryEligibility,
  fingerprintHandoffRecoveryLeaseOwner,
  sanitizeHandoffRecoveryTechnicalCode,
} from "../dist/assistant-conversations/handoff-recovery.js";

const now = new Date("2026-07-25T12:00:00.000Z");

function eligibility(overrides = {}) {
  return evaluateHandoffRecoveryEligibility({
    status: "LOCALLY_BLOCKED",
    recoverySafety: "UNKNOWN",
    attemptCount: 0,
    maxAttempts: 3,
    attemptOwner: null,
    claimExpiresAt: null,
    nextEligibleAt: null,
    now,
    ...overrides,
  });
}

test("eligibilidade separa bloqueio local, verificação, confirmação e terminais", () => {
  assert.equal(eligibility({ status: "REQUESTED" }), "ELIGIBLE_REQUESTED");
  assert.equal(eligibility(), "ELIGIBLE_FIRST_MUTATION");
  assert.equal(
    eligibility({ status: "REMOTE_PENDING", attemptCount: 1 }),
    "VERIFY_REMOTE_FIRST",
  );
  assert.equal(
    eligibility({ status: "RECONCILIATION_REQUIRED", attemptCount: 1 }),
    "VERIFY_REMOTE_FIRST",
  );
  assert.equal(
    eligibility({ status: "REMOTE_CONFIRMED", attemptCount: 1 }),
    "REMOTE_CONFIRMED_READY",
  );
  assert.equal(
    eligibility({ status: "CONFIRMATION_PENDING", attemptCount: 1 }),
    "OUTBOUND_RECOVERY_ONLY",
  );
  for (const status of ["COMPLETED", "FAILED_TERMINAL", "SUPERSEDED"]) {
    assert.equal(eligibility({ status, attemptCount: 1 }), "TERMINAL");
  }
});

test("lease ativo, expirado e estado inconsistente falham fechado", () => {
  assert.equal(
    eligibility({
      attemptCount: 1,
      attemptOwner: "worker-a",
      claimExpiresAt: new Date(now.getTime() + 1_000),
    }),
    "LEASE_ACTIVE",
  );
  assert.equal(
    eligibility({
      attemptCount: 1,
      attemptOwner: "worker-a",
      claimExpiresAt: new Date(now.getTime() - 1),
    }),
    "LEASE_EXPIRED",
  );
  assert.equal(
    eligibility({
      attemptCount: 1,
      attemptOwner: "worker-a",
      claimExpiresAt: null,
    }),
    "INCONSISTENT_STATE",
  );
  assert.equal(
    eligibility({
      status: "REQUESTED",
      attemptCount: 1,
    }),
    "INCONSISTENT_STATE",
  );
});

test("retry de mutation exige safety, backoff e budget independentes", () => {
  assert.equal(
    eligibility({
      attemptCount: 1,
      recoverySafety: "UNKNOWN",
    }),
    "VERIFY_REMOTE_FIRST",
  );
  assert.equal(
    eligibility({
      attemptCount: 1,
      recoverySafety: "VERIFY_REMOTE_FIRST",
    }),
    "VERIFY_REMOTE_FIRST",
  );
  assert.equal(
    eligibility({
      attemptCount: 1,
      recoverySafety: "PROVEN_SAFE",
      nextEligibleAt: new Date(now.getTime() + 1_000),
    }),
    "BACKOFF",
  );
  assert.equal(
    eligibility({
      attemptCount: 1,
      recoverySafety: "PROVEN_SAFE",
      nextEligibleAt: new Date(now.getTime() - 1),
    }),
    "ELIGIBLE_PROVEN_SAFE_RETRY",
  );
  assert.equal(
    eligibility({
      attemptCount: 3,
      maxAttempts: 3,
      recoverySafety: "PROVEN_SAFE",
    }),
    "MUTATION_BUDGET_EXHAUSTED_RECONCILE_ONLY",
  );
});

test("lease abandonado distingue queda antes e depois da fronteira", () => {
  assert.deepEqual(classifyExpiredHandoffLease({ boundaryStartedAt: null }), {
    result: "LEASE_EXPIRED_BEFORE_BOUNDARY",
    recoverySafety: "PROVEN_SAFE",
    operationStatus: "LOCALLY_BLOCKED",
  });
  assert.deepEqual(
    classifyExpiredHandoffLease({ boundaryStartedAt: new Date(now) }),
    {
      result: "LEASE_EXPIRED_AFTER_BOUNDARY",
      recoverySafety: "VERIFY_REMOTE_FIRST",
      operationStatus: "RECONCILIATION_REQUIRED",
    },
  );
});

test("classificação de mutation não trata 5xx ou timeout após boundary como retry seguro", () => {
  const beforeBoundary = classifyHandoffMutationFailure({
    kind: "BEFORE_BOUNDARY",
    boundaryStarted: false,
    errorCode: "SERIALIZATION_FAILED",
  });
  assert.equal(beforeBoundary.recoverySafety, "PROVEN_SAFE");
  assert.equal(beforeBoundary.operationStatus, "LOCALLY_BLOCKED");

  const connectionRefused = classifyHandoffMutationFailure({
    kind: "TRANSPORT",
    boundaryStarted: false,
    errorCode: "ECONNREFUSED",
  });
  assert.equal(connectionRefused.recoverySafety, "PROVEN_SAFE");

  const terminal4xx = classifyHandoffMutationFailure({
    kind: "HTTP",
    boundaryStarted: true,
    httpStatus: 422,
  });
  assert.equal(terminal4xx.recoverySafety, "NOT_RETRYABLE");
  assert.equal(terminal4xx.operationStatus, "FAILED_TERMINAL");

  const ambiguous5xx = classifyHandoffMutationFailure({
    kind: "HTTP",
    boundaryStarted: true,
    httpStatus: 503,
  });
  assert.equal(ambiguous5xx.recoverySafety, "VERIFY_REMOTE_FIRST");
  assert.equal(ambiguous5xx.operationStatus, "RECONCILIATION_REQUIRED");

  const timeout = classifyHandoffMutationFailure({
    kind: "TRANSPORT",
    boundaryStarted: true,
    errorCode: "ABORT_ERR",
  });
  assert.equal(timeout.recoverySafety, "VERIFY_REMOTE_FIRST");

  const unknownPreBoundary = classifyHandoffMutationFailure({
    kind: "TRANSPORT",
    boundaryStarted: false,
    errorCode: "UNCLASSIFIED_TRANSPORT",
  });
  assert.equal(unknownPreBoundary.recoverySafety, "UNKNOWN");
  assert.equal(unknownPreBoundary.operationStatus, "RECONCILIATION_REQUIRED");
});

test("lease e backoff são determinísticos, limitados e sem PII", () => {
  const lease = createHandoffRecoveryLeasePlan({
    operationId: "handoff_v1_0123456789abcdef",
    attemptNumber: 2,
    owner: "worker-technical-01",
    startedAt: now,
  });
  assert.equal(lease.schemaVersion, HANDOFF_ATTEMPT_SCHEMA_VERSION);
  assert.equal(
    lease.expiresAt.toISOString(),
    new Date(now.getTime() + DEFAULT_HANDOFF_RECOVERY_LEASE_MS).toISOString(),
  );
  assert.equal(Object.isFrozen(lease), true);
  assert.match(fingerprintHandoffRecoveryLeaseOwner(lease.owner), /^lease_[a-f0-9]{16}$/);

  const first = calculateHandoffRecoveryBackoff({
    operationId: lease.operationId,
    attemptNumber: 2,
    now,
  });
  const second = calculateHandoffRecoveryBackoff({
    operationId: lease.operationId,
    attemptNumber: 2,
    now,
  });
  assert.deepEqual(first, second);
  assert.ok(first.delayMs >= 300_000);
  assert.ok(first.delayMs <= 3_600_000);
  assert.equal(
    first.nextEligibleAt.getTime(),
    now.getTime() + first.delayMs,
  );
});

test("contrato de confirmação reidrata o texto original sem criar outra decisão", () => {
  const contract = createOperationalHandoffConfirmationContract({
    turnExecutionId: "turn_v1_0123456789abcdef",
    decisionId: "decision_v1_0123456789abcdef",
    contextVersion: 2,
  });
  assert.equal(
    contract.schemaVersion,
    OPERATIONAL_HANDOFF_CONFIRMATION_CONTRACT_VERSION,
  );
  assert.equal(contract.content, OPERATIONAL_HANDOFF_CONFIRMATION_TEXT);
  assert.equal(contract.content, "Transferindo para um atendente...");
  assert.equal(contract.blockOrdinal, 1);
  assert.match(contract.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(HANDOFF_RECOVERY_SCHEMA_VERSION, "ASSISTANT_HANDOFF_RECOVERY_V1");
});

test("sanitização mantém somente códigos técnicos e fingerprint de owner", () => {
  assert.equal(
    sanitizeHandoffRecoveryTechnicalCode({ status: 503 }),
    "HTTP_503",
  );
  assert.equal(
    sanitizeHandoffRecoveryTechnicalCode({ code: "econnrefused" }),
    "ECONNREFUSED",
  );
  assert.equal(
    sanitizeHandoffRecoveryTechnicalCode("texto com telefone 000000000"),
    "HANDOFF_RECOVERY_UNKNOWN",
  );
  const serialized = JSON.stringify({
    code: sanitizeHandoffRecoveryTechnicalCode("authorization: bearer secret"),
    owner: fingerprintHandoffRecoveryLeaseOwner("worker-secret-value"),
  });
  assert.doesNotMatch(serialized, /authorization|bearer|secret-value/i);
});
