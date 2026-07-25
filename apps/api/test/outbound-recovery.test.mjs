import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";
import {
  OUTBOUND_RECOVERABLE_PAYLOAD_CONTRACT,
  createOutboundDeliveryPlan,
} from "../dist/assistant-conversations/outbound-delivery.js";
import { OutboundRecoveryCoordinator } from "../dist/assistant-conversations/outbound-recovery-coordinator.js";
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
  throw new Error("Outbound recovery tests require the isolated DATABASE_URL");
}
assertIsolatedServiceUrls({
  databaseUrl,
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379/15",
});

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

function remoteMessageCount(scope) {
  return (
    chatwoot
      .getConversation(scope.accountId, scope.externalConversationId)
      ?.messages.filter((message) => message.direction === "outbound").length ?? 0
  );
}

async function createDeliveryForScope(scope, input = {}) {
  const suffix = input.suffix ?? "delivery";
  const technicalScope = scope.assistantId;
  const content =
    input.content ?? `Resposta técnica sanitizada ${technicalScope} ${suffix}.`;
  const conversation = await prisma.assistantConversation.findUniqueOrThrow({
    where: { id: scope.internalConversationId },
  });
  const assistantMessage = await prisma.assistantConversationMessage.create({
    data: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.internalConversationId,
      role: "assistant",
      content,
      source: "tests",
      contextVersion: conversation.currentContextVersion,
    },
  });
  const plan = createOutboundDeliveryPlan({
    turnExecutionId: `turn_v1_recovery_${technicalScope}_${suffix}`,
    decisionId: `decision_v1_recovery_${technicalScope}_${suffix}`,
    blockOrdinal: input.blockOrdinal ?? 1,
    expectedContextVersion:
      input.expectedContextVersion ?? conversation.currentContextVersion,
    expectedControlRevision:
      input.expectedControlRevision ?? conversation.controlRevision,
    sender: "CHATWOOT_V1",
    content,
  });
  const now = input.now ?? new Date();
  const status = input.status ?? "PENDING";
  const attemptCount = input.attemptCount ?? 0;
  const attemptOwner =
    status === "SENDING"
      ? input.attemptOwner ?? `claim_${technicalScope}_${suffix}`
      : null;
  const delivery = await prisma.assistantOutboundDelivery.create({
    data: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.internalConversationId,
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
      payloadContractVersion:
        input.payloadContractVersion ?? OUTBOUND_RECOVERABLE_PAYLOAD_CONTRACT,
      handoff: input.handoff ?? false,
      status,
      retrySafety: input.retrySafety ?? "UNKNOWN",
      attemptCount,
      maxAttempts: input.maxAttempts ?? 3,
      attemptOwner,
      attemptedAt: attemptCount > 0 ? input.attemptedAt ?? now : null,
      claimStartedAt:
        status === "SENDING" ? input.claimStartedAt ?? now : null,
      claimExpiresAt:
        status === "SENDING"
          ? input.claimExpiresAt ?? new Date(now.getTime() + 60_000)
          : null,
      nextEligibleAt: input.nextEligibleAt ?? null,
      acknowledgedAt: status === "ACKNOWLEDGED" ? input.acknowledgedAt ?? now : null,
      failedAt:
        ["FAILED_RETRYABLE", "FAILED_TERMINAL", "UNCERTAIN"].includes(status)
          ? input.failedAt ?? now
          : null,
      externalMessageId: input.externalMessageId ?? null,
      errorClass: input.errorClass ?? null,
      errorCode: input.errorCode ?? null,
    },
  });
  if (attemptCount > 0) {
    await prisma.assistantOutboundAttempt.create({
      data: {
        deliveryId: delivery.id,
        attemptNumber: attemptCount,
        owner: attemptOwner ?? `historic_${technicalScope}_${suffix}`,
        startedAt: input.attemptStartedAt ?? now,
        leaseExpiresAt:
          input.claimExpiresAt ?? new Date(now.getTime() + 60_000),
        boundaryStartedAt: input.boundaryStartedAt ?? null,
        finishedAt: status === "SENDING" ? null : input.finishedAt ?? now,
        result: status === "SENDING" ? "SENDING" : status,
        retrySafety: input.retrySafety ?? "UNKNOWN",
        externalMessageId: input.externalMessageId ?? null,
        errorClass: input.errorClass ?? null,
        errorCode: input.errorCode ?? null,
      },
    });
  }
  await prisma.assistantRuntimeLog.create({
    data: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.internalConversationId,
      assistantMessageId: assistantMessage.id,
      mode: "ai-runtime",
      status: "COMPLETED",
      metadata: {
        turnExecutionManifest: {
          schemaVersion: "TURN_EXECUTION_MANIFEST_V1",
          turnExecutionId: plan.turnExecutionId,
          policyVersion: "V1_COMPATIBILITY_POLICY",
          outbound: {
            deliveries: [
              {
                schemaVersion: "ASSISTANT_OUTBOUND_DELIVERY_V1",
                deliveryId: delivery.id,
                status,
                attemptCount,
              },
            ],
          },
        },
      },
    },
  });
  return { scope, conversation, assistantMessage, delivery };
}

async function seedRecoveryDelivery(label, input = {}) {
  const scope = await seedProductionHttpFixture(prisma, {
    label,
    chatwootBaseUrl: chatwoot.baseUrl,
    providerBaseUrl: "http://127.0.0.1:9/v1",
    precreateConversation: true,
  });
  runtimeV2CompanyIds.add(scope.companyId);
  chatwoot.setConversation({
    accountId: scope.accountId,
    conversationId: scope.externalConversationId,
    inboxId: scope.inboxId,
    aiActive: true,
  });
  return createDeliveryForScope(scope, input);
}

async function deliveryWithAttempts(id) {
  return prisma.assistantOutboundDelivery.findUniqueOrThrow({
    where: { id },
    include: { attempts: { orderBy: { attemptNumber: "asc" } } },
  });
}

function setRemoteMessage(scope, delivery, externalMessageId) {
  chatwoot.setConversation({
    accountId: scope.accountId,
    conversationId: scope.externalConversationId,
    inboxId: scope.inboxId,
    aiActive: true,
    messages: [
      {
        id: externalMessageId,
        content: "Resposta remota já criada.",
        direction: "outbound",
        content_attributes: {
          cubo_outbound_delivery_id: delivery.id,
        },
      },
    ],
  });
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
  }
});

after(async () => {
  const port = chatwoot?.port;
  await prisma?.$disconnect();
  await chatwoot?.close();
  if (port) await assertTcpPortClosed(port, "outbound recovery fake Chatwoot");
});

test("A — recovery de PENDING envia uma vez sem recriar decisão ou mensagem", async () => {
  const fixture = await seedRecoveryDelivery("o");
  const beforeMessages = await prisma.assistantConversationMessage.count({
    where: { conversationId: fixture.scope.internalConversationId },
  });
  const results = await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].status, "ACKNOWLEDGED");
  const persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.attemptCount, 1);
  assert.equal(persisted.attempts.length, 1);
  assert.equal(persisted.attempts[0].result, "ACKNOWLEDGED");
  assert.equal(remoteMessageCount(fixture.scope), 1);
  assert.equal(
    await prisma.assistantConversationMessage.count({
      where: { conversationId: fixture.scope.internalConversationId },
    }),
    beforeMessages,
  );
  assert.equal(
    await prisma.assistantOutboundDelivery.count({
      where: { decisionId: fixture.delivery.decisionId },
    }),
    1,
  );
});

test("B — FAILED_RETRYABLE somente recupera com safety comprovada e backoff vencido", async () => {
  const fixture = await seedRecoveryDelivery("p", {
    status: "FAILED_RETRYABLE",
    retrySafety: "PROVEN_SAFE",
    attemptCount: 1,
    nextEligibleAt: new Date(Date.now() - 1_000),
  });
  await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  const persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.status, "ACKNOWLEDGED");
  assert.equal(persisted.attemptCount, 2);
  assert.deepEqual(
    persisted.attempts.map((attempt) => attempt.attemptNumber),
    [1, 2],
  );
  assert.equal(remoteMessageCount(fixture.scope), 1);
});

test("C — FAILED_RETRYABLE histórico com safety UNKNOWN nunca é reenviado", async () => {
  const fixture = await seedRecoveryDelivery("q", {
    status: "FAILED_RETRYABLE",
    retrySafety: "UNKNOWN",
    attemptCount: 1,
  });
  const [result] = await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  assert.equal(result.action, "RECONCILIATION_INCONCLUSIVE");
  const persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.status, "UNCERTAIN");
  assert.equal(persisted.retrySafety, "RECONCILE_REQUIRED");
  assert.equal(persisted.attemptCount, 1);
  assert.equal(remoteMessageCount(fixture.scope), 0);
});

test("D — 5xx sem efeito remoto não é considerado prova suficiente para retry", async () => {
  const fixture = await seedRecoveryDelivery("r");
  chatwoot.enqueueBehavior({
    category: "chatwoot_outbound",
    kind: "configured_5xx",
    status: 503,
  });
  await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  const persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.status, "UNCERTAIN");
  assert.equal(persisted.retrySafety, "RECONCILE_REQUIRED");
  assert.equal(persisted.attempts[0].httpStatus, 503);
  assert.equal(remoteMessageCount(fixture.scope), 0);
  const outboundCalls = chatwoot.calls("chatwoot_outbound").length;
  await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  assert.equal(chatwoot.calls("chatwoot_outbound").length, outboundCalls);
});

test("E — 5xx após criação é reconciliado por referência sem reenvio", async () => {
  const fixture = await seedRecoveryDelivery("s");
  chatwoot.enqueueBehavior({
    category: "chatwoot_outbound",
    kind: "accepted_5xx",
    status: 503,
  });
  const service = createRecoveryService();
  await service.runOutboundRecoveryOnce({ deliveryIds: [fixture.delivery.id] });
  assert.equal((await deliveryWithAttempts(fixture.delivery.id)).status, "UNCERTAIN");
  assert.equal(remoteMessageCount(fixture.scope), 1);
  const posts = chatwoot.calls("chatwoot_outbound").length;
  await service.runOutboundRecoveryOnce({ deliveryIds: [fixture.delivery.id] });
  const reconciled = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(reconciled.status, "ACKNOWLEDGED");
  assert.ok(reconciled.externalMessageId);
  assert.equal(reconciled.reconciliationEvidenceType, "REMOTE_CONTENT_ATTRIBUTE");
  assert.equal(chatwoot.calls("chatwoot_outbound").length, posts);
});

test("F — timeout após criação permanece incerto até reconciliação positiva", async () => {
  const fixture = await seedRecoveryDelivery("t");
  chatwoot.enqueueBehavior({
    category: "chatwoot_outbound",
    kind: "accepted_timeout",
    timeoutMs: 50,
  });
  const service = createRecoveryService();
  await service.runOutboundRecoveryOnce({ deliveryIds: [fixture.delivery.id] });
  assert.equal((await deliveryWithAttempts(fixture.delivery.id)).status, "UNCERTAIN");
  assert.equal(remoteMessageCount(fixture.scope), 1);
  await service.runOutboundRecoveryOnce({ deliveryIds: [fixture.delivery.id] });
  const reconciled = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(reconciled.status, "ACKNOWLEDGED");
  assert.equal(reconciled.attemptCount, 1);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
});

test("G — ack remoto sobrevive à falha de finalização local e é reconciliado após restart", async () => {
  const fixture = await seedRecoveryDelivery("u");
  const originalUpdateMany = prisma.assistantOutboundDelivery.updateMany.bind(
    prisma.assistantOutboundDelivery,
  );
  let injected = false;
  prisma.assistantOutboundDelivery.updateMany = async (args) => {
    if (!injected && args?.where?.status === "SENDING" && args?.data?.status === "ACKNOWLEDGED") {
      injected = true;
      throw new Error("INJECTED_LOCAL_FINALIZATION_FAILURE");
    }
    return originalUpdateMany(args);
  };
  await assert.rejects(
    createRecoveryService().runOutboundRecoveryOnce({
      deliveryIds: [fixture.delivery.id],
    }),
    /OUTBOUND_DELIVERY_FINALIZATION_FAILED|INJECTED_LOCAL_FINALIZATION_FAILURE/,
  );
  prisma.assistantOutboundDelivery.updateMany = originalUpdateMany;
  assert.equal(remoteMessageCount(fixture.scope), 1);
  const stranded = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(stranded.status, "SENDING");
  assert.equal(stranded.attempts[0].result, "ACKNOWLEDGED");
  await prisma.assistantOutboundDelivery.update({
    where: { id: fixture.delivery.id },
    data: { claimExpiresAt: new Date(Date.now() - 1_000) },
  });
  await prisma.$disconnect();
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();
  await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  const reconciled = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(reconciled.status, "ACKNOWLEDGED");
  assert.equal(reconciled.attemptCount, 1);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
});

test("H — lease expirado antes da fronteira vira retry seguro com backoff", async () => {
  const now = new Date();
  const fixture = await seedRecoveryDelivery("v", {
    status: "SENDING",
    retrySafety: "UNKNOWN",
    attemptCount: 1,
    now,
    claimExpiresAt: new Date(now.getTime() - 1_000),
    boundaryStartedAt: null,
  });
  const service = createRecoveryService();
  const [first] = await service.runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  assert.equal(first.action, "BACKOFF");
  let persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.status, "FAILED_RETRYABLE");
  assert.equal(persisted.retrySafety, "PROVEN_SAFE");
  assert.equal(remoteMessageCount(fixture.scope), 0);
  await prisma.assistantOutboundDelivery.update({
    where: { id: fixture.delivery.id },
    data: { nextEligibleAt: new Date(Date.now() - 1_000) },
  });
  await service.runOutboundRecoveryOnce({ deliveryIds: [fixture.delivery.id] });
  persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.status, "ACKNOWLEDGED");
  assert.equal(persisted.attemptCount, 2);
  assert.equal(remoteMessageCount(fixture.scope), 1);
});

test("I — lease expirado após início remoto exige reconciliação e não reenvia", async () => {
  const now = new Date();
  const fixture = await seedRecoveryDelivery("w", {
    status: "SENDING",
    attemptCount: 1,
    now,
    claimExpiresAt: new Date(now.getTime() - 1_000),
    boundaryStartedAt: new Date(now.getTime() - 2_000),
  });
  const [result] = await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  assert.equal(result.action, "RECONCILIATION_INCONCLUSIVE");
  const persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.status, "UNCERTAIN");
  assert.equal(persisted.retrySafety, "RECONCILE_REQUIRED");
  assert.equal(remoteMessageCount(fixture.scope), 0);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 0);
});

test("J — dois workers disputam um lease e somente um cruza a fronteira", async () => {
  const fixture = await seedRecoveryDelivery("x");
  await Promise.all([
    createRecoveryService().runOutboundRecoveryOnce({
      deliveryIds: [fixture.delivery.id],
    }),
    createRecoveryService().runOutboundRecoveryOnce({
      deliveryIds: [fixture.delivery.id],
    }),
  ]);
  const persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.status, "ACKNOWLEDGED");
  assert.equal(persisted.attemptCount, 1);
  assert.equal(persisted.attempts.length, 1);
  assert.equal(remoteMessageCount(fixture.scope), 1);
});

test("K — controle stale cancela recovery antes de qualquer tentativa", async () => {
  const fixture = await seedRecoveryDelivery("y");
  await prisma.assistantConversation.update({
    where: { id: fixture.scope.internalConversationId },
    data: { controlRevision: { increment: 1 } },
  });
  const [result] = await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  assert.equal(result.action, "CANCELLED_STALE");
  const persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.status, "CANCELLED_STALE");
  assert.equal(persisted.attemptCount, 0);
  assert.equal(persisted.attempts.length, 0);
  assert.equal(remoteMessageCount(fixture.scope), 0);
});

test("L — budget esgotado termina o delivery sem nova tentativa", async () => {
  const fixture = await seedRecoveryDelivery("z", {
    status: "FAILED_RETRYABLE",
    retrySafety: "PROVEN_SAFE",
    attemptCount: 3,
    maxAttempts: 3,
    nextEligibleAt: new Date(Date.now() - 1_000),
  });
  const [result] = await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  assert.equal(result.action, "BUDGET_EXHAUSTED");
  const persisted = await deliveryWithAttempts(fixture.delivery.id);
  assert.equal(persisted.status, "FAILED_TERMINAL");
  assert.equal(persisted.errorCode, "RECOVERY_BUDGET_EXHAUSTED");
  assert.equal(persisted.attemptCount, 3);
  assert.equal(remoteMessageCount(fixture.scope), 0);
});

test("M — backoff usa clock controlado e não executa loop apertado", async () => {
  const fixedNow = new Date("2026-07-25T18:00:00.000Z");
  const fixture = await seedRecoveryDelivery("aa", {
    status: "FAILED_RETRYABLE",
    retrySafety: "PROVEN_SAFE",
    attemptCount: 1,
    nextEligibleAt: new Date(fixedNow.getTime() + 1_000),
  });
  let sends = 0;
  const coordinator = new OutboundRecoveryCoordinator({
    prisma,
    now: () => fixedNow,
    jitterRatio: 0,
    send: async ({ onBoundaryStart }) => {
      sends += 1;
      await onBoundaryStart();
      return {
        status: "ACKNOWLEDGED",
        retrySafety: "NOT_RETRYABLE",
        externalMessageId: "clock-controlled-ack",
        httpStatus: 201,
        errorClass: null,
        errorCode: null,
      };
    },
    reconcile: async () => ({
      status: "INCONCLUSIVE",
      externalMessageId: null,
      evidenceType: "REMOTE_LIST_INCONCLUSIVE",
    }),
  });
  const first = await coordinator.recoverDelivery(fixture.delivery.id);
  assert.equal(first.action, "BACKOFF");
  assert.equal(sends, 0);
  await prisma.assistantOutboundDelivery.update({
    where: { id: fixture.delivery.id },
    data: { nextEligibleAt: new Date(fixedNow.getTime() - 1) },
  });
  const second = await coordinator.recoverDelivery(fixture.delivery.id);
  assert.equal(second.status, "ACKNOWLEDGED");
  assert.equal(sends, 1);
});

test("O/P — restart matrix mantém terminais, recupera somente elegíveis e sanitiza auditoria", async () => {
  const pending = await seedRecoveryDelivery("ab", { suffix: "pending" });
  const safe = await createDeliveryForScope(pending.scope, {
    suffix: "safe",
    status: "FAILED_RETRYABLE",
    retrySafety: "PROVEN_SAFE",
    attemptCount: 1,
    nextEligibleAt: new Date(Date.now() - 1_000),
  });
  const active = await createDeliveryForScope(pending.scope, {
    suffix: "active",
    status: "SENDING",
    attemptCount: 1,
    claimExpiresAt: new Date(Date.now() + 60_000),
  });
  const uncertain = await createDeliveryForScope(pending.scope, {
    suffix: "uncertain",
    status: "UNCERTAIN",
    retrySafety: "RECONCILE_REQUIRED",
    attemptCount: 1,
    boundaryStartedAt: new Date(),
  });
  const acknowledged = await createDeliveryForScope(pending.scope, {
    suffix: "ack",
    status: "ACKNOWLEDGED",
    retrySafety: "NOT_RETRYABLE",
    attemptCount: 1,
    externalMessageId: "already-acknowledged",
  });
  await prisma.$disconnect();
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();
  await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [
      pending.delivery.id,
      safe.delivery.id,
      active.delivery.id,
      uncertain.delivery.id,
      acknowledged.delivery.id,
    ],
  });
  const states = new Map(
    (
      await prisma.assistantOutboundDelivery.findMany({
        where: {
          id: {
            in: [
              pending.delivery.id,
              safe.delivery.id,
              active.delivery.id,
              uncertain.delivery.id,
              acknowledged.delivery.id,
            ],
          },
        },
      })
    ).map((delivery) => [delivery.id, delivery]),
  );
  assert.equal(states.get(pending.delivery.id).status, "ACKNOWLEDGED");
  assert.equal(states.get(safe.delivery.id).status, "ACKNOWLEDGED");
  assert.equal(states.get(active.delivery.id).status, "SENDING");
  assert.equal(states.get(uncertain.delivery.id).status, "UNCERTAIN");
  assert.equal(states.get(acknowledged.delivery.id).status, "ACKNOWLEDGED");
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 2);

  const runtimeLog = await prisma.assistantRuntimeLog.findFirstOrThrow({
    where: { assistantMessageId: pending.assistantMessage.id },
  });
  const attempts = await prisma.assistantOutboundAttempt.findMany({
    where: {
      deliveryId: { in: [pending.delivery.id, safe.delivery.id] },
    },
  });
  const serialized = JSON.stringify({
    metadata: runtimeLog.metadata,
    deliveries: [...states.values()],
    attempts,
  });
  assert.doesNotMatch(serialized, /Resposta técnica sanitizada/);
  assert.doesNotMatch(serialized, /authorization|api_access_token|block0-chatwoot-token/i);
  assert.doesNotMatch(serialized, /\+00000000000/);
  assert.doesNotMatch(serialized, /BASE DE CONHECIMENTO RELEVANTE/i);
  assert.equal(
    await prisma.assistantConversationStateV2.count({
      where: { companyId: pending.scope.companyId },
    }),
    0,
  );
  assert.equal(
    await prisma.assistantConversationStateV2Event.count({
      where: { companyId: pending.scope.companyId },
    }),
    0,
  );
});

test("Q — handoff legado usa recovery sem adquirir semântica operacional", async () => {
  const fixture = await seedRecoveryDelivery("ac", {
    handoff: true,
    content: "Transferindo para um atendente...",
  });
  await createRecoveryService().runOutboundRecoveryOnce({
    deliveryIds: [fixture.delivery.id],
  });
  const persisted = await deliveryWithAttempts(fixture.delivery.id);
  const conversation = await prisma.assistantConversation.findUniqueOrThrow({
    where: { id: fixture.scope.internalConversationId },
  });
  const remote = chatwoot.getConversation(
    fixture.scope.accountId,
    fixture.scope.externalConversationId,
  );
  assert.equal(persisted.status, "ACKNOWLEDGED");
  assert.equal(conversation.aiActive, true);
  assert.equal(conversation.pausedByHuman, false);
  assert.equal(remote.assignee, null);
  assert.equal(remote.team, null);
  assert.deepEqual(remote.labels, []);
  assert.equal(chatwoot.calls("chatwoot_outbound").length, 1);
});
