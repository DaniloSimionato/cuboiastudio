import { PrismaClient, Status } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_CLEANUP) {
    console.error("CRITICAL: Cleanup script executed in production mode without explicit ALLOW_PROD_CLEANUP! Aborting.");
    process.exit(1);
  }

  console.log("Starting smoke data cleanup on database...");

  // 1. Find all companies starting with "Smoke"
  const companies = await prisma.company.findMany({
    where: {
      name: {
        startsWith: "Smoke",
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (companies.length === 0) {
    console.log("No smoke companies found. Database is clean.");
    return;
  }

  console.log(`Found ${companies.length} smoke companies to delete:`);
  for (const c of companies) {
    console.log(` - ${c.name} (${c.id})`);
  }

  for (const company of companies) {
    const compId = company.id;
    console.log(`Deleting data for company: ${company.name} (${compId})...`);

    // Delete in reverse dependency order to satisfy foreign key constraints:
    
    // 1. App integrations & logs
    await prisma.appActionLog.deleteMany({ where: { companyId: compId } });
    await prisma.appCredential.deleteMany({ where: { companyId: compId } });
    await prisma.appInstallation.deleteMany({ where: { companyId: compId } });

    // 2. Google Calendar
    await prisma.googleCalendarBooking.deleteMany({ where: { companyId: compId } });
    await prisma.googleCalendarResource.deleteMany({ where: { companyId: compId } });

    // 3. Reservable resources
    await prisma.reservableResourceAttribute.deleteMany({ where: { companyId: compId } });
    await prisma.reservableResourceCategory.deleteMany({ where: { companyId: compId } });
    await prisma.reservableResourceType.deleteMany({ where: { companyId: compId } });

    // 4. ChatwootConfigs & AISettings
    await prisma.chatwootInboxConfig.deleteMany({ where: { companyId: compId } });
    await prisma.companyAiSettings.deleteMany({ where: { companyId: compId } });

    // 5. Assistant conversations, messages, logs & knowledge
    await prisma.assistantConversationMessage.deleteMany({ where: { companyId: compId } });
    await prisma.assistantConversation.deleteMany({ where: { companyId: compId } });
    await prisma.assistantPreviewLog.deleteMany({ where: { companyId: compId } });
    await prisma.assistantRuntimeLog.deleteMany({ where: { companyId: compId } });
    await prisma.assistantKnowledgeChunk.deleteMany({ where: { companyId: compId } });
    await prisma.assistantKnowledge.deleteMany({ where: { companyId: compId } });

    // 6. Assistants
    await prisma.assistant.deleteMany({ where: { companyId: compId } });

    // 7. Roles & permissions
    const roles = await prisma.role.findMany({ where: { companyId: compId }, select: { id: true } });
    const roleIds = roles.map((r) => r.id);
    await prisma.userRole.deleteMany({ where: { roleId: { in: roleIds } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
    await prisma.role.deleteMany({ where: { companyId: compId } });

    // 8. Update users activeCompanyId to null/primary if they are pointing to this deleted company
    const usersToUpdate = await prisma.user.findMany({
      where: { activeCompanyId: compId },
      select: { id: true, companyId: true }
    });
    for (const u of usersToUpdate) {
      await prisma.user.update({
        where: { id: u.id },
        data: { activeCompanyId: u.companyId }
      });
    }

    // 9. Memberships & Company
    await prisma.companyMembership.deleteMany({ where: { companyId: compId } });
    await prisma.company.delete({ where: { id: compId } });

    console.log(`Successfully deleted company ${company.name}`);
  }

  console.log("Smoke data cleanup completed successfully.");
}

main()
  .catch((error) => {
    console.error("Error during smoke data cleanup:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
