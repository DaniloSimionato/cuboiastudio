const RealDate = globalThis.Date;
const MOCK_TIME = new RealDate("2026-07-04T00:00:00.000Z").getTime();
class MockDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(MOCK_TIME);
    } else {
      super(...args);
    }
  }
}
MockDate.now = () => MOCK_TIME;
globalThis.Date = MockDate;

import assert from "node:assert/strict";
import { randomBytes, createCipheriv } from "node:crypto";
import { test } from "node:test";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";
import { AiService } from "../dist/ai/ai.service.js";
import { GoogleCalendarAvailabilityService } from "../dist/apps/google-calendar/google-calendar-availability.service.js";
import { GoogleCalendarBookingService } from "../dist/apps/google-calendar/google-calendar-booking.service.js";
import { CalendarToolsService } from "../dist/apps/calendar-tools.service.js";
import { GoogleCalendarOAuthService } from "../dist/apps/google-calendar/google-calendar-oauth.service.js";
import { GoogleCalendarClientService } from "../dist/apps/google-calendar/google-calendar-client.service.js";

const now = new Date("2026-01-01T12:00:00.000Z");
const encryptionKey = randomBytes(32).toString("hex");

function createConfig() {
  return {
    get: (key) => {
      if (key === "ENCRYPTION_KEY" || key === "APP_ENCRYPTION_KEY") return encryptionKey;
      if (key === "GOOGLE_CLIENT_ID") return "mock-id";
      if (key === "GOOGLE_CLIENT_SECRET") return "mock-secret";
      if (key === "GOOGLE_CALENDAR_REDIRECT_URI") return "http://localhost";
      return "";
    },
  };
}

function encryptToken(token) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(encryptionKey, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedToken: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

function createJsonResponse(payload, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

let fetchMockHandler = null;
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, init) => {
  if (fetchMockHandler) {
    return fetchMockHandler(String(url), init);
  }
  return createJsonResponse({ error: "no mock handler set" }, false, 500);
};

function createMockPrisma() {
  const state = {
    apps: [
      {
        id: "app-google-calendar",
        slug: "google_calendar",
        name: "Google Agenda",
        description: "Google Agenda integration",
        status: "ACTIVE",
        metadata: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    installations: [],
    credentials: [],
    resources: [],
    bookings: [],
    logs: [],
    assistants: [
      {
        id: "assistant-1",
        companyId: "company-1",
        name: "Assistente 1",
        description: "Descrição",
        instructions: "Instruções do assistente",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
        company: {
          name: "Mock Company",
          timezone: "America/Sao_Paulo",
        },
      },
    ],
    conversations: [
      {
        id: "conversation-1",
        companyId: "company-1",
        assistantId: "assistant-1",
        title: "Conversa 1",
        source: "MANUAL_TEST",
        channelType: "MANUAL",
        createdAt: now,
        updatedAt: now,
      },
    ],
    messages: [],
    knowledge: [],
  };

  function shapeInstallation(installation) {
    const app = state.apps.find((item) => item.id === installation.appId);
    const credentials = state.credentials.filter(
      (credential) => credential.installationId === installation.id,
    );

    return {
      ...installation,
      app,
      credentials,
    };
  }

  function shapeBooking(booking) {
    const resource = state.resources.find((item) => item.id === booking.resourceId) || {
      id: booking.resourceId,
      name: "Resource Mock",
      calendarId: "mock-calendar@example.com",
      timezone: "America/Campo_Grande",
    };
    return {
      ...booking,
      resource: {
        id: resource.id,
        name: resource.name,
        calendarId: resource.calendarId,
        timezone: resource.timezone,
      },
    };
  }

  const prisma = {
    $transaction: async (callback) => callback(prisma),
    app: {
      findUnique: async ({ where }) =>
        state.apps.find((app) => app.slug === where.slug || app.id === where.id) ?? null,
      findFirst: async ({ where }) =>
        state.apps.find((app) => app.slug === where.slug || app.id === where.id) ?? null,
    },
    appInstallation: {
      findMany: async ({ where }) =>
        state.installations
          .filter(
            (installation) =>
              !where || !where.companyId || installation.companyId === where.companyId,
          )
          .map(shapeInstallation),
      findUnique: async ({ where }) => {
        const input = where.companyId_appId;
        const installation =
          state.installations.find(
            (item) => item.companyId === input.companyId && item.appId === input.appId,
          ) ?? null;
        return installation ? shapeInstallation(installation) : null;
      },
      findFirst: async ({ where }) =>
        state.installations.find(
          (item) =>
            (!where.id || item.id === where.id) &&
            (!where.companyId || item.companyId === where.companyId) &&
            (!where.appId || item.appId === where.appId),
        ) ?? null,
      create: async ({ data }) => {
        const installation = {
          id: `installation-${state.installations.length + 1}`,
          ...data,
          lastErrorCode: null,
          lastErrorMessage: null,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        };
        state.installations.push(installation);
        return shapeInstallation(installation);
      },
      upsert: async ({ where, update, create }) => {
        const input = where.companyId_appId;
        let installation = state.installations.find(
          (item) => item.companyId === input.companyId && item.appId === input.appId,
        );

        if (installation) {
          Object.assign(installation, update, { updatedAt: now });
        } else {
          installation = {
            id: `installation-${state.installations.length + 1}`,
            ...create,
            lastErrorCode: null,
            lastErrorMessage: null,
            metadata: null,
            createdAt: now,
            updatedAt: now,
          };
          state.installations.push(installation);
        }

        return shapeInstallation(installation);
      },
    },
    appCredential: {
      findFirst: async ({ where }) =>
        state.credentials.find(
          (credential) =>
            (!where.companyId || credential.companyId === where.companyId) &&
            (!where.installationId ||
              (typeof where.installationId === "object" && where.installationId.in
                ? where.installationId.in.includes(credential.installationId)
                : credential.installationId === where.installationId)) &&
            (!where.provider || credential.provider === where.provider) &&
            (!where.status || credential.status === where.status),
        ) ?? null,
      create: async ({ data }) => {
        const credential = {
          id: `credential-${state.credentials.length + 1}`,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        state.credentials.push(credential);
        return credential;
      },
    },
    googleCalendarResource: {
      findFirst: async ({ where }) => {
        const found = state.resources.find(
          (resource) =>
            (!where.id || resource.id === where.id) &&
            (!where.companyId || resource.companyId === where.companyId) &&
            (!where.active || resource.active === where.active),
        );
        return found ? { ...found, installation: { appId: "app-google-calendar" } } : null;
      },
      findMany: async ({ where }) =>
        state.resources
          .filter(
            (resource) =>
              (!where.companyId || resource.companyId === where.companyId) &&
              (!where.active || resource.active === where.active),
          )
          .map((found) => ({ ...found, installation: { appId: "app-google-calendar" } })),
      create: async ({ data }) => {
        const resource = {
          id: `resource-${state.resources.length + 1}`,
          metadata: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        state.resources.push(resource);
        return { ...resource, installation: { appId: "app-google-calendar" } };
      },
    },
    googleCalendarBooking: {
      findMany: async ({ where }) => {
        let items = state.bookings;
        if (where) {
          if (where.companyId) {
            items = items.filter((b) => b.companyId === where.companyId);
          }
          if (where.resourceId) {
            items = items.filter((b) => b.resourceId === where.resourceId);
          }
          if (where.status) {
            items = items.filter((b) => b.status === where.status);
          }
          if (where.startAt) {
            if (where.startAt.lt) {
              items = items.filter((b) => b.startAt < where.startAt.lt);
            }
          }
          if (where.endAt) {
            if (where.endAt.gt) {
              items = items.filter((b) => b.endAt > where.endAt.gt);
            }
          }
        }
        return items.map(shapeBooking);
      },
      findFirst: async ({ where }) => {
        let items = state.bookings;
        if (where) {
          if (where.id) {
            items = items.filter((b) => b.id === where.id);
          }
          if (where.companyId) {
            items = items.filter((b) => b.companyId === where.companyId);
          }
          if (where.idempotencyKey) {
            items = items.filter((b) => b.idempotencyKey === where.idempotencyKey);
          }
          if (where.status) {
            items = items.filter((b) => b.status === where.status);
          }
        }
        return items.length > 0 ? shapeBooking(items[0]) : null;
      },
      create: async ({ data }) => {
        const booking = {
          id: `booking-${state.bookings.length + 1}`,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        state.bookings.push(booking);
        return shapeBooking(booking);
      },
      update: async ({ where, data }) => {
        const booking = state.bookings.find((item) => item.id === where.id);
        if (!booking) throw new Error("Booking not found in mock Prisma update");
        Object.assign(booking, data, { updatedAt: now });
        return shapeBooking(booking);
      },
    },
    appActionLog: {
      create: async ({ data }) => {
        state.logs.push({ id: `log-${state.logs.length + 1}`, ...data, createdAt: now });
        return state.logs.at(-1);
      },
    },
    assistant: {
      findFirst: async ({ where }) => {
        return (
          state.assistants.find((a) => a.id === where.id && a.companyId === where.companyId) ?? null
        );
      },
    },
    assistantToolConfig: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    assistantConversation: {
      findFirst: async ({ where }) => {
        return (
          state.conversations.find((c) => c.id === where.id && c.companyId === where.companyId) ??
          null
        );
      },
      update: async ({ where, data }) => {
        const conversation = state.conversations.find((c) => c.id === where.id);
        Object.assign(conversation, data, { updatedAt: now });
        return conversation;
      },
    },
    assistantConversationMessage: {
      create: async ({ data }) => {
        const msg = {
          id: `message-${state.messages.length + 1}`,
          createdAt: new Date(),
          sources: null,
          mode: null,
          ...data,
        };
        state.messages.push(msg);
        return msg;
      },
      update: async ({ where, data }) => {
        const msg = state.messages.find((m) => m.id === where.id);
        Object.assign(msg, data);
        return msg;
      },
      findFirst: async ({ where }) => {
        let items = state.messages;
        if (where) {
          if (where.conversationId)
            items = items.filter((m) => m.conversationId === where.conversationId);
          if (where.companyId) items = items.filter((m) => m.companyId === where.companyId);
          if (where.role) items = items.filter((m) => m.role === where.role);
        }
        return items.length > 0 ? items[items.length - 1] : null;
      },
      findMany: async ({ where }) => {
        let items = state.messages;
        if (where) {
          if (where.conversationId)
            items = items.filter((m) => m.conversationId === where.conversationId);
          if (where.companyId) items = items.filter((m) => m.companyId === where.companyId);
        }
        return items;
      },
    },
    assistantRuntimeLog: {
      create: async ({ data }) => {
        return {
          id: `runtime-log-${state.messages.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
      },
    },
    assistantKnowledge: {
      findMany: async () => [],
    },
  };

  return { prisma, state };
}

function createMockAiService() {
  const aiSettingsService = {
    resolveRuntimeConfig: async () => ({
      runtimeEnabled: true,
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
      apiKey: "key-123",
      requestTimeoutMs: 10000,
      source: "env-fallback",
      tenantSettingsConfigured: false,
      envFallbackConfigured: true,
      apiKeyConfigured: true,
    }),
    isRuntimeEnabled: async () => true,
    getStatus: async () => ({
      runtimeEnabled: true,
      provider: "openai",
      baseUrlConfigured: true,
      modelConfigured: true,
      apiKeyConfigured: true,
      source: "env-fallback",
      tenantSettingsConfigured: false,
      envFallbackConfigured: true,
      mode: "deterministic-fallback",
    }),
  };
  return new AiService(aiSettingsService);
}

function createDummyInterpreter() {
  return {
    processAttachment: async () => ({
      processingStatus: "completed",
      extractedText: "Mock",
      interpretedSummary: "Mock summary",
      transcript: null,
      processingError: null,
      metadataJson: {},
    }),
    buildRuntimeInputText: (input) => {
      return input.rawText || "";
    },
  };
}

function createDummyKnowledgeRetrieval() {
  return {
    searchRelevantKnowledge: async () => ({
      totalChunksScanned: 0,
      warning: null,
      results: [],
    }),
  };
}

function createDummyPromptCompiler() {
  return {
    compile: ({ assistant, historyMessages, currentMessage, knowledgeItems, calendarContext }) => {
      const messages = [
        {
          role: "system",
          content: assistant.instructions ?? "Responda objetivamente.",
        },
      ];

      if (calendarContext) {
        messages.push({
          role: "system",
          content: `Contexto de calendario\n${calendarContext.resourcesContext ?? ""}`.trim(),
        });
      }

      for (const item of knowledgeItems ?? []) {
        messages.push({
          role: "system",
          content: `${item.title}: ${item.content}`,
        });
      }

      for (const message of historyMessages ?? []) {
        messages.push({
          role: message.role,
          content: message.content,
        });
      }

      messages.push({
        role: "user",
        content: currentMessage,
      });

      return messages;
    },
  };
}

function createDummyIntentRouter() {
  return {
    route: async () => ({
      flowId: null,
      flowName: null,
      confidence: 0,
      reason: "No flows available",
    }),
  };
}

async function setupTestEnv(stateInput = null) {
  const { prisma, state } = createMockPrisma();
  if (stateInput) {
    Object.assign(state, stateInput);
  }
  const aiService = createMockAiService();
  const interpreter = createDummyInterpreter();
  const chatwootInbox = {};
  const knowledgeRetrieval = createDummyKnowledgeRetrieval();
  const promptCompiler = createDummyPromptCompiler();
  const intentRouter = createDummyIntentRouter();

  const oauth = new GoogleCalendarOAuthService(prisma, createConfig(), globalThis.fetch);
  const availability = new GoogleCalendarAvailabilityService(prisma, oauth, globalThis.fetch);
  const booking = new GoogleCalendarBookingService(prisma, oauth, availability, globalThis.fetch);
  const calendarTools = new CalendarToolsService(availability, booking);

  const service = new AssistantConversationsService(
    prisma,
    aiService,
    interpreter,
    chatwootInbox,
    calendarTools,
    knowledgeRetrieval,
    promptCompiler,
    intentRouter,
  );

  return { prisma, state, service, oauth, calendarTools };
}

async function enableGoogleCalendar(prisma, state, companyId = "company-1") {
  const app = { id: "app-google-calendar" };
  const installation = await prisma.appInstallation.upsert({
    where: { companyId_appId: { companyId, appId: app.id } },
    update: { status: "ACTIVE" },
    create: { companyId, appId: app.id, status: "ACTIVE" },
  });

  const encryptedAccess = encryptToken("mock-access-token");
  const encryptedRefresh = encryptToken("mock-refresh-token");

  await prisma.appCredential.create({
    data: {
      companyId,
      installationId: installation.id,
      provider: "google",
      status: "ACTIVE",
      encryptedAccessToken: encryptedAccess.encryptedToken,
      accessTokenIv: encryptedAccess.iv,
      accessTokenAuthTag: encryptedAccess.authTag,
      encryptedRefreshToken: encryptedRefresh.encryptedToken,
      refreshTokenIv: encryptedRefresh.iv,
      refreshTokenAuthTag: encryptedRefresh.authTag,
      providerAccountEmail: "admin@example.com",
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
  });

  const resource = await prisma.googleCalendarResource.create({
    data: {
      companyId,
      installationId: installation.id,
      calendarId: "quadra-1@example.com",
      name: "Quadra 1",
      resourceType: "quadra",
      sportType: "beach_tennis",
      slotMinutes: 30,
      defaultDurationMinutes: 60,
      active: true,
      timezone: "America/Campo_Grande",
      minAdvanceMinutes: 0,
      maxDaysAhead: 30,
    },
  });

  return { installation, resource };
}

test("Assistant Calendar Tools Integration Suite", async (t) => {
  await t.test(
    "runtime não disponibiliza tools quando Google Agenda não está instalado",
    async () => {
      const { service } = await setupTestEnv();

      let receivedTools = null;
      fetchMockHandler = async (url, init) => {
        if (url.includes("chat/completions")) {
          const payload = JSON.parse(init.body);
          receivedTools = payload.tools;
          return createJsonResponse({
            choices: [{ message: { content: "Olá!" } }],
          });
        }
      };

      await service.sendMessage({
        assistantId: "assistant-1",
        conversationId: "conversation-1",
        dto: { message: "Oi, tudo bem?" },
        user: {
          companyId: "company-1",
          id: "user-1",
          email: "a@a.com",
          name: "User",
          roles: [],
          permissions: ["assistants:write"],
        },
        tenant: { companyId: "company-1" },
      });

      assert.equal(receivedTools, undefined);
    },
  );

  await t.test(
    "runtime não disponibiliza tools quando Google Agenda está desconectado",
    async () => {
      const { prisma, service } = await setupTestEnv();

      await prisma.appInstallation.upsert({
        where: { companyId_appId: { companyId: "company-1", appId: "app-google-calendar" } },
        update: {},
        create: { companyId: "company-1", appId: "app-google-calendar", status: "INACTIVE" },
      });

      let receivedTools = null;
      fetchMockHandler = async (url, init) => {
        if (url.includes("chat/completions")) {
          const payload = JSON.parse(init.body);
          receivedTools = payload.tools;
          return createJsonResponse({
            choices: [{ message: { content: "Olá!" } }],
          });
        }
      };

      await service.sendMessage({
        assistantId: "assistant-1",
        conversationId: "conversation-1",
        dto: { message: "Oi, tudo bem?" },
        user: {
          companyId: "company-1",
          id: "user-1",
          email: "a@a.com",
          name: "User",
          roles: [],
          permissions: ["assistants:write"],
        },
        tenant: { companyId: "company-1" },
      });

      assert.equal(receivedTools, undefined);
    },
  );

  await t.test(
    "runtime disponibiliza tools quando app/credencial/recurso estão ativos",
    async () => {
      const { prisma, state, service } = await setupTestEnv();
      await enableGoogleCalendar(prisma, state);

      let receivedTools = null;
      fetchMockHandler = async (url, init) => {
        if (url.includes("chat/completions")) {
          const payload = JSON.parse(init.body);
          receivedTools = payload.tools;
          return createJsonResponse({
            choices: [{ message: { content: "Claro, posso ajudar!" } }],
          });
        }
      };

      await service.sendMessage({
        assistantId: "assistant-1",
        conversationId: "conversation-1",
        dto: { message: "Oi, tudo bem?" },
        user: {
          companyId: "company-1",
          id: "user-1",
          email: "a@a.com",
          name: "User",
          roles: [],
          permissions: ["assistants:write"],
        },
        tenant: { companyId: "company-1" },
      });

      assert.ok(receivedTools);
      assert.equal(receivedTools.length, 5);
      assert.equal(receivedTools[0].function.name, "calendar_checkAvailability");
    },
  );

  await t.test("IA consegue consultar disponibilidade sem confirmação", async () => {
    const { prisma, state, service } = await setupTestEnv();
    await enableGoogleCalendar(prisma, state);

    let completionCount = 0;
    fetchMockHandler = async (url, init) => {
      if (url.includes("chat/completions")) {
        completionCount++;
        if (completionCount === 1) {
          return createJsonResponse({
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      id: "call-avail-1",
                      type: "function",
                      function: {
                        name: "calendar_checkAvailability",
                        arguments: JSON.stringify({
                          date: "2026-07-04",
                          timeFrom: "09:00",
                          timeTo: "12:00",
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          });
        }

        return createJsonResponse({
          choices: [{ message: { content: "Tem o horário das 09h livre na Quadra 1!" } }],
        });
      }

      if (url.includes("freeBusy")) {
        return createJsonResponse({
          calendars: {
            "quadra-1@example.com": { busy: [] },
          },
        });
      }
    };

    const res = await service.sendMessage({
      assistantId: "assistant-1",
      conversationId: "conversation-1",
      dto: { message: "Quais horários amanhã de manhã?" },
      user: {
        companyId: "company-1",
        id: "user-1",
        email: "a@a.com",
        name: "User",
        roles: [],
        permissions: ["assistants:write"],
      },
      tenant: { companyId: "company-1" },
    });

    assert.equal(res.assistantMessage.content, "Tem o horário das 09h livre na Quadra 1!");
    assert.equal(completionCount, 2);

    const requestLog = state.logs.find((l) => l.action === "tool_call_requested");
    const completeLog = state.logs.find((l) => l.action === "tool_call_completed");
    assert.ok(requestLog);
    assert.ok(completeLog);
    assert.equal(requestLog.metadata.toolName, "calendar_checkAvailability");
  });

  await t.test("IA não cria reserva sem confirmação explícita", async () => {
    const { prisma, state, service } = await setupTestEnv();
    await enableGoogleCalendar(prisma, state);

    let completionCount = 0;
    fetchMockHandler = async (url, init) => {
      if (url.includes("chat/completions")) {
        completionCount++;
        if (completionCount === 1) {
          return createJsonResponse({
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      id: "call-book-1",
                      type: "function",
                      function: {
                        name: "calendar_createBooking",
                        arguments: JSON.stringify({
                          resourceId: "resource-1",
                          contactName: "João",
                          contactPhone: "67999999999",
                          startAt: "2026-07-04T13:00:00.000Z",
                          endAt: "2026-07-04T14:00:00.000Z",
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          });
        }

        return createJsonResponse({
          choices: [
            {
              message: {
                content: "Você confirma a reserva da Quadra 1 amanhã às 13:00 em nome de João?",
              },
            },
          ],
        });
      }
    };

    const res = await service.sendMessage({
      assistantId: "assistant-1",
      conversationId: "conversation-1",
      dto: { message: "Quero agendar uma quadra amanhã às 13h no nome de João" },
      user: {
        companyId: "company-1",
        id: "user-1",
        email: "a@a.com",
        name: "User",
        roles: [],
        permissions: ["assistants:write"],
      },
      tenant: { companyId: "company-1" },
    });

    assert.equal(
      res.assistantMessage.content,
      "Você confirma a reserva da Quadra 1 amanhã às 13:00 em nome de João?",
    );
    assert.equal(completionCount, 2);

    const missingLog = state.logs.find((l) => l.action === "confirmation_missing");
    assert.ok(missingLog);
  });

  await t.test("IA cria reserva após confirmação explícita", async () => {
    const { prisma, state, service } = await setupTestEnv();
    const { resource } = await enableGoogleCalendar(prisma, state);

    let completionCount = 0;
    fetchMockHandler = async (url, init) => {
      if (url.includes("chat/completions")) {
        completionCount++;
        if (completionCount === 1) {
          return createJsonResponse({
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      id: "call-book-2",
                      type: "function",
                      function: {
                        name: "calendar_createBooking",
                        arguments: JSON.stringify({
                          resourceId: resource.id,
                          contactName: "João",
                          contactPhone: "67999999999",
                          startAt: "2026-07-04T13:00:00.000Z",
                          endAt: "2026-07-04T14:00:00.000Z",
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          });
        }

        return createJsonResponse({
          choices: [{ message: { content: "Reserva confirmada com sucesso!" } }],
        });
      }

      if (url.includes("freeBusy")) {
        return createJsonResponse({ calendars: { "quadra-1@example.com": { busy: [] } } });
      }

      if (url.includes("/events")) {
        return createJsonResponse({ id: "google-event-123" });
      }
    };

    const res = await service.sendMessage({
      assistantId: "assistant-1",
      conversationId: "conversation-1",
      dto: { message: "Sim, pode confirmar" },
      user: {
        companyId: "company-1",
        id: "user-1",
        email: "a@a.com",
        name: "User",
        roles: [],
        permissions: ["assistants:write"],
      },
      tenant: { companyId: "company-1" },
    });

    assert.equal(res.assistantMessage.content, "Reserva confirmada com sucesso!");
    assert.equal(completionCount, 2);

    const receivedLog = state.logs.find((l) => l.action === "confirmation_received");
    const completedLog = state.logs.find((l) => l.action === "tool_call_completed");
    assert.ok(receivedLog);
    assert.ok(completedLog);
  });

  await t.test("IA não remarca sem confirmação", async () => {
    const { prisma, state, service } = await setupTestEnv();
    await enableGoogleCalendar(prisma, state);

    let completionCount = 0;
    fetchMockHandler = async (url, init) => {
      if (url.includes("chat/completions")) {
        completionCount++;
        if (completionCount === 1) {
          return createJsonResponse({
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      id: "call-resched-1",
                      type: "function",
                      function: {
                        name: "calendar_rescheduleBooking",
                        arguments: JSON.stringify({
                          bookingId: "booking-1",
                          newStartAt: "2026-07-04T15:00:00.000Z",
                          newEndAt: "2026-07-04T16:00:00.000Z",
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          });
        }
        return createJsonResponse({
          choices: [{ message: { content: "Você deseja remarcar para às 15h?" } }],
        });
      }
    };

    await service.sendMessage({
      assistantId: "assistant-1",
      conversationId: "conversation-1",
      dto: { message: "Remarque para depois, por favor" },
      user: {
        companyId: "company-1",
        id: "user-1",
        email: "a@a.com",
        name: "User",
        roles: [],
        permissions: ["assistants:write"],
      },
      tenant: { companyId: "company-1" },
    });

    const missingLog = state.logs.find(
      (l) =>
        l.action === "confirmation_missing" && l.metadata.toolName === "calendar_rescheduleBooking",
    );
    assert.ok(missingLog);
  });

  await t.test("IA não cancela sem confirmação", async () => {
    const { prisma, state, service } = await setupTestEnv();
    await enableGoogleCalendar(prisma, state);

    let completionCount = 0;
    fetchMockHandler = async (url, init) => {
      if (url.includes("chat/completions")) {
        completionCount++;
        if (completionCount === 1) {
          return createJsonResponse({
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      id: "call-cancel-1",
                      type: "function",
                      function: {
                        name: "calendar_cancelBooking",
                        arguments: JSON.stringify({
                          bookingId: "booking-1",
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          });
        }
        return createJsonResponse({
          choices: [{ message: { content: "Você confirma o cancelamento da reserva?" } }],
        });
      }
    };

    await service.sendMessage({
      assistantId: "assistant-1",
      conversationId: "conversation-1",
      dto: { message: "Cancele meu horário de amanhã" },
      user: {
        companyId: "company-1",
        id: "user-1",
        email: "a@a.com",
        name: "User",
        roles: [],
        permissions: ["assistants:write"],
      },
      tenant: { companyId: "company-1" },
    });

    const missingLog = state.logs.find(
      (l) =>
        l.action === "confirmation_missing" && l.metadata.toolName === "calendar_cancelBooking",
    );
    assert.ok(missingLog);
  });

  await t.test("erro de tool é sanitizado e não impede o fluxo", async () => {
    const { prisma, state, service } = await setupTestEnv();
    await enableGoogleCalendar(prisma, state);

    let completionCount = 0;
    fetchMockHandler = async (url, init) => {
      if (url.includes("chat/completions")) {
        completionCount++;
        if (completionCount === 1) {
          return createJsonResponse({
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      id: "call-avail-fail",
                      type: "function",
                      function: {
                        name: "calendar_checkAvailability",
                        arguments: JSON.stringify({
                          date: "invalid-date",
                          timeFrom: "09:00",
                          timeTo: "10:00",
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          });
        }
        return createJsonResponse({
          choices: [{ message: { content: "Desculpe, ocorreu um erro de conexão." } }],
        });
      }

      if (url.includes("freeBusy")) {
        return createJsonResponse({ error: "Invalid date parameter" }, false, 400);
      }
    };

    await service.sendMessage({
      assistantId: "assistant-1",
      conversationId: "conversation-1",
      dto: { message: "Verifique disponibilidade por favor" },
      user: {
        companyId: "company-1",
        id: "user-1",
        email: "a@a.com",
        name: "User",
        roles: [],
        permissions: ["assistants:write"],
      },
      tenant: { companyId: "company-1" },
    });

    const failedLog = state.logs.find((l) => l.action === "tool_call_failed");
    assert.ok(failedLog);
    assert.equal(failedLog.status, "ERROR");
    assert.doesNotMatch(
      JSON.stringify(failedLog.metadata),
      /google-access-token|google-refresh-token/,
    );
  });

  await t.test("logs de tool não têm tokens e metadados estão limpos", async () => {
    const { prisma, state, service } = await setupTestEnv();
    await enableGoogleCalendar(prisma, state);

    fetchMockHandler = async (url, init) => {
      if (url.includes("chat/completions")) {
        return createJsonResponse({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call-avail-log",
                    type: "function",
                    function: {
                      name: "calendar_checkAvailability",
                      arguments: JSON.stringify({
                        date: "2026-07-04",
                        timeFrom: "09:00",
                        timeTo: "10:00",
                        token: "google-access-token",
                      }),
                    },
                  },
                ],
              },
            },
          ],
        });
      }
      if (url.includes("freeBusy")) {
        return createJsonResponse({ calendars: { "quadra-1@example.com": { busy: [] } } });
      }
    };

    await service.sendMessage({
      assistantId: "assistant-1",
      conversationId: "conversation-1",
      dto: { message: "Disponibilidade" },
      user: {
        companyId: "company-1",
        id: "user-1",
        email: "a@a.com",
        name: "User",
        roles: [],
        permissions: ["assistants:write"],
      },
      tenant: { companyId: "company-1" },
    });

    const logsString = JSON.stringify(state.logs);
    assert.doesNotMatch(logsString, /google-access-token/);
  });
});
