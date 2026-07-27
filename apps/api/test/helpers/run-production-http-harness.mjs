import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertIsolatedServiceUrls } from "./production-app-process.mjs";

const BASELINE_COMMIT = "59dd68d574560ca208615a4a8edbadf90fc3c58b";
const ALLOWED_BLOCK5A_RUNTIME_PATHS = new Set([
  "apps/api/src/assistant-knowledge/assistant-knowledge-retrieval.service.ts",
  "apps/api/src/assistant-knowledge/knowledge-evidence.ts",
  "apps/api/src/assistant-conversations/assistant-conversations.service.ts",
  "apps/api/src/assistant-conversations/rag-price-authority.ts",
  "apps/api/src/assistant-conversations/runtime-authority-guard.ts",
  "apps/api/src/assistant-conversations/runtime-context-manifest.ts",
  "apps/api/src/assistant-conversations/turn-execution-manifest.ts",
  "apps/api/src/assistants/assistants.service.ts",
  "apps/api/src/prompt-compiler/prompt-compiler.service.ts",
]);
const helperDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.resolve(helperDirectory, "../..");
const repositoryDirectory = path.resolve(apiDirectory, "../..");
const migrationsDirectory = path.join(apiDirectory, "prisma/migrations");
const outboundRecoveryMigration = "20260725180000_add_outbound_recovery_safety";
const operationalHandoffMigration = "20260725220000_add_assistant_handoff_operation";
const handoffRecoveryMigration = "20260725230000_add_handoff_recovery_safety";
const relatedRegressionTests = [
  "test/chatwoot-webhook-and-runtime.test.mjs",
  "test/canonical-inbound-message.test.mjs",
  "test/flow-scoped-rag-retrieval.test.mjs",
  "test/flow-scoped-rag-retrieval-postgres.test.mjs",
  "test/integral-knowledge-evidence.test.mjs",
  "test/rag-price-authority.test.mjs",
  "test/assistant-behavior-prompt.test.mjs",
  "test/business-hours-direct-deterministic.test.mjs",
  "test/official-business-context.test.mjs",
  "test/conversation-reset.test.mjs",
  "test/conversation-control-snapshot.test.mjs",
  "test/outbound-external-reference.test.mjs",
  "test/outbound-delivery.test.mjs",
  "test/outbound-recovery.test.mjs",
  "test/split-response-style.test.mjs",
  "test/assistant-calendar-tools.test.mjs",
  "test/custom-webhook-tools.test.mjs",
  "test/runtime-stabilization.test.mjs",
  "test/v1-turn-decision.test.mjs",
  "test/turn-execution-manifest.test.mjs",
  "test/operational-handoff.test.mjs",
  "test/handoff-recovery-contract.test.mjs",
  "test/handoff-recovery-runner.test.mjs",
  "test/handoff-recovery.test.mjs",
];
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
        "psql",
        "-U",
        "postgres",
        "-d",
        databaseName,
        "-Atqc",
        "SELECT 1",
      ]),
    "isolated PostgreSQL",
    90_000,
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
    (entry) => !ALLOWED_BLOCK5A_RUNTIME_PATHS.has(entry),
  );
  if (disallowedChanges.length > 0) {
    throw new Error(
      `Harness refuses production source, schema or migration changes outside Block 5A:\n${disallowedChanges.join("\n")}`,
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
    path.join(apiDirectory, "dist/assistant-knowledge/assistant-knowledge-retrieval.service.js"),
    path.join(apiDirectory, "dist/assistant-knowledge/knowledge-evidence.js"),
    path.join(apiDirectory, "dist/assistant-conversations/assistant-conversations.service.js"),
    path.join(apiDirectory, "dist/assistant-conversations/conversation-control-snapshot.js"),
    path.join(apiDirectory, "dist/assistant-conversations/outbound-delivery.js"),
    path.join(apiDirectory, "dist/assistant-conversations/outbound-recovery-coordinator.js"),
    path.join(apiDirectory, "dist/assistant-conversations/handoff-recovery-coordinator.js"),
    path.join(apiDirectory, "dist/assistant-conversations/handoff-recovery-runner.js"),
    path.join(apiDirectory, "dist/assistant-conversations/handoff-recovery.js"),
    path.join(apiDirectory, "dist/assistant-conversations/operational-handoff.js"),
    path.join(apiDirectory, "dist/assistant-conversations/rag-price-authority.js"),
    path.join(apiDirectory, "dist/assistant-conversations/runtime-context-manifest.js"),
    path.join(apiDirectory, "dist/assistant-conversations/turn-execution-manifest.js"),
    path.join(apiDirectory, "dist/assistant-conversations/v1-turn-decision.js"),
    path.join(apiDirectory, "dist/prompt-compiler/prompt-compiler.service.js"),
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

async function validateOutboundRecoveryUpgradeMigration() {
  const upgradeDatabase = `${databaseName}_upgrade`;
  const containerMigrations = `/tmp/cubo-policy-migrations-${suffix}`;
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `CREATE DATABASE "${upgradeDatabase}"`,
  ]);
  await run("docker", [
    "cp",
    `${migrationsDirectory}/.`,
    `${postgresContainer}:${containerMigrations}`,
  ]);

  const migrationEntries = (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const baselineMigrations = migrationEntries.filter(
    (entry) =>
      entry !== outboundRecoveryMigration &&
      entry !== operationalHandoffMigration &&
      entry !== handoffRecoveryMigration,
  );
  for (const migration of baselineMigrations) {
    await run("docker", [
      "exec",
      postgresContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      upgradeDatabase,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      `${containerMigrations}/${migration}/migration.sql`,
    ]);
  }

  const block3b1FixtureSql = [
    `INSERT INTO "companies" ("id", "name", "updatedAt") VALUES ('migration-company', 'Migration fixture', CURRENT_TIMESTAMP)`,
    `INSERT INTO "assistants" ("id", "companyId", "name", "updatedAt") VALUES ('migration-assistant', 'migration-company', 'Migration assistant', CURRENT_TIMESTAMP)`,
    `INSERT INTO "assistant_conversations" ("id", "companyId", "assistantId", "updatedAt") VALUES ('migration-conversation', 'migration-company', 'migration-assistant', CURRENT_TIMESTAMP)`,
    `INSERT INTO "assistant_conversation_messages" ("id", "companyId", "assistantId", "conversationId", "role", "content") VALUES ('migration-message', 'migration-company', 'migration-assistant', 'migration-conversation', 'assistant', 'fixture')`,
    `INSERT INTO "assistant_outbound_deliveries" ("id", "companyId", "assistantId", "conversationId", "assistantMessageId", "turnExecutionId", "decisionId", "blockOrdinal", "idempotencyKey", "policyVersion", "expectedContextVersion", "expectedControlRevision", "sender", "payloadHash", "payloadSize", "updatedAt") VALUES ('migration-delivery', 'migration-company', 'migration-assistant', 'migration-conversation', 'migration-message', 'migration-turn', 'migration-decision', 1, 'migration-idempotency', 'V1_COMPATIBILITY_POLICY', 1, 0, 'CHATWOOT_V1', 'sha256:migration', 7, CURRENT_TIMESTAMP)`,
  ].join("; ");
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    block3b1FixtureSql,
  ]);
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    `${containerMigrations}/${outboundRecoveryMigration}/migration.sql`,
  ]);

  const defaults = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT "status" || '|' || "attemptCount" || '|' || "payloadContractVersion" || '|' || "retrySafety" || '|' || "maxAttempts" FROM "assistant_outbound_deliveries" WHERE "id" = 'migration-delivery'`,
  ]);
  if (defaults.stdout !== "PENDING|0|V1_LEGACY_UNVERIFIED|UNKNOWN|3") {
    throw new Error(`Outbound recovery migration defaults mismatch: ${defaults.stdout}`);
  }

  const insertAttemptSql =
    `INSERT INTO "assistant_outbound_attempts" (` +
    `"id", "deliveryId", "attemptNumber", "owner", "startedAt", "leaseExpiresAt", "updatedAt") VALUES (` +
    `'migration-attempt', 'migration-delivery', 1, 'migration-owner', ` +
    `CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 minute', CURRENT_TIMESTAMP)`;
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    insertAttemptSql,
  ]);
  const attemptDefaults = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT "result" || '|' || "retrySafety" FROM "assistant_outbound_attempts" WHERE "id" = 'migration-attempt'`,
  ]);
  if (attemptDefaults.stdout !== "SENDING|UNKNOWN") {
    throw new Error(`Outbound attempt defaults mismatch: ${attemptDefaults.stdout}`);
  }

  const duplicateAttemptWasAccepted = await commandSucceeds("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    insertAttemptSql.replace("'migration-attempt'", "'migration-attempt-duplicate'"),
  ]);
  if (duplicateAttemptWasAccepted) {
    throw new Error("Outbound attempt delivery/number uniqueness was not enforced");
  }
  const invalidAttemptForeignKeyWasAccepted = await commandSucceeds("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    insertAttemptSql
      .replace("'migration-attempt'", "'migration-attempt-invalid-fk'")
      .replace("'migration-delivery'", "'missing-delivery'"),
  ]);
  if (invalidAttemptForeignKeyWasAccepted) {
    throw new Error("Outbound attempt delivery foreign key was not enforced");
  }
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `DELETE FROM "assistant_conversation_messages" WHERE "id" = 'migration-message'`,
  ]);
  const recoveryRowsAfterLegacyMessageDelete = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT (SELECT COUNT(*) FROM "assistant_outbound_deliveries" WHERE "id" = 'migration-delivery') || '|' || (SELECT COUNT(*) FROM "assistant_outbound_attempts" WHERE "id" = 'migration-attempt')`,
  ]);
  if (recoveryRowsAfterLegacyMessageDelete.stdout !== "0|0") {
    throw new Error(
      `Outbound recovery cascade compatibility mismatch: ${recoveryRowsAfterLegacyMessageDelete.stdout}`,
    );
  }
  process.stdout.write(
    `[http-harness] outbound recovery migration upgrade validated database=${upgradeDatabase}\n`,
  );
}

async function validateOperationalHandoffUpgradeMigration() {
  const upgradeDatabase = `${databaseName}_handoff_upgrade`;
  const containerMigrations = `/tmp/cubo-policy-handoff-migrations-${suffix}`;
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `CREATE DATABASE "${upgradeDatabase}"`,
  ]);
  await run("docker", [
    "cp",
    `${migrationsDirectory}/.`,
    `${postgresContainer}:${containerMigrations}`,
  ]);
  const migrationEntries = (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const migration of migrationEntries.filter(
    (entry) =>
      entry !== operationalHandoffMigration && entry !== handoffRecoveryMigration,
  )) {
    await run("docker", [
      "exec",
      postgresContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      upgradeDatabase,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      `${containerMigrations}/${migration}/migration.sql`,
    ]);
  }
  const fixtureSql = [
    `INSERT INTO "companies" ("id", "name", "updatedAt") VALUES ('handoff-company', 'Handoff migration fixture', CURRENT_TIMESTAMP)`,
    `INSERT INTO "assistants" ("id", "companyId", "name", "updatedAt") VALUES ('handoff-assistant', 'handoff-company', 'Handoff migration assistant', CURRENT_TIMESTAMP)`,
    `INSERT INTO "assistant_conversations" ("id", "companyId", "assistantId", "updatedAt") VALUES ('handoff-conversation', 'handoff-company', 'handoff-assistant', CURRENT_TIMESTAMP)`,
    `INSERT INTO "assistant_conversation_messages" ("id", "companyId", "assistantId", "conversationId", "role", "content") VALUES ('handoff-message', 'handoff-company', 'handoff-assistant', 'handoff-conversation', 'assistant', 'fixture')`,
    `INSERT INTO "assistant_outbound_deliveries" ("id", "companyId", "assistantId", "conversationId", "assistantMessageId", "turnExecutionId", "decisionId", "blockOrdinal", "idempotencyKey", "policyVersion", "expectedContextVersion", "expectedControlRevision", "sender", "payloadHash", "payloadSize", "updatedAt") VALUES ('handoff-delivery', 'handoff-company', 'handoff-assistant', 'handoff-conversation', 'handoff-message', 'handoff-turn', 'handoff-delivery-decision', 1, 'handoff-delivery-key', 'V1_COMPATIBILITY_POLICY', 1, 0, 'CHATWOOT_V1', 'sha256:handoff', 7, CURRENT_TIMESTAMP)`,
  ].join("; ");
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    fixtureSql,
  ]);
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    `${containerMigrations}/${operationalHandoffMigration}/migration.sql`,
  ]);
  const legacyDeliveryCompatibility = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT COALESCE("handoffOperationId", 'NULL') FROM "assistant_outbound_deliveries" WHERE "id" = 'handoff-delivery'`,
  ]);
  if (legacyDeliveryCompatibility.stdout !== "NULL") {
    throw new Error(
      `Operational handoff legacy delivery compatibility mismatch: ${legacyDeliveryCompatibility.stdout}`,
    );
  }
  const insertOperationSql =
    `INSERT INTO "assistant_handoff_operations" (` +
    `"id", "companyId", "assistantId", "conversationId", "turnExecutionId", "decisionId", ` +
    `"contextVersion", "idempotencyKey", "policyVersion", "expectedControlRevision", "reason", "updatedAt") VALUES (` +
    `'handoff-operation', 'handoff-company', 'handoff-assistant', 'handoff-conversation', ` +
    `'handoff-turn', 'handoff-operation-decision', 1, 'handoff-operation-key', ` +
    `'V1_COMPATIBILITY_POLICY', 0, 'CUSTOMER_REQUESTED_HUMAN', CURRENT_TIMESTAMP)`;
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    insertOperationSql,
  ]);
  const defaults = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT "status" || '|' || "destinationResolution" || '|' || "desiredAiActive" || '|' || "attemptCount" FROM "assistant_handoff_operations" WHERE "id" = 'handoff-operation'`,
  ]);
  if (defaults.stdout !== "REQUESTED|UNRESOLVED|false|0") {
    throw new Error(`Operational handoff migration defaults mismatch: ${defaults.stdout}`);
  }
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `UPDATE "assistant_outbound_deliveries" SET "handoffOperationId" = 'handoff-operation' WHERE "id" = 'handoff-delivery'`,
  ]);
  const duplicateDecisionWasAccepted = await commandSucceeds("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    insertOperationSql
      .replace("'handoff-operation'", "'handoff-operation-duplicate'")
      .replace("'handoff-operation-key'", "'handoff-operation-key-duplicate'"),
  ]);
  if (duplicateDecisionWasAccepted) {
    throw new Error("Operational handoff decision uniqueness was not enforced");
  }
  const invalidForeignKeyWasAccepted = await commandSucceeds("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    insertOperationSql
      .replace("'handoff-operation'", "'handoff-operation-invalid-fk'")
      .replace("'handoff-conversation'", "'missing-conversation'")
      .replace("'handoff-operation-decision'", "'handoff-operation-invalid-decision'")
      .replace("'handoff-operation-key'", "'handoff-operation-invalid-key'"),
  ]);
  if (invalidForeignKeyWasAccepted) {
    throw new Error("Operational handoff conversation foreign key was not enforced");
  }
  process.stdout.write(
    `[http-harness] operational handoff migration upgrade validated database=${upgradeDatabase}\n`,
  );
}

async function validateHandoffRecoveryUpgradeMigration() {
  const upgradeDatabase = `${databaseName}_handoff_recovery_upgrade`;
  const containerMigrations = `/tmp/cubo-policy-handoff-recovery-migrations-${suffix}`;
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `CREATE DATABASE "${upgradeDatabase}"`,
  ]);
  await run("docker", [
    "cp",
    `${migrationsDirectory}/.`,
    `${postgresContainer}:${containerMigrations}`,
  ]);
  const migrationEntries = (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const migration of migrationEntries.filter(
    (entry) => entry !== handoffRecoveryMigration,
  )) {
    await run("docker", [
      "exec",
      postgresContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      upgradeDatabase,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      `${containerMigrations}/${migration}/migration.sql`,
    ]);
  }
  const fixtureSql = [
    `INSERT INTO "companies" ("id", "name", "updatedAt") VALUES ('handoff-recovery-company', 'Handoff recovery migration fixture', CURRENT_TIMESTAMP)`,
    `INSERT INTO "assistants" ("id", "companyId", "name", "updatedAt") VALUES ('handoff-recovery-assistant', 'handoff-recovery-company', 'Handoff recovery migration assistant', CURRENT_TIMESTAMP)`,
    `INSERT INTO "assistant_conversations" ("id", "companyId", "assistantId", "updatedAt") VALUES ('handoff-recovery-conversation', 'handoff-recovery-company', 'handoff-recovery-assistant', CURRENT_TIMESTAMP)`,
    `INSERT INTO "assistant_handoff_operations" ("id", "companyId", "assistantId", "conversationId", "turnExecutionId", "decisionId", "contextVersion", "idempotencyKey", "policyVersion", "expectedControlRevision", "reason", "updatedAt") VALUES ('handoff-recovery-operation', 'handoff-recovery-company', 'handoff-recovery-assistant', 'handoff-recovery-conversation', 'handoff-recovery-turn', 'handoff-recovery-decision', 1, 'handoff-recovery-key', 'V1_COMPATIBILITY_POLICY', 0, 'CUSTOMER_REQUESTED_HUMAN', CURRENT_TIMESTAMP)`,
  ].join("; ");
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    fixtureSql,
  ]);
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    `${containerMigrations}/${handoffRecoveryMigration}/migration.sql`,
  ]);

  const operationDefaults = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT "recoverySchemaVersion" || '|' || "maxAttempts" || '|' || "recoverySafety" || '|' || "externalInterventionObserved" || '|' || "confirmationContractVersion" FROM "assistant_handoff_operations" WHERE "id" = 'handoff-recovery-operation'`,
  ]);
  if (
    operationDefaults.stdout !==
    "ASSISTANT_HANDOFF_RECOVERY_V1|3|UNKNOWN|false|OPERATIONAL_HANDOFF_CONFIRMATION_V1"
  ) {
    throw new Error(
      `Handoff recovery operation defaults mismatch: ${operationDefaults.stdout}`,
    );
  }
  const legacyReferences = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT ("userMessageId" IS NULL)::TEXT || '|' || ("runtimeLogId" IS NULL)::TEXT || '|' || ("confirmationMessageId" IS NULL)::TEXT FROM "assistant_handoff_operations" WHERE "id" = 'handoff-recovery-operation'`,
  ]);
  if (legacyReferences.stdout !== "true|true|true") {
    throw new Error(
      `Handoff recovery legacy nullable-reference compatibility mismatch: ${legacyReferences.stdout}`,
    );
  }
  const nullableReferenceColumns = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assistant_handoff_operations' AND column_name IN ('userMessageId', 'runtimeLogId', 'confirmationMessageId') AND is_nullable = 'YES'`,
  ]);
  if (nullableReferenceColumns.stdout !== "3") {
    throw new Error(
      `Handoff recovery nullable-reference schema mismatch: ${nullableReferenceColumns.stdout}`,
    );
  }

  const insertAttemptSql =
    `INSERT INTO "assistant_handoff_attempts" (` +
    `"id", "operationId", "attemptNumber", "owner", "startedAt", "leaseExpiresAt", "updatedAt") VALUES (` +
    `'handoff-recovery-attempt', 'handoff-recovery-operation', 1, 'handoff-recovery-owner', ` +
    `CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 minute', CURRENT_TIMESTAMP)`;
  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    insertAttemptSql,
  ]);
  const attemptDefaults = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT "result" || '|' || "recoverySafety" FROM "assistant_handoff_attempts" WHERE "id" = 'handoff-recovery-attempt'`,
  ]);
  if (attemptDefaults.stdout !== "CLAIMED|UNKNOWN") {
    throw new Error(`Handoff recovery attempt defaults mismatch: ${attemptDefaults.stdout}`);
  }

  const duplicateAttemptWasAccepted = await commandSucceeds("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    insertAttemptSql.replace(
      "'handoff-recovery-attempt'",
      "'handoff-recovery-attempt-duplicate'",
    ),
  ]);
  if (duplicateAttemptWasAccepted) {
    throw new Error("Handoff recovery attempt operation/number uniqueness was not enforced");
  }

  const invalidAttemptForeignKeyWasAccepted = await commandSucceeds("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    insertAttemptSql
      .replace("'handoff-recovery-attempt'", "'handoff-recovery-attempt-invalid-fk'")
      .replace("'handoff-recovery-operation'", "'missing-handoff-operation'"),
  ]);
  if (invalidAttemptForeignKeyWasAccepted) {
    throw new Error("Handoff recovery attempt operation foreign key was not enforced");
  }

  await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `DELETE FROM "assistant_handoff_operations" WHERE "id" = 'handoff-recovery-operation'`,
  ]);
  const attemptsAfterOperationDelete = await run("docker", [
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    upgradeDatabase,
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `SELECT COUNT(*) FROM "assistant_handoff_attempts" WHERE "id" = 'handoff-recovery-attempt'`,
  ]);
  if (attemptsAfterOperationDelete.stdout !== "0") {
    throw new Error("Handoff recovery attempt cascade compatibility mismatch");
  }
  process.stdout.write(
    `[http-harness] handoff recovery migration upgrade validated database=${upgradeDatabase}\n`,
  );
}

async function main() {
  await assertBaselineAndScope();
  const services = await startServices();
  await validateOutboundRecoveryUpgradeMigration();
  await validateOperationalHandoffUpgradeMigration();
  await validateHandoffRecoveryUpgradeMigration();
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
  await run(
    process.execPath,
    ["--test", "--test-concurrency=1", ...relatedRegressionTests],
    {
      cwd: apiDirectory,
      env: {
        ...baseEnvironment,
        RUNTIME_V2_MODE: "OFF",
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
