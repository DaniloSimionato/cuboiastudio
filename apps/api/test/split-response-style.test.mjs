import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AssistantsService } from "../dist/assistants/assistants.service.js";
import {
  AssistantConversationsService,
  splitNaturalResponseBlocks,
} from "../dist/assistant-conversations/assistant-conversations.service.js";
import { CreateAssistantDto } from "../dist/assistants/dto/create-assistant.dto.js";
import { UpdateAssistantDto } from "../dist/assistants/dto/update-assistant.dto.js";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";
import { ChatwootWebhookService } from "../dist/chatwoot/chatwoot-webhook.service.js";

function createAuth(companyId) {
  return {
    user: {
      id: `user_${companyId}`,
      email: `${companyId}@example.com`,
      companyId,
      primaryCompanyId: companyId,
      activeCompanyId: companyId,
      memberships: [companyId],
      roles: [],
      permissions: [],
      name: "Test User",
    },
    tenant: {
      companyId,
      plan: "enterprise",
    },
  };
}

async function buildValidatedDto(DtoClass, payload) {
  const dto = plainToInstance(DtoClass, payload, {
    enableImplicitConversion: true,
  });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  assert.equal(
    errors.length,
    0,
    `Validation failed for ${DtoClass.name}: ${JSON.stringify(errors, null, 2)}`,
  );
  return dto;
}

async function expectValidationError(DtoClass, payload, fieldName) {
  const dto = plainToInstance(DtoClass, payload, {
    enableImplicitConversion: true,
  });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  assert.ok(errors.some((error) => error.property === fieldName));
}

async function cleanupAssistantTestData(prisma, companyId) {
  await prisma.assistantRuntimeLog.deleteMany({ where: { companyId } });
  await prisma.assistantConversationSession.deleteMany({ where: { companyId } });
  await prisma.assistantConversationMessage.deleteMany({ where: { companyId } });
  await prisma.assistantConversation.deleteMany({ where: { companyId } });
  await prisma.assistant.deleteMany({ where: { companyId } });
  await prisma.company.deleteMany({ where: { id: companyId } });
}

function createAssistantsService(prisma) {
  return new AssistantsService(
    prisma,
    {
      resolveRuntimeConfig: async () => ({
        runtimeEnabled: true,
        provider: "openai",
        baseUrl: "",
        model: "gpt-4o-mini",
        apiKey: "dummy-key",
        requestTimeoutMs: 10000,
        source: "env-fallback",
        tenantSettingsConfigured: false,
        envFallbackConfigured: true,
        apiKeyConfigured: true,
      }),
      isProviderConfigured: async () => true,
      generateChatCompletion: async () => ({
        answer: "unused",
        toolCalls: [],
      }),
    },
    {},
  );
}

function createConversationsService(prisma, input) {
  const outboundCalls = [];
  const aiCalls = [];
  const service = new AssistantConversationsService(
    prisma,
    {
      resolveRuntimeConfig: async () => ({
        runtimeEnabled: true,
        provider: "openai",
        baseUrl: "",
        model: "gpt-4o-mini",
        apiKey: "dummy-key",
        requestTimeoutMs: 10000,
        source: "env-fallback",
        tenantSettingsConfigured: false,
        envFallbackConfigured: true,
        apiKeyConfigured: true,
      }),
      isProviderConfigured: async () => true,
      generateChatCompletion: async (request) => {
        aiCalls.push(request);
        const answer =
          typeof input.answer === "function" ? input.answer(request, aiCalls.length) : input.answer;
        return {
          answer,
          provider: "openai",
          model: "gpt-4o-mini",
          toolCalls: [],
        };
      },
    },
    {
      buildRuntimeInputText: ({ rawText }) => rawText ?? "",
    },
    {},
    undefined,
    input.knowledgeRetrievalService,
    new PromptCompilerService(),
    input.intentRouterService,
    undefined,
    undefined,
    undefined,
    undefined,
    input.runtimeV2ShadowIntegration,
  );

  service.sendChatwootOutboundText = async (payload) => {
    outboundCalls.push(payload);
    return {
      status: "sent",
      performed: true,
      externalMessageId: `outbound-${payload.assistantMessageId}`,
    };
  };

  return { service, outboundCalls, aiCalls };
}

async function createRuntimeConversation(prisma, input) {
  await prisma.company.create({
    data: {
      id: input.companyId,
      name: `Company ${input.companyId}`,
      timezone: "America/Sao_Paulo",
    },
  });

  const assistant = await prisma.assistant.create({
    data: {
      id: input.assistantId,
      companyId: input.companyId,
      name: "Runtime Assistant",
      splitResponseEnabled: true,
      splitResponseStyle: input.splitResponseStyle,
      model: "gpt-4o-mini",
      temperature: input.temperature ?? null,
      ...(input.behavior ? { behavior: { create: input.behavior } } : {}),
    },
  });

  const conversation = await prisma.assistantConversation.create({
    data: {
      id: input.conversationId,
      companyId: input.companyId,
      assistantId: assistant.id,
      title: "Chatwoot Conversation",
      source: "CHATWOOT",
      channelType: "WHATSAPP",
      externalConversationId: `ext-${input.conversationId}`,
      externalAccountId: `account-${input.companyId}`,
      externalContactId: `contact-${input.companyId}`,
      externalInboxId: `inbox-${input.companyId}`,
    },
  });

  return { assistant, conversation };
}

test("DTOs rejeitam splitResponseStyle inválido", async () => {
  await expectValidationError(
    CreateAssistantDto,
    { name: "Create Invalid", splitResponseStyle: "BROKEN_STYLE" },
    "splitResponseStyle",
  );
  await expectValidationError(
    UpdateAssistantDto,
    { splitResponseStyle: "BROKEN_STYLE" },
    "splitResponseStyle",
  );
});

test("AssistantsService persiste splitResponseStyle, buffer e reset sem zerar em PATCH parcial", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_split_${randomUUID()}`;
  const auth = createAuth(companyId);
  const service = createAssistantsService(prisma);

  try {
    await prisma.company.create({
      data: {
        id: companyId,
        name: "Split Style Company",
        timezone: "America/Sao_Paulo",
      },
    });

    const singleAssistant = await service.create({
      dto: await buildValidatedDto(CreateAssistantDto, {
        name: "Assistant Single",
        splitResponseEnabled: true,
        splitResponseStyle: "SINGLE",
      }),
      ...auth,
    });

    const naturalAssistant = await service.create({
      dto: await buildValidatedDto(CreateAssistantDto, {
        name: "Assistant Natural",
        splitResponseEnabled: true,
        splitResponseStyle: "NATURAL_BLOCKS",
        messageBufferEnabled: false,
        messageBufferSeconds: 11,
        conversationResetEnabled: true,
        conversationResetKeywords: ["reiniciar"],
        conversationResetConfirmationMessage: "Sessão reiniciada.",
        conversationResetPreserveMemories: false,
        conversationResetSendInitialMessage: false,
      }),
      ...auth,
    });

    assert.equal(singleAssistant.splitResponseStyle, "SINGLE");
    assert.equal(naturalAssistant.splitResponseStyle, "NATURAL_BLOCKS");

    const naturalLoaded = await service.findOne({
      id: naturalAssistant.id,
      ...auth,
    });
    assert.equal(naturalLoaded.splitResponseStyle, "NATURAL_BLOCKS");
    assert.equal(naturalLoaded.messageBufferEnabled, false);
    assert.equal(naturalLoaded.messageBufferSeconds, 11);
    assert.equal(naturalLoaded.conversationResetEnabled, true);
    assert.deepEqual(naturalLoaded.conversationResetKeywords, ["reiniciar"]);
    assert.equal(naturalLoaded.conversationResetConfirmationMessage, "Sessão reiniciada.");
    assert.equal(naturalLoaded.conversationResetPreserveMemories, false);
    assert.equal(naturalLoaded.conversationResetSendInitialMessage, false);

    const updatedToNatural = await service.update({
      id: singleAssistant.id,
      dto: await buildValidatedDto(UpdateAssistantDto, {
        splitResponseStyle: "NATURAL_BLOCKS",
      }),
      ...auth,
    });
    assert.equal(updatedToNatural.splitResponseStyle, "NATURAL_BLOCKS");

    const updatedToSingle = await service.update({
      id: naturalAssistant.id,
      dto: await buildValidatedDto(UpdateAssistantDto, {
        splitResponseStyle: "SINGLE",
      }),
      ...auth,
    });
    assert.equal(updatedToSingle.splitResponseStyle, "SINGLE");

    await service.update({
      id: naturalAssistant.id,
      dto: await buildValidatedDto(UpdateAssistantDto, {
        splitResponseStyle: "NATURAL_BLOCKS",
      }),
      ...auth,
    });

    await service.update({
      id: naturalAssistant.id,
      dto: await buildValidatedDto(UpdateAssistantDto, {
        description: "PATCH parcial sem tocar no estilo",
      }),
      ...auth,
    });

    const preserved = await service.findOne({
      id: naturalAssistant.id,
      ...auth,
    });
    assert.equal(preserved.description, "PATCH parcial sem tocar no estilo");
    assert.equal(preserved.splitResponseStyle, "NATURAL_BLOCKS");
    assert.equal(preserved.messageBufferEnabled, false);
    assert.equal(preserved.messageBufferSeconds, 11);
    assert.equal(preserved.conversationResetEnabled, true);
    assert.deepEqual(preserved.conversationResetKeywords, ["reiniciar"]);
    assert.equal(preserved.conversationResetConfirmationMessage, "Sessão reiniciada.");
    assert.equal(preserved.conversationResetPreserveMemories, false);
    assert.equal(preserved.conversationResetSendInitialMessage, false);

    await prisma.assistant.update({
      where: { id: naturalAssistant.id },
      data: { splitResponseStyle: null },
    });

    const legacyAssistant = await service.findOne({
      id: naturalAssistant.id,
      ...auth,
    });
    assert.equal(legacyAssistant.splitResponseStyle, null);
    assert.equal(legacyAssistant.splitResponseStyle ?? "SINGLE", "SINGLE");
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});

test("Runtime SINGLE envia um único outbound com o conteúdo integral", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_runtime_single_${randomUUID()}`;
  const assistantId = `assistant_runtime_single_${randomUUID()}`;
  const conversationId = `conversation_runtime_single_${randomUUID()}`;
  const auth = createAuth(companyId);
  const answer =
    "Primeiro bloco bem longo para garantir que o conteúdo fique completo.\n\nSegundo bloco que não deve ser separado no modo SINGLE.";

  try {
    await createRuntimeConversation(prisma, {
      companyId,
      assistantId,
      conversationId,
      splitResponseStyle: "SINGLE",
    });

    const { service, outboundCalls } = createConversationsService(prisma, { answer });
    const input = {
      assistantId,
      conversationId,
      dto: {
        message: "Preciso de ajuda",
        source: "chatwoot",
        externalMessageId: `incoming-${companyId}`,
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
      },
      ...auth,
    };

    await service.sendMessage(input);
    await service.sendMessage(input);

    assert.equal(outboundCalls.length, 1);
    assert.equal(outboundCalls[0].content, answer);
    const assistantMessage = await prisma.assistantConversationMessage.findFirst({
      where: { conversationId, role: "assistant" },
      select: { id: true, externalMessageId: true },
    });
    assert.equal(assistantMessage?.externalMessageId, `outbound-${assistantMessage?.id}`);
    const runtimeLog = await prisma.assistantRuntimeLog.findFirst({
      where: { conversationId },
      select: { metadata: true },
    });
    assert.equal(runtimeLog?.metadata?.outboundStatus, "sent");
    assert.equal(runtimeLog?.metadata?.externalReferenceStatus, "PERSISTED");
    assert.equal(typeof runtimeLog?.metadata?.externalMessageReferenceFingerprint, "string");
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});

test("Runtime não reenvia quando a persistência da referência externa falha", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_runtime_reference_persistence_failure_${randomUUID()}`;
  const assistantId = `assistant_runtime_reference_persistence_failure_${randomUUID()}`;
  const conversationId = `conversation_runtime_reference_persistence_failure_${randomUUID()}`;
  const auth = createAuth(companyId);

  try {
    await createRuntimeConversation(prisma, {
      companyId,
      assistantId,
      conversationId,
      splitResponseStyle: "SINGLE",
    });

    const { service, outboundCalls } = createConversationsService(prisma, {
      answer: "Resposta com referência externa.",
    });
    const updateAssistantMessage = prisma.assistantConversationMessage.update.bind(
      prisma.assistantConversationMessage,
    );
    prisma.assistantConversationMessage.update = async (args) => {
      if (args.data?.externalMessageId) {
        throw new Error("external reference persistence failed");
      }
      return updateAssistantMessage(args);
    };

    await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "Preciso de ajuda",
        source: "chatwoot",
        externalMessageId: `incoming-${companyId}`,
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
      },
      ...auth,
    });

    assert.equal(outboundCalls.length, 1);
    const assistantMessage = await prisma.assistantConversationMessage.findFirst({
      where: { conversationId, role: "assistant" },
      select: { externalMessageId: true },
    });
    assert.equal(assistantMessage?.externalMessageId, null);
    const runtimeLog = await prisma.assistantRuntimeLog.findFirst({
      where: { conversationId },
      select: { metadata: true },
    });
    assert.equal(runtimeLog?.metadata?.outboundStatus, "sent");
    assert.equal(runtimeLog?.metadata?.externalReferenceStatus, "PERSISTENCE_FAILED");
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});

test("Runtime confirmado sem referência externa não duplica outbound", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_runtime_missing_ref_${randomUUID()}`;
  const assistantId = `assistant_runtime_missing_ref_${randomUUID()}`;
  const conversationId = `conversation_runtime_missing_ref_${randomUUID()}`;
  const auth = createAuth(companyId);

  try {
    await createRuntimeConversation(prisma, {
      companyId,
      assistantId,
      conversationId,
      splitResponseStyle: "SINGLE",
    });

    const { service, outboundCalls } = createConversationsService(prisma, {
      answer: "Resposta confirmada sem referência externa.",
    });
    service.sendChatwootOutboundText = async (payload) => {
      outboundCalls.push(payload);
      return { status: "sent", performed: true, externalMessageId: null };
    };

    await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "Preciso de ajuda",
        source: "chatwoot",
        externalMessageId: `incoming-${companyId}`,
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
      },
      ...auth,
    });

    assert.equal(outboundCalls.length, 1);
    const messages = await prisma.assistantConversationMessage.findMany({
      where: { conversationId },
      select: { role: true, externalMessageId: true },
    });
    assert.equal(messages.filter((message) => message.role === "assistant").length, 1);
    assert.equal(messages.find((message) => message.role === "assistant")?.externalMessageId, null);
    assert.equal(
      messages.find((message) => message.role === "user")?.externalMessageId,
      `incoming-${companyId}`,
    );
    const runtimeLog = await prisma.assistantRuntimeLog.findFirst({
      where: { conversationId },
      select: { metadata: true },
    });
    assert.equal(runtimeLog?.metadata?.outboundStatus, "sent");
    assert.equal(runtimeLog?.metadata?.externalReferenceStatus, "MISSING");
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});

test("Runtime NATURAL_BLOCKS divide respostas longas sem blocos vazios nem URLs quebradas", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_runtime_blocks_${randomUUID()}`;
  const assistantId = `assistant_runtime_blocks_${randomUUID()}`;
  const conversationId = `conversation_runtime_blocks_${randomUUID()}`;
  const auth = createAuth(companyId);
  const blockOne =
    "Primeiro bloco com bastante conteúdo para passar do limite mínimo e manter a divisão natural.";
  const blockTwo =
    "Segundo bloco com mais detalhes e uma URL intacta: https://example.com/rota/importante";
  const answer = `${blockOne}\n\n${blockTwo}`;

  try {
    await createRuntimeConversation(prisma, {
      companyId,
      assistantId,
      conversationId,
      splitResponseStyle: "NATURAL_BLOCKS",
    });

    const { service, outboundCalls, aiCalls } = createConversationsService(prisma, { answer });
    await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "Me explique em partes",
        source: "chatwoot",
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
      },
      ...auth,
    });

    assert.equal(outboundCalls.length, 2);
    assert.deepEqual(
      outboundCalls.map((call) => call.content),
      [blockOne, blockTwo],
    );
    assert.ok(outboundCalls.every((call) => call.content.trim().length > 0));
    assert.equal(outboundCalls.map((call) => call.content).join("\n\n"), answer);
    assert.ok(
      outboundCalls.some((call) => call.content.includes("https://example.com/rota/importante")),
    );
    const normalSystemText = aiCalls[0].messages
      .filter((message) => message.role === "system")
      .map((message) => String(message.content))
      .join("\n");
    assert.match(normalSystemText, /POLÍTICA DE CONVERSA/);
    assert.match(normalSystemText, /Blocos Naturais/);
    assert.doesNotMatch(normalSystemText, /FORMATO DE SAÍDA OBRIGATÓRIO \(JSON\)/);
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});

test("Runtime NATURAL_BLOCKS mantém resposta curta em um único outbound", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_runtime_short_${randomUUID()}`;
  const assistantId = `assistant_runtime_short_${randomUUID()}`;
  const conversationId = `conversation_runtime_short_${randomUUID()}`;
  const auth = createAuth(companyId);

  try {
    await createRuntimeConversation(prisma, {
      companyId,
      assistantId,
      conversationId,
      splitResponseStyle: "NATURAL_BLOCKS",
    });

    const { service, outboundCalls } = createConversationsService(prisma, {
      answer: "Resposta curta.",
    });
    await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "Resumo",
        source: "chatwoot",
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
      },
      ...auth,
    });

    assert.equal(outboundCalls.length, 1);
    assert.equal(outboundCalls[0].content, "Resposta curta.");
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});

test("NATURAL_BLOCKS mantém catálogo gerado pelo provider em um único outbound", () => {
  const catalog =
    "**Serviços disponíveis**:\n\n• Formatação do computador: realizamos o serviço.\n\n• Instalação de SSD: verificamos a compatibilidade.";

  assert.deepEqual(splitNaturalResponseBlocks(catalog), [catalog]);
});

test("Caminho Chatwoot usa buffer, behavior, RAG factual e política conversacional", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_chatwoot_policy_${randomUUID()}`;
  const assistantId = `assistant_chatwoot_policy_${randomUUID()}`;
  const conversationId = `conversation_chatwoot_policy_${randomUUID()}`;
  const flowId = `flow_chatwoot_policy_${randomUUID()}`;
  const auth = createAuth(companyId);
  const answer =
    "Fazemos sim 😊 Me passa o modelo do computador? Aí já verifico o que é compatível.";
  const ragCalls = [];
  const shadowSnapshots = [];

  try {
    await createRuntimeConversation(prisma, {
      companyId,
      assistantId,
      conversationId,
      splitResponseStyle: "NATURAL_BLOCKS",
      temperature: 0.6,
      behavior: {
        personality: "Próxima e objetiva",
        toneOfVoice: "Amigável",
        responseStyle: "whatsapp",
        emojiUsage: "low",
        noInventInfo: true,
        unknownBehavior: "fallback",
        maxBlockLength: 300,
        howItActs:
          "Identifica o equipamento, consulta serviços, preços e prazos, coleta todas as informações necessárias e orienta cada opção.",
      },
    });
    await prisma.assistant.update({
      where: { id: assistantId },
      data: {
        messageBufferEnabled: true,
        messageBufferSeconds: 1,
        ragEnabled: true,
        aiAlwaysAvailable: true,
      },
    });
    await prisma.assistantFlow.create({
      data: {
        id: flowId,
        assistantId,
        name: "Fluxo com escopo amplo",
        priority: 100,
        flowInstructions:
          "Explique cada serviço, colete todos os dados necessários e apresente todas as opções disponíveis.",
        active: true,
      },
    });

    const {
      service: conversationsService,
      outboundCalls,
      aiCalls,
    } = createConversationsService(prisma, {
      answer,
      knowledgeRetrievalService: {
        searchRelevantKnowledge: async ({ topK }) => {
          ragCalls.push({ topK });
          const results = [
            {
              knowledgeId: "knowledge-1",
              knowledgeTitle: "Serviços de computador",
              chunkId: "chunk-format",
              contentPreview: "Formatação do computador: serviço disponível.",
            },
            {
              knowledgeId: "knowledge-1",
              knowledgeTitle: "Serviços de computador",
              chunkId: "chunk-memory",
              contentPreview: "Aumento de memória RAM: verificar compatibilidade.",
            },
            {
              knowledgeId: "knowledge-1",
              knowledgeTitle: "Serviços de computador",
              chunkId: "chunk-ssd",
              contentPreview: "Instalação de SSD: verificar modelo e capacidade.",
            },
          ].slice(0, topK);
          return {
            totalChunksScanned: 3,
            warning: null,
            results,
            scoreThreshold: 0.7,
              scoreThresholdSource: "default",
              filteredOutCount: 0,
              scoredChunkCount: 3,
            };
        },
      },
      runtimeV2ShadowIntegration: {
        dispatch: (snapshot) => {
          shadowSnapshots.push(snapshot);
          return {
            status: "ACCEPTED",
            generationStatus: "GENERATION_PENDING",
            v1WaitReleased: true,
            dispatchLatencyMs: 0,
          };
        },
      },
      intentRouterService: {
        route: async () => ({
          flowId,
          flowName: "Fluxo com escopo amplo",
          confidence: 1,
          reason: "fixture",
        }),
      },
    });

    const webhookConfig = {
      id: "config-chatwoot-policy",
      companyId,
      assistantId,
      assistantName: "Runtime Assistant",
      assistantStatus: "ACTIVE",
      name: "WhatsApp",
      baseUrl: "https://chatwoot.example.com",
      accountId: `account-${companyId}`,
      inboxId: `inbox-${companyId}`,
      isActive: true,
      apiAccessTokenConfigured: false,
      webhookSecretConfigured: false,
      apiAccessToken: null,
      webhookSecret: null,
    };
    const webhookPrisma = {
      assistant: {
        findFirst: async ({ select }) =>
          select?.messageBufferEnabled
            ? { messageBufferEnabled: true, messageBufferSeconds: 1 }
            : { id: assistantId },
      },
      assistantConversationMessage: {
        findFirst: async () => null,
      },
    };
    const inboxService = {
      recordWebhookReceived: async () => ({
        configId: webhookConfig.id,
        diagnosticId: "diagnostic",
      }),
      completeWebhookDiagnostic: async () => undefined,
      recordResponseSent: async () => undefined,
      resolveActiveByWebhook: async () => webhookConfig,
      isWebhookSecureModeAllowed: async () => true,
    };
    const attachmentDownloader = {
      downloadAttachment: async () => {
        throw new Error("No attachment expected in this fixture");
      },
    };
    const webhookService = new ChatwootWebhookService(
      webhookPrisma,
      inboxService,
      attachmentDownloader,
      conversationsService,
    );

    const messages = [
      "Oi bom dia",
      "Quero formatar",
      "Pode me ajudar",
      "Qual o prazo?",
      "Obrigado",
    ];
    for (const [index, content] of messages.entries()) {
      await webhookService.processMessageCreated({
        payload: {
          event: "message_created",
          account: { id: `account-${companyId}` },
          inbox: { id: `inbox-${companyId}` },
          conversation: { id: `ext-${conversationId}`, meta: { title: "Conversa" } },
          message: {
            id: `chatwoot-message-${index}`,
            content,
            sender_type: "contact",
            message_type: "incoming",
            sender: {
              id: `contact-${companyId}`,
              name: "Contato",
              phone_number: "+5500000000000",
              type: "contact",
            },
            attachments: [],
          },
          contact: {
            id: `contact-${companyId}`,
            name: "Contato",
            phone_number: "+5500000000000",
          },
        },
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1250));

    assert.equal(aiCalls.length, 1);
    assert.equal(aiCalls[0].temperature, 0.6);
    assert.deepEqual(ragCalls, [{ topK: 5 }]);
    assert.ok(shadowSnapshots.length > 0);
    const ragSnapshot = shadowSnapshots.find(
      (snapshot) => snapshot.ragObservation?.retrievalExecuted,
    );
    assert.ok(ragSnapshot);
    assert.equal(ragSnapshot.ragObservation.retrievalSource, "V1_PIPELINE");
    assert.equal(ragSnapshot.ragObservation.threshold, 0.7);
    assert.equal(ragSnapshot.ragObservation.items.length, 3);
    assert.equal("contentPreview" in ragSnapshot.ragObservation.items[0], false);
    assert.equal("embedding" in ragSnapshot.ragObservation.items[0], false);
    const systemText = aiCalls[0].messages
      .filter((message) => message.role === "system")
      .map((message) => String(message.content))
      .join("\n");
    assert.match(systemText, /POLÍTICA DE CONVERSA/);
    assert.match(systemText, /responda progressivamente/i);
    assert.match(systemText, /uma pergunta principal por vez/i);
    assert.match(systemText, /não monte um catálogo/i);
    assert.match(systemText, /ESCOPO OPERACIONAL/);
    assert.match(systemText, /não é um roteiro de resposta/i);
    assert.match(systemText, /não copie títulos/i);
    assert.match(systemText, /BASE DE CONHECIMENTO RELEVANTE/);
    assert.match(systemText, /Formatação do computador/);
    assert.match(systemText, /Instalação de SSD: verificar modelo/i);
    assert.ok(
      aiCalls[0].messages.some(
        (message) => message.role === "user" && String(message.content).includes("Quero formatar"),
      ),
    );
    assert.equal(outboundCalls.length, 1);
    assert.equal(outboundCalls[0].content, answer);

    const runtimeLog = await prisma.assistantRuntimeLog.findFirst({
      where: { assistantId },
      orderBy: { createdAt: "desc" },
      select: { metadata: true, knowledgeCount: true, provider: true, model: true },
    });
    assert.equal(runtimeLog.knowledgeCount, 3);
    assert.equal(runtimeLog.provider, "openai");
    assert.equal(runtimeLog.model, "gpt-4o-mini");
    assert.equal(runtimeLog.metadata.promptVersion, "conversation-policy-v4");
    assert.match(runtimeLog.metadata.promptHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(runtimeLog.metadata.knowledgeChunkIds, [
      "chunk-format",
      "chunk-memory",
      "chunk-ssd",
    ]);
    assert.equal(runtimeLog.metadata.temperatureParameterApplied, true);
    assert.equal(runtimeLog.metadata.triageMode, false);
    assert.equal(runtimeLog.metadata.knowledgeLimit, 5);
    assert.equal(runtimeLog.metadata.contextManifest.initialMessageIncluded, false);
    assert.equal(runtimeLog.metadata.contextManifest.fallbackIncluded, false);
    assert.equal(runtimeLog.metadata.contextManifest.persistenceStatus, "persisted");
    assert.equal(runtimeLog.metadata.contextManifest.ragEnabled, true);
    assert.ok(runtimeLog.metadata.contextManifest.promptSections.length > 0);
    assert.doesNotMatch(
      JSON.stringify(runtimeLog.metadata.contextManifest),
      /Quero formatar|Formatação do computador: serviço disponível|Fazemos sim/,
    );
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});

test("Triagem usa JSON mínimo e não inclui política normal de split", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_runtime_bad_catalog_${randomUUID()}`;
  const assistantId = `assistant_runtime_bad_catalog_${randomUUID()}`;
  const conversationId = `conversation_runtime_bad_catalog_${randomUUID()}`;
  const auth = createAuth(companyId);
  const triageAnswer = JSON.stringify({
    message: "Consigo te ajudar com isso. Qual é o modelo do equipamento?",
    action: "ASK_NEXT_DETAIL",
    requestedDetail: "modelo do equipamento",
    suggestScheduling: false,
    triageResolved: false,
  });

  try {
    await createRuntimeConversation(prisma, {
      companyId,
      assistantId,
      conversationId,
      splitResponseStyle: "NATURAL_BLOCKS",
      temperature: 0.6,
      behavior: {
        personality: "Próxima e objetiva",
        toneOfVoice: "Amigável",
        responseStyle: "whatsapp",
        emojiUsage: "low",
        noInventInfo: true,
        unknownBehavior: "fallback",
        maxBlockLength: 300,
        howItActs: "Coleta informações e orienta sobre todas as opções disponíveis.",
      },
    });

    const { service, outboundCalls, aiCalls } = createConversationsService(prisma, {
      answer: triageAnswer,
    });
    await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "Oi bom dia\nQueria formatar meu pc\nPor um ssd\nMais memoria\nComo podemos fazer",
        source: "chatwoot",
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
      },
      ...auth,
    });

    assert.equal(aiCalls.length, 1);
    assert.deepEqual(aiCalls[0].response_format, { type: "json_object" });
    const systemText = aiCalls[0].messages
      .filter((message) => message.role === "system")
      .map((message) => String(message.content))
      .join("\n");
    assert.match(systemText, /FORMATO DE SAÍDA OBRIGATÓRIO \(JSON\)/);
    assert.doesNotMatch(systemText, /POLÍTICA DE CONVERSA/);
    assert.doesNotMatch(systemText, /DECISÃO DE TRIAGEM OBRIGATÓRIA/);
    assert.doesNotMatch(systemText, /BASE DE CONHECIMENTO RELEVANTE/);
    assert.equal(outboundCalls.length, 1);
    assert.equal(
      outboundCalls[0].content,
      "Consigo te ajudar com isso. Qual é o modelo do equipamento?",
    );
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});

test("Triagem faz retry controlado após JSON inválido e não cai no prompt normal", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_runtime_triage_retry_${randomUUID()}`;
  const assistantId = `assistant_runtime_triage_retry_${randomUUID()}`;
  const conversationId = `conversation_runtime_triage_retry_${randomUUID()}`;
  const auth = createAuth(companyId);
  const validTriageAnswer = JSON.stringify({
    message: "Consigo te ajudar. Qual é o modelo do equipamento?",
    action: "ASK_NEXT_DETAIL",
    requestedDetail: "modelo do equipamento",
    suggestScheduling: false,
    triageResolved: false,
  });

  try {
    await createRuntimeConversation(prisma, {
      companyId,
      assistantId,
      conversationId,
      splitResponseStyle: "NATURAL_BLOCKS",
    });

    const { service, outboundCalls, aiCalls } = createConversationsService(prisma, {
      answer: (_request, attempt) => (attempt === 1 ? "texto normal inválido" : validTriageAnswer),
    });
    await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "Quero formatar o computador e instalar um SSD",
        source: "chatwoot",
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
      },
      ...auth,
    });

    assert.equal(aiCalls.length, 2);
    assert.ok(aiCalls.every((call) => call.response_format?.type === "json_object"));
    assert.ok(
      aiCalls.every((call) =>
        call.messages.every(
          (message) =>
            !String(message.content).startsWith("POLÍTICA DE CONVERSA") &&
            !String(message.content).startsWith("DECISÃO DE TRIAGEM"),
        ),
      ),
    );
    assert.equal(outboundCalls.length, 1);
    assert.equal(outboundCalls[0].content, "Consigo te ajudar. Qual é o modelo do equipamento?");
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});

test("Runtime usa o behavior persistido no prompt e envia temperature zero ao provider", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_runtime_behavior_${randomUUID()}`;
  const assistantId = `assistant_runtime_behavior_${randomUUID()}`;
  const conversationId = `conversation_runtime_behavior_${randomUUID()}`;
  const auth = createAuth(companyId);

  try {
    await createRuntimeConversation(prisma, {
      companyId,
      assistantId,
      conversationId,
      splitResponseStyle: "SINGLE",
      temperature: 0,
      behavior: {
        personality: "Objetiva",
        toneOfVoice: "Natural",
        responseStyle: "whatsapp",
        showAttendantName: true,
        noInventInfo: true,
        emojiUsage: "low",
        unknownBehavior: "fallback",
      },
    });

    const { service, aiCalls } = createConversationsService(prisma, {
      answer: "Resposta natural.",
    });
    await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "Quero uma resposta",
        source: "chatwoot",
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
      },
      ...auth,
    });

    assert.equal(aiCalls.length, 1);
    assert.equal(aiCalls[0].temperature, 0);
    const behaviorPrompt = aiCalls[0].messages.find(
      (message) =>
        message.role === "system" && String(message.content).startsWith("POLÍTICA DE CONVERSA"),
    );
    assert.ok(behaviorPrompt);
    assert.match(String(behaviorPrompt.content), /Objetiva/);
    assert.match(String(behaviorPrompt.content), /uma pergunta principal por vez/);

    const runtimeLog = await prisma.assistantRuntimeLog.findFirst({
      where: { assistantId },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    const manifest = runtimeLog.metadata.contextManifest;
    assert.equal(manifest.initialMessageIncluded, false);
    assert.equal(manifest.fallbackIncluded, false);
    assert.equal(manifest.persistenceStatus, "persisted");
    assert.equal(manifest.ragEnabled, false);
    assert.equal(manifest.ragItemCount, 0);
    assert.ok(Array.isArray(manifest.promptSections));
    assert.doesNotMatch(JSON.stringify(manifest), /Quero uma resposta|Resposta natural/);
  } finally {
    await cleanupAssistantTestData(prisma, companyId);
    await prisma.$disconnect();
  }
});
