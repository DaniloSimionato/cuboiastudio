import assert from "node:assert/strict";
import test from "node:test";
import { AssistantKnowledgeRetrievalService } from "../dist/assistant-knowledge/assistant-knowledge-retrieval.service.js";
import {
  isKnowledgeScopeTagFilterEnabled,
  resolveFlowKnowledgeScope,
} from "../dist/assistant-conversations/flow-knowledge-scope.js";
import {
  getKnowledgeMetadataTags,
  normalizeKnowledgeScopeTag,
} from "../dist/assistant-knowledge/knowledge-scope-tags.js";
import {
  deduplicateEligibleRagPriceAuthorities,
  extractRagPriceAuthorities,
  filterEligibleRagPriceAuthorities,
  isRagPriceAuthorityCompatibleWithMessage,
} from "../dist/assistant-conversations/rag-price-authority.js";
import { buildDeterministicAssistantResponse } from "../dist/assistants/assistant-runtime.js";
import { validateV1AnswerAuthority } from "../dist/assistant-conversations/runtime-authority-guard.js";
import { ensureMultiIntentResponseCoverage } from "../dist/assistant-conversations/multi-intent-response-coverage.js";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";
import {
  buildMultiIntentTurn,
  flowIntentKeyForFlow,
  normalizeIntentText,
  resolveStructuralRoutingCategory,
  scoreFlowCandidates,
} from "../dist/intent-router/intent-routing.js";

const formatKnowledgeId = "knowledge-format";
const recoveryKnowledgeId = "knowledge-recovery";
const formatChunk = {
  id: "chunk-format",
  knowledgeId: formatKnowledgeId,
  chunkIndex: 0,
  content: "A formatação do computador tem valor a partir de R$ 1.950,00.",
  embedding: [1, 0],
  embeddingDimension: 2,
  knowledge: {
    title: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
    metadata: { type: "TEXT", tags: ["Formatação", "sistemas"] },
  },
};
const recoveryChunk = {
  id: "chunk-recovery",
  knowledgeId: recoveryKnowledgeId,
  chunkIndex: 0,
  content: "Montagem e configuração têm valor inicial a partir de R$ 195,00.",
  embedding: [0.9, Math.sqrt(0.19)],
  embeddingDimension: 2,
  knowledge: {
    title: "FG - Recuperação de Dados e Montagem de Computadores",
    metadata: { type: "TEXT", tags: ["recuperacao_dados"] },
  },
};

function scopedPrisma() {
  const chunks = [formatChunk, recoveryChunk];
  return {
    assistant: { findFirst: async () => ({ id: "assistant-1" }) },
    assistantKnowledge: { count: async () => 2 },
    assistantKnowledgeChunk: {
      count: async ({ where }) =>
        chunks.filter(
          (chunk) => !where.knowledgeId?.in || where.knowledgeId.in.includes(chunk.knowledgeId),
        ).length,
      findMany: async ({ where }) =>
        chunks.filter(
          (chunk) => !where.knowledgeId?.in || where.knowledgeId.in.includes(chunk.knowledgeId),
        ),
    },
  };
}

function authorityGuard(question, answer, eligiblePriceAuthorities, sources = []) {
  return validateV1AnswerAuthority({
    answer,
    currentMessage: question,
    sources,
    eligiblePriceAuthorities,
    officialBusinessContext: { businessHours: {}, timezone: "America/Campo_Grande" },
    expectedAuthorityCategory: "price",
  });
}

test("knowledgeScope usa tags normalizadas, e escopo configurado nunca faz fallback global", () => {
  assert.deepEqual(resolveFlowKnowledgeScope({ knowledgeScope: '["Formatação"]' }), {
    knowledgeScopeSource: "flow_knowledge_scope_tags",
    scopeTags: ["formatacao"],
    knowledgeScopeMissing: false,
  });
  assert.deepEqual(resolveFlowKnowledgeScope({ knowledgeScope: '["unknown"]' }), {
    knowledgeScopeSource: "flow_knowledge_scope_tags",
    scopeTags: ["unknown"],
    knowledgeScopeMissing: false,
  });
  assert.deepEqual(resolveFlowKnowledgeScope({ knowledgeScope: null }), {
    knowledgeScopeSource: "legacy_global",
    scopeTags: [],
    knowledgeScopeMissing: true,
  });
  assert.deepEqual(resolveFlowKnowledgeScope({ knowledgeScope: "[]" }), {
    knowledgeScopeSource: "legacy_global",
    scopeTags: [],
    knowledgeScopeMissing: true,
  });
  assert.equal(normalizeKnowledgeScopeTag(" Assistência-Técnica "), "assistencia_tecnica");
  assert.deepEqual(getKnowledgeMetadataTags({ type: "TEXT", tags: ["assistencia-tecnica"] }), [
    "assistencia_tecnica",
  ]);
  assert.equal(
    isKnowledgeScopeTagFilterEnabled({
      assistantId: "assistant-1",
      environment: { KNOWLEDGE_SCOPE_TAG_FILTER_ASSISTANT_IDS: "assistant-1, assistant-2" },
    }),
    true,
  );
  assert.equal(
    isKnowledgeScopeTagFilterEnabled({ assistantId: "assistant-1", environment: {} }),
    false,
  );
});

test("retrieval aplica tags de metadata e limita chunks ao scope", async () => {
  const retrieval = new AssistantKnowledgeRetrievalService(scopedPrisma(), {
    generateEmbedding: async () => ({ embedding: [1, 0] }),
  });
  const result = await retrieval.searchRelevantKnowledge({
    tenant: { companyId: "company-1" },
    assistantId: "assistant-1",
    query: "Qual o valor para formatar um PC?",
    knowledgeScopeTags: ["formatacao"],
    scoreThreshold: 0.55,
  });

  assert.equal(result.knowledgeScopeApplied, true);
  assert.deepEqual(result.allowedKnowledgeTags, ["formatacao"]);
  assert.equal(result.rejectedOutOfScopeChunkCount, 1);
  assert.deepEqual(
    result.results.map((item) => item.chunkId),
    ["chunk-format"],
  );

  const emptyScopedResult = await retrieval.searchRelevantKnowledge({
    tenant: { companyId: "company-1" },
    assistantId: "assistant-1",
    query: "Qual o valor para formatar um PC?",
    knowledgeScopeTags: ["nao_existe"],
    scoreThreshold: 0.55,
  });
  assert.equal(emptyScopedResult.results.length, 0);
  assert.equal(emptyScopedResult.knowledgeScopeApplied, true);
  assert.equal(emptyScopedResult.knowledgeScopeNoMatch, true);

  const legacyResult = await retrieval.searchRelevantKnowledge({
    tenant: { companyId: "company-1" },
    assistantId: "assistant-1",
    query: "Qual o valor para formatar um PC?",
    scoreThreshold: 0.55,
  });
  assert.equal(legacyResult.knowledgeScopeApplied, false);
  assert.deepEqual(
    legacyResult.results.map((item) => item.chunkId),
    ["chunk-format", "chunk-recovery"],
  );
});

test("domínio explícito vence PRICE e preserva PRICE como intenção secundária", () => {
  const flows = [
    {
      id: "format",
      name: "Orçamento e Formatação",
      active: true,
      priority: 1,
      triggerKeywords: '["formatar"]',
      triggerDescription: "Formatação de computadores",
    },
    {
      id: "recovery",
      name: "Recuperação de Dados",
      active: true,
      priority: 1,
      triggerKeywords: '["recuperar dados"]',
      triggerDescription: "Recuperação de dados e arquivos",
    },
    {
      id: "price",
      name: "Orçamento e Preços",
      active: true,
      priority: 90,
      triggerKeywords: '["valor","preço"]',
      triggerDescription: "Valores e orçamento",
    },
    {
      id: "pickup",
      name: "Coleta e Entrega",
      active: true,
      priority: 1,
      triggerKeywords: '["buscar equipamento"]',
      triggerDescription: "Buscar e coletar equipamento",
    },
    {
      id: "technical",
      name: "Assistência Técnica Geral",
      active: true,
      priority: 1,
      triggerKeywords: '["travando"]',
      triggerDescription: "Suporte técnico geral",
    },
  ];

  const cases = [
    ["Quanto sai para formatar?", "format", "formatting", ["pricing"]],
    ["Quanto custa recuperar dados?", "recovery", "data_recovery", ["pricing"]],
    ["Qual o valor para buscar o equipamento?", "pickup", "pickup_delivery", ["pricing"]],
    ["Quanto custa?", "price", "pricing", []],
    ["Meu computador está travando.", "technical", "technical_support", []],
    ["Quero formatar meu computador.", "format", "formatting", []],
  ];

  for (const [message, flowId, primaryIntent, secondaryIntents] of cases) {
    const selected = scoreFlowCandidates(message, flows)[0];
    assert.equal(selected.flowId, flowId, message);
    const turn = buildMultiIntentTurn({
      message,
      selectedIntentKey: flowIntentKeyForFlow(flows.find((flow) => flow.id === flowId)),
    });
    assert.equal(turn.primaryIntent, primaryIntent, message);
    assert.deepEqual(turn.secondaryIntents, secondaryIntents, message);
  }
});

test("flow de equipamento específico vence referências colaterais de visita, vendas e triagem", () => {
  const flows = [
    {
      id: "visit",
      name: "Visita Técnica Externa",
      active: true,
      priority: 85,
      triggerKeywords: '["visita técnica","wifi","rede","roteador","empresa","impressora"]',
      triggerDescription: "Visita no local para redes, Wi-Fi e impressoras no local.",
    },
    {
      id: "sales",
      name: "Vendas e Comercial",
      active: true,
      priority: 75,
      triggerKeywords: '["comprar","impressora nova"]',
      triggerDescription: "Vendas de impressoras e equipamentos.",
    },
    {
      id: "technical",
      name: "Assistência Técnica Geral",
      active: true,
      priority: 60,
      triggerKeywords: '["conserto","impressora não imprime"]',
      triggerDescription: "Assistência técnica para impressoras e equipamentos.",
    },
    {
      id: "company",
      name: "Informações da Empresa",
      active: true,
      priority: 50,
      triggerKeywords: '["endereço","localização","telefone","whatsapp","contato"]',
      triggerDescription: "Endereço, localização, telefone e contato da empresa.",
    },
    {
      id: "printer",
      name: "Impressoras e Etiquetas",
      active: true,
      priority: 64,
      triggerKeywords: '["impressora","impressora térmica","impressora fiscal","não imprime"]',
      triggerDescription: "Manutenção de impressoras, cupom e etiquetas.",
    },
    {
      id: "notebook",
      name: "Notebooks e Upgrades",
      active: true,
      priority: 63,
      triggerKeywords: '["notebook","tela de notebook","upgrade notebook"]',
      triggerDescription: "Serviços de notebook, tela e upgrade.",
    },
    {
      id: "apple",
      name: "Apple, Videogames, Monitores e TVs",
      active: true,
      priority: 62,
      triggerKeywords: '["macbook","imac","videogame","monitor","tv"]',
      triggerDescription: "Serviços para MacBook, iMac, videogames, monitores e TVs.",
    },
    {
      id: "nobreak",
      name: "Nobreaks, Projetores e Eletrônicos",
      active: true,
      priority: 61,
      triggerKeywords: '["nobreak","projetor","eletrônico"]',
      triggerDescription: "Serviços para nobreaks, projetores e eletrônicos.",
    },
  ];

  const cases = [
    ["Podem ir até minha empresa configurar o Wi-Fi?", "visit", "external_visit"],
    ["Podem ir até minha empresa configurar o Wi‑Fi?", "visit", "external_visit"],
    ["Podem ir ate minha empresa configurar o wifi?", "visit", "external_visit"],
    ["Preciso de atendimento no local para configurar a rede.", "visit", "external_visit"],
    ["Vocês fazem visita técnica?", "visit", "external_visit"],
    ["Um técnico pode ir ao meu endereço?", "visit", "external_visit"],
    ["Vocês podem mandar um técnico aqui?", "visit", "external_visit"],
    ["Alguém pode vir até minha empresa?", "visit", "external_visit"],
    ["Preciso de atendimento no local.", "visit", "external_visit"],
    ["Um profissional pode comparecer na minha loja?", "visit", "external_visit"],
    ["Fazem instalação de rede na empresa?", "visit", "external_visit"],
    ["Podem configurar meu roteador no local?", "visit", "external_visit"],
    ["Vocês consertam impressoras?", "printer"],
    ["Minha impressora térmica não imprime.", "printer"],
    ["Vocês arrumam impressora fiscal?", "printer"],
    ["Meu notebook precisa de tela.", "notebook"],
    ["Vocês arrumam MacBook?", "apple"],
    ["Fazem manutenção em nobreak?", "nobreak"],
    ["Consertam impressora no local?", "printer"],
    ["Um técnico pode vir consertar minha impressora?", "printer"],
    ["Consertam notebook no local?", "notebook"],
    ["Meu computador está travando.", "technical"],
    ["Qual o endereço da empresa?", "company", "institutional_information"],
    ["Onde vocês ficam?", "company", "institutional_information"],
    ["Me passa a localização da loja.", "company", "institutional_information"],
    ["Qual o telefone para contato?", "company", "institutional_information"],
    ["Vocês têm WhatsApp?", "company", "institutional_information"],
    ["Como faço para chegar até vocês?", "company", "institutional_information"],
    ["Quero falar com um técnico.", undefined],
  ];

  assert.equal(normalizeIntentText("Wi-Fi"), "wifi");
  assert.equal(normalizeIntentText("Wi‑Fi"), "wifi");
  assert.equal(normalizeIntentText("wi fi"), "wifi");

  for (const [message, flowId, category] of cases) {
    if (category) assert.equal(resolveStructuralRoutingCategory(message), category, message);
    assert.equal(scoreFlowCandidates(message, flows)[0]?.flowId, flowId, message);
    const selected = scoreFlowCandidates(message, flows)[0];
    if (selected) {
      assert.equal(typeof selected.flowId, "string", message);
      assert.equal(typeof selected.flowName, "string", message);
      assert.equal(Object.hasOwn(selected, "flow"), false, message);
    }
  }
});

test("pipeline retrieval → autoridades → guard só permite o preço do domínio escopado", () => {
  const question = "Qual o valor para formatar um PC?";
  const selected = [formatChunk].map((chunk) => {
    const priceAuthorities = extractRagPriceAuthorities({
      chunkId: chunk.id,
      knowledgeItemId: chunk.knowledgeId,
      title: chunk.knowledge.title,
      content: chunk.content,
    }).filter((authority) =>
      isRagPriceAuthorityCompatibleWithMessage({ authority, currentMessage: question }),
    );
    return {
      id: chunk.id,
      knowledgeItemId: chunk.knowledgeId,
      title: chunk.knowledge.title,
      content: chunk.content,
      ragAuthorityEligible: true,
      priceAuthorities,
    };
  });
  const eligiblePriceAuthorities = deduplicateEligibleRagPriceAuthorities(
    filterEligibleRagPriceAuthorities({
      authorities: selected.flatMap((item) => item.priceAuthorities),
      currentMessage: question,
    }),
  );
  const deterministic = buildDeterministicAssistantResponse({
    question,
    knowledgeItems: selected,
    priceAuthorityContext: { eligiblePriceAuthorities },
  });
  const authorities = deterministic.eligiblePriceAuthorities;

  assert.deepEqual(
    authorities.map((authority) => authority.amount),
    [1950],
  );
  assert.equal(authorities[0].qualifier, "starting_at");
  assert.equal(
    authorityGuard(question, "A formatação custa a partir de R$ 1.950,00.", authorities)
      .unsupportedClaimDetected,
    false,
  );
  assert.equal(
    authorityGuard(question, "A formatação custa a partir de R$ 195,00.", authorities)
      .replacementReason,
    "unsupported_claim_replaced",
  );
});

test("autoridades de montagem e placa-mãe são excluídas para uma consulta de formatação", () => {
  const question = "Quanto sai para formatar?";
  const unrelated = [
    recoveryChunk,
    {
      ...formatChunk,
      id: "chunk-motherboard",
      content: "O reparo de placa-mãe custa a partir de R$ 395,00.",
    },
  ];
  const authorities = unrelated.flatMap((chunk) =>
    extractRagPriceAuthorities({
      chunkId: chunk.id,
      knowledgeItemId: chunk.knowledgeId,
      title: chunk.knowledge.title,
      content: chunk.content,
    }).filter((authority) =>
      isRagPriceAuthorityCompatibleWithMessage({ authority, currentMessage: question }),
    ),
  );
  assert.deepEqual(authorities, []);
});

test("cobertura multi-intent e prompt preservam os domínios formatting e data_recovery", () => {
  const cases = [
    {
      message: "Quanto custa formatar um Mac?",
      selectedIntentKey: "formatting",
      domain: /DOMÍNIO ATUAL: FORMATAÇÃO E SISTEMAS/i,
      acknowledgement: /formatação ou instalação de sistema/i,
    },
    {
      message: "Quanto custa recuperar dados de um HD?",
      selectedIntentKey: "data_recovery",
      domain: /DOMÍNIO ATUAL: RECUPERAÇÃO DE DADOS/i,
      acknowledgement: /recuperar dados/i,
    },
  ];

  for (const item of cases) {
    const turn = buildMultiIntentTurn({
      message: item.message,
      selectedIntentKey: item.selectedIntentKey,
    });
    const coverage = ensureMultiIntentResponseCoverage({
      answer: "Sobre valores, preciso confirmar a informação antes de passar qualquer preço.",
      turn,
      currentMessage: item.message,
      officialBusinessContext: null,
    });
    assert.match(coverage.answer, item.acknowledgement);
    assert.deepEqual(turn.secondaryIntents, ["pricing"]);

    const prompt = new PromptCompilerService().compile({
      assistant: { name: "Assistente" },
      knowledgeItems: [],
      historyMessages: [],
      currentMessage: item.message,
      multiIntentTurn: turn,
    });
    assert.match(prompt.map((entry) => String(entry.content)).join("\n"), item.domain);
  }
});
