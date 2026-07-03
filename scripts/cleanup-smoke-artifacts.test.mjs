import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SMOKE_PREFIX,
  buildAssistantWhere,
  isSmokeAssistantName,
  parseArgs,
  runCleanup,
} from "./cleanup-smoke-artifacts.mjs";
import { buildCleanupArgs, buildSmokeAssistantPrefix } from "./smoke-backend.mjs";

const baseAssistant = {
  status: "ACTIVE",
  companyId: "company_demo_cubo_ai_studio",
  company: { id: "company_demo_cubo_ai_studio", name: "Cubo Demo" },
  createdAt: new Date("2026-07-01T12:00:00.000Z"),
  updatedAt: new Date("2026-07-01T12:00:00.000Z"),
  _count: {
    conversations: 0,
    assistantConversationMessages: 0,
    knowledgeItems: 0,
    previewLogs: 0,
    runtimeLogs: 0,
  },
};

function createFakePrisma({ apply = false } = {}) {
  const calls = {
    transaction: 0,
    assistantUpdateWhere: null,
    conversationUpdateWhere: null,
    knowledgeUpdateWhere: null,
  };

  const prisma = {
    assistant: {
      findMany: async () => [
        {
          ...baseAssistant,
          id: "assistant_smoke",
          name: "[SMOKE] Assistente Smoke Test Atualizado",
        },
        {
          ...baseAssistant,
          id: "assistant_real",
          name: "Assistente Demo",
        },
      ],
      count: async () => 1,
    },
    assistantConversation: {
      count: async () => 1,
    },
    assistantKnowledge: {
      count: async () => 1,
    },
    assistantConversationMessage: {
      count: async () => 2,
    },
    assistantPreviewLog: {
      count: async () => 1,
    },
    assistantRuntimeLog: {
      count: async () => 1,
    },
    $transaction: async (callback) => {
      calls.transaction += 1;

      if (!apply) {
        throw new Error("Dry-run must not open a transaction.");
      }

      return callback({
        assistant: {
          updateMany: async (args) => {
            calls.assistantUpdateWhere = args.where;
            return { count: 1 };
          },
        },
        assistantConversation: {
          updateMany: async (args) => {
            calls.conversationUpdateWhere = args.where;
            return { count: 1 };
          },
        },
        assistantKnowledge: {
          updateMany: async (args) => {
            calls.knowledgeUpdateWhere = args.where;
            return { count: 1 };
          },
        },
      });
    },
  };

  return { prisma, calls };
}

async function withoutConsoleNoise(callback) {
  const originalLog = console.log;
  console.log = () => {};

  try {
    return await callback();
  } finally {
    console.log = originalLog;
  }
}

test("identifica somente nomes claramente de smoke", () => {
  assert.equal(isSmokeAssistantName("[SMOKE] Assistente Smoke Test Atualizado"), true);
  assert.equal(isSmokeAssistantName("[SMOKE:run-123] Assistente Smoke Test"), true);
  assert.equal(isSmokeAssistantName("Assistente Smoke Test legado"), true);
  assert.equal(isSmokeAssistantName("Assistente Demo"), false);
  assert.equal(isSmokeAssistantName("Cliente [SMOKE] Real"), false);
});

test("prefixo customizado restringe o cleanup ao runId informado", () => {
  assert.equal(
    isSmokeAssistantName("[SMOKE:run-123] Assistente Smoke Test", {
      prefix: "[SMOKE:run-123]",
      includeLegacy: false,
    }),
    true,
  );
  assert.equal(
    isSmokeAssistantName("[SMOKE:outro-run] Assistente Smoke Test", {
      prefix: "[SMOKE:run-123]",
      includeLegacy: false,
    }),
    false,
  );
  assert.equal(
    isSmokeAssistantName("Assistente Smoke Test legado", {
      prefix: "[SMOKE:run-123]",
      includeLegacy: false,
    }),
    false,
  );
});

test("parseArgs mantém dry-run como padrão e aceita filtros opcionais", () => {
  assert.deepEqual(parseArgs([]), {
    apply: false,
    companyId: null,
    olderThanDays: null,
    prefix: DEFAULT_SMOKE_PREFIX,
    help: false,
  });

  assert.deepEqual(
    parseArgs(["--apply", "--companyId=company_1", "--olderThanDays=7", "--prefix=[SMOKE:abc]"]),
    {
      apply: true,
      companyId: "company_1",
      olderThanDays: 7,
      prefix: "[SMOKE:abc]",
      help: false,
    },
  );

  assert.throws(() => parseArgs(["--olderThanDays=-1"]), /non-negative integer/);
});

test("buildAssistantWhere inclui prefixo default, runId e legado sem tocar demo", () => {
  const where = buildAssistantWhere(
    {
      apply: false,
      companyId: "company_1",
      olderThanDays: 2,
      prefix: DEFAULT_SMOKE_PREFIX,
      help: false,
    },
    new Date("2026-07-10T00:00:00.000Z"),
  );

  assert.equal(where.companyId, "company_1");
  assert.equal(where.createdAt.lte.toISOString(), "2026-07-08T00:00:00.000Z");
  assert.deepEqual(where.OR, [
    { name: { startsWith: "[SMOKE]" } },
    { name: { startsWith: "[SMOKE:" } },
    { name: { startsWith: "Assistente Smoke Test" } },
  ]);
});

test("dry-run não altera dados e ignora assistente real", async () => {
  const { prisma, calls } = createFakePrisma();

  const result = await withoutConsoleNoise(() =>
    runCleanup({
      prisma,
      options: parseArgs([]),
    }),
  );

  assert.equal(calls.transaction, 0);
  assert.deepEqual(
    result.assistants.map((assistant) => assistant.id),
    ["assistant_smoke"],
  );
  assert.equal(result.applyResult, null);
});

test("apply inativa somente os artefatos identificados como smoke", async () => {
  const { prisma, calls } = createFakePrisma({ apply: true });

  const result = await withoutConsoleNoise(() =>
    runCleanup({
      prisma,
      options: parseArgs(["--apply"]),
    }),
  );

  assert.equal(calls.transaction, 1);
  assert.deepEqual(calls.assistantUpdateWhere.id.in, ["assistant_smoke"]);
  assert.deepEqual(calls.conversationUpdateWhere.assistantId.in, ["assistant_smoke"]);
  assert.deepEqual(calls.knowledgeUpdateWhere.assistantId.in, ["assistant_smoke"]);
  assert.equal(result.applyResult.assistants.count, 1);
});

test("smoke usa runId no nome e limpa somente o próprio prefixo", () => {
  const prefix = buildSmokeAssistantPrefix("run-123");
  const args = buildCleanupArgs(prefix);

  assert.equal(prefix, "[SMOKE:run-123]");
  assert.ok(args.includes("--apply"));
  assert.ok(args.includes("--companyId=company_demo_cubo_ai_studio"));
  assert.ok(args.includes("--prefix=[SMOKE:run-123]"));
  assert.equal(args.includes("--prefix=[SMOKE]"), false);
});
