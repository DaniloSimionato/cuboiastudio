import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const servicePath = new URL(
  "../src/assistant-conversations/assistant-conversations.service.ts",
  import.meta.url,
);
const coordinatorPath = new URL(
  "../src/runtime-v2/response-execution-coordinator.ts",
  import.meta.url,
);

test("single-use execution infrastructure remains disconnected from the productive V1 path", async () => {
  const source = await readFile(servicePath, "utf8");
  assert.match(source, /ResponseGenerationRouter/);
  assert.doesNotMatch(source, /ResponseExecutionRouter|RuntimeV2ResponseExecutionCoordinator/);
  assert.doesNotMatch(source, /RUNTIME_V2_RESPONSE_EXECUTION_MODE/);
  assert.match(source, /scheduleRuntimeV2Shadow\(/);
  assert.match(source, /sendChatwootOutboundText\(/);
});

test("isolated coordinator owns no production provider or Chatwoot transport", async () => {
  const source = await readFile(coordinatorPath, "utf8");
  assert.doesNotMatch(source, /fetch\(|Chatwoot|AiService|generateChatCompletion/);
  assert.match(source, /generateV2/);
  assert.match(source, /sendV2/);
});
