import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { B as MessageSquare, St as Bot, it as DollarSign, jt as TriangleAlert, l as TrendingUp, s as UserCheck } from "./_libs/lucide-react.mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as backendAssistantsService } from "./_ssr/backendAssistantsService-C9NI7_6k.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
import { i as logs, t as agenteNome } from "./_ssr/mock-BZxrV1tF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.dashboard-xXmHgl-1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.dashboard.tsx?tsr-split=component";
function Dashboard() {
	const [activeAssistantsCount, setActiveAssistantsCount] = (0, import_react.useState)(0);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		backendAssistantsService.list().then((items) => {
			if (!cancelled) {
				const activeCount = items.filter((a) => a.status === "ACTIVE").length;
				setActiveAssistantsCount(activeCount);
			}
		}).catch(() => {}).finally(() => {
			if (!cancelled) setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	const kpis = [
		{
			label: "Assistentes IA ativos",
			value: loading ? "..." : String(activeAssistantsCount),
			icon: Bot,
			delta: "Ativos no momento"
		},
		{
			label: "Conversas atendidas pela IA",
			value: "0",
			icon: MessageSquare,
			delta: "0% de taxa de acerto"
		},
		{
			label: "Transferências para humano",
			value: "0",
			icon: UserCheck,
			delta: "0%"
		},
		{
			label: "Taxa de resolução",
			value: "0%",
			icon: TrendingUp,
			delta: "0%"
		},
		{
			label: "Erros em ferramentas/webhooks",
			value: "0",
			icon: TriangleAlert,
			delta: "últimos 7d"
		},
		{
			label: "Custo estimado de IA",
			value: "R$ 0,00",
			icon: DollarSign,
			delta: "este mês"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Dashboard",
			description: "Visão geral dos Assistentes IA, atendimentos e integrações do módulo Cubo AI."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 60,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3",
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
								lineNumber: 68,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "h-9 w-9 rounded-lg bg-primary/10 grid place-items-center",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4 text-primary" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 72,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 71,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 67,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-2xl font-bold",
							children: k.value
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 75,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground mt-1",
							children: k.delta
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 76,
							columnNumber: 17
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 66,
					columnNumber: 15
				}, this) }, k.label, false, {
					fileName: _jsxFileName,
					lineNumber: 65,
					columnNumber: 16
				}, this);
			})
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 62,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
				className: "lg:col-span-2",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-base",
					children: "Atendimentos por dia"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 85,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 84,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-48 flex items-end gap-2 border border-dashed rounded-lg justify-center items-center text-xs text-muted-foreground",
					children: "Nenhum atendimento registrado nos últimos 7 dias."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 88,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 87,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 83,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base",
				children: "Principais intenções"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 96,
				columnNumber: 13
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 95,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-3 py-6 flex flex-col items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg h-48",
				children: "Nenhuma intenção identificada."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 98,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 94,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 82,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
			className: "text-base",
			children: "Últimas conversas com IA"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 106,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 105,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Cliente final" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 112,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Canal" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 113,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Assistente IA" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 114,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 115,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Última mensagem" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 116,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Data" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 117,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 118,
				columnNumber: 17
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 111,
			columnNumber: 15
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 110,
			columnNumber: 13
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: logs.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
			colSpan: 7,
			className: "text-center py-12 text-muted-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MessageSquare, { className: "h-8 w-8 mx-auto mb-2 opacity-50 text-primary animate-pulse" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 124,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "font-semibold text-sm",
					children: "Nenhuma conversa registrada"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 125,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-xs",
					children: "As interações dos assistentes aparecerão aqui em tempo real."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 126,
					columnNumber: 21
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 123,
			columnNumber: 19
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 122,
			columnNumber: 36
		}, this) : logs.slice(0, 6).map((l) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "font-medium",
				children: l.clienteFinal
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 129,
				columnNumber: 21
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: l.canal }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 130,
				columnNumber: 21
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: agenteNome(l.agenteId) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 131,
				columnNumber: 21
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: l.status }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 133,
				columnNumber: 23
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 132,
				columnNumber: 21
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "max-w-[240px] truncate text-muted-foreground",
				children: l.ultimaMensagem
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 135,
				columnNumber: 21
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "text-muted-foreground",
				children: l.data
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 138,
				columnNumber: 21
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
					lineNumber: 141,
					columnNumber: 25
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 140,
				columnNumber: 23
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 139,
				columnNumber: 21
			}, this)
		] }, l.id, true, {
			fileName: _jsxFileName,
			lineNumber: 128,
			columnNumber: 57
		}, this)) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 121,
			columnNumber: 13
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 109,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 108,
			columnNumber: 9
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 104,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 59,
		columnNumber: 10
	}, this);
}
//#endregion
export { Dashboard as component };
