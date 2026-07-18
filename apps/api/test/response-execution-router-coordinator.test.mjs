import assert from "node:assert/strict";
import test from "node:test";
import {
  RuntimeV2ResponseExecutionCoordinator,
  createRuntimeV2ResponseExecutionApproval,
} from "../dist/runtime-v2/index.js";
import { ResponseGenerationRouter } from "../dist/assistant-conversations/response-generation-router.js";
import { ResponseTailLifecycleHooks } from "../dist/assistant-conversations/response-tail-lifecycle-hooks.js";

const turn = {
  companyId: "company-c1",
  assistantId: "assistant-c1",
  conversationId: "conversation-c1",
  internalMessageId: "message-c1",
  contextVersion: 1,
  canonicalComparisonHash: "canonical-hash-c1",
  canonicalVersion: "canonical-inbound-message-v1",
};

function createApproval() {
  return createRuntimeV2ResponseExecutionApproval({
    companyId: turn.companyId,
    assistantId: turn.assistantId,
    conversationId: turn.conversationId,
    expectedCanonicalComparisonHash: turn.canonicalComparisonHash,
    canonicalVersion: turn.canonicalVersion,
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "test-only single-use coordinator integration",
    flowConfigurationFingerprint: "flow-config-c1",
  });
}

function createStore(approval = createApproval()) {
  let value = {
    approval,
    owner: "V1_OWNED",
    revision: 0,
    contextVersion: turn.contextVersion,
    providerV2CallCount: 0,
    providerV1FallbackCallCount: 0,
    outboundV2Attempted: false,
    outboundV2Performed: false,
    outboundV1Performed: false,
    externalMessageId: null,
    fallbackReason: null,
    reconciliationReason: null,
    terminalStatus: null,
    redactionApplied: true,
  };
  return {
    async load() {
      return structuredClone(value);
    },
    async compareAndSet({ expectedRevision, next }) {
      if (value.revision !== expectedRevision) return false;
      value = structuredClone(next);
      return true;
    },
    value: () => structuredClone(value),
  };
}

function v1Response() {
  return {
    owner: "V1",
    strategy: "STANDARD",
    responseText: "Resposta V1 fake.",
    providerCallCount: 1,
    providerMetadata: { provider: "v1-fake", model: "v1-fake" },
    toolCallCount: 0,
    toolExecutionMetadata: { loopCount: 0 },
    handoffRequired: false,
    requiresHuman: false,
    autoRespond: null,
    generationMetadata: {
      finalAction: null,
      outcome: null,
      triageValidationPassed: null,
      triageAttemptCount: null,
      triageResolved: null,
    },
    sanitizedTelemetry: { strategy: "STANDARD", providerCallCount: 1, toolCallCount: 0 },
    errorStage: null,
  };
}

function routerInput() {
  return {
    turn,
    v1Input: { triageMode: false },
    executionMode: "CONTROLLED",
    executionAssistantIds: [turn.assistantId],
    executionConversationIds: [turn.conversationId],
    v2Eligibility: {
      standardEligible: true,
      category: "businessHours",
      authority: "OFFICIAL_CONTEXT",
      flowEvaluation: {
        v2Compatibility: "ALLOWED",
        flowConfigurationFingerprint: "flow-config-c1",
      },
    },
  };
}

function metadata(envelope) {
  return {
    executionOwner: envelope.executionOwner,
    route: envelope.route,
    strategy: envelope.strategy,
    internalMessageId: turn.internalMessageId,
    generationId: envelope.generationId,
    persistedResponseId: "assistant-response-c1",
    outboundAttempted: true,
    outboundPerformed: "CONFIRMED",
    externalMessageReferenceFingerprint: "fingerprint-c1",
  };
}

test("authorized V2 fake owns one turn and the shared tail consumes the approval", async () => {
  const store = createStore();
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let v1 = 0;
  let v2 = 0;
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    v2Executor: {
      async execute() {
        v2 += 1;
        return {
          responseText: "Horário oficial fake.",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
        };
      },
    },
  });

  const envelope = await router.route(routerInput());
  assert.equal(envelope.executionOwner, "V2_PRIMARY");
  assert.deepEqual([v2, v1], [1, 0]);

  const hooks = new ResponseTailLifecycleHooks(undefined, coordinator, turn);
  await hooks.beforeOutbound(metadata(envelope));
  await hooks.afterOutboundConfirmed(metadata(envelope), "external-fake-c1");

  const persisted = store.value();
  assert.equal(persisted.owner, "V2_OUTBOUND_SENT");
  assert.equal(persisted.terminalStatus, "V2_OUTBOUND_SENT");
  assert.equal(persisted.approval.status, "CONSUMED");
  assert.equal(persisted.providerV2CallCount, 1);
  assert.equal(persisted.outboundV2Attempted, true);
  assert.equal(persisted.outboundV2Performed, true);
  assert.equal(persisted.externalMessageId, "external-fake-c1");
});

test("V2 fake failure claims one V1 fallback before the shared sender", async () => {
  const store = createStore();
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let v1 = 0;
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    v2Executor: { execute: async () => { throw new Error("V2_PROVIDER_FAILED"); } },
  });

  const envelope = await router.route(routerInput());
  assert.equal(envelope.executionOwner, "V1_FALLBACK");
  assert.equal(v1, 1);
  assert.equal(store.value().outboundV2Attempted, false);

  const hooks = new ResponseTailLifecycleHooks(undefined, coordinator, turn);
  await hooks.beforeOutbound(metadata(envelope));
  await hooks.afterOutboundConfirmed(metadata(envelope), "external-fallback-c1");
  const persisted = store.value();
  assert.equal(persisted.terminalStatus, "V1_FALLBACK_SENT");
  assert.equal(persisted.providerV1FallbackCallCount, 1);
  assert.equal(persisted.outboundV1Performed, true);
});

test("uncertain V2 sender enters reconciliation and never permits V1 fallback", async () => {
  const store = createStore();
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => v1Response(),
    v2Executor: {
      execute: async () => ({
        responseText: "Horário oficial fake.",
        category: "businessHours",
        authority: "OFFICIAL_CONTEXT",
        candidateStatus: "CANDIDATE_APPROVED",
        qualityGateResult: "APPROVED",
        outboundAllowed: true,
      }),
    },
  });
  const envelope = await router.route(routerInput());
  const hooks = new ResponseTailLifecycleHooks(undefined, coordinator, turn);
  await hooks.beforeOutbound(metadata(envelope));
  await hooks.afterOutboundUncertain({ ...metadata(envelope), outboundPerformed: "UNKNOWN" });

  const persisted = store.value();
  assert.equal(persisted.owner, "RECONCILIATION_REQUIRED");
  assert.equal(persisted.outboundV2Performed, null);
  assert.equal(persisted.terminalStatus, "RECONCILIATION_REQUIRED");
  assert.equal(
    await coordinator.beginV1Fallback({ ...turn, generationId: envelope.generationId, reason: "must-not-run" }),
    false,
  );
});

test("two concurrent routers produce one claim and the loser never falls through to V1", async () => {
  const store = createStore();
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  let v1 = 0;
  let v2 = 0;
  const router = new ResponseGenerationRouter({
    coordinator,
    executeV1: async () => {
      v1 += 1;
      return v1Response();
    },
    v2Executor: {
      async execute() {
        v2 += 1;
        return {
          responseText: "Horário oficial fake.",
          category: "businessHours",
          authority: "OFFICIAL_CONTEXT",
          candidateStatus: "CANDIDATE_APPROVED",
          qualityGateResult: "APPROVED",
          outboundAllowed: true,
        };
      },
    },
  });

  const [first, second] = await Promise.all([router.route(routerInput()), router.route(routerInput())]);
  const results = [first, second];
  assert.equal(results.filter((result) => result.executionOwner === "V2_PRIMARY").length, 1);
  assert.equal(results.filter((result) => result.state === "PENDING_OR_TERMINAL").length, 1);
  assert.deepEqual([v2, v1], [1, 0]);
});
