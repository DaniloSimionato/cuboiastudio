import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION,
  advanceConversationControlTrace,
  createConversationControlSnapshot,
  createConversationControlTrace,
  evaluateConversationControlCheckpoint,
} from "../dist/assistant-conversations/conversation-control-snapshot.js";

function snapshot(overrides = {}) {
  return createConversationControlSnapshot({
    conversation: {
      id: "conversation-control-test",
      currentContextVersion: 2,
      controlRevision: 4,
      aiActive: true,
      pausedByHuman: false,
      status: "ACTIVE",
      ...overrides,
    },
    capturedAt: "2026-07-25T00:00:00.000Z",
    snapshotSource: "LOCAL_DATABASE_ADMISSION",
    snapshotReason: "TURN_ADMISSION",
  });
}

test("snapshot de controle é versionado, derivado e não contém PII", () => {
  const value = snapshot();

  assert.equal(value.schemaVersion, CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(value.derivedState, "ACTIVE");
  assert.equal(Object.isFrozen(value), true);
  assert.doesNotMatch(
    JSON.stringify(value),
    /telefone|authorization|token|prompt|mensagem secreta/i,
  );
});

test("mudança monotônica invalida ABA mesmo quando booleanos retornam ao valor aceito", () => {
  const accepted = snapshot();
  const observed = snapshot({ controlRevision: 6 });
  const result = evaluateConversationControlCheckpoint({
    checkpoint: "PRE_SEAL",
    expected: accepted,
    observed,
    checkedAt: "2026-07-25T00:00:01.000Z",
  });

  assert.equal(result.result, "BLOCKED");
  assert.equal(result.mismatchReason, "CONTROL_REVISION_MISMATCH");
  assert.equal(result.blockingReason, "BLOCKED_CONTROL_STATE_PRE_SEAL");
  assert.equal(result.expectedRevision, 4);
  assert.equal(result.observedRevision, 6);
});

test("contextVersion stale é distinguida de revisão stale", () => {
  const result = evaluateConversationControlCheckpoint({
    checkpoint: "PRE_OUTBOUND",
    expected: snapshot(),
    observed: snapshot({ currentContextVersion: 3, controlRevision: 5 }),
    checkedAt: "2026-07-25T00:00:01.000Z",
  });

  assert.equal(result.result, "BLOCKED");
  assert.equal(result.mismatchReason, "CONTEXT_VERSION_MISMATCH");
  assert.equal(result.observedState, "STALE_CONTEXT");
  assert.equal(result.blockingReason, "BLOCKED_CONTROL_STATE_PRE_OUTBOUND");
});

test("transição local autorizada avança revisão esperada sem apagar snapshot aceito", () => {
  const accepted = snapshot();
  const trace = createConversationControlTrace(accepted);
  const current = snapshot({ currentContextVersion: 3, controlRevision: 5 });

  advanceConversationControlTrace({
    trace,
    nextSnapshot: current,
    reason: "RESET_KEYWORD_LEGACY",
    transitionedAt: "2026-07-25T00:00:01.000Z",
  });

  assert.equal(trace.acceptedSnapshot.currentContextVersion, 2);
  assert.equal(trace.acceptedSnapshot.controlRevision, 4);
  assert.equal(trace.expectedSnapshot.currentContextVersion, 3);
  assert.equal(trace.expectedSnapshot.controlRevision, 5);
  assert.deepEqual(trace.authorizedTransitions, [
    {
      reason: "RESET_KEYWORD_LEGACY",
      transitionedAt: "2026-07-25T00:00:01.000Z",
      previousRevision: 4,
      currentRevision: 5,
      previousContextVersion: 2,
      currentContextVersion: 3,
    },
  ]);
});
