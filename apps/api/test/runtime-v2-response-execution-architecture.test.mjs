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
const modulePath = new URL(
  "../src/assistant-conversations/assistant-conversations.module.ts",
  import.meta.url,
);
const primaryExecutorPath = new URL(
  "../src/assistant-conversations/v2-primary-response-executor.ts",
  import.meta.url,
);

test("single-use execution remains default-deny until the router gates every V2 dependency", async () => {
  const source = await readFile(servicePath, "utf8");
  assert.match(source, /ResponseGenerationRouter/);
  assert.doesNotMatch(source, /ResponseExecutionRouter|RuntimeV2ResponseExecutionCoordinator/);
  assert.match(source, /resolveRuntimeV2ResponseExecutionMode/);
  assert.match(source, /v2Eligibility/);
  assert.match(source, /standardEligible:/);
  assert.match(source, /scheduleRuntimeV2Shadow\(/);
  assert.match(source, /sendChatwootOutboundText\(/);
});

test("the real primary executor is DI-registered but has no constructor side effect", async () => {
  const [moduleSource, executorSource] = await Promise.all([
    readFile(modulePath, "utf8"),
    readFile(primaryExecutorPath, "utf8"),
  ]);
  assert.match(moduleSource, /V2_PRIMARY_RESPONSE_EXECUTOR/);
  assert.match(moduleSource, /RuntimeV2PrimaryResponseExecutor/);
  assert.match(executorSource, /RuntimeV2CandidateResponseGenerator/);
  assert.doesNotMatch(executorSource, /Chatwoot|sendChatwootOutboundText|fetch\(/);
  assert.match(executorSource, /ragRequested/);
  assert.match(executorSource, /memoryRequested/);
  assert.match(executorSource, /toolRequired/);
});

test("isolated coordinator owns no production provider or Chatwoot transport", async () => {
  const source = await readFile(coordinatorPath, "utf8");
  assert.doesNotMatch(source, /fetch\(|Chatwoot|AiService|generateChatCompletion/);
  assert.match(source, /generateV2/);
  assert.match(source, /sendV2/);
});
