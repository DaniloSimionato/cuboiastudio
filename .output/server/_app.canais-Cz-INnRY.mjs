import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-Dc1_O9TA.mjs";
import { Bt as CircleCheck, Ft as LoaderCircle, M as Plus, Mt as TestTubeDiagonal, O as RefreshCw, P as Pencil, ct as Clock3, f as Trash2, jt as TriangleAlert, k as Radio, lt as Clipboard, r as Webhook, ut as Circle } from "./_libs/lucide-react.mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { t as backendAssistantsService } from "./_ssr/backendAssistantsService-C9NI7_6k.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./_ssr/dialog-BQR4UioY.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { t as chatwootSettingsService } from "./_ssr/chatwootSettingsService-o2miYVcI.mjs";
import { n as SecurityNotice, t as MaskedSecretInput } from "./_ssr/SecurityNotice-B3WDgNBX.mjs";
import { a as SheetHeader, i as SheetFooter, n as SheetContent, o as SheetTitle, r as SheetDescription, t as Sheet } from "./_ssr/sheet-C9KaKAS6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.canais-Cz-INnRY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
function isResponseAfterWebhook(channel) {
	if (!channel.lastWebhookAt || !channel.lastResponseAt) return false;
	return new Date(channel.lastResponseAt).getTime() >= new Date(channel.lastWebhookAt).getTime();
}
function getChannelChecklist(channel) {
	return [
		{
			label: "Configuração salva",
			complete: true
		},
		{
			label: "Token de API validado",
			complete: channel.apiAccessTokenConfigured && channel.lastApiTestOk === true
		},
		{
			label: "Assistente vinculado",
			complete: Boolean(channel.assistantId && channel.assistantStatus === "ACTIVE")
		},
		{
			label: "Webhook cadastrado no Cubo.Chat",
			complete: Boolean(channel.lastWebhookAt)
		},
		{
			label: "Último webhook recebido",
			complete: Boolean(channel.lastWebhookAt)
		},
		{
			label: "Última resposta enviada",
			complete: isResponseAfterWebhook(channel)
		}
	];
}
function getWebhookDiagnosticSummary(channel) {
	if (!channel.lastWebhookAt) return {
		tone: "neutral",
		title: "Último webhook recebido: nunca",
		detail: "O Studio ainda não recebeu eventos deste account/inbox."
	};
	const event = channel.lastWebhookEvent?.trim().toLowerCase() ?? "";
	if (event === "test") return {
		tone: "warning",
		title: "Webhook de teste recebido",
		detail: "Recebido evento de teste, mas não é mensagem de cliente."
	};
	if (channel.lastWebhookIgnoredReason) return {
		tone: "warning",
		title: "Webhook recebido e ignorado",
		detail: channel.lastWebhookIgnoredReason
	};
	if (event === "message_created" && isResponseAfterWebhook(channel)) return {
		tone: "success",
		title: "Entrada e saída OK",
		detail: "O Studio recebeu a mensagem e enviou uma resposta."
	};
	return {
		tone: "success",
		title: "Webhook recebido",
		detail: event === "message_created" ? "Mensagem recebida e encaminhada para processamento." : `Evento recebido: ${channel.lastWebhookEvent ?? "desconhecido"}.`
	};
}
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.canais.tsx?tsr-split=component";
var DEFAULT_FORM = {
	name: "",
	baseUrl: "",
	accountId: "",
	inboxId: "",
	assistantId: "",
	apiAccessToken: "",
	webhookSecret: "",
	isActive: true,
	notes: "",
	channelType: "CHATWOOT"
};
function CanaisPage() {
	const [company, setCompany] = (0, import_react.useState)(null);
	const [assistants, setAssistants] = (0, import_react.useState)([]);
	const [channels, setChannels] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const [sheetOpen, setSheetOpen] = (0, import_react.useState)(false);
	const [editingChannel, setEditingChannel] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(DEFAULT_FORM);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [testingId, setTestingId] = (0, import_react.useState)(null);
	const [deletingId, setDeletingId] = (0, import_react.useState)(null);
	const [testResults, setTestResults] = (0, import_react.useState)({});
	const [receiveTest, setReceiveTest] = (0, import_react.useState)(null);
	const activeAssistants = (0, import_react.useMemo)(() => assistants.filter((assistant) => assistant.status === "ACTIVE"), [assistants]);
	const load = async () => {
		setLoading(true);
		setError(null);
		try {
			const [companyResponse, assistantItems, configItems] = await Promise.all([
				currentCompanyService.get(),
				backendAssistantsService.list(),
				chatwootSettingsService.list()
			]);
			setCompany(companyResponse.company);
			setAssistants(assistantItems);
			setChannels(configItems);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Não foi possível carregar os canais.");
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	(0, import_react.useEffect)(() => {
		if (!receiveTest || receiveTest.status !== "waiting") return;
		let disposed = false;
		let polling = false;
		const updateCountdown = () => {
			const remainingSeconds = Math.max(0, Math.ceil((receiveTest.deadline - Date.now()) / 1e3));
			setReceiveTest((current) => current?.status === "waiting" ? {
				...current,
				remainingSeconds
			} : current);
			if (remainingSeconds === 0) setReceiveTest((current) => current?.status === "waiting" ? {
				...current,
				status: "timeout"
			} : current);
		};
		const poll = async () => {
			if (polling || disposed) return;
			polling = true;
			try {
				const latest = await chatwootSettingsService.get(receiveTest.channel.id);
				const receivedAt = latest.lastWebhookAt ? new Date(latest.lastWebhookAt).getTime() : 0;
				const matchesChannel = latest.lastWebhookAccountId === latest.accountId && latest.lastWebhookInboxId === latest.inboxId;
				if (receivedAt > receiveTest.baselineWebhookAt && matchesChannel && !disposed) {
					setChannels((current) => current.map((channel) => channel.id === latest.id ? latest : channel));
					setReceiveTest((current) => current ? {
						...current,
						channel: latest,
						status: "success"
					} : current);
				}
			} catch {} finally {
				polling = false;
			}
		};
		updateCountdown();
		poll();
		const countdownTimer = window.setInterval(updateCountdown, 1e3);
		const pollTimer = window.setInterval(() => void poll(), 2e3);
		return () => {
			disposed = true;
			window.clearInterval(countdownTimer);
			window.clearInterval(pollTimer);
		};
	}, [
		receiveTest?.channel.id,
		receiveTest?.deadline,
		receiveTest?.status
	]);
	const openCreate = () => {
		setEditingChannel(null);
		setForm(DEFAULT_FORM);
		setSheetOpen(true);
	};
	const openEdit = (channel) => {
		setEditingChannel(channel);
		const metadata = channel.metadataJson;
		const channelType = metadata?.channelType || "CHATWOOT";
		setForm({
			name: channel.name,
			baseUrl: channel.baseUrl,
			accountId: channel.accountId,
			inboxId: channel.inboxId,
			assistantId: channel.assistantId ?? "",
			apiAccessToken: "",
			webhookSecret: "",
			isActive: channel.isActive,
			notes: typeof metadata?.notes === "string" ? metadata.notes : "",
			channelType
		});
		setSheetOpen(true);
	};
	const submit = async () => {
		if (!form.name.trim() || !form.baseUrl.trim() || !form.accountId.trim() || !form.inboxId.trim()) {
			toast.error("Preencha nome, URL base, accountId e inboxId.");
			return;
		}
		const metadataJson = {
			channelType: form.channelType,
			...form.notes.trim() ? { notes: form.notes.trim() } : {}
		};
		setSaving(true);
		try {
			const payload = {
				name: form.name.trim(),
				baseUrl: form.baseUrl.trim().replace(/\/+$/, ""),
				accountId: form.accountId.trim(),
				inboxId: form.inboxId.trim(),
				assistantId: form.assistantId,
				...form.apiAccessToken.trim() ? { apiAccessToken: form.apiAccessToken.trim() } : {},
				...form.webhookSecret.trim() ? { webhookSecret: form.webhookSecret.trim() } : {},
				isActive: form.isActive,
				metadataJson
			};
			if (editingChannel) {
				await chatwootSettingsService.update(editingChannel.id, payload);
				toast.success("Canal atualizado.");
			} else {
				await chatwootSettingsService.create(payload);
				toast.success("Canal criado.");
			}
			setSheetOpen(false);
			setForm(DEFAULT_FORM);
			setEditingChannel(null);
			await load();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível salvar o canal.");
		} finally {
			setSaving(false);
		}
	};
	const toggleChannel = async (channel) => {
		try {
			await chatwootSettingsService.update(channel.id, {
				name: channel.name,
				baseUrl: channel.baseUrl,
				accountId: channel.accountId,
				inboxId: channel.inboxId,
				assistantId: channel.assistantId ?? "",
				isActive: !channel.isActive,
				...channel.metadataJson ? { metadataJson: channel.metadataJson } : {}
			});
			await load();
			toast.success(channel.isActive ? "Canal pausado." : "Canal ativado.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o canal.");
		}
	};
	const testChannel = async (channel) => {
		setTestingId(channel.id);
		try {
			const result = await chatwootSettingsService.test(channel.id);
			setTestResults((current) => ({
				...current,
				[channel.id]: result
			}));
			toast.success(result.ok ? result.message : result.reason ?? result.message);
			await load();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível testar o canal.");
		} finally {
			setTestingId(null);
		}
	};
	const removeChannel = async (channel) => {
		if (!window.confirm(`Remover o canal "${channel.name}"?`)) return;
		setDeletingId(channel.id);
		try {
			await chatwootSettingsService.remove(channel.id);
			setTestResults((current) => {
				const clone = { ...current };
				delete clone[channel.id];
				return clone;
			});
			await load();
			toast.success("Canal removido.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível remover o canal.");
		} finally {
			setDeletingId(null);
		}
	};
	const webhookExample = "https://api-stage.cubochat.com.br/webhooks/chatwoot";
	const copyWebhook = async () => {
		try {
			await navigator.clipboard.writeText(webhookExample);
			toast.success("URL do webhook copiada.");
		} catch {
			toast.error("Não foi possível copiar automaticamente.");
		}
	};
	const startReceiveTest = (channel) => {
		setReceiveTest({
			channel,
			baselineWebhookAt: channel.lastWebhookAt ? new Date(channel.lastWebhookAt).getTime() : 0,
			deadline: Date.now() + 6e4,
			remainingSeconds: 60,
			status: "waiting"
		});
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				title: "Canais",
				description: `Canais e inboxes da empresa ${company?.name ?? "ativa"}. Aqui fica o cadastro operacional do Chatwoot e a publicação dos assistentes.`
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 278,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid gap-4 md:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
						label: "Canais cadastrados",
						value: String(channels.length)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 281,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
						label: "Canais ativos",
						value: String(channels.filter((item) => item.isActive).length)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 282,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
						label: "Com assistente vinculado",
						value: String(channels.filter((item) => item.assistantId).length)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 283,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 280,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
				className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, { children: "Chatwoot / WhatsApp" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 289,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Cada inbox pertence a esta empresa e pode ter no máximo um assistente ativo vinculado." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 290,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 288,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: openCreate,
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 295,
						columnNumber: 13
					}, this), "Novo canal"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 294,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 287,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SecurityNotice, { children: "Tokens e secrets continuam somente no backend. O Studio salva apenas o estado seguro da integração." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 300,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl border bg-muted/20 p-4 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "font-medium",
							children: "URL do Webhook para cadastrar no Cubo.Chat"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 305,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "mt-2 flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								readOnly: true,
								value: webhookExample,
								className: "font-mono text-xs"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 307,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								size: "icon",
								onClick: () => void copyWebhook(),
								title: "Copiar URL",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Clipboard, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 309,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 308,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 306,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 304,
						columnNumber: 11
					}, this),
					loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid place-items-center py-16 text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-5 w-5 animate-spin" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 315,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 314,
						columnNumber: 22
					}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive",
						children: error
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 316,
						columnNumber: 30
					}, this) : channels.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground",
						children: "Nenhum canal configurado ainda. Cadastre uma inbox para publicar um assistente depois."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 318,
						columnNumber: 46
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid gap-4 lg:grid-cols-2",
						children: channels.map((channel) => {
							const testResult = testResults[channel.id];
							const diagnostic = getWebhookDiagnosticSummary(channel);
							const checklist = getChannelChecklist(channel);
							return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("article", {
								className: "rounded-2xl border p-5 space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-start justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Radio, { className: "h-4 w-4 text-muted-foreground" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 329,
													columnNumber: 27
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
													className: "truncate font-medium",
													children: channel.name
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 330,
													columnNumber: 27
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 328,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
												className: "mt-1 text-xs text-muted-foreground",
												children: channel.metadataJson?.["channelType"] === "WHATSAPP" ? "WhatsApp" : "Chatwoot"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 332,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 327,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: channel.isActive ? "ativo" : "pausado" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 336,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 326,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "grid gap-2 text-sm",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
												label: "Account ID",
												value: channel.accountId
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 340,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
												label: "Inbox ID",
												value: channel.inboxId
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 341,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
												label: "Assistente",
												value: channel.assistantName ?? "Nao vinculado"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 342,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
												label: "Credenciais",
												value: channel.apiAccessTokenConfigured || channel.webhookSecretConfigured ? "Configuradas" : "Pendentes"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 343,
												columnNumber: 23
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 339,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "rounded-xl border bg-muted/20 p-3",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
											children: "Checklist da conexão"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 347,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "grid gap-2 sm:grid-cols-2",
											children: checklist.map((item) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "flex items-center gap-2 text-xs",
												children: [item.complete ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleCheck, { className: "h-3.5 w-3.5 text-emerald-600" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 352,
													columnNumber: 46
												}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Circle, { className: "h-3.5 w-3.5 text-muted-foreground/60" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 352,
													columnNumber: 106
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
													className: item.complete ? "text-foreground" : "text-muted-foreground",
													children: item.label
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 353,
													columnNumber: 29
												}, this)]
											}, item.label, true, {
												fileName: _jsxFileName,
												lineNumber: 351,
												columnNumber: 48
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 350,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 346,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: `rounded-xl border p-3 text-xs ${diagnostic.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : diagnostic.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "bg-muted/20 text-muted-foreground"}`,
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "font-medium",
												children: diagnostic.title
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 361,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "mt-1",
												children: diagnostic.detail
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 362,
												columnNumber: 23
											}, this),
											channel.lastWebhookAt ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "mt-2 opacity-75",
												children: [new Date(channel.lastWebhookAt).toLocaleString("pt-BR"), channel.lastWebhookRequestId ? ` · Request ${channel.lastWebhookRequestId}` : ""]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 363,
												columnNumber: 48
											}, this) : null
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 360,
										columnNumber: 21
									}, this),
									testResult ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: `rounded-xl border p-3 text-xs ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`,
										children: [
											testResult.ok ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleCheck, { className: "mb-2 h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 370,
												columnNumber: 42
											}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TriangleAlert, { className: "mb-2 h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 370,
												columnNumber: 86
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: testResult.message }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 371,
												columnNumber: 25
											}, this),
											testResult.reason ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "mt-1 opacity-80",
												children: testResult.reason
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 372,
												columnNumber: 46
											}, this) : null
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 369,
										columnNumber: 35
									}, this) : null,
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex flex-wrap gap-2 pt-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												variant: "outline",
												size: "sm",
												onClick: () => openEdit(channel),
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 377,
													columnNumber: 25
												}, this), "Editar"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 376,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												variant: "outline",
												size: "sm",
												onClick: () => void toggleChannel(channel),
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 381,
													columnNumber: 25
												}, this), channel.isActive ? "Pausar" : "Ativar"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 380,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												variant: "outline",
												size: "sm",
												onClick: () => void testChannel(channel),
												disabled: testingId === channel.id,
												children: [testingId === channel.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 385,
													columnNumber: 53
												}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TestTubeDiagonal, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 385,
													columnNumber: 100
												}, this), "Testar envio para Cubo.Chat"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 384,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												variant: "outline",
												size: "sm",
												onClick: () => startReceiveTest(channel),
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Webhook, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 389,
													columnNumber: 25
												}, this), "Testar recebimento do Webhook"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 388,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												variant: "destructive",
												size: "sm",
												onClick: () => void removeChannel(channel),
												disabled: deletingId === channel.id,
												children: [deletingId === channel.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 393,
													columnNumber: 54
												}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 393,
													columnNumber: 101
												}, this), "Remover"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 392,
												columnNumber: 23
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 375,
										columnNumber: 21
									}, this)
								]
							}, channel.id, true, {
								fileName: _jsxFileName,
								lineNumber: 325,
								columnNumber: 20
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 320,
						columnNumber: 22
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 299,
				columnNumber: 9
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 286,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, { children: "Proxima etapa" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 405,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Depois de criar o canal, abra um assistente para definir a publicacao por inbox." }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 406,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 404,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "text-sm text-muted-foreground",
				children: [
					"O vínculo também pode ser revisto na aba ",
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Publicação" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 411,
						columnNumber: 52
					}, this),
					" do assistente em",
					" ",
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
						to: "/agentes/novo",
						className: "font-medium text-primary underline-offset-4 hover:underline",
						children: "Assistentes IA"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 412,
						columnNumber: 11
					}, this),
					"."
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 410,
				columnNumber: 9
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 403,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sheet, {
				open: sheetOpen,
				onOpenChange: setSheetOpen,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetContent, {
					className: "sm:max-w-xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetTitle, { children: editingChannel ? "Editar canal" : "Novo canal" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 421,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetDescription, { children: "Cadastre os dados operacionais da inbox. O vínculo do assistente pode ser feito aqui ou na aba de publicação do assistente." }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 422,
							columnNumber: 13
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 420,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "mt-6 space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Nome amigavel",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: form.name,
										onChange: (event) => setForm((current) => ({
											...current,
											name: event.target.value
										})),
										placeholder: "WhatsApp Comercial"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 429,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 428,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Tipo de canal",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										value: form.channelType,
										onValueChange: (value) => setForm((current) => ({
											...current,
											channelType: value
										})),
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione o tipo" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 440,
											columnNumber: 19
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 439,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: "CHATWOOT",
											children: "Chatwoot"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 443,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: "WHATSAPP",
											children: "WhatsApp"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 444,
											columnNumber: 19
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 442,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 435,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 434,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "URL base do Chatwoot",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: form.baseUrl,
										onChange: (event) => setForm((current) => ({
											...current,
											baseUrl: event.target.value
										})),
										placeholder: "https://chatwoot.seudominio.com"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 449,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 448,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "grid gap-4 md:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Account ID",
										help: "Identificador numérico da conta no Cubo.Chat.",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: form.accountId,
											onChange: (event) => setForm((current) => ({
												...current,
												accountId: event.target.value
											})),
											placeholder: "3"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 456,
											columnNumber: 17
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 455,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Inbox ID",
										help: "Identificador da caixa de entrada que recebe este WhatsApp.",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: form.inboxId,
											onChange: (event) => setForm((current) => ({
												...current,
												inboxId: event.target.value
											})),
											placeholder: "17"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 462,
											columnNumber: 17
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 461,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 454,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Assistente vinculado",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										value: form.assistantId || "__none__",
										onValueChange: (value) => setForm((current) => ({
											...current,
											assistantId: value === "__none__" ? "" : value
										})),
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione um assistente" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 474,
											columnNumber: 19
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 473,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: "__none__",
											children: "Nenhum assistente"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 477,
											columnNumber: 19
										}, this), activeAssistants.map((assistant) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: assistant.id,
											children: assistant.name
										}, assistant.id, false, {
											fileName: _jsxFileName,
											lineNumber: 478,
											columnNumber: 54
										}, this))] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 476,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 469,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 468,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Token de API do Cubo.Chat para enviar respostas",
									help: "Usado pelo Studio para responder mensagens no Cubo.Chat. Não é o webhook.",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MaskedSecretInput, {
										value: form.apiAccessToken,
										onChange: (event) => setForm((current) => ({
											...current,
											apiAccessToken: event.target.value
										})),
										placeholder: editingChannel?.apiAccessTokenConfigured ? "Ja configurado no backend" : "Cole aqui apenas se for atualizar"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 485,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 484,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Webhook secret / assinatura (opcional)",
									help: "Preencha somente se o Cubo.Chat estiver configurado para assinar webhooks. Se não houver assinatura no Cubo.Chat, deixe vazio.",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MaskedSecretInput, {
										value: form.webhookSecret,
										onChange: (event) => setForm((current) => ({
											...current,
											webhookSecret: event.target.value
										})),
										placeholder: editingChannel?.webhookSecretConfigured ? "Ja configurado no backend" : "Cole aqui apenas se for atualizar"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 491,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 490,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "URL do Webhook para cadastrar no Cubo.Chat",
									help: "No Cubo.Chat, marque o evento Mensagem criada (message_created).",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											readOnly: true,
											value: webhookExample,
											className: "font-mono text-xs"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 498,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
											variant: "outline",
											size: "icon",
											onClick: () => void copyWebhook(),
											title: "Copiar URL",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Clipboard, { className: "h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 500,
												columnNumber: 19
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 499,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 497,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 496,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Observações (opcional)",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
										rows: 3,
										value: form.notes,
										onChange: (event) => setForm((current) => ({
											...current,
											notes: event.target.value
										})),
										placeholder: "Contexto operacional deste canal."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 505,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 504,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex items-center justify-between rounded-lg border px-3 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "text-sm font-medium",
										children: "Canal ativo"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 512,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "text-xs text-muted-foreground",
										children: "Quando desativado, o runtime não responde este inbox."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 513,
										columnNumber: 17
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 511,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
										checked: form.isActive,
										onCheckedChange: (checked) => setForm((current) => ({
											...current,
											isActive: checked
										}))
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 515,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 510,
									columnNumber: 13
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 427,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetFooter, {
							className: "mt-6",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								onClick: () => setSheetOpen(false),
								children: "Cancelar"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 523,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								onClick: () => void submit(),
								disabled: saving,
								children: saving ? "Salvando..." : editingChannel ? "Salvar alteracoes" : "Criar canal"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 526,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 522,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 419,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 418,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
				open: Boolean(receiveTest),
				onOpenChange: (open) => !open && setReceiveTest(null),
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, { children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: "Testar recebimento do Webhook" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 536,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, { children: [
						"Canal ",
						receiveTest?.channel.name,
						" · Account ",
						receiveTest?.channel.accountId,
						" · Inbox",
						" ",
						receiveTest?.channel.inboxId
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 537,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 535,
						columnNumber: 11
					}, this),
					receiveTest?.status === "waiting" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Clock3, { className: "mx-auto h-7 w-7 animate-pulse text-blue-600" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 544,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-3 font-medium text-blue-950",
								children: "Agora envie uma mensagem pelo WhatsApp para este inbox."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 545,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-2 text-sm text-blue-700",
								children: [
									"Aguardando webhook real por ",
									receiveTest.remainingSeconds,
									"s."
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 548,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 543,
						columnNumber: 48
					}, this) : receiveTest?.status === "success" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleCheck, { className: "mx-auto h-8 w-8 text-emerald-600" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 552,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-3 font-medium text-emerald-950",
								children: "Webhook recebido pelo Studio."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 553,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-2 text-sm text-emerald-700",
								children: getWebhookDiagnosticSummary(receiveTest.channel).detail
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 554,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 551,
						columnNumber: 58
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl border border-amber-200 bg-amber-50 p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TriangleAlert, { className: "h-6 w-6 text-amber-600" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 558,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-3 font-medium text-amber-950",
								children: "Nenhum webhook chegou ao Studio."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 559,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mt-2 text-sm text-amber-800",
								children: "Verifique se o webhook está cadastrado no Cubo.Chat, se o evento Mensagem criada/message_created está marcado e se está na conta/inbox corretos."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 560,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 557,
						columnNumber: 22
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						variant: "outline",
						onClick: () => setReceiveTest(null),
						children: "Fechar"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 567,
						columnNumber: 13
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 566,
						columnNumber: 11
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 534,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 533,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 277,
		columnNumber: 10
	}, this);
}
function MetricCard({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 584,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mt-2 text-2xl font-semibold",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 585,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 583,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 582,
		columnNumber: 10
	}, this);
}
function SummaryRow({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex items-center justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-muted-foreground",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 597,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-right font-medium",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 598,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 596,
		columnNumber: 10
	}, this);
}
function Field({ label, help, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, { children: label }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 611,
				columnNumber: 7
			}, this),
			children,
			help ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-xs leading-relaxed text-muted-foreground",
				children: help
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 613,
				columnNumber: 15
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 610,
		columnNumber: 10
	}, this);
}
//#endregion
export { CanaisPage as component };
