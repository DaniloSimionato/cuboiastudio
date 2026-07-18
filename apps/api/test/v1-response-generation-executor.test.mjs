import assert from "node:assert/strict";
import test from "node:test";
import {
  selectV1ResponseGenerationStrategy,
  V1ResponseGenerationExecutor,
} from "../dist/assistant-conversations/v1-response-generation-executor.js";

function flow(overrides = {}) {
  return {
    finalAction: "respond",
    autoRespond: true,
    requiresHuman: false,
    ...overrides,
  };
}

function createHarness(overrides = {}) {
  const calls = [];
  const dependencies = {
    generateFlowBypassResponse: async () => {
      calls.push("flow-bypass");
      return (
        overrides.flowResult ?? {
          kind: "FIXED_MESSAGE",
          answer: "mensagem fixa",
          finalAction: "fixed_message",
          autoRespond: true,
          providerCallCount: 0,
          handoffPending: false,
          outcome: "success",
        }
      );
    },
    generateTriageResponse: async () => {
      calls.push("triage");
      if (overrides.triageError) throw overrides.triageError;
      return {
        answer: "pergunta de triagem",
        completion: { provider: "fake", model: "fake-model" },
        providerCallCount: 1,
        triageValidationPassed: true,
        triageAttemptCount: 1,
        triageResolved: false,
        errorStage: "NONE",
        ...overrides.triageResult,
      };
    },
    generateStandardResponse: async () => {
      calls.push("standard");
      if (overrides.standardError) throw overrides.standardError;
      return {
        completion: { answer: "resposta normal", provider: "fake", model: "fake-model" },
        providerCallCount: 1,
        toolCallCount: 0,
        loopCount: 0,
        promptMessages: [],
        ...overrides.standardResult,
      };
    },
  };
  const factoryCalls = [];
  const input = {
    flow: overrides.flow ?? null,
    triageMode: overrides.triageMode ?? false,
    createFlowBypassInput: async () => {
      factoryCalls.push("flow-bypass");
      return {};
    },
    createTriageInput: async () => {
      factoryCalls.push("triage");
      return {};
    },
    createStandardInput: async () => {
      factoryCalls.push("standard");
      return {};
    },
  };
  return { executor: new V1ResponseGenerationExecutor(dependencies), input, calls, factoryCalls };
}

test("selector gives flow bypass precedence over triage", () => {
  assert.equal(
    selectV1ResponseGenerationStrategy({
      flow: flow({ finalAction: "fixed_message" }),
      triageMode: true,
    }),
    "FLOW_BYPASS",
  );
  assert.equal(
    selectV1ResponseGenerationStrategy({ flow: flow({ requiresHuman: true }), triageMode: true }),
    "FLOW_BYPASS",
  );
  assert.equal(
    selectV1ResponseGenerationStrategy({ flow: flow({ autoRespond: false }), triageMode: true }),
    "FLOW_BYPASS",
  );
});

test("executor selects fixed_message through only the bypass factory", async () => {
  const harness = createHarness({ flow: flow({ finalAction: "fixed_message" }) });
  const result = await harness.executor.execute(harness.input);

  assert.equal(result.strategy, "FLOW_BYPASS");
  assert.equal(result.responseText, "mensagem fixa");
  assert.equal(result.providerCallCount, 0);
  assert.deepEqual(harness.calls, ["flow-bypass"]);
  assert.deepEqual(harness.factoryCalls, ["flow-bypass"]);
});

test("executor selects explicit handoff, requiresHuman, and autoRespond=false as bypass", async () => {
  for (const specialFlow of [
    flow({ finalAction: "handoff" }),
    flow({ requiresHuman: true }),
    flow({ autoRespond: false }),
  ]) {
    const harness = createHarness({
      flow: specialFlow,
      flowResult: {
        kind: "HANDOFF",
        answer: "Transferindo para um atendente...",
        finalAction: specialFlow.finalAction,
        autoRespond: specialFlow.autoRespond,
        providerCallCount: 0,
        handoffPending: true,
        outcome: "handoff",
      },
    });
    const result = await harness.executor.execute(harness.input);

    assert.equal(result.strategy, "FLOW_BYPASS");
    assert.equal(result.handoffRequired, true);
    assert.equal(result.providerCallCount, 0);
    assert.deepEqual(harness.calls, ["flow-bypass"]);
  }
});

test("executor selects triage without preparing bypass or standard contexts", async () => {
  const harness = createHarness({ flow: flow(), triageMode: true });
  const result = await harness.executor.execute(harness.input);

  assert.equal(result.strategy, "TRIAGE");
  assert.equal(result.responseText, "pergunta de triagem");
  assert.equal(result.toolCallCount, 0);
  assert.deepEqual(harness.calls, ["triage"]);
  assert.deepEqual(harness.factoryCalls, ["triage"]);
});

test("executor selects standard and preserves normalized tool metadata", async () => {
  const harness = createHarness({
    standardResult: {
      completion: { answer: "resposta com ferramenta", provider: "fake", model: "fake-model" },
      providerCallCount: 2,
      toolCallCount: 1,
      loopCount: 1,
      promptMessages: [],
    },
  });
  const result = await harness.executor.execute(harness.input);

  assert.equal(result.strategy, "STANDARD");
  assert.equal(result.providerCallCount, 2);
  assert.equal(result.toolCallCount, 1);
  assert.equal(result.toolExecutionMetadata.loopCount, 1);
  assert.deepEqual(harness.calls, ["standard"]);
  assert.deepEqual(harness.factoryCalls, ["standard"]);
});

test("executor propagates strategy errors without trying a second strategy", async () => {
  const harness = createHarness({ standardError: new Error("provider unavailable") });

  await assert.rejects(() => harness.executor.execute(harness.input), /provider unavailable/);
  assert.deepEqual(harness.calls, ["standard"]);
  assert.deepEqual(harness.factoryCalls, ["standard"]);
});
