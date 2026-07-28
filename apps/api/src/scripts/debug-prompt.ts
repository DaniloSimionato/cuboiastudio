import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { PrismaService } from "../database/prisma.service";
import { PromptCompilerService } from "../prompt-compiler/prompt-compiler.service";
import { AssistantKnowledgeRetrievalService } from "../assistant-knowledge/assistant-knowledge-retrieval.service";
import { AiService } from "../ai/ai.service";

const CONVERSATION_ID = "cmro6nenn0027nv010re0g7am";
const ASSISTANT_ID = "cmrcunljc008rrq01d7urn2t5";
const COMPANY_ID = "cmrcu4hdl008yrq01noholvvd";

async function main() {
  console.log("🚀 Starting Prompt Debug script...");
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const compiler = app.get(PromptCompilerService);
  const retrievalService = app.get(AssistantKnowledgeRetrievalService);
  const aiService = app.get(AiService);

  try {
    const assistant = await prisma.assistant.findUniqueOrThrow({
      where: { id: ASSISTANT_ID },
      include: { behavior: true },
    });

    const conversation = await prisma.assistantConversation.findUniqueOrThrow({
      where: { id: CONVERSATION_ID },
    });

    const messages = await prisma.assistantConversationMessage.findMany({
      where: { conversationId: CONVERSATION_ID },
      orderBy: { createdAt: "asc" },
    });

    console.log("💬 Conversation history:");
    for (const msg of messages) {
      console.log(`  [${msg.role}] ${msg.content}`);
    }

    const lastUserMessage = messages[messages.length - 2]; // the latest user message was the second to last
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
    }

    // Compile the prompt
    console.log("\n⚙️ Compiling prompt...");
    const compiledMessages = compiler.compile({
      assistant,
      behavior: assistant.behavior!,
      historyMessages: messages.slice(0, -1).map(m => ({
        id: m.id,
        role: m.role as any,
        content: m.content,
        createdAt: m.createdAt,
      })),
      currentMessage: lastUserMessage.content,
      knowledgeItems: ragResult.results.map(r => ({
        id: r.knowledgeId,
        title: r.knowledgeTitle,
        content: r.contentPreview,
      })),
      officialBusinessContext: null,
    });

    console.log("\n📜 Compiled Messages sent to LLM:");
    for (const [idx, msg] of compiledMessages.entries()) {
      console.log(`\n--- Message #${idx+1} [${msg.role}] ---`);
      console.log(msg.content);
    }

    // Run completion to test
    console.log("\n🤖 Running completion request to OpenAI...");
    const completion = await aiService.generateChatCompletion({
      companyId: COMPANY_ID,
      messages: compiledMessages,
    });

    console.log("\n✨ LLM Response:");
    console.log(completion.answer);

  } catch (error) {
    console.error("❌ Error during prompt debug:", error);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
