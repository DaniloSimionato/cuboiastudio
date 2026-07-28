import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { PrismaService } from "../database/prisma.service";
import { AssistantKnowledgeRetrievalService } from "../assistant-knowledge/assistant-knowledge-retrieval.service";
import { validateV1AnswerAuthority } from "../assistant-conversations/runtime-authority-guard";
import { extractRagPriceAuthorities } from "../assistant-conversations/rag-price-authority";

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
    const eligiblePriceAuthorities = [];
    for (const item of ragResult.results) {
      const chunk = await prisma.assistantKnowledgeChunk.findUniqueOrThrow({
        where: { id: item.chunkId },
      });
      const authorities = extractRagPriceAuthorities({
        chunkId: chunk.id,
        knowledgeItemId: chunk.knowledgeId,
        title: item.knowledgeTitle,
        content: chunk.content,
      });
      eligiblePriceAuthorities.push(...authorities);
    }

    console.log("Eligible Price Authorities count:", eligiblePriceAuthorities.length);

    // Mock official context
    const mockOfficialContext = {
      companyName: "FG Informática",
      companyTimezone: "America/Campo_Grande",
      assistantTimezone: "America/Campo_Grande",
      timezone: "America/Campo_Grande",
      description: "",
      address: "",
      city: "",
      state: "",
      cityRegion: "",
      postalCode: "",
      googleMapsUrl: "",
      latitude: null,
      longitude: null,
      phone: "",
      whatsapp: "",
      whatsappSupport: "",
      websiteUrl: "",
      aiRespondsOutsideBusinessHours: true,
      businessHours: {} as any,
      businessHoursConfigurationValid: false,
      businessHoursValidationIssueCount: 0,
      businessStatus: "",
      localityLabel: "",
      promptBlock: "",
      dataPriorityInstruction: "",
    };

    const candidates = [
      "Sim, formatamos PCs! O valor para formatação começa a partir de R$ 195,00.",
      "Formatamos sim! O valor é a partir de R$ 195,00.",
      "Sim, formatamos computadores. O valor cobrado é a partir de R$ 195,00 para formatação básica padrão.",
      "O valor da formatação é R$ 195,00.",
      "Fazemos a formatação básica padrão a partir de R$ 195,00."
    ];

    for (const answer of candidates) {
      console.log(`\n--------------------------------------------`);
      console.log(`Testing answer: "${answer}"`);
      const result = validateV1AnswerAuthority({
        answer,
        currentMessage: lastUserMessage.content,
        sources: ragResult.results.map(r => ({ id: r.chunkId, title: r.knowledgeTitle })),
        eligiblePriceAuthorities,
        officialBusinessContext: mockOfficialContext as any,
        expectedAuthorityCategory: "price",
      });

      console.log("Result:");
      console.log("  unsupportedClaimDetected:", result.unsupportedClaimDetected);
      console.log("  replacementReason:", result.replacementReason);
      console.log("  blockedCategories:", result.blockedCategories);
      console.log("  answer:", result.answer);
    }

  } catch (error) {
    console.error("❌ Error during prompt debug:", error);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
