//#region node_modules/.nitro/vite/services/ssr/assets/assistants-Cp2J7-VB.js
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
//#endregion
export { resolveOperationalAssistantId as i, isSmokeAssistant as n, isSmokeAssistantName as r, filterOperationalAssistants as t };
