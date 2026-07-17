import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryConversationStateStore,
  RuntimeV2CandidateResponseGenerator,
  RuntimeV2ShadowIntegrationService,
  RuntimeV2ShadowOrchestrator,
  evaluateRuntimeV2ScopeGate,
  isRuntimeV2ResponseGenerationEnabled,
} from "../dist/runtime-v2/index.js";

const allowedScope = {
  companyId: "scope-company",
  assistantId: "scope-assistant",
  conversationId: "scope-conversation-allowed",
  contextVersion: 1,
};
const blockedScope = { ...allowedScope, conversationId: "scope-conversation-blocked" };

const environment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: allowedScope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: allowedScope.conversationId,
};

function snapshot(scope, id) {
  return {
    scope,
    correlationId: `correlation-${id}`,
    internalMessageId: id,
    externalMessageId: `external-${id}`,
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Mensagem de teste",
  };
}

function fakePrisma() {
  const logs = [];
  return {
    logs,
    assistantRuntimeLog: {
      async create({ data, select }) {
        const id = `runtime-log-${logs.length + 1}`;
        logs.push({ ...data, id });
        return select?.id ? { id } : logs.at(-1);
      },
      async update({ where, data, select }) {
        const index = logs.findIndex((entry) => entry.id === where.id);
        if (index < 0) throw new Error("RUNTIME_LOG_NOT_FOUND");
        logs[index] = { ...logs[index], ...data };
        return select?.id ? { id: logs[index].id } : logs[index];
      },
    },
  };
}

test("RuntimeV2ScopeGate é default-deny para modo, tenant, assistant e conversa", () => {
  const at = "2026-07-17T00:00:00.000Z";
  assert.equal(
    evaluateRuntimeV2ScopeGate({
      mode: "OFF",
      ...allowedScope,
      feature: "BASE_SHADOW",
      assistantAllowlist: [allowedScope.assistantId],
      conversationAllowlist: [allowedScope.conversationId],
      evaluatedAt: at,
    }).reasonCode,
    "RUNTIME_V2_SCOPE_MODE_OFF",
  );
  assert.equal(
    evaluateRuntimeV2ScopeGate({
      mode: "SHADOW",
      ...allowedScope,
      feature: "BASE_SHADOW",
      assistantAllowlist: [allowedScope.assistantId],
      conversationAllowlist: [],
      evaluatedAt: at,
    }).reasonCode,
    "RUNTIME_V2_SCOPE_CONVERSATION_NOT_ALLOWLISTED",
  );
  assert.equal(
    evaluateRuntimeV2ScopeGate({
      mode: "SHADOW",
      ...allowedScope,
      feature: "BASE_SHADOW",
      assistantAllowlist: [],
      conversationAllowlist: [allowedScope.conversationId],
      evaluatedAt: at,
    }).reasonCode,
    "RUNTIME_V2_SCOPE_ASSISTANT_NOT_ALLOWLISTED",
  );
  assert.equal(
    evaluateRuntimeV2ScopeGate({
      mode: "SHADOW",
      ...allowedScope,
      expectedCompanyId: "other-company",
      feature: "BASE_SHADOW",
      assistantAllowlist: [allowedScope.assistantId],
      conversationAllowlist: [allowedScope.conversationId],
      evaluatedAt: at,
    }).reasonCode,
    "RUNTIME_V2_SCOPE_COMPANY_MISMATCH",
  );
});

test("conversa do mesmo assistant fora da allowlist não cria state, evento, log, RAG, memória ou provider", async () => {
  const prisma = fakePrisma();
  const store = new InMemoryConversationStateStore();
  let ragCalls = 0;
  let memoryCalls = 0;
  let providerCalls = 0;
  const generator = new RuntimeV2CandidateResponseGenerator(
    {
      async generate() {
        providerCalls += 1;
        return { content: "não deveria gerar", model: "fake", finishReason: "STOP", usage: null };
      },
    },
    { compile: () => ({ messages: [] }) },
  );
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    store,
    environment,
    () => new Date("2026-07-17T00:00:00.000Z"),
    { read: async () => ({ evidence: [], missingCategories: [], failures: [], scopeValidationFailures: [], adapterStatus: (++ragCalls, "EMPTY") }) },
    { retrieve: async () => ({ items: [], status: (++ragCalls, "EMPTY") }) },
    { retrieve: async () => ({ items: [], status: (++memoryCalls, "EMPTY") }) },
    generator,
  );
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, environment);

  const result = await integration.schedule(snapshot(blockedScope, "blocked-message"));
  await integration.drain();

  assert.equal(result.status, "SKIPPED_OUT_OF_SCOPE");
  assert.equal(result.logPersisted, false);
  assert.equal(prisma.logs.length, 0);
  assert.equal(await store.load({ ...blockedScope, runtimeVersion: "V2", mode: "SHADOW" }), null);
  assert.equal(ragCalls, 0);
  assert.equal(memoryCalls, 0);
  assert.equal(providerCalls, 0);
});

test("somente a conversa allowlisted processa quando dois inbounds do mesmo assistant concorrem", async () => {
  const prisma = fakePrisma();
  const store = new InMemoryConversationStateStore();
  const orchestrator = new RuntimeV2ShadowOrchestrator(store, environment);
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, environment);

  const [allowed, blocked] = await Promise.all([
    integration.schedule(snapshot(allowedScope, "allowed-message")),
    integration.schedule(snapshot(blockedScope, "blocked-message")),
  ]);
  await integration.drain();

  assert.equal(allowed.status, "COMPLETED");
  assert.equal(blocked.status, "SKIPPED_OUT_OF_SCOPE");
  assert.ok(await store.load({ ...allowedScope, runtimeVersion: "V2", mode: "SHADOW" }));
  assert.equal(await store.load({ ...blockedScope, runtimeVersion: "V2", mode: "SHADOW" }), null);
  assert.equal(prisma.logs.length, 1);
});

test("allowlist de resposta não substitui a allowlist base de conversa", () => {
  assert.equal(
    isRuntimeV2ResponseGenerationEnabled(
      allowedScope,
      {
        RUNTIME_V2_MODE: "SHADOW",
        RUNTIME_V2_SHADOW_ASSISTANT_IDS: allowedScope.assistantId,
        RUNTIME_V2_RESPONSE_GENERATION_MODE: "SHADOW",
        RUNTIME_V2_RESPONSE_ASSISTANT_IDS: allowedScope.assistantId,
        RUNTIME_V2_RESPONSE_CONVERSATION_IDS: allowedScope.conversationId,
      },
    ),
    false,
  );
});
