import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  detectDirectBusinessHours,
  detectDirectBusinessHoursDecision,
  hasExplicitHumanRequest,
  isDirectBusinessHoursBindingAllowed,
  isDirectBusinessHoursShortContinuation,
} from "../dist/assistant-conversations/business-hours-direct-deterministic.js";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";
import { deriveHumanHandoffSignal } from "../dist/runtime-v2/turn-understanding.js";
import { IntentRouterService } from "../dist/intent-router/intent-router.service.js";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";

const positives = [
  ["Qual o horário de atendimento?", "WEEKLY_SUMMARY"],
  ["Que horas vocês funcionam?", "WEEKLY_SUMMARY"],
  ["Qual o expediente?", "WEEKLY_SUMMARY"],
  ["Qual o horário de funcionamento?", "WEEKLY_SUMMARY"],
  ["Quando vocês atendem?", "WEEKLY_SUMMARY"],
  ["Qual o horário da loja?", "WEEKLY_SUMMARY"],
  ["Qual horário vocês abrem?", "WEEKLY_SUMMARY"],
  ["Que horas vocês abrem?", "WEEKLY_SUMMARY"],
  ["Que horas a loja abre?", "WEEKLY_SUMMARY"],
  ["Que horas vocês fecham?", "WEEKLY_SUMMARY"],
  ["Qual horario vcs abrem", "WEEKLY_SUMMARY"],
  ["Qual o horário na segunda?", "SPECIFIC_DAY"],
  ["Que horas vocês fecham na terça?", "SPECIFIC_DAY"],
  ["Vocês abrem quarta-feira?", "SPECIFIC_DAY"],
  ["Como funciona na quinta?", "SPECIFIC_DAY"],
  ["Qual o expediente de sexta?", "SPECIFIC_DAY"],
  ["Abrem sábado?", "SPECIFIC_DAY"],
  ["Domingo vocês funcionam?", "SPECIFIC_DAY"],
  ["Qual o horário de sábado e domingo?", "SPECIFIC_DAY"],
  ["Vocês abrem sábado e domingo?", "SPECIFIC_DAY"],
  ["Como funciona na sexta e no sábado?", "SPECIFIC_DAY"],
  ["Qual o expediente de segunda e terça?", "SPECIFIC_DAY"],
  ["Quarta e quinta vocês fecham que horas?", "SPECIFIC_DAY"],
  ["Funcionam de segunda a sexta?", "SPECIFIC_DAY"],
  ["Qual o horário no fim de semana?", "SPECIFIC_DAY"],
  ["Qual o horário de fim de semana?", "SPECIFIC_DAY"],
  ["Como é o atendimento aos finais de semana?", "SPECIFIC_DAY"],
  ["Abrem no final de semana?", "SPECIFIC_DAY"],
  ["Sábado abre e domingo também?", "SPECIFIC_DAY"],
  ["Terça, quarta e quinta quais os horários?", "SPECIFIC_DAY"],
  ["Vocês funcionam no sábado?", "SPECIFIC_DAY"],
  ["Abrem domingo?", "SPECIFIC_DAY"],
  ["Que horas fecham hoje?", "TODAY"],
  ["Até que horas vocês atendem hoje?", "TODAY"],
  ["Que horas vocês abrem hoje?", "TODAY"],
  ["A loja está fechada hoje?", "TODAY"],
  ["A empresa está aberta agora?", "OPEN_NOW"],
  ["Vocês estão abertos agora?", "OPEN_NOW"],
  ["Ainda estão atendendo?", "OPEN_NOW"],
  ["Fecham para almoço?", "LUNCH_BREAK"],
  ["Qual o horário de almoço?", "LUNCH_BREAK"],
  ["Vocês param no almoço?", "LUNCH_BREAK"],
  ["Fecham ao meio-dia?", "LUNCH_BREAK"],
  ["Na quarta fecham para almoço?", "LUNCH_BREAK"],
  ["Quarta fecha para almoço?", "LUNCH_BREAK"],
  ["Funcionam no fim de semana?", "SPECIFIC_DAY"],
  ["Como funciona o atendimento na quarta?", "SPECIFIC_DAY"],
  ["horario de funcionamento", "WEEKLY_SUMMARY"],
  ["vcs tao abertos agora", "OPEN_NOW"],
  ["A empresa funciona hoje?", "TODAY"],
  ["O estabelecimento abre na sexta?", "SPECIFIC_DAY"],
  ["Quarta volta às 13?", "SPECIFIC_DAY"],
  ["Na quarta volta que horas?", "SPECIFIC_DAY"],
  ["Que horas volta na quarta?", "SPECIFIC_DAY"],
  ["Depois do almoço volta que horas?", "LUNCH_BREAK"],
  ["Voltam a atender às 13?", "LUNCH_BREAK"],
  ["O atendimento retorna às 13?", "LUNCH_BREAK"],
  ["Abre de novo às 13?", "LUNCH_BREAK"],
  ["Reabre depois do almoço?", "LUNCH_BREAK"],
  ["Na terça reabre que horas?", "SPECIFIC_DAY"],
  ["Hoje volta depois do almoço?", "TODAY"],
];

const negatives = [
  "Qual o prazo de entrega?",
  "Quanto tempo demora?",
  "Que horas meu pedido chega?",
  "Qual o horário da entrega?",
  "Quando minha encomenda chega?",
  "Que horas o técnico chega?",
  "Qual o horário da visita?",
  "Que horas será a instalação?",
  "Quando vão fazer a manutenção?",
  "Qual o horário da coleta?",
  "Que horas é meu agendamento?",
  "Qual o horário da consulta?",
  "Quando começa a reunião?",
  "Meu chamado está aberto?",
  "Meu sistema está fechado.",
  "O caixa fechou sozinho.",
  "Minha ordem foi fechada.",
  "Quero alterar o horário do agendamento.",
  "Que horas o motorista chega?",
  "Quando a carga será entregue?",
  "Qual o horário do serviço marcado?",
  "Que horas fecham meu pedido?",
  "Qual o endereço?",
  "Qual o telefone?",
  "Quero comprar.",
  "Preciso de suporte.",
  "Qual o valor?",
  "Telefone do técnico",
  "Pedido de suporte urgente",
  "Como abrir uma empresa?",
  "Que horas?",
  "Qual horário?",
  "Está aberto?",
  "Está fechado?",
  "E amanhã?",
  "E sábado?",
  "Meu pedido está aberto?",
  "O prazo está fechado?",
  "Quero abrir um chamado.",
  "Meu computador não abre.",
  "A loja do cliente funciona hoje?",
  "O estabelecimento do cliente está fechado.",
  "O técnico volta às 13?",
  "João volta na quarta?",
  "Meu pedido volta para entrega amanhã?",
  "O motorista retorna às 13?",
  "Quando o instalador volta?",
  "A consulta retorna às 13?",
  "O sistema volta às 13?",
  "O servidor volta quando?",
  "O suporte retorna meu chamado hoje?",
  "Minha encomenda volta para a transportadora?",
  "A reunião volta depois do almoço?",
  "O cliente volta às 13?",
  "Você volta às 13?",
  "Volta às 13?",
  "Quando volta?",
  "E depois do almoço?",
  "Quarta às 13?",
  "Retorna hoje?",
  "Minha entrega chega sábado ou domingo?",
  "O técnico vem terça e quarta?",
  "Meu pedido sai sexta e chega sábado?",
  "A reunião será segunda ou terça?",
  "O sistema ficou fechado sábado e domingo.",
  "Quero agendar para quarta ou quinta.",
  "O motorista trabalha sábado?",
  "Fim de semana?",
  "E no fim de semana?",
  "Sábado e domingo?",
  "Segunda e terça?",
  "Minha entrega chega no fim de semana?",
  "O técnico trabalha sábado e domingo?",
  "Meu pedido chega sábado?",
  "Quero agendar para o fim de semana.",
  "O motorista vem sábado e domingo?",
  "A reunião será no fim de semana?",
  "O cliente volta no fim de semana?",
];

test("detecta perguntas diretas de horários sem provider", () => {
  assert.ok(positives.length >= 40);
  for (const [message, expected] of positives)
    assert.equal(detectDirectBusinessHours(message), expected, message);
});

test("não captura intenções negativas", () => {
  assert.ok(negatives.length >= 35);
  for (const message of negatives) assert.equal(detectDirectBusinessHours(message), null, message);
});

test("expõe bloqueio temporal não comercial sem tratar técnico como horário", () => {
  assert.deepEqual(detectDirectBusinessHoursDecision("O técnico volta às 13?"), {
    kind: "BLOCKED_NON_BUSINESS_TEMPORAL",
    category: "TECHNICIAN",
  });
  assert.deepEqual(detectDirectBusinessHoursDecision("Que horas meu pedido chega?"), {
    kind: "BLOCKED_NON_BUSINESS_TEMPORAL",
    category: "ORDER",
  });
  assert.deepEqual(detectDirectBusinessHoursDecision("Quarta volta às 13?"), {
    kind: "BUSINESS_HOURS",
    scope: "SPECIFIC_DAY",
  });
});

test("bloqueia previsões temporais não comerciais sem depender de 'que horas'", () => {
  const blocked = [
    ["Minha entrega chega sábado?", "DELIVERY"],
    ["Meu pedido chega amanhã?", "ORDER"],
    ["Quando minha encomenda será entregue?", "ORDER"],
    ["O pedido sai hoje?", "ORDER"],
    ["A entrega vem de manhã?", "DELIVERY"],
    ["Que dia o pedido chega?", "ORDER"],
    ["O motorista chega sábado?", "DELIVERY"],
    ["A coleta acontece amanhã?", "DELIVERY"],
    ["Minha carga chega na terça?", "DELIVERY"],
    ["O pedido volta para entrega hoje?", "ORDER"],
    ["O técnico vem sábado?", "TECHNICIAN"],
    ["O instalador chega amanhã?", "TECHNICIAN"],
    ["Quando o técnico retorna?", "TECHNICIAN"],
    ["A manutenção acontece hoje?", "TECHNICIAN"],
    ["A visita ficou para terça?", "TECHNICIAN"],
    ["O técnico volta depois do almoço?", "TECHNICIAN"],
    ["Minha consulta é amanhã?", "APPOINTMENT"],
    ["A reunião começa terça?", "APPOINTMENT"],
    ["Qual dia ficou o agendamento?", "APPOINTMENT"],
    ["A visita será de manhã?", "TECHNICIAN"],
    ["O compromisso ficou para sexta?", "OTHER"],
    ["O sistema volta hoje?", "SYSTEM"],
    ["O suporte retorna amanhã?", "SYSTEM"],
    ["O chamado fecha na sexta?", "SYSTEM"],
    ["Quando o sistema volta?", "SYSTEM"],
  ];
  for (const [message, category] of blocked) {
    assert.deepEqual(detectDirectBusinessHoursDecision(message), {
      kind: "BLOCKED_NON_BUSINESS_TEMPORAL",
      category,
    });
  }
});

test("não bloqueia categorias não comerciais sem uma previsão temporal", () => {
  const noMatch = [
    "Minha entrega chegou danificada.",
    "Quero reclamar da entrega.",
    "Meu pedido está errado.",
    "Preciso alterar o endereço da entrega.",
    "O técnico fez um serviço ruim.",
    "Quero cancelar o agendamento.",
    "O sistema está com erro.",
    "Preciso de suporte.",
    "Minha consulta foi cancelada.",
    "Quero falar sobre o motorista.",
    "Chega sábado?",
    "Vem amanhã?",
    "Volta hoje?",
    "É na terça?",
  ];
  for (const message of noMatch) {
    assert.deepEqual(detectDirectBusinessHoursDecision(message), { kind: "NO_MATCH" });
  }
});

test("preserva BusinessHours apesar de âncoras temporais", () => {
  const businessHours = [
    "Vocês abrem sábado?",
    "Qual o horário de sábado e domingo?",
    "A loja funciona amanhã?",
    "O atendimento volta às 13?",
    "Depois do almoço vocês voltam que horas?",
    "Que horas vocês fecham hoje?",
  ];
  for (const message of businessHours) {
    assert.equal(detectDirectBusinessHoursDecision(message).kind, "BUSINESS_HOURS", message);
  }
});

test("binding é default-deny e humano tem prioridade", () => {
  const env = {
    BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED: "true",
    BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS: "assistant:106:533",
  };
  assert.equal(
    isDirectBusinessHoursBindingAllowed({
      assistantId: "assistant",
      accountId: "106",
      inboxId: "533",
      env,
    }),
    true,
  );
  assert.equal(
    isDirectBusinessHoursBindingAllowed({
      assistantId: "assistant",
      accountId: "106",
      inboxId: "534",
      env,
    }),
    false,
  );
  assert.equal(
    isDirectBusinessHoursBindingAllowed({
      assistantId: "other",
      accountId: "106",
      inboxId: "533",
      env,
    }),
    false,
  );
  assert.equal(hasExplicitHumanRequest("Quero falar com humano, vocês estão abertos?"), true);
});

test("continuação curta de dia é reconhecida apenas como candidata estruturada", () => {
  assert.equal(isDirectBusinessHoursShortContinuation("E na terça?"), true);
  assert.equal(isDirectBusinessHoursShortContinuation("Na quarta-feira?"), true);
  assert.equal(isDirectBusinessHoursShortContinuation("terça"), true);
  assert.equal(isDirectBusinessHoursShortContinuation("E na terça depois da entrega?"), false);
  assert.equal(isDirectBusinessHoursShortContinuation("E na terça funciona?"), false);
  assert.equal(isDirectBusinessHoursShortContinuation("E amanhã?"), false);
});

test("reconhece pedidos explícitos de humano sem confundir simples menções", () => {
  for (const message of [
    "Quero falar com humano.",
    "Quero falar com um atendente.",
    "Preciso falar com uma pessoa.",
    "Me transfere para um atendente.",
    "Quero atendimento humano.",
    "Quero falar com humano, vocês estão abertos?",
  ]) {
    assert.equal(deriveHumanHandoffSignal(message).requested, true, message);
  }
  for (const message of [
    "O atendimento humano é bom?",
    "Vocês possuem atendentes?",
    "Qual o horário dos atendentes?",
    "O técnico é uma pessoa?",
  ]) {
    assert.equal(deriveHumanHandoffSignal(message).requested, false, message);
  }
});

const directSchedule = {
  monday: [{ start: "08:00", end: "22:00" }],
  tuesday: [{ start: "08:00", end: "23:00" }],
  wednesday: [
    { start: "08:00", end: "11:00" },
    { start: "13:00", end: "21:00" },
  ],
  thursday: [{ start: "08:00", end: "18:00" }],
  friday: [{ start: "08:00", end: "18:00" }],
  saturday: [{ start: "07:30", end: "12:00" }],
  sunday: [],
};

function directAuth(companyId) {
  return {
    user: {
      id: `direct-user-${companyId}`,
      email: `${companyId}@example.test`,
      companyId,
      primaryCompanyId: companyId,
      activeCompanyId: companyId,
      memberships: [companyId],
      roles: [],
      permissions: [],
      name: "Direct test user",
    },
    tenant: { companyId, plan: "enterprise" },
  };
}

function createDirectService(prisma, options = {}) {
  const providerCalls = [];
  const providerInputs = [];
  const outboundCalls = [];
  const service = new AssistantConversationsService(
    prisma,
    {
      resolveRuntimeConfig: async () => ({
        runtimeEnabled: options.runtimeEnabled ?? true,
        provider: "test-provider",
        baseUrl: "",
        model: "test-model",
        apiKey: "test-key",
        requestTimeoutMs: 1000,
        source: "test",
        tenantSettingsConfigured: false,
        envFallbackConfigured: false,
        apiKeyConfigured: true,
      }),
      isProviderConfigured: async () => true,
      generateChatCompletion: async (input) => {
        providerCalls.push(true);
        providerInputs.push(input);
        return { answer: "V1 test response", provider: "test-provider", model: "test-model" };
      },
    },
    { buildRuntimeInputText: ({ rawText }) => rawText ?? "" },
    {},
  );
  service.sendChatwootOutboundText = async (payload) => {
    outboundCalls.push(payload);
    return {
      status: "sent",
      performed: true,
      externalMessageId: `outbound-${payload.assistantMessageId}`,
    };
  };
  return { service, providerCalls, providerInputs, outboundCalls };
}

function createTriagePreemptionService(prisma, cache) {
  const providerCalls = [];
  const providerInputs = [];
  const outboundCalls = [];
  const ragCalls = [];
  const ai = {
    resolveRuntimeConfig: async () => ({
      runtimeEnabled: true,
      provider: "test-provider",
      baseUrl: "",
      model: "test-model",
      apiKey: "test-key",
      requestTimeoutMs: 1000,
      source: "test",
      tenantSettingsConfigured: false,
      envFallbackConfigured: false,
      apiKeyConfigured: true,
    }),
    isProviderConfigured: async () => true,
    generateChatCompletion: async (input) => {
      providerCalls.push(true);
      providerInputs.push(input);
      if (input.response_format) {
        return {
          answer: JSON.stringify({
            message: "Marca registrada. Qual problema está acontecendo?",
            action: "ASK_NEXT_DETAIL",
            requestedDetail: "problema do equipamento",
            suggestScheduling: false,
            triageResolved: false,
          }),
          provider: "test-provider",
          model: "test-model",
        };
      }
      const prompt = input.messages.map((message) => String(message.content)).join("\n");
      const currentUserMessage = [...input.messages]
        .reverse()
        .find((message) => message.role === "user");
      if (/voltou a dar problema/i.test(String(currentUserMessage?.content ?? ""))) {
        return {
          answer: "Vou orientar a análise do serviço anterior conforme as condições de garantia.",
          provider: "test-provider",
          model: "test-model",
        };
      }
      if (/a partir de R\$ 195,00/.test(prompt)) {
        return {
          answer: "A formatação básica padrão tem valor a partir de R$ 195,00.",
          provider: "test-provider",
          model: "test-model",
        };
      }
      return { answer: "Resposta padrão segura.", provider: "test-provider", model: "test-model" };
    },
  };
  const retrieval = {
    searchRelevantKnowledge: async ({ query }) => {
      ragCalls.push(query);
      return {
        totalChunksScanned: 2,
        scoreThreshold: 0.2,
        scoreThresholdSource: "explicit",
        filteredOutCount: 1,
        filteredOutScoreRange: { min: 0.1, max: 0.1 },
        warning: null,
        results: /quanto|preco|preço|format/i.test(query)
          ? [
              {
                knowledgeId: "formatting-knowledge",
                knowledgeTitle: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
                chunkId: "formatting-price-chunk",
                score: 0.92,
                contentPreview: "Formatação básica padrão: a partir de R$ 195,00.",
              },
            ]
          : [],
      };
    },
  };
  const service = new AssistantConversationsService(
    prisma,
    ai,
    { buildRuntimeInputText: ({ rawText }) => rawText ?? "" },
    {},
    undefined,
    retrieval,
    new PromptCompilerService(),
    new IntentRouterService(ai),
    undefined,
    undefined,
    undefined,
    cache,
  );
  service.sendChatwootOutboundText = async (payload) => {
    outboundCalls.push(payload);
    return {
      status: "sent",
      performed: true,
      externalMessageId: `outbound-${payload.assistantMessageId}`,
    };
  };
  return { service, providerCalls, providerInputs, outboundCalls, ragCalls };
}

function createTriageCache() {
  const values = new Map();
  return {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => values.set(key, value),
    values,
  };
}

async function createDirectFixture(prisma, overrides = {}) {
  const prefix = `direct-business-hours-${randomUUID()}`;
  const fixture = {
    companyId: `${prefix}-company`,
    assistantId: `${prefix}-assistant`,
    conversationId: `${prefix}-conversation`,
    accountId: "106",
    inboxId: "533",
  };
  await prisma.company.create({
    data: {
      id: fixture.companyId,
      name: "Direct Business Hours Test",
      timezone: overrides.companyTimezone ?? "America/Campo_Grande",
    },
  });
  await prisma.assistant.create({
    data: {
      id: fixture.assistantId,
      companyId: fixture.companyId,
      name: "Direct Business Hours Assistant",
      timezone: overrides.assistantTimezone ?? "America/Campo_Grande",
      weeklySchedule:
        overrides.weeklySchedule === undefined ? directSchedule : overrides.weeklySchedule,
      ragEnabled: overrides.ragEnabled ?? false,
      memoryEnabled: false,
      semanticMemoryEnabled: false,
    },
  });
  await prisma.assistantConversation.create({
    data: {
      id: fixture.conversationId,
      companyId: fixture.companyId,
      assistantId: fixture.assistantId,
      source: "CHATWOOT",
      channelType: "WHATSAPP",
      externalAccountId: fixture.accountId,
      externalInboxId: fixture.inboxId,
      externalConversationId: `${prefix}-external-conversation`,
      currentContextVersion: 1,
    },
  });
  return fixture;
}

async function createPricingAndWarrantyFlows(prisma, fixture) {
  await prisma.assistantFlow.createMany({
    data: [
      {
        id: `${fixture.assistantId}-pricing`,
        assistantId: fixture.assistantId,
        name: "Orçamento e Preços",
        priority: 90,
        triggerDescription:
          "Use quando o cliente perguntar preço, valor, orçamento ou custo de serviços.",
        triggerKeywords: JSON.stringify([
          "quanto sai",
          "quanto custa",
          "preço",
          "valor",
          "formatar",
        ]),
      },
      {
        id: `${fixture.assistantId}-warranty`,
        assistantId: fixture.assistantId,
        name: "Garantia e Pós-Serviço",
        priority: 59,
        triggerDescription: "Use para garantia e serviço anterior.",
        triggerKeywords: JSON.stringify(["garantia", "voltou a dar problema", "serviço anterior"]),
      },
      {
        id: `${fixture.assistantId}-technical`,
        assistantId: fixture.assistantId,
        name: "Assistência Técnica Geral",
        priority: 60,
        triggerDescription: "Use para suporte técnico e formatação.",
        triggerKeywords: JSON.stringify(["formatar", "formatação", "conserto"]),
      },
    ],
  });
}

async function cleanupDirectFixture(prisma, fixture) {
  await prisma.assistantConversationStateV2Event.deleteMany({
    where: { companyId: fixture.companyId },
  });
  await prisma.assistantConversationStateV2.deleteMany({ where: { companyId: fixture.companyId } });
  await prisma.assistantRuntimeLog.deleteMany({ where: { companyId: fixture.companyId } });
  await prisma.assistantConversationMessage.deleteMany({ where: { companyId: fixture.companyId } });
  await prisma.assistantConversation.deleteMany({ where: { companyId: fixture.companyId } });
  await prisma.assistant.deleteMany({ where: { companyId: fixture.companyId } });
  await prisma.company.deleteMany({ where: { id: fixture.companyId } });
}

async function withDirectFixture(overrides, run) {
  const prisma = new PrismaClient();
  const oldEnabled = process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED;
  const oldBindings = process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS;
  const fixture = await createDirectFixture(prisma, overrides);
  process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED = "true";
  process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS = `${fixture.assistantId}:106:533`;
  try {
    return await run({
      prisma,
      fixture,
      ...createDirectService(prisma, { runtimeEnabled: overrides.runtimeEnabled }),
    });
  } finally {
    if (oldEnabled === undefined) delete process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED;
    else process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED = oldEnabled;
    if (oldBindings === undefined) delete process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS;
    else process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS = oldBindings;
    await cleanupDirectFixture(prisma, fixture);
    await prisma.$disconnect();
  }
}

function directInbound(fixture, message, externalMessageId, overrides = {}) {
  return {
    assistantId: fixture.assistantId,
    conversationId: fixture.conversationId,
    dto: {
      message,
      source: "chatwoot",
      messageType: "text",
      externalMessageId,
      externalAccountId: overrides.accountId ?? fixture.accountId,
      externalInboxId: overrides.inboxId ?? fixture.inboxId,
      externalConversationId: `${fixture.conversationId}-external`,
    },
    ...directAuth(fixture.companyId),
  };
}

test(
  "PostgreSQL: binding autorizado percorre a rota direta sem provider, flow ou response execution",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
      const response = await service.sendMessage(
        directInbound(fixture, "Quarta volta às 13?", "direct-primary-1"),
      );
      assert.equal(response.runtime.reason, "BUSINESS_HOURS_DIRECT_DETERMINISTIC");
      assert.match(response.assistantMessage.content, /08h às 11h e das 13h às 21h/i);
      assert.equal(providerCalls.length, 0);
      assert.equal(outboundCalls.length, 1);
      const log = await prisma.assistantRuntimeLog.findFirst({
        where: { companyId: fixture.companyId, mode: "business-hours-direct-deterministic" },
      });
      assert.equal(log.metadata.providerCount, 0);
      assert.equal(log.metadata.deterministicResponderCount, 1);
      assert.equal(log.metadata.historyUsed, false);
      assert.equal(log.metadata.flowRouterUsed, false);
      assert.equal(log.metadata.responseExecutionUsed, false);
      assert.equal(
        await prisma.assistantConversationStateV2.count({
          where: { companyId: fixture.companyId },
        }),
        0,
      );
    }),
);

test(
  "PostgreSQL: continuação curta usa apenas o runtime log direto imediatamente anterior",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
      const monday = await service.sendMessage(
        directInbound(fixture, "Qual horário vocês abrem na segunda?", "direct-continuation-1"),
      );
      assert.equal(monday.runtime.reason, "BUSINESS_HOURS_DIRECT_DETERMINISTIC");

      const tuesday = await service.sendMessage(
        directInbound(fixture, "E na terça?", "direct-continuation-2"),
      );
      assert.equal(tuesday.runtime.reason, "BUSINESS_HOURS_DIRECT_DETERMINISTIC");
      assert.match(tuesday.assistantMessage.content, /terças-feiras.*08h às 23h/i);
      assert.equal(providerCalls.length, 0);
      assert.equal(outboundCalls.length, 2);
      const log = await prisma.assistantRuntimeLog.findFirstOrThrow({
        where: { companyId: fixture.companyId, userMessageId: tuesday.userMessage.id },
      });
      assert.equal(log.metadata.businessHoursScope, "SPECIFIC_DAY");
      assert.equal(log.metadata.providerCount, 0);

      await service.sendMessage(
        directInbound(fixture, "Qual o preço da formatação?", "direct-continuation-normal"),
      );
      const noCarry = await service.sendMessage(
        directInbound(fixture, "E na terça?", "direct-continuation-default-deny"),
      );
      assert.notEqual(noCarry.runtime.reason, "BUSINESS_HOURS_DIRECT_DETERMINISTIC");
      assert.equal(providerCalls.length, 2);
    }),
);

test(
  "PostgreSQL: intenção explícita preempte triagem antiga sem perder fatos já coletados",
  { concurrency: false },
  async () => {
    const prisma = new PrismaClient();
    const oldEnabled = process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED;
    const oldBindings = process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS;
    const fixture = await createDirectFixture(prisma, { ragEnabled: true });
    const cache = createTriageCache();
    process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED = "true";
    process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS = `${fixture.assistantId}:106:533`;
    try {
      await createPricingAndWarrantyFlows(prisma, fixture);
      const { service, providerCalls, providerInputs, outboundCalls, ragCalls } =
        createTriagePreemptionService(prisma, cache);
      const cacheKey = `triage:${fixture.companyId}:${fixture.conversationId}`;
      const pendingBrandState = {
        active: true,
        startedAt: new Date().toISOString(),
        sourceMessageId: "old-triage-inbound",
        requestedDetail: "marca do computador",
        requestedDetailKey: "device_brand",
        lastQuestion: "Qual é a marca do computador?",
        attemptCount: 1,
        resolved: false,
        expiresAt: Date.now() + 3_600_000,
        knownFieldKeys: ["device_type"],
        pendingFieldKeys: ["device_brand"],
      };

      await cache.set(cacheKey, pendingBrandState);
      const price = await service.sendMessage(
        directInbound(fixture, "Quanto sai para formatar?", "triage-preempt-price"),
      );
      assert.match(price.assistantMessage.content, /a partir de R\$ 195,00/i);
      assert.equal(price.runtime.context.triageMode, false);
      assert.equal(price.runtime.context.ragItemCount, 1);
      assert.equal(ragCalls.at(-1), "Quanto sai para formatar?");
      assert.equal(cache.values.get(cacheKey).active, false);
      assert.ok(cache.values.get(cacheKey).knownFieldKeys.includes("device_type"));
      assert.doesNotMatch(
        providerInputs
          .at(-1)
          .messages.map((message) => String(message.content))
          .join("\n"),
        /HISTÓRICO E ESTADO DE TRIAGEM ANTERIOR/i,
      );
      assert.equal(price.runtime.context.selectedFlowId, `${fixture.assistantId}-pricing`);

      await cache.set(cacheKey, pendingBrandState);
      const warranty = await service.sendMessage(
        directInbound(
          fixture,
          "Vocês formataram meu computador e voltou a dar problema.",
          "triage-preempt-warranty",
        ),
      );
      assert.match(warranty.assistantMessage.content, /garantia|serviço anterior/i);
      assert.doesNotMatch(warranty.assistantMessage.content, /qual é a marca/i);
      assert.equal(warranty.runtime.context.selectedFlowId, `${fixture.assistantId}-warranty`);
      assert.equal(warranty.runtime.context.triageMode, false);

      await cache.set(cacheKey, pendingBrandState);
      const brand = await service.sendMessage(
        directInbound(fixture, "É Dell.", "triage-pending-brand"),
      );
      assert.equal(brand.runtime.context.triageMode, true);
      assert.equal(cache.values.get(cacheKey).active, true);
      assert.ok(cache.values.get(cacheKey).knownFieldKeys.includes("device_brand"));

      await cache.set(cacheKey, pendingBrandState);
      await service.sendMessage(directInbound(fixture, "Não sei a marca.", "triage-unknown-brand"));
      const unknownState = cache.values.get(cacheKey);
      assert.equal(unknownState.active, false);
      assert.equal(unknownState.requestedDetailKey, null);
      assert.ok(unknownState.knownFieldKeys.includes("unknown_device_brand"));
      assert.equal(providerCalls.length >= 4, true);
      assert.equal(outboundCalls.length, 4);
      assert.equal(
        await prisma.assistantConversationStateV2.count({
          where: { companyId: fixture.companyId },
        }),
        0,
      );
    } finally {
      if (oldEnabled === undefined) delete process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED;
      else process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED = oldEnabled;
      if (oldBindings === undefined)
        delete process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS;
      else process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS = oldBindings;
      await cleanupDirectFixture(prisma, fixture);
      await prisma.$disconnect();
    }
  },
);

test(
  "PostgreSQL: replay e concorrência mantêm um único outbound por inbound externo",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
      const duplicate = directInbound(fixture, "Qual o horário na quarta?", "direct-replay-1");
      const [first, replay] = await Promise.all([
        service.sendMessage(duplicate),
        service.sendMessage(duplicate),
      ]);
      assert.equal(first.userMessage.id, replay.userMessage.id);
      assert.equal(outboundCalls.length, 1);
      assert.equal(providerCalls.length, 0);
      assert.equal(
        await prisma.assistantConversationMessage.count({
          where: { companyId: fixture.companyId, externalMessageId: "direct-replay-1" },
        }),
        1,
      );
    }),
);

test(
  "PostgreSQL: agenda ausente usa fallback seguro sem provider",
  { concurrency: false },
  async () =>
    withDirectFixture(
      { weeklySchedule: null },
      async ({ fixture, service, providerCalls, outboundCalls }) => {
        const response = await service.sendMessage(
          directInbound(fixture, "Qual o horário de atendimento?", "direct-missing-schedule"),
        );
        assert.equal(
          response.assistantMessage.content,
          "Não consegui consultar o horário oficial neste momento. Por favor, tente novamente em alguns minutos.",
        );
        assert.equal(providerCalls.length, 0);
        assert.equal(outboundCalls.length, 1);
      },
    ),
);

test(
  "PostgreSQL: agenda inválida usa fallback seguro sem provider",
  { concurrency: false },
  async () =>
    withDirectFixture(
      { weeklySchedule: { monday: [{ start: "25:00", end: "18:00" }] } },
      async ({ fixture, service, providerCalls, outboundCalls }) => {
        const response = await service.sendMessage(
          directInbound(fixture, "Qual o horário de atendimento?", "direct-invalid-schedule"),
        );
        assert.equal(
          response.assistantMessage.content,
          "Não consegui consultar o horário oficial neste momento. Por favor, tente novamente em alguns minutos.",
        );
        assert.equal(providerCalls.length, 0);
        assert.equal(outboundCalls.length, 1);
      },
    ),
);

test(
  "PostgreSQL: timezone inválido usa fallback seguro sem provider",
  { concurrency: false },
  async () =>
    withDirectFixture(
      {
        companyTimezone: "America/Campo_Grand",
        assistantTimezone: "GMT-4",
      },
      async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
        const response = await service.sendMessage(
          directInbound(fixture, "Qual o horário de atendimento?", "direct-invalid-timezone"),
        );
        assert.equal(
          response.assistantMessage.content,
          "Não consegui consultar o horário oficial neste momento. Por favor, tente novamente em alguns minutos.",
        );
        assert.equal(providerCalls.length, 0);
        assert.equal(outboundCalls.length, 1);
        const log = await prisma.assistantRuntimeLog.findFirstOrThrow({
          where: { companyId: fixture.companyId, mode: "business-hours-direct-deterministic" },
        });
        assert.equal(log.metadata.fallbackReason, "INVALID_OFFICIAL_TIMEZONE");
        assert.equal(log.metadata.timezoneValid, false);
        assert.equal(log.metadata.timezoneSource, "NONE");
        assert.equal(log.metadata.timezoneFallbackApplied, false);
        assert.equal(log.metadata.providerCount, 0);
        assert.equal(log.metadata.historyUsed, false);
        assert.equal(log.metadata.flowRouterUsed, false);
        assert.equal(log.metadata.responseExecutionUsed, false);
        assert.equal(log.metadata.approvalCreated, false);
        assert.equal(log.metadata.outboundCount, 1);
        assert.equal(
          await prisma.assistantConversationStateV2.count({
            where: { companyId: fixture.companyId },
          }),
          0,
        );
      },
    ),
);

test(
  "PostgreSQL: timezone oficial ausente usa fallback seguro sem provider",
  { concurrency: false },
  async () =>
    withDirectFixture(
      { companyTimezone: "", assistantTimezone: "" },
      async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
        const response = await service.sendMessage(
          directInbound(fixture, "Vocês estão abertos agora?", "direct-missing-timezone"),
        );
        assert.equal(
          response.assistantMessage.content,
          "Não consegui consultar o horário oficial neste momento. Por favor, tente novamente em alguns minutos.",
        );
        assert.equal(providerCalls.length, 0);
        assert.equal(outboundCalls.length, 1);
        const log = await prisma.assistantRuntimeLog.findFirstOrThrow({
          where: { companyId: fixture.companyId, mode: "business-hours-direct-deterministic" },
        });
        assert.equal(log.metadata.fallbackReason, "INVALID_OFFICIAL_TIMEZONE");
        assert.equal(log.metadata.timezoneValid, false);
        assert.equal(log.metadata.timezoneSource, "NONE");
        assert.equal(
          await prisma.assistantConversationStateV2.count({
            where: { companyId: fixture.companyId },
          }),
          0,
        );
      },
    ),
);

test(
  "PostgreSQL: conversa com estado V2 legado volumoso não lê, arma ou altera esse estado",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
      const legacyState = {
        attemptNumber: 17,
        history: Array.from({ length: 16 }, (_, index) => ({
          attemptNumber: index + 1,
          status: "CONSUMED",
          owner: "V2_OUTBOUND_SENT",
          padding: "",
        })),
        current: { attemptNumber: 17, owner: "V2_OUTBOUND_SENT", approval: { status: "CONSUMED" } },
      };
      legacyState.history.at(-1).padding = "x".repeat(
        63176 - Buffer.byteLength(JSON.stringify(legacyState)),
      );
      await prisma.assistantConversationStateV2.create({
        data: {
          companyId: fixture.companyId,
          assistantId: fixture.assistantId,
          conversationId: fixture.conversationId,
          contextVersion: 1,
          mode: "SHADOW",
          schemaVersion: "legacy",
          revision: 17,
          stateJson: legacyState,
          expiresAt: new Date("2030-01-01T00:00:00.000Z"),
          purgeAt: new Date("2030-02-01T00:00:00.000Z"),
        },
      });
      const before = await prisma.assistantConversationStateV2.findFirst({
        where: { companyId: fixture.companyId },
      });
      const beforeHash = createHash("sha256")
        .update(JSON.stringify(before.stateJson))
        .digest("hex");
      await service.sendMessage(
        directInbound(fixture, "Qual o horário de sábado e domingo?", "direct-legacy-1"),
      );
      const after = await prisma.assistantConversationStateV2.findFirst({
        where: { companyId: fixture.companyId },
      });
      assert.deepEqual(after.stateJson, before.stateJson);
      assert.equal(
        createHash("sha256").update(JSON.stringify(after.stateJson)).digest("hex"),
        beforeHash,
      );
      assert.equal(providerCalls.length, 0);
      assert.equal(outboundCalls.length, 1);
      assert.match(outboundCalls[0].content, /sábados/i);
      assert.match(outboundCalls[0].content, /07h30 às 12h/i);
      assert.match(outboundCalls[0].content, /domingos/i);
      assert.match(outboundCalls[0].content, /não abrimos/i);
      assert.equal(
        await prisma.assistantConversationStateV2Event.count({
          where: { companyId: fixture.companyId },
        }),
        0,
      );
    }),
);

test(
  "PostgreSQL: flag OFF e binding divergente não criam resposta direta",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
      const oldEnabled = process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED;
      try {
        process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED = "false";
        await service.sendMessage(
          directInbound(fixture, "Qual o horário na quarta?", "direct-flag-off"),
        );
        process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED = "true";
        await service.sendMessage(
          directInbound(fixture, "Qual o horário na quarta?", "direct-other-inbox", {
            inboxId: "534",
          }),
        );
      } finally {
        process.env.BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED = oldEnabled;
      }
      assert.equal(providerCalls.length, 2);
      assert.equal(outboundCalls.length, 2);
      assert.equal(
        await prisma.assistantRuntimeLog.count({
          where: { companyId: fixture.companyId, mode: "business-hours-direct-deterministic" },
        }),
        0,
      );
    }),
);

test(
  "PostgreSQL: pedido explícito de humano mantém prioridade sobre a rota direta",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
      for (const [index, message] of [
        "Quero falar com humano, vocês estão abertos agora?",
        "Quero falar com humano, o técnico volta às 13?",
      ].entries()) {
        const response = await service.sendMessage(
          directInbound(fixture, message, `direct-handoff-priority-${index}`),
        );
        assert.equal(response.runtime.reason, "EXPLICIT_HUMAN_HANDOFF");
        assert.equal(response.assistantMessage.content, "Transferindo para um atendente...");
      }
      assert.equal(providerCalls.length, 0);
      assert.equal(outboundCalls.length, 2);
      assert.equal(
        outboundCalls.every((call) => call.handoff === true),
        true,
      );
      assert.equal(
        await prisma.assistantRuntimeLog.count({
          where: { companyId: fixture.companyId, mode: "business-hours-direct-deterministic" },
        }),
        0,
      );
      const log = await prisma.assistantRuntimeLog.findFirstOrThrow({
        where: { companyId: fixture.companyId, mode: "explicit-human-handoff" },
      });
      assert.equal(log.metadata.handoffTriggered, true);
      assert.equal(log.metadata.providerCount, 0);
      assert.equal(log.metadata.flowRouterUsed, false);
      assert.equal(log.metadata.businessHoursRendererUsed, false);
      assert.equal(
        await prisma.assistantConversationStateV2.count({
          where: { companyId: fixture.companyId },
        }),
        0,
      );
    }),
);

test(
  "PostgreSQL: contexto temporal bloqueado encerra com fallback seguro sem V1",
  { concurrency: false },
  async () =>
    withDirectFixture(
      { runtimeEnabled: false },
      async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
        const directMessages = [
          "Qual o horário de atendimento?",
          "Qual o horário na quarta-feira?",
          "Vocês fecham para almoço na quarta?",
          "Abrem sábado?",
          "Domingo vocês funcionam?",
          "Qual o horário de sábado e domingo?",
          "Quarta volta às 13?",
        ];
        for (const [index, message] of directMessages.entries()) {
          const response = await service.sendMessage(
            directInbound(fixture, message, "direct-history-" + index),
          );
          assert.equal(response.runtime.reason, "BUSINESS_HOURS_DIRECT_DETERMINISTIC");
        }

        const response = await service.sendMessage(
          directInbound(fixture, "O técnico volta às 13?", "direct-blocked-technician"),
        );
        assert.equal(response.runtime.reason, "BUSINESS_HOURS_DIRECT_NON_BUSINESS_SAFE_FALLBACK");
        assert.equal(
          response.assistantMessage.content,
          "Não tenho a confirmação do horário do técnico neste momento.",
        );
        assert.equal(providerCalls.length, 0);
        assert.equal(outboundCalls.length, directMessages.length + 1);

        const directLogs = await prisma.assistantRuntimeLog.findMany({
          where: { companyId: fixture.companyId, mode: "business-hours-direct-deterministic" },
        });
        assert.equal(directLogs.length, directMessages.length);
        const nonBusinessLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
          where: {
            companyId: fixture.companyId,
            userMessageId: response.userMessage.id,
          },
        });
        assert.equal(nonBusinessLog.mode, "business-hours-direct-non-business-safe-fallback");
        assert.equal(
          nonBusinessLog.metadata.directBusinessHoursDetectionKind,
          "BLOCKED_NON_BUSINESS_TEMPORAL",
        );
        assert.equal(nonBusinessLog.metadata.blockedNonBusinessTemporalCategory, "TECHNICIAN");
        assert.equal(nonBusinessLog.metadata.agendaInjected, false);
        assert.equal(nonBusinessLog.metadata.businessHoursRendererUsed, false);
        assert.equal(nonBusinessLog.metadata.providerCount, 0);
      },
    ),
);

test(
  "PostgreSQL: contexto temporal bloqueado não monta prompt nem chama provider",
  { concurrency: false },
  async () =>
    withDirectFixture(
      {},
      async ({ fixture, service, providerCalls, providerInputs, outboundCalls }) => {
        await service.sendMessage(
          directInbound(fixture, "Vocês fecham para almoço na quarta?", "direct-prompt-lunch"),
        );
        await service.sendMessage(
          directInbound(fixture, "Quarta volta às 13?", "direct-prompt-resumption"),
        );

        const response = await service.sendMessage(
          directInbound(fixture, "O técnico volta às 13?", "direct-prompt-technician"),
        );
        assert.equal(response.runtime.reason, "BUSINESS_HOURS_DIRECT_NON_BUSINESS_SAFE_FALLBACK");
        assert.equal(providerCalls.length, 0);
        assert.equal(providerInputs.length, 0);
        assert.equal(outboundCalls.length, 3);
      },
    ),
);

test(
  "PostgreSQL: pedido, entrega e sistema bloqueados recebem fallback seguro sem agenda comercial",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ fixture, service, providerCalls, outboundCalls }) => {
      const cases = [
        [
          "Que horas meu pedido chega?",
          "Não tenho a previsão do pedido ou da entrega confirmada neste momento.",
        ],
        [
          "Que horas a entrega chega?",
          "Não tenho a previsão do pedido ou da entrega confirmada neste momento.",
        ],
        ["Meu sistema está fechado.", "Não tenho essa informação confirmada no momento."],
      ];
      for (const [index, [message, answer]] of cases.entries()) {
        const response = await service.sendMessage(
          directInbound(fixture, message, `direct-blocked-safe-${index}`),
        );
        assert.equal(response.runtime.reason, "BUSINESS_HOURS_DIRECT_NON_BUSINESS_SAFE_FALLBACK");
        assert.equal(response.assistantMessage.content, answer);
        assert.doesNotMatch(response.assistantMessage.content, /atendimento|07h30|08h|13h|21h/i);
      }
      assert.equal(providerCalls.length, 0);
      assert.equal(outboundCalls.length, cases.length);
    }),
);

test(
  "PostgreSQL: previsões temporais bloqueadas encerram antes do pipeline V1",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
      const businessHoursMessages = [
        "Qual o horário de atendimento?",
        "Qual o horário na quarta-feira?",
        "Vocês fecham para almoço na quarta?",
        "Abrem sábado?",
        "Domingo vocês funcionam?",
        "Qual o horário de sábado e domingo?",
        "Quarta volta às 13?",
      ];
      for (const [index, message] of businessHoursMessages.entries()) {
        await service.sendMessage(
          directInbound(fixture, message, `direct-prior-business-${index}`),
        );
      }

      const blockedMessages = [
        "Minha entrega chega sábado?",
        "Meu pedido chega amanhã?",
        "O técnico vem sábado?",
        "O sistema volta hoje?",
        "Minha consulta é amanhã?",
      ];
      for (const [index, message] of blockedMessages.entries()) {
        const response = await service.sendMessage(
          directInbound(fixture, message, `direct-temporal-blocked-${index}`),
        );
        assert.equal(response.runtime.reason, "BUSINESS_HOURS_DIRECT_NON_BUSINESS_SAFE_FALLBACK");
        assert.equal(response.runtime.context.providerCount, 0);
        assert.equal(response.runtime.context.historyUsed, false);
        assert.equal(response.runtime.context.flowRouterUsed, false);
        assert.equal(response.runtime.context.responseExecutionUsed, false);
        assert.equal(response.runtime.context.agendaInjected, false);
      }
      assert.equal(providerCalls.length, 0);
      assert.equal(outboundCalls.length, businessHoursMessages.length + blockedMessages.length);
      assert.equal(
        await prisma.assistantConversationStateV2.count({
          where: { companyId: fixture.companyId },
        }),
        0,
      );
    }),
);

test(
  "PostgreSQL: fallback temporal bloqueado não atua fora do binding autorizado",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ fixture, service, providerCalls }) => {
      const response = await service.sendMessage(
        directInbound(fixture, "O técnico volta às 13?", "direct-blocked-other-inbox", {
          inboxId: "534",
        }),
      );
      assert.notEqual(response.runtime.reason, "BUSINESS_HOURS_DIRECT_NON_BUSINESS_SAFE_FALLBACK");
      assert.equal(providerCalls.length, 1);
    }),
);

test(
  "PostgreSQL: replay de contexto temporal bloqueado não duplica o fallback seguro",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ fixture, service, providerCalls, outboundCalls }) => {
      const inbound = directInbound(
        fixture,
        "O técnico volta às 13?",
        "direct-blocked-safe-replay",
      );
      const first = await service.sendMessage(inbound);
      const replay = await service.sendMessage(inbound);
      assert.equal(first.runtime.reason, "BUSINESS_HOURS_DIRECT_NON_BUSINESS_SAFE_FALLBACK");
      assert.equal(replay.runtime.reason, "duplicate-external-message-id");
      assert.equal(providerCalls.length, 0);
      assert.equal(outboundCalls.length, 1);
    }),
);

test(
  "PostgreSQL: falha após persistência não duplica outbound no replay",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ fixture, service, providerCalls, outboundCalls }) => {
      service.sendChatwootOutboundText = async (payload) => {
        outboundCalls.push(payload);
        throw new Error("simulated outbound failure");
      };
      const inbound = directInbound(fixture, "Qual o horário na quarta?", "direct-partial-failure");
      await assert.rejects(() => service.sendMessage(inbound), /simulated outbound failure/);
      const replay = await service.sendMessage(inbound);
      assert.equal(replay.runtime.reason, "duplicate-external-message-id");
      assert.equal(providerCalls.length, 0);
      assert.equal(outboundCalls.length, 1);
    }),
);

test(
  "PostgreSQL: quarenta mensagens preservam rota direta multi-dia, default deny e estado V2",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
      const positives = [
        "Qual o horário de atendimento?",
        "Qual o horário na quarta-feira?",
        "Vocês fecham para almoço na quarta?",
        "Que horas vocês fecham hoje?",
        "Vocês estão abertos agora?",
        "Abrem sábado?",
        "Domingo vocês funcionam?",
        "Qual o horário de sábado e domingo?",
        "Qual o horário no fim de semana?",
        "Quarta volta às 13?",
        "Depois do almoço volta que horas?",
        "Como funciona na sexta e no sábado?",
        "Qual o expediente de segunda e terça?",
        "Funcionam de segunda a sexta?",
        "Terça, quarta e quinta quais os horários?",
        "Sexta a segunda vocês funcionam como?",
        "Vocês abrem sábado e domingo?",
        "Quarta e quinta vocês fecham que horas?",
        "Qual o horário na segunda?",
        "Qual o horário na terça?",
        "Qual o horário na quarta?",
        "Quinta funciona até as 18?",
        "Qual o expediente de sexta?",
        "Vocês funcionam no sábado?",
        "Abrem domingo?",
        "Que horas vocês abrem?",
        "A loja está fechada hoje?",
        "Quando vocês atendem?",
        "Qual o horário de funcionamento?",
        "O estabelecimento abre na sexta?",
      ];
      assert.equal(positives.length, 30);
      for (const [index, message] of positives.entries()) {
        const response = await service.sendMessage(
          directInbound(fixture, message, `direct-sequence-positive-${index}`),
        );
        assert.equal(response.runtime.reason, "BUSINESS_HOURS_DIRECT_DETERMINISTIC", message);
      }

      const negatives = [
        "Que horas meu pedido chega?",
        "Minha entrega chega sábado ou domingo?",
        "O técnico volta às 13?",
        "O técnico vem terça e quarta?",
        "Quero agendar para o fim de semana.",
        "Meu sistema está fechado.",
        "O motorista vem sábado e domingo?",
        "Minha reunião será segunda ou terça?",
        "O cliente volta no fim de semana?",
        "Qual o horário da consulta?",
      ];
      assert.equal(negatives.length, 10);
      for (const [index, message] of negatives.entries()) {
        const response = await service.sendMessage(
          directInbound(fixture, message, `direct-sequence-negative-${index}`),
        );
        const detection = detectDirectBusinessHoursDecision(message);
        if (detection.kind === "BLOCKED_NON_BUSINESS_TEMPORAL") {
          assert.equal(
            response.runtime.reason,
            "BUSINESS_HOURS_DIRECT_NON_BUSINESS_SAFE_FALLBACK",
            message,
          );
          assert.doesNotMatch(response.assistantMessage.content, /atendimento|horário comercial/i);
        } else {
          assert.notEqual(response.runtime.reason, "BUSINESS_HOURS_DIRECT_DETERMINISTIC", message);
        }
      }

      const directLogs = await prisma.assistantRuntimeLog.findMany({
        where: { companyId: fixture.companyId, mode: "business-hours-direct-deterministic" },
      });
      assert.equal(directLogs.length, 30);
      assert.equal(
        providerCalls.length,
        negatives.filter(
          (message) => detectDirectBusinessHoursDecision(message).kind === "NO_MATCH",
        ).length,
      );
      assert.equal(outboundCalls.length, 40);
      assert.equal(
        outboundCalls.filter(
          (outbound) => /sábados/i.test(outbound.content) && /domingos/i.test(outbound.content),
        ).length >= 3,
        true,
      );
      assert.equal(
        await prisma.assistantConversationStateV2.count({
          where: { companyId: fixture.companyId },
        }),
        0,
      );
      assert.equal(
        directLogs.every(
          (log) =>
            log.metadata.providerCount === 0 &&
            log.metadata.approvalCreated === false &&
            log.metadata.historyUsed === false &&
            log.metadata.responseExecutionUsed === false,
        ),
        true,
      );
    }),
);
