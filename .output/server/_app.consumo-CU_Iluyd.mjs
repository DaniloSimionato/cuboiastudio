import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { At as Sparkles, Dt as Activity, R as MessageCircle, at as Coins, f as Timer, l as TrendingDown, o as UserCheck, rt as DollarSign } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.consumo-CU_Iluyd.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.consumo.tsx?tsr-split=component";
var kpis = [
	{
		label: "Tokens utilizados (mês)",
		value: "0",
		icon: Coins,
		delta: "vs R$ 0,00 mês anterior"
	},
	{
		label: "Requests à IA",
		value: "0",
		icon: Activity,
		delta: "últimos 30d"
	},
	{
		label: "Custo estimado",
		value: "R$ 0,00",
		icon: DollarSign,
		delta: "vs R$ 0,00 mês anterior"
	},
	{
		label: "Tempo médio de resposta",
		value: "0,00 s",
		icon: Timer,
		delta: "0 s"
	},
	{
		label: "Conversas resolvidas pela IA",
		value: "0",
		icon: MessageCircle,
		delta: "0% das conversas"
	},
	{
		label: "Transferências para humano",
		value: "0",
		icon: UserCheck,
		delta: "0%"
	}
];
var custoDia = [];
var porAssistente = [];
var porCanal = [];
var porModelo = [];
function ConsumoPage() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Consumo IA",
			description: "Acompanhe utilização, custos e desempenho dos Assistentes IA do Cubo.Chat."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 51,
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
								lineNumber: 59,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "h-9 w-9 rounded-lg bg-primary/10 grid place-items-center",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4 text-primary" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 63,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 62,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 58,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-2xl font-bold",
							children: k.value
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 66,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground mt-1",
							children: k.delta
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 67,
							columnNumber: 17
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 57,
					columnNumber: 15
				}, this) }, k.label, false, {
					fileName: _jsxFileName,
					lineNumber: 56,
					columnNumber: 16
				}, this);
			})
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 53,
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
							lineNumber: 77,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 76,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "text-sm font-semibold",
						children: "Economia gerada pela IA"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 80,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-xs text-muted-foreground mt-0.5",
						children: "Estimativa baseada em conversas resolvidas sem intervenção humana."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 81,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 79,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 75,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid grid-cols-3 gap-6 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground",
							children: "Conversas resolvidas"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 88,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-lg font-bold",
							children: "0"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 89,
							columnNumber: 15
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 87,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground",
							children: "Tempo economizado"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 92,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-lg font-bold",
							children: "0h"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 93,
							columnNumber: 15
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 91,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground",
							children: "Economia estimada"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 96,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-lg font-bold text-emerald-600",
							children: "R$ 0,00"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 97,
							columnNumber: 15
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 95,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 86,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 74,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 73,
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
						lineNumber: 107,
						columnNumber: 15
					}, this), " Custo por dia (últimos 14 dias)"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 106,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 105,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: custoDia.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-48 grid place-items-center text-xs text-muted-foreground border border-dashed rounded-lg",
					children: "Nenhum dado de custo disponível para o período."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 111,
					columnNumber: 38
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-48 flex items-end gap-1.5",
					children: custoDia.map((v, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex-1 bg-primary/15 rounded-t-md relative",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "absolute inset-x-0 bottom-0 bg-primary rounded-t-md",
							style: { height: `${v}%` }
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 116,
							columnNumber: 23
						}, this)
					}, i, false, {
						fileName: _jsxFileName,
						lineNumber: 115,
						columnNumber: 43
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 114,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-[10px] text-muted-foreground mt-2",
					children: custoDia.map((_, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: ["d", i + 1] }, i, true, {
						fileName: _jsxFileName,
						lineNumber: 122,
						columnNumber: 43
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 121,
					columnNumber: 17
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 113,
					columnNumber: 24
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 110,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 104,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base",
				children: "Custo por Assistente"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 130,
				columnNumber: 13
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 129,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-3",
				children: porAssistente.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-xs text-muted-foreground py-4 text-center",
					children: "Nenhum custo registrado."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 133,
					columnNumber: 43
				}, this) : porAssistente.map((i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-xs mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "truncate",
						children: i.l
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 135,
						columnNumber: 21
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "text-muted-foreground",
						children: i.c
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 136,
						columnNumber: 21
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 134,
					columnNumber: 19
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-2 bg-muted rounded-full",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-2 bg-primary rounded-full",
						style: { width: `${i.v * 2}%` }
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 139,
						columnNumber: 21
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 138,
					columnNumber: 19
				}, this)] }, i.l, true, {
					fileName: _jsxFileName,
					lineNumber: 133,
					columnNumber: 159
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 132,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 128,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 103,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-1 lg:grid-cols-2 gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base",
				children: "Custo por Canal"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 151,
				columnNumber: 13
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 150,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-3",
				children: porCanal.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-xs text-muted-foreground py-4 text-center",
					children: "Nenhum custo registrado."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 154,
					columnNumber: 38
				}, this) : porCanal.map((i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-xs mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: i.l }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 156,
						columnNumber: 21
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "text-muted-foreground",
						children: [i.v, "%"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 157,
						columnNumber: 21
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 155,
					columnNumber: 19
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-2 bg-muted rounded-full",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-2 bg-primary rounded-full",
						style: { width: `${i.v}%` }
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 160,
						columnNumber: 21
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 159,
					columnNumber: 19
				}, this)] }, i.l, true, {
					fileName: _jsxFileName,
					lineNumber: 154,
					columnNumber: 149
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 153,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 149,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base",
				children: "Custo por Modelo"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 170,
				columnNumber: 13
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 169,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-3",
				children: porModelo.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-xs text-muted-foreground py-4 text-center",
					children: "Nenhum custo registrado."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 173,
					columnNumber: 39
				}, this) : porModelo.map((i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between text-xs mb-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: i.l }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 175,
						columnNumber: 21
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "text-muted-foreground",
						children: [i.v, "%"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 176,
						columnNumber: 21
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 174,
					columnNumber: 19
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-2 bg-muted rounded-full",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-2 bg-primary rounded-full",
						style: { width: `${i.v}%` }
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 179,
						columnNumber: 21
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 178,
					columnNumber: 19
				}, this)] }, i.l, true, {
					fileName: _jsxFileName,
					lineNumber: 173,
					columnNumber: 151
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 172,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 168,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 148,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 50,
		columnNumber: 10
	}, this);
}
//#endregion
export { ConsumoPage as component };
