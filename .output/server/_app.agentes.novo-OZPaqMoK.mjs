import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-DRGNNNW9.mjs";
import { B as Link2, M as Pause, Pt as CirclePlay, S as Save, Tt as ArrowLeft, kt as Sparkles } from "./_libs/lucide-react.mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-Bsft3ipc.mjs";
import { a as resolveOperationalAssistantId, n as filterOperationalAssistants, t as backendAssistantsService } from "./_ssr/backendAssistantsService-B1lwdUmO.mjs";
import { t as Route } from "./_app.agentes.novo-iR4ElWh0.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./_ssr/tabs-Bfe67_Ib.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.agentes.novo-OZPaqMoK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.agentes.novo.tsx?tsr-split=component";
function NovoAgente() {
	const search = Route.useSearch();
	const [company, setCompany] = (0, import_react.useState)(null);
	const [assistants, setAssistants] = (0, import_react.useState)([]);
	const [selectedAssistantId, setSelectedAssistantId] = (0, import_react.useState)(search.assistantId ?? "");
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [previewLoading, setPreviewLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [name, setName] = (0, import_react.useState)("");
	const [description, setDescription] = (0, import_react.useState)("");
	const [initialMessage, setInitialMessage] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("ACTIVE");
	const [instructions, setInstructions] = (0, import_react.useState)("");
	const [model, setModel] = (0, import_react.useState)("");
	const [temperature, setTemperature] = (0, import_react.useState)(null);
	const [knowledge, setKnowledge] = (0, import_react.useState)([]);
	const [previewQuestion, setPreviewQuestion] = (0, import_react.useState)("Qual é o horário de atendimento?");
	const [previewResult, setPreviewResult] = (0, import_react.useState)(null);
	const selectableAssistants = (0, import_react.useMemo)(() => filterOperationalAssistants(assistants, { includeInactive: true }), [assistants]);
	const selectedAssistant = (0, import_react.useMemo)(() => selectableAssistants.find((assistant) => assistant.id === selectedAssistantId) ?? null, [selectableAssistants, selectedAssistantId]);
	const loadKnowledge = async (assistantId) => {
		if (!assistantId) {
			setKnowledge([]);
			return;
		}
		setKnowledge(await backendAssistantsService.knowledgeList(assistantId));
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
				const initialAssistantId = resolveOperationalAssistantId(assistantItems, search.assistantId, { includeInactive: true });
				setSelectedAssistantId(initialAssistantId);
				if (!initialAssistantId) {
					setName("");
					setDescription("");
					setStatus("ACTIVE");
					setKnowledge([]);
				}
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
	}, [search.assistantId]);
	(0, import_react.useEffect)(() => {
		if (!selectedAssistantId) {
			setKnowledge([]);
			return;
		}
		(async () => {
			try {
				const assistant = await backendAssistantsService.get(selectedAssistantId);
				setName(assistant.name);
				setDescription(assistant.description ?? "");
				setInitialMessage(assistant.initialMessage ?? "");
				setInstructions(assistant.instructions ?? "");
				setModel(assistant.model ?? "");
				setTemperature(assistant.temperature ?? null);
				setStatus(assistant.status);
				await loadKnowledge(selectedAssistantId);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Não foi possível carregar o assistente.");
			}
		})();
	}, [selectedAssistantId]);
	const handleCreateNew = () => {
		setSelectedAssistantId("");
		setName("");
		setDescription("");
		setInitialMessage("");
		setInstructions("");
		setModel("");
		setTemperature(null);
		setStatus("ACTIVE");
		setKnowledge([]);
		setPreviewResult(null);
	};
	const handleSave = async () => {
		if (!name.trim()) return;
		setSaving(true);
		try {
			if (selectedAssistantId) {
				const updated = await backendAssistantsService.update(selectedAssistantId, {
					name: name.trim(),
					description: description.trim() || null,
					initialMessage: initialMessage.trim() || null,
					instructions: instructions.trim() || null,
					model: model.trim() || null,
					temperature
				});
				setAssistants((items) => items.map((item) => item.id === updated.id ? updated : item));
				setName(updated.name);
				setDescription(updated.description ?? "");
				setInitialMessage(updated.initialMessage ?? "");
				setInstructions(updated.instructions ?? "");
				setModel(updated.model ?? "");
				setTemperature(updated.temperature ?? null);
				if (updated.status !== status) {
					const updatedStatus = await backendAssistantsService.updateStatus(selectedAssistantId, status);
					setAssistants((items) => items.map((item) => item.id === updatedStatus.id ? updatedStatus : item));
				}
			} else {
				const created = await backendAssistantsService.create({
					name: name.trim(),
					description: description.trim() || null,
					initialMessage: initialMessage.trim() || null,
					instructions: instructions.trim() || null,
					model: model.trim() || null,
					temperature
				});
				setAssistants((items) => [created, ...items]);
				setSelectedAssistantId(created.id);
				setName(created.name);
				setDescription(created.description ?? "");
				setInitialMessage(created.initialMessage ?? "");
				setInstructions(created.instructions ?? "");
				setModel(created.model ?? "");
				setTemperature(created.temperature ?? null);
				setStatus(created.status);
				await loadKnowledge(created.id);
			}
		} finally {
			setSaving(false);
		}
	};
	const handleToggleStatus = async () => {
		if (!selectedAssistantId) return;
		const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
		const updated = await backendAssistantsService.updateStatus(selectedAssistantId, nextStatus);
		setStatus(updated.status);
		setAssistants((items) => items.map((item) => item.id === updated.id ? updated : item));
	};
	const handlePreview = async () => {
		if (!selectedAssistantId || !previewQuestion.trim()) return;
		setPreviewLoading(true);
		try {
			setPreviewResult(await backendAssistantsService.preview(selectedAssistantId, previewQuestion));
		} finally {
			setPreviewLoading(false);
		}
	};
	const isActive = status === "ACTIVE";
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
		title: "Criar / Editar Agente",
		description: company ? `Configure o assistente real do tenant ${company.name}.` : "Configure o assistente real do tenant atual.",
		actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "outline",
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
					to: "/agentes",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowLeft, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 198,
						columnNumber: 17
					}, this), " Voltar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 197,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 196,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "outline",
				onClick: handleCreateNew,
				children: "Novo"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 201,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "outline",
				onClick: () => void handlePreview(),
				disabled: !selectedAssistantId || previewLoading,
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 205,
					columnNumber: 15
				}, this), " Preview"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 204,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "outline",
				onClick: handleToggleStatus,
				disabled: !selectedAssistantId,
				children: [isActive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pause, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 208,
					columnNumber: 27
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 208,
					columnNumber: 59
				}, this), isActive ? "Inativar" : "Ativar"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 207,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				onClick: () => void handleSave(),
				disabled: saving || !name.trim(),
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 212,
						columnNumber: 15
					}, this),
					" ",
					selectedAssistantId ? "Salvar" : "Criar"
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 211,
				columnNumber: 13
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 195,
			columnNumber: 188
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 195,
		columnNumber: 7
	}, this), loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando assistente real…" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 216,
		columnNumber: 18
	}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
		title: "Não foi possível carregar o assistente",
		description: error,
		onRetry: () => window.location.reload()
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 216,
		columnNumber: 81
	}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
		className: "mb-4",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-4 grid gap-4 md:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Selecionar assistente",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: selectedAssistantId || "new",
						onValueChange: (value) => {
							if (value === "new") handleCreateNew();
							else setSelectedAssistantId(value);
						},
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Novo assistente" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 228,
							columnNumber: 21
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 227,
							columnNumber: 19
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "new",
							children: "Novo assistente"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 231,
							columnNumber: 21
						}, this), selectableAssistants.map((assistant) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: assistant.id,
							children: assistant.name
						}, assistant.id, false, {
							fileName: _jsxFileName,
							lineNumber: 232,
							columnNumber: 60
						}, this))] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 230,
							columnNumber: 19
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 220,
						columnNumber: 17
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 219,
					columnNumber: 15
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Status",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-10 flex items-center",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: isActive ? "ativo" : "pausado" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 240,
							columnNumber: 19
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 239,
						columnNumber: 17
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 238,
					columnNumber: 15
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Resumo",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "text-sm text-muted-foreground",
						children: selectedAssistant?.description || description || "Sem descrição cadastrada."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 244,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: [
							selectedAssistant?.instructions || instructions ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
								variant: "secondary",
								children: "Prompt configurado"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 248,
								columnNumber: 70
							}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
								variant: "outline",
								children: "Prompt padrão"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 248,
								columnNumber: 126
							}, this),
							selectedAssistant?.initialMessage || initialMessage ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
								variant: "secondary",
								children: "Mensagem inicial"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 249,
								columnNumber: 74
							}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
								variant: "outline",
								children: "Sem mensagem inicial"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 249,
								columnNumber: 128
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
								variant: "outline",
								children: model.trim() || selectedAssistant?.model || "Modelo padrão"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 250,
								columnNumber: 19
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 247,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 243,
					columnNumber: 15
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 218,
			columnNumber: 13
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 217,
		columnNumber: 11
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tabs, {
		defaultValue: "info",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsList, {
				className: "mb-4 flex-wrap h-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "info",
						children: "Informações"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 260,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "prompt",
						children: "Prompt"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 261,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "conhecimento",
						children: "Conhecimento"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 262,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "ferramentas",
						children: "Ferramentas"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 263,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "memoria",
						children: "Memória"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 264,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "seguranca",
						children: "Regras de Segurança"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 265,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "publicacao",
						children: "Publicação"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 266,
						columnNumber: 15
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 259,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "info",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 grid md:grid-cols-2 gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Nome do assistente",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								value: name,
								onChange: (e) => setName(e.target.value)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 273,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 272,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Empresa atual",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								value: company?.name ?? "Tenant atual",
								disabled: true
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 276,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 275,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Descrição",
							className: "md:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
								rows: 3,
								value: description,
								onChange: (e) => setDescription(e.target.value)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 279,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 278,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Modelo",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								value: model,
								onChange: (e) => setModel(e.target.value),
								placeholder: "Opcional. Se vazio, usa o modelo padrão do backend."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 282,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 281,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Temperatura",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								type: "number",
								min: 0,
								max: 2,
								step: .1,
								value: temperature ?? "",
								onChange: (e) => {
									const nextValue = e.target.value.trim();
									if (nextValue === "") {
										setTemperature(null);
										return;
									}
									const parsed = Number(nextValue);
									setTemperature(Number.isNaN(parsed) ? null : parsed);
								},
								placeholder: "0.2"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 285,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 284,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "md:col-span-2 flex items-center justify-between p-3 border rounded-lg",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "font-medium text-sm",
								children: "Assistente ativo"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 297,
								columnNumber: 23
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-xs text-muted-foreground",
								children: "Receberá conversas quando o runtime persistido for acionado"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 298,
								columnNumber: 23
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 296,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								onClick: handleToggleStatus,
								disabled: !selectedAssistantId,
								children: [isActive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pause, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 303,
									columnNumber: 35
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 303,
									columnNumber: 67
								}, this), isActive ? "Inativar" : "Ativar"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 302,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 295,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 271,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 270,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 269,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "prompt",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Instruções do agente",
							helper: "Usadas pelo runtime de IA quando o provider estiver habilitado; também aparecem no debug dos testes.",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
								rows: 8,
								value: instructions,
								onChange: (e) => setInstructions(e.target.value),
								placeholder: "Você é um atendente da Cubo.Chat. Responda de forma objetiva, educada e em português."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 315,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 314,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Mensagem inicial",
							helper: "Opcional. Ao criar uma conversa nova, essa mensagem aparece como a primeira resposta do assistente.",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
								rows: 3,
								value: initialMessage,
								onChange: (e) => setInitialMessage(e.target.value),
								placeholder: "Olá! Sou seu assistente. Como posso ajudar?"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 318,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 317,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid md:grid-cols-2 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Modelo preferencial",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: model,
										onChange: (e) => setModel(e.target.value),
										placeholder: "Opcional. Se vazio, usa o modelo padrão do backend."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 322,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 321,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Temperatura",
									helper: "Valores menores deixam as respostas mais objetivas. Valores maiores deixam as respostas mais criativas.",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										type: "number",
										min: 0,
										max: 2,
										step: .1,
										value: temperature ?? "",
										onChange: (e) => {
											const nextValue = e.target.value.trim();
											if (nextValue === "") {
												setTemperature(null);
												return;
											}
											const parsed = Number(nextValue);
											setTemperature(Number.isNaN(parsed) ? null : parsed);
										},
										placeholder: "0.2"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 325,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 324,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Mensagem quando não souber responder",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
										rows: 3,
										value: "Não tenho essa informação na base atual. Posso transferir para um humano?",
										readOnly: true
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 336,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 335,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Instrução de segurança",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
										rows: 3,
										value: "Não inventar dados, não chamar APIs externas e não expor segredos.",
										readOnly: true
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 339,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 338,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 320,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 313,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 312,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 311,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "conhecimento",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 space-y-2",
					children: [knowledge.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
						title: "Sem conhecimento carregado",
						description: "Cadastre itens na tela Base de Conhecimento para este assistente."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 349,
						columnNumber: 45
					}, this) : knowledge.map((item) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center gap-4 p-3 border rounded-lg",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex-1 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "font-medium",
								children: item.title
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 351,
								columnNumber: 27
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-xs text-muted-foreground truncate",
								children: item.content
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 352,
								columnNumber: 27
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 350,
							columnNumber: 25
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: item.status === "ACTIVE" ? "ativo" : "pausado" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 356,
							columnNumber: 25
						}, this)]
					}, item.id, true, {
						fileName: _jsxFileName,
						lineNumber: 349,
						columnNumber: 199
					}, this)), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "pt-2",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							asChild: true,
							variant: "outline",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
								to: "/conhecimento",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link2, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 361,
									columnNumber: 25
								}, this), " Ir para Base de Conhecimento"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 360,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 359,
							columnNumber: 21
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 358,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 348,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 347,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 346,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "ferramentas",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
						title: "Ferramentas não conectadas nesta etapa",
						description: "A demo atual foca em assistentes, conhecimento e runtime determinístico."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 372,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 371,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 370,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 369,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "memoria",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
						title: "Memória avançada ainda não conectada",
						description: "A memória persiste apenas no runtime backend atual."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 380,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 379,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 378,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 377,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "seguranca",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
								label: "Não responder sem base de conhecimento",
								desc: "Mantido no runtime determinístico do backend",
								defaultChecked: true
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 389,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
								label: "Não chamar IA externa",
								desc: "Nenhuma integração com provedores é feita no frontend",
								defaultChecked: true
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 390,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
								label: "Não expor segredos",
								desc: "Todos os tokens continuam apenas no backend",
								defaultChecked: true
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 391,
								columnNumber: 21
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 388,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 387,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 386,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 385,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "publicacao",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-base",
					children: "Resumo do assistente"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 400,
					columnNumber: 19
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 399,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
							label: "Empresa",
							value: company?.name ?? "Tenant atual"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 403,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
							label: "Assistente",
							value: name || "Novo assistente"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 404,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
							label: "Status",
							value: isActive ? "Ativo" : "Inativo"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 405,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
							label: "Mensagem inicial",
							value: initialMessage.trim() ? "Configurada" : "Não configurada"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 406,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
							label: "Conhecimento",
							value: `${knowledge.length} itens carregados`
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 407,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex flex-wrap gap-2 pt-4 border-t",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									onClick: () => void handleSave(),
									disabled: saving || !name.trim(),
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 410,
											columnNumber: 23
										}, this),
										" ",
										selectedAssistantId ? "Salvar" : "Criar"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 409,
									columnNumber: 21
								}, this),
								selectedAssistantId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
										to: "/testes",
										search: { assistantId: selectedAssistantId },
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 416,
											columnNumber: 27
										}, this), " Testar runtime"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 413,
										columnNumber: 25
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 412,
									columnNumber: 44
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
										to: "/testes",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 420,
											columnNumber: 27
										}, this), " Testar runtime"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 419,
										columnNumber: 25
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 418,
									columnNumber: 35
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									onClick: handleToggleStatus,
									disabled: !selectedAssistantId,
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pause, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 424,
											columnNumber: 23
										}, this),
										" ",
										isActive ? "Inativar" : "Ativar"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 423,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									onClick: () => void handlePreview(),
									disabled: !selectedAssistantId || previewLoading,
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 427,
											columnNumber: 23
										}, this),
										" ",
										previewLoading ? "Preview..." : "Preview"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 426,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 408,
							columnNumber: 19
						}, this),
						previewResult ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "rounded-lg border bg-muted/30 p-3 space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "text-sm font-medium",
									children: "Resposta determinística"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 431,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-sm",
									children: previewResult.answer
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 432,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex flex-wrap gap-1",
									children: previewResult.sources.map((source) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
										variant: "outline",
										children: source.title
									}, source.id, false, {
										fileName: _jsxFileName,
										lineNumber: 434,
										columnNumber: 62
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 433,
									columnNumber: 23
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 430,
							columnNumber: 36
						}, this) : null,
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
								className: "text-xs",
								children: "Pergunta para preview"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 440,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								value: previewQuestion,
								onChange: (e) => setPreviewQuestion(e.target.value)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 441,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 439,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 402,
					columnNumber: 17
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 398,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 397,
				columnNumber: 13
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 258,
		columnNumber: 11
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 216,
		columnNumber: 206
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 194,
		columnNumber: 10
	}, this);
}
function Field({ label, children, helper, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5 " + className,
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
				className: "text-xs font-medium",
				children: label
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 462,
				columnNumber: 7
			}, this),
			children,
			helper ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-[11px] text-muted-foreground",
				children: helper
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 464,
				columnNumber: 17
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 461,
		columnNumber: 10
	}, this);
}
function ToggleRow({ label, desc, defaultChecked }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex items-center justify-between p-3 border rounded-lg",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "font-medium text-sm",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 478,
			columnNumber: 9
		}, this), desc && /* @__PURE__ */ (void 0)("div", {
			className: "text-xs text-muted-foreground",
			children: desc
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 479,
			columnNumber: 18
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 477,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "h-8 w-8 rounded-full border grid place-items-center text-xs",
			children: defaultChecked ? "✓" : "—"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 481,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 476,
		columnNumber: 10
	}, this);
}
function Summary({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex justify-between gap-4 py-2 border-b last:border-0 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-muted-foreground",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 494,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "font-medium",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 495,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 493,
		columnNumber: 10
	}, this);
}
//#endregion
export { NovoAgente as component };
