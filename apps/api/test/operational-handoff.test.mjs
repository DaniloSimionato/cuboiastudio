import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OPERATIONAL_HANDOFF_ID_ALGORITHM,
  OPERATIONAL_HANDOFF_REMOTE_STATE_SCHEMA_VERSION,
  OPERATIONAL_HANDOFF_SCHEMA_VERSION,
  createOperationalHandoffId,
  createOperationalHandoffIdempotencyKey,
  createOperationalHandoffPlan,
  parseChatwootOperationalHandoffState,
  resolveOperationalHandoffDestination,
  sanitizeOperationalHandoffErrorCode,
  verifyOperationalHandoffRemoteState,
} from "../dist/assistant-conversations/operational-handoff.js";
import {
  V1_OPERATIONAL_HANDOFF_EFFECT_SCHEMA_VERSION,
  V1TurnDecisionSealer,
} from "../dist/assistant-conversations/v1-turn-decision.js";
import {
  TURN_EXECUTION_HANDOFF_SCHEMA_VERSION,
  createTurnExecutionHandoffSummary,
  createTurnExecutionManifest,
  withTurnExecutionHandoff,
} from "../dist/assistant-conversations/turn-execution-manifest.js";

const observedAt = new Date("2026-07-25T12:00:00.000Z");

const controlSnapshot = Object.freeze({
  schemaVersion: "CONVERSATION_CONTROL_SNAPSHOT_V1",
  internalConversationId: "conversation-internal",
  currentContextVersion: 2,
  controlRevision: 7,
  aiActive: true,
  pausedByHuman: false,
  sessionState: "ACTIVE",
  derivedState: "ACTIVE",
  capturedAt: observedAt.toISOString(),
  snapshotSource: "LOCAL_DATABASE_ADMISSION",
  snapshotReason: "TURN_ADMISSION",
});

const remoteScope = Object.freeze({
  expectedConversationId: "conversation-external",
  expectedAccountId: "account-test",
  expectedInboxId: "inbox-test",
});

function parseRemoteState(overrides = {}) {
  return parseChatwootOperationalHandoffState(
    {
      id: remoteScope.expectedConversationId,
      account_id: remoteScope.expectedAccountId,
      inbox_id: remoteScope.expectedInboxId,
      ai_active: false,
      human_active: true,
      status: "open",
      assignee: { id: "agent-test" },
      team: { id: "team-test" },
      labels: ["support"],
      ...overrides,
    },
    { observedAt },
  );
}

function operationalDecisionDraft(overrides = {}) {
  const base = {
    turnExecutionId: "turn_v1_0123456789abcdef0123456789abcdef",
    contextVersion: 2,
    classification: {
      type: "OPERATIONAL_HANDOFF",
      terminalPath: "OPERATIONAL_HUMAN_HANDOFF",
      terminalReasonCode: "OPERATIONAL_HUMAN_HANDOFF",
      strategy: "OPERATIONAL_HUMAN_HANDOFF",
      providerDisposition: "PROHIBITED",
      legacyCapability: null,
    },
    response: {
      blocks: [{ ordinal: 1, content: "Transferindo para um atendente..." }],
      persistedContent: "Transferindo para um atendente...",
      persistence: {
        source: "chatwoot",
        mode: "manual",
        contextVersion: 2,
        sources: null,
      },
    },
    provider: {
      used: false,
      finalGenerationCount: 0,
      skipReason: "OPERATIONAL_HANDOFF_PROVIDER_PROHIBITED",
    },
    controlSnapshot,
    authority: null,
    effects: {
      persistLocalResponse: true,
      finalizeRuntimeLog: true,
      outboundIntended: true,
      sender: "CHATWOOT_V1",
      stateEffect: "BLOCK_AI_AND_HANDOFF",
      operationalHandoff: {
        schemaVersion: V1_OPERATIONAL_HANDOFF_EFFECT_SCHEMA_VERSION,
        operationRequired: true,
        localBlockRequired: true,
        remoteMutationRequired: true,
        remoteVerificationRequired: true,
        confirmationPrecondition: "REMOTE_STATE_VERIFIED",
        confirmationAllowedBeforeRemoteVerification: false,
        expectedPostBlockControl: {
          contextVersion: 2,
          controlRevision: 8,
          aiActive: false,
          pausedByHuman: true,
        },
      },
    },
    compatibility: {
      runtimeMode: "manual",
      runtimeReason: "OPERATIONAL_HUMAN_HANDOFF",
      expectedOutcome: "success",
    },
  };
  return { ...base, ...overrides };
}

test("IDs e plano de handoff são determinísticos, versionados e sem PII", () => {
  const identity = {
    turnExecutionId: "turn_v1_0123456789abcdef0123456789abcdef",
    decisionId: "decision_v1_0123456789abcdef0123456789abcdef",
    contextVersion: 2,
  };

  const firstOperationId = createOperationalHandoffId(identity);
  const secondOperationId = createOperationalHandoffId({ ...identity });
  const firstKey = createOperationalHandoffIdempotencyKey(identity);
  const secondKey = createOperationalHandoffIdempotencyKey({ ...identity });
  const plan = createOperationalHandoffPlan({
    ...identity,
    expectedControlRevision: 7,
    reasonCode: "CUSTOMER_REQUESTED_HUMAN",
  });

  assert.equal(firstOperationId, secondOperationId);
  assert.equal(firstKey, secondKey);
  assert.match(firstOperationId, /^handoff_v1_[a-f0-9]{32}$/);
  assert.match(firstKey, /^handoff_key_v1_[a-f0-9]{64}$/);
  assert.equal(OPERATIONAL_HANDOFF_ID_ALGORITHM, "sha256/assistant-operational-handoff-v1");
  assert.equal(plan.schemaVersion, OPERATIONAL_HANDOFF_SCHEMA_VERSION);
  assert.equal(plan.operationId, firstOperationId);
  assert.equal(plan.idempotencyKey, firstKey);
  assert.deepEqual(plan.desiredRemoteState, { aiActive: false });
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.desiredRemoteState), true);

  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /phone|telephone|content|authorization|bearer|prompt/i);
});

test("destino humano prioriza assignee, depois team, e falha fechado sem ambos", () => {
  const withBoth = resolveOperationalHandoffDestination(parseRemoteState());
  assert.equal(withBoth.resolution, "RESOLVED");
  assert.equal(withBoth.type, "EXISTING_ASSIGNEE");
  assert.equal(withBoth.assigneeId, "agent-test");
  assert.equal(withBoth.teamId, "team-test");

  const withTeam = resolveOperationalHandoffDestination(
    parseRemoteState({ assignee: null }),
  );
  assert.equal(withTeam.resolution, "RESOLVED");
  assert.equal(withTeam.type, "EXISTING_TEAM");
  assert.equal(withTeam.assigneeId, null);
  assert.equal(withTeam.teamId, "team-test");

  const unresolved = resolveOperationalHandoffDestination(
    parseRemoteState({ assignee: null, team: null }),
  );
  assert.deepEqual(unresolved, {
    resolution: "UNRESOLVED",
    type: "UNRESOLVED",
    assigneeId: null,
    teamId: null,
    inboxId: "inbox-test",
    reasonCode: "DESTINATION_UNRESOLVED",
    source: "CHATWOOT_CONVERSATION_READ",
  });
});

test("parser remoto conserva somente o estado técnico necessário e normalizado", () => {
  const state = parseChatwootOperationalHandoffState(
    {
      id: 42,
      account: { id: 106 },
      inbox: { id: 533 },
      custom_attributes: { ai_active: false },
      additional_attributes: { human_active: true },
      status: " OPEN ",
      meta: {
        assignee: { id: "agent-test" },
        team: { id: "team-test" },
        labels: ["one", "two"],
      },
      content: "SENSITIVE_CONTENT_SENTINEL",
      phone_number: "SENSITIVE_PHONE_SENTINEL",
      authorization: "SENSITIVE_AUTH_SENTINEL",
    },
    { observedAt },
  );

  assert.equal(state.schemaVersion, OPERATIONAL_HANDOFF_REMOTE_STATE_SCHEMA_VERSION);
  assert.equal(state.conversationId, "42");
  assert.equal(state.accountId, "106");
  assert.equal(state.inboxId, "533");
  assert.equal(state.aiActive, false);
  assert.equal(state.humanActive, true);
  assert.equal(state.status, "open");
  assert.equal(state.assigneeId, "agent-test");
  assert.equal(state.teamId, "team-test");
  assert.equal(state.observedAt, observedAt.toISOString());
  assert.match(state.stateFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(state), true);
  assert.doesNotMatch(
    JSON.stringify(state),
    /SENSITIVE_CONTENT_SENTINEL|SENSITIVE_PHONE_SENTINEL|SENSITIVE_AUTH_SENTINEL/,
  );
});

test("verificação exige scope, IA remota inativa, status compatível e destino resolvido", () => {
  const confirmedState = parseRemoteState();
  const confirmedDestination = resolveOperationalHandoffDestination(confirmedState);
  const confirmed = verifyOperationalHandoffRemoteState({
    state: confirmedState,
    destination: confirmedDestination,
    ...remoteScope,
  });

  assert.equal(confirmed.verified, true);
  assert.equal(confirmed.reasonCode, "REMOTE_HANDOFF_STATE_CONFIRMED");

  const cases = [
    {
      state: parseRemoteState({ id: "other-conversation" }),
      reasonCode: "CHATWOOT_CONVERSATION_MISMATCH",
    },
    {
      state: parseRemoteState({ account_id: "other-account" }),
      reasonCode: "CHATWOOT_ACCOUNT_MISMATCH",
    },
    {
      state: parseRemoteState({ inbox_id: "other-inbox" }),
      reasonCode: "CHATWOOT_INBOX_MISMATCH",
    },
    {
      state: parseRemoteState({ ai_active: true }),
      reasonCode: "CHATWOOT_AI_ACTIVE_NOT_CONFIRMED_INACTIVE",
    },
    {
      state: parseRemoteState({ status: "resolved" }),
      reasonCode: "CHATWOOT_STATUS_NOT_HANDOFF_COMPATIBLE",
    },
    {
      state: parseRemoteState({ assignee: null, team: null }),
      reasonCode: "DESTINATION_UNRESOLVED",
    },
  ];

  for (const item of cases) {
    const destination = resolveOperationalHandoffDestination(item.state);
    const result = verifyOperationalHandoffRemoteState({
      state: item.state,
      destination,
      ...remoteScope,
    });
    assert.equal(result.verified, false);
    assert.equal(result.reasonCode, item.reasonCode);
  }
});

test("erros de handoff são reduzidos a códigos técnicos sanitizados", () => {
  assert.equal(sanitizeOperationalHandoffErrorCode({ status: 422 }), "HTTP_422");
  assert.equal(
    sanitizeOperationalHandoffErrorCode({ code: "econnrefused" }),
    "ECONNREFUSED",
  );
  assert.equal(
    sanitizeOperationalHandoffErrorCode(
      new Error("Authorization: Bearer SENSITIVE_SECRET_SENTINEL"),
    ),
    "OPERATIONAL_HANDOFF_FAILED",
  );
  assert.equal(
    sanitizeOperationalHandoffErrorCode("REMOTE_VERIFICATION_FAILED"),
    "REMOTE_VERIFICATION_FAILED",
  );
});

test("decisão operacional é única, imutável e condiciona confirmação à verificação remota", () => {
  const decision = new V1TurnDecisionSealer().seal(operationalDecisionDraft());

  assert.equal(decision.classification.type, "OPERATIONAL_HANDOFF");
  assert.equal(decision.classification.terminalPath, "OPERATIONAL_HUMAN_HANDOFF");
  assert.equal(decision.classification.providerDisposition, "PROHIBITED");
  assert.equal(decision.provider.used, false);
  assert.equal(decision.provider.finalGenerationCount, 0);
  assert.equal(decision.effects.stateEffect, "BLOCK_AI_AND_HANDOFF");
  assert.equal(decision.effects.operationalHandoff.operationRequired, true);
  assert.equal(
    decision.effects.operationalHandoff.confirmationPrecondition,
    "REMOTE_STATE_VERIFIED",
  );
  assert.equal(
    decision.effects.operationalHandoff.confirmationAllowedBeforeRemoteVerification,
    false,
  );
  assert.deepEqual(decision.effects.operationalHandoff.expectedPostBlockControl, {
    contextVersion: 2,
    controlRevision: 8,
    aiActive: false,
    pausedByHuman: true,
  });
  assert.equal(Object.isFrozen(decision), true);
  assert.equal(Object.isFrozen(decision.effects), true);
  assert.equal(Object.isFrozen(decision.effects.operationalHandoff), true);
  assert.equal(
    Object.isFrozen(decision.effects.operationalHandoff.expectedPostBlockControl),
    true,
  );
  assert.throws(() => {
    decision.effects.operationalHandoff.expectedPostBlockControl.controlRevision = 9;
  }, TypeError);

  assert.throws(
    () =>
      new V1TurnDecisionSealer().seal(
        operationalDecisionDraft({
          effects: {
            ...operationalDecisionDraft().effects,
            operationalHandoff: null,
          },
        }),
      ),
    /V1_OPERATIONAL_HANDOFF_EFFECT_REQUIRED/,
  );
  assert.throws(
    () =>
      new V1TurnDecisionSealer().seal(
        operationalDecisionDraft({
          effects: {
            ...operationalDecisionDraft().effects,
            operationalHandoff: {
              ...operationalDecisionDraft().effects.operationalHandoff,
              expectedPostBlockControl: {
                ...operationalDecisionDraft().effects.operationalHandoff
                  .expectedPostBlockControl,
                controlRevision: 7,
              },
            },
          },
        }),
      ),
    /V1_OPERATIONAL_HANDOFF_POST_BLOCK_CONTROL_INVALID/,
  );
});

test("manifesto registra somente resumo sanitizado da operação de handoff", () => {
  const base = createTurnExecutionManifest({
    identity: {
      companyId: "company-test",
      assistantId: "assistant-test",
      source: "chatwoot",
      accountId: "account-test",
      inboxId: "inbox-test",
      externalConversationId: "conversation-external",
      externalMessageId: "message-external",
      contextVersion: 2,
      internalConversationId: "conversation-internal",
      internalMessageId: "message-internal",
    },
    requestId: "request-test",
    correlationId: "correlation-test",
    aiActive: true,
    pausedByHuman: false,
    sessionState: "ACTIVE",
    capturedAt: observedAt.toISOString(),
    fragmentCount: 1,
    fragmentIdentityCoverage: "COMPLETE",
    normalizedContentHash: "content_hash_test",
    normalizedContentLength: 31,
  });
  const summary = createTurnExecutionHandoffSummary({
    operationId: "handoff_v1_0123456789abcdef0123456789abcdef",
    status: "REMOTE_CONFIRMED",
    expectedContextVersion: 2,
    expectedControlRevision: 7,
  });
  const manifest = withTurnExecutionHandoff(base, {
    ...summary,
    destination: {
      resolution: "RESOLVED",
      type: "ASSIGNEE",
      referenceHash: "destination_ref_0123456789abcdef",
    },
    postBlockControlRevision: 8,
    localBlockResult: "CONFIRMED",
    remoteMutation: {
      attempted: true,
      attemptCount: 1,
      result: "ACKNOWLEDGED",
      errorCode: null,
    },
    remoteVerification: {
      attempted: true,
      result: "CONFIRMED",
      verifiedAt: observedAt.toISOString(),
    },
    confirmation: {
      authorized: true,
      decisionId: "decision_v1_0123456789abcdef0123456789abcdef",
      deliveryId: "delivery-test",
      result: "PENDING",
    },
    blockingReason: null,
  });

  assert.equal(manifest.handoff.schemaVersion, TURN_EXECUTION_HANDOFF_SCHEMA_VERSION);
  assert.equal(manifest.handoff.status, "REMOTE_CONFIRMED");
  assert.equal(manifest.handoff.destination.type, "ASSIGNEE");
  assert.equal(manifest.handoff.postBlockControlRevision, 8);
  assert.equal(manifest.handoff.confirmation.authorized, true);
  assert.notEqual(manifest.handoff, summary);
  assert.notEqual(manifest.handoff.destination, summary.destination);

  const serialized = JSON.stringify(manifest.handoff);
  assert.doesNotMatch(
    serialized,
    /"(?:phone|telephone|content|authorization|prompt|fullKnowledge|knowledgeContent)"\s*:|bearer|SENSITIVE_/i,
  );
});
