require('dotenv').config({ path: '../../.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const inboxes = await prisma.chatwootInboxConfig.findMany({
    where: { isActive: true },
    select: {
      id: true,
      companyId: true,
      assistantId: true,
      inboxId: true,
      company: { select: { name: true, id: true } },
      assistant: { select: { name: true } }
    }
  });

  console.log("=== CHATWOOT INBOXES ===");
  console.log(JSON.stringify(inboxes, null, 2));

  for (const inbox of inboxes) {
    const companyId = inbox.companyId;
    console.log(`\n=== CHECKING TENANT: ${companyId} (${inbox.company?.name}) ===`);
    
    const app = await prisma.app.findFirst({ where: { slug: 'google_calendar' } });
    if (!app) {
      console.log("- App google_calendar not found");
      continue;
    }

    const installation = await prisma.appInstallation.findFirst({
      where: { companyId, appId: app.id }
    });
    console.log("- Installation status:", installation?.status || "NOT FOUND");

    if (installation) {
      const credential = await prisma.appCredential.findFirst({
        where: { companyId, installationId: installation.id, provider: 'google' }
      });
      console.log("- Credential status:", credential?.status || "NOT FOUND");

      const resources = await prisma.googleCalendarResource.findMany({
        where: { companyId, installationId: installation.id, active: true },
        select: { id: true, name: true, active: true }
      });
      console.log("- Active Resources:", resources.length);
      resources.forEach(r => console.log(`  - ${r.name} (${r.id})`));
    }
    
    const conv = await prisma.assistantConversation.findFirst({
      where: { companyId, source: 'CHATWOOT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, externalConversationId: true, createdAt: true, source: true }
    });
    console.log("- Latest CHATWOOT Conversation:", conv ? `${conv.id} at ${conv.createdAt}` : "NONE");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
