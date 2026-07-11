import assert from "node:assert/strict";
import test from "node:test";
import { PromptCompilerService, isMultiNeedTriageMessage, isTriageResponseValid } from "../dist/prompt-compiler/prompt-compiler.service.js";

test("PromptCompiler prioriza segurança, comportamento e depois fluxo/conhecimento", () => {
  const compiler = new PromptCompilerService();
  const messages = compiler.compile({
    assistant: {
      name: "Atendente",
      description: "Atende pelo WhatsApp",
      personality: "Objetiva",
      toneOfVoice: "Amigável",
      instructions: "Use os dados oficiais.",
      splitResponseStyle: "NATURAL_BLOCKS",
      fallbackMessage: "Ainda não encontrei essa informação.",
    },
    behavior: {
      attendantName: "Gio",
      showAttendantName: true,
      role: "Atendente virtual",
      howItActs: "Conduz o próximo passo",
      personality: "Direta",
      toneOfVoice: "Natural",
      responseStyle: "whatsapp",
      emojiUsage: "low",
      greetingMessage: null,
      noInventInfo: true,
      unknownBehavior: "fallback",
      maxBlockLength: 300,
    },
    securityRules: [{ name: "Não inventar", ruleType: "safety", instruction: "Não invente fatos." }],
    flow: { name: "Agendamento", flowInstructions: "Pergunte a data." },
    knowledgeItems: [{ title: "Tabela formal", content: "Serviço: instalação de SSD." }],
    historyMessages: [{ role: "assistant", content: "• Serviço antigo em formato de catálogo." }],
    currentMessage: "Quero trocar o SSD, formatar o notebook e comprar memoria",
  });

  const contents = messages.map((message) => String(message.content));
  const securityIndex = contents.findIndex((content) => content.includes("REGRAS DE SEGURANÇA"));
  const behaviorIndex = contents.findIndex((content) => content.startsWith("POLÍTICA DE CONVERSA"));
  const flowIndex = contents.findIndex((content) => content.includes("INSTRUÇÕES DO FLUXO"));
  const knowledgeIndex = contents.findIndex((content) => content.includes("BASE DE CONHECIMENTO"));
  const triageIndex = contents.findIndex((content) =>
    content.includes("DECISÃO DE TRIAGEM OBRIGATÓRIA"),
  );

  assert.ok(securityIndex >= 0);
  assert.ok(behaviorIndex > securityIndex);
  assert.ok(flowIndex > behaviorIndex);
  assert.ok(knowledgeIndex > flowIndex);
  assert.match(contents[behaviorIndex], /uma pergunta principal por vez/);
  assert.match(contents[behaviorIndex], /responda progressivamente/i);
  assert.match(contents[behaviorIndex], /não monte um catálogo/i);
  assert.match(contents[behaviorIndex], /Não use 'Vamos por partes'/);
  assert.match(contents[behaviorIndex], /Nunca diga que é humana/);
  assert.match(contents[behaviorIndex], /Não invente informações/);
  assert.match(contents[knowledgeIndex], /não como modelo de estilo/);
  assert.match(contents[behaviorIndex], /Blocos Naturais/);
  const historyPolicyIndex = contents.findIndex((content) => content.includes("HISTÓRICO DA CONVERSA"));
  assert.ok(triageIndex > knowledgeIndex);
  assert.match(contents[triageIndex], /não responda cada serviço/i);
  assert.match(contents[triageIndex], /uma pergunta principal/i);
  assert.ok(historyPolicyIndex > knowledgeIndex);
  assert.match(contents[historyPolicyIndex], /Não imite listas/);
});

test("isMultiNeedTriageMessage valida corretamente os cinco cenários de triagem", () => {
  // Cenário A — pergunta simples em mensagens agrupadas
  assert.equal(
    isMultiNeedTriageMessage("Oi\nBom dia\nQual o horário de vocês?"),
    false
  );

  // Cenário B — pergunta direta de preço
  assert.equal(
    isMultiNeedTriageMessage("Quanto custa a formatação?"),
    false
  );

  // Cenário C — cliente pede explicitamente uma lista
  assert.equal(
    isMultiNeedTriageMessage("Me envie uma lista dos serviços de manutenção disponíveis."),
    false
  );

  // Cenário D — uma única frase normal
  assert.equal(
    isMultiNeedTriageMessage("Quero saber como funciona o atendimento de vocês."),
    false
  );

  // Cenário E — múltiplas necessidades em uma única mensagem
  assert.equal(
    isMultiNeedTriageMessage("Quero formatar meu computador, colocar um SSD e aumentar a memória."),
    true
  );

  // Testes adicionais para listas explícitas e mensagens concatenadas multilinha
  assert.equal(
    isMultiNeedTriageMessage("- Formatar pc\n- Instalar SSD"),
    true
  );
  assert.equal(
    isMultiNeedTriageMessage("Oi bom dia\nQueria formatar meu computador\nPor mais memoria\nssd\nO que podemos fazer"),
    true
  );
});

test("isTriageResponseValid valida as regras de formatação estrutural", () => {
  const wrap = (msg, action = "ASK_NEXT_DETAIL", detail = "modelo", suggest = false, resolved = false) =>
    JSON.stringify({ message: msg, action, requestedDetail: detail, suggestScheduling: suggest, triageResolved: resolved });

  // Resposta válida comum
  assert.equal(isTriageResponseValid(wrap("Fazemos sim 😊 Qual é o modelo do computador? Com isso já verifico o que é compatível.")), true);

  // Resposta válida com pontuação natural (um único dois-pontos)
  assert.equal(isTriageResponseValid(wrap("Olá, podemos fazer sim: qual o modelo do seu equipamento?")), true);

  // Inválido: mais de uma pergunta
  assert.equal(isTriageResponseValid(wrap("Olá! Qual o modelo do pc? E qual SSD você quer?")), false);

  // Inválido: lista numerada
  assert.equal(isTriageResponseValid(wrap("Vou te ajudar: \n1. Formatar\n2. Trocar SSD")), false);

  // Inválido: marcadores / bullets
  assert.equal(isTriageResponseValid(wrap("Temos as seguintes opções: \n- Formatação\n- SSD")), false);

  // Inválido: checklist markdown
  assert.equal(isTriageResponseValid(wrap("[ ] SSD\n[ ] Memória")), false);

  // Inválido: cabeçalhos/títulos
  assert.equal(isTriageResponseValid(wrap("### Triagem\nQual o modelo do seu pc?")), false);

  // Inválido: negritos terminados com dois-pontos como título-chave
  assert.equal(isTriageResponseValid(wrap("**SSD**: 240GB ou 480GB?")), false);

  // Inválido: "vamos por partes"
  assert.equal(isTriageResponseValid(wrap("Vamos por partes. Qual o seu nome?")), false);

  // Inválido: preço / moedas / valores
  assert.equal(isTriageResponseValid(wrap("A formatação custa R$ 150. Qual o modelo do notebook?")), false);
  assert.equal(isTriageResponseValid(wrap("O valor fica 300 reais. Qual a marca do pc?")), false);

  // Inválido: 3 ou mais blocos (parágrafos)
  assert.equal(isTriageResponseValid(wrap("Oi bom dia.\n\nPodemos fazer sim.\n\nQual o modelo?")), false);

  // Inválido: múltiplos dois-pontos (indica explicações de serviços separadas)
  assert.equal(isTriageResponseValid(wrap("Opção A: formatar. Opção B: trocar SSD. Qual prefere?")), false);
});

test("PromptCompilerService em modo TRIAGE_ONLY compila apenas o prompt mínimo", () => {
  const compiler = new PromptCompilerService();
  const input = {
    assistant: {
      name: "Atendente FG",
      safetyInstruction: "Instrução de segurança FG",
    },
    behavior: {
      attendantName: "Gio",
      showAttendantName: true,
    },
    securityRules: [{ name: "Não inventar", ruleType: "safety", instruction: "Não invente fatos." }],
    flow: { name: "Agendamento", flowInstructions: "Pergunte a data." },
    knowledgeItems: [{ title: "Tabela formal", content: "Serviço: instalação de SSD." }],
    historyMessages: [{ role: "assistant", content: "• Histórico antigo" }],
    currentMessage: "Quero trocar o SSD, formatar e comprar memoria",
    officialBusinessContext: { companyName: "FG Informática" },
    triageMode: true,
  };

  const messages = compiler.compile(input);
  const contents = messages.map((m) => String(m.content));

  // Verificar que regras de segurança e identidade básica estão no prompt
  assert.ok(contents.some((c) => c.includes("Instrução de segurança FG")));
  assert.ok(contents.some((c) => c.includes("FG Informática")));
  assert.ok(contents.some((c) => c.includes("Gio")));

  // Verificar que o objetivo e contrato de triagem estão no prompt
  assert.ok(contents.some((c) => c.includes("OBJETIVO DA TRIAGEM:")));
  assert.ok(contents.some((c) => c.includes("CONTRATO DA RESPOSTA OBRIGATÓRIO:")));

  // Verificar que RAG, fluxos, howItActs, histórico NÃO estão no prompt
  assert.ok(!contents.some((c) => c.includes("Serviço: instalação de SSD")));
  assert.ok(!contents.some((c) => c.includes("Agendamento")));
  assert.ok(!contents.some((c) => c.includes("Pergunte a data")));
  assert.ok(!contents.some((c) => c.includes("Histórico antigo")));

  // Testar segunda tentativa (sem RAG e prompt crítico)
  const messages2 = compiler.compile({ ...input, isSecondAttempt: true });
  const contents2 = messages2.map((m) => String(m.content));
  assert.ok(contents2.some((c) => c.includes("SEGUNDA TENTATIVA OBRIGATÓRIA")));
  assert.ok(!contents2.some((c) => c.includes("OBJETIVO DA TRIAGEM:")));
});
