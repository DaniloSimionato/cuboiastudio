import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, afterEach, test } from "node:test";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "../dist/app.module.js";
import { RuntimeV2ShadowIntegrationService } from "../dist/runtime-v2/index.js";

const databaseUrl = process.env.DATABASE_URL;
const expectedDatabaseName =
  process.env.RUNTIME_V2_TEST_DATABASE_NAME ?? "cubo_ai_studio_test_runtime_v2_integration";
if (!databaseUrl?.includes(expectedDatabaseName)) {
  throw new Error(`DATABASE_URL must point to ${expectedDatabaseName}`);
}

process.env.NODE_ENV = "test";
process.env.RUNTIME_V2_MODE = "SHADOW";
process.env.RUNTIME_V2_STATE_STORE = "POSTGRES";
process.env.RUNTIME_V2_SHADOW_TIMEOUT_MS = "1000";

const prisma = new PrismaClient();
const prefix = `runtime-v2-http-${randomUUID()}`;
let fixture;

let app;
const scheduledSnapshots = [];
const scheduledResults = [];
const scheduledPromises = [];

const messages = [
  "Bom dia.",
  "Quero saber o valor para formatar um Mac M1.",
  "Preciso salvar imagens e uma pasta de projeto.",
  "Vocês conseguem buscar?",
  "Qual é o endereço?",
  "Vamos continuar.",
];

function headers() {
  return {
    "content-type": "application/json",
    "x-dev-user-id": `${prefix}-user`,
    "x-dev-user-email": `${prefix}@example.test`,
    "x-dev-company-id": fixture.companyId,
    "x-dev-user-permissions": "assistants:write",
  };
}

async function postMessage(index, externalMessageId = `${prefix}-external-${index}`) {
  const response = await fetch(
    `http://127.0.0.1:${app.getHttpServer().address().port}/assistants/${fixture.assistantId}/conversations/${fixture.conversationId}/messages`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        message: messages[index] ?? messages.at(-1),
        source: "manual",
        externalMessageId,
      }),
    },
  );
  const body = await response.json();
  return { response, body };
}

async function createFixture() {
  const suffix = randomUUID();
  return {
    companyId: `${prefix}-company-${suffix}`,
    assistantId: `${prefix}-assistant-${suffix}`,
    conversationId: `${prefix}-conversation-${suffix}`,
  };
}

async function seedFixture(scope) {
  await prisma.company.create({ data: { id: scope.companyId, name: "Runtime V2 HTTP Test" } });
  await prisma.assistant.create({
    data: {
      id: scope.assistantId,
      companyId: scope.companyId,
      name: "Runtime V2 HTTP Test Assistant",
      ragEnabled: false,
      memoryEnabled: false,
      semanticMemoryEnabled: false,
    },
  });
  await prisma.assistantConversation.create({
    data: {
      id: scope.conversationId,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      source: "MANUAL_TEST",
      channelType: "UNKNOWN",
    },
  });
}

async function cleanupFixture(scope) {
  await prisma.assistantConversationStateV2Event.deleteMany({
    where: { companyId: scope.companyId },
  });
  await prisma.assistantConversationStateV2.deleteMany({ where: { companyId: scope.companyId } });
  await prisma.assistantRuntimeLog.deleteMany({ where: { companyId: scope.companyId } });
  await prisma.assistantConversationMessage.deleteMany({ where: { companyId: scope.companyId } });
  await prisma.assistantConversation.deleteMany({ where: { companyId: scope.companyId } });
  await prisma.assistant.deleteMany({ where: { companyId: scope.companyId } });
  await prisma.company.deleteMany({ where: { id: scope.companyId } });
}

async function drainShadow() {
  await app.get(RuntimeV2ShadowIntegrationService).drain();
}

async function createTestApp() {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const integration = app.get(RuntimeV2ShadowIntegrationService);
  const originalSchedule = integration.schedule.bind(integration);
  integration.schedule = (snapshot) => {
    scheduledSnapshots.push(snapshot);
    const result = originalSchedule(snapshot);
    scheduledPromises.push(result);
    result.then((value) => scheduledResults.push(value));
    return result;
  };
  await app.listen(0, "127.0.0.1");
}

beforeEach(async () => {
  await createTestApp();
  fixture = await createFixture();
  await seedFixture(fixture);
  process.env.RUNTIME_V2_SHADOW_ASSISTANT_IDS = fixture.assistantId;
  scheduledSnapshots.length = 0;
  scheduledResults.length = 0;
  scheduledPromises.length = 0;
});

afterEach(async () => {
  if (app) await app.get(RuntimeV2ShadowIntegrationService).drain();
  if (fixture) await cleanupFixture(fixture);
  if (app) await app.close();
  app = undefined;
  fixture = undefined;
});

after(async () => {
  await prisma.$disconnect();
});

test(
  "endpoint HTTP real aciona V2 shadow uma vez por mensagem e mantém o V1",
  { concurrency: false },
  async () => {
    const shadowLogIds = [];

    for (let index = 0; index < messages.length; index += 1) {
      const result = await postMessage(index);
      assert.equal(result.response.status, 201);
      assert.equal(result.body.runtime.mode, "deterministic-runtime");
      assert.equal(result.body.assistantMessage?.role, "assistant");
      assert.equal(scheduledSnapshots.length, index + 1);
      await scheduledPromises[index];
      await drainShadow();
      assert.equal(scheduledResults.length, index + 1);
      const diagnosticLogs = await prisma.assistantRuntimeLog.findMany({
        where: { companyId: fixture.companyId, mode: "runtime-v2-shadow" },
        orderBy: { createdAt: "asc" },
      });
      assert.equal(
        scheduledResults.at(-1).status,
        "COMPLETED",
        JSON.stringify({
          status: scheduledResults.at(-1).status,
          shadowErrorCode: scheduledResults.at(-1).manifest?.shadowErrorCode ?? null,
          logPersisted: scheduledResults.at(-1).logPersisted,
          metadata: diagnosticLogs.at(-1)?.metadata ?? null,
        }),
      );

      const events = await prisma.assistantConversationStateV2Event.findMany({
        where: { companyId: fixture.companyId },
        orderBy: { resultingRevision: "asc" },
      });
      const logs = await prisma.assistantRuntimeLog.findMany({
        where: { companyId: fixture.companyId, mode: "runtime-v2-shadow" },
        orderBy: { createdAt: "asc" },
      });
      assert.equal(events.length, index + 1);
      assert.equal(logs.length, index + 1);
      assert.equal(events.at(-1).conversationId, fixture.conversationId);
      assert.equal(events.at(-1).resultingRevision, index + 1);
      assert.equal(logs.at(-1).metadata.providerCalled, false);
      assert.equal(logs.at(-1).metadata.toolCalls, 0);
      assert.equal(logs.at(-1).metadata.outboundSent, false);
      assert.equal(JSON.stringify(logs.at(-1).metadata).includes(messages[index]), false);
      shadowLogIds.push(logs.at(-1).id);
    }

    const state = await prisma.assistantConversationStateV2.findUnique({
      where: {
        companyId_assistantId_conversationId_contextVersion_mode: {
          companyId: fixture.companyId,
          assistantId: fixture.assistantId,
          conversationId: fixture.conversationId,
          contextVersion: 1,
          mode: "SHADOW",
        },
      },
    });
    const parsedState = state?.stateJson;
    assert.equal(state.revision, messages.length);
    assert.equal(parsedState.objective.key, "format_mac");
    assert.ok(parsedState.confirmedFacts.storage_requirements);
    assert.equal(new Set(shadowLogIds).size, messages.length);
  },
);

test(
  "externalMessageId repetido retorna 2xx sem repetir V1 ou V2",
  { concurrency: false },
  async () => {
    const baseline = await postMessage(5, `${prefix}-external-5`);
    assert.equal(baseline.response.status, 201);
    await drainShadow();

    const beforeMessageCount = await prisma.assistantConversationMessage.count({
      where: { companyId: fixture.companyId },
    });
    const beforeEventCount = await prisma.assistantConversationStateV2Event.count({
      where: { companyId: fixture.companyId },
    });
    const beforeLogCount = await prisma.assistantRuntimeLog.count({
      where: { companyId: fixture.companyId, mode: "runtime-v2-shadow" },
    });
    const beforeState = await prisma.assistantConversationStateV2.findFirst({
      where: { companyId: fixture.companyId },
      select: { revision: true },
    });

    const duplicate = await postMessage(5, `${prefix}-external-5`);
    assert.equal(duplicate.response.status, 201);
    assert.equal(duplicate.body.runtime.reason, "duplicate-external-message-id");
    await drainShadow();

    assert.equal(
      await prisma.assistantConversationMessage.count({ where: { companyId: fixture.companyId } }),
      beforeMessageCount,
    );
    assert.equal(
      await prisma.assistantConversationStateV2Event.count({
        where: { companyId: fixture.companyId },
      }),
      beforeEventCount,
    );
    assert.equal(
      await prisma.assistantRuntimeLog.count({
        where: { companyId: fixture.companyId, mode: "runtime-v2-shadow" },
      }),
      beforeLogCount,
    );
    assert.equal(
      (
        await prisma.assistantConversationStateV2.findFirst({
          where: { companyId: fixture.companyId },
          select: { revision: true },
        })
      ).revision,
      beforeState.revision,
    );

    const sameContentNewId = await postMessage(5, `${prefix}-external-new-id`);
    assert.equal(sameContentNewId.response.status, 201);
    await drainShadow();
    assert.equal(
      await prisma.assistantConversationStateV2Event.count({
        where: { companyId: fixture.companyId },
      }),
      beforeEventCount + 1,
    );
  },
);
