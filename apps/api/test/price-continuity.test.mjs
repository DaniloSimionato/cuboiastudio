import assert from "node:assert/strict";
import test from "node:test";
import {
  createPriceContinuityState,
  parsePriceContinuityState,
  resolvePriceIntent,
} from "../dist/assistant-conversations/price-continuity.js";

const firstTurnExecutionId = `turn_v1_${"a".repeat(32)}`;
const secondTurnExecutionId = `turn_v1_${"b".repeat(32)}`;

function formattingState() {
  return createPriceContinuityState({
    serviceKey: "formatacao",
    turnExecutionId: firstTurnExecutionId,
    contextVersion: 1,
    controlRevision: 0,
    recordedAt: "2026-07-27T12:00:00.000Z",
    source: "EXPLICIT",
    previousState: null,
  });
}

test("continuidade de preço substitui o serviço ativo no follow-up elíptico", () => {
  const previousState = formattingState();
  const resolution = resolvePriceIntent({
    message: "E para consertar minha placa-mãe?",
    explicitPriceIntent: false,
    inheritanceAllowed: true,
    previousState,
    contextVersion: 1,
    controlRevision: 0,
  });

  assert.equal(resolution.effectivePriceIntent, true);
  assert.equal(resolution.currentService, "placa_mae");
  assert.equal(resolution.source, "INHERITED");

  const nextState = createPriceContinuityState({
    serviceKey: resolution.currentService,
    turnExecutionId: secondTurnExecutionId,
    contextVersion: 1,
    controlRevision: 0,
    recordedAt: "2026-07-27T12:01:00.000Z",
    source: resolution.source,
    previousState,
  });
  assert.deepEqual(parsePriceContinuityState(nextState), nextState);
  assert.equal(nextState.activeIntent, "price");
  assert.equal(nextState.activeService, "placa_mae");
  assert.equal(nextState.inheritedFromTurnExecutionId, firstTurnExecutionId);
});

test("continuidade não atravessa contexto, revisão ou mudança explícita de assunto", () => {
  const previousState = formattingState();
  const cases = [
    {
      message: "E para placa-mãe?",
      contextVersion: 2,
      controlRevision: 1,
    },
    {
      message: "E para placa-mãe?",
      contextVersion: 1,
      controlRevision: 1,
    },
    {
      message: "Qual o horário para atendimento de placa-mãe?",
      contextVersion: 1,
      controlRevision: 0,
    },
  ];

  for (const candidate of cases) {
    const resolution = resolvePriceIntent({
      ...candidate,
      explicitPriceIntent: false,
      inheritanceAllowed: true,
      previousState,
    });
    assert.equal(resolution.effectivePriceIntent, false);
    assert.equal(resolution.source, "NONE");
  }
});

test("intenção explícita concorrente no turno atual impede herança de preço", () => {
  const resolution = resolvePriceIntent({
    message: "E para placa-mãe, e a garantia?",
    explicitPriceIntent: false,
    inheritanceAllowed: false,
    previousState: formattingState(),
    contextVersion: 1,
    controlRevision: 0,
  });

  assert.equal(resolution.effectivePriceIntent, false);
  assert.equal(resolution.currentService, "placa_mae");
  assert.equal(resolution.source, "NONE");
});
