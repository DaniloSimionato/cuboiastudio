import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryConversationStateStore } from "../dist/runtime-v2/conversation-state-store.js";
import { ConversationStateResponseExecutionStore } from "../dist/runtime-v2/conversation-state-response-execution-store.js";
import { RuntimeV2ResponseExecutionCoordinator } from "../dist/runtime-v2/response-execution-coordinator.js";
import { RuntimeV2ResponseExecutionAdministrationService } from "../dist/runtime-v2/response-execution-administration.js";
import { evaluateV2PrimarySecurityRules } from "../dist/assistant-conversations/v2-primary-security-gate.js";
import { parseRuntimeV2ResponseExecutionArguments } from "../dist/runtime-v2-response-execution-cli.js";

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
  const stateStore = new InMemoryConversationStateStore();
  const responseExecutionStore = new ConversationStateResponseExecutionStore(stateStore);
  const coordinator = new RuntimeV2ResponseExecutionCoordinator({ store: responseExecutionStore });
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
  assert.deepEqual(result.blockers, []);
  assert.equal(await responseExecutionStore.load({ ...scope, contextVersion: 1 }), null);
  assert.equal(JSON.stringify(result).includes(preflightInput().message), false);
});

test("preflight bloqueia escopo operacional, contexto e regras incompatíveis", async () => {
  const cases = [
    [{ conversation: { aiActive: false } }, "AI_INACTIVE"],
    [{ conversation: { pausedByHuman: true } }, "HUMAN_ACTIVE"],
    [{ conversation: { status: "INACTIVE" } }, "CONVERSATION_NOT_ACTIVE"],
    [{ flows: [flow({ triggerKeywords: '["horário"]' })] }, "FLOW_APPLICABLE_STANDARD_COMPATIBLE"],
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

test("arm cria approval única por hash, status é redigido e cancel somente ARMED", async () => {
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
  const claim = await coordinator.claim({
    ...scope,
    contextVersion: 1,
    canonicalComparisonHash: "hash",
    internalMessageId: "message-1",
    approval: record.approval,
  });
  assert.notEqual(claim.status, "CLAIMED");
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
