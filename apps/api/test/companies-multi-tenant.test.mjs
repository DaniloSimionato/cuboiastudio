import assert from "node:assert/strict";
import { test } from "node:test";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Status } from "@prisma/client";
import { CompaniesService } from "../dist/companies/companies.service.js";
import { AssistantFlowsService } from "../dist/assistant-flows/assistant-flows.service.js";
import { AssistantBehaviorsService } from "../dist/assistant-behaviors/assistant-behaviors.service.js";
import { AssistantKnowledgeService } from "../dist/assistant-knowledge/assistant-knowledge.service.js";

function createUser(overrides = {}) {
  return {
    id: "user-1",
    companyId: "company-1",
    primaryCompanyId: "company-1",
    activeCompanyId: "company-1",
    email: "user@example.com",
    name: "User",
    memberships: ["company-1"],
    roles: ["admin"],
    permissions: ["companies:manage"],
    ...overrides,
  };
}

test("CompaniesService lista apenas empresas vinculadas ao usuário", async () => {
  const service = new CompaniesService({
    company: {
      findMany: async (args) => {
        assert.deepEqual(args.where.id.in, ["company-1", "company-2"]);
        return [
          {
            id: "company-1",
            name: "Empresa A",
            legalName: null,
            document: null,
            notes: null,
            status: Status.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "company-2",
            name: "Empresa B",
            legalName: null,
            document: null,
            notes: null,
            status: Status.INACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      },
    },
  });

  const result = await service.listAccessibleCompanies({
    user: createUser({ memberships: ["company-1", "company-2"], activeCompanyId: "company-2" }),
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.items[1].isActiveContext, true);
  assert.equal(result.items[0].isActiveContext, false);
});

test("CompaniesService bloqueia troca para empresa sem vínculo", async () => {
  const service = new CompaniesService({});

  await assert.rejects(
    () =>
      service.setActiveCompany({
        dto: { companyId: "company-2" },
        user: createUser({ memberships: ["company-1"] }),
      }),
    ForbiddenException,
  );
});

test("CompaniesService bloqueia criação de empresa com nome duplicado", async () => {
  const service = new CompaniesService({
    company: {
      findFirst: async ({ where }) => {
        assert.equal(where.name.equals, "Cubo AI Teste");
        assert.equal(where.name.mode, "insensitive");
        return { id: "company-existing" };
      },
    },
  });

  await assert.rejects(
    () =>
      service.create({
        dto: { name: "  Cubo AI Teste  " },
        user: createUser(),
      }),
    ConflictException,
  );
});

test("CompaniesService bloqueia criação de empresa com CNPJ/documento duplicado", async () => {
  const service = new CompaniesService({
    company: {
      findFirst: async ({ where }) => {
        if (where.name) return null; // pass name check
        assert.equal(where.document, "36802890000100");
        return { id: "company-existing", name: "Empresa Já Existente" };
      },
    },
  });

  await assert.rejects(
    () =>
      service.create({
        dto: { name: "FG Informatica", document: "36.802.890/0001-00" },
        user: createUser(),
      }),
    ConflictException,
  );
});

test("CompaniesService cria empresa nova sem copiar assistentes quando demo não é solicitado", async () => {
  const txCalls = {
    assistantCreateCount: 0,
    membershipUpserts: 0,
    userRoleUpserts: 0,
  };

  const tx = {
    company: {
      create: async () => ({
        id: "company-new",
        name: "Nova Empresa",
        legalName: "Nova Empresa LTDA",
        document: null,
        notes: null,
        status: Status.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    permission: {
      upsert: async ({ where }) => ({
        id: `perm-${where.key}`,
        key: where.key,
      }),
    },
    role: {
      create: async ({ data }) => ({ id: `role-${data.name}`, ...data }),
      findFirst: async () => ({ id: "role-admin" }),
    },
    rolePermission: {
      create: async () => ({}),
    },
    companyMembership: {
      upsert: async () => {
        txCalls.membershipUpserts += 1;
        return {};
      },
    },
    userRole: {
      upsert: async () => {
        txCalls.userRoleUpserts += 1;
        return {};
      },
    },
    user: {
      update: async () => {
        return {};
      },
    },
    assistant: {
      create: async () => {
        txCalls.assistantCreateCount += 1;
        return {};
      },
    },
  };

  const service = new CompaniesService({
    company: {
      findFirst: async () => null,
    },
    $transaction: async (callback) => callback(tx),
  });

  const created = await service.create({
    dto: {
      name: "Nova Empresa",
      legalName: "Nova Empresa LTDA",
      createDemoAssistant: false,
    },
    user: createUser(),
  });

  assert.equal(created.id, "company-new");
  assert.equal(txCalls.membershipUpserts, 1);
  assert.equal(txCalls.userRoleUpserts, 1);
  assert.equal(txCalls.assistantCreateCount, 0);
});

test("CompaniesService só cria assistente demo quando solicitado explicitamente", async () => {
  const txCalls = {
    assistantCreateCount: 0,
  };

  const tx = {
    company: {
      create: async () => ({
        id: "company-demo",
        name: "Empresa Demo",
        legalName: null,
        document: null,
        notes: null,
        status: Status.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    permission: {
      upsert: async ({ where }) => ({
        id: `perm-${where.key}`,
        key: where.key,
      }),
    },
    role: {
      create: async ({ data }) => ({ id: `role-${data.name}`, ...data }),
      findFirst: async () => ({ id: "role-admin" }),
    },
    rolePermission: {
      create: async () => ({}),
    },
    companyMembership: {
      upsert: async () => ({}),
    },
    userRole: {
      upsert: async () => ({}),
    },
    user: {
      update: async () => ({}),
    },
    assistant: {
      create: async () => {
        txCalls.assistantCreateCount += 1;
        return {};
      },
    },
  };

  const service = new CompaniesService({
    company: {
      findFirst: async () => null,
    },
    $transaction: async (callback) => callback(tx),
  });

  await service.create({
    dto: {
      name: "Empresa Demo",
      createDemoAssistant: true,
    },
    user: createUser(),
  });

  assert.equal(txCalls.assistantCreateCount, 1);
});

test("AssistantFlowsService não retorna fluxo de outra empresa", async () => {
  const service = new AssistantFlowsService({
    assistant: {
      findFirst: async () => ({ id: "assistant-1", companyId: "company-1" }),
    },
    assistantFlow: {
      findFirst: async () => null,
    },
  });

  await assert.rejects(
    () => service.findOne("company-1", "assistant-1", "flow-foreign"),
    NotFoundException,
  );
});

test("AssistantBehaviorsService não retorna behavior de assistente fora do tenant", async () => {
  const service = new AssistantBehaviorsService({
    assistant: {
      findFirst: async () => null,
    },
  });

  await assert.rejects(
    () => service.findByAssistantId("company-1", "assistant-foreign"),
    NotFoundException,
  );
});

test("AssistantKnowledgeService não atualiza item de conhecimento de outra empresa", async () => {
  const service = new AssistantKnowledgeService(
    {
      assistant: {
        findFirst: async () => ({ id: "assistant-1" }),
      },
      assistantKnowledge: {
        findFirst: async ({ where }) => {
          if (where.id === "knowledge-foreign") {
            return null;
          }

          return {
            id: "knowledge-1",
            title: "Titulo",
            content: "Conteudo",
            status: Status.ACTIVE,
            processingStatus: "READY",
            chunkCount: 0,
            processedAt: null,
            processingError: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: null,
          };
        },
        updateMany: async () => ({ count: 1 }),
      },
    },
    {},
  );

  await assert.rejects(
    () =>
      service.update({
        assistantId: "assistant-1",
        knowledgeId: "knowledge-foreign",
        dto: { title: "Novo titulo" },
        user: createUser(),
        tenant: { companyId: "company-1" },
      }),
    NotFoundException,
  );
});
