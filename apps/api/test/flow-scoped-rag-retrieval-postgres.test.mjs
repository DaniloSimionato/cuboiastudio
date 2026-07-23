import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { AssistantKnowledgeRetrievalService } from "../dist/assistant-knowledge/assistant-knowledge-retrieval.service.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must point to a local disposable database");
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname)) {
  throw new Error("flow-scoped retrieval test requires a loopback disposable database");
}

const prisma = new PrismaClient();

test.after(async () => {
  await prisma.$disconnect();
});

test("PostgreSQL: retrieval escopado não consulta conhecimento de outra base", async () => {
  const company = await prisma.company.create({ data: { name: "Flow scope test" } });
  const assistant = await prisma.assistant.create({
    data: { companyId: company.id, name: "Flow scope assistant", ragEnabled: true },
  });
  const [formatting, recovery] = await Promise.all([
    prisma.assistantKnowledge.create({
      data: {
        companyId: company.id,
        assistantId: assistant.id,
        title: "Formatação",
        content: "Formatação a partir de R$ 1.950,00.",
        status: "ACTIVE",
        processingStatus: "READY",
      },
    }),
    prisma.assistantKnowledge.create({
      data: {
        companyId: company.id,
        assistantId: assistant.id,
        title: "Recuperação",
        content: "Montagem a partir de R$ 195,00.",
        status: "ACTIVE",
        processingStatus: "READY",
      },
    }),
  ]);
  await prisma.assistantKnowledgeChunk.createMany({
    data: [
      {
        companyId: company.id,
        assistantId: assistant.id,
        knowledgeId: formatting.id,
        chunkIndex: 0,
        content: "A formatação custa a partir de R$ 1.950,00.",
        embedding: [1, 0],
        embeddingModel: "test-embedding",
        embeddingDimension: 2,
        status: "ACTIVE",
      },
      {
        companyId: company.id,
        assistantId: assistant.id,
        knowledgeId: recovery.id,
        chunkIndex: 0,
        content: "Montagem custa a partir de R$ 195,00.",
        embedding: [0.99, 0.1],
        embeddingModel: "test-embedding",
        embeddingDimension: 2,
        status: "ACTIVE",
      },
    ],
  });

  const retrieval = new AssistantKnowledgeRetrievalService(prisma, {
    generateEmbedding: async () => ({ embedding: [1, 0] }),
  });
  const result = await retrieval.searchRelevantKnowledge({
    tenant: { companyId: company.id },
    assistantId: assistant.id,
    query: "Qual o valor para formatar um PC?",
    knowledgeIds: [formatting.id],
    scoreThreshold: 0.55,
  });

  assert.equal(result.knowledgeScopeApplied, true);
  assert.deepEqual(result.allowedKnowledgeIds, [formatting.id]);
  assert.equal(result.rejectedOutOfScopeChunkCount, 1);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].knowledgeId, formatting.id);
  assert.doesNotMatch(result.results[0].contentPreview, /R\$ 195,00/);
});
