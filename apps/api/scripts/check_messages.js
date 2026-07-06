require('dotenv').config({ path: '../../.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const convId = 'cmr6jupcn0001xz69yysl8zkt';
  const messages = await prisma.assistantConversationMessage.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true, externalPayload: true }
  });

  console.log("=== MESSAGES IN CHATWOOT CONV ===");
  messages.forEach(m => console.log(`[${m.role}] ${m.content.slice(0, 80)}... | tools: ${JSON.stringify(m.externalPayload)}`));

  await prisma.$disconnect();
}

main().catch(console.error);
