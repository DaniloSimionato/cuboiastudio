import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { Ct as Activity, Et as Sparkles, L as MessageCircle, d as Timer, l as TrendingDown, o as UserCheck, rt as Coins, tt as DollarSign } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.consumo-B_oggRw8.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.consumo.tsx?tsr-split=component";
var kpis = [
	{
		label: "Tokens utilizados (mês)",
		value: "3.482.190",
		icon: Coins,
		delta: "+8,2%"
	},
	{
		label: "Requests à IA",
		value: "12.487",
		icon: Activity,
		delta: "últimos 30d"
	},
	{
		label: "Custo estimado",
		value: "R$ 1.284,50",
		icon: DollarSign,
		delta: "vs R$ 1.190 mês anterior"
	},
	{
		label: "Tempo médio de resposta",
		value: "1,82 s",
		icon: Timer,
		delta: "-0,12 s"
	},
	{
		label: "Conversas resolvidas pela IA",
		value: "1.084",
		icon: MessageCircle,
		delta: "82% das conversas"
	},
	{
		label: "Transferências para humano",
		value: "187",
		icon: UserCheck,
		delta: "14,5%"
	}
];
var custoDia = [
	22,
	38,
	31,
	47,
	52,
	41,
	60,
	55,
	49,
	63,
	70,
	58,
	66,
	72
];
var porAssistente = [
	{
		l: "Atendente Comercial",
		v: 38,
		c: "R$ 488,12"
	},
	{
		l: "Suporte Técnico",
		v: 27,
		c: "R$ 346,82"
	},
	{
		l: "Agendamento",
		v: 18,
		c: "R$ 231,21"
	},
	{
		l: "Financeiro e Boletos",
		v: 11,
		c: "R$ 141,30"
	},
	{
		l: "Ordem de Serviço",
		v: 6,
		c: "R$ 77,05"
	}
];
var porCanal = [
	{
		l: "WhatsApp Oficial",
		v: 62
	},
	{
		l: "Instagram",
		v: 18
	},
	{
		l: "Webchat",
		v: 12
	},
	{
		l: "Facebook",
		v: 5
	},
	{
		l: "Telegram",
		v: 3
	}
];
var porModelo = [
	{
		l: "gpt-4o-mini",
		v: 48
	},
	{
		l: "claude-3-5-sonnet",
		v: 27
	},
	{
		l: "gemini-1.5-pro",
		v: 17
	},
	{
		l: "gpt-4o",
		v: 8
	}
];
function ConsumoPage() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Consumo IA",
			description: "Acompanhe utilização, custos e desempenho dos Assistentes IA do Cubo.Chat."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 88,
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
								lineNumber: 96,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "h-9 w-9 rounded-lg bg-primary/10 grid place-items-center",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4 text-primary" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 100,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 99,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 95,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-2xl font-bold",
							children: k.value
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 103,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground mt-1",
							children: k.delta
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 104,
							columnNumber: 17
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 94,
					columnNumber: 15
				}, this) }, k.label, false, {
					fileName: _jsxFileName,
					lineNumber: 93,
					columnNumber: 16
				}, this);
			})
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 90,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-6 border-emerald-500/30 bg-emerald-500/5",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-600 grid place-items-center",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TrendingDown, { className: "h-5 w-5" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 114,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 113,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "text-sm font-semibold",
						children: "Economia gerada pela IA"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 117,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-xs text-muted-foreground mt-0.5",
						children: "Estimativa baseada em conversas resolvidas sem intervenção humana."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 118,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 116,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 112,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid grid-cols-3 gap-6 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground",
							children: "Conversas resolvidas"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 125,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-lg font-bold",
							children: "1.084"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 126,
							columnNumber: 15
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 124,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground",
							children: "Tempo economizado"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 129,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-lg font-bold",
							children: "182h"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 130,
							columnNumber: 15
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 128,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground",
							children: "Economia estimada"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 133,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-lg font-bold text-emerald-600",
							children: "R$ 9.480"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 134,
							columnNumber: 15
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 132,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 123,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 111,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 110,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
				className: "lg:col-span-2",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-base flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4 w-4 text-primary" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 144,
						columnNumber: 15
					}, this), " Custo por dia (últimos 14 dias)"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 143,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 142,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-48 flex items-end gap-1.5",
					children: custoDia.map((v, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex-1 bg-primary/15 rounded-t-md relative",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "absolute inset-x-0 bottom-0 bg-primary rounded-t-md",
							style: { height: `${v}%` }
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 150,
							columnNumber: 19
						}, this)
					}, i, false, {
						fileName: _jsxFileName,
						lineNumber: 149,
						columnNumber: 39
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 148,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-[10px] text-muted-foreground mt-2",
					children: custoDia.map((_, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: ["d", i + 1] }, i, true, {
						fileName: _jsxFileName,
						lineNumber: 156,
						columnNumber: 39
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 155,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 147,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 141,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base",
				children: "Custo por Assistente"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 163,
				columnNumber: 13
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 162,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-3",
				children: porAssistente.map((i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-xs mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "truncate",
						children: i.l
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 168,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "text-muted-foreground",
						children: i.c
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 169,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 167,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-2 bg-muted rounded-full",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-2 bg-primary rounded-full",
						style: { width: `${i.v * 2}%` }
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 172,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 171,
					columnNumber: 17
				}, this)] }, i.l, true, {
					fileName: _jsxFileName,
					lineNumber: 166,
					columnNumber: 37
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 165,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 161,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 140,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-1 lg:grid-cols-2 gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base",
				children: "Custo por Canal"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 184,
				columnNumber: 13
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 183,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-3",
				children: porCanal.map((i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-xs mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: i.l }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 189,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "text-muted-foreground",
						children: [i.v, "%"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 190,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 188,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-2 bg-muted rounded-full",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-2 bg-primary rounded-full",
						style: { width: `${i.v}%` }
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 193,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 192,
					columnNumber: 17
				}, this)] }, i.l, true, {
					fileName: _jsxFileName,
					lineNumber: 187,
					columnNumber: 32
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 186,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 182,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base",
				children: "Custo por Modelo"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 203,
				columnNumber: 13
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 202,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-3",
				children: porModelo.map((i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-xs mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: i.l }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 208,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "text-muted-foreground",
						children: [i.v, "%"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 209,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 207,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-2 bg-muted rounded-full",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-2 bg-primary rounded-full",
						style: { width: `${i.v}%` }
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 212,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 211,
					columnNumber: 17
				}, this)] }, i.l, true, {
					fileName: _jsxFileName,
					lineNumber: 206,
					columnNumber: 33
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 205,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 201,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 181,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 87,
		columnNumber: 10
	}, this);
}
//#endregion
export { ConsumoPage as component };
