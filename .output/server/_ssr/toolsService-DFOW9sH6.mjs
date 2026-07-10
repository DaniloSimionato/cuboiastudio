import { n as apiFetch } from "./apiClient-DG1jAm9p.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/toolsService-DFOW9sH6.js
var toolsService = {
	async list() {
		return apiFetch("/webhook-actions");
	},
	async create(input) {
		return apiFetch("/webhook-actions", {
			method: "POST",
			body: JSON.stringify(input)
		});
	},
	async update(id, input) {
		return apiFetch(`/webhook-actions/${id}`, {
			method: "PATCH",
			body: JSON.stringify(input)
		});
	},
	async delete(id) {
		return apiFetch(`/webhook-actions/${id}`, { method: "DELETE" });
	}
};
//#endregion
export { toolsService as t };
