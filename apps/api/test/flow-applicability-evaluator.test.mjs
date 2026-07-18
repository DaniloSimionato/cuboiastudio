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
    flowInstructions: null,
    knowledgeScope: null,
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

test("flow evaluator exposes only a safe declarative context for a compatible deterministic match", () => {
  const standard = evaluateFlowApplicability({
    message: "Qual é o horário de atendimento?",
    flows: [
      flow({
        triggerKeywords: '["horário"]',
        flowInstructions: "Responda de forma objetiva e cordial.",
      }),
    ],
  });
  assert.equal(standard.flowEvaluationStatus, "MATCHED_STANDARD_COMPATIBLE");
  assert.equal(standard.v2Compatibility, "ALLOWED_WITH_FLOW_CONTEXT");
  assert.equal(standard.blockerCode, null);
  assert.equal(standard.fixedMessageApplicable, false);
  assert.equal(standard.compatibleFlowContext.compatibilityStatus, "STANDARD_COMPATIBLE");
  assert.equal(
    standard.compatibleFlowContext.declarativeInstructions,
    "Responda de forma objetiva e cordial.",
  );
  assert.equal(JSON.stringify(standard).includes("Qual é o horário?"), false);

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

test("flow evaluator blocks non-declarative, factual, ambiguous, and knowledge-backed matches", () => {
  for (const overrides of [
    { flowInstructions: "Informe que abrimos às 08:30." },
    { flowInstructions: "Use a ferramenta de agenda antes de responder." },
    { knowledgeScope: '["knowledge-1"]' },
  ]) {
    const blocked = evaluateFlowApplicability({
      message: "Qual é o horário de atendimento?",
      flows: [flow({ triggerKeywords: '["horário"]', ...overrides })],
    });
    assert.equal(blocked.v2Compatibility, "BLOCKED");
    assert.equal(blocked.blockerCode, "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED");
    assert.equal(blocked.compatibleFlowContext, null);
  }

  const incompatibleCategory = evaluateFlowApplicability({
    message: "Preciso de conserto.",
    flows: [flow({ name: "Fluxo técnico", triggerKeywords: '["conserto"]' })],
  });
  assert.equal(incompatibleCategory.v2Compatibility, "BLOCKED");
  assert.equal(incompatibleCategory.blockerCode, "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED");

  const ambiguous = evaluateFlowApplicability({
    message: "Qual é o horário de atendimento?",
    flows: [
      flow({ id: "flow-a", triggerKeywords: '["horário"]', priority: 10 }),
      flow({ id: "flow-b", triggerKeywords: '["horário"]', priority: 10 }),
    ],
  });
  assert.equal(ambiguous.flowEvaluationStatus, "INDETERMINATE");
  assert.equal(ambiguous.blockerCode, "FLOW_MATCH_AMBIGUOUS");
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
