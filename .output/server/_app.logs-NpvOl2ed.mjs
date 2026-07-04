import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { n as apiFetch, t as ApiError } from "./_ssr/apiClient-Bei-u2-_.mjs";
import { et as Eye, w as RefreshCw } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
import { a as formatConversationSourceLabel, c as DialogContent, d as DialogHeader, f as DialogTitle, l as DialogDescription, n as formatConversationChannelLabel, p as DialogTrigger, s as Dialog } from "./_ssr/conversations-B8gZYb2W.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.logs-NpvOl2ed.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
/** logsService — logs reais de runtime de IA. Segredos nunca saem do backend. */
var logsService = {
	async list(query = {}) {
		const params = new URLSearchParams();
		if (query.assistantId) params.set("assistantId", query.assistantId);
		if (query.conversationId) params.set("conversationId", query.conversationId);
		if (query.mode) params.set("mode", query.mode);
		if (query.status) params.set("status", query.status);
		if (typeof query.fallback === "boolean") params.set("fallback", String(query.fallback));
		if (query.limit) params.set("limit", String(query.limit));
		return (await apiFetch(`/logs/ai${params.toString() ? `?${params.toString()}` : ""}`)).items;
	},
	async get(id) {
		return apiFetch(`/logs/ai/${id}`);
	}
};
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.logs.tsx?tsr-split=component";
function LogsPage() {
	const [items, setItems] = (0, import_react.useState)([]);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [mode, setMode] = (0, import_react.useState)("all");
	const [status, setStatus] = (0, import_react.useState)("all");
	const [fallback, setFallback] = (0, import_react.useState)("all");
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [detailLoading, setDetailLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const loadLogs = (0, import_react.useCallback)(async () => {
		setLoading(true);
		setError(null);
		try {
			setItems(await logsService.list({
				...mode !== "all" ? { mode } : {},
				...status !== "all" ? { status } : {},
				...fallback !== "all" ? { fallback: fallback === "true" } : {},
				limit: 100
			}));
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível carregar os logs.");
		} finally {
			setLoading(false);
		}
	}, [
		fallback,
		mode,
		status
	]);
	async function loadDetail(id) {
		setDetailLoading(true);
		setError(null);
		try {
			setSelected(await logsService.get(id));
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível carregar o detalhe.");
		} finally {
			setDetailLoading(false);
		}
	}
	(0, import_react.useEffect)(() => {
		loadLogs();
	}, [loadLogs]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Logs de IA",
			description: "Auditoria segura das execuções do runtime, sem prompt completo ou segredos."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 59,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-4",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-4 grid grid-cols-1 md:grid-cols-4 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: mode,
						onValueChange: setMode,
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Modo" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 65,
							columnNumber: 15
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 64,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "all",
								children: "Todos os modos"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 68,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "ai-runtime",
								children: "IA real"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 69,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "deterministic-runtime",
								children: "Determinístico"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 70,
								columnNumber: 15
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 67,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 63,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: status,
						onValueChange: setStatus,
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Status" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 76,
							columnNumber: 15
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 75,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "all",
								children: "Todos os status"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 79,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "success",
								children: "Sucesso"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 80,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "fallback",
								children: "Fallback"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 81,
								columnNumber: 15
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 78,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 74,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: fallback,
						onValueChange: setFallback,
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Fallback" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 87,
							columnNumber: 15
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 86,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "all",
								children: "Com ou sem fallback"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 90,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "false",
								children: "Sem fallback"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 91,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "true",
								children: "Com fallback"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 92,
								columnNumber: 15
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 89,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 85,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						type: "button",
						variant: "outline",
						onClick: () => void loadLogs(),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 97,
							columnNumber: 13
						}, this), " Atualizar"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 96,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 62,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 61,
			columnNumber: 7
		}, this),
		error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-4 border-destructive/40",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-4 text-sm text-destructive",
				children: error
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 103,
				columnNumber: 11
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 102,
			columnNumber: 16
		}, this) : null,
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-0",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Data" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 111,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Assistant" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 112,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Modo" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 113,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Origem" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 114,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 115,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Provider" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 116,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Modelo" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 117,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Duração" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 118,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Fallback" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 119,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Saída" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 120,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 121,
					columnNumber: 17
				}, this)
			] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 110,
				columnNumber: 15
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 109,
				columnNumber: 13
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				colSpan: 11,
				className: "text-sm text-muted-foreground",
				children: "Carregando logs..."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 126,
				columnNumber: 19
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 125,
				columnNumber: 26
			}, this) : items.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				colSpan: 11,
				className: "text-sm text-muted-foreground",
				children: "Nenhum log de runtime encontrado."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 130,
				columnNumber: 19
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 129,
				columnNumber: 52
			}, this) : items.map((item) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "text-muted-foreground text-xs",
					children: formatDate(item.createdAt)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 134,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "font-medium",
					children: item.assistantName ?? item.assistantId ?? "Assistente removido"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 137,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: formatMode(item.mode) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 140,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "text-xs",
					children: formatOriginAndChannel(item.conversationSource, item.conversationChannelType)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 141,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusPill, { status: item.status }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 145,
					columnNumber: 23
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 144,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "text-xs",
					children: item.provider ?? "—"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 147,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "text-xs",
					children: item.model ?? "—"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 148,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "text-xs text-muted-foreground",
					children: item.durationMs !== null ? `${item.durationMs} ms` : "—"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 149,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "text-xs",
					children: item.fallback ? item.fallbackReason ?? "sim" : "não"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 152,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					className: "text-xs",
					children: item.outcome ?? "—"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 155,
					columnNumber: 21
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => void loadDetail(item.id),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Eye, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 160,
							columnNumber: 29
						}, this), " Ver"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 159,
						columnNumber: 27
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 158,
					columnNumber: 25
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
					className: "max-w-3xl max-h-[85vh] overflow-y-auto",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: "Detalhe do log" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 165,
						columnNumber: 29
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, { children: "Metadados seguros da execução. Prompt completo e segredos não são armazenados." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 166,
						columnNumber: 29
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 164,
						columnNumber: 27
					}, this), detailLoading && selected?.id !== item.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground",
						children: "Carregando detalhe..."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 171,
						columnNumber: 72
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LogDetail, { log: selected?.id === item.id ? selected : item }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 171,
						columnNumber: 145
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 163,
					columnNumber: 25
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 157,
					columnNumber: 23
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 156,
					columnNumber: 21
				}, this)
			] }, item.id, true, {
				fileName: _jsxFileName,
				lineNumber: 133,
				columnNumber: 49
			}, this)) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 124,
				columnNumber: 13
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 108,
				columnNumber: 11
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 107,
			columnNumber: 9
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 106,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 58,
		columnNumber: 10
	}, this);
}
function LogDetail({ log }) {
	const detail = "providerErrorMessage" in log ? log : null;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid md:grid-cols-2 gap-3 mt-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Box, {
				title: "Runtime",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Modo",
						value: formatMode(log.mode)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 190,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Status",
						value: log.status
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 191,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Saída",
						value: log.outcome ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 192,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Fallback",
						value: log.fallback ? log.fallbackReason ?? "sim" : "não"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 193,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 189,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Box, {
				title: "Provider",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Provider",
						value: log.provider ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 197,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Modelo",
						value: log.model ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 198,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Origem",
						value: log.configurationSource ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 199,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Status do provider",
						value: String(log.providerStatus ?? "—")
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 200,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 196,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Box, {
				title: "Contexto usado",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Origem",
						value: formatOriginAndChannel(log.conversationSource, log.conversationChannelType)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 204,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Fontes",
						value: String(log.knowledgeCount ?? 0)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 205,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Histórico",
						value: String(log.historyMessagesUsed ?? 0)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 206,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Limite histórico",
						value: String(log.historyLimit ?? "—")
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 207,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Mensagem inicial",
						value: log.initialMessageIncluded ? "sim" : "não"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 208,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Instruções/persona",
						value: log.instructionsIncluded ? "sim" : "não"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 209,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 203,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Box, {
				title: "Rastreio",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Log ID",
						value: log.id
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 213,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Conversation ID",
						value: log.conversationId ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 214,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "User Message ID",
						value: detail?.userMessageId ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 215,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Assistant Message ID",
						value: detail?.assistantMessageId ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 216,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 212,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Box, {
				title: "Erro sanitizado",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Tipo",
						value: detail?.providerErrorType ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 220,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Código",
						value: log.providerErrorCode ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 221,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Description, {
						label: "Mensagem",
						value: detail?.providerErrorMessage ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 222,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 219,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 188,
		columnNumber: 10
	}, this);
}
function StatusPill({ status }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
		className: `inline-flex rounded-full px-2 py-1 text-xs font-medium ${status === "success" ? "bg-emerald-500/10 text-emerald-700" : status === "fallback" ? "bg-amber-500/10 text-amber-700" : "bg-muted text-muted-foreground"}`,
		children: status
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 232,
		columnNumber: 10
	}, this);
}
function Box({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
		className: "pb-2",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
			className: "text-xs",
			children: title
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 245,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 244,
		columnNumber: 7
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "space-y-1 text-xs",
		children
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 247,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 243,
		columnNumber: 10
	}, this);
}
function Description({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex items-start justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-muted-foreground",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 258,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-right font-medium break-all",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 259,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 257,
		columnNumber: 10
	}, this);
}
function formatMode(mode) {
	if (mode === "ai-runtime") return "IA real";
	if (mode === "deterministic-runtime") return "Determinístico";
	return mode;
}
function formatDate(value) {
	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short"
	}).format(new Date(value));
}
function formatOriginAndChannel(source, channelType) {
	const sourceLabel = formatConversationSourceLabel(source);
	const channelLabel = formatConversationChannelLabel(channelType);
	return channelLabel ? `${sourceLabel} · ${channelLabel}` : sourceLabel;
}
//#endregion
export { LogsPage as component };
