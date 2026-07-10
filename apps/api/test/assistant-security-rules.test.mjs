import assert from "node:assert/strict";
import { test } from "node:test";
import { Status } from "@prisma/client";
import { AssistantSecurityRulesService } from "../dist/assistant-security-rules/assistant-security-rules.service.js";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";

const tenant = { companyId: "company-1" };
const user = { id: "user-1", companyId: "company-1" };

function createRule(overrides = {}) {
  return {
    id: "rule-1",
    companyId: "company-1",
    assistantId: "assistant-1",
    name: "Não informar preço sem base",
    ruleType: "Não inventar resposta",
    instruction: "Se o preço não estiver na base, diga que não possui essa informação.",
    status: Status.ACTIVE,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createService(overrides = {}) {
  const calls = {
    assistantFinds: [],
    ruleFinds: [],
    creates: [],
    updates: [],
    deletes: [],
    counts: [],
  };
  let rules = overrides.rules ?? [createRule()];

  const prisma = {
    assistant: {
      findFirst: async (args) => {
        calls.assistantFinds.push(args);
        if (typeof overrides.assistantFindFirst === "function") {
          return overrides.assistantFindFirst(args);
        }
        return args.where.companyId === "company-1" && args.where.id === "assistant-1"
          ? { id: "assistant-1" }
          : null;
      },
    },
    assistantSecurityRule: {
      count: async (args) => {
        calls.counts.push(args);
        return rules.filter(
          (rule) =>
            rule.companyId === args.where.companyId &&
            rule.assistantId === args.where.assistantId,
        ).length;
      },
      findMany: async (args) => {
        calls.ruleFinds.push(args);
        return rules
          .filter((rule) => {
            if (args.where.companyId && rule.companyId !== args.where.companyId) return false;
            if (args.where.assistantId && rule.assistantId !== args.where.assistantId) return false;
            if (args.where.status && rule.status !== args.where.status) return false;
            return true;
          })
          .sort((left, right) => left.sortOrder - right.sortOrder);
      },
      findFirst: async (args) => {
        calls.ruleFinds.push(args);
        return (
          rules.find(
            (rule) =>
              rule.id === args.where.id &&
              rule.companyId === args.where.companyId &&
              rule.assistantId === args.where.assistantId,
          ) ?? null
        );
      },
      create: async (args) => {
        calls.creates.push(args);
        const rule = createRule({
          id: "created-rule",
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        rules = [...rules, rule];
        return rule;
      },
      updateMany: async (args) => {
        calls.updates.push(args);
        rules = rules.map((rule) =>
          rule.id === args.where.id &&
          rule.companyId === args.where.companyId &&
          rule.assistantId === args.where.assistantId
            ? { ...rule, ...args.data, updatedAt: new Date() }
            : rule,
        );
        return { count: 1 };
      },
      deleteMany: async (args) => {
        calls.deletes.push(args);
        rules = rules.filter(
          (rule) =>
            !(
              rule.id === args.where.id &&
              rule.companyId === args.where.companyId &&
              rule.assistantId === args.where.assistantId
            ),
        );
        return { count: 1 };
      },
    },
  };

  return { service: new AssistantSecurityRulesService(prisma), calls };
}

test("AssistantSecurityRulesService lista regras isoladas por assistente e tenant", async () => {
  const { service, calls } = createService({
    rules: [
      createRule({ id: "rule-1", assistantId: "assistant-1", companyId: "company-1" }),
      createRule({ id: "rule-2", assistantId: "assistant-2", companyId: "company-1" }),
      createRule({ id: "rule-3", assistantId: "assistant-1", companyId: "company-2" }),
    ],
  });

  const result = await service.findAll({ assistantId: "assistant-1", user, tenant });

  assert.deepEqual(
    result.items.map((item) => item.id),
    ["rule-1"],
  );
  assert.deepEqual(calls.ruleFinds.at(-1).where, {
    assistantId: "assistant-1",
    companyId: "company-1",
  });
});

test("AssistantSecurityRulesService cria, edita, desativa e exclui regra", async () => {
  const { service, calls } = createService({ rules: [] });

  const created = await service.create({
    assistantId: "assistant-1",
    dto: {
      name: "Não prometer desconto",
      ruleType: "Bloquear assunto",
      instruction: "Não prometa descontos sem autorização explícita.",
    },
    user,
    tenant,
  });
  assert.equal(created.id, "created-rule");
  assert.equal(calls.creates[0].data.companyId, "company-1");
  assert.equal(calls.creates[0].data.assistantId, "assistant-1");

  const updated = await service.update({
    assistantId: "assistant-1",
    ruleId: "created-rule",
    dto: { status: Status.INACTIVE, sortOrder: 3 },
    user,
    tenant,
  });
  assert.equal(updated.status, Status.INACTIVE);
  assert.equal(updated.sortOrder, 3);

  const deleted = await service.delete({
    assistantId: "assistant-1",
    ruleId: "created-rule",
    user,
    tenant,
  });
  assert.equal(deleted.id, "created-rule");
  assert.equal(calls.deletes.length, 1);
});

test("AssistantSecurityRulesService bloqueia assistente fora do tenant", async () => {
  const { service } = createService({ assistantFindFirst: async () => null });

  await assert.rejects(
    () =>
      service.create({
        assistantId: "assistant-foreign",
        dto: {
          name: "Regra",
          ruleType: "Bloquear assunto",
          instruction: "Não responder.",
        },
        user,
        tenant,
      }),
    /Assistant not found/i,
  );
});

test("findActiveForRuntime retorna somente regras ativas do assistente correto", async () => {
  const { service } = createService({
    rules: [
      createRule({ id: "active-a", assistantId: "assistant-1", status: Status.ACTIVE }),
      createRule({ id: "inactive-a", assistantId: "assistant-1", status: Status.INACTIVE }),
      createRule({ id: "active-b", assistantId: "assistant-2", status: Status.ACTIVE }),
    ],
  });

  const result = await service.findActiveForRuntime({
    assistantId: "assistant-1",
    companyId: "company-1",
  });

  assert.deepEqual(
    result.map((item) => item.id),
    ["active-a"],
  );
});

test("PromptCompiler inclui safetyInstruction legado e regras ativas no prompt", () => {
  const compiler = new PromptCompilerService();
  const messages = compiler.compile({
    assistant: {
      id: "assistant-1",
      name: "Assistente",
      instructions: "Responda com clareza.",
      safetyInstruction: "Nunca exponha tokens internos.",
    },
    securityRules: [
      {
        name: "Não inventar preço",
        ruleType: "Não inventar resposta",
        instruction: "Não informe preço sem base oficial.",
      },
    ],
    knowledgeItems: [],
    historyMessages: [],
    currentMessage: "Qual o preço?",
  });

  const safetyMessage = messages.find(
    (message) =>
      message.role === "system" &&
      typeof message.content === "string" &&
      message.content.includes("REGRAS DE SEGURANÇA DO ASSISTENTE"),
  );

  assert.ok(safetyMessage);
  assert.match(safetyMessage.content, /Nunca exponha tokens internos/);
  assert.match(safetyMessage.content, /Não informe preço sem base oficial/);
});
