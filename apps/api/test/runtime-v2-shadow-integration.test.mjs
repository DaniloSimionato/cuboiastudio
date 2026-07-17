import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryConversationStateStore,
  RuntimeV2ShadowIntegrationService,
  RuntimeV2ShadowOrchestrator,
  createV1HandoffObservation,
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
      async update({ where, data, select }) {
        const index = logs.findIndex((entry) => entry.id === where.id);
        if (index < 0) throw new Error("RUNTIME_LOG_NOT_FOUND");
        logs[index] = { ...logs[index], ...data };
        return select?.id ? { id: logs[index].id } : logs[index];
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
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
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

test("integração persiste o Handoff State no manifesto metadata-only", async () => {
  const prisma = fakePrisma();
  const environment = {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_HANDOFF_STATE_MODE: "SHADOW_STATE",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
  };
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    environment,
    () => new Date("2026-07-16T12:00:00.000Z"),
  );
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, environment);

  const result = await integration.schedule({
    ...snapshot("handoff-message-1"),
    currentMessage: "pedido estruturado de humano",
    v1HandoffObservation: createV1HandoffObservation({
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      contextVersion: scope.contextVersion,
      internalMessageId: "handoff-message-1",
      flowId: null,
      handoffPendingObserved: false,
      reasonCode: "CUSTOMER_REQUESTED_HUMAN",
      customerRequested: true,
      humanActiveObserved: false,
      aiActiveObserved: true,
      pausedByHumanObserved: false,
      requestedTargetType: "ANY_HUMAN",
      requestedTargetIdHash: null,
      collectedContextKeys: ["customer_requested_human"],
      contextHash: "",
      provenance: {
        source: "V1_PIPELINE",
        sourceMessageId: "handoff-message-1",
        sourceFlowId: null,
        sourceVersion: "test",
        reasonCode: "CUSTOMER_REQUESTED_HUMAN",
      },
    }),
  });
  await integration.drain();

  assert.equal(result.status, "COMPLETED");
  const metadata = prisma.logs[0].metadata;
  assert.equal(metadata.handoffStateMode, "SHADOW_STATE");
  assert.equal(metadata.v1HandoffObservationReceived, true);
  assert.equal(metadata.activeHandoffPresent, true);
  assert.equal(metadata.activeHandoffStatus, "HANDOFF_READY");
  assert.equal(metadata.handoffReasonCode, "CUSTOMER_REQUESTED_HUMAN");
  assert.equal(metadata.handoffRequestedTargetType, "ANY_HUMAN");
  assert.equal(metadata.handoffCustomerRequested, true);
  assert.equal(metadata.handoffStatePersisted, true);
  assert.equal(metadata.handoffExecutionPerformed, false);
  assert.equal(metadata.chatwootMutationPerformed, false);
  assert.equal(metadata.labelApplied, false);
  assert.equal(metadata.assignmentChanged, false);
  assert.equal(metadata.conversationStatusChanged, false);
  assert.equal(metadata.aiActiveChanged, false);
  assert.equal(metadata.outboundSent, false);
  assert.equal(metadata.handoffRedactionApplied, true);
  assert.equal(JSON.stringify(metadata).includes("pedido estruturado"), false);
});

test("falha do orquestrador é capturada e não gera rejeição não tratada", async () => {
  const prisma = fakePrisma();
  const orchestrator = {
    process: async () => {
      throw new Error("provider-like failure");
    },
  };
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
  });

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
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
  };
  const orchestrator = {
    async process(message) {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new RuntimeV2ShadowOrchestrator(
        new InMemoryConversationStateStore(),
        environment,
      ).process(message);
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

test("dispatch libera V1 antes de uma geração Shadow pendente e reconcilia o mesmo log", async () => {
  const prisma = fakePrisma();
  let resolveGeneration;
  let calls = 0;
  const environment = {
    RUNTIME_V2_MODE: "SHADOW",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
    RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
    RUNTIME_V2_SHADOW_DISPATCH_BUDGET_MS: "250",
  };
  const orchestrator = {
    process: async () => {
      calls += 1;
      await new Promise((resolve) => {
        resolveGeneration = resolve;
      });
      return {
        manifest: {
          currentMessageHash: "slow-generation-hash",
          messageAlreadyProcessed: false,
          persistenceResult: "UPDATED",
          validationResult: "PASS",
          shadowErrorCode: null,
          processingDurationMs: 1000,
          candidateResponse: {
            generationId: "generation-1",
            responsePlanId: "plan-1",
            status: "CANDIDATE_APPROVED",
            provider: "fake",
            model: "fake-model",
            latencyMs: 1000,
            redactionApplied: true,
            generationLifecycle: {
              status: "GENERATION_COMPLETED",
              generationStartedAt: "2026-07-17T00:00:00.000Z",
              generationCompletedAt: "2026-07-17T00:00:01.000Z",
              generationLatencyMs: 1000,
              providerCalled: true,
              providerCallCount: 1,
              providerCancellationRequested: false,
              lateResultDiscarded: false,
            },
          },
          responseComparison: { qualityGateResult: "CANDIDATE_APPROVED" },
          v1Comparison: { selectedFlowId: null, selectedIntent: null, triageMode: null, toolsExposed: [] },
        },
      };
    },
  };
  const integration = new RuntimeV2ShadowIntegrationService(prisma, orchestrator, environment);

  const dispatch = integration.dispatch(snapshot("slow-generation"));
  assert.deepEqual(dispatch, {
    status: "ACCEPTED",
    generationStatus: "GENERATION_PENDING",
    v1WaitReleased: true,
    dispatchLatencyMs: dispatch.dispatchLatencyMs,
  });
  assert.ok(dispatch.dispatchLatencyMs < 250);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.equal(prisma.logs.length, 1);
  assert.equal(prisma.logs[0].metadata.generationStatus, "GENERATION_PENDING");
  assert.equal(prisma.logs[0].metadata.v1WaitReleased, true);

  resolveGeneration();
  await integration.drain();

  assert.equal(prisma.logs.length, 1);
  assert.equal(prisma.logs[0].status, "COMPLETED");
  assert.equal(prisma.logs[0].metadata.generationStatus, "GENERATION_COMPLETED");
  assert.equal(prisma.logs[0].metadata.finalGenerationStatus, "GENERATION_COMPLETED");
  assert.equal(prisma.logs[0].metadata.completedAfterV1Response, true);
  assert.equal(prisma.logs[0].metadata.providerCallCount, 1);
  assert.equal(prisma.logs[0].metadata.outboundAttempted, false);
  assert.equal(prisma.logs[0].metadata.outboundPerformed, false);
  assert.notEqual(prisma.logs[0].metadata.generationStatus, "GENERATION_TIMED_OUT");
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
    RUNTIME_V2_SHADOW_CONVERSATION_IDS: `${scope.conversationId},other-conversation`,
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
    scope: {
      ...scope,
      assistantId: "other-assistant",
      conversationId: "other-conversation",
    },
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
