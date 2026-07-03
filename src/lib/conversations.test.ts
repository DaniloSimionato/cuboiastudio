import assert from "node:assert/strict";
import test from "node:test";

import {
  filterOperationalConversations,
  formatConversationPrimaryLabel,
  formatConversationSecondaryLabel,
  isOperationalConversation,
  resolveOperationalConversationId,
} from "./conversations.ts";
import type { BackendConversationItem } from "../types/index.ts";

const manualConversation: BackendConversationItem = {
  id: "conv_manual_1",
  title: "Atendimento de teste",
  source: "MANUAL_TEST",
  channelType: "UNKNOWN",
  status: "ACTIVE",
  sourceProvider: "manual",
  externalConversationId: null,
  lastMessageAt: "2026-07-02T19:50:00.000Z",
  createdAt: "2026-07-02T19:40:00.000Z",
  updatedAt: "2026-07-02T19:50:00.000Z",
};

const chatwootConversation: BackendConversationItem = {
  ...manualConversation,
  id: "conv_chatwoot_1",
  title: "Conversa WhatsApp",
  source: "CHATWOOT",
  channelType: "WHATSAPP",
  sourceProvider: "chatwoot",
  externalConversationId: "1",
};

const smokeConversation: BackendConversationItem = {
  ...manualConversation,
  id: "conv_smoke_1",
  source: "SMOKE",
  title: "[SMOKE:run-123] Assistente Smoke Test",
};

test("filtra apenas conversas manuais ativas para a tela de testes", () => {
  assert.equal(isOperationalConversation(manualConversation), true);
  assert.equal(isOperationalConversation(chatwootConversation), false);
  assert.equal(isOperationalConversation(smokeConversation), false);

  assert.deepEqual(
    filterOperationalConversations([chatwootConversation, smokeConversation, manualConversation]).map(
      (conversation) => conversation.id,
    ),
    ["conv_manual_1"],
  );
});

test("resolve automaticamente uma conversa salva não operacional", () => {
  assert.equal(
    resolveOperationalConversationId(
      [chatwootConversation, smokeConversation, manualConversation],
      chatwootConversation.id,
    ),
    manualConversation.id,
  );
  assert.equal(resolveOperationalConversationId([chatwootConversation], chatwootConversation.id), "");
});

test("gera rótulos amigáveis no dropdown da tela de testes", () => {
  assert.match(formatConversationPrimaryLabel(manualConversation), /^Teste manual - /);
  assert.equal(
    formatConversationSecondaryLabel({
      ...manualConversation,
      externalConversationId: "ext-1",
    }),
    `Manual Test · Ext ext-1 · ID ${manualConversation.id}`,
  );
});
