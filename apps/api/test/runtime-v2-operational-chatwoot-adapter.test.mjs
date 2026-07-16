import assert from "node:assert/strict";
import test from "node:test";

const runtime = await import("../dist/runtime-v2/index.js");

const baseEnvironment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_HANDOFF_STATE_MODE: "SHADOW_STATE",
  RUNTIME_V2_HANDOFF_EXECUTION_MODE: "CONTROLLED",
  RUNTIME_V2_HANDOFF_ADAPTER_MODE: "CHATWOOT_CONTROLLED",
  RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS: "assistant-1",
  RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS: "conversation-1",
};
const scope = {
  companyId: "company-1",
  assistantId: "assistant-1",
  conversationId: "conversation-1",
  contactId: "contact-1",
  contextVersion: 3,
  runtimeVersion: "V2",
  mode: "SHADOW",
};
const handoff = {
  contractVersion: 1,
  handoffId: "handoff-1",
  companyId: scope.companyId,
  assistantId: scope.assistantId,
  conversationId: scope.conversationId,
  contactId: scope.contactId,
  contextVersion: scope.contextVersion,
  originatingInternalMessageId: "message-1",
  actionId: null,
  flowId: "flow-1",
  sourceIntent: "HUMAN_HANDOFF",
  reasonCode: "CUSTOMER_REQUESTED_HUMAN",
  urgency: "NORMAL",
  requestedTargetType: "ANY_HUMAN",
  requestedTargetIdHash: null,
  customerRequested: true,
  humanConfirmationRequired: false,
  collectedContextKeys: ["handoff_pending"],
  contextHash: "context-hash",
  requestedAt: "2026-07-16T18:00:00.000Z",
  expiresAt: "2099-07-16T20:00:00.000Z",
  idempotencyKey: "handoff-key",
  status: "HANDOFF_READY",
  provenance: { source: "V1_PIPELINE", sourceMessageId: "message-1" },
  redactionApplied: true,
};
const config = {
  id: "config-1",
  companyId: scope.companyId,
  assistantId: scope.assistantId,
  assistantName: null,
  assistantStatus: "ACTIVE",
  name: "mocked-chatwoot",
  baseUrl: "http://chatwoot.mock",
  accountId: "account-1",
  inboxId: "inbox-1",
  isActive: true,
  metadataJson: null,
  apiAccessTokenConfigured: true,
  webhookSecretConfigured: false,
  apiAccessToken: "mock-token",
  webhookSecret: null,
};
const prisma = {
  assistantConversation: {
    findFirst: async () => ({
      externalConversationId: "external-conversation-1",
      externalAccountId: "account-1",
      externalInboxId: "inbox-1",
    }),
  },
};
const configService = {
  resolveActiveForAssistantConversation: async () => config,
};

function plan() {
  return runtime.createChatwootHandoffExecutionPlan({
    handoff,
    currentTime: new Date("2026-07-16T19:00:00.000Z"),
    attemptNumber: 1,
    configuration: {
      configured: true,
      inboxMatches: true,
      labelConfigured: false,
      assignmentConfigured: false,
      targetConfigured: true,
    },
  });
}

function payload(aiActive, extra = {}) {
  return {
    ai_active: aiActive,
    status: "open",
    meta: {
      account: { id: "account-1" },
      inbox: { id: "inbox-1" },
    },
    ...extra,
  };
}

function transport(sequence) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ?? null });
    const next = sequence.shift();
    if (next instanceof Error) throw next;
    if (next && next.pending) return new Promise(() => {});
    return new Response(next?.body ? JSON.stringify(next.body) : "", {
      status: next?.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { calls, fetchImpl };
}

function createAdapter(sequence, options = {}) {
  const mocked = transport(sequence);
  const adapter = new runtime.OperationalChatwootHandoffAdapter(
    options.prisma ?? prisma,
    options.configService ?? configService,
    { fetchImpl: mocked.fetchImpl, timeoutMs: options.timeoutMs ?? 25, now: () => new Date("2026-07-16T19:00:00.000Z") },
  );
  return { adapter, calls: mocked.calls };
}

function executorInput(adapter, environment = baseEnvironment) {
  return {
    adapter,
    environment,
    scope,
    handoff,
    currentTime: new Date("2026-07-16T19:00:00.000Z"),
    configuration: {
      configured: true,
      inboxMatches: true,
      labelConfigured: false,
      assignmentConfigured: false,
      targetConfigured: true,
    },
  };
}

test("adapter and executor factory are completely blocked by default", () => {
  let created = 0;
  const result = runtime.resolveChatwootHandoffExecutor({
    environment: {},
    scope,
    handoff,
    createAdapter: () => {
      created += 1;
      return {};
    },
  });
  assert.equal(result.executor, null);
  assert.equal(result.adapter, null);
  assert.equal(result.errorCode, "CHATWOOT_ADAPTER_DISABLED");
  assert.equal(created, 0);
});

test("factory requires both execution and adapter barriers plus both allowlists", () => {
  let created = 0;
  const create = () => {
    created += 1;
    return {};
  };
  for (const environment of [
    { ...baseEnvironment, RUNTIME_V2_HANDOFF_EXECUTION_MODE: "OFF" },
    { ...baseEnvironment, RUNTIME_V2_HANDOFF_ADAPTER_MODE: "OFF" },
    { ...baseEnvironment, RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS: "" },
    { ...baseEnvironment, RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS: "" },
    { ...baseEnvironment, RUNTIME_V2_MODE: "OFF" },
    { ...baseEnvironment, RUNTIME_V2_HANDOFF_STATE_MODE: "OFF" },
  ]) {
    const result = runtime.resolveChatwootHandoffAdapter({ environment, scope, handoff, createAdapter: create });
    assert.equal(result.adapter, null);
    assert.equal(result.eligible, false);
  }
  assert.equal(created, 0);
});

test("HTTP mock: reads, pauses once and verifies final ai_active=false", async () => {
  const mocked = createAdapter([
    { body: payload(true) },
    { body: {} },
    { body: payload(false) },
  ]);
  const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).execute(
    executorInput(mocked.adapter),
  );
  assert.equal(result.status, "SUCCEEDED");
  assert.deepEqual(mocked.calls.map((call) => call.method), ["GET", "PUT", "GET"]);
  assert.deepEqual(JSON.parse(mocked.calls[1].body), { ai_active: false });
});

test("HTTP mock: already paused does not mutate", async () => {
  const mocked = createAdapter([{ body: payload(false) }, { body: payload(false) }]);
  const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).execute(
    executorInput(mocked.adapter),
  );
  assert.equal(result.status, "SUCCEEDED");
  assert.deepEqual(mocked.calls.map((call) => call.method), ["GET", "GET"]);
});

test("HTTP mock: human activity prevents mutation", async () => {
  const mocked = createAdapter([{ body: payload(true, { human_active: true }) }]);
  const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).execute(
    executorInput(mocked.adapter),
  );
  assert.equal(result.status, "HUMAN_ALREADY_ACTIVE");
  assert.deepEqual(mocked.calls.map((call) => call.method), ["GET"]);
});

test("HTTP mock: HTTP failure before mutation does not retry", async () => {
  const mocked = createAdapter([{ body: payload(true) }, { status: 400 }]);
  const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).execute(
    executorInput(mocked.adapter),
  );
  assert.equal(result.status, "FAILED_BEFORE_MUTATION");
  assert.equal(result.externalEffectMayHaveOccurred, false);
  assert.deepEqual(mocked.calls.map((call) => call.method), ["GET", "PUT"]);
});

test("HTTP mock: timeout after possible send requires reconciliation and does not retry", async () => {
  const mocked = createAdapter([{ body: payload(true) }, { pending: true }], { timeoutMs: 1 });
  const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).execute(
    executorInput(mocked.adapter),
  );
  assert.equal(result.status, "TIMED_OUT_UNKNOWN_EFFECT");
  assert.equal(result.reconciliationStatus, "RECONCILIATION_REQUIRED");
  assert.equal(mocked.calls.filter((call) => call.method === "PUT").length, 1);
});

test("HTTP mock: successful PUT without final confirmation requires reconciliation", async () => {
  const mocked = createAdapter([
    { body: payload(true) },
    { body: {} },
    { body: payload(true) },
  ]);
  const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).execute(
    executorInput(mocked.adapter),
  );
  assert.equal(result.status, "RECONCILIATION_REQUIRED");
  assert.equal(result.externalEffectMayHaveOccurred, true);
  assert.deepEqual(mocked.calls.map((call) => call.method), ["GET", "PUT", "GET"]);
});

test("HTTP mock: account or inbox divergence blocks mutation", async () => {
  const mocked = createAdapter([{ body: payload(true, { meta: { account: { id: "other" }, inbox: { id: "inbox-1" } } }) }]);
  const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).execute(
    executorInput(mocked.adapter),
  );
  assert.equal(result.errorCode, "CHATWOOT_ACCOUNT_MISMATCH");
  assert.deepEqual(mocked.calls.map((call) => call.method), ["GET"]);
});

test("preconditions block missing/inactive configuration, credential and ambiguous scope", async () => {
  const cases = [
    ["CHATWOOT_CONFIGURATION_NOT_FOUND", { configService: { resolveActiveForAssistantConversation: async () => null } }],
    ["CHATWOOT_CONFIGURATION_INACTIVE", { configService: { resolveActiveForAssistantConversation: async () => ({ ...config, isActive: false }) } }],
    ["CHATWOOT_CREDENTIAL_UNAVAILABLE", { configService: { resolveActiveForAssistantConversation: async () => ({ ...config, apiAccessToken: null }) } }],
    ["CHATWOOT_SCOPE_AMBIGUOUS", { configService: { resolveActiveForAssistantConversation: async () => { throw new Error("CHATWOOT_SCOPE_AMBIGUOUS"); } } }],
    ["CHATWOOT_CONVERSATION_NOT_FOUND", { prisma: { assistantConversation: { findFirst: async () => null } } }],
  ];
  for (const [expected, options] of cases) {
    const mocked = createAdapter([{ body: payload(true) }], options);
    const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).execute(
      executorInput(mocked.adapter),
    );
    assert.equal(result.errorCode, expected);
    assert.equal(mocked.calls.length, 0);
  }
});

test("missing ai_active is not inferred as false", async () => {
  const mocked = createAdapter([{ body: { status: "open" } }]);
  const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).execute(
    executorInput(mocked.adapter),
  );
  assert.equal(result.errorCode, "CHATWOOT_CONVERSATION_READ_FAILED");
  assert.deepEqual(mocked.calls.map((call) => call.method), ["GET"]);
});

test("reconciliation uses read-only GET and never issues a second pause", async () => {
  const mocked = createAdapter([{ body: payload(false) }]);
  const result = await new runtime.ControlledChatwootHandoffExecutor(mocked.adapter).reconcile({
    plan: plan(),
    handoff,
  });
  assert.equal(result.status, "RECONCILED_SUCCEEDED");
  assert.deepEqual(mocked.calls.map((call) => call.method), ["GET"]);
});

test("operational adapter rejects label, assignment and other mutation surfaces", async () => {
  const mocked = createAdapter([]);
  for (const method of ["applyLabel", "assignTeam", "assignAgent"]) {
    await assert.rejects(
      mocked.adapter[method]({ plan: plan(), handoff }),
      (error) => error.code === "OPERATION_NOT_ENABLED",
    );
  }
  assert.equal(mocked.calls.length, 0);
});

test("operational module has no Calendar, Webhook, provider or outbound dependency", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile(
    new URL("../src/runtime-v2/operational-chatwoot-handoff-adapter.ts", import.meta.url),
    "utf8",
  );
  for (const forbidden of [
    "GoogleCalendar",
    "CustomWebhook",
    "sendChatwootOutboundText",
    "ChatwootWebhookService",
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden dependency: ${forbidden}`);
  }
});
