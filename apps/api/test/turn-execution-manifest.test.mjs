import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTurnExecutionId,
  createTurnExecutionManifest,
  finalizeTurnExecutionManifest,
} from "../dist/assistant-conversations/turn-execution-manifest.js";

const canonicalIdentity = {
  companyId: "company-test",
  assistantId: "assistant-test",
  source: "chatwoot",
  accountId: "account-test",
  inboxId: "inbox-test",
  externalConversationId: "conversation-external",
  externalMessageId: "message-external",
  contextVersion: 2,
  internalConversationId: "conversation-internal",
  internalMessageId: "message-internal",
};

test("turn execution id é determinístico e não serializa conteúdo", () => {
  const first = createTurnExecutionId(canonicalIdentity);
  const second = createTurnExecutionId({
    contextVersion: 2,
    externalMessageId: "message-external",
    companyId: "company-test",
    assistantId: "assistant-test",
    source: "chatwoot",
    accountId: "account-test",
    inboxId: "inbox-test",
    externalConversationId: "conversation-external",
    internalConversationId: "conversation-internal",
    internalMessageId: "message-internal",
  });

  assert.equal(first, second);
  assert.match(first, /^turn_v1_[a-f0-9]{32}$/);
  assert.doesNotMatch(first, /message-external|company-test/);
});

test("manifesto preserva cobertura de fragmento sem conteúdo integral", () => {
  const base = createTurnExecutionManifest({
    identity: canonicalIdentity,
    requestId: "request-test",
    correlationId: "correlation-test",
    aiActive: true,
    pausedByHuman: false,
    sessionState: "ACTIVE",
    capturedAt: "2026-07-24T00:00:00.000Z",
    fragmentCount: 3,
    fragmentIdentityCoverage: "FIRST_FRAGMENT_ONLY",
    normalizedContentHash: "sha256-content-only",
    normalizedContentLength: 42,
  });
  const manifest = finalizeTurnExecutionManifest(base, {
    terminal: { path: "PROVIDER_STANDARD", reasonCode: "PROVIDER_STANDARD" },
    routing: base.routing,
    provider: {
      ...base.provider,
      finalGeneration: { observation: "OBSERVED", count: 1 },
    },
    outbound: {
      planned: true,
      attempted: true,
      attemptCount: 1,
      sender: "CHATWOOT_V1",
      externalMessageId: "outbound-message-id",
      result: "ACKNOWLEDGED",
    },
  });

  assert.equal(manifest.policyVersion, "V1_COMPATIBILITY_POLICY");
  assert.equal(manifest.inbound.fragmentCount, 3);
  assert.equal(manifest.inbound.fragmentIdentityCoverage, "FIRST_FRAGMENT_ONLY");
  assert.equal(manifest.inbound.normalizedContentHash, "sha256-content-only");
  assert.doesNotMatch(JSON.stringify(manifest), /conteúdo integral|telefone|token/);
});
