import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { InMemoryConversationStateStore } from "../dist/runtime-v2/conversation-state-store.js";
import {
  ConversationStateResponseExecutionStore,
  responseExecutionSnapshotFromState,
} from "../dist/runtime-v2/conversation-state-response-execution-store.js";
import { RuntimeV2ResponseExecutionCoordinator } from "../dist/runtime-v2/response-execution-coordinator.js";
import { RuntimeV2ResponseExecutionAdministrationService } from "../dist/runtime-v2/response-execution-administration.js";
import { evaluateV2PrimarySecurityRules } from "../dist/assistant-conversations/v2-primary-security-gate.js";
import {
  parseRuntimeV2ResponseExecutionArguments,
  readRuntimeV2ResponseExecutionStdin,
} from "../dist/runtime-v2-response-execution-cli.js";
import {
  canonicalizeInboundMessageForComparison,
  createCanonicalInboundMessage,
  hashCanonicalInboundMessageContent,
} from "../dist/inbound/canonical-inbound-message.js";

const scope = {
  companyId: "company-admin",
  assistantId: "assistant-admin",
  conversationId: "conversation-admin",
};
const canonicalVersion = "canonical-inbound-message-v1";

function flow(overrides = {}) {
  return {
    id: "flow-admin",
    name: "Informações gerais",
    active: true,
    priority: 10,
    triggerKeywords: "[]",
    triggerDescription: null,
    triggerExamples: null,
    flowInstructions: null,
    knowledgeScope: null,
    finalAction: "respond",
    fixedMessage: null,
    requiresHuman: false,
    autoRespond: true,
    allowedToolSlugs: null,
    handoffTeamId: null,
    handoffTeamName: null,
    toolContext: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function securityRule(overrides = {}) {
  return {
    id: "rule-admin",
    companyId: scope.companyId,
    assistantId: scope.assistantId,
    name: "Não inventar preço",
    ruleType: "Limite comercial",
    instruction: "Não informe preço sem fonte oficial.",
    status: "ACTIVE",
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createAdministration(overrides = {}) {
  const stateStore = overrides.stateStore ?? new InMemoryConversationStateStore();
  const responseExecutionStore =
    overrides.responseExecutionStore ?? new ConversationStateResponseExecutionStore(stateStore);
  const coordinator =
    overrides.coordinator ??
    new RuntimeV2ResponseExecutionCoordinator({ store: responseExecutionStore });
  const company = { id: scope.companyId, name: "Empresa", timezone: "America/Sao_Paulo" };
  const assistant = {
    id: scope.assistantId,
    companyId: scope.companyId,
    name: "Heloísa",
    timezone: "America/Sao_Paulo",
    description: null,
    businessAddress: null,
    businessCity: null,
    businessState: null,
    businessCityRegion: null,
    businessPostalCode: null,
    googleMapsUrl: null,
    latitude: null,
    longitude: null,
    businessPhone: null,
    businessWhatsapp: null,
    businessWhatsappSupport: null,
    websiteUrl: null,
    weeklySchedule: {
      monday: [{ start: "09:00", end: "18:00" }],
      tuesday: [{ start: "09:00", end: "18:00" }],
      wednesday: [{ start: "09:00", end: "18:00" }],
      thursday: [{ start: "09:00", end: "18:00" }],
      friday: [{ start: "09:00", end: "18:00" }],
      saturday: [],
      sunday: [],
    },
    aiAlwaysAvailable: true,
    ...overrides.assistant,
  };
  const conversation = {
    id: scope.conversationId,
    aiActive: true,
    pausedByHuman: false,
    status: "ACTIVE",
    currentContextVersion: 1,
    ...overrides.conversation,
  };
  const prisma = {
    company: {
      findUnique: async ({ where }) => (where.id === scope.companyId ? company : null),
    },
    assistant: {
      findFirst: async ({ where }) =>
        where.id === scope.assistantId && where.companyId === scope.companyId ? assistant : null,
    },
    assistantConversation: {
      findFirst: async ({ where }) => {
        if (
          where.id === scope.conversationId &&
          where.companyId === scope.companyId &&
          where.assistantId === scope.assistantId
        ) {
          return conversation;
        }
        return null;
      },
    },
    assistantConversationMessage: {
      findMany: async () => overrides.recentHistory ?? [],
    },
    assistantFlow: { findMany: async () => overrides.flows ?? [] },
    assistantToolConfig: { count: async () => overrides.enabledToolCount ?? 0 },
    assistantConversationStateV2: {
      findMany: async () => {
        const state = await stateStore.load({
          ...scope,
          contextVersion: 1,
          runtimeVersion: "V2",
          mode: "SHADOW",
        });
        return state ? [{ stateJson: state }] : [];
      },
    },
  };
  const rules = overrides.rules ?? [securityRule()];
  const administration = new RuntimeV2ResponseExecutionAdministrationService({
    prisma,
    securityRules: {
      findActiveForRuntime: async ({ companyId, assistantId }) => {
        assert.equal(companyId, scope.companyId);
        assert.equal(assistantId, scope.assistantId);
        return rules;
      },
    },
    stateStore,
    responseExecutionStore,
    coordinator,
    environment: overrides.environment ?? {},
  });
  return { administration, responseExecutionStore, coordinator };
}

function preflightInput(overrides = {}) {
  return {
    ...scope,
    message: "Qual é o horário de atendimento?",
    canonicalVersion,
    allowedCategory: "businessHours",
    allowedAuthority: "OFFICIAL_CONTEXT",
    ...overrides,
  };
}

function assertArmMatchesCurrentStatus(armed, status) {
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
    assert.equal(armed[field], status[field], `arm/status mismatch for ${field}`);
  }
}

test("gate de segurança V2 permite regra ativa compatível e bloqueia regras operacionais", () => {
  const allowed = evaluateV2PrimarySecurityRules([securityRule()]);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.rulesFingerprint?.length, 16);
  assert.equal(allowed.redactionApplied, true);
  const foreign = evaluateV2PrimarySecurityRules(
    [securityRule({ companyId: "other-company", instruction: "Use uma ferramenta externa." })],
    { companyId: scope.companyId, assistantId: scope.assistantId },
  );
  assert.equal(foreign.allowed, true);
  assert.equal(foreign.activeRuleCount, 0);

  for (const [instruction, blocker] of [
    [
      "Não responda automaticamente; encaminhe sempre ao atendente humano.",
      "SECURITY_RULE_AUTO_RESPONSE_BLOCKED",
    ],
    ["Use uma ferramenta externa antes de responder.", "SECURITY_RULE_TOOL_REQUIRED"],
    ["Nunca informe horário de atendimento.", "SECURITY_RULE_BUSINESS_HOURS_BLOCKED"],
    ["", "SECURITY_RULE_INVALID"],
  ]) {
    const result = evaluateV2PrimarySecurityRules([securityRule({ instruction })]);
    assert.equal(result.allowed, false);
    assert.ok(result.blockers.includes(blocker));
  }
});

test("preflight é dry-run redigido e não persiste approval", async () => {
  const { administration, responseExecutionStore } = createAdministration();
  const result = await administration.preflight(preflightInput());
  assert.equal(result.preflightStatus, "APPROVED");
  assert.equal(result.canonicalHashFingerprint?.length, 16);
  assert.equal(result.executionConfiguration.mode, "OFF");
  assert.equal(result.securityRulesStatus, "ALLOWED");
  assert.equal(result.officialContextStatus, "AVAILABLE");
  assert.equal(result.resolvedCategory, "businessHours");
  assert.equal(result.resolvedIntent, "ask_business_hours");
  assert.equal(result.semanticApplicable, true);
  assert.equal(result.semanticDecisionFingerprint.length, 16);
  assert.deepEqual(result.blockers, []);
  assert.equal(await responseExecutionStore.load({ ...scope, contextVersion: 1 }), null);
  assert.equal(JSON.stringify(result).includes(preflightInput().message), false);
});

test("preflight requires an authorized antecedent for an elliptical business-hours follow-up", async () => {
  const withoutHistory = createAdministration();
  const blocked = await withoutHistory.administration.preflight(
    preflightInput({ message: "E até que horas?" }),
  );
  assert.equal(blocked.preflightStatus, "BLOCKED");
  assert.equal(blocked.semanticApplicable, false);

  const withHistory = createAdministration({
    recentHistory: [
      {
        id: "history-business-hours",
        role: "user",
        content: "Que horas vocês atendem de segunda a sexta?",
      },
    ],
  });
  const approved = await withHistory.administration.preflight(
    preflightInput({ message: "E até que horas?" }),
  );
  assert.equal(approved.preflightStatus, "APPROVED");
  assert.equal(approved.resolvedIntent, "ask_business_hours");
});

test("preflight bloqueia escopo operacional, contexto e regras incompatíveis", async () => {
  const cases = [
    [{ conversation: { aiActive: false } }, "AI_INACTIVE"],
    [{ conversation: { pausedByHuman: true } }, "HUMAN_ACTIVE"],
    [{ conversation: { status: "INACTIVE" } }, "CONVERSATION_NOT_ACTIVE"],
    [
      {
        flows: [
          flow({ triggerKeywords: '["horário"]', flowInstructions: "Informe que abre às 08:30." }),
        ],
      },
      "FLOW_DECLARATIVE_CONTEXT_UNSUPPORTED",
    ],
    [{ enabledToolCount: 1 }, "TOOL_CONFIGURATION_PRESENT"],
    [{ assistant: { weeklySchedule: {} } }, "OFFICIAL_BUSINESS_HOURS_UNAVAILABLE"],
    [{}, "TURN_NOT_STRICT_BUSINESS_HOURS", { message: "Qual é o preço?" }],
    [
      { rules: [securityRule({ instruction: "Use uma ferramenta externa antes de responder." })] },
      "SECURITY_RULE_TOOL_REQUIRED",
    ],
  ];
  for (const [overrides, blocker, inputOverrides] of cases) {
    const { administration } = createAdministration(overrides);
    const result = await administration.preflight(preflightInput(inputOverrides));
    assert.equal(result.preflightStatus, "BLOCKED");
    assert.ok(result.blockers.includes(blocker));
  }
});

test("preflight permits a matched STANDARD-compatible flow without persisting its instructions", async () => {
  const { administration } = createAdministration({
    flows: [
      flow({
        triggerKeywords: '["horário"]',
        flowInstructions: "Responda de forma objetiva e cordial.",
      }),
    ],
  });
  const result = await administration.preflight(preflightInput());
  assert.equal(result.preflightStatus, "APPROVED");
  assert.equal(result.flowEvaluationStatus, "MATCHED_STANDARD_COMPATIBLE");
  assert.equal(result.v2FlowCompatibility, "ALLOWED_WITH_FLOW_CONTEXT");
  assert.ok(result.selectedFlowFingerprint);
  assert.ok(result.selectedFlowVersionFingerprint);
  assert.ok(result.declarativeContextFingerprint);
  assert.equal(JSON.stringify(result).includes("Responda de forma objetiva"), false);
});

test("arm binds only compatible-flow fingerprints to the single-use approval", async () => {
  const { administration, responseExecutionStore } = createAdministration({
    flows: [
      flow({
        triggerKeywords: '["horário"]',
        flowInstructions: "Responda de forma objetiva e cordial.",
      }),
    ],
  });
  await administration.arm({
    ...preflightInput(),
    durationMinutes: 5,
    operatorPurpose: "armamento local com flow compatível",
  });
  const record = await responseExecutionStore.load({ ...scope, contextVersion: 1 });
  assert.equal(record?.approval.flowCompatibility, "STANDARD_COMPATIBLE");
  assert.ok(record?.approval.expectedFlowFingerprint);
  assert.ok(record?.approval.expectedFlowVersionFingerprint);
  assert.ok(record?.approval.declarativeContextFingerprint);
  assert.equal(JSON.stringify(record?.approval).includes("Responda de forma objetiva"), false);
});

test("preflight permite flows configurados sem match e bloqueia avaliação semântica inconclusiva", async () => {
  const noMatch = createAdministration({
    flows: [flow({ triggerKeywords: '["preço"]' })],
  });
  const approved = await noMatch.administration.preflight(preflightInput());
  assert.equal(approved.preflightStatus, "APPROVED");
  assert.equal(approved.flowConfigurationStatus, "ACTIVE_FLOWS_PRESENT");
  assert.equal(approved.flowEvaluationStatus, "NO_MATCH");
  assert.equal(approved.v2FlowCompatibility, "ALLOWED");

  const semantic = createAdministration({
    flows: [flow({ triggerDescription: "classificação semântica" })],
  });
  const blocked = await semantic.administration.preflight(preflightInput());
  assert.equal(blocked.preflightStatus, "BLOCKED");
  assert.equal(blocked.flowEvaluationStatus, "INDETERMINATE");
  assert.ok(blocked.blockers.includes("FLOW_EVALUATION_INDETERMINATE"));
});

test("arm blocks an active attempt, archives a terminal one, and preserves its identity", async () => {
  const { administration, responseExecutionStore, coordinator } = createAdministration();
  const armed = await administration.arm({
    ...preflightInput(),
    durationMinutes: 5,
    operatorPurpose: "validação local controlada",
  });
  assert.equal(armed.status, "ARMED");
  assert.equal(armed.owner, "V1_OWNED");
  assert.equal(armed.approvalFingerprint?.length, 16);
  assert.equal(JSON.stringify(armed).includes("validação local"), false);
  const byFingerprint = await administration.status({
    approvalFingerprint: armed.approvalFingerprint,
  });
  assert.equal(byFingerprint.status, "ARMED");
  assert.equal(armed.historyCount, 0);
  assertArmMatchesCurrentStatus(armed, byFingerprint);
  await assert.rejects(
    () =>
      administration.arm({
        ...preflightInput(),
        durationMinutes: 5,
        operatorPurpose: "segunda tentativa",
      }),
    /PREFLIGHT_BLOCKED/,
  );
  const cancelled = await administration.cancel({
    ...scope,
    approvalFingerprint: armed.approvalFingerprint,
  });
  assert.equal(cancelled.status, "CANCELLED");
  const cancelledAgain = await administration.cancel({
    ...scope,
    approvalFingerprint: armed.approvalFingerprint,
  });
  assert.equal(cancelledAgain.status, "CANCELLED");
  const record = await responseExecutionStore.load({ ...scope, contextVersion: 1 });
  assert.equal(record?.approval.status, "CANCELLED");
  const rearmed = await administration.arm({
    ...preflightInput(),
    durationMinutes: 5,
    operatorPurpose: "tentativa terminal nova",
  });
  assert.equal(rearmed.status, "ARMED");
  assert.equal(rearmed.attemptNumber, 2);
  assert.equal(rearmed.historyCount, 1);
  const snapshot = await responseExecutionStore.loadSnapshot({ ...scope, contextVersion: 1 });
  assert.equal(snapshot?.history.length, 1);
  assert.equal(snapshot?.history[0].approval.approvalId, record?.approval.approvalId);
  assert.equal(snapshot?.history[0].approval.status, "CANCELLED");
  assert.notEqual(snapshot?.current.executionId, snapshot?.history[0].executionId);
  const rearmedStatus = await administration.status({
    ...scope,
    approvalFingerprint: rearmed.approvalFingerprint,
  });
  assertArmMatchesCurrentStatus(rearmed, rearmedStatus);
  const historical = await administration.status({
    ...scope,
    approvalFingerprint: armed.approvalFingerprint,
  });
  assert.equal(historical.status, "CANCELLED");
  assert.equal(historical.attemptNumber, 1);
  assert.equal(historical.historyCount, 1);
  assert.equal(historical.isCurrentAttempt, false);
  assert.equal(historical.currentAttemptNumber, 2);
  assert.equal(historical.hasActiveExecution, true);
  assert.equal(historical.canArmNew, false);
  const cancelledRearm = await administration.cancel({
    ...scope,
    approvalFingerprint: rearmed.approvalFingerprint,
  });
  assert.equal(cancelledRearm.status, "CANCELLED");
  const third = await administration.arm({
    ...preflightInput(),
    durationMinutes: 5,
    operatorPurpose: "terceira tentativa terminal",
  });
  assert.equal(third.attemptNumber, 3);
  assert.equal(third.historyCount, 2);
  const thirdStatus = await administration.status({
    ...scope,
    approvalFingerprint: third.approvalFingerprint,
  });
  assertArmMatchesCurrentStatus(third, thirdStatus);
  const current = await responseExecutionStore.load({ ...scope, contextVersion: 1 });
  const claim = await coordinator.claim({
    ...scope,
    contextVersion: 1,
    canonicalComparisonHash: "hash",
    internalMessageId: "message-1",
    approval: current.approval,
  });
  assert.notEqual(claim.status, "CLAIMED");
});

test("legacy terminal record migrates atomically and malformed state fails closed", async () => {
  const stateStore = new InMemoryConversationStateStore();
  const store = new ConversationStateResponseExecutionStore(stateStore);
  const { administration } = createAdministration({ stateStore, responseExecutionStore: store });
  const first = await administration.arm({
    ...preflightInput(),
    durationMinutes: 5,
    operatorPurpose: "legacy seed",
  });
  await administration.cancel({ ...scope, approvalFingerprint: first.approvalFingerprint });
  const legacy = await stateStore.load({
    ...scope,
    contextVersion: 1,
    runtimeVersion: "V2",
    mode: "SHADOW",
  });
  legacy.responseExecution = legacy.responseExecution.current;
  await stateStore.save({ ...legacy, revision: legacy.revision + 1 }, legacy.revision);
  const rearmed = await administration.arm({
    ...preflightInput(),
    durationMinutes: 5,
    operatorPurpose: "legacy rearm",
  });
  assert.equal(rearmed.attemptNumber, 2);
  assert.equal(rearmed.historyCount, 1);
  const migrated = await stateStore.load({
    ...scope,
    contextVersion: 1,
    runtimeVersion: "V2",
    mode: "SHADOW",
  });
  const snapshot = responseExecutionSnapshotFromState(migrated);
  assert.equal(snapshot.invalid, false);
  assert.equal(snapshot.history.length, 1);
  assert.equal(snapshot.history[0].approval.status, "CANCELLED");
  const rearmedStatus = await administration.status({
    ...scope,
    approvalFingerprint: rearmed.approvalFingerprint,
  });
  assertArmMatchesCurrentStatus(rearmed, rearmedStatus);
  const malformed = {
    ...migrated,
    revision: migrated.revision + 1,
    responseExecution: { current: migrated.responseExecution.current, history: [{}] },
  };
  await stateStore.save(malformed, migrated.revision);
  await assert.rejects(
    () =>
      administration.arm({
        ...preflightInput(),
        durationMinutes: 5,
        operatorPurpose: "estado inválido",
      }),
    /RESPONSE_EXECUTION_STATE_INCONSISTENT/,
  );
});

test("canonicalização de transporte mantém LF, CRLF e ausência de newline no mesmo hash", () => {
  const fixture = "Qual é o horário de atendimento de segunda a sexta?";
  const expected = canonicalizeInboundMessageForComparison(fixture);
  for (const transported of [
    `${fixture}\n`,
    `${fixture}\r\n`,
    `${fixture}\n\n`,
    `  ${fixture}  `,
    fixture,
  ]) {
    const result = canonicalizeInboundMessageForComparison(transported);
    assert.equal(result.canonicalComparisonHash, expected.canonicalComparisonHash);
    assert.equal(result.canonicalVersion, canonicalVersion);
  }
  assert.equal(expected.canonicalComparisonHash, hashCanonicalInboundMessageContent(fixture));
  assert.notEqual(
    canonicalizeInboundMessageForComparison(`${fixture}!`).canonicalComparisonHash,
    expected.canonicalComparisonHash,
  );
  assert.notEqual(
    canonicalizeInboundMessageForComparison(fixture.replace(" de ", "  de "))
      .canonicalComparisonHash,
    expected.canonicalComparisonHash,
  );
  assert.equal(
    canonicalizeInboundMessageForComparison("Qual e\u0301 o hora\u0301rio de atendimento?")
      .canonicalComparisonHash,
    canonicalizeInboundMessageForComparison("Qual é o horário de atendimento?")
      .canonicalComparisonHash,
  );
});

test("arm persiste exatamente o hash produzido pelo preflight canônico", async () => {
  const { administration, responseExecutionStore } = createAdministration();
  const fixture = "Qual é o horário de atendimento de segunda a sexta?\r\n";
  const preflight = await administration.preflight(preflightInput({ message: fixture }));
  assert.equal(preflight.preflightStatus, "APPROVED");
  await administration.arm({
    ...preflightInput({ message: fixture }),
    durationMinutes: 5,
    operatorPurpose: "hash canonical único",
  });
  const persisted = await responseExecutionStore.load({ ...scope, contextVersion: 1 });
  const expectedHash = canonicalizeInboundMessageForComparison(fixture).canonicalComparisonHash;
  const routerInbound = createCanonicalInboundMessage({
    ...scope,
    internalMessageId: "inbound-fake",
    contentType: "TEXT",
    displayContent: fixture,
    receivedAt: new Date(),
  });
  assert.equal(persisted?.approval.expectedCanonicalComparisonHash, expectedHash);
  assert.equal(routerInbound.canonicalComparisonHash, expectedHash);
  assert.equal(preflight.canonicalHashFingerprint, "f2432202f1b28ebd");
});

test("arm não recanonicaliza uma entrada depois do preflight interno", async () => {
  const { administration, responseExecutionStore } = createAdministration();
  const approvedMessage = "Qual é o horário de atendimento de segunda a sexta?";
  const differentMessage = "Qual é o horário de atendimento aos sábados?";
  const input = {
    ...preflightInput(),
    durationMinutes: 5,
    operatorPurpose: "reuso de preflight",
  };
  let reads = 0;
  Object.defineProperty(input, "message", {
    enumerable: true,
    get() {
      reads += 1;
      return reads === 1 ? approvedMessage : differentMessage;
    },
  });
  await administration.arm(input);
  const persisted = await responseExecutionStore.load({ ...scope, contextVersion: 1 });
  assert.equal(reads, 1);
  assert.equal(
    persisted?.approval.expectedCanonicalComparisonHash,
    canonicalizeInboundMessageForComparison(approvedMessage).canonicalComparisonHash,
  );
});

test("arm falha fechado e cancela a approval se a releitura divergir do hash canônico", async () => {
  const stateStore = new InMemoryConversationStateStore();
  class MismatchingStore extends ConversationStateResponseExecutionStore {
    corruptReads = false;

    async arm(input) {
      const result = await super.arm(input);
      this.corruptReads = true;
      return result;
    }

    async loadSnapshot(input) {
      const result = await super.loadSnapshot(input);
      if (!this.corruptReads || !result?.current) return result;
      return {
        ...result,
        current: {
          ...result.current,
          approval: {
            ...result.current.approval,
            expectedCanonicalComparisonHash: "mismatched-hash",
          },
        },
      };
    }

    async loadPersisted(input) {
      return super.load(input);
    }
  }
  const responseExecutionStore = new MismatchingStore(stateStore);
  const { administration } = createAdministration({
    stateStore,
    responseExecutionStore,
    coordinator: new RuntimeV2ResponseExecutionCoordinator({ store: responseExecutionStore }),
  });
  await assert.rejects(
    () =>
      administration.arm({
        ...preflightInput(),
        durationMinutes: 5,
        operatorPurpose: "detectar corrupção",
      }),
    /ARM_CANONICAL_HASH_MISMATCH/,
  );
  const persisted = await responseExecutionStore.loadPersisted({ ...scope, contextVersion: 1 });
  assert.equal(persisted?.approval.status, "CANCELLED");
  assert.equal(persisted?.terminalStatus, "TERMINAL_BLOCKED");
});

test("CLI aceita stdin sem expor a mensagem e rejeita fontes duplicadas", async () => {
  const parsed = parseRuntimeV2ResponseExecutionArguments([
    "preflight",
    "--company-id",
    "c",
    "--assistant-id",
    "a",
    "--conversation-id",
    "v",
    "--message-stdin",
    "--canonical-version",
    canonicalVersion,
    "--category",
    "businessHours",
    "--authority",
    "OFFICIAL_CONTEXT",
  ]);
  assert.equal(parsed.messageFromStdin, true);
  assert.equal(parsed.message, undefined);
  const fromStdin = await readRuntimeV2ResponseExecutionStdin(
    Readable.from(["Qual é o horário de atendimento?\r\n"]),
  );
  assert.equal(
    canonicalizeInboundMessageForComparison(fromStdin).canonicalComparisonHash,
    canonicalizeInboundMessageForComparison("Qual é o horário de atendimento?")
      .canonicalComparisonHash,
  );
  assert.throws(
    () =>
      parseRuntimeV2ResponseExecutionArguments([
        "preflight",
        "--company-id",
        "c",
        "--assistant-id",
        "a",
        "--conversation-id",
        "v",
        "--message",
        "privada",
        "--message-stdin",
        "--canonical-version",
        canonicalVersion,
        "--category",
        "businessHours",
        "--authority",
        "OFFICIAL_CONTEXT",
      ]),
    /ARGUMENTS_INVALID/,
  );
});

test("arm limita duração e CLI não aceita categoria fora do contrato", async () => {
  const { administration } = createAdministration();
  await assert.rejects(
    () =>
      administration.arm({
        ...preflightInput(),
        durationMinutes: 11,
        operatorPurpose: "teste",
      }),
    /DURATION_INVALID/,
  );
  assert.throws(
    () =>
      parseRuntimeV2ResponseExecutionArguments([
        "arm",
        "--company-id",
        "c",
        "--assistant-id",
        "a",
        "--conversation-id",
        "v",
        "--message",
        "mensagem privada",
        "--canonical-version",
        canonicalVersion,
        "--category",
        "price",
        "--authority",
        "OFFICIAL_CONTEXT",
        "--duration-minutes",
        "2",
        "--operator-purpose",
        "teste",
      ]),
    /CATEGORY_OR_AUTHORITY_INVALID/,
  );
  const parsed = parseRuntimeV2ResponseExecutionArguments([
    "preflight",
    "--company-id",
    "c",
    "--assistant-id",
    "a",
    "--conversation-id",
    "v",
    "--message",
    "mensagem privada",
    "--canonical-version",
    canonicalVersion,
    "--category",
    "businessHours",
    "--authority",
    "OFFICIAL_CONTEXT",
  ]);
  assert.equal(parsed.command, "preflight");
  assert.equal(JSON.stringify({ command: parsed.command }).includes("mensagem privada"), false);
});
