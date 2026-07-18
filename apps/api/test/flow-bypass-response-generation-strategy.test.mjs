import assert from "node:assert/strict";
import test from "node:test";
import { generateFlowBypassResponse } from "../dist/assistant-conversations/flow-bypass-response-generation-strategy.js";

function createInput(overrides = {}) {
  const calls = { cache: [], warnings: [] };
  return {
    input: {
      flow: {
        id: "flow-1",
        finalAction: "respond",
        autoRespond: true,
        requiresHuman: false,
        fixedMessage: null,
        ...overrides.flow,
      },
      triageCacheKey: "triage:company-1:conversation-1",
      cache: {
        set: async (...args) => {
          if (overrides.cacheError) throw new Error("cache unavailable");
          calls.cache.push(args);
        },
      },
      logger: { warn: (message) => calls.warnings.push(message) },
      ...overrides.input,
    },
    calls,
  };
}

test("flow bypass leaves ordinary flows on the normal generation path", async () => {
  const { input, calls } = createInput();
  const result = await generateFlowBypassResponse(input);

  assert.deepEqual(result, { kind: "NONE" });
  assert.equal(calls.cache.length, 0);
});

test("flow bypass returns the configured fixed message without a provider", async () => {
  const { input, calls } = createInput({
    flow: { finalAction: "fixed_message", fixedMessage: "Use o canal de delivery." },
  });
  const result = await generateFlowBypassResponse(input);

  assert.equal(result.kind, "FIXED_MESSAGE");
  assert.equal(result.answer, "Use o canal de delivery.");
  assert.equal(result.providerCallCount, 0);
  assert.equal(result.handoffPending, false);
  assert.equal(calls.cache.length, 0);
});

test("flow bypass preserves the fixed-message fallback", async () => {
  const { input } = createInput({
    flow: { finalAction: "fixed_message", fixedMessage: "" },
  });
  const result = await generateFlowBypassResponse(input);

  assert.equal(result.kind, "FIXED_MESSAGE");
  assert.equal(result.answer, "Agradecemos o contato.");
});

test("flow bypass marks an explicit handoff and clears only triage state", async () => {
  const { input, calls } = createInput({ flow: { finalAction: "handoff" } });
  const result = await generateFlowBypassResponse(input);

  assert.equal(result.kind, "HANDOFF");
  assert.equal(result.handoffPending, true);
  assert.equal(result.outcome, "handoff");
  assert.equal(result.providerCallCount, 0);
  assert.deepEqual(calls.cache, [["triage:company-1:conversation-1", null, 1]]);
});

test("flow bypass treats requiresHuman and disabled auto response as handoff", async () => {
  const human = await generateFlowBypassResponse(
    createInput({ flow: { requiresHuman: true } }).input,
  );
  const disabled = await generateFlowBypassResponse(
    createInput({ flow: { autoRespond: false } }).input,
  );

  assert.equal(human.kind, "HANDOFF");
  assert.equal(disabled.kind, "HANDOFF");
});

test("flow bypass keeps the handoff response when clearing triage cache fails", async () => {
  const { input, calls } = createInput({ flow: { finalAction: "handoff" }, cacheError: true });
  const result = await generateFlowBypassResponse(input);

  assert.equal(result.kind, "HANDOFF");
  assert.equal(calls.warnings.length, 1);
  assert.match(calls.warnings[0], /Failed to clear triage cache on handoff/);
});
