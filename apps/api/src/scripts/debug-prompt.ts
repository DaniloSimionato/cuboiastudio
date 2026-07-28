import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { PrismaService } from "../database/prisma.service";
import { PromptCompilerService } from "../prompt-compiler/prompt-compiler.service";
import { AssistantKnowledgeRetrievalService } from "../assistant-knowledge/assistant-knowledge-retrieval.service";
import { AiService } from "../ai/ai.service";
import { extractRagPriceAuthorities, filterEligibleRagPriceAuthorities } from "../assistant-conversations/rag-price-authority";

const CONVERSATION_ID = "cmro6nenn0027nv010re0g7am";
const ASSISTANT_ID = "cmrcunljc008rrq01d7urn2t5";
const COMPANY_ID = "cmrcu4hdl008yrq01noholvvd";

async function main() {
  console.log("🚀 Starting Prompt Debug script...");
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const retrievalService = app.get(AssistantKnowledgeRetrievalService);

  try {
    const messages = await prisma.assistantConversationMessage.findMany({
      where: { conversationId: CONVERSATION_ID },
      orderBy: { createdAt: "asc" },
    });

    const lastUserMessage = messages[messages.length - 2];
    console.log(`\n🎯 Latest user message: "${lastUserMessage.content}"`);

    // Re-run RAG search
    const ragResult = await retrievalService.searchRelevantKnowledge({
      assistantId: ASSISTANT_ID,
      tenant: { companyId: COMPANY_ID } as any,
      query: lastUserMessage.content,
      scoreThreshold: 0.30,
    });

    console.log(`\n📚 RAG Chunks matched: ${ragResult.results.length}`);
    for (const item of ragResult.results) {
      console.log(`  - Title: "${item.knowledgeTitle}" | Score: ${item.score}`);
      // Retrieve chunk details from db
      const chunk = await prisma.assistantKnowledgeChunk.findUniqueOrThrow({
        where: { id: item.chunkId },
      });

      console.log(`    Content: "${chunk.content}"`);

      // Extract price authorities
      const authorities = extractRagPriceAuthorities({
        chunkId: chunk.id,
        knowledgeItemId: chunk.knowledgeId,
        title: item.knowledgeTitle,
        content: chunk.content,
      });

      console.log(`    Extracted Price Authorities:`, authorities);

      const filtered = filterEligibleRagPriceAuthorities({
        authorities,
        currentMessage: lastUserMessage.content,
      });
      console.log(`    Filtered for user message:`, filtered);
    }

  } catch (error) {
    console.error("❌ Error during prompt debug:", error);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
