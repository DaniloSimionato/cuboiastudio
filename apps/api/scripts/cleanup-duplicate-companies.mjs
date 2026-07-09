import fs from "node:fs";
import path from "node:path";
import { PrismaClient, Status } from "@prisma/client";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  for (const candidate of [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", "..", ".env"),
  ]) {
    if (!fs.existsSync(candidate)) continue;
    for (const raw of fs.readFileSync(candidate, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.startsWith("DATABASE_URL=")) continue;
      return line.slice("DATABASE_URL=".length).trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }

  return "";
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const apply = process.argv.includes("--apply-empty-only");
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

try {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const groups = new Map();

  for (const company of companies) {
    const key = company.name.trim().toLocaleLowerCase("pt-BR");
    groups.set(key, [...(groups.get(key) ?? []), company]);
  }

  const duplicates = [...groups.values()].filter((group) => group.length > 1);
  if (duplicates.length === 0) {
    console.log("No duplicate active company names found.");
    process.exit(0);
  }

  for (const group of duplicates) {
    const [keeper, ...candidates] = group;
    console.log(`Duplicate group "${keeper.name}": keeping ${keeper.id}.`);

    for (const candidate of candidates) {
      const operationalRecords =
        (await prisma.assistant.count({ where: { companyId: candidate.id } })) +
        (await prisma.chatwootInboxConfig.count({ where: { companyId: candidate.id } })) +
        (await prisma.assistantConversation.count({ where: { companyId: candidate.id } })) +
        (await prisma.assistantKnowledge.count({ where: { companyId: candidate.id } })) +
        (await prisma.appInstallation.count({ where: { companyId: candidate.id } })) +
        (await prisma.googleCalendarBooking.count({ where: { companyId: candidate.id } }));

      if (!apply) {
        console.log(
          `- ${candidate.id}: ${operationalRecords} operational record(s), dry-run only.`,
        );
        continue;
      }
      if (operationalRecords > 0) {
        console.log(`- ${candidate.id}: skipped because it contains operational data.`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const memberships = await tx.companyMembership.findMany({
          where: { companyId: candidate.id },
          select: { userId: true, status: true },
        });
        for (const membership of memberships) {
          await tx.companyMembership.upsert({
            where: { userId_companyId: { userId: membership.userId, companyId: keeper.id } },
            update: { status: membership.status },
            create: {
              userId: membership.userId,
              companyId: keeper.id,
              status: membership.status,
            },
          });
        }
        const duplicateRoles = await tx.role.findMany({
          where: { companyId: candidate.id },
          select: {
            name: true,
            userRoles: { select: { userId: true } },
          },
        });
        for (const duplicateRole of duplicateRoles) {
          const keeperRole = await tx.role.findFirst({
            where: { companyId: keeper.id, name: duplicateRole.name },
            select: { id: true },
          });
          if (!keeperRole) continue;
          for (const userRole of duplicateRole.userRoles) {
            await tx.userRole.upsert({
              where: {
                userId_roleId: {
                  userId: userRole.userId,
                  roleId: keeperRole.id,
                },
              },
              update: {},
              create: { userId: userRole.userId, roleId: keeperRole.id },
            });
          }
        }
        await tx.user.updateMany({
          where: { companyId: candidate.id },
          data: { companyId: keeper.id },
        });
        await tx.user.updateMany({
          where: { activeCompanyId: candidate.id },
          data: { activeCompanyId: keeper.id },
        });
        await tx.companyMembership.deleteMany({ where: { companyId: candidate.id } });
        await tx.company.update({
          where: { id: candidate.id },
          data: {
            status: Status.INACTIVE,
            deletedAt: new Date(),
            notes: `Duplicate consolidated into ${keeper.id}.`,
          },
        });
      });
      console.log(`- ${candidate.id}: consolidated and soft-deleted.`);
    }
  }
} finally {
  await prisma.$disconnect();
}
