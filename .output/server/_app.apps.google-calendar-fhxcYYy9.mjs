import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { t as ApiError } from "./_ssr/apiClient-DVSvK5lD.mjs";
import { A as Pencil, B as Link2, D as PowerOff, Dt as LoaderCircle, E as Power, O as Plus, gt as CalendarDays, u as Trash2, w as RefreshCw } from "./_libs/lucide-react.mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-Bsft3ipc.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as appStoreService } from "./_ssr/appStoreService-BJRGwrHX.mjs";
import { t as toast } from "./_libs/sonner.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.apps.google-calendar-fhxcYYy9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.apps.google-calendar.tsx?tsr-split=component";
var emptyDraft = {
	name: "",
	calendarId: "",
	resourceType: "quadra",
	sportType: "beach_tennis",
	isCovered: false,
	timezone: "America/Campo_Grande",
	slotMinutes: "30",
	defaultDurationMinutes: "60",
	minAdvanceMinutes: "60",
	maxDaysAhead: "14",
	active: true
};
function GoogleCalendarAppPage() {
	const [app, setApp] = (0, import_react.useState)(null);
	const [oauthStatus, setOauthStatus] = (0, import_react.useState)(null);
	const [calendars, setCalendars] = (0, import_react.useState)([]);
	const [resources, setResources] = (0, import_react.useState)([]);
	const [draft, setDraft] = (0, import_react.useState)(emptyDraft);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [loadingCalendars, setLoadingCalendars] = (0, import_react.useState)(false);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const installed = Boolean(app?.installation);
	const active = app?.installation?.status === "ACTIVE";
	const editing = Boolean(draft.id);
	const connected = Boolean(oauthStatus?.connected);
	const loadPage = (0, import_react.useCallback)(async () => {
		setLoading(true);
		setError(null);
		try {
			const appDetail = await appStoreService.getApp("google_calendar");
			const [status, resourceItems] = await Promise.all([appStoreService.getGoogleCalendarOAuthStatus(), appStoreService.listGoogleCalendarResources()]);
			setApp(appDetail);
			setOauthStatus(status);
			setResources(resourceItems);
			if (status.connected) setCalendars(await appStoreService.listGoogleCalendars());
			else setCalendars([]);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível carregar o app Google Agenda.");
		} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		loadPage();
	}, [loadPage]);
	const activeResources = (0, import_react.useMemo)(() => resources.filter((resource) => resource.active).length, [resources]);
	async function loadCalendars() {
		setLoadingCalendars(true);
		setError(null);
		try {
			setCalendars(await appStoreService.listGoogleCalendars());
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível carregar as agendas.");
		} finally {
			setLoadingCalendars(false);
		}
	}
	async function install() {
		setSaving(true);
		setError(null);
		try {
			const installation = await appStoreService.install("google_calendar");
			setApp((current) => current ? {
				...current,
				installation: {
					id: installation.id,
					status: installation.status,
					credentialsConfigured: installation.credentialsConfigured
				}
			} : current);
			toast.success("Google Agenda instalado.");
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível instalar o app.");
		} finally {
			setSaving(false);
		}
	}
	async function saveResource(event) {
		event.preventDefault();
		setSaving(true);
		setError(null);
		try {
			const payload = toPayload(draft);
			const saved = draft.id ? await appStoreService.updateGoogleCalendarResource(draft.id, payload) : connected ? await appStoreService.createGoogleCalendarResourceFromCalendar(payload) : await appStoreService.createGoogleCalendarResource(payload);
			setResources((current) => draft.id ? current.map((resource) => resource.id === saved.id ? saved : resource) : [saved, ...current]);
			setDraft(emptyDraft);
			if (connected) loadCalendars();
			toast.success(draft.id ? "Recurso atualizado." : "Recurso cadastrado.");
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível salvar o recurso.");
		} finally {
			setSaving(false);
		}
	}
	async function deactivateResource(resource) {
		setSaving(true);
		setError(null);
		try {
			const updated = await appStoreService.deactivateGoogleCalendarResource(resource.id);
			setResources((current) => current.map((item) => item.id === updated.id ? updated : item));
			toast.success("Recurso inativado.");
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível inativar o recurso.");
		} finally {
			setSaving(false);
		}
	}
	function editResource(resource) {
		setDraft({
			id: resource.id,
			name: resource.name,
			calendarId: resource.calendarId,
			resourceType: resource.resourceType,
			sportType: resource.sportType,
			isCovered: resource.isCovered,
			timezone: resource.timezone,
			slotMinutes: String(resource.slotMinutes),
			defaultDurationMinutes: String(resource.defaultDurationMinutes),
			minAdvanceMinutes: String(resource.minAdvanceMinutes),
			maxDaysAhead: String(resource.maxDaysAhead),
			active: resource.active
		});
	}
	function connectGoogle() {
		window.location.href = appStoreService.getGoogleCalendarOAuthStartUrl();
	}
	async function disconnectGoogle() {
		setSaving(true);
		setError(null);
		try {
			setOauthStatus(await appStoreService.disconnectGoogleCalendarOAuth());
			setCalendars([]);
			setResources(await appStoreService.listGoogleCalendarResources());
			toast.success("Google Agenda desconectado.");
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível desconectar.");
		} finally {
			setSaving(false);
		}
	}
	function configureCalendar(calendar) {
		setDraft({
			...emptyDraft,
			name: calendar.summary,
			calendarId: calendar.id,
			timezone: calendar.timeZone ?? emptyDraft.timezone
		});
	}
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Google Agenda",
			description: "Configure agendas Google como recursos reserváveis para a IA consultar horários e preparar reservas pelo backend.",
			actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				asChild: true,
				type: "button",
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
					to: "/apps",
					children: "Voltar para Apps"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 190,
					columnNumber: 15
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 189,
				columnNumber: 13
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				type: "button",
				variant: "outline",
				onClick: () => void loadPage(),
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 193,
					columnNumber: 15
				}, this), " Atualizar"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 192,
				columnNumber: 13
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 188,
				columnNumber: 178
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 188,
			columnNumber: 7
		}, this),
		error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
			title: "Não foi possível concluir a ação",
			description: error,
			onRetry: () => void loadPage(),
			className: "mb-4"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 197,
			columnNumber: 16
		}, this) : null,
		loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando Google Agenda..." }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 199,
			columnNumber: 18
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid gap-4 xl:grid-cols-[360px_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "flex items-center gap-2 text-lg",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CalendarDays, { className: "h-5 w-5" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 204,
							columnNumber: 19
						}, this), " Instalação"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 203,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 202,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "text-sm text-muted-foreground",
									children: "Status"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 209,
									columnNumber: 19
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(InstallationBadge, { app }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 210,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 208,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "text-sm text-muted-foreground",
									children: "Recursos ativos"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 213,
									columnNumber: 19
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "text-sm font-medium",
									children: activeResources
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 214,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 212,
								columnNumber: 17
							}, this),
							!installed ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								type: "button",
								onClick: () => void install(),
								disabled: saving,
								children: [saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 217,
									columnNumber: 31
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Power, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 217,
									columnNumber: 78
								}, this), "Instalar Google Agenda"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 216,
								columnNumber: 31
							}, this) : null
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 207,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 201,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "flex items-center gap-2 text-lg",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link2, { className: "h-5 w-5" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 226,
							columnNumber: 19
						}, this), " Conexão Google"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 225,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 224,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "text-sm text-muted-foreground",
									children: "Conta"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 231,
									columnNumber: 19
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "truncate text-sm font-medium",
									children: oauthStatus?.providerAccountEmail ?? "Não conectada"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 232,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 230,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
									className: "text-sm text-muted-foreground",
									children: "OAuth"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 237,
									columnNumber: 19
								}, this), connected ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { children: "Conectado" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 238,
									columnNumber: 32
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
									variant: "outline",
									children: "Desconectado"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 238,
									columnNumber: 59
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 236,
								columnNumber: 17
							}, this),
							connected ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-xs text-muted-foreground",
								children: ["Expira em ", oauthStatus?.expiresAt ? formatDate(oauthStatus.expiresAt) : "—"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 241,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									type: "button",
									variant: "outline",
									onClick: () => void loadCalendars(),
									disabled: loadingCalendars,
									children: [loadingCalendars ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 246,
										columnNumber: 45
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 246,
										columnNumber: 92
									}, this), "Atualizar agendas"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 245,
									columnNumber: 23
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									type: "button",
									variant: "outline",
									onClick: () => void disconnectGoogle(),
									disabled: saving,
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PowerOff, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 250,
										columnNumber: 25
									}, this), " Desconectar"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 249,
									columnNumber: 23
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 244,
								columnNumber: 21
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 240,
								columnNumber: 30
							}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-sm text-muted-foreground",
								children: "O admin será redirecionado para autorizar acesso às agendas Google."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 254,
								columnNumber: 21
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								type: "button",
								onClick: connectGoogle,
								disabled: !installed || saving,
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Power, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 258,
									columnNumber: 23
								}, this), " Conectar Google Agenda"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 257,
								columnNumber: 21
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 253,
								columnNumber: 25
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 229,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 223,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-lg",
						children: editing ? "Editar recurso" : "Cadastrar recurso"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 266,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 265,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", {
						className: "space-y-4",
						onSubmit: (event) => void saveResource(event),
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Nome do recurso",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: draft.name,
									onChange: (event) => setDraftField("name", event.target.value, setDraft),
									placeholder: "Quadra de Beach Aberta 1",
									required: true
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
								label: "ID da agenda Google",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: draft.calendarId,
									onChange: (event) => setDraftField("calendarId", event.target.value, setDraft),
									placeholder: "agenda@group.calendar.google.com",
									readOnly: connected && !editing,
									required: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 277,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 276,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Tipo",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										value: draft.resourceType,
										onValueChange: (value) => setDraftField("resourceType", value, setDraft),
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 284,
											columnNumber: 27
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 283,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "quadra",
												children: "Quadra"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 287,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "sala",
												children: "Sala"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 288,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "outro",
												children: "Outro"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 289,
												columnNumber: 27
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 286,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 282,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 281,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Esporte",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										value: draft.sportType,
										onValueChange: (value) => setDraftField("sportType", value, setDraft),
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 296,
											columnNumber: 27
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 295,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "beach_tennis",
												children: "Beach Tennis"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 299,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "padel",
												children: "Padel"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 300,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "tennis",
												children: "Tênis"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 301,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "multiuso",
												children: "Multiuso"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 302,
												columnNumber: 27
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 298,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 294,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 293,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 280,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Timezone",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: draft.timezone,
									onChange: (event) => setDraftField("timezone", event.target.value, setDraft),
									required: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 309,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 308,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid grid-cols-2 gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NumberField, {
										label: "Intervalo",
										value: draft.slotMinutes,
										onChange: (value) => setDraftField("slotMinutes", value, setDraft)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 313,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NumberField, {
										label: "Duração padrão",
										value: draft.defaultDurationMinutes,
										onChange: (value) => setDraftField("defaultDurationMinutes", value, setDraft)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 314,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NumberField, {
										label: "Antecedência min.",
										value: draft.minAdvanceMinutes,
										onChange: (value) => setDraftField("minAdvanceMinutes", value, setDraft)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 315,
										columnNumber: 21
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NumberField, {
										label: "Dias à frente",
										value: draft.maxDaysAhead,
										onChange: (value) => setDraftField("maxDaysAhead", value, setDraft)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 316,
										columnNumber: 21
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 312,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center justify-between rounded-lg border px-3 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
									htmlFor: "isCovered",
									children: "Coberta"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 320,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
									id: "isCovered",
									checked: draft.isCovered,
									onCheckedChange: (value) => setDraftField("isCovered", value, setDraft)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 321,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 319,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center justify-between rounded-lg border px-3 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
									htmlFor: "active",
									children: "Ativa"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 325,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
									id: "active",
									checked: draft.active,
									onCheckedChange: (value) => setDraftField("active", value, setDraft)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 326,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 324,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									type: "submit",
									disabled: !active || saving,
									children: [saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 331,
										columnNumber: 33
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 331,
										columnNumber: 80
									}, this), editing ? "Salvar alterações" : "Cadastrar"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 330,
									columnNumber: 21
								}, this), editing ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									type: "button",
									variant: "outline",
									onClick: () => setDraft(emptyDraft),
									children: "Cancelar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 334,
									columnNumber: 32
								}, this) : null]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 329,
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
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 264,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 200,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CalendarsCard, {
					connected,
					loading: loadingCalendars,
					calendars,
					onRefresh: () => void loadCalendars(),
					onConfigure: configureCalendar
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 344,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResourcesCard, {
					resources,
					saving,
					onEdit: editResource,
					onDeactivate: (resource) => void deactivateResource(resource)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 345,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 343,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 199,
			columnNumber: 73
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 187,
		columnNumber: 10
	}, this);
}
function CalendarsCard({ connected, loading, calendars, onRefresh, onConfigure }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
		className: "flex flex-row items-center justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
			className: "text-lg",
			children: "Agendas da conta Google"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 365,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
			type: "button",
			size: "sm",
			variant: "outline",
			onClick: onRefresh,
			disabled: !connected || loading,
			children: [loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 367,
				columnNumber: 22
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 367,
				columnNumber: 69
			}, this), "Atualizar"]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 366,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 364,
		columnNumber: 7
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-0",
		children: !connected ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
			title: "Conta Google não conectada",
			description: "Conecte o Google Agenda para listar agendas reais e mapear quadras.",
			className: "m-4"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 372,
			columnNumber: 23
		}, this) : calendars.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
			title: "Nenhuma agenda encontrada",
			description: "Atualize a lista após concluir a autorização no Google.",
			className: "m-4"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 372,
			columnNumber: 198
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Agenda" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 375,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Timezone" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 376,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Acesso" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 377,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 378,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 379,
				columnNumber: 17
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 374,
			columnNumber: 15
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 373,
			columnNumber: 13
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: calendars.map((calendar) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "font-medium",
				children: calendar.summary
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 385,
				columnNumber: 21
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "max-w-[300px] truncate text-xs text-muted-foreground",
				children: calendar.id
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 386,
				columnNumber: 21
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 384,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "text-xs",
				children: calendar.timeZone ?? "—"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 390,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: calendar.accessRole ?? "—" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 391,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: calendar.mapped ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { children: "Mapeada" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 393,
				columnNumber: 40
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
				variant: "outline",
				children: "Não mapeada"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 393,
				columnNumber: 65
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 392,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					type: "button",
					size: "sm",
					variant: "outline",
					onClick: () => onConfigure(calendar),
					children: "Configurar como recurso"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 397,
					columnNumber: 23
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 396,
				columnNumber: 21
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 395,
				columnNumber: 19
			}, this)
		] }, calendar.id, true, {
			fileName: _jsxFileName,
			lineNumber: 383,
			columnNumber: 42
		}, this)) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 382,
			columnNumber: 13
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 372,
			columnNumber: 335
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 371,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 363,
		columnNumber: 10
	}, this);
}
function ResourcesCard({ resources, saving, onEdit, onDeactivate }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
		className: "text-lg",
		children: "Recursos configurados"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 421,
		columnNumber: 9
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 420,
		columnNumber: 7
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "p-0",
		children: resources.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
			title: "Nenhum recurso configurado",
			description: "Mapeie uma agenda Google ou cadastre manualmente uma agenda.",
			className: "m-4"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 424,
			columnNumber: 35
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Recurso" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 427,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Agenda" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 428,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Esporte" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 429,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Tipo" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 430,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Duração" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 431,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 432,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 433,
				columnNumber: 17
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 426,
			columnNumber: 15
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 425,
			columnNumber: 13
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: resources.map((resource) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "font-medium",
				children: resource.name
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 438,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "max-w-[240px] truncate text-xs text-muted-foreground",
				children: resource.calendarId
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 439,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: formatSport(resource.sportType) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 442,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: resource.isCovered ? "Coberta" : "Aberta" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 443,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: [resource.defaultDurationMinutes, " min"] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 444,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: resource.active ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { children: "Ativo" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 446,
				columnNumber: 40
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
				variant: "secondary",
				children: "Inativo"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 446,
				columnNumber: 63
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 445,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex justify-end gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					type: "button",
					size: "sm",
					variant: "ghost",
					onClick: () => onEdit(resource),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 451,
						columnNumber: 25
					}, this), " Editar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 450,
					columnNumber: 23
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					type: "button",
					size: "sm",
					variant: "ghost",
					disabled: !resource.active || saving,
					onClick: () => onDeactivate(resource),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 454,
						columnNumber: 25
					}, this), " Inativar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 453,
					columnNumber: 23
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 449,
				columnNumber: 21
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 448,
				columnNumber: 19
			}, this)
		] }, resource.id, true, {
			fileName: _jsxFileName,
			lineNumber: 437,
			columnNumber: 42
		}, this)) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 436,
			columnNumber: 13
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 424,
			columnNumber: 178
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 423,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 419,
		columnNumber: 10
	}, this);
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, { children: label }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 472,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 471,
		columnNumber: 10
	}, this);
}
function NumberField({ label, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
		label,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
			type: "number",
			min: 0,
			value,
			onChange: (event) => onChange(event.target.value),
			required: true
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 486,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 485,
		columnNumber: 10
	}, this);
}
function setDraftField(field, value, setDraft) {
	setDraft((current) => ({
		...current,
		[field]: value
	}));
}
function toPayload(draft) {
	return {
		name: draft.name,
		calendarId: draft.calendarId,
		resourceType: draft.resourceType,
		sportType: draft.sportType,
		isCovered: draft.isCovered,
		timezone: draft.timezone,
		slotMinutes: Number(draft.slotMinutes),
		defaultDurationMinutes: Number(draft.defaultDurationMinutes),
		minAdvanceMinutes: Number(draft.minAdvanceMinutes),
		maxDaysAhead: Number(draft.maxDaysAhead),
		active: draft.active
	};
}
function InstallationBadge({ app }) {
	if (!app?.installation) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "outline",
		children: "Não instalado"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 516,
		columnNumber: 12
	}, this);
	if (app.installation.status === "ACTIVE") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { children: "Ativo" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 519,
		columnNumber: 12
	}, this);
	if (app.installation.status === "ERROR") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "destructive",
		children: "Erro"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 522,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "secondary",
		children: "Inativo"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 524,
		columnNumber: 10
	}, this);
}
function formatSport(value) {
	return {
		beach_tennis: "Beach Tennis",
		padel: "Padel",
		tennis: "Tênis",
		multiuso: "Multiuso"
	}[value] ?? value;
}
function formatDate(value) {
	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short"
	}).format(new Date(value));
}
//#endregion
export { GoogleCalendarAppPage as component };
