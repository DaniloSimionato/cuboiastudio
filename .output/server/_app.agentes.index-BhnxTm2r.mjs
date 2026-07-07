import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-DRGNNNW9.mjs";
import { A as Play, Ft as CirclePlay, N as Pause, T as RefreshCw, j as Pencil, k as Plus, x as Search } from "./_libs/lucide-react.mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-Bsft3ipc.mjs";
import { n as filterOperationalAssistants, r as isSmokeAssistant, t as backendAssistantsService } from "./_ssr/backendAssistantsService-Ca0QS27v.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.agentes.index-BhnxTm2r.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.agentes.index.tsx?tsr-split=component";
function AgentesPage() {
	const [query, setQuery] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("active");
	const [company, setCompany] = (0, import_react.useState)(null);
	const [assistants, setAssistants] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [savingId, setSavingId] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const load = async () => {
		setLoading(true);
		setError(null);
		try {
			const [companyResponse, assistantItems] = await Promise.all([currentCompanyService.get(), backendAssistantsService.list()]);
			setCompany(companyResponse.company);
			setAssistants(assistantItems);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Não foi possível carregar os assistentes.");
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	const filtered = (0, import_react.useMemo)(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return filterOperationalAssistants(assistants, { includeInactive: true }).filter((assistant) => {
			const matchesStatus = status === "all" || status === "active" && assistant.status === "ACTIVE" || status === "inactive" && assistant.status === "INACTIVE";
			const matchesQuery = normalizedQuery.length === 0 || assistant.name.toLowerCase().includes(normalizedQuery);
			return matchesStatus && matchesQuery;
		});
	}, [
		assistants,
		query,
		status
	]);
	const hiddenSmokeCount = (0, import_react.useMemo)(() => {
		return assistants.filter(isSmokeAssistant).length;
	}, [assistants]);
	const hasOnlyHiddenSmokeAssistants = (0, import_react.useMemo)(() => {
		return assistants.filter((assistant) => !isSmokeAssistant(assistant)).length;
	}, [assistants]) === 0 && hiddenSmokeCount > 0;
	const handleToggleStatus = async (assistant) => {
		const nextStatus = assistant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
		setSavingId(assistant.id);
		try {
			const updated = await backendAssistantsService.updateStatus(assistant.id, nextStatus);
			setAssistants((items) => items.map((item) => item.id === updated.id ? updated : item));
		} finally {
			setSavingId(null);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Assistentes IA",
			description: company ? `Gerencie os assistentes reais do tenant ${company.name}.` : "Gerencie os assistentes reais do tenant atual.",
			actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
					to: "/agentes/novo",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 70,
						columnNumber: 15
					}, this), " Criar novo Assistente"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 69,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 68,
				columnNumber: 185
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 68,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex flex-wrap gap-2 mb-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "relative flex-1 min-w-[240px]",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 76,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
						placeholder: "Buscar por nome...",
						className: "pl-9",
						value: query,
						onChange: (e) => setQuery(e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 77,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 75,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
					value: status,
					onValueChange: (value) => setStatus(value),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
						className: "w-[180px]",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Status" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 81,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 80,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "active",
							children: "Ativos"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 84,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "inactive",
							children: "Inativos"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 85,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "all",
							children: "Todos"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 86,
							columnNumber: 13
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 83,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 79,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "outline",
					onClick: () => void load(),
					disabled: loading,
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 90,
						columnNumber: 11
					}, this), " Atualizar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 89,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 74,
			columnNumber: 7
		}, this),
		loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando assistentes reais…" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 94,
			columnNumber: 18
		}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
			title: "Não foi possível carregar os assistentes",
			description: error,
			onRetry: () => void load()
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 94,
			columnNumber: 83
		}, this) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
			title: "Nenhum assistente encontrado",
			description: hasOnlyHiddenSmokeAssistants ? "Há apenas artefatos técnicos de smoke test ocultos nesta tela." : "Tente limpar os filtros ou criar um novo assistente.",
			action: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
					to: "/agentes/novo",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 96,
						columnNumber: 17
					}, this), " Criar assistente"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 95,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 94,
				columnNumber: 445
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 94,
			columnNumber: 221
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
			children: filtered.map((assistant) => {
				const isActive = assistant.status === "ACTIVE";
				return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
					className: "hover:shadow-md transition-shadow",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-start justify-between mb-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold",
									children: assistant.name.charAt(0)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 104,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: isActive ? "ativo" : "pausado" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 107,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 103,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
								className: "font-semibold",
								children: assistant.name
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 109,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]",
								children: assistant.description || "Sem descrição cadastrada."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 110,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-2 flex flex-wrap gap-2",
								children: assistant.instructions ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
									variant: "secondary",
									children: "Prompt configurado"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 114,
									columnNumber: 47
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
									variant: "outline",
									children: "Prompt padrão"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 114,
									columnNumber: 103
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 113,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-3 space-y-1.5 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Row, {
										label: "Empresa",
										value: company?.name ?? "Tenant atual"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 118,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Row, {
										label: "Status",
										value: isActive ? "Ativo" : "Inativo"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 119,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Row, {
										label: "Atualizado",
										value: formatDate(assistant.updatedAt)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 120,
										columnNumber: 21
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 117,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex gap-1 mt-4 pt-3 border-t",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										size: "sm",
										variant: "ghost",
										asChild: true,
										title: "Editar",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
											to: "/agentes/novo",
											search: { assistantId: assistant.id },
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 128,
												columnNumber: 25
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 125,
											columnNumber: 23
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 124,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										size: "sm",
										variant: "ghost",
										asChild: true,
										title: "Testar",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
											to: "/testes",
											search: { assistantId: assistant.id },
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 135,
												columnNumber: 25
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 132,
											columnNumber: 23
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 131,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										size: "sm",
										variant: "ghost",
										title: isActive ? "Inativar" : "Ativar",
										onClick: () => void handleToggleStatus(assistant),
										disabled: savingId === assistant.id,
										children: isActive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pause, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 139,
											columnNumber: 35
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Play, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 139,
											columnNumber: 67
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 138,
										columnNumber: 21
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 123,
								columnNumber: 19
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 102,
						columnNumber: 17
					}, this)
				}, assistant.id, false, {
					fileName: _jsxFileName,
					lineNumber: 101,
					columnNumber: 16
				}, this);
			})
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 98,
			columnNumber: 29
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 67,
		columnNumber: 10
	}, this);
}
function Row({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-muted-foreground",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 156,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "font-medium truncate",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 157,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 155,
		columnNumber: 10
	}, this);
}
function formatDate(value) {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "medium",
		timeStyle: "short"
	}).format(parsed);
}
//#endregion
export { AgentesPage as component };
