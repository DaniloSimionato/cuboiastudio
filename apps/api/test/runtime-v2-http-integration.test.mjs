import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "../dist/app.module.js";
import { RuntimeV2ShadowIntegrationService } from "../dist/runtime-v2/index.js";
import { PrismaService } from "../dist/database/prisma.service.js";

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

const prefix = `runtime-v2-http-${randomUUID()}`;

const messages = [
  "Bom dia.",
  "Quero saber o valor para formatar um Mac M1.",
  "Preciso salvar imagens e uma pasta de projeto.",
  "Vocês conseguem buscar?",
  "Qual é o endereço?",
  "Vamos continuar.",
];

function headers(context) {
  return {
    "content-type": "application/json",
    "x-dev-user-id": `${prefix}-user`,
    "x-dev-user-email": `${prefix}@example.test`,
    "x-dev-company-id": context.fixture.companyId,
    "x-dev-user-permissions": "assistants:write",
  };
}

async function postMessage(context, index, externalMessageId = `${prefix}-external-${index}`) {
  const response = await fetch(
    `http://127.0.0.1:${context.app.getHttpServer().address().port}/assistants/${context.fixture.assistantId}/conversations/${context.fixture.conversationId}/messages`,
    {
      method: "POST",
      headers: headers(context),
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

async function seedFixture(prisma, scope) {
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

async function cleanupFixture(prisma, scope) {
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

async function drainShadow(context) {
  await context.app.get(RuntimeV2ShadowIntegrationService).drain();
}

async function createTestContext() {
  const context = {
    fixture: await createFixture(),
    app: null,
    prisma: null,
    scheduledSnapshots: [],
    scheduledResults: [],
    scheduledPromises: [],
  };

  process.env.RUNTIME_V2_SHADOW_ASSISTANT_IDS = context.fixture.assistantId;
  context.app = await NestFactory.create(AppModule, { logger: false });
  context.prisma = context.app.get(PrismaService);
  await seedFixture(context.prisma, context.fixture);
  context.app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const integration = context.app.get(RuntimeV2ShadowIntegrationService);
  const originalSchedule = integration.schedule.bind(integration);
  integration.schedule = (snapshot) => {
    context.scheduledSnapshots.push(snapshot);
    const result = originalSchedule(snapshot);
    context.scheduledPromises.push(result);
    result.then((value) => context.scheduledResults.push(value));
    return result;
  };
  await context.app.listen(0, "127.0.0.1");
  return context;
}

async function withTestContext(callback) {
  const context = await createTestContext();
  try {
    return await callback(context);
  } finally {
    await context.app.get(RuntimeV2ShadowIntegrationService).drain();
    await cleanupFixture(context.prisma, context.fixture);
    await context.app.close();
  }
}

test(
  "endpoint HTTP real aciona V2 shadow uma vez por mensagem e mantém o V1",
  { concurrency: false },
  async () => withTestContext(async (context) => {
    const shadowLogIds = [];

    for (let index = 0; index < messages.length; index += 1) {
      const result = await postMessage(context, index);
      assert.equal(result.response.status, 201);
      assert.equal(result.body.runtime.mode, "deterministic-runtime");
      assert.equal(result.body.assistantMessage?.role, "assistant");
      assert.equal(context.scheduledSnapshots.length, index + 1);
      await context.scheduledPromises[index];
      await drainShadow(context);
      assert.equal(context.scheduledResults.length, index + 1);
      assert.equal(
        context.scheduledResults.at(-1).status,
        "COMPLETED",
        `shadow turn ${index + 1} did not complete`,
      );

      const events = await context.prisma.assistantConversationStateV2Event.findMany({
        where: { companyId: context.fixture.companyId },
        orderBy: { resultingRevision: "asc" },
      });
      const logs = await context.prisma.assistantRuntimeLog.findMany({
        where: { companyId: context.fixture.companyId, mode: "runtime-v2-shadow" },
        orderBy: { createdAt: "asc" },
      });
      assert.equal(events.length, index + 1);
      assert.equal(logs.length, index + 1);
      assert.equal(events.at(-1).conversationId, context.fixture.conversationId);
      assert.equal(events.at(-1).resultingRevision, index + 1);
      assert.equal(logs.at(-1).metadata.providerCalled, false);
      assert.equal(logs.at(-1).metadata.toolCalls, 0);
      assert.equal(logs.at(-1).metadata.outboundSent, false);
      assert.equal(JSON.stringify(logs.at(-1).metadata).includes(messages[index]), false);
      shadowLogIds.push(logs.at(-1).id);
    }

    const state = await context.prisma.assistantConversationStateV2.findUnique({
      where: {
        companyId_assistantId_conversationId_contextVersion_mode: {
          companyId: context.fixture.companyId,
          assistantId: context.fixture.assistantId,
          conversationId: context.fixture.conversationId,
          contextVersion: 1,
          mode: "SHADOW",
        },
      },
    });
    const parsedState = state?.stateJson;
    assert.equal(state.revision, messages.length);
    assert.equal(parsedState.objective.key, "format_device");
    assert.ok(parsedState.confirmedFacts.storage_requirements);
    assert.equal(new Set(shadowLogIds).size, messages.length);
  }),
);

test(
  "externalMessageId repetido retorna 2xx sem repetir V1 ou V2",
  { concurrency: false },
  async () => withTestContext(async (context) => {
    const baseline = await postMessage(context, 5, `${prefix}-external-5`);
    assert.equal(baseline.response.status, 201);
    await drainShadow(context);

    const beforeMessageCount = await context.prisma.assistantConversationMessage.count({
      where: { companyId: context.fixture.companyId },
    });
    const beforeEventCount = await context.prisma.assistantConversationStateV2Event.count({
      where: { companyId: context.fixture.companyId },
    });
    const beforeLogCount = await context.prisma.assistantRuntimeLog.count({
      where: { companyId: context.fixture.companyId, mode: "runtime-v2-shadow" },
    });
    const beforeState = await context.prisma.assistantConversationStateV2.findFirst({
      where: { companyId: context.fixture.companyId },
      select: { revision: true },
    });

    const duplicate = await postMessage(context, 5, `${prefix}-external-5`);
    assert.equal(duplicate.response.status, 201);
    assert.equal(duplicate.body.runtime.reason, "duplicate-external-message-id");
    await drainShadow(context);

    assert.equal(
      await context.prisma.assistantConversationMessage.count({ where: { companyId: context.fixture.companyId } }),
      beforeMessageCount,
    );
    assert.equal(
      await context.prisma.assistantConversationStateV2Event.count({
        where: { companyId: context.fixture.companyId },
      }),
      beforeEventCount,
    );
    assert.equal(
      await context.prisma.assistantRuntimeLog.count({
        where: { companyId: context.fixture.companyId, mode: "runtime-v2-shadow" },
      }),
      beforeLogCount,
    );
    assert.equal(
      (
        await context.prisma.assistantConversationStateV2.findFirst({
          where: { companyId: context.fixture.companyId },
          select: { revision: true },
        })
      ).revision,
      beforeState.revision,
    );

    const sameContentNewId = await postMessage(context, 5, `${prefix}-external-new-id`);
    assert.equal(sameContentNewId.response.status, 201);
    assert.notEqual(sameContentNewId.body.runtime?.reason, "duplicate-external-message-id");
    assert.equal(context.scheduledSnapshots.length, 2);
    assert.notEqual(
      context.scheduledSnapshots[0].internalMessageId,
      context.scheduledSnapshots[1].internalMessageId,
    );
    await drainShadow(context);
    assert.equal(context.scheduledResults.at(-1).status, "COMPLETED");
    assert.equal(
      await context.prisma.assistantConversationStateV2Event.count({
        where: { companyId: context.fixture.companyId },
      }),
      beforeEventCount + 1,
    );
  }),
);

test(
  "mensagens rápidas da mesma sessão são serializadas pelo Shadow sem perder revisões",
  { concurrency: false },
  async () => withTestContext(async (context) => {
    const results = await Promise.all(
      messages.concat([
        "Quero continuar.",
        "Agora preciso de ajuda técnica.",
        "Obrigado.",
        "Encerrando atendimento.",
      ]).map(
        (_, index) => postMessage(context, index % messages.length, `${prefix}-rapid-${index}`),
      ),
    );

    assert.ok(results.every((result) => result.response.status === 201));
    await drainShadow(context);

    const events = await context.prisma.assistantConversationStateV2Event.findMany({
      where: { companyId: context.fixture.companyId },
      orderBy: { resultingRevision: "asc" },
    });
    assert.equal(
      events.length,
      10,
      `expected 10 processed events, received ${events.length}`,
    );
    assert.deepEqual(
      events.map((event) => event.resultingRevision),
      Array.from({ length: 10 }, (_, index) => index + 1),
    );
    assert.equal(new Set(events.map((event) => event.internalMessageId)).size, 10);
    assert.ok(events.every((event) => event.status === "PROCESSED"));

    const state = await context.prisma.assistantConversationStateV2.findFirst({
      where: { companyId: context.fixture.companyId },
      select: { revision: true },
    });
    assert.equal(state?.revision, 10);

    const logs = await context.prisma.assistantRuntimeLog.findMany({
      where: { companyId: context.fixture.companyId, mode: "runtime-v2-shadow" },
    });
    assert.equal(logs.length, 10);
    assert.ok(
      logs.every(
        (log) =>
          log.metadata?.providerCalled === false &&
          log.metadata?.toolCalls === 0 &&
          log.metadata?.outboundSent === false,
      ),
    );
  }),
);
