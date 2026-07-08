import assert from "node:assert/strict";
import { test } from "node:test";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";

const now = new Date("2026-07-07T12:00:00.000Z");

function createFlow({
  id,
  name,
  triggerKeywords,
  allowedToolSlugs,
  finalAction = "respond",
  autoRespond = true,
  requiresHuman = false,
  toolContext = null,
  fixedMessage = null,
}) {
  return {
    id,
    assistantId: "assistant-1",
    name,
    description: `${name} description`,
    priority: 10,
    triggerKeywords: JSON.stringify(triggerKeywords),
    triggerDescription: `${name} flow`,
    triggerExamples: null,
    flowInstructions: null,
    allowedToolSlugs: allowedToolSlugs ? JSON.stringify(allowedToolSlugs) : null,
    knowledgeScope: null,
    toolContext,
    finalAction,
    fixedMessage,
    handoffTeamId: null,
    handoffTeamName: null,
    chatwootLabels: null,
    autoRespond,
    requiresHuman,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

function createState(overrides = {}) {
  return {
    apps: [{ id: "app-google-calendar", slug: "google_calendar" }],
    installations: [{ id: "installation-1", companyId: "company-1", appId: "app-google-calendar", status: "ACTIVE" }],
    credentials: [{ id: "credential-1", companyId: "company-1", installationId: "installation-1", provider: "google", status: "ACTIVE" }],
    resources: [
      {
        id: "resource-padel-1",
        companyId: "company-1",
        installationId: "installation-1",
        calendarId: "padel-1@example.com",
        name: "Padel Quadra 03",
        resourceType: "quadra",
        sportType: "Padel",
        isCovered: false,
        timezone: "America/Campo_Grande",
        slotMinutes: 30,
        defaultDurationMinutes: 60,
        minAdvanceMinutes: 0,
        maxDaysAhead: 30,
        active: true,
        categoryRef: { name: "Padel", slug: "padel" },
        resourceTypeRef: { name: "Quadra", slug: "quadra" },
        attributeRef: { name: "Descoberta", slug: "descoberta" },
      },
      {
        id: "resource-beach-1",
        companyId: "company-1",
        installationId: "installation-1",
        calendarId: "beach-1@example.com",
        name: "Beach Quadra 01",
        resourceType: "quadra",
        sportType: "Beach Tennis",
        isCovered: false,
        timezone: "America/Campo_Grande",
        slotMinutes: 30,
        defaultDurationMinutes: 60,
        minAdvanceMinutes: 0,
        maxDaysAhead: 30,
        active: true,
        categoryRef: { name: "Beach Tennis", slug: "beach-tennis" },
        resourceTypeRef: { name: "Quadra", slug: "quadra" },
        attributeRef: { name: "Descoberta", slug: "descoberta" },
      },
    ],
    assistants: [
      {
        id: "assistant-1",
        companyId: "company-1",
        name: "Assistente",
        description: "Assistente de testes",
        businessAddress: null,
        businessCityRegion: null,
        googleMapsUrl: null,
        status: "ACTIVE",
        initialMessage: null,
        instructions: "Siga as regras.",
        model: "gpt-4o-mini",
        temperature: 0.2,
        ragEnabled: false,
        fallbackMessage: null,
        safetyInstruction: null,
        avoidPhrases: null,
        splitResponseEnabled: false,
        splitResponseStyle: null,
        latitude: null,
        longitude: null,
        behavior: null,
        flows: [],
      },
    ],
    conversations: [
      {
        id: "conversation-1",
        companyId: "company-1",
        assistantId: "assistant-1",
        title: "Conversa",
        source: "MANUAL_TEST",
        channelType: "UNKNOWN",
        sourceProvider: null,
        externalConversationId: null,
        externalAccountId: null,
        externalContactId: null,
        externalChannelId: null,
        externalInboxId: null,
        pausedByHuman: false,
        lastMessageAt: now,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    messages: [],
    logs: [],
    runtimeLogs: [],
    ...overrides,
  };
}

function createMockPrisma(state) {
  const prisma = {
    $transaction: async (callback) => callback({
      assistantConversation: prisma.assistantConversation,
      assistantConversationMessage: prisma.assistantConversationMessage,
      assistantRuntimeLog: prisma.assistantRuntimeLog,
    }),
    app: {
      findUnique: async ({ where }) =>
        state.apps.find((app) => app.slug === where.slug || app.id === where.id) ?? null,
      findFirst: async ({ where }) =>
        state.apps.find(
          (app) =>
            (!where?.slug || app.slug === where.slug) &&
            (!where?.id || app.id === where.id),
        ) ?? null,
    },
    appInstallation: {
      findFirst: async ({ where }) =>
        state.installations.find(
          (item) =>
            (!where.companyId || item.companyId === where.companyId) &&
            (!where.appId || item.appId === where.appId),
        ) ?? null,
    },
    appCredential: {
      findFirst: async ({ where }) =>
        state.credentials.find(
          (item) =>
            (!where.companyId || item.companyId === where.companyId) &&
            (!where.installationId || item.installationId === where.installationId) &&
            (!where.provider || item.provider === where.provider) &&
            (!where.status || item.status === where.status),
        ) ?? null,
    },
    googleCalendarResource: {
      findFirst: async ({ where }) =>
        state.resources.find(
          (item) =>
            (!where.id || item.id === where.id) &&
            (!where.companyId || item.companyId === where.companyId) &&
            (!where.installationId || item.installationId === where.installationId) &&
            (!where.active || item.active === where.active),
        ) ?? null,
      findMany: async ({ where }) =>
        state.resources.filter(
          (item) =>
            (!where.companyId || item.companyId === where.companyId) &&
            (!where.installationId || item.installationId === where.installationId) &&
            (!where.active || item.active === where.active),
        ),
    },
    googleCalendarBooking: {
      findFirst: async () => null,
    },
    appActionLog: {
      create: async ({ data }) => {
        state.logs.push({ ...data });
        return data;
      },
    },
    assistant: {
      findFirst: async ({ where }) =>
        state.assistants.find(
          (item) =>
            (!where.id || item.id === where.id) &&
            (!where.companyId || item.companyId === where.companyId),
        ) ?? null,
    },
    assistantKnowledge: {
      findMany: async () => [],
    },
    assistantConversation: {
      findFirst: async ({ where }) =>
        state.conversations.find(
          (item) =>
            (!where.id || item.id === where.id) &&
            (!where.assistantId || item.assistantId === where.assistantId) &&
            (!where.companyId || item.companyId === where.companyId),
        ) ?? null,
      update: async ({ where, data }) => {
        const conversation = state.conversations.find((item) => item.id === where.id);
        Object.assign(conversation, data);
        return conversation;
      },
    },
    assistantConversationMessage: {
      create: async ({ data, select }) => {
        const item = {
          id: `message-${state.messages.length + 1}`,
          createdAt: now,
          attachments: null,
          sources: data.sources ?? null,
          mode: data.mode ?? null,
          externalPayload: data.externalPayload ?? null,
          externalMessageId: null,
          messageType: null,
          source: data.source ?? null,
          ...data,
        };
        state.messages.push(item);
        return select ? item : item;
      },
      update: async ({ where, data, select }) => {
        const item = state.messages.find((message) => message.id === where.id);
        if (!item) {
          return null;
        }
        Object.assign(item, data);
        return select ? item : item;
      },
      findMany: async ({ where }) =>
        state.messages.filter(
          (item) =>
            (!where?.conversationId || item.conversationId === where.conversationId) &&
            (!where?.companyId || item.companyId === where.companyId),
        ),
      findFirst: async ({ where }) =>
        [...state.messages]
          .reverse()
          .find(
            (item) =>
              (!where?.conversationId || item.conversationId === where.conversationId) &&
              (!where?.companyId || item.companyId === where.companyId) &&
              (!where?.role || item.role === where.role),
          ) ?? null,
    },
    assistantRuntimeLog: {
      create: async ({ data }) => {
        const runtimeLog = { id: `runtime-log-${state.runtimeLogs.length + 1}`, ...data };
        state.runtimeLogs.push(runtimeLog);
        return runtimeLog;
      },
    },
  };

  return prisma;
}

function createServices(state, options = {}) {
  const prisma = createMockPrisma(state);
  const aiCalls = [];
  const toolCalls = [];
  const aiResponses = options.aiResponses ? [...options.aiResponses] : [];

  const aiService = {
    resolveRuntimeConfig: async () => ({
      runtimeEnabled: true,
      provider: "openai",
      source: "env-fallback",
    }),
    isProviderConfigured: async () => true,
    generateChatCompletion: async (payload) => {
      aiCalls.push(payload);
      const next = aiResponses.shift();
      return next ?? { answer: "ok", provider: "openai", model: "gpt-4o-mini" };
    },
  };

  const calendarToolsService = {
    checkAvailability: async ({ dto }) => {
      toolCalls.push({ toolName: "calendar_checkAvailability", args: dto });
      const optionsByCategory =
        dto.category === "Padel"
          ? [{ resourceId: "resource-padel-1", resourceName: "Padel Quadra 03", calendarId: "padel-1@example.com", startAt: "2026-07-07T22:00:00.000Z", endAt: "2026-07-07T23:00:00.000Z", label: "Padel Quadra 03 às 19:00" }]
          : dto.category === "Beach Tennis"
            ? [{ resourceId: "resource-beach-1", resourceName: "Beach Quadra 01", calendarId: "beach-1@example.com", startAt: "2026-07-07T22:00:00.000Z", endAt: "2026-07-07T23:00:00.000Z", label: "Beach Quadra 01 às 19:00" }]
            : [];
      return {
        available: optionsByCategory.length > 0,
        date: dto.date,
        durationMinutes: dto.durationMinutes ?? 60,
        options: optionsByCategory,
      };
    },
    createBooking: async ({ dto }) => {
      toolCalls.push({ toolName: "calendar_createBooking", args: dto });
      return { success: true, bookingId: "booking-1", status: "CONFIRMED" };
    },
    getBookingsByContact: async () => ({ bookings: [] }),
    rescheduleBooking: async () => ({ success: true }),
    cancelBooking: async () => ({ success: true }),
  };

  const assistantKnowledgeRetrievalService = {
    searchRelevantKnowledge: async () => ({ totalChunksScanned: 0, warning: null, results: [] }),
  };

  const promptCompilerService = new PromptCompilerService();
  const intentRouterService = {
    route: async ({ message, flows }) => {
      const lower = message.toLowerCase();
      const flow =
        flows.find((item) => {
          const keywords = item.triggerKeywords ? JSON.parse(item.triggerKeywords) : [];
          return keywords.some((keyword) => lower.includes(String(keyword).toLowerCase()));
        }) ?? flows[0] ?? null;

      return {
        flowId: flow?.id ?? null,
        flowName: flow?.name ?? null,
        confidence: flow ? 1 : 0,
        reason: flow ? "keyword match" : "fallback",
      };
    },
  };

  const service = new AssistantConversationsService(
    prisma,
    aiService,
    { buildRuntimeInputText: ({ rawText }) => rawText || "" },
    {},
    calendarToolsService,
    assistantKnowledgeRetrievalService,
    promptCompilerService,
    intentRouterService,
  );

  return { service, state, aiCalls, toolCalls };
}

const user = {
  companyId: "company-1",
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  roles: [],
  permissions: ["assistants:write"],
};

const tenant = { companyId: "company-1" };

test("Fase 1.6 aplica escopo de Padel e filtra resourcesContext", async () => {
  const state = createState();
  state.assistants[0].flows = [
    createFlow({
      id: "flow-padel",
      name: "Agendamento Padel",
      triggerKeywords: ["padel"],
      allowedToolSlugs: ["calendar_checkAvailability"],
      toolContext: {
        calendar: {
          category: "Padel",
          sportType: "Padel",
          resourceType: "quadra",
          durationMinutes: 60,
        },
      },
    }),
  ];

  const { service, aiCalls, toolCalls, state: runtimeState } = createServices(state, {
    aiResponses: [
      {
        answer: "",
        provider: "openai",
        model: "gpt-4o-mini",
        toolCalls: [
          {
            id: "tool-1",
            function: {
              name: "calendar_checkAvailability",
              arguments: JSON.stringify({
                date: "2026-07-07",
                timeFrom: "19:00",
                timeTo: "22:00",
              }),
            },
          },
        ],
      },
      {
        answer: "Tem Padel Quadra 03 hoje às 19h.",
        provider: "openai",
        model: "gpt-4o-mini",
      },
    ],
  });

  const response = await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: { message: "Tem quadra de padel hoje às 19h?" },
    user,
    tenant,
  });

  assert.equal(response.assistantMessage.content, "Tem Padel Quadra 03 hoje às 19h.");
  assert.equal(toolCalls[0].args.category, "Padel");
  assert.equal(toolCalls[0].args.sportType, "Padel");
  assert.equal(toolCalls[0].args.resourceType, "quadra");

  const promptText = aiCalls[0].messages.map((message) => message.content ?? "").join("\n");
  assert.match(promptText, /Padel Quadra 03/);
  assert.doesNotMatch(promptText, /Beach Quadra 01/);

  const requestLog = runtimeState.logs.find((item) => item.action === "tool_call_requested");
  assert.equal(requestLog.metadata.calendarScopeApplied, true);
  assert.equal(requestLog.metadata.toolArgsOverridden, true);
});

test("Fase 1.6 aplica escopo de Beach Tennis", async () => {
  const state = createState();
  state.assistants[0].flows = [
    createFlow({
      id: "flow-beach",
      name: "Agendamento Beach Tennis",
      triggerKeywords: ["beach"],
      allowedToolSlugs: ["calendar_checkAvailability"],
      toolContext: {
        calendar: {
          category: "Beach Tennis",
          sportType: "Beach Tennis",
          resourceType: "quadra",
        },
      },
    }),
  ];

  const { service, aiCalls, toolCalls } = createServices(state, {
    aiResponses: [
      {
        answer: "",
        provider: "openai",
        model: "gpt-4o-mini",
        toolCalls: [
          {
            id: "tool-2",
            function: {
              name: "calendar_checkAvailability",
              arguments: JSON.stringify({
                date: "2026-07-07",
                timeFrom: "19:00",
                timeTo: "22:00",
              }),
            },
          },
        ],
      },
      {
        answer: "Tem Beach Quadra 01 hoje às 19h.",
        provider: "openai",
        model: "gpt-4o-mini",
      },
    ],
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: { message: "Tem quadra de beach hoje às 19h?" },
    user,
    tenant,
  });

  assert.equal(toolCalls[0].args.category, "Beach Tennis");
  const promptText = aiCalls[0].messages.map((message) => message.content ?? "").join("\n");
  assert.match(promptText, /Beach Quadra 01/);
  assert.doesNotMatch(promptText, /Padel Quadra 03/);
});

test("Fase 1.6 sobrescreve duração no fluxo Ranking Padel", async () => {
  const state = createState();
  state.assistants[0].flows = [
    createFlow({
      id: "flow-ranking",
      name: "Ranking Padel",
      triggerKeywords: ["ranking"],
      allowedToolSlugs: ["calendar_checkAvailability"],
      toolContext: {
        calendar: {
          category: "Padel",
          sportType: "Padel",
          durationMinutes: 120,
        },
      },
    }),
  ];

  const { service, toolCalls } = createServices(state, {
    aiResponses: [
      {
        answer: "",
        provider: "openai",
        model: "gpt-4o-mini",
        toolCalls: [
          {
            id: "tool-3",
            function: {
              name: "calendar_checkAvailability",
              arguments: JSON.stringify({
                date: "2026-07-08",
                timeFrom: "19:00",
                timeTo: "22:00",
                durationMinutes: 60,
              }),
            },
          },
        ],
      },
      { answer: "Tem horário para ranking de padel.", provider: "openai", model: "gpt-4o-mini" },
    ],
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: { message: "Tem ranking de padel amanhã?" },
    user,
    tenant,
  });

  assert.equal(toolCalls[0].args.durationMinutes, 120);
  assert.equal(toolCalls[0].args.category, "Padel");
});

test("Fase 1.6 bloqueia createBooking fora do escopo do fluxo", async () => {
  const state = createState();
  state.assistants[0].flows = [
    createFlow({
      id: "flow-padel-booking",
      name: "Agendamento Padel",
      triggerKeywords: ["padel"],
      allowedToolSlugs: ["calendar_createBooking"],
      toolContext: {
        calendar: {
          category: "Padel",
          sportType: "Padel",
        },
      },
    }),
  ];

  const { service, state: runtimeState } = createServices(state, {
    aiResponses: [
      {
        answer: "",
        provider: "openai",
        model: "gpt-4o-mini",
        toolCalls: [
          {
            id: "tool-4",
            function: {
              name: "calendar_createBooking",
              arguments: JSON.stringify({
                resourceId: "resource-beach-1",
                contactName: "João",
                contactPhone: "67999999999",
                startAt: "2026-07-07T22:00:00.000Z",
                endAt: "2026-07-07T23:00:00.000Z",
              }),
            },
          },
        ],
      },
      { answer: "Nao posso confirmar essa reserva nesse fluxo.", provider: "openai", model: "gpt-4o-mini" },
    ],
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: { message: "Sim, pode reservar no beach" },
    user,
    tenant,
  });

  const blockedLog = runtimeState.logs.find((item) => item.action === "tool_call_blocked_by_scope");
  assert.ok(blockedLog);
  assert.equal(blockedLog.metadata.blockedByToolScope, true);
  assert.match(blockedLog.metadata.blockReason, /outside selected flow calendar scope/);
});

test("Fluxo Aulas limita tools e nao expõe calendar_createBooking", async () => {
  const state = createState();
  state.assistants[0].flows = [
    createFlow({
      id: "flow-aulas",
      name: "Aulas",
      triggerKeywords: ["aula"],
      allowedToolSlugs: ["calendar_checkAvailability"],
    }),
  ];

  const { service, aiCalls } = createServices(state, {
    aiResponses: [{ answer: "Posso verificar horários para aula.", provider: "openai", model: "gpt-4o-mini" }],
  });

  await service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: { message: "Quero aula hoje" },
    user,
    tenant,
  });

  const toolNames = (aiCalls[0].tools ?? []).map((item) => item.function.name);
  assert.deepEqual(toolNames, ["calendar_checkAvailability"]);
});

test("Fluxo fixed_message e fluxo financeiro handoff continuam sem LLM nem tool", async () => {
  const goomerState = createState();
  goomerState.assistants[0].flows = [
    createFlow({
      id: "flow-goomer",
      name: "Goomer Delivery",
      triggerKeywords: ["delivery"],
      finalAction: "fixed_message",
      fixedMessage: "Pedidos pelo delivery seguem por outro canal.",
    }),
  ];

  const goomer = createServices(goomerState);
  const goomerResponse = await goomer.service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: { message: "delivery" },
    user,
    tenant,
  });

  assert.equal(goomerResponse.assistantMessage.content, "Pedidos pelo delivery seguem por outro canal.");
  assert.equal(goomer.aiCalls.length, 0);
  assert.equal(goomer.state.logs.length, 0);

  const financeiroState = createState();
  financeiroState.assistants[0].flows = [
    createFlow({
      id: "flow-financeiro",
      name: "Financeiro",
      triggerKeywords: ["financeiro"],
      finalAction: "handoff",
      autoRespond: false,
      requiresHuman: true,
    }),
  ];

  const financeiro = createServices(financeiroState);
  const financeiroResponse = await financeiro.service.sendMessage({
    assistantId: "assistant-1",
    conversationId: "conversation-1",
    dto: { message: "financeiro" },
    user,
    tenant,
  });

  assert.equal(financeiroResponse.assistantMessage.content, "Transferindo para um atendente...");
  assert.equal(financeiro.aiCalls.length, 0);
  assert.equal(financeiro.state.logs.length, 0);
});
