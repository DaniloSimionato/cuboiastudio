import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_CONTRACT_VERSION,
  createActionEvent,
  createActionId,
  createConfirmationId,
  createExecutionId,
  createIdempotencyKey,
  hashActionArguments,
  isTerminalActionStatus,
  redactActionMetadata,
  serializeActionContract,
  stableJsonStringify,
  toolResultToEvidence,
  transitionActionStatus,
  validateActionConfirmation,
  validateActionRequest,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "company-action-test",
  assistantId: "assistant-action-test",
  conversationId: "conversation-action-test",
  contactId: "contact-action-test",
  contextVersion: 4,
};
const requestedAt = "2026-07-15T12:00:00.000Z";
const expiresAt = "2026-07-15T13:00:00.000Z";
const args = { startAt: "2026-07-16T14:00:00.000Z", resourceId: "resource-1" };
const argumentsHash = hashActionArguments(args);

function action(overrides = {}) {
  const actionId = createActionId({
    ...scope,
    internalMessageId: "message-action-1",
    actionType: "CREATE_BOOKING",
    argumentsHash,
  });
  return {
    contractVersion: ACTION_CONTRACT_VERSION,
    actionId,
    actionType: "CREATE_BOOKING",
    actionCategory: "BOOKING",
    effectType: "REVERSIBLE_EXTERNAL_MUTATION",
    ...scope,
    internalMessageId: "message-action-1",
    flowId: "flow-1",
    sourceIntent: "booking",
    requestedAt,
    expiresAt,
    confirmationPolicy: "EXPLICIT_CUSTOMER_CONFIRMATION",
    requiredParameters: ["resourceId", "startAt"],
    normalizedArguments: args,
    argumentsHash,
    idempotencyKey: createIdempotencyKey({
      ...scope,
      actionType: "CREATE_BOOKING",
      argumentsHash,
    }),
    executionPolicy: {
      retryPolicy: "RECONCILE_BEFORE_RETRY",
      reconciliationPolicy: "RECONCILE_AFTER_TIMEOUT",
      maxAttempts: 1,
      timeoutMs: 5000,
    },
    provenance: { source: "V2_SHADOW", sourceMessageId: "message-action-1" },
    status: "ACTION_PROPOSED",
    ...overrides,
  };
}

function result(overrides = {}) {
  return {
    contractVersion: ACTION_CONTRACT_VERSION,
    executionId: createExecutionId({ actionId: "action-1", attempt: 1, requestedAt }),
    actionId: "action-1",
    toolName: "calendar_checkAvailability",
    status: "SUCCEEDED",
    startedAt: requestedAt,
    completedAt: "2026-07-15T12:00:05.000Z",
    externalReferenceId: "external-reference-1",
    resultCategory: "AVAILABILITY",
    authorityCategories: ["AVAILABILITY"],
    validFrom: requestedAt,
    validUntil: expiresAt,
    resultHash: "a".repeat(64),
    sanitizedResultMetadata: { optionCount: 1 },
    externalEffectMayHaveOccurred: false,
    reconciliationStatus: "NOT_REQUIRED",
    error: null,
    provenance: {
      source: "V1_PIPELINE",
      sourceTool: "calendar_checkAvailability",
      sourceVersion: "v1",
    },
    ...scope,
    ...overrides,
  };
}

test("actionId, idempotency and argument hashes are deterministic", () => {
  const first = action();
  const second = action();
  assert.equal(first.actionId, second.actionId);
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.equal(hashActionArguments({ b: 2, a: 1 }), hashActionArguments({ a: 1, b: 2 }));
  assert.notEqual(
    createActionId({
      ...scope,
      internalMessageId: "message-action-1",
      actionType: "CREATE_BOOKING",
      argumentsHash: hashActionArguments({ ...args, resourceId: "resource-2" }),
    }),
    first.actionId,
  );
  assert.notEqual(
    createActionId({
      ...scope,
      contextVersion: 5,
      internalMessageId: "message-action-1",
      actionType: "CREATE_BOOKING",
      argumentsHash,
    }),
    first.actionId,
  );
  assert.equal(stableJsonStringify({ z: 1, a: 2 }), '{"a":2,"z":1}');
});

test("ActionRequest é versionado e validado sem payload operacional", () => {
  const request = action();
  validateActionRequest(request);
  assert.equal(JSON.parse(serializeActionContract(request)).contractVersion, 1);
  assert.throws(
    () => validateActionRequest({ ...request, argumentsHash: "b".repeat(64) }),
    /ARGUMENTS_HASH_MISMATCH/,
  );
  assert.throws(
    () => validateActionRequest({ ...request, requiredParameters: ["missing"] }),
    /MISSING_PARAMETER/,
  );
  assert.throws(() => serializeActionContract({ contractVersion: 99 }), /VERSION_UNSUPPORTED/);
});

test("máquina aceita confirmação e execução válidas", () => {
  assert.equal(
    transitionActionStatus("ACTION_PROPOSED", "CUSTOMER_CONFIRMATION_REQUESTED"),
    "AWAITING_CUSTOMER_CONFIRMATION",
  );
  assert.equal(
    transitionActionStatus("AWAITING_CUSTOMER_CONFIRMATION", "CUSTOMER_CONFIRMED"),
    "ACTION_CONFIRMED",
  );
  assert.equal(
    transitionActionStatus("ACTION_CONFIRMED", "EXECUTION_REQUESTED"),
    "EXECUTION_QUEUED",
  );
  assert.equal(transitionActionStatus("EXECUTION_QUEUED", "EXECUTION_STARTED"), "EXECUTING");
  assert.equal(transitionActionStatus("EXECUTING", "EXECUTION_SUCCEEDED"), "SUCCEEDED");
  assert.equal(
    transitionActionStatus("ACTION_PROPOSED", "EXECUTION_REQUESTED", {
      confirmationPolicy: "NONE",
    }),
    "EXECUTION_QUEUED",
  );
  assert.throws(
    () =>
      transitionActionStatus("ACTION_PROPOSED", "EXECUTION_REQUESTED", {
        confirmationPolicy: "EXPLICIT_CUSTOMER_CONFIRMATION",
      }),
    /INVALID_TRANSITION/,
  );
  assert.throws(
    () => transitionActionStatus("SUCCEEDED", "EXECUTION_STARTED"),
    /ACTION_ALREADY_TERMINAL/,
  );
  assert.ok(isTerminalActionStatus("RECONCILED_FAILED"));
});

test("timeout de mutação exige reconciliação e estados reconciliados são terminais", () => {
  assert.equal(
    transitionActionStatus("EXECUTING", "EXECUTION_TIMED_OUT"),
    "RECONCILIATION_REQUIRED",
  );
  assert.equal(
    transitionActionStatus("RECONCILIATION_REQUIRED", "RECONCILIATION_STARTED"),
    "RECONCILIATION_REQUIRED",
  );
  assert.equal(
    transitionActionStatus("RECONCILIATION_REQUIRED", "RECONCILIATION_SUCCEEDED"),
    "RECONCILED_SUCCEEDED",
  );
  assert.equal(
    transitionActionStatus("RECONCILIATION_REQUIRED", "RECONCILIATION_FAILED"),
    "RECONCILED_FAILED",
  );
});

test("confirmação é vinculada a ação, escopo, versão e hash", () => {
  const pending = action({ status: "AWAITING_CUSTOMER_CONFIRMATION" });
  const confirmedAt = "2026-07-15T12:10:00.000Z";
  const confirmation = {
    contractVersion: ACTION_CONTRACT_VERSION,
    confirmationId: createConfirmationId({
      actionId: pending.actionId,
      confirmingMessageId: "message-confirmation",
      confirmedAt,
    }),
    actionId: pending.actionId,
    ...scope,
    confirmingMessageId: "message-confirmation",
    confirmationType: "CUSTOMER",
    confirmedAt,
    expiresAt,
    parametersHash: pending.argumentsHash,
    status: "VALIDATED",
    provenance: { source: "V1_PIPELINE", sourceMessageId: "message-confirmation" },
  };
  assert.deepEqual(
    validateActionConfirmation({
      confirmation,
      action: pending,
      currentTime: new Date("2026-07-15T12:20:00.000Z"),
    }),
    { valid: true },
  );
  assert.deepEqual(
    validateActionConfirmation({
      confirmation: { ...confirmation, contextVersion: 5 },
      action: pending,
      currentTime: new Date("2026-07-15T12:20:00.000Z"),
    }),
    { valid: false, error: "CONFIRMATION_MISMATCH" },
  );
  assert.deepEqual(
    validateActionConfirmation({
      confirmation,
      action: pending,
      currentTime: new Date("2026-07-15T14:00:00.000Z"),
    }),
    { valid: false, error: "CONFIRMATION_EXPIRED" },
  );
  assert.deepEqual(
    validateActionConfirmation({
      confirmation,
      action: { ...pending, argumentsHash: "c".repeat(64) },
      currentTime: new Date("2026-07-15T12:20:00.000Z"),
    }),
    { valid: false, error: "CONFIRMATION_MISMATCH" },
  );
  assert.equal(confirmation.confirmationId.startsWith("confirmation_"), true);
});

test("resultado de ferramenta autoriza somente sua categoria e respeita escopo/validade", () => {
  const authorized = toolResultToEvidence({
    result: result(),
    scope,
    currentTime: new Date("2026-07-15T12:30:00.000Z"),
  });
  assert.equal(authorized.reason, "AUTHORIZED");
  assert.equal(authorized.evidence.sourceType, "TOOL_RESULT");
  assert.equal(authorized.evidence.category, "AVAILABILITY");
  assert.deepEqual(authorized.evidence.provenance.coveredCategories, ["AVAILABILITY"]);
  assert.equal(
    toolResultToEvidence({
      result: result({ externalEffectMayHaveOccurred: true }),
      scope,
      currentTime: new Date("2026-07-15T12:30:00.000Z"),
    }).reason,
    "RESULT_EFFECT_UNKNOWN",
  );
  assert.equal(
    toolResultToEvidence({
      result: result({ companyId: "other-company" }),
      scope,
      currentTime: new Date("2026-07-15T12:30:00.000Z"),
    }).reason,
    "RESULT_SCOPE_MISMATCH",
  );
  assert.equal(
    toolResultToEvidence({
      result: result({ validUntil: "2026-07-15T12:29:00.000Z" }),
      scope,
      currentTime: new Date("2026-07-15T12:30:00.000Z"),
    }).reason,
    "RESULT_EXPIRED",
  );
  assert.equal(
    toolResultToEvidence({
      result: result({ authorityCategories: ["BOOKING"], resultCategory: "BOOKING" }),
      scope,
      currentTime: new Date("2026-07-15T12:30:00.000Z"),
    }).evidence.category,
    "BOOKING",
  );
});

test("redaction do manifesto não expõe argumentos, tokens ou payloads", () => {
  const pending = action();
  const manifest = redactActionMetadata({
    action: pending,
    execution: {
      toolName: "custom_webhook_read",
      arguments: { token: "secret-value", phone: "sensitive-value" },
      argumentsHash: pending.argumentsHash,
      retryPolicy: "NEVER",
      reconciliationPolicy: "NONE",
    },
  });
  const serialized = JSON.stringify(manifest);
  assert.equal(serialized.includes("secret-value"), false);
  assert.equal(serialized.includes("sensitive-value"), false);
  assert.equal(serialized.includes('"arguments":'), false);
  assert.equal(manifest.toolExecutionPerformed, false);
  assert.equal(manifest.externalEffectMayHaveOccurred, false);
  assert.equal(manifest.actionRedactionApplied, true);
});

test("eventos são versionados, determinísticos e rejeitam transições incompatíveis", () => {
  const event = createActionEvent({
    actionId: "action-1",
    previousStatus: "ACTION_PROPOSED",
    eventType: "CUSTOMER_CONFIRMATION_REQUESTED",
    nextStatus: "AWAITING_CUSTOMER_CONFIRMATION",
    timestamp: requestedAt,
    contextVersion: 4,
    source: "V2_SHADOW",
    reasonCode: "CONFIRMATION_REQUIRED",
    metadata: { count: 1 },
  });
  const same = createActionEvent({
    actionId: "action-1",
    previousStatus: "ACTION_PROPOSED",
    eventType: "CUSTOMER_CONFIRMATION_REQUESTED",
    nextStatus: "AWAITING_CUSTOMER_CONFIRMATION",
    timestamp: requestedAt,
    contextVersion: 4,
    source: "V2_SHADOW",
    reasonCode: "CONFIRMATION_REQUIRED",
    metadata: { count: 1 },
  });
  assert.equal(event.eventId, same.eventId);
  assert.equal(event.contractVersion, 1);
  assert.throws(
    () => transitionActionStatus("AWAITING_CUSTOMER_CONFIRMATION", "EXECUTION_STARTED"),
    /INVALID_TRANSITION/,
  );
});
