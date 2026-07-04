import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { I as MessageSquare, Ot as TriangleAlert, bt as Bot, c as TrendingUp, nt as DollarSign, o as UserCheck } from "./_libs/lucide-react.mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
import { s as logs, t as agenteNome } from "./_ssr/mock-CnsSa_CP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.index-m-WSWSER.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.index.tsx?tsr-split=component";
var kpis = [
	{
		label: "Assistentes IA ativos",
		value: "4",
		icon: Bot,
		delta: "+1 esta semana"
	},
	{
		label: "Conversas atendidas pela IA",
		value: "1.284",
		icon: MessageSquare,
		delta: "+12%"
	},
	{
		label: "Transferências para humano",
		value: "187",
		icon: UserCheck,
		delta: "14,5%"
	},
	{
		label: "Taxa de resolução",
		value: "82%",
		icon: TrendingUp,
		delta: "+3pp"
	},
	{
		label: "Erros em ferramentas/webhooks",
		value: "9",
		icon: TriangleAlert,
		delta: "últimos 7d"
	},
	{
		label: "Custo estimado de IA",
		value: "R$ 412,80",
		icon: DollarSign,
		delta: "este mês"
	}
];
function Dashboard() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Dashboard",
			description: "Visão geral dos Assistentes IA, atendimentos e integrações do módulo Cubo AI."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 42,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6",
			children: kpis.map((k) => {
				const Icon = k.icon;
				return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center justify-between mb-3",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-xs font-medium text-muted-foreground uppercase tracking-wide",
								children: k.label
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 50,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "h-9 w-9 rounded-lg bg-primary/10 grid place-items-center",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4 text-primary" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 54,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 53,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 49,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-2xl font-bold",
							children: k.value
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 57,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground mt-1",
							children: k.delta
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 58,
							columnNumber: 17
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 48,
					columnNumber: 15
				}, this) }, k.label, false, {
					fileName: _jsxFileName,
					lineNumber: 47,
					columnNumber: 16
				}, this);
			})
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 44,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
				className: "lg:col-span-2",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-base",
					children: "Atendimentos por dia"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 67,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 66,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-48 flex items-end gap-2",
					children: [
						40,
						65,
						50,
						80,
						70,
						95,
						60
					].map((v, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex-1 bg-primary/20 rounded-t-md relative",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "absolute inset-x-0 bottom-0 bg-primary rounded-t-md",
							style: { height: `${v}%` }
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 72,
							columnNumber: 19
						}, this)
					}, i, false, {
						fileName: _jsxFileName,
						lineNumber: 71,
						columnNumber: 59
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 70,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-xs text-muted-foreground mt-2",
					children: [
						"seg",
						"ter",
						"qua",
						"qui",
						"sex",
						"sab",
						"dom"
					].map((d) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: d }, d, false, {
						fileName: _jsxFileName,
						lineNumber: 78,
						columnNumber: 75
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 77,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 69,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 65,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base",
				children: "Principais intenções"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 85,
				columnNumber: 13
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 84,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-3",
				children: [
					{
						l: "dúvida_produto",
						v: 38
					},
					{
						l: "2via_boleto",
						v: 24
					},
					{
						l: "agendar_consulta",
						v: 18
					},
					{
						l: "status_os",
						v: 12
					},
					{
						l: "transferir",
						v: 8
					}
				].map((i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-xs mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: i.l }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 105,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "text-muted-foreground",
						children: [i.v, "%"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 106,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 104,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-2 bg-muted rounded-full",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-2 bg-primary rounded-full",
						style: { width: `${i.v * 2}%` }
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 109,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 108,
					columnNumber: 17
				}, this)] }, i.l, true, {
					fileName: _jsxFileName,
					lineNumber: 103,
					columnNumber: 23
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 87,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 83,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 64,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
			className: "text-base",
			children: "Últimas conversas com IA"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 120,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 119,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Cliente final" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 126,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Canal" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 127,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Assistente IA" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 128,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 129,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Última mensagem" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 130,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Data" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 131,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 132,
				columnNumber: 17
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 125,
			columnNumber: 15
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 124,
			columnNumber: 13
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: logs.slice(0, 6).map((l) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "font-medium",
				children: l.clienteFinal
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 137,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: l.canal }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 138,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: agenteNome(l.agenteId) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 139,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: l.status }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 141,
				columnNumber: 21
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 140,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "max-w-[240px] truncate text-muted-foreground",
				children: l.ultimaMensagem
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 143,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "text-muted-foreground",
				children: l.data
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 146,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "ghost",
				size: "sm",
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
					to: "/logs",
					children: "Ver log"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 149,
					columnNumber: 23
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 148,
				columnNumber: 21
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 147,
				columnNumber: 19
			}, this)
		] }, l.id, true, {
			fileName: _jsxFileName,
			lineNumber: 136,
			columnNumber: 42
		}, this)) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 135,
			columnNumber: 13
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 123,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 122,
			columnNumber: 9
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 118,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 41,
		columnNumber: 10
	}, this);
}
//#endregion
export { Dashboard as component };
