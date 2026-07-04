import { apiFetch, buildApiUrl } from "./apiClient";
import type {
  AppCatalogItem,
  AppInstallationItem,
  AppInstallationStatus,
  GoogleCalendarAccountCalendar,
  GoogleCalendarOAuthStatus,
  GoogleCalendarResourceItem,
  SaveGoogleCalendarResourcePayload,
  ReservableResourceType,
  ReservableResourceCategory,
  ReservableResourceAttribute,
} from "@/types";

export const appStoreService = {
  async listApps(): Promise<AppCatalogItem[]> {
    const response = await apiFetch<{ items: AppCatalogItem[] }>("/apps");
    return response.items;
  },

  async getApp(slug: string, installationId?: string): Promise<AppCatalogItem> {
    const query = installationId ? `?installationId=${encodeURIComponent(installationId)}` : "";
    return apiFetch<AppCatalogItem>(`/apps/${encodeURIComponent(slug)}${query}`);
  },

  async listInstallations(): Promise<AppInstallationItem[]> {
    const response = await apiFetch<{ items: AppInstallationItem[] }>("/app-installations");
    return response.items;
  },

  async install(slug: string): Promise<AppInstallationItem> {
    return apiFetch<AppInstallationItem>(`/apps/${encodeURIComponent(slug)}/install`, {
      method: "POST",
    });
  },

  async updateInstallationStatus(
    id: string,
    status: Extract<AppInstallationStatus, "ACTIVE" | "INACTIVE">,
  ): Promise<AppInstallationItem> {
    return apiFetch<AppInstallationItem>(`/app-installations/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async deleteInstallation(id: string): Promise<AppInstallationItem> {
    return apiFetch<AppInstallationItem>(`/app-installations/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async listGoogleCalendarResources(installationId?: string): Promise<GoogleCalendarResourceItem[]> {
    const query = installationId ? `?installationId=${encodeURIComponent(installationId)}` : "";
    const response = await apiFetch<{ items: GoogleCalendarResourceItem[] }>(
      `/apps/google-calendar/resources${query}`,
    );
    return response.items;
  },

  async createGoogleCalendarResource(
    payload: SaveGoogleCalendarResourcePayload,
  ): Promise<GoogleCalendarResourceItem> {
    return apiFetch<GoogleCalendarResourceItem>("/apps/google-calendar/resources", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateGoogleCalendarResource(
    id: string,
    payload: Partial<SaveGoogleCalendarResourcePayload>,
  ): Promise<GoogleCalendarResourceItem> {
    return apiFetch<GoogleCalendarResourceItem>(
      `/apps/google-calendar/resources/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  async deactivateGoogleCalendarResource(id: string): Promise<GoogleCalendarResourceItem> {
    return apiFetch<GoogleCalendarResourceItem>(
      `/apps/google-calendar/resources/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  },

  async getGoogleCalendarOAuthStartUrl(installationId?: string): Promise<{ authorizationUrl: string }> {
    const query = installationId ? `?installationId=${encodeURIComponent(installationId)}` : "";
    return apiFetch<{ authorizationUrl: string }>(`/apps/google-calendar/oauth/start-url${query}`);
  },

  async getGoogleCalendarOAuthStatus(installationId?: string): Promise<GoogleCalendarOAuthStatus> {
    const query = installationId ? `?installationId=${encodeURIComponent(installationId)}` : "";
    return apiFetch<GoogleCalendarOAuthStatus>(`/apps/google-calendar/oauth/status${query}`);
  },

  async disconnectGoogleCalendarOAuth(installationId?: string): Promise<GoogleCalendarOAuthStatus> {
    const query = installationId ? `?installationId=${encodeURIComponent(installationId)}` : "";
    return apiFetch<GoogleCalendarOAuthStatus>(`/apps/google-calendar/oauth/disconnect${query}`, {
      method: "POST",
    });
  },

  async listGoogleCalendars(installationId?: string): Promise<GoogleCalendarAccountCalendar[]> {
    const query = installationId ? `?installationId=${encodeURIComponent(installationId)}` : "";
    const response = await apiFetch<{ items: GoogleCalendarAccountCalendar[] }>(
      `/apps/google-calendar/calendars${query}`,
    );
    return response.items;
  },

  async createGoogleCalendarResourceFromCalendar(
    payload: SaveGoogleCalendarResourcePayload,
  ): Promise<GoogleCalendarResourceItem> {
    return apiFetch<GoogleCalendarResourceItem>("/apps/google-calendar/resources/from-calendar", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ── Resource Types CRUD ──────────────────────────────────────────

  async listResourceTypes(): Promise<ReservableResourceType[]> {
    const res = await apiFetch<{ items: ReservableResourceType[] }>("/apps/google-calendar/resource-types");
    return res.items;
  },

  async createResourceType(data: { name: string; slug: string; description?: string }): Promise<ReservableResourceType> {
    return apiFetch<ReservableResourceType>("/apps/google-calendar/resource-types", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateResourceType(id: string, data: { name?: string; slug?: string; description?: string; active?: boolean }): Promise<ReservableResourceType> {
    return apiFetch<ReservableResourceType>(`/apps/google-calendar/resource-types/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteResourceType(id: string): Promise<void> {
    await apiFetch(`/apps/google-calendar/resource-types/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // ── Resource Categories CRUD ─────────────────────────────────────

  async listResourceCategories(): Promise<ReservableResourceCategory[]> {
    const res = await apiFetch<{ items: ReservableResourceCategory[] }>("/apps/google-calendar/resource-categories");
    return res.items;
  },

  async createResourceCategory(data: { name: string; slug: string; description?: string }): Promise<ReservableResourceCategory> {
    return apiFetch<ReservableResourceCategory>("/apps/google-calendar/resource-categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateResourceCategory(id: string, data: { name?: string; slug?: string; description?: string; active?: boolean }): Promise<ReservableResourceCategory> {
    return apiFetch<ReservableResourceCategory>(`/apps/google-calendar/resource-categories/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteResourceCategory(id: string): Promise<void> {
    await apiFetch(`/apps/google-calendar/resource-categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // ── Resource Attributes CRUD ─────────────────────────────────────

  async listResourceAttributes(): Promise<ReservableResourceAttribute[]> {
    const res = await apiFetch<{ items: ReservableResourceAttribute[] }>("/apps/google-calendar/resource-attributes");
    return res.items;
  },

  async createResourceAttribute(data: { name: string; slug: string; description?: string }): Promise<ReservableResourceAttribute> {
    return apiFetch<ReservableResourceAttribute>("/apps/google-calendar/resource-attributes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateResourceAttribute(id: string, data: { name?: string; slug?: string; description?: string; active?: boolean }): Promise<ReservableResourceAttribute> {
    return apiFetch<ReservableResourceAttribute>(`/apps/google-calendar/resource-attributes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteResourceAttribute(id: string): Promise<void> {
    await apiFetch(`/apps/google-calendar/resource-attributes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
