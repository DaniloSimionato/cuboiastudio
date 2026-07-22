import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  detectDirectBusinessHours,
  hasExplicitHumanRequest,
  isDirectBusinessHoursBindingAllowed,
} from "../dist/assistant-conversations/business-hours-direct-deterministic.js";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";

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

function createDirectService(prisma) {
  const providerCalls = [];
  const outboundCalls = [];
  const service = new AssistantConversationsService(
    prisma,
    {
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
      generateChatCompletion: async () => {
        providerCalls.push(true);
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
  return { service, providerCalls, outboundCalls };
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
      timezone: "America/Campo_Grande",
    },
  });
  await prisma.assistant.create({
    data: {
      id: fixture.assistantId,
      companyId: fixture.companyId,
      name: "Direct Business Hours Assistant",
      timezone: "America/Campo_Grande",
      weeklySchedule:
        overrides.weeklySchedule === undefined ? directSchedule : overrides.weeklySchedule,
      ragEnabled: false,
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
    return await run({ prisma, fixture, ...createDirectService(prisma) });
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
        directInbound(fixture, "Qual o horário na quarta-feira?", "direct-legacy-1"),
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
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls }) => {
      await service.sendMessage(
        directInbound(
          fixture,
          "Quero falar com humano, vocês estão abertos agora?",
          "direct-handoff-priority",
        ),
      );
      assert.equal(providerCalls.length, 1);
      assert.equal(
        await prisma.assistantRuntimeLog.count({
          where: { companyId: fixture.companyId, mode: "business-hours-direct-deterministic" },
        }),
        0,
      );
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
  "PostgreSQL: trinta perguntas consecutivas de horário permanecem stateless e sem provider",
  { concurrency: false },
  async () =>
    withDirectFixture({}, async ({ prisma, fixture, service, providerCalls, outboundCalls }) => {
      const sequence = [
        "Qual o horário de atendimento?",
        "Que horas vocês fecham hoje?",
        "Vocês estão abertos agora?",
        "Qual o horário na segunda?",
        "Qual o horário na terça?",
        "Qual o horário na quarta?",
        "Quarta fecha para almoço?",
        "Quarta volta às 13?",
        "Depois do almoço volta que horas?",
        "Quinta funciona até as 18?",
        "Sábado abre?",
        "Domingo funciona?",
        "Qual o horário na quarta-feira?",
        "Que horas vocês abrem?",
        "A loja está fechada hoje?",
        "Quando vocês atendem?",
      ];
      for (let index = 0; index < 30; index += 1) {
        const response = await service.sendMessage(
          directInbound(fixture, sequence[index % sequence.length], `direct-sequence-${index}`),
        );
        assert.equal(response.runtime.reason, "BUSINESS_HOURS_DIRECT_DETERMINISTIC");
      }
      const directLogs = await prisma.assistantRuntimeLog.findMany({
        where: { companyId: fixture.companyId, mode: "business-hours-direct-deterministic" },
      });
      for (const [index, message] of [
        "O técnico volta às 13?",
        "O sistema volta às 13?",
      ].entries()) {
        const response = await service.sendMessage(
          directInbound(fixture, message, `direct-sequence-negative-${index}`),
        );
        assert.notEqual(response.runtime.reason, "BUSINESS_HOURS_DIRECT_DETERMINISTIC");
      }
      assert.equal(directLogs.length, 30);
      assert.equal(providerCalls.length, 2);
      assert.equal(outboundCalls.length, 32);
      assert.equal(
        await prisma.assistantConversationStateV2.count({
          where: { companyId: fixture.companyId },
        }),
        0,
      );
      assert.equal(
        directLogs.every(
          (log) => log.metadata.providerCount === 0 && log.metadata.approvalCreated === false,
        ),
        true,
      );
    }),
);
