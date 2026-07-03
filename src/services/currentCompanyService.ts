import { apiFetch } from "./apiClient";
import type { CurrentCompanyResponse } from "@/types";

export const currentCompanyService = {
  async get(): Promise<CurrentCompanyResponse> {
    return apiFetch<CurrentCompanyResponse>("/companies/current");
  },
};
