import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { a as Trigger2, i as Root2, n as Header, r as Item, t as Content2 } from "./_libs/@radix-ui/react-accordion+[...].mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { n as apiFetch } from "./_ssr/apiClient-DG1jAm9p.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-Dc1_O9TA.mjs";
import { n as CheckboxIndicator, t as Checkbox$1 } from "./_libs/@radix-ui/react-checkbox+[...].mjs";
import { i as TooltipTrigger, n as TooltipContent, r as TooltipProvider, t as Tooltip } from "./_ssr/tooltip-CfLI383Z.mjs";
import { Ft as LoaderCircle, G as Link2, I as Pause, M as Plus, Nt as Sparkles, Ot as ArrowLeft, P as Pencil, Rt as CircleQuestionMark, T as Save, _ as Shield, _t as ChevronDown, d as Trash, f as Trash2, jt as TriangleAlert, nt as Eye, vt as Check, zt as CirclePlay } from "./_libs/lucide-react.mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-DVbabvC9.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { r as resolveOperationalAssistantId, t as filterOperationalAssistants } from "./_ssr/assistants-dUhtu6_2.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { t as backendAssistantsService } from "./_ssr/backendAssistantsService-C9NI7_6k.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./_ssr/dialog-BQR4UioY.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { t as chatwootSettingsService } from "./_ssr/chatwootSettingsService-o2miYVcI.mjs";
import { t as Route } from "./_app.agentes.novo-C5vcCjTB.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./_ssr/tabs-Bfe67_Ib.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "./_libs/radix-ui__react-slider.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.agentes.novo-BWUhYQ2e.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName$7 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/field.tsx";
function Field({ label, children, className, helper }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: `space-y-2 ${className || ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, { children: label }, void 0, false, {
				fileName: _jsxFileName$7,
				lineNumber: 14,
				columnNumber: 7
			}, this),
			children,
			helper && /* @__PURE__ */ (void 0)("p", {
				className: "text-[0.8rem] text-muted-foreground",
				children: helper
			}, void 0, false, {
				fileName: _jsxFileName$7,
				lineNumber: 16,
				columnNumber: 18
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$7,
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
var _jsxFileName$6 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/assistant/AssistantBehaviorTab.tsx";
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
			fileName: _jsxFileName$6,
			lineNumber: 150,
			columnNumber: 13
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$6,
		lineNumber: 149,
		columnNumber: 11
	}, void 0) }, void 0, false, {
		fileName: _jsxFileName$6,
		lineNumber: 148,
		columnNumber: 9
	}, void 0);
	if (loading) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-6 flex justify-center items-center h-40",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
			fileName: _jsxFileName$6,
			lineNumber: 162,
			columnNumber: 13
		}, void 0)
	}, void 0, false, {
		fileName: _jsxFileName$6,
		lineNumber: 161,
		columnNumber: 11
	}, void 0) }, void 0, false, {
		fileName: _jsxFileName$6,
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
						fileName: _jsxFileName$6,
						lineNumber: 173,
						columnNumber: 15
					}, void 0)
				}, void 0, false, {
					fileName: _jsxFileName$6,
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
							fileName: _jsxFileName$6,
							lineNumber: 181,
							columnNumber: 17
						}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "text-sm",
							children: "Exibir na resposta"
						}, void 0, false, {
							fileName: _jsxFileName$6,
							lineNumber: 185,
							columnNumber: 17
						}, void 0)]
					}, void 0, true, {
						fileName: _jsxFileName$6,
						lineNumber: 180,
						columnNumber: 15
					}, void 0)
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 179,
					columnNumber: 13
				}, void 0)]
			}, void 0, true, {
				fileName: _jsxFileName$6,
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
					fileName: _jsxFileName$6,
					lineNumber: 191,
					columnNumber: 13
				}, void 0)
			}, void 0, false, {
				fileName: _jsxFileName$6,
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
					fileName: _jsxFileName$6,
					lineNumber: 199,
					columnNumber: 13
				}, void 0)
			}, void 0, false, {
				fileName: _jsxFileName$6,
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
							fileName: _jsxFileName$6,
							lineNumber: 214,
							columnNumber: 19
						}, void 0) }, void 0, false, {
							fileName: _jsxFileName$6,
							lineNumber: 213,
							columnNumber: 17
						}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "none",
								children: "Nenhum (Proibido)"
							}, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 217,
								columnNumber: 19
							}, void 0),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "low",
								children: "Baixo (Raramente)"
							}, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 218,
								columnNumber: 19
							}, void 0),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
								value: "moderate",
								children: "Moderado"
							}, void 0, false, {
								fileName: _jsxFileName$6,
								lineNumber: 219,
								columnNumber: 19
							}, void 0)
						] }, void 0, true, {
							fileName: _jsxFileName$6,
							lineNumber: 216,
							columnNumber: 17
						}, void 0)]
					}, void 0, true, {
						fileName: _jsxFileName$6,
						lineNumber: 209,
						columnNumber: 15
					}, void 0)
				}, void 0, false, {
					fileName: _jsxFileName$6,
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
							fileName: _jsxFileName$6,
							lineNumber: 229,
							columnNumber: 19
						}, void 0) }, void 0, false, {
							fileName: _jsxFileName$6,
							lineNumber: 228,
							columnNumber: 17
						}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "fallback",
							children: "Responder mensagem padrão (Fallback)"
						}, void 0, false, {
							fileName: _jsxFileName$6,
							lineNumber: 232,
							columnNumber: 19
						}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "handoff",
							children: "Transferir para humano (Handoff)"
						}, void 0, false, {
							fileName: _jsxFileName$6,
							lineNumber: 233,
							columnNumber: 19
						}, void 0)] }, void 0, true, {
							fileName: _jsxFileName$6,
							lineNumber: 231,
							columnNumber: 17
						}, void 0)]
					}, void 0, true, {
						fileName: _jsxFileName$6,
						lineNumber: 224,
						columnNumber: 15
					}, void 0)
				}, void 0, false, {
					fileName: _jsxFileName$6,
					lineNumber: 223,
					columnNumber: 13
				}, void 0)]
			}, void 0, true, {
				fileName: _jsxFileName$6,
				lineNumber: 207,
				columnNumber: 11
			}, void 0),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex justify-end pt-4 border-t",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: handleSave,
					disabled: saving,
					children: [saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }, void 0, false, {
						fileName: _jsxFileName$6,
						lineNumber: 241,
						columnNumber: 26
					}, void 0), "Salvar Comportamento"]
				}, void 0, true, {
					fileName: _jsxFileName$6,
					lineNumber: 240,
					columnNumber: 13
				}, void 0)
			}, void 0, false, {
				fileName: _jsxFileName$6,
				lineNumber: 239,
				columnNumber: 11
			}, void 0)
		]
	}, void 0, true, {
		fileName: _jsxFileName$6,
		lineNumber: 170,
		columnNumber: 9
	}, void 0) }, void 0, false, {
		fileName: _jsxFileName$6,
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
var _jsxFileName$5 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/assistant/AssistantFlowsTab.tsx";
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
	const [isEditingMode, setIsEditingMode] = (0, import_react.useState)(false);
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
		setIsEditingMode(true);
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
		setIsEditingMode(true);
	};
	const handleCancel = () => {
		setIsEditingMode(false);
		setEditingFlow(null);
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
			setIsEditingMode(false);
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
			fileName: _jsxFileName$5,
			lineNumber: 253,
			columnNumber: 11
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 252,
		columnNumber: 9
	}, this) }, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 251,
		columnNumber: 7
	}, this);
	if (loading) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-6 flex justify-center items-center h-40",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-8 w-8 animate-spin text-primary" }, void 0, false, {
			fileName: _jsxFileName$5,
			lineNumber: 265,
			columnNumber: 11
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 264,
		columnNumber: 9
	}, this) }, void 0, false, {
		fileName: _jsxFileName$5,
		lineNumber: 263,
		columnNumber: 7
	}, this);
	if (isEditingMode) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "outline",
					size: "sm",
					onClick: handleCancel,
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowLeft, { className: "h-4 w-4 mr-2" }, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 277,
						columnNumber: 15
					}, this), "Voltar"]
				}, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 276,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
					className: "text-xl font-semibold tracking-tight",
					children: editingFlow ? `Editar Fluxo: ${formData.name}` : "Novo Fluxo"
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 281,
					columnNumber: 15
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-sm text-muted-foreground",
					children: "Configure as regras, gatilhos de intenção e ações para este fluxo."
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 284,
					columnNumber: 15
				}, this)] }, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 280,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$5,
				lineNumber: 275,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center space-x-2 border rounded-lg px-3 py-1.5 bg-accent/5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
							id: "header-flow-active",
							checked: formData.active,
							onCheckedChange: (c) => setFormData({
								...formData,
								active: c
							})
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 292,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
							htmlFor: "header-flow-active",
							className: "text-sm font-medium cursor-pointer",
							children: formData.active ? "Fluxo Ativo" : "Fluxo Inativo"
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 297,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 291,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						variant: "outline",
						onClick: handleCancel,
						children: "Cancelar"
					}, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 301,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						onClick: handleSave,
						disabled: saving,
						children: [saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 305,
							columnNumber: 26
						}, this), "Salvar"]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 304,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$5,
				lineNumber: 290,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$5,
			lineNumber: 274,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-6 space-y-6",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-6",
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
								fileName: _jsxFileName$5,
								lineNumber: 316,
								columnNumber: 19
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 315,
							columnNumber: 17
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
								fileName: _jsxFileName$5,
								lineNumber: 323,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-xs text-muted-foreground mt-1",
								children: "Maior número = avaliado primeiro."
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 330,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$5,
							lineNumber: 322,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 314,
						columnNumber: 15
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
							fileName: _jsxFileName$5,
							lineNumber: 337,
							columnNumber: 17
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 336,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "border-t pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", {
							className: "font-semibold text-base mb-3 text-primary",
							children: "Gatilhos de Intenção"
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 345,
							columnNumber: 17
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
									rows: 5
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 348,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-xs text-muted-foreground mt-1",
									children: "Uma palavra ou frase curta por linha."
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 359,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$5,
								lineNumber: 347,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Quando usar este fluxo?",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
									value: formData.triggerDescription || "",
									onChange: (e) => setFormData({
										...formData,
										triggerDescription: e.target.value
									}),
									placeholder: "Ex: O cliente quer reservar um horário.",
									rows: 5
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 364,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-xs text-muted-foreground mt-1",
									children: "Usado pela IA caso as palavras-chave falhem."
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 372,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$5,
								lineNumber: 363,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$5,
							lineNumber: 346,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 344,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "border-t pt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", {
								className: "font-semibold text-base mb-3 text-primary",
								children: "Execução do Fluxo"
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 380,
								columnNumber: 17
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
									rows: 5
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 382,
									columnNumber: 19
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 381,
								columnNumber: 17
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
											fileName: _jsxFileName$5,
											lineNumber: 397,
											columnNumber: 25
										}, this) }, void 0, false, {
											fileName: _jsxFileName$5,
											lineNumber: 396,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "respond",
												children: "A IA responde"
											}, void 0, false, {
												fileName: _jsxFileName$5,
												lineNumber: 400,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "fixed_message",
												children: "Mensagem fixa"
											}, void 0, false, {
												fileName: _jsxFileName$5,
												lineNumber: 401,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "handoff",
												children: "Encaminhar para humano"
											}, void 0, false, {
												fileName: _jsxFileName$5,
												lineNumber: 402,
												columnNumber: 25
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName$5,
											lineNumber: 399,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName$5,
										lineNumber: 392,
										columnNumber: 21
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-xs text-muted-foreground mt-1",
										children: [
											formData.finalAction === "respond" && "Usa a IA normalmente com as regras e ferramentas permitidas.",
											formData.finalAction === "fixed_message" && "Responde exatamente o texto configurado, sem chamar LLM.",
											formData.finalAction === "handoff" && "Não deixa a IA tentar resolver sozinha."
										]
									}, void 0, true, {
										fileName: _jsxFileName$5,
										lineNumber: 405,
										columnNumber: 21
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$5,
									lineNumber: 391,
									columnNumber: 19
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
											fileName: _jsxFileName$5,
											lineNumber: 416,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
											className: "text-sm",
											children: "Fluxo ativado"
										}, void 0, false, {
											fileName: _jsxFileName$5,
											lineNumber: 420,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName$5,
										lineNumber: 415,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 414,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$5,
								lineNumber: 390,
								columnNumber: 17
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 379,
						columnNumber: 15
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
							rows: 3
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 428,
							columnNumber: 19
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 427,
						columnNumber: 17
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
							fileName: _jsxFileName$5,
							lineNumber: 439,
							columnNumber: 19
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 438,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "border-t pt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", {
								className: "font-semibold text-base mb-3 text-primary",
								children: "Escopo da Agenda"
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 448,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-xs text-muted-foreground mb-4",
								children: "Use estes campos para obrigar as ferramentas de agenda a consultar apenas recursos compatíveis com este fluxo."
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 449,
								columnNumber: 17
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
											fileName: _jsxFileName$5,
											lineNumber: 455,
											columnNumber: 21
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName$5,
										lineNumber: 454,
										columnNumber: 19
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
											fileName: _jsxFileName$5,
											lineNumber: 467,
											columnNumber: 21
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName$5,
										lineNumber: 466,
										columnNumber: 19
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
											fileName: _jsxFileName$5,
											lineNumber: 479,
											columnNumber: 21
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName$5,
										lineNumber: 478,
										columnNumber: 19
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
											fileName: _jsxFileName$5,
											lineNumber: 491,
											columnNumber: 21
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName$5,
										lineNumber: 490,
										columnNumber: 19
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$5,
								lineNumber: 453,
								columnNumber: 17
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 447,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "border-t pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", {
							className: "font-semibold text-base mb-3 text-primary",
							children: "Configurações Adicionais"
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 509,
							columnNumber: 17
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
											fileName: _jsxFileName$5,
											lineNumber: 513,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
											className: "text-sm",
											children: "Se desativado, pulará a LLM"
										}, void 0, false, {
											fileName: _jsxFileName$5,
											lineNumber: 517,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName$5,
										lineNumber: 512,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 511,
									columnNumber: 19
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
											fileName: _jsxFileName$5,
											lineNumber: 522,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
											className: "text-sm",
											children: "Força bypass da LLM e transbordo"
										}, void 0, false, {
											fileName: _jsxFileName$5,
											lineNumber: 526,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName$5,
										lineNumber: 521,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 520,
									columnNumber: 19
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
										rows: 3
									}, void 0, false, {
										fileName: _jsxFileName$5,
										lineNumber: 530,
										columnNumber: 21
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-xs text-muted-foreground mt-1",
										children: "Uma ferramenta por linha. Vazio libera todas as globais."
									}, void 0, false, {
										fileName: _jsxFileName$5,
										lineNumber: 541,
										columnNumber: 21
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$5,
									lineNumber: 529,
									columnNumber: 19
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
										rows: 3
									}, void 0, false, {
										fileName: _jsxFileName$5,
										lineNumber: 546,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 545,
									columnNumber: 19
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
										rows: 3
									}, void 0, false, {
										fileName: _jsxFileName$5,
										lineNumber: 556,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$5,
									lineNumber: 555,
									columnNumber: 19
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$5,
							lineNumber: 510,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 508,
						columnNumber: 15
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$5,
				lineNumber: 313,
				columnNumber: 13
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex justify-end gap-2 pt-6 border-t mt-6",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "outline",
					onClick: handleCancel,
					children: "Cancelar"
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 570,
					columnNumber: 15
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: handleSave,
					disabled: saving,
					children: [saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 574,
						columnNumber: 28
					}, this), "Salvar"]
				}, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 573,
					columnNumber: 15
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$5,
				lineNumber: 569,
				columnNumber: 13
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$5,
			lineNumber: 312,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName$5,
			lineNumber: 311,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$5,
		lineNumber: 273,
		columnNumber: 7
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex justify-between items-start mb-6",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "max-w-3xl pr-4",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
					className: "text-lg font-medium",
					children: "Fluxos da IA"
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 588,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-sm text-muted-foreground mt-1",
					children: "Fluxos são regras específicas acionadas por intenção. Use fluxos para assuntos como agendamento, financeiro, restaurante, Goomer Delivery ou atendimento humano. O prompt global continua valendo, mas o fluxo selecionado pode limitar ferramentas, usar mensagem fixa ou encaminhar para humano."
				}, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 589,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$5,
				lineNumber: 587,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				onClick: handleOpenNew,
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "mr-2 h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName$5,
					lineNumber: 597,
					columnNumber: 11
				}, this), "Novo Fluxo"]
			}, void 0, true, {
				fileName: _jsxFileName$5,
				lineNumber: 596,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$5,
			lineNumber: 586,
			columnNumber: 7
		}, this), flows.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-6 text-center text-muted-foreground py-12",
			children: "Nenhum fluxo cadastrado. A IA responderá normalmente conforme o comportamento base."
		}, void 0, false, {
			fileName: _jsxFileName$5,
			lineNumber: 604,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName$5,
			lineNumber: 603,
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
								fileName: _jsxFileName$5,
								lineNumber: 615,
								columnNumber: 21
							}, this),
							!flow.active && /* @__PURE__ */ (void 0)(Badge, {
								variant: "secondary",
								children: "Inativo"
							}, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 616,
								columnNumber: 38
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
								variant: "outline",
								children: ["Prioridade: ", flow.priority]
							}, void 0, true, {
								fileName: _jsxFileName$5,
								lineNumber: 617,
								columnNumber: 21
							}, this),
							flow.toolContext?.calendar?.category && /* @__PURE__ */ (void 0)(Badge, {
								variant: "outline",
								className: "border-primary/20 bg-primary/5 text-primary",
								children: ["Agenda: ", flow.toolContext.calendar.category]
							}, void 0, true, {
								fileName: _jsxFileName$5,
								lineNumber: 619,
								columnNumber: 23
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 614,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground",
						children: flow.description
					}, void 0, false, {
						fileName: _jsxFileName$5,
						lineNumber: 627,
						columnNumber: 19
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 613,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => handleOpenEdit(flow),
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 631,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 630,
							columnNumber: 19
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "outline",
							size: "sm",
							className: "text-destructive",
							onClick: () => handleDelete(flow.id),
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$5,
								lineNumber: 639,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$5,
							lineNumber: 633,
							columnNumber: 19
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$5,
						lineNumber: 629,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$5,
					lineNumber: 612,
					columnNumber: 15
				}, this)
			}, flow.id, false, {
				fileName: _jsxFileName$5,
				lineNumber: 611,
				columnNumber: 13
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName$5,
			lineNumber: 609,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$5,
		lineNumber: 585,
		columnNumber: 5
	}, this);
}
var _jsxFileName$4 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/assistant/AssistantToolsTab.tsx";
function AssistantToolsTab({ assistantId }) {
	const [tools, setTools] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!assistantId) return;
		let active = true;
		setLoading(true);
		backendAssistantsService.getTools(assistantId).then((res) => {
			if (active) setTools(res.items || []);
		}).catch((err) => {
			console.error(err);
			toast.error("Não foi possível carregar as ferramentas deste assistente.");
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => {
			active = false;
		};
	}, [assistantId]);
	const toggleToolEnabled = (index) => {
		setTools((prev) => prev.map((t, idx) => idx === index ? {
			...t,
			enabled: !t.enabled
		} : t));
	};
	const updateToolPermission = (index, val) => {
		setTools((prev) => prev.map((t, idx) => idx === index ? {
			...t,
			permissionType: val
		} : t));
	};
	const toggleToolConfirmation = (index) => {
		setTools((prev) => prev.map((t, idx) => idx === index ? {
			...t,
			requiresConfirmation: !t.requiresConfirmation
		} : t));
	};
	const handleSave = async () => {
		setSaving(true);
		try {
			await backendAssistantsService.updateTools(assistantId, tools);
			toast.success("Ferramentas do assistente salvas com sucesso!");
		} catch (err) {
			console.error(err);
			toast.error("Erro ao salvar as ferramentas do assistente.");
		} finally {
			setSaving(false);
		}
	};
	const groupedTools = (0, import_react.useMemo)(() => {
		const groups = {};
		tools.forEach((tool, index) => {
			if (!groups[tool.appId]) groups[tool.appId] = {
				appName: tool.appName,
				appSlug: tool.appSlug,
				tools: []
			};
			groups[tool.appId].tools.push({
				item: tool,
				index
			});
		});
		return Object.values(groups);
	}, [tools]);
	if (!assistantId) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/40 min-h-[250px]",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleQuestionMark, { className: "h-10 w-10 text-muted-foreground/60 mb-2" }, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 111,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
				className: "font-semibold text-lg text-foreground",
				children: "Salvar assistente requerido"
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 112,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-sm text-muted-foreground text-center max-w-sm mt-1",
				children: "Salve o assistente pela primeira vez para liberar a configuração de ferramentas integradas."
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 113,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$4,
		lineNumber: 110,
		columnNumber: 7
	}, this);
	if (loading) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex flex-col items-center justify-center py-12 min-h-[300px]",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-8 w-8 text-primary animate-spin" }, void 0, false, {
			fileName: _jsxFileName$4,
			lineNumber: 123,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-sm text-muted-foreground mt-2",
			children: "Buscando ferramentas ativas..."
		}, void 0, false, {
			fileName: _jsxFileName$4,
			lineNumber: 124,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$4,
		lineNumber: 122,
		columnNumber: 7
	}, this);
	if (tools.length === 0) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/40 min-h-[250px]",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CirclePlay, { className: "h-10 w-10 text-muted-foreground/60 mb-2" }, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 132,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
				className: "font-semibold text-lg text-foreground",
				children: "Nenhum App instalado"
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 133,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-sm text-muted-foreground text-center max-w-sm mt-1",
				children: "Vá na Loja de Aplicativos e instale conexões (ex: Google Agenda, Webhooks) para este tenant."
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 134,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$4,
		lineNumber: 131,
		columnNumber: 7
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
				className: "text-lg font-bold tracking-tight",
				children: "Configurações de Ações e Permissões"
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 145,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-sm text-muted-foreground",
				children: "Defina quais ferramentas de IA este assistente tem permissão para usar nas conversas."
			}, void 0, false, {
				fileName: _jsxFileName$4,
				lineNumber: 146,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName$4,
				lineNumber: 144,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				onClick: handleSave,
				disabled: saving,
				size: "sm",
				className: "gap-2",
				children: [saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
					fileName: _jsxFileName$4,
					lineNumber: 151,
					columnNumber: 21
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName$4,
					lineNumber: 151,
					columnNumber: 68
				}, this), "Salvar Permissões"]
			}, void 0, true, {
				fileName: _jsxFileName$4,
				lineNumber: 150,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$4,
			lineNumber: 143,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipProvider, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid gap-6",
			children: groupedTools.map((group) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
				className: "overflow-hidden border-muted/60 shadow-sm",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
					className: "bg-muted/30 border-b border-muted/50 py-4 px-6",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "bg-primary/10 text-primary p-2 rounded-lg",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Shield, { className: "h-5 w-5" }, void 0, false, {
								fileName: _jsxFileName$4,
								lineNumber: 163,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$4,
							lineNumber: 162,
							columnNumber: 19
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
							className: "text-base font-semibold",
							children: group.appName
						}, void 0, false, {
							fileName: _jsxFileName$4,
							lineNumber: 166,
							columnNumber: 21
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, {
							className: "text-xs",
							children: group.appSlug === "google_calendar" ? "Conexões nativas de consulta e agendamento de agenda." : "Ações de integrações HTTP e Webhooks Personalizados."
						}, void 0, false, {
							fileName: _jsxFileName$4,
							lineNumber: 167,
							columnNumber: 21
						}, this)] }, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 165,
							columnNumber: 19
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$4,
						lineNumber: 161,
						columnNumber: 17
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$4,
					lineNumber: 160,
					columnNumber: 15
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "divide-y divide-muted/40 p-0",
					children: group.tools.map(({ item, index }) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: `flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 transition-colors ${item.enabled ? "bg-card" : "bg-muted/10 opacity-70"}`,
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "space-y-1 max-w-xl",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "font-semibold text-sm text-foreground",
									children: item.displayName
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 185,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("code", {
									className: "text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono",
									children: item.toolName
								}, void 0, false, {
									fileName: _jsxFileName$4,
									lineNumber: 186,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$4,
								lineNumber: 184,
								columnNumber: 23
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-xs text-muted-foreground leading-relaxed",
								children: item.description
							}, void 0, false, {
								fileName: _jsxFileName$4,
								lineNumber: 190,
								columnNumber: 23
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 183,
							columnNumber: 21
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex flex-wrap items-center gap-6 self-start sm:self-auto",
							children: [
								item.enabled && /* @__PURE__ */ (void 0)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (void 0)(Label, {
										className: "text-xs text-muted-foreground font-medium",
										children: "Permissão:"
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 197,
										columnNumber: 27
									}, this), /* @__PURE__ */ (void 0)(Select, {
										value: item.permissionType,
										onValueChange: (val) => updateToolPermission(index, val),
										children: [/* @__PURE__ */ (void 0)(SelectTrigger, {
											className: "h-8 w-[100px] text-xs",
											children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
												fileName: _jsxFileName$4,
												lineNumber: 203,
												columnNumber: 31
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 202,
											columnNumber: 29
										}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [/* @__PURE__ */ (void 0)(SelectItem, {
											value: "READ",
											children: /* @__PURE__ */ (void 0)("span", {
												className: "flex items-center gap-1.5",
												children: [/* @__PURE__ */ (void 0)(Eye, { className: "h-3 w-3 text-sky-500" }, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 208,
													columnNumber: 35
												}, this), "Leitura"]
											}, void 0, true, {
												fileName: _jsxFileName$4,
												lineNumber: 207,
												columnNumber: 33
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 206,
											columnNumber: 31
										}, this), /* @__PURE__ */ (void 0)(SelectItem, {
											value: "WRITE",
											children: /* @__PURE__ */ (void 0)("span", {
												className: "flex items-center gap-1.5",
												children: [/* @__PURE__ */ (void 0)(Save, { className: "h-3 w-3 text-emerald-500" }, void 0, false, {
													fileName: _jsxFileName$4,
													lineNumber: 214,
													columnNumber: 35
												}, this), "Escrita"]
											}, void 0, true, {
												fileName: _jsxFileName$4,
												lineNumber: 213,
												columnNumber: 33
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 212,
											columnNumber: 31
										}, this)] }, void 0, true, {
											fileName: _jsxFileName$4,
											lineNumber: 205,
											columnNumber: 29
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName$4,
										lineNumber: 198,
										columnNumber: 27
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 196,
									columnNumber: 25
								}, this),
								item.enabled && /* @__PURE__ */ (void 0)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (void 0)(Tooltip, { children: [/* @__PURE__ */ (void 0)(TooltipTrigger, {
										asChild: true,
										children: /* @__PURE__ */ (void 0)("span", {
											className: "text-xs text-muted-foreground cursor-help underline decoration-dotted decoration-muted-foreground/50",
											children: "Confirmar?"
										}, void 0, false, {
											fileName: _jsxFileName$4,
											lineNumber: 228,
											columnNumber: 31
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 227,
										columnNumber: 29
									}, this), /* @__PURE__ */ (void 0)(TooltipContent, {
										side: "top",
										className: "max-w-[220px] text-xs leading-relaxed",
										children: "Se ativado, a IA perguntará explicitamente ao cliente se ele deseja prosseguir antes de chamar essa ação."
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 232,
										columnNumber: 29
									}, this)] }, void 0, true, {
										fileName: _jsxFileName$4,
										lineNumber: 226,
										columnNumber: 27
									}, this), /* @__PURE__ */ (void 0)(Switch, {
										checked: item.requiresConfirmation,
										onCheckedChange: () => toggleToolConfirmation(index)
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 237,
										columnNumber: 27
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 225,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex items-center gap-2 border-l border-muted/80 pl-4",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										className: "text-xs font-semibold",
										children: "Ativo"
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 246,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
										checked: item.enabled,
										onCheckedChange: () => toggleToolEnabled(index)
									}, void 0, false, {
										fileName: _jsxFileName$4,
										lineNumber: 247,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$4,
									lineNumber: 245,
									columnNumber: 23
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$4,
							lineNumber: 193,
							columnNumber: 21
						}, this)]
					}, item.toolName, true, {
						fileName: _jsxFileName$4,
						lineNumber: 177,
						columnNumber: 19
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName$4,
					lineNumber: 175,
					columnNumber: 15
				}, this)]
			}, group.appName, true, {
				fileName: _jsxFileName$4,
				lineNumber: 159,
				columnNumber: 13
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName$4,
			lineNumber: 157,
			columnNumber: 9
		}, this) }, void 0, false, {
			fileName: _jsxFileName$4,
			lineNumber: 156,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$4,
		lineNumber: 142,
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
var BUSINESS_DAYS = [
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
];
var TIME_PATTERN = /^\d{2}:\d{2}$/;
function createDefaultBusinessHoursSchedule() {
	return {
		monday: [{
			start: "08:00",
			end: "18:00"
		}],
		tuesday: [{
			start: "08:00",
			end: "18:00"
		}],
		wednesday: [{
			start: "08:00",
			end: "18:00"
		}],
		thursday: [{
			start: "08:00",
			end: "18:00"
		}],
		friday: [{
			start: "08:00",
			end: "18:00"
		}],
		saturday: [{
			start: "08:00",
			end: "18:00"
		}],
		sunday: []
	};
}
function toRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function normalizeInterval(value) {
	const record = toRecord(value);
	if (!record) return null;
	const start = typeof record.start === "string" && TIME_PATTERN.test(record.start) ? record.start : null;
	const end = typeof record.end === "string" && TIME_PATTERN.test(record.end) ? record.end : null;
	return start && end ? {
		start,
		end
	} : null;
}
function sortIntervals(intervals) {
	return [...intervals].sort((left, right) => toMinutes(left.start) - toMinutes(right.start));
}
function normalizeBusinessHoursSchedule(raw) {
	const base = createDefaultBusinessHoursSchedule();
	const record = toRecord(raw);
	if (!record) return base;
	const next = { ...base };
	for (const day of BUSINESS_DAYS) {
		const rawDay = record[day.id];
		if (Array.isArray(rawDay)) {
			next[day.id] = sortIntervals(rawDay.map((interval) => normalizeInterval(interval)).filter((interval) => interval !== null));
			continue;
		}
		const legacyRecord = toRecord(rawDay);
		if (!legacyRecord) continue;
		if (Array.isArray(legacyRecord.intervals)) {
			next[day.id] = sortIntervals(legacyRecord.intervals.map((interval) => normalizeInterval(interval)).filter((interval) => interval !== null));
			continue;
		}
		if (legacyRecord.open === false) {
			next[day.id] = [];
			continue;
		}
		const legacyInterval = normalizeInterval(legacyRecord);
		next[day.id] = legacyInterval ? [legacyInterval] : [];
	}
	return next;
}
function validateBusinessHoursSchedule(schedule) {
	const result = {};
	for (const day of BUSINESS_DAYS) {
		const intervals = sortIntervals(schedule[day.id]);
		result[day.id] = null;
		for (let index = 0; index < intervals.length; index += 1) {
			const current = intervals[index];
			const start = toMinutes(current.start);
			if (start >= toMinutes(current.end)) {
				result[day.id] = "O início precisa ser menor que o fim.";
				break;
			}
			const previous = intervals[index - 1];
			if (previous && toMinutes(previous.end) > start) {
				result[day.id] = "Os intervalos não podem se sobrepor.";
				break;
			}
		}
	}
	return result;
}
function hasBusinessHoursValidationErrors(schedule) {
	return Object.values(validateBusinessHoursSchedule(schedule)).some(Boolean);
}
function collapseToContinuousInterval(intervals) {
	if (intervals.length === 0) return [{
		start: "08:00",
		end: "18:00"
	}];
	const sorted = sortIntervals(intervals);
	return [{
		start: sorted[0].start,
		end: sorted[sorted.length - 1].end
	}];
}
function buildCityRegion(city, state, fallback) {
	const parts = [city.trim(), state.trim()].filter(Boolean);
	if (parts.length === 2) return `${parts[0]}, ${parts[1]}`;
	return fallback.trim() || null;
}
function isValidIanaTimezone(value) {
	try {
		new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format(/* @__PURE__ */ new Date());
		return true;
	} catch {
		return false;
	}
}
function toMinutes(value) {
	const [hour, minute] = value.split(":").map(Number);
	return hour * 60 + minute;
}
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.agentes.novo.tsx?tsr-split=component";
var DEFAULT_SECURITY_RULE_FORM = {
	name: "",
	ruleType: "Não inventar resposta",
	instruction: "",
	sortOrder: 0
};
function splitCityRegion(value) {
	const text = value?.trim() ?? "";
	if (!text) return {
		city: "",
		state: ""
	};
	const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
	if (parts.length >= 2) return {
		city: parts.slice(0, -1).join(", "),
		state: parts.at(-1) ?? ""
	};
	return {
		city: text,
		state: ""
	};
}
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
	const [businessCity, setBusinessCity] = (0, import_react.useState)("");
	const [businessState, setBusinessState] = (0, import_react.useState)("");
	const [businessPostalCode, setBusinessPostalCode] = (0, import_react.useState)("");
	const [businessPhone, setBusinessPhone] = (0, import_react.useState)("");
	const [businessWhatsapp, setBusinessWhatsapp] = (0, import_react.useState)("");
	const [businessWhatsappSupport, setBusinessWhatsappSupport] = (0, import_react.useState)("");
	const [websiteUrl, setWebsiteUrl] = (0, import_react.useState)("");
	const [timezone, setTimezone] = (0, import_react.useState)("America/Sao_Paulo");
	const [googleMapsUrl, setGoogleMapsUrl] = (0, import_react.useState)("");
	const [latitude, setLatitude] = (0, import_react.useState)("");
	const [longitude, setLongitude] = (0, import_react.useState)("");
	const [weeklySchedule, setWeeklySchedule] = (0, import_react.useState)(createDefaultBusinessHoursSchedule());
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
	const [securityRules, setSecurityRules] = (0, import_react.useState)([]);
	const [securityRulesLoading, setSecurityRulesLoading] = (0, import_react.useState)(false);
	const [securityRulesError, setSecurityRulesError] = (0, import_react.useState)(null);
	const [securityRuleSavingId, setSecurityRuleSavingId] = (0, import_react.useState)(null);
	const [securityRuleDeletingId, setSecurityRuleDeletingId] = (0, import_react.useState)(null);
	const [editingSecurityRule, setEditingSecurityRule] = (0, import_react.useState)(null);
	const [securityRuleForm, setSecurityRuleForm] = (0, import_react.useState)(DEFAULT_SECURITY_RULE_FORM);
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
		businessCity,
		businessState,
		businessPostalCode,
		businessPhone,
		businessWhatsapp,
		businessWhatsappSupport,
		websiteUrl,
		timezone,
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
		businessCity,
		businessState,
		businessPostalCode,
		businessPhone,
		businessWhatsapp,
		businessWhatsappSupport,
		websiteUrl,
		timezone,
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
	const businessHoursErrors = (0, import_react.useMemo)(() => validateBusinessHoursSchedule(weeklySchedule), [weeklySchedule]);
	const updateDayIntervals = (day, intervals) => {
		setWeeklySchedule((current) => ({
			...current,
			[day]: intervals
		}));
	};
	const toggleDayOpen = (day, open) => {
		updateDayIntervals(day, open ? [{
			start: "08:00",
			end: "18:00"
		}] : []);
	};
	const addDayInterval = (day) => {
		const currentIntervals = weeklySchedule[day] ?? [];
		const fallbackStart = currentIntervals.at(-1)?.end ?? "13:30";
		updateDayIntervals(day, [...currentIntervals, {
			start: fallbackStart,
			end: "18:00"
		}]);
	};
	const updateDayInterval = (day, index, field, value) => {
		updateDayIntervals(day, (weeklySchedule[day] ?? []).map((interval, intervalIndex) => intervalIndex === index ? {
			...interval,
			[field]: value
		} : interval));
	};
	const removeDayInterval = (day, index) => {
		updateDayIntervals(day, (weeklySchedule[day] ?? []).filter((_, intervalIndex) => intervalIndex !== index));
	};
	const loadKnowledge = async (assistantId) => {
		if (!assistantId) {
			setKnowledge([]);
			return;
		}
		setKnowledge(await backendAssistantsService.knowledgeList(assistantId));
	};
	const loadSecurityRules = async (assistantId) => {
		if (!assistantId) {
			setSecurityRules([]);
			setSecurityRulesError(null);
			return;
		}
		setSecurityRulesLoading(true);
		setSecurityRulesError(null);
		try {
			setSecurityRules(await backendAssistantsService.securityRulesList(assistantId));
		} catch (err) {
			setSecurityRulesError(err instanceof Error ? err.message : "Não foi possível carregar as regras de segurança.");
		} finally {
			setSecurityRulesLoading(false);
		}
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
					setBusinessCity("");
					setBusinessState("");
					setBusinessPostalCode("");
					setBusinessPhone("");
					setBusinessWhatsapp("");
					setBusinessWhatsappSupport("");
					setWebsiteUrl("");
					setTimezone(companyResponse.company.timezone ?? "America/Sao_Paulo");
					setGoogleMapsUrl("");
					setLatitude("");
					setLongitude("");
					setWeeklySchedule(createDefaultBusinessHoursSchedule());
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
						businessCity: "",
						businessState: "",
						businessPostalCode: "",
						businessPhone: "",
						businessWhatsapp: "",
						businessWhatsappSupport: "",
						websiteUrl: "",
						timezone: companyResponse.company.timezone ?? "America/Sao_Paulo",
						googleMapsUrl: "",
						latitude: "",
						longitude: "",
						weeklySchedule: createDefaultBusinessHoursSchedule(),
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
			setSecurityRules([]);
			setSecurityRulesError(null);
			return;
		}
		(async () => {
			try {
				const assistant = await backendAssistantsService.get(selectedAssistantId);
				setName(assistant.name);
				setDescription(assistant.description ?? "");
				setBusinessAddress(assistant.businessAddress ?? "");
				setBusinessCityRegion(assistant.businessCityRegion ?? "");
				const parsedCityRegion = splitCityRegion(assistant.businessCityRegion);
				setBusinessCity(assistant.businessCity ?? parsedCityRegion.city);
				setBusinessState(assistant.businessState ?? parsedCityRegion.state);
				setBusinessPostalCode(assistant.businessPostalCode ?? "");
				setBusinessPhone(assistant.businessPhone ?? "");
				setBusinessWhatsapp(assistant.businessWhatsapp ?? "");
				setBusinessWhatsappSupport(assistant.businessWhatsappSupport ?? "");
				setWebsiteUrl(assistant.websiteUrl ?? "");
				setTimezone(assistant.timezone ?? company?.timezone ?? "America/Sao_Paulo");
				setGoogleMapsUrl(assistant.googleMapsUrl ?? "");
				setLatitude(assistant.latitude !== null && assistant.latitude !== void 0 ? String(assistant.latitude) : "");
				setLongitude(assistant.longitude !== null && assistant.longitude !== void 0 ? String(assistant.longitude) : "");
				setWeeklySchedule(normalizeBusinessHoursSchedule(assistant.weeklySchedule));
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
				await loadSecurityRules(selectedAssistantId);
				setInitialFormData({
					name: assistant.name,
					description: assistant.description ?? "",
					businessAddress: assistant.businessAddress ?? "",
					businessCityRegion: assistant.businessCityRegion ?? "",
					businessCity: assistant.businessCity ?? parsedCityRegion.city,
					businessState: assistant.businessState ?? parsedCityRegion.state,
					businessPostalCode: assistant.businessPostalCode ?? "",
					businessPhone: assistant.businessPhone ?? "",
					businessWhatsapp: assistant.businessWhatsapp ?? "",
					businessWhatsappSupport: assistant.businessWhatsappSupport ?? "",
					websiteUrl: assistant.websiteUrl ?? "",
					timezone: assistant.timezone ?? company?.timezone ?? "America/Sao_Paulo",
					googleMapsUrl: assistant.googleMapsUrl ?? "",
					latitude: assistant.latitude !== null && assistant.latitude !== void 0 ? String(assistant.latitude) : "",
					longitude: assistant.longitude !== null && assistant.longitude !== void 0 ? String(assistant.longitude) : "",
					weeklySchedule: normalizeBusinessHoursSchedule(assistant.weeklySchedule),
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
	}, [selectedAssistantId, company?.timezone]);
	const handleCreateNew = () => {
		setSelectedAssistantId("");
		setName("");
		setDescription("");
		setBusinessAddress("");
		setBusinessCityRegion("");
		setBusinessCity("");
		setBusinessState("");
		setBusinessPostalCode("");
		setBusinessPhone("");
		setBusinessWhatsapp("");
		setBusinessWhatsappSupport("");
		setWebsiteUrl("");
		setTimezone(company?.timezone ?? "America/Sao_Paulo");
		setGoogleMapsUrl("");
		setLatitude("");
		setLongitude("");
		setWeeklySchedule(createDefaultBusinessHoursSchedule());
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
		setSecurityRules([]);
		setSecurityRulesError(null);
		setIsReviewConfirmed(false);
		setInitialFormData({
			name: "",
			description: "",
			businessAddress: "",
			businessCityRegion: "",
			businessCity: "",
			businessState: "",
			businessPostalCode: "",
			businessPhone: "",
			businessWhatsapp: "",
			businessWhatsappSupport: "",
			websiteUrl: "",
			timezone: company?.timezone ?? "America/Sao_Paulo",
			googleMapsUrl: "",
			latitude: "",
			longitude: "",
			weeklySchedule: createDefaultBusinessHoursSchedule(),
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
	const openCreateSecurityRule = () => {
		if (!selectedAssistantId) {
			toast.warning("Salve ou selecione um assistente antes de criar regras de segurança.");
			return;
		}
		setEditingSecurityRule(null);
		setSecurityRuleForm({
			...DEFAULT_SECURITY_RULE_FORM,
			sortOrder: securityRules.length
		});
		setIsAddingSecurityRule(true);
	};
	const openEditSecurityRule = (rule) => {
		setEditingSecurityRule(rule);
		setSecurityRuleForm({
			name: rule.name,
			ruleType: rule.ruleType,
			instruction: rule.instruction,
			sortOrder: rule.sortOrder
		});
		setIsAddingSecurityRule(true);
	};
	const handleSaveSecurityRule = async () => {
		if (!selectedAssistantId) {
			toast.warning("Salve ou selecione um assistente antes de criar regras de segurança.");
			return;
		}
		if (!securityRuleForm.name.trim() || !securityRuleForm.instruction.trim()) {
			toast.error("Preencha nome e instrução da regra.");
			return;
		}
		setSecurityRuleSavingId(editingSecurityRule?.id ?? "new");
		try {
			if (editingSecurityRule) {
				await backendAssistantsService.securityRuleUpdate(selectedAssistantId, editingSecurityRule.id, {
					name: securityRuleForm.name.trim(),
					ruleType: securityRuleForm.ruleType.trim(),
					instruction: securityRuleForm.instruction.trim(),
					sortOrder: securityRuleForm.sortOrder
				});
				toast.success("Regra de segurança atualizada.");
			} else {
				await backendAssistantsService.securityRuleCreate(selectedAssistantId, {
					name: securityRuleForm.name.trim(),
					ruleType: securityRuleForm.ruleType.trim(),
					instruction: securityRuleForm.instruction.trim(),
					sortOrder: securityRuleForm.sortOrder
				});
				toast.success("Regra de segurança criada.");
			}
			setIsAddingSecurityRule(false);
			setEditingSecurityRule(null);
			setSecurityRuleForm(DEFAULT_SECURITY_RULE_FORM);
			await loadSecurityRules(selectedAssistantId);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível salvar a regra.");
		} finally {
			setSecurityRuleSavingId(null);
		}
	};
	const toggleSecurityRuleStatus = async (rule, active) => {
		if (!selectedAssistantId) return;
		setSecurityRuleSavingId(rule.id);
		try {
			await backendAssistantsService.securityRuleUpdate(selectedAssistantId, rule.id, { status: active ? "ACTIVE" : "INACTIVE" });
			await loadSecurityRules(selectedAssistantId);
			toast.success(active ? "Regra ativada." : "Regra desativada.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a regra.");
		} finally {
			setSecurityRuleSavingId(null);
		}
	};
	const removeSecurityRule = async (rule) => {
		if (!selectedAssistantId) return;
		if (!window.confirm(`Excluir a regra "${rule.name}"?`)) return;
		setSecurityRuleDeletingId(rule.id);
		try {
			await backendAssistantsService.securityRuleDelete(selectedAssistantId, rule.id);
			await loadSecurityRules(selectedAssistantId);
			toast.success("Regra excluída.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível excluir a regra.");
		} finally {
			setSecurityRuleDeletingId(null);
		}
	};
	const handleSave = async () => {
		if (!name.trim()) return;
		if (googleMapsUrl.trim() && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(googleMapsUrl.trim())) {
			toast.error("O link do Google Maps deve ser uma URL válida (ex: https://maps.google.com/...)");
			return;
		}
		if (websiteUrl.trim() && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(websiteUrl.trim())) {
			toast.error("O site deve ser uma URL válida (ex: https://empresa.com.br).");
			return;
		}
		if (!isValidIanaTimezone(timezone.trim())) {
			toast.error("Use um timezone IANA válido, como America/Campo_Grande ou America/Sao_Paulo.");
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
		if (hasBusinessHoursValidationErrors(weeklySchedule)) {
			toast.error("Revise os horários de atendimento. Há intervalos inválidos ou sobrepostos.");
			return;
		}
		setSaving(true);
		try {
			const payloadLatitude = latitude.trim() ? parseFloat(latitude) : null;
			const payloadLongitude = longitude.trim() ? parseFloat(longitude) : null;
			const payloadCityRegion = buildCityRegion(businessCity, businessState, businessCityRegion);
			if (selectedAssistantId) {
				const updated = await backendAssistantsService.update(selectedAssistantId, {
					name: name.trim(),
					description: description.trim() || null,
					businessAddress: businessAddress.trim() || null,
					businessCityRegion: payloadCityRegion,
					businessCity: businessCity.trim() || null,
					businessState: businessState.trim() || null,
					businessPostalCode: businessPostalCode.trim() || null,
					businessPhone: businessPhone.trim() || null,
					businessWhatsapp: businessWhatsapp.trim() || null,
					businessWhatsappSupport: businessWhatsappSupport.trim() || null,
					websiteUrl: websiteUrl.trim() || null,
					timezone: timezone.trim(),
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
				setBusinessCity(updated.businessCity ?? "");
				setBusinessState(updated.businessState ?? "");
				setBusinessPostalCode(updated.businessPostalCode ?? "");
				setBusinessPhone(updated.businessPhone ?? "");
				setBusinessWhatsapp(updated.businessWhatsapp ?? "");
				setBusinessWhatsappSupport(updated.businessWhatsappSupport ?? "");
				setWebsiteUrl(updated.websiteUrl ?? "");
				setTimezone(updated.timezone ?? company?.timezone ?? "America/Sao_Paulo");
				setGoogleMapsUrl(updated.googleMapsUrl ?? "");
				setLatitude(updated.latitude !== null && updated.latitude !== void 0 ? String(updated.latitude) : "");
				setLongitude(updated.longitude !== null && updated.longitude !== void 0 ? String(updated.longitude) : "");
				setWeeklySchedule(normalizeBusinessHoursSchedule(updated.weeklySchedule));
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
					businessCity: updated.businessCity ?? "",
					businessState: updated.businessState ?? "",
					businessPostalCode: updated.businessPostalCode ?? "",
					businessPhone: updated.businessPhone ?? "",
					businessWhatsapp: updated.businessWhatsapp ?? "",
					businessWhatsappSupport: updated.businessWhatsappSupport ?? "",
					websiteUrl: updated.websiteUrl ?? "",
					timezone: updated.timezone ?? company?.timezone ?? "America/Sao_Paulo",
					googleMapsUrl: updated.googleMapsUrl ?? "",
					latitude: updated.latitude !== null && updated.latitude !== void 0 ? String(updated.latitude) : "",
					longitude: updated.longitude !== null && updated.longitude !== void 0 ? String(updated.longitude) : "",
					weeklySchedule: normalizeBusinessHoursSchedule(updated.weeklySchedule),
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
					businessCityRegion: payloadCityRegion,
					businessCity: businessCity.trim() || null,
					businessState: businessState.trim() || null,
					businessPostalCode: businessPostalCode.trim() || null,
					businessPhone: businessPhone.trim() || null,
					businessWhatsapp: businessWhatsapp.trim() || null,
					businessWhatsappSupport: businessWhatsappSupport.trim() || null,
					websiteUrl: websiteUrl.trim() || null,
					timezone: timezone.trim(),
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
				setBusinessCity(created.businessCity ?? "");
				setBusinessState(created.businessState ?? "");
				setBusinessPostalCode(created.businessPostalCode ?? "");
				setBusinessPhone(created.businessPhone ?? "");
				setBusinessWhatsapp(created.businessWhatsapp ?? "");
				setBusinessWhatsappSupport(created.businessWhatsappSupport ?? "");
				setWebsiteUrl(created.websiteUrl ?? "");
				setTimezone(created.timezone ?? company?.timezone ?? "America/Sao_Paulo");
				setGoogleMapsUrl(created.googleMapsUrl ?? "");
				setLatitude(created.latitude !== null && created.latitude !== void 0 ? String(created.latitude) : "");
				setLongitude(created.longitude !== null && created.longitude !== void 0 ? String(created.longitude) : "");
				setWeeklySchedule(normalizeBusinessHoursSchedule(created.weeklySchedule));
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
					businessCity: created.businessCity ?? "",
					businessState: created.businessState ?? "",
					businessPostalCode: created.businessPostalCode ?? "",
					businessPhone: created.businessPhone ?? "",
					businessWhatsapp: created.businessWhatsapp ?? "",
					businessWhatsappSupport: created.businessWhatsappSupport ?? "",
					websiteUrl: created.websiteUrl ?? "",
					timezone: created.timezone ?? company?.timezone ?? "America/Sao_Paulo",
					googleMapsUrl: created.googleMapsUrl ?? "",
					latitude: created.latitude !== null && created.latitude !== void 0 ? String(created.latitude) : "",
					longitude: created.longitude !== null && created.longitude !== void 0 ? String(created.longitude) : "",
					weeklySchedule: normalizeBusinessHoursSchedule(created.weeklySchedule),
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
							lineNumber: 994,
							columnNumber: 17
						}, this), " Voltar"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 993,
						columnNumber: 15
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 992,
					columnNumber: 13
				}, this),
				selectedAssistantId && /* @__PURE__ */ (void 0)("div", {
					className: "flex items-center gap-2 mr-2",
					children: [/* @__PURE__ */ (void 0)(StatusBadge, { status: isActive ? "ativo" : "pausado" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 998,
						columnNumber: 17
					}, this), /* @__PURE__ */ (void 0)(Button, {
						variant: isActive ? "outline" : "destructive",
						onClick: handleToggleStatus,
						size: "sm",
						children: [isActive ? /* @__PURE__ */ (void 0)(Pause, { className: "h-4 w-4 mr-1" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1e3,
							columnNumber: 31
						}, this) : /* @__PURE__ */ (void 0)(CirclePlay, { className: "h-4 w-4 mr-1" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1e3,
							columnNumber: 68
						}, this), isActive ? "Inativar" : "Ativar"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 999,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 997,
					columnNumber: 37
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: () => void handleSave(),
					disabled: saving || !name.trim(),
					size: "sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4 mr-1" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1005,
							columnNumber: 15
						}, this),
						" ",
						saving ? "Salvando..." : selectedAssistantId ? "Salvar" : "Criar"
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1004,
					columnNumber: 13
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 991,
			columnNumber: 58
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 991,
		columnNumber: 7
	}, this), loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando assistente real…" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1010,
		columnNumber: 18
	}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
		title: "Não foi possível carregar o assistente",
		description: error,
		onRetry: () => window.location.reload()
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1010,
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
						lineNumber: 1022,
						columnNumber: 21
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1021,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: "new",
						children: "Novo assistente"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1025,
						columnNumber: 21
					}, this), selectableAssistants.map((assistant) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: assistant.id,
						children: assistant.name
					}, assistant.id, false, {
						fileName: _jsxFileName,
						lineNumber: 1026,
						columnNumber: 60
					}, this))] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1024,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1014,
					columnNumber: 17
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1013,
				columnNumber: 15
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1012,
			columnNumber: 13
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1011,
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
						lineNumber: 1037,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "comportamento",
						children: "Comportamento"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1038,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "fluxos",
						children: "Fluxos"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1039,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "prompt",
						children: "Regras Globais"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1040,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "conhecimento",
						children: "Conhecimento"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1041,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "ferramentas",
						children: "Ferramentas"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1042,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "memoria",
						children: "Memória"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1043,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "seguranca",
						children: "Regras de Segurança"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1044,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
						value: "publicacao",
						children: "Publicação"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1045,
						columnNumber: 15
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1036,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "info",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 grid gap-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid md:grid-cols-2 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Nome do assistente",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: name,
										onChange: (e) => setName(e.target.value)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1053,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1052,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Empresa atual",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: company?.name ?? "Tenant atual",
										disabled: true
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1056,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1055,
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
										lineNumber: 1059,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1058,
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
												lineNumber: 1063,
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
												lineNumber: 1064,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1062,
											columnNumber: 23
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground",
											children: "Use o link do Google Maps para que o agente possa enviar a localização quando o cliente perguntar onde fica a empresa."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1074,
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
														lineNumber: 1081,
														columnNumber: 27
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1080,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
													label: "Cidade",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
														value: businessCity,
														onChange: (e) => setBusinessCity(e.target.value),
														placeholder: "Ex: Dourados"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1084,
														columnNumber: 27
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1083,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
													label: "Estado / UF",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
														value: businessState,
														onChange: (e) => setBusinessState(e.target.value),
														placeholder: "Ex: MS"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1087,
														columnNumber: 27
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1086,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
													label: "CEP",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
														value: businessPostalCode,
														onChange: (e) => setBusinessPostalCode(e.target.value),
														placeholder: "Ex: 79800-000"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1090,
														columnNumber: 27
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1089,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
													label: "Cidade / Região (legado)",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
														value: businessCityRegion,
														onChange: (e) => setBusinessCityRegion(e.target.value),
														placeholder: "Ex: Dourados, MS"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1093,
														columnNumber: 27
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1092,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
													label: "Fuso horário da empresa",
													className: "md:col-span-2",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
														value: timezone,
														onChange: (e) => setTimezone(e.target.value),
														placeholder: "Ex: America/Campo_Grande"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1096,
														columnNumber: 27
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
														className: "text-xs text-muted-foreground",
														children: "Usado para responder corretamente perguntas sobre horário de funcionamento, abertura, fechamento, almoço, coleta e disponibilidade."
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1097,
														columnNumber: 27
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1095,
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
														lineNumber: 1103,
														columnNumber: 27
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1102,
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
														lineNumber: 1106,
														columnNumber: 27
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1105,
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
														lineNumber: 1109,
														columnNumber: 27
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1108,
													columnNumber: 25
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1079,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1061,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1051,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "pt-4 border-t space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
								className: "text-lg font-semibold",
								children: "Contatos oficiais"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1116,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid md:grid-cols-2 gap-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Telefone",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: businessPhone,
											onChange: (e) => setBusinessPhone(e.target.value),
											placeholder: "Ex: (67) 3422-0000"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1119,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1118,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "WhatsApp principal",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: businessWhatsapp,
											onChange: (e) => setBusinessWhatsapp(e.target.value),
											placeholder: "Ex: (67) 99999-9999"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1122,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1121,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "WhatsApp assistência",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: businessWhatsappSupport,
											onChange: (e) => setBusinessWhatsappSupport(e.target.value),
											placeholder: "Ex: (67) 98888-8888"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1125,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1124,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Site",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: websiteUrl,
											onChange: (e) => setWebsiteUrl(e.target.value),
											placeholder: "Ex: https://www.empresa.com.br"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1128,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1127,
										columnNumber: 23
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1117,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1115,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "pt-4 border-t space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
									className: "text-lg font-semibold",
									children: "Horário de atendimento"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1134,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex items-center justify-between bg-secondary/20 p-4 rounded-lg border",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "space-y-0.5 max-w-[80%]",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "ai-always-available",
											className: "text-base font-medium cursor-pointer",
											children: "IA responde fora do horário de atendimento"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1138,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-sm text-muted-foreground",
											children: aiAlwaysAvailable ? "Quando ativado, a IA pode responder clientes mesmo fora do horário oficial da empresa. Isso não altera o horário de funcionamento da empresa." : "Quando desativado, fora do horário oficial a IA pode usar a mensagem de indisponibilidade configurada."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1141,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1137,
										columnNumber: 23
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
										id: "ai-always-available",
										checked: aiAlwaysAvailable,
										onCheckedChange: setAiAlwaysAvailable
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1145,
										columnNumber: 23
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1136,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "grid gap-4",
									children: BUSINESS_DAYS.map((day) => {
										const intervals = weeklySchedule[day.id] ?? [];
										const isOpen = intervals.length > 0;
										return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "rounded-lg border bg-card p-4 space-y-3",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "font-medium",
													children: day.label
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1155,
													columnNumber: 33
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "text-xs text-muted-foreground",
													children: isOpen ? "Aberto" : "Fechado"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1156,
													columnNumber: 33
												}, this)] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1154,
													columnNumber: 31
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "flex items-center gap-3",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
														htmlFor: `open-${day.id}`,
														className: "text-sm",
														children: "Aberto"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1161,
														columnNumber: 33
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
														id: `open-${day.id}`,
														checked: isOpen,
														onCheckedChange: (checked) => toggleDayOpen(day.id, checked)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1164,
														columnNumber: 33
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1160,
													columnNumber: 31
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1153,
												columnNumber: 29
											}, this), isOpen && /* @__PURE__ */ (void 0)("div", {
												className: "space-y-3",
												children: [
													/* @__PURE__ */ (void 0)("div", {
														className: "flex flex-wrap gap-2",
														children: [/* @__PURE__ */ (void 0)(Button, {
															type: "button",
															variant: "outline",
															size: "sm",
															onClick: () => updateDayIntervals(day.id, collapseToContinuousInterval(intervals)),
															children: "Não fecha para almoço"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1170,
															columnNumber: 35
														}, this), /* @__PURE__ */ (void 0)(Button, {
															type: "button",
															variant: "outline",
															size: "sm",
															onClick: () => addDayInterval(day.id),
															children: [/* @__PURE__ */ (void 0)(Plus, { className: "h-4 w-4 mr-1" }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1174,
																columnNumber: 37
															}, this), "Adicionar intervalo"]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 1173,
															columnNumber: 35
														}, this)]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1169,
														columnNumber: 33
													}, this),
													/* @__PURE__ */ (void 0)("div", {
														className: "space-y-2",
														children: intervals.map((interval, index) => /* @__PURE__ */ (void 0)("div", {
															className: "flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-end",
															children: [
																/* @__PURE__ */ (void 0)(Field, {
																	label: `Intervalo ${index + 1}`,
																	className: "md:w-40",
																	children: /* @__PURE__ */ (void 0)(Input, {
																		type: "time",
																		value: interval.start,
																		onChange: (e) => updateDayInterval(day.id, index, "start", e.target.value)
																	}, void 0, false, {
																		fileName: _jsxFileName,
																		lineNumber: 1182,
																		columnNumber: 41
																	}, this)
																}, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1181,
																	columnNumber: 39
																}, this),
																/* @__PURE__ */ (void 0)(Field, {
																	label: "Até",
																	className: "md:w-40",
																	children: /* @__PURE__ */ (void 0)(Input, {
																		type: "time",
																		value: interval.end,
																		onChange: (e) => updateDayInterval(day.id, index, "end", e.target.value)
																	}, void 0, false, {
																		fileName: _jsxFileName,
																		lineNumber: 1185,
																		columnNumber: 41
																	}, this)
																}, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1184,
																	columnNumber: 39
																}, this),
																/* @__PURE__ */ (void 0)(Button, {
																	type: "button",
																	variant: "ghost",
																	size: "sm",
																	onClick: () => removeDayInterval(day.id, index),
																	className: "md:mb-0.5",
																	children: [/* @__PURE__ */ (void 0)(Trash2, { className: "h-4 w-4 mr-1" }, void 0, false, {
																		fileName: _jsxFileName,
																		lineNumber: 1188,
																		columnNumber: 41
																	}, this), "Remover"]
																}, void 0, true, {
																	fileName: _jsxFileName,
																	lineNumber: 1187,
																	columnNumber: 39
																}, this)
															]
														}, `${day.id}-${index}`, true, {
															fileName: _jsxFileName,
															lineNumber: 1180,
															columnNumber: 71
														}, this))
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1179,
														columnNumber: 33
													}, this),
													businessHoursErrors[day.id] && /* @__PURE__ */ (void 0)("p", {
														className: "text-xs text-red-600",
														children: businessHoursErrors[day.id]
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1194,
														columnNumber: 65
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1168,
												columnNumber: 40
											}, this)]
										}, day.id, true, {
											fileName: _jsxFileName,
											lineNumber: 1152,
											columnNumber: 28
										}, this);
									})
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1148,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1133,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1050,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1049,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1048,
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
											lineNumber: 1213,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1212,
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
												lineNumber: 1217,
												columnNumber: 27
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "flex justify-between text-xs text-muted-foreground",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: temperature ?? .2 }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1219,
													columnNumber: 29
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: getTemperatureDescription(temperature ?? .2) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1220,
													columnNumber: 29
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1218,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1216,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1215,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Tom de voz",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
											value: toneOfVoice || "Profissional",
											onValueChange: (val) => setToneOfVoice(val),
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione o tom de voz" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1227,
												columnNumber: 29
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1226,
												columnNumber: 27
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Profissional",
													children: "Profissional"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1230,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Amigável",
													children: "Amigável"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1231,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Descontraído",
													children: "Descontraído"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1232,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Consultivo",
													children: "Consultivo"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1233,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Objetivo",
													children: "Objetivo"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1234,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Formal",
													children: "Formal"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1235,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Personalizado",
													children: "Personalizado"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1236,
													columnNumber: 29
												}, this)
											] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1229,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1225,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1224,
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
											lineNumber: 1241,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1240,
										columnNumber: 23
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1211,
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
										lineNumber: 1249,
										columnNumber: 27
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-sm text-muted-foreground",
										children: "Aguardar mensagens antes de responder (evita que o agente responda várias vezes quando o cliente manda mensagens quebradas)."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1252,
										columnNumber: 27
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1248,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
										id: "message-buffer",
										checked: messageBufferEnabled,
										onCheckedChange: setMessageBufferEnabled
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1257,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1247,
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
											lineNumber: 1261,
											columnNumber: 29
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1260,
										columnNumber: 27
									}, this), /* @__PURE__ */ (void 0)(Field, {
										label: "Estilo da resposta",
										children: /* @__PURE__ */ (void 0)(Select, {
											value: splitResponseStyle || "SINGLE",
											onValueChange: (val) => setSplitResponseStyle(val),
											children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, { placeholder: "Selecione o estilo" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1266,
												columnNumber: 33
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1265,
												columnNumber: 31
											}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [/* @__PURE__ */ (void 0)(SelectItem, {
												value: "SINGLE",
												children: "Mensagem Única"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1269,
												columnNumber: 33
											}, this), /* @__PURE__ */ (void 0)(SelectItem, {
												value: "NATURAL_BLOCKS",
												children: "Blocos Naturais (Separados)"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1270,
												columnNumber: 33
											}, this)] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1268,
												columnNumber: 31
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1264,
											columnNumber: 29
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1263,
										columnNumber: 27
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1259,
									columnNumber: 48
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1246,
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
									lineNumber: 1280,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1279,
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
												lineNumber: 1287,
												columnNumber: 29
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "text-xs text-muted-foreground font-normal",
												children: noAnswerMessage ? noAnswerMessage.substring(0, 80) + (noAnswerMessage.length > 80 ? "..." : "") : "Resposta padrão quando a IA não encontra informação."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1290,
												columnNumber: 29
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1286,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1285,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionContent, {
										className: "pt-2 pb-4",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mb-3",
											children: "Mensagem usada quando o agente não tiver informação suficiente para responder."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1296,
											columnNumber: 27
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
											rows: 3,
											value: noAnswerMessage,
											onChange: (e) => setNoAnswerMessage(e.target.value),
											placeholder: "Infelizmente, não tenho essa informação..."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1300,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1295,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1284,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1283,
								columnNumber: 21
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1209,
						columnNumber: 19
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1208,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AssistantBehaviorTab, {
						assistantId: selectedAssistantId,
						ref: behaviorTabRef
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1307,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1207,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1206,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "fluxos",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AssistantFlowsTab, { assistantId: selectedAssistantId }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1312,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1311,
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
									lineNumber: 1320,
									columnNumber: 23
								}, this), " Use esta área apenas para regras que valem para todo o atendimento. Informações específicas da empresa devem ir na Base de Conhecimento. Regras por assunto devem ir em Fluxos."]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1319,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1318,
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
								lineNumber: 1327,
								columnNumber: 21
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1326,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "pt-6 border-t mt-6",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
								className: "text-lg font-semibold mb-4",
								children: "Regras Avançadas"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1332,
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
												lineNumber: 1338,
												columnNumber: 29
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "text-xs text-muted-foreground font-normal",
												children: avoidPhrases ? "Evita repetições configuradas." : "Evita repetições como 'é só me avisar'."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1339,
												columnNumber: 29
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1337,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1336,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionContent, {
										className: "pt-2 pb-4",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mb-3",
											children: "Liste frases, vícios de linguagem ou encerramentos que o agente deve evitar repetir."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1345,
											columnNumber: 27
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
											rows: 3,
											value: avoidPhrases,
											onChange: (e) => setAvoidPhrases(e.target.value),
											placeholder: "Ex: Evite repetir a mesma frase de encerramento em todas as respostas. Não finalize sempre com 'é só me avisar'. Varie naturalmente os encerramentos e só ofereça ajuda extra quando fizer sentido."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1349,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1344,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1335,
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
												lineNumber: 1356,
												columnNumber: 29
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
												className: "text-xs text-muted-foreground font-normal",
												children: "Limites obrigatórios incorporados ao comportamento do agente."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1357,
												columnNumber: 29
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1355,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1354,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AccordionContent, {
										className: "pt-2 pb-4",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mb-3",
											children: "Defina limites obrigatórios, como não inventar informações, não expor dados internos e transferir para humano quando necessário."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1363,
											columnNumber: 27
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
											rows: 4,
											value: securityInstructions,
											onChange: (e) => setSecurityInstructions(e.target.value),
											placeholder: "Regras de segurança incorporadas ao prompt."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1367,
											columnNumber: 27
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1362,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1353,
									columnNumber: 23
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1334,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1331,
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
										lineNumber: 1375,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-sm text-muted-foreground",
										children: "Busca respostas baseadas nos arquivos de conhecimento antes de responder ao cliente."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1378,
										columnNumber: 23
									}, this),
									ragEnabled && knowledge.filter((k) => k.status === "ACTIVE" && k.processingStatus === "READY").length === 0 && /* @__PURE__ */ (void 0)("div", {
										className: "text-amber-600 text-xs mt-2 flex items-center",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-3 w-3 mr-1" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1383,
											columnNumber: 29
										}, this), "Você não possui conhecimentos ATIVOS e PREPARADOS. O agente responderá normalmente sem contexto até que os arquivos estejam prontos."]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1382,
										columnNumber: 133
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1374,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
								id: "use-rag-production",
								checked: ragEnabled,
								onCheckedChange: setRagEnabled
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1388,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1373,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1317,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1316,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1315,
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
						lineNumber: 1397,
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
								lineNumber: 1400,
								columnNumber: 23
							}, this), " Adicionar conhecimento"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1399,
							columnNumber: 21
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
							className: "max-w-xl",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: knowledgeFormId ? "Editar Conhecimento" : "Adicionar Conhecimento" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1404,
									columnNumber: 25
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1403,
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
												lineNumber: 1410,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1409,
											columnNumber: 25
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Tipo de conhecimento",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
												value: knowledgeFormType,
												onValueChange: (val) => setKnowledgeFormType(val),
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1415,
													columnNumber: 31
												}, this) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1414,
													columnNumber: 29
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
														value: "TEXT",
														children: "Texto manual"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1418,
														columnNumber: 31
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
														value: "URL",
														children: "URL (Site)"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1419,
														columnNumber: 31
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
														value: "CONVERSATION",
														children: "Conversa de exemplo"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1420,
														columnNumber: 31
													}, this)
												] }, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1417,
													columnNumber: 29
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1413,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1412,
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
												lineNumber: 1425,
												columnNumber: 29
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1424,
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
												lineNumber: 1428,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1427,
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
												lineNumber: 1431,
												columnNumber: 29
											}, this), /* @__PURE__ */ (void 0)(Label, {
												htmlFor: "knowledge-active",
												children: "Este conhecimento está ativo e liberado para uso"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1432,
												columnNumber: 29
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1430,
											columnNumber: 45
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-xs text-muted-foreground mt-2 border-l-2 pl-3 border-amber-300",
											children: "Este conteúdo ficará salvo na base de conhecimento do agente. A preparação para a IA ler e analisar o texto será feita na próxima etapa."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1436,
											columnNumber: 25
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1408,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									onClick: () => setIsAddingKnowledge(false),
									children: "Cancelar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1442,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									onClick: () => void handleSaveKnowledge(),
									disabled: knowledgeSaving || !knowledgeFormTitle.trim() || !knowledgeFormContent.trim(),
									children: knowledgeSaving ? "Salvando..." : "Salvar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1445,
									columnNumber: 25
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1441,
									columnNumber: 23
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1402,
							columnNumber: 21
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1398,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1396,
					columnNumber: 17
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6 pt-0 space-y-3",
					children: [!selectedAssistantId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
						title: "Agente não salvo",
						description: "Salve o agente primeiro antes de adicionar conhecimentos."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1453,
						columnNumber: 43
					}, this) : knowledge.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
						title: "Sem conhecimento carregado",
						description: "Adicione conhecimentos para que o agente tenha contexto sobre sua empresa."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1453,
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
								lineNumber: 1455,
								columnNumber: 27
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center gap-2 mt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-xs px-2 py-0.5 bg-muted rounded-md border",
										children: item.metadata?.type === "URL" ? "URL" : item.metadata?.type === "CONVERSATION" ? "Conversa de Exemplo" : "Texto Manual"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1459,
										columnNumber: 29
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-xs text-muted-foreground",
										children: ["Atualizado em ", new Date(item.updatedAt).toLocaleDateString()]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1462,
										columnNumber: 29
									}, this),
									item.processingStatus === "READY" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md",
										children: "Pronto para IA"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1465,
										columnNumber: 67
									}, this),
									item.processingStatus === "PROCESSING" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md",
										children: "Processando..."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1468,
										columnNumber: 72
									}, this),
									item.processingStatus === "ERROR" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-md",
										title: item.processingError || "Erro desconhecido",
										children: "Erro"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1471,
										columnNumber: 67
									}, this),
									item.processingStatus === "DRAFT" && /* @__PURE__ */ (void 0)("span", {
										className: "text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md",
										children: "Pendente"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1474,
										columnNumber: 67
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1458,
								columnNumber: 27
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1454,
							columnNumber: 25
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: item.status === "ACTIVE" ? "ativo" : "pausado" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1480,
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
									lineNumber: 1481,
									columnNumber: 27
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => handleOpenEditKnowledge(item),
									children: "Editar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1484,
									columnNumber: 27
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1479,
							columnNumber: 25
						}, this)]
					}, item.id, true, {
						fileName: _jsxFileName,
						lineNumber: 1453,
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
									lineNumber: 1492,
									columnNumber: 25
								}, this), " Gerenciar Base de Conhecimento"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1491,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1490,
							columnNumber: 21
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1489,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1452,
					columnNumber: 17
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1395,
					columnNumber: 15
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
					className: "mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-base",
						children: "Testar busca no conhecimento"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1502,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground mt-1",
						children: "Use este teste para ver se a IA encontra informações dentro dos conhecimentos preparados."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1503,
						columnNumber: 19
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1501,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "p-6 pt-0 space-y-4",
						children: readyKnowledgeCount === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1510,
								columnNumber: 23
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "text-sm font-medium",
								children: "Você precisa ter pelo menos um conhecimento preparado (Pronto) para testar a busca."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1511,
								columnNumber: 23
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1509,
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
									lineNumber: 1517,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									onClick: () => void handleSearchKnowledge(),
									disabled: isSearching || !searchQuery.trim(),
									children: isSearching ? "Buscando..." : "Buscar relevante"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1518,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1516,
								columnNumber: 23
							}, this),
							searchError && /* @__PURE__ */ (void 0)("div", {
								className: "text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-lg",
								children: searchError
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1523,
								columnNumber: 39
							}, this),
							searchResults && searchResults.length > 0 && /* @__PURE__ */ (void 0)("div", {
								className: "space-y-3 mt-4",
								children: [/* @__PURE__ */ (void 0)("div", {
									className: "text-sm font-medium",
									children: "Resultados encontrados:"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1528,
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
											lineNumber: 1531,
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
											lineNumber: 1534,
											columnNumber: 33
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1530,
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
										lineNumber: 1538,
										columnNumber: 31
									}, this)]
								}, res.chunkId, true, {
									fileName: _jsxFileName,
									lineNumber: 1529,
									columnNumber: 58
								}, this))]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1527,
								columnNumber: 69
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1515,
							columnNumber: 30
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1508,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1500,
					columnNumber: 15
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1394,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
				value: "ferramentas",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "p-6",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AssistantToolsTab, { assistantId: selectedAssistantId }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1551,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1550,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1549,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1548,
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
						lineNumber: 1559,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1558,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1557,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1556,
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
						lineNumber: 1568,
						columnNumber: 21
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground mt-1",
						children: "Configure limites de comportamento (Guardrails) e ações automáticas (Gatilhos)."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1569,
						columnNumber: 21
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1567,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
						open: isAddingSecurityRule,
						onOpenChange: (open) => {
							setIsAddingSecurityRule(open);
							if (!open) {
								setEditingSecurityRule(null);
								setSecurityRuleForm(DEFAULT_SECURITY_RULE_FORM);
							}
						},
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								size: "sm",
								onClick: openCreateSecurityRule,
								disabled: !selectedAssistantId,
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4 mr-2" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1583,
									columnNumber: 25
								}, this), " Adicionar regra de segurança"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1582,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1581,
							columnNumber: 21
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: editingSecurityRule ? "Editar Regra de Segurança" : "Nova Regra de Segurança" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1588,
								columnNumber: 25
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1587,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "space-y-4 py-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Nome da regra",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: securityRuleForm.name,
											onChange: (event) => setSecurityRuleForm((current) => ({
												...current,
												name: event.target.value
											})),
											placeholder: "Ex: Não divulgar descontos"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1594,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1593,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Tipo da regra",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
											value: securityRuleForm.ruleType,
											onValueChange: (value) => setSecurityRuleForm((current) => ({
												...current,
												ruleType: value
											})),
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1605,
												columnNumber: 31
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1604,
												columnNumber: 29
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Bloquear assunto",
													children: "Bloquear assunto"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1608,
													columnNumber: 31
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Não inventar resposta",
													children: "Não inventar resposta"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1609,
													columnNumber: 31
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: "Escalar para humano",
													children: "Escalar para humano"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1612,
													columnNumber: 31
												}, this)
											] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1607,
												columnNumber: 29
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1600,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1599,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Instrução da regra",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
											rows: 5,
											value: securityRuleForm.instruction,
											onChange: (event) => setSecurityRuleForm((current) => ({
												...current,
												instruction: event.target.value
											})),
											placeholder: "Descreva de forma objetiva o comportamento obrigatório do assistente."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1619,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1618,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Ordem",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											type: "number",
											min: 0,
											value: securityRuleForm.sortOrder,
											onChange: (event) => setSecurityRuleForm((current) => ({
												...current,
												sortOrder: Number(event.target.value || 0)
											}))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1625,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1624,
										columnNumber: 25
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1592,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								onClick: () => setIsAddingSecurityRule(false),
								children: "Cancelar"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1632,
								columnNumber: 25
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								onClick: () => void handleSaveSecurityRule(),
								disabled: Boolean(securityRuleSavingId) || !securityRuleForm.name.trim() || !securityRuleForm.instruction.trim(),
								children: securityRuleSavingId ? "Salvando..." : "Salvar regra"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1635,
								columnNumber: 25
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1631,
								columnNumber: 23
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1586,
							columnNumber: 21
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1574,
						columnNumber: 19
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1566,
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
									lineNumber: 1646,
									columnNumber: 23
								}, this), "Guardrails (Limites e Restrições)"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1645,
								columnNumber: 21
							}, this), !selectedAssistantId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center",
								children: "Salve ou selecione um assistente para gerenciar regras de segurança."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1649,
								columnNumber: 45
							}, this) : securityRulesLoading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center justify-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1652,
									columnNumber: 25
								}, this), "Carregando regras de segurança..."]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1651,
								columnNumber: 55
							}, this) : securityRulesError ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-sm text-destructive p-4 border border-destructive/30 bg-destructive/5 rounded-lg",
								children: securityRulesError
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1654,
								columnNumber: 53
							}, this) : securityRules.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center",
								children: "Nenhuma regra de segurança cadastrada. Adicione guardrails para orientar o runtime da IA."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1656,
								columnNumber: 61
							}, this) : securityRules.map((rule) => {
								const isRuleActive = rule.status === "ACTIVE";
								const isBusy = securityRuleSavingId === rule.id || securityRuleDeletingId === rule.id;
								return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex flex-col sm:flex-row gap-4 p-4 border rounded-lg",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "font-medium flex items-center gap-2",
											children: [rule.name, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
												variant: "outline",
												children: rule.ruleType
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1666,
												columnNumber: 33
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1664,
											columnNumber: 31
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "text-sm text-muted-foreground mt-1",
											children: rule.instruction
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1668,
											columnNumber: 31
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1663,
										columnNumber: 29
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex flex-wrap items-center gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "text-xs font-medium",
												children: isRuleActive ? "Ativa" : "Inativa"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1673,
												columnNumber: 31
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Checkbox, {
												checked: isRuleActive,
												disabled: isBusy,
												onCheckedChange: (checked) => void toggleSecurityRuleStatus(rule, Boolean(checked))
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1676,
												columnNumber: 31
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												type: "button",
												variant: "outline",
												size: "sm",
												onClick: () => openEditSecurityRule(rule),
												disabled: isBusy,
												children: "Editar"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1677,
												columnNumber: 31
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												type: "button",
												variant: "outline",
												size: "sm",
												onClick: () => void removeSecurityRule(rule),
												disabled: isBusy,
												children: [securityRuleDeletingId === rule.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1681,
													columnNumber: 71
												}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1681,
													columnNumber: 118
												}, this), "Excluir"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1680,
												columnNumber: 31
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1672,
										columnNumber: 29
									}, this)]
								}, rule.id, true, {
									fileName: _jsxFileName,
									lineNumber: 1662,
									columnNumber: 26
								}, this);
							})]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1644,
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
											lineNumber: 1692,
											columnNumber: 23
										}, this),
										"Gatilhos (Ações Automáticas)",
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
											variant: "secondary",
											className: "text-[10px] uppercase",
											children: "Em breve"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1694,
											columnNumber: 23
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1691,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
									className: "text-xs text-muted-foreground mb-3",
									children: "Gatilhos automáticos ainda não possuem backend nem runtime operacional neste MVP."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1698,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center",
									children: "Em breve: ações automáticas como transferir chat, agendar ou disparar integrações."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1702,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1690,
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
									lineNumber: 1709,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
									label: "Reduzir invenção de resposta",
									desc: "Aplicado por instruções de prompt e fallback determinístico; não é um bloqueio absoluto para todos os casos.",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1710,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
									label: "Provedores externos apenas no backend",
									desc: "Quando habilitada, a IA externa é chamada somente pelo backend. O frontend nunca recebe tokens.",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1711,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ToggleRow, {
									label: "Não expor segredos",
									desc: "Todos os tokens continuam apenas no backend",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1712,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1708,
							columnNumber: 19
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1642,
					columnNumber: 17
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1565,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1564,
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
								lineNumber: 1722,
								columnNumber: 21
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1721,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
								className: "space-y-4",
								children: !selectedAssistantId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "rounded-lg border border-dashed p-4 text-sm text-muted-foreground",
									children: "Salve o assistente primeiro para vinculá-lo a um ou mais canais da empresa."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1725,
									columnNumber: 45
								}, this) : publicationSummary.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "rounded-xl border border-dashed p-5",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "text-sm font-medium",
											children: "Nenhum canal cadastrado."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1728,
											columnNumber: 25
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "mt-1 text-sm text-muted-foreground",
											children: "Cadastre um canal em Canais para publicar este assistente."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1729,
											columnNumber: 25
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
											asChild: true,
											variant: "outline",
											size: "sm",
											className: "mt-4",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
												to: "/canais",
												children: "Ir para Canais"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1733,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1732,
											columnNumber: 25
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1727,
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
													lineNumber: 1739,
													columnNumber: 33
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "text-xs text-muted-foreground",
													children: [
														channel.metadataJson?.["channelType"] === "WHATSAPP" ? "WhatsApp" : "Chatwoot",
														" ",
														"· Account ",
														channel.accountId,
														" · Inbox ",
														channel.inboxId
													]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1740,
													columnNumber: 33
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1738,
												columnNumber: 31
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: channel.isActive ? "ativo" : "pausado" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1745,
												columnNumber: 31
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1737,
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
													lineNumber: 1750,
													columnNumber: 33
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "text-xs text-muted-foreground",
													children: channel.linkedToOtherAssistant ? "Desvincule o assistente atual deste inbox antes de publicar aqui." : channel.isActive ? "Este assistente poderá responder este inbox quando estiver ativo." : "Canal pausado: o vínculo fica salvo, mas o runtime não responde."
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1753,
													columnNumber: 33
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1749,
												columnNumber: 31
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
												checked: channel.linkedToCurrentAssistant,
												disabled: publicationSavingId === channel.id || !channel.linkedToCurrentAssistant && channel.linkedToOtherAssistant,
												onCheckedChange: (checked) => void publishAssistantOnChannel(channel, checked)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1757,
												columnNumber: 31
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1748,
											columnNumber: 29
										}, this)]
									}, channel.id, true, {
										fileName: _jsxFileName,
										lineNumber: 1736,
										columnNumber: 60
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1735,
									columnNumber: 32
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1724,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1720,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
							className: "md:col-span-1",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
								className: "text-base",
								children: "Revisão Final"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1766,
								columnNumber: 21
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1765,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
								className: "space-y-4",
								children: [
									!name.trim() && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1770,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "O nome do agente é obrigatório."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1771,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1769,
										columnNumber: 38
									}, this),
									!instructions.trim() && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1774,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Você está usando o prompt padrão do sistema. Recomendamos personalizar as instruções."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1775,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1773,
										columnNumber: 46
									}, this),
									activeKnowledgeCount === 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1781,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Nenhum conhecimento ativo foi adicionado. O agente responderá apenas com base no prompt."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1782,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1780,
										columnNumber: 52
									}, this),
									activeKnowledgeCount > 0 && readyKnowledgeCount === 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1788,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "O agente ainda não possui conhecimento preparado para IA. Ele responderá apenas com base no prompt."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1789,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1787,
										columnNumber: 79
									}, this),
									draftKnowledgeCount > 0 && readyKnowledgeCount > 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1795,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Existem conhecimentos ativos que ainda não foram preparados para IA."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1796,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1794,
										columnNumber: 76
									}, this),
									errorKnowledgeCount > 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg border border-red-200 dark:border-red-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1801,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Alguns conhecimentos falharam na preparação. Revise antes de publicar."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1802,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1800,
										columnNumber: 49
									}, this),
									knowledge.filter((k) => k.status === "INACTIVE").length > 0 && /* @__PURE__ */ (void 0)("div", {
										className: "flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1807,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: "Você tem conhecimentos inativos que não serão utilizados pela IA."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1808,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1806,
										columnNumber: 83
									}, this),
									readyKnowledgeCount > 0 && /* @__PURE__ */ (void 0)("div", {
										className: `flex items-center gap-2 p-3 rounded-lg border ${ragEnabled ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900/50" : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50"}`,
										children: /* @__PURE__ */ (void 0)("span", {
											className: "text-sm font-medium",
											children: ragEnabled ? "Os conhecimentos preparados estão ATIVOS para o atendimento real! A IA usará esses documentos para responder." : "Os conhecimentos preparados podem ser testados na aba Preview. A integração real com a IA está DESATIVADA."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1813,
											columnNumber: 25
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1812,
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
												lineNumber: 1819,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Nome do Agente",
												value: name || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1820,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Status Planejado",
												value: isActive ? "Ativo" : "Inativo"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1821,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Endereço",
												value: businessAddress || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1822,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Cidade / Estado",
												value: [businessCity, businessState].filter(Boolean).join(" / ") || businessCityRegion || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1823,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "CEP",
												value: businessPostalCode || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1824,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Fuso horário",
												value: timezone || "America/Sao_Paulo"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1825,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Telefone",
												value: businessPhone || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1826,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "WhatsApp principal",
												value: businessWhatsapp || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1827,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "WhatsApp assistência",
												value: businessWhatsappSupport || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1828,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Site",
												value: websiteUrl || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1829,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Link do Google Maps",
												value: googleMapsUrl ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "flex items-center gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "Sim" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1831,
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
														lineNumber: 1832,
														columnNumber: 31
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1830,
													columnNumber: 83
												}, this) : "Não"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1830,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "IA fora do horário",
												value: aiAlwaysAvailable ? "Pode responder fora do horário" : "Não responde fora do horário"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1836,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Personalidade",
												value: personality || "Não definida"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1837,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Tom de voz",
												value: toneOfVoice || "Não definido"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1838,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Modelo da IA",
												value: model || "Padrão do sistema"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1839,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Temperatura",
												value: `${temperature ?? .2} - ${getTemperatureDescription(temperature ?? .2)}`
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1840,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Buffer de mensagens",
												value: messageBufferEnabled ? `${messageBufferSeconds}s de espera` : "Desativado (Responde na hora)"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1841,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Mensagem inicial",
												value: initialMessage.trim() ? "Configurada" : "Não configurada"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1842,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Prompt Principal",
												value: instructions.trim() ? "Configurado" : "Padrão do sistema"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1843,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Mensagem fallback",
												value: "Configurada"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1844,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Conhecimento Ativo",
												value: `${activeKnowledgeCount} itens (${readyKnowledgeCount} preparados)`
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1845,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Conhecimento no Atendimento Real",
												value: ragEnabled ? "Ativado" : "Desativado"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1846,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Summary, {
												label: "Regras de Segurança",
												value: `${securityRules.filter((r) => r.status === "ACTIVE").length} ativas`
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1847,
												columnNumber: 23
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1818,
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
												lineNumber: 1852,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
												htmlFor: "confirm-review",
												className: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
												children: "Confirmo que revisei as alterações e desejo salvar este agente."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1853,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1851,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
											className: "w-full",
											onClick: () => void handleSave(),
											disabled: saving || !name.trim() || !isReviewConfirmed,
											children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4 mr-2" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1859,
													columnNumber: 25
												}, this),
												" ",
												saving ? "Salvando..." : "Confirmar e salvar alterações"
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1858,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1850,
										columnNumber: 21
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1768,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1764,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
							className: "md:col-span-1",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
								className: "text-base",
								children: "Exemplo de Conversa (Simulação)"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1868,
								columnNumber: 21
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1867,
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
												lineNumber: 1873,
												columnNumber: 27
											}, this), /* @__PURE__ */ (void 0)("div", {
												className: "bg-primary/5 border rounded-lg p-3 text-sm flex-1",
												children: initialMessage
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1876,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1872,
											columnNumber: 49
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex flex-row-reverse gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0",
												children: "VC"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1882,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "bg-muted border rounded-lg p-3 text-sm",
												children: previewQuestion
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1885,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1881,
											columnNumber: 23
										}, this),
										previewLoading && /* @__PURE__ */ (void 0)("div", {
											className: "flex gap-3",
											children: [/* @__PURE__ */ (void 0)("div", {
												className: "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0",
												children: "IA"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1891,
												columnNumber: 27
											}, this), /* @__PURE__ */ (void 0)("div", {
												className: "bg-primary/5 border rounded-lg p-3 text-sm flex items-center gap-2",
												children: [
													/* @__PURE__ */ (void 0)("span", { className: "w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1895,
														columnNumber: 29
													}, this),
													/* @__PURE__ */ (void 0)("span", {
														className: "w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce",
														style: { animationDelay: "0.2s" }
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1896,
														columnNumber: 29
													}, this),
													/* @__PURE__ */ (void 0)("span", {
														className: "w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce",
														style: { animationDelay: "0.4s" }
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1899,
														columnNumber: 29
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1894,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1890,
											columnNumber: 42
										}, this),
										previewResult && /* @__PURE__ */ (void 0)("div", {
											className: "flex gap-3",
											children: [/* @__PURE__ */ (void 0)("div", {
												className: "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0",
												children: "IA"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1906,
												columnNumber: 27
											}, this), /* @__PURE__ */ (void 0)("div", {
												className: "bg-primary/5 border rounded-lg p-3 text-sm flex-1 space-y-2",
												children: [
													/* @__PURE__ */ (void 0)("div", { children: previewResult.answer }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1910,
														columnNumber: 29
													}, this),
													previewResult.sources.length > 0 && /* @__PURE__ */ (void 0)("div", {
														className: "mt-3 pt-3 border-t text-xs",
														children: [/* @__PURE__ */ (void 0)("div", {
															className: "font-medium text-muted-foreground mb-1",
															children: "Fontes manuais sugeridas:"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1912,
															columnNumber: 33
														}, this), previewResult.sources.map((source) => /* @__PURE__ */ (void 0)("div", {
															className: "truncate",
															children: ["• ", source.title]
														}, source.id, true, {
															fileName: _jsxFileName,
															lineNumber: 1915,
															columnNumber: 70
														}, this))]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1911,
														columnNumber: 66
													}, this),
													previewResult.ragEnabled && /* @__PURE__ */ (void 0)("div", {
														className: "mt-3 pt-3 border-t text-xs",
														children: [/* @__PURE__ */ (void 0)("div", {
															className: "font-medium text-blue-600 mb-1 flex items-center gap-1",
															children: [/* @__PURE__ */ (void 0)(Sparkles, { className: "h-3 w-3" }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1923,
																columnNumber: 35
															}, this), " Conhecimentos usados neste teste:"]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 1922,
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
																		lineNumber: 1928,
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
																		lineNumber: 1931,
																		columnNumber: 43
																	}, this)]
																}, void 0, true, {
																	fileName: _jsxFileName,
																	lineNumber: 1927,
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
																	lineNumber: 1935,
																	columnNumber: 41
																}, this)]
															}, k.chunkId, true, {
																fileName: _jsxFileName,
																lineNumber: 1926,
																columnNumber: 75
															}, this)), /* @__PURE__ */ (void 0)("div", {
																className: "text-[10px] text-muted-foreground pt-1",
																children: ["Total de blocos analisados: ", previewResult.totalChunksScanned]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1939,
																columnNumber: 37
															}, this)]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 1925,
															columnNumber: 106
														}, this) : /* @__PURE__ */ (void 0)("div", {
															className: "text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 italic",
															children: "Nenhum conhecimento relevante foi encontrado para esta pergunta."
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1942,
															columnNumber: 44
														}, this)]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1921,
														columnNumber: 58
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1909,
												columnNumber: 27
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1905,
											columnNumber: 41
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1871,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											className: "text-xs",
											children: "Faça uma pergunta para testar as respostas"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1951,
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
												lineNumber: 1954,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
												htmlFor: "use-rag-preview",
												className: "text-xs text-muted-foreground cursor-pointer",
												children: "Usar conhecimento preparado neste teste"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1955,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1953,
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
												lineNumber: 1961,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												onClick: () => void handlePreview(),
												disabled: !selectedAssistantId || previewLoading,
												variant: "secondary",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4 w-4 mr-2" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1963,
														columnNumber: 27
													}, this),
													" ",
													previewLoading ? "Simulando..." : "Simular"
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1962,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1960,
											columnNumber: 23
										}, this),
										!selectedAssistantId && /* @__PURE__ */ (void 0)("p", {
											className: "text-[10px] text-muted-foreground",
											children: "Salve o agente primeiro para habilitar a simulação."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1967,
											columnNumber: 48
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1950,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1870,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1866,
							columnNumber: 17
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1719,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1718,
				columnNumber: 13
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1035,
		columnNumber: 11
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1010,
		columnNumber: 206
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 990,
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
			lineNumber: 1990,
			columnNumber: 9
		}, this), desc && /* @__PURE__ */ (void 0)("div", {
			className: "text-xs text-muted-foreground",
			children: desc
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1991,
			columnNumber: 18
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1989,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "h-8 w-8 rounded-full border grid place-items-center text-xs",
			children: defaultChecked ? "✓" : "—"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1993,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1988,
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
			lineNumber: 2006,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "font-medium text-right",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2007,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2005,
		columnNumber: 10
	}, this);
}
//#endregion
export { NovoAgente as component };
