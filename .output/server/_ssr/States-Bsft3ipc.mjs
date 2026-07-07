import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as Button } from "./button-COtkgzDj.mjs";
import { G as Inbox, Mt as LoaderCircle, kt as TriangleAlert } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/States-Bsft3ipc.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/feedback/States.tsx";
function LoadingState({ label = "Carregando…", className }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 19,
				columnNumber: 7
			}, this),
			" ",
			label
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 13,
		columnNumber: 5
	}, this);
}
function EmptyState({ title, description, action, className }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Inbox, { className: "h-6 w-6 text-muted-foreground" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 42,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "font-medium",
				children: title
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 43,
				columnNumber: 7
			}, this),
			description && /* @__PURE__ */ (void 0)("p", {
				className: "max-w-sm text-sm text-muted-foreground",
				children: description
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 44,
				columnNumber: 23
			}, this),
			action && /* @__PURE__ */ (void 0)("div", {
				className: "mt-2",
				children: action
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 45,
				columnNumber: 18
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 36,
		columnNumber: 5
	}, this);
}
function ErrorState({ title = "Não foi possível carregar", description, onRetry, className }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50/50 py-10 text-center", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TriangleAlert, { className: "h-6 w-6 text-rose-600" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 68,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "font-medium text-rose-800",
				children: title
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 69,
				columnNumber: 7
			}, this),
			description && /* @__PURE__ */ (void 0)("p", {
				className: "max-w-sm text-sm text-rose-700/80",
				children: description
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 70,
				columnNumber: 23
			}, this),
			onRetry && /* @__PURE__ */ (void 0)(Button, {
				size: "sm",
				variant: "outline",
				onClick: onRetry,
				children: "Tentar novamente"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 72,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 62,
		columnNumber: 5
	}, this);
}
//#endregion
export { ErrorState as n, LoadingState as r, EmptyState as t };
