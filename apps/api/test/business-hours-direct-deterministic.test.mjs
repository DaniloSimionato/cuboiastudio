import assert from "node:assert/strict";
import test from "node:test";
import {
  detectDirectBusinessHours,
  hasExplicitHumanRequest,
  isDirectBusinessHoursBindingAllowed,
} from "../dist/assistant-conversations/business-hours-direct-deterministic.js";

const positives = [
  "Qual o horário de atendimento?",
  "Que horas vocês funcionam?",
  "Qual o expediente?",
  "Qual o horário na segunda?",
  "Que horas vocês fecham na terça?",
  "Abrem sábado?",
  "Domingo vocês funcionam?",
  "Que horas fecham hoje?",
  "Vocês estão abertos agora?",
  "Ainda estão atendendo?",
  "Fecham para almoço?",
  "Na quarta fecham para almoço?",
  "Funcionam no fim de semana?",
  "qual horario vcs abrem",
];

test("detecta perguntas diretas de horários sem provider", () => {
  for (const message of positives) assert.ok(detectDirectBusinessHours(message), message);
  assert.equal(detectDirectBusinessHours("Na quarta fecham para almoço?"), "LUNCH_BREAK");
  assert.equal(detectDirectBusinessHours("Vocês estão abertos agora?"), "OPEN_NOW");
});

test("não captura intenções negativas", () => {
  for (const message of [
    "Qual o prazo de entrega?",
    "Quanto tempo demora?",
    "Qual o horário do meu pedido?",
    "Que horas meu técnico chega?",
    "Qual o valor?",
    "Qual o endereço?",
    "Qual o telefone?",
    "Quero comprar.",
    "Preciso de suporte.",
    "Meu sistema está fechado.",
    "O caixa fechou sozinho.",
    "Como abrir uma empresa?",
  ])
    assert.equal(detectDirectBusinessHours(message), null, message);
});

test("binding é default-deny e humano tem prioridade", () => {
  const env = {
    BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED: "true",
    BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS: "assistant:106:533",
  };
  assert.equal(
    isDirectBusinessHoursBindingAllowed({
      assistantId: "assistant",
      accountId: "106",
      inboxId: "533",
      env,
    }),
    true,
  );
  assert.equal(
    isDirectBusinessHoursBindingAllowed({
      assistantId: "assistant",
      accountId: "106",
      inboxId: "534",
      env,
    }),
    false,
  );
  assert.equal(
    isDirectBusinessHoursBindingAllowed({
      assistantId: "other",
      accountId: "106",
      inboxId: "533",
      env,
    }),
    false,
  );
  assert.equal(hasExplicitHumanRequest("Quero falar com humano, vocês estão abertos?"), true);
});
