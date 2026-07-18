import assert from "node:assert/strict";
import test from "node:test";
import {
  claimRuntimeV2ResponseExecution,
  createRuntimeV2ResponseExecutionApproval,
  isRuntimeV2ResponseExecutionScopeEnabled,
} from "../dist/runtime-v2/index.js";

const now = new Date("2026-07-17T12:00:00.000Z");
const scope = { companyId: "company", assistantId: "assistant", conversationId: "conversation" };
const environment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
  RUNTIME_V2_RESPONSE_EXECUTION_MODE: "CONTROLLED",
  RUNTIME_V2_RESPONSE_EXECUTION_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_RESPONSE_EXECUTION_CONVERSATION_IDS: scope.conversationId,
};

function approval() {
  return createRuntimeV2ResponseExecutionApproval({
    ...scope,
    expectedCanonicalComparisonHash: "canonical-hash",
    canonicalVersion: "v1",
    expiresAt: new Date(now.getTime() + 60_000),
    operatorPurpose: "isolated test",
    now,
  });
}

test("execution mode is default deny and needs both scope allowlists", () => {
  assert.equal(isRuntimeV2ResponseExecutionScopeEnabled(scope, {}), false);
  assert.equal(isRuntimeV2ResponseExecutionScopeEnabled(scope, environment), true);
  assert.equal(
    isRuntimeV2ResponseExecutionScopeEnabled({ ...scope, conversationId: "other" }, environment),
    false,
  );
});

test("single-use approval claims only its exact canonical turn", () => {
  const armed = approval();
  const claimed = claimRuntimeV2ResponseExecution({
    ...scope,
    approval: armed,
    canonicalComparisonHash: "canonical-hash",
    internalMessageId: "message",
    now,
  });
  assert.equal(claimed.allowed, true);
  assert.equal(claimed.approval.status, "CLAIMED");
  assert.equal(claimed.approval.internalMessageId, "message");
  assert.equal(
    claimRuntimeV2ResponseExecution({
      ...scope,
      approval: armed,
      canonicalComparisonHash: "other",
      internalMessageId: "message",
      now,
    }).allowed,
    false,
  );
  assert.equal(
    claimRuntimeV2ResponseExecution({
      ...scope,
      conversationId: "other",
      approval: armed,
      canonicalComparisonHash: "canonical-hash",
      internalMessageId: "message",
      now,
    }).allowed,
    false,
  );
  assert.equal(
    claimRuntimeV2ResponseExecution({
      ...scope,
      approval: { ...armed, status: "CONSUMED" },
      canonicalComparisonHash: "canonical-hash",
      internalMessageId: "message",
      now,
    }).allowed,
    false,
  );
});

test("approval expires and cannot be armed beyond ten minutes", () => {
  assert.throws(() =>
    createRuntimeV2ResponseExecutionApproval({
      ...scope,
      expectedCanonicalComparisonHash: "x",
      canonicalVersion: "v1",
      expiresAt: new Date(now.getTime() + 11 * 60_000),
      operatorPurpose: "test",
      now,
    }),
  );
  assert.equal(
    claimRuntimeV2ResponseExecution({
      ...scope,
      approval: approval(),
      canonicalComparisonHash: "canonical-hash",
      internalMessageId: "message",
      now: new Date(now.getTime() + 60_001),
    }).allowed,
    false,
  );
});
