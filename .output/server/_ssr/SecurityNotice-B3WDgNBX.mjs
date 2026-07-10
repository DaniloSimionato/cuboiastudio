import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as Button } from "./button-TeH4yfmP.mjs";
import { nt as Eye, rt as EyeOff, v as ShieldCheck } from "../_libs/lucide-react.mjs";
import { t as Input } from "./input-B8Ml971c.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/SecurityNotice-B3WDgNBX.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName$1 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/security/MaskedSecretInput.tsx";
var MaskedSecretInput = import_react.forwardRef(({ className, storedHint, placeholder, ...props }, ref) => {
	const [visible, setVisible] = import_react.useState(false);
	const ph = storedHint ? `${storedHint} — deixe em branco para manter` : placeholder ?? "••••••••••••";
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("relative", className),
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
			ref,
			type: visible ? "text" : "password",
			autoComplete: "new-password",
			spellCheck: false,
			placeholder: ph,
			className: "pr-20",
			...props
		}, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 33,
			columnNumber: 9
		}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "absolute inset-y-0 right-1 flex items-center gap-0.5",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShieldCheck, {
				className: "h-3.5 w-3.5 text-emerald-600",
				"aria-label": "Será enviada com segurança ao servidor"
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 43,
				columnNumber: 11
			}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				type: "button",
				size: "sm",
				variant: "ghost",
				className: "h-7 w-7 p-0",
				onClick: () => setVisible((v) => !v),
				"aria-label": visible ? "Ocultar" : "Mostrar",
				children: visible ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EyeOff, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 55,
					columnNumber: 24
				}, void 0) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Eye, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 55,
					columnNumber: 57
				}, void 0)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 47,
				columnNumber: 11
			}, void 0)]
		}, void 0, true, {
			fileName: _jsxFileName$1,
			lineNumber: 42,
			columnNumber: 9
		}, void 0)]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 32,
		columnNumber: 7
	}, void 0);
});
MaskedSecretInput.displayName = "MaskedSecretInput";
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
export { SecurityNotice as n, MaskedSecretInput as t };
