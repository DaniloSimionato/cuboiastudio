import assert from "node:assert/strict";
import test from "node:test";
import { IntentRouterService } from "../dist/intent-router/intent-router.service.js";
import { AttachmentInterpreterService } from "../dist/attachments/attachment-interpreter.service.js";
import {
  extractCustomerStructuredFields,
  normalizeIntentText,
} from "../dist/intent-router/intent-routing.js";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";

const now = new Date("2026-07-13T12:00:00.000Z");

function flow(id, name, priority, keywords = []) {
  return {
    id,
    assistantId: "assistant-test",
    name,
    priority,
    active: true,
    triggerKeywords: JSON.stringify(keywords),
    triggerDescription: `${name} para teste`,
    flowInstructions: "INSTRUÇÃO QUE NÃO DEVE ENTRAR NA TRIAGEM",
    allowedToolSlugs: JSON.stringify(["calendar_checkAvailability"]),
    createdAt: now,
    updatedAt: now,
  };
}

function router() {
  return new IntentRouterService({
    generateChatCompletion: async () => ({ answer: "fallback" }),
  });
}

test("metadata estrutural não contamina saudação nem intenção", async () => {
  const result = await router().route({
    companyId: "company-test",
    assistantId: "assistant-test",
    message: "oi",
    flows: [flow("company", "Informações da Empresa", 50, ["telefone"])],
  });
  assert.equal(result.flowId, null);
  assert.equal(result.flowSelectionMethod, "llm_semantic");
});

test("seleciona preço, formatação e coleta por evidência normalizada", async () => {
  const flows = [
    flow("price", "Orçamento e Preços", 90, ["quanto custa"]),
    flow("technical", "Assistência Técnica Geral", 60, ["formatacao"]),
    flow("pickup", "Coleta e Entrega", 80, ["vocês buscam"]),
    flow("company", "Informações da Empresa", 50, ["endereco"]),
  ];
  assert.equal((await router().route({ companyId: "c", assistantId: "a", message: "quanto custa formatar um Mac", flows })).flowId, "price");
  assert.equal((await router().route({ companyId: "c", assistantId: "a", message: "quero formatação", flows })).flowId, "technical");
  assert.equal((await router().route({ companyId: "c", assistantId: "a", message: "vocês conseguem vir buscar?", flows })).flowId, "pickup");
  assert.equal((await router().route({ companyId: "c", assistantId: "a", message: "qual o endereço?", flows })).flowId, "company");
});

test("múltiplas necessidades escolhem o flow técnico e registram candidato comercial", async () => {
  const result = await router().route({
    companyId: "c",
    assistantId: "a",
    message: "Quero upgrade no Acer com SSD, RAM, mouse, teclado e fone",
    flows: [
      flow("sales", "Vendas e Comercial", 95, ["mouse", "teclado", "fone"]),
      flow("technical", "Assistência Técnica Geral", 10, ["upgrade", "ssd", "ram"]),
    ],
  });
  assert.equal(result.flowId, "technical");
  assert.ok(result.candidates?.find((candidate) => candidate.flowId === "sales"));
  assert.deepEqual(result.secondaryIntentKeys, ["commercial"]);
  assert.ok((result.score ?? 0) > 6);
});

test("texto de áudio usa transcrição, sem rótulos de anexo ou contato", () => {
  const service = new AttachmentInterpreterService(null);
  const text = service.buildCustomerIntentText({
    rawText: null,
    attachments: [{ transcript: "Quero SSD de 500 GB e 16 GB de RAM" }],
  });
  assert.equal(text, "Quero SSD de 500 GB e 16 GB de RAM");
  assert.equal(text.includes("Telefone"), false);
});

test("extração preserva capacidades, acessórios e pendências técnicas", () => {
  const result = extractCustomerStructuredFields(
    "Quero upgrade no Acer Nitro 5 com SSD de 500 GB, 16 GB de RAM, mouse, teclado e fone",
  );
  assert.ok(result.knownFieldKeys.includes("device_model"));
  assert.ok(result.knownFieldKeys.includes("ssd_capacity_gb"));
  assert.ok(result.knownFieldKeys.includes("ram_capacity_gb"));
  assert.ok(result.knownFieldKeys.includes("requested_accessory_mouse"));
  assert.ok(result.knownFieldKeys.includes("requested_accessory_keyboard"));
  assert.ok(result.knownFieldKeys.includes("requested_accessory_headset"));
  assert.ok(result.pendingFieldKeys.includes("ssd_interface"));
  assert.equal(result.knownFieldKeys.includes("ssd_model"), false);
  assert.deepEqual(result.secondaryIntentKeys, ["accessories"]);
  assert.equal(normalizeIntentText("formatação e memória"), "formatacao e memoria");
});

test("triagem recebe apenas resumo seguro do flow", () => {
  const messages = new PromptCompilerService().compile({
    assistant: { name: "Assistente" },
    behavior: {},
    flow: { name: "Assistência Técnica Geral", flowInstructions: "segredo mutável" },
    securityRules: [],
    knowledgeItems: [],
    historyMessages: [],
    currentMessage: "SSD de 500 GB e 16 GB de RAM",
    triageMode: true,
    triageFlowContext: {
      flowId: "technical",
      flowName: "Assistência Técnica Geral",
      objective: "triagem técnica e compatibilidade",
      requiredFieldKeys: ["device_model"],
      knownFieldKeys: ["ssd_capacity_gb", "ram_capacity_gb"],
      pendingFieldKeys: ["ssd_interface"],
      nextQuestionKey: "ssd_interface",
      relevantRuleKeys: ["do_not_repeat_known_fields"],
      allowedToolSlugs: ["calendar_checkAvailability"],
    },
  });
  const text = messages.map((message) => String(message.content)).join("\n");
  assert.match(text, /flowId: technical/);
  assert.match(text, /ssd_capacity_gb/);
  assert.match(text, /ferramentas configuradas.*calendar_checkAvailability/);
  assert.equal(text.includes("segredo mutável"), false);
  assert.equal(text.includes("BASE DE CONHECIMENTO"), false);
});
