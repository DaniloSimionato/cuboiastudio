import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const DEFAULT_SMOKE_PREFIX = "[SMOKE]";
const LEGACY_SMOKE_PREFIX = "Assistente Smoke Test";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const apiRequire = createRequire(path.join(rootDir, "apps", "api", "package.json"));
const { PrismaClient, Status } = apiRequire("@prisma/client");
const candidateEnvFiles = [path.join(rootDir, ".env"), path.join(rootDir, "apps", "api", ".env")];

function printUsage() {
  console.log(`
Usage:
  node scripts/cleanup-smoke-artifacts.mjs
  node scripts/cleanup-smoke-artifacts.mjs --apply
  node scripts/cleanup-smoke-artifacts.mjs --apply --companyId=<id>
  node scripts/cleanup-smoke-artifacts.mjs --apply --olderThanDays=7
  node scripts/cleanup-smoke-artifacts.mjs --apply --prefix="[SMOKE]"

Default mode is dry-run. Use --apply to set smoke assistants and linked inactive-able artifacts to INACTIVE.

Options:
  --apply              Apply changes. Without this flag the script only reports what would change.
  --companyId=<id>     Restrict cleanup to one company/tenant.
  --olderThanDays=<n>  Restrict cleanup to assistants created at least n days ago.
  --prefix=<prefix>    Restrict cleanup to names starting with this prefix. Defaults to [SMOKE].
`);
}

export function parseArgs(argv) {
  const options = {
    apply: false,
    companyId: null,
    olderThanDays: null,
    prefix: DEFAULT_SMOKE_PREFIX,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg.startsWith("--companyId=")) {
      const value = arg.slice("--companyId=".length).trim();
      if (!value) {
        throw new Error("--companyId requires a non-empty value.");
      }
      options.companyId = value;
      continue;
    }

    if (arg.startsWith("--olderThanDays=")) {
      const rawValue = arg.slice("--olderThanDays=".length).trim();
      const value = Number(rawValue);
      if (!Number.isInteger(value) || value < 0) {
        throw new Error("--olderThanDays must be a non-negative integer.");
      }
      options.olderThanDays = value;
      continue;
    }

    if (arg.startsWith("--prefix=")) {
      const value = arg.slice("--prefix=".length).trim();
      if (!value) {
        throw new Error("--prefix requires a non-empty value.");
      }
      options.prefix = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function stripMatchingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripMatchingQuotes(line.slice(separatorIndex + 1).trim());
    entries[key] = value;
  }

  return entries;
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  for (const filePath of candidateEnvFiles) {
    const env = parseEnvFile(filePath);
    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL;
      return env.DATABASE_URL;
    }
  }

  return "";
}

function smokePrefixCandidates(prefix) {
  const candidates = new Set([prefix]);

  if (prefix.endsWith("]")) {
    candidates.add(`${prefix.slice(0, -1)}:`);
  }

  return [...candidates];
}

export function isSmokeAssistantName(
  name,
  { prefix = DEFAULT_SMOKE_PREFIX, includeLegacy = true } = {},
) {
  if (typeof name !== "string") {
    return false;
  }

  if (includeLegacy && name.startsWith(LEGACY_SMOKE_PREFIX)) {
    return true;
  }

  return smokePrefixCandidates(prefix).some((candidate) => name.startsWith(candidate));
}

export function buildAssistantWhere(options, now = new Date()) {
  const includeLegacy = options.prefix === DEFAULT_SMOKE_PREFIX;
  const createdAt = {};

  if (options.olderThanDays !== null) {
    createdAt.lte = new Date(now.getTime() - options.olderThanDays * 24 * 60 * 60 * 1000);
  }

  return {
    ...(options.companyId ? { companyId: options.companyId } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    OR: [
      ...smokePrefixCandidates(options.prefix).map((prefix) => ({
        name: { startsWith: prefix },
      })),
      ...(includeLegacy ? [{ name: { startsWith: LEGACY_SMOKE_PREFIX } }] : []),
    ],
  };
}

function printAssistantTable(assistants) {
  if (assistants.length === 0) {
    console.log("No smoke assistants found.");
    return;
  }

  for (const assistant of assistants) {
    console.log(
      [
        `- ${assistant.id}`,
        `name="${assistant.name}"`,
        `status=${assistant.status}`,
        `company=${assistant.company.name} (${assistant.companyId})`,
        `createdAt=${assistant.createdAt.toISOString()}`,
        `updatedAt=${assistant.updatedAt.toISOString()}`,
        `conversations=${assistant._count.conversations}`,
        `messages=${assistant._count.assistantConversationMessages}`,
        `knowledge=${assistant._count.knowledgeItems}`,
        `previewLogs=${assistant._count.previewLogs}`,
        `runtimeLogs=${assistant._count.runtimeLogs}`,
      ].join(" | "),
    );
  }
}

export async function buildReport(prisma, smokeAssistantIds) {
  if (smokeAssistantIds.length === 0) {
    return {
      activeAssistantCount: 0,
      activeConversationCount: 0,
      activeKnowledgeCount: 0,
      messageCount: 0,
      previewLogCount: 0,
      runtimeLogCount: 0,
    };
  }

  const [
    activeAssistantCount,
    activeConversationCount,
    activeKnowledgeCount,
    messageCount,
    previewLogCount,
    runtimeLogCount,
  ] = await Promise.all([
    prisma.assistant.count({
      where: { id: { in: smokeAssistantIds }, status: { not: Status.INACTIVE } },
    }),
    prisma.assistantConversation.count({
      where: { assistantId: { in: smokeAssistantIds }, status: { not: Status.INACTIVE } },
    }),
    prisma.assistantKnowledge.count({
      where: { assistantId: { in: smokeAssistantIds }, status: { not: Status.INACTIVE } },
    }),
    prisma.assistantConversationMessage.count({
      where: { assistantId: { in: smokeAssistantIds } },
    }),
    prisma.assistantPreviewLog.count({
      where: { assistantId: { in: smokeAssistantIds } },
    }),
    prisma.assistantRuntimeLog.count({
      where: { assistantId: { in: smokeAssistantIds } },
    }),
  ]);

  return {
    activeAssistantCount,
    activeConversationCount,
    activeKnowledgeCount,
    messageCount,
    previewLogCount,
    runtimeLogCount,
  };
}

function printReport({ mode, options, assistants, report, applyResult }) {
  console.log(`Smoke artifact cleanup mode: ${mode}`);
  console.log(`Prefix: ${options.prefix}`);
  console.log(`Company filter: ${options.companyId ?? "all companies"}`);
  console.log(
    `Age filter: ${
      options.olderThanDays === null
        ? "any age"
        : `created at least ${options.olderThanDays} days ago`
    }`,
  );
  console.log("");
  console.log(`Smoke assistants found: ${assistants.length}`);
  printAssistantTable(assistants);
  console.log("");
  console.log("Linked artifacts:");
  console.log(`- active assistants to inactivate: ${report.activeAssistantCount}`);
  console.log(`- active conversations to inactivate: ${report.activeConversationCount}`);
  console.log(`- active knowledge items to inactivate: ${report.activeKnowledgeCount}`);
  console.log(`- messages linked to smoke assistants: ${report.messageCount} (preserved)`);
  console.log(`- preview logs linked to smoke assistants: ${report.previewLogCount} (preserved)`);
  console.log(`- runtime logs linked to smoke assistants: ${report.runtimeLogCount} (preserved)`);
  console.log("");

  if (applyResult) {
    console.log("Actions applied:");
    console.log(`- assistants set to INACTIVE: ${applyResult.assistants.count}`);
    console.log(`- conversations set to INACTIVE: ${applyResult.conversations.count}`);
    console.log(`- knowledge items set to INACTIVE: ${applyResult.knowledge.count}`);
    console.log("- messages: preserved");
    console.log("- preview logs: preserved");
    console.log("- runtime logs: preserved");
    return;
  }

  console.log("Dry-run actions:");
  console.log("- would set matching smoke assistants to INACTIVE");
  console.log("- would set conversations linked to matching smoke assistants to INACTIVE");
  console.log("- would set knowledge linked to matching smoke assistants to INACTIVE");
  console.log("- would preserve messages, preview logs and runtime logs");
  console.log("");
  console.log("Run with --apply to execute these changes.");
}

export async function findSmokeAssistants(prisma, options) {
  const includeLegacy = options.prefix === DEFAULT_SMOKE_PREFIX;
  const candidates = await prisma.assistant.findMany({
    where: buildAssistantWhere(options),
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      company: { select: { id: true, name: true } },
      _count: {
        select: {
          conversations: true,
          assistantConversationMessages: true,
          knowledgeItems: true,
          previewLogs: true,
          runtimeLogs: true,
        },
      },
    },
  });

  return candidates.filter((assistant) =>
    isSmokeAssistantName(assistant.name, { prefix: options.prefix, includeLegacy }),
  );
}

export async function applyCleanup(prisma, smokeAssistantIds) {
  if (smokeAssistantIds.length === 0) {
    return {
      assistants: { count: 0 },
      conversations: { count: 0 },
      knowledge: { count: 0 },
    };
  }

  return prisma.$transaction(async (tx) => {
    const knowledge = await tx.assistantKnowledge.updateMany({
      where: { assistantId: { in: smokeAssistantIds }, status: { not: Status.INACTIVE } },
      data: { status: Status.INACTIVE },
    });

    const conversations = await tx.assistantConversation.updateMany({
      where: { assistantId: { in: smokeAssistantIds }, status: { not: Status.INACTIVE } },
      data: { status: Status.INACTIVE },
    });

    const assistants = await tx.assistant.updateMany({
      where: { id: { in: smokeAssistantIds }, status: { not: Status.INACTIVE } },
      data: { status: Status.INACTIVE },
    });

    return { assistants, conversations, knowledge };
  });
}

export async function runCleanup({ prisma, options }) {
  const smokeAssistants = await findSmokeAssistants(prisma, options);
  const smokeAssistantIds = smokeAssistants.map((assistant) => assistant.id);
  const report = await buildReport(prisma, smokeAssistantIds);

  if (!options.apply || smokeAssistantIds.length === 0) {
    printReport({
      mode: "dry-run",
      options,
      assistants: smokeAssistants,
      report,
      applyResult: null,
    });
    return { assistants: smokeAssistants, report, applyResult: null };
  }

  const applyResult = await applyCleanup(prisma, smokeAssistantIds);

  printReport({
    mode: "apply",
    options,
    assistants: smokeAssistants,
    report,
    applyResult,
  });

  return { assistants: smokeAssistants, report, applyResult };
}

async function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid arguments.");
    printUsage();
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    return;
  }

  const databaseUrl = loadDatabaseUrl();

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Cannot inspect smoke artifacts.");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    log: ["error", "warn"],
  });

  try {
    await runCleanup({ prisma, options });
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Unexpected cleanup failure.");
    process.exit(1);
  });
}
