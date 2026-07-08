import { apiFetch } from "./apiClient";
import type { SaveStudioUserPayload, StudioUser, StudioUsersResponse } from "@/types";

export const studioUsersService = {
  async list(): Promise<StudioUser[]> {
    const response = await apiFetch<StudioUsersResponse>("/studio-users");
    return response.items;
  },

  create(payload: SaveStudioUserPayload): Promise<StudioUser> {
    return apiFetch<StudioUser>("/studio-users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<SaveStudioUserPayload>): Promise<StudioUser> {
    return apiFetch<StudioUser>(`/studio-users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
