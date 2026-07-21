import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { buildOfficialBusinessContext } from "../dist/assistants/official-business-context.js";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";
import { hashCanonicalInboundMessageContent } from "../dist/inbound/canonical-inbound-message.js";
import { ResponseGenerationRouter } from "../dist/assistant-conversations/response-generation-router.js";
import { ResponseTailLifecycleHooks } from "../dist/assistant-conversations/response-tail-lifecycle-hooks.js";
import { RuntimeV2PrimaryResponseExecutor } from "../dist/assistant-conversations/v2-primary-response-executor.js";
import { RuntimeV2ResponseExecutionAdministrationService } from "../dist/runtime-v2/response-execution-administration.js";
import {
  ConversationStateResponseExecutionStore,
  PrismaConversationStateStore,
  RuntimeV2ResponseExecutionCoordinator,
  createRuntimeV2ResponseExecutionApproval,
  resolveResponseExecutionIntent,
  serializeConversationState,
} from "../dist/runtime-v2/index.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must point to a local disposable database");
}

const prisma = new PrismaClient();
const prefix = `runtime-v2-response-execution-${randomUUID()}`;

async function fixture() {
  const fixturePrefix = `${prefix}-${randomUUID()}`;
  const scope = {
    companyId: `${fixturePrefix}-company`,
    assistantId: `${fixturePrefix}-assistant`,
    conversationId: `${fixturePrefix}-conversation`,
    contextVersion: 1,
  };
  await prisma.company.create({ data: { id: scope.companyId, name: "Response Execution Test" } });
  await prisma.assistant.create({
    data: {
      id: scope.assistantId,
      companyId: scope.companyId,
      name: "Response Execution Assistant",
      timezone: "America/Sao_Paulo",
      weeklySchedule: {
        monday: [{ start: "09:00", end: "18:00" }],
        tuesday: [{ start: "09:00", end: "18:00" }],
        wednesday: [{ start: "09:00", end: "18:00" }],
        thursday: [{ start: "09:00", end: "18:00" }],
        friday: [{ start: "09:00", end: "18:00" }],
        saturday: [],
        sunday: [],
      },
    },
  });
  await prisma.assistantConversation.create({
    data: {
      id: scope.conversationId,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      source: "SMOKE",
      channelType: "UNKNOWN",
      currentContextVersion: scope.contextVersion,
    },
  });
  const message = await prisma.assistantConversationMessage.create({
    data: {
      id: `${fixturePrefix}-message`,
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      role: "user",
      content: "business hours test",
      source: "TEST",
      messageType: "TEXT",
      contextVersion: scope.contextVersion,
    },
  });
  return { scope, message };
}

function coordinator() {
  return new RuntimeV2ResponseExecutionCoordinator({
    store: new ConversationStateResponseExecutionStore(new PrismaConversationStateStore(prisma)),
  });
}

function assertArmMatchesStatus(armed, status) {
  for (const field of [
    "approvalFingerprint",
    "executionFingerprint",
    "attemptNumber",
    "historyCount",
    "canonicalHashFingerprint",
    "canonicalVersion",
    "allowedCategory",
    "allowedAuthority",
    "status",
    "activeExecution",
    "canArmNewResponseExecution",
  ]) {
    assert.equal(armed[field], status[field], `PostgreSQL arm/status mismatch for ${field}`);
  }
}

function legacyPadding(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let seed = 0x4d595df4;
  let output = "";
  for (let index = 0; index < length; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    output += alphabet[seed % alphabet.length];
  }
  return output;
}

async function consumeTerminalV2Turn({ store, executionCoordinator, scope, approval, index }) {
  const armed = await store.arm({ approval, contextVersion: scope.contextVersion });
  const claim = await executionCoordinator.claim({
    ...scope,
    internalMessageId: approval.internalMessageId,
    canonicalComparisonHash: approval.expectedCanonicalComparisonHash,
    approval,
  });
  assert.equal(claim.status, "CLAIMED");
  assert.equal(
    await executionCoordinator.beginV2Generation({
      ...scope,
      internalMessageId: approval.internalMessageId,
      generationId: claim.generationId,
      providerCallCount: 0,
    }),
    true,
  );
  assert.equal(
    await executionCoordinator.approveV2Candidate({
      ...scope,
      internalMessageId: approval.internalMessageId,
      generationId: claim.generationId,
    }),
    true,
  );
  assert.equal(
    await executionCoordinator.beforeOutbound({
      ...scope,
      internalMessageId: approval.internalMessageId,
      owner: "V2_PRIMARY",
      generationId: claim.generationId,
    }),
    true,
  );
  assert.equal(
    await executionCoordinator.afterOutboundConfirmed({
      ...scope,
      internalMessageId: approval.internalMessageId,
      owner: "V2_PRIMARY",
      generationId: claim.generationId,
      externalMessageId: `outbound-${index}`,
    }),
    true,
  );
  return armed;
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

after(async () => {
  await prisma.assistantConversationStateV2Event.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversationStateV2.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversationMessage.deleteMany({
    where: { companyId: { startsWith: prefix } },
  });
  await prisma.assistantConversation.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistant.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test("PostgreSQL stateJson grants one atomic single-use claim across two coordinator instances", async () => {
  const { scope, message } = await fixture();
  const approval = createRuntimeV2ResponseExecutionApproval({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    expectedCanonicalComparisonHash: "hash-pg-c1",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "PostgreSQL CAS test",
    flowConfigurationFingerprint: "flow-config-persistence",
  });
  const seedStore = new ConversationStateResponseExecutionStore(
    new PrismaConversationStateStore(prisma),
  );
  await seedStore.arm({ approval, contextVersion: scope.contextVersion });
  const input = {
    ...scope,
    internalMessageId: message.id,
    canonicalComparisonHash: "hash-pg-c1",
    approval,
  };
  const [left, right] = await Promise.all([coordinator().claim(input), coordinator().claim(input)]);
  const claims = [left, right];
  assert.equal(claims.filter((result) => result.status === "CLAIMED").length, 1);
  assert.equal(claims.filter((result) => result.status === "PENDING_OR_TERMINAL").length, 1);

  const winner = claims.find((result) => result.status === "CLAIMED");
  assert.ok(winner);
  const restarted = coordinator();
  assert.equal(
    await restarted.beginV2Generation({
      ...scope,
      internalMessageId: message.id,
      generationId: winner.generationId,
    }),
    true,
  );
  assert.equal(
    await restarted.approveV2Candidate({
      ...scope,
      internalMessageId: message.id,
      generationId: winner.generationId,
    }),
    true,
  );
  assert.equal(
    await restarted.beforeOutbound({
      ...scope,
      internalMessageId: message.id,
      owner: "V2_PRIMARY",
      generationId: winner.generationId,
    }),
    true,
  );
  assert.equal(
    await restarted.afterOutboundConfirmed({
      ...scope,
      internalMessageId: message.id,
      owner: "V2_PRIMARY",
      generationId: winner.generationId,
      externalMessageId: "fake-external-reference",
    }),
    true,
  );

  const persisted = await seedStore.load({ ...scope, internalMessageId: message.id });
  assert.equal(persisted.owner, "V2_OUTBOUND_SENT");
  assert.equal(persisted.terminalStatus, "V2_OUTBOUND_SENT");
  assert.equal(persisted.approval.status, "CONSUMED");
  assert.equal(persisted.providerV2CallCount, 1);
  assert.equal(persisted.externalMessageId, "fake-external-reference");
  assert.equal(
    (await coordinator().claim(input)).status,
    "PENDING_OR_TERMINAL",
    "replay after a restart cannot claim or create a second outbound",
  );
});

test("PostgreSQL permits exactly one rearm after a terminal cancellation and preserves history", async () => {
  const { scope } = await fixture();
  const seedStore = new ConversationStateResponseExecutionStore(
    new PrismaConversationStateStore(prisma),
  );
  const first = createRuntimeV2ResponseExecutionApproval({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    expectedCanonicalComparisonHash: "hash-pg-rearm-first",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "PostgreSQL terminal history seed",
  });
  await seedStore.arm({ approval: first, contextVersion: scope.contextVersion });
  assert.equal(
    await new RuntimeV2ResponseExecutionCoordinator({ store: seedStore }).cancel({
      ...scope,
      approvalFingerprint: first.creationFingerprint.slice(0, 16),
    }),
    true,
  );
  const leftApproval = createRuntimeV2ResponseExecutionApproval({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    expectedCanonicalComparisonHash: "hash-pg-rearm-next",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "PostgreSQL concurrent rearm left",
  });
  const rightApproval = createRuntimeV2ResponseExecutionApproval({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    expectedCanonicalComparisonHash: "hash-pg-rearm-next",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "PostgreSQL concurrent rearm right",
  });
  const arm = (approval) =>
    new ConversationStateResponseExecutionStore(new PrismaConversationStateStore(prisma)).arm({
      approval,
      contextVersion: scope.contextVersion,
    });
  const results = await Promise.allSettled([arm(leftApproval), arm(rightApproval)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(
    results.filter(
      (result) => result.status === "rejected" && /RESPONSE_EXECUTION_ACTIVE/.test(result.reason),
    ).length,
    1,
  );
  const snapshot = await seedStore.loadSnapshot(scope);
  assert.equal(snapshot.invalid, false);
  assert.equal(snapshot.history.length, 1);
  assert.equal(snapshot.history[0].approval.approvalId, first.approvalId);
  assert.equal(snapshot.history[0].approval.status, "CANCELLED");
  assert.equal(snapshot.current.attemptNumber, 2);
  assert.notEqual(snapshot.current.executionId, snapshot.history[0].executionId);
});

test("PostgreSQL allows one real V2 primary executor and one shared tail completion", async () => {
  const { scope, message } = await fixture();
  const semanticDecision = resolveResponseExecutionIntent({
    canonicalMessage: "Qual é o horário de atendimento?",
    messageId: message.id,
  });
  const approval = createRuntimeV2ResponseExecutionApproval({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    expectedCanonicalComparisonHash: "hash-pg-c2-primary",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "PostgreSQL real primary executor test",
    semanticDecisionVersion: semanticDecision.version,
    expectedSemanticDecisionFingerprint: semanticDecision.fingerprint,
    expectedIntent: semanticDecision.intent,
    flowConfigurationFingerprint: "flow-config-persistence",
  });
  const seedStore = new ConversationStateResponseExecutionStore(
    new PrismaConversationStateStore(prisma),
  );
  await seedStore.arm({ approval, contextVersion: scope.contextVersion });
  const turn = {
    ...scope,
    internalMessageId: message.id,
    canonicalComparisonHash: "hash-pg-c2-primary",
    canonicalVersion: "canonical-inbound-message-v1",
  };
  const officialBusinessContext = buildOfficialBusinessContext({
    companyName: "PostgreSQL Test",
    assistantName: "Heloísa",
    companyTimezone: "America/Sao_Paulo",
    weeklySchedule: {
      monday: [{ start: "09:00", end: "18:00" }],
      tuesday: [{ start: "09:00", end: "18:00" }],
      wednesday: [{ start: "09:00", end: "18:00" }],
      thursday: [{ start: "09:00", end: "18:00" }],
      friday: [{ start: "09:00", end: "18:00" }],
      saturday: [],
      sunday: [],
    },
  });
  let providerCalls = 0;
  let v1Calls = 0;
  const executor = new RuntimeV2PrimaryResponseExecutor({
    candidateProvider: {
      async generate() {
        providerCalls += 1;
        return {
          provider: "fake-postgres-v2",
          model: "fake-postgres-v2",
          answer: "Nosso horário de atendimento é de segunda a sexta, das 09:00 às 18:00.",
          durationMs: 1,
        };
      },
    },
    promptCompiler: new PromptCompilerService(),
  });
  const v1Response = {
    owner: "V1",
    strategy: "STANDARD",
    responseText: "V1 não deveria executar.",
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
  const routerInput = {
    turn,
    v1Input: { triageMode: false },
    executionMode: "CONTROLLED",
    executionAssistantIds: [scope.assistantId],
    executionConversationIds: [scope.conversationId],
    v2Eligibility: {
      standardEligible: true,
      category: "businessHours",
      authority: "OFFICIAL_CONTEXT",
      semanticDecision,
      flowEvaluation: {
        v2Compatibility: "ALLOWED",
        flowConfigurationFingerprint: "flow-config-persistence",
      },
    },
    v2PrimaryContext: {
      canonicalInbound: {
        displayContent: "Qual é o horário de atendimento?",
        canonicalComparisonHash: turn.canonicalComparisonHash,
        schemaVersion: turn.canonicalVersion,
        redactionApplied: true,
      },
      assistant: { name: "Heloísa", splitResponseStyle: "SINGLE" },
      behavior: null,
      securityRules: [],
      officialBusinessContext,
      recentHistory: [],
      model: "fake-postgres-v2",
      temperature: 0,
      operational: {
        source: "tests",
        aiActive: true,
        humanActive: false,
        conversationActive: true,
        activeHandoff: false,
        fixedMessage: false,
        autoRespondBlocked: false,
        triage: false,
        toolRequired: false,
        customerRequestedHuman: false,
        ragRequested: false,
        memoryRequested: false,
        officialDataConflict: false,
      },
    },
  };
  const route = () =>
    new ResponseGenerationRouter({
      coordinator: coordinator(),
      v2Executor: executor,
      executeV1: async () => {
        v1Calls += 1;
        return v1Response;
      },
    }).route(routerInput);
  const [left, right] = await Promise.all([route(), route()]);
  const results = [left, right];
  const winner = results.find((result) => result.executionOwner === "V2_PRIMARY");
  assert.ok(winner);
  assert.equal(results.filter((result) => result.state === "PENDING_OR_TERMINAL").length, 1);
  assert.equal(providerCalls, 0);
  assert.equal(v1Calls, 0);

  const persistedMessage = await prisma.assistantConversationMessage.create({
    data: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      role: "assistant",
      content: winner.responseText,
      source: "TEST",
      messageType: "TEXT",
      contextVersion: scope.contextVersion,
    },
  });
  const hooks = new ResponseTailLifecycleHooks(undefined, coordinator(), turn);
  const metadata = {
    executionOwner: winner.executionOwner,
    route: winner.route,
    strategy: winner.strategy,
    internalMessageId: turn.internalMessageId,
    generationId: winner.generationId,
    persistedResponseId: persistedMessage.id,
    outboundAttempted: true,
    outboundPerformed: "CONFIRMED",
    externalMessageReferenceFingerprint: "fake-fingerprint",
  };
  await hooks.beforeOutbound(metadata);
  await hooks.afterOutboundConfirmed(metadata, "fake-external-pg-primary");
  const persisted = await seedStore.load(turn);
  assert.equal(persisted.terminalStatus, "V2_OUTBOUND_SENT");
  assert.equal(persisted.externalMessageId, "fake-external-pg-primary");
});

test("PostgreSQL preflight and arm produce one claimed V2 turn with no configuration mutation", async () => {
  const { scope, message } = await fixture();
  const stateStore = new PrismaConversationStateStore(prisma);
  const responseExecutionStore = new ConversationStateResponseExecutionStore(stateStore);
  const executionCoordinator = new RuntimeV2ResponseExecutionCoordinator({
    store: responseExecutionStore,
  });
  const administration = new RuntimeV2ResponseExecutionAdministrationService({
    prisma,
    securityRules: { findActiveForRuntime: async () => [] },
    stateStore,
    responseExecutionStore,
    coordinator: executionCoordinator,
    environment: {},
  });
  const futureMessage = "Qual é o horário de atendimento?";
  const preflight = await administration.preflight({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    message: futureMessage,
    canonicalVersion: "canonical-inbound-message-v1",
    allowedCategory: "businessHours",
    allowedAuthority: "OFFICIAL_CONTEXT",
  });
  assert.equal(preflight.preflightStatus, "APPROVED");
  assert.equal(preflight.executionConfiguration.mode, "OFF");
  assert.equal(JSON.stringify(preflight).includes(futureMessage), false);

  const armed = await administration.arm({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    message: futureMessage,
    canonicalVersion: "canonical-inbound-message-v1",
    allowedCategory: "businessHours",
    allowedAuthority: "OFFICIAL_CONTEXT",
    durationMinutes: 2,
    operatorPurpose: "postgres integration test",
  });
  assert.equal(armed.status, "ARMED");
  const status = await administration.status({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    approvalFingerprint: armed.approvalFingerprint,
  });
  assert.equal(status.status, "ARMED");
  assert.equal(status.internalMessageIdFingerprint, null);
  assertArmMatchesStatus(armed, status);

  const persistedApproval = await responseExecutionStore.load({
    ...scope,
    internalMessageId: message.id,
  });
  const canonicalComparisonHash = hashCanonicalInboundMessageContent(futureMessage);
  assert.ok(canonicalComparisonHash);
  const claim = await executionCoordinator.claim({
    ...scope,
    internalMessageId: message.id,
    canonicalComparisonHash,
    approval: persistedApproval.approval,
  });
  assert.equal(claim.status, "CLAIMED");
  const replay = await executionCoordinator.claim({
    ...scope,
    internalMessageId: message.id,
    canonicalComparisonHash,
    approval: persistedApproval.approval,
  });
  assert.equal(replay.status, "PENDING_OR_TERMINAL");
  const afterClaim = await administration.status({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    approvalFingerprint: armed.approvalFingerprint,
  });
  assert.equal(afterClaim.status, "CLAIMED");
  assert.ok(afterClaim.internalMessageIdFingerprint);
  await assert.rejects(
    () =>
      administration.cancel({
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        conversationId: scope.conversationId,
        approvalFingerprint: armed.approvalFingerprint,
      }),
    /CANCEL_NOT_ARMED/,
  );
});

test("PostgreSQL concurrent rearm returns the persisted current/history snapshot to the winner", async () => {
  const { scope } = await fixture();
  const stateStore = new PrismaConversationStateStore(prisma);
  const responseExecutionStore = new ConversationStateResponseExecutionStore(stateStore);
  const executionCoordinator = new RuntimeV2ResponseExecutionCoordinator({
    store: responseExecutionStore,
  });
  const createAdministration = () =>
    new RuntimeV2ResponseExecutionAdministrationService({
      prisma,
      securityRules: { findActiveForRuntime: async () => [] },
      stateStore,
      responseExecutionStore,
      coordinator: executionCoordinator,
      environment: {},
    });
  const input = {
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    message: "Qual é o horário de atendimento?",
    canonicalVersion: "canonical-inbound-message-v1",
    allowedCategory: "businessHours",
    allowedAuthority: "OFFICIAL_CONTEXT",
    durationMinutes: 2,
  };
  const administration = createAdministration();
  const first = await administration.arm({ ...input, operatorPurpose: "PostgreSQL terminal seed" });
  await administration.cancel({ ...scope, approvalFingerprint: first.approvalFingerprint });

  const results = await Promise.allSettled([
    createAdministration().arm({ ...input, operatorPurpose: "PostgreSQL concurrent left" }),
    createAdministration().arm({ ...input, operatorPurpose: "PostgreSQL concurrent right" }),
  ]);
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.match(String(rejected[0].reason), /RESPONSE_EXECUTION_(ACTIVE|PREFLIGHT_BLOCKED)/);
  const armed = fulfilled[0].value;
  assert.equal(armed.attemptNumber, 2);
  assert.equal(armed.historyCount, 1);
  const status = await administration.status({
    ...scope,
    approvalFingerprint: armed.approvalFingerprint,
  });
  assertArmMatchesStatus(armed, status);
  const snapshot = await responseExecutionStore.loadSnapshot(scope);
  assert.equal(snapshot?.invalid, false);
  assert.equal(snapshot?.history.length, 1);
  assert.equal(snapshot?.current.attemptNumber, 2);
});

test("PostgreSQL arm normalizes a legacy execution envelope before attempt 18", async () => {
  const { scope } = await fixture();
  const stateStore = new PrismaConversationStateStore(prisma);
  const store = new ConversationStateResponseExecutionStore(stateStore);
  const executionCoordinator = new RuntimeV2ResponseExecutionCoordinator({ store });

  for (let index = 1; index <= 17; index += 1) {
    const approval = createRuntimeV2ResponseExecutionApproval({
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      expectedCanonicalComparisonHash: `legacy-hash-${index}`,
      canonicalVersion: "canonical-inbound-message-v1",
      expiresAt: new Date(Date.now() + 60_000),
      operatorPurpose: `legacy terminal ${index}`,
      internalMessageId: `legacy-inbound-${index}`,
      approvalSource: "AUTO_SINGLE_USE",
    });
    await consumeTerminalV2Turn({ store, executionCoordinator, scope, approval, index });
  }

  const state = await stateStore.load({ ...scope, runtimeVersion: "V2", mode: "SHADOW" });
  const execution = state.responseExecution;
  state.responseExecution = {
    current: execution.current,
    history: execution.history,
  };
  state.temporaryFacts = {
    legacyConversationContext: {
      key: "legacyConversationContext",
      value: "",
      confidence: 1,
      sourceType: "CUSTOMER_TEXT",
      confirmedAt: new Date(),
      expiresAt: null,
    },
  };
  const legacyRow = await prisma.assistantConversationStateV2.findFirstOrThrow({
    where: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
    },
  });
  state.revision = legacyRow.revision + 1;
  const targetLegacyTextBytes = 63_176;
  const baseSize = await prisma.$queryRawUnsafe(
    `SELECT octet_length("stateJson"::text)::int AS bytes FROM assistant_conversation_states_v2 WHERE id = '${legacyRow.id}'`,
  );
  const padding = legacyPadding(targetLegacyTextBytes);
  let lower = 0;
  let upper = targetLegacyTextBytes - Number(baseSize[0].bytes) + 1_024;
  let matched = false;
  while (lower <= upper) {
    const length = Math.floor((lower + upper) / 2);
    state.temporaryFacts.legacyConversationContext.value = padding.slice(0, length);
    try {
      await prisma.assistantConversationStateV2.update({
        where: { id: legacyRow.id },
        data: { revision: state.revision, stateJson: serializeConversationState(state) },
      });
    } catch {
      upper = length - 1;
      continue;
    }
    const size = await prisma.$queryRawUnsafe(
      `SELECT octet_length("stateJson"::text)::int AS bytes FROM assistant_conversation_states_v2 WHERE id = '${legacyRow.id}'`,
    );
    const bytes = Number(size[0].bytes);
    if (bytes === targetLegacyTextBytes) {
      matched = true;
      break;
    }
    if (bytes < targetLegacyTextBytes) lower = length + 1;
    else upper = length - 1;
  }
  assert.equal(matched, true, "fixture must reproduce the observed 63,176-byte legacy state");

  const before = await prisma.assistantConversationStateV2.findFirstOrThrow({
    where: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
    },
  });
  const beforeSize = await prisma.$queryRawUnsafe(
    `SELECT octet_length("stateJson"::text)::int AS bytes FROM assistant_conversation_states_v2 WHERE id = '${legacyRow.id}'`,
  );
  assert.equal(Number(beforeSize[0].bytes), targetLegacyTextBytes);
  assert.equal(before.stateJson.responseExecution.historyStartAttemptNumber, undefined);

  const nextApproval = createRuntimeV2ResponseExecutionApproval({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    expectedCanonicalComparisonHash: "legacy-hash-18",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "legacy compacted attempt",
    internalMessageId: "legacy-inbound-18",
    approvalSource: "AUTO_SINGLE_USE",
  });
  const armed = await store.arm({ approval: nextApproval, contextVersion: scope.contextVersion });
  assert.equal(armed.attemptNumber, 18);

  const after = await prisma.assistantConversationStateV2.findFirstOrThrow({
    where: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
    },
  });
  const afterSize = await prisma.$queryRawUnsafe(
    `SELECT pg_column_size("stateJson")::int AS bytes FROM assistant_conversation_states_v2 WHERE id = '${legacyRow.id}'`,
  );
  assert.ok(Number(afterSize[0].bytes) <= 64 * 1024);
  const snapshot = await store.loadSnapshot(scope);
  assert.equal(snapshot.invalid, false);
  assert.equal(snapshot.current.attemptNumber, 18);
  assert.equal(snapshot.current.approval.approvalId, nextApproval.approvalId);
  assert.ok(snapshot.historyStartAttemptNumber >= 1);
  assert.equal(snapshot.history[0].attemptNumber, snapshot.historyStartAttemptNumber);
  assert.ok(snapshot.history.length < 17, "terminal legacy history was compacted before arm");
  assert.equal(
    snapshot.history.some((record) => record.terminalStatus === null),
    false,
  );
});

test("PostgreSQL retains automatic single-use execution through 30 terminal business-hours turns without exhausting stateJson", async () => {
  const { scope } = await fixture();
  const stateStore = new PrismaConversationStateStore(prisma);
  const store = new ConversationStateResponseExecutionStore(stateStore);
  const executionCoordinator = new RuntimeV2ResponseExecutionCoordinator({ store });
  const messages = [
    "Qual o horário de atendimento?",
    "Que horas vocês fecham hoje?",
    "Vocês estão abertos agora?",
    "Qual o horário na segunda?",
    "Qual o horário na terça?",
    "Qual o horário na quarta?",
    "Quarta fecha para almoço?",
    "Quarta volta às 13?",
    "Quinta funciona até as 18?",
    "Sábado abre?",
    "Domingo funciona?",
    "Qual o horário na quarta-feira?",
    "Qual o horário na terça-feira?",
    "Segunda funciona até que horas?",
    "Quarta abre de tarde?",
    "Quinta abre?",
    "Sexta fecha que horas?",
    "Sábado funciona pela manhã?",
    "Domingo está fechado?",
    "Qual o horário de quarta?",
    "Qual o horário de atendimento?",
    "Que horas vocês fecham hoje?",
    "Vocês estão abertos agora?",
    "Qual o horário na segunda?",
    "Qual o horário na terça?",
    "Qual o horário na quarta?",
    "Quarta fecha para almoço?",
    "Quarta volta às 13?",
    "Sábado abre?",
    "Domingo funciona?",
  ];
  const approvals = [];
  let outboundCount = 0;

  for (const [index, message] of messages.entries()) {
    const internalMessageId = `${scope.conversationId}-auto-${index + 1}`;
    const approval = createRuntimeV2ResponseExecutionApproval({
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      expectedCanonicalComparisonHash: `hash-auto-${index + 1}`,
      canonicalVersion: "canonical-inbound-message-v1",
      expiresAt: new Date(Date.now() + 60_000),
      operatorPurpose: `automatic business-hours turn ${index + 1}`,
      internalMessageId,
      approvalSource: "AUTO_SINGLE_USE",
    });
    const armed = await store.arm({ approval, contextVersion: scope.contextVersion });
    assert.equal(armed.approval.approvalSource, "AUTO_SINGLE_USE");
    assert.equal(armed.attemptNumber, index + 1);

    // Mimics the non-execution V2 state carried by a real, long-lived staging
    // conversation. It makes the test cross the same 64 KiB persistence edge
    // that blocked the fifth real automatic approval.
    if (index === 0) {
      const state = await stateStore.load({
        ...scope,
        runtimeVersion: "V2",
        mode: "SHADOW",
      });
      state.temporaryFacts = {
        padding: {
          key: "padding",
          value: "x".repeat(30 * 1024),
          confirmedAt: new Date(),
          expiresAt: null,
        },
      };
      await stateStore.save({ ...state, revision: state.revision + 1 }, state.revision);
    }

    const claim = await executionCoordinator.claim({
      ...scope,
      internalMessageId,
      canonicalComparisonHash: approval.expectedCanonicalComparisonHash,
      approval,
    });
    assert.equal(claim.status, "CLAIMED", message);
    assert.equal(
      await executionCoordinator.beginV2Generation({
        ...scope,
        internalMessageId,
        generationId: claim.generationId,
        providerCallCount: 0,
      }),
      true,
    );
    assert.equal(
      await executionCoordinator.approveV2Candidate({
        ...scope,
        internalMessageId,
        generationId: claim.generationId,
      }),
      true,
    );
    assert.equal(
      await executionCoordinator.beforeOutbound({
        ...scope,
        internalMessageId,
        owner: "V2_PRIMARY",
        generationId: claim.generationId,
      }),
      true,
    );
    assert.equal(
      await executionCoordinator.afterOutboundConfirmed({
        ...scope,
        internalMessageId,
        owner: "V2_PRIMARY",
        generationId: claim.generationId,
        externalMessageId: `outbound-auto-${index + 1}`,
      }),
      true,
    );
    outboundCount += 1;
    approvals.push(approval);

    const terminal = await store.load({ ...scope, internalMessageId });
    assert.equal(terminal.approval.status, "CONSUMED");
    assert.equal(terminal.owner, "V2_OUTBOUND_SENT");
    assert.equal(terminal.providerV2CallCount, 0);
  }

  const snapshot = await store.loadSnapshot(scope);
  assert.equal(snapshot?.invalid, false);
  assert.equal(snapshot?.current.attemptNumber, 30);
  assert.ok(snapshot.history.length < 29, "terminal history was compacted before the byte cap");
  assert.equal(snapshot.current.approval.status, "CONSUMED");
  assert.equal(snapshot.current.owner, "V2_OUTBOUND_SENT");
  assert.equal(outboundCount, 30);
  assert.equal(approvals.length, 30);
  assert.equal(
    approvals.every((approval) => approval.approvalSource === "AUTO_SINGLE_USE"),
    true,
  );
  assert.equal(
    [snapshot.current, ...snapshot.history].every((record) => record.providerV2CallCount === 0),
    true,
  );

  const row = await prisma.assistantConversationStateV2.findFirstOrThrow({
    where: {
      companyId: scope.companyId,
      assistantId: scope.assistantId,
      conversationId: scope.conversationId,
      contextVersion: scope.contextVersion,
      mode: "SHADOW",
    },
  });
  assert.ok(Buffer.byteLength(JSON.stringify(row.stateJson), "utf8") <= 64 * 1024);

  const replay = await executionCoordinator.claim({
    ...scope,
    internalMessageId: `${scope.conversationId}-auto-30`,
    canonicalComparisonHash: "hash-auto-30",
    approval: snapshot.current.approval,
  });
  assert.equal(replay.status, "PENDING_OR_TERMINAL", "terminal replay cannot send twice");
});
