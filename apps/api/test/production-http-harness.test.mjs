import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { createSanitizedChatwootEnvelope } from "./helpers/chatwoot-envelope.mjs";
import {
  assertIsolatedServiceUrls,
  assertTcpPortClosed,
  startProductionAppProcess,
} from "./helpers/production-app-process.mjs";
import {
  seedProductionHttpFixture,
  TEST_WEBHOOK_SECRET,
} from "./helpers/production-fixtures.mjs";
import {
  createStatefulChatwootFake,
  createStatefulOpenAiFake,
} from "./helpers/stateful-http-fakes.mjs";

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl || !redisUrl) {
  throw new Error("Production HTTP harness requires isolated DATABASE_URL and REDIS_URL");
}
assertIsolatedServiceUrls({ databaseUrl, redisUrl });

let prisma;
let redis;
let chatwoot;
let provider;
let application;
const readinessKey = "block0:harness:redis-readiness";

function metadataOf(runtimeLog) {
  return runtimeLog?.metadata && typeof runtimeLog.metadata === "object"
    ? runtimeLog.metadata
    : {};
}

async function assertRuntimeV2Absent(scope) {
  const [stateCount, eventCount, runtimeLogs] = await Promise.all([
    prisma.assistantConversationStateV2.count({ where: { companyId: scope.companyId } }),
    prisma.assistantConversationStateV2Event.count({ where: { companyId: scope.companyId } }),
    prisma.assistantRuntimeLog.findMany({
      where: { companyId: scope.companyId },
      select: { mode: true, metadata: true },
    }),
  ]);
  assert.equal(stateCount, 0, "Runtime V2 state must remain absent");
  assert.equal(eventCount, 0, "Runtime V2 events must remain absent");
  for (const runtimeLog of runtimeLogs) {
    const metadata = metadataOf(runtimeLog);
    assert.doesNotMatch(runtimeLog.mode, /runtime-v2/i);
    assert.notEqual(metadata.responseExecutionOwner, "V2_PRIMARY");
    assert.doesNotMatch(String(metadata.responseGenerationRoute ?? ""), /^V2_/);
  }

  for (const outbound of chatwoot.calls("chatwoot_outbound")) {
    assert.equal(outbound.body?.sender_type, "Captain::Assistant");
    assert.equal(outbound.body?.content_attributes?.source, "cubo_ai_studio");
    assert.equal(outbound.body?.content_attributes?.runtime_v2, undefined);
    assert.equal(outbound.body?.content_attributes?.source_version, undefined);
  }
}

async function postWebhook(scope, { content, messageId }) {
  const envelope = createSanitizedChatwootEnvelope({
    accountId: scope.accountId,
    inboxId: scope.inboxId,
    conversationId: scope.externalConversationId,
    contactId: scope.contactId,
    messageId,
    content,
    aiActive: true,
  });
  chatwoot.noteInbound(envelope);
  return application.postChatwootWebhook(envelope, {
    webhookSecret: TEST_WEBHOOK_SECRET,
    requestId: `request-${messageId}`,
  });
}

function assertExternalCallSummary(expected) {
  const summary = {
    embedding: provider.calls("embedding").length,
    intentClassification: provider.calls("intent_classification").length,
    finalGeneration: provider.calls("final_generation").length,
    memoryExtraction: provider.calls("memory_extraction").length,
    toolCapableGeneration: provider.toolCallRequestCount(),
    toolCallsReturned: provider.toolCallReturnCount(),
    chatwootReads: chatwoot.calls("chatwoot_read").length,
    chatwootMutations: chatwoot.calls("chatwoot_mutation").length,
    outbound: chatwoot.calls("chatwoot_outbound").length,
  };
  assert.deepEqual(summary, expected);
  return summary;
}

before(async () => {
  prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
  });
  await Promise.all([prisma.$connect(), redis.ping()]);
  await redis.set(readinessKey, "ready", "EX", 120);
  assert.equal(await redis.get(readinessKey), "ready");

  chatwoot = await createStatefulChatwootFake();
  provider = await createStatefulOpenAiFake();
  application = await startProductionAppProcess({
    databaseUrl,
    redisUrl,
    providerBaseUrl: `${provider.baseUrl}/v1`,
  });
  assert.ok(application.buildSha256);
  assert.equal(Number.isNaN(Date.parse(application.buildTimestamp)), false);
});

beforeEach(() => {
  chatwoot.reset();
  provider.reset();
});

after(async () => {
  const teardownErrors = [];
  const capture = async (operation) => {
    try {
      await operation();
    } catch (error) {
      teardownErrors.push(error);
    }
  };
  const chatwootPort = chatwoot?.port;
  const providerPort = provider?.port;
  const applicationLogs = application?.getSanitizedLogs() ?? "";

  await capture(() => application?.stop());
  await capture(() => prisma?.$disconnect());
  await capture(async () => {
    if (redis) {
      await redis.del(readinessKey);
      await redis.quit();
    }
  });
  await capture(() => chatwoot?.close());
  await capture(() => provider?.close());
  if (chatwootPort) await capture(() => assertTcpPortClosed(chatwootPort, "fake Chatwoot"));
  if (providerPort) await capture(() => assertTcpPortClosed(providerPort, "fake provider"));

  assert.doesNotMatch(applicationLogs, /HTTP_HARNESS_BLOCKED_NON_LOOPBACK_EGRESS/);
  assert.doesNotMatch(applicationLogs, /Redis connection error|Redis (?:GET|SET) failed/i);
  if (teardownErrors.length > 0) {
    throw new AggregateError(teardownErrors, "Production HTTP harness teardown failed");
  }
});

test(
  "A — POST /webhooks/chatwoot atravessa o AppModule real até um único outbound",
  { concurrency: false },
  async (t) => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "a",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    provider.setDefault("final_generation", {
      content: "Oi! Tudo certo, e você? Como posso ajudar hoje?",
    });

    const result = await postWebhook(scope, {
      content: "Oi tudo bem?",
      messageId: "block0-a-external-message-1",
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body?.ok, true);
    assert.equal(result.body?.source, "chatwoot");

    const conversation = await prisma.assistantConversation.findUnique({
      where: {
        companyId_assistantId_externalAccountId_externalConversationId: {
          companyId: scope.companyId,
          assistantId: scope.assistantId,
          externalAccountId: scope.accountId,
          externalConversationId: scope.externalConversationId,
        },
      },
    });
    assert.ok(conversation, "the real webhook must create the internal conversation");
    assert.equal(conversation.source, "CHATWOOT");
    assert.equal(conversation.currentContextVersion, 1);

    const messages = await prisma.assistantConversationMessage.findMany({
      where: { companyId: scope.companyId, conversationId: conversation.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const inbound = messages.filter((message) => message.role === "user");
    const localResponses = messages.filter((message) => message.role === "assistant");
    assert.equal(inbound.length, 1);
    assert.equal(inbound[0].externalMessageId, "block0-a-external-message-1");
    assert.equal(localResponses.length, 1);
    assert.equal(provider.calls("final_generation").length, 1);

    const outbounds = chatwoot.calls("chatwoot_outbound");
    assert.equal(outbounds.length, 1);
    assert.equal(outbounds[0].method, "POST");
    assert.equal(
      outbounds[0].path,
      `/api/v1/accounts/${scope.accountId}/conversations/${scope.externalConversationId}/messages`,
    );
    assert.equal(outbounds[0].headers.api_access_token, "[redacted]");
    const returnedExternalId = outbounds[0].response?.body?.id;
    assert.ok(returnedExternalId);
    assert.equal(localResponses[0].externalMessageId, returnedExternalId);

    const runtimeLogCount = await prisma.assistantRuntimeLog.count({
      where: { companyId: scope.companyId },
    });
    assert.equal(runtimeLogCount, 1);
    await assertRuntimeV2Absent(scope);
    t.diagnostic(
      `external calls A: ${JSON.stringify(
        assertExternalCallSummary({
          embedding: 1,
          intentClassification: 1,
          finalGeneration: 1,
          memoryExtraction: 0,
          toolCapableGeneration: 0,
          toolCallsReturned: 0,
          chatwootReads: 0,
          chatwootMutations: 0,
          outbound: 1,
        }),
      )}`,
    );
  },
);

test(
  "B — external message ID repetido é deduplicado pelo entrypoint HTTP",
  { concurrency: false },
  async (t) => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "b",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    const input = {
      content: "Oi tudo bem?",
      messageId: "block0-b-external-message-1",
    };

    const first = await postWebhook(scope, input);
    assert.equal(first.response.status, 201);
    const callsAfterFirst = {
      provider: provider.requests.length,
      finalGeneration: provider.calls("final_generation").length,
      outbound: chatwoot.calls("chatwoot_outbound").length,
    };
    const second = await postWebhook(scope, input);

    assert.equal(second.response.status, 201);
    assert.equal(second.body?.ignored, true);
    assert.equal(second.body?.reason, "duplicate");
    assert.equal(provider.requests.length, callsAfterFirst.provider);
    assert.equal(provider.calls("final_generation").length, callsAfterFirst.finalGeneration);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, callsAfterFirst.outbound);
    assert.equal(callsAfterFirst.finalGeneration, 1);
    assert.equal(callsAfterFirst.outbound, 1);

    const conversation = await prisma.assistantConversation.findFirst({
      where: { companyId: scope.companyId, externalConversationId: scope.externalConversationId },
    });
    assert.ok(conversation);
    assert.equal(
      await prisma.assistantConversationMessage.count({
        where: { companyId: scope.companyId, conversationId: conversation.id, role: "user" },
      }),
      1,
    );
    assert.equal(
      await prisma.assistantConversationMessage.count({
        where: { companyId: scope.companyId, conversationId: conversation.id, role: "assistant" },
      }),
      1,
    );
    assert.equal(
      await prisma.assistantRuntimeLog.count({ where: { companyId: scope.companyId } }),
      1,
    );
    assert.equal(
      await prisma.chatwootWebhookDiagnostic.count({
        where: { configId: scope.bindingId },
      }),
      2,
      "webhook delivery diagnostics remain per-attempt even when logical processing is deduplicated",
    );
    await assertRuntimeV2Absent(scope);
    t.diagnostic(
      `external calls B after duplicate delivery: ${JSON.stringify(
        assertExternalCallSummary({
          embedding: 1,
          intentClassification: 1,
          finalGeneration: 1,
          memoryExtraction: 0,
          toolCapableGeneration: 0,
          toolCallsReturned: 0,
          chatwootReads: 0,
          chatwootMutations: 0,
          outbound: 1,
        }),
      )}`,
    );
    t.diagnostic(
      "current V1 limitation: inbound dedupe does not reconcile a persisted decision whose outbound was never confirmed",
    );
  },
);

test(
  "C — histórico de contextVersion anterior não entra no provider da versão atual",
  { concurrency: false },
  async (t) => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "c",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
      precreateConversation: true,
      contextVersion: 2,
      includeOldHistory: true,
    });
    provider.setDefault("final_generation", {
      content: "Olá! Este novo contexto está pronto para continuar.",
    });

    const currentText = "Oi, este é um novo contexto.";
    const result = await postWebhook(scope, {
      content: currentText,
      messageId: "block0-c-external-message-current",
    });
    assert.equal(result.response.status, 201);

    const finalCalls = provider.calls("final_generation");
    assert.equal(finalCalls.length, 1);
    const finalProviderManifest = JSON.stringify(finalCalls[0].body);
    assert.match(finalProviderManifest, /novo contexto/i);
    assert.doesNotMatch(finalProviderManifest, /OLD_CONTEXT_SENTINEL_USER/);
    assert.doesNotMatch(finalProviderManifest, /OLD_CONTEXT_SENTINEL_ASSISTANT/);

    const currentMessages = await prisma.assistantConversationMessage.findMany({
      where: {
        companyId: scope.companyId,
        conversationId: scope.internalConversationId,
        contextVersion: 2,
      },
    });
    assert.equal(currentMessages.filter((message) => message.role === "user").length, 1);
    assert.equal(currentMessages.filter((message) => message.role === "assistant").length, 1);
    assert.equal(
      currentMessages.find((message) => message.role === "user")?.externalMessageId,
      "block0-c-external-message-current",
    );
    assert.equal(
      await prisma.assistantConversationMessage.count({
        where: {
          companyId: scope.companyId,
          conversationId: scope.internalConversationId,
          contextVersion: 1,
        },
      }),
      2,
      "old audit messages are preserved",
    );

    const runtimeLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
      where: { companyId: scope.companyId },
      orderBy: { createdAt: "desc" },
    });
    const metadata = metadataOf(runtimeLog);
    assert.equal(runtimeLog.historyMessagesUsed, 0);
    assert.deepEqual(metadata.contextManifest?.historyMessageIds ?? [], []);
    assert.equal(metadata.contextManifest?.contextVersion, 2);
    await assertRuntimeV2Absent(scope);
    t.diagnostic(
      `external calls C: ${JSON.stringify(
        assertExternalCallSummary({
          embedding: 1,
          intentClassification: 1,
          finalGeneration: 1,
          memoryExtraction: 0,
          toolCapableGeneration: 0,
          toolCallsReturned: 0,
          chatwootReads: 0,
          chatwootMutations: 0,
          outbound: 1,
        }),
      )}`,
    );
  },
);

test(
  "D — formatação preserva autoridade determinística sem geração final",
  { concurrency: false },
  async (t) => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "d",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    assert.equal(scope.motherboardAuthority.amount, 395);
    assert.ok(scope.motherboardAuthority.factPosition > 250);

    const result = await postWebhook(scope, {
      content: "Qual o valor pra formatar um PC ai?",
      messageId: "block0-d-external-message-price",
    });
    assert.equal(result.response.status, 201);

    const conversation = await prisma.assistantConversation.findFirstOrThrow({
      where: { companyId: scope.companyId, externalConversationId: scope.externalConversationId },
    });
    const assistantMessage = await prisma.assistantConversationMessage.findFirstOrThrow({
      where: {
        companyId: scope.companyId,
        conversationId: conversation.id,
        role: "assistant",
      },
    });
    assert.equal(assistantMessage.content, "A formatação custa a partir de R$ 1.950,00.");
    assert.equal(provider.calls("final_generation").length, 0);
    assert.equal(provider.calls("embedding").length, 1);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);

    const runtimeLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
      where: { companyId: scope.companyId },
      orderBy: { createdAt: "desc" },
    });
    const metadata = metadataOf(runtimeLog);
    assert.equal(metadata.responseStrategy, "DETERMINISTIC_PRICE_AUTHORITY");
    assert.equal(metadata.providerCount, 0);
    const priceTelemetry = metadata.contextManifest?.priceAuthorityGuardTelemetry;
    assert.equal(priceTelemetry?.eligibleAuthorityCount, 1);
    assert.deepEqual(priceTelemetry?.eligibleAuthorities, [
      {
        serviceKey: "formatacao",
        currency: "BRL",
        amount: 1950,
        qualifier: "starting_at",
        evidenceCount: 1,
      },
    ]);
    assert.equal(priceTelemetry?.overallDecision, "AUTHORIZED");
    await assertRuntimeV2Absent(scope);
    t.diagnostic(
      `external calls D: ${JSON.stringify(
        assertExternalCallSummary({
          embedding: 1,
          intentClassification: 0,
          finalGeneration: 0,
          memoryExtraction: 0,
          toolCapableGeneration: 0,
          toolCallsReturned: 0,
          chatwootReads: 0,
          chatwootMutations: 0,
          outbound: 1,
        }),
      )}`,
    );
  },
);

test.todo(
  "Gap 1 — erro ortográfico “atendiemnto” deverá usar agenda oficial determinística e zero geração final",
);
test.todo(
  "Gap 2 — “E para consertar minha placa mae?” deverá herdar pricing, substituir o serviço ativo e usar BRL 395 starting_at",
);
test.todo(
  "Gap 3 — autoridade factual além do caractere 250 deverá permanecer disponível para resolução e guards",
);
test.todo(
  "Gap 4 — computador lento deverá qualificar ou orientar próximo passo sem diagnóstico factual ou resposta puramente genérica",
);
test.todo(
  "Gap 5 — handoff deverá bloquear localmente, confirmar transição remota e destino humano antes da confirmação visível",
);
