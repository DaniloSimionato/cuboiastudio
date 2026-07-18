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
const executorUrl = new URL(
  "../src/assistant-conversations/v1-response-generation-executor.ts",
  import.meta.url,
);

test("flow bypass stays isolated before the unchanged productive tail", async () => {
  const [serviceSource, strategySource, executorSource] = await Promise.all([
    readFile(serviceUrl, "utf8"),
    readFile(strategyUrl, "utf8"),
    readFile(executorUrl, "utf8"),
  ]);

  assert.doesNotMatch(serviceSource, /generateFlowBypassResponse\(/);
  assert.match(executorSource, /generateFlowBypassResponse/);
  assert.match(strategySource, /finalAction === "fixed_message"/);
  assert.match(strategySource, /requiresFlowBypassGeneration/);
  assert.doesNotMatch(
    strategySource,
    /generateChatCompletion|sendChatwootOutboundText|scheduleRuntimeV2Shadow|assistantConversationMessage/,
  );
  assert.doesNotMatch(
    serviceSource,
    /ResponseExecutionRouter|RuntimeV2ResponseExecutionCoordinator|RUNTIME_V2_RESPONSE_EXECUTION_MODE/,
  );
});
