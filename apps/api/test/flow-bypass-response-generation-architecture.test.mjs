import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serviceUrl = new URL(
  "../src/assistant-conversations/assistant-conversations.service.ts",
  import.meta.url,
);
const strategyUrl = new URL(
  "../src/assistant-conversations/flow-bypass-response-generation-strategy.ts",
  import.meta.url,
);

test("flow bypass stays isolated before the unchanged productive tail", async () => {
  const [serviceSource, strategySource] = await Promise.all([
    readFile(serviceUrl, "utf8"),
    readFile(strategyUrl, "utf8"),
  ]);

  assert.match(serviceSource, /generateFlowBypassResponse\(\{/);
  assert.match(strategySource, /finalAction === "fixed_message"/);
  assert.match(strategySource, /finalAction !== "handoff"/);
  assert.doesNotMatch(
    strategySource,
    /generateChatCompletion|sendChatwootOutboundText|scheduleRuntimeV2Shadow|assistantConversationMessage/,
  );
  assert.doesNotMatch(
    serviceSource,
    /ResponseExecutionRouter|RuntimeV2ResponseExecutionCoordinator|RUNTIME_V2_RESPONSE_EXECUTION_MODE/,
  );
});
