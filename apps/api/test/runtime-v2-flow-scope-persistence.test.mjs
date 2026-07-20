import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { AssistantFlowsService } from "../dist/assistant-flows/assistant-flows.service.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must point to a local disposable database");
}

const prisma = new PrismaClient();
const prefix = `runtime-v2-flow-scope-${randomUUID()}`;

function explicitFlowDto(overrides = {}) {
  return {
    name: "Horário oficial Runtime V2",
    runtimeScope: "V2_CONTROLLED",
    runtimeCategory: "businessHours",
    runtimeIntent: "ask_business_hours",
    runtimeAuthority: "OFFICIAL_CONTEXT",
    runtimeDirectOnly: true,
    flowInstructions:
      "Responda somente perguntas diretas sobre o horário usando contexto oficial estruturado.",
    ...overrides,
  };
}

before(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

after(async () => {
  await prisma.assistantFlow.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.assistant.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test("PostgreSQL persists an explicit V2 flow scope without enabling legacy flows", async () => {
  const companyId = `${prefix}-company`;
  const assistantId = `${prefix}-assistant`;
  await prisma.company.create({ data: { id: companyId, name: "Flow scope test" } });
  await prisma.assistant.create({
    data: { id: assistantId, companyId, name: "Flow scope assistant" },
  });
  const service = new AssistantFlowsService(prisma);

  const explicit = await service.create(companyId, assistantId, {
    ...explicitFlowDto(),
  });
  const legacy = await service.create(companyId, assistantId, { name: "Legacy V1 flow" });

  const persisted = await prisma.assistantFlow.findMany({
    where: { assistantId },
    orderBy: { name: "asc" },
  });
  const persistedExplicit = persisted.find((flow) => flow.id === explicit.id);
  const persistedLegacy = persisted.find((flow) => flow.id === legacy.id);
  assert.equal(persistedExplicit?.runtimeScope, "V2_CONTROLLED");
  assert.equal(persistedExplicit?.runtimeCategory, "businessHours");
  assert.equal(persistedExplicit?.runtimeIntent, "ask_business_hours");
  assert.equal(persistedExplicit?.runtimeAuthority, "OFFICIAL_CONTEXT");
  assert.equal(persistedExplicit?.runtimeDirectOnly, true);
  assert.equal(persistedLegacy?.runtimeScope, null);
  assert.equal(persistedLegacy?.runtimeCategory, null);

  await assert.rejects(
    () =>
      service.create(companyId, assistantId, {
        ...explicitFlowDto({ name: "Invalid V2 flow", knowledgeScope: '["knowledge-1"]' }),
      }),
    /RUNTIME_V2_FLOW_CONTRACT_NON_STANDARD/,
  );
  assert.equal(await prisma.assistantFlow.count({ where: { assistantId } }), 2);
});
