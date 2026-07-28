import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { AssistantKnowledgeRetrievalService } from "../assistant-knowledge/assistant-knowledge-retrieval.service";

const ASSISTANT_ID = "cmrcunljc008rrq01d7urn2t5";
const COMPANY_ID = "cmrcu4hdl008yrq01noholvvd";

async function main() {
  console.log("🚀 Starting RAG debug script...");
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  const retrievalService = app.get(AssistantKnowledgeRetrievalService);

  const query = "Qual o valor pra arrumar?";
  const mockTenant = { companyId: COMPANY_ID } as any;

  try {
    // Test 1: Retrieval without flow scope tags
    console.log(`\n🔍 Test 1: Retrieval for query "${query}" (NO scope tags)`);
    const res1 = await retrievalService.searchRelevantKnowledge({
      assistantId: ASSISTANT_ID,
      tenant: mockTenant,
      query,
      scoreThreshold: 0.30,
    });

    console.log(`Result counts: scanned=${res1.totalChunksScanned}, returned=${res1.results.length}`);
    for (const [idx, item] of res1.results.entries()) {
      console.log(`  [#${idx+1}] Score: ${item.score.toFixed(4)} | Title: "${item.knowledgeTitle}"`);
      console.log(`       Content: ${item.contentPreview.substring(0, 150)}...`);
    }

    // Test 2: Retrieval with specific flow scope tags (e.g. Orçamento e Preços flow tags: ["formatacao","placa_mae","remocao_virus"])
    const tags = ["formatacao", "placa_mae", "remocao_virus"];
    console.log(`\n🔍 Test 2: Retrieval with scope tags ${JSON.stringify(tags)}`);
    const res2 = await retrievalService.searchRelevantKnowledge({
      assistantId: ASSISTANT_ID,
      tenant: mockTenant,
      query,
      scoreThreshold: 0.30,
      knowledgeScopeTags: tags,
    });

    console.log(`Result counts: scanned=${res2.totalChunksScanned}, returned=${res2.results.length}`);
    for (const [idx, item] of res2.results.entries()) {
      console.log(`  [#${idx+1}] Score: ${item.score.toFixed(4)} | Title: "${item.knowledgeTitle}"`);
      console.log(`       Content: ${item.contentPreview.substring(0, 150)}...`);
    }

  } catch (error) {
    console.error("❌ Error during debug-rag execution:", error);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
