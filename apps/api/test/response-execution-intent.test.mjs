import assert from "node:assert/strict";
import test from "node:test";
import { resolveResponseExecutionIntent } from "../dist/runtime-v2/index.js";

function resolve(message, recentHistory = []) {
  return resolveResponseExecutionIntent({
    canonicalMessage: message,
    messageId: "message-test",
    contextVersion: 1,
    recentHistory,
  });
}

test("shared response-execution intent accepts deterministic business-hours formulations", () => {
  const positiveCases = [
    "Qual o horário de atendimento?",
    "Qual é o horário de atendimento?",
    "Qual é o horário de atendimento de segunda a sexta?",
    "Que horas vocês atendem de segunda a sexta?",
    "Qual o horário de funcionamento?",
    "Até que horas vocês atendem?",
    "Vocês abrem que horas?",
    "Que horas vocês fecham?",
    "Vocês atendem aos sábados?",
    "Qual o horário de segunda a sexta?",
    "Qual é o expediente de vocês?",
    "Que dia e horário vocês funcionam?",
    "Hoje vocês atendem até que horas?",
  ];
  for (const message of positiveCases) {
    const decision = resolve(message);
    assert.equal(decision.applicable, true, message);
    assert.equal(decision.category, "businessHours", message);
    assert.equal(decision.intent, "ask_business_hours", message);
    assert.equal(decision.authority, "OFFICIAL_CONTEXT", message);
    assert.equal(decision.redactionApplied, true);
    assert.equal(decision.fingerprint.length, 64);
  }
});

test("shared response-execution intent preserves default-deny for operational and unrelated questions", () => {
  const negativeCases = [
    "Vocês fazem entrega?",
    "Que horas chega meu pedido?",
    "Qual o horário da entrega?",
    "Posso agendar para as 14 horas?",
    "Qual o prazo para ficar pronto?",
    "Que horas o técnico chega?",
    "Meu pedido sai hoje?",
    "Vocês entregam sábado?",
    "Quero falar com uma pessoa.",
    "Quanto custa?",
  ];
  for (const message of negativeCases) {
    const decision = resolve(message);
    assert.equal(decision.applicable, false, message);
    assert.equal(decision.category, null, message);
    assert.equal(decision.intent, null, message);
    assert.equal(decision.authority, null, message);
  }
});

test("context-dependent business-hours follow-up requires a bounded business-hours antecedent", () => {
  const withoutContext = resolve("E até que horas?");
  assert.equal(withoutContext.applicable, false);
  assert.equal(withoutContext.deterministicReason, "BUSINESS_HOURS_FOLLOW_UP_CONTEXT_REQUIRED");

  const withContext = resolve("E até que horas vocês atendem?", [
    {
      id: "prior-business-hours",
      role: "user",
      content: "Que horas vocês atendem de segunda a sexta?",
      relevance: "objective",
    },
  ]);
  assert.equal(withContext.applicable, true);
  assert.equal(withContext.category, "businessHours");
  assert.equal(withContext.intent, "ask_business_hours");
});

test("semantic decision is deterministic and does not expose canonical content", () => {
  const first = resolve("Que horas vocês atendem de segunda a sexta?");
  const second = resolve("Que horas vocês atendem de segunda a sexta?");
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(JSON.stringify(first).includes("segunda a sexta"), false);
});
