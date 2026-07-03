import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const candidateEnvFiles = [
  path.resolve(scriptDir, "..", ".env"),
  path.resolve(scriptDir, "..", "..", "..", ".env"),
];

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
    const value = line.slice(separatorIndex + 1).trim();
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

const databaseUrl = loadDatabaseUrl();

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Skipping database connection validation.");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  await prisma.$connect();
  console.log("Database connection OK");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Database connection failed");
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
