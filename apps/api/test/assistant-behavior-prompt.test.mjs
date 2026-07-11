import assert from "node:assert/strict";
import test from "node:test";
import { PromptCompilerService, isMultiNeedTriageMessage } from "../dist/prompt-compiler/prompt-compiler.service.js";

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
