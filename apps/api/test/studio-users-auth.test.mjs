import assert from "node:assert/strict";
import { test } from "node:test";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Status } from "@prisma/client";
import { AuthService } from "../dist/auth/auth.service.js";
import { hashPassword } from "../dist/auth/password.js";
import { PermissionsGuard } from "../dist/auth/permissions.guard.js";
import { StudioUsersService } from "../dist/studio-users/studio-users.service.js";

const proxySecret = "test-proxy-secret";
const config = { get: (key) => (key === "AUTH_PROXY_SHARED_SECRET" ? proxySecret : undefined) };

test("login aceita apenas email e senha válidos e retorna o nome persistido", async () => {
  const passwordHash = await hashPassword("temporary-123");
  const service = new AuthService(
    {
      user: {
        findUnique: async () => ({
          id: "user-1",
          email: "ana@example.com",
          name: "Ana Persistida",
          passwordHash,
          status: Status.ACTIVE,
          deletedAt: null,
        }),
      },
    },
    config,
  );

  const result = await service.authenticateStudioUser({
    email: "ANA@example.com",
    password: "temporary-123",
    proxySecret,
  });
  assert.deepEqual(result, {
    id: "user-1",
    email: "ana@example.com",
    name: "Ana Persistida",
  });
});

test("login bloqueia usuário inexistente", async () => {
  const service = new AuthService(
    { user: { findUnique: async () => null } },
    config,
  );
  await assert.rejects(
    () =>
      service.authenticateStudioUser({
        email: "missing@example.com",
        password: "temporary-123",
        proxySecret,
      }),
    UnauthorizedException,
  );
});

test("login bloqueia usuário inativo mesmo com senha correta", async () => {
  const passwordHash = await hashPassword("temporary-123");
  const service = new AuthService(
    {
      user: {
        findUnique: async () => ({
          id: "user-2",
          email: "inactive@example.com",
          name: "Inativo",
          passwordHash,
          status: Status.INACTIVE,
          deletedAt: null,
        }),
      },
    },
    config,
  );
  await assert.rejects(
    () =>
      service.authenticateStudioUser({
        email: "inactive@example.com",
        password: "temporary-123",
        proxySecret,
      }),
    UnauthorizedException,
  );
});

test("admin cria usuário com hash e membership, sem armazenar senha em claro", async () => {
  let createdData;
  let membershipData;
  const record = {
    id: "user-new",
    companyId: "company-1",
    activeCompanyId: null,
    name: "Novo Usuário",
    email: "novo@example.com",
    passwordHash: "hidden",
    status: Status.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    memberships: [
      {
        companyId: "company-1",
        status: Status.ACTIVE,
        company: { id: "company-1", name: "Empresa A" },
      },
    ],
    userRoles: [
      { role: { id: "role-global", name: "studio_operator", companyId: null } },
      { role: { id: "role-member", name: "member", companyId: "company-1" } },
    ],
  };
  const tx = {
    user: {
      create: async ({ data }) => {
        createdData = data;
        return { id: "user-new" };
      },
      findUniqueOrThrow: async () => record,
    },
    role: {
      upsert: async () => ({ id: "role-global" }),
      findMany: async ({ where }) =>
        where.companyId === null
          ? [{ id: "role-global" }]
          : [{ id: "role-member", companyId: "company-1" }],
      findFirst: async () => ({ id: "role-member" }),
    },
    userRole: {
      deleteMany: async () => ({}),
      create: async () => ({}),
    },
    company: {
      findMany: async () => [{ id: "company-1" }],
    },
    companyMembership: {
      deleteMany: async () => ({}),
      upsert: async ({ create }) => {
        membershipData = create;
        return {};
      },
    },
  };
  const service = new StudioUsersService({
    user: { findUnique: async () => null },
    $transaction: async (callback) => callback(tx),
  });

  const result = await service.create({
    name: "Novo Usuário",
    email: "NOVO@example.com",
    temporaryPassword: "temporary-123",
    status: Status.ACTIVE,
    globalRole: "STUDIO_OPERATOR",
    memberships: [{ companyId: "company-1", role: "MEMBER" }],
  });

  assert.equal(createdData.email, "novo@example.com");
  assert.notEqual(createdData.passwordHash, "temporary-123");
  assert.match(createdData.passwordHash, /^scrypt:/);
  assert.equal(createdData.activeCompanyId, null);
  assert.deepEqual(membershipData, {
    userId: "user-new",
    companyId: "company-1",
    status: Status.ACTIVE,
  });
  assert.equal(result.memberships[0].companyId, "company-1");
});

test("usuário comum não passa pela permissão de criação de usuários", () => {
  const guard = new PermissionsGuard({
    getAllAndOverride: () => ["users:manage"],
  });
  const context = {
    getType: () => "http",
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { permissions: [] } }),
    }),
  };
  assert.throws(() => guard.canActivate(context), ForbiddenException);
});
