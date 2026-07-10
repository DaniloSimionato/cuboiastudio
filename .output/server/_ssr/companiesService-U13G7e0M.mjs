import { n as apiFetch } from "./apiClient-DG1jAm9p.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/companiesService-U13G7e0M.js
var companiesService = {
	async list() {
		return (await apiFetch("/companies")).items;
	},
	async get(id) {
		return apiFetch(`/companies/${id}`);
	},
	async create(payload) {
		return apiFetch("/companies", {
			method: "POST",
			body: JSON.stringify(payload)
		});
	},
	async update(id, payload) {
		return apiFetch(`/companies/${id}`, {
			method: "PATCH",
			body: JSON.stringify(payload)
		});
	},
	async setActive(companyId) {
		return apiFetch("/companies/active", {
			method: "POST",
			body: JSON.stringify({ companyId })
		});
	},
	async remove(companyId) {
		return apiFetch(`/companies/${companyId}`, { method: "DELETE" });
	}
};
//#endregion
export { companiesService as t };
