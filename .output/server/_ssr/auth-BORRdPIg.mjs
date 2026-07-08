import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { n as useAuth } from "./auth-DYnTR_ad.mjs";
import { t as Button } from "./button-TeH4yfmP.mjs";
import { At as Sparkles, Ct as ArrowRight, H as LockKeyhole } from "../_libs/lucide-react.mjs";
import { P as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-BW9s_OV3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-BORRdPIg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/auth.tsx?tsr-split=component";
function AuthPage() {
	const { isAuthenticated } = useAuth();
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (isAuthenticated) navigate({
			to: "/portal",
			replace: true
		});
	}, [isAuthenticated, navigate]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("main", {
		className: "relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-6 text-white",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(34,197,94,0.10),transparent_30%)]" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 21,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "relative w-full max-w-sm border-white/10 bg-slate-900/85 text-white shadow-2xl backdrop-blur",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 text-slate-950",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-5 w-5" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 25,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 24,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-xl",
					children: "Cubo AI Studio"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 28,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, {
					className: "mt-1 text-slate-400",
					children: "O acesso é reservado a usuários criados por um administrador do Studio."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 29,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 27,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 23,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LockKeyhole, { className: "mt-0.5 h-4 w-4 shrink-0 text-cyan-300" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 36,
						columnNumber: 13
					}, this), "Não há cadastro público. Use seu e-mail e senha cadastrados no Portal do Studio."]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 35,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					className: "w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300",
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", {
						href: "/staging/login",
						children: ["Ir para o login", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowRight, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 42,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 40,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 39,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 34,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 22,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 20,
		columnNumber: 10
	}, this);
}
//#endregion
export { AuthPage as component };
