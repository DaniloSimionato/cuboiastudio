import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { t as ApiError } from "./_ssr/apiClient-Bei-u2-_.mjs";
import { A as Pencil, At as SlidersVertical, B as Link2, D as PowerOff, E as Power, J as FolderOpen, Mt as Layers, O as Plus, Tt as ArrowLeft, _t as CalendarDays, jt as LoaderCircle, t as X, u as Trash2, v as Settings2, w as RefreshCw } from "./_libs/lucide-react.mjs";
import { P as useNavigate, g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-Bsft3ipc.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Route } from "./_app.apps.google-calendar-BU8IhSNL.mjs";
import { t as appStoreService } from "./_ssr/appStoreService-B9Syfqys.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
import { t as toast } from "./_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.apps.google-calendar-4XfGoZUu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.apps.google-calendar.tsx?tsr-split=component";
var emptyDraft = {
	name: "",
	calendarId: "",
	resourceType: "",
	sportType: "",
	isCovered: false,
	timezone: "America/Campo_Grande",
	slotMinutes: "30",
	defaultDurationMinutes: "60",
	minAdvanceMinutes: "60",
	maxDaysAhead: "14",
	active: true,
	resourceTypeId: "",
	categoryId: "",
	attributeId: ""
};
function GoogleCalendarAppPage() {
	const { installationId } = Route.useSearch();
	const navigate = useNavigate();
	const [app, setApp] = (0, import_react.useState)(null);
	const [oauthStatus, setOauthStatus] = (0, import_react.useState)(null);
	const [calendars, setCalendars] = (0, import_react.useState)([]);
	const [resources, setResources] = (0, import_react.useState)([]);
	const [draft, setDraft] = (0, import_react.useState)(emptyDraft);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [loadingCalendars, setLoadingCalendars] = (0, import_react.useState)(false);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [types, setTypes] = (0, import_react.useState)([]);
	const [categories, setCategories] = (0, import_react.useState)([]);
	const [attributes, setAttributes] = (0, import_react.useState)([]);
	const [activeSubTab, setActiveSubTab] = (0, import_react.useState)("resources");
	const [isDrawerOpen, setIsDrawerOpen] = (0, import_react.useState)(false);
	const [newTypeName, setNewTypeName] = (0, import_react.useState)("");
	const [newCategoryName, setNewCategoryName] = (0, import_react.useState)("");
	const [newAttrName, setNewAttrName] = (0, import_react.useState)("");
	const installed = Boolean(app?.installation);
	const active = app?.installation?.status === "ACTIVE";
	const editing = Boolean(draft.id);
	const connected = Boolean(oauthStatus?.connected);
	(0, import_react.useEffect)(() => {
		if (!installationId) {
			const resolveDefaultInstallation = async () => {
				try {
					const googleInsts = (await appStoreService.listInstallations()).filter((inst) => inst.app.slug === "google_calendar");
					if (googleInsts.length > 0) navigate({
						search: { installationId: googleInsts[0].id },
						replace: true
					});
					else navigate({
						to: "/apps",
						replace: true
					});
				} catch {
					navigate({
						to: "/apps",
						replace: true
					});
				}
			};
			resolveDefaultInstallation();
		}
	}, [installationId, navigate]);
	const loadPage = (0, import_react.useCallback)(async () => {
		if (!installationId) return;
		setLoading(true);
		setError(null);
		try {
			const appDetail = await appStoreService.getApp("google_calendar", installationId);
			const [status, resourceItems, typeItems, catItems, attrItems] = await Promise.all([
				appStoreService.getGoogleCalendarOAuthStatus(installationId),
				appStoreService.listGoogleCalendarResources(installationId),
				appStoreService.listResourceTypes(),
				appStoreService.listResourceCategories(),
				appStoreService.listResourceAttributes()
			]);
			setApp(appDetail);
			setOauthStatus(status);
			setResources(resourceItems);
			setTypes(typeItems);
			setCategories(catItems);
			setAttributes(attrItems);
			if (status.connected) setCalendars(await appStoreService.listGoogleCalendars(installationId));
			else setCalendars([]);
		} catch (err) {
			if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setError("Usuário sem permissão para configurar aplicativos. Verifique permissões tools:read/tools:write.");
			else setError(err instanceof ApiError ? err.message : "Não foi possível carregar o app Google Agenda.");
		} finally {
			setLoading(false);
		}
	}, [installationId]);
	(0, import_react.useEffect)(() => {
		loadPage();
	}, [loadPage]);
	const activeResources = (0, import_react.useMemo)(() => resources.filter((resource) => resource.active).length, [resources]);
	async function loadCalendars() {
		if (!installationId) return;
		setLoadingCalendars(true);
		setError(null);
		try {
			setCalendars(await appStoreService.listGoogleCalendars(installationId));
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
			toast.success("Google Agenda instalado com sucesso.");
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
			const payload = toPayload(draft, installationId);
			const saved = draft.id ? await appStoreService.updateGoogleCalendarResource(draft.id, payload) : connected ? await appStoreService.createGoogleCalendarResourceFromCalendar(payload) : await appStoreService.createGoogleCalendarResource(payload);
			setResources((current) => draft.id ? current.map((resource) => resource.id === saved.id ? saved : resource) : [saved, ...current]);
			setDraft(emptyDraft);
			setIsDrawerOpen(false);
			if (connected) loadCalendars();
			toast.success(draft.id ? "Recurso atualizado com sucesso." : "Recurso cadastrado com sucesso.");
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível salvar o recurso.");
			toast.error(err instanceof ApiError ? err.message : "Erro ao salvar recurso.");
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
			toast.success("Recurso inativado com sucesso.");
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
			active: resource.active,
			resourceTypeId: resource.resourceTypeId || "",
			categoryId: resource.categoryId || "",
			attributeId: resource.attributeId || ""
		});
		setIsDrawerOpen(true);
	}
	async function connectGoogle() {
		setSaving(true);
		setError(null);
		try {
			const res = await appStoreService.getGoogleCalendarOAuthStartUrl(installationId);
			window.location.href = res.authorizationUrl;
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível iniciar a conexão com o Google Agenda.");
			toast.error("Erro ao iniciar conexão com o Google.");
		} finally {
			setSaving(false);
		}
	}
	async function disconnectGoogle() {
		setSaving(true);
		setError(null);
		try {
			setOauthStatus(await appStoreService.disconnectGoogleCalendarOAuth(installationId));
			setCalendars([]);
			setResources(await appStoreService.listGoogleCalendarResources(installationId));
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
		setIsDrawerOpen(true);
	}
	async function handleCreateType() {
		if (!newTypeName.trim()) return;
		const slug = newTypeName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
		try {
			const created = await appStoreService.createResourceType({
				name: newTypeName,
				slug
			});
			setTypes((curr) => [...curr, created]);
			setNewTypeName("");
			toast.success("Tipo cadastrado com sucesso.");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Erro ao cadastrar tipo.");
		}
	}
	async function handleDeleteType(id) {
		try {
			await appStoreService.deleteResourceType(id);
			setTypes((curr) => curr.filter((t) => t.id !== id));
			toast.success("Tipo removido.");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Erro ao remover tipo.");
		}
	}
	async function handleCreateCategory() {
		if (!newCategoryName.trim()) return;
		const slug = newCategoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
		try {
			const created = await appStoreService.createResourceCategory({
				name: newCategoryName,
				slug
			});
			setCategories((curr) => [...curr, created]);
			setNewCategoryName("");
			toast.success("Categoria cadastrada com sucesso.");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Erro ao cadastrar categoria.");
		}
	}
	async function handleDeleteCategory(id) {
		try {
			await appStoreService.deleteResourceCategory(id);
			setCategories((curr) => curr.filter((c) => c.id !== id));
			toast.success("Categoria removida.");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Erro ao remover categoria.");
		}
	}
	async function handleCreateAttribute() {
		if (!newAttrName.trim()) return;
		const slug = newAttrName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
		try {
			const created = await appStoreService.createResourceAttribute({
				name: newAttrName,
				slug
			});
			setAttributes((curr) => [...curr, created]);
			setNewAttrName("");
			toast.success("Característica cadastrada com sucesso.");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Erro ao cadastrar característica.");
		}
	}
	async function handleDeleteAttribute(id) {
		try {
			await appStoreService.deleteResourceAttribute(id);
			setAttributes((curr) => curr.filter((a) => a.id !== id));
			toast.success("Característica removida.");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Erro ao remover característica.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-6 relative pb-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "ghost",
					size: "icon",
					asChild: true,
					className: "hover:bg-muted rounded-xl",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
						to: "/apps",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowLeft, { className: "h-5 w-5" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 352,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 351,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 350,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
					title: oauthStatus?.providerAccountEmail ? `Google Agenda (${oauthStatus.providerAccountEmail})` : "Google Agenda",
					description: "Mapeie suas agendas do Google Calendar como recursos que a IA pode ler, reservar, remarcar ou cancelar.",
					actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							type: "button",
							variant: "outline",
							onClick: () => void loadPage(),
							className: "hover:bg-muted",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 mr-1.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 357,
								columnNumber: 17
							}, this), " Atualizar"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 356,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							type: "button",
							onClick: () => {
								setDraft(emptyDraft);
								setIsDrawerOpen(true);
							},
							disabled: !active,
							className: "bg-primary text-primary-foreground font-medium",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4 mr-1.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 363,
								columnNumber: 17
							}, this), " Novo Recurso"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 359,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 355,
						columnNumber: 264
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 355,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 349,
				columnNumber: 7
			}, this),
			loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando configurações do Google Agenda..." }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 368,
				columnNumber: 18
			}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
				title: "Não foi possível concluir a ação",
				description: error,
				onRetry: () => void loadPage(),
				className: "mb-4"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 368,
				columnNumber: 98
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid gap-6 md:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
						className: "border bg-card shadow-sm",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
							className: "pb-3",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
								className: "text-base font-semibold flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CalendarDays, { className: "h-5 w-5 text-primary" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 374,
									columnNumber: 19
								}, this), " Status da Instalação"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 373,
								columnNumber: 17
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Status atual da extensão no Cubo AI Studio" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 376,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 372,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
							className: "space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex justify-between items-center text-sm border-b pb-2",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-muted-foreground",
										children: "Aplicativo"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 380,
										columnNumber: 19
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "font-semibold text-foreground",
										children: "Google Agenda"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 381,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 379,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex justify-between items-center text-sm border-b pb-2",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-muted-foreground",
										children: "Extensão"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 384,
										columnNumber: 19
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(InstallationBadge, { app }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 385,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 383,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex justify-between items-center text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-muted-foreground",
										children: "Recursos ativos"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 388,
										columnNumber: 19
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
										variant: "outline",
										className: "font-bold border-primary/20 text-primary bg-primary/5",
										children: [activeResources, " ativo(s)"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 389,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 387,
									columnNumber: 17
								}, this),
								!installed && /* @__PURE__ */ (void 0)(Button, {
									type: "button",
									onClick: () => void install(),
									disabled: saving,
									className: "w-full mt-2",
									children: [saving ? /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-1.5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 394,
										columnNumber: 31
									}, this) : /* @__PURE__ */ (void 0)(Power, { className: "h-4 w-4 mr-1.5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 394,
										columnNumber: 85
									}, this), "Instalar Integração"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 393,
									columnNumber: 32
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 378,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 371,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
						className: "border bg-card shadow-sm",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
							className: "pb-3",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
								className: "text-base font-semibold flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link2, { className: "h-5 w-5 text-primary" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 403,
									columnNumber: 19
								}, this), " Credenciais Google OAuth"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 402,
								columnNumber: 17
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Conexão com sua conta administrativa do Google" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 405,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 401,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
							className: "space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex justify-between items-center text-sm border-b pb-2",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-muted-foreground",
										children: "Status da Conta"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 409,
										columnNumber: 19
									}, this), connected ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
										className: "bg-emerald-500 text-white hover:bg-emerald-600",
										children: "Conectado"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 410,
										columnNumber: 32
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
										variant: "secondary",
										children: "Desconectado"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 410,
										columnNumber: 118
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 408,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex justify-between items-center text-sm border-b pb-2",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "text-muted-foreground",
										children: "E-mail Conectado"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 413,
										columnNumber: 19
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "font-medium truncate max-w-[200px] text-foreground",
										children: oauthStatus?.providerAccountEmail || "Nenhuma conta vinculada"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 414,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 412,
									columnNumber: 17
								}, this),
								connected && oauthStatus?.expiresAt && /* @__PURE__ */ (void 0)("div", {
									className: "text-xs text-muted-foreground flex justify-between items-center border-b pb-2",
									children: [/* @__PURE__ */ (void 0)("span", { children: "Validade do token" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 419,
										columnNumber: 21
									}, this), /* @__PURE__ */ (void 0)("span", { children: formatDate(oauthStatus.expiresAt) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 420,
										columnNumber: 21
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 418,
									columnNumber: 57
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "pt-1 flex gap-2",
									children: connected ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										type: "button",
										variant: "outline",
										size: "sm",
										onClick: () => void loadCalendars(),
										disabled: loadingCalendars,
										className: "flex-1",
										children: [loadingCalendars ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-1.5" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 425,
											columnNumber: 45
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 mr-1.5" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 425,
											columnNumber: 99
										}, this), "Atualizar Agendas"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 424,
										columnNumber: 23
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										type: "button",
										variant: "ghost",
										size: "sm",
										onClick: () => void disconnectGoogle(),
										disabled: saving,
										className: "text-destructive hover:bg-destructive/10",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PowerOff, { className: "h-4 w-4 mr-1.5" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 429,
											columnNumber: 25
										}, this), " Desconectar"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 428,
										columnNumber: 23
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 423,
										columnNumber: 32
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										type: "button",
										onClick: connectGoogle,
										disabled: !installed || saving,
										className: "w-full",
										children: [saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-1.5" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 432,
											columnNumber: 33
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Power, { className: "h-4 w-4 mr-1.5" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 432,
											columnNumber: 87
										}, this), "Autorizar Acesso Google"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 431,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 422,
									columnNumber: 17
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 407,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 400,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 370,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex border-b",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
									onClick: () => setActiveSubTab("resources"),
									className: `px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === "resources" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`,
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Settings2, { className: "h-4.5 w-4.5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 444,
										columnNumber: 17
									}, this), " Recursos Mapeados"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 443,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
									onClick: () => setActiveSubTab("calendars"),
									className: `px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === "calendars" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FolderOpen, { className: "h-4.5 w-4.5" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 447,
											columnNumber: 17
										}, this),
										" Agendas da Conta (",
										calendars.length,
										")"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 446,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
									onClick: () => setActiveSubTab("classifications"),
									className: `px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === "classifications" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`,
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layers, { className: "h-4.5 w-4.5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 450,
										columnNumber: 17
									}, this), " Classificações de Recursos"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 449,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 442,
							columnNumber: 13
						}, this),
						activeSubTab === "resources" && /* @__PURE__ */ (void 0)(ResourcesCard, {
							resources,
							saving,
							onEdit: editResource,
							onDeactivate: (resItem) => void deactivateResource(resItem)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 455,
							columnNumber: 46
						}, this),
						activeSubTab === "calendars" && /* @__PURE__ */ (void 0)(CalendarsCard, {
							connected,
							loading: loadingCalendars,
							calendars,
							onRefresh: () => void loadCalendars(),
							onConfigure: configureCalendar
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 458,
							columnNumber: 46
						}, this),
						activeSubTab === "classifications" && /* @__PURE__ */ (void 0)("div", {
							className: "grid gap-6 md:grid-cols-3",
							children: [
								/* @__PURE__ */ (void 0)(Card, {
									className: "border shadow-sm",
									children: [/* @__PURE__ */ (void 0)(CardHeader, {
										className: "pb-3 border-b bg-muted/20",
										children: [/* @__PURE__ */ (void 0)(CardTitle, {
											className: "text-sm font-bold flex items-center gap-1.5 text-foreground",
											children: [/* @__PURE__ */ (void 0)(SlidersVertical, { className: "h-4 w-4 text-primary" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 466,
												columnNumber: 23
											}, this), " Tipos de Recursos"]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 465,
											columnNumber: 21
										}, this), /* @__PURE__ */ (void 0)(CardDescription, {
											className: "text-xs",
											children: "Ex: Quadra, Sala, Profissional"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 468,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 464,
										columnNumber: 19
									}, this), /* @__PURE__ */ (void 0)(CardContent, {
										className: "pt-4 space-y-4",
										children: [/* @__PURE__ */ (void 0)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (void 0)(Input, {
												type: "text",
												placeholder: "Novo tipo...",
												value: newTypeName,
												onChange: (e) => setNewTypeName(e.target.value),
												className: "text-xs h-8"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 472,
												columnNumber: 23
											}, this), /* @__PURE__ */ (void 0)(Button, {
												onClick: handleCreateType,
												size: "sm",
												className: "h-8 px-2 font-semibold",
												children: "Adicionar"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 473,
												columnNumber: 23
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 471,
											columnNumber: 21
										}, this), /* @__PURE__ */ (void 0)("div", {
											className: "space-y-1.5 max-h-[300px] overflow-y-auto",
											children: types.length === 0 ? /* @__PURE__ */ (void 0)("p", {
												className: "text-xs text-muted-foreground text-center py-4",
												children: "Nenhum tipo criado."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 478,
												columnNumber: 45
											}, this) : types.map((t) => /* @__PURE__ */ (void 0)("div", {
												className: "flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded-lg border text-xs",
												children: [/* @__PURE__ */ (void 0)("div", {
													className: "flex flex-col",
													children: [/* @__PURE__ */ (void 0)("span", {
														className: "font-semibold text-foreground",
														children: t.name
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 480,
														columnNumber: 31
													}, this), /* @__PURE__ */ (void 0)("span", {
														className: "text-[10px] text-muted-foreground",
														children: ["slug: ", t.slug]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 481,
														columnNumber: 31
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 479,
													columnNumber: 29
												}, this), /* @__PURE__ */ (void 0)(Button, {
													variant: "ghost",
													size: "icon",
													onClick: () => handleDeleteType(t.id),
													className: "h-6 w-6 text-destructive hover:bg-destructive/10",
													children: /* @__PURE__ */ (void 0)(X, { className: "h-3.5 w-3.5" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 484,
														columnNumber: 31
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 483,
													columnNumber: 29
												}, this)]
											}, t.id, true, {
												fileName: _jsxFileName,
												lineNumber: 478,
												columnNumber: 148
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 477,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 470,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 463,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ (void 0)(Card, {
									className: "border shadow-sm",
									children: [/* @__PURE__ */ (void 0)(CardHeader, {
										className: "pb-3 border-b bg-muted/20",
										children: [/* @__PURE__ */ (void 0)(CardTitle, {
											className: "text-sm font-bold flex items-center gap-1.5 text-foreground",
											children: [/* @__PURE__ */ (void 0)(FolderOpen, { className: "h-4 w-4 text-primary" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 495,
												columnNumber: 23
											}, this), " Categorias / Modalidades"]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 494,
											columnNumber: 21
										}, this), /* @__PURE__ */ (void 0)(CardDescription, {
											className: "text-xs",
											children: "Ex: Beach Tennis, Padel, Geral"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 497,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 493,
										columnNumber: 19
									}, this), /* @__PURE__ */ (void 0)(CardContent, {
										className: "pt-4 space-y-4",
										children: [/* @__PURE__ */ (void 0)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (void 0)(Input, {
												type: "text",
												placeholder: "Nova categoria...",
												value: newCategoryName,
												onChange: (e) => setNewCategoryName(e.target.value),
												className: "text-xs h-8"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 501,
												columnNumber: 23
											}, this), /* @__PURE__ */ (void 0)(Button, {
												onClick: handleCreateCategory,
												size: "sm",
												className: "h-8 px-2 font-semibold",
												children: "Adicionar"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 502,
												columnNumber: 23
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 500,
											columnNumber: 21
										}, this), /* @__PURE__ */ (void 0)("div", {
											className: "space-y-1.5 max-h-[300px] overflow-y-auto",
											children: categories.length === 0 ? /* @__PURE__ */ (void 0)("p", {
												className: "text-xs text-muted-foreground text-center py-4",
												children: "Nenhuma categoria criada."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 507,
												columnNumber: 50
											}, this) : categories.map((c) => /* @__PURE__ */ (void 0)("div", {
												className: "flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded-lg border text-xs",
												children: [/* @__PURE__ */ (void 0)("div", {
													className: "flex flex-col",
													children: [/* @__PURE__ */ (void 0)("span", {
														className: "font-semibold text-foreground",
														children: c.name
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 509,
														columnNumber: 31
													}, this), /* @__PURE__ */ (void 0)("span", {
														className: "text-[10px] text-muted-foreground",
														children: ["slug: ", c.slug]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 510,
														columnNumber: 31
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 508,
													columnNumber: 29
												}, this), /* @__PURE__ */ (void 0)(Button, {
													variant: "ghost",
													size: "icon",
													onClick: () => handleDeleteCategory(c.id),
													className: "h-6 w-6 text-destructive hover:bg-destructive/10",
													children: /* @__PURE__ */ (void 0)(X, { className: "h-3.5 w-3.5" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 513,
														columnNumber: 31
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 512,
													columnNumber: 29
												}, this)]
											}, c.id, true, {
												fileName: _jsxFileName,
												lineNumber: 507,
												columnNumber: 164
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 506,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 499,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 492,
									columnNumber: 17
								}, this),
								/* @__PURE__ */ (void 0)(Card, {
									className: "border shadow-sm",
									children: [/* @__PURE__ */ (void 0)(CardHeader, {
										className: "pb-3 border-b bg-muted/20",
										children: [/* @__PURE__ */ (void 0)(CardTitle, {
											className: "text-sm font-bold flex items-center gap-1.5 text-foreground",
											children: [/* @__PURE__ */ (void 0)(Layers, { className: "h-4 w-4 text-primary" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 524,
												columnNumber: 23
											}, this), " Características / Atributos"]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 523,
											columnNumber: 21
										}, this), /* @__PURE__ */ (void 0)(CardDescription, {
											className: "text-xs",
											children: "Ex: Coberta, Aberta, Ar Condicionado"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 526,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 522,
										columnNumber: 19
									}, this), /* @__PURE__ */ (void 0)(CardContent, {
										className: "pt-4 space-y-4",
										children: [/* @__PURE__ */ (void 0)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (void 0)(Input, {
												type: "text",
												placeholder: "Novo atributo...",
												value: newAttrName,
												onChange: (e) => setNewAttrName(e.target.value),
												className: "text-xs h-8"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 530,
												columnNumber: 23
											}, this), /* @__PURE__ */ (void 0)(Button, {
												onClick: handleCreateAttribute,
												size: "sm",
												className: "h-8 px-2 font-semibold",
												children: "Adicionar"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 531,
												columnNumber: 23
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 529,
											columnNumber: 21
										}, this), /* @__PURE__ */ (void 0)("div", {
											className: "space-y-1.5 max-h-[300px] overflow-y-auto",
											children: attributes.length === 0 ? /* @__PURE__ */ (void 0)("p", {
												className: "text-xs text-muted-foreground text-center py-4",
												children: "Nenhuma característica criada."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 536,
												columnNumber: 50
											}, this) : attributes.map((a) => /* @__PURE__ */ (void 0)("div", {
												className: "flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded-lg border text-xs",
												children: [/* @__PURE__ */ (void 0)("div", {
													className: "flex flex-col",
													children: [/* @__PURE__ */ (void 0)("span", {
														className: "font-semibold text-foreground",
														children: a.name
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 538,
														columnNumber: 31
													}, this), /* @__PURE__ */ (void 0)("span", {
														className: "text-[10px] text-muted-foreground",
														children: ["slug: ", a.slug]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 539,
														columnNumber: 31
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 537,
													columnNumber: 29
												}, this), /* @__PURE__ */ (void 0)(Button, {
													variant: "ghost",
													size: "icon",
													onClick: () => handleDeleteAttribute(a.id),
													className: "h-6 w-6 text-destructive hover:bg-destructive/10",
													children: /* @__PURE__ */ (void 0)(X, { className: "h-3.5 w-3.5" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 542,
														columnNumber: 31
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 541,
													columnNumber: 29
												}, this)]
											}, a.id, true, {
												fileName: _jsxFileName,
												lineNumber: 536,
												columnNumber: 169
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 535,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 528,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 521,
									columnNumber: 17
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 461,
							columnNumber: 52
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 441,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 368,
				columnNumber: 225
			}, this),
			isDrawerOpen && /* @__PURE__ */ (void 0)("div", {
				className: "fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-all duration-300",
				children: [/* @__PURE__ */ (void 0)("div", {
					className: "absolute inset-0 cursor-pointer",
					onClick: () => setIsDrawerOpen(false)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 555,
					columnNumber: 11
				}, this), /* @__PURE__ */ (void 0)("div", {
					className: "relative w-full max-w-[500px] bg-background border-l h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300",
					children: [/* @__PURE__ */ (void 0)("div", {
						className: "flex justify-between items-center border-b pb-4 mb-6",
						children: [/* @__PURE__ */ (void 0)("div", { children: [/* @__PURE__ */ (void 0)("h3", {
							className: "text-lg font-bold text-foreground",
							children: editing ? "Editar recurso reservável" : "Mapear novo recurso"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 560,
							columnNumber: 17
						}, this), /* @__PURE__ */ (void 0)("p", {
							className: "text-xs text-muted-foreground mt-0.5",
							children: "Preencha as configurações e defina as características do recurso."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 563,
							columnNumber: 17
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 559,
							columnNumber: 15
						}, this), /* @__PURE__ */ (void 0)(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => setIsDrawerOpen(false),
							className: "hover:bg-muted rounded-full",
							children: /* @__PURE__ */ (void 0)(X, { className: "h-5 w-5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 568,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 567,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 558,
						columnNumber: 13
					}, this), /* @__PURE__ */ (void 0)("form", {
						className: "space-y-5",
						onSubmit: (event) => void saveResource(event),
						children: [
							/* @__PURE__ */ (void 0)(Field, {
								label: "Nome de exibição do recurso",
								children: /* @__PURE__ */ (void 0)(Input, {
									value: draft.name,
									onChange: (event) => setDraftField("name", event.target.value, setDraft),
									placeholder: "Ex: Quadra 1 de Beach Tennis",
									required: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 574,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 573,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (void 0)(Field, {
								label: "ID do Google Calendar",
								children: /* @__PURE__ */ (void 0)(Input, {
									value: draft.calendarId,
									onChange: (event) => setDraftField("calendarId", event.target.value, setDraft),
									placeholder: "Ex: agenda@group.calendar.google.com",
									readOnly: connected && !editing,
									required: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 578,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 577,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (void 0)("div", {
								className: "space-y-4 bg-muted/20 p-4 rounded-xl border border-dashed",
								children: [
									/* @__PURE__ */ (void 0)("h4", {
										className: "text-xs font-bold text-muted-foreground uppercase tracking-wider",
										children: "Classificações do Recurso"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 583,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (void 0)(Field, {
										label: "Tipo do Recurso",
										children: /* @__PURE__ */ (void 0)("select", {
											value: draft.resourceTypeId || "",
											onChange: (e) => setDraftField("resourceTypeId", e.target.value || null, setDraft),
											className: "w-full bg-background border rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
											children: [/* @__PURE__ */ (void 0)("option", {
												value: "",
												children: "Selecione o Tipo..."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 587,
												columnNumber: 21
											}, this), types.map((t) => /* @__PURE__ */ (void 0)("option", {
												value: t.id,
												children: t.name
											}, t.id, false, {
												fileName: _jsxFileName,
												lineNumber: 588,
												columnNumber: 37
											}, this))]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 586,
											columnNumber: 19
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 585,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (void 0)(Field, {
										label: "Categoria / Modalidade",
										children: /* @__PURE__ */ (void 0)("select", {
											value: draft.categoryId || "",
											onChange: (e) => setDraftField("categoryId", e.target.value || null, setDraft),
											className: "w-full bg-background border rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
											children: [/* @__PURE__ */ (void 0)("option", {
												value: "",
												children: "Selecione a Categoria..."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 594,
												columnNumber: 21
											}, this), categories.map((c) => /* @__PURE__ */ (void 0)("option", {
												value: c.id,
												children: c.name
											}, c.id, false, {
												fileName: _jsxFileName,
												lineNumber: 595,
												columnNumber: 42
											}, this))]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 593,
											columnNumber: 19
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 592,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (void 0)(Field, {
										label: "Característica / Atributo",
										children: /* @__PURE__ */ (void 0)("select", {
											value: draft.attributeId || "",
											onChange: (e) => setDraftField("attributeId", e.target.value || null, setDraft),
											className: "w-full bg-background border rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
											children: [/* @__PURE__ */ (void 0)("option", {
												value: "",
												children: "Selecione o Atributo..."
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 601,
												columnNumber: 21
											}, this), attributes.map((a) => /* @__PURE__ */ (void 0)("option", {
												value: a.id,
												children: a.name
											}, a.id, false, {
												fileName: _jsxFileName,
												lineNumber: 602,
												columnNumber: 42
											}, this))]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 600,
											columnNumber: 19
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 599,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 582,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (void 0)(Field, {
								label: "Fuso horário (Timezone)",
								children: /* @__PURE__ */ (void 0)(Input, {
									value: draft.timezone,
									onChange: (event) => setDraftField("timezone", event.target.value, setDraft),
									required: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 608,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 607,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (void 0)("div", {
								className: "grid grid-cols-2 gap-4",
								children: [
									/* @__PURE__ */ (void 0)(NumberField, {
										label: "Tamanho do Slot (min)",
										value: draft.slotMinutes,
										onChange: (value) => setDraftField("slotMinutes", value, setDraft)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 612,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (void 0)(NumberField, {
										label: "Duração Padrão (min)",
										value: draft.defaultDurationMinutes,
										onChange: (value) => setDraftField("defaultDurationMinutes", value, setDraft)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 613,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (void 0)(NumberField, {
										label: "Antecedência Mínima (min)",
										value: draft.minAdvanceMinutes,
										onChange: (value) => setDraftField("minAdvanceMinutes", value, setDraft)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 614,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (void 0)(NumberField, {
										label: "Dias Máx. Reservas à frente",
										value: draft.maxDaysAhead,
										onChange: (value) => setDraftField("maxDaysAhead", value, setDraft)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 615,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 611,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (void 0)("div", {
								className: "flex items-center justify-between rounded-xl border bg-card px-4 py-3",
								children: [/* @__PURE__ */ (void 0)("div", {
									className: "flex flex-col gap-0.5",
									children: [/* @__PURE__ */ (void 0)(Label, {
										htmlFor: "active",
										className: "font-semibold text-sm",
										children: "Recurso Ativo"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 620,
										columnNumber: 19
									}, this), /* @__PURE__ */ (void 0)("span", {
										className: "text-[11px] text-muted-foreground",
										children: "Disponível para reservas e consultas da IA"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 621,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 619,
									columnNumber: 17
								}, this), /* @__PURE__ */ (void 0)(Switch, {
									id: "active",
									checked: draft.active,
									onCheckedChange: (value) => setDraftField("active", value, setDraft)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 623,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 618,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (void 0)("div", {
								className: "flex gap-3 pt-4 border-t",
								children: [/* @__PURE__ */ (void 0)(Button, {
									type: "submit",
									disabled: !active || saving,
									className: "flex-1 font-bold",
									children: [saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-1.5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 628,
										columnNumber: 30
									}, this), editing ? "Salvar Alterações" : "Mapear Recurso"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 627,
									columnNumber: 17
								}, this), /* @__PURE__ */ (void 0)(Button, {
									type: "button",
									variant: "outline",
									onClick: () => setIsDrawerOpen(false),
									className: "px-5 font-semibold hover:bg-muted",
									children: "Cancelar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 631,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 626,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 572,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 557,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 553,
				columnNumber: 24
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 348,
		columnNumber: 10
	}, this);
}
function CalendarsCard({ connected, loading, calendars, onRefresh, onConfigure }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
		className: "border bg-card shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
			className: "flex flex-row items-center justify-between gap-3 border-b bg-muted/10 pb-4",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base font-semibold",
				children: "Agendas vinculadas à sua conta Google"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 656,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, {
				className: "text-xs",
				children: "Selecione uma agenda para expor como recurso da IA"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 657,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 655,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				type: "button",
				size: "sm",
				variant: "outline",
				onClick: onRefresh,
				disabled: !connected || loading,
				children: [loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-1.5" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 660,
					columnNumber: 22
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4 mr-1.5" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 660,
					columnNumber: 76
				}, this), "Atualizar Lista"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 659,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 654,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-0",
			children: !connected ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
				title: "Nenhuma conta conectada",
				description: "Por favor, conecte uma conta Google OAuth acima para poder mapear suas agendas.",
				className: "m-6"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 665,
				columnNumber: 23
			}, this) : calendars.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
				title: "Nenhuma agenda encontrada",
				description: "Garantimos acesso às agendas Google da conta conectada. Tente atualizar a lista.",
				className: "m-6"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 665,
				columnNumber: 207
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Nome da Agenda" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 668,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Timezone" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 669,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Nível de Acesso" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 670,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Mapeamento" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 671,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 672,
					columnNumber: 17
				}, this)
			] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 667,
				columnNumber: 15
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 666,
				columnNumber: 13
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: calendars.map((calendar) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
				className: "hover:bg-muted/20",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "font-semibold text-foreground",
						children: calendar.summary
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 678,
						columnNumber: 21
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "max-w-[320px] truncate text-[11px] text-muted-foreground font-mono",
						children: calendar.id
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 679,
						columnNumber: 21
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 677,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
						className: "text-xs",
						children: calendar.timeZone ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 683,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
						className: "text-xs font-semibold capitalize",
						children: calendar.accessRole ?? "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 684,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: calendar.mapped ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
						className: "bg-emerald-50 text-emerald-700 border-emerald-200",
						children: "Mapeado"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 686,
						columnNumber: 40
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
						variant: "outline",
						className: "text-muted-foreground border-muted",
						children: "Não mapeada"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 686,
						columnNumber: 127
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 685,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex justify-end pr-2",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							type: "button",
							size: "sm",
							variant: calendar.mapped ? "secondary" : "outline",
							onClick: () => onConfigure(calendar),
							className: "font-semibold text-xs rounded-xl",
							children: calendar.mapped ? "Editar Configurações" : "Configurar como recurso"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 690,
							columnNumber: 23
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 689,
						columnNumber: 21
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 688,
						columnNumber: 19
					}, this)
				]
			}, calendar.id, true, {
				fileName: _jsxFileName,
				lineNumber: 676,
				columnNumber: 42
			}, this)) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 675,
				columnNumber: 13
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 665,
				columnNumber: 369
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 664,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 653,
		columnNumber: 10
	}, this);
}
function ResourcesCard({ resources, saving, onEdit, onDeactivate }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
		className: "border bg-card shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
			className: "border-b bg-muted/10 pb-4",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
				className: "text-base font-semibold",
				children: "Lista de Recursos Reserváveis"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 714,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, {
				className: "text-xs",
				children: "Recursos mapeados da agenda do Google disponíveis no runtime da IA."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 715,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 713,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "p-0",
			children: resources.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
				title: "Nenhum recurso cadastrado",
				description: "Mapeie suas agendas Google nas abas acima ou crie um recurso manualmente.",
				className: "m-6"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 718,
				columnNumber: 35
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Nome do Recurso" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 721,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Agenda Mapeada" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 722,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Tipo" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 723,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Categoria" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 724,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Duração" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 725,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 726,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 727,
					columnNumber: 17
				}, this)
			] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 720,
				columnNumber: 15
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 719,
				columnNumber: 13
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: resources.map((resource) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
				className: "hover:bg-muted/20",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
						className: "font-semibold text-foreground",
						children: resource.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 732,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
						className: "max-w-[240px] truncate text-[11px] font-mono text-muted-foreground",
						children: resource.calendarId
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 733,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
						variant: "outline",
						className: "capitalize text-xs",
						children: resource.resourceType || "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 737,
						columnNumber: 21
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 736,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
						variant: "outline",
						className: "capitalize text-xs text-primary border-primary/20 bg-primary/5",
						children: resource.sportType || "—"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 742,
						columnNumber: 21
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 741,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
						className: "text-xs font-semibold",
						children: [resource.defaultDurationMinutes, " min"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 746,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: resource.active ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
						className: "bg-emerald-500 hover:bg-emerald-600 text-white font-medium",
						children: "Ativo"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 748,
						columnNumber: 40
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
						variant: "secondary",
						className: "bg-muted text-muted-foreground font-medium",
						children: "Inativo"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 748,
						columnNumber: 134
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 747,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex justify-end gap-1 pr-2",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							type: "button",
							size: "sm",
							variant: "ghost",
							onClick: () => onEdit(resource),
							className: "text-xs font-semibold hover:bg-muted",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-3.5 w-3.5 mr-1" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 753,
								columnNumber: 25
							}, this), " Editar"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 752,
							columnNumber: 23
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							type: "button",
							size: "sm",
							variant: "ghost",
							disabled: !resource.active || saving,
							onClick: () => onDeactivate(resource),
							className: "text-xs font-semibold text-destructive hover:bg-destructive/10",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-3.5 w-3.5 mr-1" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 756,
								columnNumber: 25
							}, this), " Desativar"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 755,
							columnNumber: 23
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 751,
						columnNumber: 21
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 750,
						columnNumber: 19
					}, this)
				]
			}, resource.id, true, {
				fileName: _jsxFileName,
				lineNumber: 731,
				columnNumber: 42
			}, this)) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 730,
				columnNumber: 13
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 718,
				columnNumber: 190
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 717,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 712,
		columnNumber: 10
	}, this);
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
			className: "font-semibold text-xs text-foreground",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 774,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 773,
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
			required: true,
			className: "h-9"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 788,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 787,
		columnNumber: 10
	}, this);
}
function setDraftField(field, value, setDraft) {
	setDraft((current) => ({
		...current,
		[field]: value
	}));
}
function toPayload(draft, installationId) {
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
		active: draft.active,
		resourceTypeId: draft.resourceTypeId || null,
		categoryId: draft.categoryId || null,
		attributeId: draft.attributeId || null,
		installationId: installationId || null
	};
}
function InstallationBadge({ app }) {
	if (!app?.installation) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "outline",
		children: "Não instalado"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 822,
		columnNumber: 12
	}, this);
	if (app.installation.status === "ACTIVE") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		className: "bg-emerald-500 text-white font-medium",
		children: "Instalado e Ativo"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 825,
		columnNumber: 12
	}, this);
	if (app.installation.status === "ERROR") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "destructive",
		className: "font-medium",
		children: "Erro na Extensão"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 828,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "secondary",
		className: "font-medium",
		children: "Desativado"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 830,
		columnNumber: 10
	}, this);
}
function formatDate(value) {
	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short"
	}).format(new Date(value));
}
//#endregion
export { GoogleCalendarAppPage as component };
