import assert from "node:assert/strict";
import test from "node:test";

const runtime = await import("../dist/runtime-v2/index.js");
const commandModule = await import("../dist/runtime-v2/controlled-handoff-command.js");
const runnerModule = await import("../dist/runtime-v2/controlled-handoff-command-runner.js");

const now = new Date("2026-07-16T12:00:00.000Z");
const scope = {
  companyId: "runner-company",
  assistantId: "runner-assistant",
  conversationId: "runner-conversation",
  contactId: null,
  contextVersion: 1,
  runtimeVersion: "V2",
  mode: "SHADOW",
};
const environment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
  RUNTIME_V2_HANDOFF_STATE_MODE: "SHADOW_STATE",
  RUNTIME_V2_HANDOFF_EXECUTION_MODE: "CONTROLLED",
  RUNTIME_V2_HANDOFF_ADAPTER_MODE: "CHATWOOT_CONTROLLED",
  RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS: scope.conversationId,
};
const reference = {
  companyId: scope.companyId,
  assistantId: scope.assistantId,
  internalConversationId: scope.conversationId,
  contextVersion: 1,
  channelBindingPresent: true,
  configurationPresent: true,
  configurationActive: true,
  accountScopeHash: "account-hash",
  inboxScopeHash: "inbox-hash",
  externalConversationReferenceHash: "conversation-hash",
  scopeValid: true,
  resolutionStatus: "RESOLVED",
  redactionApplied: true,
};

function observation() {
  return runtime.createV1HandoffObservation({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    contactId: null,
    contextVersion: 1,
    internalMessageId: "runner-message-1",
    flowId: "runner-flow",
    handoffPendingObserved: true,
    reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    customerRequested: true,
    humanActiveObserved: false,
    aiActiveObserved: true,
    pausedByHumanObserved: false,
    requestedTargetType: "ANY_HUMAN",
    requestedTargetIdHash: null,
    collectedContextKeys: ["customer_requested_human"],
    contextHash: "runner-context-hash",
    provenance: {
      source: "V1_PIPELINE",
      sourceMessageId: "runner-message-1",
      sourceFlowId: "runner-flow",
      sourceVersion: "runner-test",
      reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    },
  });
}

async function fixture({ withApproval = false } = {}) {
  const store = new runtime.InMemoryConversationStateStore();
  const turn = runtime.applyHandoffTurn({
    scope,
    state: runtime.createEmptyRuntimeHandoffState(now),
    observation: observation(),
    currentTime: now,
    internalMessageId: "runner-message-1",
  });
  const base = runtime.createEmptyConversationState(scope, now);
  await store.create(base);
  let state = await store.save({ ...base, handoffState: turn.after, revision: 1 }, 0);
  if (withApproval) {
    const handoff = state.handoffState.activeHandoff;
    const approval = commandModule.createControlledExecutionApproval({
      approvalId: "runner-approval",
      handoff,
      expectedRevision: 2,
      issuedAt: now,
      expiresAt: new Date("2026-07-16T13:00:00.000Z"),
      nonceHash: "runner-nonce-hash",
      planHash: commandModule.createControlledHandoffPlanHash(handoff, now, reference),
    });
    state = await store.save(
      { ...state, controlledExecutionApproval: approval, revision: 2 },
      state.revision,
    );
  }
  return { store, state, handoff: state.handoffState.activeHandoff };
}

class FakeAdapter {
  constructor() {
    this.calls = [];
    this.aiActive = true;
  }
  async getConversationState() {
    this.calls.push("getConversationState");
    return {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      contactId: null,
      contextVersion: 1,
      inboxMatches: true,
      configReady: true,
      aiActive: this.aiActive,
      humanActive: false,
      labelApplied: false,
      teamAssigned: false,
      agentAssigned: false,
    };
  }
  async pauseAi() {
    this.calls.push("pauseAi");
    this.aiActive = false;
  }
  async applyLabel() { throw new Error("disabled"); }
  async assignTeam() { throw new Error("disabled"); }
  async assignAgent() { throw new Error("disabled"); }
  async verifyFinalState() {
    this.calls.push("verifyFinalState");
    return this.getConversationState();
  }
  async reconcile() { return this.getConversationState(); }
}

function createRunner(store, adapter, resolver = async () => reference) {
  let adapterResolutions = 0;
  const runner = new runnerModule.ControlledHandoffCommandRunner({
    stateStore: store,
    environment,
    now: () => now,
    resolveConfigurationReference: resolver,
    resolveAdapter: async () => {
      adapterResolutions += 1;
      return adapter;
    },
  });
  return { runner, getAdapterResolutions: () => adapterResolutions };
}

function input(handoff, overrides = {}) {
  return {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    contextVersion: 1,
    handoffId: handoff.handoffId,
    expectedRevision: 1,
    ...overrides,
  };
}

test("runner dry-run resolves only structural metadata", async () => {
  const { store, handoff } = await fixture();
  const adapter = new FakeAdapter();
  const { runner, getAdapterResolutions } = createRunner(store, adapter);
  const result = await runner.run(input(handoff));
  assert.equal(result.eligible, true);
  assert.equal(result.structuralReferenceResolved, true);
  assert.equal(result.configurationPresent, true);
  assert.equal(result.channelBindingPresent, true);
  assert.equal(result.scopeValid, true);
  assert.equal(result.adapterResolved, false);
  assert.equal(result.credentialResolved, false);
  assert.equal(result.externalReadPerformed, false);
  assert.equal(getAdapterResolutions(), 0);
  assert.deepEqual(adapter.calls, []);
});

test("runner execute uses the injected adapter only after approval and exact plan", async () => {
  const { store, state, handoff } = await fixture({ withApproval: true });
  const adapter = new FakeAdapter();
  const { runner, getAdapterResolutions } = createRunner(store, adapter);
  const result = await runner.run(input(handoff, {
    expectedRevision: state.revision,
    mode: "EXECUTE",
    approvalId: "runner-approval",
  }));
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(result.adapterResolved, true);
  assert.equal(result.initialReadPerformed, true);
  assert.equal(result.finalVerificationPerformed, true);
  assert.equal(result.pauseAiConfirmed, true);
  assert.equal(getAdapterResolutions(), 1);
  assert.deepEqual(adapter.calls, ["getConversationState", "pauseAi", "verifyFinalState", "getConversationState"]);
});

test("reference blockers fail closed before adapter resolution", async () => {
  for (const resolutionStatus of ["CONFIGURATION_MISSING", "CONFIGURATION_INACTIVE", "SCOPE_AMBIGUOUS"]) {
    const { store, handoff } = await fixture();
    const adapter = new FakeAdapter();
    const { runner, getAdapterResolutions } = createRunner(store, adapter, async () => ({
      ...reference,
      resolutionStatus,
      configurationPresent: resolutionStatus !== "CONFIGURATION_MISSING",
      configurationActive: false,
      scopeValid: false,
    }));
    const result = await runner.run(input(handoff));
    assert.equal(result.eligible, false);
    assert.equal(result.adapterResolved, false);
    assert.equal(getAdapterResolutions(), 0);
    assert.equal(adapter.calls.length, 0);
  }
});

test("operational runner resolves official structural scope and uses only mocked HTTP", async () => {
  const { store, handoff } = await fixture();
  const safeConfig = {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    accountId: "account-1",
    inboxId: "inbox-1",
    baseUrl: "http://chatwoot.mock",
    isActive: true,
    apiAccessTokenConfigured: true,
  };
  const resolvedConfig = { ...safeConfig, apiAccessToken: "mock-token", webhookSecret: null };
  const prisma = {
    assistantConversation: {
      findFirst: async () => ({
        source: "CHATWOOT",
        externalConversationId: "external-conversation-1",
        externalAccountId: "account-1",
        externalInboxId: "inbox-1",
      }),
    },
  };
  const configService = {
    list: async () => [safeConfig],
    resolveActiveForAssistantConversation: async () => resolvedConfig,
  };
  const calls = [];
  const sequence = [
    { ai_active: true, meta: { account: { id: "account-1" }, inbox: { id: "inbox-1" } } },
    {},
    { ai_active: false, meta: { account: { id: "account-1" }, inbox: { id: "inbox-1" } } },
  ];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ?? null });
    return new Response(JSON.stringify(sequence.shift()), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const runner = runnerModule.createOperationalControlledHandoffRunner({
    stateStore: store,
    prisma,
    chatwootInboxConfigService: configService,
    environment,
    now: () => now,
    adapterOptions: { fetchImpl, timeoutMs: 25, now: () => now },
  });
  const dryRun = await runner.run(input(handoff));
  assert.equal(dryRun.eligible, true);
  assert.equal(dryRun.adapterResolved, false);
  assert.equal(dryRun.credentialResolved, false);
  assert.equal(calls.length, 0);

  const approval = commandModule.createControlledExecutionApproval({
    approvalId: "runner-approval",
    handoff,
    expectedRevision: 2,
    issuedAt: now,
    expiresAt: new Date("2026-07-16T13:00:00.000Z"),
    nonceHash: "runner-nonce-hash",
    planHash: dryRun.planHash,
  });
  const withApproval = await store.save(
    { ...(await store.load(scope)), controlledExecutionApproval: approval, revision: 2 },
    1,
  );

  const result = await runner.run(input(handoff, {
    expectedRevision: withApproval.revision,
    mode: "EXECUTE",
    approvalId: "runner-approval",
  }));
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(result.adapterResolved, true);
  assert.equal(result.credentialResolved, true);
  assert.deepEqual(calls.map((call) => call.method), ["GET", "PUT", "GET"]);
  assert.deepEqual(JSON.parse(calls[1].body), { ai_active: false });
});

test("CLI source uses Nest application context and never imports main", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/runtime-v2-controlled-handoff-cli.ts", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes('from "./main"'), false);
  assert.equal(source.includes("createApplicationContext"), true);
  assert.equal(source.includes("createServer"), false);
});
