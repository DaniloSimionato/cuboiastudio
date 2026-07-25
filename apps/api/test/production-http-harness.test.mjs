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
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";
import {
  createConversationControlSnapshot,
  createConversationControlTrace,
} from "../dist/assistant-conversations/conversation-control-snapshot.js";
import {
  createTurnExecutionManifest,
  finalizeTurnExecutionManifest,
} from "../dist/assistant-conversations/turn-execution-manifest.js";
import {
  createOutboundDeliveryPlan,
} from "../dist/assistant-conversations/outbound-delivery.js";
import { V1TurnDecisionSealer } from "../dist/assistant-conversations/v1-turn-decision.js";

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

function turnManifestOf(runtimeLog) {
  const manifest = metadataOf(runtimeLog).turnExecutionManifest;
  assert.ok(manifest, "runtime log must own a turn execution manifest");
  return manifest;
}

function assertSanitizedTurnManifest(manifest, { inboundContent }) {
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, new RegExp(inboundContent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(serialized, /\+00000000000/);
  assert.doesNotMatch(serialized, /block0-(?:webhook|chatwoot|provider)-token/);
  assert.doesNotMatch(serialized, /"authorization"\s*:/i);
  assert.doesNotMatch(serialized, /BASE DE CONHECIMENTO RELEVANTE/i);
}

function assertV1TurnManifest(manifest, scope) {
  assert.equal(manifest.schemaVersion, "TURN_EXECUTION_MANIFEST_V1");
  assert.equal(manifest.policyVersion, "V1_COMPATIBILITY_POLICY");
  assert.match(manifest.turnExecutionId, /^turn_v1_[a-f0-9]{32}$/);
  assert.equal(manifest.identity.companyId, scope.companyId);
  assert.equal(manifest.identity.assistantId, scope.assistantId);
  assert.equal(manifest.identity.contextVersion, scope.contextVersion);
  assert.equal(manifest.inbound.fragmentCount, 1);
  assert.equal(manifest.inbound.fragmentIdentityCoverage, "COMPLETE");
  assert.equal(manifest.initialState.snapshotSource, "LOCAL_CONVERSATION_PROCESSING_STATE");
}

function assertControlTrace(
  manifest,
  {
    acceptedRevision = 0,
    effectiveRevision = acceptedRevision,
    requiredCheckpoints = [],
    blockedCheckpoint = null,
  } = {},
) {
  assert.equal(manifest.control.schemaVersion, "CONVERSATION_CONTROL_SNAPSHOT_V1");
  assert.equal(manifest.control.acceptedSnapshot.controlRevision, acceptedRevision);
  assert.equal(manifest.control.effectiveSnapshot.controlRevision, effectiveRevision);
  assert.equal(manifest.control.acceptedSnapshot.aiActive, true);
  assert.equal(manifest.control.acceptedSnapshot.pausedByHuman, false);
  const checkpoints = manifest.control.checkpoints.map((record) => record.checkpoint);
  for (const checkpoint of requiredCheckpoints) {
    assert.ok(checkpoints.includes(checkpoint), `missing control checkpoint ${checkpoint}`);
  }
  if (blockedCheckpoint) {
    const record = manifest.control.checkpoints.find(
      (candidate) => candidate.checkpoint === blockedCheckpoint,
    );
    assert.ok(record, `missing blocked checkpoint ${blockedCheckpoint}`);
    assert.equal(record.result, "BLOCKED");
  } else {
    assert.equal(
      manifest.control.checkpoints.every((record) => record.result === "PASSED"),
      true,
    );
  }
}

async function waitFor(promise, label, timeoutMs = 10_000) {
  let timer;
  try {
    await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function assertSealedV1Decision(
  manifest,
  {
    terminalPath,
    decisionType,
    plannedBlockCount = 1,
    outboundIntended = true,
    stateEffect = "NONE",
  },
) {
  assert.equal(manifest.decisionSchemaVersion, "V1_TURN_DECISION_V1");
  assert.match(manifest.decisionId, /^decision_v1_[a-f0-9]{32}$/);
  assert.equal(manifest.decisionOrdinal, 1);
  assert.equal(manifest.decisionStatus, "SEALED");
  assert.equal(manifest.decisionType, decisionType);
  assert.equal(manifest.terminal.path, terminalPath);
  assert.equal(manifest.decisionTerminalReasonCode, manifest.terminal.reasonCode);
  assert.equal(manifest.decisionExecutorOwner, "V1_TURN_DECISION_EXECUTOR");
  assert.equal(manifest.decisionExecutorExecutionCount, 1);
  assert.equal(manifest.decisionPlannedBlockCount, plannedBlockCount);
  assert.equal(manifest.decisionStateEffect, stateEffect);
  assert.equal(manifest.decisionOutboundIntended, outboundIntended);
}

async function outboundDeliveriesFor(scope) {
  return prisma.assistantOutboundDelivery.findMany({
    where: { companyId: scope.companyId },
    orderBy: [{ blockOrdinal: "asc" }, { createdAt: "asc" }],
  });
}

function assertAcknowledgedDelivery(delivery, manifest, externalMessageId) {
  assert.equal(delivery.turnExecutionId, manifest.turnExecutionId);
  assert.equal(delivery.decisionId, manifest.decisionId);
  assert.equal(delivery.blockOrdinal, 1);
  assert.match(delivery.idempotencyKey, /^outbound_v1_[a-f0-9]{32}$/);
  assert.equal(delivery.policyVersion, "V1_COMPATIBILITY_POLICY");
  assert.equal(delivery.expectedContextVersion, manifest.identity.contextVersion);
  assert.equal(
    delivery.expectedControlRevision,
    manifest.control.acceptedSnapshot.controlRevision,
  );
  assert.equal(delivery.sender, "CHATWOOT_V1");
  assert.match(delivery.payloadHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(delivery.payloadSize > 0);
  assert.equal(delivery.status, "ACKNOWLEDGED");
  assert.equal(delivery.attemptCount, 1);
  assert.equal(delivery.attemptOwner, null);
  assert.ok(delivery.attemptedAt);
  assert.ok(delivery.acknowledgedAt);
  assert.equal(delivery.failedAt, null);
  assert.equal(delivery.externalMessageId, externalMessageId);
  assert.equal(delivery.errorClass, null);
  assert.equal(delivery.errorCode, null);

  assert.equal(manifest.outbound.deliveries.length, 1);
  assert.deepEqual(manifest.outbound.deliveries[0], {
    schemaVersion: "ASSISTANT_OUTBOUND_DELIVERY_V1",
    deliveryId: delivery.id,
    idempotencyKey: delivery.idempotencyKey,
    blockOrdinal: 1,
    expectedContextVersion: delivery.expectedContextVersion,
    expectedControlRevision: delivery.expectedControlRevision,
    status: "ACKNOWLEDGED",
    attemptCount: 1,
    attemptedAt: delivery.attemptedAt.toISOString(),
    acknowledgedAt: delivery.acknowledgedAt.toISOString(),
    externalMessageId,
    errorClass: null,
    errorCode: null,
  });
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
    const runtimeLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
      where: { companyId: scope.companyId },
      orderBy: { createdAt: "desc" },
    });
    const manifest = turnManifestOf(runtimeLog);
    assertV1TurnManifest(manifest, scope);
    assertSealedV1Decision(manifest, {
      terminalPath: "PROVIDER_STANDARD",
      decisionType: "PROVIDER_RESPONSE",
    });
    assert.equal(manifest.terminal.path, "PROVIDER_STANDARD");
    assert.equal(manifest.provider.finalGeneration.observation, "OBSERVED");
    assert.equal(manifest.provider.finalGeneration.count, 1);
    assert.equal(manifest.outbound.planned, true);
    assert.equal(manifest.outbound.attempted, true);
    assert.equal(manifest.outbound.attemptCount, 1);
    assert.equal(manifest.outbound.sender, "CHATWOOT_V1");
    assert.equal(manifest.outbound.result, "ACKNOWLEDGED");
    assert.equal(manifest.outbound.externalMessageId, returnedExternalId);
    assert.equal(manifest.identity.internalConversationId, conversation.id);
    assert.equal(manifest.identity.externalMessageId, "block0-a-external-message-1");
    assert.equal(inbound[0].externalPayload?.turnExecutionId, manifest.turnExecutionId);
    assert.equal(inbound[0].externalPayload?.decisionId, manifest.decisionId);
    assert.equal(localResponses[0].externalPayload?.turnExecutionId, manifest.turnExecutionId);
    assert.equal(localResponses[0].externalPayload?.decisionId, manifest.decisionId);
    assert.deepEqual(Object.keys(localResponses[0].externalPayload ?? {}).sort(), [
      "decisionId",
      "turnExecutionId",
    ]);
    assertControlTrace(manifest, {
      requiredCheckpoints: [
        "ADMISSION",
        "PRE_PROVIDER",
        "PRE_SEAL",
        "PRE_EFFECTS",
        "PRE_OUTBOUND",
      ],
    });
    assert.equal(manifest.control.decisionResult, "EXECUTED");
    assert.equal(manifest.control.outboundAuthorization, "ALLOWED");
    const deliveries = await outboundDeliveriesFor(scope);
    assert.equal(deliveries.length, 1);
    assertAcknowledgedDelivery(deliveries[0], manifest, returnedExternalId);
    assertSanitizedTurnManifest(manifest, { inboundContent: "Oi tudo bem?" });
    assert.doesNotMatch(JSON.stringify(deliveries[0]), /Oi tudo bem|Como posso ajudar/i);
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
    const firstRuntimeLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
      where: { companyId: scope.companyId },
      orderBy: { createdAt: "desc" },
    });
    const firstManifest = turnManifestOf(firstRuntimeLog);
    const originalTurnExecutionId = firstManifest.turnExecutionId;
    const originalDecisionId = firstManifest.decisionId;
    const firstDeliveries = await outboundDeliveriesFor(scope);
    assert.equal(firstDeliveries.length, 1);
    const originalDeliveryId = firstDeliveries[0].id;
    const originalIdempotencyKey = firstDeliveries[0].idempotencyKey;
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
    const [runtimeLog, inboundMessage] = await Promise.all([
      prisma.assistantRuntimeLog.findFirstOrThrow({
        where: { companyId: scope.companyId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.assistantConversationMessage.findFirstOrThrow({
        where: {
          companyId: scope.companyId,
          conversationId: conversation.id,
          role: "user",
          externalMessageId: input.messageId,
        },
      }),
    ]);
    const manifest = turnManifestOf(runtimeLog);
    assertV1TurnManifest(manifest, scope);
    assertSealedV1Decision(manifest, {
      terminalPath: "PROVIDER_STANDARD",
      decisionType: "PROVIDER_RESPONSE",
    });
    assert.equal(manifest.turnExecutionId, originalTurnExecutionId);
    assert.equal(manifest.decisionId, originalDecisionId);
    assert.equal(manifest.identity.externalMessageId, input.messageId);
    assert.equal(manifest.terminal.path, "PROVIDER_STANDARD");
    assert.equal(manifest.provider.finalGeneration.count, 1);
    assert.equal(manifest.outbound.attemptCount, 1);
    const deliveries = await outboundDeliveriesFor(scope);
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].id, originalDeliveryId);
    assert.equal(deliveries[0].idempotencyKey, originalIdempotencyKey);
    assert.equal(deliveries[0].attemptCount, 1);
    assertAcknowledgedDelivery(
      deliveries[0],
      manifest,
      deliveries[0].externalMessageId,
    );
    const inboundPayload =
      inboundMessage.externalPayload && typeof inboundMessage.externalPayload === "object"
        ? inboundMessage.externalPayload
        : {};
    assert.equal(inboundPayload.turnExecutionId, manifest.turnExecutionId);
    assert.equal(inboundPayload.decisionId, manifest.decisionId);
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
      "Block 3B.1 records pending/failure states durably; duplicate deliberately does not retry or reconcile them",
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
    const manifest = turnManifestOf(runtimeLog);
    assertV1TurnManifest(manifest, scope);
    assertSealedV1Decision(manifest, {
      terminalPath: "PROVIDER_STANDARD",
      decisionType: "PROVIDER_RESPONSE",
    });
    assert.equal(manifest.identity.contextVersion, 2);
    assert.equal(manifest.initialState.aiActive, true);
    assert.equal(manifest.initialState.pausedByHuman, false);
    assert.equal(manifest.terminal.path, "PROVIDER_STANDARD");
    assert.equal(manifest.provider.finalGeneration.count, 1);
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
    const manifest = turnManifestOf(runtimeLog);
    assertV1TurnManifest(manifest, scope);
    assertSealedV1Decision(manifest, {
      terminalPath: "DETERMINISTIC_PRICE_AUTHORITY",
      decisionType: "DETERMINISTIC_RESPONSE",
    });
    assert.equal(manifest.terminal.path, "DETERMINISTIC_PRICE_AUTHORITY");
    assert.equal(manifest.provider.finalGeneration.observation, "OBSERVED");
    assert.equal(manifest.provider.finalGeneration.count, 0);
    assert.equal(manifest.provider.embedding, "NOT_OBSERVED");
    assert.deepEqual(manifest.routing.selectedAuthority, {
      id: `block0-d-chunk-formatacao`,
      serviceKey: "formatacao",
      currency: "BRL",
      amount: 1950,
      qualifier: "starting_at",
    });
    assert.equal(manifest.routing.eligibleAuthorityCount, 1);
    assert.equal(manifest.outbound.result, "ACKNOWLEDGED");
    assert.equal(manifest.outbound.attemptCount, 1);
    const deliveries = await outboundDeliveriesFor(scope);
    assert.equal(deliveries.length, 1);
    assertAcknowledgedDelivery(
      deliveries[0],
      manifest,
      chatwoot.calls("chatwoot_outbound")[0].response.body.id,
    );
    assertControlTrace(manifest, {
      requiredCheckpoints: ["ADMISSION", "PRE_SEAL", "PRE_EFFECTS", "PRE_OUTBOUND"],
    });
    assert.equal(
      manifest.control.checkpoints.some((record) => record.checkpoint === "PRE_PROVIDER"),
      false,
    );
    assertSanitizedTurnManifest(manifest, {
      inboundContent: "Qual o valor pra formatar um PC ai?",
    });
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

test(
  "E — BusinessHours reconhecido preserva resposta direta e usa o executor único",
  { concurrency: false },
  async (t) => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "e",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    const inboundContent = "Qual o horário na segunda?";
    const result = await postWebhook(scope, {
      content: inboundContent,
      messageId: "block0-e-external-message-hours",
    });
    assert.equal(result.response.status, 201);

    const conversation = await prisma.assistantConversation.findFirstOrThrow({
      where: { companyId: scope.companyId, externalConversationId: scope.externalConversationId },
    });
    const [assistantMessage, runtimeLog] = await Promise.all([
      prisma.assistantConversationMessage.findFirstOrThrow({
        where: {
          companyId: scope.companyId,
          conversationId: conversation.id,
          role: "assistant",
        },
      }),
      prisma.assistantRuntimeLog.findFirstOrThrow({
        where: { companyId: scope.companyId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const expectedText = "Sim. Aos segundas-feiras atendemos das 08h às 22h.";
    assert.equal(assistantMessage.content, expectedText);
    assert.equal(chatwoot.calls("chatwoot_outbound")[0]?.body?.content, expectedText);

    const manifest = turnManifestOf(runtimeLog);
    assertV1TurnManifest(manifest, scope);
    assertSealedV1Decision(manifest, {
      terminalPath: "BUSINESS_HOURS_DIRECT",
      decisionType: "DETERMINISTIC_RESPONSE",
    });
    assert.equal(manifest.provider.finalGeneration.count, 0);
    assert.equal(manifest.outbound.result, "ACKNOWLEDGED");
    assert.equal(manifest.outbound.attemptCount, 1);
    assertSanitizedTurnManifest(manifest, { inboundContent });
    await assertRuntimeV2Absent(scope);
    t.diagnostic(
      `external calls E: ${JSON.stringify(
        assertExternalCallSummary({
          embedding: 0,
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

test(
  "F — handoff legado permanece textual, sem transição operacional, pelo executor único",
  { concurrency: false },
  async (t) => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "f",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    const inboundContent = "Quero falar com um atendente";
    const result = await postWebhook(scope, {
      content: inboundContent,
      messageId: "block0-f-external-message-handoff",
    });
    assert.equal(result.response.status, 201);

    const conversation = await prisma.assistantConversation.findFirstOrThrow({
      where: { companyId: scope.companyId, externalConversationId: scope.externalConversationId },
    });
    assert.equal(conversation.aiActive, true);
    assert.equal(conversation.pausedByHuman, false);
    assert.equal(conversation.status, "ACTIVE");

    const [assistantMessage, runtimeLog] = await Promise.all([
      prisma.assistantConversationMessage.findFirstOrThrow({
        where: {
          companyId: scope.companyId,
          conversationId: conversation.id,
          role: "assistant",
        },
      }),
      prisma.assistantRuntimeLog.findFirstOrThrow({
        where: { companyId: scope.companyId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    assert.equal(assistantMessage.content, "Transferindo para um atendente...");

    const manifest = turnManifestOf(runtimeLog);
    assertV1TurnManifest(manifest, scope);
    assertSealedV1Decision(manifest, {
      terminalPath: "EXPLICIT_HUMAN_HANDOFF_LEGACY",
      decisionType: "LEGACY_HANDOFF_TEXT",
      stateEffect: "LEGACY_HANDOFF_TEXT_ONLY",
    });
    assert.equal(manifest.provider.finalGeneration.count, 0);
    assert.equal(manifest.outbound.result, "ACKNOWLEDGED");
    const handoffDeliveries = await outboundDeliveriesFor(scope);
    assert.equal(handoffDeliveries.length, 1);
    assertAcknowledgedDelivery(
      handoffDeliveries[0],
      manifest,
      chatwoot.calls("chatwoot_outbound")[0].response.body.id,
    );

    const remoteConversation = chatwoot.getConversation(
      scope.accountId,
      scope.externalConversationId,
    );
    assert.equal(remoteConversation.ai_active, true);
    assert.equal(remoteConversation.status, "open");
    assert.equal(remoteConversation.assignee, null);
    assert.equal(remoteConversation.team, null);
    assert.deepEqual(remoteConversation.labels, []);
    assert.equal(chatwoot.calls("chatwoot_mutation").length, 0);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
    assertSanitizedTurnManifest(manifest, { inboundContent });
    await assertRuntimeV2Absent(scope);
    t.diagnostic(
      `external calls F: ${JSON.stringify(
        assertExternalCallSummary({
          embedding: 0,
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

test(
  "G — pausa local durante geração descarta o draft e bloqueia efeitos terminais",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "g",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
      precreateConversation: true,
    });
    const generation = provider.deferNext("final_generation", {
      content: "DRAFT_DESCARTADO_NAO_PERSISTIR",
    });
    const responsePromise = postWebhook(scope, {
      content: "Oi tudo bem?",
      messageId: "block0-g-external-message-stale-pause",
    });
    await waitFor(generation.started, "final provider generation");

    const transition = await prisma.assistantConversation.updateMany({
      where: {
        id: scope.internalConversationId,
        companyId: scope.companyId,
        controlRevision: 0,
      },
      data: {
        aiActive: false,
        pausedByHuman: true,
        controlRevision: { increment: 1 },
        lastAiPausedAt: new Date(),
        pauseReason: "BLOCK3A_CONCURRENCY_TEST",
      },
    });
    assert.equal(transition.count, 1);
    generation.release();

    const result = await responsePromise;
    assert.equal(result.response.status, 201);
    const messages = await prisma.assistantConversationMessage.findMany({
      where: { companyId: scope.companyId, conversationId: scope.internalConversationId },
    });
    assert.equal(messages.filter((message) => message.role === "user").length, 1);
    assert.equal(messages.filter((message) => message.role === "assistant").length, 0);
    assert.equal(
      messages.some((message) => message.content.includes("DRAFT_DESCARTADO_NAO_PERSISTIR")),
      false,
    );
    assert.equal(provider.calls("final_generation").length, 1);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 0);

    const runtimeLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
      where: { companyId: scope.companyId },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(runtimeLog.status, "SKIPPED");
    assert.equal(runtimeLog.assistantMessageId, null);
    const manifest = turnManifestOf(runtimeLog);
    assert.equal(manifest.terminal.path, "BLOCKED_CONTROL_STATE");
    assert.equal(manifest.terminal.reasonCode, "BLOCKED_CONTROL_STATE_PRE_SEAL");
    assert.equal(manifest.decisionId, null);
    assert.equal(manifest.provider.finalGeneration.count, 1);
    assert.equal(manifest.outbound.result, "NOT_ATTEMPTED");
    assertControlTrace(manifest, {
      acceptedRevision: 0,
      effectiveRevision: 0,
      requiredCheckpoints: ["ADMISSION", "PRE_PROVIDER", "PRE_SEAL"],
      blockedCheckpoint: "PRE_SEAL",
    });
    const failedCheckpoint = manifest.control.checkpoints.find(
      (record) => record.checkpoint === "PRE_SEAL",
    );
    assert.equal(failedCheckpoint.expectedRevision, 0);
    assert.equal(failedCheckpoint.observedRevision, 1);
    assert.equal(failedCheckpoint.mismatchReason, "CONTROL_REVISION_MISMATCH");
    assert.equal(manifest.control.decisionResult, "DISCARDED");
    assert.equal(manifest.control.outboundAuthorization, "BLOCKED");
    assertSanitizedTurnManifest(manifest, { inboundContent: "Oi tudo bem?" });
    assert.doesNotMatch(JSON.stringify(manifest), /DRAFT_DESCARTADO_NAO_PERSISTIR/);
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "H — reset CAS durante geração invalida contextVersion e revisão do turno antigo",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "h",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
      precreateConversation: true,
    });
    const generation = provider.deferNext("final_generation", {
      content: "DRAFT_DE_CONTEXTO_ANTIGO",
    });
    const responsePromise = postWebhook(scope, {
      content: "Oi tudo bem?",
      messageId: "block0-h-external-message-stale-reset",
    });
    await waitFor(generation.started, "final provider generation");

    const transition = await prisma.assistantConversation.updateMany({
      where: {
        id: scope.internalConversationId,
        companyId: scope.companyId,
        currentContextVersion: 1,
        controlRevision: 0,
      },
      data: {
        currentContextVersion: { increment: 1 },
        controlRevision: { increment: 1 },
      },
    });
    assert.equal(transition.count, 1);
    generation.release();

    const result = await responsePromise;
    assert.equal(result.response.status, 201);
    const conversation = await prisma.assistantConversation.findUniqueOrThrow({
      where: { id: scope.internalConversationId },
    });
    assert.equal(conversation.currentContextVersion, 2);
    assert.equal(conversation.controlRevision, 1);
    assert.equal(
      await prisma.assistantConversationMessage.count({
        where: {
          companyId: scope.companyId,
          conversationId: scope.internalConversationId,
          role: "assistant",
          contextVersion: 1,
        },
      }),
      0,
    );
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 0);

    const runtimeLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
      where: { companyId: scope.companyId },
      orderBy: { createdAt: "desc" },
    });
    const manifest = turnManifestOf(runtimeLog);
    assert.equal(manifest.identity.contextVersion, 1);
    assert.equal(manifest.terminal.path, "BLOCKED_CONTROL_STATE");
    assert.equal(manifest.provider.finalGeneration.count, 1);
    assert.equal(manifest.outbound.result, "NOT_ATTEMPTED");
    assertControlTrace(manifest, {
      acceptedRevision: 0,
      effectiveRevision: 0,
      requiredCheckpoints: ["ADMISSION", "PRE_PROVIDER", "PRE_SEAL"],
      blockedCheckpoint: "PRE_SEAL",
    });
    const failedCheckpoint = manifest.control.checkpoints.find(
      (record) => record.checkpoint === "PRE_SEAL",
    );
    assert.equal(failedCheckpoint.expectedContextVersion, 1);
    assert.equal(failedCheckpoint.observedContextVersion, 2);
    assert.equal(failedCheckpoint.mismatchReason, "CONTEXT_VERSION_MISMATCH");
    assertSanitizedTurnManifest(manifest, { inboundContent: "Oi tudo bem?" });
    assert.doesNotMatch(JSON.stringify(manifest), /DRAFT_DE_CONTEXTO_ANTIGO/);
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "I — decisão selada permanece única e checkpoint pré-outbound bloqueia o sender",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "i",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
      precreateConversation: true,
    });
    const [assistant, conversation] = await Promise.all([
      prisma.assistant.findUniqueOrThrow({ where: { id: scope.assistantId } }),
      prisma.assistantConversation.findUniqueOrThrow({
        where: { id: scope.internalConversationId },
      }),
    ]);
    const userMessage = await prisma.assistantConversationMessage.create({
      data: {
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        conversationId: scope.internalConversationId,
        role: "user",
        content: "Mensagem de controle estrutural",
        source: "tests",
        contextVersion: 1,
      },
    });
    const acceptedSnapshot = createConversationControlSnapshot({
      conversation,
      capturedAt: "2026-07-25T00:00:00.000Z",
      snapshotSource: "LOCAL_DATABASE_ADMISSION",
      snapshotReason: "TURN_ADMISSION",
    });
    const controlTrace = createConversationControlTrace(acceptedSnapshot);
    const baseManifest = createTurnExecutionManifest({
      identity: {
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        source: "chatwoot",
        accountId: scope.accountId,
        inboxId: scope.inboxId,
        externalConversationId: scope.externalConversationId,
        externalMessageId: "block0-i-structural-message",
        internalConversationId: scope.internalConversationId,
        internalMessageId: userMessage.id,
        contextVersion: 1,
      },
      aiActive: true,
      pausedByHuman: false,
      sessionState: "ACTIVE",
      capturedAt: "2026-07-25T00:00:00.000Z",
      fragmentCount: 1,
      fragmentIdentityCoverage: "COMPLETE",
      normalizedContentHash: "structural-test-hash",
      normalizedContentLength: 30,
      controlTrace,
    });
    const manifest = finalizeTurnExecutionManifest(baseManifest, {
      terminal: { path: "PROVIDER_STANDARD", reasonCode: "PROVIDER_STANDARD" },
      routing: baseManifest.routing,
      provider: {
        ...baseManifest.provider,
        finalGeneration: { observation: "OBSERVED", count: 1 },
      },
      outbound: {
        planned: true,
        attempted: false,
        attemptCount: 0,
        sender: "CHATWOOT_V1",
        externalMessageId: null,
        result: "NOT_ATTEMPTED",
      },
    });
    const decision = new V1TurnDecisionSealer().seal({
      turnExecutionId: manifest.turnExecutionId,
      contextVersion: 1,
      classification: {
        type: "PROVIDER_RESPONSE",
        terminalPath: "PROVIDER_STANDARD",
        terminalReasonCode: "PROVIDER_STANDARD",
        strategy: "STANDARD",
        providerDisposition: "USED",
        legacyCapability: null,
      },
      response: {
        blocks: [{ ordinal: 1, content: "Resposta já decidida." }],
        persistedContent: "Resposta já decidida.",
        persistence: {
          source: "chatwoot",
          mode: "ai-runtime",
          contextVersion: 1,
          sources: null,
        },
      },
      provider: {
        used: true,
        finalGenerationCount: 1,
        skipReason: null,
      },
      controlSnapshot: acceptedSnapshot,
      authority: null,
      effects: {
        persistLocalResponse: true,
        finalizeRuntimeLog: true,
        outboundIntended: true,
        sender: "CHATWOOT_V1",
        stateEffect: "NONE",
      },
      compatibility: {
        runtimeMode: "ai-runtime",
        runtimeReason: "PROVIDER_STANDARD",
        expectedOutcome: "success",
      },
    });
    const service = new AssistantConversationsService(prisma, {}, {}, {});
    let senderCalls = 0;
    service.sendChatwootOutboundText = async () => {
      senderCalls += 1;
      return { status: "sent", performed: true, externalMessageId: "unexpected" };
    };
    let transitionCount = 0;
    const lifecycle = {
      beforeResponsePersist: async () => {},
      afterResponsePersist: async () => {},
      beforeOutbound: async () => {
        const updated = await prisma.assistantConversation.updateMany({
          where: {
            id: scope.internalConversationId,
            companyId: scope.companyId,
            controlRevision: 0,
          },
          data: {
            aiActive: false,
            controlRevision: { increment: 1 },
            lastAiPausedAt: new Date(),
            pauseReason: "BLOCK3A_PRE_OUTBOUND_COMPONENT_TEST",
          },
        });
        transitionCount += updated.count;
      },
      afterOutboundConfirmed: async () => {},
      afterOutboundUncertain: async () => {},
      afterOutboundFailure: async () => {},
      afterTailCompleted: async () => {},
    };

    const execution = await service.executeV1TurnDecision({
      decision,
      manifest,
      controlTrace,
      assistant,
      conversation,
      userMessage,
      runtime: {
        mode: "ai-runtime",
        assistant: { id: assistant.id, name: assistant.name },
        temperature: 0.2,
        temperatureSource: "assistant",
        configurationSource: "tenant-settings",
        fallback: false,
        outcome: "success",
        summary: "Structural pre-outbound test",
        context: {
          historyMessagesUsed: 0,
          historyLimit: 0,
          initialMessageIncluded: false,
          instructionsIncluded: true,
        },
      },
      runtimeStartedAt: Date.now(),
      runtimeLogData: {
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        conversationId: scope.internalConversationId,
        userMessageId: userMessage.id,
        mode: "ai-runtime",
        status: "COMPLETED",
        provider: "openai-compatible",
        model: "block0-fake-model",
        configurationSource: "tenant-settings",
        fallback: false,
        fallbackReason: null,
        outcome: "success",
        durationMs: 0,
        knowledgeCount: 0,
        historyMessagesUsed: 0,
        historyLimit: 0,
      },
      runtimeLogMetadata: { componentScenario: "PRE_OUTBOUND_STALE" },
      outboundConversation: conversation,
      persistExternalMessageReference: true,
      lifecycle: {
        hooks: lifecycle,
        base: {
          executionOwner: "V1_NORMAL",
          route: "V1",
          strategy: "V1_STANDARD",
          internalMessageId: userMessage.id,
          generationId: null,
          externalMessageReferenceFingerprint: null,
        },
      },
    });

    assert.equal(transitionCount, 1);
    assert.equal(senderCalls, 0);
    assert.equal(execution.outboundAttempted, false);
    assert.equal(execution.outboundPerformed, "SKIPPED");
    assert.ok(execution.assistantMessage);
    const runtimeLog = await prisma.assistantRuntimeLog.findUniqueOrThrow({
      where: { id: execution.runtimeLogId },
    });
    const persistedManifest = turnManifestOf(runtimeLog);
    assert.equal(persistedManifest.decisionId, decision.decisionId);
    assert.equal(persistedManifest.decisionStatus, "SEALED");
    assert.equal(persistedManifest.decisionExecutorExecutionCount, 1);
    assert.equal(persistedManifest.outbound.attempted, false);
    assert.equal(persistedManifest.outbound.result, "NOT_ATTEMPTED");
    assert.equal(persistedManifest.control.decisionResult, "EXECUTED");
    assert.equal(persistedManifest.control.outboundAuthorization, "BLOCKED");
    const checkpoint = persistedManifest.control.checkpoints.find(
      (record) => record.checkpoint === "PRE_OUTBOUND",
    );
    assert.equal(checkpoint.result, "BLOCKED");
    assert.equal(checkpoint.expectedRevision, 0);
    assert.equal(checkpoint.observedRevision, 1);
    const staleDeliveries = await outboundDeliveriesFor(scope);
    assert.equal(staleDeliveries.length, 1);
    assert.equal(staleDeliveries[0].decisionId, decision.decisionId);
    assert.equal(staleDeliveries[0].status, "CANCELLED_STALE");
    assert.equal(staleDeliveries[0].attemptCount, 0);
    assert.equal(staleDeliveries[0].attemptOwner, null);
    assert.equal(staleDeliveries[0].externalMessageId, null);
    assert.equal(staleDeliveries[0].errorClass, "CONTROL_STATE_STALE");
    assert.equal(
      staleDeliveries[0].errorCode,
      "BLOCKED_CONTROL_STATE_PRE_OUTBOUND",
    );
    assert.equal(persistedManifest.outbound.deliveries.length, 1);
    assert.equal(
      persistedManifest.outbound.deliveries[0].status,
      "CANCELLED_STALE",
    );
    assert.equal(
      await prisma.assistantConversationMessage.count({
        where: {
          companyId: scope.companyId,
          conversationId: scope.internalConversationId,
          role: "assistant",
        },
      }),
      1,
    );
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "J — claim concorrente concede ownership a uma única execução",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "n",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
      precreateConversation: true,
    });
    const [conversation, assistantMessage] = await Promise.all([
      prisma.assistantConversation.findUniqueOrThrow({
        where: { id: scope.internalConversationId },
      }),
      prisma.assistantConversationMessage.create({
        data: {
          companyId: scope.companyId,
          assistantId: scope.assistantId,
          conversationId: scope.internalConversationId,
          role: "assistant",
          content: "Resposta estrutural de claim.",
          source: "tests",
          contextVersion: 1,
        },
      }),
    ]);
    const delivery = await prisma.assistantOutboundDelivery.create({
      data: {
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        conversationId: scope.internalConversationId,
        assistantMessageId: assistantMessage.id,
        turnExecutionId: "turn_v1_claim_concorrente_000000000000",
        decisionId: "decision_v1_claim_concorrente_00000000",
        blockOrdinal: 1,
        idempotencyKey: "outbound_v1_claim_concorrente_00000000",
        policyVersion: "V1_COMPATIBILITY_POLICY",
        expectedContextVersion: 1,
        expectedControlRevision: 0,
        sender: "CHATWOOT_V1",
        payloadHash: "sha256:claim-test",
        payloadSize: 29,
      },
    });
    const acceptedSnapshot = createConversationControlSnapshot({
      conversation,
      capturedAt: "2026-07-25T14:00:00.000Z",
      snapshotSource: "LOCAL_DATABASE_ADMISSION",
      snapshotReason: "TURN_ADMISSION",
    });
    const service = new AssistantConversationsService(prisma, {}, {}, {});
    const claims = await Promise.all([
      service.claimV1OutboundDelivery({
        delivery,
        controlTrace: createConversationControlTrace(acceptedSnapshot),
        assistantId: scope.assistantId,
        conversationId: scope.internalConversationId,
        companyId: scope.companyId,
      }),
      service.claimV1OutboundDelivery({
        delivery,
        controlTrace: createConversationControlTrace(acceptedSnapshot),
        assistantId: scope.assistantId,
        conversationId: scope.internalConversationId,
        companyId: scope.companyId,
      }),
    ]);
    const winners = claims.filter((claim) => claim.claimToken);
    assert.equal(winners.length, 1);
    assert.equal(claims.filter((claim) => !claim.claimToken).length, 1);
    assert.equal(
      claims.every((claim) => claim.delivery.id === delivery.id),
      true,
    );

    let senderCalls = 0;
    senderCalls += 1;
    const acknowledged = await service.transitionClaimedV1OutboundDelivery({
      deliveryId: delivery.id,
      claimToken: winners[0].claimToken,
      status: "ACKNOWLEDGED",
      externalMessageId: "claim-owner-external-id",
    });
    assert.equal(senderCalls, 1);
    assert.equal(acknowledged.status, "ACKNOWLEDGED");
    assert.equal(acknowledged.attemptCount, 1);
    assert.equal(acknowledged.attemptOwner, null);
    assert.equal(
      await prisma.assistantOutboundDelivery.count({
        where: { decisionId: delivery.decisionId, blockOrdinal: 1 },
      }),
      1,
    );
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 0);
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "K — HTTP 4xx registra falha terminal sem retry e sem corpo sensível",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "j",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    chatwoot.enqueueBehavior({
      category: "chatwoot_outbound",
      kind: "configured_4xx",
      status: 422,
      body: { error: "SENSITIVE_CHATWOOT_RESPONSE_BODY" },
    });
    const input = {
      content: "Oi tudo bem?",
      messageId: "block0-j-external-message-4xx",
    };
    const result = await postWebhook(scope, input);
    assert.equal(result.response.status, 201);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
    const [delivery] = await outboundDeliveriesFor(scope);
    assert.equal(delivery.status, "FAILED_TERMINAL");
    assert.equal(delivery.attemptCount, 1);
    assert.equal(delivery.externalMessageId, null);
    assert.equal(delivery.errorClass, "CHATWOOT_HTTP");
    assert.equal(delivery.errorCode, "HTTP_422");

    const duplicate = await postWebhook(scope, input);
    assert.equal(duplicate.response.status, 201);
    assert.equal(duplicate.body?.reason, "duplicate");
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
    assert.equal((await outboundDeliveriesFor(scope))[0].attemptCount, 1);
    const runtimeLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
      where: { companyId: scope.companyId },
    });
    const manifest = turnManifestOf(runtimeLog);
    assert.equal(manifest.outbound.result, "FAILED");
    assert.equal(manifest.outbound.deliveries[0].status, "FAILED_TERMINAL");
    assert.doesNotMatch(JSON.stringify({ delivery, manifest }), /SENSITIVE_CHATWOOT_RESPONSE_BODY/);
    assertSanitizedTurnManifest(manifest, { inboundContent: input.content });
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "L — HTTP 5xx registra FAILED_RETRYABLE sem retry automático ou por duplicate",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "k",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    chatwoot.enqueueBehavior({
      category: "chatwoot_outbound",
      kind: "configured_5xx",
      status: 503,
      body: { error: "temporarily_unavailable" },
    });
    const input = {
      content: "Oi tudo bem?",
      messageId: "block0-k-external-message-5xx",
    };
    const result = await postWebhook(scope, input);
    assert.equal(result.response.status, 201);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
    assert.equal(provider.calls("final_generation").length, 1);
    const [delivery] = await outboundDeliveriesFor(scope);
    assert.equal(delivery.status, "FAILED_RETRYABLE");
    assert.equal(delivery.attemptCount, 1);
    assert.equal(delivery.errorClass, "CHATWOOT_HTTP");
    assert.equal(delivery.errorCode, "HTTP_503");

    const duplicate = await postWebhook(scope, input);
    assert.equal(duplicate.body?.reason, "duplicate");
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
    assert.equal(provider.calls("final_generation").length, 1);
    const persisted = (await outboundDeliveriesFor(scope))[0];
    assert.equal(persisted.id, delivery.id);
    assert.equal(persisted.attemptCount, 1);
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "M — timeout após aceitação possível registra UNCERTAIN sem repetição",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "l",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    chatwoot.enqueueBehavior({
      category: "chatwoot_outbound",
      kind: "accepted_timeout",
      timeoutMs: 100,
    });
    const input = {
      content: "Oi tudo bem?",
      messageId: "block0-l-external-message-timeout",
    };
    const result = await postWebhook(scope, input);
    assert.equal(result.response.status, 201);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
    const remoteConversation = chatwoot.getConversation(
      scope.accountId,
      scope.externalConversationId,
    );
    assert.equal(remoteConversation.messages.filter((message) => message.direction === "outbound").length, 1);
    const [delivery] = await outboundDeliveriesFor(scope);
    assert.equal(delivery.status, "UNCERTAIN");
    assert.equal(delivery.attemptCount, 1);
    assert.equal(delivery.externalMessageId, null);
    assert.equal(delivery.errorClass, "CHATWOOT_TRANSPORT_AMBIGUOUS");

    const duplicate = await postWebhook(scope, input);
    assert.equal(duplicate.body?.reason, "duplicate");
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
    assert.equal((await outboundDeliveriesFor(scope))[0].attemptCount, 1);
    const runtimeLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
      where: { companyId: scope.companyId },
    });
    const manifest = turnManifestOf(runtimeLog);
    assert.equal(manifest.outbound.result, "FAILED");
    assert.equal(manifest.outbound.deliveries[0].status, "UNCERTAIN");
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "N — estados ACKNOWLEDGED e PENDING sobrevivem ao restart sem recuperação automática",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "m",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
      precreateConversation: true,
    });
    const result = await postWebhook(scope, {
      content: "Oi tudo bem?",
      messageId: "block0-m-external-message-restart",
    });
    assert.equal(result.response.status, 201);
    const [beforeRestart] = await outboundDeliveriesFor(scope);
    assert.equal(beforeRestart.status, "ACKNOWLEDGED");
    const pendingMessage = await prisma.assistantConversationMessage.create({
      data: {
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        conversationId: scope.internalConversationId,
        role: "assistant",
        content: "Resposta persistida aguardando política futura.",
        source: "tests",
        contextVersion: scope.contextVersion,
      },
    });
    const pendingPlan = createOutboundDeliveryPlan({
      turnExecutionId: "turn_v1_restart_pending",
      decisionId: "decision_v1_restart_pending",
      blockOrdinal: 1,
      expectedContextVersion: scope.contextVersion,
      expectedControlRevision: 0,
      sender: "CHATWOOT_V1",
      content: pendingMessage.content,
    });
    const pendingBeforeRestart = await prisma.assistantOutboundDelivery.create({
      data: {
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        conversationId: scope.internalConversationId,
        assistantMessageId: pendingMessage.id,
        turnExecutionId: pendingPlan.turnExecutionId,
        decisionId: pendingPlan.decisionId,
        blockOrdinal: pendingPlan.blockOrdinal,
        idempotencyKey: pendingPlan.idempotencyKey,
        policyVersion: pendingPlan.policyVersion,
        expectedContextVersion: pendingPlan.expectedContextVersion,
        expectedControlRevision: pendingPlan.expectedControlRevision,
        sender: pendingPlan.sender,
        payloadHash: pendingPlan.payloadHash,
        payloadSize: pendingPlan.payloadSize,
      },
    });
    assert.equal(pendingBeforeRestart.status, "PENDING");
    assert.equal(pendingBeforeRestart.attemptCount, 0);
    const outboundCount = chatwoot.calls("chatwoot_outbound").length;

    await application.stop();
    application = await startProductionAppProcess({
      databaseUrl,
      redisUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });

    const afterRestartDeliveries = await outboundDeliveriesFor(scope);
    const afterRestart = afterRestartDeliveries.find(
      (delivery) => delivery.id === beforeRestart.id,
    );
    const pendingAfterRestart = afterRestartDeliveries.find(
      (delivery) => delivery.id === pendingBeforeRestart.id,
    );
    assert.ok(afterRestart);
    assert.ok(pendingAfterRestart);
    assert.equal(afterRestart.id, beforeRestart.id);
    assert.equal(afterRestart.idempotencyKey, beforeRestart.idempotencyKey);
    assert.equal(afterRestart.status, "ACKNOWLEDGED");
    assert.equal(afterRestart.attemptCount, 1);
    assert.equal(pendingAfterRestart.status, "PENDING");
    assert.equal(pendingAfterRestart.attemptCount, 0);
    assert.equal(pendingAfterRestart.attemptOwner, null);
    assert.equal(pendingAfterRestart.externalMessageId, null);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, outboundCount);
    await assertRuntimeV2Absent(scope);
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
