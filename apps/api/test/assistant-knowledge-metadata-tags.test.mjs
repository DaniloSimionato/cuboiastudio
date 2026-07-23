import assert from "node:assert/strict";
import test from "node:test";
import { AssistantKnowledgeService } from "../dist/assistant-knowledge/assistant-knowledge.service.js";

const timestamp = new Date("2026-07-23T12:00:00.000Z");

function createKnowledgeServiceFixture() {
  let stored = null;
  const toRecord = (data) => ({
    id: "knowledge-1",
    title: data.title ?? stored?.title ?? "Conhecimento",
    content: data.content ?? stored?.content ?? "Conteúdo",
    status: data.status ?? stored?.status ?? "ACTIVE",
    processingStatus: "PENDING",
    chunkCount: 0,
    processedAt: null,
    processingError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: data.metadata ?? stored?.metadata ?? null,
  });
  const prisma = {
    assistant: { findFirst: async () => ({ id: "assistant-1" }) },
    assistantKnowledge: {
      create: async ({ data }) => {
        stored = toRecord(data);
        return stored;
      },
      findFirst: async () => stored,
      updateMany: async ({ data }) => {
        stored = toRecord({ ...stored, ...data });
        return { count: 1 };
      },
    },
  };

  return new AssistantKnowledgeService(prisma, {});
}

const actor = { companyId: "company-1" };
const tenant = { companyId: "company-1" };

test("CRUD preserva metadata existente ao salvar metadata.tags", async () => {
  const service = createKnowledgeServiceFixture();
  const created = await service.create({
    assistantId: "assistant-1",
    user: actor,
    tenant,
    dto: {
      title: "Formatação",
      content: "Conteúdo",
      metadata: { type: "TEXT", source: "manual", tags: ["Formatação"] },
    },
  });

  assert.deepEqual(created.metadata, {
    type: "TEXT",
    source: "manual",
    tags: ["Formatação"],
  });

  const updated = await service.update({
    assistantId: "assistant-1",
    knowledgeId: "knowledge-1",
    user: actor,
    tenant,
    dto: {
      metadata: { ...created.metadata, tags: ["Formatação", "Sistemas"] },
    },
  });

  assert.deepEqual(updated.metadata, {
    type: "TEXT",
    source: "manual",
    tags: ["Formatação", "Sistemas"],
  });
});
