import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { ContactMemoriesService } from "../dist/contact-memories/contact-memories.service.js";

// Integration test using real PostgreSQL database with pgvector on port 5433
test("Integration: pgvector lifecycle on real Postgres database", async () => {
  const prisma = new PrismaClient();
  const testCompanyId = `company_pgvector_${randomUUID()}`;
  const testProfileId = `profile_pgvector_${randomUUID()}`;

  try {
    // 1. Setup mock AiService producing real 1536 float arrays
    const mockAiService = {
      generateEmbedding: async (input) => {
        const text = input.text.toLowerCase();
        let embedding = new Array(1536).fill(0.9);
        if (
          text.includes("macbook") ||
          text.includes("mac mini") ||
          text.includes("apple") ||
          text.includes("mac") ||
          text.includes("maçã") ||
          text.includes("maca")
        ) {
          embedding = new Array(1536).fill(0.1);
        }
        return {
          provider: "openai",
          model: "text-embedding-3-small",
          embedding,
          dimension: 1536,
          durationMs: 5,
        };
      },
    };

    const mockCacheService = {
      get: async (key) => null,
      set: async (key, val, ttl) => {},
    };

    const service = new ContactMemoriesService(prisma, mockAiService, mockCacheService);
    const originalVectorizeMemoryItem = service.vectorizeMemoryItem.bind(service);
    let suppressBackgroundVectorization = true;
    service.vectorizeMemoryItem = async (...args) => {
      if (suppressBackgroundVectorization) {
        suppressBackgroundVectorization = false;
        return false;
      }
      return originalVectorizeMemoryItem(...args);
    };

    await prisma.company.create({
      data: { id: testCompanyId, name: "pgvector integration fixture" },
    });

    // Clean up any stale data from previous run just in case
    await prisma.$executeRawUnsafe(
      `DELETE FROM contact_memory_items WHERE "companyId" = $1`,
      testCompanyId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM contact_memory_profiles WHERE "companyId" = $1`,
      testCompanyId,
    );

    // Create a real profile
    const profile = await prisma.contactMemoryProfile.create({
      data: {
        id: testProfileId,
        companyId: testCompanyId,
        identityKey: "phone_5567999999999",
        displayName: "Integration Contact",
      },
    });

    // 2. Create memory item (will be PENDING vectorization)
    const item = await service.upsertMemoryItem({
      companyId: testCompanyId,
      profileId: profile.id,
      category: "PREFERENCE",
      key: "equipamentos",
      value: "O cliente possui 3 MacBook Air e 2 Mac Mini.",
      confidence: 0.9,
      sourceType: "MANUAL",
    });

    assert.equal(item.embeddingStatus, "PENDING");
    assert.ok(item.contentHash);

    // Verify it is in the database with null embedding
    const dbItemBefore = await prisma.contactMemoryItem.findUnique({
      where: { id: item.id },
    });
    assert.ok(dbItemBefore);
    assert.ok(["PENDING", "PROCESSING", "READY"].includes(dbItemBefore.embeddingStatus));

    // 3. Trigger manual vectorization (calls raw update mapping vector)
    await service.vectorizeMemoryItem(item.id, testCompanyId);

    // Verify the status has been updated to READY in the DB
    const dbItemAfter = await prisma.contactMemoryItem.findUnique({
      where: { id: item.id },
    });
    assert.equal(dbItemAfter.embeddingStatus, "READY");
    assert.equal(dbItemAfter.embeddingModel, "text-embedding-3-small");
    assert.equal(dbItemAfter.embeddingVersion, "v1");

    // Verify the embedding vector exists (we can read it via select)
    const [rawRow] = await prisma.$queryRawUnsafe(
      `SELECT embedding::text FROM contact_memory_items WHERE id = $1`,
      item.id,
    );
    assert.ok(rawRow);
    assert.ok(rawRow.embedding);
    assert.match(rawRow.embedding, /^\[0\.1,0\.1,/); // Starts with our mock vector values

    // 4. Run raw similarity query using pgvector operators
    const searchResults = await service.searchSemanticMemories({
      companyId: testCompanyId,
      profileId: profile.id,
      query: "Quais computadores Apple ele possui?",
      threshold: 0.7,
      maxCandidates: 5,
    });

    assert.equal(searchResults.length, 1);
    assert.equal(searchResults[0].id, item.id);
    assert.ok(searchResults[0].similarity > 0.99); // They share the same 0.1 vector, distance <=> is 0, similarity (1 - 0) is 1.0

    // 5. Clean up database
    await prisma.$executeRawUnsafe(
      `DELETE FROM contact_memory_items WHERE "companyId" = $1`,
      testCompanyId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM contact_memory_profiles WHERE "companyId" = $1`,
      testCompanyId,
    );
  } finally {
    await prisma.$executeRawUnsafe(
      `DELETE FROM contact_memory_items WHERE "companyId" = $1`,
      testCompanyId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM contact_memory_profiles WHERE "companyId" = $1`,
      testCompanyId,
    );
    await prisma.company.deleteMany({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  }
});
