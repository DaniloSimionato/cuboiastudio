import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";

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
      name: "Reset User",
    },
    tenant: {
      companyId,
      plan: "enterprise",
    },
  };
}

async function cleanupResetTestData(prisma, companyIds) {
  await prisma.assistantRuntimeLog.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.assistantConversationSession.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.assistantConversationMessage.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.assistantConversation.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.contactMemoryItem.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.contactMemoryProfile.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.assistant.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
}

function createResetService(prisma, input) {
  const outboundCalls = [];
  const aiCalls = [];
  const extractionCalls = [];

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
        return {
          answer: input.answer ?? "Resposta padrão do LLM",
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
    undefined,
    undefined,
    undefined,
    undefined,
    {
      findOrCreateProfile: async () => input.profile,
      getActiveMemories: async () => [],
      getActiveMemoriesMap: async () => ({}),
    },
    {
      extractMemories: async (payload) => {
        extractionCalls.push(payload);
        return { extracted: [{ key: "memory", value: "ok" }] };
      },
      buildMemoryContextBlock: () => "",
      selectHybridMemoriesForPrompt: () => [],
    },
  );

  service.sendChatwootOutboundText = async (payload) => {
    outboundCalls.push(payload);
    return { status: "sent", performed: true, externalMessageId: null };
  };

  return { service, outboundCalls, aiCalls, extractionCalls };
}

async function createResetFixture(prisma, input) {
  await prisma.company.create({
    data: {
      id: input.companyId,
      name: `Company ${input.companyId}`,
      timezone: "America/Sao_Paulo",
    },
  });

  if (input.otherCompanyId) {
    await prisma.company.create({
      data: {
        id: input.otherCompanyId,
        name: `Company ${input.otherCompanyId}`,
        timezone: "America/Sao_Paulo",
      },
    });
  }

  await prisma.assistant.create({
    data: {
      id: input.assistantId,
      companyId: input.companyId,
      name: "Reset Assistant",
      conversationResetEnabled: true,
      conversationResetKeywords: ["reset", "reiniciar"],
      conversationResetConfirmationMessage: "🔄 Atendimento reiniciado com sucesso.",
      conversationResetPreserveMemories: input.preserveMemories,
      conversationResetSendInitialMessage: true,
      initialMessage: "Olá! Como posso te ajudar hoje?",
      memoryEnabled: true,
      memoryExtractionEnabled: true,
      memoryTempDefaultDays: 7,
      memorySharedAcrossAssistants: input.sharedAcrossAssistants,
      model: "gpt-4o-mini",
    },
  });

  if (input.otherAssistantId) {
    await prisma.assistant.create({
      data: {
        id: input.otherAssistantId,
        companyId: input.companyId,
        name: "Other Assistant",
        memoryEnabled: true,
        memorySharedAcrossAssistants: false,
        model: "gpt-4o-mini",
      },
    });
  }

  if (input.otherCompanyId) {
    await prisma.assistant.create({
      data: {
        id: `${input.otherCompanyId}_assistant`,
        companyId: input.otherCompanyId,
        name: "Other Company Assistant",
        memoryEnabled: true,
        model: "gpt-4o-mini",
      },
    });
  }

  await prisma.assistantConversation.create({
    data: {
      id: input.conversationId,
      companyId: input.companyId,
      assistantId: input.assistantId,
      title: "Reset Conversation",
      source: "CHATWOOT",
      channelType: "WHATSAPP",
      externalConversationId: `ext-${input.conversationId}`,
      externalAccountId: `account-${input.companyId}`,
      externalContactId: `contact-${input.companyId}`,
      externalInboxId: `inbox-${input.companyId}`,
      currentContextVersion: 1,
    },
  });

  await prisma.assistantConversationSession.create({
    data: {
      companyId: input.companyId,
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      contextVersion: 1,
      status: "ACTIVE",
    },
  });

  const profile = await prisma.contactMemoryProfile.create({
    data: {
      id: input.profileId,
      companyId: input.companyId,
      assistantId: input.sharedAcrossAssistants ? null : input.assistantId,
      identityKey: `scope:test|phone:${input.profilePhone}`,
      displayName: "Reset User",
      externalContactId: `contact-${input.companyId}`,
      externalAccountId: `account-${input.companyId}`,
      phoneNormalized: input.profilePhone,
    },
  });

  if (input.otherProfileId) {
    await prisma.contactMemoryProfile.create({
      data: {
        id: input.otherProfileId,
        companyId: input.companyId,
        assistantId: input.otherAssistantId ?? null,
        identityKey: `scope:test|phone:${input.profilePhone}-other`,
        displayName: "Other Reset User",
        externalContactId: `contact-other-${input.companyId}`,
        externalAccountId: `account-${input.companyId}`,
        phoneNormalized: `${input.profilePhone}1`,
      },
    });
  }

  if (input.otherCompanyId) {
    await prisma.contactMemoryProfile.create({
      data: {
        id: `${input.otherCompanyId}_profile`,
        companyId: input.otherCompanyId,
        identityKey: `scope:test|phone:${input.profilePhone}-foreign`,
        displayName: "Foreign User",
        externalContactId: `contact-${input.otherCompanyId}`,
        externalAccountId: `account-${input.otherCompanyId}`,
        phoneNormalized: `${input.profilePhone}2`,
      },
    });
  }

  return { profile };
}

test("Integration: Session Reset preserva memória durável, limpa só contexto temporário da conversa e abre novo contexto", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_reset_${randomUUID()}`;
  const otherCompanyId = `company_reset_other_${randomUUID()}`;
  const assistantId = `assistant_reset_${randomUUID()}`;
  const otherAssistantId = `assistant_reset_other_${randomUUID()}`;
  const conversationId = `conversation_reset_${randomUUID()}`;
  const profileId = `profile_reset_${randomUUID()}`;
  const otherProfileId = `profile_reset_other_${randomUUID()}`;
  const profilePhone = "5567999990000";
  const auth = createAuth(companyId);

  try {
    const { profile } = await createResetFixture(prisma, {
      companyId,
      otherCompanyId,
      assistantId,
      otherAssistantId,
      conversationId,
      profileId,
      otherProfileId,
      profilePhone,
      preserveMemories: true,
      sharedAcrossAssistants: false,
    });

    await prisma.assistantConversationMessage.createMany({
      data: [
        {
          companyId,
          assistantId,
          conversationId,
          role: "user",
          content: "Mensagem antiga da sessão anterior",
          contextVersion: 1,
          source: "tests",
        },
        {
          companyId,
          assistantId,
          conversationId,
          role: "assistant",
          content: "Resposta antiga que não pode voltar ao prompt",
          contextVersion: 1,
          source: "tests",
        },
      ],
    });

    const expiringDurable = await prisma.contactMemoryItem.create({
      data: {
        companyId,
        profileId,
        category: "PREFERENCE",
        key: "preferred_channel",
        value: "whatsapp",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      },
    });

    await prisma.contactMemoryItem.create({
      data: {
        companyId,
        profileId,
        category: "IDENTITY",
        key: "name",
        value: "Reset User",
      },
    });

    await prisma.contactMemoryItem.create({
      data: {
        companyId,
        profileId,
        category: "TEMPORARY_CONTEXT",
        key: "current_topic",
        value: "Assunto da sessão atual",
        sourceConversationId: conversationId,
      },
    });

    const preservedDifferentConversation = await prisma.contactMemoryItem.create({
      data: {
        companyId,
        profileId,
        category: "TEMPORARY_CONTEXT",
        key: "parallel_topic",
        value: "Outra conversa",
        sourceConversationId: "conversation_other_scope",
      },
    });

    const otherProfileMemory = await prisma.contactMemoryItem.create({
      data: {
        companyId,
        profileId: otherProfileId,
        category: "TEMPORARY_CONTEXT",
        key: "other_profile_topic",
        value: "Outro perfil",
        sourceConversationId: conversationId,
      },
    });

    const foreignCompanyMemory = await prisma.contactMemoryItem.create({
      data: {
        companyId: otherCompanyId,
        profileId: `${otherCompanyId}_profile`,
        category: "TEMPORARY_CONTEXT",
        key: "foreign_topic",
        value: "Outra empresa",
        sourceConversationId: conversationId,
      },
    });

    const { service, outboundCalls, aiCalls, extractionCalls } = createResetService(prisma, {
      profile,
      answer: "Nova resposta no contexto reiniciado",
    });

    const resetResult = await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "reset",
        source: "chatwoot",
        messageType: "text",
        externalMessageId: "msg-ext-reset",
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
        externalSenderPhone: profilePhone,
        externalSenderName: "Reset User",
      },
      ...auth,
    });

    assert.equal(resetResult.runtime.reason, "conversation-reset-executed");
    assert.equal(resetResult.userMessage.mode, "reset-request");
    assert.equal(resetResult.userMessage.contextVersion, 1);
    assert.equal(resetResult.assistantMessage.mode, "reset-reply");
    assert.equal(resetResult.assistantMessage.contextVersion, 2);
    assert.equal(outboundCalls.length, 1);
    assert.equal(outboundCalls[0].content, resetResult.assistantMessage.content);
    assert.ok(resetResult.assistantMessage.content.includes("🔄 Atendimento reiniciado com sucesso."));
    assert.ok(resetResult.assistantMessage.content.includes("Olá! Como posso te ajudar hoje?"));
    assert.equal(extractionCalls.length, 1);

    const duplicateReset = await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "reset",
        source: "chatwoot",
        messageType: "text",
        externalMessageId: "msg-ext-reset",
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
        externalSenderPhone: profilePhone,
        externalSenderName: "Reset User",
      },
      ...auth,
    });

    assert.equal(duplicateReset.runtime.reason, "conversation-reset-executed-duplicate");
    assert.equal(duplicateReset.userMessage.id, resetResult.userMessage.id);
    assert.equal(duplicateReset.assistantMessage.id, resetResult.assistantMessage.id);
    assert.equal(outboundCalls.length, 1);

    const dbConversation = await prisma.assistantConversation.findUnique({
      where: { id: conversationId },
    });
    assert.equal(dbConversation.currentContextVersion, 2);

    const sessions = await prisma.assistantConversationSession.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "asc" }, { contextVersion: "asc" }],
    });
    assert.equal(sessions.length, 3);
    assert.equal(sessions[0].status, "ACTIVE");
    assert.equal(sessions[1].status, "RESET");
    assert.equal(sessions[1].contextVersion, 1);
    assert.equal(sessions[1].endedAt !== null, true);
    assert.equal(sessions[2].status, "ACTIVE");
    assert.equal(sessions[2].contextVersion, 2);

    const remainingMemories = await prisma.contactMemoryItem.findMany({
      where: { companyId, profileId },
      orderBy: { key: "asc" },
    });
    assert.deepEqual(
      remainingMemories.map((item) => item.key),
      ["name", "parallel_topic", "preferred_channel"],
    );
    assert.ok(remainingMemories.some((item) => item.id === expiringDurable.id));
    assert.ok(remainingMemories.some((item) => item.id === preservedDifferentConversation.id));

    const stillOtherProfile = await prisma.contactMemoryItem.findUnique({
      where: { id: otherProfileMemory.id },
    });
    const stillOtherCompany = await prisma.contactMemoryItem.findUnique({
      where: { id: foreignCompanyMemory.id },
    });
    assert.ok(stillOtherProfile);
    assert.ok(stillOtherCompany);

    const postResetResult = await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "Continuar do zero",
        source: "tests",
        messageType: "text",
        externalSenderPhone: profilePhone,
        externalSenderName: "Reset User",
      },
      ...auth,
    });

    assert.equal(postResetResult.runtime.outcome, "success");
    assert.equal(aiCalls.length, 1);
    const promptText = aiCalls[0].messages
      .map((message) => (typeof message.content === "string" ? message.content : ""))
      .join("\n");
    assert.ok(promptText.includes("Continuar do zero"));
    assert.ok(promptText.includes("🔄 Atendimento reiniciado com sucesso."));
    assert.ok(!promptText.includes("Mensagem antiga da sessão anterior"));
    assert.ok(!promptText.includes("Resposta antiga que não pode voltar ao prompt"));
  } finally {
    await cleanupResetTestData(prisma, [companyId, otherCompanyId]);
    await prisma.$disconnect();
  }
});

test("Session Reset com preserveMemories=false não extrai novas memórias e não apaga memórias permanentes", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_reset_preserve_false_${randomUUID()}`;
  const assistantId = `assistant_reset_preserve_false_${randomUUID()}`;
  const conversationId = `conversation_reset_preserve_false_${randomUUID()}`;
  const profileId = `profile_reset_preserve_false_${randomUUID()}`;
  const profilePhone = "5567999991234";
  const auth = createAuth(companyId);

  try {
    const { profile } = await createResetFixture(prisma, {
      companyId,
      assistantId,
      conversationId,
      profileId,
      profilePhone,
      preserveMemories: false,
      sharedAcrossAssistants: true,
    });

    await prisma.assistantConversationMessage.create({
      data: {
        companyId,
        assistantId,
        conversationId,
        role: "user",
        content: "Quero reiniciar sem preservar nada novo",
        contextVersion: 1,
        source: "tests",
      },
    });

    await prisma.contactMemoryItem.createMany({
      data: [
        {
          companyId,
          profileId,
          category: "IDENTITY",
          key: "customer_name",
          value: "Cliente Permanente",
        },
        {
          companyId,
          profileId,
          category: "TEMPORARY_CONTEXT",
          key: "draft_topic",
          value: "Contexto temporário",
          sourceConversationId: conversationId,
        },
      ],
    });

    const { service, extractionCalls } = createResetService(prisma, {
      profile,
      answer: "unused",
    });

    const resetResult = await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "reset",
        source: "tests",
        messageType: "text",
        externalMessageId: "msg-ext-reset-preserve-false",
        externalSenderPhone: profilePhone,
        externalSenderName: "Reset User",
      },
      ...auth,
    });

    assert.equal(resetResult.runtime.reason, "conversation-reset-executed");
    assert.equal(extractionCalls.length, 0);

    const memories = await prisma.contactMemoryItem.findMany({
      where: { companyId, profileId },
      orderBy: { key: "asc" },
    });
    assert.deepEqual(
      memories.map((item) => item.key),
      ["customer_name"],
    );
  } finally {
    await cleanupResetTestData(prisma, [companyId]);
    await prisma.$disconnect();
  }
});
