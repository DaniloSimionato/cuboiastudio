import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { n as apiFetch, t as ApiError } from "./_ssr/apiClient-Dme41CHA.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-CeW1PXo7.mjs";
import { D as RefreshCw, It as CircleCheck, f as Trash2, v as ShieldCheck } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-DVbabvC9.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as SecurityNotice } from "./_ssr/SecurityNotice-DyLr6C9z.mjs";
import { t as MaskedSecretInput } from "./_ssr/MaskedSecretInput-rH7CfUme.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.configuracoes-U9QOjSG_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var aiSettingsService = {
	async get() {
		return apiFetch("/settings/ai");
	},
	async getOptions() {
		return apiFetch("/settings/ai/options");
	},
	async save(payload) {
		return apiFetch("/settings/ai", {
			method: "PATCH",
			body: JSON.stringify(payload)
		});
	},
	async test(payload = {}) {
		return apiFetch("/settings/ai/test", {
			method: "POST",
			body: JSON.stringify(payload)
		});
	},
	async deleteApiKey() {
		return apiFetch("/settings/ai/api-key", { method: "DELETE" });
	}
};
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.configuracoes.tsx?tsr-split=component";
var DEFAULT_FORM_STATE = {
	runtimeEnabled: false,
	provider: "openai-compatible",
	baseUrl: "",
	model: "",
	apiKey: "",
	requestTimeoutMs: "30000"
};
var CUSTOM_MODEL_VALUE = "__custom_model__";
function mapSettingsToForm(settings, options) {
	const provider = options?.providers.find((item) => item.id === settings.provider);
	return {
		runtimeEnabled: settings.runtimeEnabled,
		provider: settings.provider,
		baseUrl: settings.baseUrl ?? provider?.baseUrl ?? "",
		model: settings.model ?? provider?.models[0] ?? "",
		apiKey: "",
		requestTimeoutMs: String(settings.requestTimeoutMs ?? 3e4)
	};
}
function ConfigPage() {
	const [company, setCompany] = (0, import_react.useState)(null);
	const [settings, setSettings] = (0, import_react.useState)(null);
	const [options, setOptions] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(DEFAULT_FORM_STATE);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [testing, setTesting] = (0, import_react.useState)(false);
	const [removingKey, setRemovingKey] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [testError, setTestError] = (0, import_react.useState)(null);
	const hasKeyConfigured = settings?.apiKeyConfigured ?? false;
	const providerOptions = options?.providers ?? [];
	const timeoutOptions = options?.timeoutOptionsMs ?? [
		1e4,
		3e4,
		6e4,
		12e4
	];
	const selectedProvider = providerOptions.find((provider) => provider.id === form.provider);
	const isCustomProvider = form.provider === "custom" || !selectedProvider;
	const selectedModelValue = selectedProvider?.models.includes(form.model) && form.model.length > 0 ? form.model : CUSTOM_MODEL_VALUE;
	const hasUnsavedSettings = settings ? form.runtimeEnabled !== settings.runtimeEnabled || form.provider !== settings.provider || form.baseUrl !== (settings.baseUrl ?? "") || form.model !== (settings.model ?? "") || Number(form.requestTimeoutMs) !== settings.requestTimeoutMs : true;
	const hasUnsavedApiKey = form.apiKey.trim().length > 0;
	const canTestConnection = Boolean(settings?.runtimeEnabled) && Boolean(settings?.baseUrl) && Boolean(settings?.model) && Boolean(settings?.apiKeyConfigured) && !hasUnsavedSettings && !hasUnsavedApiKey;
	const testDisabledReason = (0, import_react.useMemo)(() => {
		if (!settings?.runtimeEnabled) return "Ative e salve a IA real antes de testar.";
		if (!settings.baseUrl || !settings.model) return "Informe provider/modelo e salve antes de testar.";
		if (!settings.apiKeyConfigured) return "Salve uma API key antes de testar a conexão.";
		if (hasUnsavedApiKey || hasUnsavedSettings) return "Salve a configuração antes de testar.";
		return "Configuração salva pronta para teste.";
	}, [
		hasUnsavedApiKey,
		hasUnsavedSettings,
		settings
	]);
	const lastTestLabel = (0, import_react.useMemo)(() => {
		if (!settings?.lastTestAt) return "Nenhum teste registrado ainda.";
		return `Último teste em ${new Date(settings.lastTestAt).toLocaleString("pt-BR")}.`;
	}, [settings?.lastTestAt]);
	const sourceLabel = (0, import_react.useMemo)(() => {
		switch (settings?.source) {
			case "tenant-settings": return "Usando configuração do tenant.";
			case "env-fallback": return "Usando fallback global do backend.";
			case "mixed": return "Usando configuração do tenant com fallback global.";
			default: return "Sem provider ativo no momento.";
		}
	}, [settings?.source]);
	const load = async () => {
		setLoading(true);
		setError(null);
		try {
			const [companyResponse, settingsResponse, optionsResponse] = await Promise.all([
				currentCompanyService.get(),
				aiSettingsService.get(),
				aiSettingsService.getOptions()
			]);
			setCompany(companyResponse.company);
			setSettings(settingsResponse);
			setOptions(optionsResponse);
			setForm(mapSettingsToForm(settingsResponse, optionsResponse));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Não foi possível carregar as configurações.");
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	const updateField = (key, value) => {
		setForm((current) => ({
			...current,
			[key]: value
		}));
	};
	const updateProvider = (providerId) => {
		const provider = providerOptions.find((item) => item.id === providerId);
		setForm((current) => ({
			...current,
			provider: providerId,
			baseUrl: provider?.baseUrl ?? "",
			model: provider?.models[0] ?? ""
		}));
	};
	const updateModel = (value) => {
		if (value === CUSTOM_MODEL_VALUE) {
			setForm((current) => ({
				...current,
				model: selectedProvider?.models.includes(current.model) ? "" : current.model
			}));
			return;
		}
		updateField("model", value);
	};
	const handleSave = async () => {
		setSaving(true);
		setTestError(null);
		try {
			const timeoutValue = Number(form.requestTimeoutMs);
			const requestTimeoutMsValue = form.requestTimeoutMs.trim();
			const payload = {
				runtimeEnabled: form.runtimeEnabled,
				provider: form.provider.trim() || void 0,
				baseUrl: form.baseUrl.trim() || void 0,
				model: form.model.trim() || void 0,
				requestTimeoutMs: requestTimeoutMsValue.length > 0 && Number.isFinite(timeoutValue) ? timeoutValue : void 0,
				...form.apiKey.trim().length > 0 ? { apiKey: form.apiKey.trim() } : {}
			};
			const saved = await aiSettingsService.save(payload);
			setSettings(saved);
			setForm(mapSettingsToForm(saved, options));
			toast.success("Configuração de IA salva com segurança.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível salvar a configuração.");
		} finally {
			setSaving(false);
		}
	};
	const handleTest = async () => {
		setTesting(true);
		setTestError(null);
		try {
			const result = await aiSettingsService.test({ message: "Responda apenas: ok" });
			setSettings((current) => current ? {
				...current,
				lastTestAt: (/* @__PURE__ */ new Date()).toISOString(),
				lastTestStatus: "success"
			} : current);
			toast.success(`Conexão validada com ${result.provider} (${result.model}).`);
		} catch (err) {
			const formattedError = formatProviderTestError(err);
			setTestError(formattedError);
			toast.error(formattedError.message);
		} finally {
			setTesting(false);
		}
	};
	const handleRemoveKey = async () => {
		if (!window.confirm("Remover a chave salva deste tenant?")) return;
		setRemovingKey(true);
		try {
			const response = await aiSettingsService.deleteApiKey();
			setSettings((current) => current ? {
				...current,
				...response
			} : current);
			setForm((current) => ({
				...current,
				apiKey: ""
			}));
			toast.success("Chave removida com sucesso.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível remover a chave.");
		} finally {
			setRemovingKey(false);
		}
	};
	if (loading) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
		title: "Configurações",
		description: "Configure o provider de IA por tenant sem expor segredos no navegador."
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 386,
		columnNumber: 9
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando configuração de IA…" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 387,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 385,
		columnNumber: 12
	}, this);
	if (error) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
		title: "Configurações",
		description: "Configure o provider de IA por tenant sem expor segredos no navegador."
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 392,
		columnNumber: 9
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
		title: "Não foi possível carregar a página",
		description: error,
		onRetry: load
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 393,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 391,
		columnNumber: 12
	}, this);
	if (!company) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
		title: "Configurações",
		description: "Configure o provider de IA por tenant sem expor segredos no navegador."
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 398,
		columnNumber: 9
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
		title: "Empresa não encontrada",
		description: "Não foi possível resolver a empresa atual para esta sessão."
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 399,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 397,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				title: "Configurações",
				description: `Configuração aplicada à empresa ${company.name}. A API key nunca sai do backend.`
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 403,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-lg",
					children: "Configuração de IA"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 408,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Defina o provider do tenant. Se nenhum valor for salvo aqui, o backend usa o fallback global em desenvolvimento." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 409,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 407,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "space-y-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid gap-4 md:grid-cols-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Ativar IA real",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center justify-between rounded-lg border px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "space-y-0.5",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
												className: "text-sm font-medium",
												children: "Runtime habilitado"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 419,
												columnNumber: 21
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
												className: "text-xs text-muted-foreground",
												children: "Quando desligado, o fallback determinístico continua ativo."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 420,
												columnNumber: 21
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 418,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
											checked: form.runtimeEnabled,
											onCheckedChange: (checked) => updateField("runtimeEnabled", checked)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 424,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 417,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 416,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Status da chave",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex h-10 items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
											variant: "outline",
											className: hasKeyConfigured ? "border-emerald-200" : "",
											children: hasKeyConfigured ? "Chave configurada" : "Nenhuma chave salva"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 430,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
											variant: "outline",
											children: settings?.apiKeyConfigured ? "Protegida no backend" : "Aguardando chave"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 433,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 429,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 428,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Provedor",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										value: form.provider,
										onValueChange: updateProvider,
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione um provedor" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 442,
											columnNumber: 21
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 441,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: providerOptions.map((provider) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: provider.id,
											children: provider.label
										}, provider.id, false, {
											fileName: _jsxFileName,
											lineNumber: 445,
											columnNumber: 54
										}, this)) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 444,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 440,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 439,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Base URL",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: form.baseUrl,
										onChange: (event) => updateField("baseUrl", event.target.value),
										placeholder: isCustomProvider ? "https://api.exemplo.com/v1" : selectedProvider?.baseUrl,
										readOnly: !isCustomProvider,
										autoComplete: "off"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 453,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 452,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Modelo padrão",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
											value: selectedModelValue,
											onValueChange: updateModel,
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione um modelo" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 460,
												columnNumber: 23
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 459,
												columnNumber: 21
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [selectedProvider?.models.map((model) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: model,
												children: model
											}, model, false, {
												fileName: _jsxFileName,
												lineNumber: 463,
												columnNumber: 62
											}, this)), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: CUSTOM_MODEL_VALUE,
												children: "Custom"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 466,
												columnNumber: 23
											}, this)] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 462,
												columnNumber: 21
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 458,
											columnNumber: 19
										}, this), (selectedModelValue === CUSTOM_MODEL_VALUE || isCustomProvider) && /* @__PURE__ */ (void 0)(Input, {
											value: form.model,
											onChange: (event) => updateField("model", event.target.value),
											placeholder: "Modelo customizado",
											autoComplete: "off"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 469,
											columnNumber: 87
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 457,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 456,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Timeout da requisição",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										value: form.requestTimeoutMs,
										onValueChange: (value) => updateField("requestTimeoutMs", value),
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione o timeout" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 476,
											columnNumber: 21
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 475,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: timeoutOptions.map((timeout) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: String(timeout),
											children: [timeout / 1e3, "s"]
										}, timeout, true, {
											fileName: _jsxFileName,
											lineNumber: 479,
											columnNumber: 52
										}, this)) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 478,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 474,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 473,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 415,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "API Key",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MaskedSecretInput, {
								value: form.apiKey,
								onChange: (event) => updateField("apiKey", event.target.value),
								storedHint: hasKeyConfigured ? "Chave configurada" : void 0
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 488,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-xs text-muted-foreground",
								children: "Deixe em branco para manter a chave atual. A nova chave é criptografada no backend."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 489,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 487,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SecurityNotice, { children: "Segredos ficam somente no backend. O navegador envia a chave nova apenas quando você decide salvar." }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 494,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex flex-wrap gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									onClick: handleSave,
									disabled: saving,
									children: saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 animate-spin" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 502,
										columnNumber: 21
									}, this), " Salvando…"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 501,
										columnNumber: 27
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShieldCheck, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 504,
										columnNumber: 21
									}, this), " Salvar"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 503,
										columnNumber: 25
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 500,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									onClick: handleTest,
									disabled: testing || !canTestConnection,
									title: testDisabledReason,
									children: testing ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 animate-spin" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 509,
										columnNumber: 21
									}, this), " Testando…"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 508,
										columnNumber: 28
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleCheck, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 511,
										columnNumber: 21
									}, this), " Testar conexão"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 510,
										columnNumber: 25
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 507,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "destructive",
									onClick: handleRemoveKey,
									disabled: removingKey || !hasKeyConfigured,
									children: removingKey ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 animate-spin" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 516,
										columnNumber: 21
									}, this), " Removendo…"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 515,
										columnNumber: 32
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 518,
										columnNumber: 21
									}, this), " Remover chave"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 517,
										columnNumber: 25
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 514,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 499,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-xs text-muted-foreground",
							children: testDisabledReason
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 522,
							columnNumber: 13
						}, this),
						testError && /* @__PURE__ */ (void 0)("div", {
							className: "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive",
							children: [/* @__PURE__ */ (void 0)("p", { children: testError.message }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 524,
								columnNumber: 17
							}, this), testError.providerStatus !== void 0 && /* @__PURE__ */ (void 0)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: ["Status do provider: ", testError.providerStatus]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 525,
								columnNumber: 60
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 523,
							columnNumber: 27
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 414,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 406,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-lg",
					children: "Resumo"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 534,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Visão rápida da configuração ativa no backend." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 535,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 533,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Empresa",
							value: company.name
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 538,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Modo",
							value: form.runtimeEnabled ? "IA real habilitada" : "Fallback determinístico"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 539,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Origem",
							value: sourceLabel
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 540,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Provider",
							value: settings?.provider ?? form.provider
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 541,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Modelo",
							value: settings?.model || form.model || "Padrão do backend"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 542,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Timeout",
							value: `${settings?.requestTimeoutMs ?? Number(form.requestTimeoutMs)} ms`
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 543,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Último teste",
							value: settings?.lastTestStatus ?? "Sem testes"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 544,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-xs text-muted-foreground",
							children: lastTestLabel
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 545,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 537,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 532,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 405,
				columnNumber: 7
			}, this),
			settings?.source === "env-fallback" && /* @__PURE__ */ (void 0)(SecurityNotice, { children: "O backend está usando fallback global por enquanto. Salvar esta tela cria a configuração do tenant sem quebrar o modo determinístico." }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 550,
				columnNumber: 47
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 402,
		columnNumber: 10
	}, this);
}
function formatProviderTestError(error) {
	if (error instanceof ApiError) {
		const providerError = error.details.providerError;
		const providerDetail = providerError?.message ?? providerError?.code ?? providerError?.type;
		if (providerDetail) return {
			message: `Provider recusou a requisição: ${providerDetail}.`,
			providerStatus: error.details.providerStatus
		};
		return {
			message: error.message,
			providerStatus: error.details.providerStatus
		};
	}
	return { message: error instanceof Error ? error.message : "Falha ao testar a conexão." };
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
			className: "text-xs",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1453,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1452,
		columnNumber: 10
	}, this);
}
function SummaryRow({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "rounded-lg border px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "text-[11px] uppercase tracking-wide text-muted-foreground",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1586,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "text-sm font-medium",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1587,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1585,
		columnNumber: 10
	}, this);
}
//#endregion
export { ConfigPage as component };
