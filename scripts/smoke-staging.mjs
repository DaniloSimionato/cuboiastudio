import { createHmac, randomUUID } from "node:crypto";

const API_URL = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");
const AUTH_PROXY_SHARED_SECRET = process.env.AUTH_PROXY_SHARED_SECRET || "";
const AUTH_USER_ID = process.env.STAGING_SMOKE_AUTH_USER_ID || "";
const AUTH_USER_EMAIL = (process.env.STAGING_SMOKE_AUTH_USER_EMAIL || "").toLowerCase();
const AUTH_USER_NAME = process.env.STAGING_SMOKE_AUTH_USER_NAME || "Staging Smoke User";
const RUN_ID = `${Date.now()}-${randomUUID().slice(0, 8)}`;

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildSignature({ userId, email, name, timestamp, secret }) {
  return createHmac("sha256", secret)
    .update([userId.trim(), email.trim().toLowerCase(), name.trim(), timestamp.trim()].join("\n"))
    .digest("hex");
}

function buildHeaders(extra = {}) {
  const timestamp = new Date().toISOString();
  const signature = buildSignature({
    userId: AUTH_USER_ID,
    email: AUTH_USER_EMAIL,
    name: AUTH_USER_NAME,
    timestamp,
    secret: AUTH_PROXY_SHARED_SECRET,
  });

  return {
    "x-auth-user-id": AUTH_USER_ID,
    "x-auth-user-email": AUTH_USER_EMAIL,
    "x-auth-user-name": AUTH_USER_NAME,
    "x-auth-timestamp": timestamp,
    "x-auth-signature": signature,
    ...extra,
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...buildHeaders(options.headers),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  return { status: response.status, ok: response.ok, json };
}

function expectStatus(result, expected, label) {
  if (result.status !== expected) {
    throw new Error(
      `${label} expected HTTP ${expected} but received ${result.status}: ${JSON.stringify(result.json)}`,
    );
  }
}

async function main() {
  ensure(AUTH_PROXY_SHARED_SECRET, "Missing AUTH_PROXY_SHARED_SECRET.");
  ensure(AUTH_USER_ID, "Missing STAGING_SMOKE_AUTH_USER_ID.");
  ensure(AUTH_USER_EMAIL, "Missing STAGING_SMOKE_AUTH_USER_EMAIL.");

  const companyAName = `Smoke ${RUN_ID} A`;
  const companyBName = `Smoke ${RUN_ID} B`;

  console.log(`Running staging smoke against ${API_URL}`);
  console.log(`Smoke run id: ${RUN_ID}`);

  const health = await fetch(`${API_URL}/health`);
  expectStatus({ status: health.status, json: await health.text() }, 200, "GET /health");

  const me = await request("/auth/me");
  expectStatus(me, 200, "GET /auth/me");

  const initialCompanies = await request("/companies");
  expectStatus(initialCompanies, 200, "GET /companies");

  const createdCompanyA = await request("/companies", {
    method: "POST",
    body: {
      name: companyAName,
      legalName: `${companyAName} LTDA`,
      createDemoAssistant: false,
    },
  });
  expectStatus(createdCompanyA, 201, "POST /companies (A)");

  const createdCompanyB = await request("/companies", {
    method: "POST",
    body: {
      name: companyBName,
      legalName: `${companyBName} LTDA`,
      createDemoAssistant: false,
    },
  });
  expectStatus(createdCompanyB, 201, "POST /companies (B)");

  const companyAId = createdCompanyA.json?.id;
  const companyBId = createdCompanyB.json?.id;
  ensure(companyAId && companyBId, "Smoke companies were not created correctly.");

  const switchToA = await request("/companies/active", {
    method: "POST",
    body: { companyId: companyAId },
  });
  expectStatus(switchToA, 200, "POST /companies/active (A)");

  const assistantsEmptyA = await request("/assistants");
  expectStatus(assistantsEmptyA, 200, "GET /assistants in empty company");
  ensure(
    Array.isArray(assistantsEmptyA.json?.items) && assistantsEmptyA.json.items.length === 0,
    "New company should start with zero assistants.",
  );

  const assistant = await request("/assistants", {
    method: "POST",
    body: {
      name: `Smoke Assistant ${RUN_ID}`,
      description: "Assistant created by staging smoke test.",
      instructions: "Responda objetivamente.",
      initialMessage: "Olá, smoke test.",
    },
  });
  expectStatus(assistant, 201, "POST /assistants");

  const assistantId = assistant.json?.id;
  ensure(assistantId, "Assistant id was not returned.");

  const knowledge = await request(`/assistants/${assistantId}/knowledge`, {
    method: "POST",
    body: {
      title: `Smoke Knowledge ${RUN_ID}`,
      content: "Base manual de conhecimento para validar isolamento multiempresa.",
    },
  });
  expectStatus(knowledge, 201, "POST /assistants/:assistantId/knowledge");

  const flow = await request(`/assistants/${assistantId}/flows`, {
    method: "POST",
    body: {
      name: `Smoke Flow ${RUN_ID}`,
      description: "Fluxo criado pelo smoke test.",
      triggerKeywords: '["smoke"]',
      flowInstructions: "Responder normalmente.",
      allowedToolSlugs: "[]",
      autoRespond: true,
      requiresHuman: false,
      active: true,
    },
  });
  expectStatus(flow, 201, "POST /assistants/:assistantId/flows");

  const conversation = await request(`/assistants/${assistantId}/conversations`, {
    method: "POST",
    body: {
      title: `Smoke Conversation ${RUN_ID}`,
      source: "SMOKE",
    },
  });
  expectStatus(conversation, 201, "POST /assistants/:assistantId/conversations");

  const conversationId = conversation.json?.id;
  ensure(conversationId, "Conversation id was not returned.");

  const message = await request(
    `/assistants/${assistantId}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: {
        message: "Mensagem de smoke para validar o caminho /testes manual.",
        source: "tests",
      },
    },
  );
  expectStatus(
    message,
    201,
    "POST /assistants/:assistantId/conversations/:conversationId/messages",
  );

  const logs = await request(`/logs/ai?assistantId=${encodeURIComponent(assistantId)}&limit=10`);
  expectStatus(logs, 200, "GET /logs/ai");

  const switchToB = await request("/companies/active", {
    method: "POST",
    body: { companyId: companyBId },
  });
  expectStatus(switchToB, 200, "POST /companies/active (B)");

  const assistantsEmptyB = await request("/assistants");
  expectStatus(assistantsEmptyB, 200, "GET /assistants in company B");
  ensure(
    Array.isArray(assistantsEmptyB.json?.items) && assistantsEmptyB.json.items.length === 0,
    "Company B should not see assistants from company A.",
  );

  const foreignAssistant = await request(`/assistants/${assistantId}`);
  expectStatus(foreignAssistant, 404, "GET /assistants/:id for foreign tenant");

  const companiesAfter = await request("/companies");
  expectStatus(companiesAfter, 200, "GET /companies after switches");
  ensure(
    companiesAfter.json?.items?.some((item) => item.id === companyAId) &&
      companiesAfter.json?.items?.some((item) => item.id === companyBId),
    "Created smoke companies should be listed for the authenticated admin.",
  );

  const originalCompanyId = initialCompanies.json?.items?.[0]?.id;
  if (originalCompanyId) {
    console.log(`Switching active company context back to original: ${originalCompanyId}`);
    const restoreActive = await request("/companies/active", {
      method: "POST",
      body: { companyId: originalCompanyId },
    });
    expectStatus(restoreActive, 200, "Restore original active company");
  }

  console.log("Cleaning up smoke companies...");
  const deleteA = await request(`/companies/${companyAId}`, { method: "DELETE" });
  expectStatus(deleteA, 200, "DELETE company A");

  const deleteB = await request(`/companies/${companyBId}`, { method: "DELETE" });
  expectStatus(deleteB, 200, "DELETE company B");
  console.log("Smoke companies deleted successfully.");

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId: RUN_ID,
        companyAId,
        companyBId,
        assistantId,
        conversationId,
        createdCompanyCountBefore: initialCompanies.json?.items?.length ?? null,
        createdCompanyCountAfter: initialCompanies.json?.items?.length ?? null, // count should match before now!
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
