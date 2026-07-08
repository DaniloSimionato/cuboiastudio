import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { Ft as CirclePlay, d as Trash2, it as Copy, j as Pencil, k as Plus } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
import { a as clientes, i as clienteNome, o as ferramentas } from "./_ssr/mock-_kliPTJq.mjs";
import { t as SecurityNotice } from "./_ssr/SecurityNotice-DyLr6C9z.mjs";
import { t as MaskedSecretInput } from "./_ssr/MaskedSecretInput-BEfdpu1t.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.ferramentas-DwtFwuFe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.ferramentas.tsx?tsr-split=component";
var DEFAULT_DRAFT = {
	nome: "",
	clienteId: clientes[0]?.id ?? "",
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
		clienteId: tool.clienteId,
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
		clienteId: draft.clienteId || clientes[0]?.id || "c1",
		tipo: draft.tipo,
		metodo: draft.metodo,
		url: draft.url.trim() || "https://exemplo.local/tool",
		status: previous?.status ?? "pausado",
		ultimoTeste: previous?.ultimoTeste ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
		hasStoredSecret: draft.token.trim().length > 0 || previous?.hasStoredSecret
	};
}
function FerramentasPage() {
	const [tools, setTools] = (0, import_react.useState)(() => ferramentas);
	const [selectedToolId, setSelectedToolId] = (0, import_react.useState)(ferramentas[0]?.id ?? "");
	const [draft, setDraft] = (0, import_react.useState)(() => createDraft(ferramentas[0]));
	const [testFeedback, setTestFeedback] = (0, import_react.useState)("Modo demonstrativo: ferramentas ainda não estão conectadas ao backend.");
	const selectedTool = (0, import_react.useMemo)(() => tools.find((tool) => tool.id === selectedToolId) ?? null, [selectedToolId, tools]);
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
		setTestFeedback("Novo rascunho iniciado em modo demonstrativo.");
		toast.info("Nova ferramenta em modo demonstrativo");
	};
	const saveTool = () => {
		const isEditing = Boolean(selectedToolId && selectedTool);
		const nextId = isEditing ? selectedToolId : `f-local-${Date.now()}`;
		const nextTool = buildToolFromDraft(nextId, draft, selectedTool ?? void 0);
		setTools((current) => isEditing ? current.map((tool) => tool.id === nextId ? nextTool : tool) : [nextTool, ...current]);
		setSelectedToolId(nextId);
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
		toast.success("Ferramenta duplicada no modo demonstrativo");
	};
	const removeTool = (toolId) => {
		setTools((current) => current.filter((tool) => tool.id !== toolId));
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
					lineNumber: 147,
					columnNumber: 13
				}, this), " Nova ferramenta"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 146,
				columnNumber: 136
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 146,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-6 border-dashed",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-4 text-sm text-muted-foreground",
				children: "Modo demonstrativo: ferramentas ainda não estão conectadas ao backend. Você pode criar, editar, duplicar e excluir itens apenas no estado local desta tela."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 151,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 150,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-6",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Nome" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 162,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Cliente" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 163,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Tipo" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 164,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Método" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 165,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "URL" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 166,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 167,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Último teste" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 168,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 169,
						columnNumber: 17
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 161,
					columnNumber: 15
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 160,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: tools.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
					colSpan: 8,
					className: "text-center py-12 text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Wrench, { className: "h-8 w-8 mx-auto mb-2 opacity-50 text-primary animate-pulse" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 175,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "font-semibold text-sm",
							children: "Nenhuma ferramenta cadastrada"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 176,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-xs",
							children: "Clique em \"Nova ferramenta\" no topo para criar sua primeira integração demonstrativa."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 177,
							columnNumber: 21
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 174,
					columnNumber: 19
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 173,
					columnNumber: 37
				}, this) : tools.map((tool) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
					"data-state": tool.id === selectedToolId ? "selected" : void 0,
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "font-medium",
							children: tool.nome
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 180,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: clienteNome(tool.clienteId) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 181,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: tool.tipo }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 182,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("code", {
							className: "text-xs",
							children: tool.metodo
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 184,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 183,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "max-w-[240px] truncate text-muted-foreground text-xs",
							children: tool.url
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 186,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: tool.status }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 190,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 189,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "text-muted-foreground",
							children: tool.ultimoTeste
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 192,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex gap-1 justify-end",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => setSelectedToolId(tool.id),
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 196,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 195,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => {
										setSelectedToolId(tool.id);
										testTool(tool.nome);
									},
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 202,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 198,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => duplicateTool(tool),
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Copy, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 205,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 204,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									variant: "ghost",
									className: "text-rose-600",
									onClick: () => removeTool(tool.id),
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 208,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 207,
									columnNumber: 25
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 194,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 193,
							columnNumber: 21
						}, this)
					]
				}, tool.id, true, {
					fileName: _jsxFileName,
					lineNumber: 179,
					columnNumber: 49
				}, this)) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 172,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 159,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 158,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 157,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
			className: "text-base",
			children: "Editar ferramenta"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 220,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 219,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "grid md:grid-cols-2 gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Nome",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
						value: draft.nome,
						onChange: (e) => updateDraft("nome", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 224,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 223,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Cliente",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: draft.clienteId,
						onValueChange: (value) => updateDraft("clienteId", value),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 229,
							columnNumber: 17
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 228,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: clientes.map((client) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: client.id,
							children: client.nome
						}, client.id, false, {
							fileName: _jsxFileName,
							lineNumber: 232,
							columnNumber: 41
						}, this)) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 231,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 227,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 226,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Descrição",
					className: "md:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 2,
						value: draft.descricao,
						onChange: (e) => updateDraft("descricao", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 239,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 238,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Tipo",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: draft.tipo,
						onValueChange: (value) => updateDraft("tipo", value),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 244,
							columnNumber: 17
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 243,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "Webhook",
								children: "Webhook"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 247,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "API REST",
								children: "API REST"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 248,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "Função interna",
								children: "Função interna"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 249,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "Cubo.Chat action",
								children: "Cubo.Chat action"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 250,
								columnNumber: 17
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 246,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 242,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 241,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Método HTTP",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: draft.metodo,
						onValueChange: (value) => updateDraft("metodo", value),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 257,
							columnNumber: 17
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 256,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
							"GET",
							"POST",
							"PUT",
							"DELETE"
						].map((method) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: method,
							children: method
						}, method, false, {
							fileName: _jsxFileName,
							lineNumber: 260,
							columnNumber: 65
						}, this)) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 259,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 255,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 254,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "URL",
					className: "md:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
						value: draft.url,
						onChange: (e) => updateDraft("url", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 267,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 266,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Headers (JSON)",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 3,
						value: draft.headersJson,
						onChange: (e) => updateDraft("headersJson", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 270,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 269,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Body (JSON)",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 3,
						value: draft.bodyJson,
						onChange: (e) => updateDraft("bodyJson", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 273,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 272,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Query params",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 2,
						value: draft.queryParams,
						onChange: (e) => updateDraft("queryParams", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 276,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 275,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Timeout (ms)",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
						type: "number",
						value: draft.timeoutMs,
						onChange: (e) => updateDraft("timeoutMs", Number(e.target.value) || 0)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 279,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 278,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Autenticação",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: draft.authType,
						onValueChange: (value) => updateDraft("authType", value),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 284,
							columnNumber: 17
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 283,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "none",
								children: "Nenhuma"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 287,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "bearer",
								children: "Bearer Token"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 288,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "basic",
								children: "Basic Auth"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 289,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "apikey",
								children: "API Key"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 290,
								columnNumber: 17
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 286,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 282,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 281,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Token / chave",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MaskedSecretInput, {
						storedHint: draft.token ? "Configurado localmente" : "Não configurado",
						value: draft.token,
						onChange: (e) => updateDraft("token", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 296,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 294,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Campos de entrada esperados",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 2,
						value: draft.inputFields,
						onChange: (e) => updateDraft("inputFields", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 299,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 298,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Campos de saída esperados",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 2,
						value: draft.outputFields,
						onChange: (e) => updateDraft("outputFields", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 302,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 301,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Exemplo de resposta",
					className: "md:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 3,
						value: draft.responseExample,
						onChange: (e) => updateDraft("responseExample", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 305,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 304,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Quando usar",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 2,
						value: draft.whenUse,
						onChange: (e) => updateDraft("whenUse", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 308,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 307,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Quando NÃO usar",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 2,
						value: draft.whenNotUse,
						onChange: (e) => updateDraft("whenNotUse", e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 311,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 310,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "md:col-span-2 flex items-center justify-between p-3 border rounded-lg",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "font-medium text-sm",
						children: "Exigir confirmação antes de executar"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 315,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "text-xs text-muted-foreground",
						children: "Pede confirmação ao cliente antes de chamar a ferramenta"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 316,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 314,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
						checked: draft.requireConfirmation,
						onCheckedChange: (checked) => updateDraft("requireConfirmation", checked)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 320,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 313,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "md:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SecurityNotice, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 323,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 322,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "md:col-span-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground",
					children: testFeedback
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 325,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "md:col-span-2 flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							onClick: saveTool,
							children: "Salvar"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 329,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "outline",
							onClick: () => testTool(),
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 331,
								columnNumber: 15
							}, this), " Testar ferramenta"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 330,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "ghost",
							onClick: () => toast.info("Histórico demonstrativo ainda não conectado."),
							children: "Ver histórico de execuções"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 333,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 328,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 222,
			columnNumber: 9
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 218,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 145,
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
			lineNumber: 351,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 350,
		columnNumber: 10
	}, this);
}
//#endregion
export { FerramentasPage as component };
