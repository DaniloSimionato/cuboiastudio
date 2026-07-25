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
    authorizedTransition = null,
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
  if (authorizedTransition) {
    assert.equal(manifest.control.authorizedTransitions.length, 1);
    assert.match(
      manifest.control.authorizedTransitions[0].reason,
      authorizedTransition.reasonPattern,
    );
    assert.equal(
      manifest.control.authorizedTransitions[0].previousRevision,
      authorizedTransition.previousRevision,
    );
    assert.equal(
      manifest.control.authorizedTransitions[0].currentRevision,
      authorizedTransition.currentRevision,
    );
    assert.equal(
      manifest.control.authorizedTransitions[0].previousContextVersion,
      authorizedTransition.contextVersion,
    );
    assert.equal(
      manifest.control.authorizedTransitions[0].currentContextVersion,
      authorizedTransition.contextVersion,
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

function assertAcknowledgedDelivery(
  delivery,
  manifest,
  externalMessageId,
  {
    expectedControlRevision = manifest.control.acceptedSnapshot.controlRevision,
    handoffOperationId = null,
  } = {},
) {
  assert.equal(delivery.turnExecutionId, manifest.turnExecutionId);
  assert.equal(delivery.decisionId, manifest.decisionId);
  assert.equal(delivery.blockOrdinal, 1);
  assert.match(delivery.idempotencyKey, /^outbound_v1_[a-f0-9]{32}$/);
  assert.equal(delivery.policyVersion, "V1_COMPATIBILITY_POLICY");
  assert.equal(delivery.expectedContextVersion, manifest.identity.contextVersion);
  assert.equal(delivery.expectedControlRevision, expectedControlRevision);
  assert.equal(delivery.handoffOperationId, handoffOperationId);
  assert.equal(delivery.sender, "CHATWOOT_V1");
  assert.match(delivery.payloadHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(delivery.payloadSize > 0);
  assert.equal(delivery.status, "ACKNOWLEDGED");
  assert.equal(delivery.retrySafety, "NOT_RETRYABLE");
  assert.equal(delivery.attemptCount, 1);
  assert.equal(delivery.maxAttempts, 3);
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
    retrySafety: "NOT_RETRYABLE",
    attemptCount: 1,
    maxAttempts: 3,
    attemptedAt: delivery.attemptedAt.toISOString(),
    claimStartedAt: null,
    claimExpiresAt: null,
    nextEligibleAt: null,
    acknowledgedAt: delivery.acknowledgedAt.toISOString(),
    externalMessageId,
    errorClass: null,
    errorCode: null,
    recovery: {
      schemaVersion: "ASSISTANT_OUTBOUND_RECOVERY_V1",
      attemptSchemaVersion: "ASSISTANT_OUTBOUND_ATTEMPT_V1",
      attemptNumber: 1,
      leaseOwner: null,
      leaseStartedAt: null,
      leaseExpiresAt: null,
      retrySafety: "NOT_RETRYABLE",
      eligibility: "TERMINAL",
      nextEligibleAt: null,
      reconciliationStatus: null,
      reconciliationEvidenceType: null,
      result: "ACKNOWLEDGED",
      blockingReason: null,
    },
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

async function postWebhook(scope, { content, messageId, aiActive = true }) {
  const envelope = createSanitizedChatwootEnvelope({
    accountId: scope.accountId,
    inboxId: scope.inboxId,
    conversationId: scope.externalConversationId,
    contactId: scope.contactId,
    messageId,
    content,
    aiActive,
  });
  chatwoot.noteInbound(envelope);
  return application.postChatwootWebhook(envelope, {
    webhookSecret: TEST_WEBHOOK_SECRET,
    requestId: `request-${messageId}`,
  });
}

function handoffConversationPath(scope) {
  return `/api/v1/accounts/${scope.accountId}/conversations/${scope.externalConversationId}`;
}

function setHandoffRemoteConversation(
  scope,
  {
    aiActive = true,
    status = "open",
    assignee = null,
    team = null,
    labels = [],
  } = {},
) {
  chatwoot.setConversation({
    accountId: scope.accountId,
    conversationId: scope.externalConversationId,
    inboxId: scope.inboxId,
    aiActive,
    status,
    assignee,
    team,
    labels,
  });
}

async function loadHandoffEvidence(scope) {
  const conversation = await prisma.assistantConversation.findFirstOrThrow({
    where: {
      companyId: scope.companyId,
      externalConversationId: scope.externalConversationId,
    },
  });
  const [messages, runtimeLogs, operations, deliveries] = await Promise.all([
    prisma.assistantConversationMessage.findMany({
      where: { companyId: scope.companyId, conversationId: conversation.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.assistantRuntimeLog.findMany({
      where: { companyId: scope.companyId, conversationId: conversation.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.assistantHandoffOperation.findMany({
      where: { companyId: scope.companyId, conversationId: conversation.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    outboundDeliveriesFor(scope),
  ]);
  return {
    conversation,
    messages,
    runtimeLogs,
    operations,
    deliveries,
    assistantMessages: messages.filter((message) => message.role === "assistant"),
    userMessages: messages.filter((message) => message.role === "user"),
    manifest: runtimeLogs.length > 0
      ? turnManifestOf(runtimeLogs[runtimeLogs.length - 1])
      : null,
  };
}

function assertNoProviderCallsForHandoff() {
  assert.equal(provider.calls("embedding").length, 0);
  assert.equal(provider.calls("intent_classification").length, 0);
  assert.equal(provider.calls("final_generation").length, 0);
  assert.equal(provider.calls("memory_extraction").length, 0);
  assert.equal(provider.toolCallRequestCount(), 0);
  assert.equal(provider.toolCallReturnCount(), 0);
}

function assertLocallyBlockedHandoff(conversation, {
  contextVersion = 1,
  controlRevision = 1,
} = {}) {
  assert.equal(conversation.currentContextVersion, contextVersion);
  assert.equal(conversation.controlRevision, controlRevision);
  assert.equal(conversation.aiActive, false);
  assert.equal(conversation.pausedByHuman, true);
  assert.equal(conversation.status, "ACTIVE");
  assert.equal(conversation.pauseReason, "OPERATIONAL_HUMAN_HANDOFF");
  assert.ok(conversation.lastAiPausedAt);
}

function assertOperationalHandoffDecision(manifest, scope, {
  operation,
  status,
  destinationType,
  confirmationAuthorized,
  confirmationResult,
  outboundResult,
  remoteMutationResult,
  remoteVerificationResult,
  effectiveRevision = 1,
  blockingReason = null,
} = {}) {
  assertV1TurnManifest(manifest, scope);
  assertSealedV1Decision(manifest, {
    terminalPath: "OPERATIONAL_HUMAN_HANDOFF",
    decisionType: "OPERATIONAL_HANDOFF",
    stateEffect: "BLOCK_AI_AND_HANDOFF",
  });
  assert.equal(manifest.provider.finalGeneration.count, 0);
  assert.equal(manifest.handoff.schemaVersion, "TURN_EXECUTION_HANDOFF_V1");
  assert.equal(manifest.handoff.operationId, operation.id);
  assert.equal(manifest.handoff.status, status);
  assert.equal(manifest.handoff.destination.type, destinationType);
  assert.equal(
    manifest.handoff.destination.resolution,
    destinationType === "UNRESOLVED" ? "UNRESOLVED" : "RESOLVED",
  );
  assert.equal(manifest.handoff.expectedContextVersion, scope.contextVersion);
  assert.equal(manifest.handoff.expectedControlRevision, 0);
  assert.equal(manifest.handoff.postBlockControlRevision, 1);
  assert.equal(manifest.handoff.localBlockResult, "CONFIRMED");
  assert.equal(manifest.handoff.remoteMutation.result, remoteMutationResult);
  assert.equal(
    manifest.handoff.remoteVerification.result,
    remoteVerificationResult,
  );
  assert.equal(manifest.handoff.confirmation.authorized, confirmationAuthorized);
  assert.equal(manifest.handoff.confirmation.decisionId, manifest.decisionId);
  assert.equal(manifest.handoff.confirmation.result, confirmationResult);
  assert.equal(manifest.handoff.blockingReason, blockingReason);
  assert.equal(manifest.outbound.result, outboundResult);
  assertControlTrace(manifest, {
    acceptedRevision: 0,
    effectiveRevision,
    requiredCheckpoints: confirmationAuthorized
      ? ["ADMISSION", "PRE_SEAL", "PRE_EFFECTS", "PRE_OUTBOUND"]
      : ["ADMISSION", "PRE_SEAL"],
    authorizedTransition: {
      reasonPattern: /^OPERATIONAL_HUMAN_HANDOFF:/,
      previousRevision: 0,
      currentRevision: 1,
      contextVersion: scope.contextVersion,
    },
  });
}

function assertHandoffRemoteCallOrder(scope, {
  expectMutation = true,
  expectOutbound = true,
} = {}) {
  const path = handoffConversationPath(scope);
  const reads = chatwoot.calls("chatwoot_read");
  const mutations = chatwoot.calls("chatwoot_mutation");
  const outbounds = chatwoot.calls("chatwoot_outbound");
  assert.equal(reads[0]?.path, path);
  if (expectMutation) {
    assert.equal(mutations.length, 1);
    assert.equal(mutations[0].method, "PUT");
    assert.equal(mutations[0].path, path);
    assert.deepEqual(mutations[0].body, { ai_active: false });
    assert.equal(reads.length, 2);
    assert.ok(reads[0].order < mutations[0].order);
    assert.ok(mutations[0].order < reads[1].order);
  } else {
    assert.equal(mutations.length, 0);
    assert.equal(reads.length, 1);
  }
  if (expectOutbound) {
    assert.equal(outbounds.length, 1);
    assert.ok(reads.at(-1).order < outbounds[0].order);
  } else {
    assert.equal(outbounds.length, 0);
  }
}

function assertWithheldOperationalHandoff(evidence, scope, {
  destinationType,
  operationDestinationType,
  remoteMutationResult,
  remoteVerificationResult,
  blockingReason,
} = {}) {
  assertLocallyBlockedHandoff(evidence.conversation);
  assert.equal(evidence.operations.length, 1);
  assert.equal(evidence.runtimeLogs.length, 1);
  assert.equal(evidence.assistantMessages.length, 0);
  assert.equal(evidence.deliveries.length, 0);
  const [operation] = evidence.operations;
  assert.equal(operation.status, "RECONCILIATION_REQUIRED");
  assert.equal(operation.destinationType, operationDestinationType);
  assert.equal(operation.errorCode, blockingReason);
  assert.equal(evidence.runtimeLogs[0].status, "SKIPPED");
  assert.equal(evidence.runtimeLogs[0].assistantMessageId, null);
  assertOperationalHandoffDecision(evidence.manifest, scope, {
    operation,
    status: "RECONCILIATION_REQUIRED",
    destinationType,
    confirmationAuthorized: false,
    confirmationResult: "NOT_AUTHORIZED",
    outboundResult: "NOT_ATTEMPTED",
    remoteMutationResult,
    remoteVerificationResult,
    blockingReason,
  });
  assert.equal(evidence.manifest.outbound.planned, false);
  assert.equal(evidence.manifest.outbound.attempted, false);
  assert.equal(evidence.manifest.outbound.attemptCount, 0);
  assert.equal(evidence.manifest.outbound.sender, "NOT_APPLICABLE");
  assert.equal(evidence.manifest.handoff.confirmation.deliveryId, null);
  assertNoProviderCallsForHandoff();
  return operation;
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
      "Block 3B.2 keeps duplicate passive: it neither retries nor reconciles pending/failure states",
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
  "F — handoff com assignee existente bloqueia localmente, verifica o remoto e só então confirma",
  { concurrency: false },
  async (t) => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "f",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-f" },
    });
    const inboundContent = "Quero falar com um atendente";
    const result = await postWebhook(scope, {
      content: inboundContent,
      messageId: "block0-f-external-message-handoff",
    });
    assert.equal(result.response.status, 201);

    const evidence = await loadHandoffEvidence(scope);
    assertLocallyBlockedHandoff(evidence.conversation);
    assert.equal(evidence.operations.length, 1);
    assert.equal(evidence.runtimeLogs.length, 1);
    assert.equal(evidence.assistantMessages.length, 1);
    assert.equal(evidence.deliveries.length, 1);
    const [operation] = evidence.operations;
    const [assistantMessage] = evidence.assistantMessages;
    const [delivery] = evidence.deliveries;
    assert.equal(assistantMessage.content, "Transferindo para um atendente...");
    assert.equal(operation.status, "COMPLETED");
    assert.equal(operation.destinationType, "EXISTING_ASSIGNEE");
    assert.equal(operation.destinationResolution, "RESOLVED");
    assert.equal(operation.destinationAssigneeId, "block4a-human-assignee-f");
    assert.equal(operation.destinationTeamId, null);
    assert.equal(operation.expectedControlRevision, 0);
    assert.equal(operation.postBlockControlRevision, 1);
    assert.equal(operation.remoteMutationResult, "ACKNOWLEDGED");
    assert.equal(operation.remoteVerificationResult, "CONFIRMED");
    assert.equal(operation.observedAiActive, false);
    assert.ok(operation.verifiedAt);
    assert.ok(operation.confirmationAuthorizedAt);
    assert.ok(operation.completedAt);

    const manifest = evidence.manifest;
    assertOperationalHandoffDecision(manifest, scope, {
      operation,
      status: "COMPLETED",
      destinationType: "ASSIGNEE",
      confirmationAuthorized: true,
      confirmationResult: "ACKNOWLEDGED",
      outboundResult: "ACKNOWLEDGED",
      remoteMutationResult: "ACKNOWLEDGED",
      remoteVerificationResult: "CONFIRMED",
    });
    assertAcknowledgedDelivery(
      delivery,
      manifest,
      chatwoot.calls("chatwoot_outbound")[0].response.body.id,
      {
        expectedControlRevision: 1,
        handoffOperationId: operation.id,
      },
    );
    assert.equal(delivery.handoff, true);
    assert.equal(manifest.handoff.confirmation.deliveryId, delivery.id);
    assert.equal(assistantMessage.externalPayload?.handoffOperationId, operation.id);

    const remoteConversation = chatwoot.getConversation(
      scope.accountId,
      scope.externalConversationId,
    );
    assert.equal(remoteConversation.ai_active, false);
    assert.equal(remoteConversation.status, "open");
    assert.deepEqual(remoteConversation.assignee, {
      id: "block4a-human-assignee-f",
    });
    assert.equal(remoteConversation.team, null);
    assert.deepEqual(remoteConversation.labels, []);
    assertHandoffRemoteCallOrder(scope);
    assertNoProviderCallsForHandoff();
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
          chatwootReads: 2,
          chatwootMutations: 1,
          outbound: 1,
        }),
      )}`,
    );
  },
);

test(
  "4A-B — handoff com team existente preserva o destino e conclui uma única confirmação",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "ak",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      team: { id: "block4a-human-team-o" },
    });

    const result = await postWebhook(scope, {
      content: "Quero falar com um atendente",
      messageId: "block4a-o-team-handoff",
    });
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    assertLocallyBlockedHandoff(evidence.conversation);
    assert.equal(evidence.operations.length, 1);
    assert.equal(evidence.assistantMessages.length, 1);
    assert.equal(evidence.deliveries.length, 1);
    const [operation] = evidence.operations;
    assert.equal(operation.status, "COMPLETED");
    assert.equal(operation.destinationType, "EXISTING_TEAM");
    assert.equal(operation.destinationResolution, "RESOLVED");
    assert.equal(operation.destinationAssigneeId, null);
    assert.equal(operation.destinationTeamId, "block4a-human-team-o");
    assertOperationalHandoffDecision(evidence.manifest, scope, {
      operation,
      status: "COMPLETED",
      destinationType: "TEAM",
      confirmationAuthorized: true,
      confirmationResult: "ACKNOWLEDGED",
      outboundResult: "ACKNOWLEDGED",
      remoteMutationResult: "ACKNOWLEDGED",
      remoteVerificationResult: "CONFIRMED",
    });
    assertAcknowledgedDelivery(
      evidence.deliveries[0],
      evidence.manifest,
      chatwoot.calls("chatwoot_outbound")[0].response.body.id,
      { expectedControlRevision: 1, handoffOperationId: operation.id },
    );
    const remote = chatwoot.getConversation(
      scope.accountId,
      scope.externalConversationId,
    );
    assert.equal(remote.ai_active, false);
    assert.equal(remote.assignee, null);
    assert.deepEqual(remote.team, { id: "block4a-human-team-o" });
    assertHandoffRemoteCallOrder(scope);
    assertNoProviderCallsForHandoff();
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-C — destino humano não resolvido mantém bloqueio local e retém confirmação",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "al",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope);
    const inboundContent = "Quero falar com um atendente";

    const result = await postWebhook(scope, {
      content: inboundContent,
      messageId: "block4a-p-unresolved-handoff",
    });
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    const operation = assertWithheldOperationalHandoff(evidence, scope, {
      destinationType: "UNRESOLVED",
      operationDestinationType: "UNRESOLVED",
      remoteMutationResult: "NOT_ATTEMPTED",
      remoteVerificationResult: "NOT_ATTEMPTED",
      blockingReason: "DESTINATION_UNRESOLVED",
    });
    assert.equal(operation.attemptCount, 0);
    assert.equal(operation.destinationResolution, "UNRESOLVED");
    assertHandoffRemoteCallOrder(scope, {
      expectMutation: false,
      expectOutbound: false,
    });
    assertSanitizedTurnManifest(evidence.manifest, { inboundContent });
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-D — mutation 4xx não confirma transferência e mantém a IA local bloqueada",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "am",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-q" },
    });
    chatwoot.enqueueBehavior({
      method: "PUT",
      path: handoffConversationPath(scope),
      kind: "configured_4xx",
      status: 422,
      body: { error: "SENSITIVE_HANDOFF_MUTATION_BODY" },
    });

    const result = await postWebhook(scope, {
      content: "Quero falar com um atendente",
      messageId: "block4a-q-handoff-4xx",
    });
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    const operation = assertWithheldOperationalHandoff(evidence, scope, {
      destinationType: "ASSIGNEE",
      operationDestinationType: "EXISTING_ASSIGNEE",
      remoteMutationResult: "FAILED",
      remoteVerificationResult: "FAILED",
      blockingReason: "CHATWOOT_AI_ACTIVE_NOT_CONFIRMED_INACTIVE",
    });
    assert.equal(operation.attemptCount, 1);
    assert.equal(operation.remoteMutationResult, "FAILED");
    assert.equal(
      operation.remoteMutationErrorCode,
      "CHATWOOT_HANDOFF_MUTATION_HTTP_422",
    );
    assert.equal(operation.remoteVerificationResult, "NOT_CONFIRMED");
    assert.equal(
      chatwoot.getConversation(scope.accountId, scope.externalConversationId).ai_active,
      true,
    );
    assertHandoffRemoteCallOrder(scope, { expectOutbound: false });
    assert.doesNotMatch(
      JSON.stringify({ operation, manifest: evidence.manifest }),
      /SENSITIVE_HANDOFF_MUTATION_BODY/,
    );
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-E — mutation 5xx sem efeito exige reconciliação e não produz confirmação",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "an",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-r" },
    });
    chatwoot.enqueueBehavior({
      method: "PUT",
      path: handoffConversationPath(scope),
      kind: "mutation_5xx_without_effect",
      status: 503,
    });

    const result = await postWebhook(scope, {
      content: "Quero falar com um atendente",
      messageId: "block4a-r-handoff-5xx-no-effect",
    });
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    const operation = assertWithheldOperationalHandoff(evidence, scope, {
      destinationType: "ASSIGNEE",
      operationDestinationType: "EXISTING_ASSIGNEE",
      remoteMutationResult: "FAILED",
      remoteVerificationResult: "FAILED",
      blockingReason: "CHATWOOT_AI_ACTIVE_NOT_CONFIRMED_INACTIVE",
    });
    assert.equal(
      operation.remoteMutationErrorCode,
      "CHATWOOT_HANDOFF_MUTATION_HTTP_503",
    );
    assert.equal(
      chatwoot.getConversation(scope.accountId, scope.externalConversationId).ai_active,
      true,
    );
    assertHandoffRemoteCallOrder(scope, { expectOutbound: false });
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-F — mutation 5xx após efeito é verificada por GET sem segunda mutation",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "ao",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-s" },
    });
    chatwoot.enqueueBehavior({
      method: "PUT",
      path: handoffConversationPath(scope),
      kind: "mutation_5xx_after_effect",
      status: 503,
    });

    const result = await postWebhook(scope, {
      content: "Quero falar com um atendente",
      messageId: "block4a-s-handoff-5xx-after-effect",
    });
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    assertLocallyBlockedHandoff(evidence.conversation);
    const [operation] = evidence.operations;
    assert.equal(operation.status, "COMPLETED");
    assert.equal(operation.remoteMutationResult, "FAILED");
    assert.equal(
      operation.remoteMutationErrorCode,
      "CHATWOOT_HANDOFF_MUTATION_HTTP_503",
    );
    assert.equal(operation.remoteVerificationResult, "CONFIRMED");
    assertOperationalHandoffDecision(evidence.manifest, scope, {
      operation,
      status: "COMPLETED",
      destinationType: "ASSIGNEE",
      confirmationAuthorized: true,
      confirmationResult: "ACKNOWLEDGED",
      outboundResult: "ACKNOWLEDGED",
      remoteMutationResult: "FAILED",
      remoteVerificationResult: "CONFIRMED",
    });
    assert.equal(evidence.assistantMessages.length, 1);
    assert.equal(evidence.deliveries.length, 1);
    assertHandoffRemoteCallOrder(scope);
    assertNoProviderCallsForHandoff();
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-G — timeout após efeito remoto é verificado sem repetir mutation",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "ap",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-t" },
    });
    chatwoot.enqueueBehavior({
      method: "PUT",
      path: handoffConversationPath(scope),
      kind: "mutation_timeout_after_effect",
      timeoutMs: 6_000,
    });

    const result = await postWebhook(scope, {
      content: "Quero falar com um atendente",
      messageId: "block4a-t-handoff-timeout-after-effect",
    });
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    const [operation] = evidence.operations;
    assert.equal(operation.status, "COMPLETED");
    assert.equal(operation.remoteMutationResult, "AMBIGUOUS");
    assert.equal(operation.remoteVerificationResult, "CONFIRMED");
    assertOperationalHandoffDecision(evidence.manifest, scope, {
      operation,
      status: "COMPLETED",
      destinationType: "ASSIGNEE",
      confirmationAuthorized: true,
      confirmationResult: "ACKNOWLEDGED",
      outboundResult: "ACKNOWLEDGED",
      remoteMutationResult: "UNKNOWN",
      remoteVerificationResult: "CONFIRMED",
    });
    assert.equal(evidence.deliveries.length, 1);
    assertHandoffRemoteCallOrder(scope);
    assertNoProviderCallsForHandoff();
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-H — timeout sem efeito permanece inconclusivo e retém confirmação",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "aq",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-u" },
    });
    chatwoot.enqueueBehavior({
      method: "PUT",
      path: handoffConversationPath(scope),
      kind: "mutation_timeout_without_effect",
      timeoutMs: 6_000,
    });

    const result = await postWebhook(scope, {
      content: "Quero falar com um atendente",
      messageId: "block4a-u-handoff-timeout-no-effect",
    });
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    const operation = assertWithheldOperationalHandoff(evidence, scope, {
      destinationType: "ASSIGNEE",
      operationDestinationType: "EXISTING_ASSIGNEE",
      remoteMutationResult: "UNKNOWN",
      remoteVerificationResult: "FAILED",
      blockingReason: "CHATWOOT_AI_ACTIVE_NOT_CONFIRMED_INACTIVE",
    });
    assert.equal(operation.remoteMutationResult, "AMBIGUOUS");
    assert.equal(operation.remoteVerificationResult, "NOT_CONFIRMED");
    assertHandoffRemoteCallOrder(scope, { expectOutbound: false });
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-I — falha do outbound de confirmação não desfaz o handoff remoto confirmado",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "ar",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-v" },
    });
    chatwoot.enqueueBehavior({
      category: "chatwoot_outbound",
      kind: "configured_4xx",
      status: 422,
      body: { error: "SENSITIVE_CONFIRMATION_OUTBOUND_BODY" },
    });

    const result = await postWebhook(scope, {
      content: "Quero falar com um atendente",
      messageId: "block4a-v-handoff-confirmation-failed",
    });
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    assertLocallyBlockedHandoff(evidence.conversation);
    assert.equal(evidence.operations.length, 1);
    assert.equal(evidence.assistantMessages.length, 1);
    assert.equal(evidence.deliveries.length, 1);
    const [operation] = evidence.operations;
    const [delivery] = evidence.deliveries;
    assert.equal(operation.status, "CONFIRMATION_PENDING");
    assert.equal(operation.remoteVerificationResult, "CONFIRMED");
    assert.equal(delivery.handoffOperationId, operation.id);
    assert.equal(delivery.status, "FAILED_TERMINAL");
    assert.equal(delivery.retrySafety, "NOT_RETRYABLE");
    assert.equal(delivery.attemptCount, 1);
    assert.equal(delivery.externalMessageId, null);
    assertOperationalHandoffDecision(evidence.manifest, scope, {
      operation,
      status: "CONFIRMATION_PENDING",
      destinationType: "ASSIGNEE",
      confirmationAuthorized: true,
      confirmationResult: "FAILED",
      outboundResult: "FAILED",
      remoteMutationResult: "ACKNOWLEDGED",
      remoteVerificationResult: "CONFIRMED",
    });
    assert.equal(evidence.manifest.handoff.confirmation.deliveryId, delivery.id);
    assert.equal(
      chatwoot.getConversation(scope.accountId, scope.externalConversationId).ai_active,
      false,
    );
    assertHandoffRemoteCallOrder(scope);
    assertNoProviderCallsForHandoff();
    assert.doesNotMatch(
      JSON.stringify({ operation, delivery, manifest: evidence.manifest }),
      /SENSITIVE_CONFIRMATION_OUTBOUND_BODY/,
    );
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-J — duplicate após handoff concluído reutiliza operação, decisão e delivery",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "as",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-w" },
    });
    const input = {
      content: "Quero falar com um atendente",
      messageId: "block4a-w-handoff-duplicate-completed",
    };
    const first = await postWebhook(scope, input);
    assert.equal(first.response.status, 201);
    const before = await loadHandoffEvidence(scope);
    const callCounts = {
      reads: chatwoot.calls("chatwoot_read").length,
      mutations: chatwoot.calls("chatwoot_mutation").length,
      outbounds: chatwoot.calls("chatwoot_outbound").length,
      provider: provider.requests.length,
    };

    const duplicate = await postWebhook(scope, input);
    assert.equal(duplicate.response.status, 201);
    assert.equal(duplicate.body?.ignored, true);
    assert.equal(duplicate.body?.reason, "duplicate");
    const afterDuplicate = await loadHandoffEvidence(scope);
    assert.equal(afterDuplicate.operations.length, 1);
    assert.equal(afterDuplicate.operations[0].id, before.operations[0].id);
    assert.equal(afterDuplicate.manifest.turnExecutionId, before.manifest.turnExecutionId);
    assert.equal(afterDuplicate.manifest.decisionId, before.manifest.decisionId);
    assert.equal(afterDuplicate.deliveries.length, 1);
    assert.equal(afterDuplicate.deliveries[0].id, before.deliveries[0].id);
    assert.equal(afterDuplicate.deliveries[0].attemptCount, 1);
    assert.deepEqual(
      {
        reads: chatwoot.calls("chatwoot_read").length,
        mutations: chatwoot.calls("chatwoot_mutation").length,
        outbounds: chatwoot.calls("chatwoot_outbound").length,
        provider: provider.requests.length,
      },
      callCounts,
    );
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-K — duplicate de operação parcial não dispara reconciliação nem nova mutation",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "at",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope);
    const input = {
      content: "Quero falar com um atendente",
      messageId: "block4a-x-handoff-duplicate-partial",
    };
    const first = await postWebhook(scope, input);
    assert.equal(first.response.status, 201);
    const before = await loadHandoffEvidence(scope);
    assert.equal(before.operations[0].status, "RECONCILIATION_REQUIRED");
    const callCount = chatwoot.requests.length;

    const duplicate = await postWebhook(scope, input);
    assert.equal(duplicate.response.status, 201);
    assert.equal(duplicate.body?.reason, "duplicate");
    const afterDuplicate = await loadHandoffEvidence(scope);
    assert.equal(afterDuplicate.operations.length, 1);
    assert.equal(afterDuplicate.operations[0].id, before.operations[0].id);
    assert.equal(afterDuplicate.operations[0].attemptCount, 0);
    assert.equal(afterDuplicate.deliveries.length, 0);
    assert.equal(chatwoot.requests.length, callCount);
    assertNoProviderCallsForHandoff();
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-L — reset concorrente supersede a operação e impede confirmação stale",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "au",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
      precreateConversation: true,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-y" },
    });
    const mutation = chatwoot.deferNextMutation({
      path: handoffConversationPath(scope),
      effectTiming: "before_release",
      outcome: "success",
    });
    const responsePromise = postWebhook(scope, {
      content: "Quero falar com um atendente",
      messageId: "block4a-y-handoff-reset-concurrent",
    });
    await waitFor(mutation.started, "handoff remote mutation start");
    await waitFor(mutation.effectApplied, "handoff remote mutation effect");

    const reset = await prisma.assistantConversation.updateMany({
      where: {
        id: scope.internalConversationId,
        companyId: scope.companyId,
        currentContextVersion: 1,
        controlRevision: 1,
        aiActive: false,
        pausedByHuman: true,
      },
      data: {
        currentContextVersion: { increment: 1 },
        controlRevision: { increment: 1 },
        aiActive: true,
        pausedByHuman: false,
        pauseReason: null,
        resumeReason: "BLOCK4A_CONCURRENT_RESET_TEST",
      },
    });
    assert.equal(reset.count, 1);
    mutation.release();

    const result = await responsePromise;
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    assert.equal(evidence.conversation.currentContextVersion, 2);
    assert.equal(evidence.conversation.controlRevision, 2);
    assert.equal(evidence.conversation.aiActive, true);
    assert.equal(evidence.conversation.pausedByHuman, false);
    assert.equal(evidence.operations.length, 1);
    assert.equal(evidence.operations[0].status, "SUPERSEDED");
    assert.equal(evidence.operations[0].contextVersion, 1);
    assert.equal(evidence.assistantMessages.length, 0);
    assert.equal(evidence.deliveries.length, 0);
    assert.equal(chatwoot.calls("chatwoot_mutation").length, 1);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 0);
    assert.equal(evidence.manifest.handoff.status, "SUPERSEDED");
    assert.equal(evidence.manifest.handoff.confirmation.authorized, false);
    assert.equal(evidence.manifest.outbound.result, "NOT_ATTEMPTED");
    assertNoProviderCallsForHandoff();
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-M — novo inbound após handoff permanece sem provider e sem resposta da IA",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "av",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-z" },
    });
    const first = await postWebhook(scope, {
      content: "Quero falar com um atendente",
      messageId: "block4a-z-handoff-first",
    });
    assert.equal(first.response.status, 201);
    const before = await loadHandoffEvidence(scope);
    assert.equal(before.operations[0].status, "COMPLETED");
    assert.equal(before.assistantMessages.length, 1);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);

    const second = await postWebhook(scope, {
      content: "Ainda estou aguardando uma pessoa",
      messageId: "block4a-z-inbound-after-handoff",
      aiActive: false,
    });
    assert.equal(second.response.status, 201);
    assert.equal(second.body?.ignored, true);
    const afterInbound = await loadHandoffEvidence(scope);
    assertLocallyBlockedHandoff(afterInbound.conversation);
    assert.equal(afterInbound.operations.length, 1);
    assert.equal(afterInbound.assistantMessages.length, 1);
    assert.equal(afterInbound.deliveries.length, 1);
    assert.equal(provider.requests.length, 0);
    assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
    const remote = chatwoot.getConversation(
      scope.accountId,
      scope.externalConversationId,
    );
    assert.equal(
      remote.messages.filter(
        (message) => String(message.id) === "block4a-z-inbound-after-handoff",
      ).length,
      1,
    );
    await assertRuntimeV2Absent(scope);
  },
);

test(
  "4A-N — operação, manifesto e delivery de handoff permanecem sanitizados e V1",
  { concurrency: false },
  async () => {
    const scope = await seedProductionHttpFixture(prisma, {
      label: "aw",
      chatwootBaseUrl: chatwoot.baseUrl,
      providerBaseUrl: `${provider.baseUrl}/v1`,
    });
    setHandoffRemoteConversation(scope, {
      assignee: { id: "block4a-human-assignee-aa" },
    });
    const inboundContent = "Quero falar com um atendente SEGREDO_HANDOFF_INTEGRAL";
    const result = await postWebhook(scope, {
      content: inboundContent,
      messageId: "block4a-aa-handoff-sanitized",
    });
    assert.equal(result.response.status, 201);
    const evidence = await loadHandoffEvidence(scope);
    const serialized = JSON.stringify({
      operation: evidence.operations[0],
      manifest: evidence.manifest,
      delivery: evidence.deliveries[0],
    });
    assert.doesNotMatch(serialized, /SEGREDO_HANDOFF_INTEGRAL/);
    assert.doesNotMatch(serialized, /\+00000000000/);
    assert.doesNotMatch(serialized, /block0-(?:webhook|chatwoot|provider)-token/);
    assert.doesNotMatch(serialized, /"authorization"\s*:|"api_access_token"\s*:/i);
    assert.doesNotMatch(serialized, /BASE DE CONHECIMENTO RELEVANTE/i);
    assert.equal(evidence.manifest.policyVersion, "V1_COMPATIBILITY_POLICY");
    assert.equal(evidence.operations[0].policyVersion, "V1_COMPATIBILITY_POLICY");
    assertSanitizedTurnManifest(evidence.manifest, { inboundContent });
    assertNoProviderCallsForHandoff();
    await assertRuntimeV2Absent(scope);
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
        payloadContractVersion: "CHATWOOT_TEXT_V1_RECOVERABLE",
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
    assert.ok(winners[0].attemptId);
    assert.equal(claims.filter((claim) => !claim.claimToken).length, 1);
    assert.equal(
      claims.every((claim) => claim.delivery.id === delivery.id),
      true,
    );

    let senderCalls = 0;
    senderCalls += 1;
    const acknowledged = await service.transitionClaimedV1OutboundDelivery({
      deliveryId: delivery.id,
      attemptId: winners[0].attemptId,
      claimToken: winners[0].claimToken,
      status: "ACKNOWLEDGED",
      externalMessageId: "claim-owner-external-id",
      retrySafety: "NOT_RETRYABLE",
      httpStatus: 201,
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
    assert.equal(delivery.retrySafety, "NOT_RETRYABLE");
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
  "L — HTTP 5xx exige reconciliação sem retry automático ou por duplicate",
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
    assert.equal(delivery.status, "UNCERTAIN");
    assert.equal(delivery.retrySafety, "RECONCILE_REQUIRED");
    assert.equal(delivery.attemptCount, 1);
    assert.equal(delivery.errorClass, "CHATWOOT_HTTP_AFTER_BOUNDARY");
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
    assert.equal(delivery.retrySafety, "RECONCILE_REQUIRED");
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
        payloadContractVersion: "CHATWOOT_TEXT_V1_RECOVERABLE",
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
  "Bloco 4B — operações parciais de handoff deverão possuir recovery e reconciliação automáticos sem duplicate como gatilho",
);
