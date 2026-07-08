import { apiFetch } from "./apiClient";
import type {
  CompanyListResponse,
  CreateCompanyPayload,
  CurrentCompany,
  CurrentCompanyResponse,
  UpdateCompanyPayload,
} from "@/types";

export const companiesService = {
  async list(): Promise<CurrentCompany[]> {
    const response = await apiFetch<CompanyListResponse>("/companies");
    return response.items;
  },

  async get(id: string): Promise<CurrentCompany> {
    return apiFetch<CurrentCompany>(`/companies/${id}`);
  },

  async create(payload: CreateCompanyPayload): Promise<CurrentCompany> {
    return apiFetch<CurrentCompany>("/companies", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: UpdateCompanyPayload): Promise<CurrentCompany> {
    return apiFetch<CurrentCompany>(`/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async setActive(companyId: string): Promise<CurrentCompanyResponse> {
    return apiFetch<CurrentCompanyResponse>("/companies/active", {
      method: "POST",
      body: JSON.stringify({ companyId }),
    });
  },
};
