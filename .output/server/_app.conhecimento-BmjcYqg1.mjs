import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-CeW1PXo7.mjs";
import { $ as FileText, T as RefreshCw, d as Trash2, j as Pencil, x as Search } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-Bsft3ipc.mjs";
import { a as resolveOperationalAssistantId, n as filterOperationalAssistants, t as backendAssistantsService } from "./_ssr/backendAssistantsService-CPFwOdlH.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.conhecimento-BmjcYqg1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.conhecimento.tsx?tsr-split=component";
function ConhecimentoPage() {
	const [company, setCompany] = (0, import_react.useState)(null);
	const [assistants, setAssistants] = (0, import_react.useState)([]);
	const [selectedAssistantId, setSelectedAssistantId] = (0, import_react.useState)("");
	const [knowledge, setKnowledge] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [knowledgeLoading, setKnowledgeLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [search, setSearch] = (0, import_react.useState)("");
	const [editingId, setEditingId] = (0, import_react.useState)(null);
	const [title, setTitle] = (0, import_react.useState)("");
	const [content, setContent] = (0, import_react.useState)("");
	const selectableAssistants = (0, import_react.useMemo)(() => filterOperationalAssistants(assistants), [assistants]);
	const selectedAssistant = (0, import_react.useMemo)(() => selectableAssistants.find((assistant) => assistant.id === selectedAssistantId) ?? null, [selectableAssistants, selectedAssistantId]);
	const filteredKnowledge = (0, import_react.useMemo)(() => {
		const query = search.trim().toLowerCase();
		if (!query) return knowledge;
		return knowledge.filter((item) => item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query));
	}, [knowledge, search]);
	const loadKnowledge = async (assistantId) => {
		if (!assistantId) {
			setKnowledge([]);
			return;
		}
		setKnowledgeLoading(true);
		try {
			setKnowledge(await backendAssistantsService.knowledgeList(assistantId));
			setEditingId(null);
			setTitle("");
			setContent("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Não foi possível carregar a base.");
		} finally {
			setKnowledgeLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const [companyResponse, assistantItems] = await Promise.all([currentCompanyService.get(), backendAssistantsService.list()]);
				if (cancelled) return;
				setCompany(companyResponse.company);
				setAssistants(assistantItems);
				setSelectedAssistantId(resolveOperationalAssistantId(assistantItems));
			} catch (err) {
				if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível carregar o backend.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const nextAssistantId = resolveOperationalAssistantId(assistants, selectedAssistantId);
		if (nextAssistantId !== selectedAssistantId) {
			setSelectedAssistantId(nextAssistantId);
			return;
		}
		if (!nextAssistantId) {
			setKnowledge([]);
			return;
		}
		loadKnowledge(nextAssistantId);
	}, [assistants, selectedAssistantId]);
	const handleEdit = (item) => {
		setEditingId(item.id);
		setTitle(item.title);
		setContent(item.content);
	};
	const handleSave = async () => {
		if (!selectedAssistantId || !title.trim() || !content.trim()) return;
		const payload = {
			title: title.trim(),
			content: content.trim()
		};
		if (editingId) await backendAssistantsService.knowledgeUpdate(selectedAssistantId, editingId, payload);
		else await backendAssistantsService.knowledgeCreate(selectedAssistantId, payload);
		await loadKnowledge(selectedAssistantId);
	};
	const handleDelete = async (item) => {
		if (!selectedAssistantId) return;
		await backendAssistantsService.knowledgeDelete(selectedAssistantId, item.id);
		await loadKnowledge(selectedAssistantId);
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Base de Conhecimento",
			description: company ? `Gerencie a base manual do tenant ${company.name}.` : "Gerencie a base manual do tenant atual.",
			actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				onClick: () => void loadKnowledge(selectedAssistantId),
				disabled: !selectedAssistantId,
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 124,
					columnNumber: 13
				}, this), " Atualizar"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 123,
				columnNumber: 177
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 123,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-6",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-4 grid gap-2 md:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
							className: "text-xs",
							children: "Assistente"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 130,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
							value: selectedAssistantId,
							onValueChange: setSelectedAssistantId,
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 133,
								columnNumber: 17
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 132,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: selectableAssistants.map((assistant) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: assistant.id,
								children: assistant.name
							}, assistant.id, false, {
								fileName: _jsxFileName,
								lineNumber: 136,
								columnNumber: 56
							}, this)) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 135,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 131,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 129,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
							className: "text-xs",
							children: "Busca"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 143,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 145,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								placeholder: "Pesquisar título ou conteúdo...",
								className: "pl-9",
								value: search,
								onChange: (e) => setSearch(e.target.value)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 146,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 144,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 142,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
							className: "text-xs",
							children: "Status do assistente"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 150,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "h-10 flex items-center",
							children: selectedAssistant ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: selectedAssistant.status === "ACTIVE" ? "ativo" : "pausado" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 152,
								columnNumber: 36
							}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "text-sm text-muted-foreground",
								children: "Selecione um assistente"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 152,
								columnNumber: 123
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 151,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 149,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 128,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 127,
			columnNumber: 7
		}, this),
		loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando conhecimento real…" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 158,
			columnNumber: 18
		}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
			title: "Não foi possível carregar a base",
			description: error,
			onRetry: () => void loadKnowledge(selectedAssistantId)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 158,
			columnNumber: 83
		}, this) : !selectedAssistant ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
			title: "Nenhum assistente disponível",
			description: "Crie ou ative um assistente real para vincular conhecimento manual."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 158,
			columnNumber: 238
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid lg:grid-cols-2 gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-0",
				children: knowledgeLoading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { className: "py-8" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 161,
					columnNumber: 35
				}, this) : filteredKnowledge.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
					title: "Sem itens de conhecimento",
					description: "Cadastre o primeiro texto manual para este assistente.",
					className: "m-4"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 161,
					columnNumber: 104
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Nome" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 164,
						columnNumber: 23
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 165,
						columnNumber: 23
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Atualizado" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 166,
						columnNumber: 23
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 167,
						columnNumber: 23
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 163,
					columnNumber: 21
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 162,
					columnNumber: 19
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: filteredKnowledge.map((item) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
						className: "font-medium flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FileText, { className: "h-4 w-4 text-muted-foreground" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 173,
							columnNumber: 27
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "truncate",
								children: item.title
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 175,
								columnNumber: 29
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-xs text-muted-foreground truncate",
								children: item.content
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 176,
								columnNumber: 29
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 174,
							columnNumber: 27
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 172,
						columnNumber: 25
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: item.status === "ACTIVE" ? "ativo" : "pausado" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 182,
						columnNumber: 27
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 181,
						columnNumber: 25
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
						className: "text-muted-foreground text-xs",
						children: formatDate(item.updatedAt)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 184,
						columnNumber: 25
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex gap-1 justify-end",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => handleEdit(item),
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 190,
								columnNumber: 31
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 189,
							columnNumber: 29
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => void handleDelete(item),
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 193,
								columnNumber: 31
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 192,
							columnNumber: 29
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 188,
						columnNumber: 27
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 187,
						columnNumber: 25
					}, this)
				] }, item.id, true, {
					fileName: _jsxFileName,
					lineNumber: 171,
					columnNumber: 52
				}, this)) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 170,
					columnNumber: 19
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 161,
					columnNumber: 240
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 160,
				columnNumber: 13
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 159,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base",
				children: editingId ? "Editar item" : "Criar item"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 205,
				columnNumber: 15
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 204,
				columnNumber: 13
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
						label: "Título",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
							value: title,
							onChange: (e) => setTitle(e.target.value),
							placeholder: "Ex.: Horário de atendimento"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 211,
							columnNumber: 17
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 210,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
						label: "Conteúdo",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
							rows: 6,
							value: content,
							onChange: (e) => setContent(e.target.value),
							placeholder: "Atendemos de segunda a sexta das 08h às 18h."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 214,
							columnNumber: 17
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 213,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							onClick: () => void handleSave(),
							disabled: !title.trim() || !content.trim(),
							children: editingId ? "Salvar alterações" : "Adicionar conhecimento"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 217,
							columnNumber: 17
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "outline",
							onClick: () => {
								setEditingId(null);
								setTitle("");
								setContent("");
							},
							children: "Limpar"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 220,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 216,
						columnNumber: 15
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 209,
				columnNumber: 13
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 203,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 158,
			columnNumber: 374
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 122,
		columnNumber: 10
	}, this);
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
			className: "text-xs",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 241,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 240,
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
export { ConhecimentoPage as component };
