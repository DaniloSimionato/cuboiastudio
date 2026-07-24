import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertIsolatedServiceUrls } from "./production-app-process.mjs";

const BASELINE_COMMIT = "f9f95ebbfc20f61bb8f1e67fdecf17990eb0566e";
const ALLOWED_BLOCK1_RUNTIME_PATHS = new Set([
  "apps/api/src/assistant-conversations/assistant-conversations.service.ts",
  "apps/api/src/assistant-conversations/turn-execution-manifest.ts",
  "apps/api/src/chatwoot/chatwoot-webhook.service.ts",
]);
const helperDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.resolve(helperDirectory, "../..");
const repositoryDirectory = path.resolve(apiDirectory, "../..");
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const databaseName = `cubo_policy_block0_test_${suffix}`;
const postgresContainer = `cubo-policy-block0-postgres-${suffix}`;
const redisContainer = `cubo-policy-block0-redis-${suffix}`;
const postgresPassword = `block0-${suffix}`;
const ownedContainers = [];
const activeChildren = new Set();
let cleanupPromise = null;
let signalHandling = false;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? apiDirectory,
      env: options.env ?? process.env,
      stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
    activeChildren.add(child);
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
      if (options.forwardOutput) process.stdout.write(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
      if (options.forwardOutput) process.stderr.write(chunk);
    });
    child.once("error", (error) => {
      activeChildren.delete(child);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      activeChildren.delete(child);
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        return;
      }
      reject(
        new Error(
          `${command} exited with ${code ?? signal ?? "unknown"}: ${stderr.trim() || stdout.trim()}`,
        ),
      );
    });
  });
}

function childIsRunning(child) {
  return child.exitCode === null && child.signalCode === null;
}

function signalChildTree(child, signal) {
  if (!childIsRunning(child)) return;
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if (error?.code === "ESRCH") return;
    }
  }
  child.kill(signal);
}

async function waitForChildrenToExit(children, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (children.every((child) => !childIsRunning(child))) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return children.every((child) => !childIsRunning(child));
}

async function terminateActiveChildren() {
  const children = [...activeChildren].filter(childIsRunning);
  for (const child of children) signalChildTree(child, "SIGTERM");
  if (await waitForChildrenToExit(children, 5_000)) return;

  const survivors = children.filter(childIsRunning);
  for (const child of survivors) signalChildTree(child, "SIGKILL");
  if (!(await waitForChildrenToExit(survivors, 2_000))) {
    throw new Error("Harness subprocesses remained active after SIGKILL");
  }
}

async function commandSucceeds(command, args, options = {}) {
  try {
    await run(command, args, options);
    return true;
  } catch {
    return false;
  }
}

async function waitUntil(check, description, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `${description} did not become ready${lastError ? `: ${String(lastError)}` : ""}`,
  );
}

async function dockerPort(container, internalPort) {
  const result = await run("docker", ["port", container, `${internalPort}/tcp`]);
  const match = result.stdout.match(/(?:127\.0\.0\.1|\[::1\]):(\d+)/);
  if (!match) {
    throw new Error(`Could not resolve loopback port for ${container}:${internalPort}`);
  }
  return Number(match[1]);
}

async function startServices() {
  await run("docker", ["info", "--format", "{{.ServerVersion}}"]);

  await run(
    "docker",
    [
      "run",
      "--detach",
      "--rm",
      "--name",
      postgresContainer,
      "--label",
      "cubo.policy.block=0",
      "--publish",
      "127.0.0.1::5432",
      "--env",
      "POSTGRES_DB",
      "--env",
      "POSTGRES_USER",
      "--env",
      "POSTGRES_PASSWORD",
      "pgvector/pgvector:pg16",
    ],
    {
      env: {
        ...process.env,
        POSTGRES_DB: databaseName,
        POSTGRES_USER: "postgres",
        POSTGRES_PASSWORD: postgresPassword,
      },
    },
  );
  ownedContainers.push(postgresContainer);

  await run("docker", [
    "run",
    "--detach",
    "--rm",
    "--name",
    redisContainer,
    "--label",
    "cubo.policy.block=0",
    "--publish",
    "127.0.0.1::6379",
    "redis:7-alpine",
    "redis-server",
    "--appendonly",
    "no",
    "--save",
    "",
  ]);
  ownedContainers.push(redisContainer);

  await waitUntil(
    () =>
      commandSucceeds("docker", [
        "exec",
        postgresContainer,
        "pg_isready",
        "-U",
        "postgres",
        "-d",
        databaseName,
      ]),
    "isolated PostgreSQL",
  );
  await waitUntil(
    async () => {
      const result = await run("docker", ["exec", redisContainer, "redis-cli", "PING"]);
      return result.stdout === "PONG";
    },
    "isolated Redis",
  );

  const postgresPort = await dockerPort(postgresContainer, 5432);
  const redisPort = await dockerPort(redisContainer, 6379);
  const databaseUrl = `postgresql://postgres:${encodeURIComponent(
    postgresPassword,
  )}@127.0.0.1:${postgresPort}/${databaseName}?schema=public`;
  const redisUrl = `redis://127.0.0.1:${redisPort}/0`;
  assertIsolatedServiceUrls({ databaseUrl, redisUrl });
  return { databaseUrl, redisUrl, postgresPort, redisPort };
}

async function assertBaselineAndScope() {
  try {
    await run("git", ["merge-base", "--is-ancestor", BASELINE_COMMIT, "HEAD"], {
      cwd: repositoryDirectory,
    });
  } catch {
    throw new Error(`Harness requires ${BASELINE_COMMIT} as an ancestor of HEAD`);
  }
  const protectedPaths = [
    "apps/api/src",
    "apps/api/prisma/schema.prisma",
    "apps/api/prisma/migrations",
  ];
  const productionDiff = await run(
    "git",
    ["diff", "--name-only", BASELINE_COMMIT, "--", ...protectedPaths],
    { cwd: repositoryDirectory },
  );
  const untrackedProductionFiles = await run(
    "git",
    ["ls-files", "--others", "--exclude-standard", "--", ...protectedPaths],
    { cwd: repositoryDirectory },
  );
  const protectedChanges = [productionDiff.stdout, untrackedProductionFiles.stdout]
    .flatMap((output) => output.split("\n"))
    .map((entry) => entry.trim())
    .filter(Boolean);
  const disallowedChanges = protectedChanges.filter(
    (entry) => !ALLOWED_BLOCK1_RUNTIME_PATHS.has(entry),
  );
  if (disallowedChanges.length > 0) {
    throw new Error(
      `Harness refuses production source, schema or migration changes outside Block 1:\n${disallowedChanges.join("\n")}`,
    );
  }
  const prismaBinary = path.join(apiDirectory, "node_modules/.bin/prisma");
  if (!(await commandSucceeds("test", ["-x", prismaBinary]))) {
    throw new Error("API dependencies are missing; run npm ci in apps/api first");
  }
}

async function buildFresh(environment) {
  await run("npm", ["run", "prisma:generate"], {
    cwd: apiDirectory,
    env: environment,
    forwardOutput: true,
  });
  await run(path.join(apiDirectory, "node_modules/.bin/prisma"), [
    "migrate",
    "deploy",
    "--schema",
    "prisma/schema.prisma",
  ], {
    cwd: apiDirectory,
    env: environment,
    forwardOutput: true,
  });

  const buildStartedAt = Date.now() - 1_000;
  await run("npm", ["run", "build"], {
    cwd: apiDirectory,
    env: environment,
    forwardOutput: true,
  });
  const artifactPaths = [
    path.join(apiDirectory, "dist/main.js"),
    path.join(apiDirectory, "dist/app.module.js"),
    path.join(apiDirectory, "dist/assistant-conversations/assistant-conversations.service.js"),
    path.join(apiDirectory, "dist/assistant-conversations/turn-execution-manifest.js"),
  ];
  const artifacts = await Promise.all(
    artifactPaths.map(async (artifactPath) => ({
      artifactPath,
      stat: await stat(artifactPath),
      bytes: await readFile(artifactPath),
    })),
  );
  if (artifacts.some((artifact) => artifact.stat.mtimeMs < buildStartedAt)) {
    throw new Error("Fresh build verification failed for required runtime artifacts");
  }
  const sha256 = createHash("sha256")
    .update(Buffer.concat(artifacts.map((artifact) => artifact.bytes)))
    .digest("hex");
  return {
    startedAt: buildStartedAt,
    sha256,
    timestamp: new Date(Math.max(...artifacts.map((artifact) => artifact.stat.mtimeMs))).toISOString(),
  };
}

async function main() {
  await assertBaselineAndScope();
  const services = await startServices();
  const baseEnvironment = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: services.databaseUrl,
    REDIS_URL: services.redisUrl,
  };
  const build = await buildFresh(baseEnvironment);
  process.stdout.write(
    `[http-harness] build sha256=${build.sha256} timestamp=${build.timestamp}\n`,
  );
  process.stdout.write(
    `[http-harness] isolated services database=${databaseName} postgresPort=${services.postgresPort} redisPort=${services.redisPort}\n`,
  );

  await run(
    process.execPath,
    ["--test", "--test-concurrency=1", "test/production-http-harness.test.mjs"],
    {
      cwd: apiDirectory,
      env: {
        ...baseEnvironment,
        HTTP_HARNESS_BUILD_STARTED_AT: String(build.startedAt),
        HTTP_HARNESS_BUILD_SHA256: build.sha256,
      },
      forwardOutput: true,
    },
  );
}

async function dockerContainerExists(container) {
  try {
    await run("docker", ["inspect", container]);
    return true;
  } catch (error) {
    if (/No such (?:object|container)/i.test(String(error))) return false;
    throw error;
  }
}

function cleanup() {
  if (!cleanupPromise) {
    cleanupPromise = (async () => {
      const cleanupErrors = [];
      for (const container of [...ownedContainers].reverse()) {
        try {
          if (await dockerContainerExists(container)) {
            await run("docker", ["rm", "--force", container]);
          }
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      for (const container of ownedContainers) {
        try {
          if (await dockerContainerExists(container)) {
            cleanupErrors.push(
              new Error(`Harness-owned container still exists after teardown: ${container}`),
            );
          }
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, "Harness container cleanup failed");
      }
    })();
  }
  return cleanupPromise;
}

async function handleSignal(signal) {
  if (signalHandling) return;
  signalHandling = true;
  let cleanupFailureCount = 0;
  try {
    await terminateActiveChildren();
  } catch {
    cleanupFailureCount += 1;
  }
  try {
    await cleanup();
  } catch {
    cleanupFailureCount += 1;
  }
  if (cleanupFailureCount > 0) {
    process.stderr.write(
      `[http-harness] signal cleanup encountered ${cleanupFailureCount} failure(s)\n`,
    );
  }
  process.kill(process.pid, signal);
}

process.once("SIGINT", () => {
  void handleSignal("SIGINT");
});
process.once("SIGTERM", () => {
  void handleSignal("SIGTERM");
});

try {
  await main();
} finally {
  try {
    await terminateActiveChildren();
  } finally {
    await cleanup();
  }
}
