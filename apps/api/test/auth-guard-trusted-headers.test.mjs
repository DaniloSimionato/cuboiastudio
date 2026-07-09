import assert from "node:assert/strict";
import { test } from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "../dist/auth/auth.guard.js";
import { buildTrustedAuthSignature } from "../dist/auth/trusted-auth.js";

function createRequest(headers) {
  return { headers };
}

function createContext(request) {
  return {
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
}

function createPersistedUser() {
  return {
    id: "user-1",
    companyId: "company-1",
    activeCompanyId: "company-1",
    email: "user@example.com",
    name: "User",
    status: "ACTIVE",
    deletedAt: null,
    company: { id: "company-1", status: "ACTIVE", deletedAt: null },
    activeCompany: { id: "company-1", status: "ACTIVE", deletedAt: null },
    memberships: [
      { companyId: "company-1", company: { id: "company-1", status: "ACTIVE", deletedAt: null } },
    ],
    userRoles: [],
  };
}

test("AuthGuard aceita headers assinados em staging", async () => {
  const secret = "shared-secret";
  const timestamp = new Date().toISOString();
  const signature = buildTrustedAuthSignature({
    userId: "user-1",
    email: "user@example.com",
    name: "Signed User",
    timestamp,
    secret,
  });

  const guard = new AuthGuard(
    {
      withQueryTimeout: async (promise) => promise,
      user: {
        findFirst: async () => createPersistedUser(),
      },
      rolePermission: {
        findMany: async () => [],
      },
    },
    {
      get: (key) => {
        if (key === "AUTH_TRUST_MODE") return "signed-headers";
        if (key === "AUTH_PROXY_SHARED_SECRET") return secret;
        if (key === "AUTH_PROXY_SIGNATURE_TTL_MS") return 300000;
        return undefined;
      },
    },
  );

  const request = createRequest({
    "x-auth-user-id": "user-1",
    "x-auth-user-email": "user@example.com",
    "x-auth-user-name": "Signed User",
    "x-auth-timestamp": timestamp,
    "x-auth-signature": signature,
  });

  const result = await guard.canActivate(createContext(request));

  assert.equal(result, true);
  assert.equal(request.user?.id, "user-1");
  assert.equal(request.tenant?.companyId, "company-1");
});

test("AuthGuard rejeita headers sem assinatura válida em staging", async () => {
  const guard = new AuthGuard(
    {
      withQueryTimeout: async (promise) => promise,
      user: {
        findFirst: async () => createPersistedUser(),
      },
      rolePermission: {
        findMany: async () => [],
      },
    },
    {
      get: (key) => {
        if (key === "AUTH_TRUST_MODE") return "signed-headers";
        if (key === "AUTH_PROXY_SHARED_SECRET") return "shared-secret";
        if (key === "AUTH_PROXY_SIGNATURE_TTL_MS") return 300000;
        return undefined;
      },
    },
  );

  const request = createRequest({
    "x-auth-user-id": "user-1",
    "x-auth-user-email": "user@example.com",
    "x-auth-user-name": "Signed User",
    "x-auth-timestamp": new Date().toISOString(),
    "x-auth-signature": "invalid",
  });

  await assert.rejects(() => guard.canActivate(createContext(request)), UnauthorizedException);
});

test("AuthGuard autentica usuário sem empresa no portal, sem conceder tenant", async () => {
  const secret = "shared-secret";
  const timestamp = new Date().toISOString();
  const signature = buildTrustedAuthSignature({
    userId: "user-without-company",
    email: "global@example.com",
    name: "Global User",
    timestamp,
    secret,
  });
  const guard = new AuthGuard(
    {
      withQueryTimeout: async (promise) => promise,
      user: {
        findFirst: async () => ({
          id: "user-without-company",
          companyId: null,
          activeCompanyId: null,
          email: "global@example.com",
          name: "Global User",
          status: "ACTIVE",
          deletedAt: null,
          company: null,
          activeCompany: null,
          memberships: [],
          userRoles: [],
        }),
      },
      rolePermission: { findMany: async () => [] },
    },
    {
      get: (key) => {
        if (key === "AUTH_TRUST_MODE") return "signed-headers";
        if (key === "AUTH_PROXY_SHARED_SECRET") return secret;
        if (key === "AUTH_PROXY_SIGNATURE_TTL_MS") return 300000;
        return undefined;
      },
    },
  );
  const request = createRequest({
    "x-auth-user-id": "user-without-company",
    "x-auth-user-email": "global@example.com",
    "x-auth-user-name": "Global User",
    "x-auth-timestamp": timestamp,
    "x-auth-signature": signature,
  });

  assert.equal(await guard.canActivate(createContext(request)), true);
  assert.equal(request.user?.activeCompanyId, null);
  assert.deepEqual(request.user?.memberships, []);
  assert.equal(request.tenant?.companyId, "");
});

test("AuthGuard ignora activeCompanyId inativo e escolhe membership ativa", async () => {
  const secret = "shared-secret";
  const timestamp = new Date().toISOString();
  const signature = buildTrustedAuthSignature({
    userId: "user-1",
    email: "user@example.com",
    name: "User",
    timestamp,
    secret,
  });
  const persisted = createPersistedUser();
  persisted.activeCompanyId = "company-inactive";
  persisted.activeCompany = {
    id: "company-inactive",
    status: "INACTIVE",
    deletedAt: null,
  };
  persisted.memberships = [
    {
      companyId: "company-inactive",
      company: { id: "company-inactive", status: "INACTIVE", deletedAt: null },
    },
    {
      companyId: "company-2",
      company: { id: "company-2", status: "ACTIVE", deletedAt: null },
    },
  ];
  persisted.company = {
    id: "company-inactive",
    status: "INACTIVE",
    deletedAt: null,
  };
  persisted.companyId = "company-inactive";

  const guard = new AuthGuard(
    {
      withQueryTimeout: async (promise) => promise,
      user: { findFirst: async () => persisted },
      rolePermission: { findMany: async () => [] },
    },
    {
      get: (key) => {
        if (key === "AUTH_TRUST_MODE") return "signed-headers";
        if (key === "AUTH_PROXY_SHARED_SECRET") return secret;
        if (key === "AUTH_PROXY_SIGNATURE_TTL_MS") return 300000;
        return undefined;
      },
    },
  );
  const request = createRequest({
    "x-auth-user-id": "user-1",
    "x-auth-user-email": "user@example.com",
    "x-auth-user-name": "User",
    "x-auth-timestamp": timestamp,
    "x-auth-signature": signature,
  });

  await guard.canActivate(createContext(request));
  assert.equal(request.user?.activeCompanyId, "company-2");
  assert.equal(request.tenant?.companyId, "company-2");
});
