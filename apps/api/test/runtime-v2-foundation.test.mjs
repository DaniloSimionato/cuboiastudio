import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTurnToConversationState,
  assertNoDualOutbound,
  buildResponsePlan,
  buildRetrievalPlan,
  createEmptyConversationState,
  deserializeConversationState,
  compileV2,
  isShadowMode,
  resetConversationState,
  serializeConversationState,
  resolveRuntimeVersion,
  runRuntimeV2Prototype,
  shouldRunV2,
  understandTurn,
  validateResponse,
} from "../dist/runtime-v2/index.js";

const scope = {
  companyId: "company-v2-test",
  assistantId: "assistant-v2-test",
  conversationId: "conversation-v2-test",
  contextVersion: 1,
};

function createProfile() {
  return {
    contactId: "contact-v2-test",
    displayName: "Danilo",
    language: "pt-BR",
    stablePreferences: [],
  };
}

function memoryAcer() {
  return {
    id: "memory-acer",
    sourceType: "THEMATIC_MEMORY",
    category: "device",
    content: "Danilo possui um notebook Acer Nitro 5.",
    confidence: 0.94,
    selectionReason: "topic_match",
    scope: "contact",
    authoritativeFor: ["device_context"],
  };
}

test("ConversationState V2 é isolado por escopo, mantém fatos e reseta somente a sessão", () => {
  const state = createEmptyConversationState(scope);
  const understanding = understandTurn({
    message: "Quero formatar meu Mac M1.",
    messageId: "message-1",
  });
  const updated = applyTurnToConversationState(state, understanding);

  assert.equal(updated.objective?.subject, "Mac M1");
  assert.equal(updated.confirmedFacts.device_model.value, "Mac M1");
  assert.equal(updated.contextVersion, 1);
  assert.equal(resetConversationState({ ...scope, contextVersion: 2 }).objective, null);
  assert.equal(
    resetConversationState({ ...scope, contextVersion: 2 }).confirmedFacts.device_model,
    undefined,
  );

  const corrected = applyTurnToConversationState(updated, {
    ...understanding,
    factsExtracted: [
      {
        key: "device_model",
        value: "MacBook Pro M1",
        confidence: 0.98,
        sourceType: "CUSTOMER_TEXT",
        sourceMessageId: "message-correction",
      },
    ],
    correctedFactKeys: ["device_model"],
  });
  assert.equal(corrected.confirmedFacts.device_model.value, "MacBook Pro M1");
});

test("ConversationState V2 possui contrato serializável e datas explícitas", () => {
  const state = applyTurnToConversationState(
    createEmptyConversationState(scope, new Date("2026-07-13T12:00:00.000Z")),
    understandTurn({
      message: "Quero formatar meu Mac M1.",
      messageId: "serializable-message-1",
    }),
    new Date("2026-07-13T12:01:00.000Z"),
  );
  const serialized = serializeConversationState(state);
  assert.equal(serialized.schemaVersion, "conversation-state-v2");
  assert.equal(typeof serialized.createdAt, "string");
  assert.equal(typeof serialized.confirmedFacts.device_model.confirmedAt, "string");
  assert.equal(JSON.stringify(serialized).includes("[object Object]"), false);

  const restored = deserializeConversationState(JSON.parse(JSON.stringify(serialized)));
  assert.ok(restored.createdAt instanceof Date);
  assert.ok(restored.confirmedFacts.device_model.confirmedAt instanceof Date);
  assert.equal(restored.confirmedFacts.device_model.value, "Mac M1");
  assert.equal(restored.revision, 0);
});

test("confirmações curtas usam a última pergunta relevante sem raciocínio livre", () => {
  const state = createEmptyConversationState(scope);
  state.lastRelevantQuestion = {
    key: "device_model",
    fieldKey: "device_model",
    prompt: "Seu notebook é um Acer Nitro 5?",
    sourceMessageId: "assistant-question-1",
    contextVersion: 1,
    askedAt: new Date("2026-07-13T12:00:00.000Z"),
  };
  state.pendingFields = ["device_model"];
  const understanding = understandTurn({
    message: "Sim, isso mesmo.",
    messageId: "customer-confirmation-1",
    contextVersion: 1,
    lastRelevantQuestion: state.lastRelevantQuestion,
  });

  assert.equal(understanding.isShortConfirmation, true);
  assert.equal(understanding.answeredQuestionKey, "device_model");
  assert.deepEqual(understanding.reasonCodes, ["SHORT_CONFIRMATION", "LAST_RELEVANT_QUESTION"]);
  assert.deepEqual(understanding.evidenceMessageIds, [
    "customer-confirmation-1",
    "assistant-question-1",
  ]);

  const updated = applyTurnToConversationState(state, understanding);
  assert.deepEqual(updated.pendingFields, []);
  assert.deepEqual(updated.answeredQuestions, ["device_model"]);
});

test("plano de recuperação não usa memória temática em saudação e permite retomada explícita", () => {
  const empty = createEmptyConversationState(scope);
  const greeting = understandTurn({ message: "Bom dia", messageId: "greeting-1" });
  const greetingPlan = buildRetrievalPlan({
    understanding: greeting,
    state: empty,
  });
  assert.deepEqual(greetingPlan.memoryTopics, []);
  assert.deepEqual(greetingPlan.officialFactCategories, []);
  assert.deepEqual(greetingPlan.toolCapabilitiesNeeded, []);
  assert.ok(greetingPlan.reasons.includes("IDENTITY_ONLY_FOR_GREETING"));

  const objectiveTurn = understandTurn({
    message: "Quero voltar a falar do Acer.",
    messageId: "resume-1",
  });
  const objectiveState = applyTurnToConversationState(empty, objectiveTurn);
  const resumePlan = buildRetrievalPlan({
    understanding: objectiveTurn,
    state: objectiveState,
  });
  assert.ok(resumePlan.memoryTopics.includes("Acer"));
  assert.ok(resumePlan.reasons.includes("EXPLICIT_PREVIOUS_TOPIC_REFERENCE"));
});

test("autoridade factual bloqueia preço sem fonte e permite preço oficial", () => {
  const state = createEmptyConversationState(scope);
  const understanding = understandTurn({
    message: "Quanto custa formatar um Mac M1?",
    messageId: "price-1",
  });
  const missingPlan = buildResponsePlan({
    understanding,
    state: applyTurnToConversationState(state, understanding),
    retrievedContext: {
      identityMemories: [],
      thematicMemories: [],
      officialFacts: [],
      knowledgeChunks: [],
      toolResults: [],
    },
  });
  assert.equal(missingPlan.action, "SAFE_UNAVAILABLE");
  assert.deepEqual(missingPlan.claimsForbidden, ["price"]);

  const officialPrice = {
    id: "official-price-1",
    sourceType: "OFFICIAL_CONTEXT",
    category: "price",
    content: "Preço confirmado pelo cadastro oficial.",
    selectionReason: "official_source",
    scope: "assistant",
    authoritativeFor: ["price"],
  };
  const allowedPlan = buildResponsePlan({
    understanding,
    state,
    retrievedContext: {
      identityMemories: [],
      thematicMemories: [],
      officialFacts: [officialPrice],
      knowledgeChunks: [],
      toolResults: [],
    },
  });
  assert.equal(allowedPlan.action, "ANSWER");
  assert.deepEqual(
    allowedPlan.claimsAllowed.map((claim) => claim.category),
    ["price"],
  );
});

test("PromptCompiler V2 é puro, mínimo e não adiciona saudação ou fallback", () => {
  const state = createEmptyConversationState(scope);
  const prompt = compileV2({
    invariantRules: ["Não invente fatos comerciais."],
    assistantIdentity: { name: "Assistente V2", role: "atendimento", tone: "natural" },
    officialContext: [],
    conversationState: state,
    responsePlan: {
      currentObjective: null,
      turnIntent: "greeting",
      selectedFlowId: null,
      flowStage: null,
      factsAvailable: [],
      factsMissing: [],
      claimsAllowed: [],
      claimsForbidden: [],
      toolsAllowed: [],
      action: "ANSWER",
      responseGoal: "Responder a saudação.",
      shouldHandoff: false,
      reasonCodes: [],
    },
    retrievedContext: {
      identityMemories: [],
      thematicMemories: [],
      officialFacts: [],
      knowledgeChunks: [],
      toolResults: [],
    },
    usefulHistory: [],
    currentMessage: "Bom dia",
  });

  assert.deepEqual(
    prompt.sections.map((section) => section.name),
    [
      "invariant-rules",
      "assistant-identity",
      "conversation-state",
      "response-plan",
      "authorized-facts",
      "retrieved-context",
      "useful-history",
      "current-message",
    ],
  );
  assert.doesNotMatch(
    prompt.messages.map((message) => message.content).join("\n"),
    /MENSAGEM INICIAL|fallbackMessage/i,
  );
  assert.equal(prompt.tokenEstimate, Math.ceil(prompt.charCount / 4));
});

test("ResponseValidator V2 bloqueia afirmação comercial sem autoridade e ferramenta fora do plano", () => {
  const state = createEmptyConversationState(scope);
  const result = validateResponse({
    answer: "O valor é R$ 300.",
    responsePlan: {
      currentObjective: null,
      turnIntent: "ask_price",
      selectedFlowId: null,
      flowStage: null,
      factsAvailable: [],
      factsMissing: ["price"],
      claimsAllowed: [],
      claimsForbidden: ["price"],
      toolsAllowed: [],
      action: "SAFE_UNAVAILABLE",
      responseGoal: "Informar ausência de fonte.",
      shouldHandoff: false,
      reasonCodes: ["MISSING_AUTHORITY"],
    },
    conversationState: state,
    toolCalls: ["calendar_createBooking"],
  });

  assert.equal(result.result, "SAFE_REPLACEMENT");
  assert.equal(result.unsupportedClaimDetected, true);
  assert.deepEqual(result.unsupportedClaimCategories, ["price"]);
  assert.ok(result.reasonCodes.includes("UNAUTHORIZED_TOOL"));

  const repeatState = createEmptyConversationState(scope);
  repeatState.answeredQuestions = ["device_model"];
  const repeated = validateResponse({
    answer: "Qual é o modelo?",
    responsePlan: {
      ...missingResponsePlan(),
      claimsForbidden: [],
      action: "ASK_NEXT_QUESTION",
    },
    conversationState: repeatState,
    generatedQuestionKey: "device_model",
  });
  assert.equal(repeated.repeatedQuestionDetected, true);
});

function missingResponsePlan() {
  return {
    currentObjective: null,
    turnIntent: "general_request",
    selectedFlowId: null,
    flowStage: null,
    factsAvailable: [],
    factsMissing: [],
    claimsAllowed: [],
    claimsForbidden: [],
    toolsAllowed: [],
    responseGoal: "Responder.",
    shouldHandoff: false,
    reasonCodes: [],
  };
}

test("feature flag mantém V1 como padrão e shadow mode não permite outbound duplo", () => {
  assert.equal(resolveRuntimeVersion(), "V1");
  assert.equal(shouldRunV2(), false);
  assert.equal(resolveRuntimeVersion({ runtimeV2Enabled: true }), "V2");
  assert.equal(isShadowMode({ runtimeVersion: "V2", shadowMode: true }), true);
  assert.throws(
    () =>
      assertNoDualOutbound({ runtimeVersion: "V2", v1OutboundSent: true, v2OutboundSent: true }),
    /RUNTIME_DUAL_OUTBOUND_BLOCKED/,
  );
});

test("protótipo V2 cobre saudação, fonte comercial, pergunta lateral e retorno ao objetivo", () => {
  const oldMemory = memoryAcer();
  const profile = createProfile();
  let state = createEmptyConversationState(scope);

  let turn = runRuntimeV2Prototype({
    scope,
    state,
    contactProfile: profile,
    message: "Bom dia.",
    messageId: "turn-1",
    thematicMemories: [oldMemory],
    generatedAnswer: "Bom dia, Danilo! Tudo bem, e com você? Como posso ajudar?",
  });
  assert.equal(turn.state.objective, null);
  assert.equal(turn.retrievedContext.thematicMemories.length, 0);
  assert.equal(turn.retrievedContext.identityMemories.length, 1);
  assert.equal(turn.validation.result, "PASS");
  state = turn.state;

  turn = runRuntimeV2Prototype({
    scope,
    state,
    contactProfile: profile,
    message: "Quero saber o valor para formatar um Mac M1.",
    messageId: "turn-2",
    thematicMemories: [oldMemory],
    generatedAnswer: "O valor é R$ 300.",
  });
  assert.equal(turn.state.objective?.subject, "Mac M1");
  assert.equal(turn.responsePlan.action, "SAFE_UNAVAILABLE");
  assert.equal(turn.validation.result, "SAFE_REPLACEMENT");
  assert.deepEqual(turn.manifest.unsupportedClaimCategories, ["price"]);
  state = turn.state;

  turn = runRuntimeV2Prototype({
    scope,
    state,
    contactProfile: profile,
    message: "Preciso salvar imagens e uma pasta de projeto.",
    messageId: "turn-3",
    thematicMemories: [oldMemory],
    generatedAnswer: "Entendi, vou considerar esses dados.",
  });
  assert.equal(turn.state.objective?.subject, "Mac M1");
  assert.ok(turn.state.confirmedFacts.storage_requirements);
  state = {
    ...turn.state,
    pendingFields: ["storage_destination"],
    lastValidNextStep: "Qual será o destino do backup?",
  };

  turn = runRuntimeV2Prototype({
    scope,
    state,
    contactProfile: profile,
    message: "Vocês conseguem buscar?",
    messageId: "turn-4",
    officialFacts: [],
    thematicMemories: [oldMemory],
    generatedAnswer: "Não tenho uma política confirmada para busca em domicílio.",
  });
  assert.equal(turn.state.objective?.subject, "Mac M1");
  assert.equal(turn.responsePlan.action, "SAFE_UNAVAILABLE");
  assert.equal(turn.validation.result, "PASS");

  state = turn.state;
  turn = runRuntimeV2Prototype({
    scope,
    state,
    contactProfile: profile,
    message: "Qual é o endereço?",
    messageId: "turn-5",
    officialFacts: [
      {
        id: "official-address",
        sourceType: "OFFICIAL_CONTEXT",
        category: "address",
        content: "Endereço oficial da empresa.",
        selectionReason: "official_source",
        scope: "assistant",
        authoritativeFor: ["address"],
      },
    ],
    thematicMemories: [oldMemory],
    generatedAnswer: "O endereço oficial é este.",
  });
  assert.equal(turn.responsePlan.action, "ANSWER");
  assert.equal(turn.state.objective?.subject, "Mac M1");

  state = turn.state;
  turn = runRuntimeV2Prototype({
    scope,
    state,
    contactProfile: profile,
    message: "Vamos continuar.",
    messageId: "turn-6",
    thematicMemories: [oldMemory],
    generatedAnswer: "Vamos seguir pelo próximo dado pendente: qual será o destino do backup?",
  });
  assert.equal(turn.understanding.explicitlyRequestsPreviousTopic, true);
  assert.equal(turn.state.objective?.subject, "Mac M1");
  assert.equal(turn.responsePlan.action, "ASK_NEXT_QUESTION");
  assert.equal(turn.responsePlan.nextQuestion, "Qual será o destino do backup?");
  assert.equal(turn.retrievedContext.thematicMemories.length, 0);
  assert.equal(turn.manifest.outboundStatus, "not_sent");
  assert.equal(turn.manifest.persistenceStatus, "not_persisted");
  assert.doesNotMatch(JSON.stringify(turn.manifest), /Bom dia|R\$ 300|Endereço oficial/);
});
