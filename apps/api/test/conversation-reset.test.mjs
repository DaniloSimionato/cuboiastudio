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
  await prisma.assistantConversationSession.deleteMany({
    where: { companyId: { in: companyIds } },
  });
  await prisma.assistantConversationMessage.deleteMany({
    where: { companyId: { in: companyIds } },
  });
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
  const cacheValues = input.cacheValues ?? new Map();
  const cacheCalls = [];

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
    {
      get: async (key) => cacheValues.get(key) ?? null,
      set: async (key, value, ttlSeconds) => {
        cacheCalls.push({ key, value, ttlSeconds });
        if (value === null) {
          cacheValues.delete(key);
        } else {
          cacheValues.set(key, value);
        }
      },
    },
  );

  service.sendChatwootOutboundText = async (payload) => {
    outboundCalls.push(payload);
    return { status: "sent", performed: true, externalMessageId: null };
  };

  return { service, outboundCalls, aiCalls, extractionCalls, cacheValues, cacheCalls };
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

test("Admin silent reset usa CAS, preserva auditoria e inicia o próximo turno sem histórico", async () => {
  const prisma = new PrismaClient();
  const companyId = `company_admin_reset_${randomUUID()}`;
  const otherCompanyId = `company_admin_reset_other_${randomUUID()}`;
  const assistantId = `assistant_admin_reset_${randomUUID()}`;
  const conversationPausedId = `conversation_admin_reset_paused_${randomUUID()}`;
  const conversationResumedId = `conversation_admin_reset_resumed_${randomUUID()}`;
  const conversationConcurrentId = `conversation_admin_reset_concurrent_${randomUUID()}`;
  const profileId = `profile_admin_reset_${randomUUID()}`;
  const profilePhone = "5567999997777";
  const auth = createAuth(companyId);

  try {
    const { profile } = await createResetFixture(prisma, {
      companyId,
      otherCompanyId,
      assistantId,
      conversationId: conversationPausedId,
      profileId,
      profilePhone,
      preserveMemories: true,
      sharedAcrossAssistants: true,
    });

    await prisma.assistantConversation.update({
      where: { id: conversationPausedId },
      data: { aiActive: false, pausedByHuman: true },
    });
    await prisma.assistantConversation.create({
      data: {
        id: conversationResumedId,
        companyId,
        assistantId,
        title: "Admin reset resumed",
        source: "CHATWOOT",
        channelType: "WHATSAPP",
        externalConversationId: `ext-${conversationResumedId}`,
        externalAccountId: `account-${companyId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
        currentContextVersion: 1,
        aiActive: false,
        pausedByHuman: true,
      },
    });
    await prisma.assistantConversationSession.create({
      data: {
        companyId,
        assistantId,
        conversationId: conversationResumedId,
        contextVersion: 1,
        status: "ACTIVE",
      },
    });
    await prisma.assistantConversation.create({
      data: {
        id: conversationConcurrentId,
        companyId,
        assistantId,
        title: "Admin reset concurrent",
        source: "CHATWOOT",
        channelType: "WHATSAPP",
        externalConversationId: `ext-${conversationConcurrentId}`,
        externalAccountId: `account-${companyId}`,
        externalContactId: `contact-concurrent-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
        currentContextVersion: 1,
        aiActive: false,
        pausedByHuman: true,
      },
    });
    await prisma.assistantConversationSession.create({
      data: {
        companyId,
        assistantId,
        conversationId: conversationConcurrentId,
        contextVersion: 1,
        status: "ACTIVE",
      },
    });
    await prisma.assistantConversationMessage.createMany({
      data: [
        {
          companyId,
          assistantId,
          conversationId: conversationPausedId,
          role: "user",
          content: "Histórico pausado preservado",
          contextVersion: 1,
          source: "tests",
        },
        {
          companyId,
          assistantId,
          conversationId: conversationResumedId,
          role: "user",
          content: "Mensagem antiga que não pode entrar no novo prompt",
          contextVersion: 1,
          source: "tests",
        },
        {
          companyId,
          assistantId,
          conversationId: conversationResumedId,
          role: "assistant",
          content: "Resposta antiga que também deve ficar isolada",
          contextVersion: 1,
          source: "tests",
        },
      ],
    });
    await prisma.contactMemoryItem.createMany({
      data: [
        {
          companyId,
          profileId,
          category: "TEMPORARY_CONTEXT",
          key: "admin_reset_temporary",
          value: "Estado transitório",
          sourceConversationId: conversationResumedId,
        },
        {
          companyId,
          profileId,
          category: "PREFERENCE",
          key: "admin_reset_permanent",
          value: "Memória permanente",
        },
      ],
    });

    const cacheValues = new Map([
      [
        `triage:${companyId}:${conversationPausedId}:v1`,
        {
          active: true,
          startedAt: new Date().toISOString(),
          sourceMessageId: "old-paused",
          requestedDetail: "modelo",
          attemptCount: 1,
          resolved: false,
          expiresAt: Date.now() + 60_000,
        },
      ],
      [
        `triage:${companyId}:${conversationResumedId}:v1`,
        {
          active: true,
          startedAt: new Date().toISOString(),
          sourceMessageId: "old-resumed",
          requestedDetail: "modelo",
          attemptCount: 1,
          resolved: false,
          expiresAt: Date.now() + 60_000,
        },
      ],
    ]);
    const { service, aiCalls, outboundCalls, cacheCalls } = createResetService(prisma, {
      profile,
      cacheValues,
      answer: "Resposta da nova sessão lógica",
    });
    const actor = { id: auth.user.id, email: auth.user.email };

    const pausedMessageCountBefore = await prisma.assistantConversationMessage.count({
      where: { conversationId: conversationPausedId },
    });
    const pausedReset = await service.adminSilentResetConversation({
      assistantId,
      conversationId: conversationPausedId,
      expectedContextVersion: 1,
      resumeAfterReset: false,
      actor,
      tenant: auth.tenant,
    });

    assert.equal(pausedReset.previousContextVersion, 1);
    assert.equal(pausedReset.currentContextVersion, 2);
    assert.equal(pausedReset.aiActive, false);
    assert.equal(pausedReset.pausedByHuman, true);
    assert.equal(aiCalls.length, 0);
    assert.equal(outboundCalls.length, 0);
    assert.equal(
      await prisma.assistantConversationMessage.count({
        where: { conversationId: conversationPausedId },
      }),
      pausedMessageCountBefore,
    );
    assert.equal(
      await prisma.assistantConversationMessage.count({
        where: {
          conversationId: conversationPausedId,
          mode: { in: ["reset-request", "reset-reply"] },
        },
      }),
      0,
    );
    assert.ok(
      cacheCalls.some(
        (call) =>
          call.key === `triage:${companyId}:${conversationPausedId}:v1` && call.value === null,
      ),
    );

    const pausedInbound = await service.sendMessage({
      assistantId,
      conversationId: conversationPausedId,
      expectedContextVersion: 2,
      dto: { message: "Mensagem normal ainda bloqueada", source: "tests" },
      ...auth,
    });
    assert.equal(pausedInbound.runtime.outcome, "skipped");
    assert.equal(pausedInbound.runtime.reason, "paused_by_human");
    assert.equal(aiCalls.length, 0);
    assert.equal(outboundCalls.length, 0);

    const resumedMessageCountBefore = await prisma.assistantConversationMessage.count({
      where: { conversationId: conversationResumedId },
    });
    const resumedReset = await service.adminSilentResetConversation({
      assistantId,
      conversationId: conversationResumedId,
      expectedContextVersion: 1,
      resumeAfterReset: true,
      actor,
      tenant: auth.tenant,
    });

    assert.equal(resumedReset.currentContextVersion, 2);
    assert.equal(resumedReset.aiActive, true);
    assert.equal(resumedReset.pausedByHuman, false);
    assert.equal(aiCalls.length, 0);
    assert.equal(outboundCalls.length, 0);
    assert.equal(
      await prisma.assistantConversationMessage.count({
        where: { conversationId: conversationResumedId },
      }),
      resumedMessageCountBefore,
    );
    assert.equal(
      await prisma.assistantConversationMessage.count({
        where: {
          conversationId: conversationResumedId,
          mode: { in: ["reset-request", "reset-reply"] },
        },
      }),
      0,
    );

    await assert.rejects(
      service.sendMessage({
        assistantId,
        conversationId: conversationResumedId,
        expectedContextVersion: 1,
        dto: { message: "Job criado antes do reset", source: "tests" },
        ...auth,
      }),
      /stale conversation context/i,
    );
    assert.equal(aiCalls.length, 0);
    assert.equal(outboundCalls.length, 0);

    const nextTurn = await service.sendMessage({
      assistantId,
      conversationId: conversationResumedId,
      expectedContextVersion: 2,
      dto: { message: "Primeira mensagem da nova sessão", source: "tests" },
      ...auth,
    });
    assert.equal(nextTurn.runtime.outcome, "success");
    assert.equal(aiCalls.length, 1);
    assert.equal(outboundCalls.length, 0);
    const nextPrompt = aiCalls[0].messages
      .map((message) => (typeof message.content === "string" ? message.content : ""))
      .join("\n");
    assert.match(nextPrompt, /Primeira mensagem da nova sessão/);
    assert.doesNotMatch(nextPrompt, /Mensagem antiga que não pode entrar/);
    assert.doesNotMatch(nextPrompt, /Resposta antiga que também deve ficar isolada/);
    assert.doesNotMatch(nextPrompt, /Atendimento reiniciado/);

    const remainingMemories = await prisma.contactMemoryItem.findMany({
      where: { companyId, profileId },
      orderBy: { key: "asc" },
    });
    assert.deepEqual(
      remainingMemories.map((memory) => memory.key),
      ["admin_reset_permanent"],
    );

    const auditLogs = await prisma.assistantRuntimeLog.findMany({
      where: {
        companyId,
        assistantId,
        conversationId: { in: [conversationPausedId, conversationResumedId] },
        mode: "admin-silent-context-reset",
      },
    });
    assert.equal(auditLogs.length, 2);
    assert.ok(
      auditLogs.every(
        (log) =>
          log.metadata.event === "ADMIN_SILENT_CONTEXT_RESET" &&
          log.metadata.providerCalled === false &&
          log.metadata.outboundAttempted === false &&
          log.metadata.resetReplyCreated === false,
      ),
    );

    const beforeCasFailure = await prisma.assistantConversation.findUnique({
      where: { id: conversationResumedId },
    });
    const sessionsBeforeCasFailure = await prisma.assistantConversationSession.count({
      where: { conversationId: conversationResumedId },
    });
    const logsBeforeCasFailure = await prisma.assistantRuntimeLog.count({
      where: {
        conversationId: conversationResumedId,
        mode: "admin-silent-context-reset",
      },
    });
    await assert.rejects(
      service.adminSilentResetConversation({
        assistantId,
        conversationId: conversationResumedId,
        expectedContextVersion: 1,
        resumeAfterReset: false,
        actor,
        tenant: auth.tenant,
      }),
      /does not match expected version/i,
    );
    const afterCasFailure = await prisma.assistantConversation.findUnique({
      where: { id: conversationResumedId },
    });
    assert.equal(afterCasFailure.currentContextVersion, beforeCasFailure.currentContextVersion);
    assert.equal(afterCasFailure.aiActive, beforeCasFailure.aiActive);
    assert.equal(afterCasFailure.pausedByHuman, beforeCasFailure.pausedByHuman);
    assert.equal(
      await prisma.assistantConversationSession.count({
        where: { conversationId: conversationResumedId },
      }),
      sessionsBeforeCasFailure,
    );
    assert.equal(
      await prisma.assistantRuntimeLog.count({
        where: {
          conversationId: conversationResumedId,
          mode: "admin-silent-context-reset",
        },
      }),
      logsBeforeCasFailure,
    );

    const foreignTenant = createAuth(otherCompanyId);
    await assert.rejects(
      service.adminSilentResetConversation({
        assistantId,
        conversationId: conversationResumedId,
        expectedContextVersion: 2,
        resumeAfterReset: false,
        actor: { id: foreignTenant.user.id, email: foreignTenant.user.email },
        tenant: foreignTenant.tenant,
      }),
      /conversation not found/i,
    );
    assert.equal(
      (
        await prisma.assistantConversation.findUnique({
          where: { id: conversationResumedId },
        })
      ).currentContextVersion,
      2,
    );

    const concurrentResults = await Promise.allSettled([
      service.adminSilentResetConversation({
        assistantId,
        conversationId: conversationConcurrentId,
        expectedContextVersion: 1,
        resumeAfterReset: false,
        actor,
        tenant: auth.tenant,
      }),
      service.adminSilentResetConversation({
        assistantId,
        conversationId: conversationConcurrentId,
        expectedContextVersion: 1,
        resumeAfterReset: false,
        actor,
        tenant: auth.tenant,
      }),
    ]);
    assert.equal(concurrentResults.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(
      concurrentResults.filter(
        (result) =>
          result.status === "rejected" &&
          /context version (?:changed before reset|does not match expected version)/i.test(
            result.reason?.message ?? "",
          ),
      ).length,
      1,
    );
    assert.equal(
      (
        await prisma.assistantConversation.findUnique({
          where: { id: conversationConcurrentId },
        })
      ).currentContextVersion,
      2,
    );
    assert.equal(
      await prisma.assistantRuntimeLog.count({
        where: {
          conversationId: conversationConcurrentId,
          mode: "admin-silent-context-reset",
        },
      }),
      1,
    );
  } finally {
    await cleanupResetTestData(prisma, [companyId, otherCompanyId]);
    await prisma.$disconnect();
  }
});

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
    assert.ok(
      resetResult.assistantMessage.content.includes("🔄 Atendimento reiniciado com sucesso."),
    );
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
