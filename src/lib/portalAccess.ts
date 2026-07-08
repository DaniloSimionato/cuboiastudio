export async function accessCompany(input: {
  companyId: string;
  activeCompanyId: string | null;
  setActive: (companyId: string) => Promise<unknown>;
  refreshUser: () => Promise<{ activeCompanyId: string | null } | null>;
  navigate: () => Promise<unknown>;
  setLoadingCompanyId: (companyId: string | null) => void;
}): Promise<void> {
  input.setLoadingCompanyId(input.companyId);
  try {
    if (input.activeCompanyId !== input.companyId) {
      await input.setActive(input.companyId);
    }
    const refreshed = await input.refreshUser();
    if (refreshed?.activeCompanyId !== input.companyId) {
      throw new Error("A empresa ativa não foi confirmada. Tente novamente.");
    }
    await input.navigate();
  } finally {
    input.setLoadingCompanyId(null);
  }
}
