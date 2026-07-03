import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const API_URL = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");
const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cleanupScriptPath = path.join(scriptDir, "cleanup-smoke-artifacts.mjs");
const SMOKE_RUN_ID = process.env.SMOKE_RUN_ID || `${Date.now()}-${randomUUID().slice(0, 8)}`;

const DEV_HEADERS = {
  "x-dev-user-id": "user_demo_cubo_ai_studio",
  "x-dev-company-id": "company_demo_cubo_ai_studio",
  "x-dev-user-email": "demo@cubo.chat",
};

const NO_PERMISSION_HEADERS = {
  "x-dev-user-id": "user_sem_permissao",
  "x-dev-company-id": "company_demo_cubo_ai_studio",
  "x-dev-user-email": "no-permission@cubo.chat",
};

export function buildSmokeAssistantPrefix(runId) {
  return `[SMOKE:${runId}]`;
}

export function buildCleanupArgs(prefix) {
  return [
    cleanupScriptPath,
    "--apply",
    `--companyId=${DEV_HEADERS["x-dev-company-id"]}`,
    `--prefix=${prefix}`,
  ];
}

const SMOKE_ASSISTANT_PREFIX = buildSmokeAssistantPrefix(SMOKE_RUN_ID);
const SMOKE_ASSISTANT_NAME = `${SMOKE_ASSISTANT_PREFIX} Assistente Smoke Test`;
const SMOKE_ASSISTANT_UPDATED_NAME = `${SMOKE_ASSISTANT_PREFIX} Assistente Smoke Test Atualizado`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHeaders(extra = {}) {
  return {
    ...extra,
  };
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...buildHeaders(options.headers),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let json = null;

  if (text.length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
    text,
  };
}

function ensureStatus(result, expectedStatus, label) {
  if (result.status !== expectedStatus) {
    throw new Error(
      `${label} expected HTTP ${expectedStatus} but received ${result.status}: ${JSON.stringify(result.json)}`,
    );
  }
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function ensureApiReachable() {
  try {
    const health = await request("/health");
    ensureStatus(health, 200, "GET /health");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("fetch failed")) {
      throw new Error(
        [
          `Backend API is not reachable at ${API_URL}.`,
          "",
          "Start the API first:",
          "  npm run api:start",
          "",
          "Or set API_URL:",
          `  API_URL=${API_URL} npm run smoke:backend`,
        ].join("\n"),
      );
    }

    throw error;
  }
}

async function cleanupSmokeArtifacts() {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [...buildCleanupArgs(SMOKE_ASSISTANT_PREFIX)],
      {
        cwd: path.resolve(scriptDir, ".."),
        env: process.env,
        timeout: 30_000,
      },
    );

    if (stdout.trim()) {
      console.log(stdout.trim());
    }

    if (stderr.trim()) {
      console.warn(stderr.trim());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Could not run smoke artifact cleanup for ${SMOKE_ASSISTANT_PREFIX}: ${message}`);
  }
}

async function main() {
  const createdArtifacts = [];
  const createdAssistantIds = [];
  let originalAiSettings = null;
  let aiSettingsAfterPatch = null;
  console.log(`Running backend smoke test against ${API_URL}`);
  console.log(`Smoke run id: ${SMOKE_RUN_ID}`);

  try {
    await ensureApiReachable();

    const diagnosticsUnauthorized = await request("/diagnostics/rbac");
    ensureStatus(diagnosticsUnauthorized, 401, "GET /diagnostics/rbac without auth");

    const diagnosticsForbidden = await request("/diagnostics/rbac", {
      headers: NO_PERMISSION_HEADERS,
    });
    ensureStatus(diagnosticsForbidden, 403, "GET /diagnostics/rbac without permission");

    const diagnosticsOk = await request("/diagnostics/rbac", {
      headers: DEV_HEADERS,
    });
    ensureStatus(diagnosticsOk, 200, "GET /diagnostics/rbac");

    const aiStatus = await request("/diagnostics/ai", {
      headers: DEV_HEADERS,
    });
    ensureStatus(aiStatus, 200, "GET /diagnostics/ai");
    ensure(
      typeof aiStatus.json?.runtimeEnabled === "boolean",
      "AI diagnostics response should include runtimeEnabled.",
    );
    ensure(
      aiStatus.json?.mode === "deterministic-fallback",
      "AI diagnostics should report deterministic fallback mode while runtime remains detached.",
    );
    const aiSettingsGet = await request("/settings/ai", {
      headers: DEV_HEADERS,
    });
    ensureStatus(aiSettingsGet, 200, "GET /settings/ai");
    originalAiSettings = aiSettingsGet.json;
    ensure(
      typeof aiSettingsGet.json?.apiKeyConfigured === "boolean",
      "AI settings response should include apiKeyConfigured.",
    );
    ensure(
      typeof aiSettingsGet.json?.runtimeEnabled === "boolean",
      "AI settings response should include runtimeEnabled.",
    );

    const aiSettingsOptions = await request("/settings/ai/options", {
      headers: DEV_HEADERS,
    });
    ensureStatus(aiSettingsOptions, 200, "GET /settings/ai/options");
    ensure(
      Array.isArray(aiSettingsOptions.json?.providers),
      "AI settings options response should include providers.",
    );
    ensure(
      aiSettingsOptions.json.providers.some((provider) => provider.id === "openai-compatible") &&
        aiSettingsOptions.json.providers.some(
          (provider) => provider.id === "deepseek-compatible",
        ) &&
        aiSettingsOptions.json.providers.some((provider) => provider.id === "custom"),
      "AI settings options should include OpenAI, DeepSeek and Custom presets.",
    );
    ensure(
      Array.isArray(aiSettingsOptions.json?.timeoutOptionsMs) &&
        aiSettingsOptions.json.timeoutOptionsMs.includes(30000),
      "AI settings options should include timeout presets.",
    );

    const aiSettingsPatch = await request("/settings/ai", {
      method: "PATCH",
      headers: DEV_HEADERS,
      body: {
        runtimeEnabled: false,
        provider: "openai-compatible",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        requestTimeoutMs: 30000,
      },
    });
    ensureStatus(aiSettingsPatch, 200, "PATCH /settings/ai");
    ensure(
      typeof aiSettingsPatch.json?.apiKeyConfigured === "boolean",
      "AI settings patch should report whether an API key is configured without exposing it.",
    );

    aiSettingsAfterPatch = await request("/settings/ai", {
      headers: DEV_HEADERS,
    });
    ensureStatus(aiSettingsAfterPatch, 200, "GET /settings/ai after patch");
    ensure(
      aiSettingsAfterPatch.json?.runtimeEnabled === false,
      "AI settings patch should keep runtime disabled for the smoke test tenant.",
    );
    ensure(
      typeof aiSettingsAfterPatch.json?.apiKeyConfigured === "boolean",
      "AI settings should keep reporting whether an API key is configured.",
    );

    const companyCurrent = await request("/companies/current", {
      headers: DEV_HEADERS,
    });
    ensureStatus(companyCurrent, 200, "GET /companies/current");

    const unauthorizedAssistants = await request("/assistants");
    ensureStatus(unauthorizedAssistants, 401, "GET /assistants without auth");

    const forbiddenAssistants = await request("/assistants", {
      headers: NO_PERMISSION_HEADERS,
    });
    ensureStatus(forbiddenAssistants, 403, "GET /assistants without permission");

    const invalidAssistantCreate = await request("/assistants", {
      method: "POST",
      headers: DEV_HEADERS,
      body: {},
    });
    ensureStatus(invalidAssistantCreate, 400, "POST /assistants with invalid body");

    const assistantCreate = await request("/assistants", {
      method: "POST",
      headers: DEV_HEADERS,
      body: {
        name: SMOKE_ASSISTANT_NAME,
        description: "Assistente criado para validacao ponta a ponta do backend.",
        initialMessage: "Ola! Sou o assistente do smoke test.",
        instructions: "Voce e um assistente de validacao do Cubo AI Studio.",
        model: "modelo-smoke",
        temperature: 0.2,
      },
    });
    ensureStatus(assistantCreate, 201, "POST /assistants");
    ensure(assistantCreate.json?.id, "Assistant creation did not return an id.");
    ensure(
      assistantCreate.json?.initialMessage === "Ola! Sou o assistente do smoke test.",
      "Assistant creation did not persist initialMessage.",
    );
    ensure(
      assistantCreate.json?.instructions === "Voce e um assistente de validacao do Cubo AI Studio.",
      "Assistant creation did not persist instructions.",
    );
    ensure(
      assistantCreate.json?.model === "modelo-smoke",
      "Assistant creation did not persist model.",
    );
    ensure(
      assistantCreate.json?.temperature === 0.2,
      "Assistant creation did not persist temperature.",
    );
    const assistantId = assistantCreate.json.id;
    createdArtifacts.push(`assistant:${assistantId}`);
    createdAssistantIds.push(assistantId);

    const assistantDetail = await request(`/assistants/${assistantId}`, {
      headers: DEV_HEADERS,
    });
    ensureStatus(assistantDetail, 200, "GET /assistants/:id");
    ensure(
      assistantDetail.json?.initialMessage === "Ola! Sou o assistente do smoke test.",
      "Assistant detail did not return initialMessage.",
    );
    ensure(
      assistantDetail.json?.instructions === "Voce e um assistente de validacao do Cubo AI Studio.",
      "Assistant detail did not return instructions.",
    );
    ensure(
      assistantDetail.json?.model === "modelo-smoke",
      "Assistant detail did not return model.",
    );
    ensure(
      assistantDetail.json?.temperature === 0.2,
      "Assistant detail did not return temperature.",
    );

    const assistantPatch = await request(`/assistants/${assistantId}`, {
      method: "PATCH",
      headers: DEV_HEADERS,
      body: {
        name: SMOKE_ASSISTANT_UPDATED_NAME,
        description: "Assistente atualizado pelo smoke test.",
        initialMessage: "Ola! Esta conversa comecou pelo pipeline v1.",
        instructions: "Voce e um assistente de validacao atualizado.",
        model: "modelo-smoke-2",
        temperature: 0.4,
      },
    });
    ensureStatus(assistantPatch, 200, "PATCH /assistants/:id");
    ensure(
      assistantPatch.json?.initialMessage === "Ola! Esta conversa comecou pelo pipeline v1.",
      "Assistant patch did not update initialMessage.",
    );
    ensure(
      assistantPatch.json?.instructions === "Voce e um assistente de validacao atualizado.",
      "Assistant patch did not update instructions.",
    );
    ensure(
      assistantPatch.json?.model === "modelo-smoke-2",
      "Assistant patch did not update model.",
    );
    ensure(assistantPatch.json?.temperature === 0.4, "Assistant patch did not update temperature.");

    const assistantDetailUpdated = await request(`/assistants/${assistantId}`, {
      headers: DEV_HEADERS,
    });
    ensureStatus(assistantDetailUpdated, 200, "GET /assistants/:id after update");
    ensure(
      assistantDetailUpdated.json?.initialMessage ===
        "Ola! Esta conversa comecou pelo pipeline v1.",
      "Assistant detail after update did not return initialMessage.",
    );
    ensure(
      assistantDetailUpdated.json?.instructions === "Voce e um assistente de validacao atualizado.",
      "Assistant detail after update did not return instructions.",
    );
    ensure(
      assistantDetailUpdated.json?.model === "modelo-smoke-2",
      "Assistant detail after update did not return model.",
    );
    ensure(
      assistantDetailUpdated.json?.temperature === 0.4,
      "Assistant detail after update did not return temperature.",
    );

    const statusInactive = await request(`/assistants/${assistantId}/status`, {
      method: "PATCH",
      headers: DEV_HEADERS,
      body: { status: "INACTIVE" },
    });
    ensureStatus(statusInactive, 200, "PATCH /assistants/:id/status -> INACTIVE");

    const runInactive = await request(`/assistants/${assistantId}/run`, {
      method: "POST",
      headers: DEV_HEADERS,
      body: { message: "Qual é o horário de atendimento?" },
    });
    ensureStatus(runInactive, 400, "POST /assistants/:id/run on inactive assistant");

    const statusActive = await request(`/assistants/${assistantId}/status`, {
      method: "PATCH",
      headers: DEV_HEADERS,
      body: { status: "ACTIVE" },
    });
    ensureStatus(statusActive, 200, "PATCH /assistants/:id/status -> ACTIVE");

    const invalidKnowledgeCreate = await request(`/assistants/${assistantId}/knowledge`, {
      method: "POST",
      headers: DEV_HEADERS,
      body: {},
    });
    ensureStatus(
      invalidKnowledgeCreate,
      400,
      "POST /assistants/:assistantId/knowledge with invalid body",
    );

    const knowledgeCreate = await request(`/assistants/${assistantId}/knowledge`, {
      method: "POST",
      headers: DEV_HEADERS,
      body: {
        title: "Horário de atendimento",
        content: "Atendemos de segunda a sexta das 08h às 18h.",
      },
    });
    ensureStatus(knowledgeCreate, 201, "POST /assistants/:assistantId/knowledge");
    ensure(knowledgeCreate.json?.id, "Knowledge creation did not return an id.");
    const knowledgeId = knowledgeCreate.json.id;
    createdArtifacts.push(`knowledge:${knowledgeId}`);

    const knowledgeList = await request(`/assistants/${assistantId}/knowledge`, {
      headers: DEV_HEADERS,
    });
    ensureStatus(knowledgeList, 200, "GET /assistants/:assistantId/knowledge");

    const knowledgeUpdate = await request(`/assistants/${assistantId}/knowledge/${knowledgeId}`, {
      method: "PATCH",
      headers: DEV_HEADERS,
      body: {
        title: "Horário de atendimento atualizado",
        content: "Atendemos de segunda a sexta das 08h às 19h.",
      },
    });
    ensureStatus(knowledgeUpdate, 200, "PATCH /assistants/:assistantId/knowledge/:knowledgeId");

    const knowledgeDelete = await request(`/assistants/${assistantId}/knowledge/${knowledgeId}`, {
      method: "DELETE",
      headers: DEV_HEADERS,
    });
    ensureStatus(knowledgeDelete, 200, "DELETE /assistants/:assistantId/knowledge/:knowledgeId");

    const knowledgeCreateForRuntime = await request(`/assistants/${assistantId}/knowledge`, {
      method: "POST",
      headers: DEV_HEADERS,
      body: {
        title: "Horário de atendimento runtime",
        content: "Atendemos de segunda a sexta das 08h às 18h.",
      },
    });
    ensureStatus(
      knowledgeCreateForRuntime,
      201,
      "POST /assistants/:assistantId/knowledge for runtime",
    );

    const runtimeKnowledgeId = knowledgeCreateForRuntime.json.id;
    createdArtifacts.push(`knowledge:${runtimeKnowledgeId}`);

    const conversationsUnauthorized = await request(`/assistants/${assistantId}/conversations`);
    ensureStatus(
      conversationsUnauthorized,
      401,
      "GET /assistants/:assistantId/conversations without auth",
    );

    const conversationsForbidden = await request(`/assistants/${assistantId}/conversations`, {
      headers: NO_PERMISSION_HEADERS,
    });
    ensureStatus(
      conversationsForbidden,
      403,
      "GET /assistants/:assistantId/conversations without permission",
    );

    const conversationCreate = await request(`/assistants/${assistantId}/conversations`, {
      method: "POST",
      headers: DEV_HEADERS,
      body: {
        title: `${SMOKE_ASSISTANT_PREFIX} Conversa Smoke Test`,
        source: "SMOKE",
      },
    });
    ensureStatus(conversationCreate, 201, "POST /assistants/:assistantId/conversations");
    ensure(conversationCreate.json?.id, "Conversation creation did not return an id.");
    const conversationId = conversationCreate.json.id;
    createdArtifacts.push(`conversation:${conversationId}`);

    const conversationMessagesAfterCreate = await request(
      `/assistants/${assistantId}/conversations/${conversationId}/messages`,
      {
        headers: DEV_HEADERS,
      },
    );
    ensureStatus(
      conversationMessagesAfterCreate,
      200,
      "GET /assistants/:assistantId/conversations/:conversationId/messages after create",
    );
    ensure(
      conversationMessagesAfterCreate.json.items.some(
        (item) =>
          item.role === "assistant" &&
          item.mode === "initial-message" &&
          item.content === "Ola! Esta conversa comecou pelo pipeline v1.",
      ),
      "New conversation should include the assistant initial message.",
    );

    const conversationList = await request(`/assistants/${assistantId}/conversations`, {
      headers: DEV_HEADERS,
    });
    ensureStatus(conversationList, 200, "GET /assistants/:assistantId/conversations");
    ensure(
      Array.isArray(conversationList.json?.items),
      "Conversation list response does not contain items array.",
    );
    ensure(
      conversationList.json.items.every((item) => item.id !== conversationId),
      "Conversation list from /testes should not expose smoke conversations.",
    );

    const conversationMessageInvalid = await request(
      `/assistants/${assistantId}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: DEV_HEADERS,
        body: {},
      },
    );
    ensureStatus(
      conversationMessageInvalid,
      400,
      "POST /assistants/:assistantId/conversations/:conversationId/messages with invalid body",
    );

    const conversationMessage = await request(
      `/assistants/${assistantId}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: DEV_HEADERS,
        body: {
          message: "Qual é o horário de atendimento?",
        },
      },
    );
    ensureStatus(
      conversationMessage,
      201,
      "POST /assistants/:assistantId/conversations/:conversationId/messages",
    );
    ensure(
      conversationMessage.json?.conversationId,
      "Conversation message response did not return conversationId.",
    );
    ensure(
      conversationMessage.json?.userMessage?.id,
      "Conversation message response did not return userMessage.id.",
    );
    ensure(
      conversationMessage.json?.assistantMessage?.id,
      "Conversation message response did not return assistantMessage.id.",
    );
    ensure(
      Array.isArray(conversationMessage.json?.assistantMessage?.sources),
      "Conversation assistant message should include sources array.",
    );
    ensure(
      typeof conversationMessage.json?.assistantMessage?.mode === "string",
      "Conversation assistant message should include mode.",
    );
    ensure(
      conversationMessage.json?.runtime &&
        typeof conversationMessage.json.runtime.mode === "string",
      "Conversation response should include runtime mode.",
    );
    ensure(
      conversationMessage.json?.runtime &&
        typeof conversationMessage.json.runtime.outcome === "string",
      "Conversation response should include runtime outcome.",
    );
    ensure(
      conversationMessage.json?.runtime &&
        typeof conversationMessage.json.runtime.summary === "string",
      "Conversation response should include runtime summary.",
    );
    ensure(
      conversationMessage.json?.runtime &&
        typeof conversationMessage.json.runtime.temperature === "number",
      "Conversation response should include runtime temperature.",
    );
    ensure(
      conversationMessage.json?.runtime?.context &&
        typeof conversationMessage.json.runtime.context.historyMessagesUsed === "number",
      "Conversation response should include runtime context history count.",
    );
    ensure(
      conversationMessage.json.runtime.context.historyMessagesUsed >= 1,
      "Conversation runtime should include recent history messages.",
    );
    ensure(
      conversationMessage.json.runtime.context.initialMessageIncluded === true,
      "Conversation runtime should indicate initial message inclusion.",
    );
    ensure(
      conversationMessage.json.runtime.context.instructionsIncluded === true,
      "Conversation runtime should indicate instructions inclusion.",
    );
    ensure(
      conversationMessage.json?.runtime?.assistant?.name === SMOKE_ASSISTANT_UPDATED_NAME,
      "Conversation response should include runtime assistant identity.",
    );
    if (!Boolean(aiSettingsAfterPatch.json?.runtimeEnabled)) {
      ensure(
        conversationMessage.json.runtime.mode === "deterministic-runtime",
        "Conversation response should remain deterministic when AI runtime is disabled.",
      );
      ensure(
        conversationMessage.json.runtime.fallback === true,
        "Conversation response should indicate deterministic fallback when AI runtime is disabled.",
      );
      ensure(
        conversationMessage.json.runtime.outcome === "fallback",
        "Conversation response should classify deterministic fallback outcome.",
      );
    }
    ensure(
      typeof conversationMessage.json.runtime.logId === "string" &&
        conversationMessage.json.runtime.logId.length > 0,
      "Conversation response should include runtime logId.",
    );

    const runtimeLogsUnauthorized = await request("/logs/ai");
    ensureStatus(runtimeLogsUnauthorized, 401, "GET /logs/ai without auth");

    const runtimeLogsForbidden = await request("/logs/ai", {
      headers: NO_PERMISSION_HEADERS,
    });
    ensureStatus(runtimeLogsForbidden, 403, "GET /logs/ai without permission");

    const runtimeLogs = await request(
      `/logs/ai?assistantId=${assistantId}&conversationId=${conversationId}&limit=20`,
      {
        headers: DEV_HEADERS,
      },
    );
    ensureStatus(runtimeLogs, 200, "GET /logs/ai");
    ensure(Array.isArray(runtimeLogs.json?.items), "AI runtime logs should return items array.");
    const runtimeLog = runtimeLogs.json.items.find(
      (item) => item.id === conversationMessage.json.runtime.logId,
    );
    ensure(runtimeLog, "AI runtime logs should include the log created by the message send.");
    ensure(typeof runtimeLog.mode === "string", "AI runtime log should include mode.");
    ensure(typeof runtimeLog.status === "string", "AI runtime log should include status.");
    ensure(typeof runtimeLog.fallback === "boolean", "AI runtime log should include fallback.");
    ensure(typeof runtimeLog.outcome === "string", "AI runtime log should include outcome.");
    ensure(
      typeof runtimeLog.historyMessagesUsed === "number",
      "AI runtime log should include historyMessagesUsed.",
    );
    ensure(typeof runtimeLog.createdAt === "string", "AI runtime log should include createdAt.");
    ensure(
      !Object.prototype.hasOwnProperty.call(runtimeLog, "apiKey") &&
        !Object.prototype.hasOwnProperty.call(runtimeLog, "prompt") &&
        !Object.prototype.hasOwnProperty.call(runtimeLog, "authorization"),
      "AI runtime log list item must not expose secrets or full prompt.",
    );

    const runtimeLogDetail = await request(`/logs/ai/${runtimeLog.id}`, {
      headers: DEV_HEADERS,
    });
    ensureStatus(runtimeLogDetail, 200, "GET /logs/ai/:id");
    ensure(
      runtimeLogDetail.json?.id === runtimeLog.id,
      "AI runtime log detail should return the requested log.",
    );
    ensure(
      !Object.prototype.hasOwnProperty.call(runtimeLogDetail.json, "apiKey") &&
        !Object.prototype.hasOwnProperty.call(runtimeLogDetail.json, "prompt") &&
        !Object.prototype.hasOwnProperty.call(runtimeLogDetail.json, "authorization"),
      "AI runtime log detail must not expose secrets or full prompt.",
    );

    const conversationMessages = await request(
      `/assistants/${assistantId}/conversations/${conversationId}/messages`,
      {
        headers: DEV_HEADERS,
      },
    );
    ensureStatus(
      conversationMessages,
      200,
      "GET /assistants/:assistantId/conversations/:conversationId/messages",
    );
    ensure(
      Array.isArray(conversationMessages.json?.items),
      "Conversation messages response does not contain items array.",
    );
    ensure(
      conversationMessages.json.items.some((item) => item.role === "user"),
      "Conversation messages should contain a user message.",
    );
    ensure(
      conversationMessages.json.items.some((item) => item.role === "assistant"),
      "Conversation messages should contain an assistant message.",
    );

    const previewInvalid = await request(`/assistants/${assistantId}/preview`, {
      method: "POST",
      headers: DEV_HEADERS,
      body: {},
    });
    ensureStatus(previewInvalid, 400, "POST /assistants/:id/preview with invalid body");

    const preview = await request(`/assistants/${assistantId}/preview`, {
      method: "POST",
      headers: DEV_HEADERS,
      body: { question: "Qual é o horário de atendimento?" },
    });
    ensureStatus(preview, 200, "POST /assistants/:id/preview");
    ensure(preview.json?.previewLogId, "Preview response did not return previewLogId.");

    const runInvalid = await request(`/assistants/${assistantId}/run`, {
      method: "POST",
      headers: DEV_HEADERS,
      body: {},
    });
    ensureStatus(runInvalid, 400, "POST /assistants/:id/run with invalid body");

    const run = await request(`/assistants/${assistantId}/run`, {
      method: "POST",
      headers: DEV_HEADERS,
      body: { message: "Qual é o horário de atendimento?" },
    });
    ensureStatus(run, 200, "POST /assistants/:id/run");
    ensure(run.json?.runLogId, "Run response did not return runLogId.");

    const previewLogs = await request(`/assistants/${assistantId}/preview-logs`, {
      headers: DEV_HEADERS,
    });
    ensureStatus(previewLogs, 200, "GET /assistants/:assistantId/preview-logs");
    ensure(
      Array.isArray(previewLogs.json?.items),
      "Preview logs response does not contain items array.",
    );
    ensure(
      previewLogs.json.items.length >= 2,
      "Preview logs should contain preview and runtime executions.",
    );

    const missingAssistant = await request("/assistants/assistant_inexistente", {
      headers: DEV_HEADERS,
    });
    ensureStatus(missingAssistant, 404, "GET /assistants/:id for missing assistant");

    const forbiddenLogs = await request(`/assistants/${assistantId}/preview-logs`, {
      headers: NO_PERMISSION_HEADERS,
    });
    ensureStatus(
      forbiddenLogs,
      403,
      "GET /assistants/:assistantId/preview-logs without permission",
    );

    const unauthorizedLogs = await request(`/assistants/${assistantId}/preview-logs`);
    ensureStatus(unauthorizedLogs, 401, "GET /assistants/:assistantId/preview-logs without auth");

    await sleep(100);

    console.log("Backend smoke test completed successfully.");
    console.log(JSON.stringify({ assistantId, runtimeKnowledgeId, createdArtifacts }, null, 2));
  } finally {
    await Promise.all(
      createdAssistantIds.map(async (assistantId) => {
        const cleanupAssistant = await request(`/assistants/${assistantId}/status`, {
          method: "PATCH",
          headers: DEV_HEADERS,
          body: { status: "INACTIVE" },
        });

        if (!cleanupAssistant.ok) {
          console.warn(
            `Could not inactivate smoke assistant ${assistantId}: HTTP ${cleanupAssistant.status}`,
          );
        }
      }),
    );

    await cleanupSmokeArtifacts();

    if (originalAiSettings) {
      const restoreAiSettings = await request("/settings/ai", {
        method: "PATCH",
        headers: DEV_HEADERS,
        body: {
          runtimeEnabled: originalAiSettings.runtimeEnabled,
          provider: originalAiSettings.provider,
          baseUrl: originalAiSettings.baseUrl,
          model: originalAiSettings.model,
          requestTimeoutMs: originalAiSettings.requestTimeoutMs,
        },
      });

      if (!restoreAiSettings.ok) {
        console.warn(`Could not restore AI settings after smoke: HTTP ${restoreAiSettings.status}`);
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Backend smoke test failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
