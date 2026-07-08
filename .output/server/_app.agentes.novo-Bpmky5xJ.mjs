import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { a as Trigger2, i as Root2, n as Header, r as Item, t as Content2 } from "./_libs/@radix-ui/react-accordion+[...].mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { n as apiFetch } from "./_ssr/apiClient-Dme41CHA.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-CeW1PXo7.mjs";
import { At as Sparkles, F as Pause, Ft as CirclePlay, Mt as LoaderCircle, N as Pencil, Ot as TriangleAlert, T as Save, Tt as ArrowLeft, U as Link2, d as Trash, ht as Check, j as Plus, mt as ChevronDown } from "./_libs/lucide-react.mjs";
import { n as CheckboxIndicator, t as Checkbox$1 } from "./_libs/@radix-ui/react-checkbox+[...].mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-DVbabvC9.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { r as resolveOperationalAssistantId, t as filterOperationalAssistants } from "./_ssr/assistants-dUhtu6_2.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { t as backendAssistantsService } from "./_ssr/backendAssistantsService-ClhibY7I.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./_ssr/dialog-BQR4UioY.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { t as chatwootSettingsService } from "./_ssr/chatwootSettingsService-DbugyFLD.mjs";
import { t as Route } from "./_app.agentes.novo-B-1jV5oT.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./_ssr/tabs-Bfe67_Ib.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "./_libs/radix-ui__react-slider.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.agentes.novo-Bpmky5xJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName$6 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/field.tsx";
function Field({ label, children, className, helper }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: `space-y-2 ${className || ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, { children: label }, void 0, false, {
				fileName: _jsxFileName$6,
				lineNumber: 14,
				columnNumber: 7
			}, this),
			children,
			helper && /* @__PURE__ */ (void 0)("p", {
				className: "text-[0.8rem] text-muted-foreground",
				children: helper
			}, void 0, false, {
				fileName: _jsxFileName$6,
				lineNumber: 16,
				columnNumber: 18
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$6,
		lineNumber: 13,
		columnNumber: 5
	}, this);
}
var assistantBehaviorsService = {
	findByAssistantId: async (assistantId) => {
		try {
			return await apiFetch(`/assistants/${assistantId}/behavior`);
		} catch (error) {
			if (error.status === 404 || error.statusCode === 404) return null;
			throw error;
		}
	},
	upsert: async (assistantId, data) => {
		return await apiFetch(`/assistants/${assistantId}/behavior`, {
			method: "PUT",
			body: JSON.stringify(data),
			headers: { "Content-Type": "application/json" }
		});
	}
};
var _jsxFileName$5 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/assistant/AssistantBehaviorTab.tsx";
var DEFAULT_BEHAVIOR = {
	attendantName: "",
	showAttendantName: true,
	role: "",
	howItActs: "",
	personality: "",
	toneOfVoice: "",
	responseStyle: "whatsapp",
	emojiUsage: "low",
	greetingMessage: "",
	noInventInfo: true,
	unknownBehavior: "fallback",
	maxBlockLength: 300
};
function normalizeOptionalText(value) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}
function buildBehaviorPayload(behavior) {
	return {
		attendantName: normalizeOptionalText(behavior.attendantName),
		showAttendantName: behavior.showAttendantName ?? true,
		role: normalizeOptionalText(behavior.role),
		howItActs: normalizeOptionalText(behavior.howItActs),
		personality: normalizeOptionalText(behavior.personality),
		toneOfVoice: normalizeOptionalText(behavior.toneOfVoice),
		responseStyle: normalizeOptionalText(behavior.responseStyle) ?? "whatsapp",
		emojiUsage: normalizeOptionalText(behavior.emojiUsage) ?? "low",
		greetingMessage: normalizeOptionalText(behavior.greetingMessage),
		noInventInfo: behavior.noInventInfo ?? true,
		unknownBehavior: normalizeOptionalText(behavior.unknownBehavior) ?? "fallback",
		maxBlockLength: behavior.maxBlockLength ?? 300
	};
}
var AssistantBehaviorTab = (0, import_react.forwardRef)(({ assistantId }, ref) => {
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [behavior, setBehavior] = (0, import_react.useState)(DEFAULT_BEHAVIOR);
	(0, import_react.useEffect)(() => {
		if (!assistantId) {
			setBehavior(DEFAULT_BEHAVIOR);
			setLoading(false);
			return;
		}
		const loadBehavior = async () => {
			setLoading(true);
			try {
				const data = await assistantBehaviorsService.findByAssistantId(assistantId);
				if (data) setBehavior(buildBehaviorPayload(data));
				else setBehavior(DEFAULT_BEHAVIOR);
			} catch (error) {
				toast.error("Erro ao carregar comportamento da IA");
			} finally {
				setLoading(false);
			}
		};
		loadBehavior();
	}, [assistantId]);
	(0, import_react.useImperativeHandle)(ref, () => ({ saveBehavior: async (newId) => {
		const targetId = newId || assistantId;
		if (!targetId) return;
		try {
			const payload = buildBehaviorPayload(behavior);
			setBehavior(buildBehaviorPayload(await assistantBehaviorsService.upsert(targetId, payload)));
		} catch (error) {
			console.error("Erro ao salvar comportamento:", error);
			throw error;
		}
	} }));
	const handleSave = async () => {
		if (!assistantId) return;
		setSaving(true);
		try {
			const payload = buildBehaviorPayload(behavior);
			setBehavior(buildBehaviorPayload(await assistantBehaviorsService.upsert(assistantId, payload)));
			toast.success("Comportamento salvo com sucesso!");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Erro ao salvar comportamento";
			toast.error(message);
		} finally {
			setSaving(false);
		}
	};
	if (!assistantId) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-6",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "text-muted-foreground text-center py-8",
			children: "Salve o assistente primeiro para configurar o comportamento da IA."
		}, void 0, false, {
			fileName: _jsxFileName$5,
			lineNumber: 150,
			columnNumber: 13
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 149,
		columnNumber: 11
	}, void 0) }, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 148,
		columnNumber: 9
	}, void 0);
	if (loading) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-6 flex justify-center items-center h-40",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
			fileName: _jsxFileName$5,
			lineNumber: 162,
			columnNumber: 13
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 161,
		columnNumber: 11
	}, void 0) }, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 160,
		columnNumber: 9
	}, void 0);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-6 grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid md:grid-cols-2 gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Nome da Atendente",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
						value: behavior.attendantName || "",
						onChange: (e) => setBehavior({
							...behavior,
							attendantName: e.target.value
						}),
						placeholder: "Ex: Giovanna"
					}, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 173,
						columnNumber: 15
					}, void 0)
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 172,
					columnNumber: 13
				}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Mostrar nome da atendente",
					className: "flex flex-col justify-center mt-6",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center space-x-2",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
							checked: behavior.showAttendantName,
							onCheckedChange: (c) => setBehavior({
								...behavior,
								showAttendantName: c
							})
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 181,
							columnNumber: 17
						}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "text-sm",
							children: "Exibir na resposta"
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 185,
							columnNumber: 17
						}, void 0)]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 180,
						columnNumber: 15
					}, void 0)
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 179,
					columnNumber: 13
				}, void 0)]
			}, void 0, true, {
				fileName: _jsxFileName$5,
				lineNumber: 171,
				columnNumber: 11
			}, void 0),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Papel / Cargo",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
					value: behavior.role || "",
					onChange: (e) => setBehavior({
						...behavior,
						role: e.target.value
					}),
					placeholder: "Ex: Secretária virtual, Atendente de suporte"
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 191,
					columnNumber: 13
				}, void 0)
			}, void 0, false, {
				fileName: _jsxFileName$5,
				lineNumber: 190,
				columnNumber: 11
			}, void 0),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Como ela atua",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
					value: behavior.howItActs || "",
					onChange: (e) => setBehavior({
						...behavior,
						howItActs: e.target.value
					}),
					placeholder: "Ex: Atende clientes pelo WhatsApp, tira dúvidas e agenda horários.",
					rows: 3
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 199,
					columnNumber: 13
				}, void 0)
			}, void 0, false, {
				fileName: _jsxFileName$5,
				lineNumber: 198,
				columnNumber: 11
			}, void 0),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid md:grid-cols-2 gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Uso de Emojis",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: behavior.emojiUsage || "low",
						onValueChange: (val) => setBehavior({
							...behavior,
							emojiUsage: val
						}),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione" }, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 214,
							columnNumber: 19
						}, void 0) }, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 213,
							columnNumber: 17
						}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "none",
								children: "Nenhum (Proibido)"
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 217,
								columnNumber: 19
							}, void 0),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "low",
								children: "Baixo (Raramente)"
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 218,
								columnNumber: 19
							}, void 0),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "moderate",
								children: "Moderado"
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 219,
								columnNumber: 19
							}, void 0)
						] }, void 0, true, {
							fileName: _jsxFileName$5,
							lineNumber: 216,
							columnNumber: 17
						}, void 0)]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 209,
						columnNumber: 15
					}, void 0)
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 208,
					columnNumber: 13
				}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Comportamento Desconhecido",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
						value: behavior.unknownBehavior || "fallback",
						onValueChange: (val) => setBehavior({
							...behavior,
							unknownBehavior: val
						}),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione" }, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 229,
							columnNumber: 19
						}, void 0) }, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 228,
							columnNumber: 17
						}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "fallback",
							children: "Responder mensagem padrão (Fallback)"
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 232,
							columnNumber: 19
						}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "handoff",
							children: "Transferir para humano (Handoff)"
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 233,
							columnNumber: 19
						}, void 0)] }, void 0, true, {
							fileName: _jsxFileName$5,
							lineNumber: 231,
							columnNumber: 17
						}, void 0)]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 224,
						columnNumber: 15
					}, void 0)
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 223,
					columnNumber: 13
				}, void 0)]
			}, void 0, true, {
				fileName: _jsxFileName$5,
				lineNumber: 207,
				columnNumber: 11
			}, void 0),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex justify-end pt-4 border-t",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: handleSave,
					disabled: saving,
					children: [saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 241,
						columnNumber: 26
					}, void 0), "Salvar Comportamento"]
				}, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 240,
					columnNumber: 13
				}, void 0)
			}, void 0, false, {
				fileName: _jsxFileName$5,
				lineNumber: 239,
				columnNumber: 11
			}, void 0)
		]
	}, void 0, true, {
		fileName: _jsxFileName$5,
		lineNumber: 170,
		columnNumber: 9
	}, void 0) }, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 169,
		columnNumber: 7
	}, void 0);
});
var assistantFlowsService = {
	findAll: async (assistantId) => {
		return await apiFetch(`/assistants/${assistantId}/flows`);
	},
	findOne: async (assistantId, flowId) => {
		return await apiFetch(`/assistants/${assistantId}/flows/${flowId}`);
	},
	create: async (assistantId, data) => {
		return await apiFetch(`/assistants/${assistantId}/flows`, {
			method: "POST",
			body: JSON.stringify(data),
			headers: { "Content-Type": "application/json" }
		});
	},
	update: async (assistantId, flowId, data) => {
		return await apiFetch(`/assistants/${assistantId}/flows/${flowId}`, {
			method: "PUT",
			body: JSON.stringify(data),
			headers: { "Content-Type": "application/json" }
		});
	},
	delete: async (assistantId, flowId) => {
		await apiFetch(`/assistants/${assistantId}/flows/${flowId}`, { method: "DELETE" });
	}
};
var _jsxFileName$4 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/assistant/AssistantFlowsTab.tsx";
var EMPTY_CALENDAR_SCOPE_FORM = {
	category: "",
	resourceType: "",
	attribute: "",
	durationMinutes: ""
};
function buildToolContextFromCalendarScope(scope) {
	const category = scope.category.trim();
	const resourceType = scope.resourceType.trim();
	const attribute = scope.attribute.trim();
	const durationValue = scope.durationMinutes.trim();
	const durationMinutes = durationValue ? Number(durationValue) : null;
	if (!category && !resourceType && !attribute && !durationMinutes) return null;
	return { calendar: {
		...category ? {
			category,
			sportType: category
		} : {},
		...resourceType ? { resourceType } : {},
		...attribute ? { attribute } : {},
		...durationMinutes && Number.isFinite(durationMinutes) ? { durationMinutes } : {}
	} };
}
function parseCalendarScopeForm(toolContext) {
	const calendar = toolContext?.calendar;
	return {
		category: calendar?.category ?? calendar?.sportType ?? "",
		resourceType: calendar?.resourceType ?? "",
		attribute: calendar?.attribute ?? "",
		durationMinutes: calendar?.durationMinutes !== null && calendar?.durationMinutes !== void 0 ? String(calendar.durationMinutes) : ""
	};
}
function AssistantFlowsTab({ assistantId }) {
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [flows, setFlows] = (0, import_react.useState)([]);
	const [isModalOpen, setIsModalOpen] = (0, import_react.useState)(false);
	const [editingFlow, setEditingFlow] = (0, import_react.useState)(null);
	const [calendarScopeForm, setCalendarScopeForm] = (0, import_react.useState)(EMPTY_CALENDAR_SCOPE_FORM);
	const parseJsonToLines = (json) => {
		try {
			const parsed = JSON.parse(json || "[]");
			if (Array.isArray(parsed)) return parsed.join("\n");
		} catch {}
		return json || "";
	};
	const parseLinesToJson = (lines) => {
		const arr = lines.split("\n").map((line) => line.trim()).filter(Boolean);
		return JSON.stringify(arr);
	};
	const [formData, setFormData] = (0, import_react.useState)({
		name: "",
		description: "",
		priority: 0,
		triggerKeywords: "",
		triggerDescription: "",
		triggerExamples: "",
		flowInstructions: "",
		allowedToolSlugs: "",
		knowledgeScope: "",
		toolContext: null,
		finalAction: "respond",
		fixedMessage: "",
		handoffTeamId: "",
		handoffTeamName: "",
		chatwootLabels: "",
		autoRespond: true,
		requiresHuman: false,
		active: true
	});
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!assistantId) {
			setLoading(false);
			return;
		}
		loadFlows();
	}, [assistantId]);
	const loadFlows = async () => {
		setLoading(true);
		try {
			setFlows(await assistantFlowsService.findAll(assistantId));
		} catch (error) {
			toast.error("Erro ao carregar fluxos");
		} finally {
			setLoading(false);
		}
	};
	const handleOpenNew = () => {
		setEditingFlow(null);
		setCalendarScopeForm(EMPTY_CALENDAR_SCOPE_FORM);
		setFormData({
			name: "",
			description: "",
			priority: 0,
			triggerKeywords: "[\"palavra\"]",
			triggerDescription: "",
			triggerExamples: "",
			flowInstructions: "",
			allowedToolSlugs: "",
			knowledgeScope: "",
			toolContext: null,
			finalAction: "respond",
			fixedMessage: "",
			handoffTeamId: "",
			handoffTeamName: "",
			chatwootLabels: "",
			autoRespond: true,
			requiresHuman: false,
			active: true
		});
		setIsModalOpen(true);
	};
	const handleOpenEdit = (flow) => {
		setEditingFlow(flow);
		setCalendarScopeForm(parseCalendarScopeForm(flow.toolContext));
		setFormData({
			name: flow.name,
			description: flow.description || "",
			priority: flow.priority,
			triggerKeywords: flow.triggerKeywords || "",
			triggerDescription: flow.triggerDescription || "",
			triggerExamples: flow.triggerExamples || "",
			flowInstructions: flow.flowInstructions || "",
			allowedToolSlugs: flow.allowedToolSlugs || "",
			knowledgeScope: flow.knowledgeScope || "",
			toolContext: flow.toolContext || null,
			finalAction: flow.finalAction || "respond",
			fixedMessage: flow.fixedMessage || "",
			handoffTeamId: flow.handoffTeamId || "",
			handoffTeamName: flow.handoffTeamName || "",
			chatwootLabels: flow.chatwootLabels || "",
			autoRespond: flow.autoRespond,
			requiresHuman: flow.requiresHuman,
			active: flow.active
		});
		setIsModalOpen(true);
	};
	const handleDelete = async (flowId) => {
		if (!assistantId) return;
		if (!confirm("Tem certeza que deseja excluir este fluxo?")) return;
		try {
			await assistantFlowsService.delete(assistantId, flowId);
			toast.success("Fluxo excluído");
			loadFlows();
		} catch (error) {
			toast.error("Erro ao excluir fluxo");
		}
	};
	const handleSave = async () => {
		if (!assistantId) return;
		if (!formData.name) {
			toast.error("O nome do fluxo é obrigatório");
			return;
		}
		const payload = {
			...formData,
			toolContext: buildToolContextFromCalendarScope(calendarScopeForm)
		};
		setSaving(true);
		try {
			if (editingFlow) {
				await assistantFlowsService.update(assistantId, editingFlow.id, payload);
				toast.success("Fluxo atualizado");
			} else {
				await assistantFlowsService.create(assistantId, payload);
				toast.success("Fluxo criado");
			}
			setIsModalOpen(false);
			loadFlows();
		} catch (error) {
			toast.error("Erro ao salvar fluxo");
		} finally {
			setSaving(false);
		}
	};
	if (!assistantId) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-6",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "text-muted-foreground text-center py-8",
			children: "Salve o assistente primeiro para configurar os fluxos."
		}, void 0, false, {
			fileName: _jsxFileName$4,
			lineNumber: 248,
			columnNumber: 11
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$4,
		lineNumber: 247,
		columnNumber: 9
	}, this) }, void 0, false, {
		fileName: _jsxFileName$4,
		lineNumber: 246,
		columnNumber: 7
	}, this);
	if (loading) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-6 flex justify-center items-center h-40",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
			fileName: _jsxFileName$4,
			lineNumber: 260,
			columnNumber: 11
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$4,
		lineNumber: 259,
		columnNumber: 9
	}, this) }, void 0, false, {
		fileName: _jsxFileName$4,
		lineNumber: 258,
		columnNumber: 7
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex justify-between items-start mb-6",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "max-w-3xl pr-4",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
						className: "text-lg font-medium",
						children: "Fluxos da IA"
					}, void 0, false, {
						fileName: _jsxFileName$4,
						lineNumber: 270,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground mt-1",
						children: "Fluxos são regras específicas acionadas por intenção. Use fluxos para assuntos como agendamento, financeiro, restaurante, Goomer Delivery ou atendimento humano. O prompt global continua valendo, mas o fluxo selecionado pode limitar ferramentas, usar mensagem fixa ou encaminhar para humano."
					}, void 0, false, {
						fileName: _jsxFileName$4,
						lineNumber: 271,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$4,
					lineNumber: 269,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: handleOpenNew,
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "mr-2 h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName$4,
						lineNumber: 279,
						columnNumber: 11
					}, this), "Novo Fluxo"]
				}, void 0, true, {
					fileName: _jsxFileName$4,
					lineNumber: 278,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$4,
				lineNumber: 268,
				columnNumber: 7
			}, this),
			flows.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-6 text-center text-muted-foreground py-12",
				children: "Nenhum fluxo cadastrado. A IA responderá normalmente conforme o comportamento base."
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 286,
				columnNumber: 11
			}, this) }, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 285,
				columnNumber: 9
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-4",
				children: flows.map((flow) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
					className: "overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "p-4 flex items-center justify-between bg-accent/5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-2 mb-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", {
									className: "font-semibold",
									children: flow.name
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 297,
									columnNumber: 21
								}, this),
								!flow.active && /* @__PURE__ */ (void 0)(Badge, {
									variant: "secondary",
									children: "Inativo"
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 298,
									columnNumber: 38
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
									variant: "outline",
									children: ["Prioridade: ", flow.priority]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 299,
									columnNumber: 21
								}, this),
								flow.toolContext?.calendar?.category && /* @__PURE__ */ (void 0)(Badge, {
									variant: "outline",
									className: "border-primary/20 bg-primary/5 text-primary",
									children: ["Agenda: ", flow.toolContext.calendar.category]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 301,
									columnNumber: 23
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 296,
							columnNumber: 19
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-sm text-muted-foreground",
							children: flow.description
						}, void 0, false, {
							fileName: _jsxFileName$4,
							lineNumber: 309,
							columnNumber: 19
						}, this)] }, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 295,
							columnNumber: 17
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => handleOpenEdit(flow),
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 313,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$4,
								lineNumber: 312,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								size: "sm",
								className: "text-destructive",
								onClick: () => handleDelete(flow.id),
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 321,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$4,
								lineNumber: 315,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 311,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$4,
						lineNumber: 294,
						columnNumber: 15
					}, this)
				}, flow.id, false, {
					fileName: _jsxFileName$4,
					lineNumber: 293,
					columnNumber: 13
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 291,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
				open: isModalOpen,
				onOpenChange: setIsModalOpen,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
					className: "sm:max-w-[700px] max-h-[90vh] overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: editingFlow ? "Editar Fluxo" : "Novo Fluxo" }, void 0, false, {
							fileName: _jsxFileName$4,
							lineNumber: 333,
							columnNumber: 13
						}, this) }, void 0, false, {
							fileName: _jsxFileName$4,
							lineNumber: 332,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid gap-6 py-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "grid md:grid-cols-2 gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Nome do Fluxo *",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: formData.name,
											onChange: (e) => setFormData({
												...formData,
												name: e.target.value
											}),
											placeholder: "Ex: Agendamento Padel"
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 339,
											columnNumber: 17
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 338,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Prioridade",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											type: "number",
											value: formData.priority,
											onChange: (e) => setFormData({
												...formData,
												priority: parseInt(e.target.value) || 0
											})
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 346,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mt-1",
											children: "Maior número = avaliado primeiro."
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 353,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName$4,
										lineNumber: 345,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 337,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Descrição Interna",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: formData.description || "",
										onChange: (e) => setFormData({
											...formData,
											description: e.target.value
										}),
										placeholder: "Ex: Utilizado para marcar quadras de padel."
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 360,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 359,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "border-t pt-4",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", {
										className: "font-medium mb-3",
										children: "Gatilhos de Intenção"
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 368,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "grid md:grid-cols-2 gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Palavras que ativam este fluxo",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
												value: parseJsonToLines(formData.triggerKeywords),
												onChange: (e) => setFormData({
													...formData,
													triggerKeywords: parseLinesToJson(e.target.value)
												}),
												placeholder: "Ex:\nagendar\nmarcar quadra",
												rows: 4
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 371,
												columnNumber: 19
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
												className: "text-xs text-muted-foreground mt-1",
												children: "Uma palavra ou frase curta por linha."
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 382,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName$4,
											lineNumber: 370,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Quando usar este fluxo?",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
												value: formData.triggerDescription || "",
												onChange: (e) => setFormData({
													...formData,
													triggerDescription: e.target.value
												}),
												placeholder: "Ex: O cliente quer reservar um horário.",
												rows: 4
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 387,
												columnNumber: 19
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
												className: "text-xs text-muted-foreground mt-1",
												children: "Usado pela IA caso as palavras-chave falhem."
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 395,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName$4,
											lineNumber: 386,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName$4,
										lineNumber: 369,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 367,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "border-t pt-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", {
											className: "font-medium mb-3",
											children: "Execução do Fluxo"
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 403,
											columnNumber: 15
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Regras deste fluxo",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
												value: formData.flowInstructions || "",
												onChange: (e) => setFormData({
													...formData,
													flowInstructions: e.target.value
												}),
												placeholder: "Instruções adicionais que serão somadas ao prompt principal quando este fluxo for ativado.",
												rows: 4
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 405,
												columnNumber: 17
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 404,
											columnNumber: 15
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "grid md:grid-cols-2 gap-4 mt-4",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Ação Final",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
													value: formData.finalAction || "respond",
													onValueChange: (val) => setFormData({
														...formData,
														finalAction: val
													}),
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione" }, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 420,
														columnNumber: 23
													}, this) }, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 419,
														columnNumber: 21
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
															value: "respond",
															children: "A IA responde"
														}, void 0, false, {
															fileName: _jsxFileName$4,
															lineNumber: 423,
															columnNumber: 23
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
															value: "fixed_message",
															children: "Mensagem fixa"
														}, void 0, false, {
															fileName: _jsxFileName$4,
															lineNumber: 424,
															columnNumber: 23
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
															value: "handoff",
															children: "Encaminhar para humano"
														}, void 0, false, {
															fileName: _jsxFileName$4,
															lineNumber: 425,
															columnNumber: 23
														}, this)
													] }, void 0, true, {
														fileName: _jsxFileName$4,
														lineNumber: 422,
														columnNumber: 21
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName$4,
													lineNumber: 415,
													columnNumber: 19
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
													className: "text-xs text-muted-foreground mt-1",
													children: [
														formData.finalAction === "respond" && "Usa a IA normalmente com as regras e ferramentas permitidas.",
														formData.finalAction === "fixed_message" && "Responde exatamente o texto configurado, sem chamar LLM.",
														formData.finalAction === "handoff" && "Não deixa a IA tentar resolver sozinha."
													]
												}, void 0, true, {
													fileName: _jsxFileName$4,
													lineNumber: 428,
													columnNumber: 19
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName$4,
												lineNumber: 414,
												columnNumber: 17
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Ativo",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "flex items-center space-x-2 h-10",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
														checked: formData.active,
														onCheckedChange: (c) => setFormData({
															...formData,
															active: c
														})
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 439,
														columnNumber: 21
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
														className: "text-sm",
														children: "Fluxo ativado"
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 443,
														columnNumber: 21
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName$4,
													lineNumber: 438,
													columnNumber: 19
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 437,
												columnNumber: 17
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName$4,
											lineNumber: 413,
											columnNumber: 15
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 402,
									columnNumber: 13
								}, this),
								formData.finalAction === "fixed_message" && /* @__PURE__ */ (void 0)(Field, {
									label: "Mensagem Fixa",
									children: /* @__PURE__ */ (void 0)(Textarea, {
										value: formData.fixedMessage || "",
										onChange: (e) => setFormData({
											...formData,
											fixedMessage: e.target.value
										}),
										placeholder: "Mensagem exata a ser enviada ao cliente",
										rows: 2
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 451,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 450,
									columnNumber: 15
								}, this),
								formData.finalAction === "handoff" && /* @__PURE__ */ (void 0)(Field, {
									label: "Time de Transbordo (ID Chatwoot)",
									children: /* @__PURE__ */ (void 0)(Input, {
										value: formData.handoffTeamId || "",
										onChange: (e) => setFormData({
											...formData,
											handoffTeamId: e.target.value
										}),
										placeholder: "ID numérico do time no Chatwoot"
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 462,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 461,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "border-t pt-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", {
											className: "font-medium mb-3",
											children: "Escopo da Agenda"
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 471,
											columnNumber: 15
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mb-4",
											children: "Use estes campos para obrigar as ferramentas de agenda a consultar apenas recursos compatíveis com este fluxo."
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 472,
											columnNumber: 15
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "grid md:grid-cols-2 gap-4",
											children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
													label: "Categoria/modalidade da agenda",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
														value: calendarScopeForm.category,
														onChange: (e) => setCalendarScopeForm((current) => ({
															...current,
															category: e.target.value
														})),
														placeholder: "Ex: Padel, Beach Tennis, Restaurante"
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 478,
														columnNumber: 19
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 477,
													columnNumber: 17
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
													label: "Tipo de recurso",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
														value: calendarScopeForm.resourceType,
														onChange: (e) => setCalendarScopeForm((current) => ({
															...current,
															resourceType: e.target.value
														})),
														placeholder: "Ex: quadra, restaurante, aula"
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 490,
														columnNumber: 19
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 489,
													columnNumber: 17
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
													label: "Atributo",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
														value: calendarScopeForm.attribute,
														onChange: (e) => setCalendarScopeForm((current) => ({
															...current,
															attribute: e.target.value
														})),
														placeholder: "Ex: coberta, descoberta"
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 502,
														columnNumber: 19
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 501,
													columnNumber: 17
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
													label: "Duração padrão em minutos",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
														type: "number",
														min: 5,
														step: 5,
														value: calendarScopeForm.durationMinutes,
														onChange: (e) => setCalendarScopeForm((current) => ({
															...current,
															durationMinutes: e.target.value
														})),
														placeholder: "Ex: 60 ou 120"
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 514,
														columnNumber: 19
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 513,
													columnNumber: 17
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName$4,
											lineNumber: 476,
											columnNumber: 15
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 470,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "border-t pt-4",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", {
										className: "font-medium mb-3",
										children: "Configurações Adicionais"
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 532,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "grid md:grid-cols-2 gap-4",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Permitir Auto Responder",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "flex items-center space-x-2 h-10",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
														checked: formData.autoRespond,
														onCheckedChange: (c) => setFormData({
															...formData,
															autoRespond: c
														})
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 536,
														columnNumber: 21
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
														className: "text-sm",
														children: "Se desativado, pulará a LLM"
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 540,
														columnNumber: 21
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName$4,
													lineNumber: 535,
													columnNumber: 19
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 534,
												columnNumber: 17
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Requer Humano",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "flex items-center space-x-2 h-10",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
														checked: formData.requiresHuman,
														onCheckedChange: (c) => setFormData({
															...formData,
															requiresHuman: c
														})
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 545,
														columnNumber: 21
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
														className: "text-sm",
														children: "Força bypass da LLM e transbordo"
													}, void 0, false, {
														fileName: _jsxFileName$4,
														lineNumber: 549,
														columnNumber: 21
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName$4,
													lineNumber: 544,
													columnNumber: 19
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 543,
												columnNumber: 17
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Ferramentas Permitidas",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
													value: parseJsonToLines(formData.allowedToolSlugs),
													onChange: (e) => setFormData({
														...formData,
														allowedToolSlugs: parseLinesToJson(e.target.value)
													}),
													placeholder: "Ex:\ncalendar_checkAvailability",
													rows: 2
												}, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 553,
													columnNumber: 19
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
													className: "text-xs text-muted-foreground mt-1",
													children: "Uma ferramenta por linha. Vazio libera todas as globais."
												}, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 564,
													columnNumber: 19
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName$4,
												lineNumber: 552,
												columnNumber: 17
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Escopo de Conhecimento (Tags)",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
													value: parseJsonToLines(formData.knowledgeScope),
													onChange: (e) => setFormData({
														...formData,
														knowledgeScope: parseLinesToJson(e.target.value)
													}),
													placeholder: "Ex:\nfinanceiro\npadel",
													rows: 2
												}, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 569,
													columnNumber: 19
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 568,
												columnNumber: 17
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Labels do Chatwoot",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
													value: parseJsonToLines(formData.chatwootLabels),
													onChange: (e) => setFormData({
														...formData,
														chatwootLabels: parseLinesToJson(e.target.value)
													}),
													placeholder: "Ex:\nurgente\natendimento-financeiro",
													rows: 2
												}, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 579,
													columnNumber: 19
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 578,
												columnNumber: 17
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName$4,
										lineNumber: 533,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 531,
									columnNumber: 13
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 336,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex justify-end gap-2 pt-4 border-t",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								onClick: () => setIsModalOpen(false),
								children: "Cancelar"
							}, void 0, false, {
								fileName: _jsxFileName$4,
								lineNumber: 593,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								onClick: handleSave,
								disabled: saving,
								children: [saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 597,
									columnNumber: 26
								}, this), "Salvar"]
							}, void 0, true, {
								fileName: _jsxFileName$4,
								lineNumber: 596,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 592,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$4,
					lineNumber: 331,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 330,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$4,
		lineNumber: 267,
		columnNumber: 5
	}, this);
}
var _jsxFileName$3 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/slider.tsx";
var Slider = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Slider$1, {
	ref,
	className: cn("relative flex w-full touch-none select-none items-center", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SliderTrack, {
		className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SliderRange, { className: "absolute h-full bg-primary" }, void 0, false, {
			fileName: _jsxFileName$3,
			lineNumber: 16,
			columnNumber: 7
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 15,
		columnNumber: 5
	}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SliderThumb, { className: "block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" }, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 18,
		columnNumber: 5
	}, void 0)]
}, void 0, true, {
	fileName: _jsxFileName$3,
	lineNumber: 10,
	columnNumber: 3
}, void 0));
Slider.displayName = Slider$1.displayName;
var _jsxFileName$2 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/checkbox.tsx";
var Checkbox = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Checkbox$1, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CheckboxIndicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: "h-4 w-4" }, void 0, false, {
			fileName: _jsxFileName$2,
			lineNumber: 20,
			columnNumber: 7
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$2,
		lineNumber: 19,
		columnNumber: 5
	}, void 0)
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 11,
	columnNumber: 3
}, void 0));
Checkbox.displayName = Checkbox$1.displayName;
var _jsxFileName$1 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/accordion.tsx";
var Accordion = Root2;
var AccordionItem = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Item, {
	ref,
	className: cn("border-b", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 13,
	columnNumber: 3
}, void 0));
AccordionItem.displayName = "AccordionItem";
var AccordionTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Header, {
	className: "flex",
	children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trigger2, {
		ref,
		className: cn("flex flex-1 items-center justify-between py-4 text-sm font-medium cursor-pointer transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronDown, { className: "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" }, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 31,
			columnNumber: 7
		}, void 0)]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 22,
		columnNumber: 5
	}, void 0)
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 21,
	columnNumber: 3
}, void 0));
AccordionTrigger.displayName = Trigger2.displayName;
var AccordionContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Content2, {
	ref,
	className: "overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
	...props,
	children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: cn("pb-4 pt-0", className),
		children
	}, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 46,
		columnNumber: 5
	}, void 0)
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 41,
	columnNumber: 3
}, void 0));
AccordionContent.displayName = Content2.displayName;
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.agentes.novo.tsx?tsr-split=component";
function NovoAgente() {
	const search = Route.useSearch();
	const behaviorTabRef = (0, import_react.useRef)(null);
	const [company, setCompany] = (0, import_react.useState)(null);
	const [assistants, setAssistants] = (0, import_react.useState)([]);
	const [publicationChannels, setPublicationChannels] = (0, import_react.useState)([]);
	const [selectedAssistantId, setSelectedAssistantId] = (0, import_react.useState)(search.assistantId ?? "");
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [previewLoading, setPreviewLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [name, setName] = (0, import_react.useState)("");
	const [description, setDescription] = (0, import_react.useState)("");
	const [businessAddress, setBusinessAddress] = (0, import_react.useState)("");
	const [businessCityRegion, setBusinessCityRegion] = (0, import_react.useState)("");
	const [googleMapsUrl, setGoogleMapsUrl] = (0, import_react.useState)("");
	const [latitude, setLatitude] = (0, import_react.useState)("");
	const [longitude, setLongitude] = (0, import_react.useState)("");
	const [weeklySchedule, setWeeklySchedule] = (0, import_react.useState)(null);
	const [aiAlwaysAvailable, setAiAlwaysAvailable] = (0, import_react.useState)(true);
	const [initialMessage, setInitialMessage] = (0, import_react.useState)("");
	const [ragEnabled, setRagEnabled] = (0, import_react.useState)(false);
	const [status, setStatus] = (0, import_react.useState)("ACTIVE");
	const [instructions, setInstructions] = (0, import_react.useState)("Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.");
	const [personality, setPersonality] = (0, import_react.useState)("");
	const [toneOfVoice, setToneOfVoice] = (0, import_react.useState)("");
	const [avoidPhrases, setAvoidPhrases] = (0, import_react.useState)("");
	const [messageBufferEnabled, setMessageBufferEnabled] = (0, import_react.useState)(true);
	const [messageBufferSeconds, setMessageBufferSeconds] = (0, import_react.useState)(6);
	const [splitResponseEnabled, setSplitResponseEnabled] = (0, import_react.useState)(false);
	const [splitResponseStyle, setSplitResponseStyle] = (0, import_react.useState)("");
	const [model, setModel] = (0, import_react.useState)("");
	const [temperature, setTemperature] = (0, import_react.useState)(null);
	const [knowledge, setKnowledge] = (0, import_react.useState)([]);
	const [previewQuestion, setPreviewQuestion] = (0, import_react.useState)("Qual é o horário de atendimento?");
	const [usePreparedKnowledge, setUsePreparedKnowledge] = (0, import_react.useState)(false);
	const [previewResult, setPreviewResult] = (0, import_react.useState)(null);
	const [publicationSavingId, setPublicationSavingId] = (0, import_react.useState)(null);
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
	const publicationSummary = (0, import_react.useMemo)(() => publicationChannels.map((channel) => ({
		...channel,
		linkedToCurrentAssistant: channel.assistantId === selectedAssistantId,
		linkedToOtherAssistant: Boolean(channel.assistantId) && channel.assistantId !== selectedAssistantId
	})), [publicationChannels, selectedAssistantId]);
	const currentFormData = (0, import_react.useMemo)(() => ({
		name,
		description,
		businessAddress,
		businessCityRegion,
		googleMapsUrl,
		latitude,
		longitude,
		weeklySchedule,
		aiAlwaysAvailable,
		initialMessage,
		ragEnabled,
		status,
		instructions,
		personality,
		toneOfVoice,
		avoidPhrases,
		messageBufferEnabled,
		messageBufferSeconds,
		splitResponseEnabled,
		splitResponseStyle,
		model,
		temperature,
		noAnswerMessage,
		securityInstructions
	}), [
		name,
		description,
		businessAddress,
		businessCityRegion,
		googleMapsUrl,
		latitude,
		longitude,
		weeklySchedule,
		aiAlwaysAvailable,
		initialMessage,
		ragEnabled,
		status,
		instructions,
		personality,
		toneOfVoice,
		avoidPhrases,
		messageBufferEnabled,
		messageBufferSeconds,
		splitResponseEnabled,
		splitResponseStyle,
		model,
		temperature,
		noAnswerMessage,
		securityInstructions
	]);
	const [initialFormData, setInitialFormData] = (0, import_react.useState)(currentFormData);
	(0, import_react.useMemo)(() => JSON.stringify(currentFormData) !== JSON.stringify(initialFormData), [currentFormData, initialFormData]);
	const loadKnowledge = async (assistantId) => {
		if (!assistantId) {
			setKnowledge([]);
			return;
		}
		setKnowledge(await backendAssistantsService.knowledgeList(assistantId));
	};
	const loadPublicationChannels = async () => {
		setPublicationChannels(await chatwootSettingsService.list());
	};
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const [companyResponse, assistantItems, channelItems] = await Promise.all([
					currentCompanyService.get(),
					backendAssistantsService.list(),
					chatwootSettingsService.list()
				]);
				if (cancelled) return;
				setCompany(companyResponse.company);
				setAssistants(assistantItems);
				setPublicationChannels(channelItems);
				const initialAssistantId = resolveOperationalAssistantId(assistantItems, search.assistantId, { includeInactive: true });
				setSelectedAssistantId(initialAssistantId);
				if (!initialAssistantId) {
					setName("");
					setDescription("");
					setBusinessAddress("");
					setBusinessCityRegion("");
					setGoogleMapsUrl("");
					setLatitude("");
					setLongitude("");
					setWeeklySchedule(null);
					setAiAlwaysAvailable(true);
					setPersonality("");
					setToneOfVoice("");
					setAvoidPhrases("");
					setMessageBufferEnabled(true);
					setMessageBufferSeconds(6);
					setSplitResponseEnabled(false);
					setSplitResponseStyle("");
					setStatus("ACTIVE");
					setRagEnabled(false);
					setKnowledge([]);
					setInitialFormData({
						name: "",
						description: "",
						businessAddress: "",
						businessCityRegion: "",
						googleMapsUrl: "",
						latitude: "",
						longitude: "",
						weeklySchedule: null,
						aiAlwaysAvailable: true,
						initialMessage: "",
						ragEnabled: false,
						status: "ACTIVE",
						instructions: "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
						personality: "",
						toneOfVoice: "",
						avoidPhrases: "",
						messageBufferEnabled: true,
						messageBufferSeconds: 6,
						splitResponseEnabled: false,
						splitResponseStyle: "",
						model: "",
						temperature: null,
						noAnswerMessage: "",
						securityInstructions: ""
					});
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
	const publishAssistantOnChannel = async (channel, nextValue) => {
		if (!selectedAssistantId) {
			toast.error("Salve o assistente antes de publicar em um canal.");
			return;
		}
		setPublicationSavingId(channel.id);
		try {
			await chatwootSettingsService.update(channel.id, {
				name: channel.name,
				baseUrl: channel.baseUrl,
				accountId: channel.accountId,
				inboxId: channel.inboxId,
				assistantId: nextValue ? selectedAssistantId : "",
				isActive: channel.isActive,
				...channel.metadataJson ? { metadataJson: channel.metadataJson } : {}
			});
			await loadPublicationChannels();
			toast.success(nextValue ? `Assistente publicado em ${channel.name}.` : `Publicação removida de ${channel.name}.`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a publicação do canal.");
		} finally {
			setPublicationSavingId(null);
		}
	};
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
				setBusinessAddress(assistant.businessAddress ?? "");
				setBusinessCityRegion(assistant.businessCityRegion ?? "");
				setGoogleMapsUrl(assistant.googleMapsUrl ?? "");
				setLatitude(assistant.latitude !== null && assistant.latitude !== void 0 ? String(assistant.latitude) : "");
				setLongitude(assistant.longitude !== null && assistant.longitude !== void 0 ? String(assistant.longitude) : "");
				setWeeklySchedule(assistant.weeklySchedule ?? null);
				setAiAlwaysAvailable(assistant.aiAlwaysAvailable ?? true);
				setInitialMessage(assistant.initialMessage ?? "");
				setInstructions(assistant.instructions ?? "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.");
				setPersonality(assistant.personality ?? "");
				setToneOfVoice(assistant.toneOfVoice ?? "");
				setAvoidPhrases(assistant.avoidPhrases ?? "");
				setModel(assistant.model ?? "");
				setTemperature(assistant.temperature ?? null);
				setNoAnswerMessage(assistant.fallbackMessage ?? "");
				setSecurityInstructions(assistant.safetyInstruction ?? "");
				setRagEnabled(assistant.ragEnabled ?? false);
				setMessageBufferEnabled(assistant.messageBufferEnabled ?? true);
				setMessageBufferSeconds(assistant.messageBufferSeconds ?? 6);
				setSplitResponseEnabled(assistant.splitResponseEnabled ?? false);
				setSplitResponseStyle(assistant.splitResponseStyle ?? "");
				setStatus(assistant.status);
				await loadKnowledge(selectedAssistantId);
				setInitialFormData({
					name: assistant.name,
					description: assistant.description ?? "",
					businessAddress: assistant.businessAddress ?? "",
					businessCityRegion: assistant.businessCityRegion ?? "",
					googleMapsUrl: assistant.googleMapsUrl ?? "",
					latitude: assistant.latitude !== null && assistant.latitude !== void 0 ? String(assistant.latitude) : "",
					longitude: assistant.longitude !== null && assistant.longitude !== void 0 ? String(assistant.longitude) : "",
					weeklySchedule: assistant.weeklySchedule ?? null,
					aiAlwaysAvailable: assistant.aiAlwaysAvailable ?? true,
					initialMessage: assistant.initialMessage ?? "",
					instructions: assistant.instructions ?? "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
					personality: assistant.personality ?? "",
					toneOfVoice: assistant.toneOfVoice ?? "",
					avoidPhrases: assistant.avoidPhrases ?? "",
					model: assistant.model ?? "",
					temperature: assistant.temperature ?? null,
					noAnswerMessage: assistant.fallbackMessage ?? "",
					securityInstructions: assistant.safetyInstruction ?? "",
					ragEnabled: assistant.ragEnabled ?? false,
					messageBufferEnabled: assistant.messageBufferEnabled ?? true,
					messageBufferSeconds: assistant.messageBufferSeconds ?? 6,
					splitResponseEnabled: assistant.splitResponseEnabled ?? false,
					splitResponseStyle: assistant.splitResponseStyle ?? "",
					status: assistant.status
				});
			} catch (err) {
				setError(err instanceof Error ? err.message : "Não foi possível carregar o assistente.");
			}
		})();
	}, [selectedAssistantId]);
	const handleCreateNew = () => {
		setSelectedAssistantId("");
		setName("");
		setDescription("");
		setBusinessAddress("");
		setBusinessCityRegion("");
		setGoogleMapsUrl("");
		setLatitude("");
		setLongitude("");
		setWeeklySchedule(null);
		setAiAlwaysAvailable(true);
		setInitialMessage("");
		setInstructions("Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.");
		setPersonality("");
		setToneOfVoice("");
		setAvoidPhrases("");
		setMessageBufferEnabled(true);
		setMessageBufferSeconds(6);
		setSplitResponseEnabled(false);
		setSplitResponseStyle("");
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
		setInitialFormData({
			name: "",
			description: "",
			businessAddress: "",
			businessCityRegion: "",
			googleMapsUrl: "",
			latitude: "",
			longitude: "",
			weeklySchedule: null,
			aiAlwaysAvailable: true,
			initialMessage: "",
			ragEnabled: false,
			status: "ACTIVE",
			instructions: "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
			personality: "",
			toneOfVoice: "",
			avoidPhrases: "",
			messageBufferEnabled: true,
			messageBufferSeconds: 6,
			splitResponseEnabled: false,
			splitResponseStyle: "",
			model: "",
			temperature: null,
			noAnswerMessage: "",
			securityInstructions: ""
		});
	};
	const handleSave = async () => {
		if (!name.trim()) return;
		if (googleMapsUrl.trim() && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(googleMapsUrl.trim())) {
			toast.error("O link do Google Maps deve ser uma URL válida (ex: https://maps.google.com/...)");
			return;
		}
		if (latitude.trim() && isNaN(Number(latitude))) {
			toast.error("A latitude deve ser um número válido.");
			return;
		}
		if (longitude.trim() && isNaN(Number(longitude))) {
			toast.error("A longitude deve ser um número válido.");
			return;
		}
		setSaving(true);
		try {
			const payloadLatitude = latitude.trim() ? parseFloat(latitude) : null;
			const payloadLongitude = longitude.trim() ? parseFloat(longitude) : null;
			if (selectedAssistantId) {
				const updated = await backendAssistantsService.update(selectedAssistantId, {
					name: name.trim(),
					description: description.trim() || null,
					businessAddress: businessAddress.trim() || null,
					businessCityRegion: businessCityRegion.trim() || null,
					googleMapsUrl: googleMapsUrl.trim() || null,
					latitude: payloadLatitude,
					longitude: payloadLongitude,
					weeklySchedule,
					aiAlwaysAvailable,
					initialMessage: initialMessage.trim() || null,
					instructions: instructions.trim() || null,
					personality: personality.trim() || null,
					toneOfVoice: toneOfVoice.trim() || null,
					avoidPhrases: avoidPhrases.trim() || null,
					model: model.trim() || null,
					temperature,
					fallbackMessage: noAnswerMessage.trim() || null,
					safetyInstruction: securityInstructions.trim() || null,
					ragEnabled,
					messageBufferEnabled,
					messageBufferSeconds,
					splitResponseEnabled,
					splitResponseStyle: splitResponseStyle.trim() || null
				});
				setAssistants((items) => items.map((item) => item.id === updated.id ? updated : item));
				setName(updated.name);
				setDescription(updated.description ?? "");
				setBusinessAddress(updated.businessAddress ?? "");
				setBusinessCityRegion(updated.businessCityRegion ?? "");
				setGoogleMapsUrl(updated.googleMapsUrl ?? "");
				setLatitude(updated.latitude !== null && updated.latitude !== void 0 ? String(updated.latitude) : "");
				setLongitude(updated.longitude !== null && updated.longitude !== void 0 ? String(updated.longitude) : "");
				setWeeklySchedule(updated.weeklySchedule ?? null);
				setAiAlwaysAvailable(updated.aiAlwaysAvailable ?? true);
				setInitialMessage(updated.initialMessage ?? "");
				setInstructions(updated.instructions ?? "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.");
				setPersonality(updated.personality ?? "");
				setToneOfVoice(updated.toneOfVoice ?? "");
				setAvoidPhrases(updated.avoidPhrases ?? "");
				setModel(updated.model ?? "");
				setTemperature(updated.temperature ?? null);
				setNoAnswerMessage(updated.fallbackMessage ?? "");
				setSecurityInstructions(updated.safetyInstruction ?? "");
				setRagEnabled(updated.ragEnabled ?? false);
				setMessageBufferEnabled(updated.messageBufferEnabled ?? true);
				setMessageBufferSeconds(updated.messageBufferSeconds ?? 6);
				setSplitResponseEnabled(updated.splitResponseEnabled ?? false);
				setSplitResponseStyle(updated.splitResponseStyle ?? "");
				if (updated.status !== status) {
					const updatedStatus = await backendAssistantsService.updateStatus(selectedAssistantId, status);
					setAssistants((items) => items.map((item) => item.id === updatedStatus.id ? updatedStatus : item));
				}
				setInitialFormData({
					name: updated.name,
					description: updated.description ?? "",
					businessAddress: updated.businessAddress ?? "",
					businessCityRegion: updated.businessCityRegion ?? "",
					googleMapsUrl: updated.googleMapsUrl ?? "",
					latitude: updated.latitude !== null && updated.latitude !== void 0 ? String(updated.latitude) : "",
					longitude: updated.longitude !== null && updated.longitude !== void 0 ? String(updated.longitude) : "",
					weeklySchedule: updated.weeklySchedule ?? null,
					aiAlwaysAvailable: updated.aiAlwaysAvailable ?? true,
					initialMessage: updated.initialMessage ?? "",
					instructions: updated.instructions ?? "",
					personality: updated.personality ?? "",
					toneOfVoice: updated.toneOfVoice ?? "",
					avoidPhrases: updated.avoidPhrases ?? "",
					model: updated.model ?? "",
					temperature: updated.temperature ?? null,
					noAnswerMessage: updated.fallbackMessage ?? "",
					securityInstructions: updated.safetyInstruction ?? "",
					ragEnabled: updated.ragEnabled ?? false,
					messageBufferEnabled: updated.messageBufferEnabled ?? true,
					messageBufferSeconds: updated.messageBufferSeconds ?? 6,
					splitResponseEnabled: updated.splitResponseEnabled ?? false,
					splitResponseStyle: updated.splitResponseStyle ?? "",
					status
				});
				await behaviorTabRef.current?.saveBehavior(selectedAssistantId);
				toast.success("Agente salvo com sucesso.");
			} else {
				const created = await backendAssistantsService.create({
					name: name.trim(),
					description: description.trim() || null,
					businessAddress: businessAddress.trim() || null,
					businessCityRegion: businessCityRegion.trim() || null,
					googleMapsUrl: googleMapsUrl.trim() || null,
					latitude: payloadLatitude,
					longitude: payloadLongitude,
					weeklySchedule,
					aiAlwaysAvailable,
					initialMessage: initialMessage.trim() || null,
					instructions: instructions.trim() || null,
					personality: personality.trim() || null,
					toneOfVoice: toneOfVoice.trim() || null,
					avoidPhrases: avoidPhrases.trim() || null,
					model: model.trim() || null,
					temperature,
					fallbackMessage: noAnswerMessage.trim() || null,
					safetyInstruction: securityInstructions.trim() || null,
					ragEnabled,
					messageBufferEnabled,
					messageBufferSeconds,
					splitResponseEnabled,
					splitResponseStyle: splitResponseStyle.trim() || null
				});
				setAssistants((items) => [created, ...items]);
				setSelectedAssistantId(created.id);
				setName(created.name);
				setDescription(created.description ?? "");
				setBusinessAddress(created.businessAddress ?? "");
				setBusinessCityRegion(created.businessCityRegion ?? "");
				setGoogleMapsUrl(created.googleMapsUrl ?? "");
				setLatitude(created.latitude !== null && created.latitude !== void 0 ? String(created.latitude) : "");
				setLongitude(created.longitude !== null && created.longitude !== void 0 ? String(created.longitude) : "");
				setInitialMessage(created.initialMessage ?? "");
				setInstructions(created.instructions ?? "");
				setModel(created.model ?? "");
				setTemperature(created.temperature ?? null);
				setNoAnswerMessage(created.fallbackMessage ?? "");
				setSecurityInstructions(created.safetyInstruction ?? "");
				setRagEnabled(created.ragEnabled ?? false);
				setStatus(created.status);
				await loadKnowledge(created.id);
				setInitialFormData({
					name: created.name,
					description: created.description ?? "",
					businessAddress: created.businessAddress ?? "",
					businessCityRegion: created.businessCityRegion ?? "",
					googleMapsUrl: created.googleMapsUrl ?? "",
					latitude: created.latitude !== null && created.latitude !== void 0 ? String(created.latitude) : "",
					longitude: created.longitude !== null && created.longitude !== void 0 ? String(created.longitude) : "",
					weeklySchedule: created.weeklySchedule ?? null,
					aiAlwaysAvailable: created.aiAlwaysAvailable ?? true,
					initialMessage: created.initialMessage ?? "",
					instructions: created.instructions ?? "",
					personality: created.personality ?? "",
					toneOfVoice: created.toneOfVoice ?? "",
					avoidPhrases: created.avoidPhrases ?? "",
					model: created.model ?? "",
					temperature: created.temperature ?? null,
					noAnswerMessage: created.fallbackMessage ?? "",
					securityInstructions: created.safetyInstruction ?? "",
					ragEnabled: created.ragEnabled ?? false,
					messageBufferEnabled: created.messageBufferEnabled ?? true,
					messageBufferSeconds: created.messageBufferSeconds ?? 6,
					splitResponseEnabled: created.splitResponseEnabled ?? false,
					splitResponseStyle: created.splitResponseStyle ?? "",
					status: created.status
				});
				await behaviorTabRef.current?.saveBehavior(created.id);
				toast.success("Agente criado com sucesso.");
			}
			setIsReviewConfirmed(false);
		} catch (err) {
			console.error(err);
			toast.error("Não foi possível salvar o agente. Tente novamente.");
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
		actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-center gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "outline",
					asChild: true,
					size: "sm",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
						to: "/agentes",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowLeft, { className: "h-4 w-4 mr-1" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 697,
							columnNumber: 17
						}, this), " Voltar"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 696,
						columnNumber: 15
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 695,
					columnNumber: 13
				}, this),
				selectedAssistantId && /* @__PURE__ */ (void 0)("div", {
					className: "flex items-center gap-2 mr-2",
					children: [/* @__PURE__ */ (void 0)(StatusBadge, { status: isActive ? "ativo" : "pausado" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 701,
						columnNumber: 17
					}, this), /* @__PURE__ */ (void 0)(Button, {
						variant: isActive ? "outline" : "destructive",
						onClick: handleToggleStatus,
						size: "sm",
						children: [isActive ? /* @__PURE__ */ (void 0)(Pause, { className: "h-4 w-4 mr-1" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 703,
							columnNumber: 31
						}, this) : /* @__PURE__ */ (void 0)(CirclePlay, { className: "h-4 w-4 mr-1" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 703,
							columnNumber: 68
						}, this), isActive ? "Inativar" : "Ativar"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 702,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 700,
					columnNumber: 37
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: () => void handleSave(),
					disabled: saving || !name.trim(),
					size: "sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4 mr-1" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 708,
							columnNumber: 15
						}, this),
						" ",
						saving ? "Salvando..." : selectedAssistantId ? "Salvar" : "Criar"
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 707,
					columnNumber: 13
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 693,
			columnNumber: 58
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 693,
		columnNumber: 7
	}, this), loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando assistente real…" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 712,
		columnNumber: 18
	}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
		title: "Não foi possível carregar o assistente",
		description: error,
		onRetry: () => window.location.reload()
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 712,
		columnNumber: 81
	}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
		className: "mb-4",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-4 grid gap-4 max-w-md",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Selecionar assistente",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
					value: selectedAssistantId || "new",
					onValueChange: (value) => {
						if (value === "new") handleCreateNew();
						else setSelectedAssistantId(value);
					},
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Novo assistente" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 724,
						columnNumber: 21
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 723,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: "new",
						children: "Novo assistente"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 727,
						columnNumber: 21
					}, this), selectableAssistants.map((assistant) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: assistant.id,
						children: assistant.name
					}, assistant.id, false, {
						fileName: _jsxFileName,
						lineNumber: 728,
						columnNumber: 60
					}, this))] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 726,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 716,
					columnNumber: 17
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 715,
				columnNumber: 15
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 714,
			columnNumber: 13
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 713,
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
						lineNumber: 739,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "comportamento",
						children: "Comportamento"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 740,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "fluxos",
						children: "Fluxos"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 741,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "prompt",
						children: "Regras Globais"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 742,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "conhecimento",
						children: "Conhecimento"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 743,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "ferramentas",
						children: "Ferramentas"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 744,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "memoria",
						children: "Memória"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 745,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "seguranca",
						children: "Regras de Segurança"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 746,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "publicacao",
						children: "Publicação"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 747,
						columnNumber: 15
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 738,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "info",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 grid gap-6",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid md:grid-cols-2 gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Nome do assistente",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: name,
									onChange: (e) => setName(e.target.value)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 755,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 754,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Empresa atual",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: company?.name ?? "Tenant atual",
									disabled: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 758,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 757,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Sobre a empresa",
								className: "md:col-span-2",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
									rows: 3,
									value: description,
									onChange: (e) => setDescription(e.target.value),
									placeholder: "Ex: Clube de Padel e Beach Tennis com restaurante, área kids e locação de quadras."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 761,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 760,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "md:col-span-2 pt-4 border-t space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
											className: "text-lg font-semibold",
											children: "Localização"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 765,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
											variant: "outline",
											size: "sm",
											type: "button",
											onClick: () => {
												if (googleMapsUrl.trim()) window.open(googleMapsUrl.trim(), "_blank");
												else toast.warning("Adicione um link do Google Maps para testar a localização.");
											},
											children: "Testar localização"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 766,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 764,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-xs text-muted-foreground",
										children: "Use o link do Google Maps para que o agente possa enviar a localização quando o cliente perguntar onde fica a empresa."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 776,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "grid md:grid-cols-2 gap-4 pt-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Endereço",
												className: "md:col-span-2",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
													value: businessAddress,
													onChange: (e) => setBusinessAddress(e.target.value),
													placeholder: "Ex: Av. Paulista, 1000 - Bela Vista"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 782,
													columnNumber: 27
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 781,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Cidade / Região",
												className: "md:col-span-2",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
													value: businessCityRegion,
													onChange: (e) => setBusinessCityRegion(e.target.value),
													placeholder: "Ex: São Paulo, SP"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 785,
													columnNumber: 27
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 784,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Link do Google Maps",
												className: "md:col-span-2",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
													value: googleMapsUrl,
													onChange: (e) => setGoogleMapsUrl(e.target.value),
													placeholder: "Ex: https://maps.app.goo.gl/..."
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 788,
													columnNumber: 27
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 787,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Latitude",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
													value: latitude,
													onChange: (e) => setLatitude(e.target.value),
													placeholder: "Ex: -23.561684"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 791,
													columnNumber: 27
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 790,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Longitude",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
													value: longitude,
													onChange: (e) => setLongitude(e.target.value),
													placeholder: "Ex: -46.655981"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 794,
													columnNumber: 27
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 793,
												columnNumber: 25
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 780,
										columnNumber: 23
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 763,
								columnNumber: 21
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 753,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "pt-4 border-t space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
								className: "text-lg font-semibold",
								children: "Horário de atendimento"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 801,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center justify-between bg-secondary/20 p-4 rounded-lg border",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-0.5 max-w-[80%]",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "ai-always-available",
										className: "text-base font-medium cursor-pointer",
										children: "IA atende 24 horas"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 805,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-sm text-muted-foreground",
										children: aiAlwaysAvailable ? "Quando ativado, o agente pode responder clientes mesmo fora do horário de atendimento. O horário abaixo serve como referência oficial da empresa." : "Quando desativado, fora do horário o agente poderá usar a mensagem de indisponibilidade configurada."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 808,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 804,
									columnNumber: 23
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
									id: "ai-always-available",
									checked: aiAlwaysAvailable,
									onCheckedChange: setAiAlwaysAvailable
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 812,
									columnNumber: 23
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 803,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3",
								children: [
									{
										id: "monday",
										label: "Segunda-feira",
										short: "Seg"
									},
									{
										id: "tuesday",
										label: "Terça-feira",
										short: "Ter"
									},
									{
										id: "wednesday",
										label: "Quarta-feira",
										short: "Qua"
									},
									{
										id: "thursday",
										label: "Quinta-feira",
										short: "Qui"
									},
									{
										id: "friday",
										label: "Sexta-feira",
										short: "Sex"
									},
									{
										id: "saturday",
										label: "Sábado",
										short: "Sáb"
									},
									{
										id: "sunday",
										label: "Domingo",
										short: "Dom"
									}
								].map((day) => {
									const defaultDayConfig = day.id === "sunday" ? {
										open: false,
										start: "08:00",
										end: "18:00"
									} : {
										open: true,
										start: "08:00",
										end: "18:00"
									};
									const dayConfig = weeklySchedule?.[day.id] || defaultDayConfig;
									const updateDay = (key, value) => {
										setWeeklySchedule((prev) => ({
											...prev || {},
											[day.id]: {
												...dayConfig,
												[key]: value
											}
										}));
									};
									return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex flex-col gap-2 p-3 border rounded-md bg-card",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
													className: "font-medium text-sm",
													title: day.label,
													children: day.short
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 866,
													columnNumber: 31
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
													checked: dayConfig.open,
													onCheckedChange: (c) => updateDay("open", c)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 867,
													columnNumber: 31
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 865,
												columnNumber: 29
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "text-xs text-muted-foreground",
												children: dayConfig.open ? "Aberto" : "Fechado"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 869,
												columnNumber: 29
											}, this),
											dayConfig.open && /* @__PURE__ */ (void 0)("div", {
												className: "flex flex-col gap-1.5 mt-1",
												children: [
													/* @__PURE__ */ (void 0)("div", {
														className: "flex items-center gap-1",
														children: /* @__PURE__ */ (void 0)(Input, {
															type: "time",
															className: "h-8 text-xs px-2 w-full",
															value: dayConfig.start,
															onChange: (e) => updateDay("start", e.target.value)
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 872,
															columnNumber: 35
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 871,
														columnNumber: 33
													}, this),
													/* @__PURE__ */ (void 0)("div", {
														className: "flex items-center gap-1 text-center justify-center",
														children: /* @__PURE__ */ (void 0)("span", {
															className: "text-[10px] text-muted-foreground",
															children: "até"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 875,
															columnNumber: 35
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 874,
														columnNumber: 33
													}, this),
													/* @__PURE__ */ (void 0)("div", {
														className: "flex items-center gap-1",
														children: /* @__PURE__ */ (void 0)(Input, {
															type: "time",
															className: "h-8 text-xs px-2 w-full",
															value: dayConfig.end,
															onChange: (e) => updateDay("end", e.target.value)
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 878,
															columnNumber: 35
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 877,
														columnNumber: 33
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 870,
												columnNumber: 48
											}, this)
										]
									}, day.id, true, {
										fileName: _jsxFileName,
										lineNumber: 864,
										columnNumber: 28
									}, this);
								})
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 815,
								columnNumber: 21
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 800,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 752,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 751,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 750,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "comportamento",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "space-y-6",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "p-6 space-y-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid md:grid-cols-2 gap-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Modelo da IA",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: model,
											onChange: (e) => setModel(e.target.value),
											placeholder: "Opcional. Se vazio, usa o modelo padrão do backend."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 896,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 895,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
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
												lineNumber: 900,
												columnNumber: 27
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "flex justify-between text-xs text-muted-foreground",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: temperature ?? .2 }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 902,
													columnNumber: 29
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: getTemperatureDescription(temperature ?? .2) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 903,
													columnNumber: 29
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 901,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 899,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 898,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Tom de voz",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
											value: toneOfVoice || "Profissional",
											onValueChange: (val) => setToneOfVoice(val),
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione o tom de voz" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 909,
												columnNumber: 42
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 909,
												columnNumber: 27
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Profissional",
													children: "Profissional"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 911,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Amigável",
													children: "Amigável"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 912,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Descontraído",
													children: "Descontraído"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 913,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Consultivo",
													children: "Consultivo"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 914,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Objetivo",
													children: "Objetivo"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 915,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Formal",
													children: "Formal"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 916,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Personalizado",
													children: "Personalizado"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 917,
													columnNumber: 29
												}, this)
											] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 910,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 908,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 907,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Personalidade da IA",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: personality,
											onChange: (e) => setPersonality(e.target.value),
											placeholder: "Ex: Atendente simpática, objetiva, prestativa..."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 922,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 921,
										columnNumber: 23
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 894,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "p-4 border rounded-lg bg-secondary/10",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex items-center justify-between mb-4",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "message-buffer",
										className: "text-base font-semibold cursor-pointer",
										children: "Comportamento de mensagens"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 930,
										columnNumber: 27
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-sm text-muted-foreground",
										children: "Aguardar mensagens antes de responder (evita que o agente responda várias vezes quando o cliente manda mensagens quebradas)."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 933,
										columnNumber: 27
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 929,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
										id: "message-buffer",
										checked: messageBufferEnabled,
										onCheckedChange: setMessageBufferEnabled
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 937,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 928,
									columnNumber: 23
								}, this), messageBufferEnabled && /* @__PURE__ */ (void 0)("div", {
									className: "grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-secondary/20",
									children: [/* @__PURE__ */ (void 0)(Field, {
										label: `Tempo de espera: ${messageBufferSeconds} segundos`,
										children: /* @__PURE__ */ (void 0)(Slider, {
											value: [messageBufferSeconds],
											min: 3,
											max: 20,
											step: 1,
											onValueChange: (vals) => setMessageBufferSeconds(vals[0])
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 941,
											columnNumber: 29
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 940,
										columnNumber: 27
									}, this), /* @__PURE__ */ (void 0)(Field, {
										label: "Estilo da resposta",
										children: /* @__PURE__ */ (void 0)(Select, {
											value: splitResponseStyle || "SINGLE",
											onValueChange: (val) => setSplitResponseStyle(val),
											children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, { placeholder: "Selecione o estilo" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 945,
												columnNumber: 47
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 945,
												columnNumber: 32
											}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [/* @__PURE__ */ (void 0)(SelectItem, {
												value: "SINGLE",
												children: "Mensagem Única"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 947,
												columnNumber: 34
											}, this), /* @__PURE__ */ (void 0)(SelectItem, {
												value: "NATURAL_BLOCKS",
												children: "Blocos Naturais (Separados)"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 948,
												columnNumber: 34
											}, this)] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 946,
												columnNumber: 32
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 944,
											columnNumber: 30
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 943,
										columnNumber: 27
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 939,
									columnNumber: 48
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 927,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Mensagem inicial",
								helper: "Opcional. Ao criar uma conversa nova, essa mensagem aparece como a primeira resposta.",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
									rows: 2,
									value: initialMessage,
									onChange: (e) => setInitialMessage(e.target.value),
									placeholder: "Olá! Sou seu assistente. Como posso ajudar?"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 956,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 955,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Accordion, {
								type: "single",
								collapsible: true,
								className: "w-full",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionItem, {
									value: "fallback-message",
									className: "border rounded-lg px-4 py-1 bg-secondary/5",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionTrigger, {
										className: "hover:no-underline py-3",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex flex-col text-left space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "font-semibold text-sm",
												children: "Mensagem quando não souber responder"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 963,
												columnNumber: 29
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "text-xs text-muted-foreground font-normal",
												children: noAnswerMessage ? noAnswerMessage.substring(0, 80) + (noAnswerMessage.length > 80 ? "..." : "") : "Resposta padrão quando a IA não encontra informação."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 964,
												columnNumber: 29
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 962,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 961,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionContent, {
										className: "pt-2 pb-4",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mb-3",
											children: "Mensagem usada quando o agente não tiver informação suficiente para responder."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 970,
											columnNumber: 27
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
											rows: 3,
											value: noAnswerMessage,
											onChange: (e) => setNoAnswerMessage(e.target.value),
											placeholder: "Infelizmente, não tenho essa informação..."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 973,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 969,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 960,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 959,
								columnNumber: 21
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 892,
						columnNumber: 19
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 891,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AssistantBehaviorTab, {
						assistantId: selectedAssistantId,
						ref: behaviorTabRef
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 980,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 890,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 889,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "fluxos",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AssistantFlowsTab, { assistantId: selectedAssistantId }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 985,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 984,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "prompt",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "bg-primary/5 border border-primary/20 p-4 rounded-lg",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-sm text-primary",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Dica:" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 993,
									columnNumber: 23
								}, this), " Use esta área apenas para regras que valem para todo o atendimento. Informações específicas da empresa devem ir na Base de Conhecimento. Regras por assunto devem ir em Fluxos."]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 992,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 991,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Instruções principais do agente",
							helper: "Define a personalidade, função e regras primárias do agente.",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
								rows: 12,
								value: instructions,
								onChange: (e) => setInstructions(e.target.value),
								placeholder: "Você é um atendente da Cubo.Chat..."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 999,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 998,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "pt-6 border-t mt-6",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
								className: "text-lg font-semibold mb-4",
								children: "Regras Avançadas"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1004,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Accordion, {
								type: "single",
								collapsible: true,
								className: "w-full",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionItem, {
									value: "avoid-phrases",
									className: "border rounded-lg mb-3 px-4 py-1 bg-secondary/5",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionTrigger, {
										className: "hover:no-underline py-3",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex flex-col text-left space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "font-semibold text-sm",
												children: "Frases a evitar"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1011,
												columnNumber: 29
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "text-xs text-muted-foreground font-normal",
												children: avoidPhrases ? "Evita repetições configuradas." : "Evita repetições como 'é só me avisar'."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1012,
												columnNumber: 29
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1010,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1009,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionContent, {
										className: "pt-2 pb-4",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mb-3",
											children: "Liste frases, vícios de linguagem ou encerramentos que o agente deve evitar repetir."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1018,
											columnNumber: 27
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
											rows: 3,
											value: avoidPhrases,
											onChange: (e) => setAvoidPhrases(e.target.value),
											placeholder: "Ex: Evite repetir a mesma frase de encerramento em todas as respostas. Não finalize sempre com 'é só me avisar'. Varie naturalmente os encerramentos e só ofereça ajuda extra quando fizer sentido."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1021,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1017,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1008,
									columnNumber: 23
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionItem, {
									value: "guardrails",
									className: "border rounded-lg px-4 py-1 bg-secondary/5",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionTrigger, {
										className: "hover:no-underline py-3",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex flex-col text-left space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "font-semibold text-sm",
												children: "Guardrails básicos"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1028,
												columnNumber: 29
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "text-xs text-muted-foreground font-normal",
												children: "Limites obrigatórios incorporados ao comportamento do agente."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1029,
												columnNumber: 29
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1027,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1026,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionContent, {
										className: "pt-2 pb-4",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mb-3",
											children: "Defina limites obrigatórios, como não inventar informações, não expor dados internos e transferir para humano quando necessário."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1035,
											columnNumber: 27
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
											rows: 4,
											value: securityInstructions,
											onChange: (e) => setSecurityInstructions(e.target.value),
											placeholder: "Regras de segurança incorporadas ao prompt."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1038,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1034,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1025,
									columnNumber: 23
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1006,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1003,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10 mt-6",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "space-y-0.5 max-w-[80%]",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "use-rag-production",
										className: "text-base font-medium cursor-pointer",
										children: "Usar conhecimento preparado no atendimento real"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1047,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-sm text-muted-foreground",
										children: "Busca respostas baseadas nos arquivos de conhecimento antes de responder ao cliente."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1050,
										columnNumber: 23
									}, this),
									ragEnabled && knowledge.filter((k) => k.status === "ACTIVE" && k.processingStatus === "READY").length === 0 && /* @__PURE__ */ (void 0)("div", {
										className: "text-amber-600 text-xs mt-2 flex items-center",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-3 w-3 mr-1" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1054,
											columnNumber: 27
										}, this), "Você não possui conhecimentos ATIVOS e PREPARADOS. O agente responderá normalmente sem contexto até que os arquivos estejam prontos."]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1053,
										columnNumber: 133
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1046,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
								id: "use-rag-production",
								checked: ragEnabled,
								onCheckedChange: setRagEnabled
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1058,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1045,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 990,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 989,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 988,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "conhecimento",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
					className: "flex flex-row items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-base",
						children: "Conhecimentos do agente"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1067,
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
								lineNumber: 1070,
								columnNumber: 23
							}, this), " Adicionar conhecimento"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1069,
							columnNumber: 21
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
							className: "max-w-xl",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: knowledgeFormId ? "Editar Conhecimento" : "Adicionar Conhecimento" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1074,
									columnNumber: 25
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1073,
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
												lineNumber: 1078,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1077,
											columnNumber: 25
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Tipo de conhecimento",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
												value: knowledgeFormType,
												onValueChange: (val) => setKnowledgeFormType(val),
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1082,
													columnNumber: 44
												}, this) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1082,
													columnNumber: 29
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
														value: "TEXT",
														children: "Texto manual"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1084,
														columnNumber: 31
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
														value: "URL",
														children: "URL (Site)"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1085,
														columnNumber: 31
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
														value: "CONVERSATION",
														children: "Conversa de exemplo"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1086,
														columnNumber: 31
													}, this)
												] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1083,
													columnNumber: 29
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1081,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1080,
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
												lineNumber: 1091,
												columnNumber: 29
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1090,
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
												lineNumber: 1094,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1093,
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
												lineNumber: 1097,
												columnNumber: 31
											}, this), /* @__PURE__ */ (void 0)(Label, {
												htmlFor: "knowledge-active",
												children: "Este conhecimento está ativo e liberado para uso"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1098,
												columnNumber: 31
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1096,
											columnNumber: 45
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mt-2 border-l-2 pl-3 border-amber-300",
											children: "Este conteúdo ficará salvo na base de conhecimento do agente. A preparação para a IA ler e analisar o texto será feita na próxima etapa."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1100,
											columnNumber: 25
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1076,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									onClick: () => setIsAddingKnowledge(false),
									children: "Cancelar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1105,
									columnNumber: 26
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									onClick: () => void handleSaveKnowledge(),
									disabled: knowledgeSaving || !knowledgeFormTitle.trim() || !knowledgeFormContent.trim(),
									children: knowledgeSaving ? "Salvando..." : "Salvar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1106,
									columnNumber: 26
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1104,
									columnNumber: 23
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1072,
							columnNumber: 21
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1068,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1066,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 pt-0 space-y-3",
					children: [!selectedAssistantId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
						title: "Agente não salvo",
						description: "Salve o agente primeiro antes de adicionar conhecimentos."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1114,
						columnNumber: 43
					}, this) : knowledge.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
						title: "Sem conhecimento carregado",
						description: "Adicione conhecimentos para que o agente tenha contexto sobre sua empresa."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1114,
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
								lineNumber: 1116,
								columnNumber: 27
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center gap-2 mt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-xs px-2 py-0.5 bg-muted rounded-md border",
										children: item.metadata?.type === "URL" ? "URL" : item.metadata?.type === "CONVERSATION" ? "Conversa de Exemplo" : "Texto Manual"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1118,
										columnNumber: 29
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-xs text-muted-foreground",
										children: ["Atualizado em ", new Date(item.updatedAt).toLocaleDateString()]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1121,
										columnNumber: 29
									}, this),
									item.processingStatus === "READY" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md",
										children: "Pronto para IA"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1124,
										columnNumber: 67
									}, this),
									item.processingStatus === "PROCESSING" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md",
										children: "Processando..."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1125,
										columnNumber: 72
									}, this),
									item.processingStatus === "ERROR" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-md",
										title: item.processingError || "Erro desconhecido",
										children: "Erro"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1126,
										columnNumber: 67
									}, this),
									item.processingStatus === "DRAFT" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md",
										children: "Pendente"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1127,
										columnNumber: 67
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1117,
								columnNumber: 27
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1115,
							columnNumber: 25
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: item.status === "ACTIVE" ? "ativo" : "pausado" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1131,
									columnNumber: 27
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "secondary",
									size: "sm",
									onClick: () => void handlePrepareForAI(item),
									disabled: preparingKnowledgeId === item.id || item.status === "INACTIVE",
									title: "A preparação organiza o conteúdo para que a IA encontre as informações durante o atendimento.",
									children: preparingKnowledgeId === item.id ? "Preparando..." : item.processingStatus === "ERROR" ? "Tentar Novamente" : item.processingStatus === "READY" ? "Atualizar preparação" : "Preparar conhecimento"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1132,
									columnNumber: 27
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => handleOpenEditKnowledge(item),
									children: "Editar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1135,
									columnNumber: 27
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1130,
							columnNumber: 25
						}, this)]
					}, item.id, true, {
						fileName: _jsxFileName,
						lineNumber: 1114,
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
									lineNumber: 1141,
									columnNumber: 25
								}, this), " Gerenciar Base de Conhecimento"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1140,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1139,
							columnNumber: 21
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1138,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1113,
					columnNumber: 17
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1065,
					columnNumber: 15
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
					className: "mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-base",
						children: "Testar busca no conhecimento"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1151,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground mt-1",
						children: "Use este teste para ver se a IA encontra informações dentro dos conhecimentos preparados."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1152,
						columnNumber: 19
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1150,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "p-6 pt-0 space-y-4",
						children: readyKnowledgeCount === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1158,
								columnNumber: 23
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "text-sm font-medium",
								children: "Você precisa ter pelo menos um conhecimento preparado (Pronto) para testar a busca."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1159,
								columnNumber: 23
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1157,
							columnNumber: 48
						}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									placeholder: "Digite uma pergunta para testar a busca...",
									value: searchQuery,
									onChange: (e) => setSearchQuery(e.target.value),
									onKeyDown: (e) => e.key === "Enter" && handleSearchKnowledge()
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1162,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									onClick: () => void handleSearchKnowledge(),
									disabled: isSearching || !searchQuery.trim(),
									children: isSearching ? "Buscando..." : "Buscar relevante"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1163,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1161,
								columnNumber: 23
							}, this),
							searchError && /* @__PURE__ */ (void 0)("div", {
								className: "text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-lg",
								children: searchError
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1168,
								columnNumber: 39
							}, this),
							searchResults && searchResults.length > 0 && /* @__PURE__ */ (void 0)("div", {
								className: "space-y-3 mt-4",
								children: [/* @__PURE__ */ (void 0)("div", {
									className: "text-sm font-medium",
									children: "Resultados encontrados:"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1173,
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
											lineNumber: 1176,
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
											lineNumber: 1179,
											columnNumber: 33
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1175,
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
										lineNumber: 1183,
										columnNumber: 31
									}, this)]
								}, res.chunkId, true, {
									fileName: _jsxFileName,
									lineNumber: 1174,
									columnNumber: 58
								}, this))]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1172,
								columnNumber: 69
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1160,
							columnNumber: 30
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1156,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1149,
					columnNumber: 15
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1064,
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
						lineNumber: 1196,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1195,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1194,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1193,
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
						lineNumber: 1204,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1203,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1202,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1201,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "seguranca",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
					className: "flex flex-row items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-base",
						children: "Regras de Segurança e Gatilhos"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1213,
						columnNumber: 21
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground mt-1",
						children: "Configure limites de comportamento (Guardrails) e ações automáticas (Gatilhos)."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1214,
						columnNumber: 21
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1212,
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
									lineNumber: 1218,
									columnNumber: 41
								}, this), " Adicionar regra de segurança"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1218,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1217,
							columnNumber: 21
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: "Nova Regra de Segurança" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1222,
								columnNumber: 25
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1221,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "space-y-4 py-4",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Nome da regra",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, { placeholder: "Ex: Não divulgar descontos" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1226,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1225,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Tipo da regra",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										defaultValue: "bloquear",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1230,
											columnNumber: 44
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1230,
											columnNumber: 29
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "bloquear",
												children: "Bloquear assunto"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1232,
												columnNumber: 31
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "nao-inventar",
												children: "Não inventar resposta"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1233,
												columnNumber: 31
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "transferir",
												children: "Transferir para humano"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1234,
												columnNumber: 31
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1231,
											columnNumber: 29
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1229,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1228,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1224,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								onClick: () => setIsAddingSecurityRule(false),
								children: "Cancelar"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1240,
								columnNumber: 25
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								onClick: () => setIsAddingSecurityRule(false),
								children: "Salvar regra"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1241,
								columnNumber: 25
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1239,
								columnNumber: 23
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1220,
							columnNumber: 21
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1216,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1211,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 pt-0 space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
								className: "text-sm font-semibold flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TriangleAlert, { className: "h-4 w-4 text-amber-500" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1250,
									columnNumber: 23
								}, this), "Guardrails (Limites e Restrições)"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1249,
								columnNumber: 21
							}, this), securityRules.filter((r) => r.type !== "transferir").map((rule) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
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
											lineNumber: 1257,
											columnNumber: 29
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1255,
										columnNumber: 27
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "text-sm text-muted-foreground mt-1",
										children: rule.instruction
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1259,
										columnNumber: 27
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1254,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "text-xs font-medium",
										children: rule.active ? "Ativa" : "Inativa"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1262,
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
										lineNumber: 1263,
										columnNumber: 27
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1261,
									columnNumber: 25
								}, this)]
							}, rule.id, true, {
								fileName: _jsxFileName,
								lineNumber: 1253,
								columnNumber: 85
							}, this))]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1248,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "space-y-3 pt-4 border-t",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
									className: "text-sm font-semibold flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4 w-4 text-blue-500" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1276,
											columnNumber: 23
										}, this),
										"Gatilhos (Ações Automáticas)",
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
											variant: "secondary",
											className: "text-[10px] uppercase",
											children: "Em breve"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1278,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1275,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-xs text-muted-foreground mb-3",
									children: "Defina comportamentos que disparam ações na plataforma, como agendar na agenda ou transferir o chat."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1280,
									columnNumber: 21
								}, this),
								securityRules.filter((r) => r.type === "transferir").map((rule) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-blue-50/50",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "font-medium flex items-center gap-2",
											children: [rule.name, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
												variant: "outline",
												className: "bg-blue-100 text-blue-800 border-blue-200",
												children: rule.type
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1285,
												columnNumber: 29
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1283,
											columnNumber: 27
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "text-sm text-muted-foreground mt-1",
											children: rule.instruction
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1287,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1282,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "text-xs font-medium",
											children: rule.active ? "Ativa" : "Inativa"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1290,
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
											lineNumber: 1291,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1289,
										columnNumber: 25
									}, this)]
								}, rule.id, true, {
									fileName: _jsxFileName,
									lineNumber: 1281,
									columnNumber: 85
								}, this)),
								securityRules.filter((r) => r.type === "transferir").length === 0 && /* @__PURE__ */ (void 0)("div", {
									className: "text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center",
									children: "Nenhum gatilho configurado. Use o botão acima para adicionar."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1299,
									columnNumber: 89
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1274,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "pt-4 border-t space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "text-sm font-medium",
									children: "Filtros Nativos do Sistema"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1305,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
									label: "Não responder sem base de conhecimento",
									desc: "Mantido no runtime determinístico do backend",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1306,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
									label: "Não chamar IA externa",
									desc: "Nenhuma integração com provedores é feita no frontend",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1307,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
									label: "Não expor segredos",
									desc: "Todos os tokens continuam apenas no backend",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1308,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1304,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1246,
					columnNumber: 17
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1210,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1209,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "publicacao",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid md:grid-cols-2 gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
							className: "md:col-span-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
								className: "text-base",
								children: "Canais de Publicação"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1318,
								columnNumber: 21
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1317,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
								className: "space-y-4",
								children: !selectedAssistantId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "rounded-lg border border-dashed p-4 text-sm text-muted-foreground",
									children: "Salve o assistente primeiro para vinculá-lo a um ou mais canais da empresa."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1321,
									columnNumber: 45
								}, this) : publicationSummary.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "rounded-lg border border-dashed p-4 text-sm text-muted-foreground",
									children: [
										"Nenhum canal cadastrado para esta empresa. Cadastre uma inbox em",
										" ",
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
											to: "/canais",
											className: "font-medium text-primary underline-offset-4 hover:underline",
											children: "Canais"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1325,
											columnNumber: 25
										}, this),
										" ",
										"e depois volte para publicar este assistente."
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1323,
									columnNumber: 66
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "grid gap-3 lg:grid-cols-2",
									children: publicationSummary.map((channel) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "rounded-xl border p-4 space-y-3",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex items-start justify-between gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "font-medium truncate",
													children: channel.name
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1333,
													columnNumber: 33
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "text-xs text-muted-foreground",
													children: [
														"Chatwoot / WhatsApp · Account ",
														channel.accountId,
														" · Inbox ",
														channel.inboxId
													]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1334,
													columnNumber: 33
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1332,
												columnNumber: 31
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: channel.isActive ? "ativo" : "pausado" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1338,
												columnNumber: 31
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1331,
											columnNumber: 29
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-3 py-3",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "text-sm font-medium",
													children: channel.linkedToCurrentAssistant ? "Publicado neste canal" : channel.linkedToOtherAssistant ? `Vinculado a ${channel.assistantName ?? "outro assistente"}` : "Disponível para publicação"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1343,
													columnNumber: 33
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "text-xs text-muted-foreground",
													children: channel.linkedToOtherAssistant ? "Desvincule o assistente atual deste inbox antes de publicar aqui." : channel.isActive ? "Este assistente poderá responder este inbox quando estiver ativo." : "Canal pausado: o vínculo fica salvo, mas o runtime não responde."
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1346,
													columnNumber: 33
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1342,
												columnNumber: 31
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
												checked: channel.linkedToCurrentAssistant,
												disabled: publicationSavingId === channel.id || !channel.linkedToCurrentAssistant && channel.linkedToOtherAssistant,
												onCheckedChange: (checked) => void publishAssistantOnChannel(channel, checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1350,
												columnNumber: 31
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1341,
											columnNumber: 29
										}, this)]
									}, channel.id, true, {
										fileName: _jsxFileName,
										lineNumber: 1330,
										columnNumber: 60
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1329,
									columnNumber: 32
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1320,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1316,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
							className: "md:col-span-1",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
								className: "text-base",
								children: "Revisão Final"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1359,
								columnNumber: 21
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1358,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
								className: "space-y-4",
								children: [
									!name.trim() && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1363,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "O nome do agente é obrigatório."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1364,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1362,
										columnNumber: 38
									}, this),
									!instructions.trim() && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1367,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Você está usando o prompt padrão do sistema. Recomendamos personalizar as instruções."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1368,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1366,
										columnNumber: 46
									}, this),
									activeKnowledgeCount === 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1371,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Nenhum conhecimento ativo foi adicionado. O agente responderá apenas com base no prompt."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1372,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1370,
										columnNumber: 52
									}, this),
									activeKnowledgeCount > 0 && readyKnowledgeCount === 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1375,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "O agente ainda não possui conhecimento preparado para IA. Ele responderá apenas com base no prompt."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1376,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1374,
										columnNumber: 79
									}, this),
									draftKnowledgeCount > 0 && readyKnowledgeCount > 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1379,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Existem conhecimentos ativos que ainda não foram preparados para IA."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1380,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1378,
										columnNumber: 76
									}, this),
									errorKnowledgeCount > 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg border border-red-200 dark:border-red-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1383,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Alguns conhecimentos falharam na preparação. Revise antes de publicar."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1384,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1382,
										columnNumber: 49
									}, this),
									knowledge.filter((k) => k.status === "INACTIVE").length > 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1387,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Você tem conhecimentos inativos que não serão utilizados pela IA."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1388,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1386,
										columnNumber: 83
									}, this),
									readyKnowledgeCount > 0 && /* @__PURE__ */ (void 0)("div", {
										className: `flex items-center gap-2 p-3 rounded-lg border ${ragEnabled ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900/50" : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50"}`,
										children: /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: ragEnabled ? "Os conhecimentos preparados estão ATIVOS para o atendimento real! A IA usará esses documentos para responder." : "Os conhecimentos preparados podem ser testados na aba Preview. A integração real com a IA está DESATIVADA."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1391,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1390,
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
												lineNumber: 1397,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Nome do Agente",
												value: name || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1398,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Status Planejado",
												value: isActive ? "Ativo" : "Inativo"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1399,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Endereço",
												value: businessAddress || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1400,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Cidade / Região",
												value: businessCityRegion || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1401,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Link do Google Maps",
												value: googleMapsUrl ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "flex items-center gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "Sim" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1403,
														columnNumber: 31
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
														variant: "link",
														size: "sm",
														className: "h-auto p-0 text-xs font-semibold text-primary hover:underline",
														type: "button",
														onClick: () => window.open(googleMapsUrl, "_blank"),
														children: "Abrir localização"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1404,
														columnNumber: 31
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1402,
													columnNumber: 83
												}, this) : "Não"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1402,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Horário",
												value: aiAlwaysAvailable ? "Atende 24h" : "Respeita horário da empresa"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1408,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Personalidade",
												value: personality || "Não definida"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1409,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Tom de voz",
												value: toneOfVoice || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1410,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Modelo da IA",
												value: model || "Padrão do sistema"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1411,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Temperatura",
												value: `${temperature ?? .2} - ${getTemperatureDescription(temperature ?? .2)}`
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1412,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Buffer de mensagens",
												value: messageBufferEnabled ? `${messageBufferSeconds}s de espera` : "Desativado (Responde na hora)"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1413,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Mensagem inicial",
												value: initialMessage.trim() ? "Configurada" : "Não configurada"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1414,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Prompt Principal",
												value: instructions.trim() ? "Configurado" : "Padrão do sistema"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1415,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Mensagem fallback",
												value: "Configurada"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1416,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Conhecimento Ativo",
												value: `${activeKnowledgeCount} itens (${readyKnowledgeCount} preparados)`
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1417,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Conhecimento no Atendimento Real",
												value: ragEnabled ? "Ativado" : "Desativado"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1418,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Regras de Segurança",
												value: `${securityRules.filter((r) => r.active).length} ativas`
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1419,
												columnNumber: 23
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1396,
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
												lineNumber: 1424,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
												htmlFor: "confirm-review",
												className: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
												children: "Confirmo que revisei as alterações e desejo salvar este agente."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1425,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1423,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
											className: "w-full",
											onClick: () => void handleSave(),
											disabled: saving || !name.trim() || !isReviewConfirmed,
											children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4 mr-2" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1431,
													columnNumber: 25
												}, this),
												" ",
												saving ? "Salvando..." : "Confirmar e salvar alterações"
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1430,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1422,
										columnNumber: 21
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1361,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1357,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
							className: "md:col-span-1",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
								className: "text-base",
								children: "Exemplo de Conversa (Simulação)"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1439,
								columnNumber: 21
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1438,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
								className: "space-y-4 flex flex-col h-full",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "p-4 rounded-lg border bg-muted/20 space-y-4 min-h-[400px] flex-1 flex flex-col",
									children: [
										initialMessage.trim() && /* @__PURE__ */ (void 0)("div", {
											className: "flex gap-3",
											children: [/* @__PURE__ */ (void 0)("div", {
												className: "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0",
												children: "IA"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1444,
												columnNumber: 27
											}, this), /* @__PURE__ */ (void 0)("div", {
												className: "bg-primary/5 border rounded-lg p-3 text-sm flex-1",
												children: initialMessage
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1447,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1443,
											columnNumber: 49
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex flex-row-reverse gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0",
												children: "VC"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1453,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "bg-muted border rounded-lg p-3 text-sm",
												children: previewQuestion
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1456,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1452,
											columnNumber: 23
										}, this),
										previewLoading && /* @__PURE__ */ (void 0)("div", {
											className: "flex gap-3",
											children: [/* @__PURE__ */ (void 0)("div", {
												className: "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0",
												children: "IA"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1462,
												columnNumber: 27
											}, this), /* @__PURE__ */ (void 0)("div", {
												className: "bg-primary/5 border rounded-lg p-3 text-sm flex items-center gap-2",
												children: [
													/* @__PURE__ */ (void 0)("span", { className: "w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1466,
														columnNumber: 29
													}, this),
													/* @__PURE__ */ (void 0)("span", {
														className: "w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce",
														style: { animationDelay: "0.2s" }
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1467,
														columnNumber: 29
													}, this),
													/* @__PURE__ */ (void 0)("span", {
														className: "w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce",
														style: { animationDelay: "0.4s" }
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1470,
														columnNumber: 29
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1465,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1461,
											columnNumber: 42
										}, this),
										previewResult && /* @__PURE__ */ (void 0)("div", {
											className: "flex gap-3",
											children: [/* @__PURE__ */ (void 0)("div", {
												className: "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0",
												children: "IA"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1477,
												columnNumber: 27
											}, this), /* @__PURE__ */ (void 0)("div", {
												className: "bg-primary/5 border rounded-lg p-3 text-sm flex-1 space-y-2",
												children: [
													/* @__PURE__ */ (void 0)("div", { children: previewResult.answer }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1481,
														columnNumber: 29
													}, this),
													previewResult.sources.length > 0 && /* @__PURE__ */ (void 0)("div", {
														className: "mt-3 pt-3 border-t text-xs",
														children: [/* @__PURE__ */ (void 0)("div", {
															className: "font-medium text-muted-foreground mb-1",
															children: "Fontes manuais sugeridas:"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1483,
															columnNumber: 33
														}, this), previewResult.sources.map((source) => /* @__PURE__ */ (void 0)("div", {
															className: "truncate",
															children: ["• ", source.title]
														}, source.id, true, {
															fileName: _jsxFileName,
															lineNumber: 1484,
															columnNumber: 70
														}, this))]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1482,
														columnNumber: 66
													}, this),
													previewResult.ragEnabled && /* @__PURE__ */ (void 0)("div", {
														className: "mt-3 pt-3 border-t text-xs",
														children: [/* @__PURE__ */ (void 0)("div", {
															className: "font-medium text-blue-600 mb-1 flex items-center gap-1",
															children: [/* @__PURE__ */ (void 0)(Sparkles, { className: "h-3 w-3" }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1490,
																columnNumber: 35
															}, this), " Conhecimentos usados neste teste:"]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 1489,
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
																		lineNumber: 1495,
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
																		lineNumber: 1496,
																		columnNumber: 43
																	}, this)]
																}, void 0, true, {
																	fileName: _jsxFileName,
																	lineNumber: 1494,
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
																	lineNumber: 1500,
																	columnNumber: 41
																}, this)]
															}, k.chunkId, true, {
																fileName: _jsxFileName,
																lineNumber: 1493,
																columnNumber: 75
															}, this)), /* @__PURE__ */ (void 0)("div", {
																className: "text-[10px] text-muted-foreground pt-1",
																children: ["Total de blocos analisados: ", previewResult.totalChunksScanned]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1504,
																columnNumber: 37
															}, this)]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 1492,
															columnNumber: 106
														}, this) : /* @__PURE__ */ (void 0)("div", {
															className: "text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 italic",
															children: "Nenhum conhecimento relevante foi encontrado para esta pergunta."
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1507,
															columnNumber: 44
														}, this)]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1488,
														columnNumber: 58
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1480,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1476,
											columnNumber: 41
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1442,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											className: "text-xs",
											children: "Faça uma pergunta para testar as respostas"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1516,
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
												lineNumber: 1519,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
												htmlFor: "use-rag-preview",
												className: "text-xs text-muted-foreground cursor-pointer",
												children: "Usar conhecimento preparado neste teste"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1520,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1518,
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
												lineNumber: 1526,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												onClick: () => void handlePreview(),
												disabled: !selectedAssistantId || previewLoading,
												variant: "secondary",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4 w-4 mr-2" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1528,
														columnNumber: 27
													}, this),
													" ",
													previewLoading ? "Simulando..." : "Simular"
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1527,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1525,
											columnNumber: 23
										}, this),
										!selectedAssistantId && /* @__PURE__ */ (void 0)("p", {
											className: "text-[10px] text-muted-foreground",
											children: "Salve o agente primeiro para habilitar a simulação."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1531,
											columnNumber: 48
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1515,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1441,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1437,
							columnNumber: 17
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1315,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1314,
				columnNumber: 13
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 737,
		columnNumber: 11
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 712,
		columnNumber: 206
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 692,
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
			lineNumber: 1552,
			columnNumber: 9
		}, this), desc && /* @__PURE__ */ (void 0)("div", {
			className: "text-xs text-muted-foreground",
			children: desc
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1553,
			columnNumber: 18
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1551,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "h-8 w-8 rounded-full border grid place-items-center text-xs",
			children: defaultChecked ? "✓" : "—"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1555,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1550,
		columnNumber: 10
	}, this);
}
function Summary({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex justify-between gap-4 py-2 border-b last:border-0 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-muted-foreground shrink-0",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1568,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "font-medium text-right",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1569,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1567,
		columnNumber: 10
	}, this);
}
//#endregion
export { NovoAgente as component };
