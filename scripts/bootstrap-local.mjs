import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { ensureDockerReady, resolveDockerBinary } from "./docker-utils.mjs";

const rootDir = process.cwd();
const envExamplePath = path.join(rootDir, ".env.example");
const envPath = path.join(rootDir, ".env");
const apiDir = path.join(rootDir, "apps", "api");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
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
    const value = line.slice(separatorIndex + 1).trim();
    entries[key] = value;
  }

  return entries;
}

function ensureEnvFile() {
  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("Created .env from .env.example");
  }
}

function getDatabaseUrl() {
  const env = parseEnvFile(envPath);
  return env.DATABASE_URL ?? "";
}

function hasDatabaseUrl() {
  return getDatabaseUrl().length > 0;
}

async function waitForHealthyContainers(dockerBinary) {
  const services = ["cubo-ai-studio-postgres", "cubo-ai-studio-redis"];
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const allHealthy = services.every((service) => {
      const inspect = spawnSync(
        dockerBinary,
        ["inspect", "--format", "{{.State.Health.Status}}", service],
        {
          encoding: "utf8",
          shell: false,
        },
      );

      return inspect.status === 0 && inspect.stdout.trim() === "healthy";
    });

    if (allHealthy) {
      return;
    }

    console.log(`Waiting for containers to be ready... (${attempt}/${maxAttempts})`);
    await delay(2000);
  }

  console.error("Containers did not become healthy in time.");
  process.exit(1);
}

async function main() {
  if (!fs.existsSync(envExamplePath)) {
    console.error(".env.example was not found.");
    process.exit(1);
  }

  ensureEnvFile();
  const dockerBinary = ensureDockerReady() ?? resolveDockerBinary();

  if (!hasDatabaseUrl()) {
    console.error("DATABASE_URL is empty in .env.");
    console.error("Fill DATABASE_URL before running setup:local.");
    process.exit(1);
  }

  run(dockerBinary ?? "docker", ["compose", "-f", "infra/docker-compose.local.yml", "up", "-d"]);
  await waitForHealthyContainers(dockerBinary ?? "docker");

  run("npm", ["--prefix", apiDir, "run", "prisma:generate"]);
  run("npm", ["--prefix", apiDir, "run", "db:check"]);
  run("npm", ["--prefix", apiDir, "run", "prisma:migrate"]);
  run("npm", ["--prefix", apiDir, "run", "db:seed"]);

  console.log("Local setup completed successfully.");
  console.log("Next steps:");
  console.log("  npm run api:start");
  console.log("  npm run smoke:backend");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
