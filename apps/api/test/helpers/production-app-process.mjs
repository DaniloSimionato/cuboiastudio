import { once } from "node:events";
import { mkdtemp, rm, stat } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIXTURE_LABELS, TEST_ENCRYPTION_KEY_HEX } from "./production-fixtures.mjs";

const helperDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.resolve(helperDirectory, "../..");
const distMainPath = path.join(apiDirectory, "dist/main.js");
const loopbackPreloadPath = path.join(helperDirectory, "loopback-only-network.cjs");
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function assertLoopbackUrl(rawUrl, label) {
  if (!rawUrl) throw new Error(`${label} is required`);
  const parsed = new URL(rawUrl);
  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new Error(`${label} must use a loopback host`);
  }
  return parsed;
}

export function assertIsolatedServiceUrls({ databaseUrl, redisUrl }) {
  const database = assertLoopbackUrl(databaseUrl, "DATABASE_URL");
  const databaseName = database.pathname.replace(/^\//, "");
  if (!databaseName.startsWith("cubo_policy_block0_test_")) {
    throw new Error("DATABASE_URL must name a harness-owned cubo_policy_block0_test_* database");
  }
  assertLoopbackUrl(redisUrl, "REDIS_URL");
}

async function reserveLoopbackPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not reserve a loopback port");
  }
  const port = address.port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function sanitizeProcessOutput(value) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/api_access_token[\"']?\s*[:=]\s*[\"']?[^,\"'\s}]+/gi, "api_access_token:[redacted]")
    .replace(/(postgresql:\/\/[^:]+:)[^@]+@/gi, "$1[redacted]@")
    .slice(-12_000);
}

async function waitForReadiness({ baseUrl, child, timeoutMs = 20_000 }) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Production API exited before readiness with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) {
        const body = await response.json();
        if (body?.ok === true) return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error(
    `Production API readiness timed out${lastError ? `: ${String(lastError)}` : ""}`,
  );
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return Promise.race([
    once(child, "exit").then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs)),
  ]);
}

async function stopChildAndCleanup({
  child,
  runtimeCwd,
  port,
  requireGraceful,
}) {
  const cleanupErrors = [];
  let forced = false;

  try {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      if (!(await waitForExit(child, 5_000))) {
        forced = true;
        child.kill("SIGKILL");
        if (!(await waitForExit(child, 2_000))) {
          cleanupErrors.push(new Error("Production API did not exit after SIGKILL"));
        }
      }
    }
  } catch (error) {
    cleanupErrors.push(error);
  }

  try {
    await rm(runtimeCwd, { recursive: true, force: true });
  } catch (error) {
    cleanupErrors.push(error);
  }

  try {
    await assertTcpPortClosed(port, "production API");
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (forced && requireGraceful) {
    cleanupErrors.unshift(new Error("Production API required SIGKILL after SIGTERM"));
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Production API cleanup failed");
  }
}

export async function assertTcpPortClosed(port, label) {
  const closed = await new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`${label} port closure check timed out`));
    }, 750);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      if (error?.code === "ECONNREFUSED" || error?.code === "ECONNRESET") {
        resolve(true);
        return;
      }
      reject(error);
    });
  });
  if (!closed) throw new Error(`${label} still accepts loopback connections on port ${port}`);
}

function runtimeV2OffEnvironment() {
  return {
    RUNTIME_V2_MODE: "OFF",
    RUNTIME_V2_STATE_STORE: "MEMORY",
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
    RUNTIME_V2_RESPONSE_EXECUTION_APPROVAL_MODE: "MANUAL",
    RUNTIME_V2_SHADOW_ASSISTANT_IDS: "",
    RUNTIME_V2_SHADOW_CONVERSATION_IDS: "",
    RUNTIME_V2_HANDOFF_EXECUTION_ASSISTANT_IDS: "",
    RUNTIME_V2_HANDOFF_EXECUTION_CONVERSATION_IDS: "",
    RUNTIME_V2_RESPONSE_ASSISTANT_IDS: "",
    RUNTIME_V2_RESPONSE_CONVERSATION_IDS: "",
    RUNTIME_V2_RESPONSE_EXECUTION_ASSISTANT_IDS: "",
    RUNTIME_V2_RESPONSE_EXECUTION_CONVERSATION_IDS: "",
    RUNTIME_V2_RESPONSE_EXECUTION_CHATWOOT_INBOX_BINDINGS: "",
    RUNTIME_V2_RESPONSE_EXECUTION_CONVERSATION_SCOPE: "EXPLICIT_CONVERSATIONS",
  };
}

function safeChildEnvironment({ databaseUrl, redisUrl, providerBaseUrl, port }) {
  const businessHoursBindings = FIXTURE_LABELS.map(
    (label) => `block0-${label}-assistant:block0-${label}-account:block0-${label}-inbox`,
  ).join(",");
  return {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
    LANG: process.env.LANG ?? "C.UTF-8",
    TZ: "America/Campo_Grande",
    NODE_ENV: "test",
    PORT: String(port),
    LOG_LEVEL: "warn",
    CORS_ORIGIN: `http://127.0.0.1:${port}`,
    AUTH_TRUST_MODE: "off",
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    APP_ENCRYPTION_KEY: TEST_ENCRYPTION_KEY_HEX,
    AI_RUNTIME_ENABLED: "true",
    AI_PROVIDER: "openai-compatible",
    AI_BASE_URL: providerBaseUrl,
    AI_MODEL: "block0-fake-model",
    AI_API_KEY: "block0-provider-env-fallback",
    AI_REQUEST_TIMEOUT_MS: "2000",
    OPENAI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_CALENDAR_REDIRECT_URI: "",
    CHATWOOT_URL: "",
    CHATWOOT_TOKEN: "",
    CHATWOOT_ALLOW_INSECURE_WEBHOOKS: "false",
    HANDOFF_RECOVERY_ENABLED: "false",
    BUSINESS_HOURS_DIRECT_DETERMINISTIC_ENABLED: "true",
    BUSINESS_HOURS_DIRECT_DETERMINISTIC_BINDINGS: businessHoursBindings,
    KNOWLEDGE_SCOPE_TAG_FILTER_ASSISTANT_IDS: FIXTURE_LABELS.map(
      (label) => `block0-${label}-assistant`,
    ).join(","),
    ASSISTANT_KNOWLEDGE_MIN_SCORE_OVERRIDES: "",
    CALENDAR_DEBUG_LOGS: "false",
    AI_RUNTIME_TRACE: "false",
    HTTP_PROXY: "",
    HTTPS_PROXY: "",
    ALL_PROXY: "",
    NO_PROXY: "127.0.0.1,localhost,::1",
    NODE_OPTIONS: `--require=${loopbackPreloadPath}`,
    ...runtimeV2OffEnvironment(),
  };
}

export async function startProductionAppProcess({
  databaseUrl,
  redisUrl,
  providerBaseUrl,
}) {
  assertIsolatedServiceUrls({ databaseUrl, redisUrl });
  assertLoopbackUrl(providerBaseUrl, "AI_BASE_URL");
  const buildStartedAt = Number(process.env.HTTP_HARNESS_BUILD_STARTED_AT ?? 0);
  const mainStat = await stat(distMainPath);
  if (!buildStartedAt || mainStat.mtimeMs < buildStartedAt) {
    throw new Error("dist/main.js is older than the current harness build");
  }

  const { spawn } = await import("node:child_process");
  const port = await reserveLoopbackPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const runtimeCwd = await mkdtemp(path.join(os.tmpdir(), "cubo-policy-block0-api-"));
  const child = spawn(process.execPath, [distMainPath], {
    cwd: runtimeCwd,
    env: safeChildEnvironment({ databaseUrl, redisUrl, providerBaseUrl, port }),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout = `${stdout}${chunk}`.slice(-40_000);
  });
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-40_000);
  });

  try {
    await waitForReadiness({ baseUrl, child });
  } catch (error) {
    let cleanupError = null;
    try {
      await stopChildAndCleanup({
        child,
        runtimeCwd,
        port,
        requireGraceful: false,
      });
    } catch (caughtCleanupError) {
      cleanupError = caughtCleanupError;
    }
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\n${sanitizeProcessOutput(
        `${stdout}\n${stderr}`,
      )}${cleanupError ? `\nCleanup error: ${String(cleanupError)}` : ""}`,
    );
  }

  let stopped = false;
  return {
    baseUrl,
    port,
    childPid: child.pid,
    buildSha256: process.env.HTTP_HARNESS_BUILD_SHA256 ?? null,
    buildTimestamp: new Date(mainStat.mtimeMs).toISOString(),
    getSanitizedLogs() {
      return sanitizeProcessOutput(`${stdout}\n${stderr}`);
    },
    async postChatwootWebhook(envelope, { webhookSecret, requestId }) {
      const response = await fetch(
        `${baseUrl}/webhooks/chatwoot?secret=${encodeURIComponent(webhookSecret)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": requestId,
            "x-correlation-id": `${requestId}-correlation`,
          },
          body: JSON.stringify(envelope),
          signal: AbortSignal.timeout(15_000),
        },
      );
      const text = await response.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { raw: text };
      }
      return { response, body };
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      await stopChildAndCleanup({
        child,
        runtimeCwd,
        port,
        requireGraceful: true,
      });
    },
  };
}
