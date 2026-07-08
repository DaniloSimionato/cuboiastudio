import { n as apiFetch } from "./apiClient-Dme41CHA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/backendAssistantsService-CPFwOdlH.js
function isSmokeAssistantName(name) {
	return name.startsWith("[SMOKE]") || name.startsWith("[SMOKE:") || name.startsWith("Assistente Smoke Test");
}
function isSmokeAssistant(assistant) {
	return Boolean(assistant) && isSmokeAssistantName(assistant.name);
}
function isOperationalAssistant(assistant, options = {}) {
	const { includeInactive = false } = options;
	if (isSmokeAssistant(assistant)) return false;
	return includeInactive || assistant.status === "ACTIVE";
}
function filterOperationalAssistants(assistants, options = {}) {
	return assistants.filter((assistant) => isOperationalAssistant(assistant, options));
}
function resolveOperationalAssistantId(assistants, preferredAssistantId, options = {}) {
	const visibleAssistants = filterOperationalAssistants(assistants, options);
	if (!preferredAssistantId) return visibleAssistants[0]?.id ?? "";
	return visibleAssistants.some((assistant) => assistant.id === preferredAssistantId) ? preferredAssistantId : visibleAssistants[0]?.id ?? "";
}
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
export { resolveOperationalAssistantId as a, isSmokeAssistantName as i, filterOperationalAssistants as n, isSmokeAssistant as r, backendAssistantsService as t };
