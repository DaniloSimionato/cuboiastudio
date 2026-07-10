process.env.NODE_ENV = "test";
import assert from "node:assert/strict";
import { test } from "node:test";
import { AssistantConversationsService } from "../dist/assistant-conversations/assistant-conversations.service.js";
import { AppsService } from "../dist/apps/apps.service.js";
import https from "node:https";

// Helper to create mock prisma client
function createMockPrisma(state) {
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    app: {
      findFirst: async ({ where }) =>
        state.apps.find((app) => app.slug === where.slug || app.id === where.id) ?? null,
    },
    appInstallation: {
      findMany: async () => state.installations,
      findFirst: async ({ where }) => {
        const inst = state.installations.find((i) => i.id === where.id || i.companyId === where.companyId) ?? null;
        if (inst) {
          const app = state.apps.find((a) => a.id === inst.appId || a.slug === "custom_webhook");
          return { ...inst, app };
        }
        return null;
      },
    },
    assistant: {
      findFirst: async ({ where }) => {
        const ast = state.assistants?.find((a) => a.id === where.id) ?? { id: where.id, companyId: where.companyId };
        return ast;
      },
    },
    assistantToolConfig: {
      findMany: async () => state.configs,
      findFirst: async ({ where }) =>
        state.configs.find(
          (c) =>
            c.assistantId === where.assistantId &&
            c.appId === where.appId &&
            c.toolName === where.toolName
        ) ?? null,
      deleteMany: async (args) => {
        state.deletedConfigsArgs = args;
        return { count: 0 };
      },
    },
    customWebhookAction: {
      findFirst: async ({ where }) =>
        state.webhookActions.find(
          (w) =>
            w.companyId === where.companyId &&
            (!where.name || w.name === where.name) &&
            (!where.id || w.id === where.id)
        ) ?? null,
      findMany: async () => state.webhookActions,
      create: async ({ data }) => {
        const action = { id: `webhook-${state.webhookActions.length + 1}`, ...data };
        state.webhookActions.push(action);
        return action;
      },
      update: async ({ where, data }) => {
        const action = state.webhookActions.find((w) => w.id === where.id);
        Object.assign(action, data);
        return action;
      },
      delete: async ({ where }) => {
        const idx = state.webhookActions.findIndex((w) => w.id === where.id);
        if (idx !== -1) state.webhookActions.splice(idx, 1);
        return { id: where.id };
      },
    },
    assistantConversationMessage: {
      create: async ({ data }) => ({ id: "msg-123", ...data }),
    },
    appActionLog: {
      create: async ({ data }) => {
        state.actionLogs.push(data);
        return { id: "log-123", ...data };
      },
      deleteMany: async () => ({ count: 0 }),
    },
  };
  return prisma;
}

test("AppsService - CRUD de CustomWebhookAction", async () => {
  const state = {
    apps: [{ id: "app-webhook", slug: "custom_webhook" }],
    installations: [
      { id: "inst-1", companyId: "company-1", appId: "app-webhook", status: "ACTIVE" },
    ],
    webhookActions: [],
    actionLogs: [],
  };

  const prisma = createMockPrisma(state);
  const service = new AppsService(prisma);

  // 1. Create Webhook Action
  const created = await service.createWebhookAction("company-1", {
    installationId: "inst-1",
    name: "consultar_estoque",
    displayName: "Consultar Estoque",
    descriptionAdmin: "Consulta de estoque",
    descriptionAi: "Consulta quantidade de itens",
    method: "POST",
    url: "https://api.erp.com/products/{{sku}}",
    headers: { "X-Client": "cubo" },
    authType: "BEARER",
    authConfig: { token: "secret-token-123" },
    bodyTemplate: '{"sku_code": "{{sku}}"}',
    parameterSchema: {
      type: "object",
      properties: { sku: { type: "string" } },
      required: ["sku"],
    },
    timeoutMs: 3000,
    permissionType: "READ",
    requiresConfirmation: false,
    responseFilter: ["qty", "location"],
    active: true,
  });

  assert.equal(created.name, "consultar_estoque");
  assert.equal(created.url, "https://api.erp.com/products/{{sku}}");
  assert.equal(state.webhookActions.length, 1);

  // 2. List Webhook Actions
  const list = await service.listWebhookActions("company-1");
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "consultar_estoque");

  // 3. Update Webhook Action
  const updated = await service.updateWebhookAction("company-1", created.id, {
    displayName: "Consultar Estoque ERP",
    active: false,
  });
  assert.equal(updated.displayName, "Consultar Estoque ERP");
  assert.equal(updated.active, false);

  // 4. Delete Webhook Action
  await service.deleteWebhookAction("company-1", created.id);
  assert.equal(state.webhookActions.length, 0);
  assert.ok(state.deletedConfigsArgs);
  assert.equal(state.deletedConfigsArgs.where.toolName, "webhook_consultar_estoque");
  assert.equal(state.deletedConfigsArgs.where.assistant.companyId, "company-1");
});

test("AssistantConversationsService - Execução de Custom Webhook e higienização de logs", async () => {
  const state = {
    apps: [{ id: "app-webhook", slug: "custom_webhook" }],
    installations: [
      { id: "inst-1", companyId: "company-1", appId: "app-webhook", status: "ACTIVE", app: { id: "app-webhook", slug: "custom_webhook" } },
    ],
    configs: [],
    webhookActions: [
      {
        id: "webhook-1",
        companyId: "company-1",
        installationId: "inst-1",
        name: "consultar_estoque",
        displayName: "Consultar Estoque",
        descriptionAdmin: "Consulta de estoque",
        descriptionAi: "Consulta quantidade",
        method: "POST",
        url: "https://httpbin.org/post?query_sku={{sku}}",
        headers: { "X-Client": "cubo" },
        authType: "BEARER",
        authConfig: { token: "token-secreto" },
        bodyTemplate: '{"sku": "{{sku}}"}',
        parameterSchema: {
          type: "object",
          properties: { sku: { type: "string" } },
          required: ["sku"],
        },
        timeoutMs: 5000,
        permissionType: "READ",
        requiresConfirmation: false,
        responseFilter: null,
        active: true,
      },
    ],
    actionLogs: [],
  };

  // Mock native https.request for the test
  const originalRequest = https.request;
  let fetchCalled = false;
  let fetchUrl = "";
  let fetchInit = null;

  https.request = (options, callback) => {
    fetchCalled = true;
    fetchUrl = `https://${options.servername || options.host}${options.path}`;
    fetchInit = {
      method: options.method,
      headers: options.headers,
      body: "",
    };

    const req = {
      write: (data) => {
        fetchInit.body += data;
      },
      end: () => {
        const res = {
          statusCode: 200,
          headers: {
            "content-type": "application/json",
          },
          on: (event, handler) => {
            if (event === "data") {
              handler(Buffer.from(JSON.stringify({ qty: 15, location: "Aisle A" })));
            }
            if (event === "end") {
              handler();
            }
          },
          pipe: (dest) => dest,
        };
        callback(res);
      },
      on: () => {},
      destroy: () => {},
    };
    return req;
  };

  const prisma = createMockPrisma(state);
  const service = new AssistantConversationsService(
    prisma,
    null,
    null,
    null,
    null,
    null,
    null,
  );

  // Invoke executeTool directly to test WebhookExecutor execution
  const response = await service["executeTool"](
    "company-1",
    "webhook_consultar_estoque",
    { sku: "product-abc" },
    { conversationId: "conv-1" },
    "assistant-1",
  );

  assert.ok(fetchCalled);
  assert.equal(fetchUrl, "https://httpbin.org/post?query_sku=product-abc");
  assert.equal(fetchInit.method, "POST");
  assert.equal(fetchInit.headers["Authorization"], "Bearer token-secreto");
  assert.equal(fetchInit.headers["X-Client"], "cubo");
  assert.equal(JSON.parse(fetchInit.body).sku, "product-abc");

  // Verify response
  const responseObj = JSON.parse(response);
  assert.equal(responseObj.qty, 15);
  assert.equal(responseObj.location, "Aisle A");

  // Verify log sanitization
  assert.equal(state.actionLogs.length, 2); // requested and completed
  const requestedLog = state.actionLogs.find((l) => l.action === "tool_call_requested");
  const completedLog = state.actionLogs.find((l) => l.action === "tool_call_completed");
  
  assert.ok(requestedLog);
  assert.ok(completedLog);

  // Redact header in logged metadata
  const completedMeta = completedLog.metadata;
  assert.equal(completedMeta.method, "POST");
  assert.equal(completedMeta.status, 200);
  assert.ok(!completedMeta.url.includes("query_sku=")); // query params redacted from url log

  // Restore https.request
  https.request = originalRequest;
});

test("Security - Rejeição de Credenciais em URL", async () => {
  const mockPrismaCreate = {
    appInstallation: {
      findFirst: async () => ({ id: "inst-1", companyId: "company-1", app: { slug: "custom_webhook" } }),
    }
  };
  const service = new AppsService(mockPrismaCreate);

  await assert.rejects(
    () => service.createWebhookAction("company-1", {
      installationId: "inst-1",
      name: "valid_slug",
      displayName: "Valid Display",
      method: "GET",
      url: "https://user:pass@api.erp.com/path",
      authType: "NONE",
      authConfig: null,
      timeoutMs: 3000,
    }),
    (err) => {
      assert.equal(err.message, "Credenciais embutidas na URL não são permitidas.");
      return true;
    }
  );

  const mockPrisma = {
    customWebhookAction: {
      findFirst: async () => ({ id: "webhook-1", url: "https://api.erp.com" }),
    }
  };
  const updateService = new AppsService(mockPrisma);
  await assert.rejects(
    () => updateService.updateWebhookAction("company-1", "webhook-1", {
      displayName: "New Display",
      url: "https://user:pass@api.erp.com/path",
    }),
    (err) => {
      assert.equal(err.message, "Credenciais embutidas na URL não são permitidas.");
      return true;
    }
  );
});

test("Security - Lazy Migration de Plaintext para Ciphertext", async () => {
  const plaintextConfig = { token: "plaintext-token-xyz" };
  const mockPrismaUpdate = {
    customWebhookAction: {
      findMany: async () => [
        {
          id: "webhook-1",
          companyId: "company-1",
          name: "old_action",
          authType: "BEARER",
          authConfig: plaintextConfig,
          method: "GET",
        }
      ],
      update: async ({ where, data }) => {
        assert.equal(where.id, "webhook-1");
        assert.ok(data.authConfig.encryptedData);
        assert.ok(data.authConfig.iv);
        assert.ok(data.authConfig.authTag);
        return {
          id: "webhook-1",
          companyId: "company-1",
          name: "old_action",
          authType: "BEARER",
          authConfig: data.authConfig,
          method: "GET",
        };
      }
    }
  };

  const service = new AppsService(mockPrismaUpdate);
  const list = await service.listWebhookActions("company-1");
  assert.equal(list.length, 1);
  assert.equal(list[0].authConfig.token, "••••••••");
});

test("Security - Resolução DNS e Prevenção de TOCTOU / SSRF", async () => {
  const { resolveAndValidateHost } = await import("../dist/common/security.js");
  const publicIP = await resolveAndValidateHost("httpbin.org");
  assert.ok(publicIP);

  await assert.rejects(
    () => resolveAndValidateHost("localhost"),
    /Acesso proibido: URL aponta para rede interna ou endereço restrito./
  );
});

