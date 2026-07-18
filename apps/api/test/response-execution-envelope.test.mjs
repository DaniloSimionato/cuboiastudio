import assert from "node:assert/strict";
import test from "node:test";
import {
  createV1NormalResponseExecutionEnvelope,
  createV2PrimaryResponseExecutionEnvelope,
  validateResponseExecutionEnvelope,
  validateV1NormalResponseExecutionEnvelope,
} from "../dist/assistant-conversations/response-execution-envelope.js";

const turn = {
  companyId: "company-1",
  assistantId: "assistant-1",
  conversationId: "conversation-1",
  internalMessageId: "message-1",
  canonicalComparisonHash: "hash-1",
  canonicalVersion: "canonical-inbound-message-v1",
};

function envelope(overrides = {}) {
  return {
    ...createV1NormalResponseExecutionEnvelope({
      turn,
      responseText: "resposta segura",
      reason: "EXECUTION_MODE_OFF",
    }),
    ...overrides,
  };
}

test("V1_NORMAL envelope validates before the productive tail", () => {
  const result = envelope();

  validateV1NormalResponseExecutionEnvelope({ envelope: result, turn });
  assert.equal(result.executionOwner, "V1_NORMAL");
  assert.equal(result.route, "V1_DEFAULT");
  assert.equal(result.outboundAllowed, true);
  assert.equal(result.generatedResponse, null);
});

test("missing or unknown owner is rejected before the sender", () => {
  assert.throws(
    () =>
      validateV1NormalResponseExecutionEnvelope({
        envelope: envelope({ executionOwner: null }),
        turn,
      }),
    /unsupported execution owner/,
  );
  assert.throws(
    () =>
      validateV1NormalResponseExecutionEnvelope({
        envelope: envelope({ executionOwner: "V2_PRIMARY" }),
        turn,
      }),
    /unsupported execution owner/,
  );
});

test("outbound-disabled and mismatched envelopes are rejected before the sender", () => {
  assert.throws(
    () =>
      validateV1NormalResponseExecutionEnvelope({
        envelope: envelope({ outboundAllowed: false }),
        turn,
      }),
    /outbound-disabled/,
  );
  assert.throws(
    () =>
      validateV1NormalResponseExecutionEnvelope({
        envelope: envelope({ turn: { ...turn, conversationId: "other-conversation" } }),
        turn,
      }),
    /mismatched/,
  );
});

test("V2 primary envelope requires the single-use binding before the tail", () => {
  const result = createV2PrimaryResponseExecutionEnvelope({
    turn,
    responseText: "Horário oficial de teste.",
    generationId: "generation-1",
    approvalFingerprint: "approval-fingerprint",
  });

  validateResponseExecutionEnvelope({ envelope: result, turn });
  assert.equal(result.executionOwner, "V2_PRIMARY");
  assert.equal(result.route, "V2_SINGLE_USE");
  assert.throws(
    () =>
      validateResponseExecutionEnvelope({
        envelope: { ...result, allowedAuthority: null },
        turn,
      }),
    /invalid V2 primary envelope/,
  );
});
