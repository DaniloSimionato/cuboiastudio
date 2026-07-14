import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryConversationStateStore,
  RuntimeV2ShadowIntegrationService,
  RuntimeV2ShadowOrchestrator,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "integration-company",
  assistantId: "integration-assistant",
  conversationId: "integration-conversation",
  contextVersion: 1,
};

function snapshot(id = "message-1") {
  return {
    scope,
    correlationId: `correlation-${id}`,
    internalMessageId: id,
    externalMessageId: `external-${id}`,
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Bom dia",
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
    },
  };
}

test("integração fica OFF por padrão e não persiste log", async () => {
  const prisma = fakePrisma();
  const orchestrator = new RuntimeV2ShadowOrchestrator(new InMemoryConversationStateStore());
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, {});

  const result = await integration.schedule(snapshot());
  await integration.drain();

  assert.equal(result.status, "SKIPPED_OFF");
  assert.equal(prisma.logs.length, 0);
});

test("integração allowlisted registra somente manifesto sanitizado", async () => {
  const prisma = fakePrisma();
  const environment = {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  };
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    environment,
  );
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, environment);

  const result = await integration.schedule({
    ...snapshot(),
    currentMessage: "token=secret telefone=67999999999 cliente@example.com",
  });
  await integration.drain();

  assert.equal(result.status, "COMPLETED");
  assert.equal(prisma.logs.length, 1);
  const metadata = prisma.logs[0].metadata;
  assert.equal(metadata.eventType, "RUNTIME_V2_SHADOW");
  assert.equal(metadata.providerCalled, false);
  assert.equal(metadata.toolCalls, 0);
  assert.equal(metadata.outboundSent, false);
  assert.equal(metadata.responsePlanAction, "ANSWER");
  assert.equal(metadata.validationResult, "PASS");
  assert.equal(metadata.repeatedQuestionDetected, false);
  assert.deepEqual(metadata.authorityConflictCategories, []);
  assert.deepEqual(metadata.v1ToolsExposed, []);
  assert.equal(JSON.stringify(metadata).includes("token=secret"), false);
  assert.equal(JSON.stringify(metadata).includes("cliente@example.com"), false);
  assert.equal(JSON.stringify(metadata).includes("67999999999"), false);
  assert.equal(typeof metadata.currentMessageHash, "string");
});

test("falha do orquestrador é capturada e não gera rejeição não tratada", async () => {
  const prisma = fakePrisma();
  const orchestrator = { process: async () => { throw new Error("provider-like failure"); } };
  const integration = new RuntimeV2ShadowIntegrationService(
    prisma,
    orchestrator,
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
    },
  );

  const result = await integration.schedule(snapshot());
  await integration.drain();

  assert.equal(result.status, "FAILED");
  assert.equal(prisma.logs.length, 1);
  assert.equal(prisma.logs[0].metadata.providerCalled, false);
  assert.equal(prisma.logs[0].metadata.toolCalls, 0);
  assert.equal(prisma.logs[0].metadata.outboundSent, false);
  assert.equal(prisma.logs[0].metadata.errorCode, "SHADOW_INTEGRATION_ERROR");
});

test("a mesma mensagem em voo não executa o orquestrador duas vezes", async () => {
  const prisma = fakePrisma();
  let calls = 0;
  const environment = {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  };
  const orchestrator = {
    async process(message) {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new RuntimeV2ShadowOrchestrator(new InMemoryConversationStateStore(), environment)
        .process(message);
    },
  };
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, environment);

  const first = integration.schedule(snapshot("same-message"));
  const second = integration.schedule(snapshot("same-message"));
  const [firstResult, secondResult] = await Promise.all([first, second]);
  await integration.drain();

  assert.equal(calls, 1);
  assert.deepEqual(
    new Set([firstResult.status, secondResult.status]),
    new Set(["COMPLETED", "ALREADY_PROCESSED"]),
  );
  assert.equal(prisma.logs.length, 1);
});

test("serializa uma sessão, mas mantém sessões diferentes em paralelo", async () => {
  const prisma = fakePrisma();
  const started = [];
  const gates = new Map();
  let resolveThirdStart;
  const thirdStarted = new Promise((resolve) => {
    resolveThirdStart = resolve;
  });
  let active = 0;
  let maxActive = 0;
  const environment = {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: `${scope.assistantId},other-assistant`,
  };
  const orchestrator = {
    async process(message) {
      started.push(message.internalMessageId);
      if (message.internalMessageId === "same-scope-2") resolveThirdStart();
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => gates.set(message.internalMessageId, resolve));
      active -= 1;
      return {
        manifest: {
          currentMessageHash: `hash-${message.internalMessageId}`,
          messageAlreadyProcessed: false,
          persistenceResult: "UPDATED",
          validationResult: "PASS",
          shadowErrorCode: null,
          processingDurationMs: 1,
          v1Comparison: {
            selectedFlowId: null,
            selectedIntent: null,
            triageMode: null,
            toolsExposed: [],
          },
        },
      };
    },
  };
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, environment);
  const sameScopeSecond = {
    ...snapshot("same-scope-2"),
    currentMessage: "segunda",
  };
  const differentScope = {
    ...snapshot("different-scope"),
    scope: { ...scope, assistantId: "other-assistant" },
  };

  const first = integration.schedule(snapshot("same-scope-1"));
  const second = integration.schedule(sameScopeSecond);
  const parallel = integration.schedule(differentScope);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual([...started].sort(), ["different-scope", "same-scope-1"]);
  assert.equal(maxActive, 2);
  gates.get("same-scope-1")();
  gates.get("different-scope")();
  await thirdStarted;
  gates.get("same-scope-2")();
  await Promise.all([first, second, parallel]);
  await integration.drain();

  assert.deepEqual(new Set(started.slice(0, 2)), new Set(["same-scope-1", "different-scope"]));
  assert.equal(started[2], "same-scope-2");
  assert.equal(prisma.logs.length, 3);
});
