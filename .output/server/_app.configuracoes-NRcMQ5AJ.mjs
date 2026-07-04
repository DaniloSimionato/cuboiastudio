import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as cva } from "./_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { n as apiFetch, t as ApiError } from "./_ssr/apiClient-Bei-u2-_.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-DRGNNNW9.mjs";
import { B as Link2, D as PowerOff, E as Power, Ft as CircleCheck, H as KeyRound, O as Plus, Ot as TriangleAlert, b as Search, gt as Check, h as ShieldCheck, lt as ChevronsUpDown, r as Webhook, rt as Copy, t as X, u as Trash2, v as Settings2, w as RefreshCw } from "./_libs/lucide-react.mjs";
import { a as DialogOverlay, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "./_libs/@radix-ui/react-dialog+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-Bsft3ipc.mjs";
import { i as isSmokeAssistantName, n as filterOperationalAssistants, r as isSmokeAssistant, t as backendAssistantsService } from "./_ssr/backendAssistantsService-B1lwdUmO.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { t as toast } from "./_libs/sonner.mjs";
import { t as SecurityNotice } from "./_ssr/SecurityNotice-DyLr6C9z.mjs";
import { t as MaskedSecretInput } from "./_ssr/MaskedSecretInput-BEfdpu1t.mjs";
import { t as _e } from "./_libs/cmdk.mjs";
import { i as Trigger, n as Portal, r as Root2, t as Content2 } from "./_libs/radix-ui__react-popover.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.configuracoes-NRcMQ5AJ.js
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
var chatwootSettingsService = {
	async list() {
		return apiFetch("/settings/chatwoot/inboxes");
	},
	async create(payload) {
		return apiFetch("/settings/chatwoot/inboxes", {
			method: "POST",
			body: JSON.stringify(payload)
		});
	},
	async update(id, payload) {
		return apiFetch(`/settings/chatwoot/inboxes/${id}`, {
			method: "PATCH",
			body: JSON.stringify(payload)
		});
	},
	async remove(id) {
		return apiFetch(`/settings/chatwoot/inboxes/${id}`, { method: "DELETE" });
	},
	async test(id) {
		return apiFetch(`/settings/chatwoot/inboxes/${id}/test`, { method: "POST" });
	}
};
var _jsxFileName$3 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/command.tsx";
var Command$1 = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(_e, {
	ref,
	className: cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$3,
	lineNumber: 15,
	columnNumber: 3
}, void 0));
Command$1.displayName = _e.displayName;
var CommandInput = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	className: "flex items-center border-b px-3",
	"cmdk-input-wrapper": "",
	children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Search, { className: "mr-2 h-4 w-4 shrink-0 opacity-50" }, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 43,
		columnNumber: 5
	}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(_e.Input, {
		ref,
		className: cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className),
		...props
	}, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 44,
		columnNumber: 5
	}, void 0)]
}, void 0, true, {
	fileName: _jsxFileName$3,
	lineNumber: 42,
	columnNumber: 3
}, void 0));
CommandInput.displayName = _e.Input.displayName;
var CommandList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(_e.List, {
	ref,
	className: cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$3,
	lineNumber: 61,
	columnNumber: 3
}, void 0));
CommandList.displayName = _e.List.displayName;
var CommandEmpty = import_react.forwardRef((props, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(_e.Empty, {
	ref,
	className: "py-6 text-center text-sm",
	...props
}, void 0, false, {
	fileName: _jsxFileName$3,
	lineNumber: 74,
	columnNumber: 3
}, void 0));
CommandEmpty.displayName = _e.Empty.displayName;
var CommandGroup = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(_e.Group, {
	ref,
	className: cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$3,
	lineNumber: 83,
	columnNumber: 3
}, void 0));
CommandGroup.displayName = _e.Group.displayName;
var CommandSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(_e.Separator, {
	ref,
	className: cn("-mx-1 h-px bg-border", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$3,
	lineNumber: 99,
	columnNumber: 3
}, void 0));
CommandSeparator.displayName = _e.Separator.displayName;
var CommandItem = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(_e.Item, {
	ref,
	className: cn("relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$3,
	lineNumber: 111,
	columnNumber: 3
}, void 0));
CommandItem.displayName = _e.Item.displayName;
var CommandShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
		className: cn("ml-auto text-xs tracking-widest text-muted-foreground", className),
		...props
	}, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 125,
		columnNumber: 5
	}, void 0);
};
CommandShortcut.displayName = "CommandShortcut";
var _jsxFileName$2 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/popover.tsx";
var Popover = Root2;
var PopoverTrigger = Trigger;
var PopoverContent = import_react.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Portal, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Content2, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 17,
	columnNumber: 5
}, void 0) }, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 16,
	columnNumber: 3
}, void 0));
PopoverContent.displayName = Content2.displayName;
var _jsxFileName$1 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/sheet.tsx";
var Sheet = Dialog;
var SheetPortal = DialogPortal;
var SheetOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogOverlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 22,
	columnNumber: 3
}, void 0));
SheetOverlay.displayName = DialogOverlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = import_react.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetPortal, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetOverlay, {}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 62,
	columnNumber: 5
}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(X, { className: "h-4 w-4" }, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 65,
			columnNumber: 9
		}, void 0), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "sr-only",
			children: "Close"
		}, void 0, false, {
			fileName: _jsxFileName$1,
			lineNumber: 66,
			columnNumber: 9
		}, void 0)]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 64,
		columnNumber: 7
	}, void 0), children]
}, void 0, true, {
	fileName: _jsxFileName$1,
	lineNumber: 63,
	columnNumber: 5
}, void 0)] }, void 0, true, {
	fileName: _jsxFileName$1,
	lineNumber: 61,
	columnNumber: 3
}, void 0));
SheetContent.displayName = DialogContent.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 75,
	columnNumber: 3
}, void 0);
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 80,
	columnNumber: 3
}, void 0);
SheetFooter.displayName = "SheetFooter";
var SheetTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 91,
	columnNumber: 3
}, void 0));
SheetTitle.displayName = DialogTitle.displayName;
var SheetDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$1,
	lineNumber: 103,
	columnNumber: 3
}, void 0));
SheetDescription.displayName = DialogDescription.displayName;
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
var DEFAULT_CHATWOOT_FORM_STATE = {
	name: "",
	baseUrl: "",
	accountId: "",
	inboxId: "",
	assistantId: "",
	apiAccessToken: "",
	webhookSecret: "",
	isActive: true,
	metadataJsonText: ""
};
var CHATWOOT_WEBHOOK_SECRET_PLACEHOLDER = "SEU_SECRET_CONFIGURADO";
var CHATWOOT_LEGACY_WEBHOOK_HEADER = "x-chatwoot-webhook-secret";
var CHATWOOT_WEBHOOK_PATH = "/webhooks/chatwoot";
var CHATWOOT_LEGACY_WEBHOOK_PATH = "/webhooks/chatwoot/:assistantId/message-created";
function normalizeBaseUrl(value) {
	return value.trim().replace(/\/+$/, "");
}
function isLocalUrl(value) {
	try {
		const url = new URL(value);
		return [
			"localhost",
			"127.0.0.1",
			"::1"
		].includes(url.hostname);
	} catch {
		return value.includes("localhost") || value.includes("127.0.0.1");
	}
}
function getConfiguredPublicApiUrl() {
	const configured = [
		void 0,
		void 0,
		void 0,
		void 0
	].find((value) => typeof value === "string" && value.trim().length > 0);
	return configured ? normalizeBaseUrl(configured) : "";
}
function getWebhookUrlTemplate() {
	typeof window !== "undefined" && window.location.origin;
	return `http://localhost:3001/webhooks/chatwoot?secret=${CHATWOOT_WEBHOOK_SECRET_PLACEHOLDER}`;
}
function buildWebhookUrl(baseUrl, secret) {
	const url = new URL(`${normalizeBaseUrl(baseUrl)}${CHATWOOT_WEBHOOK_PATH}`);
	const normalizedSecret = secret?.trim();
	if (normalizedSecret) url.searchParams.set("secret", normalizedSecret);
	return url.toString();
}
function buildPlaceholderWebhookUrl(baseUrl) {
	return buildWebhookUrl(baseUrl, CHATWOOT_WEBHOOK_SECRET_PLACEHOLDER);
}
function assistantShortId(id) {
	return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}
function generateWebhookSecret() {
	const bytes = /* @__PURE__ */ new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function formatDate(value) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString("pt-BR");
}
function parseChatwootMetadata(input) {
	const trimmed = input.trim();
	if (!trimmed) return;
	try {
		const parsed = JSON.parse(trimmed);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
		throw new Error("O metadataJson precisa ser um objeto JSON.");
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "metadataJson inválido.");
	}
}
function toChatwootMetadataText(metadata) {
	if (!metadata) return "";
	try {
		return JSON.stringify(metadata, null, 2);
	} catch {
		return "";
	}
}
function normalizeChatwootPayload(form, existing) {
	const name = form.name.trim() || `Chatwoot ${form.inboxId.trim() || "Inbox"}`;
	const baseUrl = normalizeBaseUrl(form.baseUrl);
	const accountId = form.accountId.trim();
	const inboxId = form.inboxId.trim();
	const assistantId = form.assistantId.trim();
	const apiAccessToken = form.apiAccessToken.trim();
	const webhookSecret = form.webhookSecret.trim();
	return {
		name,
		baseUrl,
		accountId,
		inboxId,
		...assistantId ? { assistantId } : existing?.assistantId ? {} : {},
		...apiAccessToken ? { apiAccessToken } : existing?.apiAccessTokenConfigured ? {} : {},
		...webhookSecret ? { webhookSecret } : existing?.webhookSecretConfigured ? {} : {},
		isActive: form.isActive,
		metadataJson: parseChatwootMetadata(form.metadataJsonText)
	};
}
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
		lineNumber: 347,
		columnNumber: 9
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando configuração de IA…" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 348,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 346,
		columnNumber: 12
	}, this);
	if (error) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
		title: "Configurações",
		description: "Configure o provider de IA por tenant sem expor segredos no navegador."
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 353,
		columnNumber: 9
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
		title: "Não foi possível carregar a página",
		description: error,
		onRetry: load
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 354,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 352,
		columnNumber: 12
	}, this);
	if (!company) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
		title: "Configurações",
		description: "Configure o provider de IA por tenant sem expor segredos no navegador."
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 359,
		columnNumber: 9
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
		title: "Empresa não encontrada",
		description: "Não foi possível resolver a empresa atual para esta sessão."
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 360,
		columnNumber: 9
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 358,
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
				lineNumber: 364,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-lg",
					children: "Configuração de IA"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 369,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Defina o provider do tenant. Se nenhum valor for salvo aqui, o backend usa o fallback global em desenvolvimento." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 370,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 368,
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
												lineNumber: 380,
												columnNumber: 21
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
												className: "text-xs text-muted-foreground",
												children: "Quando desligado, o fallback determinístico continua ativo."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 381,
												columnNumber: 21
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 379,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
											checked: form.runtimeEnabled,
											onCheckedChange: (checked) => updateField("runtimeEnabled", checked)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 385,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 378,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 377,
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
											lineNumber: 391,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
											variant: "outline",
											children: settings?.apiKeyConfigured ? "Protegida no backend" : "Aguardando chave"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 394,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 390,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 389,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Provedor",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										value: form.provider,
										onValueChange: updateProvider,
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione um provedor" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 403,
											columnNumber: 21
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 402,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: providerOptions.map((provider) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: provider.id,
											children: provider.label
										}, provider.id, false, {
											fileName: _jsxFileName,
											lineNumber: 406,
											columnNumber: 54
										}, this)) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 405,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 401,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 400,
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
										lineNumber: 414,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 413,
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
												lineNumber: 421,
												columnNumber: 23
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 420,
												columnNumber: 21
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [selectedProvider?.models.map((model) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: model,
												children: model
											}, model, false, {
												fileName: _jsxFileName,
												lineNumber: 424,
												columnNumber: 62
											}, this)), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: CUSTOM_MODEL_VALUE,
												children: "Custom"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 427,
												columnNumber: 23
											}, this)] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 423,
												columnNumber: 21
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 419,
											columnNumber: 19
										}, this), (selectedModelValue === CUSTOM_MODEL_VALUE || isCustomProvider) && /* @__PURE__ */ (void 0)(Input, {
											value: form.model,
											onChange: (event) => updateField("model", event.target.value),
											placeholder: "Modelo customizado",
											autoComplete: "off"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 430,
											columnNumber: 87
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 418,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 417,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Timeout da requisição",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										value: form.requestTimeoutMs,
										onValueChange: (value) => updateField("requestTimeoutMs", value),
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione o timeout" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 437,
											columnNumber: 21
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 436,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: timeoutOptions.map((timeout) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: String(timeout),
											children: [timeout / 1e3, "s"]
										}, timeout, true, {
											fileName: _jsxFileName,
											lineNumber: 440,
											columnNumber: 52
										}, this)) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 439,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 435,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 434,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 376,
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
								lineNumber: 449,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-xs text-muted-foreground",
								children: "Deixe em branco para manter a chave atual. A nova chave é criptografada no backend."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 450,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 448,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SecurityNotice, { children: "Segredos ficam somente no backend. O navegador envia a chave nova apenas quando você decide salvar." }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 455,
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
										lineNumber: 463,
										columnNumber: 21
									}, this), " Salvando…"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 462,
										columnNumber: 27
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShieldCheck, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 465,
										columnNumber: 21
									}, this), " Salvar"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 464,
										columnNumber: 25
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 461,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									onClick: handleTest,
									disabled: testing || !canTestConnection,
									title: testDisabledReason,
									children: testing ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 animate-spin" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 470,
										columnNumber: 21
									}, this), " Testando…"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 469,
										columnNumber: 28
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleCheck, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 472,
										columnNumber: 21
									}, this), " Testar conexão"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 471,
										columnNumber: 25
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 468,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "destructive",
									onClick: handleRemoveKey,
									disabled: removingKey || !hasKeyConfigured,
									children: removingKey ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 animate-spin" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 477,
										columnNumber: 21
									}, this), " Removendo…"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 476,
										columnNumber: 32
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 479,
										columnNumber: 21
									}, this), " Remover chave"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 478,
										columnNumber: 25
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 475,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 460,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-xs text-muted-foreground",
							children: testDisabledReason
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 483,
							columnNumber: 13
						}, this),
						testError && /* @__PURE__ */ (void 0)("div", {
							className: "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive",
							children: [/* @__PURE__ */ (void 0)("p", { children: testError.message }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 485,
								columnNumber: 17
							}, this), testError.providerStatus !== void 0 && /* @__PURE__ */ (void 0)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: ["Status do provider: ", testError.providerStatus]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 486,
								columnNumber: 60
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 484,
							columnNumber: 27
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 375,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 367,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-lg",
					children: "Resumo"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 495,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Visão rápida da configuração ativa no backend." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 496,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 494,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Empresa",
							value: company.name
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 499,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Modo",
							value: form.runtimeEnabled ? "IA real habilitada" : "Fallback determinístico"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 500,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Origem",
							value: sourceLabel
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 501,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Provider",
							value: settings?.provider ?? form.provider
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 502,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Modelo",
							value: settings?.model || form.model || "Padrão do backend"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 503,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Timeout",
							value: `${settings?.requestTimeoutMs ?? Number(form.requestTimeoutMs)} ms`
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 504,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
							label: "Último teste",
							value: settings?.lastTestStatus ?? "Sem testes"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 505,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-xs text-muted-foreground",
							children: lastTestLabel
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 506,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 498,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 493,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 366,
				columnNumber: 7
			}, this),
			settings?.source === "env-fallback" && /* @__PURE__ */ (void 0)(SecurityNotice, { children: "O backend está usando fallback global por enquanto. Salvar esta tela cria a configuração do tenant sem quebrar o modo determinístico." }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 511,
				columnNumber: 47
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChatwootIntegrationSection, { companyName: company.name }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 516,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 363,
		columnNumber: 10
	}, this);
}
function ChatwootIntegrationSection({ companyName }) {
	const [configs, setConfigs] = (0, import_react.useState)([]);
	const [assistants, setAssistants] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const [assistantError, setAssistantError] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [testingId, setTestingId] = (0, import_react.useState)(null);
	const [deletingId, setDeletingId] = (0, import_react.useState)(null);
	const [formError, setFormError] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(DEFAULT_CHATWOOT_FORM_STATE);
	const [editingId, setEditingId] = (0, import_react.useState)(null);
	const [lastTestResults, setLastTestResults] = (0, import_react.useState)({});
	const [isFormOpen, setIsFormOpen] = (0, import_react.useState)(false);
	const [showAdvanced, setShowAdvanced] = (0, import_react.useState)(false);
	const [webhookSecretWasGenerated, setWebhookSecretWasGenerated] = (0, import_react.useState)(false);
	const [showHiddenAssistants, setShowHiddenAssistants] = (0, import_react.useState)(false);
	const [temporaryPublicApiUrl, setTemporaryPublicApiUrl] = (0, import_react.useState)("");
	const [webhookUrlTemplate, setWebhookUrlTemplate] = (0, import_react.useState)("");
	const [configuredPublicApiUrl, setConfiguredPublicApiUrl] = (0, import_react.useState)("");
	const editingConfig = configs.find((item) => item.id === editingId) ?? null;
	const isEditing = Boolean(editingConfig);
	const storedTokenHint = editingConfig?.apiAccessTokenConfigured ? "Token já configurado" : void 0;
	const storedSecretHint = editingConfig?.webhookSecretConfigured ? "Segredo já configurado" : void 0;
	const assistantById = (0, import_react.useMemo)(() => new Map(assistants.map((item) => [item.id, item])), [assistants]);
	const selectedAssistant = assistantById.get(form.assistantId) ?? null;
	const assistantOptions = (0, import_react.useMemo)(() => assistants.slice().sort((left, right) => {
		if (left.status !== right.status) return left.status === "ACTIVE" ? -1 : 1;
		const nameCompare = left.name.localeCompare(right.name, "pt-BR");
		if (nameCompare !== 0) return nameCompare;
		return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
	}), [assistants]);
	const visibleAssistantOptions = (0, import_react.useMemo)(() => filterOperationalAssistants(assistantOptions), [assistantOptions]);
	const hiddenAssistantOptions = (0, import_react.useMemo)(() => assistantOptions.filter((assistant) => !isSmokeAssistant(assistant) && assistant.status !== "ACTIVE"), [assistantOptions]);
	const selectedAssistantIsHidden = Boolean(selectedAssistant) && !visibleAssistantOptions.some((assistant) => assistant.id === selectedAssistant?.id);
	const configuredPublicInstructionUrl = configuredPublicApiUrl && !isLocalUrl(configuredPublicApiUrl) ? configuredPublicApiUrl : "";
	const publicInstructionBaseUrl = normalizeBaseUrl(temporaryPublicApiUrl.trim() || configuredPublicInstructionUrl);
	const recommendedWebhookUrl = publicInstructionBaseUrl ? buildPlaceholderWebhookUrl(publicInstructionBaseUrl) : `https://SUA_URL_PUBLICA/webhooks/chatwoot?secret=${CHATWOOT_WEBHOOK_SECRET_PLACEHOLDER}`;
	const localWebhookUrl = webhookUrlTemplate || getWebhookUrlTemplate();
	const hasPublicWebhookUrl = Boolean(publicInstructionBaseUrl) && !isLocalUrl(publicInstructionBaseUrl);
	const activeConfigs = configs.filter((config) => config.isActive);
	const configsWithAssistant = configs.filter((config) => Boolean(config.assistantId));
	const configsWithIssues = configs.filter((config) => !config.assistantId || config.assistantStatus !== "ACTIVE" || !config.apiAccessTokenConfigured || !config.webhookSecretConfigured || lastTestResults[config.id]?.ok === false);
	const load = async () => {
		setLoading(true);
		setError(null);
		setAssistantError(null);
		try {
			const [configsResponse, assistantsResponse] = await Promise.allSettled([chatwootSettingsService.list(), backendAssistantsService.list()]);
			if (configsResponse.status === "rejected") throw configsResponse.reason instanceof Error ? configsResponse.reason : /* @__PURE__ */ new Error("Não foi possível carregar as inboxes do Chatwoot.");
			setConfigs(configsResponse.value);
			if (assistantsResponse.status === "fulfilled") setAssistants(assistantsResponse.value);
			else {
				setAssistants([]);
				setAssistantError(assistantsResponse.reason instanceof Error ? assistantsResponse.reason.message : "Não foi possível carregar a lista de assistentes.");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Não foi possível carregar as inboxes do Chatwoot.");
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	(0, import_react.useEffect)(() => {
		setWebhookUrlTemplate(getWebhookUrlTemplate());
		setConfiguredPublicApiUrl(getConfiguredPublicApiUrl());
	}, []);
	const startCreate = () => {
		setEditingId(null);
		setForm(DEFAULT_CHATWOOT_FORM_STATE);
		setFormError(null);
		setShowAdvanced(false);
		setWebhookSecretWasGenerated(false);
		setIsFormOpen(true);
	};
	const startEdit = (config) => {
		setEditingId(config.id);
		setFormError(null);
		setForm({
			name: config.name,
			baseUrl: config.baseUrl,
			accountId: config.accountId,
			inboxId: config.inboxId,
			assistantId: config.assistantId ?? "",
			apiAccessToken: "",
			webhookSecret: "",
			isActive: config.isActive,
			metadataJsonText: toChatwootMetadataText(config.metadataJson)
		});
		setShowAdvanced(false);
		setWebhookSecretWasGenerated(false);
		setIsFormOpen(true);
	};
	const closeForm = () => {
		setIsFormOpen(false);
		setFormError(null);
		setEditingId(null);
		setForm(DEFAULT_CHATWOOT_FORM_STATE);
		setShowAdvanced(false);
		setWebhookSecretWasGenerated(false);
	};
	const submit = async () => {
		setSaving(true);
		setFormError(null);
		try {
			const baseUrl = normalizeBaseUrl(form.baseUrl);
			if (!baseUrl) throw new Error("Informe a URL base do Chatwoot.");
			try {
				new URL(baseUrl);
			} catch {
				throw new Error("A URL base do Chatwoot precisa ser válida.");
			}
			if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) throw new Error("A URL base precisa começar com http:// ou https://.");
			if (!form.name.trim()) throw new Error("Informe o nome da configuração.");
			if (!form.accountId.trim()) throw new Error("Informe o Account ID.");
			if (!form.inboxId.trim()) throw new Error("Informe o Inbox ID.");
			if (!form.assistantId.trim() && !(editingConfig?.assistantId ?? "")) throw new Error("Selecione o assistente responsável.");
			const assistantToValidate = assistantById.get(form.assistantId);
			if (form.isActive && (!assistantToValidate || assistantToValidate.status !== "ACTIVE")) throw new Error("Selecione um assistente ativo para responder esta inbox.");
			if (!form.apiAccessToken.trim() && !(editingConfig?.apiAccessTokenConfigured ?? false)) throw new Error("Informe o token de API do Chatwoot.");
			const payload = normalizeChatwootPayload(form, editingConfig);
			const response = editingConfig ? await chatwootSettingsService.update(editingConfig.id, payload) : await chatwootSettingsService.create(payload);
			toast.success(editingConfig ? "Configuração do Chatwoot atualizada." : "Configuração do Chatwoot criada.");
			setConfigs((current) => editingConfig ? current.map((item) => item.id === response.id ? response : item) : [response, ...current]);
			closeForm();
			await load();
		} catch (err) {
			const message = err instanceof Error ? err.message : "Não foi possível salvar a inbox.";
			setFormError(message);
			toast.error(message);
		} finally {
			setSaving(false);
		}
	};
	const toggleActive = async (config) => {
		try {
			const payload = normalizeChatwootPayload({
				name: config.name,
				baseUrl: config.baseUrl,
				accountId: config.accountId,
				inboxId: config.inboxId,
				assistantId: config.assistantId ?? "",
				apiAccessToken: "",
				webhookSecret: "",
				isActive: !config.isActive,
				metadataJsonText: toChatwootMetadataText(config.metadataJson)
			}, config);
			const response = await chatwootSettingsService.update(config.id, payload);
			setConfigs((current) => current.map((item) => item.id === config.id ? response : item));
			toast.success(response.isActive ? "Inbox ativada." : "Inbox desativada.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível alterar o status.");
		}
	};
	const testConnection = async (config) => {
		setTestingId(config.id);
		try {
			const result = await chatwootSettingsService.test(config.id);
			setLastTestResults((current) => ({
				...current,
				[config.id]: result
			}));
			if (result.ok) toast.success(result.message);
			else toast.error(result.reason ? `${result.message} ${result.reason}` : result.message);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível testar a configuração.");
		} finally {
			setTestingId(null);
		}
	};
	const remove = async (config) => {
		if (!window.confirm(`Remover a inbox "${config.name}"?`)) return;
		setDeletingId(config.id);
		try {
			await chatwootSettingsService.remove(config.id);
			setConfigs((current) => current.filter((item) => item.id !== config.id));
			setLastTestResults((current) => {
				const next = { ...current };
				delete next[config.id];
				return next;
			});
			if (editingId === config.id) startCreate();
			toast.success("Configuração removida.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível remover a inbox.");
		} finally {
			setDeletingId(null);
		}
	};
	const copyToClipboard = async (value, label) => {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(`${label} copiado.`);
		} catch {
			toast.error("Não foi possível copiar para a área de transferência.");
		}
	};
	const generateSecret = () => {
		const secret = generateWebhookSecret();
		setForm((current) => ({
			...current,
			webhookSecret: secret
		}));
		setWebhookSecretWasGenerated(true);
		toast.success("Segredo gerado. Agora copie a URL do webhook com segredo.");
	};
	if (loading) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mt-10",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando configurações do Chatwoot…" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 770,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 769,
		columnNumber: 12
	}, this);
	if (error) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mt-10",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
			title: "Chatwoot indisponível",
			description: error,
			onRetry: load
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 775,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 774,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", {
		className: "space-y-4 mt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				title: "Chatwoot / WhatsApp",
				description: `Conecte inboxes do Chatwoot a assistentes para responder conversas reais do WhatsApp na empresa ${companyName}.`,
				actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: startCreate,
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 780,
						columnNumber: 13
					}, this), " Nova configuração"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 779,
					columnNumber: 184
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 779,
				columnNumber: 7
			}, this),
			assistantError ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900",
				children: assistantError
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 783,
				columnNumber: 25
			}, this) : null,
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-3 md:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
						label: "Total de inboxes",
						value: String(configs.length)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 788,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
						label: "Ativas",
						value: String(activeConfigs.length)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 789,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
						label: "Com assistente",
						value: String(configsWithAssistant.length)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 790,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
						label: "Com alerta",
						value: String(configsWithIssues.length),
						tone: configsWithIssues.length > 0 ? "warning" : "default"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 791,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 787,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
				className: "gap-3 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-lg",
					children: "Inboxes cadastradas"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 797,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Cada inbox mapeia Account ID + Inbox ID para um assistente responsável." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 798,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 796,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: startCreate,
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 803,
						columnNumber: 13
					}, this), " Nova configuração"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 802,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 795,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: configs.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
				title: "Nenhuma inbox do Chatwoot configurada.",
				description: "Cadastre uma inbox para conectar um número de WhatsApp a um assistente.",
				action: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: startCreate,
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 808,
						columnNumber: 19
					}, this), " Nova configuração"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 807,
					columnNumber: 188
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 807,
				columnNumber: 35
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-3 lg:grid-cols-2",
				children: configs.map((config) => {
					const testResult = lastTestResults[config.id];
					const linkedAssistant = assistantById.get(config.assistantId ?? "") ?? null;
					const assistantIsSmoke = isSmokeAssistant(linkedAssistant) || typeof config.assistantName === "string" && isSmokeAssistantName(config.assistantName);
					const assistantName = assistantIsSmoke ? "Assistente de teste oculto" : config.assistantName ?? linkedAssistant?.name ?? "Sem assistente vinculado";
					const assistantInactive = Boolean(config.assistantId) && (config.assistantStatus !== "ACTIVE" || assistantIsSmoke);
					return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl border bg-card p-4 shadow-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex flex-wrap items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "min-w-0 space-y-1",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex flex-wrap items-center gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
												className: "font-semibold",
												children: config.name
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 820,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: config.isActive ? "ativo" : "pausado" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 821,
												columnNumber: 27
											}, this),
											!config.assistantId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
												variant: "outline",
												className: "border-amber-200 text-amber-700",
												children: "Sem assistente"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 822,
												columnNumber: 50
											}, this) : assistantInactive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
												variant: "outline",
												className: "border-amber-200 text-amber-700",
												children: "Assistente inativo"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 824,
												columnNumber: 60
											}, this) : null
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 819,
										columnNumber: 25
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "break-all text-xs text-muted-foreground",
										children: config.baseUrl
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 828,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 818,
									columnNumber: 23
								}, this), testResult ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
									variant: "outline",
									className: testResult.ok ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700",
									children: testResult.ok ? "Teste OK" : "Erro no teste"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 830,
									columnNumber: 37
								}, this) : null]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 817,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-4 grid gap-2 sm:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
										label: "Account ID",
										value: config.accountId
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 836,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
										label: "Inbox ID",
										value: config.inboxId
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 837,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
										label: "Assistente responsável",
										value: assistantName
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 838,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
										label: "Atualizado em",
										value: formatDate(config.updatedAt)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 839,
										columnNumber: 23
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 835,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "rounded-lg border bg-muted/30 px-3 py-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
											className: "font-medium text-foreground",
											children: "API Access Token:"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 844,
											columnNumber: 25
										}, this),
										" ",
										config.apiAccessTokenConfigured ? "Token de usuário já configurado" : "Sem token"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 843,
									columnNumber: 23
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "rounded-lg border bg-muted/30 px-3 py-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
											className: "font-medium text-foreground",
											children: "Webhook secret:"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 848,
											columnNumber: 25
										}, this),
										" ",
										config.webhookSecretConfigured ? "Segredo já configurado" : "Sem segredo"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 847,
									columnNumber: 23
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 842,
								columnNumber: 21
							}, this),
							!config.isActive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mt-3 text-sm text-amber-700",
								children: "Inativa: mensagens dessa inbox serão ignoradas."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 853,
								columnNumber: 41
							}, this) : !config.assistantId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mt-3 text-sm text-amber-700",
								children: "Sem assistente vinculado. Esta inbox não responderá automaticamente até que um assistente seja selecionado."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 855,
								columnNumber: 52
							}, this) : assistantInactive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mt-3 text-sm text-amber-700",
								children: "Assistente inativo. Reative ou selecione outro assistente para responder esta inbox."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 858,
								columnNumber: 50
							}, this) : null,
							testResult ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: testResult.ok ? "mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-800" : "mt-3 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2 text-sm text-rose-800",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "font-medium",
									children: testResult.message
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 864,
									columnNumber: 25
								}, this), !testResult.ok && testResult.reason ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "mt-1 text-xs text-muted-foreground",
									children: testResult.reason
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 865,
									columnNumber: 64
								}, this) : null]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 863,
								columnNumber: 35
							}, this) : null,
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-4 flex flex-wrap gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => startEdit(config),
										children: !config.assistantId ? "Vincular assistente" : "Editar"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 871,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => void testConnection(config),
										disabled: testingId === config.id,
										children: testingId === config.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 animate-spin" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 876,
											columnNumber: 29
										}, this), " Testando"] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 875,
											columnNumber: 52
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Webhook, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 878,
											columnNumber: 29
										}, this), " Testar conexão"] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 877,
											columnNumber: 33
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 874,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										size: "sm",
										variant: "ghost",
										onClick: () => void toggleActive(config),
										children: config.isActive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PowerOff, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 883,
											columnNumber: 29
										}, this), " Inativar"] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 882,
											columnNumber: 44
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Power, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 885,
											columnNumber: 29
										}, this), " Ativar"] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 884,
											columnNumber: 33
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 881,
										columnNumber: 23
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										size: "sm",
										variant: "destructive",
										onClick: () => void remove(config),
										disabled: deletingId === config.id,
										children: deletingId === config.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 animate-spin" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 890,
											columnNumber: 29
										}, this), " Removendo"] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 889,
											columnNumber: 53
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 892,
											columnNumber: 29
										}, this), " Remover"] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 891,
											columnNumber: 33
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 888,
										columnNumber: 23
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 870,
								columnNumber: 21
							}, this)
						]
					}, config.id, true, {
						fileName: _jsxFileName,
						lineNumber: 816,
						columnNumber: 20
					}, this);
				})
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 809,
				columnNumber: 33
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 806,
				columnNumber: 9
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 794,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "flex items-center gap-2 text-lg",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link2, { className: "h-5 w-5 text-emerald-600" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 905,
					columnNumber: 13
				}, this), " Validação do webhook"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 904,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Use a URL com `?secret=` no Chatwoot. O assistente é resolvido por Account ID + Inbox ID." }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 907,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 903,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-background to-background p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex flex-wrap items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
									className: "bg-emerald-600 text-white hover:bg-emerald-600",
									children: ["POST ", CHATWOOT_WEBHOOK_PATH]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 915,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex flex-wrap gap-2",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										variant: "outline",
										size: "sm",
										onClick: () => {
											const displayBaseUrl = publicInstructionBaseUrl || "https://SUA_URL_PUBLICA";
											copyToClipboard(webhookSecretWasGenerated && form.webhookSecret.trim() ? buildWebhookUrl(displayBaseUrl, form.webhookSecret.trim()) : buildPlaceholderWebhookUrl(displayBaseUrl), "URL do webhook");
										},
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Copy, { className: "h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 924,
												columnNumber: 19
											}, this),
											" ",
											webhookSecretWasGenerated && form.webhookSecret.trim() ? "Copiar URL com segredo" : "Copiar URL recomendada"
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 919,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 918,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 914,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-3 break-all rounded-lg bg-background/70 px-3 py-2 font-mono text-sm",
								children: webhookSecretWasGenerated && form.webhookSecret.trim() ? buildWebhookUrl(publicInstructionBaseUrl || "https://SUA_URL_PUBLICA", form.webhookSecret.trim()) : recommendedWebhookUrl
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 929,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: "Esta URL valida o segredo na query string. Se o segredo já estiver salvo, a interface mostra `SEU_SECRET_CONFIGURADO` para evitar expor o valor em claro."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 932,
								columnNumber: 13
							}, this),
							!hasPublicWebhookUrl ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900",
								children: [
									"Para testes reais com Chatwoot, use uma URL pública via ngrok/cloudflared. A URL local `",
									localWebhookUrl,
									"` serve apenas para replay local."
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 936,
								columnNumber: 37
							}, this) : null,
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: temporaryPublicApiUrl,
									onChange: (event) => setTemporaryPublicApiUrl(event.target.value),
									placeholder: "Cole aqui uma URL pública temporária, ex.: https://sua-url.ngrok-free.app"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 941,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "rounded-lg border bg-muted/30 px-3 py-2 text-sm",
									children: ["Header legado: ", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "font-mono",
										children: CHATWOOT_LEGACY_WEBHOOK_HEADER
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 943,
										columnNumber: 32
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 942,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 940,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 913,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("details", {
						className: "rounded-lg border bg-muted/20 px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("summary", {
							className: "cursor-pointer text-sm font-medium",
							children: "Como configurar no Chatwoot"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 949,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ol", {
							className: "mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Cadastre a inbox no Cubo." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 953,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Vincule um assistente responsável." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 954,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Gere ou informe um segredo de webhook." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 955,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Copie a URL recomendada com `?secret=...`." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 956,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "No CuboChat/Chatwoot, vá em Configurações > Integrações > Webhooks." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 957,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Crie o webhook com nome `Cubo AI Studio`, URL `POST /webhooks/chatwoot?secret=...` e evento `message_created`." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 958,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Salve a configuração." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 962,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Envie uma mensagem pelo WhatsApp de teste." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 963,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 952,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 948,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("details", {
						className: "rounded-lg border bg-muted/10 px-4 py-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("summary", {
								className: "cursor-pointer text-sm font-medium",
								children: "Endpoint legado/dev"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 968,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-3 break-all font-mono text-sm text-muted-foreground",
								children: ["POST ", CHATWOOT_LEGACY_WEBHOOK_PATH]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 969,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: [
									"Use apenas para compatibilidade ou testes internos. Em produção, use `",
									CHATWOOT_WEBHOOK_PATH,
									"`."
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 972,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 967,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 912,
				columnNumber: 9
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 902,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sheet, {
				open: isFormOpen,
				onOpenChange: (open) => open ? setIsFormOpen(true) : closeForm(),
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetContent, {
					className: "clean-scrollbar w-full overflow-y-auto sm:max-w-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetTitle, { children: isEditing ? "Editar configuração" : "Nova configuração" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 983,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetDescription, { children: isEditing ? "Token e segredo podem ficar em branco para manter os valores atuais." : "Vincule uma inbox real do Chatwoot a um assistente do Cubo." }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 984,
							columnNumber: 13
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 982,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "mt-6 space-y-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FormSection, {
									title: "Identificação",
									description: "Nome interno e URL da sua instância Chatwoot.",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Nome da configuração",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: form.name,
											onChange: (event) => setForm((current) => ({
												...current,
												name: event.target.value
											})),
											placeholder: "WhatsApp teste Delta"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 992,
											columnNumber: 17
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 991,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "URL base do Chatwoot",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: form.baseUrl,
											onChange: (event) => setForm((current) => ({
												...current,
												baseUrl: event.target.value
											})),
											placeholder: "https://app2.cubochat.com.br"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 998,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HelpText, { children: "Precisa começar com http:// ou https://. A barra final será removida ao salvar." }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1002,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 997,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 990,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FormSection, {
									title: "Dados da inbox",
									description: "IDs da conta e da inbox WhatsApp dentro do Chatwoot.",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "grid gap-4 md:grid-cols-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Account ID",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
												value: form.accountId,
												onChange: (event) => setForm((current) => ({
													...current,
													accountId: event.target.value
												})),
												placeholder: "3"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1011,
												columnNumber: 19
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HelpText, { children: "Você encontra no painel/admin do Chatwoot. Exemplo: Account #3." }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1015,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1010,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Inbox ID",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
												value: form.inboxId,
												onChange: (event) => setForm((current) => ({
													...current,
													inboxId: event.target.value
												})),
												placeholder: "523"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1020,
												columnNumber: 19
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HelpText, { children: "É o ID da inbox WhatsApp que será atendida por este agente." }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1024,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1019,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1009,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1008,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FormSection, {
									title: "Assistente",
									description: "Define qual agente responderá mensagens dessa inbox.",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Assistente responsável",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AssistantCombobox, {
												value: form.assistantId,
												onChange: (assistantId) => setForm((current) => ({
													...current,
													assistantId
												})),
												visibleAssistants: visibleAssistantOptions,
												hiddenAssistants: hiddenAssistantOptions,
												selectedAssistant,
												showHiddenAssistants,
												onShowHiddenAssistantsChange: setShowHiddenAssistants
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1031,
												columnNumber: 17
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HelpText, { children: "Quando chegar mensagem nessa inbox, este assistente será usado no runtime." }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1035,
												columnNumber: 17
											}, this),
											selectedAssistantIsHidden ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
												className: "text-xs text-amber-700",
												children: "O assistente selecionado está inativo ou é de teste/smoke. Para uma inbox ativa, selecione um assistente ativo."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1038,
												columnNumber: 46
											}, this) : null
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1030,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1029,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FormSection, {
									title: "Segurança",
									description: "Credenciais usadas para baixar anexos e enviar respostas.",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "API Access Token de User",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SecretTextInput, {
											value: form.apiAccessToken,
											onChange: (value) => setForm((current) => ({
												...current,
												apiAccessToken: value
											})),
											storedHint: storedTokenHint,
											placeholder: "Cole o token de usuário"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1047,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HelpText, { children: "Use um token de usuário com permissão para ler conversas, baixar anexos e enviar respostas nesta inbox. O Agent Bot é restrito e não deve ser o padrão." }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1051,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1046,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Segredo do webhook",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SecretTextInput, {
												value: form.webhookSecret,
												onChange: (value) => {
													setWebhookSecretWasGenerated(false);
													setForm((current) => ({
														...current,
														webhookSecret: value
													}));
												},
												storedHint: storedSecretHint,
												placeholder: "Cole ou gere um segredo"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1058,
												columnNumber: 19
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												type: "button",
												variant: "outline",
												onClick: generateSecret,
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(KeyRound, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1066,
													columnNumber: 21
												}, this), " Gerar segredo"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1065,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1057,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HelpText, { children: "Como o CuboChat não envia headers customizados, este segredo será validado na query string da URL do webhook." }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1069,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1056,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1045,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FormSection, {
									title: "Status",
									description: "Controle se esta inbox processa mensagens recebidas.",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center justify-between rounded-lg border px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "text-sm font-medium",
											children: form.isActive ? "Ativa" : "Inativa"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1079,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "text-xs text-muted-foreground",
											children: form.isActive ? "Mensagens dessa inbox serão processadas." : "Mensagens dessa inbox serão ignoradas."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1080,
											columnNumber: 19
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1078,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
											checked: form.isActive,
											onCheckedChange: (checked) => setForm((current) => ({
												...current,
												isActive: checked
											}))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1084,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1077,
										columnNumber: 15
									}, this), !form.isActive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-xs text-amber-700",
										children: "Inativa: o webhook resolve a inbox, mas não processa mensagens."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1089,
										columnNumber: 33
									}, this) : null]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1076,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("details", {
									className: "rounded-xl border bg-muted/10 px-4 py-3",
									open: showAdvanced,
									onToggle: (event) => setShowAdvanced(event.currentTarget.open),
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("summary", {
										className: "cursor-pointer text-sm font-medium",
										children: "Avançado"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1095,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "mt-4 space-y-4",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
												label: "Metadados JSON opcional",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
													rows: 6,
													value: form.metadataJsonText,
													onChange: (event) => setForm((current) => ({
														...current,
														metadataJsonText: event.target.value
													})),
													placeholder: "{\"ambiente\": \"homologacao\"}"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1098,
													columnNumber: 19
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HelpText, { children: "Opcional. Use apenas para metadados internos em JSON válido." }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1102,
													columnNumber: 19
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1097,
												columnNumber: 17
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "rounded-lg border bg-background px-3 py-2",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "text-xs uppercase tracking-wide text-muted-foreground",
														children: "Endpoint legado/dev"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1105,
														columnNumber: 19
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "mt-1 break-all font-mono text-sm text-muted-foreground",
														children: ["POST ", CHATWOOT_LEGACY_WEBHOOK_PATH]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1108,
														columnNumber: 19
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
														className: "mt-2 text-xs text-muted-foreground",
														children: [
															"Use apenas para compatibilidade ou testes internos. Em produção, use `",
															CHATWOOT_WEBHOOK_PATH,
															"`."
														]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1111,
														columnNumber: 19
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1104,
												columnNumber: 17
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "rounded-lg border bg-background px-3 py-2",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "text-xs uppercase tracking-wide text-muted-foreground",
														children: "Header legado/proxy"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1117,
														columnNumber: 19
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "mt-1 font-mono text-sm text-muted-foreground",
														children: CHATWOOT_LEGACY_WEBHOOK_HEADER
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1120,
														columnNumber: 19
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
														className: "mt-2 text-xs text-muted-foreground",
														children: "Mantenha apenas para compatibilidade com proxies ou integrações legadas. O fluxo principal usa `?secret=` na query string."
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1123,
														columnNumber: 19
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1116,
												columnNumber: 17
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1096,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1094,
									columnNumber: 13
								}, this),
								formError && /* @__PURE__ */ (void 0)("div", {
									className: "rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2 text-sm text-rose-800",
									children: /* @__PURE__ */ (void 0)("div", {
										className: "flex items-start gap-2",
										children: [/* @__PURE__ */ (void 0)(TriangleAlert, { className: "mt-0.5 h-4 w-4 shrink-0" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1133,
											columnNumber: 19
										}, this), /* @__PURE__ */ (void 0)("div", { children: formError }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1134,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1132,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1131,
									columnNumber: 27
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SecurityNotice, { children: "Se você editar uma configuração e deixar token ou segredo em branco, os valores antigos serão mantidos. Nada sensível salvo é mostrado em claro na interface." }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1138,
									columnNumber: 13
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 989,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetFooter, {
							className: "mt-6",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								onClick: closeForm,
								children: "Cancelar"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1145,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								onClick: () => void submit(),
								disabled: saving,
								children: saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 animate-spin" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1150,
									columnNumber: 19
								}, this), " Salvando…"] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1149,
									columnNumber: 25
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShieldCheck, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1152,
										columnNumber: 19
									}, this),
									" ",
									isEditing ? "Salvar alterações" : "Salvar configuração"
								] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1151,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1148,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1144,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 981,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 980,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 778,
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
function MetricCard({ label, value, tone = "default" }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
		className: tone === "warning" ? "border-amber-200 bg-amber-50/50" : void 0,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-4",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-xs uppercase tracking-wide text-muted-foreground",
				children: label
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1194,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "mt-1 text-2xl font-semibold",
				children: value
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1195,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1193,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1192,
		columnNumber: 10
	}, this);
}
function FormSection({ title, description, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", {
		className: "space-y-3 rounded-xl border bg-card/70 p-4",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
			className: "text-sm font-semibold",
			children: title
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1210,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "text-xs text-muted-foreground",
			children: description
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1211,
			columnNumber: 9
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1209,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "space-y-4",
			children
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1213,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1208,
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
			lineNumber: 1224,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1223,
		columnNumber: 10
	}, this);
}
function HelpText({ children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
		className: "text-xs text-muted-foreground",
		children
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1233,
		columnNumber: 10
	}, this);
}
function SecretTextInput({ value, onChange, storedHint, placeholder }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "relative",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
			type: "password",
			value,
			onChange: (event) => onChange(event.target.value),
			placeholder: storedHint ? `${storedHint} — deixe em branco para manter` : placeholder,
			autoComplete: "new-password",
			spellCheck: false,
			className: "pr-10"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1247,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShieldCheck, {
			className: "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600",
			"aria-label": "Será enviada com segurança ao servidor"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1248,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1246,
		columnNumber: 10
	}, this);
}
function AssistantCombobox({ value, onChange, visibleAssistants, hiddenAssistants, selectedAssistant, showHiddenAssistants, onShowHiddenAssistantsChange }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const selectedLabel = selectedAssistant ? isSmokeAssistant(selectedAssistant) ? "Assistente de teste oculto" : selectedAssistant.name : "Busque ou selecione um assistente";
	const duplicateNames = (0, import_react.useMemo)(() => {
		const counts = /* @__PURE__ */ new Map();
		[...visibleAssistants, ...hiddenAssistants].forEach((assistant) => {
			counts.set(assistant.name, (counts.get(assistant.name) ?? 0) + 1);
		});
		return counts;
	}, [hiddenAssistants, visibleAssistants]);
	const renderAssistantItem = (assistant) => {
		const showShortId = (duplicateNames.get(assistant.name) ?? 0) > 1;
		return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CommandItem, {
			value: `${assistant.name} ${assistant.id}`,
			onSelect: () => {
				onChange(assistant.id);
				setOpen(false);
			},
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Check, { className: value === assistant.id ? "opacity-100" : "opacity-0" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1283,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex min-w-0 flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "truncate",
						children: assistant.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1286,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AssistantStatusBadge, {
						status: assistant.status,
						smoke: false
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1287,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1285,
					columnNumber: 11
				}, this), showShortId ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "text-xs text-muted-foreground",
					children: ["ID ", assistantShortId(assistant.id)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1289,
					columnNumber: 26
				}, this) : null]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1284,
				columnNumber: 9
			}, this)]
		}, assistant.id, true, {
			fileName: _jsxFileName,
			lineNumber: 1279,
			columnNumber: 12
		}, this);
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Popover, {
			open,
			onOpenChange: setOpen,
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PopoverTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					type: "button",
					variant: "outline",
					role: "combobox",
					"aria-expanded": open,
					className: "w-full justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "min-w-0 truncate",
						children: selectedLabel
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1297,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1298,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1296,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1295,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PopoverContent, {
				className: "w-[--radix-popover-trigger-width] p-0",
				align: "start",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Command$1, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CommandInput, { placeholder: "Busque ou selecione um assistente" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1303,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CommandList, { children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CommandEmpty, { children: "Nenhum assistente encontrado." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1305,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CommandGroup, {
						heading: "Assistentes ativos",
						children: visibleAssistants.length > 0 ? visibleAssistants.map(renderAssistantItem) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "px-2 py-3 text-sm text-muted-foreground",
							children: "Nenhum assistente ativo disponível."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1307,
							columnNumber: 94
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1306,
						columnNumber: 15
					}, this),
					showHiddenAssistants ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CommandSeparator, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1312,
						columnNumber: 19
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CommandGroup, {
						heading: "Assistentes inativos",
						children: hiddenAssistants.map(renderAssistantItem)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1313,
						columnNumber: 19
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1311,
						columnNumber: 39
					}, this) : null
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1304,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1302,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1301,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1294,
			columnNumber: 7
		}, this), hiddenAssistants.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
			type: "button",
			size: "sm",
			variant: "ghost",
			className: "h-auto px-0 text-xs text-muted-foreground",
			onClick: () => onShowHiddenAssistantsChange(!showHiddenAssistants),
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Settings2, { className: "h-3.5 w-3.5" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1323,
				columnNumber: 11
			}, this), showHiddenAssistants ? "Ocultar assistentes inativos" : "Mostrar assistentes inativos"]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1322,
			columnNumber: 38
		}, this) : null]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1293,
		columnNumber: 10
	}, this);
}
function AssistantStatusBadge({ status, smoke }) {
	if (smoke) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "outline",
		className: "border-slate-200 text-slate-600",
		children: "Teste/Smoke"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1336,
		columnNumber: 12
	}, this);
	if (status === "ACTIVE") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "outline",
		className: "border-emerald-200 text-emerald-700",
		children: "Ativo"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1341,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "outline",
		className: "border-amber-200 text-amber-700",
		children: "Inativo"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1345,
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
			lineNumber: 1357,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "text-sm font-medium",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1358,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1356,
		columnNumber: 10
	}, this);
}
//#endregion
export { ConfigPage as component };
