import { n as apiFetch } from "./apiClient-Dme41CHA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/companiesService-BvflQGn-.js
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
	}
};
//#endregion
export { companiesService as t };
