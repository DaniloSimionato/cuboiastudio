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
const envelopeUrl = new URL(
  "../src/assistant-conversations/response-execution-envelope.ts",
  import.meta.url,
);
const lifecycleUrl = new URL(
  "../src/assistant-conversations/response-tail-lifecycle-hooks.ts",
  import.meta.url,
);

test("sendMessage uses a V1_NORMAL envelope and ownership-aware tail after the default-deny router", async () => {
  const [serviceSource, executorSource, routerSource, envelopeSource, lifecycleSource] =
    await Promise.all([
      readFile(serviceUrl, "utf8"),
      readFile(executorUrl, "utf8"),
      readFile(routerUrl, "utf8"),
      readFile(envelopeUrl, "utf8"),
      readFile(lifecycleUrl, "utf8"),
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
  assert.match(routerSource, /createV1NormalResponseExecutionEnvelope/);
  assert.match(envelopeSource, /executionOwner: "V1_NORMAL"/);
  assert.match(envelopeSource, /"V1_FALLBACK" \| "V2_PRIMARY"/);
  assert.match(serviceSource, /validateV1NormalResponseExecutionEnvelope/);
  assert.match(serviceSource, /ResponseTailLifecycleHooks/);
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
    lifecycleSource,
    /ResponseExecutionCoordinator|response-execution-approval|response-execution-coordinator|prisma\.|fetch\(/,
  );
  const beforePersist = serviceSource.indexOf("responseTailLifecycleHooks.beforeResponsePersist");
  const persisted = serviceSource.indexOf("const { assistantMessage, runtimeLogId }");
  const afterPersist = serviceSource.indexOf("responseTailLifecycleHooks.afterResponsePersist");
  const beforeOutbound = serviceSource.indexOf("responseTailLifecycleHooks.beforeOutbound");
  const sender = serviceSource.indexOf("this.sendChatwootOutboundText", beforeOutbound);
  const afterTail = serviceSource.indexOf("responseTailLifecycleHooks.afterTailCompleted");
  const shadow = serviceSource.indexOf("this.scheduleRuntimeV2Shadow", afterTail);
  assert.ok(beforePersist < persisted && persisted < afterPersist);
  assert.ok(afterPersist < beforeOutbound && beforeOutbound < sender);
  assert.ok(sender < afterTail && afterTail < shadow);
  assert.doesNotMatch(
    serviceSource,
    /ResponseExecutionRouter|RuntimeV2ResponseExecutionCoordinator|RUNTIME_V2_RESPONSE_EXECUTION_MODE/,
  );
});
