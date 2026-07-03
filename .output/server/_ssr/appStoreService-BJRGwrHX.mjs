import { n as apiFetch, r as buildApiUrl } from "./apiClient-DVSvK5lD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/appStoreService-BJRGwrHX.js
var appStoreService = {
	async listApps() {
		return (await apiFetch("/apps")).items;
	},
	async getApp(slug) {
		return apiFetch(`/apps/${encodeURIComponent(slug)}`);
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
	async listGoogleCalendarResources() {
		return (await apiFetch("/apps/google-calendar/resources")).items;
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
	getGoogleCalendarOAuthStartUrl() {
		return buildApiUrl("/apps/google-calendar/oauth/start");
	},
	async getGoogleCalendarOAuthStatus() {
		return apiFetch("/apps/google-calendar/oauth/status");
	},
	async disconnectGoogleCalendarOAuth() {
		return apiFetch("/apps/google-calendar/oauth/disconnect", { method: "POST" });
	},
	async listGoogleCalendars() {
		return (await apiFetch("/apps/google-calendar/calendars")).items;
	},
	async createGoogleCalendarResourceFromCalendar(payload) {
		return apiFetch("/apps/google-calendar/resources/from-calendar", {
			method: "POST",
			body: JSON.stringify(payload)
		});
	}
};
//#endregion
export { appStoreService as t };
