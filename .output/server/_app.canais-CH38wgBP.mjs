import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-CeW1PXo7.mjs";
import { D as RefreshCw, It as CircleCheck, Mt as LoaderCircle, N as Pencil, O as Radio, Ot as TriangleAlert, f as Trash2, j as Plus, kt as TestTubeDiagonal } from "./_libs/lucide-react.mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as StatusBadge } from "./_ssr/StatusBadge-CjcQaBDS.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { t as backendAssistantsService } from "./_ssr/backendAssistantsService-ClhibY7I.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { t as chatwootSettingsService } from "./_ssr/chatwootSettingsService-DbugyFLD.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as SecurityNotice } from "./_ssr/SecurityNotice-DyLr6C9z.mjs";
import { a as SheetHeader, i as SheetFooter, n as SheetContent, o as SheetTitle, r as SheetDescription, t as Sheet } from "./_ssr/sheet-C9KaKAS6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.canais-CH38wgBP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
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
	metadataJsonText: ""
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
	const openCreate = () => {
		setEditingChannel(null);
		setForm(DEFAULT_FORM);
		setSheetOpen(true);
	};
	const openEdit = (channel) => {
		setEditingChannel(channel);
		setForm({
			name: channel.name,
			baseUrl: channel.baseUrl,
			accountId: channel.accountId,
			inboxId: channel.inboxId,
			assistantId: channel.assistantId ?? "",
			apiAccessToken: "",
			webhookSecret: "",
			isActive: channel.isActive,
			metadataJsonText: channel.metadataJson ? JSON.stringify(channel.metadataJson, null, 2) : ""
		});
		setSheetOpen(true);
	};
	const submit = async () => {
		if (!form.name.trim() || !form.baseUrl.trim() || !form.accountId.trim() || !form.inboxId.trim()) {
			toast.error("Preencha nome, URL base, accountId e inboxId.");
			return;
		}
		let metadataJson;
		const trimmedMetadata = form.metadataJsonText.trim();
		if (trimmedMetadata) try {
			const parsed = JSON.parse(trimmedMetadata);
			if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
			metadataJson = parsed;
		} catch {
			toast.error("O metadata precisa ser um objeto JSON válido.");
			return;
		}
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
				...metadataJson ? { metadataJson } : {}
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
	const webhookExample = (0, import_react.useMemo)(() => {
		return `${(typeof window !== "undefined" ? window.location.origin : "https://studio-stage.cubochat.com.br").replace(/\/$/, "")}/api/webhooks/chatwoot?secret=SEU_SECRET`;
	}, []);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				title: "Canais",
				description: `Canais e inboxes da empresa ${company?.name ?? "ativa"}. Aqui fica o cadastro operacional do Chatwoot e a publicação dos assistentes.`
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 206,
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
						lineNumber: 209,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
						label: "Canais ativos",
						value: String(channels.filter((item) => item.isActive).length)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 210,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
						label: "Com assistente vinculado",
						value: String(channels.filter((item) => item.assistantId).length)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 211,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 208,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
				className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, { children: "Chatwoot / WhatsApp" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 217,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Cada inbox pertence a esta empresa e pode ter no máximo um assistente ativo vinculado." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 218,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 216,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: openCreate,
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 223,
						columnNumber: 13
					}, this), "Novo canal"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 222,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 215,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SecurityNotice, { children: "Tokens e secrets continuam somente no backend. O Studio salva apenas o estado seguro da integração." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 228,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl border bg-muted/20 p-4 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "font-medium",
							children: "Webhook recomendado"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 233,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "mt-1 break-all font-mono text-xs text-muted-foreground",
							children: webhookExample
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 234,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 232,
						columnNumber: 11
					}, this),
					loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid place-items-center py-16 text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-5 w-5 animate-spin" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 238,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 237,
						columnNumber: 22
					}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive",
						children: error
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 239,
						columnNumber: 30
					}, this) : channels.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground",
						children: "Nenhum canal configurado ainda. Cadastre uma inbox para publicar um assistente depois."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 241,
						columnNumber: 46
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid gap-4 lg:grid-cols-2",
						children: channels.map((channel) => {
							const testResult = testResults[channel.id];
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
													lineNumber: 250,
													columnNumber: 27
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
													className: "truncate font-medium",
													children: channel.name
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 251,
													columnNumber: 27
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 249,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
												className: "mt-1 text-xs text-muted-foreground",
												children: "Chatwoot / WhatsApp"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 253,
												columnNumber: 25
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 248,
											columnNumber: 23
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: channel.isActive ? "ativo" : "pausado" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 257,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 247,
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
												lineNumber: 261,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
												label: "Inbox ID",
												value: channel.inboxId
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 262,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
												label: "Assistente",
												value: channel.assistantName ?? "Nao vinculado"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 263,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
												label: "Credenciais",
												value: channel.apiAccessTokenConfigured || channel.webhookSecretConfigured ? "Configuradas" : "Pendentes"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 264,
												columnNumber: 23
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 260,
										columnNumber: 21
									}, this),
									testResult ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: `rounded-xl border p-3 text-xs ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`,
										children: [
											testResult.ok ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleCheck, { className: "mb-2 h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 268,
												columnNumber: 42
											}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TriangleAlert, { className: "mb-2 h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 268,
												columnNumber: 86
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: testResult.message }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 269,
												columnNumber: 25
											}, this),
											testResult.reason ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "mt-1 opacity-80",
												children: testResult.reason
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 270,
												columnNumber: 46
											}, this) : null
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 267,
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
													lineNumber: 275,
													columnNumber: 25
												}, this), "Editar"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 274,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												variant: "outline",
												size: "sm",
												onClick: () => void toggleChannel(channel),
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 279,
													columnNumber: 25
												}, this), channel.isActive ? "Pausar" : "Ativar"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 278,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												variant: "outline",
												size: "sm",
												onClick: () => void testChannel(channel),
												disabled: testingId === channel.id,
												children: [testingId === channel.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 283,
													columnNumber: 53
												}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TestTubeDiagonal, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 283,
													columnNumber: 100
												}, this), "Testar"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 282,
												columnNumber: 23
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												variant: "destructive",
												size: "sm",
												onClick: () => void removeChannel(channel),
												disabled: deletingId === channel.id,
												children: [deletingId === channel.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 287,
													columnNumber: 54
												}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 287,
													columnNumber: 101
												}, this), "Remover"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 286,
												columnNumber: 23
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 273,
										columnNumber: 21
									}, this)
								]
							}, channel.id, true, {
								fileName: _jsxFileName,
								lineNumber: 246,
								columnNumber: 20
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 243,
						columnNumber: 22
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 227,
				columnNumber: 9
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 214,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, { children: "Proxima etapa" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 299,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Depois de criar o canal, abra um assistente para definir a publicacao por inbox." }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 300,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 298,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "text-sm text-muted-foreground",
				children: [
					"O vínculo também pode ser revisto na aba ",
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Publicação" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 305,
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
						lineNumber: 306,
						columnNumber: 11
					}, this),
					"."
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 304,
				columnNumber: 9
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 297,
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
							lineNumber: 315,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetDescription, { children: "Cadastre os dados operacionais da inbox. O vínculo do assistente pode ser feito aqui ou na aba de publicação do assistente." }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 316,
							columnNumber: 13
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 314,
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
										lineNumber: 323,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 322,
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
										lineNumber: 329,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 328,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "grid gap-4 md:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Account ID",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: form.accountId,
											onChange: (event) => setForm((current) => ({
												...current,
												accountId: event.target.value
											})),
											placeholder: "3"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 336,
											columnNumber: 17
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 335,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
										label: "Inbox ID",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											value: form.inboxId,
											onChange: (event) => setForm((current) => ({
												...current,
												inboxId: event.target.value
											})),
											placeholder: "17"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 342,
											columnNumber: 17
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 341,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 334,
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
											lineNumber: 354,
											columnNumber: 19
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 353,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: "__none__",
											children: "Nenhum assistente"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 357,
											columnNumber: 19
										}, this), activeAssistants.map((assistant) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: assistant.id,
											children: assistant.name
										}, assistant.id, false, {
											fileName: _jsxFileName,
											lineNumber: 358,
											columnNumber: 54
										}, this))] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 356,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 349,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 348,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Token de API (opcional)",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: form.apiAccessToken,
										onChange: (event) => setForm((current) => ({
											...current,
											apiAccessToken: event.target.value
										})),
										placeholder: editingChannel?.apiAccessTokenConfigured ? "Ja configurado no backend" : "Cole aqui apenas se for atualizar"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 365,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 364,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Webhook secret (opcional)",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: form.webhookSecret,
										onChange: (event) => setForm((current) => ({
											...current,
											webhookSecret: event.target.value
										})),
										placeholder: editingChannel?.webhookSecretConfigured ? "Ja configurado no backend" : "Cole aqui apenas se for atualizar"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 371,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 370,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Metadata JSON (opcional)",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
										rows: 4,
										value: form.metadataJsonText,
										onChange: (event) => setForm((current) => ({
											...current,
											metadataJsonText: event.target.value
										})),
										placeholder: "{\"channelType\":\"WHATSAPP\"}"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 377,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 376,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex items-center justify-between rounded-lg border px-3 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "text-sm font-medium",
										children: "Canal ativo"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 384,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "text-xs text-muted-foreground",
										children: "Quando desativado, o runtime não responde este inbox."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 385,
										columnNumber: 17
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 383,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
										checked: form.isActive,
										onCheckedChange: (checked) => setForm((current) => ({
											...current,
											isActive: checked
										}))
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 387,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 382,
									columnNumber: 13
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 321,
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
								lineNumber: 395,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								onClick: () => void submit(),
								disabled: saving,
								children: saving ? "Salvando..." : editingChannel ? "Salvar alteracoes" : "Criar canal"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 398,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 394,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 313,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 312,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 205,
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
			lineNumber: 415,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mt-2 text-2xl font-semibold",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 416,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 414,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 413,
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
			lineNumber: 428,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-right font-medium",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 429,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 427,
		columnNumber: 10
	}, this);
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, { children: label }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 440,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 439,
		columnNumber: 10
	}, this);
}
//#endregion
export { CanaisPage as component };
