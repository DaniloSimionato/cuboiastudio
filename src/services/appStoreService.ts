import { apiFetch, buildApiUrl } from "./apiClient";
import type {
  AppCatalogItem,
  AppInstallationItem,
  AppInstallationStatus,
  GoogleCalendarAccountCalendar,
  GoogleCalendarOAuthStatus,
  GoogleCalendarResourceItem,
  SaveGoogleCalendarResourcePayload,
} from "@/types";

export const appStoreService = {
  async listApps(): Promise<AppCatalogItem[]> {
    const response = await apiFetch<{ items: AppCatalogItem[] }>("/apps");
    return response.items;
  },

  async getApp(slug: string): Promise<AppCatalogItem> {
    return apiFetch<AppCatalogItem>(`/apps/${encodeURIComponent(slug)}`);
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

  async listGoogleCalendarResources(): Promise<GoogleCalendarResourceItem[]> {
    const response = await apiFetch<{ items: GoogleCalendarResourceItem[] }>(
      "/apps/google-calendar/resources",
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

  getGoogleCalendarOAuthStartUrl(): string {
    return buildApiUrl("/apps/google-calendar/oauth/start");
  },

  async getGoogleCalendarOAuthStatus(): Promise<GoogleCalendarOAuthStatus> {
    return apiFetch<GoogleCalendarOAuthStatus>("/apps/google-calendar/oauth/status");
  },

  async disconnectGoogleCalendarOAuth(): Promise<GoogleCalendarOAuthStatus> {
    return apiFetch<GoogleCalendarOAuthStatus>("/apps/google-calendar/oauth/disconnect", {
      method: "POST",
    });
  },

  async listGoogleCalendars(): Promise<GoogleCalendarAccountCalendar[]> {
    const response = await apiFetch<{ items: GoogleCalendarAccountCalendar[] }>(
      "/apps/google-calendar/calendars",
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
};
