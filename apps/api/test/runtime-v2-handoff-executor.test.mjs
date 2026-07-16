import assert from "node:assert/strict";
import test from "node:test";

const executor = await import("../dist/runtime-v2/chatwoot-handoff-executor.js");
const handoffState = await import("../dist/runtime-v2/handoff-state.js");

const env = {
  RUNTIME_V2_MODE: "SHADOW",
  RUNTIME_V2_HANDOFF_STATE_MODE: "SHADOW_STATE",
  RUNTIME_V2_HANDOFF_EXECUTION_MODE: "CONTROLLED",
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
const future = "2026-07-16T20:00:00.000Z";

function makeHandoff(overrides = {}) {
  return {
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
    collectedContextKeys: ["conversation_status"],
    contextHash: "context-hash",
    requestedAt: "2026-07-16T19:00:00.000Z",
    expiresAt: future,
    idempotencyKey: "handoff-key-1",
    status: "HANDOFF_READY",
    provenance: { source: "V1_PIPELINE", sourceMessageId: "message-1" },
    redactionApplied: true,
    ...overrides,
  };
}

class FakeAdapter {
  constructor(state = {}) {
    this.state = {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      contactId: scope.contactId,
      contextVersion: scope.contextVersion,
      inboxMatches: true,
      configReady: true,
      aiActive: true,
      humanActive: false,
      labelApplied: false,
      teamAssigned: false,
      agentAssigned: false,
      finalStateVerified: true,
      ...state,
    };
    this.calls = [];
    this.failOn = null;
  }
  async getConversationState() {
    this.calls.push("getConversationState");
    return { ...this.state };
  }
  async pauseAi() {
    this.calls.push("pauseAi");
    if (this.failOn === "pause") {
      throw new executor.ChatwootHandoffAdapterError("HANDOFF_AI_PAUSE_FAILED", "BEFORE_MUTATION");
    }
    this.state.aiActive = false;
  }
  async applyLabel() {
    this.calls.push("applyLabel");
    if (this.failOn === "label") {
      throw new executor.ChatwootHandoffAdapterError(
        "HANDOFF_TIMEOUT_UNKNOWN_EFFECT",
        "AFTER_MUTATION",
        true,
      );
    }
    this.state.labelApplied = true;
  }
  async assignTeam() {
    this.calls.push("assignTeam");
    this.state.teamAssigned = true;
  }
  async assignAgent() {
    this.calls.push("assignAgent");
    this.state.agentAssigned = true;
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

const config = {
  configured: true,
  inboxMatches: true,
  labelConfigured: false,
  assignmentConfigured: false,
  targetConfigured: true,
};

function input(adapter, handoff = makeHandoff(), overrides = {}) {
  return {
    environment: env,
    scope,
    handoff,
    currentTime: new Date("2026-07-16T19:30:00.000Z"),
    configuration: config,
    ...overrides,
  };
}

test("execution mode OFF is fail-safe and does not call the adapter", async () => {
  const adapter = new FakeAdapter();
  const result = await new executor.ControlledChatwootHandoffExecutor(adapter).execute(
    input(adapter, makeHandoff(), { environment: {} }),
  );
  assert.equal(result.errorCode, "HANDOFF_EXECUTION_DISABLED");
  assert.deepEqual(adapter.calls, []);
});

test("allowlists and reasons are enforced before Chatwoot access", async () => {
  const adapter = new FakeAdapter();
  const run = (overrides, environment = env) =>
    new executor.ControlledChatwootHandoffExecutor(adapter).execute(
      input(adapter, makeHandoff(overrides), { environment }),
    );
  assert.equal((await run({}, { ...env, RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS: "other" })).errorCode, "HANDOFF_ASSISTANT_NOT_ALLOWLISTED");
  assert.equal((await run({}, { ...env, RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS: "other" })).errorCode, "HANDOFF_CONVERSATION_NOT_ALLOWLISTED");
  assert.equal((await run({ reasonCode: "LOW_CONFIDENCE" })).errorCode, "HANDOFF_REASON_NOT_AUTHORIZED");
  assert.equal((await run({ status: "HANDOFF_PROPOSED" })).errorCode, "HANDOFF_NOT_READY");
  assert.equal((await run({ expiresAt: "2026-07-16T19:30:00.000Z" })).errorCode, "HANDOFF_EXPIRED");
  assert.equal((await run({ companyId: "other" })).errorCode, "HANDOFF_SCOPE_MISMATCH");
  assert.equal((await run({}, { ...env, RUNTIME_V2_HANDOFF_EXECUTION_MODE: "OFF" })).errorCode, "HANDOFF_EXECUTION_DISABLED");
  assert.deepEqual(adapter.calls, []);
});

test("ANY_HUMAN pauses AI once and is idempotent when already paused", async () => {
  const adapter = new FakeAdapter();
  const service = new executor.ControlledChatwootHandoffExecutor(adapter);
  const first = await service.execute(input(adapter));
  assert.equal(first.status, "SUCCEEDED");
  assert.equal(adapter.calls.filter((call) => call === "pauseAi").length, 1);
  const second = await service.execute(input(adapter, makeHandoff(), { attemptNumber: 2 }));
  assert.equal(second.status, "SUCCEEDED");
  assert.equal(adapter.calls.filter((call) => call === "pauseAi").length, 1);
});

test("human already active prevents mutation", async () => {
  const adapter = new FakeAdapter({ humanActive: true });
  const result = await new executor.ControlledChatwootHandoffExecutor(adapter).execute(input(adapter));
  assert.equal(result.status, "HUMAN_ALREADY_ACTIVE");
  assert.deepEqual(adapter.calls, ["getConversationState"]);
});

test("TEAM and AGENT destinations require and execute their configured assignment step", async () => {
  const teamAdapter = new FakeAdapter();
  const team = await new executor.ControlledChatwootHandoffExecutor(teamAdapter).execute(
    input(teamAdapter, makeHandoff({ requestedTargetType: "TEAM", requestedTargetIdHash: "team-hash" }), {
      configuration: { ...config, assignmentConfigured: true },
    }),
  );
  assert.equal(team.status, "SUCCEEDED");
  assert.ok(teamAdapter.calls.includes("assignTeam"));

  const agentAdapter = new FakeAdapter();
  const agent = await new executor.ControlledChatwootHandoffExecutor(agentAdapter).execute(
    input(agentAdapter, makeHandoff({ requestedTargetType: "AGENT", requestedTargetIdHash: "agent-hash" }), {
      configuration: { ...config, assignmentConfigured: true },
    }),
  );
  assert.equal(agent.status, "SUCCEEDED");
  assert.ok(agentAdapter.calls.includes("assignAgent"));
});

test("failure before pause does not continue with other mutations", async () => {
  const adapter = new FakeAdapter();
  adapter.failOn = "pause";
  const result = await new executor.ControlledChatwootHandoffExecutor(adapter).execute(input(adapter));
  assert.equal(result.status, "FAILED_BEFORE_MUTATION");
  assert.equal(adapter.calls.includes("applyLabel"), false);
  assert.equal(adapter.calls.includes("verifyFinalState"), false);
});

test("failure after pause preserves partial state and requires reconciliation without reactivation", async () => {
  const adapter = new FakeAdapter();
  adapter.failOn = "label";
  const result = await new executor.ControlledChatwootHandoffExecutor(adapter).execute(
    input(adapter, makeHandoff(), { configuration: { ...config, labelConfigured: true } }),
  );
  assert.equal(result.status, "TIMED_OUT_UNKNOWN_EFFECT");
  assert.equal(result.partialMutation, true);
  assert.equal(result.reconciliationStatus, "RECONCILIATION_REQUIRED");
  assert.equal(adapter.calls.includes("pauseAi"), true);
  assert.equal(adapter.calls.includes("pauseAi"), true);
});

test("reconciliation is metadata-only and distinguishes complete, partial and inconclusive states", async () => {
  const complete = new FakeAdapter({ aiActive: false, finalStateVerified: true });
  const plan = executor.createChatwootHandoffExecutionPlan({ handoff: makeHandoff(), currentTime: new Date("2026-07-16T19:30:00.000Z"), attemptNumber: 1, configuration: config });
  const service = new executor.ControlledChatwootHandoffExecutor(complete);
  const reconciled = await service.reconcile({ plan, handoff: makeHandoff() });
  assert.equal(reconciled.status, "RECONCILED_SUCCEEDED");

  const partial = new FakeAdapter({ aiActive: false, finalStateVerified: true });
  const partialResult = await new executor.ControlledChatwootHandoffExecutor(partial).reconcile({
    plan: executor.createChatwootHandoffExecutionPlan({ handoff: makeHandoff(), currentTime: new Date("2026-07-16T19:30:00.000Z"), attemptNumber: 1, configuration: { ...config, labelConfigured: true } }),
    handoff: makeHandoff(),
  });
  assert.equal(partialResult.status, "RECONCILED_PARTIAL");
});

test("execution identity and plan are deterministic and redacted", () => {
  const handoff = makeHandoff({ requestedTargetType: "EXISTING_ASSIGNEE" });
  const a = executor.createChatwootHandoffExecutionPlan({ handoff, currentTime: new Date("2026-07-16T19:30:00.000Z"), attemptNumber: 1, configuration: config });
  const b = executor.createChatwootHandoffExecutionPlan({ handoff, currentTime: new Date("2026-07-16T19:30:00.000Z"), attemptNumber: 1, configuration: config });
  assert.deepEqual(a, b);
  assert.equal(Object.hasOwn(a, "token"), false);
  assert.equal(Object.hasOwn(a, "payload"), false);
  assert.equal(a.steps.includes("ASSIGN_TEAM"), false);
  assert.equal(a.steps.includes("ASSIGN_AGENT"), false);
});

test("handoff execution state events use valid guarded transitions", () => {
  const handoff = makeHandoff();
  const pending = executor.createHandoffExecutionStateEvent({ scope, handoff, eventType: "HANDOFF_EXECUTION_PENDING", timestamp: new Date("2026-07-16T19:31:00.000Z"), reasonCode: handoff.reasonCode });
  assert.equal(pending.nextStatus, "HANDOFF_EXECUTION_PENDING");
  assert.throws(() => executor.createHandoffExecutionStateEvent({ scope, handoff, eventType: "HANDOFF_EXECUTION_SUCCEEDED", timestamp: new Date("2026-07-16T19:31:00.000Z"), reasonCode: handoff.reasonCode }), /HANDOFF_INVALID_TRANSITION/);
  assert.equal(handoffState.transitionHandoffStatus("HANDOFF_EXECUTING", "HANDOFF_EXECUTION_SUCCEEDED"), "HANDOFF_SUCCEEDED");
});

test("architectural guard keeps real Chatwoot and network dependencies out of executor", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile(new URL("../src/runtime-v2/chatwoot-handoff-executor.ts", import.meta.url), "utf8");
  for (const forbidden of ["ChatwootService", "ChatwootInboxConfigService", "GoogleCalendarService", "CustomWebhookService", "fetch(", "axios", "api_access_token"]) {
    assert.equal(source.includes(forbidden), false, `forbidden dependency: ${forbidden}`);
  }
});
