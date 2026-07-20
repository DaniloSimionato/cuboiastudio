import assert from "node:assert/strict";
import test from "node:test";
import { AssistantFlowsService } from "../dist/assistant-flows/assistant-flows.service.js";
import {
  isExplicitBusinessHoursRuntimeV2Flow,
  resolveRuntimeV2FlowScope,
  validateRuntimeV2FlowScope,
} from "../dist/assistant-flows/runtime-v2-flow-scope.js";

function validExplicitFlow(overrides = {}) {
  return {
    name: "Horário oficial",
    runtimeScope: "V2_CONTROLLED",
    runtimeCategory: "businessHours",
    runtimeIntent: "ask_business_hours",
    runtimeAuthority: "OFFICIAL_CONTEXT",
    runtimeDirectOnly: true,
    flowInstructions:
      "Responda somente perguntas diretas sobre o horário usando contexto oficial estruturado.",
    knowledgeScope: null,
    toolContext: null,
    allowedToolSlugs: null,
    finalAction: "respond",
    fixedMessage: null,
    handoffTeamId: null,
    handoffTeamName: null,
    requiresHuman: false,
    autoRespond: true,
    ...overrides,
  };
}

function serviceFor(flow = null) {
  return new AssistantFlowsService({
    assistant: {
      findFirst: async () => ({ id: "assistant-1", companyId: "company-1" }),
    },
    assistantFlow: {
      findFirst: async () => flow,
      create: async ({ data }) => ({ id: "flow-created", ...data }),
      update: async ({ data }) => ({ id: flow?.id ?? "flow-1", ...flow, ...data }),
    },
  });
}

test("flows without an explicit Runtime V2 contract remain V1_ONLY", () => {
  assert.equal(resolveRuntimeV2FlowScope({}), "V1_ONLY");
  assert.deepEqual(validateRuntimeV2FlowScope({}), { valid: true, scope: "V1_ONLY" });
  assert.equal(isExplicitBusinessHoursRuntimeV2Flow({}), false);
});

test("only the direct official business-hours contract is accepted for V2_CONTROLLED", () => {
  const valid = validExplicitFlow();
  assert.deepEqual(validateRuntimeV2FlowScope(valid), { valid: true, scope: "V2_CONTROLLED" });
  assert.equal(isExplicitBusinessHoursRuntimeV2Flow(valid), true);

  for (const overrides of [
    { runtimeCategory: null },
    { runtimeIntent: null },
    { runtimeAuthority: null },
    { runtimeDirectOnly: false },
    { runtimeCategory: "companyInformation" },
    { runtimeAuthority: "KNOWLEDGE" },
  ]) {
    const result = validateRuntimeV2FlowScope(validExplicitFlow(overrides));
    assert.equal(result.valid, false);
    assert.equal(result.code, "RUNTIME_V2_FLOW_CONTRACT_UNSUPPORTED");
  }
});

test("the Runtime V2 flow contract rejects non-standard configuration", () => {
  for (const overrides of [
    { knowledgeScope: '["knowledge-1"]' },
    { toolContext: { calendar: {} } },
    { allowedToolSlugs: '["tool-1"]' },
    { finalAction: "fixed_message", fixedMessage: "Mensagem" },
    { handoffTeamId: "team-1" },
    { requiresHuman: true },
    { autoRespond: false },
    { flowInstructions: "Atendemos das 08:00 às 18:00." },
  ]) {
    const result = validateRuntimeV2FlowScope(validExplicitFlow(overrides));
    assert.deepEqual(result, {
      valid: false,
      code: "RUNTIME_V2_FLOW_CONTRACT_NON_STANDARD",
    });
  }
});

test("the CRUD rejects incomplete and unsafe V2 contracts without persisting them", async () => {
  const service = serviceFor();
  for (const dto of [
    validExplicitFlow({ runtimeCategory: null }),
    validExplicitFlow({ knowledgeScope: '["knowledge-1"]' }),
    { name: "Incompleto", runtimeCategory: "businessHours" },
  ]) {
    await assert.rejects(
      () => service.create("company-1", "assistant-1", dto),
      (error) =>
        /RUNTIME_V2_FLOW_CONTRACT_(INCOMPLETE|UNSUPPORTED|NON_STANDARD)/.test(error.message),
    );
  }
});

test("the CRUD persists the approved explicit contract and preserves legacy defaults", async () => {
  const explicitService = serviceFor();
  const explicit = await explicitService.create(
    "company-1",
    "assistant-1",
    validExplicitFlow(),
  );
  assert.equal(explicit.runtimeScope, "V2_CONTROLLED");
  assert.equal(explicit.runtimeCategory, "businessHours");
  assert.equal(explicit.runtimeIntent, "ask_business_hours");
  assert.equal(explicit.runtimeAuthority, "OFFICIAL_CONTEXT");
  assert.equal(explicit.runtimeDirectOnly, true);

  const legacyService = serviceFor();
  const legacy = await legacyService.create("company-1", "assistant-1", { name: "Legado" });
  assert.equal(legacy.runtimeScope, undefined);
  assert.equal(resolveRuntimeV2FlowScope(legacy), "V1_ONLY");
});
