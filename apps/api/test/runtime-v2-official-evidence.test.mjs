import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  InMemoryConversationStateStore,
  OfficialStructuredEvidenceAdapter,
  RuntimeV2ShadowOrchestrator,
  createEvidenceId,
  deriveOfficialEvidenceCategories,
  normalizeOfficialAddress,
  normalizeOfficialPhone,
  normalizeOfficialUrl,
  normalizeOfficialWeeklySchedule,
  redactSourceEvidence,
} from "../dist/runtime-v2/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must point to the disposable phase 6.1B2 database");
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
const expectedDatabaseName =
  process.env.RUNTIME_V2_TEST_DATABASE_NAME ?? "cubo_ai_studio_test_phase_6_1b1";
if (databaseName !== expectedDatabaseName) {
  throw new Error(`official evidence tests require ${expectedDatabaseName}`);
}

const prisma = new PrismaClient();
const prefix = `official-evidence-${randomUUID()}`;

const schedule = {
  monday: [{ start: "08:00", end: "18:00" }],
  tuesday: [{ start: "08:00", end: "18:00" }],
  wednesday: [{ start: "08:00", end: "18:00" }],
  thursday: [{ start: "08:00", end: "18:00" }],
  friday: [{ start: "08:00", end: "18:00" }],
  saturday: [{ start: "08:00", end: "12:00" }],
  sunday: [],
};

const now = new Date("2026-07-15T12:00:00.000Z");

function evidence(overrides = {}) {
  const sourceId = "official-structured:test:address";
  return {
    contractVersion: 1,
    evidenceId: createEvidenceId({
      sourceType: "OFFICIAL_STRUCTURED",
      sourceId,
      companyId: "official-evidence-company",
      assistantId: "official-evidence-assistant",
      category: "ADDRESS",
      fieldKey: "assistant.businessAddress",
    }),
    sourceType: "OFFICIAL_STRUCTURED",
    sourceId,
    companyId: "official-evidence-company",
    assistantId: "official-evidence-assistant",
    category: "ADDRESS",
    fieldKey: "assistant.businessAddress",
    normalizedValue: { address: "Rua sintética, 10" },
    valueHash: "synthetic-hash",
    confidence: 1,
    authorityLevel: "AUTHORITATIVE",
    observedAt: now.toISOString(),
    validFrom: now.toISOString(),
    validUntil: null,
    freshnessStatus: "CURRENT",
    provenance: { sourceTable: "assistants", sourceRecordId: "official-evidence-assistant" },
    isSensitive: true,
    isAuthoritative: true,
    sourceStatus: "ACTIVE",
    ...overrides,
  };
}

function shadowSnapshot(scope, id, message) {
  return {
    scope,
    correlationId: `correlation-${id}`,
    internalMessageId: id,
    externalMessageId: `external-${id}`,
    source: "CUSTOMER",
    messageType: "TEXT",
    currentMessage: message,
  };
}

function fakePrisma(record) {
  const queries = [];
  return {
    queries,
    assistant: {
      async findFirst(args) {
        queries.push(args);
        return record;
      },
    },
  };
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
  await prisma.assistantConversation.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.assistant.deleteMany({ where: { companyId: { startsWith: prefix } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test("normalizadores oficiais não inventam campos", () => {
  assert.equal(normalizeOfficialPhone("(11) 99999-0000"), "11999990000");
  assert.equal(normalizeOfficialPhone("telefone inválido"), null);
  assert.equal(
    normalizeOfficialUrl("https://example.test/support"),
    "https://example.test/support",
  );
  assert.equal(normalizeOfficialUrl("javascript:alert(1)"), null);
  assert.deepEqual(normalizeOfficialAddress({ address: "Rua sintética", city: "Cidade" }), {
    address: "Rua sintética",
    city: "Cidade",
  });
  assert.equal(normalizeOfficialAddress({}), null);
  assert.equal(normalizeOfficialWeeklySchedule({ monday: [{ start: "bad", end: "18:00" }] }), null);
  assert.equal(normalizeOfficialWeeklySchedule(schedule).schedule.sunday.length, 0);
});

test("categorias derivadas preservam business hours antes de booking", () => {
  assert.deepEqual(
    deriveOfficialEvidenceCategories({
      requestedCategories: ["booking"],
      currentMessage: "domingo às 13h",
    }),
    ["BUSINESS_HOURS", "BOOKING"],
  );
  assert.deepEqual(
    deriveOfficialEvidenceCategories({ requestedCategories: ["address", "official_contact"] }),
    ["ADDRESS", "OFFICIAL_CONTACT"],
  );
});

test("adapter fake exige escopo e nunca usa metadata do cliente", async () => {
  const record = {
    id: "official-evidence-assistant",
    companyId: "official-evidence-company",
    businessAddress: "Rua sintética, 10",
    businessCityRegion: null,
    businessCity: "Cidade",
    businessState: "UF",
    businessPostalCode: null,
    businessPhone: "(11) 99999-0000",
    businessWhatsapp: null,
    businessWhatsappSupport: null,
    websiteUrl: "https://example.test",
    timezone: "America/Sao_Paulo",
    weeklySchedule: schedule,
    updatedAt: now,
    company: {
      id: "official-evidence-company",
      name: "Empresa Sintética",
      timezone: "America/Sao_Paulo",
      status: "ACTIVE",
      updatedAt: now,
    },
  };
  const prismaFake = fakePrisma(record);
  const adapter = new OfficialStructuredEvidenceAdapter(prismaFake);
  const result = await adapter.read({
    companyId: record.companyId,
    assistantId: record.id,
    requestedCategories: ["COMPANY_IDENTITY", "ADDRESS", "OFFICIAL_CONTACT", "BUSINESS_HOURS"],
    currentTime: now,
  });
  assert.equal(result.adapterStatus, "COMPLETED");
  assert.equal(result.evidence.length, 5);
  assert.equal(prismaFake.queries[0].where.companyId, record.companyId);
  assert.equal(prismaFake.queries[0].where.id, record.id);
  const redacted = result.evidence.map(redactSourceEvidence);
  const serialized = JSON.stringify(redacted);
  assert.equal(serialized.includes("Rua sintética"), false);
  assert.equal(serialized.includes("11999990000"), false);
  assert.equal(serialized.includes("example.test"), false);

  const noContactAdapter = new OfficialStructuredEvidenceAdapter(
    fakePrisma({
      ...record,
      businessPhone: null,
      businessWhatsapp: null,
      businessWhatsappSupport: null,
      websiteUrl: null,
    }),
  );
  const noContact = await noContactAdapter.read({
    companyId: record.companyId,
    assistantId: record.id,
    requestedCategories: ["OFFICIAL_CONTACT"],
    currentTime: now,
  });
  assert.deepEqual(noContact.evidence, []);
  assert.deepEqual(noContact.missingCategories, ["OFFICIAL_CONTACT"]);
});

test("adapter real isola tenant, preserva horário fechado e não cria exceção", async () => {
  const suffix = randomUUID().slice(0, 8);
  const companyId = `${prefix}-company-${suffix}`;
  const assistantId = `${prefix}-assistant-${suffix}`;
  await prisma.company.create({
    data: { id: companyId, name: `Empresa ${suffix}`, createdAt: now, updatedAt: now },
  });
  await prisma.assistant.create({
    data: {
      id: assistantId,
      companyId,
      name: `Assistente ${suffix}`,
      businessAddress: "Rua oficial sintética, 10",
      businessCity: "Cidade",
      businessState: "UF",
      businessPhone: "(11) 99999-0000",
      websiteUrl: "https://example.test",
      timezone: "America/Sao_Paulo",
      weeklySchedule: schedule,
      createdAt: now,
      updatedAt: now,
    },
  });
  const adapter = new OfficialStructuredEvidenceAdapter(prisma);
  const result = await adapter.read({
    companyId,
    assistantId,
    requestedCategories: [
      "COMPANY_IDENTITY",
      "ADDRESS",
      "OFFICIAL_CONTACT",
      "BUSINESS_HOURS",
      "BUSINESS_HOURS_EXCEPTION",
    ],
    currentTime: now,
  });
  assert.equal(result.adapterStatus, "PARTIAL");
  assert.ok(result.evidence.some((item) => item.category === "BUSINESS_HOURS"));
  assert.deepEqual(result.missingCategories, ["BUSINESS_HOURS_EXCEPTION"]);
  assert.ok(result.failures.includes("OFFICIAL_HOURS_EXCEPTIONS_UNSUPPORTED"));

  const wrongTenant = await adapter.read({
    companyId: `${companyId}-other`,
    assistantId,
    requestedCategories: ["ADDRESS"],
    currentTime: now,
  });
  assert.deepEqual(wrongTenant.evidence, []);
  assert.deepEqual(wrongTenant.missingCategories, ["ADDRESS"]);
});

test("OFF e SHADOW sem metadata não consultam adapter; SHADOW_METADATA consulta uma vez", async () => {
  const scope = {
    companyId: "official-evidence-company",
    assistantId: "official-evidence-assistant",
    conversationId: "official-evidence-conversation",
    contextVersion: 1,
  };
  let calls = 0;
  const reader = {
    async read() {
      calls += 1;
      return {
        evidence: [evidence()],
        missingCategories: [],
        failures: [],
        adapterStatus: "COMPLETED",
        durationMs: 1,
      };
    },
  };
  const off = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    {},
    () => now,
    reader,
  );
  const offResult = await off.process(shadowSnapshot(scope, "off-1", "Qual é o endereço?"));
  assert.equal(offResult.manifest, null);
  assert.equal(calls, 0);

  const shadow = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    { RUNTIME_V2_MODE: "SHADOW", RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId },
    () => now,
    reader,
  );
  const shadowResult = await shadow.process(
    shadowSnapshot(scope, "shadow-1", "Qual é o endereço?"),
  );
  assert.equal(shadowResult.manifest.evidence.evidenceMode, "OFF");
  assert.equal(calls, 0);

  const metadata = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: scope.assistantId,
      RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
    },
    () => now,
    reader,
  );
  const metadataResult = await metadata.process(
    shadowSnapshot(scope, "metadata-1", "Qual é o endereço?"),
  );
  assert.equal(metadataResult.manifest.evidence.evidenceMode, "SHADOW_METADATA");
  assert.equal(metadataResult.manifest.evidence.adapterStatus, "COMPLETED");
  assert.equal(calls, 1);
  assert.equal(metadataResult.manifest.providerCalled, false);
  assert.equal(metadataResult.manifest.toolCalls, 0);
  assert.equal(metadataResult.manifest.outboundSent, false);
});

test("Shadow Metadata com adapter real persiste apenas manifesto sanitizado", async () => {
  const suffix = randomUUID().slice(0, 8);
  const companyId = `${prefix}-company-shadow-${suffix}`;
  const assistantId = `${prefix}-assistant-shadow-${suffix}`;
  const conversationId = `${prefix}-conversation-shadow-${suffix}`;
  await prisma.company.create({
    data: { id: companyId, name: `Empresa Shadow ${suffix}`, createdAt: now, updatedAt: now },
  });
  await prisma.assistant.create({
    data: {
      id: assistantId,
      companyId,
      name: `Assistente Shadow ${suffix}`,
      businessAddress: "Rua Shadow Sintética, 20",
      businessPhone: "(11) 98888-0000",
      timezone: "America/Sao_Paulo",
      weeklySchedule: schedule,
      createdAt: now,
      updatedAt: now,
    },
  });
  await prisma.assistantConversation.create({
    data: {
      id: conversationId,
      companyId,
      assistantId,
      source: "MANUAL_TEST",
      channelType: "UNKNOWN",
      currentContextVersion: 1,
    },
  });
  const adapter = new OfficialStructuredEvidenceAdapter(prisma);
  const orchestrator = new RuntimeV2ShadowOrchestrator(
    new InMemoryConversationStateStore(),
    {
      RUNTIME_V2_MODE: "SHADOW",
      RUNTIME_V2_SHADOW_ASSISTANT_IDS: assistantId,
      RUNTIME_V2_EVIDENCE_MODE: "SHADOW_METADATA",
    },
    () => now,
    adapter,
  );
  const result = await orchestrator.process(
    shadowSnapshot(
      { companyId, assistantId, conversationId, contextVersion: 1 },
      `${prefix}-message-address`,
      "Qual é o endereço?",
    ),
  );
  assert.equal(result.manifest.evidence.evidenceMode, "SHADOW_METADATA");
  assert.ok(result.manifest.evidence.officialEvidenceCount > 0);
  assert.ok(result.manifest.evidence.winningEvidenceIds.length > 0);
  assert.equal(JSON.stringify(result.manifest).includes("Rua Shadow Sintética"), false);
  assert.equal(JSON.stringify(result.manifest).includes("98888"), false);
  assert.equal(result.manifest.providerCalled, false);
  assert.equal(result.manifest.toolCalls, 0);
  assert.equal(result.manifest.outboundSent, false);
});
