import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { A as Plus, Rt as Braces } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
import { s as variaveis } from "./_ssr/mock-Cib7WMLS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.variaveis-DKVG7GoS.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.variaveis.tsx?tsr-split=component";
function VarsPage() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
		title: "Variáveis",
		description: "Variáveis disponíveis para uso em prompts, ferramentas e fluxos.",
		actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 11,
			columnNumber: 13
		}, this), " Nova variável"] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 10,
			columnNumber: 125
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 10,
		columnNumber: 7
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-0",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Nome" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 18,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Descrição" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 19,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Origem" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 20,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Exemplo" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 21,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Disponível em" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 22,
				columnNumber: 17
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 17,
			columnNumber: 15
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 16,
			columnNumber: 13
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: variaveis.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
			colSpan: 5,
			className: "text-center py-12 text-muted-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Braces, { className: "h-8 w-8 mx-auto mb-2 opacity-50 text-primary animate-pulse" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 28,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "font-semibold text-sm",
					children: "Nenhuma variável cadastrada"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 29,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-xs",
					children: "Crie variáveis de contexto para personalizar prompts e webhooks."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 30,
					columnNumber: 21
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 27,
			columnNumber: 19
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 26,
			columnNumber: 41
		}, this) : variaveis.map((v) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("code", {
				className: "text-xs bg-muted px-2 py-1 rounded",
				children: v.nome
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 34,
				columnNumber: 23
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 33,
				columnNumber: 21
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: v.descricao }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 36,
				columnNumber: 21
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "text-muted-foreground",
				children: v.origem
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 37,
				columnNumber: 21
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "font-mono text-xs",
				children: v.exemplo
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 38,
				columnNumber: 21
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex gap-1 flex-wrap",
				children: v.disponivelEm.map((d) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
					variant: "outline",
					children: d
				}, d, false, {
					fileName: _jsxFileName,
					lineNumber: 41,
					columnNumber: 50
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 40,
				columnNumber: 23
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 39,
				columnNumber: 21
			}, this)
		] }, v.nome, true, {
			fileName: _jsxFileName,
			lineNumber: 32,
			columnNumber: 50
		}, this)) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 25,
			columnNumber: 13
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 15,
			columnNumber: 11
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 14,
		columnNumber: 9
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 13,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 9,
		columnNumber: 10
	}, this);
}
//#endregion
export { VarsPage as component };
