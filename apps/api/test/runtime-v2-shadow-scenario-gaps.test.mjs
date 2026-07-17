import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryConversationStateStore,
  RagEvidenceAdapter,
  RuntimeV2CandidateResponseGenerator,
  RuntimeV2ShadowOrchestrator,
  understandTurn,
} from "../dist/runtime-v2/index.js";

const now = new Date("2026-07-17T12:00:00.000Z");
const scope = {
  companyId: "scenario-company",
  assistantId: "scenario-assistant",
  conversationId: "scenario-conversation",
  contextVersion: 1,
};
const environment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
  RUNTIME_V2_RESPONSE_GENERATION_MODE: "SHADOW",
  RUNTIME_V2_RESPONSE_COMPARISON_MODE: "SHADOW",
  RUNTIME_V2_RESPONSE_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_RESPONSE_CONVERSATION_IDS: scope.conversationId,
  RUNTIME_V2_CANDIDATE_GENERATION_TIMEOUT_MS: "10000",
};

function candidateContext(message) {
  return {
    promptInput: {
      assistant: { name: "Assistente Fixture", instructions: "Use fatos autorizados." },
      behavior: null,
      flow: null,
      securityRules: [],
      knowledgeItems: [],
      historyMessages: [],
      currentMessage: message,
      officialBusinessContext: null,
      memoryContextBlock: null,
    },
    model: "fake-model",
    temperature: 0,
    v1ResponseAvailable: true,
    selectedFlowId: null,
    candidateFlowIds: [],
    flowSelectionReason: null,
    flowSelectionConfidence: null,
    evidenceIds: [],
    memoryIds: [],
    officialDataKeys: [],
  };
}

function snapshot(id, message, extra = {}) {
  return {
    scope,
    correlationId: `scenario-${id}`,
    internalMessageId: id,
    externalMessageId: `external-${id}`,
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: message,
    candidateContext: candidateContext(message),
    ...extra,
  };
}

test("RAG Shadow recupera garantia autorizada após o scope gate e conclui provider lento uma vez", async () => {
  let retrievalCalls = 0;
  let providerCalls = 0;
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate(input) {
      providerCalls += 1;
      assert.match(JSON.stringify(input.messages), /garantia documental autorizada/i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        provider: "fake",
        model: "fake-model",
        answer: "A garantia segue a política documentada e aplicável ao serviço realizado.",
        durationMs: 1000,
      };
    },
  });
  const retriever = {
    async searchRelevantKnowledge(input) {
      retrievalCalls += 1;
      assert.equal(input.companyId, scope.companyId);
      assert.equal(input.assistantId, scope.assistantId);
      assert.equal(input.tenant.companyId, scope.companyId);
      return {
        scoreThreshold: 0.7,
        scoreThresholdSource: "fixture",
        results: [
          {
            knowledgeId: "knowledge-warranty",
            knowledgeTitle: "Garantia",
            chunkId: "chunk-warranty",
            contentPreview: "garantia documental autorizada",
            score: 0.91,
            metadata: { validFrom: now.toISOString() },
          },
        ],
      };
    },
  };
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    environment,
    () => now,
    undefined,
    new RagEvidenceAdapter(),
    undefined,
    generator,
    retriever,
  );
  const result = await orchestrator.process(
    snapshot("warranty-message", "Qual é o prazo de garantia dos serviços realizados?"),
  );

  assert.equal(retrievalCalls, 1);
  assert.equal(providerCalls, 1);
  assert.deepEqual(result.manifest.authorityCategoriesRequested, ["warranty"]);
  assert.deepEqual(result.manifest.authorityCategoriesAvailable, ["WARRANTY"]);
  assert.deepEqual(result.manifest.winningSourceTypes, ["RAG_DOCUMENT"]);
  assert.equal(result.manifest.evidence.rag.ragRetrievalExecuted, true);
  assert.equal(result.manifest.evidence.rag.ragEvidenceCount, 1);
  assert.equal(result.manifest.candidateResponse.status, "CANDIDATE_APPROVED");
  assert.equal(
    result.manifest.candidateResponse.generationLifecycle.status,
    "GENERATION_COMPLETED",
  );
  assert.equal(result.manifest.candidateResponse.generationLifecycle.providerCallCount, 1);
  assert.equal(result.manifest.candidateResponse.outboundAttempted, false);
  assert.equal(result.manifest.candidateResponse.outboundPerformed, false);
});

test("zero chunks documentais bloqueia garantia antes do provider", async () => {
  let providerCalls = 0;
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate() {
      providerCalls += 1;
      throw new Error("provider must not be called");
    },
  });
  const retriever = {
    async searchRelevantKnowledge() {
      return {
        scoreThreshold: 0.7,
        scoreThresholdSource: "fixture",
        results: [],
      };
    },
  };
  const result = await new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    environment,
    () => now,
    undefined,
    new RagEvidenceAdapter(),
    undefined,
    generator,
    retriever,
  ).process(snapshot("warranty-empty", "Qual é o prazo de garantia dos serviços realizados?"));

  assert.equal(providerCalls, 0);
  assert.equal(result.manifest.evidence.rag.ragRetrievalExecuted, true);
  assert.equal(result.manifest.evidence.rag.ragEvidenceCount, 0);
  assert.equal(result.manifest.candidateResponse.status, "CANDIDATE_BLOCKED");
  assert.equal(result.manifest.candidateResponse.generationLifecycle.providerCallCount, 0);
});

test("mudança explícita suprime herança de horário sem marcar continuidade como mudança", () => {
  const history = [
    { id: "h1", role: "user", content: "Qual é o horário de atendimento?", relevance: "objective" },
    { id: "h2", role: "assistant", content: "Usamos o horário oficial.", relevance: "objective" },
  ];
  const changed = understandTurn({
    message: "Agora outro assunto: meu notebook não liga. O que devo fazer?",
    messageId: "topic-change",
    recentHistory: history,
  });
  assert.equal(changed.topicChanged, true);
  assert.equal(changed.topicChangeReason, "EXPLICIT_TOPIC_CHANGE");
  assert.equal(changed.previousTopic, "BUSINESS_HOURS");
  assert.equal(changed.currentTopic, "TECHNICAL_INFORMATION");
  assert.equal(changed.inheritedTopic, null);
  assert.equal(changed.inheritedTopicSuppressed, true);

  for (const message of [
    "E nos outros dias?",
    "E durante a semana?",
    "E vocês fecham para almoço?",
  ]) {
    const continuing = understandTurn({
      message,
      messageId: `continue-${message}`,
      recentHistory: history,
    });
    assert.equal(continuing.topicChanged, false, message);
  }
});

test("pedido humano explícito exige handoff sem provider, ferramenta ou execução", async () => {
  const human = understandTurn({ message: "Prefiro falar com uma pessoa.", messageId: "human" });
  assert.equal(human.humanHandoffSignal.requested, true);
  assert.equal(human.humanHandoffSignal.source, "EXPLICIT_CUSTOMER_REQUEST");
  assert.equal(human.turnIntent, "human_support_request");
  for (const message of [
    "A pessoa responsável vai me ligar?",
    "Meu técnico falou com uma pessoa.",
  ]) {
    assert.equal(
      understandTurn({ message, messageId: message }).humanHandoffSignal.requested,
      false,
    );
  }

  let providerCalls = 0;
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate() {
      providerCalls += 1;
      throw new Error("provider must not be called");
    },
  });
  const result = await new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    environment,
    () => now,
    undefined,
    undefined,
    undefined,
    generator,
  ).process(snapshot("human-message", "Prefiro falar com uma pessoa."));

  assert.equal(providerCalls, 0);
  assert.equal(result.manifest.humanRequested, true);
  assert.equal(result.manifest.handoffRequired, true);
  assert.equal(result.manifest.handoffStatus, "REQUIRED_NOT_EXECUTED");
  assert.equal(result.manifest.handoffExecutionAllowed, false);
  assert.equal(result.manifest.handoffExecutionAttempted, false);
  assert.equal(result.manifest.handoffExecuted, false);
  assert.equal(result.manifest.responsePlanAction, "HANDOFF");
  assert.equal(result.manifest.candidateResponse.status, "CANDIDATE_REQUIRES_HANDOFF");
  assert.equal(result.manifest.toolCalls, 0);
  assert.equal(result.manifest.outboundSent, false);
});

test("preço sem diagnóstico e agendamento sem ferramenta continuam bloqueados antes do provider", async () => {
  let providerCalls = 0;
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate() {
      providerCalls += 1;
      throw new Error("provider must not be called");
    },
  });
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    environment,
    () => now,
    undefined,
    new RagEvidenceAdapter(),
    undefined,
    generator,
  );
  for (const [id, message] of [
    ["price", "Quanto vai custar para consertar meu equipamento?"],
    ["booking", "Pode agendar uma visita para amanhã às 10 horas?"],
  ]) {
    const result = await orchestrator.process(snapshot(id, message));
    assert.equal(result.manifest.candidateResponse.status, "CANDIDATE_BLOCKED");
    assert.equal(result.manifest.candidateResponse.generationLifecycle.providerCallCount, 0);
    assert.equal(result.manifest.candidateResponse.outboundPerformed, false);
  }
  assert.equal(providerCalls, 0);
});
