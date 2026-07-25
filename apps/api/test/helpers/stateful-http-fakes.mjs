import http from "node:http";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "api_access_token",
  "cookie",
  "set-cookie",
  "x-chatwoot-webhook-secret",
]);

function sanitizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name.toLowerCase(),
      SENSITIVE_HEADERS.has(name.toLowerCase()) ? "[redacted]" : value,
    ]),
  );
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new Error("HTTP fake request exceeded the 2 MiB test limit");
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function writeJson(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

async function listenLoopback(server) {
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("HTTP fake did not expose a TCP address");
  }
  return {
    host: "127.0.0.1",
    port: address.port,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

function createServerLifecycle(handler) {
  const sockets = new Set();
  const timers = new Set();
  const server = http.createServer((request, response) => {
    Promise.resolve(handler(request, response, timers)).catch((error) => {
      if (!response.headersSent) {
        writeJson(response, 500, {
          error: "fake_boundary_failure",
          message: error instanceof Error ? error.message : String(error),
        });
      } else {
        response.destroy(error instanceof Error ? error : undefined);
      }
    });
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });

  return {
    server,
    timers,
    async close() {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      for (const socket of sockets) socket.destroy();
      if (!server.listening) return;
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

function behaviorMatches(behavior, request) {
  if (behavior.method && behavior.method.toUpperCase() !== request.method) return false;
  if (behavior.path && behavior.path !== request.path) return false;
  if (behavior.pathPattern && !behavior.pathPattern.test(request.path)) return false;
  if (behavior.category && behavior.category !== request.category) return false;
  return true;
}

function consumeBehavior(queue, request) {
  const index = queue.findIndex((behavior) => behaviorMatches(behavior, request));
  if (index < 0) return null;
  return queue.splice(index, 1)[0];
}

function applyConfiguredBehavior({ behavior, record, response, timers }) {
  if (!behavior) return false;

  if (behavior.kind === "timeout") {
    const timeoutMs = behavior.timeoutMs ?? 250;
    record.response = { kind: "timeout", timeoutMs };
    const timer = setTimeout(() => {
      timers.delete(timer);
      response.destroy();
    }, timeoutMs);
    timers.add(timer);
    return true;
  }

  const status = behavior.status ?? (behavior.kind === "accepted" ? 202 : 200);
  const body = behavior.body ?? { ok: status >= 200 && status < 300 };
  record.response = {
    kind: behavior.kind ?? "configured",
    status,
    body,
  };
  writeJson(response, status, body);
  return true;
}

function chatwootConversationKey(accountId, conversationId) {
  return `${accountId}:${conversationId}`;
}

export async function createStatefulChatwootFake() {
  const requests = [];
  const behaviorQueue = [];
  const conversations = new Map();
  let order = 0;
  let outboundSequence = 0;

  const lifecycle = createServerLifecycle(async (request, response, timers) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const body = await readJsonBody(request);
    const route = url.pathname.match(
      /^\/api\/v1\/accounts\/([^/]+)\/conversations\/([^/]+)(?:\/(messages|assignments|labels|toggle_status))?$/,
    );
    const method = (request.method ?? "GET").toUpperCase();
    const suffix = route?.[3] ?? null;
    const category =
      method === "GET"
        ? "chatwoot_read"
        : method === "POST" && suffix === "messages"
          ? "chatwoot_outbound"
          : "chatwoot_mutation";
    const record = {
      order: ++order,
      timestamp: new Date().toISOString(),
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: sanitizeHeaders(request.headers),
      body,
      category,
      response: null,
    };
    requests.push(record);

    const configured = consumeBehavior(behaviorQueue, record);
    if (
      configured?.kind !== "accepted_timeout" &&
      applyConfiguredBehavior({ behavior: configured, record, response, timers })
    ) {
      return;
    }

    if (!route) {
      record.response = { kind: "default", status: 404, body: { error: "not_found" } };
      writeJson(response, 404, { error: "not_found" });
      return;
    }

    const accountId = decodeURIComponent(route[1]);
    const conversationId = decodeURIComponent(route[2]);
    const key = chatwootConversationKey(accountId, conversationId);
    const conversation =
      conversations.get(key) ??
      {
        id: conversationId,
        account_id: accountId,
        inbox_id: null,
        ai_active: true,
        status: "open",
        assignee: null,
        team: null,
        labels: [],
        messages: [],
      };
    conversations.set(key, conversation);

    if (method === "GET" && suffix === "messages") {
      const responseBody = { payload: [...conversation.messages] };
      record.response = { kind: "default", status: 200, body: responseBody };
      writeJson(response, 200, responseBody);
      return;
    }

    if (method === "GET" && suffix === null) {
      const responseBody = {
        ...conversation,
        custom_attributes: { ai_active: conversation.ai_active },
        additional_attributes: {},
        meta: { ai_active: conversation.ai_active },
      };
      record.response = { kind: "default", status: 200, body: responseBody };
      writeJson(response, 200, responseBody);
      return;
    }

    if (method === "POST" && suffix === "messages") {
      const externalMessageId = `fake-chatwoot-outbound-${++outboundSequence}`;
      const outbound = {
        id: externalMessageId,
        content: body?.content ?? "",
        message_type: body?.message_type ?? "outgoing",
        private: body?.private === true,
        sender_type: body?.sender_type ?? null,
        content_attributes: body?.content_attributes ?? {},
        direction: "outbound",
      };
      conversation.messages.push(outbound);
      if (configured?.kind === "accepted_timeout") {
        const timeoutMs = configured.timeoutMs ?? 100;
        record.response = { kind: "accepted_timeout", timeoutMs };
        const timer = setTimeout(() => {
          timers.delete(timer);
          response.destroy();
        }, timeoutMs);
        timers.add(timer);
        return;
      }
      const responseBody = { ...outbound };
      record.response = { kind: "accepted", status: 201, body: responseBody };
      writeJson(response, 201, responseBody);
      return;
    }

    if ((method === "PUT" || method === "PATCH") && suffix === null) {
      if (typeof body?.ai_active === "boolean") conversation.ai_active = body.ai_active;
      if (typeof body?.status === "string") conversation.status = body.status;
      if (Object.hasOwn(body ?? {}, "assignee")) conversation.assignee = body.assignee;
      if (Object.hasOwn(body ?? {}, "team")) conversation.team = body.team;
      if (Array.isArray(body?.labels)) conversation.labels = [...body.labels];
      record.response = { kind: "default", status: 200, body: { ...conversation } };
      writeJson(response, 200, { ...conversation });
      return;
    }

    if (method === "POST" && suffix === "assignments") {
      conversation.assignee = body?.assignee_id ?? conversation.assignee;
      conversation.team = body?.team_id ?? conversation.team;
      record.response = { kind: "default", status: 200, body: { ...conversation } };
      writeJson(response, 200, { ...conversation });
      return;
    }

    if (method === "POST" && suffix === "labels") {
      conversation.labels = Array.isArray(body?.labels) ? [...body.labels] : conversation.labels;
      record.response = { kind: "default", status: 200, body: { ...conversation } };
      writeJson(response, 200, { ...conversation });
      return;
    }

    if (method === "POST" && suffix === "toggle_status") {
      conversation.status =
        typeof body?.status === "string"
          ? body.status
          : conversation.status === "open"
            ? "resolved"
            : "open";
      record.response = { kind: "default", status: 200, body: { ...conversation } };
      writeJson(response, 200, { ...conversation });
      return;
    }

    record.response = { kind: "default", status: 405, body: { error: "method_not_allowed" } };
    writeJson(response, 405, { error: "method_not_allowed" });
  });
  const address = await listenLoopback(lifecycle.server);

  return {
    ...address,
    requests,
    enqueueBehavior(behavior) {
      behaviorQueue.push({ ...behavior });
    },
    setConversation(input) {
      const key = chatwootConversationKey(String(input.accountId), String(input.conversationId));
      conversations.set(key, {
        id: String(input.conversationId),
        account_id: String(input.accountId),
        inbox_id: input.inboxId == null ? null : String(input.inboxId),
        ai_active: input.aiActive ?? true,
        status: input.status ?? "open",
        assignee: input.assignee ?? null,
        team: input.team ?? null,
        labels: [...(input.labels ?? [])],
        messages: [...(input.messages ?? [])],
      });
    },
    noteInbound(envelope) {
      const accountId = String(envelope.account?.id ?? envelope.account_id ?? "");
      const conversationId = String(
        envelope.conversation?.id ?? envelope.conversation_id ?? "",
      );
      const inboxId = String(
        envelope.inbox?.id ?? envelope.conversation?.inbox_id ?? envelope.inbox_id ?? "",
      );
      const key = chatwootConversationKey(accountId, conversationId);
      if (!conversations.has(key)) {
        this.setConversation({ accountId, conversationId, inboxId, aiActive: true });
      }
      const state = conversations.get(key);
      const inbound = {
        ...(envelope.message ?? {}),
        direction: "inbound",
      };
      if (!state.messages.some((message) => String(message.id) === String(inbound.id))) {
        state.messages.push(inbound);
      }
    },
    getConversation(accountId, conversationId) {
      return conversations.get(
        chatwootConversationKey(String(accountId), String(conversationId)),
      );
    },
    calls(category) {
      return requests.filter((request) => request.category === category);
    },
    reset() {
      requests.length = 0;
      behaviorQueue.length = 0;
      conversations.clear();
      order = 0;
      outboundSequence = 0;
    },
    async close() {
      await lifecycle.close();
    },
  };
}

function providerCategory(pathname, body) {
  if (pathname.endsWith("/embeddings")) return "embedding";
  const messageText = Array.isArray(body?.messages)
    ? body.messages.map((message) => String(message?.content ?? "")).join("\n")
    : "";
  if (/roteador de inten[cç][aã]o|classifique a inten[cç][aã]o/i.test(messageText)) {
    return "intent_classification";
  }
  if (/extra(?:ia|ir|ção).{0,40}mem[oó]ria|mem[oó]rias?.{0,40}estruturad/i.test(messageText)) {
    return "memory_extraction";
  }
  return "final_generation";
}

function openAiChatResponse({ content, toolCalls, model }) {
  return {
    id: "fake-provider-completion",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        finish_reason: toolCalls?.length ? "tool_calls" : "stop",
        message: {
          role: "assistant",
          content: content ?? null,
          ...(toolCalls?.length ? { tool_calls: toolCalls } : {}),
        },
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

export async function createStatefulOpenAiFake() {
  const requests = [];
  const behaviorQueue = [];
  const defaults = new Map([
    ["intent_classification", { content: "fallback" }],
    ["memory_extraction", { content: '{"memories":[]}' }],
    ["final_generation", { content: "Oi! Tudo certo. Como posso ajudar hoje?" }],
  ]);
  let order = 0;

  const lifecycle = createServerLifecycle(async (request, response, timers) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const body = await readJsonBody(request);
    const method = (request.method ?? "GET").toUpperCase();
    const category = providerCategory(url.pathname, body);
    const record = {
      order: ++order,
      timestamp: new Date().toISOString(),
      method,
      path: url.pathname,
      headers: sanitizeHeaders(request.headers),
      body,
      category,
      toolsExposed: Array.isArray(body?.tools) ? body.tools.length : 0,
      toolCallsReturned: 0,
      response: null,
    };
    requests.push(record);

    const configured = consumeBehavior(behaviorQueue, record);
    if (
      configured &&
      configured.kind !== "chat_completion" &&
      configured.kind !== "deferred_chat_completion" &&
      configured.kind !== "embedding"
    ) {
      if (applyConfiguredBehavior({ behavior: configured, record, response, timers })) return;
    }

    if (method !== "POST") {
      record.response = { kind: "default", status: 405, body: { error: "method_not_allowed" } };
      writeJson(response, 405, { error: "method_not_allowed" });
      return;
    }

    if (category === "embedding") {
      const embedding = configured?.embedding ?? [1, 0, 0];
      const responseBody = {
        object: "list",
        model: body?.model ?? "fake-embedding-model",
        data: [{ object: "embedding", index: 0, embedding }],
        usage: { prompt_tokens: 1, total_tokens: 1 },
      };
      record.response = { kind: configured?.kind ?? "embedding", status: 200, body: responseBody };
      writeJson(response, 200, responseBody);
      return;
    }

    if (!url.pathname.endsWith("/chat/completions")) {
      record.response = { kind: "default", status: 404, body: { error: "not_found" } };
      writeJson(response, 404, { error: "not_found" });
      return;
    }

    const selected = configured ?? defaults.get(category) ?? defaults.get("final_generation");
    if (selected?.kind === "deferred_chat_completion") {
      selected.markStarted();
      await selected.releaseSignal;
    }
    const responseBody = openAiChatResponse({
      content: selected?.content ?? "",
      toolCalls: selected?.toolCalls,
      model: body?.model ?? "fake-model",
    });
    record.toolCallsReturned = selected?.toolCalls?.length ?? 0;
    record.response = {
      kind: selected?.kind ?? "chat_completion",
      status: 200,
      body: responseBody,
    };
    writeJson(response, 200, responseBody);
  });
  const address = await listenLoopback(lifecycle.server);

  return {
    ...address,
    requests,
    enqueue(category, behavior) {
      behaviorQueue.push({ category, ...behavior });
    },
    deferNext(category, behavior = {}) {
      let markStarted;
      let release;
      let released = false;
      const started = new Promise((resolve) => {
        markStarted = resolve;
      });
      const releaseSignal = new Promise((resolve) => {
        release = resolve;
      });
      behaviorQueue.push({
        category,
        ...behavior,
        kind: "deferred_chat_completion",
        markStarted,
        releaseSignal,
      });
      return {
        started,
        release() {
          if (released) return;
          released = true;
          release();
        },
      };
    },
    setDefault(category, behavior) {
      defaults.set(category, { ...behavior });
    },
    calls(category) {
      return requests.filter((request) => request.category === category);
    },
    toolCallRequestCount() {
      return requests.filter((request) => request.toolsExposed > 0).length;
    },
    toolCallReturnCount() {
      return requests.reduce((total, request) => total + request.toolCallsReturned, 0);
    },
    reset() {
      requests.length = 0;
      behaviorQueue.length = 0;
      order = 0;
      defaults.set("intent_classification", { content: "fallback" });
      defaults.set("memory_extraction", { content: '{"memories":[]}' });
      defaults.set("final_generation", {
        content: "Oi! Tudo certo. Como posso ajudar hoje?",
      });
    },
    async close() {
      await lifecycle.close();
    },
  };
}
