import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AssistantsService } from "../dist/assistants/assistants.service.js";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";
import { CreateAssistantDto } from "../dist/assistants/dto/create-assistant.dto.js";
import { UpdateAssistantDto } from "../dist/assistants/dto/update-assistant.dto.js";

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
        return {
          answer: input.answer,
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
  );

  service.sendChatwootOutboundText = async (payload) => {
    outboundCalls.push(payload);
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
    await service.sendMessage({
      assistantId,
      conversationId,
      dto: {
        message: "Preciso de ajuda",
        source: "chatwoot",
        externalAccountId: `account-${companyId}`,
        externalConversationId: `ext-${conversationId}`,
        externalContactId: `contact-${companyId}`,
        externalInboxId: `inbox-${companyId}`,
      },
      ...auth,
    });

    assert.equal(outboundCalls.length, 1);
    assert.equal(outboundCalls[0].content, answer);
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

    const { service, outboundCalls } = createConversationsService(prisma, { answer });
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
    assert.equal(
      outboundCalls.map((call) => call.content).join("\n\n"),
      answer,
    );
    assert.ok(outboundCalls.some((call) => call.content.includes("https://example.com/rota/importante")));
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
