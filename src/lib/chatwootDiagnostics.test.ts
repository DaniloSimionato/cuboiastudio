import assert from "node:assert/strict";
import test from "node:test";
import {
  getChannelChecklist,
  getWebhookDiagnosticSummary,
} from "./chatwootDiagnostics.ts";

function channel(overrides: Record<string, unknown> = {}) {
  return {
    id: "channel-1",
    companyId: "company-1",
    assistantId: "assistant-1",
    assistantName: "Assistente",
    assistantStatus: "ACTIVE",
    name: "WhatsApp",
    baseUrl: "https://chatwoot.example.com",
    accountId: "1",
    inboxId: "2",
    isActive: true,
    metadataJson: null,
    apiAccessTokenConfigured: true,
    webhookSecretConfigured: false,
    lastApiTestAt: null,
    lastApiTestOk: null,
    lastWebhookAt: null,
    lastWebhookEvent: null,
    lastWebhookAccountId: null,
    lastWebhookInboxId: null,
    lastWebhookConversationId: null,
    lastWebhookMessageType: null,
    lastWebhookIgnoredReason: null,
    lastWebhookRequestId: null,
    lastResponseAt: null,
    createdAt: "2026-07-09T10:00:00.000Z",
    updatedAt: "2026-07-09T10:00:00.000Z",
    ...overrides,
  } as any;
}

test("canal sem webhook mostra estado nunca recebido", () => {
  const summary = getWebhookDiagnosticSummary(channel());
  assert.equal(summary.title, "Último webhook recebido: nunca");
  assert.equal(getChannelChecklist(channel())[4].complete, false);
});

test("message_created respondido mostra entrada e saída OK", () => {
  const summary = getWebhookDiagnosticSummary(
    channel({
      lastWebhookAt: "2026-07-09T10:01:00.000Z",
      lastWebhookEvent: "message_created",
      lastResponseAt: "2026-07-09T10:01:02.000Z",
    }),
  );
  assert.equal(summary.title, "Entrada e saída OK");
  assert.equal(summary.tone, "success");
});
