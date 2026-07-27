import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";
import {
  OUTBOUND_RECOVERABLE_PAYLOAD_CONTRACT,
  createOutboundDeliveryPlan,
} from "../dist/assistant-conversations/outbound-delivery.js";
import { createOperationalHandoffPlan } from "../dist/assistant-conversations/operational-handoff.js";
import { createTurnExecutionId } from "../dist/assistant-conversations/turn-execution-manifest.js";
import { createV1TurnDecisionId } from "../dist/assistant-conversations/v1-turn-decision.js";
import { ChatwootInboxConfigService } from "../dist/chatwoot/chatwoot-inbox-config.service.js";
import {
  assertIsolatedServiceUrls,
  assertTcpPortClosed,
} from "./helpers/production-app-process.mjs";
import {
  TEST_ENCRYPTION_KEY_HEX,
  seedProductionHttpFixture,
} from "./helpers/production-fixtures.mjs";
import { createStatefulChatwootFake } from "./helpers/stateful-http-fakes.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Handoff recovery tests require the isolated DATABASE_URL");
}
assertIsolatedServiceUrls({
  databaseUrl,
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379/15",
});

const CONFIRMATION_TEXT = "Transferindo para um atendente...";
const USER_MESSAGE_TEXT = "Quero suporte humano técnico.";

let prisma;
let chatwoot;
const runtimeV2CompanyIds = new Set();

function createRecoveryService() {
  const chatwootConfig = new ChatwootInboxConfigService(prisma, {
    get(key) {
      if (key === "APP_ENCRYPTION_KEY") return TEST_ENCRYPTION_KEY_HEX;
      if (key === "NODE_ENV") return "test";
      return undefined;
    },
  });
  return new AssistantConversationsService(prisma, {}, {}, chatwootConfig);
}

async function waitFor(promise, label, timeoutMs = 10_000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function remoteConversationPath(scope) {
  return `/api/v1/accounts/${scope.accountId}/conversations/${scope.externalConversationId}`;
}

function setRemoteConversation(
  scope,
  {
    aiActive = true,
    status = "open",
    assigneeId = `human_${scope.assistantId}`,
    teamId = null,
  } = {},
) {
  chatwoot.setConversation({
    accountId: scope.accountId,
    conversationId: scope.externalConversationId,
    inboxId: scope.inboxId,
    aiActive,
    status,
    assignee: assigneeId ? { id: assigneeId } : null,
    team: teamId ? { id: teamId } : null,
  });
}

async function seedHandoffOperation(label, input = {}) {
  const scope = await seedProductionHttpFixture(prisma, {
    label,
    chatwootBaseUrl: chatwoot.baseUrl,
    providerBaseUrl: "http://127.0.0.1:9/v1",
    precreateConversation: true,
  });
  runtimeV2CompanyIds.add(scope.companyId);

  const status = input.status ?? "LOCALLY_BLOCKED";
  const requested = status === "REQUESTED";
  const expectedControlRevision = input.expectedControlRevision ?? 0;
  const postBlockControlRevision = requested
    ? null
    : input.postBlockControlRevision ?? expectedControlRevision + 1;

  if (!requested) {
    await prisma.assistantConversation.update({
      where: { id: scope.internalConversationId },
      data: {
        aiActive: false,
        pausedByHuman: true,
        controlRevision: postBlockControlRevision,
        lastAiPausedAt: input.now ?? new Date(),
        pauseReason: "OPERATIONAL_HUMAN_HANDOFF",
      },
    });
  }

  const userMessage = await prisma.assistantConversationMessage.create({
    data: {
      id: `handoff-recovery-${label}-user`,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.internalConversationId,
      role: "user",
      content: USER_MESSAGE_TEXT,
      source: "chatwoot",
      messageType: "text",
      externalMessageId: `handoff-recovery-${label}-external`,
      contextVersion: scope.contextVersion,
    },
  });
  const turnExecutionId = createTurnExecutionId({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    source: "chatwoot",
    accountId: scope.accountId,
    inboxId: scope.inboxId,
    externalConversationId: scope.externalConversationId,
    externalMessageId: userMessage.externalMessageId,
    contextVersion: scope.contextVersion,
    internalMessageId: userMessage.id,
  });
  const decisionId = createV1TurnDecisionId({ turnExecutionId });
  const plan = createOperationalHandoffPlan({
    turnExecutionId,
    decisionId,
    contextVersion: scope.contextVersion,
    expectedControlRevision,
    reasonCode: "CUSTOMER_REQUESTED_HUMAN",
  });
  const defaultAssigneeId = `human_${scope.assistantId}`;
  const destinationAssigneeId =
    input.destinationAssigneeId === undefined
      ? defaultAssigneeId
      : input.destinationAssigneeId;
  const destinationTeamId = input.destinationTeamId ?? null;
  const destinationType =
    input.destinationType ??
    (destinationAssigneeId
      ? "EXISTING_ASSIGNEE"
      : destinationTeamId
        ? "EXISTING_TEAM"
        : "UNRESOLVED");
  const destinationResolution =
    input.destinationResolution ??
    (destinationType === "UNRESOLVED" ? "UNRESOLVED" : "RESOLVED");
  const remotelyConfirmed =
    status === "REMOTE_CONFIRMED" ||
    status === "CONFIRMATION_PENDING" ||
    status === "COMPLETED";
  const now = input.now ?? new Date();

  const operation = await prisma.assistantHandoffOperation.create({
    data: {
      id: plan.operationId,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.internalConversationId,
      turnExecutionId,
      decisionId,
      userMessageId: userMessage.id,
      contextVersion: scope.contextVersion,
      idempotencyKey: plan.idempotencyKey,
      policyVersion: plan.policyVersion,
      expectedControlRevision,
      postBlockControlRevision,
      reason: plan.reasonCode,
      destinationType: requested ? "UNRESOLVED" : destinationType,
      destinationResolution: requested ? "UNRESOLVED" : destinationResolution,
      destinationAssigneeId: requested ? null : destinationAssigneeId,
      destinationTeamId: requested ? null : destinationTeamId,
      destinationInboxId: requested ? null : scope.inboxId,
      desiredAiActive: false,
      desiredStatus: "open",
      localBlockedAt: requested ? null : now,
      remoteMutationResult: input.remoteMutationResult ?? null,
      remoteMutationErrorCode: input.remoteMutationErrorCode ?? null,
      remoteVerificationResult:
        input.remoteVerificationResult ??
        (remotelyConfirmed ? "CONFIRMED" : null),
      observedAiActive:
        input.observedAiActive ?? (remotelyConfirmed ? false : null),
      observedStatus:
        input.observedStatus ?? (remotelyConfirmed ? "open" : null),
      observedAssigneeId:
        input.observedAssigneeId ??
        (remotelyConfirmed ? destinationAssigneeId : null),
      observedTeamId:
        input.observedTeamId ??
        (remotelyConfirmed ? destinationTeamId : null),
      observedAccountId:
        input.observedAccountId ?? (remotelyConfirmed ? scope.accountId : null),
      observedInboxId:
        input.observedInboxId ?? (remotelyConfirmed ? scope.inboxId : null),
      observedConversationId:
        input.observedConversationId ??
        (remotelyConfirmed ? scope.externalConversationId : null),
      remoteStateFingerprint:
        input.remoteStateFingerprint ??
        (remotelyConfirmed ? `remote_state_${label}` : null),
      verifiedAt: input.verifiedAt ?? (remotelyConfirmed ? now : null),
      confirmationAuthorizedAt:
        input.confirmationAuthorizedAt ?? (remotelyConfirmed ? now : null),
      status,
      attemptCount: input.attemptCount ?? 0,
      maxAttempts: input.maxAttempts ?? 3,
      recoverySafety:
        input.recoverySafety ??
        (requested || status === "LOCALLY_BLOCKED"
          ? "PROVEN_SAFE"
          : remotelyConfirmed
            ? "NOT_RETRYABLE"
            : "VERIFY_REMOTE_FIRST"),
      nextEligibleAt: input.nextEligibleAt ?? null,
      remoteBoundaryStartedAt: input.remoteBoundaryStartedAt ?? null,
      lastAttemptAt: input.lastAttemptAt ?? null,
      reconciliationStatus: input.reconciliationStatus ?? null,
      reconciliationEvidenceType: input.reconciliationEvidenceType ?? null,
      recoveryBlockedReason: input.recoveryBlockedReason ?? null,
      errorClass: input.errorClass ?? null,
      errorCode: input.errorCode ?? null,
    },
  });
  const historicAttemptCount = input.attemptCount ?? 0;
  for (let attemptNumber = 1; attemptNumber <= historicAttemptCount; attemptNumber += 1) {
    const startedAt = new Date(now.getTime() - (historicAttemptCount - attemptNumber + 1) * 1_000);
    await prisma.assistantHandoffAttempt.create({
      data: {
        operationId: operation.id,
        attemptNumber,
        owner: `historic_${label}_${attemptNumber}`,
        startedAt,
        leaseExpiresAt: new Date(startedAt.getTime() + 500),
        boundaryStartedAt:
          attemptNumber === historicAttemptCount
            ? input.remoteBoundaryStartedAt ?? null
            : null,
        finishedAt: new Date(startedAt.getTime() + 750),
        result: input.historicAttemptResult ?? "HISTORIC_ATTEMPT_RECORDED",
        recoverySafety: input.recoverySafety ?? operation.recoverySafety,
        mutationResult:
          attemptNumber === historicAttemptCount
            ? input.remoteMutationResult ?? null
            : null,
        errorCode:
          attemptNumber === historicAttemptCount
            ? input.remoteMutationErrorCode ?? input.errorCode ?? null
            : null,
      },
    });
  }

  setRemoteConversation(scope, {
    aiActive: input.remoteAiActive ?? !remotelyConfirmed,
    status: input.remoteStatus ?? "open",
    assigneeId:
      input.remoteAssigneeId === undefined
        ? defaultAssigneeId
        : input.remoteAssigneeId,
    teamId: input.remoteTeamId ?? null,
  });

  return {
    scope,
    operation,
    userMessage,
    turnExecutionId,
    decisionId,
    defaultAssigneeId,
  };
}

async function createConfirmationDelivery(fixture, input = {}) {
  const assistantMessage = await prisma.assistantConversationMessage.create({
    data: {
      companyId: fixture.scope.companyId,
      assistantId: fixture.scope.assistantId,
      conversationId: fixture.scope.internalConversationId,
      role: "assistant",
      content: CONFIRMATION_TEXT,
      source: "chatwoot",
      mode: "explicit-human-handoff",
      contextVersion: fixture.scope.contextVersion,
      externalPayload: {
        turnExecutionId: fixture.turnExecutionId,
        decisionId: fixture.decisionId,
        handoffOperationId: fixture.operation.id,
      },
    },
  });
  const plan = createOutboundDeliveryPlan({
    turnExecutionId: fixture.turnExecutionId,
    decisionId: fixture.decisionId,
    blockOrdinal: 1,
    expectedContextVersion: fixture.scope.contextVersion,
    expectedControlRevision: fixture.operation.postBlockControlRevision,
    sender: "CHATWOOT_V1",
    content: CONFIRMATION_TEXT,
  });
  const status = input.status ?? "PENDING";
  const attemptCount = input.attemptCount ?? 0;
  const now = input.now ?? new Date();
  const delivery = await prisma.assistantOutboundDelivery.create({
    data: {
      companyId: fixture.scope.companyId,
      assistantId: fixture.scope.assistantId,
      conversationId: fixture.scope.internalConversationId,
      assistantMessageId: assistantMessage.id,
      turnExecutionId: plan.turnExecutionId,
      decisionId: plan.decisionId,
      blockOrdinal: plan.blockOrdinal,
      idempotencyKey: plan.idempotencyKey,
      policyVersion: plan.policyVersion,
      expectedContextVersion: plan.expectedContextVersion,
      expectedControlRevision: plan.expectedControlRevision,
      sender: plan.sender,
      payloadHash: plan.payloadHash,
      payloadSize: plan.payloadSize,
      payloadContractVersion: OUTBOUND_RECOVERABLE_PAYLOAD_CONTRACT,
      handoff: true,
      handoffOperationId: fixture.operation.id,
      status,
      retrySafety:
        input.retrySafety ??
        (status === "UNCERTAIN" ? "RECONCILE_REQUIRED" : "UNKNOWN"),
      attemptCount,
      maxAttempts: 3,
      attemptedAt: attemptCount > 0 ? now : null,
      failedAt: status === "UNCERTAIN" ? now : null,
    },
  });
  if (attemptCount > 0) {
    await prisma.assistantOutboundAttempt.create({
      data: {
        deliveryId: delivery.id,
        attemptNumber: attemptCount,
        owner: `historic_${fixture.scope.assistantId}`,
        startedAt: now,
        leaseExpiresAt: new Date(now.getTime() + 60_000),
        boundaryStartedAt: status === "UNCERTAIN" ? now : null,
        finishedAt: now,
        result: status,
        retrySafety: delivery.retrySafety,
      },
    });
  }
  await prisma.assistantHandoffOperation.update({
    where: { id: fixture.operation.id },
    data: {
      status: "CONFIRMATION_PENDING",
      confirmationMessageId: assistantMessage.id,
      confirmationDeliveryCreatedAt: now,
    },
  });
  return { assistantMessage, delivery };
}

async function loadEvidence(operationId) {
  const operation = await prisma.assistantHandoffOperation.findUniqueOrThrow({
    where: { id: operationId },
    include: {
      attempts: { orderBy: { attemptNumber: "asc" } },
      outboundDeliveries: {
        include: { attempts: { orderBy: { attemptNumber: "asc" } } },
      },
      conversation: true,
    },
  });
  const [messages, runtimeLogs] = await Promise.all([
    prisma.assistantConversationMessage.findMany({
      where: { conversationId: operation.conversationId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.assistantRuntimeLog.findMany({
      where: { conversationId: operation.conversationId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  return {
    operation,
    messages,
    runtimeLogs,
    userMessages: messages.filter((message) => message.role === "user"),
    assistantMessages: messages.filter((message) => message.role === "assistant"),
  };
}

function assertLocallyBlocked(evidence) {
  assert.equal(evidence.operation.conversation.aiActive, false);
  assert.equal(evidence.operation.conversation.pausedByHuman, true);
  assert.equal(
    evidence.operation.conversation.controlRevision,
    evidence.operation.postBlockControlRevision,
  );
  assert.equal(evidence.operation.conversation.currentContextVersion, 1);
}

function assertSingleCompletedHandoff(evidence, fixture) {
  assertLocallyBlocked(evidence);
  assert.equal(evidence.operation.status, "COMPLETED");
  assert.equal(evidence.operation.turnExecutionId, fixture.turnExecutionId);
  assert.equal(evidence.operation.decisionId, fixture.decisionId);
  assert.equal(evidence.operation.remoteVerificationResult, "CONFIRMED");
  assert.equal(evidence.operation.observedAiActive, false);
  assert.equal(evidence.assistantMessages.length, 1);
  assert.equal(evidence.assistantMessages[0].content, CONFIRMATION_TEXT);
  assert.equal(evidence.operation.confirmationMessageId, evidence.assistantMessages[0].id);
  assert.equal(evidence.operation.outboundDeliveries.length, 1);
  const [delivery] = evidence.operation.outboundDeliveries;
  assert.equal(delivery.handoffOperationId, evidence.operation.id);
  assert.equal(delivery.decisionId, fixture.decisionId);
  assert.equal(delivery.status, "ACKNOWLEDGED");
  assert.equal(delivery.attemptCount, 1);
  assert.ok(delivery.externalMessageId);
  assert.equal(evidence.runtimeLogs.length, 1);
  const manifest = evidence.runtimeLogs[0].metadata?.turnExecutionManifest;
  assert.equal(manifest?.turnExecutionId, fixture.turnExecutionId);
  assert.equal(manifest?.decisionId, fixture.decisionId);
  assert.equal(manifest?.policyVersion, "V1_COMPATIBILITY_POLICY");
  assert.equal(manifest?.handoff?.operationId, evidence.operation.id);
  assert.equal(manifest?.handoff?.status, "COMPLETED");
  assert.equal(manifest?.handoff?.recovery?.deliveryId, delivery.id);
}

function assertNoRemoteMutationOrOutbound() {
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 0);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 0);
}

before(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();
  chatwoot = await createStatefulChatwootFake();
});

beforeEach(() => {
  chatwoot.reset();
  runtimeV2CompanyIds.clear();
});

afterEach(async () => {
  const companyIds = [...runtimeV2CompanyIds];
  if (companyIds.length === 0) return;
  assert.equal(
    await prisma.assistantConversationStateV2.count({
      where: { companyId: { in: companyIds } },
    }),
    0,
  );
  assert.equal(
    await prisma.assistantConversationStateV2Event.count({
      where: { companyId: { in: companyIds } },
    }),
    0,
  );
  for (const outbound of chatwoot.calls("chatwoot_outbound")) {
    assert.equal(outbound.body?.content_attributes?.runtime_v2, undefined);
    assert.equal(outbound.body?.content_attributes?.source_version, undefined);
  }
});

after(async () => {
  const port = chatwoot?.port;
  await prisma?.$disconnect();
  await chatwoot?.close();
  if (port) await assertTcpPortClosed(port, "handoff recovery fake Chatwoot");
});

test("A — REQUESTED retoma a operação original, bloqueia localmente e conclui uma confirmação", async () => {
  const fixture = await seedHandoffOperation("ay", { status: "REQUESTED" });
  const [result] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(result.action, "CONFIRMATION_RECOVERED");
  const evidence = await loadEvidence(fixture.operation.id);
  assertSingleCompletedHandoff(evidence, fixture);
  assert.equal(evidence.operation.expectedControlRevision, 0);
  assert.equal(evidence.operation.postBlockControlRevision, 1);
  assert.equal(evidence.operation.attemptCount, 1);
  assert.equal(evidence.operation.attempts.length, 1);
  assert.equal(chatwoot.calls("chatwoot_read").length, 2);
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 1);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
});

test("B — LOCALLY_BLOCKED sem tentativa executa somente a primeira mutation e confirma", async () => {
  const fixture = await seedHandoffOperation("az");
  const [result] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(result.action, "CONFIRMATION_RECOVERED");
  const evidence = await loadEvidence(fixture.operation.id);
  assertSingleCompletedHandoff(evidence, fixture);
  assert.equal(evidence.operation.attemptCount, 1);
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 1);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
});

test("C/D/E — efeito remoto após 5xx, timeout ou interrupção é reconciliado por GET sem nova mutation", async () => {
  const cases = [
    {
      label: "ba",
      remoteMutationResult: "FAILED",
      remoteMutationErrorCode: "CHATWOOT_HANDOFF_MUTATION_HTTP_503",
      errorCode: "CHATWOOT_HANDOFF_MUTATION_HTTP_503",
    },
    {
      label: "bb",
      remoteMutationResult: "AMBIGUOUS",
      remoteMutationErrorCode: "ABORT_ERR",
      errorCode: "ABORT_ERR",
    },
    {
      label: "bc",
      remoteMutationResult: null,
      remoteMutationErrorCode: null,
      errorCode: "PROCESS_INTERRUPTED_AFTER_REMOTE_EFFECT",
    },
  ];
  for (const item of cases) {
    const fixture = await seedHandoffOperation(item.label, {
      status: "RECONCILIATION_REQUIRED",
      attemptCount: 1,
      recoverySafety: "VERIFY_REMOTE_FIRST",
      remoteAiActive: false,
      remoteMutationResult: item.remoteMutationResult,
      remoteMutationErrorCode: item.remoteMutationErrorCode,
      remoteBoundaryStartedAt: new Date(),
      reconciliationStatus: "INCONCLUSIVE",
      errorCode: item.errorCode,
    });
    const [result] = await createRecoveryService().runHandoffRecoveryOnce({
      operationIds: [fixture.operation.id],
    });
    assert.equal(result.action, "CONFIRMATION_RECOVERED");
    const evidence = await loadEvidence(fixture.operation.id);
    assertSingleCompletedHandoff(evidence, fixture);
    assert.equal(evidence.operation.attemptCount, 1);
  }
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 0);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, cases.length);
});

test("F — mutation ambígua inconclusiva faz GET e nunca repete mutation nem confirma", async () => {
  const fixture = await seedHandoffOperation("bd", {
    status: "RECONCILIATION_REQUIRED",
    attemptCount: 1,
    recoverySafety: "VERIFY_REMOTE_FIRST",
    remoteAiActive: true,
    remoteMutationResult: "AMBIGUOUS",
    remoteMutationErrorCode: "ABORT_ERR",
    remoteBoundaryStartedAt: new Date(),
  });
  const [result] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(result.action, "RECONCILIATION_INCONCLUSIVE");
  const evidence = await loadEvidence(fixture.operation.id);
  assertLocallyBlocked(evidence);
  assert.equal(evidence.operation.status, "RECONCILIATION_REQUIRED");
  assert.equal(evidence.operation.recoverySafety, "VERIFY_REMOTE_FIRST");
  assert.equal(evidence.operation.decisionId, fixture.decisionId);
  assert.equal(evidence.assistantMessages.length, 0);
  assert.equal(evidence.operation.outboundDeliveries.length, 0);
  assert.equal(chatwoot.calls("chatwoot_read").length, 1);
  assertNoRemoteMutationOrOutbound();
});

test("G/Q — retry PROVEN_SAFE respeita backoff e somente cruza a fronteira quando elegível", async () => {
  const future = new Date(Date.now() + 60_000);
  const fixture = await seedHandoffOperation("be", {
    status: "LOCALLY_BLOCKED",
    attemptCount: 1,
    recoverySafety: "PROVEN_SAFE",
    remoteMutationResult: "FAILED",
    remoteMutationErrorCode: "ECONNREFUSED",
    nextEligibleAt: future,
  });
  const service = createRecoveryService();
  const [blocked] = await service.runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(blocked.action, "BACKOFF");
  assert.equal(chatwoot.requests.length, 0);
  assert.equal(
    (await loadEvidence(fixture.operation.id)).operation.attempts.length,
    1,
  );

  await prisma.assistantHandoffOperation.update({
    where: { id: fixture.operation.id },
    data: { nextEligibleAt: new Date(Date.now() - 1_000) },
  });
  const [retried] = await service.runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(retried.action, "CONFIRMATION_RECOVERED");
  const evidence = await loadEvidence(fixture.operation.id);
  assertSingleCompletedHandoff(evidence, fixture);
  assert.equal(evidence.operation.attemptCount, 2);
  assert.equal(evidence.operation.attempts.length, 2);
  assert.deepEqual(
    evidence.operation.attempts.map((attempt) => attempt.attemptNumber),
    [1, 2],
  );
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 1);
});

test("H — REMOTE_CONFIRMED sobrevive ao restart e cria mensagem e delivery uma única vez", async () => {
  const fixture = await seedHandoffOperation("bf", {
    status: "REMOTE_CONFIRMED",
    remoteAiActive: false,
  });
  await prisma.$disconnect();
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();

  const [result] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(result.action, "CONFIRMATION_RECOVERED");
  const evidence = await loadEvidence(fixture.operation.id);
  assertSingleCompletedHandoff(evidence, fixture);
  assert.equal(chatwoot.calls("chatwoot_read").length, 0);
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 0);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
});

test("I — CONFIRMATION_PENDING delega somente ao recovery do ledger existente", async () => {
  const fixture = await seedHandoffOperation("bg", {
    status: "REMOTE_CONFIRMED",
    remoteAiActive: false,
  });
  const confirmation = await createConfirmationDelivery(fixture);
  const messagesBefore = (
    await loadEvidence(fixture.operation.id)
  ).assistantMessages.length;
  const [result] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(result.action, "CONFIRMATION_RECOVERED");
  const evidence = await loadEvidence(fixture.operation.id);
  assert.equal(evidence.operation.status, "COMPLETED");
  assert.equal(evidence.assistantMessages.length, messagesBefore);
  assert.equal(evidence.operation.outboundDeliveries.length, 1);
  assert.equal(evidence.operation.outboundDeliveries[0].id, confirmation.delivery.id);
  assert.equal(evidence.operation.outboundDeliveries[0].status, "ACKNOWLEDGED");
  assert.equal(chatwoot.calls("chatwoot_read").length, 0);
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 0);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
});

test("J — confirmação UNCERTAIN não cria outro texto, delivery, mutation ou POST", async () => {
  const fixture = await seedHandoffOperation("bh", {
    status: "REMOTE_CONFIRMED",
    remoteAiActive: false,
  });
  const confirmation = await createConfirmationDelivery(fixture, {
    status: "UNCERTAIN",
    retrySafety: "RECONCILE_REQUIRED",
    attemptCount: 1,
  });
  const [result] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(result.action, "NOOP");
  const evidence = await loadEvidence(fixture.operation.id);
  assert.equal(evidence.operation.status, "CONFIRMATION_PENDING");
  assert.equal(evidence.assistantMessages.length, 1);
  assert.equal(evidence.operation.outboundDeliveries.length, 1);
  assert.equal(evidence.operation.outboundDeliveries[0].id, confirmation.delivery.id);
  assert.equal(evidence.operation.outboundDeliveries[0].status, "UNCERTAIN");
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 0);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 0);
});

test("K — dois workers disputam um lease e somente um executa mutation e confirmação", async () => {
  const fixture = await seedHandoffOperation("bi");
  const deferredRead = chatwoot.deferNextConversationRead({
    path: remoteConversationPath(fixture.scope),
  });
  const first = createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  await waitFor(deferredRead.started, "first handoff recovery read");
  let second;
  try {
    second = await createRecoveryService().runHandoffRecoveryOnce({
      operationIds: [fixture.operation.id],
    });
  } finally {
    deferredRead.release();
  }
  assert.equal(second[0].action, "LEASE_ACTIVE");
  const firstResult = await first;
  assert.equal(firstResult[0].action, "CONFIRMATION_RECOVERED");
  const evidence = await loadEvidence(fixture.operation.id);
  assertSingleCompletedHandoff(evidence, fixture);
  assert.equal(evidence.operation.attempts.length, 1);
  assert.equal(evidence.operation.attemptCount, 1);
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 1);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
});

test("L — reset durante recovery supersede a operação antes da mutation remota", async () => {
  const fixture = await seedHandoffOperation("bj");
  const deferredRead = chatwoot.deferNextConversationRead({
    path: remoteConversationPath(fixture.scope),
  });
  const recovery = createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  await waitFor(deferredRead.started, "handoff recovery read before reset");
  try {
    await prisma.assistantConversation.update({
      where: { id: fixture.scope.internalConversationId },
      data: {
        currentContextVersion: { increment: 1 },
        controlRevision: { increment: 1 },
        aiActive: true,
        pausedByHuman: false,
      },
    });
  } finally {
    deferredRead.release();
  }
  const [result] = await recovery;
  assert.equal(result.action, "SUPERSEDED");
  const evidence = await loadEvidence(fixture.operation.id);
  assert.equal(evidence.operation.status, "SUPERSEDED");
  assert.equal(evidence.operation.conversation.currentContextVersion, 2);
  assert.equal(evidence.operation.conversation.controlRevision, 2);
  assert.equal(evidence.assistantMessages.length, 0);
  assert.equal(evidence.operation.outboundDeliveries.length, 0);
  assertNoRemoteMutationOrOutbound();
});

test("L2 — mudança do alvo Chatwoot entre GET e mutation falha fechado", async () => {
  const fixture = await seedHandoffOperation("bp");
  const deferredRead = chatwoot.deferNextConversationRead({
    path: remoteConversationPath(fixture.scope),
  });
  const recovery = createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  await waitFor(deferredRead.started, "handoff recovery read before target change");
  try {
    await prisma.chatwootInboxConfig.update({
      where: { id: fixture.scope.bindingId },
      data: { baseUrl: "http://127.0.0.1:9" },
    });
  } finally {
    deferredRead.release();
  }
  const [result] = await recovery;
  assert.equal(result.action, "REMOTE_MUTATION_ATTEMPTED");
  const evidence = await loadEvidence(fixture.operation.id);
  assertLocallyBlocked(evidence);
  assert.equal(evidence.operation.status, "FAILED_TERMINAL");
  assert.equal(evidence.operation.recoverySafety, "NOT_RETRYABLE");
  assert.equal(
    evidence.operation.remoteMutationErrorCode,
    "CHATWOOT_HANDOFF_REMOTE_TARGET_CHANGED",
  );
  assert.equal(evidence.operation.nextEligibleAt, null);
  assert.equal(evidence.assistantMessages.length, 0);
  assert.equal(evidence.operation.outboundDeliveries.length, 0);
  assert.equal(chatwoot.calls("chatwoot_read").length, 1);
  assertNoRemoteMutationOrOutbound();
});

test("M — destino alterado por humano é aceito e auditado sem restaurar o destino anterior", async () => {
  const fixture = await seedHandoffOperation("bk", {
    status: "RECONCILIATION_REQUIRED",
    attemptCount: 1,
    recoverySafety: "VERIFY_REMOTE_FIRST",
    remoteAiActive: false,
    destinationAssigneeId: "original_human_bk",
    remoteAssigneeId: "replacement_human_bk",
  });
  const [result] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(result.action, "CONFIRMATION_RECOVERED");
  const evidence = await loadEvidence(fixture.operation.id);
  assertSingleCompletedHandoff(evidence, fixture);
  assert.equal(evidence.operation.destinationAssigneeId, "replacement_human_bk");
  assert.equal(evidence.operation.observedAssigneeId, "replacement_human_bk");
  assert.equal(evidence.operation.externalInterventionObserved, true);
  assert.ok(evidence.operation.externalInterventionAt);
  assert.equal(chatwoot.calls("chatwoot_mutation").length, 0);
});

test("N — destino removido mantém reconciliação e não inventa assignment ou confirmação", async () => {
  const fixture = await seedHandoffOperation("bl", {
    status: "RECONCILIATION_REQUIRED",
    attemptCount: 1,
    recoverySafety: "VERIFY_REMOTE_FIRST",
    remoteAiActive: false,
    remoteAssigneeId: null,
    remoteTeamId: null,
  });
  const [result] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(result.action, "RECONCILIATION_INCONCLUSIVE");
  const evidence = await loadEvidence(fixture.operation.id);
  assert.equal(evidence.operation.status, "RECONCILIATION_REQUIRED");
  assert.equal(evidence.operation.recoveryBlockedReason, "DESTINATION_UNRESOLVED");
  assert.equal(evidence.operation.decisionId, fixture.decisionId);
  assert.equal(evidence.assistantMessages.length, 0);
  assert.equal(evidence.operation.outboundDeliveries.length, 0);
  assert.equal(
    chatwoot.getConversation(
      fixture.scope.accountId,
      fixture.scope.externalConversationId,
    ).assignee,
    null,
  );
  assertNoRemoteMutationOrOutbound();
});

test("O — operação concluída é no-op em nova varredura e não duplica efeitos", async () => {
  const fixture = await seedHandoffOperation("bm");
  const service = createRecoveryService();
  await service.runHandoffRecoveryOnce({ operationIds: [fixture.operation.id] });
  const calls = {
    reads: chatwoot.calls("chatwoot_read").length,
    mutations: chatwoot.calls("chatwoot_mutation").length,
    outbounds: chatwoot.calls("chatwoot_outbound").length,
  };
  const messages = (await loadEvidence(fixture.operation.id)).messages.length;
  const [second] = await service.runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(second, undefined);
  const evidence = await loadEvidence(fixture.operation.id);
  assert.equal(evidence.messages.length, messages);
  assert.equal(evidence.operation.outboundDeliveries.length, 1);
  assert.deepEqual(
    {
      reads: chatwoot.calls("chatwoot_read").length,
      mutations: chatwoot.calls("chatwoot_mutation").length,
      outbounds: chatwoot.calls("chatwoot_outbound").length,
    },
    calls,
  );
});

test("Q — budget de mutation esgotado ainda permite diagnóstico por GET, sem nova mutation", async () => {
  const fixture = await seedHandoffOperation("bn", {
    status: "LOCALLY_BLOCKED",
    attemptCount: 3,
    maxAttempts: 3,
    recoverySafety: "PROVEN_SAFE",
    remoteAiActive: true,
  });
  const [result] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(result.action, "BUDGET_EXHAUSTED");
  const evidence = await loadEvidence(fixture.operation.id);
  assertLocallyBlocked(evidence);
  assert.equal(evidence.operation.status, "RECONCILIATION_REQUIRED");
  assert.equal(evidence.operation.attemptCount, 3);
  assert.equal(evidence.operation.recoverySafety, "NOT_RETRYABLE");
  assert.equal(evidence.operation.decisionId, fixture.decisionId);
  assert.equal(
    evidence.operation.recoveryBlockedReason,
    "HANDOFF_MUTATION_BUDGET_EXHAUSTED",
  );
  assert.equal(evidence.assistantMessages.length, 0);
  assert.equal(evidence.operation.outboundDeliveries.length, 0);
  assert.equal(chatwoot.calls("chatwoot_read").length, 1);
  assertNoRemoteMutationOrOutbound();

  const [reconciledAgain] = await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  assert.equal(reconciledAgain.action, "RECONCILIATION_INCONCLUSIVE");
  const evidenceAfterSecondGet = await loadEvidence(fixture.operation.id);
  assertLocallyBlocked(evidenceAfterSecondGet);
  assert.equal(
    evidenceAfterSecondGet.operation.status,
    "RECONCILIATION_REQUIRED",
  );
  assert.equal(evidenceAfterSecondGet.operation.recoverySafety, "NOT_RETRYABLE");
  assert.equal(evidenceAfterSecondGet.operation.attemptCount, 3);
  assert.equal(evidenceAfterSecondGet.operation.decisionId, fixture.decisionId);
  assert.equal(evidenceAfterSecondGet.assistantMessages.length, 0);
  assert.equal(evidenceAfterSecondGet.operation.outboundDeliveries.length, 0);
  assert.equal(chatwoot.calls("chatwoot_read").length, 2);
  assertNoRemoteMutationOrOutbound();
});

test("P — manifesto, operação e attempts permanecem sanitizados e Runtime V2 ausente", async () => {
  const fixture = await seedHandoffOperation("bo");
  await createRecoveryService().runHandoffRecoveryOnce({
    operationIds: [fixture.operation.id],
  });
  const evidence = await loadEvidence(fixture.operation.id);
  assertSingleCompletedHandoff(evidence, fixture);
  const serialized = JSON.stringify({
    operation: evidence.operation,
    runtimeMetadata: evidence.runtimeLogs.map((runtimeLog) => runtimeLog.metadata),
  });
  assert.doesNotMatch(serialized, new RegExp(USER_MESSAGE_TEXT, "i"));
  assert.doesNotMatch(
    serialized,
    /"(?:authorization|api_access_token)"\s*:|bearer\s+[A-Za-z0-9._~+/=-]+|signed[_-]?url|BASE DE CONHECIMENTO/i,
  );
  assert.doesNotMatch(serialized, /block0-chatwoot-token|block0-provider-token/i);
  assert.doesNotMatch(serialized, /prompt completo|full knowledge/i);
  assert.match(
    evidence.runtimeLogs[0].metadata?.turnExecutionManifest?.handoff?.recovery
      ?.schemaVersion ?? "",
    /^ASSISTANT_HANDOFF_RECOVERY_V1$/,
  );
});
