import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFlowApplicability } from "../dist/assistant-conversations/flow-applicability-evaluator.js";
import { resolveResponseExecutionIntent } from "../dist/runtime-v2/index.js";

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
    runtimeScope: null,
    runtimeCategory: null,
    runtimeIntent: null,
    runtimeAuthority: null,
    runtimeDirectOnly: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function directBusinessHoursDecision(overrides = {}) {
  return {
    version: "runtime-v2-response-execution-intent-v1",
    category: "businessHours",
    intent: "ask_business_hours",
    authority: "OFFICIAL_CONTEXT",
    applicable: true,
    contextualResolution: false,
    ...overrides,
  };
}

function explicitBusinessHoursFlow(overrides = {}) {
  return flow({
    id: "flow-v2-hours",
    name: "Horário oficial",
    runtimeScope: "V2_CONTROLLED",
    runtimeCategory: "businessHours",
    runtimeIntent: "ask_business_hours",
    runtimeAuthority: "OFFICIAL_CONTEXT",
    runtimeDirectOnly: true,
    flowInstructions:
      "Responda somente perguntas diretas sobre o horário usando contexto oficial estruturado.",
    ...overrides,
  });
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

test("legacy flows remain V1_ONLY even when their deterministic aliases match", () => {
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
  assert.equal(standard.v2Compatibility, "BLOCKED");
  assert.equal(standard.blockerCode, "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED");
  assert.equal(standard.flowRuntimeScope, "V1_ONLY");
  assert.equal(standard.flowScopeCompatibility, "LEGACY_V1_ONLY");
  assert.equal(standard.fixedMessageApplicable, false);
  assert.equal(standard.compatibleFlowContext, null);
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

test("an explicit V2 business-hours flow is narrow and ignores legacy company aliases", () => {
  const legacyCompany = flow({
    id: "flow-v1-company",
    name: "Informações da empresa",
    triggerKeywords: '["endereço"]',
    triggerDescription: "Informações institucionais da empresa",
    knowledgeScope: '["knowledge-1"]',
    toolContext: { legacy: true },
  });
  const result = evaluateFlowApplicability({
    message: "Qual o horário de atendimento?",
    flows: [legacyCompany, explicitBusinessHoursFlow()],
    semanticDecision: directBusinessHoursDecision(),
  });
  assert.equal(result.v2Compatibility, "ALLOWED_WITH_FLOW_CONTEXT");
  assert.equal(result.flowMatchType, "EXPLICIT_RUNTIME_SCOPE");
  assert.equal(result.flowRuntimeScope, "V2_CONTROLLED");
  assert.equal(result.explicitRuntimeCategory, "businessHours");
  assert.equal(result.explicitRuntimeIntent, "ask_business_hours");
  assert.equal(result.explicitRuntimeAuthority, "OFFICIAL_CONTEXT");
  assert.equal(result.runtimeDirectOnly, true);
  assert.equal(result.flowScopeCompatibility, "EXPLICIT_V2_MATCH");
  assert.equal(result.legacyFlowIgnoredForExplicitV2Match, true);
  assert.equal(result.compatibleFlowContext.matchType, "EXPLICIT_RUNTIME_SCOPE");
  assert.equal(JSON.stringify(result).includes("Informações institucionais"), false);
});

test("an explicit V2 flow accepts only direct business-hours semantic decisions", () => {
  const explicit = explicitBusinessHoursFlow();
  for (const message of [
    "Qual o horário de atendimento?",
    "Que horas vocês abrem?",
    "Que horas vocês fecham?",
    "Vocês atendem aos sábados?",
    "Qual o horário de segunda a sexta?",
  ]) {
    const semanticDecision = resolveResponseExecutionIntent({
      canonicalMessage: message,
      messageId: `message-${message.length}`,
    });
    const result = evaluateFlowApplicability({ message, flows: [explicit], semanticDecision });
    assert.equal(result.flowScopeCompatibility, "EXPLICIT_V2_MATCH", message);
    assert.equal(result.v2Compatibility, "ALLOWED_WITH_FLOW_CONTEXT", message);
  }
});

test("an explicit V2 business-hours flow never inherits company-information aliases", () => {
  const explicit = explicitBusinessHoursFlow();
  for (const message of [
    "Qual é o endereço?",
    "Qual é o telefone?",
    "Qual é o WhatsApp?",
    "Qual é o site?",
    "Vocês fazem entrega?",
    "Quero um orçamento.",
    "Vocês fazem visita técnica?",
    "Preciso de suporte.",
    "Qual o prazo do serviço?",
  ]) {
    const result = evaluateFlowApplicability({
      message,
      flows: [explicit],
      semanticDecision: directBusinessHoursDecision({
        category: null,
        intent: null,
        authority: null,
        applicable: false,
      }),
    });
    assert.equal(result.selectedFlowFingerprint, null, message);
    assert.notEqual(result.flowScopeCompatibility, "EXPLICIT_V2_MATCH", message);
  }

  const followUp = evaluateFlowApplicability({
    message: "E até que horas?",
    flows: [explicit],
    semanticDecision: directBusinessHoursDecision({ contextualResolution: true }),
  });
  assert.equal(followUp.selectedFlowFingerprint, null);
  assert.notEqual(followUp.flowScopeCompatibility, "EXPLICIT_V2_MATCH");
});

test("an invalid persisted explicit V2 flow remains fail-closed", () => {
  const result = evaluateFlowApplicability({
    message: "Qual o horário de atendimento?",
    flows: [explicitBusinessHoursFlow({ knowledgeScope: '["knowledge-1"]' })],
    semanticDecision: directBusinessHoursDecision(),
  });
  assert.equal(result.v2Compatibility, "BLOCKED");
  assert.equal(result.blockerCode, "FLOW_EXPLICIT_SCOPE_INVALID");
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
