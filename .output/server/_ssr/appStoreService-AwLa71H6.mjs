import { n as apiFetch } from "./apiClient-DG1jAm9p.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/appStoreService-AwLa71H6.js
var appStoreService = {
	async listApps() {
		return (await apiFetch("/apps")).items;
	},
	async getApp(slug, installationId) {
		const query = installationId ? `?installationId=${encodeURIComponent(installationId)}` : "";
		return apiFetch(`/apps/${encodeURIComponent(slug)}${query}`);
	},
	async listInstallations() {
		return (await apiFetch("/app-installations")).items;
	},
	async install(slug) {
		return apiFetch(`/apps/${encodeURIComponent(slug)}/install`, { method: "POST" });
	},
	async updateInstallationStatus(id, status) {
		return apiFetch(`/app-installations/${encodeURIComponent(id)}/status`, {
			method: "PATCH",
			body: JSON.stringify({ status })
		});
	},
	async deleteInstallation(id) {
		return apiFetch(`/app-installations/${encodeURIComponent(id)}`, { method: "DELETE" });
	},
	async listGoogleCalendarResources(installationId) {
		return (await apiFetch(`/apps/google-calendar/resources${installationId ? `?installationId=${encodeURIComponent(installationId)}` : ""}`)).items;
	},
	async createGoogleCalendarResource(payload) {
		return apiFetch("/apps/google-calendar/resources", {
			method: "POST",
			body: JSON.stringify(payload)
		});
	},
	async updateGoogleCalendarResource(id, payload) {
		return apiFetch(`/apps/google-calendar/resources/${encodeURIComponent(id)}`, {
			method: "PATCH",
			body: JSON.stringify(payload)
		});
	},
	async deactivateGoogleCalendarResource(id) {
		return apiFetch(`/apps/google-calendar/resources/${encodeURIComponent(id)}`, { method: "DELETE" });
	},
	async getGoogleCalendarOAuthStartUrl(installationId) {
		return apiFetch(`/apps/google-calendar/oauth/start-url${installationId ? `?installationId=${encodeURIComponent(installationId)}` : ""}`);
	},
	async getGoogleCalendarOAuthStatus(installationId) {
		return apiFetch(`/apps/google-calendar/oauth/status${installationId ? `?installationId=${encodeURIComponent(installationId)}` : ""}`);
	},
	async disconnectGoogleCalendarOAuth(installationId) {
		return apiFetch(`/apps/google-calendar/oauth/disconnect${installationId ? `?installationId=${encodeURIComponent(installationId)}` : ""}`, { method: "POST" });
	},
	async listGoogleCalendars(installationId) {
		return (await apiFetch(`/apps/google-calendar/calendars${installationId ? `?installationId=${encodeURIComponent(installationId)}` : ""}`)).items;
	},
	async createGoogleCalendarResourceFromCalendar(payload) {
		return apiFetch("/apps/google-calendar/resources/from-calendar", {
			method: "POST",
			body: JSON.stringify(payload)
		});
	},
	async listResourceTypes() {
		return (await apiFetch("/apps/google-calendar/resource-types")).items;
	},
	async createResourceType(data) {
		return apiFetch("/apps/google-calendar/resource-types", {
			method: "POST",
			body: JSON.stringify(data)
		});
	},
	async updateResourceType(id, data) {
		return apiFetch(`/apps/google-calendar/resource-types/${encodeURIComponent(id)}`, {
			method: "PATCH",
			body: JSON.stringify(data)
		});
	},
	async deleteResourceType(id) {
		await apiFetch(`/apps/google-calendar/resource-types/${encodeURIComponent(id)}`, { method: "DELETE" });
	},
	async listResourceCategories() {
		return (await apiFetch("/apps/google-calendar/resource-categories")).items;
	},
	async createResourceCategory(data) {
		return apiFetch("/apps/google-calendar/resource-categories", {
			method: "POST",
			body: JSON.stringify(data)
		});
	},
	async updateResourceCategory(id, data) {
		return apiFetch(`/apps/google-calendar/resource-categories/${encodeURIComponent(id)}`, {
			method: "PATCH",
			body: JSON.stringify(data)
		});
	},
	async deleteResourceCategory(id) {
		await apiFetch(`/apps/google-calendar/resource-categories/${encodeURIComponent(id)}`, { method: "DELETE" });
	},
	async listResourceAttributes() {
		return (await apiFetch("/apps/google-calendar/resource-attributes")).items;
	},
	async createResourceAttribute(data) {
		return apiFetch("/apps/google-calendar/resource-attributes", {
			method: "POST",
			body: JSON.stringify(data)
		});
	},
	async updateResourceAttribute(id, data) {
		return apiFetch(`/apps/google-calendar/resource-attributes/${encodeURIComponent(id)}`, {
			method: "PATCH",
			body: JSON.stringify(data)
		});
	},
	async deleteResourceAttribute(id) {
		await apiFetch(`/apps/google-calendar/resource-attributes/${encodeURIComponent(id)}`, { method: "DELETE" });
	}
};
//#endregion
export { appStoreService as t };
