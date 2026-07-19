import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResponseExecutionConversationContext,
  resolveResponseExecutionIntent,
} from "../dist/runtime-v2/index.js";

const direct = "Que horas vocês atendem de segunda a sexta?";
const followUp = "E até que horas vocês atendem?";

function context(messages, currentInboundMessageId) {
  return buildResponseExecutionConversationContext({
    contextVersion: 1,
    messages,
    currentInboundMessageId,
  });
}

test("shared context makes the direct-turn antecedent available to the follow-up without using current inbound", () => {
  const messages = [
    {
      id: "direct",
      role: "user",
      content: direct,
      contextVersion: 1,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
    {
      id: "reply",
      role: "assistant",
      content: "resposta oficial",
      contextVersion: 1,
      createdAt: new Date("2026-01-01T00:00:01Z"),
    },
    {
      id: "follow-up",
      role: "user",
      content: followUp,
      contextVersion: 1,
      createdAt: new Date("2026-01-01T00:00:02Z"),
    },
  ];
  const preflightContext = context(messages.slice(0, 2));
  const routerContext = context(messages, "follow-up");
  assert.equal(preflightContext.contextFingerprint, routerContext.contextFingerprint);
  assert.equal(preflightContext.antecedentFingerprint, routerContext.antecedentFingerprint);
  const preflight = resolveResponseExecutionIntent({
    canonicalMessage: followUp,
    messageId: "preflight",
    contextVersion: 1,
    conversationContext: preflightContext,
  });
  const router = resolveResponseExecutionIntent({
    canonicalMessage: followUp,
    messageId: "follow-up",
    contextVersion: 1,
    conversationContext: routerContext,
  });
  assert.equal(preflight.applicable, true);
  assert.equal(router.applicable, true);
  assert.equal(preflight.fingerprint, router.fingerprint);
  assert.equal(router.contextualResolution, true);
});

test("context excludes another version and blocks an elliptical follow-up without an authorized antecedent", () => {
  const resolved = context(
    [
      {
        id: "old",
        role: "user",
        content: direct,
        contextVersion: 0,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        id: "current",
        role: "user",
        content: "E até que horas?",
        contextVersion: 1,
        createdAt: new Date("2026-01-01T00:00:01Z"),
      },
    ],
    "current",
  );
  const decision = resolveResponseExecutionIntent({
    canonicalMessage: "E até que horas?",
    messageId: "current",
    contextVersion: 1,
    conversationContext: resolved,
  });
  assert.equal(resolved.antecedentFingerprint, null);
  assert.equal(decision.applicable, false);
  assert.equal(decision.deterministicReason, "BUSINESS_HOURS_FOLLOW_UP_CONTEXT_REQUIRED");
});

test("same timestamps use message identity as a deterministic context ordering tie-breaker", () => {
  const at = new Date("2026-01-01T00:00:00Z");
  const first = context([
    { id: "b", role: "assistant", content: "resposta", contextVersion: 1, createdAt: at },
    { id: "a", role: "user", content: direct, contextVersion: 1, createdAt: at },
  ]);
  const second = context([
    { id: "a", role: "user", content: direct, contextVersion: 1, createdAt: at },
    { id: "b", role: "assistant", content: "resposta", contextVersion: 1, createdAt: at },
  ]);
  assert.equal(first.contextFingerprint, second.contextFingerprint);
  assert.equal(first.antecedentFingerprint, second.antecedentFingerprint);
});
