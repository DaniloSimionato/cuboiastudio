import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serviceUrl = new URL(
  "../src/assistant-conversations/assistant-conversations.service.ts",
  import.meta.url,
);
const executorUrl = new URL(
  "../src/assistant-conversations/v1-response-generation-executor.ts",
  import.meta.url,
);
const routerUrl = new URL(
  "../src/assistant-conversations/response-generation-router.ts",
  import.meta.url,
);

test("sendMessage uses one default-deny V1 generation router before the unchanged productive tail", async () => {
  const [serviceSource, executorSource, routerSource] = await Promise.all([
    readFile(serviceUrl, "utf8"),
    readFile(executorUrl, "utf8"),
    readFile(routerUrl, "utf8"),
  ]);

  assert.equal([...serviceSource.matchAll(/ResponseGenerationRouter\(\)\.route\(/g)].length, 1);
  assert.doesNotMatch(serviceSource, /V1ResponseGenerationExecutor\(\)\.execute\(/);
  assert.doesNotMatch(
    serviceSource,
    /generateTriageResponse\(|generateFlowBypassResponse\(|generateStandardResponse\(|generateChatCompletion\(/,
  );
  assert.match(executorSource, /generateFlowBypassResponse/);
  assert.match(executorSource, /generateTriageResponse/);
  assert.match(executorSource, /generateStandardResponse/);
  assert.match(routerSource, /V1ResponseGenerationExecutor/);
  assert.doesNotMatch(
    routerSource,
    /ResponseExecutionCoordinator|Approval|claim|generateChatCompletion|sendChatwootOutboundText|scheduleRuntimeV2Shadow/,
  );
  assert.doesNotMatch(
    routerSource,
    /response-execution-approval|response-execution-coordinator|candidate-response-generator/,
  );
  assert.match(serviceSource, /sendChatwootOutboundText\(/);
  assert.match(serviceSource, /scheduleRuntimeV2Shadow\(/);
  assert.doesNotMatch(
    serviceSource,
    /ResponseExecutionRouter|RuntimeV2ResponseExecutionCoordinator|RUNTIME_V2_RESPONSE_EXECUTION_MODE/,
  );
});
