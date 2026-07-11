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
    currentMessage: "Quero trocar o SSD",
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

  // Cenário 1: Mensagem simples de linha única com uma necessidade (deve ser false)
  assert.equal(isMultiNeedTriageMessage("Quero formatar meu pc."), false);
  assert.equal(isMultiNeedTriageMessage("Gostaria de saber o valor para trocar a bateria."), false);

  // Cenário 2: Mensagem multilinha com lista explícita de itens usando bullet points ou números (deve ser true)
  assert.equal(
    isMultiNeedTriageMessage("- Formatar pc\n- Instalar SSD"),
    true
  );
  assert.equal(
    isMultiNeedTriageMessage("1. Troca de tela\n2. Conserto de conector"),
    true
  );

  // Cenário 3: Mensagem multilinha representando multiplas ideias/necessidades (mensagens concatenadas do Chatwoot) (deve ser true)
  assert.equal(
    isMultiNeedTriageMessage("Oi bom dia\nQueria formatar meu computador\nPor mais memoria\nssd\nO que podemos fazer"),
    true
  );

  // Cenário 4: Mensagem de linha única solicitando múltiplos serviços explicitamente (deve ser true)
  assert.equal(
    isMultiNeedTriageMessage("Quero formatar meu pc, colocar um ssd e mais memoria"),
    true
  );
  assert.equal(
    isMultiNeedTriageMessage("Gostaria de ver o preço de tela, bateria e conector do iPhone 12"),
    true
  );

  // Cenário 5: Saudação simples / mensagens conversacionais curtas multilinha sem necessidades (deve ser false)
  assert.equal(
    isMultiNeedTriageMessage("Olá, bom dia!\nTudo bem?"),
    false
  );
  assert.equal(
    isMultiNeedTriageMessage("Oi\nTudo bem?\nGostaria de tirar uma dúvida."),
    false
  );
});
