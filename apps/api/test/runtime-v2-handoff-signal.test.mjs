import assert from "node:assert/strict";
import test from "node:test";
import { deriveHumanHandoffSignal, understandTurn } from "../dist/runtime-v2/index.js";

test("pedido explícito de humano gera sinal operacional canônico", () => {
  for (const message of [
    "Quero falar com um atendente humano, por favor.",
    "PRECISO DE ATENDIMENTO HUMANO!",
    "Transfira para uma pessoa, por favor",
    "Quero falar com alguém.",
  ]) {
    const signal = deriveHumanHandoffSignal(message);
    assert.deepEqual(signal, {
      requested: true,
      source: "EXPLICIT_CUSTOMER_REQUEST",
      confidence: 0.99,
      reasonCode: "CUSTOMER_REQUESTED_HUMAN",
      requestedTargetType: "ANY_HUMAN",
      customerRequested: true,
      derivedAtStage: "TURN_UNDERSTANDING",
      redactionApplied: true,
    });
  }
});

test("general_request preserva o sinal operacional sem trocar a intenção primária", () => {
  const understanding = understandTurn({
    message: "Quero falar com um atendente humano, por favor.",
    messageId: "message-handoff-signal",
    contextVersion: 1,
  });

  assert.equal(understanding.turnIntent, "general_request");
  assert.equal(understanding.humanHandoffSignal.requested, true);
  assert.equal(understanding.humanHandoffSignal.source, "EXPLICIT_CUSTOMER_REQUEST");
  assert.equal(understanding.reasonCodes.includes("EXPLICIT_HUMAN_HANDOFF_REQUEST"), true);
});

test("confirmações genéricas e menções não operacionais não geram handoff", () => {
  for (const message of [
    "sim",
    "O atendente humano explicou o procedimento ontem.",
    "Qual é o horário do atendimento humano?",
    "Preciso aguardar o atendimento.",
  ]) {
    const signal = deriveHumanHandoffSignal(message);
    assert.equal(signal.requested, false, message);
    assert.equal(signal.source, null);
    assert.equal(signal.reasonCode, null);
  }
});
