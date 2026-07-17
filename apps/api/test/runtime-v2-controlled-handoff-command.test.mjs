import assert from "node:assert/strict";
import test from "node:test";

const runtime = await import("../dist/runtime-v2/index.js");
const commandModule = await import("../dist/runtime-v2/controlled-handoff-command.js");
const executorModule = await import("../dist/runtime-v2/chatwoot-handoff-executor.js");

const now = new Date("2026-07-16T12:00:00.000Z");
const scope = {
  companyId: "command-company",
  assistantId: "command-assistant",
  conversationId: "command-conversation",
  contactId: null,
  contextVersion: 1,
  runtimeVersion: "V2",
  mode: "SHADOW",
};
const controlledEnvironment = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: scope.conversationId,
  RUNTIME_V2_HANDOFF_STATE_MODE: "SHADOW_STATE",
  RUNTIME_V2_HANDOFF_EXECUTION_MODE: "CONTROLLED",
  RUNTIME_V2_HANDOFF_ADAPTER_MODE: "CHATWOOT_CONTROLLED",
  RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS: scope.assistantId,
  RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS: scope.conversationId,
};
const structuralReference = {
  companyId: scope.companyId,
  assistantId: scope.assistantId,
  internalConversationId: scope.conversationId,
  contextVersion: scope.contextVersion,
  channelBindingPresent: true,
  configurationPresent: true,
  configurationActive: true,
  accountScopeHash: "account-scope-hash",
  inboxScopeHash: "inbox-scope-hash",
  externalConversationReferenceHash: "conversation-scope-hash",
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
    contextVersion: scope.contextVersion,
    internalMessageId: "command-message-1",
    flowId: "flow-handoff",
    handoffPendingObserved: true,
    reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    customerRequested: true,
    humanActiveObserved: false,
    aiActiveObserved: true,
    pausedByHumanObserved: false,
    requestedTargetType: "ANY_HUMAN",
    requestedTargetIdHash: null,
    collectedContextKeys: ["customer_requested_human"],
    contextHash: "context-hash",
    provenance: {
      source: "V1_PIPELINE",
      sourceMessageId: "command-message-1",
      sourceFlowId: "flow-handoff",
      sourceVersion: "command-test",
      reasonCode: "CUSTOMER_REQUESTED_HUMAN",
    },
  });
}

async function fixture({ approval = false, handoffOverrides = {}, stateOverrides = {} } = {}) {
  const store = new runtime.InMemoryConversationStateStore();
  const handoffTurn = runtime.applyHandoffTurn({
    scope,
    state: runtime.createEmptyRuntimeHandoffState(now),
    observation: { ...observation(), ...handoffOverrides.observation },
    currentTime: now,
    internalMessageId: "command-message-1",
  });
  const handoff = { ...handoffTurn.after.activeHandoff, ...handoffOverrides };
  const base = runtime.createEmptyConversationState(scope, now);
  await store.create(base);
  let state = await store.save(
    {
      ...base,
      handoffState: { ...handoffTurn.after, activeHandoff: handoff },
      revision: 1,
      lastProcessedMessageId: "command-message-1",
      ...stateOverrides,
    },
    0,
  );
  if (approval) {
    const approvalState = commandModule.createControlledExecutionApproval({
      approvalId: "approval-1",
      handoff,
      expectedRevision: state.revision + 1,
      issuedAt: now,
      expiresAt: new Date("2026-07-16T13:00:00.000Z"),
      nonceHash: "nonce-hash-only",
      planHash: commandModule.createControlledHandoffPlanHash(handoff, now, structuralReference),
    });
    state = await store.save(
      { ...state, controlledExecutionApproval: approvalState, revision: state.revision + 1 },
      state.revision,
    );
  }
  return { store, state, handoff };
}

class FakeAdapter {
  constructor({ aiActive = true, humanActive = false, timeoutAfterMutation = false } = {}) {
    this.state = {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      contactId: null,
      contextVersion: scope.contextVersion,
      inboxMatches: true,
      configReady: true,
      aiActive,
      humanActive,
      labelApplied: false,
      teamAssigned: false,
      agentAssigned: false,
      finalStateVerified: true,
    };
    this.calls = [];
    this.timeoutAfterMutation = timeoutAfterMutation;
  }
  async getConversationState() {
    this.calls.push("getConversationState");
    return { ...this.state };
  }
  async pauseAi() {
    this.calls.push("pauseAi");
    this.state.aiActive = false;
    if (this.timeoutAfterMutation) {
      throw new executorModule.ChatwootHandoffAdapterError(
        "HANDOFF_TIMEOUT_UNKNOWN_EFFECT",
        "AFTER_MUTATION",
        true,
      );
    }
  }
  async applyLabel() {
    this.calls.push("applyLabel");
    throw new Error("DISABLED_OPERATION_MUST_NOT_BE_CALLED");
  }
  async assignTeam() {
    this.calls.push("assignTeam");
    throw new Error("DISABLED_OPERATION_MUST_NOT_BE_CALLED");
  }
  async assignAgent() {
    this.calls.push("assignAgent");
    throw new Error("DISABLED_OPERATION_MUST_NOT_BE_CALLED");
  }
  async verifyFinalState() {
    this.calls.push("verifyFinalState");
    return { ...this.state };
  }
  async reconcile() {
    this.calls.push("reconcile");
    return { ...this.state };
  }
}

function input(handoff, overrides = {}) {
  return {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    contextVersion: scope.contextVersion,
    handoffId: handoff.handoffId,
    expectedRevision: 1,
    ...overrides,
  };
}

function command(store, environment = controlledEnvironment, adapter = null, clock = now) {
  return new commandModule.RuntimeV2ControlledHandoffCommand({
    stateStore: store,
    resolveConfigurationReference: async () => ({
      ...structuralReference,
    }),
    environment,
    now: () => new Date(clock),
    resolveAdapter: adapter ? async () => adapter : undefined,
  });
}

test("default mode is DRY_RUN and performs no external read or state write", async () => {
  const { store, state, handoff } = await fixture();
  const adapter = new FakeAdapter();
  const result = await command(store, controlledEnvironment, adapter).run(input(handoff));
  assert.equal(result.mode, "DRY_RUN");
  assert.equal(result.status, "DRY_RUN_APPROVED");
  assert.equal(result.eligible, true);
  assert.equal(result.externalReadPerformed, false);
  assert.equal(result.credentialResolved, false);
  assert.equal(result.revisionAfter, null);
  assert.equal(result.revisionChanged, false);
  assert.equal("executionId" in result, false);
  assert.equal(result.operationalExecutionCreated, false);
  assert.equal(result.commandId.length > 0, true);
  assert.equal(result.planHash.length > 0, true);
  assert.deepEqual(adapter.calls, []);
  assert.equal((await store.load(scope)).revision, state.revision);
});

test("equivalent DRY_RUN calls have the same plan identity and no operational identity", async () => {
  const { store, handoff } = await fixture();
  const first = await command(store).run(input(handoff));
  const second = await command(store).run(input(handoff));
  assert.equal(first.mode, "DRY_RUN");
  assert.equal(second.mode, "DRY_RUN");
  assert.equal(first.planHash, second.planHash);
  assert.equal(first.commandId, second.commandId);
  assert.equal("executionId" in first, false);
  assert.equal("executionId" in second, false);
  assert.equal(first.operationalExecutionCreated, false);
  assert.equal(second.operationalExecutionCreated, false);
  assert.equal(first.revisionAfter, null);
  assert.equal(second.revisionAfter, null);
  assert.equal(first.revisionChanged, false);
  assert.equal(second.revisionChanged, false);
  assert.equal((await store.load(scope)).controlledExecution, null);
});

test("flags OFF, missing approval and allowlist mismatches fail closed", async () => {
  const { store, handoff } = await fixture();
  const adapter = new FakeAdapter();
  const off = await command(store, {}, adapter).run(input(handoff, { mode: "EXECUTE", approvalId: "approval-1" }));
  assert.equal(off.resultCode, "CONTROLLED_HANDOFF_DISABLED");
  assert.deepEqual(adapter.calls, []);

  const missing = await command(store, controlledEnvironment, adapter).run(
    input(handoff, { mode: "EXECUTE" }),
  );
  assert.equal(missing.resultCode, "CONTROLLED_HANDOFF_APPROVAL_REQUIRED");

  const notAllowed = await command(
    store,
    { ...controlledEnvironment, RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS: "other" },
    adapter,
  ).run(input(handoff));
  assert.equal(notAllowed.status, "DRY_RUN_BLOCKED");
  assert.ok(notAllowed.blockers.includes("CONTROLLED_HANDOFF_NOT_ALLOWLISTED"));
});

test("exact handoff, context and revision are required", async () => {
  const { store, handoff } = await fixture();
  const run = (overrides) => command(store).run(input(handoff, overrides));
  assert.equal((await run({ handoffId: "other" })).resultCode, "CONTROLLED_HANDOFF_HANDOFF_ID_MISMATCH");
  assert.equal((await run({ contextVersion: 2 })).resultCode, "CONTROLLED_HANDOFF_SCOPE_MISMATCH");
  assert.equal((await run({ expectedRevision: 99 })).resultCode, "CONTROLLED_HANDOFF_REVISION_MISMATCH");
  assert.equal((await run({ mode: "EXECUTE", approvalId: "approval-1" })).resultCode, "CONTROLLED_HANDOFF_APPROVAL_REQUIRED");
});

test("TEAM target is rejected because the one-shot plan is PAUSE_AI_ONLY", async () => {
  const { store, handoff } = await fixture({ handoffOverrides: { requestedTargetType: "TEAM", requestedTargetIdHash: "team-hash" } });
  const result = await command(store).run(input(handoff));
  assert.equal(result.status, "DRY_RUN_BLOCKED");
  assert.ok(result.blockers.includes("CONTROLLED_HANDOFF_PLAN_CONTAINS_DISABLED_OPERATION"));
});

test("EXECUTE consumes approval once and pauses AI through the fake adapter", async () => {
  const { store, state, handoff } = await fixture({ approval: true });
  const adapter = new FakeAdapter();
  const result = await command(store, controlledEnvironment, adapter).run(
    input(handoff, { expectedRevision: state.revision, mode: "EXECUTE", approvalId: "approval-1" }),
  );
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(result.pauseAiAttempted, true);
  assert.equal(result.pauseAiConfirmed, true);
  assert.equal(result.externalReadPerformed, true);
  assert.equal(result.externalMutationPerformed, true);
  assert.equal(result.externalEffectMayHaveOccurred, false);
  assert.equal(result.executionId.length > 0, true);
  assert.equal(result.operationalExecutionCreated, true);
  assert.equal(result.revisionChanged, true);
  assert.equal(adapter.calls.filter((call) => call === "pauseAi").length, 1);
  assert.equal(adapter.calls.includes("applyLabel"), false);
  assert.equal(adapter.calls.includes("assignTeam"), false);
  assert.equal(adapter.calls.includes("assignAgent"), false);
  const persisted = await store.load(scope);
  assert.equal(persisted.handoffState.activeHandoff, null);
  assert.equal(persisted.handoffState.recentTerminalHandoffs[0].finalStatus, "HANDOFF_SUCCEEDED");
  assert.equal(persisted.controlledExecutionApproval.status, "CONSUMED");
  assert.equal(persisted.controlledExecution.status, "SUCCEEDED");
  assert.equal(persisted.controlledExecution.eventIds.length, 3);
  assert.equal(JSON.stringify(persisted).includes("payload"), false);

  const duplicate = await command(store, controlledEnvironment, adapter).run(
    input(handoff, { expectedRevision: persisted.revision, mode: "EXECUTE", approvalId: "approval-1" }),
  );
  assert.equal(duplicate.resultCode, "CONTROLLED_HANDOFF_EXECUTION_DUPLICATE");
  assert.equal(adapter.calls.filter((call) => call === "pauseAi").length, 1);
});

test("already paused and human-active paths do not mutate", async () => {
  for (const adapter of [new FakeAdapter({ aiActive: false }), new FakeAdapter({ humanActive: true })]) {
    const { store, state, handoff } = await fixture({ approval: true });
    const result = await command(store, controlledEnvironment, adapter).run(
      input(handoff, { expectedRevision: state.revision, mode: "EXECUTE", approvalId: "approval-1" }),
    );
    assert.equal(result.status, adapter.state.humanActive ? "HUMAN_ALREADY_ACTIVE" : "ALREADY_COMPLETED");
    assert.equal(adapter.calls.includes("pauseAi"), false);
  }
});

test("timeout after possible mutation requires reconciliation and no automatic retry", async () => {
  const { store, state, handoff } = await fixture({ approval: true });
  const adapter = new FakeAdapter({ timeoutAfterMutation: true });
  const result = await command(store, controlledEnvironment, adapter).run(
    input(handoff, { expectedRevision: state.revision, mode: "EXECUTE", approvalId: "approval-1" }),
  );
  assert.equal(result.status, "TIMED_OUT_UNKNOWN_EFFECT");
  assert.equal(result.reconciliationRequired, true);
  assert.equal(result.externalEffectMayHaveOccurred, true);
  assert.equal(adapter.calls.filter((call) => call === "pauseAi").length, 1);
  assert.equal(adapter.calls.filter((call) => call === "getConversationState").length, 1);
});

test("approval expiry and consumption are rejected before adapter access", async () => {
  const expired = await fixture({ approval: true });
  const expiredState = await expired.store.load(scope);
  const expiredApproval = {
    ...expiredState.controlledExecutionApproval,
    expiresAt: now.toISOString(),
  };
  await expired.store.save({ ...expiredState, controlledExecutionApproval: expiredApproval, revision: expiredState.revision + 1 }, expiredState.revision);
  const expiredResult = await command(expired.store, controlledEnvironment, new FakeAdapter()).run(
    input(expired.handoff, { expectedRevision: expiredState.revision + 1, mode: "EXECUTE", approvalId: "approval-1" }),
  );
  assert.equal(expiredResult.resultCode, "CONTROLLED_HANDOFF_APPROVAL_EXPIRED");

  const consumed = await fixture({ approval: true });
  const consumedState = await consumed.store.load(scope);
  await consumed.store.save({ ...consumedState, controlledExecutionApproval: { ...consumedState.controlledExecutionApproval, status: "CONSUMED" }, revision: consumedState.revision + 1 }, consumedState.revision);
  const consumedResult = await command(consumed.store, controlledEnvironment, new FakeAdapter()).run(
    input(consumed.handoff, { expectedRevision: consumedState.revision + 1, mode: "EXECUTE", approvalId: "approval-1" }),
  );
  assert.equal(consumedResult.resultCode, "CONTROLLED_HANDOFF_APPROVAL_ALREADY_CONSUMED");
});

test("two EXECUTE calls have one winning revision and one adapter mutation", async () => {
  const { store, state, handoff } = await fixture({ approval: true });
  const adapter = new FakeAdapter();
  const make = () => command(store, controlledEnvironment, adapter).run(
    input(handoff, { expectedRevision: state.revision, mode: "EXECUTE", approvalId: "approval-1" }),
  );
  const results = await Promise.all([make(), make()]);
  assert.equal(results.filter((result) => result.status === "SUCCEEDED").length, 1);
  assert.equal(results.filter((result) => result.resultCode === "CONTROLLED_HANDOFF_REVISION_MISMATCH").length, 1);
  assert.equal(adapter.calls.filter((call) => call === "pauseAi").length, 1);
});

test("entrypoint remains internal and is not wired into the normal API bootstrap", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/main.ts", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes("runControlledHandoffCli"), false);
  assert.equal(source.includes("RuntimeV2ControlledHandoffCommand"), false);
});

test("controlled audit event identity is deterministic and metadata-only", () => {
  const event = commandModule.createControlledHandoffCommandEvent({
    eventType: "CONTROLLED_HANDOFF_DRY_RUN",
    commandId: "command-id",
    handoffId: "handoff-id",
    scope,
    previousStatus: "HANDOFF_READY",
    nextStatus: "HANDOFF_READY",
    timestamp: now,
    reason: "CUSTOMER_REQUESTED_HUMAN",
    metadata: { operation: "PAUSE_AI_ONLY" },
  });
  const duplicate = commandModule.createControlledHandoffCommandEvent({
    eventType: "CONTROLLED_HANDOFF_DRY_RUN",
    commandId: "command-id",
    handoffId: "handoff-id",
    scope,
    previousStatus: "HANDOFF_READY",
    nextStatus: "HANDOFF_READY",
    timestamp: new Date("2026-07-16T12:30:00.000Z"),
    reason: "CUSTOMER_REQUESTED_HUMAN",
    metadata: { operation: "PAUSE_AI_ONLY" },
  });
  assert.equal(event.eventId, duplicate.eventId);
  assert.equal(event.redactionApplied, true);
  assert.equal(JSON.stringify(event).includes("token"), false);
});

test("CLI requires exact scope arguments and defaults mode to DRY_RUN", async () => {
  const cli = await import("../dist/runtime-v2-controlled-handoff-cli.js");
  const parsed = cli.parseControlledHandoffArguments([
    "--company-id", "company",
    "--assistant-id", "assistant",
    "--conversation-id", "conversation",
    "--context-version", "1",
    "--handoff-id", "handoff",
    "--expected-revision", "2",
  ]);
  assert.equal(parsed.mode, "DRY_RUN");
  assert.throws(
    () => cli.parseControlledHandoffArguments([
      "--company-id", "company",
      "--assistant-id", "assistant",
      "--conversation-id", "conversation",
      "--context-version", "1",
      "--handoff-id", "handoff",
      "--expected-revision", "2",
      "--mode", "EXECUTE",
    ]),
    /CONTROLLED_HANDOFF_APPROVAL_REQUIRED/,
  );
});
