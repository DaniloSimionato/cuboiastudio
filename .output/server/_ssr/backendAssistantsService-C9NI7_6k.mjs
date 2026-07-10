import { n as apiFetch } from "./apiClient-DG1jAm9p.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/backendAssistantsService-C9NI7_6k.js
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
	async securityRulesList(assistantId) {
		return (await apiFetch(`/assistants/${assistantId}/security-rules`)).items;
	},
	async securityRuleCreate(assistantId, input) {
		return apiFetch(`/assistants/${assistantId}/security-rules`, {
			method: "POST",
			body: JSON.stringify(input)
		});
	},
	async securityRuleUpdate(assistantId, ruleId, input) {
		return apiFetch(`/assistants/${assistantId}/security-rules/${ruleId}`, {
			method: "PATCH",
			body: JSON.stringify(input)
		});
	},
	async securityRuleDelete(assistantId, ruleId) {
		return apiFetch(`/assistants/${assistantId}/security-rules/${ruleId}`, { method: "DELETE" });
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
	},
	async getTools(assistantId) {
		return apiFetch(`/assistants/${assistantId}/tools`);
	},
	async updateTools(assistantId, tools) {
		return apiFetch(`/assistants/${assistantId}/tools`, {
			method: "PATCH",
			body: JSON.stringify({ tools })
		});
	}
};
//#endregion
export { backendAssistantsService as t };
