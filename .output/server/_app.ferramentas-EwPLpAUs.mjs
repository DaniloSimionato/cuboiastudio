import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { M as Plus, P as Pencil, at as Copy, f as Trash2, n as Wrench, zt as CirclePlay } from "./_libs/lucide-react.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { t as toolsService } from "./_ssr/toolsService-DFOW9sH6.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
import { n as SecurityNotice, t as MaskedSecretInput } from "./_ssr/SecurityNotice-B3WDgNBX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.ferramentas-EwPLpAUs.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var TOOLS_EMPTY_STATE = {
	title: "Nenhuma ferramenta configurada.",
	description: "Adicione integrações, ações ou funções para ampliar as capacidades da IA."
};
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.ferramentas.tsx?tsr-split=component";
var DEFAULT_DRAFT = {
	nome: "",
	descricao: "",
	tipo: "API REST",
	metodo: "GET",
	url: "",
	headersJson: "{\"Content-Type\":\"application/json\"}",
	bodyJson: "",
	queryParams: "",
	timeoutMs: 5e3,
	authType: "none",
	token: "",
	inputFields: "",
	outputFields: "",
	responseExample: "",
	whenUse: "",
	whenNotUse: "",
	requireConfirmation: true
};
function createDraft(tool) {
	if (!tool) return { ...DEFAULT_DRAFT };
	return {
		...DEFAULT_DRAFT,
		nome: tool.nome,
		descricao: `Ferramenta demo para ${tool.nome.toLowerCase()}`,
		tipo: tool.tipo,
		metodo: tool.metodo,
		url: tool.url,
		token: tool.hasStoredSecret ? "●●●●●●" : "",
		inputFields: "id (string, obrigatório)",
		outputFields: "status, prazo, tecnico",
		responseExample: "{ \"status\": \"em andamento\", \"prazo\": \"2026-07-01\" }",
		whenUse: "Quando o cliente solicitar uma integração simulada",
		whenNotUse: "Quando a ação não fizer parte do fluxo demonstrativo"
	};
}
function buildToolFromDraft(id, draft, previous) {
	return {
		id,
		nome: draft.nome.trim() || "Nova ferramenta",
		clienteId: previous?.clienteId ?? "current-company",
		tipo: draft.tipo,
		metodo: draft.metodo,
		url: draft.url.trim() || "https://exemplo.local/tool",
		status: previous?.status ?? "pausado",
		ultimoTeste: previous?.ultimoTeste ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
		hasStoredSecret: draft.token.trim().length > 0 || previous?.hasStoredSecret
	};
}
function FerramentasPage() {
	const [tools, setTools] = (0, import_react.useState)([]);
	const [selectedToolId, setSelectedToolId] = (0, import_react.useState)("");
	const [draft, setDraft] = (0, import_react.useState)(() => createDraft());
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [editorOpen, setEditorOpen] = (0, import_react.useState)(false);
	const [testFeedback, setTestFeedback] = (0, import_react.useState)("Modo demonstrativo: ferramentas ainda não estão conectadas ao backend.");
	const selectedTool = (0, import_react.useMemo)(() => tools.find((tool) => tool.id === selectedToolId) ?? null, [selectedToolId, tools]);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		toolsService.list().then((items) => {
			if (!cancelled) setTools(items);
		}).catch(() => {
			if (!cancelled) {
				setTools([]);
				toast.error("Não foi possível carregar as ferramentas.");
			}
		}).finally(() => {
			if (!cancelled) setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		setDraft(createDraft(selectedTool ?? void 0));
	}, [selectedToolId, selectedTool]);
	const updateDraft = (key, value) => {
		setDraft((current) => ({
			...current,
			[key]: value
		}));
	};
	const startNewTool = () => {
		setSelectedToolId("");
		setDraft({ ...DEFAULT_DRAFT });
		setEditorOpen(true);
		setTestFeedback("Novo rascunho iniciado em modo demonstrativo.");
		toast.info("Nova ferramenta em modo demonstrativo");
	};
	const saveTool = () => {
		const isEditing = Boolean(selectedToolId && selectedTool);
		const nextId = isEditing ? selectedToolId : `f-local-${Date.now()}`;
		const nextTool = buildToolFromDraft(nextId, draft, selectedTool ?? void 0);
		setTools((current) => isEditing ? current.map((tool) => tool.id === nextId ? nextTool : tool) : [nextTool, ...current]);
		setSelectedToolId(nextId);
		setEditorOpen(true);
		toast.success(isEditing ? "Ferramenta atualizada localmente" : "Ferramenta criada localmente");
	};
	const duplicateTool = (tool) => {
		const duplicated = {
			...tool,
			id: `f-local-${Date.now()}`,
			nome: `${tool.nome} (cópia)`,
			ultimoTeste: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
		};
		setTools((current) => [duplicated, ...current]);
		setSelectedToolId(duplicated.id);
		setEditorOpen(true);
		toast.success("Ferramenta duplicada no modo demonstrativo");
	};
	const removeTool = (toolId) => {
		setTools((current) => current.filter((tool) => tool.id !== toolId));
		if (selectedToolId === toolId) setEditorOpen(false);
		setSelectedToolId((current) => {
			return current === toolId ? "" : current;
		});
		toast.info("Ferramenta removida do estado local");
	};
	const testTool = (toolName) => {
		setTestFeedback(`Teste simulado executado para ${toolName?.trim() || draft.nome.trim() || "Nova ferramenta"} em modo demonstrativo.`);
		toast.info("Teste demonstrativo concluído");
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Ferramentas / Webhooks",
			description: "Configure ações e integrações que seus agentes podem executar.",
			actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				onClick: startNewTool,
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 169,
					columnNumber: 13
				}, this), " Nova ferramenta"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 168,
				columnNumber: 136
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 168,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-6 border-dashed",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-4 text-sm text-muted-foreground",
				children: "Modo demonstrativo: ferramentas ainda não estão conectadas ao backend. Você pode criar, editar, duplicar e excluir itens apenas no estado local desta tela."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 173,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 172,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-6",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Nome" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 184,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Tipo" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 185,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Método" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 186,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "URL" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 187,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 188,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Último teste" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 189,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 190,
						columnNumber: 17
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 183,
					columnNumber: 15
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 182,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					colSpan: 7,
					className: "py-12 text-center text-muted-foreground",
					children: "Carregando ferramentas..."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 195,
					columnNumber: 19
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 194,
					columnNumber: 26
				}, this) : tools.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					colSpan: 7,
					className: "py-14 text-center text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Wrench, { className: "mx-auto mb-3 h-8 w-8 text-primary/60" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 200,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-sm font-semibold text-foreground",
							children: TOOLS_EMPTY_STATE.title
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 201,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "mx-auto mt-1 max-w-lg text-xs",
							children: TOOLS_EMPTY_STATE.description
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 202,
							columnNumber: 21
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 199,
					columnNumber: 19
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 198,
					columnNumber: 52
				}, this) : tools.map((tool) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
					"data-state": tool.id === selectedToolId ? "selected" : void 0,
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "font-medium",
							children: tool.nome
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 207,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: tool.tipo }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 208,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("code", {
							className: "text-xs",
							children: tool.metodo
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 210,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 209,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "max-w-[240px] truncate text-muted-foreground text-xs",
							children: tool.url
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 212,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: tool.status }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 216,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 215,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "text-muted-foreground",
							children: tool.ultimoTeste
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 218,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex gap-1 justify-end",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => {
										setSelectedToolId(tool.id);
										setEditorOpen(true);
									},
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 225,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 221,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => {
										setSelectedToolId(tool.id);
										setEditorOpen(true);
										testTool(tool.nome);
									},
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 232,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 227,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => duplicateTool(tool),
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Copy, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 235,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 234,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									variant: "ghost",
									className: "text-rose-600",
									onClick: () => removeTool(tool.id),
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 238,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 237,
									columnNumber: 25
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 220,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 219,
							columnNumber: 21
						}, this)
					]
				}, tool.id, true, {
					fileName: _jsxFileName,
					lineNumber: 206,
					columnNumber: 49
				}, this)) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 193,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 181,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 180,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 179,
			columnNumber: 7
		}, this),
		editorOpen && /* @__PURE__ */ (void 0)(Card, { children: [/* @__PURE__ */ (void 0)(CardHeader, { children: /* @__PURE__ */ (void 0)(CardTitle, {
			className: "text-base",
			children: "Editar ferramenta"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 250,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 249,
			columnNumber: 9
		}, this), /* @__PURE__ */ (void 0)(CardContent, {
			className: "grid md:grid-cols-2 gap-4",
			children: [
				/* @__PURE__ */ (void 0)(Field, {
					label: "Nome",
					children: /* @__PURE__ */ (void 0)(Input, {
						value: draft.nome,
						onChange: (e) => updateDraft("nome", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 254,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 253,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Descrição",
					className: "md:col-span-2",
					children: /* @__PURE__ */ (void 0)(Textarea, {
						rows: 2,
						value: draft.descricao,
						onChange: (e) => updateDraft("descricao", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 257,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 256,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Tipo",
					children: /* @__PURE__ */ (void 0)(Select, {
						value: draft.tipo,
						onValueChange: (value) => updateDraft("tipo", value),
						children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 262,
							columnNumber: 17
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 261,
							columnNumber: 15
						}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
							/* @__PURE__ */ (void 0)(SelectItem, {
								value: "Webhook",
								children: "Webhook"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 265,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (void 0)(SelectItem, {
								value: "API REST",
								children: "API REST"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 266,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (void 0)(SelectItem, {
								value: "Função interna",
								children: "Função interna"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 267,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (void 0)(SelectItem, {
								value: "Cubo.Chat action",
								children: "Cubo.Chat action"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 268,
								columnNumber: 17
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 264,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 260,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 259,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Método HTTP",
					children: /* @__PURE__ */ (void 0)(Select, {
						value: draft.metodo,
						onValueChange: (value) => updateDraft("metodo", value),
						children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 275,
							columnNumber: 17
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 274,
							columnNumber: 15
						}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
							"GET",
							"POST",
							"PUT",
							"DELETE"
						].map((method) => /* @__PURE__ */ (void 0)(SelectItem, {
							value: method,
							children: method
						}, method, false, {
							fileName: _jsxFileName,
							lineNumber: 278,
							columnNumber: 65
						}, this)) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 277,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 273,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 272,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "URL",
					className: "md:col-span-2",
					children: /* @__PURE__ */ (void 0)(Input, {
						value: draft.url,
						onChange: (e) => updateDraft("url", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 285,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 284,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Headers (JSON)",
					children: /* @__PURE__ */ (void 0)(Textarea, {
						rows: 3,
						value: draft.headersJson,
						onChange: (e) => updateDraft("headersJson", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 288,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 287,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Body (JSON)",
					children: /* @__PURE__ */ (void 0)(Textarea, {
						rows: 3,
						value: draft.bodyJson,
						onChange: (e) => updateDraft("bodyJson", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 291,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 290,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Query params",
					children: /* @__PURE__ */ (void 0)(Textarea, {
						rows: 2,
						value: draft.queryParams,
						onChange: (e) => updateDraft("queryParams", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 294,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 293,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Timeout (ms)",
					children: /* @__PURE__ */ (void 0)(Input, {
						type: "number",
						value: draft.timeoutMs,
						onChange: (e) => updateDraft("timeoutMs", Number(e.target.value) || 0)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 297,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 296,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Autenticação",
					children: /* @__PURE__ */ (void 0)(Select, {
						value: draft.authType,
						onValueChange: (value) => updateDraft("authType", value),
						children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 302,
							columnNumber: 17
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 301,
							columnNumber: 15
						}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
							/* @__PURE__ */ (void 0)(SelectItem, {
								value: "none",
								children: "Nenhuma"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 305,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (void 0)(SelectItem, {
								value: "bearer",
								children: "Bearer Token"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 306,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (void 0)(SelectItem, {
								value: "basic",
								children: "Basic Auth"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 307,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (void 0)(SelectItem, {
								value: "apikey",
								children: "API Key"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 308,
								columnNumber: 17
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 304,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 300,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 299,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Token / chave",
					children: /* @__PURE__ */ (void 0)(MaskedSecretInput, {
						storedHint: draft.token ? "Configurado localmente" : "Não configurado",
						value: draft.token,
						onChange: (e) => updateDraft("token", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 314,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 312,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Campos de entrada esperados",
					children: /* @__PURE__ */ (void 0)(Textarea, {
						rows: 2,
						value: draft.inputFields,
						onChange: (e) => updateDraft("inputFields", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 317,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 316,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Campos de saída esperados",
					children: /* @__PURE__ */ (void 0)(Textarea, {
						rows: 2,
						value: draft.outputFields,
						onChange: (e) => updateDraft("outputFields", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 320,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 319,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Exemplo de resposta",
					className: "md:col-span-2",
					children: /* @__PURE__ */ (void 0)(Textarea, {
						rows: 3,
						value: draft.responseExample,
						onChange: (e) => updateDraft("responseExample", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 323,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 322,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Quando usar",
					children: /* @__PURE__ */ (void 0)(Textarea, {
						rows: 2,
						value: draft.whenUse,
						onChange: (e) => updateDraft("whenUse", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 326,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 325,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)(Field, {
					label: "Quando NÃO usar",
					children: /* @__PURE__ */ (void 0)(Textarea, {
						rows: 2,
						value: draft.whenNotUse,
						onChange: (e) => updateDraft("whenNotUse", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 329,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 328,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)("div", {
					className: "md:col-span-2 flex items-center justify-between p-3 border rounded-lg",
					children: [/* @__PURE__ */ (void 0)("div", { children: [/* @__PURE__ */ (void 0)("div", {
						className: "font-medium text-sm",
						children: "Exigir confirmação antes de executar"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 333,
						columnNumber: 15
					}, this), /* @__PURE__ */ (void 0)("div", {
						className: "text-xs text-muted-foreground",
						children: "Pede confirmação ao cliente antes de chamar a ferramenta"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 334,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 332,
						columnNumber: 13
					}, this), /* @__PURE__ */ (void 0)(Switch, {
						checked: draft.requireConfirmation,
						onCheckedChange: (checked) => updateDraft("requireConfirmation", checked)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 338,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 331,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)("div", {
					className: "md:col-span-2",
					children: /* @__PURE__ */ (void 0)(SecurityNotice, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 341,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 340,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)("div", {
					className: "md:col-span-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground",
					children: testFeedback
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 343,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (void 0)("div", {
					className: "md:col-span-2 flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (void 0)(Button, {
							onClick: saveTool,
							children: "Salvar"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 347,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (void 0)(Button, {
							variant: "outline",
							onClick: () => testTool(),
							children: [/* @__PURE__ */ (void 0)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 349,
								columnNumber: 15
							}, this), " Testar ferramenta"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 348,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (void 0)(Button, {
							variant: "ghost",
							onClick: () => toast.info("Histórico demonstrativo ainda não conectado."),
							children: "Ver histórico de execuções"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 351,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 346,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 252,
			columnNumber: 9
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 248,
			columnNumber: 22
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 167,
		columnNumber: 10
	}, this);
}
function Field({ label, children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5 " + className,
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
			className: "text-xs",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 369,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 368,
		columnNumber: 10
	}, this);
}
//#endregion
export { FerramentasPage as component };
