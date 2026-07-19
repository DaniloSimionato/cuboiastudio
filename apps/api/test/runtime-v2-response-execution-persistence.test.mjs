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
  const approval = createRuntimeV2ResponseExecutionApproval({
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    conversationId: scope.conversationId,
    expectedCanonicalComparisonHash: "hash-pg-c2-primary",
    canonicalVersion: "canonical-inbound-message-v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "PostgreSQL real primary executor test",
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
  assert.equal(providerCalls, 1);
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
