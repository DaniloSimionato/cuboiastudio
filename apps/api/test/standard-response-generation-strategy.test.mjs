import assert from "node:assert/strict";
import test from "node:test";
import { generateStandardResponse } from "../dist/assistant-conversations/standard-response-generation-strategy.js";

function completion({ answer = "resposta", toolCalls } = {}) {
  return {
    provider: "fake",
    model: "fake-model",
    answer,
    durationMs: 1,
    ...(toolCalls ? { toolCalls } : {}),
  };
}

function toolCall(id = "tool-1") {
  return {
    id,
    function: { name: "calendar_checkAvailability", arguments: "{}" },
  };
}

function createInput(overrides = {}) {
  const events = [];
  const responses = [...(overrides.responses ?? [completion()])];
  return {
    events,
    input: {
      companyId: "company-1",
      promptMessages: [{ role: "user", content: "mensagem" }],
      model: "fake-model",
      temperature: 0.2,
      tools: [{ type: "function", function: { name: "calendar_checkAvailability" } }],
      provider: {
        generateChatCompletion: async (request) => {
          events.push({ type: "provider", request });
          const next = responses.shift();
          if (next instanceof Error) throw next;
          return next;
        },
      },
      onToolCallCount: (count) => events.push({ type: "tool-count", count }),
      onToolCalls: async (event) => {
        events.push({ type: "tool", event });
        event.promptMessages.push({
          role: "assistant",
          content: event.completion.answer,
          tool_calls: event.toolCalls,
        });
        for (const call of event.toolCalls) {
          event.promptMessages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: JSON.stringify({ ok: true }),
          });
        }
      },
      ...overrides.input,
    },
  };
}

test("standard strategy returns a simple response with one provider call", async () => {
  const { input, events } = createInput();
  const result = await generateStandardResponse(input);

  assert.equal(result.completion.answer, "resposta");
  assert.equal(result.providerCallCount, 1);
  assert.equal(result.toolCallCount, 0);
  assert.equal(result.loopCount, 0);
  assert.deepEqual(
    events.map((event) => event.type),
    ["provider"],
  );
});

test("standard strategy preserves an empty provider response as the terminal completion", async () => {
  const { input } = createInput({ responses: [completion({ answer: "" })] });
  const result = await generateStandardResponse(input);

  assert.equal(result.completion.answer, "");
  assert.equal(result.providerCallCount, 1);
  assert.equal(result.toolCallCount, 0);
});

test("standard strategy propagates provider failures without a retry", async () => {
  const { input, events } = createInput({ responses: [new Error("provider unavailable")] });

  await assert.rejects(() => generateStandardResponse(input), /provider unavailable/);
  assert.deepEqual(
    events.map((event) => event.type),
    ["provider"],
  );
});

test("standard strategy preserves provider, tool, provider ordering", async () => {
  const { input, events } = createInput({
    responses: [
      completion({ answer: "", toolCalls: [toolCall()] }),
      completion({ answer: "final" }),
    ],
  });
  const result = await generateStandardResponse(input);

  assert.equal(result.completion.answer, "final");
  assert.equal(result.providerCallCount, 2);
  assert.equal(result.toolCallCount, 1);
  assert.equal(result.loopCount, 1);
  assert.deepEqual(
    events.map((event) => event.type),
    ["provider", "tool-count", "tool", "provider"],
  );
  assert.equal(events[3].request.messages.at(-1).role, "tool");
});

test("standard strategy delegates invalid, unavailable, and failed tools to the existing callback", async () => {
  const { input, events } = createInput({
    responses: [
      completion({ toolCalls: [toolCall("tool-invalid")] }),
      completion({ answer: "segura" }),
    ],
  });
  input.onToolCalls = async (event) => {
    events.push({ type: "tool-error", event });
    event.promptMessages.push({
      role: "tool",
      tool_call_id: event.toolCalls[0].id,
      name: event.toolCalls[0].function.name,
      content: JSON.stringify({ error: "ferramenta indisponível" }),
    });
  };

  const result = await generateStandardResponse(input);

  assert.equal(result.completion.answer, "segura");
  assert.deepEqual(
    events.map((event) => event.type),
    ["provider", "tool-count", "tool-error", "provider"],
  );
});

test("standard strategy preserves the five-iteration tool limit", async () => {
  const { input, events } = createInput({
    responses: Array.from({ length: 5 }, (_, index) =>
      completion({ answer: `intermediária-${index}`, toolCalls: [toolCall(`tool-${index}`)] }),
    ),
  });

  const result = await generateStandardResponse(input);

  assert.equal(result.providerCallCount, 5);
  assert.equal(result.toolCallCount, 5);
  assert.equal(result.loopCount, 5);
  assert.equal(result.completion.answer, "intermediária-4");
  assert.equal(events.filter((event) => event.type === "tool").length, 5);
});
