import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { PrismaService } from "../database/prisma.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);

  try {
    const logs = await prisma.assistantRuntimeLog.findMany({
      where: {
        assistantId: "cmrcunljc008rrq01d7urn2t5",
        createdAt: { gte: new Date("2026-07-28T18:45:00Z") }
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Found ${logs.length} logs.`);
    for (const log of logs) {
      console.log(`\n==================================================`);
      console.log(`Log ID: ${log.id} | CreatedAt: ${log.createdAt.toISOString()}`);
      console.log(`Intent: "${log.detectedIntent}" | Flow: "${log.selectedFlowName}"`);
      console.log(`BlockedByRule: ${log.blockedByRule} | BlockReason: ${log.blockReason}`);

      // Query the messages
      const userMsg = log.userMessageId
        ? await prisma.assistantConversationMessage.findUnique({ where: { id: log.userMessageId } })
        : null;
      const assistantMsg = log.assistantMessageId
        ? await prisma.assistantConversationMessage.findUnique({ where: { id: log.assistantMessageId } })
        : null;

      console.log(`👤 User: "${userMsg?.content ?? "N/A"}"`);
      console.log(`🤖 Assistant: "${assistantMsg?.content ?? "N/A"}"`);
      console.log(`Metadata:`, JSON.stringify(log.metadata, null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
