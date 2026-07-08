import { n as apiFetch } from "./apiClient-Dme41CHA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/backendAssistantsService-ClhibY7I.js
var backendAssistantsService = {
	async list(options = {}) {
		return (await apiFetch("/assistants", { signal: options.signal })).items;
	},
	async get(id) {
		return apiFetch(`/assistants/${id}`);
	},
	async create(input) {
		return apiFetch("/assistants", {
			method: "POST",
			body: JSON.stringify(input)
		});
	},
	async update(id, input) {
		return apiFetch(`/assistants/${id}`, {
			method: "PATCH",
			body: JSON.stringify(input)
		});
	},
	async updateStatus(id, status) {
		return apiFetch(`/assistants/${id}/status`, {
			method: "PATCH",
			body: JSON.stringify({ status })
		});
	},
	async preview(id, question, usePreparedKnowledge) {
		return apiFetch(`/assistants/${id}/preview`, {
			method: "POST",
			body: JSON.stringify({
				question,
				usePreparedKnowledge
			})
		});
	},
	async run(id, message) {
		return apiFetch(`/assistants/${id}/run`, {
			method: "POST",
			body: JSON.stringify({ message })
		});
	},
	async previewLogs(assistantId) {
		return apiFetch(`/assistants/${assistantId}/preview-logs`);
	},
	async knowledgeList(assistantId) {
		return (await apiFetch(`/assistants/${assistantId}/knowledge`)).items;
	},
	async knowledgeCreate(assistantId, input) {
		return apiFetch(`/assistants/${assistantId}/knowledge`, {
			method: "POST",
			body: JSON.stringify(input)
		});
	},
	async knowledgeUpdate(assistantId, knowledgeId, input) {
		return apiFetch(`/assistants/${assistantId}/knowledge/${knowledgeId}`, {
			method: "PATCH",
			body: JSON.stringify(input)
		});
	},
	async knowledgeDelete(assistantId, knowledgeId) {
		return apiFetch(`/assistants/${assistantId}/knowledge/${knowledgeId}`, { method: "DELETE" });
	},
	async knowledgePrepare(assistantId, knowledgeId) {
		return apiFetch(`/assistants/${assistantId}/knowledge/${knowledgeId}/prepare`, { method: "POST" });
	},
	async knowledgeSearch(assistantId, query, topK = 5) {
		return apiFetch(`/assistants/${assistantId}/knowledge/search`, {
			method: "POST",
			body: JSON.stringify({
				query,
				topK
			})
		});
	}
};
//#endregion
export { backendAssistantsService as t };
