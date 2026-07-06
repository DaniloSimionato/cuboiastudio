//#region node_modules/.nitro/vite/services/ssr/assets/conversations-B8gZYb2W.js
function isOperationalConversationSource(source) {
	return source === "MANUAL_TEST";
}
function isOperationalConversation(conversation) {
	return Boolean(conversation) && conversation.status === "ACTIVE" && isOperationalConversationSource(conversation.source);
}
function filterOperationalConversations(conversations) {
	return conversations.filter((conversation) => isOperationalConversation(conversation));
}
function resolveOperationalConversationId(conversations, preferredConversationId) {
	const visibleConversations = filterOperationalConversations(conversations);
	if (!preferredConversationId) return visibleConversations[0]?.id ?? "";
	return visibleConversations.some((conversation) => conversation.id === preferredConversationId) ? preferredConversationId : visibleConversations[0]?.id ?? "";
}
function isGenericManualTestTitle(title) {
	return title === "Atendimento de teste" || title.startsWith("Teste manual - ") || title.startsWith("Assistente Smoke Test");
}
function formatConversationPrimaryLabel(conversation) {
	const title = conversation.title?.trim();
	if (title && !isGenericManualTestTitle(title)) return title;
	return `Teste manual - ${formatConversationTimestamp(conversation.lastMessageAt ?? conversation.createdAt)}`;
}
function formatConversationSecondaryLabel(conversation) {
	return [
		formatConversationSourceLabel(conversation.source),
		formatConversationChannelLabel(conversation.channelType),
		conversation.externalConversationId ? `Ext ${conversation.externalConversationId}` : null,
		conversation.id ? `ID ${conversation.id}` : null
	].filter((value) => Boolean(value)).join(" · ");
}
function formatConversationSourceLabel(source) {
	switch (source) {
		case "MANUAL_TEST": return "Manual Test";
		case "CHATWOOT": return "Chatwoot";
		case "SMOKE": return "Smoke";
		case "SYSTEM": return "Sistema";
		default: return "Desconhecida";
	}
}
function formatConversationChannelLabel(channelType) {
	switch (channelType) {
		case "WHATSAPP": return "WhatsApp";
		case "INSTAGRAM": return "Instagram";
		case "WEBCHAT": return "Webchat";
		default: return "";
	}
}
function formatConversationTimestamp(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "sem data";
	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short"
	}).format(date);
}
//#endregion
export { formatConversationSourceLabel as a, formatConversationSecondaryLabel as i, formatConversationChannelLabel as n, resolveOperationalConversationId as o, formatConversationPrimaryLabel as r, filterOperationalConversations as t };
