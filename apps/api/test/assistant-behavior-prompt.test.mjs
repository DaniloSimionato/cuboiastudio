import assert from "node:assert/strict";
import test from "node:test";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";

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
    historyMessages: [],
    currentMessage: "Quero trocar o SSD",
  });

  const contents = messages.map((message) => String(message.content));
  const securityIndex = contents.findIndex((content) => content.includes("REGRAS DE SEGURANÇA"));
  const behaviorIndex = contents.findIndex((content) => content.includes("COMPORTAMENTO CONVERSACIONAL"));
  const flowIndex = contents.findIndex((content) => content.includes("INSTRUÇÕES DO FLUXO"));
  const knowledgeIndex = contents.findIndex((content) => content.includes("BASE DE CONHECIMENTO"));

  assert.ok(securityIndex >= 0);
  assert.ok(behaviorIndex > securityIndex);
  assert.ok(flowIndex > behaviorIndex);
  assert.ok(knowledgeIndex > flowIndex);
  assert.match(contents[behaviorIndex], /uma pergunta principal por vez/);
  assert.match(contents[behaviorIndex], /Nunca diga que é humana/);
  assert.match(contents[behaviorIndex], /Não invente informações/);
  assert.match(contents[knowledgeIndex], /não como modelo de estilo/);
  assert.match(contents[behaviorIndex], /Blocos Naturais/);
});
