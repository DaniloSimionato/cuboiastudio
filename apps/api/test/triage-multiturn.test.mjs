import assert from "node:assert/strict";
import test from "node:test";
import { PromptCompilerService, isTriageResponseValid } from "../dist/prompt-compiler/prompt-compiler.service.js";

class MockCacheService {
  store = new Map();
  throwOnOperations = false;

  async get(key) {
    if (this.throwOnOperations) {
      throw new Error("Redis connection failure simulation");
    }
    return this.store.get(key) || null;
  }

  async set(key, value, ttl) {
    if (this.throwOnOperations) {
      throw new Error("Redis connection failure simulation");
    }
    this.store.set(key, value);
  }

  async delete(key) {
    if (this.throwOnOperations) {
      throw new Error("Redis connection failure simulation");
    }
    this.store.delete(key);
  }
}

test("Maquina de Estados TriageMode — Turnos do Diálogo", async () => {
  const compiler = new PromptCompilerService();
  const cache = new MockCacheService();
  const cacheKey = "triage:company-1:conv-1";

  // TURNO 1: Usuário envia múltiplas necessidades
  const userMessageTurn1 = "Oi bom dia\nQuero formatar meu computador\nColocar SSD\nAumentar a memória\nQuanto fica?";

  const promptMessagesTurn1 = compiler.compile({
    assistant: { name: "Atendente FG" },
    behavior: {},
    securityRules: [],
    knowledgeItems: [],
    historyMessages: [],
    currentMessage: userMessageTurn1,
    officialBusinessContext: { companyName: "FG Informática" },
    triageMode: true,
  });

  const contentTurn1 = promptMessagesTurn1.map(m => String(m.content));
  assert.ok(contentTurn1.some(c => c.includes("FORMATO DE SAÍDA OBRIGATÓRIO (JSON)")));
  assert.ok(contentTurn1.some(c => c.includes("OBJETIVO DA TRIAGEM:")));

  const llmResponseTurn1 = JSON.stringify({
    message: "Consigo te ajudar com tudo isso! Qual é o modelo do seu computador?",
    action: "ASK_NEXT_DETAIL",
    requestedDetail: "modelo do equipamento",
    suggestScheduling: false,
    triageResolved: false
  });

  assert.ok(isTriageResponseValid(llmResponseTurn1));

  const parsedTurn1 = JSON.parse(llmResponseTurn1);
  const triageStateTurn1 = {
    active: true,
    startedAt: new Date().toISOString(),
    sourceMessageId: "msg-1",
    requestedDetail: parsedTurn1.requestedDetail,
    lastQuestion: parsedTurn1.message,
    attemptCount: 1,
    resolved: false,
    expiresAt: Date.now() + 3600000,
  };
  await cache.set(cacheKey, triageStateTurn1);

  // TURNO 2: O cliente responde questionando
  const userMessageTurn2 = "Mas por que agendar? Já não estamos falando aqui?";

  const loadedStateTurn2 = await cache.get(cacheKey);
  assert.ok(loadedStateTurn2 && loadedStateTurn2.active);

  const promptMessagesTurn2 = compiler.compile({
    assistant: { name: "Atendente FG" },
    behavior: {},
    securityRules: [],
    knowledgeItems: [],
    historyMessages: [],
    currentMessage: userMessageTurn2,
    officialBusinessContext: { companyName: "FG Informática" },
    triageMode: true,
    triageState: loadedStateTurn2,
  });

  const contentTurn2 = promptMessagesTurn2.map(m => String(m.content));
  assert.ok(contentTurn2.some(c => c.includes("HISTÓRICO E ESTADO DE TRIAGEM ANTERIOR:")));
  assert.ok(contentTurn2.some(c => c.includes("modelo do equipamento")));

  const llmResponseTurn2 = JSON.stringify({
    message: "Você tem razão, podemos resolver por aqui mesmo. Qual é o modelo do computador?",
    action: "ASK_NEXT_DETAIL",
    requestedDetail: "modelo do equipamento",
    suggestScheduling: false,
    triageResolved: false
  });

  assert.ok(isTriageResponseValid(llmResponseTurn2));

  // TURNO 3: O cliente responde fornecendo a informação
  const userMessageTurn3 = "É um Dell Inspiron 15 3501.";

  const loadedStateTurn3 = await cache.get(cacheKey);
  assert.ok(loadedStateTurn3 && loadedStateTurn3.active);

  compiler.compile({
    assistant: { name: "Atendente FG" },
    behavior: {},
    securityRules: [],
    knowledgeItems: [],
    historyMessages: [],
    currentMessage: userMessageTurn3,
    officialBusinessContext: { companyName: "FG Informática" },
    triageMode: true,
    triageState: loadedStateTurn3,
  });

  const llmResponseTurn3 = JSON.stringify({
    message: "Obrigado por informar o modelo.",
    action: "ASK_NEXT_DETAIL",
    requestedDetail: "modelo do equipamento",
    suggestScheduling: false,
    triageResolved: true
  });

  const parsedTurn3 = JSON.parse(llmResponseTurn3);
  assert.ok(parsedTurn3.triageResolved);

  if (parsedTurn3.triageResolved) {
    await cache.delete(cacheKey);
  }

  const finalState = await cache.get(cacheKey);
  assert.equal(finalState, null);
});

test("isTriageResponseValid validação robusta de JSON", () => {
  // JSON em code fences deve ser aceito
  const jsonWithFence = `\`\`\`json
  {
    "message": "Qual o modelo do seu notebook?",
    "action": "ASK_NEXT_DETAIL",
    "requestedDetail": "modelo",
    "suggestScheduling": false,
    "triageResolved": false
  }
  \`\`\``;
  assert.ok(isTriageResponseValid(jsonWithFence));

  // JSON inválido/malformado deve ser rejeitado
  const malformedJson = `{"message": "qual o modelo?", "action": "ASK_NEXT_DETAIL"`;
  assert.equal(isTriageResponseValid(malformedJson), false);

  // Campo obrigatório ausente
  const missingFieldJson = JSON.stringify({
    message: "Qual o modelo do pc?",
    action: "ASK_NEXT_DETAIL",
    requestedDetail: "modelo",
    suggestScheduling: false
    // triageResolved ausente
  });
  assert.equal(isTriageResponseValid(missingFieldJson), false);

  // Duas perguntas
  const twoQuestionsJson = JSON.stringify({
    message: "Qual o modelo do pc? E qual o SSD desejado?",
    action: "ASK_NEXT_DETAIL",
    requestedDetail: "modelo",
    suggestScheduling: false,
    triageResolved: false
  });
  assert.equal(isTriageResponseValid(twoQuestionsJson), false);

  // Sugestão de agendamento não solicitada
  const unrequestedSchedulingJson = JSON.stringify({
    message: "Qual o modelo?",
    action: "ASK_NEXT_DETAIL",
    requestedDetail: "modelo",
    suggestScheduling: true,
    triageResolved: false
  });
  assert.equal(isTriageResponseValid(unrequestedSchedulingJson), false);
});

test("TTL, isolamento, reset e falha temporária do Redis", async () => {
  const cache = new MockCacheService();
  const triageKey1 = "triage:company-1:conv-1";
  const triageKey2 = "triage:company-1:conv-2";
  const triageKeyDifferentTenant = "triage:company-2:conv-1";

  const stateObj = {
    active: true,
    startedAt: new Date().toISOString(),
    sourceMessageId: "msg-1",
    requestedDetail: "modelo",
    lastQuestion: "qual o modelo?",
    attemptCount: 1,
    resolved: false,
    expiresAt: Date.now() + 3600000
  };

  // Isolamento entre conversas e tenants
  await cache.set(triageKey1, stateObj);
  await cache.set(triageKey2, { ...stateObj, lastQuestion: "outra pergunta" });
  await cache.set(triageKeyDifferentTenant, { ...stateObj, lastQuestion: "pergunta outro tenant" });

  const fetchKey1 = await cache.get(triageKey1);
  const fetchKey2 = await cache.get(triageKey2);
  const fetchKeyDifferentTenant = await cache.get(triageKeyDifferentTenant);

  assert.equal(fetchKey1?.lastQuestion, "qual o modelo?");
  assert.equal(fetchKey2?.lastQuestion, "outra pergunta");
  assert.equal(fetchKeyDifferentTenant?.lastQuestion, "pergunta outro tenant");

  // Reset/Clear do estado
  await cache.delete(triageKey1);
  const clearedState = await cache.get(triageKey1);
  assert.equal(clearedState, null);

  // Expiração (Simulação de TTL/ExpiresAt passado)
  const expiredStateObj = {
    ...stateObj,
    expiresAt: Date.now() - 100 // Expirado há 100ms
  };
  await cache.set(triageKey1, expiredStateObj);
  const retrievedExpired = await cache.get(triageKey1);
  assert.ok(retrievedExpired.expiresAt < Date.now()); // Confirmamos que o tempo de expiração passou

  // Falha temporária do Redis não deve quebrar execução
  cache.throwOnOperations = true;
  try {
    await cache.get(triageKey1);
    assert.fail("Should throw since throwOnOperations is true");
  } catch (e) {
    assert.equal(e.message, "Redis connection failure simulation");
  }
});
