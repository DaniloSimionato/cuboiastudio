import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  CONVERSATION_STATE_VERSION,
  PrismaConversationStateStore,
  RuntimeV2ShadowOrchestrator,
  MissingInternalMessageIdError,
  StatePayloadTooLargeError,
  StateRevisionConflictError,
  createEmptyConversationState,
  resolveRuntimeV2StateStoreMode,
  sanitizeConversationStateForPersistence,
} from "../dist/runtime-v2/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL must point to the disposable persistence test database");

const prisma = new PrismaClient();
const prefix = `runtime-v2-persistence-${randomUUID()}`;
const shadowEnvironment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: `${prefix}-assistant`,
  RUNTIME_V2_SHADOW_TIMEOUT_MS: "1000",
};

async function createFixture(contextVersion = 1, suffix = randomUUID().slice(0, 8)) {
  const companyId = `${prefix}-company-${suffix}`;
  const assistantId = `${prefix}-assistant-${suffix}`;
  const conversationId = `${prefix}-conversation-${suffix}`;
  await prisma.company.create({ data: { id: companyId, name: `Runtime V2 ${suffix}` } });
  await prisma.assistant.create({
    data: { id: assistantId, companyId, name: `Assistant ${suffix}` },
  });
  await prisma.assistantConversation.create({
    data: {
      id: conversationId,
      companyId,
      assistantId,
      source: "SMOKE",
      channelType: "UNKNOWN",
      currentContextVersion: contextVersion,
    },
  });
  return { companyId, assistantId, conversationId, contextVersion };
}

async function createMessage(
  scope,
  id,
  content = "Mensagem de teste",
  contextVersion = scope.contextVersion,
) {
  return prisma.assistantConversationMessage.create({
    data: {
      id,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      role: "user",
      content,
      source: "TEST",
      messageType: "TEXT",
      contextVersion,
    },
  });
}

function storeScope(scope) {
  return { ...scope, runtimeVersion: "V2", mode: "SHADOW" };
}

function nextState(scope, message, now = new Date("2026-07-13T12:00:00.000Z")) {
  const state = createEmptyConversationState(scope, now);
  return {
    ...state,
    revision: 1,
    lastProcessedMessageId: message.id,
    lastProcessedExternalMessageId: message.externalMessageId ?? null,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  };
}

function snapshot(scope, message, content = "Oi") {
  return {
    scope,
    correlationId: `v1-${message.id}`,
    internalMessageId: message.id,
    externalMessageId: message.externalMessageId ?? null,
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: content,
  };
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

after(async () => {
  await prisma.assistantConversationStateV2Event.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversationStateV2.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversationMessage.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversation.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistant.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test("PostgreSQL cria, carrega, reinicia e mantém ledger após expiresAt", async () => {
  const scope = await createFixture();
  const message = await createMessage(scope, `${prefix}-message-1`);
  const store = new PrismaConversationStateStore(prisma);
  const initial = nextState(scope, message);
  const created = await store.saveTurn(initial, 0, {
    internalMessageId: message.id,
    externalMessageId: null,
  });
  assert.equal(created.persistenceResult, "CREATED");
  assert.equal(created.state.revision, 1);

  const restartedStore = new PrismaConversationStateStore(prisma);
  const loaded = await restartedStore.load(storeScope(scope));
  assert.equal(loaded.revision, 1);

  const duplicate = await restartedStore.saveTurn({ ...loaded, revision: 2 }, 1, {
    internalMessageId: message.id,
  });
  assert.equal(duplicate.persistenceResult, "DUPLICATE");
  assert.equal(duplicate.state.revision, 1);

  await restartedStore.reset(storeScope(scope));
  assert.equal(await restartedStore.load(storeScope(scope)), null);
  assert.equal(
    await prisma.assistantConversationStateV2Event.count({
      where: { internalMessageId: message.id },
    }),
    1,
  );
  assert.equal(await restartedStore.deleteExpired(new Date("2026-07-20T12:00:00.000Z")), 0);
  assert.equal(await restartedStore.deleteExpired(new Date("2026-08-20T12:00:00.000Z")), 1);
  assert.equal(
    await prisma.assistantConversationStateV2Event.count({
      where: { internalMessageId: message.id },
    }),
    0,
  );
});

test("stateJson valida schema, redaction e limite de 64 KB sem truncamento", async () => {
  const scope = await createFixture();
  const store = new PrismaConversationStateStore(prisma);
  const safeState = createEmptyConversationState(scope);
  safeState.lastRelevantQuestion = {
    key: "question:1",
    prompt: "token=secret telefone 67999999999 email cliente@example.com",
    fieldKey: "device_model",
  };
  const redacted = sanitizeConversationStateForPersistence(safeState);
  assert.equal(JSON.stringify(redacted.json).includes("cliente@example.com"), false);
  assert.equal(JSON.stringify(redacted.json).includes("token=secret"), false);

  const invalidSchema = { ...safeState, schemaVersion: "invalid" };
  await assert.rejects(() => store.create(invalidSchema), /STATE_SCHEMA_VERSION_INVALID/);

  const nonSerializable = {
    ...safeState,
    confirmedFacts: {
      invalid: {
        key: "invalid",
        value: () => "not-json",
        confidence: 1,
        sourceType: "CUSTOMER_TEXT",
        confirmedAt: new Date(),
      },
    },
  };
  await assert.rejects(() => store.create(nonSerializable), /JSON-compatible/);

  const oversized = {
    ...safeState,
    confirmedFacts: {
      large: {
        key: "large",
        value: "x".repeat(70_000),
        confidence: 1,
        sourceType: "CUSTOMER_TEXT",
        confirmedAt: new Date(),
      },
    },
  };
  await assert.rejects(() => store.create(oversized), StatePayloadTooLargeError);
});

test("internalMessageId é obrigatório e externalMessageId permanece opcional", async () => {
  const scope = await createFixture();
  const store = new PrismaConversationStateStore(prisma);
  const state = createEmptyConversationState(scope);
  await assert.rejects(
    () => store.saveTurn({ ...state, revision: 1 }, 0, { externalMessageId: "external-only" }),
    MissingInternalMessageIdError,
  );
});

test("isolamento por tenant, assistant, conversation, contextVersion e mode", async () => {
  const first = await createFixture(1);
  const second = await createFixture(2);
  const store = new PrismaConversationStateStore(prisma);
  await store.create(createEmptyConversationState(first));
  await store.create(createEmptyConversationState(second));
  assert.ok(await store.load(storeScope(first)));
  assert.ok(await store.load(storeScope(second)));
  assert.equal(await store.load(storeScope({ ...first, contextVersion: 2 })), null);
  assert.equal(resolveRuntimeV2StateStoreMode({ RUNTIME_V2_STATE_STORE: "INVALID" }), "MEMORY");
  assert.equal(resolveRuntimeV2StateStoreMode({ RUNTIME_V2_STATE_STORE: "POSTGRES" }), "POSTGRES");
});

test("optimistic concurrency rejeita revisão antiga", async () => {
  const scope = await createFixture();
  const store = new PrismaConversationStateStore(prisma);
  const initial = createEmptyConversationState(scope);
  await store.create(initial);
  const next = {
    ...initial,
    revision: 1,
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 86_400_000),
  };
  await store.save(next, 0);
  await assert.rejects(() => store.save({ ...next, revision: 2 }, 0), StateRevisionConflictError);
});

test("duas instâncias processam a mesma mensagem uma vez e mensagens diferentes avançam", async () => {
  const sameScope = await createFixture();
  const sameMessage = await createMessage(sameScope, `${prefix}-concurrent-same`);
  const first = new RuntimeV2ShadowOrchestrator(new PrismaConversationStateStore(prisma), {
    ...shadowEnvironment,
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: sameScope.assistantId,
  });
  const second = new RuntimeV2ShadowOrchestrator(new PrismaConversationStateStore(prisma), {
    ...shadowEnvironment,
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: sameScope.assistantId,
  });
  const sameResults = await Promise.all([
    first.process(snapshot(sameScope, sameMessage)),
    second.process(snapshot(sameScope, sameMessage)),
  ]);
  assert.equal(
    sameResults.filter((result) => result.manifest.persistenceResult === "CREATED").length,
    1,
  );
  assert.equal(
    sameResults.filter((result) => result.manifest.persistenceResult === "DUPLICATE").length,
    1,
  );
  assert.equal(
    await prisma.assistantConversationStateV2Event.count({
      where: { conversationId: sameScope.conversationId },
    }),
    1,
  );

  const differentScope = await createFixture();
  const messageA = await createMessage(differentScope, `${prefix}-concurrent-a`, "Quero formatar");
  const messageB = await createMessage(differentScope, `${prefix}-concurrent-b`, "Quero SSD");
  const left = new RuntimeV2ShadowOrchestrator(new PrismaConversationStateStore(prisma), {
    ...shadowEnvironment,
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: differentScope.assistantId,
  });
  const right = new RuntimeV2ShadowOrchestrator(new PrismaConversationStateStore(prisma), {
    ...shadowEnvironment,
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: differentScope.assistantId,
  });
  await Promise.all([
    left.process(snapshot(differentScope, messageA, "Quero formatar")),
    right.process(snapshot(differentScope, messageB, "Quero SSD")),
  ]);
  const finalState = await new PrismaConversationStateStore(prisma).load(
    storeScope(differentScope),
  );
  assert.equal(finalState.revision, 2);
});

test("restart preserva idempotência, aceita externalMessageId ausente e não deduplica conteúdo igual", async () => {
  const scope = await createFixture();
  const firstMessage = await createMessage(scope, `${prefix}-restart-1`, "mesmo conteúdo");
  const secondMessage = await createMessage(scope, `${prefix}-restart-2`, "mesmo conteúdo");
  const environment = { ...shadowEnvironment, RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId };
  const firstRun = new RuntimeV2ShadowOrchestrator(
    new PrismaConversationStateStore(prisma),
    environment,
  );
  const firstResult = await firstRun.process(snapshot(scope, firstMessage, "mesmo conteúdo"));
  const restarted = new RuntimeV2ShadowOrchestrator(
    new PrismaConversationStateStore(prisma),
    environment,
  );
  const replay = await restarted.process(snapshot(scope, firstMessage, "mesmo conteúdo"));
  assert.equal(replay.manifest.persistenceResult, "DUPLICATE");
  assert.equal(replay.manifest.revisionAfter, firstResult.manifest.revisionAfter);

  const noExternal = {
    ...snapshot(scope, secondMessage, "mesmo conteúdo"),
    externalMessageId: null,
  };
  const secondResult = await restarted.process(noExternal);
  assert.equal(secondResult.manifest.messageAlreadyProcessed, false);
  assert.equal(secondResult.manifest.revisionAfter, 2);
});

test("contextVersion incompatível é rejeitado sem atualizar o estado", async () => {
  const scope = await createFixture(1);
  const message = await createMessage(scope, `${prefix}-stale-context`, "mensagem antiga", 1);
  const staleScope = { ...scope, contextVersion: 2 };
  const result = await new RuntimeV2ShadowOrchestrator(new PrismaConversationStateStore(prisma), {
    ...shadowEnvironment,
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: staleScope.assistantId,
  }).process(snapshot(staleScope, message, "mensagem antiga"));
  assert.equal(result.manifest.shadowErrorCode, "STALE_CONTEXT");
  assert.equal(
    await prisma.assistantConversationStateV2.count({
      where: { conversationId: scope.conversationId },
    }),
    0,
  );
});

test("evento claramente atrasado entra no ledger como STALE_EVENT sem alterar revisão", async () => {
  const scope = await createFixture();
  const firstMessage = await createMessage(scope, `${prefix}-ordered-1`, "primeiro");
  const lateMessage = await createMessage(scope, `${prefix}-ordered-2`, "atrasado");
  const store = new PrismaConversationStateStore(prisma);
  const first = await store.saveTurn(nextState(scope, firstMessage), 0, {
    internalMessageId: firstMessage.id,
    sourceOccurredAt: new Date("2026-07-13T12:00:00.000Z"),
  });
  const lateState = {
    ...first.state,
    revision: 2,
    lastProcessedMessageId: lateMessage.id,
    updatedAt: new Date("2026-07-13T12:01:00.000Z"),
  };
  const result = await store.saveTurn(lateState, 1, {
    internalMessageId: lateMessage.id,
    sourceOccurredAt: new Date("2026-07-13T11:00:00.000Z"),
  });
  assert.equal(result.persistenceResult, "STALE_EVENT");
  assert.equal(result.state.revision, 1);
  assert.equal(
    await prisma.assistantConversationStateV2Event.count({
      where: { internalMessageId: lateMessage.id, status: "STALE_EVENT" },
    }),
    1,
  );
});

test("migration criou JSONB, constraints, índices e relações sem cascade", async () => {
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'assistant_conversation_states_v2'
  `;
  const names = columns.map((column) => column.column_name);
  assert.ok(names.includes("stateJson"));
  assert.ok(names.includes("purgeAt"));
  assert.equal(columns.find((column) => column.column_name === "stateJson").data_type, "jsonb");

  const constraints = await prisma.$queryRaw`
    SELECT conname AS constraint_name
    FROM pg_constraint
    WHERE conrelid = 'assistant_conversation_states_v2'::regclass
  `;
  const indexes = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'assistant_conversation_states_v2'
  `;
  const constraintNames = constraints.map((constraint) => constraint.constraint_name).join(" ");
  const indexDefinitions = indexes.map((index) => index.indexdef).join(" ");
  assert.match(constraintNames, /revision_nonnegative/);
  assert.match(constraintNames, /state_json_size/);
  assert.match(indexDefinitions, /companyId.*assistantId.*conversationId.*contextVersion.*mode/);
});
