import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFlowApplicability } from "../dist/assistant-conversations/flow-applicability-evaluator.js";

function flow(overrides = {}) {
  return {
    id: "flow-1",
    name: "Informações da empresa",
    active: true,
    priority: 10,
    triggerKeywords: "[]",
    triggerDescription: null,
    triggerExamples: null,
    finalAction: "respond",
    fixedMessage: null,
    requiresHuman: false,
    autoRespond: true,
    allowedToolSlugs: null,
    handoffTeamId: null,
    handoffTeamName: null,
    toolContext: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("flow evaluator permits no configured flow or configured flows without deterministic match", () => {
  const empty = evaluateFlowApplicability({ message: "Qual é o horário?", flows: [] });
  assert.equal(empty.flowConfigurationStatus, "FLOW_NOT_CONFIGURED");
  assert.equal(empty.v2Compatibility, "ALLOWED");

  const noMatch = evaluateFlowApplicability({
    message: "Qual é o horário?",
    flows: [flow({ triggerKeywords: '["preço"]' })],
  });
  assert.equal(noMatch.flowConfigurationStatus, "ACTIVE_FLOWS_PRESENT");
  assert.equal(noMatch.flowEvaluationStatus, "NO_MATCH");
  assert.equal(noMatch.v2Compatibility, "ALLOWED");
  assert.equal(JSON.stringify(noMatch).includes("Qual é o horário?"), false);
});

test("flow evaluator blocks every deterministic flow match for the first V2 outbound", () => {
  const standard = evaluateFlowApplicability({
    message: "Qual é o horário de atendimento?",
    flows: [flow({ triggerKeywords: '["horário"]' })],
  });
  assert.equal(standard.flowEvaluationStatus, "MATCHED_STANDARD_COMPATIBLE");
  assert.equal(standard.v2Compatibility, "BLOCKED");
  assert.equal(standard.blockerCode, "FLOW_APPLICABLE_STANDARD_COMPATIBLE");
  assert.equal(standard.fixedMessageApplicable, false);

  for (const overrides of [
    { finalAction: "fixed_message", fixedMessage: "fixed" },
    { requiresHuman: true },
    { autoRespond: false },
    { allowedToolSlugs: '["calendar"]' },
    { finalAction: "handoff", handoffTeamId: "team" },
  ]) {
    const blocked = evaluateFlowApplicability({
      message: "Qual é o horário de atendimento?",
      flows: [flow({ triggerKeywords: '["horário"]', ...overrides })],
    });
    assert.equal(blocked.flowEvaluationStatus, "MATCHED_BLOCKS_V2");
    assert.equal(blocked.v2Compatibility, "BLOCKED");
    assert.equal(blocked.blockerCode, "FLOW_APPLICABLE_BLOCKS_V2");
  }
});

test("flow evaluator remains fail-closed when V1 would need semantic routing", () => {
  const result = evaluateFlowApplicability({
    message: "Pergunta sem alias determinístico",
    flows: [flow({ triggerDescription: "descrição semântica" })],
  });
  assert.equal(result.flowEvaluationStatus, "INDETERMINATE");
  assert.equal(result.v2Compatibility, "BLOCKED");
  assert.equal(result.blockerCode, "FLOW_EVALUATION_INDETERMINATE");
  assert.equal(result.redactionApplied, true);
});
