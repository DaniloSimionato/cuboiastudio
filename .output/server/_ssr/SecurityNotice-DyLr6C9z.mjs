import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { v as ShieldCheck } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/SecurityNotice-DyLr6C9z.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/security/SecurityNotice.tsx";
/**
* Aviso discreto exibido em telas que coletam credenciais.
* Reforça ao usuário que o frontend não armazena segredos.
*/
function SecurityNotice({ className, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("flex items-start gap-2 rounded-md border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800", className),
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShieldCheck, { className: "mt-0.5 h-3.5 w-3.5 shrink-0" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 22,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: children ?? "Credenciais sensíveis são armazenadas apenas no backend. O frontend nunca retém tokens." }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 23,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 16,
		columnNumber: 5
	}, this);
}
//#endregion
export { SecurityNotice as t };
