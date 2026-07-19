import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const apiDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const testDir = path.join(apiDir, "test");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required for the isolated test suite");

const parsedDatabaseUrl = new URL(databaseUrl);
const baseDatabaseName = parsedDatabaseUrl.pathname.replace(/^\//, "");
if (!(parsedDatabaseUrl.hostname === "127.0.0.1" || parsedDatabaseUrl.hostname === "localhost")) {
  throw new Error("isolated test suite requires a loopback PostgreSQL database");
}
if (!baseDatabaseName.includes("test")) {
  throw new Error("isolated test suite refuses a non-test database");
}

const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const templateDatabaseName = `cubo_ai_studio_test_suite_template_${runId}`;
const flagsOff = {
  RUNTIME_V2_MODE: "OFF",
  RUNTIME_V2_EVIDENCE_MODE: "OFF",
  RUNTIME_V2_ACTION_STATE_MODE: "OFF",
  RUNTIME_V2_TOOL_OBSERVATION_MODE: "OFF",
  RUNTIME_V2_SYNTHETIC_EXECUTION_MODE: "OFF",
  RUNTIME_V2_HANDOFF_STATE_MODE: "OFF",
  RUNTIME_V2_HANDOFF_EXECUTION_MODE: "OFF",
  RUNTIME_V2_HANDOFF_ADAPTER_MODE: "OFF",
  RUNTIME_V2_RESPONSE_GENERATION_MODE: "OFF",
  RUNTIME_V2_RESPONSE_COMPARISON_MODE: "OFF",
  RUNTIME_V2_RESPONSE_EXECUTION_MODE: "OFF",
  RUNTIME_V2_SHADOW_ASSISTANT_IDS: "",
  RUNTIME_V2_SHADOW_CONVERSATION_IDS: "",
  RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS: "",
  RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS: "",
  RUNTIME_V2_RESPONSE_ASSISTANT_IDS: "",
  RUNTIME_V2_RESPONSE_CONVERSATION_IDS: "",
  RUNTIME_V2_RESPONSE_EXECUTION_ASSISTANT_IDS: "",
  RUNTIME_V2_RESPONSE_EXECUTION_CONVERSATION_IDS: "",
};

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function databaseUrlFor(databaseName) {
  const next = new URL(parsedDatabaseUrl);
  next.pathname = `/${databaseName}`;
  return next.toString();
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }
    child.once("error", reject);
    // `close` guarantees captured streams are drained before a database clone
    // is dropped and before TAP summaries are parsed.
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

function marker(name, details = "") {
  console.log(`isolated-suite marker=${name}${details ? ` ${details}` : ""}`);
}

function readSummary(output, key) {
  const match = output.match(new RegExp(`^ℹ ${key} (\\d+)$`, "m"));
  return match ? Number(match[1]) : 0;
}

const adminUrl = new URL(parsedDatabaseUrl);
adminUrl.pathname = "/postgres";
const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
const createdDatabases = new Set();

async function dropDatabase(databaseName) {
  await admin.$executeRawUnsafe(
    `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`,
  );
  createdDatabases.delete(databaseName);
}

async function createDatabase(databaseName, template = null) {
  const templateClause = template ? ` TEMPLATE ${quoteIdentifier(template)}` : "";
  await admin.$executeRawUnsafe(
    `CREATE DATABASE ${quoteIdentifier(databaseName)}${templateClause}`,
  );
  createdDatabases.add(databaseName);
}

const files = (await readdir(testDir))
  .filter((name) => name.endsWith(".mjs"))
  .sort()
  .map((name) => path.join("test", name));
if (files.length === 0) throw new Error("isolated test suite discovered no test files");

const totals = { tests: 0, pass: 0, fail: 0, skipped: 0, todo: 0 };
let failures = 0;

try {
  await createDatabase(templateDatabaseName);
  marker("DATABASE_READY");
  const migrateCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const migration = await runProcess(
    migrateCommand,
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      cwd: apiDir,
      env: { ...process.env, DATABASE_URL: databaseUrlFor(templateDatabaseName) },
    },
  );
  if (migration.code !== 0) throw new Error("existing migrations failed for the test template");
  marker("MIGRATIONS_APPLIED");
  marker("TEST_DISCOVERY_COMPLETED", `files=${files.length}`);
  marker("TEST_RUN_STARTED");

  for (let index = 0; index < files.length; index += 1) {
    const databaseName = `cubo_ai_studio_test_suite_${runId}_${String(index).padStart(2, "0")}`;
    await createDatabase(databaseName, templateDatabaseName);
    const result = await runProcess(process.execPath, ["--test", files[index]], {
      cwd: apiDir,
      capture: true,
      env: {
        ...process.env,
        ...flagsOff,
        NODE_ENV: "test",
        DATABASE_URL: databaseUrlFor(databaseName),
        RUNTIME_V2_TEST_DATABASE_NAME: databaseName,
      },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    totals.tests += readSummary(output, "tests");
    totals.pass += readSummary(output, "pass");
    totals.fail += readSummary(output, "fail");
    totals.skipped += readSummary(output, "skipped");
    totals.todo += readSummary(output, "todo");
    if (result.code !== 0) {
      failures += 1;
      console.error(`FAIL ${files[index]} exit=${result.code ?? "signal"}`);
      const failureSummary = output
        .split("\n")
        .filter((line) =>
          /AssertionError|Expected values|actual|expected|operator|diff|at TestContext|Error:/i.test(
            line,
          ),
        )
        .slice(-16);
      if (failureSummary.length > 0) console.error(failureSummary.join("\n"));
    }
    await dropDatabase(databaseName);
  }
  marker("TEST_RUN_COMPLETED", `files=${files.length}`);
} finally {
  marker("CLEANUP_STARTED");
  for (const databaseName of createdDatabases) {
    await dropDatabase(databaseName);
  }
  await admin.$disconnect();
  marker("CLEANUP_COMPLETED");
}

console.log(
  `isolated-suite files=${files.length} tests=${totals.tests} pass=${totals.pass} ` +
    `fail=${totals.fail} skipped=${totals.skipped} todo=${totals.todo} ` +
    `fileFailures=${failures}`,
);
marker("FINAL_SUMMARY");

if (failures !== 0 || totals.fail !== 0 || totals.skipped !== 0 || totals.todo !== 0)
  process.exitCode = 1;
