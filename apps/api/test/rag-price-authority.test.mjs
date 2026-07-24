import assert from "node:assert/strict";
import test from "node:test";
import { buildDeterministicAssistantResponse } from "../dist/assistants/assistant-runtime.js";
import { validateV1AnswerAuthority } from "../dist/assistant-conversations/runtime-authority-guard.js";
import { selectRuntimeKnowledgeItems } from "../dist/assistant-conversations/runtime-context-manifest.js";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";
import {
  extractRagPriceAuthorities,
  filterEligibleRagPriceAuthorities,
  deduplicateEligibleRagPriceAuthorities,
  hasConflictingEligibleRagPriceAuthorities,
  requestedPriceServiceKeys,
  resolveDeterministicPriceResponse,
} from "../dist/assistant-conversations/rag-price-authority.js";

const priceChunk = {
  knowledgeId: "cmre9yg2f000do701wvxe30lq",
  knowledgeTitle: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
  chunkId: "cmrea0w390010o701k3n4y6v0",
  contentPreview:
    "A formatação básica padrão, incluindo instalação do Windows, tem valor a partir de R$ 195,00. O orçamento final depende da avaliação técnica.",
  score: 0.5534,
};

function officialContext() {
  return { businessHours: {}, timezone: "America/Campo_Grande" };
}

function selectedRagContext(question = "Quanto sai para formatar?") {
  const selection = selectRuntimeKnowledgeItems({
    ragEnabled: true,
    threshold: 0.55,
    results: [priceChunk],
  });
  const eligiblePriceAuthorities = deduplicateEligibleRagPriceAuthorities(
    filterEligibleRagPriceAuthorities({
      authorities: selection.items.flatMap((item) =>
        extractRagPriceAuthorities({
          chunkId: item.id,
          knowledgeItemId: item.knowledgeItemId ?? item.id,
          title: item.title,
          content: item.content,
        }),
      ),
      currentMessage: question,
    }),
  );
  const deterministic = buildDeterministicAssistantResponse({
    question,
    knowledgeItems: selection.items,
    priceAuthorityContext: { eligiblePriceAuthorities },
  });
  const prompt = new PromptCompilerService().compile({
    assistant: { name: "Assistente" },
    knowledgeItems: selection.items,
    historyMessages: [],
    currentMessage: question,
  });
  return { selection, eligiblePriceAuthorities, deterministic, prompt };
}

function guard(question, answer, eligiblePriceAuthorities, sources = []) {
  return validateV1AnswerAuthority({
    answer,
    currentMessage: question,
    sources,
    eligiblePriceAuthorities,
    officialBusinessContext: officialContext(),
    expectedAuthorityCategory: "price",
  });
}

test("RAG selecionado cria contrato de preço e o mesmo item entra no prompt", () => {
  const { selection, eligiblePriceAuthorities, deterministic, prompt } = selectedRagContext();
  const authority = eligiblePriceAuthorities[0];

  assert.equal(selection.items[0].ragAuthorityEligible, true);
  assert.equal(authority?.authorityType, "price");
  assert.equal(authority?.source, "rag");
  assert.equal(authority?.chunkId, priceChunk.chunkId);
  assert.equal(authority?.knowledgeItemId, priceChunk.knowledgeId);
  assert.equal(authority?.amount, 195);
  assert.equal(authority?.currency, "BRL");
  assert.equal(authority?.qualifier, "starting_at");
  assert.match(authority?.service ?? "", /formata/i);
  assert.match(authority?.sourceText ?? "", /a partir de R\$ 195,00/i);
  assert.equal(deterministic.eligiblePriceAuthorities, eligiblePriceAuthorities);
  assert.equal(deterministic.sources[0].priceAuthorities, undefined);
  assert.match(
    prompt.map((message) => String(message.content)).join("\n"),
    /a partir de R\$ 195,00/i,
  );
});

test("provider mockado preserva somente preços RAG compatíveis e qualificados", () => {
  const { eligiblePriceAuthorities } = selectedRagContext();
  const cases = [
    ["Quanto sai para formatar?", "A formatação básica custa a partir de R$ 195,00."],
    ["Qual o preço da formatação?", "O valor parte de R$ 195,00."],
    ["Quanto custa colocar um Windows mais atual?", "A formatação tem valor inicial de R$ 195,00."],
  ];

  for (const [question, providerAnswer] of cases) {
    const result = guard(question, providerAnswer, eligiblePriceAuthorities);
    assert.equal(result.unsupportedClaimDetected, false, providerAnswer);
    assert.equal(result.replacementReason, null, providerAnswer);
    assert.equal(result.answer, providerAnswer);
  }
});

test("guard bloqueia preço fechado, valor divergente e serviço fora da autoridade RAG", () => {
  const { eligiblePriceAuthorities } = selectedRagContext();
  const cases = [
    ["Quanto sai para formatar?", "A formatação custa exatamente R$ 195,00."],
    ["Quanto sai para formatar?", "A formatação custa a partir de R$ 150,00."],
    ["Quanto custa recuperar arquivos?", "A recuperação de arquivos custa a partir de R$ 195,00."],
    ["Quanto custa uma impressora?", "Uma impressora custa a partir de R$ 195,00."],
    ["Qual o preço de um notebook?", "Um notebook custa a partir de R$ 195,00."],
    ["A formatação custa R$ 100,00?", "A formatação custa a partir de R$ 100,00."],
    ["Vocês fazem por R$ 150,00?", "A formatação custa a partir de R$ 150,00."],
  ];

  for (const [question, providerAnswer] of cases) {
    const result = guard(question, providerAnswer, eligiblePriceAuthorities);
    assert.equal(result.replacementReason, "unsupported_claim_replaced", providerAnswer);
    assert.equal(result.finalSafeResponseCategory, "price", providerAnswer);
    assert.match(result.answer, /não tenho um valor confirmado/i, providerAnswer);
  }
});

test("somente autoridade RAG selecionada concede preço", () => {
  const { eligiblePriceAuthorities } = selectedRagContext();
  const validAnswer = "A formatação básica custa a partir de R$ 195,00.";
  const unselected = buildDeterministicAssistantResponse({
    question: "Quanto sai para formatar?",
    knowledgeItems: [
      {
        id: priceChunk.chunkId,
        knowledgeItemId: priceChunk.knowledgeId,
        title: priceChunk.knowledgeTitle,
        content: priceChunk.contentPreview,
      },
    ],
  });

  assert.equal(
    guard("Quanto sai para formatar?", validAnswer, unselected.eligiblePriceAuthorities)
      .unsupportedClaimDetected,
    true,
  );
  assert.equal(guard("Quanto sai para formatar?", validAnswer, []).unsupportedClaimDetected, true);
  assert.equal(
    guard("Quanto sai para formatar?", validAnswer, eligiblePriceAuthorities)
      .unsupportedClaimDetected,
    false,
  );
});

test("texto do cliente e histórico não criam autoridade de preço", () => {
  const providerAnswer = "A formatação básica custa a partir de R$ 195,00.";
  assert.equal(
    guard("Paguei R$ 195,00 antes para formatar. Quanto custa agora?", providerAnswer, [])
      .unsupportedClaimDetected,
    true,
  );
  assert.equal(
    guard("Quanto sai para formatar?", providerAnswer, []).unsupportedClaimDetected,
    true,
  );
});

test("autoridades de preço elegíveis são filtradas pelo serviço solicitado", () => {
  const authorities = extractRagPriceAuthorities({
    chunkId: "mixed-prices",
    knowledgeItemId: "knowledge-format",
    title: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
    content:
      "Formatação de computador tem valor inicial de R$ 1.950,00. Reparo de placa-mãe tem valor inicial de R$ 395,00. Remoção de vírus exige avaliação técnica.",
  });
  assert.deepEqual(
    authorities.map((authority) => [authority.serviceKey, authority.amount]),
    [
      ["formatacao", 1950],
      ["placa_mae", 395],
    ],
  );

  const cases = [
    ["Qual o valor para formatar um PC?", ["formatacao"], [1950]],
    ["Quanto custa o reparo de placa-mãe?", ["placa_mae"], [395]],
    ["Quanto custa remover vírus?", ["remocao_virus"], []],
    ["Quanto custa recuperar dados de um HD?", ["recuperacao_dados"], []],
    ["Quanto custa a assistência técnica?", [], []],
    ["Quero formatar e também verificar a placa-mãe.", ["formatacao", "placa_mae"], [1950, 395]],
    ["Preciso verificar a placa-mãe e depois formatar.", ["placa_mae", "formatacao"], [1950, 395]],
    ["Quero remover vírus e formatar o computador.", ["remocao_virus", "formatacao"], [1950]],
    [
      "Quero formatar, verificar a placa-mãe e remover vírus.",
      ["formatacao", "placa_mae", "remocao_virus"],
      [1950, 395],
    ],
  ];
  for (const [message, serviceKeys, amounts] of cases) {
    assert.deepEqual(requestedPriceServiceKeys(message), serviceKeys, message);
    assert.deepEqual(
      filterEligibleRagPriceAuthorities({ authorities, currentMessage: message }).map(
        (authority) => authority.amount,
      ),
      amounts,
      message,
    );
  }
  assert.equal(hasConflictingEligibleRagPriceAuthorities(authorities), false);
  assert.equal(
    hasConflictingEligibleRagPriceAuthorities([
      authorities[0],
      { ...authorities[0], amount: 1800 },
    ]),
    true,
  );
});

test("pergunta explícita com um serviço e uma autoridade elegível gera resposta sem provider", () => {
  const { eligiblePriceAuthorities } = selectedRagContext("Qual o valor para formatar um PC?");
  const result = resolveDeterministicPriceResponse({
    isExplicitPriceQuery: true,
    currentMessage: "Qual o valor para formatar um PC?",
    eligiblePriceAuthorities,
  });

  assert.deepEqual(
    {
      serviceKey: result?.serviceKey,
      amount: result?.authority.amount,
      qualifier: result?.authority.qualifier,
      answer: result?.answer,
    },
    {
      serviceKey: "formatacao",
      amount: 195,
      qualifier: "starting_at",
      answer: "A formatação custa a partir de R$ 195,00.",
    },
  );
});

test("resposta determinística de preço recusa serviço ausente, múltiplo ou autoridade ambígua", () => {
  const { eligiblePriceAuthorities } = selectedRagContext("Qual o valor para formatar um PC?");
  const authority = eligiblePriceAuthorities[0];

  for (const input of [
    {
      isExplicitPriceQuery: false,
      currentMessage: "Quero formatar um PC.",
      eligiblePriceAuthorities,
    },
    {
      isExplicitPriceQuery: true,
      currentMessage: "Quero formatar e verificar a placa-mãe.",
      eligiblePriceAuthorities,
    },
    {
      isExplicitPriceQuery: true,
      currentMessage: "Qual o valor para formatar um PC?",
      eligiblePriceAuthorities: [authority, { ...authority, amount: 210 }],
    },
  ]) {
    assert.equal(resolveDeterministicPriceResponse(input), null);
  }
});

test("autoridades elegíveis idênticas agregam proveniência sem esconder conflitos reais", () => {
  const formatting = extractRagPriceAuthorities({
    chunkId: "format-a",
    knowledgeItemId: "knowledge-format",
    title: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
    content: "Formatação de computador tem valor inicial de R$ 1.950,00.",
  })[0];
  const formattingDuplicateA = { ...formatting, chunkId: "format-b", sourceChunkIds: ["format-b"] };
  const formattingDuplicateB = { ...formatting, chunkId: "format-c", sourceChunkIds: ["format-c"] };
  const motherboard = extractRagPriceAuthorities({
    chunkId: "motherboard-a",
    knowledgeItemId: "knowledge-format",
    title: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
    content: "Reparo de placa-mãe tem valor inicial de R$ 395,00.",
  })[0];

  const formattingOnly = deduplicateEligibleRagPriceAuthorities(
    filterEligibleRagPriceAuthorities({
      authorities: [formatting, formattingDuplicateA, formattingDuplicateB, motherboard],
      currentMessage: "Qual o valor para formatar um PC?",
    }),
  );
  assert.equal(formattingOnly.length, 1);
  assert.equal(formattingOnly[0].amount, 1950);
  assert.equal(formattingOnly[0].evidenceCount, 3);
  assert.deepEqual(formattingOnly[0].sourceChunkIds, ["format-a", "format-b", "format-c"]);
  assert.deepEqual(formattingOnly[0].sourceKnowledgeIds, ["knowledge-format"]);

  assert.equal(
    deduplicateEligibleRagPriceAuthorities([formatting, { ...formatting, amount: 2100 }]).length,
    2,
  );
  assert.equal(
    deduplicateEligibleRagPriceAuthorities([{ ...formatting, amount: 395 }, motherboard]).length,
    2,
  );
  assert.equal(
    deduplicateEligibleRagPriceAuthorities([formatting, { ...formatting, qualifier: "fixed" }])
      .length,
    2,
  );
  assert.equal(
    deduplicateEligibleRagPriceAuthorities(
      filterEligibleRagPriceAuthorities({
        authorities: [
          motherboard,
          { ...motherboard, chunkId: "motherboard-b", sourceChunkIds: ["motherboard-b"] },
        ],
        currentMessage: "Quanto custa o reparo de placa-mãe?",
      }),
    )[0].evidenceCount,
    2,
  );
});

test("guard valida cada claim contra a autoridade elegível canônica e falha fechado", () => {
  const authorities = extractRagPriceAuthorities({
    chunkId: "mixed-price-chunk",
    knowledgeItemId: "knowledge-format",
    title: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
    content:
      "A formatação custa a partir de R$ 1.950,00. O reparo de placa-mãe custa a partir de R$ 395,00.",
  });
  const formatting = {
    ...authorities.find((authority) => authority.serviceKey === "formatacao"),
    evidenceCount: 3,
    sourceChunkIds: ["format-a", "format-b", "format-c"],
  };
  const motherboard = authorities.find((authority) => authority.serviceKey === "placa_mae");
  assert.ok(formatting.serviceKey);
  assert.ok(motherboard);

  const cases = [
    {
      question: "Qual o valor para formatar um PC?",
      answer: "A formatação custa a partir de R$ 1.950,00.",
      eligible: [formatting],
      expectedReplacement: null,
      expectedDecisions: [true],
    },
    {
      question: "Qual o valor para formatar um PC?",
      answer: "A formatação custa a partir de 1950 reais.",
      eligible: [formatting],
      expectedReplacement: null,
      expectedDecisions: [true],
    },
    {
      question: "Qual o valor para formatar um PC?",
      answer: "A formatação custa R$ 1.950,00.",
      eligible: [formatting],
      expectedReplacement: "unsupported_claim_replaced",
      expectedDecisions: [false],
    },
    {
      question: "Qual o valor para formatar um PC?",
      answer: "A formatação custa a partir de R$ 395,00.",
      eligible: [formatting],
      expectedReplacement: "unsupported_claim_replaced",
      expectedDecisions: [false],
    },
    {
      question: "Quanto custa o reparo de placa-mãe?",
      answer: "O reparo de placa-mãe custa a partir de R$ 395,00.",
      eligible: [motherboard],
      expectedReplacement: null,
      expectedDecisions: [true],
    },
    {
      question: "Quero formatar e também verificar a placa-mãe.",
      answer:
        "A formatação custa a partir de R$ 1.950,00 e o reparo de placa-mãe custa a partir de R$ 395,00.",
      eligible: [formatting, motherboard],
      expectedReplacement: null,
      expectedDecisions: [true, true],
    },
    {
      question: "Quero formatar e também verificar a placa-mãe.",
      answer:
        "A formatação custa a partir de R$ 1.950,00 e o reparo de placa-mãe custa a partir de R$ 100,00.",
      eligible: [formatting, motherboard],
      expectedReplacement: "unsupported_claim_replaced",
      expectedDecisions: [true, false],
    },
    {
      question: "Qual o valor para formatar um PC?",
      answer: "A formatação custa a partir de R$ 1.950,00.",
      eligible: [],
      expectedReplacement: "unsupported_claim_replaced",
      expectedDecisions: [false],
    },
  ];

  for (const scenario of cases) {
    const result = guard(scenario.question, scenario.answer, scenario.eligible);
    assert.equal(result.replacementReason, scenario.expectedReplacement, scenario.answer);
    assert.deepEqual(
      result.priceAuthorityTelemetry?.claimDecisions.map((decision) => decision.matched),
      scenario.expectedDecisions,
      scenario.answer,
    );
  }

  const duplicateResult = guard(
    "Qual o valor para formatar um PC?",
    "A formatação custa a partir de R$ 1.950,00.",
    [formatting],
  );
  assert.equal(duplicateResult.replacementReason, null);
  assert.equal(duplicateResult.priceAuthorityTelemetry?.eligibleAuthorityCount, 1);
  assert.equal(duplicateResult.priceAuthorityTelemetry?.eligibleAuthorities[0].evidenceCount, 3);
});
