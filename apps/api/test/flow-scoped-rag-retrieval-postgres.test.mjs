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
        metadata: { type: "TEXT", tags: ["Formatação", "sistemas"] },
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
        metadata: { type: "TEXT", tags: ["recuperacao_dados"] },
      },
    }),
  ]);
  const otherCompany = await prisma.company.create({ data: { name: "Other flow scope company" } });
  const otherAssistant = await prisma.assistant.create({
    data: { companyId: company.id, name: "Other flow scope assistant", ragEnabled: true },
  });
  const otherCompanyAssistant = await prisma.assistant.create({
    data: { companyId: otherCompany.id, name: "Other company assistant", ragEnabled: true },
  });
  const [inactiveKnowledge, otherAssistantKnowledge, otherCompanyKnowledge] = await Promise.all([
    prisma.assistantKnowledge.create({
      data: {
        companyId: company.id,
        assistantId: assistant.id,
        title: "Inativo",
        content: "Não deve ser consultado.",
        status: "INACTIVE",
        processingStatus: "READY",
        metadata: { type: "TEXT", tags: ["formatacao"] },
      },
    }),
    prisma.assistantKnowledge.create({
      data: {
        companyId: company.id,
        assistantId: otherAssistant.id,
        title: "Outro assistant",
        content: "Não deve ser consultado.",
        status: "ACTIVE",
        processingStatus: "READY",
        metadata: { type: "TEXT", tags: ["formatacao"] },
      },
    }),
    prisma.assistantKnowledge.create({
      data: {
        companyId: otherCompany.id,
        assistantId: otherCompanyAssistant.id,
        title: "Outra empresa",
        content: "Não deve ser consultado.",
        status: "ACTIVE",
        processingStatus: "READY",
        metadata: { type: "TEXT", tags: ["formatacao"] },
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
        knowledgeId: formatting.id,
        chunkIndex: 1,
        content: "Chunk inativo não pode conceder autoridade.",
        embedding: [1, 0],
        embeddingModel: "test-embedding",
        embeddingDimension: 2,
        status: "INACTIVE",
      },
      {
        companyId: company.id,
        assistantId: assistant.id,
        knowledgeId: inactiveKnowledge.id,
        chunkIndex: 0,
        content: "Conhecimento inativo não pode ser recuperado.",
        embedding: [1, 0],
        embeddingModel: "test-embedding",
        embeddingDimension: 2,
        status: "ACTIVE",
      },
      {
        companyId: company.id,
        assistantId: otherAssistant.id,
        knowledgeId: otherAssistantKnowledge.id,
        chunkIndex: 0,
        content: "Outro assistant não pode ser recuperado.",
        embedding: [1, 0],
        embeddingModel: "test-embedding",
        embeddingDimension: 2,
        status: "ACTIVE",
      },
      {
        companyId: otherCompany.id,
        assistantId: otherCompanyAssistant.id,
        knowledgeId: otherCompanyKnowledge.id,
        chunkIndex: 0,
        content: "Outra empresa não pode ser recuperada.",
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
    knowledgeScopeTags: ["formatacao"],
    scoreThreshold: 0.55,
  });

  assert.equal(result.knowledgeScopeApplied, true);
  assert.deepEqual(result.allowedKnowledgeTags, ["formatacao"]);
  assert.equal(result.rejectedOutOfScopeChunkCount, 1);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].knowledgeId, formatting.id);
  assert.doesNotMatch(result.results[0].contentPreview, /R\$ 195,00/);

  const noMatch = await retrieval.searchRelevantKnowledge({
    tenant: { companyId: company.id },
    assistantId: assistant.id,
    query: "Qual o valor para formatar um PC?",
    knowledgeScopeTags: ["inexistente"],
    scoreThreshold: 0.55,
  });
  assert.equal(noMatch.results.length, 0);
  assert.equal(noMatch.knowledgeScopeNoMatch, true);
  assert.equal(noMatch.rejectedOutOfScopeChunkCount, 2);
});
