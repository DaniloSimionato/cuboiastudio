import assert from "node:assert/strict";
import { test } from "node:test";
import { AssistantsService } from "../dist/assistants/assistants.service.js";
import { AssistantKnowledgeService } from "../dist/assistant-knowledge/assistant-knowledge.service.js";
import { AssistantRuntimeLogsService } from "../dist/assistant-runtime-logs/assistant-runtime-logs.service.js";
import { AiSettingsService } from "../dist/ai-settings/ai-settings.service.js";
import { ChatwootController } from "../dist/webhooks/chatwoot.controller.js";
import { normalizeChatwootMessageCreatedPayload } from "../dist/webhooks/chatwoot-normalizer.js";
import { ChatwootInboxConfigService } from "../dist/chatwoot/chatwoot-inbox-config.service.js";
import { ChatwootWebhookService } from "../dist/chatwoot/chatwoot-webhook.service.js";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";

function createMessageCreatedPayload(overrides = {}) {
  return {
    event: "message_created",
    account: { id: "account-1" },
    inbox: { id: "inbox-1", identifier: "inbox-1" },
    conversation: { id: "conversation-1", meta: { title: "Conversa WhatsApp" } },
    message: {
      id: "message-1",
      content: "Olá",
      sender_type: "contact",
      message_type: "incoming",
      sender: {
        id: "sender-1",
        name: "João",
        phone_number: "+5511999999999",
        type: "contact",
      },
      attachments: [],
    },
    contact: {
      id: "contact-1",
      name: "João",
      phone_number: "+5511999999999",
    },
    ...overrides,
  };
}

function createWebhookDeps(overrides = {}) {
  const calls = {
    downloader: [],
    ensureConversation: [],
    sendMessage: [],
    configResolution: [],
    diagnostics: [],
  };

  const prisma = {
    assistant: {
      findFirst: async () => {
        if (Object.prototype.hasOwnProperty.call(overrides, "assistantLookup")) {
          return overrides.assistantLookup;
        }

        return {
          id: "assistant-1",
          companyId: "company-1",
          name: "Assistente",
          status: "ACTIVE",
        };
      },
    },
    assistantConversationMessage: {
      findFirst: async () => null,
    },
  };

  const chatwootInboxConfigService = {
    recordWebhookReceived: async (input) => {
      calls.diagnostics.push({ stage: "received", ...input });
      return { configId: "cfg-1", diagnosticId: "diagnostic-1" };
    },
    completeWebhookDiagnostic: async (target, input) => {
      calls.diagnostics.push({ stage: "completed", target, ...input });
    },
    recordResponseSent: async (configId) => {
      calls.diagnostics.push({ stage: "response", configId });
    },
    resolveActiveByWebhook: async (input) => {
      calls.configResolution.push(input);
      if (typeof overrides.resolveActiveByWebhook === "function") {
        return overrides.resolveActiveByWebhook(input);
      }

      if (overrides.resolveActiveByWebhook === null) {
        return null;
      }

      return {
        id: "cfg-1",
        companyId: "company-1",
        assistantId: "assistant-1",
        assistantName: "Assistente",
        assistantStatus: "ACTIVE",
        name: "Principal",
        baseUrl: "https://chatwoot.example.com",
        accountId: "account-1",
        inboxId: "inbox-1",
        isActive: true,
        metadataJson: null,
        apiAccessTokenConfigured: false,
        webhookSecretConfigured: true,
        apiAccessToken: null,
        webhookSecret: "secret-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides.config,
      };
    },
    isWebhookSecureModeAllowed: async () => overrides.secureModeAllowed ?? true,
    resolveActiveForConversation: async () => overrides.outboundConfig ?? null,
  };

  const chatwootAttachmentDownloaderService = {
    downloadAttachment: async (input) => {
      calls.downloader.push(input);
      return (
        overrides.downloadResult ?? {
          buffer: Buffer.from("arquivo"),
          mimeType: input.attachment.mimeType,
          fileName: input.attachment.fileName,
          sizeBytes: 7,
          sourceUrl: "https://chatwoot.example.com/rails/active_storage/blobs/1",
          thumbUrl: null,
          metadataJson: { kind: "downloaded" },
        }
      );
    },
  };

  const assistantConversationsService = {
    ensureConversationFromInboundMessage: async (input) => {
      calls.ensureConversation.push(input);
      return (
        overrides.conversation ?? {
          id: "internal-conversation-1",
          companyId: "company-1",
          title: "Conversa WhatsApp",
          sourceProvider: "chatwoot",
          externalConversationId: "conversation-1",
          externalAccountId: "account-1",
          externalContactId: "contact-1",
          externalChannelId: "inbox-1",
          externalInboxId: "inbox-1",
          pausedByHuman: false,
          lastMessageAt: new Date(),
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
    },
    sendMessage: async (input) => {
      calls.sendMessage.push(input);
      return (
        overrides.sendMessageResult ?? {
          conversationId: input.conversationId,
          userMessage: {
            id: "user-msg",
            role: "user",
            content: "Olá",
            createdAt: new Date(),
          },
          assistantMessage: {
            id: "assistant-msg",
            role: "assistant",
            content: "Tudo certo",
            createdAt: new Date(),
          },
          runtime: {
            mode: "deterministic-runtime",
            assistant: { id: "assistant-1", name: "Assistente" },
            temperature: 0,
            temperatureSource: "default",
            configurationSource: "tenant-settings",
            fallback: true,
            outcome: "fallback",
            summary: "ok",
            context: {
              historyMessagesUsed: 0,
              historyLimit: 10,
              initialMessageIncluded: false,
              instructionsIncluded: false,
            },
          },
        }
      );
    },
  };

  const service = new ChatwootWebhookService(
    prisma,
    chatwootInboxConfigService,
    chatwootAttachmentDownloaderService,
    assistantConversationsService,
  );

  return {
    service,
    calls,
    prisma,
    chatwootInboxConfigService,
    chatwootAttachmentDownloaderService,
    assistantConversationsService,
  };
}

test("controller Chatwoot prioriza secret da query string", async () => {
  const calls = [];
  const controller = new ChatwootController({
    processMessageCreated: async (input) => {
      calls.push(input);
      return { ok: true, source: "chatwoot" };
    },
  });

  await controller.handleMessageCreated(
    createMessageCreatedPayload(),
    "query-secret",
    "legacy-secret",
    "req-1",
    "corr-1",
  );

  assert.equal(calls[0].webhookSecret, "query-secret");
  assert.equal(calls[0].requestId, "req-1");
  assert.equal(calls[0].correlationId, "corr-1");
});

test("GET do webhook Chatwoot retorna instrução amigável", () => {
  const controller = new ChatwootController({
    processMessageCreated: async () => ({ ok: true, source: "chatwoot" }),
  });

  assert.deepEqual(controller.getStatus(), {
    ok: true,
    message: "Webhook Chatwoot ativo. Use POST para eventos.",
    expectedMethod: "POST",
    expectedEvent: "message_created",
  });
});

test("event=test salva diagnóstico seguro e retorna ignored", async () => {
  const { service, calls } = createWebhookDeps();
  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload({ event: "test" }),
    requestId: "request-test-event",
  });

  assert.equal(result.ignored, true);
  assert.equal(result.reason, "event=non_message_created");
  assert.deepEqual(calls.diagnostics[0], {
    stage: "received",
    event: "test",
    accountId: "account-1",
    inboxId: "inbox-1",
    conversationId: "conversation-1",
    messageType: "incoming",
    requestId: "request-test-event",
  });
  assert.equal(calls.diagnostics[1].ignoredReason, "event=non_message_created");
});

test("diagnóstico atualiza o canal quando account e inbox são conhecidos", async () => {
  const updates = [];
  const diagnostics = [];
  const prisma = {
    chatwootInboxConfig: {
      findMany: async () => [{ id: "cfg-known" }],
      update: async (input) => {
        updates.push(input);
        return {};
      },
    },
    chatwootWebhookDiagnostic: {
      create: async (input) => {
        diagnostics.push(input);
        return { id: "diagnostic-known" };
      },
    },
  };
  const service = new ChatwootInboxConfigService(prisma, { get: () => undefined });

  const target = await service.recordWebhookReceived({
    event: "message_created",
    accountId: "account-1",
    inboxId: "inbox-1",
    conversationId: "conversation-1",
    messageType: "incoming",
    requestId: "request-known",
  });

  assert.deepEqual(target, { configId: "cfg-known", diagnosticId: "diagnostic-known" });
  assert.equal(updates[0].data.lastWebhookEvent, "message_created");
  assert.equal(updates[0].data.lastWebhookAccountId, "account-1");
  assert.equal(updates[0].data.lastWebhookInboxId, "inbox-1");
  assert.equal(diagnostics[0].data.configId, "cfg-known");
});

test("diagnóstico global registra account e inbox desconhecidos sem quebrar", async () => {
  const diagnostics = [];
  const prisma = {
    chatwootInboxConfig: {
      findMany: async () => [],
    },
    chatwootWebhookDiagnostic: {
      create: async (input) => {
        diagnostics.push(input);
        return { id: "diagnostic-unknown" };
      },
    },
  };
  const service = new ChatwootInboxConfigService(prisma, { get: () => undefined });

  const target = await service.recordWebhookReceived({
    event: "message_created",
    accountId: "account-unknown",
    inboxId: "inbox-unknown",
    conversationId: "conversation-unknown",
    messageType: "incoming",
    requestId: "request-unknown",
  });

  assert.deepEqual(target, { configId: null, diagnosticId: "diagnostic-unknown" });
  assert.equal(diagnostics[0].data.ignoredReason, "UNKNOWN_ACCOUNT_INBOX");
  assert.equal(diagnostics[0].data.accountId, "account-unknown");
  assert.equal(diagnostics[0].data.inboxId, "inbox-unknown");
});

test("controller Chatwoot aceita header legado quando query string está ausente", async () => {
  const calls = [];
  const controller = new ChatwootController({
    processMessageCreated: async (input) => {
      calls.push(input);
      return { ok: true, source: "chatwoot" };
    },
  });

  await controller.handleMessageCreated(
    createMessageCreatedPayload(),
    undefined,
    "legacy-secret",
    "req-1",
    "corr-1",
  );

  assert.equal(calls[0].webhookSecret, "legacy-secret");
});

test("ChatwootInboxConfigService permite remover o assistente vinculado ao enviar assistantId vazio", async () => {
  const updatedPayloads = [];
  const service = new ChatwootInboxConfigService(
    {
      chatwootInboxConfig: {
        findFirst: async ({ where }) => ({
          id: where.id ?? "cfg-1",
          companyId: where.companyId,
          assistantId: "assistant-1",
          name: "Canal principal",
          baseUrl: "https://chatwoot.example.com",
          accountId: "account-1",
          inboxId: "inbox-1",
          apiAccessTokenEncrypted: null,
          apiAccessTokenIv: null,
          apiAccessTokenAuthTag: null,
          webhookSecretEncrypted: null,
          webhookSecretIv: null,
          webhookSecretAuthTag: null,
          isActive: true,
          metadataJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          assistant: {
            id: "assistant-1",
            name: "Assistente 1",
            status: "ACTIVE",
          },
        }),
        updateMany: async ({ data }) => {
          updatedPayloads.push(data);
          return { count: 1 };
        },
      },
      assistant: {
        findFirst: async () => ({
          id: "assistant-1",
          companyId: "company-1",
          status: "ACTIVE",
          name: "Assistente 1",
        }),
      },
    },
    {
      get: () => "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    },
  );

  await service.updateById("company-1", "cfg-1", {
    name: "Canal principal",
    baseUrl: "https://chatwoot.example.com",
    accountId: "account-1",
    inboxId: "inbox-1",
    assistantId: "",
    isActive: true,
  });

  assert.equal(updatedPayloads[0].assistantId, null);
});

test("normalizador Chatwoot resolve conversation.id", () => {
  const normalized = normalizeChatwootMessageCreatedPayload(createMessageCreatedPayload());

  assert.equal(normalized.externalConversationId, "conversation-1");
});

test("normalizador Chatwoot resolve conversation_id", () => {
  const payload = createMessageCreatedPayload();
  delete payload.conversation;
  payload.conversation_id = 12345;

  const normalized = normalizeChatwootMessageCreatedPayload(payload);

  assert.equal(normalized.externalConversationId, "12345");
});

test("normalizador Chatwoot resolve conversation.display_id", () => {
  const normalized = normalizeChatwootMessageCreatedPayload(
    createMessageCreatedPayload({
      conversation: { display_id: 9876, meta: { title: "Conversa WhatsApp" } },
    }),
  );

  assert.equal(normalized.externalConversationId, "9876");
});

test("normalizador Chatwoot resolve message.conversation_id", () => {
  const payload = createMessageCreatedPayload();
  delete payload.conversation;
  payload.message = {
    ...payload.message,
    conversation_id: "message-conversation-1",
  };

  const normalized = normalizeChatwootMessageCreatedPayload(payload);

  assert.equal(normalized.externalConversationId, "message-conversation-1");
});

test("normalizador Chatwoot resolve accountId e inboxId por fallbacks", () => {
  const payload = createMessageCreatedPayload();
  delete payload.account;
  delete payload.inbox;
  payload.account_id = 456;
  payload.inbox_id = 789;

  const normalized = normalizeChatwootMessageCreatedPayload(payload);

  assert.equal(normalized.accountId, "456");
  assert.equal(normalized.externalInboxId, "789");
  assert.equal(normalized.dto.externalAccountId, "456");
  assert.equal(normalized.dto.externalInboxId, "789");
});

test("normalizador Chatwoot resolve payload aninhado em data.message e data.conversation", () => {
  const normalized = normalizeChatwootMessageCreatedPayload({
    data: {
      event: "message_created",
      account: { id: 106 },
      inbox: { id: 524 },
      conversation: { id: 34, inbox_id: 524 },
      message: {
        id: 1000002,
        content: "Mensagem em data.message",
        message_type: "incoming",
        private: false,
        sender_type: "contact",
      },
    },
  });

  assert.equal(normalized.eventName, "message_created");
  assert.equal(normalized.accountId, "106");
  assert.equal(normalized.externalInboxId, "524");
  assert.equal(normalized.externalConversationId, "34");
  assert.equal(normalized.messageType, "incoming");
});

test("normalizador Chatwoot converte message_type numerico do enum Chatwoot", () => {
  const incoming = normalizeChatwootMessageCreatedPayload(
    createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Oi",
        sender_type: "contact",
        message_type: 0,
        attachments: [],
      },
    }),
  );
  const outgoing = normalizeChatwootMessageCreatedPayload(
    createMessageCreatedPayload({
      message: {
        id: "message-2",
        content: "Resposta",
        sender_type: "agent",
        message_type: 1,
        attachments: [],
      },
    }),
  );

  assert.equal(incoming.messageType, "incoming");
  assert.equal(incoming.dto.messageType, "incoming");
  assert.equal(outgoing.messageType, "outgoing");
  assert.equal(outgoing.dto.messageType, "outgoing");
});

function createAssistantServiceDeps(overrides = {}) {
  const calls = {
    runtimeResolved: [],
    providerConfigured: [],
    chatwootFetches: [],
    conversationCreates: [],
    conversationUpdates: [],
    messageCreates: [],
    messageUpdates: [],
    transactions: 0,
  };

  const assistantRecord = {
    id: "assistant-1",
    companyId: "company-1",
    name: "Assistente",
    description: "Descrição",
    initialMessage: "Olá!",
    instructions: "Responda objetivamente.",
    model: "gpt-4o-mini",
    temperature: 0.2,
    status: "ACTIVE",
  };

  const conversationRecord = {
    id: "conversation-1",
    companyId: "company-1",
    assistantId: "assistant-1",
    title: "Conversa WhatsApp",
    source: "CHATWOOT",
    channelType: "WHATSAPP",
    sourceProvider: "chatwoot",
    externalAccountId: "account-1",
    externalConversationId: "conversation-1",
    externalContactId: "contact-1",
    externalChannelId: "inbox-1",
    externalInboxId: "inbox-1",
    pausedByHuman: false,
    lastMessageAt: new Date(),
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tx = {
    assistantConversationMessage: {
      create: async ({ data }) => {
        calls.messageCreates.push(data);
        return {
          id: data.role === "user" ? "user-msg" : "assistant-msg",
          role: data.role,
          content: data.content,
          source: data.source ?? null,
          messageType: data.messageType ?? null,
          externalMessageId: data.externalMessageId ?? null,
          externalPayload: data.externalPayload ?? null,
          attachments: data.attachments ?? null,
          sources: data.sources ?? null,
          mode: data.mode ?? null,
          createdAt: new Date(),
        };
      },
      update: async ({ data }) => {
        calls.messageUpdates.push(data);
        return { id: "user-msg" };
      },
      findMany: async () => [],
    },
    assistantConversation: {
      update: async ({ data }) => {
        calls.conversationUpdates.push(data);
        return { id: "conversation-1" };
      },
    },
    assistantRuntimeLog: {
      create: async () => ({ id: "runtime-log-1" }),
    },
  };

  const prisma = {
    assistant: {
      findFirst: async () => assistantRecord,
    },
    assistantConversation: {
      findFirst: async () => conversationRecord,
      create: async ({ data }) => {
        calls.conversationCreates.push(data);
        return {
          ...conversationRecord,
          ...data,
          id: data.id ?? conversationRecord.id,
        };
      },
      update: async ({ data }) => {
        calls.conversationUpdates.push(data);
        return { id: "conversation-1" };
      },
    },
    assistantConversationMessage: {
      findMany: async () => [],
      create: async () => ({ id: "user-msg" }),
      update: async ({ data }) => {
        calls.messageUpdates.push(data);
        return { id: "user-msg" };
      },
    },
    assistantKnowledge: {
      findMany: async () => [],
    },
    assistantRuntimeLog: {
      create: async () => ({ id: "runtime-log-1" }),
    },
    $transaction: async (callback) => {
      calls.transactions += 1;
      return callback(tx);
    },
  };

  const aiService = {
    resolveRuntimeConfig: async (companyId) => {
      calls.runtimeResolved.push(companyId);
      if (typeof overrides.onRuntimeResolved === "function") {
        overrides.onRuntimeResolved();
      }
      return {
        runtimeEnabled: true,
        provider: "openai-compatible",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        apiKey: "secret",
        requestTimeoutMs: 30000,
        source: "tenant-settings",
        tenantSettingsConfigured: true,
        envFallbackConfigured: false,
        apiKeyConfigured: true,
        ...overrides.runtimeConfig,
      };
    },
    isProviderConfigured: async (companyId, model) => {
      calls.providerConfigured.push({ companyId, model });
      return overrides.providerConfigured ?? true;
    },
    generateChatCompletion: async () => {
      calls.runtimeResolved.push("generateChatCompletion");
      return (
        overrides.completion ?? {
          provider: "openai-compatible",
          model: "gpt-4o-mini",
          answer: "Resposta final",
          durationMs: 42,
        }
      );
    },
  };

  const attachmentInterpreterService = {
    processAttachment: async () =>
      overrides.processedAttachment ?? {
        processingStatus: "completed",
        extractedText: null,
        interpretedSummary: null,
        transcript: null,
        processingError: null,
        metadataJson: null,
      },
    buildRuntimeInputText: ({ rawText, attachments }) => {
      const text = typeof rawText === "string" ? rawText.trim() : "";
      const attachmentText = attachments
        .map(
          (attachment) =>
            attachment.transcript ??
            attachment.extractedText ??
            attachment.interpretedSummary ??
            "",
        )
        .filter(Boolean)
        .join(" ");

      return [text, attachmentText].filter(Boolean).join(" ").trim();
    },
  };

  const chatwootInboxConfigService = {
    resolveActiveForConversation: async (input) => {
      calls.chatwootFetches.push(input);
      return (
        overrides.outboundConfig ?? {
          baseUrl: "https://chatwoot.example.com",
        }
      );
    },
  };

  const knowledgeRetrievalService = {
    searchRelevantKnowledge: async () => ({
      totalChunksScanned: 0,
      warning: null,
      results: [],
    }),
  };

  const promptCompilerService = {
    compile: ({ assistant, historyMessages, currentMessage }) => [
      {
        role: "system",
        content: assistant.instructions ?? "Responda objetivamente.",
      },
      ...(historyMessages ?? []).map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: "user",
        content: currentMessage,
      },
    ],
  };

  const intentRouterService = {
    route: async () => ({
      flowId: null,
      flowName: null,
      confidence: 0,
      reason: "No flows available",
    }),
  };

  const service = new AssistantConversationsService(
    prisma,
    aiService,
    attachmentInterpreterService,
    chatwootInboxConfigService,
    undefined,
    knowledgeRetrievalService,
    promptCompilerService,
    intentRouterService,
  );

  return {
    service,
    calls,
    prisma,
    aiService,
    attachmentInterpreterService,
    chatwootInboxConfigService,
  };
}

function createChatwootInboxConfigServiceDeps(overrides = {}) {
  const assistantRecord = overrides.assistant ?? {
    id: "assistant-1",
    companyId: "company-1",
    name: "Assistente",
    status: "ACTIVE",
  };

  const prisma = {
    assistant: {
      findFirst: async () =>
        Object.prototype.hasOwnProperty.call(overrides, "assistantLookup")
          ? overrides.assistantLookup
          : assistantRecord,
    },
    chatwootInboxConfig: {
      findUnique: async () => overrides.existingConfig ?? null,
      findMany: async () => overrides.existingConfigs ?? [],
      upsert: async (input) => {
        const data = input.create ?? input.update;

        return {
          id: "cfg-1",
          companyId: data.companyId,
          assistantId: data.assistantId ?? null,
          assistant: data.assistantId
            ? {
                id: data.assistantId,
                name: assistantRecord.name,
                status: assistantRecord.status,
              }
            : null,
          name: data.name,
          baseUrl: data.baseUrl,
          accountId: data.accountId,
          inboxId: data.inboxId,
          apiAccessTokenEncrypted: null,
          apiAccessTokenIv: null,
          apiAccessTokenAuthTag: null,
          webhookSecretEncrypted: null,
          webhookSecretIv: null,
          webhookSecretAuthTag: null,
          isActive: data.isActive ?? true,
          metadataJson: data.metadataJson ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
      findFirst: async () => overrides.existingConfig ?? null,
      update: async ({ data }) => ({
        id: "cfg-1",
        companyId: "company-1",
        assistantId: data.assistantId ?? null,
        assistant: data.assistantId
          ? {
              id: data.assistantId,
              name: assistantRecord.name,
              status: assistantRecord.status,
            }
          : null,
        name: data.name,
        baseUrl: data.baseUrl,
        accountId: data.accountId,
        inboxId: data.inboxId,
        apiAccessTokenEncrypted: null,
        apiAccessTokenIv: null,
        apiAccessTokenAuthTag: null,
        webhookSecretEncrypted: null,
        webhookSecretIv: null,
        webhookSecretAuthTag: null,
        isActive: data.isActive ?? true,
        metadataJson: data.metadataJson ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
  };

  const configService = {
    get: (key) => {
      if (key === "NODE_ENV") {
        return "test";
      }

      if (key === "APP_ENCRYPTION_KEY") {
        return (
          overrides.encryptionKey ??
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        );
      }

      return null;
    },
  };

  const service = new ChatwootInboxConfigService(prisma, configService);

  return { service, prisma };
}

function createChatwootConfigRecord(overrides = {}) {
  return {
    id: "cfg-1",
    companyId: "company-1",
    assistantId: "assistant-1",
    assistant: {
      id: "assistant-1",
      name: "Assistente",
      status: "ACTIVE",
    },
    name: "Principal",
    baseUrl: "https://chatwoot.example.com",
    accountId: "account-1",
    inboxId: "inbox-1",
    apiAccessTokenEncrypted: null,
    apiAccessTokenIv: null,
    apiAccessTokenAuthTag: null,
    webhookSecretEncrypted: null,
    webhookSecretIv: null,
    webhookSecretAuthTag: null,
    isActive: true,
    metadataJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

test("config Chatwoot aceita assistantId do mesmo tenant", async () => {
  const { service } = createChatwootInboxConfigServiceDeps();

  const result = await service.upsert("company-1", {
    name: "WhatsApp Principal",
    baseUrl: "https://chatwoot.example.com",
    accountId: "account-1",
    inboxId: "inbox-1",
    assistantId: "assistant-1",
    isActive: true,
  });

  assert.equal(result.assistantId, "assistant-1");
  assert.equal(result.assistantName, "Assistente");
});

test("config Chatwoot grava token e segredo nos campos corretos do schema", async () => {
  let capturedInput = null;
  const { service } = createChatwootInboxConfigServiceDeps({
    existingConfig: null,
    encryptionKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  });

  service.prisma.chatwootInboxConfig.upsert = async (input) => {
    capturedInput = input;
    return {
      id: "cfg-1",
      companyId: input.create.companyId,
      assistantId: input.create.assistantId ?? null,
      assistant: null,
      name: input.create.name,
      baseUrl: input.create.baseUrl,
      accountId: input.create.accountId,
      inboxId: input.create.inboxId,
      apiAccessTokenEncrypted: input.create.apiAccessTokenEncrypted ?? null,
      apiAccessTokenIv: input.create.apiAccessTokenIv ?? null,
      apiAccessTokenAuthTag: input.create.apiAccessTokenAuthTag ?? null,
      webhookSecretEncrypted: input.create.webhookSecretEncrypted ?? null,
      webhookSecretIv: input.create.webhookSecretIv ?? null,
      webhookSecretAuthTag: input.create.webhookSecretAuthTag ?? null,
      isActive: input.create.isActive ?? true,
      metadataJson: input.create.metadataJson ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const result = await service.upsert("company-1", {
    name: "WhatsApp Principal",
    baseUrl: "https://chatwoot.example.com",
    accountId: "account-1",
    inboxId: "inbox-1",
    assistantId: "assistant-1",
    apiAccessToken: "token-super-secreto",
    webhookSecret: "webhook-super-secreto",
    isActive: true,
  });

  assert.ok(capturedInput);
  assert.equal(typeof capturedInput.create.apiAccessTokenEncrypted, "string");
  assert.equal(typeof capturedInput.create.apiAccessTokenIv, "string");
  assert.equal(typeof capturedInput.create.apiAccessTokenAuthTag, "string");
  assert.equal(typeof capturedInput.create.webhookSecretEncrypted, "string");
  assert.equal(typeof capturedInput.create.webhookSecretIv, "string");
  assert.equal(typeof capturedInput.create.webhookSecretAuthTag, "string");
  assert.equal(result.apiAccessTokenConfigured, true);
  assert.equal(result.webhookSecretConfigured, true);
  assert.equal("apiAccessTokenEncrypted" in result, false);
  assert.equal("webhookSecretEncrypted" in result, false);
});

test("config Chatwoot preserva token e segredo antigos quando os campos ficam em branco", async () => {
  let capturedInput = null;
  const existing = createChatwootConfigRecord({
    apiAccessTokenEncrypted: "old-token-encrypted",
    apiAccessTokenIv: "old-token-iv",
    apiAccessTokenAuthTag: "old-token-auth",
    webhookSecretEncrypted: "old-secret-encrypted",
    webhookSecretIv: "old-secret-iv",
    webhookSecretAuthTag: "old-secret-auth",
  });
  const { service } = createChatwootInboxConfigServiceDeps({
    existingConfig: existing,
  });

  service.prisma.chatwootInboxConfig.update = async (input) => {
    capturedInput = input;
    return {
      ...existing,
      ...input.data,
      assistant: existing.assistant,
      updatedAt: new Date(),
    };
  };

  await service.updateById("company-1", "cfg-1", {
    name: "WhatsApp Principal",
    baseUrl: "https://chatwoot.example.com",
    accountId: "account-1",
    inboxId: "inbox-1",
    apiAccessToken: "   ",
    webhookSecret: "",
    isActive: true,
  });

  assert.ok(capturedInput);
  assert.equal(capturedInput.data.apiAccessTokenEncrypted, "old-token-encrypted");
  assert.equal(capturedInput.data.apiAccessTokenIv, "old-token-iv");
  assert.equal(capturedInput.data.apiAccessTokenAuthTag, "old-token-auth");
  assert.equal(capturedInput.data.webhookSecretEncrypted, "old-secret-encrypted");
  assert.equal(capturedInput.data.webhookSecretIv, "old-secret-iv");
  assert.equal(capturedInput.data.webhookSecretAuthTag, "old-secret-auth");
});

test("config Chatwoot substitui token e segredo quando novos valores são enviados", async () => {
  let capturedInput = null;
  const existing = createChatwootConfigRecord({
    apiAccessTokenEncrypted: "old-token-encrypted",
    apiAccessTokenIv: "old-token-iv",
    apiAccessTokenAuthTag: "old-token-auth",
    webhookSecretEncrypted: "old-secret-encrypted",
    webhookSecretIv: "old-secret-iv",
    webhookSecretAuthTag: "old-secret-auth",
  });
  const { service } = createChatwootInboxConfigServiceDeps({
    existingConfig: existing,
  });

  service.prisma.chatwootInboxConfig.update = async (input) => {
    capturedInput = input;
    return {
      ...existing,
      ...input.data,
      assistant: existing.assistant,
      updatedAt: new Date(),
    };
  };

  await service.updateById("company-1", "cfg-1", {
    name: "WhatsApp Principal",
    baseUrl: "https://chatwoot.example.com",
    accountId: "account-1",
    inboxId: "inbox-1",
    apiAccessToken: "novo-token",
    webhookSecret: "novo-segredo",
    isActive: true,
  });

  assert.ok(capturedInput);
  assert.notEqual(capturedInput.data.apiAccessTokenEncrypted, "old-token-encrypted");
  assert.notEqual(capturedInput.data.webhookSecretEncrypted, "old-secret-encrypted");
  assert.equal(typeof capturedInput.data.apiAccessTokenEncrypted, "string");
  assert.equal(typeof capturedInput.data.webhookSecretEncrypted, "string");
});

test("config Chatwoot retorna erro amigável quando o Prisma falha ao salvar", async () => {
  const { service } = createChatwootInboxConfigServiceDeps();
  service.prisma.chatwootInboxConfig.upsert = async () => {
    throw new Error("Unknown argument `encryptedValue`");
  };

  await assert.rejects(
    () =>
      service.upsert("company-1", {
        name: "WhatsApp Principal",
        baseUrl: "https://chatwoot.example.com",
        accountId: "account-1",
        inboxId: "inbox-1",
        isActive: true,
      }),
    /Não foi possível salvar a configuração do Chatwoot/i,
  );
});

test("config Chatwoot rejeita assistantId inválido para o tenant", async () => {
  const { service } = createChatwootInboxConfigServiceDeps({ assistantLookup: null });

  await assert.rejects(
    () =>
      service.upsert("company-1", {
        name: "WhatsApp Principal",
        baseUrl: "https://chatwoot.example.com",
        accountId: "account-1",
        inboxId: "inbox-1",
        assistantId: "assistant-other",
        isActive: true,
      }),
    /Assistente inválido para este tenant/i,
  );
});

test("config Chatwoot busca por companyId ao abrir uma config por id", async () => {
  const calls = [];
  const prisma = {
    assistant: {
      findFirst: async () => null,
    },
    chatwootInboxConfig: {
      findUnique: async () => null,
      findMany: async () => [],
      findFirst: async (args) => {
        calls.push(args);
        return null;
      },
    },
  };
  const configService = {
    get: (key) => {
      if (key === "NODE_ENV") {
        return "test";
      }

      return "";
    },
  };
  const service = new ChatwootInboxConfigService(prisma, configService);

  await assert.rejects(() => service.findById("company-1", "cfg-foreign"), /not found/i);
  assert.deepEqual(calls[0].where, {
    companyId: "company-1",
    id: "cfg-foreign",
  });
});

test("testConnection alerta quando não há assistente vinculado", async () => {
  const { service } = createChatwootInboxConfigServiceDeps({
    existingConfig: createChatwootConfigRecord({
      assistantId: null,
      assistant: null,
    }),
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
  });

  try {
    const result = await service.testConnectionById("company-1", "cfg-1");

    assert.equal(result.ok, true);
    assert.equal(result.details?.assistantConfigured, false);
    assert.equal(
      result.details?.webhookUrlTemplate.endsWith(
        "/webhooks/chatwoot?secret=SEU_SECRET_CONFIGURADO",
      ),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("webhook Chatwoot incoming com anexo chama downloader e runtime", async () => {
  const { service, calls } = createWebhookDeps();
  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Segue anexo",
        sender_type: "contact",
        message_type: "incoming",
        attachments: [
          {
            file_name: "audio.webm",
            mime_type: "audio/webm",
            data_url: "data:audio/webm;base64,ZmFrZQ==",
          },
        ],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ok, true);
  assert.equal(calls.downloader.length, 1);
  assert.equal(calls.ensureConversation.length, 1);
  assert.equal(calls.sendMessage.length, 1);
  assert.equal(calls.sendMessage[0].preparedAttachments?.length, 1);
});

test("webhook Chatwoot incoming válido chama processamento", async () => {
  const { service, calls } = createWebhookDeps();

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload(),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ok, true);
  assert.equal(calls.configResolution.length, 1);
  assert.equal(calls.ensureConversation.length, 1);
  assert.equal(calls.sendMessage.length, 1);
});

test("webhook Chatwoot incoming com message_type numerico processa", async () => {
  const { service, calls } = createWebhookDeps();

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Mensagem com enum numerico",
        sender_type: "contact",
        message_type: 0,
        attachments: [],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ok, true);
  assert.equal(calls.ensureConversation.length, 1);
  assert.equal(calls.sendMessage.length, 1);
  assert.equal(calls.diagnostics[0].messageType, "incoming");
});

test("webhook Chatwoot sem conversationId retorna 400 controlado", async () => {
  const { service, calls } = createWebhookDeps();
  const payload = createMessageCreatedPayload();
  delete payload.conversation;
  delete payload.conversation_id;
  delete payload.conversationId;
  delete payload.message.conversation;
  delete payload.message.conversation_id;

  await assert.rejects(
    () =>
      service.processMessageCreated({
        payload,
        webhookSecret: "secret-123",
      }),
    (error) => {
      assert.equal(error.getStatus?.(), 400);
      assert.equal(error.message, "Payload do CuboChat sem identificador de conversa.");
      return true;
    },
  );

  assert.equal(calls.configResolution.length, 0);
  assert.equal(calls.ensureConversation.length, 0);
  assert.equal(calls.sendMessage.length, 0);
});

test("webhook Chatwoot incoming com sender.id externo cria conversa sem usar userId interno", async () => {
  const assistantDeps = createAssistantServiceDeps({
    runtimeConfig: {
      runtimeEnabled: false,
    },
    outboundConfig: {
      baseUrl: "https://chatwoot.example.com",
      apiAccessToken: "user-api-token",
    },
  });
  assistantDeps.prisma.assistantConversation.create = async ({ data }) => {
    assistantDeps.calls.conversationCreates.push(data);
    return {
      id: "internal-conversation-1",
      companyId: data.companyId,
      assistantId: data.assistantId,
      title: data.title ?? null,
      source: data.source,
      channelType: data.channelType,
      sourceProvider: data.sourceProvider,
      externalAccountId: data.externalAccountId ?? null,
      externalConversationId: data.externalConversationId ?? null,
      externalContactId: data.externalContactId ?? null,
      externalChannelId: data.externalChannelId ?? null,
      externalInboxId: data.externalInboxId ?? null,
      pausedByHuman: data.pausedByHuman ?? false,
      lastMessageAt: data.lastMessageAt ?? new Date(),
      status: data.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };
  let conversationFindCalls = 0;
  assistantDeps.prisma.assistantConversation.findFirst = async () => {
    conversationFindCalls += 1;
    if (conversationFindCalls === 1) {
      return null;
    }

    return {
      id: "internal-conversation-1",
      companyId: "company-1",
      assistantId: "assistant-1",
      title: "Conversa WhatsApp",
      source: "CHATWOOT",
      channelType: "WHATSAPP",
      sourceProvider: "chatwoot",
      externalAccountId: "106",
      externalConversationId: "1",
      externalContactId: "contact-1",
      externalChannelId: "524",
      externalInboxId: "524",
      pausedByHuman: false,
      lastMessageAt: new Date(),
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const chatwootConfigService = {
    resolveActiveByWebhook: async () => ({
      id: "cfg-1",
      companyId: "company-1",
      assistantId: "assistant-1",
      assistantName: "Assistente",
      assistantStatus: "ACTIVE",
      name: "Principal",
      baseUrl: "https://chatwoot.example.com",
      accountId: "106",
      inboxId: "524",
      isActive: true,
      metadataJson: null,
      apiAccessTokenConfigured: false,
      webhookSecretConfigured: true,
      apiAccessToken: null,
      webhookSecret: "secret-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    isWebhookSecureModeAllowed: async () => true,
    resolveActiveForConversation: async () => null,
  };
  const webhookPrisma = {
    assistant: {
      findFirst: async () => ({ id: "assistant-1" }),
    },
    assistantConversationMessage: {
      findFirst: async () => null,
    },
  };
  const webhookService = new ChatwootWebhookService(
    webhookPrisma,
    chatwootConfigService,
    { downloadAttachment: async () => null },
    assistantDeps.service,
  );
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url, init });
    return {
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 123, content: "Resposta enviada" }),
    };
  };

  try {
    const result = await webhookService.processMessageCreated({
      payload: createMessageCreatedPayload({
        account: { id: 106 },
        inbox: { id: 524, identifier: "524" },
        conversation: { id: 1, meta: { title: "Conversa WhatsApp" } },
        message: {
          id: 9961329,
          content: "Olá pelo CuboChat",
          sender_type: "contact",
          message_type: "incoming",
          sender: {
            id: "external-whatsapp-sender-1",
            identifier: "wa-sender-identifier",
            name: "Cliente WhatsApp",
            phone_number: "+5511999999999",
            type: "contact",
          },
          attachments: [],
        },
        contact: {
          id: "contact-1",
          identifier: "wa-contact-identifier",
          name: "Cliente WhatsApp",
          phone_number: "+5511999999999",
        },
      }),
      webhookSecret: "secret-123",
    });

    assert.equal(result.ok, true);
    assert.equal(assistantDeps.calls.conversationCreates.length, 1);
    assert.equal(assistantDeps.calls.conversationCreates[0].userId, null);
    assert.equal(assistantDeps.calls.conversationCreates[0].source, "CHATWOOT");
    assert.equal(assistantDeps.calls.conversationCreates[0].channelType, "WHATSAPP");
    assert.equal(assistantDeps.calls.conversationCreates[0].externalAccountId, "106");
    assert.equal(assistantDeps.calls.conversationCreates[0].externalInboxId, "524");
    assert.equal(assistantDeps.calls.conversationCreates[0].externalConversationId, "1");
    assert.equal(assistantDeps.calls.conversationCreates[0].externalContactId, "contact-1");

    const payload = assistantDeps.calls.messageUpdates.at(-1).externalPayload;
    assert.equal(payload.externalMessageId, "9961329");
    assert.equal(payload.externalAccountId, "106");
    assert.equal(payload.externalInboxId, "524");
    assert.equal(payload.externalConversationId, "1");
    assert.equal(payload.externalContactId, "contact-1");
    assert.equal(payload.externalSenderId, "external-whatsapp-sender-1");
    assert.equal(payload.externalSenderIdentifier, "wa-sender-identifier");
    assert.equal(payload.externalSenderName, "Cliente WhatsApp");
    assert.equal(payload.externalSenderPhone, "+5511999999999");

    assert.equal(assistantDeps.calls.chatwootFetches.length, 1);
    assert.deepEqual(assistantDeps.calls.chatwootFetches[0], {
      companyId: "company-1",
      accountId: "106",
      inboxId: "524",
    });
    assert.equal(
      fetchCalls[0].url,
      "https://chatwoot.example.com/api/v1/accounts/106/conversations/1/messages",
    );
    assert.notEqual(fetchCalls[0].url.includes("internal-conversation-1"), true);
    const outboundBody = JSON.parse(fetchCalls[0].init.body);
    assert.equal(typeof outboundBody.content, "string");
    assert.equal(outboundBody.content.length > 0, true);
    assert.equal(outboundBody.message_type, "outgoing");
    assert.equal(outboundBody.private, false);
    assert.equal(fetchCalls[0].init.headers.api_access_token, "user-api-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("webhook desconhecido não chama runtime", async () => {
  const { service, calls } = createWebhookDeps({
    resolveActiveByWebhook: null,
  });

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload(),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ignored, true);
  assert.equal(calls.ensureConversation.length, 0);
  assert.equal(calls.sendMessage.length, 0);
});

test("webhook ignora canal inativo", async () => {
  const inboxService = new ChatwootInboxConfigService(
    {
      chatwootInboxConfig: {
        findMany: async ({ where }) => {
          assert.equal(where.isActive, true);
          return [];
        },
      },
    },
    { get: () => "" },
  );
  const { service, calls } = createWebhookDeps({
    resolveActiveByWebhook: (input) => inboxService.resolveActiveByWebhook(input),
  });

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload(),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ignored, true);
  assert.equal(calls.ensureConversation.length, 0);
  assert.equal(calls.sendMessage.length, 0);
});

test("resolveActiveByWebhook rejeita ambiguidade entre tenants", async () => {
  const prisma = {
    chatwootInboxConfig: {
      findMany: async () => [
        {
          id: "cfg-1",
          companyId: "company-1",
          assistantId: "assistant-1",
          assistant: {
            id: "assistant-1",
            name: "Assistente 1",
            status: "ACTIVE",
          },
          name: "Principal",
          baseUrl: "https://chatwoot.example.com",
          accountId: "account-1",
          inboxId: "inbox-1",
          apiAccessTokenEncrypted: null,
          apiAccessTokenIv: null,
          apiAccessTokenAuthTag: null,
          webhookSecretEncrypted: null,
          webhookSecretIv: null,
          webhookSecretAuthTag: null,
          isActive: true,
          metadataJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "cfg-2",
          companyId: "company-2",
          assistantId: "assistant-2",
          assistant: {
            id: "assistant-2",
            name: "Assistente 2",
            status: "ACTIVE",
          },
          name: "Principal",
          baseUrl: "https://chatwoot.example.com",
          accountId: "account-1",
          inboxId: "inbox-1",
          apiAccessTokenEncrypted: null,
          apiAccessTokenIv: null,
          apiAccessTokenAuthTag: null,
          webhookSecretEncrypted: null,
          webhookSecretIv: null,
          webhookSecretAuthTag: null,
          isActive: true,
          metadataJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
  };
  const configService = {
    get: (key) => {
      if (key === "NODE_ENV") {
        return "test";
      }

      return "";
    },
  };
  const service = new ChatwootInboxConfigService(prisma, configService);

  await assert.rejects(
    () =>
      service.resolveActiveByWebhook({
        accountId: "account-1",
        inboxId: "inbox-1",
      }),
    /Ambiguous Chatwoot webhook tenant resolution/i,
  );
});

test("webhook sem assistantId manual usa o assistente vinculado na inbox", async () => {
  const { service, calls } = createWebhookDeps();

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload(),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ok, true);
  assert.equal(calls.ensureConversation[0].assistantId, "assistant-1");
  assert.equal(calls.sendMessage[0].assistantId, "assistant-1");
});

test("webhook sem assistente vinculado não chama runtime", async () => {
  const { service, calls } = createWebhookDeps({
    config: {
      assistantId: null,
      assistantName: null,
      assistantStatus: null,
    },
  });

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload(),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ignored, true);
  assert.equal(calls.ensureConversation.length, 0);
  assert.equal(calls.sendMessage.length, 0);
});

test("endpoint legado continua funcionando com assistantId na URL", async () => {
  const { service, calls } = createWebhookDeps({
    config: {
      assistantId: null,
      assistantName: null,
      assistantStatus: null,
    },
  });

  const result = await service.processMessageCreated({
    assistantId: "assistant-1",
    payload: createMessageCreatedPayload(),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ok, true);
  assert.equal(calls.ensureConversation[0].assistantId, "assistant-1");
  assert.equal(calls.sendMessage[0].assistantId, "assistant-1");
});

test("webhook sem secret válido em produção é rejeitado", async () => {
  const { service, calls } = createWebhookDeps({
    secureModeAllowed: false,
    config: {
      webhookSecret: null,
      webhookSecretConfigured: false,
    },
  });

  await assert.rejects(
    () =>
      service.processMessageCreated({
        payload: createMessageCreatedPayload(),
        webhookSecret: null,
      }),
    /Chatwoot webhook secret is required in production/i,
  );

  assert.equal(calls.sendMessage.length, 0);
});

test("webhook com secret errado é rejeitado", async () => {
  const { service, calls } = createWebhookDeps();

  await assert.rejects(
    () =>
      service.processMessageCreated({
        payload: createMessageCreatedPayload(),
        webhookSecret: "secret-errado",
      }),
    /Invalid Chatwoot webhook secret/i,
  );

  assert.equal(calls.sendMessage.length, 0);
});

test("webhook sem secret é rejeitado quando a inbox exige validação", async () => {
  const { service, calls } = createWebhookDeps();

  await assert.rejects(
    () =>
      service.processMessageCreated({
        payload: createMessageCreatedPayload(),
        webhookSecret: null,
      }),
    /Invalid Chatwoot webhook secret/i,
  );

  assert.equal(calls.sendMessage.length, 0);
});

test("webhook sem secret configurado gera pending honesto para anexo ainda não pronto", async () => {
  const { service, calls } = createWebhookDeps();

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Segue imagem",
        sender_type: "contact",
        message_type: "incoming",
        attachments: [
          {
            file_name: "foto.jpg",
            mime_type: "image/jpeg",
            attachment_storage_pending: true,
          },
        ],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ok, true);
  assert.equal(calls.downloader.length, 0);
  assert.equal(calls.sendMessage[0].preparedAttachments?.[0]?.processingStatus, "pending");
  assert.equal(calls.sendMessage[0].preparedAttachments?.[0]?.processingError, null);
});

test("webhook duplicado não responde duas vezes", async () => {
  const { service, calls, prisma } = createWebhookDeps();
  prisma.assistantConversationMessage.findFirst = async () => ({
    id: "existing-msg",
    conversationId: "internal-conversation-1",
  });

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload(),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ignored, true);
  assert.equal(result.reason, "duplicate");
  assert.equal(calls.sendMessage.length, 0);
});

test("falha no download marca anexo como failed e mantém fallback honesto", async () => {
  const { service, calls } = createWebhookDeps({
    downloadResult: null,
  });
  service["chatwootAttachmentDownloaderService"].downloadAttachment = async () => {
    throw new Error("download indisponível");
  };

  await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Segue anexo",
        sender_type: "contact",
        message_type: "incoming",
        attachments: [
          {
            file_name: "arquivo.pdf",
            mime_type: "application/pdf",
            data_url: "https://chatwoot.example.com/attachments/1",
          },
        ],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(calls.sendMessage.length, 1);
  assert.equal(calls.sendMessage[0].preparedAttachments?.[0]?.processingStatus, "failed");
  assert.match(
    calls.sendMessage[0].preparedAttachments?.[0]?.processingError ?? "",
    /download indisponível/,
  );
});

test("mensagem outgoing é ignorada para evitar loop", async () => {
  const { service, calls } = createWebhookDeps();

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Resposta do bot",
        sender_type: "agent",
        message_type: "outgoing",
        attachments: [],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ignored, true);
  assert.equal(calls.configResolution.length, 0);
  assert.equal(calls.sendMessage.length, 0);
});

test("mensagem outgoing numerica é ignorada para evitar loop", async () => {
  const { service, calls } = createWebhookDeps();

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Resposta do bot",
        sender_type: "agent",
        message_type: 1,
        attachments: [],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ignored, true);
  assert.equal(result.reason, "AUTOMATED_OUTGOING_MESSAGE");
  assert.equal(calls.configResolution.length, 0);
  assert.equal(calls.sendMessage.length, 0);
  assert.equal(calls.diagnostics[0].messageType, "outgoing");
});

test("mensagem template é ignorada para evitar loop", async () => {
  const { service, calls } = createWebhookDeps();

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Template",
        sender_type: "assistant",
        message_type: "template",
        attachments: [],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ignored, true);
  assert.equal(calls.sendMessage.length, 0);
});

test("mensagem privada é ignorada", async () => {
  const { service, calls } = createWebhookDeps();

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Nota privada",
        sender_type: "contact",
        message_type: "incoming",
        private: true,
        attachments: [],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ignored, true);
  assert.equal(calls.sendMessage.length, 0);
});

test("mensagem de agent_bot é ignorada", async () => {
  const { service, calls } = createWebhookDeps();

  const result = await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-1",
        content: "Resposta do bot",
        sender_type: "agent_bot",
        sender: {
          id: "agent-bot-1",
          name: "Bot",
          type: "agent_bot",
        },
        message_type: "incoming",
        attachments: [],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(result.ignored, true);
  assert.equal(calls.sendMessage.length, 0);
});

test("mesma conversa Chatwoot reutiliza a mesma conversa interna", async () => {
  const { service } = createWebhookDeps();
  const result1 = await service.processMessageCreated({
    payload: createMessageCreatedPayload(),
    webhookSecret: "secret-123",
  });

  const result2 = await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      message: {
        id: "message-2",
        content: "Outra mensagem",
        sender_type: "contact",
        message_type: "incoming",
        attachments: [],
      },
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(result1.conversationId, result2.conversationId);
});

test("sendMessage chama outbound somente depois do runtime", async () => {
  const events = [];
  const { service, calls } = createAssistantServiceDeps({
    onRuntimeResolved: () => events.push("runtime"),
    outboundConfig: {
      baseUrl: "https://chatwoot.example.com",
      apiAccessToken: "user-api-token",
    },
  });
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];

  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url, init });
    events.push("outbound");
    assert.ok(events.includes("runtime"));
    return {
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 123, content: "Resposta enviada" }),
    };
  };

  try {
    await service.sendMessage({
      assistantId: "assistant-1",
      conversationId: "conversation-1",
      dto: {
        source: "chatwoot",
        externalConversationId: "conversation-1",
        externalAccountId: "account-1",
        externalContactId: "contact-1",
        externalInboxId: "inbox-1",
        message: "Olá",
      },
      user: {
        id: "user-1",
        companyId: "company-1",
        email: "user@cubo.local",
        name: "User",
        roles: [],
        permissions: [],
      },
      tenant: { companyId: "company-1" },
      preparedAttachments: [],
    });
    assert.deepEqual(events, ["runtime", "outbound"]);
    assert.equal(calls.runtimeResolved.includes("generateChatCompletion"), true);
    assert.equal(
      fetchCalls[0].url,
      "https://chatwoot.example.com/api/v1/accounts/account-1/conversations/conversation-1/messages",
    );
    assert.deepEqual(JSON.parse(fetchCalls[0].init.body), {
      content: "Resposta final",
      message_type: "outgoing",
      private: false,
      sender_type: "Captain::Assistant",
      content_attributes: {
        automation_rule_id: "cubo_ai_studio",
        source: "cubo_ai_studio",
        assistant_id: "assistant-1",
        internal_conversation_id: "conversation-1",
      },
    });
    assert.equal(fetchCalls[0].init.headers.api_access_token, "user-api-token");
    assert.equal(fetchCalls[0].init.headers.Authorization, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ensureConversationFromInboundMessage reutiliza conversa existente", async () => {
  const { service, prisma } = createAssistantServiceDeps();
  let createCalls = 0;
  prisma.assistantConversation.findFirst = async () => null;
  prisma.assistantConversation.create = async () => {
    createCalls += 1;
    return {
      id: "conversation-1",
      companyId: "company-1",
      assistantId: "assistant-1",
      title: "Conversa WhatsApp",
      source: "CHATWOOT",
      channelType: "UNKNOWN",
      sourceProvider: "chatwoot",
      externalAccountId: "account-1",
      externalConversationId: "conversation-1",
      externalContactId: "contact-1",
      externalChannelId: "inbox-1",
      externalInboxId: "inbox-1",
      pausedByHuman: false,
      lastMessageAt: new Date(),
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const first = await service.ensureConversationFromInboundMessage({
    assistantId: "assistant-1",
    sourceProvider: "chatwoot",
    externalAccountId: "account-1",
    externalConversationId: "conversation-1",
    externalContactId: "contact-1",
    externalChannelId: "inbox-1",
    externalInboxId: "inbox-1",
    tenant: { companyId: "company-1" },
    user: {
      id: "user-1",
      companyId: "company-1",
      email: "user@cubo.local",
      name: "User",
      roles: [],
      permissions: [],
    },
  });

  prisma.assistantConversation.findFirst = async () => first;

  const second = await service.ensureConversationFromInboundMessage({
    assistantId: "assistant-1",
    sourceProvider: "chatwoot",
    externalAccountId: "account-1",
    externalConversationId: "conversation-1",
    externalContactId: "contact-1",
    externalChannelId: "inbox-1",
    externalInboxId: "inbox-1",
    tenant: { companyId: "company-1" },
    user: {
      id: "user-1",
      companyId: "company-1",
      email: "user@cubo.local",
      name: "User",
      roles: [],
      permissions: [],
    },
  });

  assert.equal(first.id, second.id);
  assert.equal(createCalls, 1);
});

test("ensureConversationFromInboundMessage não usa user.id sintético como userId interno", async () => {
  const { service, calls, prisma } = createAssistantServiceDeps();
  prisma.assistantConversation.findFirst = async () => null;

  await service.ensureConversationFromInboundMessage({
    assistantId: "assistant-1",
    sourceProvider: "chatwoot",
    externalAccountId: "account-1",
    externalConversationId: "conversation-1",
    externalContactId: "external-contact-1",
    externalChannelId: "inbox-1",
    externalInboxId: "inbox-1",
    tenant: { companyId: "company-1" },
    user: {
      id: "external-whatsapp-sender-1",
      companyId: "company-1",
      email: "system-chatwoot@cubo.local",
      name: "System Chatwoot",
      roles: [],
      permissions: [],
    },
  });

  assert.equal(calls.conversationCreates.length, 1);
  assert.equal(calls.conversationCreates[0].userId, null);
  assert.equal(calls.conversationCreates[0].externalContactId, "external-contact-1");
});

test("assistente de outro tenant retorna not found ao consultar ou editar", async () => {
  const prisma = {
    assistant: {
      findFirst: async () => null,
      findMany: async () => [],
      create: async () => null,
      update: async () => null,
    },
    assistantKnowledge: {
      findMany: async () => [],
    },
    assistantPreviewLog: {
      findMany: async () => [],
    },
  };
  const service = new AssistantsService(prisma);
  const user = {
    id: "user-1",
    companyId: "company-1",
    email: "user@cubo.local",
    name: "User",
    roles: [],
    permissions: [],
  };
  const tenant = { companyId: "company-1" };

  await assert.rejects(
    () => service.findOne({ id: "assistant-foreign", user, tenant }),
    /Assistant not found/i,
  );
  await assert.rejects(
    () =>
      service.update({
        id: "assistant-foreign",
        dto: { name: "Novo nome" },
        user,
        tenant,
      }),
    /Assistant not found/i,
  );
});

test("conversa de outro tenant retorna not found ao listar mensagens ou enviar mensagem", async () => {
  const { service, prisma } = createAssistantServiceDeps();
  prisma.assistantConversation.findFirst = async () => null;
  const user = {
    id: "user-1",
    companyId: "company-1",
    email: "user@cubo.local",
    name: "User",
    roles: [],
    permissions: [],
  };
  const tenant = { companyId: "company-1" };

  await assert.rejects(
    () =>
      service.findMessages({
        assistantId: "assistant-1",
        conversationId: "conversation-foreign",
        user,
        tenant,
      }),
    /Conversation not found/i,
  );

  await assert.rejects(
    () =>
      service.sendMessage({
        assistantId: "assistant-1",
        conversationId: "conversation-foreign",
        dto: { message: "oi" },
        user,
        tenant,
      }),
    /Conversation not found/i,
  );
});

test("base de conhecimento de outro tenant retorna not found", async () => {
  const prisma = {
    assistant: {
      findFirst: async () => null,
    },
    assistantKnowledge: {
      findMany: async () => [],
      findFirst: async () => null,
      update: async () => null,
    },
  };
  const service = new AssistantKnowledgeService(prisma);
  const user = {
    id: "user-1",
    companyId: "company-1",
    email: "user@cubo.local",
    name: "User",
    roles: [],
    permissions: [],
  };
  const tenant = { companyId: "company-1" };

  await assert.rejects(
    () =>
      service.findAll({
        assistantId: "assistant-foreign",
        user,
        tenant,
      }),
    /Assistant not found/i,
  );
});

test("logs de runtime de outro tenant retornam not found", async () => {
  const prisma = {
    assistantRuntimeLog: {
      findMany: async () => [],
      findFirst: async () => null,
    },
  };
  const service = new AssistantRuntimeLogsService(prisma);
  const user = {
    id: "user-1",
    companyId: "company-1",
    email: "user@cubo.local",
    name: "User",
    roles: [],
    permissions: [],
  };
  const tenant = { companyId: "company-1" };

  await assert.rejects(
    () =>
      service.findOne({
        id: "runtime-log-foreign",
        user,
        tenant,
      }),
    /AI runtime log not found/i,
  );
});

test("config AI do tenant não vaza config de outro companyId", async () => {
  const calls = [];
  const prisma = {
    companyAiSettings: {
      findUnique: async (args) => {
        calls.push(args);
        return args.where.companyId === "company-1"
          ? null
          : {
              id: "settings-foreign",
              companyId: "company-2",
              runtimeEnabled: true,
              provider: "openai-compatible",
              baseUrl: "https://api.openai.com/v1",
              model: "gpt-4o-mini",
              encryptedApiKey: null,
              apiKeyIv: null,
              apiKeyAuthTag: null,
              requestTimeoutMs: 30000,
              status: "ACTIVE",
              lastTestAt: null,
              lastTestStatus: null,
              lastTestError: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
      },
      upsert: async () => null,
      update: async () => null,
    },
  };
  const configService = {
    get: (key) => {
      if (key === "NODE_ENV") {
        return "test";
      }

      return "";
    },
  };
  const service = new AiSettingsService(prisma, configService);

  const result = await service.getSafeSettings("company-1");

  assert.equal(result.tenantSettingsConfigured, false);
  assert.equal(result.apiKeyConfigured, false);
  assert.deepEqual(calls[0].where, { companyId: "company-1" });
});

test("Chatwoot config de outro tenant retorna 404 em leitura, teste e exclusão", async () => {
  const calls = [];
  const prisma = {
    assistant: {
      findFirst: async () => null,
    },
    chatwootInboxConfig: {
      findUnique: async () => null,
      findMany: async (args) => {
        calls.push({ kind: "findMany", args });
        return [];
      },
      findFirst: async (args) => {
        calls.push({ kind: "findFirst", args });
        return null;
      },
      deleteMany: async (args) => {
        calls.push({ kind: "deleteMany", args });
        return { count: 0 };
      },
      upsert: async () => null,
      update: async () => null,
    },
  };
  const configService = {
    get: (key) => {
      if (key === "NODE_ENV") {
        return "test";
      }

      return "";
    },
  };
  const service = new ChatwootInboxConfigService(prisma, configService);

  await assert.rejects(() => service.findById("company-1", "cfg-foreign"), /not found/i);
  await assert.rejects(() => service.testConnectionById("company-1", "cfg-foreign"), /not found/i);
  await assert.rejects(() => service.delete("company-1", "cfg-foreign"), /not found/i);

  assert.deepEqual(calls[0].args.where, { companyId: "company-1", id: "cfg-foreign" });
  assert.deepEqual(calls[1].args.where, {
    companyId: "company-1",
    id: "cfg-foreign",
    isActive: true,
  });
  assert.deepEqual(calls[2].args.where, { companyId: "company-1", id: "cfg-foreign" });
});

test("Chatwoot list retorna apenas canais da empresa solicitada", async () => {
  const calls = [];
  const prisma = {
    assistant: {
      findFirst: async () => null,
    },
    chatwootInboxConfig: {
      findMany: async (args) => {
        calls.push(args);
        return [
          createChatwootConfigRecord({
            id: "cfg-company-1",
            companyId: "company-1",
            assistantId: null,
            assistant: null,
          }),
        ];
      },
      findUnique: async () => null,
      findFirst: async () => null,
      deleteMany: async () => ({ count: 0 }),
      upsert: async () => null,
      update: async () => null,
    },
  };
  const configService = {
    get: (key) => {
      if (key === "NODE_ENV") {
        return "test";
      }

      return "";
    },
  };
  const service = new ChatwootInboxConfigService(prisma, configService);

  const result = await service.list("company-1");

  assert.equal(result.length, 1);
  assert.equal(result[0].companyId, "company-1");
  assert.deepEqual(calls[0].where, { companyId: "company-1" });
});

test("Chatwoot inbox config rejeita assistantId de outro tenant", async () => {
  const prisma = {
    assistant: {
      findFirst: async () => null,
    },
    chatwootInboxConfig: {
      findUnique: async () => null,
      findMany: async () => [],
      findFirst: async () => null,
      deleteMany: async () => ({ count: 0 }),
      upsert: async () => null,
      update: async () => null,
    },
  };
  const configService = {
    get: (key) => {
      if (key === "NODE_ENV") {
        return "test";
      }

      if (key === "APP_ENCRYPTION_KEY") {
        return "";
      }

      return "";
    },
  };
  const service = new ChatwootInboxConfigService(prisma, configService);

  await assert.rejects(
    () =>
      service.upsert("company-1", {
        name: "WhatsApp",
        baseUrl: "https://chatwoot.example.com",
        accountId: "account-1",
        inboxId: "inbox-1",
        assistantId: "assistant-foreign",
        isActive: true,
      }),
    /Assistente inválido para este tenant/i,
  );
});
