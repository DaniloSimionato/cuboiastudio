import assert from "node:assert/strict";
import { test } from "node:test";
import { accessCompany } from "./portalAccess.ts";

test("acessar empresa troca contexto, atualiza usuário e navega", async () => {
  const calls: string[] = [];
  const loading: Array<string | null> = [];

  await accessCompany({
    companyId: "company-2",
    activeCompanyId: "company-1",
    setActive: async (companyId) => calls.push(`active:${companyId}`),
    refreshUser: async () => {
      calls.push("refresh");
      return { activeCompanyId: "company-2" };
    },
    navigate: async () => calls.push("navigate"),
    setLoadingCompanyId: (companyId) => loading.push(companyId),
  });

  assert.deepEqual(calls, ["active:company-2", "refresh", "navigate"]);
  assert.deepEqual(loading, ["company-2", null]);
});

test("erro ao trocar empresa sempre encerra o loading e não navega", async () => {
  const loading: Array<string | null> = [];
  let navigated = false;

  await assert.rejects(
    () =>
      accessCompany({
        companyId: "company-2",
        activeCompanyId: "company-1",
        setActive: async () => {
          throw new Error("Falha no setActive");
        },
        refreshUser: async () => ({ activeCompanyId: "company-1" }),
        navigate: async () => {
          navigated = true;
        },
        setLoadingCompanyId: (companyId) => loading.push(companyId),
      }),
    /Falha no setActive/,
  );

  assert.equal(navigated, false);
  assert.deepEqual(loading, ["company-2", null]);
});
