import assert from "node:assert/strict";
import test from "node:test";
import { generateTriageResponse } from "../dist/assistant-conversations/triage-response-generation-strategy.js";

const validAnswer = (overrides = {}) =>
  JSON.stringify({
    message: "Qual é o modelo do equipamento?",
    action: "ASK_NEXT_DETAIL",
    requestedDetail: "modelo",
    suggestScheduling: false,
    triageResolved: false,
    ...overrides,
  });

function createInput(overrides = {}) {
  const calls = { provider: [], cache: [], prompts: [], errors: [], warnings: [] };
  const responses = [...(overrides.responses ?? [validAnswer()])];
  const input = {
    companyId: "company-1",
    assistant: { name: "Assistente" },
    promptInstructions: "Responda objetivamente.",
    behavior: null,
    flow: null,
    securityRules: [],
    priorHistory: [{ role: "user", content: "Quero formatar e instalar SSD." }],
    customerIntentText: "Quero formatar e instalar SSD.",
    officialBusinessContext: null,
    memoryContextBlock: null,
    loadedTriageState: null,
    triageFlowContext: null,
    triageCacheKey: "triage:company-1:conversation-1",
    userMessageId: "message-1",
    requestedDetailKey: "device_model",
    knownFieldKeys: ["device_type"],
    pendingFieldKeys: ["device_model"],
    model: "fake-model",
    temperature: 0.2,
    compiler: {
      compile: (value) => [
        { role: "system", content: value.isSecondAttempt ? "segunda tentativa" : "triagem" },
        { role: "user", content: value.currentMessage },
      ],
    },
    provider: {
      generateChatCompletion: async (request) => {
        calls.provider.push(request);
        const next = responses.shift();
        if (next instanceof Error) throw next;
        return {
          provider: "fake-provider",
          model: "fake-model",
          answer: next,
          durationMs: 1,
        };
      },
    },
    cache: {
      set: async (...args) => calls.cache.push(args),
    },
    logger: {
      error: (...args) => calls.errors.push(args),
      warn: (...args) => calls.warnings.push(args),
    },
    onPromptCompiled: (event) => calls.prompts.push(event),
    now: () => new Date("2026-07-17T12:00:00.000Z").getTime(),
    ...overrides.input,
  };
  return { input, calls };
}

test("triage strategy preserves the valid single-attempt generation contract", async () => {
  const { input, calls } = createInput();
  const result = await generateTriageResponse(input);

  assert.equal(result.answer, "Qual é o modelo do equipamento?");
  assert.equal(result.providerCallCount, 1);
  assert.equal(result.triageValidationPassed, true);
  assert.equal(result.triageAttemptCount, 1);
  assert.equal(calls.provider[0].companyId, "company-1");
  assert.deepEqual(calls.provider[0].tools, []);
  assert.deepEqual(calls.provider[0].response_format, { type: "json_object" });
  assert.equal(calls.cache.length, 1);
  assert.equal(calls.cache[0][1].requestedDetailKey, "device_model");
  assert.deepEqual(
    calls.prompts.map((event) => event.isSecondAttempt),
    [false],
  );
});

test("triage strategy retries once after an invalid response and keeps the second prompt", async () => {
  const { input, calls } = createInput({ responses: ["not-json", validAnswer()] });
  const result = await generateTriageResponse(input);

  assert.equal(result.providerCallCount, 2);
  assert.equal(result.triageValidationPassed, true);
  assert.equal(result.triageAttemptCount, 2);
  assert.deepEqual(
    calls.prompts.map((event) => event.isSecondAttempt),
    [false, true],
  );
  assert.equal(result.promptMessages[0].content, "segunda tentativa");
});

test("triage strategy falls back deterministically after invalid responses", async () => {
  const { input, calls } = createInput({ responses: ["invalid", "still-invalid"] });
  const result = await generateTriageResponse(input);

  assert.match(result.answer, /Qual é o principal detalhe/);
  assert.equal(result.providerCallCount, 2);
  assert.equal(result.triageValidationPassed, false);
  assert.equal(result.triageAttemptCount, 2);
  assert.equal(calls.cache.at(-1)[1].requestedDetail, "informações básicas");
});

test("triage strategy contains provider failures and preserves the fallback state", async () => {
  const { input, calls } = createInput({
    responses: [new Error("attempt-1"), new Error("attempt-2")],
  });
  const result = await generateTriageResponse(input);

  assert.match(result.answer, /Qual é o principal detalhe/);
  assert.equal(result.providerCallCount, 2);
  assert.equal(result.errorStage, "PROVIDER_ATTEMPT_2");
  assert.equal(calls.errors.length, 2);
  assert.equal(calls.cache.length, 1);
});

test("triage strategy clears the state only after a resolved response", async () => {
  const { input, calls } = createInput({
    responses: [validAnswer({ message: "Obrigado pelas informações.", triageResolved: true })],
  });
  const result = await generateTriageResponse(input);

  assert.equal(result.triageResolved, true);
  assert.equal(result.triageValidationPassed, true);
  assert.equal(calls.cache.length, 1);
  assert.equal(calls.cache[0][1], null);
  assert.equal(calls.cache[0][2], 1);
});
