import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AssistantConversationsService,
  normalizeChatwootExternalMessageId,
} from "../dist/assistant-conversations/assistant-conversations.service.js";

function createSenderService() {
  return new AssistantConversationsService(
    {},
    {},
    {},
    {
      resolveActiveForConversation: async () => ({
        baseUrl: "https://chatwoot.example.test",
        apiAccessToken: "fake-token",
      }),
    },
  );
}

function createOutboundInput() {
  return {
    conversation: {
      id: "conversation-internal",
      companyId: "company-test",
      externalAccountId: "account-test",
      externalConversationId: "conversation-external",
      externalInboxId: "inbox-test",
    },
    assistantMessageId: "assistant-message-internal",
    assistantId: "assistant-test",
    content: "Resposta de teste",
  };
}

async function withFakeFetch(response, run) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    if (response instanceof Error) {
      throw response;
    }
    return response;
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("normaliza o id direto retornado pelo Chatwoot", () => {
  assert.equal(normalizeChatwootExternalMessageId(JSON.stringify({ id: 123 })), "123");
});

test("normaliza o id aninhado retornado pelo sender", () => {
  assert.equal(
    normalizeChatwootExternalMessageId(JSON.stringify({ data: { messageId: " nested-id " } })),
    "nested-id",
  );
});

test("envio confirmado sem id mantém a referência ausente", () => {
  assert.equal(normalizeChatwootExternalMessageId(JSON.stringify({ status: "ok" })), null);
  assert.equal(normalizeChatwootExternalMessageId("not-json"), null);
});

test("sender oficial preserva id direto e mantém um único payload", async () => {
  await withFakeFetch(
    {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 123 }),
    },
    async (calls) => {
      const service = createSenderService();
      const result = await service.sendChatwootOutboundText(createOutboundInput());

      assert.deepEqual(result, {
        status: "sent",
        performed: true,
        externalMessageId: "123",
      });
      assert.equal(calls.length, 1);
      assert.equal(calls[0][1].method, "POST");
      assert.deepEqual(JSON.parse(calls[0][1].body), {
        content: "Resposta de teste",
        message_type: "outgoing",
        private: false,
        sender_type: "Captain::Assistant",
        content_attributes: {
          automation_rule_id: "cubo_ai_studio",
          source: "cubo_ai_studio",
          assistant_id: "assistant-test",
          internal_conversation_id: "conversation-internal",
        },
      });
    },
  );
});

test("sender oficial normaliza id aninhado e confirma envio sem referência", async () => {
  await withFakeFetch(
    {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { id: "nested-message" } }),
    },
    async () => {
      const result = await createSenderService().sendChatwootOutboundText(createOutboundInput());
      assert.deepEqual(result, {
        status: "sent",
        performed: true,
        externalMessageId: "nested-message",
      });
    },
  );

  await withFakeFetch(
    {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "ok" }),
    },
    async (calls) => {
      const result = await createSenderService().sendChatwootOutboundText(createOutboundInput());
      assert.deepEqual(result, {
        status: "sent",
        performed: true,
        externalMessageId: null,
      });
      assert.equal(calls.length, 1);
    },
  );
});

test("sender oficial falha sem gerar uma segunda chamada", async () => {
  await withFakeFetch(
    {
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: "failed" }),
    },
    async (calls) => {
      const result = await createSenderService().sendChatwootOutboundText(createOutboundInput());
      assert.deepEqual(result, {
        status: "failed",
        performed: false,
        externalMessageId: null,
      });
      assert.equal(calls.length, 1);
    },
  );
});
