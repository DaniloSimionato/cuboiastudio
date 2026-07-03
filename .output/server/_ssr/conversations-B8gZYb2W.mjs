import { n as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as X } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay$1, c as DialogTrigger$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dialog-BQR4UioY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/dialog.tsx";
var Dialog = Dialog$1;
var DialogTrigger = DialogTrigger$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 21,
	columnNumber: 3
}, void 0));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogOverlay, {}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 37,
	columnNumber: 5
}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent$1, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(X, { className: "h-4 w-4" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 48,
			columnNumber: 9
		}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "sr-only",
			children: "Close"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 49,
			columnNumber: 9
		}, void 0)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 47,
		columnNumber: 7
	}, void 0)]
}, void 0, true, {
	fileName: _jsxFileName,
	lineNumber: 38,
	columnNumber: 5
}, void 0)] }, void 0, true, {
	fileName: _jsxFileName,
	lineNumber: 36,
	columnNumber: 3
}, void 0));
DialogContent.displayName = DialogContent$1.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 57,
	columnNumber: 3
}, void 0);
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 62,
	columnNumber: 3
}, void 0);
DialogFooter.displayName = "DialogFooter";
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle$1, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 73,
	columnNumber: 3
}, void 0));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 85,
	columnNumber: 3
}, void 0));
DialogDescription.displayName = DialogDescription$1.displayName;
//#endregion
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
export { formatConversationSourceLabel as a, DialogContent as c, DialogHeader as d, DialogTitle as f, formatConversationSecondaryLabel as i, DialogDescription as l, formatConversationChannelLabel as n, resolveOperationalConversationId as o, DialogTrigger as p, formatConversationPrimaryLabel as r, Dialog as s, filterOperationalConversations as t, DialogFooter as u };
