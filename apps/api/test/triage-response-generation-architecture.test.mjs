import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serviceUrl = new URL(
  "../src/assistant-conversations/assistant-conversations.service.ts",
  import.meta.url,
);
const strategyUrl = new URL(
  "../src/assistant-conversations/triage-response-generation-strategy.ts",
  import.meta.url,
);

test("triage generation is isolated before the unchanged productive tail", async () => {
  const [serviceSource, strategySource] = await Promise.all([
    readFile(serviceUrl, "utf8"),
    readFile(strategyUrl, "utf8"),
  ]);

  assert.match(serviceSource, /generateTriageResponse\(\{/);
  assert.doesNotMatch(serviceSource, /isTriageResponseValid/);
  assert.equal([...serviceSource.matchAll(/this\.aiService\.generateChatCompletion\(/g)].length, 1);
  assert.match(strategySource, /input\.provider\.generateChatCompletion\(/);
  assert.doesNotMatch(strategySource, /sendChatwootOutboundText|scheduleRuntimeV2Shadow/);
  assert.doesNotMatch(
    serviceSource,
    /ResponseExecutionRouter|RuntimeV2ResponseExecutionCoordinator|RUNTIME_V2_RESPONSE_EXECUTION_MODE/,
  );
});
