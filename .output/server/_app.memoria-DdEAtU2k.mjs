import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as cva } from "./_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { N as Pencil, f as Trash2, y as ShieldAlert } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
import { n as clienteNome, o as memorias, r as clientes } from "./_ssr/mock-Cib7WMLS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.memoria-DdEAtU2k.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName$1 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/alert.tsx";
var alertVariants = cva("relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7", {
	variants: { variant: {
		default: "bg-background text-foreground",
		destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
	} },
	defaultVariants: { variant: "default" }
});
var Alert = import_react.forwardRef(({ className, variant, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	ref,
	role: "alert",
	className: cn(alertVariants({ variant }), className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 26,
	columnNumber: 3
}, void 0));
Alert.displayName = "Alert";
var AlertTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h5", {
	ref,
	className: cn("mb-1 font-medium leading-none tracking-tight", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 32,
	columnNumber: 5
}, void 0));
AlertTitle.displayName = "AlertTitle";
var AlertDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	ref,
	className: cn("text-sm [&_p]:leading-relaxed", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 45,
	columnNumber: 3
}, void 0));
AlertDescription.displayName = "AlertDescription";
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.memoria.tsx?tsr-split=component";
function MemoriaPage() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Memória",
			description: "Memórias salvas por contato e suas configurações."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 13,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Alert, {
			className: "mb-4 border-amber-200 bg-amber-50",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShieldAlert, { className: "h-4 w-4 text-amber-600" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 16,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AlertTitle, {
					className: "text-amber-900",
					children: "Atenção ao tratar dados sensíveis"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 17,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AlertDescription, {
					className: "text-amber-800",
					children: "A memória deve ser controlada. Não armazene dados sensíveis (documentos, senhas, cartão) sem autorização explícita do cliente."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 18,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 15,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-4",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-4 grid grid-cols-2 md:grid-cols-4 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Cliente/empresa" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 28,
						columnNumber: 15
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 27,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: clientes.map((c) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: c.id,
						children: c.nome
					}, c.id, false, {
						fileName: _jsxFileName,
						lineNumber: 31,
						columnNumber: 34
					}, this)) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 30,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 26,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, { placeholder: "Contato" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 36,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Canal" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 39,
						columnNumber: 15
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 38,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "wa",
							children: "WhatsApp Oficial"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 42,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "ig",
							children: "Instagram"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 43,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "web",
							children: "Webchat"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 44,
							columnNumber: 15
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 41,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 37,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Tipo" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 49,
						columnNumber: 15
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 48,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "pref",
							children: "Preferência"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 52,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "op",
							children: "Operacional"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 53,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "ct",
							children: "Contato"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 54,
							columnNumber: 15
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 51,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 47,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 25,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 24,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-0",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Contato" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 65,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Telefone" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 66,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Cliente" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 67,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Tipo" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 68,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Informação" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 69,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Criado" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 70,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Expira" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 71,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 72,
					columnNumber: 17
				}, this)
			] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 64,
				columnNumber: 15
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 63,
				columnNumber: 13
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: memorias.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				colSpan: 8,
				className: "text-center py-12 text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Brain, { className: "h-8 w-8 mx-auto mb-2 opacity-50 text-primary animate-pulse" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 78,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "font-semibold text-sm",
						children: "Nenhuma memória cadastrada"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 79,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-xs",
						children: "As memórias dos contatos aparecerão aqui automaticamente."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 80,
						columnNumber: 21
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 77,
				columnNumber: 19
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 76,
				columnNumber: 40
			}, this) : memorias.map((m) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "font-medium",
					children: m.contato
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 83,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "font-mono text-xs",
					children: m.telefone
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 84,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: clienteNome(m.clienteId) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 85,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
					variant: "outline",
					children: m.tipo
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 87,
					columnNumber: 23
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 86,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "max-w-[300px] truncate",
					children: m.info
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 89,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "text-muted-foreground text-xs",
					children: m.criadoEm
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 90,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "text-muted-foreground text-xs",
					children: m.expiraEm
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 91,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex gap-1 justify-end",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						size: "sm",
						variant: "ghost",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 95,
							columnNumber: 27
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 94,
						columnNumber: 25
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						size: "sm",
						variant: "ghost",
						className: "text-rose-600",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 98,
							columnNumber: 27
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 97,
						columnNumber: 25
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 93,
					columnNumber: 23
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 92,
					columnNumber: 21
				}, this)
			] }, m.id, true, {
				fileName: _jsxFileName,
				lineNumber: 82,
				columnNumber: 49
			}, this)) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 75,
				columnNumber: 13
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 62,
				columnNumber: 11
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 61,
			columnNumber: 9
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 60,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 12,
		columnNumber: 10
	}, this);
}
//#endregion
export { MemoriaPage as component };
