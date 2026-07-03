import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PageHeader-D4Y71euA.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/PageHeader.tsx";
function PageHeader({ title, description, actions, className }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className),
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "space-y-1",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
				className: "text-2xl font-semibold tracking-tight text-foreground",
				children: title
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 21,
				columnNumber: 9
			}, this), description ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "max-w-3xl text-sm text-muted-foreground",
				children: description
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 23,
				columnNumber: 11
			}, this) : null]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 20,
			columnNumber: 7
		}, this), actions ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex flex-wrap gap-2 md:justify-end",
			children: actions
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 26,
			columnNumber: 18
		}, this) : null]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 14,
		columnNumber: 5
	}, this);
}
//#endregion
export { PageHeader as t };
