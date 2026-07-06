import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-DRGNNNW9.mjs";
import { B as Link2, M as Pause, O as Plus, Ot as TriangleAlert, Pt as CirclePlay, S as Save, Tt as ArrowLeft, gt as Check, kt as Sparkles } from "./_libs/lucide-react.mjs";
import { n as CheckboxIndicator, t as Checkbox$1 } from "./_libs/@radix-ui/react-checkbox+[...].mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-Bsft3ipc.mjs";
import { a as resolveOperationalAssistantId, n as filterOperationalAssistants, t as backendAssistantsService } from "./_ssr/backendAssistantsService-Ca0QS27v.mjs";
import { t as Route } from "./_app.agentes.novo-CL91Mlca.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./_ssr/dialog-BQR4UioY.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./_ssr/tabs-Bfe67_Ib.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "./_libs/radix-ui__react-slider.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.agentes.novo-BlSO6p-j.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName$2 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/slider.tsx";
var Slider = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Slider$1, {
	ref,
	className: cn("relative flex w-full touch-none select-none items-center", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SliderTrack, {
		className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SliderRange, { className: "absolute h-full bg-primary" }, void 0, false, {
			fileName: _jsxFileName$2,
			lineNumber: 16,
			columnNumber: 7
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 15,
		columnNumber: 5
	}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SliderThumb, { className: "block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" }, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 18,
		columnNumber: 5
	}, void 0)]
}, void 0, true, {
	fileName: _jsxFileName$2,
	lineNumber: 10,
	columnNumber: 3
}, void 0));
Slider.displayName = Slider$1.displayName;
var _jsxFileName$1 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/checkbox.tsx";
var Checkbox = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Checkbox$1, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CheckboxIndicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: "h-4 w-4" }, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 20,
			columnNumber: 7
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 19,
		columnNumber: 5
	}, void 0)
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 11,
	columnNumber: 3
}, void 0));
Checkbox.displayName = Checkbox$1.displayName;
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
	const [ragEnabled, setRagEnabled] = (0, import_react.useState)(false);
	const [status, setStatus] = (0, import_react.useState)("ACTIVE");
	const [instructions, setInstructions] = (0, import_react.useState)("");
	const [model, setModel] = (0, import_react.useState)("");
	const [temperature, setTemperature] = (0, import_react.useState)(null);
	const [knowledge, setKnowledge] = (0, import_react.useState)([]);
	const [previewQuestion, setPreviewQuestion] = (0, import_react.useState)("Qual é o horário de atendimento?");
	const [usePreparedKnowledge, setUsePreparedKnowledge] = (0, import_react.useState)(false);
	const [previewResult, setPreviewResult] = (0, import_react.useState)(null);
	const [noAnswerMessage, setNoAnswerMessage] = (0, import_react.useState)("");
	const [securityInstructions, setSecurityInstructions] = (0, import_react.useState)("");
	const [securityRules, setSecurityRules] = (0, import_react.useState)([{
		id: "1",
		name: "Não informar preços sem base",
		type: "Não inventar resposta",
		instruction: "Se o preço não estiver na base de conhecimento ou ferramenta autorizada, diga que não possui essa informação e ofereça transferência para atendimento humano.",
		active: true
	}]);
	const [isReviewConfirmed, setIsReviewConfirmed] = (0, import_react.useState)(false);
	const [isAddingKnowledge, setIsAddingKnowledge] = (0, import_react.useState)(false);
	const [isAddingSecurityRule, setIsAddingSecurityRule] = (0, import_react.useState)(false);
	const [knowledgeFormId, setKnowledgeFormId] = (0, import_react.useState)(null);
	const [knowledgeFormType, setKnowledgeFormType] = (0, import_react.useState)("TEXT");
	const [knowledgeFormTitle, setKnowledgeFormTitle] = (0, import_react.useState)("");
	const [knowledgeFormContent, setKnowledgeFormContent] = (0, import_react.useState)("");
	const [knowledgeFormUrl, setKnowledgeFormUrl] = (0, import_react.useState)("");
	const [knowledgeFormStatus, setKnowledgeFormStatus] = (0, import_react.useState)("ACTIVE");
	const [knowledgeSaving, setKnowledgeSaving] = (0, import_react.useState)(false);
	const [preparingKnowledgeId, setPreparingKnowledgeId] = (0, import_react.useState)(null);
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [isSearching, setIsSearching] = (0, import_react.useState)(false);
	const [searchResults, setSearchResults] = (0, import_react.useState)(null);
	const [searchError, setSearchError] = (0, import_react.useState)(null);
	const selectableAssistants = (0, import_react.useMemo)(() => filterOperationalAssistants(assistants, { includeInactive: true }), [assistants]);
	(0, import_react.useMemo)(() => selectableAssistants.find((assistant) => assistant.id === selectedAssistantId) ?? null, [selectableAssistants, selectedAssistantId]);
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
					setRagEnabled(false);
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
				setNoAnswerMessage(assistant.fallbackMessage ?? "");
				setSecurityInstructions(assistant.safetyInstruction ?? "");
				setRagEnabled(assistant.ragEnabled ?? false);
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
		setNoAnswerMessage("");
		setSecurityInstructions("");
		setSecurityRules([{
			id: "1",
			name: "Não informar preços sem base",
			type: "Não inventar resposta",
			instruction: "Se o preço não estiver na base de conhecimento ou ferramenta autorizada, diga que não possui essa informação e ofereça transferência para atendimento humano.",
			active: true
		}]);
		setIsReviewConfirmed(false);
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
					temperature,
					fallbackMessage: noAnswerMessage.trim() || null,
					safetyInstruction: securityInstructions.trim() || null,
					ragEnabled
				});
				setAssistants((items) => items.map((item) => item.id === updated.id ? updated : item));
				setName(updated.name);
				setDescription(updated.description ?? "");
				setInitialMessage(updated.initialMessage ?? "");
				setInstructions(updated.instructions ?? "");
				setModel(updated.model ?? "");
				setTemperature(updated.temperature ?? null);
				setNoAnswerMessage(updated.fallbackMessage ?? "");
				setSecurityInstructions(updated.safetyInstruction ?? "");
				setRagEnabled(updated.ragEnabled ?? false);
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
					temperature,
					fallbackMessage: noAnswerMessage.trim() || null,
					safetyInstruction: securityInstructions.trim() || null,
					ragEnabled
				});
				setAssistants((items) => [created, ...items]);
				setSelectedAssistantId(created.id);
				setName(created.name);
				setDescription(created.description ?? "");
				setInitialMessage(created.initialMessage ?? "");
				setInstructions(created.instructions ?? "");
				setModel(created.model ?? "");
				setTemperature(created.temperature ?? null);
				setNoAnswerMessage(created.fallbackMessage ?? "");
				setSecurityInstructions(created.safetyInstruction ?? "");
				setRagEnabled(created.ragEnabled ?? false);
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
			setPreviewResult(await backendAssistantsService.preview(selectedAssistantId, previewQuestion, usePreparedKnowledge));
		} finally {
			setPreviewLoading(false);
		}
	};
	const isActive = status === "ACTIVE";
	const getTemperatureDescription = (temp) => {
		if (temp === null) return "Padrão do sistema";
		if (temp <= .2) return "Mais objetiva, segura e direta";
		if (temp <= .5) return "Equilibrada";
		if (temp <= .8) return "Mais criativa e flexível";
		return "Muito criativa, com maior risco de fugir do padrão";
	};
	const handleOpenNewKnowledge = () => {
		setKnowledgeFormId(null);
		setKnowledgeFormType("TEXT");
		setKnowledgeFormTitle("");
		setKnowledgeFormContent("");
		setKnowledgeFormUrl("");
		setKnowledgeFormStatus("ACTIVE");
		setIsAddingKnowledge(true);
	};
	const handleOpenEditKnowledge = (item) => {
		setKnowledgeFormId(item.id);
		setKnowledgeFormType(item.metadata?.type || "TEXT");
		setKnowledgeFormTitle(item.title);
		setKnowledgeFormContent(item.content);
		setKnowledgeFormUrl(item.metadata?.sourceUrl || "");
		setKnowledgeFormStatus(item.status === "ACTIVE" ? "ACTIVE" : "INACTIVE");
		setIsAddingKnowledge(true);
	};
	const handleSaveKnowledge = async () => {
		if (!knowledgeFormTitle.trim() || !knowledgeFormContent.trim() || !selectedAssistantId) return;
		setKnowledgeSaving(true);
		try {
			if (knowledgeFormId) await backendAssistantsService.knowledgeUpdate(selectedAssistantId, knowledgeFormId, {
				title: knowledgeFormTitle.trim(),
				content: knowledgeFormContent.trim(),
				status: knowledgeFormStatus,
				metadata: {
					type: knowledgeFormType,
					...knowledgeFormType === "URL" ? { sourceUrl: knowledgeFormUrl.trim() } : {}
				}
			});
			else await backendAssistantsService.knowledgeCreate(selectedAssistantId, {
				title: knowledgeFormTitle.trim(),
				content: knowledgeFormContent.trim(),
				metadata: {
					type: knowledgeFormType,
					...knowledgeFormType === "URL" ? { sourceUrl: knowledgeFormUrl.trim() } : {}
				}
			});
			await loadKnowledge(selectedAssistantId);
			setIsAddingKnowledge(false);
		} catch (err) {
			alert("Erro ao salvar conhecimento: " + (err instanceof Error ? err.message : String(err)));
		} finally {
			setKnowledgeSaving(false);
		}
	};
	const handlePrepareForAI = async (item) => {
		if (!selectedAssistantId) return;
		if (item.status === "INACTIVE") {
			alert("Ative este conhecimento antes de prepará-lo para a IA.");
			return;
		}
		setPreparingKnowledgeId(item.id);
		try {
			await backendAssistantsService.knowledgePrepare(selectedAssistantId, item.id);
			await loadKnowledge(selectedAssistantId);
		} catch (err) {
			alert("Erro ao preparar conhecimento: " + (err instanceof Error ? err.message : String(err)));
			await loadKnowledge(selectedAssistantId);
		} finally {
			setPreparingKnowledgeId(null);
		}
	};
	const activeKnowledgeCount = knowledge.filter((k) => k.status === "ACTIVE").length;
	const readyKnowledgeCount = knowledge.filter((k) => k.status === "ACTIVE" && k.processingStatus === "READY").length;
	const errorKnowledgeCount = knowledge.filter((k) => k.status === "ACTIVE" && k.processingStatus === "ERROR").length;
	const draftKnowledgeCount = knowledge.filter((k) => k.status === "ACTIVE" && k.processingStatus === "DRAFT").length;
	const handleSearchKnowledge = async () => {
		if (!selectedAssistantId) return;
		if (!searchQuery.trim()) {
			alert("Digite uma pergunta para testar.");
			return;
		}
		setIsSearching(true);
		setSearchError(null);
		setSearchResults(null);
		try {
			const response = await backendAssistantsService.knowledgeSearch(selectedAssistantId, searchQuery);
			setSearchResults(response.results);
			if (response.results.length === 0) setSearchError("Nenhum conhecimento preparado foi encontrado para essa pergunta.");
		} catch (err) {
			setSearchError("Erro ao buscar conhecimento: " + (err instanceof Error ? err.message : String(err)));
		} finally {
			setIsSearching(false);
		}
	};
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
						lineNumber: 366,
						columnNumber: 17
					}, this), " Voltar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 365,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 364,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "outline",
				onClick: handleCreateNew,
				children: "Novo"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 369,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "outline",
				onClick: () => void handlePreview(),
				disabled: !selectedAssistantId || previewLoading,
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 373,
					columnNumber: 15
				}, this), " Preview"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 372,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "outline",
				onClick: handleToggleStatus,
				disabled: !selectedAssistantId,
				children: [isActive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pause, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 376,
					columnNumber: 27
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 376,
					columnNumber: 59
				}, this), isActive ? "Inativar" : "Ativar"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 375,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				onClick: () => void handleSave(),
				disabled: saving || !name.trim(),
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 380,
						columnNumber: 15
					}, this),
					" ",
					selectedAssistantId ? "Salvar" : "Criar"
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 379,
				columnNumber: 13
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 363,
			columnNumber: 188
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 363,
		columnNumber: 7
	}, this), loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando assistente real…" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 384,
		columnNumber: 18
	}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
		title: "Não foi possível carregar o assistente",
		description: error,
		onRetry: () => window.location.reload()
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 384,
		columnNumber: 81
	}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
		className: "mb-4",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-4 grid gap-4 md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Selecionar assistente",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
					value: selectedAssistantId || "new",
					onValueChange: (value) => {
						if (value === "new") handleCreateNew();
						else setSelectedAssistantId(value);
					},
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Novo assistente" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 396,
						columnNumber: 21
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 395,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: "new",
						children: "Novo assistente"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 399,
						columnNumber: 21
					}, this), selectableAssistants.map((assistant) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: assistant.id,
						children: assistant.name
					}, assistant.id, false, {
						fileName: _jsxFileName,
						lineNumber: 400,
						columnNumber: 60
					}, this))] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 398,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 388,
					columnNumber: 17
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 387,
				columnNumber: 15
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Status",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "h-10 flex items-center",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: isActive ? "ativo" : "pausado" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 408,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 407,
					columnNumber: 17
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 406,
				columnNumber: 15
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 386,
			columnNumber: 13
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 385,
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
						lineNumber: 416,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "prompt",
						children: "Prompt"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 417,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "conhecimento",
						children: "Conhecimento"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 418,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "ferramentas",
						children: "Ferramentas"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 419,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "memoria",
						children: "Memória"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 420,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "seguranca",
						children: "Regras de Segurança"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 421,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "publicacao",
						children: "Publicação"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 422,
						columnNumber: 15
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 415,
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
								lineNumber: 429,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 428,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Empresa atual",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								value: company?.name ?? "Tenant atual",
								disabled: true
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 432,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 431,
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
								lineNumber: 435,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 434,
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
								lineNumber: 438,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 437,
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
								lineNumber: 441,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 440,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "md:col-span-2 flex items-center justify-between p-3 border rounded-lg",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "font-medium text-sm",
								children: "Assistente ativo"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 453,
								columnNumber: 23
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-xs text-muted-foreground",
								children: "Receberá conversas quando o runtime persistido for acionado"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 454,
								columnNumber: 23
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 452,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								onClick: handleToggleStatus,
								disabled: !selectedAssistantId,
								children: [isActive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pause, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 459,
									columnNumber: 35
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 459,
									columnNumber: 67
								}, this), isActive ? "Inativar" : "Ativar"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 458,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 451,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 427,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 426,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 425,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "prompt",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid md:grid-cols-2 gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Modelo da IA",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: model,
									onChange: (e) => setModel(e.target.value),
									placeholder: "Opcional. Se vazio, usa o modelo padrão do backend."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 472,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 471,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Criatividade da resposta (Temperatura)",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-3 pt-2",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Slider, {
										value: [temperature ?? .2],
										min: 0,
										max: 1,
										step: .1,
										onValueChange: (vals) => setTemperature(vals[0])
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 476,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex justify-between text-xs text-muted-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: temperature ?? .2 }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 478,
											columnNumber: 27
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: getTemperatureDescription(temperature ?? .2) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 479,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 477,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 475,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 474,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 470,
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
								lineNumber: 485,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 484,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Instruções do agente (Prompt Principal)",
							helper: "Define a personalidade, função, tom de voz e comportamento do agente.",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
								rows: 6,
								value: instructions,
								onChange: (e) => setInstructions(e.target.value),
								placeholder: "Você é um atendente da Cubo.Chat. Responda de forma objetiva, educada e em português."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 488,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 487,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid md:grid-cols-2 gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Mensagem quando não souber responder",
								helper: "Resposta padrão quando a IA não encontra informação.",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
									rows: 3,
									value: noAnswerMessage,
									onChange: (e) => setNoAnswerMessage(e.target.value)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 492,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 491,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Instrução de segurança (Guardrails básicos)",
								helper: "Regras base obrigatórias incorporadas ao prompt.",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
									rows: 3,
									value: securityInstructions,
									onChange: (e) => setSecurityInstructions(e.target.value)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 495,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 494,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 490,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10 mt-4",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "space-y-0.5 max-w-[80%]",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "use-rag-production",
										className: "text-base font-medium cursor-pointer",
										children: "Usar conhecimento preparado no atendimento real"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 501,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-sm text-muted-foreground",
										children: "Quando ativado, o agente buscará informações nos conhecimentos preparados antes de responder no atendimento real. Use somente após testar no Preview."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 504,
										columnNumber: 23
									}, this),
									ragEnabled && knowledge.filter((k) => k.status === "ACTIVE" && k.processingStatus === "READY").length === 0 && /* @__PURE__ */ (void 0)("div", {
										className: "text-amber-600 text-xs mt-2 flex items-center",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-3 w-3 mr-1" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 508,
											columnNumber: 27
										}, this), "Você não possui conhecimentos ATIVOS e PREPARADOS. O agente responderá normalmente sem contexto até que os arquivos estejam prontos."]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 507,
										columnNumber: 133
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 500,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
								id: "use-rag-production",
								checked: ragEnabled,
								onCheckedChange: setRagEnabled
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 512,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 499,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 469,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 468,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 467,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "conhecimento",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
					className: "flex flex-row items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-base",
						children: "Base de Conhecimento Ativa"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 521,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
						open: isAddingKnowledge,
						onOpenChange: setIsAddingKnowledge,
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							size: "sm",
							onClick: handleOpenNewKnowledge,
							disabled: !selectedAssistantId,
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4 mr-2" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 524,
								columnNumber: 23
							}, this), " Adicionar conhecimento"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 523,
							columnNumber: 21
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
							className: "max-w-xl",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: knowledgeFormId ? "Editar Conhecimento" : "Adicionar Conhecimento" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 528,
									columnNumber: 25
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 527,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "grid gap-4 py-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Título",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
												value: knowledgeFormTitle,
												onChange: (e) => setKnowledgeFormTitle(e.target.value)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 532,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 531,
											columnNumber: 25
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Tipo de conhecimento",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
												value: knowledgeFormType,
												onValueChange: (val) => setKnowledgeFormType(val),
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 536,
													columnNumber: 44
												}, this) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 536,
													columnNumber: 29
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
														value: "TEXT",
														children: "Texto manual"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 538,
														columnNumber: 31
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
														value: "URL",
														children: "URL (Site)"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 539,
														columnNumber: 31
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
														value: "CONVERSATION",
														children: "Conversa de exemplo"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 540,
														columnNumber: 31
													}, this)
												] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 537,
													columnNumber: 29
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 535,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 534,
											columnNumber: 25
										}, this),
										knowledgeFormType === "URL" && /* @__PURE__ */ (void 0)(Field, {
											label: "URL",
											children: /* @__PURE__ */ (void 0)(Input, {
												placeholder: "https://exemplo.com/faq",
												value: knowledgeFormUrl,
												onChange: (e) => setKnowledgeFormUrl(e.target.value)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 545,
												columnNumber: 29
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 544,
											columnNumber: 57
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Conteúdo (Base para a IA ler)",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
												rows: 6,
												value: knowledgeFormContent,
												onChange: (e) => setKnowledgeFormContent(e.target.value)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 548,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 547,
											columnNumber: 25
										}, this),
										knowledgeFormId && /* @__PURE__ */ (void 0)("div", {
											className: "flex items-center gap-2 mt-2",
											children: [/* @__PURE__ */ (void 0)(Checkbox, {
												id: "knowledge-active",
												checked: knowledgeFormStatus === "ACTIVE",
												onCheckedChange: (c) => setKnowledgeFormStatus(c ? "ACTIVE" : "INACTIVE")
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 551,
												columnNumber: 31
											}, this), /* @__PURE__ */ (void 0)(Label, {
												htmlFor: "knowledge-active",
												children: "Este conhecimento está ativo e liberado para uso"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 552,
												columnNumber: 31
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 550,
											columnNumber: 45
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mt-2 border-l-2 pl-3 border-amber-300",
											children: "Este conteúdo ficará salvo na base de conhecimento do agente. A preparação para IA (vetorização) será feita em uma próxima etapa."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 554,
											columnNumber: 25
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 530,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									onClick: () => setIsAddingKnowledge(false),
									children: "Cancelar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 559,
									columnNumber: 26
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									onClick: () => void handleSaveKnowledge(),
									disabled: knowledgeSaving || !knowledgeFormTitle.trim() || !knowledgeFormContent.trim(),
									children: knowledgeSaving ? "Salvando..." : "Salvar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 560,
									columnNumber: 26
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 558,
									columnNumber: 23
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 526,
							columnNumber: 21
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 522,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 520,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 pt-0 space-y-3",
					children: [!selectedAssistantId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
						title: "Agente não salvo",
						description: "Salve o agente primeiro antes de adicionar conhecimentos."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 568,
						columnNumber: 43
					}, this) : knowledge.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
						title: "Sem conhecimento carregado",
						description: "Adicione conhecimentos para que o agente tenha contexto sobre sua empresa."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 568,
						columnNumber: 182
					}, this) : knowledge.map((item) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex-1 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "font-medium cursor-pointer hover:underline",
								onClick: () => handleOpenEditKnowledge(item),
								children: item.title
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 570,
								columnNumber: 27
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center gap-2 mt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-xs px-2 py-0.5 bg-muted rounded-md border",
										children: item.metadata?.type === "URL" ? "URL" : item.metadata?.type === "CONVERSATION" ? "Conversa de Exemplo" : "Texto Manual"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 572,
										columnNumber: 29
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-xs text-muted-foreground",
										children: ["Atualizado em ", new Date(item.updatedAt).toLocaleDateString()]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 575,
										columnNumber: 29
									}, this),
									item.processingStatus === "READY" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md",
										children: [
											"Pronto (",
											item.chunkCount,
											" blocos)"
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 578,
										columnNumber: 67
									}, this),
									item.processingStatus === "PROCESSING" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md",
										children: "Processando..."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 579,
										columnNumber: 72
									}, this),
									item.processingStatus === "ERROR" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-md",
										title: item.processingError || "Erro desconhecido",
										children: "Erro"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 580,
										columnNumber: 67
									}, this),
									item.processingStatus === "DRAFT" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md",
										children: "Pendente"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 581,
										columnNumber: 67
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 571,
								columnNumber: 27
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 569,
							columnNumber: 25
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: item.status === "ACTIVE" ? "ativo" : "pausado" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 585,
									columnNumber: 27
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "secondary",
									size: "sm",
									onClick: () => void handlePrepareForAI(item),
									disabled: preparingKnowledgeId === item.id || item.status === "INACTIVE",
									children: preparingKnowledgeId === item.id ? "Preparando..." : item.processingStatus === "ERROR" ? "Tentar Novamente" : item.processingStatus === "READY" ? "Reprocessar IA" : "Preparar para IA"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 586,
									columnNumber: 27
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => handleOpenEditKnowledge(item),
									children: "Editar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 589,
									columnNumber: 27
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 584,
							columnNumber: 25
						}, this)]
					}, item.id, true, {
						fileName: _jsxFileName,
						lineNumber: 568,
						columnNumber: 345
					}, this)), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "pt-4 border-t flex justify-end",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							asChild: true,
							variant: "outline",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
								to: "/conhecimento",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link2, { className: "h-4 w-4 mr-2" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 595,
									columnNumber: 25
								}, this), " Gerenciar Base de Conhecimento"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 594,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 593,
							columnNumber: 21
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 592,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 567,
					columnNumber: 17
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 519,
					columnNumber: 15
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
					className: "mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-base",
						children: "Testar busca no conhecimento"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 605,
						columnNumber: 19
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 604,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "p-6 pt-0 space-y-4",
						children: readyKnowledgeCount === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 609,
								columnNumber: 23
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "text-sm font-medium",
								children: "Você precisa ter pelo menos um conhecimento preparado (Pronto) para testar a busca."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 610,
								columnNumber: 23
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 608,
							columnNumber: 48
						}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									placeholder: "Digite uma pergunta para testar a busca semântica...",
									value: searchQuery,
									onChange: (e) => setSearchQuery(e.target.value),
									onKeyDown: (e) => e.key === "Enter" && handleSearchKnowledge()
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 613,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									onClick: () => void handleSearchKnowledge(),
									disabled: isSearching || !searchQuery.trim(),
									children: isSearching ? "Buscando..." : "Buscar relevante"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 614,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 612,
								columnNumber: 23
							}, this),
							searchError && /* @__PURE__ */ (void 0)("div", {
								className: "text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-lg",
								children: searchError
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 619,
								columnNumber: 39
							}, this),
							searchResults && searchResults.length > 0 && /* @__PURE__ */ (void 0)("div", {
								className: "space-y-3 mt-4",
								children: [/* @__PURE__ */ (void 0)("div", {
									className: "text-sm font-medium",
									children: "Resultados encontrados:"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 624,
									columnNumber: 27
								}, this), searchResults.map((res, i) => /* @__PURE__ */ (void 0)("div", {
									className: "p-3 border rounded-lg bg-muted/20 space-y-2",
									children: [/* @__PURE__ */ (void 0)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (void 0)("div", {
											className: "font-medium text-sm",
											children: [
												"#",
												i + 1,
												" - ",
												res.knowledgeTitle
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 627,
											columnNumber: 33
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-semibold",
											children: [
												"Score: ",
												(res.score * 100).toFixed(1),
												"%"
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 630,
											columnNumber: 33
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 626,
										columnNumber: 31
									}, this), /* @__PURE__ */ (void 0)("div", {
										className: "text-sm text-muted-foreground italic border-l-2 pl-2",
										children: [
											"\"",
											res.contentPreview,
											"\""
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 634,
										columnNumber: 31
									}, this)]
								}, res.chunkId, true, {
									fileName: _jsxFileName,
									lineNumber: 625,
									columnNumber: 58
								}, this))]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 623,
								columnNumber: 69
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 611,
							columnNumber: 30
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 607,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 603,
					columnNumber: 15
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 518,
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
						lineNumber: 647,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 646,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 645,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 644,
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
						lineNumber: 655,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 654,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 653,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 652,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "seguranca",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
					className: "flex flex-row items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-base",
						children: "Regras de Segurança"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 663,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
						open: isAddingSecurityRule,
						onOpenChange: setIsAddingSecurityRule,
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								size: "sm",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4 mr-2" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 666,
									columnNumber: 41
								}, this), " Adicionar regra de segurança"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 666,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 665,
							columnNumber: 21
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: "Nova Regra de Segurança" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 670,
								columnNumber: 25
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 669,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "space-y-4 py-4",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Nome da regra",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, { placeholder: "Ex: Não divulgar descontos" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 674,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 673,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Tipo da regra",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										defaultValue: "bloquear",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 678,
											columnNumber: 44
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 678,
											columnNumber: 29
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "bloquear",
												children: "Bloquear assunto"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 680,
												columnNumber: 31
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "nao-inventar",
												children: "Não inventar resposta"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 681,
												columnNumber: 31
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "transferir",
												children: "Transferir para humano"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 682,
												columnNumber: 31
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 679,
											columnNumber: 29
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 677,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 676,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 672,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								onClick: () => setIsAddingSecurityRule(false),
								children: "Cancelar"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 688,
								columnNumber: 25
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								onClick: () => setIsAddingSecurityRule(false),
								children: "Salvar regra"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 689,
								columnNumber: 25
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 687,
								columnNumber: 23
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 668,
							columnNumber: 21
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 664,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 662,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 pt-0",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-3",
						children: [securityRules.map((rule) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex flex-col sm:flex-row gap-4 p-4 border rounded-lg",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "font-medium flex items-center gap-2",
									children: [rule.name, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
										variant: "outline",
										children: rule.type
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 700,
										columnNumber: 29
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 698,
									columnNumber: 27
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "text-sm text-muted-foreground mt-1",
									children: rule.instruction
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 702,
									columnNumber: 27
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 697,
								columnNumber: 25
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "text-xs font-medium",
									children: rule.active ? "Ativa" : "Inativa"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 705,
									columnNumber: 27
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Checkbox, {
									checked: rule.active,
									onCheckedChange: (c) => {
										setSecurityRules((prev) => prev.map((r) => r.id === rule.id ? {
											...r,
											active: !!c
										} : r));
									}
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 706,
									columnNumber: 27
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 704,
								columnNumber: 25
							}, this)]
						}, rule.id, true, {
							fileName: _jsxFileName,
							lineNumber: 696,
							columnNumber: 48
						}, this)), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "pt-4 border-t space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "text-sm font-medium",
									children: "Filtros Nativos do Sistema"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 716,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
									label: "Não responder sem base de conhecimento",
									desc: "Mantido no runtime determinístico do backend",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 717,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
									label: "Não chamar IA externa",
									desc: "Nenhuma integração com provedores é feita no frontend",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 718,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
									label: "Não expor segredos",
									desc: "Todos os tokens continuam apenas no backend",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 719,
									columnNumber: 23
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 715,
							columnNumber: 21
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 695,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 694,
					columnNumber: 17
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 661,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 660,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "publicacao",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid md:grid-cols-2 gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
						className: "md:col-span-1",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
							className: "text-base",
							children: "Revisão Final"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 730,
							columnNumber: 21
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 729,
							columnNumber: 19
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
							className: "space-y-4",
							children: [
								!name.trim() && /* @__PURE__ */ (void 0)("div", {
									className: "flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200",
									children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 734,
										columnNumber: 25
									}, this), /* @__PURE__ */ (void 0)("span", {
										className: "text-sm font-medium",
										children: "O nome do agente é obrigatório."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 735,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 733,
									columnNumber: 38
								}, this),
								!instructions.trim() && /* @__PURE__ */ (void 0)("div", {
									className: "flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200",
									children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 738,
										columnNumber: 25
									}, this), /* @__PURE__ */ (void 0)("span", {
										className: "text-sm font-medium",
										children: "Você está usando o prompt padrão do sistema. Recomendamos personalizar as instruções."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 739,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 737,
									columnNumber: 46
								}, this),
								activeKnowledgeCount === 0 && /* @__PURE__ */ (void 0)("div", {
									className: "flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200",
									children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 742,
										columnNumber: 25
									}, this), /* @__PURE__ */ (void 0)("span", {
										className: "text-sm font-medium",
										children: "Nenhum conhecimento ativo foi adicionado. O agente responderá apenas com base no prompt."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 743,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 741,
									columnNumber: 52
								}, this),
								activeKnowledgeCount > 0 && readyKnowledgeCount === 0 && /* @__PURE__ */ (void 0)("div", {
									className: "flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200",
									children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 746,
										columnNumber: 25
									}, this), /* @__PURE__ */ (void 0)("span", {
										className: "text-sm font-medium",
										children: "O agente ainda não possui conhecimento preparado para IA. Ele responderá apenas com base no prompt."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 747,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 745,
									columnNumber: 79
								}, this),
								draftKnowledgeCount > 0 && readyKnowledgeCount > 0 && /* @__PURE__ */ (void 0)("div", {
									className: "flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200",
									children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 750,
										columnNumber: 25
									}, this), /* @__PURE__ */ (void 0)("span", {
										className: "text-sm font-medium",
										children: "Existem conhecimentos ativos que ainda não foram preparados para IA."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 751,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 749,
									columnNumber: 76
								}, this),
								errorKnowledgeCount > 0 && /* @__PURE__ */ (void 0)("div", {
									className: "flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200",
									children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 754,
										columnNumber: 25
									}, this), /* @__PURE__ */ (void 0)("span", {
										className: "text-sm font-medium",
										children: "Alguns conhecimentos falharam na preparação. Revise antes de publicar."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 755,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 753,
									columnNumber: 49
								}, this),
								knowledge.filter((k) => k.status === "INACTIVE").length > 0 && /* @__PURE__ */ (void 0)("div", {
									className: "flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200",
									children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 758,
										columnNumber: 25
									}, this), /* @__PURE__ */ (void 0)("span", {
										className: "text-sm font-medium",
										children: "Você tem conhecimentos inativos que não serão utilizados pela IA."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 759,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 757,
									columnNumber: 83
								}, this),
								readyKnowledgeCount > 0 && /* @__PURE__ */ (void 0)("div", {
									className: `flex items-center gap-2 p-3 rounded-lg border ${ragEnabled ? "text-green-700 bg-green-50 border-green-200" : "text-blue-600 bg-blue-50 border-blue-200"}`,
									children: /* @__PURE__ */ (void 0)("span", {
										className: "text-sm font-medium",
										children: ragEnabled ? "Os conhecimentos preparados estão ATIVOS para o atendimento real! A IA usará esses documentos para responder." : "Os conhecimentos preparados podem ser testados na aba Preview. A integração real com a IA está DESATIVADA."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 762,
										columnNumber: 25
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 761,
									columnNumber: 49
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-1 bg-muted/30 p-4 rounded-lg border",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Empresa",
											value: company?.name ?? "Tenant atual"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 768,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Nome do Agente",
											value: name || "Não definido"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 769,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Status Planejado",
											value: isActive ? "Ativo" : "Inativo"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 770,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Modelo da IA",
											value: model || "Padrão do sistema"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 771,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Temperatura",
											value: `${temperature ?? .2} - ${getTemperatureDescription(temperature ?? .2)}`
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 772,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Mensagem inicial",
											value: initialMessage.trim() ? "Configurada" : "Não configurada"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 773,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Prompt Principal",
											value: instructions.trim() ? "Configurado" : "Padrão do sistema"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 774,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Mensagem fallback",
											value: "Configurada"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 775,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Conhecimento Ativo",
											value: `${activeKnowledgeCount} itens (${readyKnowledgeCount} preparados)`
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 776,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Conhecimento no Atendimento Real",
											value: ragEnabled ? "Ativado" : "Desativado"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 777,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
											label: "Regras de Segurança",
											value: `${securityRules.filter((r) => r.active).length} ativas`
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 778,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 767,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "pt-4 space-y-4 border-t",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center space-x-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Checkbox, {
											id: "confirm-review",
											checked: isReviewConfirmed,
											onCheckedChange: (c) => setIsReviewConfirmed(!!c)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 783,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "confirm-review",
											className: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
											children: "Confirmo que revisei as alterações e desejo salvar este agente."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 784,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 782,
										columnNumber: 23
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										className: "w-full",
										onClick: () => void handleSave(),
										disabled: saving || !name.trim() || !isReviewConfirmed,
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4 mr-2" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 790,
											columnNumber: 25
										}, this), " Confirmar e salvar alterações"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 789,
										columnNumber: 23
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 781,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 732,
							columnNumber: 19
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 728,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
						className: "md:col-span-1",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
							className: "text-base",
							children: "Exemplo de Conversa (Simulação)"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 798,
							columnNumber: 21
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 797,
							columnNumber: 19
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
							className: "space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "p-4 rounded-lg border bg-muted/20 space-y-4",
								children: [
									initialMessage.trim() && /* @__PURE__ */ (void 0)("div", {
										className: "flex gap-3",
										children: [/* @__PURE__ */ (void 0)("div", {
											className: "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0",
											children: "IA"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 803,
											columnNumber: 27
										}, this), /* @__PURE__ */ (void 0)("div", {
											className: "bg-primary/5 border rounded-lg p-3 text-sm flex-1",
											children: initialMessage
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 806,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 802,
										columnNumber: 49
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex flex-row-reverse gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0",
											children: "VC"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 812,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "bg-muted border rounded-lg p-3 text-sm",
											children: previewQuestion
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 815,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 811,
										columnNumber: 23
									}, this),
									previewResult && /* @__PURE__ */ (void 0)("div", {
										className: "flex gap-3",
										children: [/* @__PURE__ */ (void 0)("div", {
											className: "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0",
											children: "IA"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 821,
											columnNumber: 27
										}, this), /* @__PURE__ */ (void 0)("div", {
											className: "bg-primary/5 border rounded-lg p-3 text-sm flex-1 space-y-2",
											children: [
												/* @__PURE__ */ (void 0)("div", { children: previewResult.answer }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 825,
													columnNumber: 29
												}, this),
												previewResult.sources.length > 0 && /* @__PURE__ */ (void 0)("div", {
													className: "mt-3 pt-3 border-t text-xs",
													children: [/* @__PURE__ */ (void 0)("div", {
														className: "font-medium text-muted-foreground mb-1",
														children: "Fontes manuais sugeridas:"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 827,
														columnNumber: 33
													}, this), previewResult.sources.map((source) => /* @__PURE__ */ (void 0)("div", {
														className: "truncate",
														children: ["• ", source.title]
													}, source.id, true, {
														fileName: _jsxFileName,
														lineNumber: 828,
														columnNumber: 70
													}, this))]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 826,
													columnNumber: 66
												}, this),
												previewResult.ragEnabled && /* @__PURE__ */ (void 0)("div", {
													className: "mt-3 pt-3 border-t text-xs",
													children: [/* @__PURE__ */ (void 0)("div", {
														className: "font-medium text-blue-600 mb-1 flex items-center gap-1",
														children: [/* @__PURE__ */ (void 0)(Sparkles, { className: "h-3 w-3" }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 834,
															columnNumber: 35
														}, this), " Conhecimentos usados neste teste:"]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 833,
														columnNumber: 33
													}, this), previewResult.usedKnowledge && previewResult.usedKnowledge.length > 0 ? /* @__PURE__ */ (void 0)("div", {
														className: "space-y-2 mt-2",
														children: [previewResult.usedKnowledge.map((k) => /* @__PURE__ */ (void 0)("div", {
															className: "bg-blue-50/50 p-2 rounded border border-blue-100",
															children: [/* @__PURE__ */ (void 0)("div", {
																className: "flex justify-between items-start mb-1",
																children: [/* @__PURE__ */ (void 0)("div", {
																	className: "font-semibold text-blue-800 line-clamp-1",
																	children: k.title
																}, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 839,
																	columnNumber: 43
																}, this), /* @__PURE__ */ (void 0)(Badge, {
																	variant: "outline",
																	className: "text-[10px] py-0 px-1 shrink-0 bg-white",
																	children: [
																		"Score: ",
																		(k.score * 100).toFixed(1),
																		"%"
																	]
																}, void 0, true, {
																	fileName: _jsxFileName,
																	lineNumber: 840,
																	columnNumber: 43
																}, this)]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 838,
																columnNumber: 41
															}, this), /* @__PURE__ */ (void 0)("div", {
																className: "text-muted-foreground line-clamp-3 leading-relaxed",
																children: [
																	"\"",
																	k.contentPreview,
																	"\""
																]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 844,
																columnNumber: 41
															}, this)]
														}, k.chunkId, true, {
															fileName: _jsxFileName,
															lineNumber: 837,
															columnNumber: 75
														}, this)), /* @__PURE__ */ (void 0)("div", {
															className: "text-[10px] text-muted-foreground pt-1",
															children: ["Total de chunks escaneados: ", previewResult.totalChunksScanned]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 848,
															columnNumber: 37
														}, this)]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 836,
														columnNumber: 106
													}, this) : /* @__PURE__ */ (void 0)("div", {
														className: "text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 italic",
														children: "Nenhum conhecimento relevante foi encontrado para esta pergunta."
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 851,
														columnNumber: 44
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 832,
													columnNumber: 58
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 824,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 820,
										columnNumber: 41
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 801,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										className: "text-xs",
										children: "Faça uma pergunta para testar as respostas"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 860,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center space-x-2 px-1",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
											id: "use-rag-preview",
											checked: usePreparedKnowledge,
											onCheckedChange: setUsePreparedKnowledge
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 863,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "use-rag-preview",
											className: "text-xs text-muted-foreground cursor-pointer",
											children: "Usar conhecimento preparado neste teste"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 864,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 862,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: previewQuestion,
											onChange: (e) => setPreviewQuestion(e.target.value),
											onKeyDown: (e) => e.key === "Enter" && void handlePreview()
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 870,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
											onClick: () => void handlePreview(),
											disabled: !selectedAssistantId || previewLoading,
											variant: "secondary",
											children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4 w-4 mr-2" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 872,
													columnNumber: 27
												}, this),
												" ",
												previewLoading ? "Simulando..." : "Simular"
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 871,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 869,
										columnNumber: 23
									}, this),
									!selectedAssistantId && /* @__PURE__ */ (void 0)("p", {
										className: "text-[10px] text-muted-foreground",
										children: "Salve o agente primeiro para habilitar a simulação."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 875,
										columnNumber: 48
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 859,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 800,
							columnNumber: 19
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 796,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 727,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 726,
				columnNumber: 13
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 414,
		columnNumber: 11
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 384,
		columnNumber: 206
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 362,
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
				lineNumber: 897,
				columnNumber: 7
			}, this),
			children,
			helper ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-[11px] text-muted-foreground",
				children: helper
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 899,
				columnNumber: 17
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 896,
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
			lineNumber: 913,
			columnNumber: 9
		}, this), desc && /* @__PURE__ */ (void 0)("div", {
			className: "text-xs text-muted-foreground",
			children: desc
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 914,
			columnNumber: 18
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 912,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "h-8 w-8 rounded-full border grid place-items-center text-xs",
			children: defaultChecked ? "✓" : "—"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 916,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 911,
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
			lineNumber: 929,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "font-medium",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 930,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 928,
		columnNumber: 10
	}, this);
}
//#endregion
export { NovoAgente as component };
