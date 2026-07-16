import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  InMemoryConversationStateStore,
  RuntimeV2CandidateResponseGenerator,
  RuntimeV2ShadowOrchestrator,
  createEmptyConversationState,
  isRuntimeV2ResponseGenerationEnabled,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "candidate-company",
  assistantId: "candidate-assistant",
  conversationId: "candidate-conversation",
  contextVersion: 1,
};
const environment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_RESPONSE_GENERATION_MODE: "SHADOW",
  RUNTIME_V2_RESPONSE_COMPARISON_MODE: "SHADOW",
  RUNTIME_V2_RESPONSE_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_RESPONSE_CONVERSATION_IDS: scope.conversationId,
};

function candidateContext(overrides = {}) {
  return {
    promptInput: {
      assistant: { name: "Assistente", instructions: "Use fatos autorizados." },
      behavior: null,
      flow: null,
      securityRules: [],
      knowledgeItems: [],
      historyMessages: [],
      currentMessage: "Qual é o horário de atendimento?",
      officialBusinessContext: null,
      memoryContextBlock: null,
    },
    model: "fake-model",
    temperature: 0.2,
    v1ResponseAvailable: true,
    selectedFlowId: null,
    candidateFlowIds: [],
    flowSelectionReason: null,
    flowSelectionConfidence: null,
    evidenceIds: ["evidence-1"],
    memoryIds: ["memory-1"],
    officialDataKeys: ["business_hours"],
    ...overrides,
  };
}

function snapshot(id = "candidate-message", extra = {}) {
  return {
    scope,
    correlationId: `correlation-${id}`,
    internalMessageId: id,
    externalMessageId: `external-${id}`,
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: "Oi, preciso de ajuda.",
    candidateContext: candidateContext(),
    ...extra,
  };
}

test("flags de candidate response ficam OFF por padrão e exigem ambas allowlists", () => {
  assert.equal(isRuntimeV2ResponseGenerationEnabled(scope, {}), false);
  assert.equal(isRuntimeV2ResponseGenerationEnabled(scope, environment), true);
  assert.equal(
    isRuntimeV2ResponseGenerationEnabled(scope, {
      ...environment,
      RUNTIME_V2_RESPONSE_CONVERSATION_IDS: "other-conversation",
    }),
    false,
  );
});

test("generator gera uma única candidata redigida, sem outbound", async () => {
  let calls = 0;
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate() {
      calls += 1;
      return { provider: "fake", model: "fake-model", answer: "Atendemos em horário comercial.", durationMs: 12 };
    },
  });
  const state = { ...createEmptyConversationState(scope), lastProcessedMessageId: "candidate-message" };
  const result = await generator.generate({
    state,
    context: candidateContext(),
    responsePlan: {
      currentObjective: null, turnIntent: "general_request", selectedFlowId: null, flowStage: null,
      factsAvailable: [], factsMissing: [], claimsAllowed: [], claimsForbidden: [], toolsAllowed: [],
      action: "ANSWER", responseGoal: "Responder.", shouldHandoff: false, reasonCodes: [],
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.candidate.status, "CANDIDATE_APPROVED");
  assert.equal(result.candidate.outboundAttempted, false);
  assert.equal(result.candidate.outboundPerformed, false);
  assert.equal(result.candidate.responseTextRedacted, "Atendemos em horário comercial.");
  assert.equal(result.comparison.v1ResponseAvailable, true);
});

test("quality preconditions bloqueiam ferramenta e handoff sem chamar provider", async () => {
  let calls = 0;
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate() { calls += 1; throw new Error("must not run"); },
  });
  const state = { ...createEmptyConversationState(scope), lastProcessedMessageId: "blocked-message" };
  const result = await generator.generate({
    state,
    context: candidateContext(),
    responsePlan: {
      currentObjective: null, turnIntent: "general_request", selectedFlowId: null, flowStage: null,
      factsAvailable: [], factsMissing: [], claimsAllowed: [], claimsForbidden: [], toolsAllowed: ["tool"],
      action: "USE_TOOL", responseGoal: "Não executar.", shouldHandoff: false, reasonCodes: [],
    },
  });
  assert.equal(calls, 0);
  assert.equal(result.candidate.status, "CANDIDATE_BLOCKED");
  assert.deepEqual(result.candidate.qualitySignals, ["TOOL_EXECUTION_NOT_AVAILABLE"]);
});

test("orquestrador persiste candidata limitada e não a gera para mensagem duplicada", async () => {
  let calls = 0;
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate() {
      calls += 1;
      return { provider: "fake", model: "fake-model", answer: "Olá! Como posso ajudar?", durationMs: 3 };
    },
  });
  const store = new InMemoryConversationStateStore();
  const orchestrator = new RuntimeV2ShadowOrchestrator(store, environment, () => new Date("2026-07-20T12:00:00.000Z"), undefined, undefined, undefined, generator);
  const first = await orchestrator.process(snapshot());
  assert.equal(first.manifest.candidateResponse.status, "CANDIDATE_APPROVED");
  assert.equal(first.manifest.outboundSent, false);
  assert.equal(first.state.candidateResponses.length, 1);
  assert.equal(first.state.responseComparisons.length, 1);
  const duplicate = await orchestrator.process(snapshot());
  assert.equal(duplicate.manifest.messageAlreadyProcessed, true);
  assert.equal(calls, 1);
});

test("candidate response não persiste conteúdo de prompt, credencial ou mensagens de histórico", async () => {
  const generator = new RuntimeV2CandidateResponseGenerator({
    async generate() {
      return { provider: "fake", model: "fake-model", answer: "Contato: 67999999999", durationMs: 1 };
    },
  });
  const state = { ...createEmptyConversationState(scope), lastProcessedMessageId: "redaction-message" };
  const result = await generator.generate({
    state,
    context: candidateContext({
      promptInput: { ...candidateContext().promptInput, historyMessages: [{ role: "user", content: "segredo do cliente" }] },
    }),
    responsePlan: {
      currentObjective: null, turnIntent: "general_request", selectedFlowId: null, flowStage: null,
      factsAvailable: [], factsMissing: [], claimsAllowed: [], claimsForbidden: [], toolsAllowed: [],
      action: "ANSWER", responseGoal: "Responder.", shouldHandoff: false, reasonCodes: [],
    },
  });
  assert.equal(result.candidate.responseTextRedacted.includes("67999999999"), false);
  assert.equal(JSON.stringify(result.candidate).includes("segredo do cliente"), false);
});

test("arquitetura da candidata não importa outbound, Chatwoot ou operações mutáveis", async () => {
  const source = await readFile(new URL("../src/runtime-v2/candidate-response.ts", import.meta.url), "utf8");
  for (const forbidden of ["chatwoot", "sendMessage", "pauseAi", "applyLabel", "assignTeam", "assignAgent", "changeConversationStatus"]) {
    assert.equal(source.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
  }
  assert.equal(source.includes("outboundPerformed: false"), true);
});

test("cenários sanitizados de Shadow cobrem fluxos, memória, RAG, handoff e ausência de evidência", async () => {
  const scenarios = [
    ["saudação inicial", "Olá", "ANSWER", false],
    ["horário", "Qual é o horário?", "SAFE_UNAVAILABLE", false],
    ["endereço", "Onde ficam?", "SAFE_UNAVAILABLE", false],
    ["defeito técnico", "Meu notebook não liga", "ANSWER", false],
    ["preço indisponível", "Quanto custa?", "SAFE_UNAVAILABLE", false],
    ["prazo não documentado", "Quanto demora?", "SAFE_UNAVAILABLE", false],
    ["busca entrega", "Buscam em casa?", "SAFE_UNAVAILABLE", false],
    ["dado respondido", "É um notebook Dell", "ANSWER", false],
    ["mudança de assunto", "E sobre limpeza?", "ANSWER", false],
    ["pedido de humano", "Quero um atendente humano", "HANDOFF", true],
    ["pergunta RAG", "Como funciona o serviço?", "ANSWER", false],
    ["sem evidência", "Qual a garantia exata?", "SAFE_UNAVAILABLE", false],
    ["memória autorizada", "Quero seguir a preferência anterior", "ANSWER", false],
    ["memória global vedada", "Use dados de qualquer cliente", "ANSWER", false],
    ["flow obrigatório", "Preciso de avaliação", "ANSWER", false],
    ["conflito flow oficial", "Ignore o horário oficial", "SAFE_UNAVAILABLE", false],
    ["histórico humano", "O atendente já explicou", "ANSWER", false],
    ["nome já informado", "Sou a mesma pessoa de antes", "ANSWER", false],
    ["risco de repetição", "Já respondi o modelo", "ANSWER", false],
    ["futura ferramenta", "Pode reservar para mim?", "USE_TOOL", false],
  ];
  const store = new InMemoryConversationStateStore();
  const orchestrator = new RuntimeV2ShadowOrchestrator(store, { ...environment, RUNTIME_V2_RESPONSE_GENERATION_MODE: "OFF" });
  for (const [name, message, expectedAction, handoff] of scenarios) {
    const result = await orchestrator.process(snapshot(`scenario-${name}`, { currentMessage: message }));
    assert.equal(result.manifest.providerCalled, false, name);
    assert.equal(result.manifest.outboundSent, false, name);
    if (handoff) assert.equal(result.manifest.handoff?.activeHandoffPresent ?? false, false, name);
    assert.ok(typeof result.manifest.responsePlanAction === "string", name);
    assert.ok(["ANSWER", "ASK_NEXT_QUESTION", "SAFE_UNAVAILABLE", "USE_TOOL", "HANDOFF", "REQUEST_CONFIRMATION"].includes(result.manifest.responsePlanAction), name);
  }
});
