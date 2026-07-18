import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  ConversationStateResponseExecutionStore,
  PrismaConversationStateStore,
  RuntimeV2ResponseExecutionCoordinator,
  createRuntimeV2ResponseExecutionApproval,
} from "../dist/runtime-v2/index.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must point to a local disposable database");
}

const prisma = new PrismaClient();
const prefix = `runtime-v2-response-execution-${randomUUID()}`;

async function fixture() {
  const scope = {
    companyId: `${prefix}-company`,
    assistantId: `${prefix}-assistant`,
    conversationId: `${prefix}-conversation`,
    contextVersion: 1,
  };
  await prisma.company.create({ data: { id: scope.companyId, name: "Response Execution Test" } });
  await prisma.assistant.create({
    data: { id: scope.assistantId, companyId: scope.companyId, name: "Response Execution Assistant" },
  });
  await prisma.assistantConversation.create({
    data: {
      id: scope.conversationId,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      source: "SMOKE",
      channelType: "UNKNOWN",
      currentContextVersion: scope.contextVersion,
    },
  });
  const message = await prisma.assistantConversationMessage.create({
    data: {
      id: `${prefix}-message`,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      role: "user",
      content: "business hours test",
      source: "TEST",
      messageType: "TEXT",
      contextVersion: scope.contextVersion,
    },
  });
  return { scope, message };
}

function coordinator() {
  return new RuntimeV2ResponseExecutionCoordinator({
    store: new ConversationStateResponseExecutionStore(new PrismaConversationStateStore(prisma)),
  });
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

after(async () => {
  await prisma.assistantConversationStateV2Event.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistantConversationStateV2.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistantConversationMessage.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistantConversation.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistant.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test("PostgreSQL stateJson grants one atomic single-use claim across two coordinator instances", async () => {
  const { scope, message } = await fixture();
  const approval = createRuntimeV2ResponseExecutionApproval({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    expectedCanonicalComparisonHash: "hash-pg-c1",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "PostgreSQL CAS test",
  });
  const seedStore = new ConversationStateResponseExecutionStore(new PrismaConversationStateStore(prisma));
  await seedStore.arm({ approval, contextVersion: scope.contextVersion });
  const input = {
    ...scope,
    internalMessageId: message.id,
    canonicalComparisonHash: "hash-pg-c1",
    approval,
  };
  const [left, right] = await Promise.all([coordinator().claim(input), coordinator().claim(input)]);
  const claims = [left, right];
  assert.equal(claims.filter((result) => result.status === "CLAIMED").length, 1);
  assert.equal(claims.filter((result) => result.status === "PENDING_OR_TERMINAL").length, 1);

  const winner = claims.find((result) => result.status === "CLAIMED");
  assert.ok(winner);
  const restarted = coordinator();
  assert.equal(
    await restarted.beginV2Generation({ ...scope, internalMessageId: message.id, generationId: winner.generationId }),
    true,
  );
  assert.equal(
    await restarted.approveV2Candidate({ ...scope, internalMessageId: message.id, generationId: winner.generationId }),
    true,
  );
  assert.equal(
    await restarted.beforeOutbound({
      ...scope,
      internalMessageId: message.id,
      owner: "V2_PRIMARY",
      generationId: winner.generationId,
    }),
    true,
  );
  assert.equal(
    await restarted.afterOutboundConfirmed({
      ...scope,
      internalMessageId: message.id,
      owner: "V2_PRIMARY",
      generationId: winner.generationId,
      externalMessageId: "fake-external-reference",
    }),
    true,
  );

  const persisted = await seedStore.load({ ...scope, internalMessageId: message.id });
  assert.equal(persisted.owner, "V2_OUTBOUND_SENT");
  assert.equal(persisted.terminalStatus, "V2_OUTBOUND_SENT");
  assert.equal(persisted.approval.status, "CONSUMED");
  assert.equal(persisted.providerV2CallCount, 1);
  assert.equal(persisted.externalMessageId, "fake-external-reference");
  assert.equal(
    (await coordinator().claim(input)).status,
    "PENDING_OR_TERMINAL",
    "replay after a restart cannot claim or create a second outbound",
  );
});
