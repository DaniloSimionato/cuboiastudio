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
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";
import { IntentRouterService } from "../dist/intent-router/intent-router.service.js";
import {
  InMemoryConversationStateStore,
  RuntimeV2ShadowOrchestrator,
} from "../dist/runtime-v2/index.js";
import { RuntimeV2ShadowIntegrationService } from "../dist/runtime-v2/runtime-v2-shadow-integration.service.js";
import { hashCanonicalInboundMessageContent } from "../dist/inbound/canonical-inbound-message.js";

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
          resolvedType: input.attachment.type,
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
    providerPayloads: [],
    chatwootFetches: [],
    conversationCreates: [],
    conversationUpdates: [],
    messageCreates: [],
    messageUpdates: [],
    runtimeLogCreates: [],
    historyQueryTakes: [],
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
    company: {
      name: "Empresa Teste",
      timezone: "America/Sao_Paulo",
    },
    ...(overrides.assistant ?? {}),
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
    ...(overrides.conversation ?? {}),
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
      create: async ({ data }) => {
        calls.runtimeLogCreates.push(data);
        return { id: "runtime-log-1" };
      },
    },
  };

  const prisma = {
    assistant: {
      findFirst: async () => assistantRecord,
    },
    appInstallation: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    assistantToolConfig: {
      findMany: async () => [],
      findFirst: async () => null,
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
      findMany: async ({ take }) => {
        calls.historyQueryTakes.push(take);
        return overrides.recentMessages ?? [];
      },
      count: async () => overrides.historyMessageCount ?? (overrides.recentMessages ?? []).length,
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
      create: async ({ data }) => {
        calls.runtimeLogCreates.push(data);
        return { id: "runtime-log-1" };
      },
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
    generateChatCompletion: async (request) => {
      calls.runtimeResolved.push("generateChatCompletion");
      calls.providerPayloads.push(request);
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
    searchRelevantKnowledge: async () =>
      overrides.knowledgeRetrievalResult ?? {
        totalChunksScanned: 0,
        warning: null,
        results: [],
      },
  };

  const promptCompilerService = overrides.promptCompilerService ?? {
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

  const intentRouterService = overrides.intentRouterService ?? {
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
    undefined,
    undefined,
    undefined,
    overrides.cacheService,
    overrides.runtimeV2ShadowIntegration,
    overrides.responseGenerationRouter,
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

    const payload = assistantDeps.calls.messageUpdates.findLast(
      (update) => update.externalPayload,
    ).externalPayload;
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

test("webhook do Chatwoot persiste mídia com tipo resolvido após download autenticado", async () => {
  const { service, calls } = createWebhookDeps({
    downloadResult: {
      buffer: Buffer.from([1, 2, 3, 4]),
      mimeType: "image/jpeg",
      fileName: "foto.jpg",
      sizeBytes: 4,
      sourceUrl: "https://storage.examplecdn.com/signed/foto.jpg?sig=abc",
      thumbUrl: null,
      resolvedType: "image",
      metadataJson: { kind: "downloaded", contentType: "image/jpeg" },
    },
  });

  await service.processMessageCreated({
    payload: createMessageCreatedPayload({
      id: "message-top-level",
      message: undefined,
      content: "",
      message_type: "incoming",
      sender_type: "contact",
      source_id: "source-top-level",
      sender: {
        id: "sender-1",
        name: "João",
        phone_number: "+5511999999999",
        type: "contact",
      },
      attachments: [
        {
          file_url: "/rails/active_storage/blobs/redirect/abc/foto.jpg",
          content_type: "application/octet-stream",
          file_type: "image",
        },
      ],
    }),
    webhookSecret: "secret-123",
  });

  assert.equal(calls.downloader.length, 1);
  assert.equal(calls.sendMessage.length, 1);
  assert.equal(calls.sendMessage[0].preparedAttachments?.[0]?.type, "image");
  assert.equal(calls.sendMessage[0].preparedAttachments?.[0]?.processingStatus, "pending");
  assert.equal(calls.sendMessage[0].preparedAttachments?.[0]?.mimeType, "image/jpeg");
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

test("pipeline de conversa encaminha a autoridade elegível canônica ao guard sem reextraí-la", async () => {
  const { service, calls } = createAssistantServiceDeps({
    assistant: { ragEnabled: true },
    completion: {
      provider: "test-provider",
      model: "test-model",
      answer: "A formatação custa a partir de R$ 1.950,00.",
      durationMs: 1,
    },
    knowledgeRetrievalResult: {
      totalChunksScanned: 4,
      scoredChunkCount: 4,
      scoreThreshold: 0.7,
      scoreThresholdSource: "default",
      filteredOutCount: 0,
      filteredOutScoreRange: null,
      scoredScoreRange: { min: 0.7, max: 0.9 },
      scopedCandidateCount: 4,
      knowledgeScopeNoMatch: false,
      rejectedOutOfScopeChunkCount: 0,
      warning: null,
      results: [
        ...["format-a", "format-b", "format-c"].map((chunkId) => ({
          knowledgeId: "knowledge-format",
          knowledgeTitle: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
          chunkId,
          contentPreview: "A formatação custa a partir de R$ 1.950,00.",
          score: 0.8,
        })),
        {
          knowledgeId: "knowledge-format",
          knowledgeTitle: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
          chunkId: "motherboard",
          contentPreview: "O reparo de placa-mãe custa a partir de R$ 395,00.",
          score: 0.75,
        },
      ],
    },
    outboundConfig: { baseUrl: "" },
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: { source: "manual", message: "Qual o valor para formatar um PC?" },
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

  const assistantMessage = calls.messageCreates.find((message) => message.role === "assistant");
  const runtimeLog = calls.runtimeLogCreates.at(-1);
  const guardTelemetry = runtimeLog.metadata.contextManifest.priceAuthorityGuardTelemetry;

  assert.equal(calls.providerPayloads.length, 1);
  assert.equal(calls.chatwootFetches.length, 0);
  assert.match(assistantMessage?.content ?? "", /formatação custa a partir de R\$ 1\.950,00/i);
  assert.doesNotMatch(assistantMessage?.content ?? "", /não tenho um valor confirmado/i);
  assert.equal(guardTelemetry.eligibleAuthorityCount, 1);
  assert.deepEqual(guardTelemetry.eligibleAuthorities, [
    {
      serviceKey: "formatacao",
      currency: "BRL",
      amount: 1950,
      qualifier: "starting_at",
      evidenceCount: 3,
    },
  ]);
  assert.deepEqual(
    guardTelemetry.claimDecisions.map((decision) => decision.matched),
    [true],
  );
  assert.equal(guardTelemetry.overallDecision, "AUTHORIZED");
});

test("tail preserva a resposta determinística V2 de horário sem reescrita do guardião V1", async () => {
  const deterministicAnswer =
    "Atendemos de segunda a sexta, das 08h às 18h; aos sábados, das 07h30 às 12h; aos domingos estamos fechados.";
  const routedTurns = [];
  const coordinator = {
    beforeOutbound: async () => true,
    afterOutboundUncertain: async () => true,
  };
  const responseGenerationRouter = {
    route: async ({ turn }) => {
      routedTurns.push(turn);
      return {
        executionOwner: "V2_PRIMARY",
        route: "V2_SINGLE_USE",
        turn,
        strategy: "V2_BUSINESS_HOURS_DETERMINISTIC",
        responseText: deterministicAnswer,
        providerCallCount: 0,
        toolCallCount: 0,
        providerMetadata: { provider: null, model: null },
        generationMetadata: null,
        generatedResponse: null,
        outboundAllowed: true,
        generationId: "v2-deterministic-generation",
        approvalFingerprint: "approval-fingerprint",
        allowedCategory: "businessHours",
        allowedAuthority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        sanitizedTelemetry: {
          executionOwner: "V2_PRIMARY",
          route: "V2_SINGLE_USE",
          strategy: "V2_BUSINESS_HOURS_DETERMINISTIC",
          providerCallCount: 0,
          toolCallCount: 0,
          decision: "SINGLE_USE_V2",
          reason: "APPROVAL_CLAIMED",
          deterministicResponderCount: 1,
          responseStrategy: "V2_BUSINESS_HOURS_DETERMINISTIC",
          requestedScheduleScope: "weekly",
          deterministicBranch: "WEEKLY_SUMMARY",
          requestedDay: null,
          scheduleSource: "OFFICIAL_STRUCTURED_SCHEDULE",
          missingScheduleConfiguration: false,
          scheduleValidationIssueCount: 0,
          normalizedScheduleDayCount: 6,
          normalizedScheduleIntervalCount: 6,
          isOpenNow: null,
        },
      };
    },
    getCoordinator: () => coordinator,
  };
  const { service, calls } = createAssistantServiceDeps({
    assistant: {
      timezone: "America/Campo_Grande",
      aiAlwaysAvailable: true,
      weeklySchedule: {
        monday: [{ start: "08:00", end: "18:00" }],
        tuesday: [{ start: "08:00", end: "18:00" }],
        wednesday: [{ start: "08:00", end: "18:00" }],
        thursday: [{ start: "08:00", end: "18:00" }],
        friday: [{ start: "08:00", end: "18:00" }],
        saturday: [{ start: "07:30", end: "12:00" }],
        sunday: [],
      },
      company: { name: "Empresa Teste", timezone: "America/Campo_Grande" },
    },
    conversation: { aiActive: true },
    outboundConfig: { baseUrl: "" },
    responseGenerationRouter,
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: {
      source: "chatwoot",
      externalConversationId: "conversation-1",
      externalAccountId: "account-1",
      externalContactId: "contact-1",
      externalInboxId: "inbox-1",
      message: "Qual o horário de atendimento de vocês?",
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

  const assistantMessage = calls.messageCreates.find((message) => message.role === "assistant");
  const runtimeLog = calls.runtimeLogCreates.at(-1);
  assert.equal(routedTurns.length, 1);
  assert.equal(assistantMessage?.content, deterministicAnswer);
  assert.doesNotMatch(assistantMessage?.content ?? "", /fora do funcionamento oficial/i);
  assert.equal(calls.providerPayloads.length, 0);
  assert.equal(runtimeLog.metadata.responseGenerationRoute, "V2_SINGLE_USE");
  assert.equal(runtimeLog.metadata.responseStrategy, "V2_BUSINESS_HOURS_DETERMINISTIC");
  assert.equal(runtimeLog.metadata.providerCount, 0);
  assert.equal(runtimeLog.metadata.deterministicResponderCount, 1);
  assert.equal(runtimeLog.metadata.deterministicBranch, "WEEKLY_SUMMARY");
  assert.equal(runtimeLog.metadata.v1AuthorityGuardApplied, false);
  assert.equal(runtimeLog.metadata.replacementReason, null);
});

test("sendMessage preserva continuidade além de nove mensagens e mantém transcrição no payload", async () => {
  const priorMessages = [
    {
      id: "history-facts",
      role: "user",
      content:
        "O cliente deseja formatação, aumentar a memória RAM e instalar SSD de 2 TB no Acer Nitro 5.",
      createdAt: new Date("2026-07-13T13:47:11.000Z"),
    },
    {
      id: "history-facts-answer",
      role: "assistant",
      content: "Entendido, vou considerar essas necessidades.",
      createdAt: new Date("2026-07-13T13:47:13.000Z"),
    },
    ...Array.from({ length: 9 }, (_, index) => [
      {
        id: `history-user-${index}`,
        role: "user",
        content:
          index === 3
            ? "Áudio anterior: Transcrição: também confirme a busca em domicílio."
            : `Mensagem anterior do cliente ${index + 1}.`,
        createdAt: new Date(Date.UTC(2026, 6, 13, 13, 48 + index, 0)),
      },
      {
        id: `history-assistant-${index}`,
        role: "assistant",
        content: `Resposta anterior ${index + 1}.`,
        createdAt: new Date(Date.UTC(2026, 6, 13, 13, 48 + index, 1)),
      },
    ]).flat(),
  ];
  const recentMessages = [
    {
      id: "current-user",
      role: "user",
      content: "Quero continuar o atendimento.",
      createdAt: new Date("2026-07-13T13:59:29.000Z"),
      externalPayload: null,
      attachments: [],
      messageType: "incoming",
    },
    ...priorMessages.reverse(),
  ];
  const { service, calls } = createAssistantServiceDeps({
    recentMessages,
    outboundConfig: { baseUrl: "" },
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: {
      source: "chatwoot",
      externalConversationId: "conversation-1",
      externalAccountId: "account-1",
      externalContactId: "contact-1",
      externalInboxId: "inbox-1",
      message: "Quero continuar o atendimento.",
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

  assert.equal(calls.historyQueryTakes[0], 24);
  assert.equal(calls.runtimeLogCreates[0].historyLimit, 24);
  assert.equal(calls.runtimeLogCreates[0].historyMessagesUsed, priorMessages.length);
  assert.equal(calls.runtimeLogCreates[0].metadata.contextManifest.historyWindowLimit, 24);
  assert.equal(
    calls.runtimeLogCreates[0].metadata.contextManifest.historyMessagesSelected,
    priorMessages.length,
  );
  assert.equal(calls.runtimeLogCreates[0].metadata.contextManifest.historyMessagesDropped, 0);
  assert.equal(calls.runtimeLogCreates[0].metadata.contextManifest.audioMessage, false);
  assert.equal(calls.runtimeLogCreates[0].metadata.contextManifest.transcriptionAvailable, false);
  assert.equal(calls.runtimeLogCreates[0].metadata.contextManifest.transcriptionPersisted, false);

  const providerMessages = calls.providerPayloads[0].messages;
  const providerText = providerMessages.map((message) => String(message.content)).join("\n");
  assert.match(providerText, /formatação/);
  assert.match(providerText, /memória RAM/);
  assert.match(providerText, /SSD de 2 TB/);
  assert.match(providerText, /Acer Nitro 5/);
  assert.match(providerText, /Transcrição: também confirme a busca em domicílio/);
  assert.equal(providerMessages.at(-1).role, "user");
  assert.equal(providerMessages.at(-1).content, "Quero continuar o atendimento.");
});

test("triagem recebe fatos anteriores do cliente sem receber respostas antigas, RAG ou ferramentas", async () => {
  const recentMessages = [
    {
      id: "triage-current",
      role: "user",
      content: "Quero formatar, aumentar a memória RAM e instalar SSD de 2 TB.",
      createdAt: new Date("2026-07-13T13:59:29.000Z"),
      externalPayload: null,
      attachments: [],
      messageType: "incoming",
    },
    {
      id: "triage-old-answer",
      role: "assistant",
      content: "Resposta antiga que não deve virar contexto instrutivo.",
      createdAt: new Date("2026-07-13T13:58:00.000Z"),
      externalPayload: null,
      attachments: [],
      messageType: null,
    },
    {
      id: "triage-old-facts",
      role: "user",
      content: "Já informei que o equipamento é um Acer Nitro 5 e que não há defeito.",
      createdAt: new Date("2026-07-13T13:57:00.000Z"),
      externalPayload: null,
      attachments: [],
      messageType: "incoming",
    },
  ];
  const { service, calls } = createAssistantServiceDeps({
    recentMessages,
    promptCompilerService: new PromptCompilerService(),
    outboundConfig: { baseUrl: "" },
    completion: {
      provider: "openai-compatible",
      model: "gpt-4o-mini",
      answer: JSON.stringify({
        message: "Consigo te ajudar com isso. Qual é o modelo do equipamento?",
        action: "ASK_NEXT_DETAIL",
        requestedDetail: "modelo do equipamento",
        suggestScheduling: false,
        triageResolved: false,
      }),
      durationMs: 1,
    },
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: {
      source: "chatwoot",
      externalConversationId: "conversation-1",
      externalAccountId: "account-1",
      externalContactId: "contact-1",
      externalInboxId: "inbox-1",
      message: "Quero formatar, aumentar a memória RAM e instalar SSD de 2 TB.",
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

  const triageRequest = calls.providerPayloads[0];
  const triageText = triageRequest.messages.map((message) => String(message.content)).join("\n");
  assert.deepEqual(triageRequest.response_format, { type: "json_object" });
  assert.deepEqual(triageRequest.tools, []);
  assert.match(triageText, /CONTEXTO ANTERIOR DA CONVERSA/);
  assert.match(triageText, /Acer Nitro 5/);
  assert.doesNotMatch(triageText, /Resposta antiga que não deve virar contexto instrutivo/);
  assert.doesNotMatch(triageText, /BASE DE CONHECIMENTO RELEVANTE/);
  assert.equal(calls.runtimeLogCreates[0].metadata.triageMode, true);
  assert.equal(calls.runtimeLogCreates[0].metadata.contextManifest.triageCustomerMessageCount, 1);
  assert.equal(
    calls.runtimeLogCreates[0].metadata.contextManifest.triageAssistantReferenceCount,
    0,
  );
});

test("encerra triagem técnica e mantém preço como intenção atual", async () => {
  let cachedTriageState = {
    active: true,
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    sourceMessageId: "triage-source",
    requestedDetail: "interface do componente",
    requestedDetailKey: "component_interface",
    lastQuestion: "Qual é a interface do componente?",
    attemptCount: 2,
    resolved: false,
    expiresAt: Date.now() + 3_600_000,
    knownFieldKeys: ["device_model", "ssd_capacity_gb", "ram_capacity_gb"],
    pendingFieldKeys: ["component_interface"],
  };
  const cacheWrites = [];
  const pricingFlow = {
    id: "flow-pricing-configured",
    assistantId: "assistant-1",
    name: "Atendimento Comercial Um",
    priority: 1,
    active: true,
    triggerKeywords: JSON.stringify(["orçamento", "preço"]),
    triggerDescription: "consultar valor oficial do serviço",
    flowInstructions: "instruções do fluxo de preço",
    allowedToolSlugs: JSON.stringify([]),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const { service, calls } = createAssistantServiceDeps({
    assistant: { flows: [pricingFlow] },
    cacheService: {
      get: async () => cachedTriageState,
      set: async (_key, value) => {
        cacheWrites.push(value);
        cachedTriageState = value;
      },
    },
    intentRouterService: new IntentRouterService({
      generateChatCompletion: async () => ({ answer: "fallback" }),
    }),
    promptCompilerService: new PromptCompilerService(),
    outboundConfig: { baseUrl: "" },
    completion: {
      provider: "openai-compatible",
      model: "gpt-4o-mini",
      answer: "Temos disponibilidade para agendar esse atendimento.",
      durationMs: 1,
    },
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: {
      source: "chatwoot",
      externalConversationId: "conversation-1",
      externalAccountId: "account-1",
      externalContactId: "contact-1",
      externalInboxId: "inbox-1",
      externalMessageId: "external-price-after-triage",
      message: "Depois vocês verificam e me passam o orçamento.",
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

  const runtimeLog = calls.runtimeLogCreates.at(-1);
  const manifest = runtimeLog.metadata.contextManifest;
  assert.equal(manifest.selectedFlowId, "flow-pricing-configured");
  assert.equal(manifest.triageExitReason, "CUSTOMER_REQUESTS_TECHNICAL_EVALUATION");
  assert.equal(manifest.requestedDetailBefore, "component_interface");
  assert.equal(manifest.customerUnableToAnswer, true);
  assert.equal(manifest.expectedAuthorityCategory, "price");
  assert.equal(manifest.generatedClaimCategory, "availability");
  assert.equal(manifest.finalSafeResponseCategory, "price");
  assert.equal(manifest.authorityCategorySource, "explicit_intent");
  assert.equal(manifest.triageFlowIncluded, false);
  assert.deepEqual(cacheWrites.at(-1), null);
  assert.equal(calls.providerPayloads.length, 1);
  assert.equal(
    calls.providerPayloads[0].messages.at(-1).content,
    "Depois vocês verificam e me passam o orçamento.",
  );
  assert.match(
    calls.messageCreates.find((message) => message.role === "assistant")?.content ?? "",
    /Não tenho um valor confirmado/,
  );
});

test("pipeline Chatwoot completo preserva saída de triagem e drena o Shadow sem efeitos externos", async () => {
  const shadowLogs = [];
  const shadowPrisma = {
    assistantRuntimeLog: {
      create: async ({ data }) => {
        const id = `shadow-log-${shadowLogs.length + 1}`;
        shadowLogs.push({ ...data, id });
        return { id };
      },
      update: async ({ where, data }) => {
        const index = shadowLogs.findIndex((entry) => entry.id === where.id);
        if (index < 0) throw new Error("RUNTIME_LOG_NOT_FOUND");
        shadowLogs[index] = { ...shadowLogs[index], ...data };
        return { id: "shadow-log-1" };
      },
    },
  };
  const shadowStore = new InMemoryConversationStateStore();
  const shadowOrchestrator = new RuntimeV2ShadowOrchestrator(shadowStore, {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: "assistant-1",
    RUNTIME_V2_SHADOW_CONVERSATION_IDS: "conversation-1",
  });
  const shadowIntegration = new RuntimeV2ShadowIntegrationService(
    shadowPrisma,
    shadowOrchestrator,
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: "assistant-1",
      RUNTIME_V2_SHADOW_CONVERSATION_IDS: "conversation-1",
    },
  );
  const { service, calls } = createAssistantServiceDeps({
    runtimeV2ShadowIntegration: shadowIntegration,
    outboundConfig: { baseUrl: "" },
    cacheService: {
      get: async () => ({
        active: true,
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        sourceMessageId: "triage-source",
        requestedDetail: "interface do componente",
        requestedDetailKey: "component_interface",
        lastQuestion: "Qual é a interface do componente?",
        attemptCount: 1,
        resolved: false,
        expiresAt: Date.now() + 3_600_000,
        knownFieldKeys: ["ssd_capacity_gb", "ram_capacity_gb"],
        pendingFieldKeys: ["component_interface"],
      }),
      set: async () => undefined,
    },
    completion: {
      provider: "openai-compatible",
      model: "gpt-4o-mini",
      answer: "Preciso confirmar a disponibilidade antes de indicar um horário.",
      durationMs: 1,
    },
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: {
      source: "chatwoot",
      externalConversationId: "conversation-1",
      externalAccountId: "account-1",
      externalContactId: "contact-1",
      externalInboxId: "inbox-1",
      externalMessageId: "shadow-e2e-1",
      message: "Não entendo SATA ou NVMe. Vocês podem verificar?",
    },
    user: { id: "user-1", companyId: "company-1", roles: [], permissions: [] },
    tenant: { companyId: "company-1" },
    preparedAttachments: [],
  });
  await shadowIntegration.drain();

  const assistantMessage = calls.messageCreates.find((message) => message.role === "assistant");
  assert.match(assistantMessage?.content ?? "", /avaliação|avaliacao/i);
  assert.doesNotMatch(assistantMessage?.content ?? "", /disponibilidade|horário|horario/i);
  assert.equal(calls.providerPayloads.length, 1);
  assert.equal(shadowLogs.length, 1);
  assert.equal(
    hashCanonicalInboundMessageContent(calls.providerPayloads[0].messages.at(-1).content),
    shadowLogs[0].metadata.currentMessageHash,
  );
  assert.equal(shadowLogs[0].metadata.status, "COMPLETED");
  assert.equal(shadowLogs[0].metadata.providerCalled, false);
  assert.equal(shadowLogs[0].metadata.toolCalls, 0);
  assert.equal(shadowLogs[0].metadata.outboundSent, false);
  assert.equal(shadowLogs[0].metadata.v2TriageSignalReceived, true);
});

test("não repete detalhe técnico recusado no caminho normal do V1", async () => {
  let cacheValue = {
    active: true,
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    sourceMessageId: "triage-source",
    requestedDetail: "interface do componente",
    requestedDetailKey: "component_interface",
    lastQuestion: "Qual é a interface do componente?",
    attemptCount: 1,
    resolved: false,
    expiresAt: Date.now() + 3_600_000,
    knownFieldKeys: ["ssd_capacity_gb", "ram_capacity_gb"],
    pendingFieldKeys: ["component_interface"],
  };
  const { service, calls } = createAssistantServiceDeps({
    cacheService: {
      get: async () => cacheValue,
      set: async (_key, value) => {
        cacheValue = value;
      },
    },
    outboundConfig: { baseUrl: "" },
    completion: {
      provider: "openai-compatible",
      model: "gpt-4o-mini",
      answer: "Você consegue me informar se o SSD é SATA ou NVMe?",
      durationMs: 1,
    },
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: {
      source: "chatwoot",
      externalConversationId: "conversation-1",
      externalAccountId: "account-1",
      externalContactId: "contact-1",
      externalInboxId: "inbox-1",
      externalMessageId: "external-unable-to-answer",
      message: "Não entendo nada disso.",
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

  const assistantMessage = calls.messageCreates.find((message) => message.role === "assistant");
  assert.ok(assistantMessage);
  assert.doesNotMatch(assistantMessage.content, /SATA|NVMe|interface/i);
  assert.match(assistantMessage.content, /avaliação/);
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
