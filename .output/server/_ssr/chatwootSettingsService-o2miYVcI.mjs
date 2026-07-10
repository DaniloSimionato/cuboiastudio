import { n as apiFetch } from "./apiClient-DG1jAm9p.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chatwootSettingsService-o2miYVcI.js
var chatwootSettingsService = {
	async list() {
		return apiFetch("/settings/chatwoot/inboxes");
	},
	async get(id) {
		return apiFetch(`/settings/chatwoot/inboxes/${id}`);
	},
	async create(payload) {
		return apiFetch("/settings/chatwoot/inboxes", {
			method: "POST",
			body: JSON.stringify(payload)
		});
	},
	async update(id, payload) {
		return apiFetch(`/settings/chatwoot/inboxes/${id}`, {
			method: "PATCH",
			body: JSON.stringify(payload)
		});
	},
	async remove(id) {
		return apiFetch(`/settings/chatwoot/inboxes/${id}`, { method: "DELETE" });
	},
	async test(id) {
		return apiFetch(`/settings/chatwoot/inboxes/${id}/test`, { method: "POST" });
	}
};
//#endregion
export { chatwootSettingsService as t };
