import assert from "node:assert/strict";
import test from "node:test";
import {
  modelSupportsTemperature,
  runOpenAiCompatibleChatCompletion,
} from "../dist/ai/ai-runner.js";

test("provider recebe temperature para modelos compatíveis", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    await runOpenAiCompatibleChatCompletion(
      {
        runtimeEnabled: true,
        provider: "test",
        baseUrl: "https://provider.example/v1",
        model: "gpt-4o-mini",
        apiKey: "test-key",
        requestTimeoutMs: 1000,
      },
      { model: "gpt-4o-mini", temperature: 0.6, messages: [{ role: "user", content: "oi" }] },
    );
    assert.equal(requestBody.temperature, 0.6);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider omite temperature para modelos sem suporte", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    assert.equal(modelSupportsTemperature("o3-mini"), false);
    await runOpenAiCompatibleChatCompletion(
      {
        runtimeEnabled: true,
        provider: "test",
        baseUrl: "https://provider.example/v1",
        model: "o3-mini",
        apiKey: "test-key",
        requestTimeoutMs: 1000,
      },
      { model: "o3-mini", temperature: 0.6, messages: [{ role: "user", content: "oi" }] },
    );
    assert.equal("temperature" in requestBody, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
