import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { t as ApiError } from "./_ssr/apiClient-Bei-u2-_.mjs";
import { Ct as ArrowUpRight, Nt as Funnel, St as Blocks, _ as Settings, b as Search, w as RefreshCw } from "./_libs/lucide-react.mjs";
import { P as useNavigate, g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { a as CardTitle, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { n as ErrorState, r as LoadingState } from "./_ssr/States-Bsft3ipc.mjs";
import { t as appStoreService } from "./_ssr/appStoreService-B9Syfqys.mjs";
import { t as toast } from "./_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.apps.index-DgH5ZJ7D.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var appBrandIconFiles = {
	google_calendar: "google-calendar",
	gmail: "gmail",
	google_sheets: "google-sheets",
	google_docs: "google-docs",
	google_drive: "google-drive",
	mercado_livre: "mercado-livre",
	shopee: "shopee",
	olx: "olx",
	whatsapp_business: "whatsapp",
	instagram: "instagram",
	facebook_messenger: "facebook-messenger",
	discord: "discord",
	slack: "slack",
	notion: "notion",
	hubspot: "hubspot",
	pipedrive: "pipedrive",
	rd_station: "rd-station",
	trello: "trello",
	asana: "asana",
	zapier: "zapier",
	make: "make",
	chatwoot: "chatwoot",
	webhook: "webhook"
};
function getAppBrandIcon(slug, ext = "png") {
	return `/app-icons/${appBrandIconFiles[slug] ?? "webhook"}.${ext}`;
}
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.apps.index.tsx?tsr-split=component";
function AppsPage() {
	const navigate = useNavigate();
	const [apps, setApps] = (0, import_react.useState)([]);
	const [installations, setInstallations] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [savingSlug, setSavingSlug] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [activeTab, setActiveTab] = (0, import_react.useState)("store");
	const [searchTerm, setSearchTerm] = (0, import_react.useState)("");
	const [selectedCategory, setSelectedCategory] = (0, import_react.useState)("TODOS");
	const [categoryOpen, setCategoryOpen] = (0, import_react.useState)(false);
	const loadApps = (0, import_react.useCallback)(async () => {
		setLoading(true);
		setError(null);
		try {
			const [appsData, instsData] = await Promise.all([appStoreService.listApps(), appStoreService.listInstallations()]);
			setApps(appsData);
			setInstallations(instsData);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível carregar a loja de aplicativos.");
		} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		loadApps();
	}, [loadApps]);
	async function installApp(app) {
		if (app.availability === "COMING_SOON") {
			toast.info("Este aplicativo estará disponível em breve.");
			return;
		}
		setSavingSlug(app.slug);
		setError(null);
		try {
			const installation = await appStoreService.install(app.slug);
			if (app.slug === "google_calendar") {
				toast.success("Redirecionando para configurar a extensão do Google Agenda...");
				navigate({
					to: "/apps/google-calendar",
					search: { installationId: installation.id }
				});
				return;
			}
			toast.success(`${app.name} instalado com sucesso.`);
			await loadApps();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível instalar o aplicativo.");
			toast.error(err instanceof ApiError ? err.message : "Erro na instalação.");
		} finally {
			setSavingSlug(null);
		}
	}
	async function toggleStatus(id, status) {
		try {
			await appStoreService.updateInstallationStatus(id, status);
			toast.success(status === "ACTIVE" ? "Conexão reativada." : "Conexão inativada.");
			await loadApps();
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Erro ao alterar status da conexão.");
		}
	}
	async function deleteInst(id) {
		if (!confirm("Tem certeza que deseja excluir esta conexão definitivamente?")) return;
		try {
			await appStoreService.deleteInstallation(id);
			toast.success("Conexão excluída com sucesso.");
			await loadApps();
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Erro ao excluir conexão.");
		}
	}
	const categories = ["TODOS", ...Array.from(new Set(apps.map((a) => a.category).filter(Boolean)))];
	const filteredApps = apps.filter((app) => {
		const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesCategory = selectedCategory === "TODOS" || app.category === selectedCategory;
		return matchesSearch && matchesCategory;
	});
	const filteredInstallations = installations.filter((inst) => {
		const matchesSearch = inst.app.name.toLowerCase().includes(searchTerm.toLowerCase()) || inst.credentials?.some((c) => c.providerAccountEmail?.toLowerCase().includes(searchTerm.toLowerCase()));
		const matchesCategory = selectedCategory === "TODOS" || inst.app.category === selectedCategory;
		return matchesSearch && matchesCategory;
	});
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
				title: "Loja de Aplicativos",
				description: "Conecte seus aplicativos externos e de produtividade para estender as capacidades da sua IA.",
				actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					type: "button",
					variant: "outline",
					onClick: () => void loadApps(),
					className: "flex items-center gap-2 hover:bg-muted h-9 rounded-lg px-3 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 107,
						columnNumber: 13
					}, this), " Atualizar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 106,
					columnNumber: 163
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 106,
				columnNumber: 7
			}, this),
			error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
				title: "Não foi possível concluir a ação",
				description: error,
				onRetry: () => void loadApps(),
				className: "mb-4"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 110,
				columnNumber: 16
			}, this) : null,
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex bg-muted/60 p-1 rounded-xl w-fit",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
						onClick: () => setActiveTab("store"),
						className: `px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${activeTab === "store" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
						children: "Explorar Loja"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 115,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
						onClick: () => setActiveTab("my_apps"),
						className: `px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center ${activeTab === "my_apps" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
						children: ["Meus Aplicativos", installations.length > 0 && /* @__PURE__ */ (void 0)("span", {
							className: "ml-2 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full font-bold",
							children: installations.length
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 120,
							columnNumber: 42
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 118,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 114,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "relative min-w-[240px]",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 129,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
							type: "text",
							placeholder: "Buscar aplicativos...",
							value: searchTerm,
							onChange: (e) => setSearchTerm(e.target.value),
							className: "w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 130,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 128,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
							onClick: () => setCategoryOpen(!categoryOpen),
							className: "flex items-center justify-between bg-background border border-border rounded-lg text-sm px-3 py-2 min-w-[180px] text-left hover:bg-muted/40 transition-all cursor-pointer h-9 shadow-sm",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "truncate",
								children: selectedCategory === "TODOS" ? "Todas as Categorias" : selectedCategory
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 135,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Funnel, { className: "h-3.5 w-3.5 text-muted-foreground ml-2" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 136,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 134,
							columnNumber: 13
						}, this), categoryOpen && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (void 0)("div", {
							className: "fixed inset-0 z-10",
							onClick: () => setCategoryOpen(false)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 139,
							columnNumber: 17
						}, this), /* @__PURE__ */ (void 0)("div", {
							className: "absolute right-0 mt-1.5 w-full min-w-[200px] bg-white text-slate-800 border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 max-h-[300px] overflow-y-auto",
							children: categories.map((cat) => /* @__PURE__ */ (void 0)("button", {
								onClick: () => {
									setSelectedCategory(cat);
									setCategoryOpen(false);
								},
								className: `w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-slate-100 cursor-pointer ${selectedCategory === cat ? "bg-slate-50 font-bold text-primary" : "font-normal"}`,
								children: cat === "TODOS" ? "Todas as Categorias" : cat
							}, cat, false, {
								fileName: _jsxFileName,
								lineNumber: 141,
								columnNumber: 42
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 140,
							columnNumber: 17
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 138,
							columnNumber: 30
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 133,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 127,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 113,
				columnNumber: 7
			}, this),
			loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando catálogo de aplicativos..." }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 153,
				columnNumber: 18
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: activeTab === "store" ? filteredApps.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-col items-center justify-center py-16 text-center bg-muted/20 border border-dashed rounded-2xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Blocks, { className: "h-12 w-12 text-muted-foreground/60 mb-3 animate-pulse" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 155,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
						className: "text-lg font-semibold text-foreground",
						children: "Nenhum aplicativo encontrado"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 156,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground max-w-sm mt-1",
						children: "Tente redefinir seus filtros ou buscar por outros termos para encontrar aplicativos."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 157,
						columnNumber: 17
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 154,
				columnNumber: 64
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5",
				children: filteredApps.map((app) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppCard, {
					app,
					isInstalled: installations.some((i) => i.appId === app.id),
					saving: savingSlug === app.slug,
					onInstall: () => void installApp(app)
				}, app.id, false, {
					fileName: _jsxFileName,
					lineNumber: 161,
					columnNumber: 42
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 160,
				columnNumber: 24
			}, this) : filteredInstallations.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-col items-center justify-center py-16 text-center bg-muted/20 border border-dashed rounded-2xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Blocks, { className: "h-12 w-12 text-muted-foreground/60 mb-3 animate-pulse" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 163,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
						className: "text-lg font-semibold text-foreground",
						children: "Nenhum aplicativo instalado"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 164,
						columnNumber: 17
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-sm text-muted-foreground max-w-sm mt-1",
						children: "Você ainda não possui instalações ativas nessa categoria ou busca. Explore a loja para adicionar integrações."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 165,
						columnNumber: 17
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 162,
				columnNumber: 61
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5",
				children: filteredInstallations.map((inst) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppInstallationCard, {
					inst,
					onToggleStatus: toggleStatus,
					onDelete: deleteInst
				}, inst.id, false, {
					fileName: _jsxFileName,
					lineNumber: 169,
					columnNumber: 52
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 168,
				columnNumber: 24
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 153,
				columnNumber: 83
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 105,
		columnNumber: 10
	}, this);
}
function AppCard({ app, isInstalled, saving, onInstall }) {
	const isComingSoon = app.availability === "COMING_SOON";
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
		className: `group relative flex flex-col items-center justify-between overflow-hidden border bg-background hover:shadow-md transition-all duration-200 p-3 h-[180px] text-center ${isComingSoon ? "border-muted-foreground/10 opacity-70" : "border-border"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "absolute top-2 right-2",
				children: isInstalled && /* @__PURE__ */ (void 0)("span", {
					className: "bg-emerald-500 text-white text-[8px] py-0.5 px-1.5 rounded-sm font-bold uppercase tracking-wide leading-none",
					children: "Instalado"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 189,
					columnNumber: 25
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 188,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-col items-center space-y-2 mt-4 w-full",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20 border border-muted/5 shadow-sm p-1.5 group-hover:scale-105 transition-all duration-200",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("img", {
						src: getAppBrandIcon(app.slug, "png"),
						alt: "",
						className: "h-11 w-11 object-contain",
						onError: (e) => {
							if (e.currentTarget.src.includes(".png")) e.currentTarget.src = getAppBrandIcon(app.slug, "svg");
							else {
								e.currentTarget.style.display = "none";
								const parent = e.currentTarget.parentElement;
								if (parent) {
									if (!parent.querySelector(".fallback-icon")) {
										const fallback = document.createElement("div");
										fallback.className = "fallback-icon flex items-center justify-center bg-muted rounded-xl text-muted-foreground w-full h-full";
										fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-blocks"><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77l.72.16a2 2 0 0 0 2-1.34L11.72 1a2 2 0 0 1 3.56 0l.37 1.67a2 2 0 0 0 2 1.34l.72-.16a4 4 0 0 1 4.78 4.77l-.16.72a2 2 0 0 0 1.34 2l1.67.37a2 2 0 0 1 0 3.56l-1.67.37a2 2 0 0 0-1.34 2l.16.72a4 4 0 0 1-4.78 4.77l-.72-.16a2 2 0 0 0-2 1.34l-.37 1.67a2 2 0 0 1-3.56 0l-.37-1.67a2 2 0 0 0-2-1.34l-.72.16a4 4 0 0 1-4.78-4.77l.16-.72a2 2 0 0 0-1.34-2l-1.67-.37a2 2 0 0 1 0-3.56l1.67-.37a2 2 0 0 0 1.34-2l-.16-.72Z"/></svg>`;
										parent.appendChild(fallback);
									}
								}
							}
						}
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 198,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 197,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "space-y-0.5 w-full",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-xs font-bold tracking-tight text-foreground truncate px-1",
						children: app.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 219,
						columnNumber: 11
					}, this), app.category && /* @__PURE__ */ (void 0)("span", {
						className: "text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block",
						children: app.category
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 222,
						columnNumber: 28
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 218,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 195,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "w-full mt-1",
				children: isComingSoon ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					disabled: true,
					className: "w-full bg-muted text-muted-foreground h-7 py-0.5 rounded-md text-[10px] font-bold cursor-not-allowed border-none",
					children: "Em breve"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 230,
					columnNumber: 25
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					type: "button",
					onClick: onInstall,
					disabled: saving,
					className: "w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1 h-7 py-0.5 rounded-md text-[10px] font-bold shadow-sm transition-all duration-200 cursor-pointer border-none",
					children: [saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-3 w-3 animate-spin" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 233,
						columnNumber: 23
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowUpRight, { className: "h-3 w-3" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 233,
						columnNumber: 72
					}, this), "Adicionar app"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 232,
					columnNumber: 23
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 229,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 186,
		columnNumber: 10
	}, this);
}
function getInstallationStatusLabel(inst) {
	if (inst.status === "INACTIVE") return {
		text: "Inativo",
		color: "bg-slate-400 text-white"
	};
	if (inst.status === "ERROR") return {
		text: "Erro",
		color: "bg-red-500 text-white"
	};
	if (inst.credentialsConfigured) return {
		text: "Conectado",
		color: "bg-emerald-500 text-white"
	};
	return {
		text: "Desconectado",
		color: "bg-amber-500 text-white"
	};
}
function AppInstallationCard({ inst, onToggleStatus, onDelete }) {
	const email = inst.providerAccountEmail;
	const statusInfo = getInstallationStatusLabel(inst);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
		className: "group relative flex flex-col items-center justify-between overflow-hidden border border-border bg-background hover:shadow-md transition-all duration-200 p-3 h-[180px] text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "absolute top-2 right-2",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: `text-[8px] py-0.5 px-1.5 rounded-sm font-bold uppercase tracking-wide leading-none ${statusInfo.color}`,
					children: statusInfo.text
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 273,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 272,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-col items-center space-y-2 mt-4 w-full",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20 border border-muted/5 shadow-sm p-1.5 group-hover:scale-105 transition-all duration-200",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("img", {
						src: getAppBrandIcon(inst.app.slug, "png"),
						alt: "",
						className: "h-11 w-11 object-contain",
						onError: (e) => {
							if (e.currentTarget.src.includes(".png")) e.currentTarget.src = getAppBrandIcon(inst.app.slug, "svg");
							else {
								e.currentTarget.style.display = "none";
								const parent = e.currentTarget.parentElement;
								if (parent) {
									if (!parent.querySelector(".fallback-icon")) {
										const fallback = document.createElement("div");
										fallback.className = "fallback-icon flex items-center justify-center bg-muted rounded-xl text-muted-foreground w-full h-full";
										fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-blocks"><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77l.72.16a2 2 0 0 0 2-1.34L11.72 1a2 2 0 0 1 3.56 0l.37 1.67a2 2 0 0 0 2 1.34l.72-.16a4 4 0 0 1 4.78 4.77l-.16.72a2 2 0 0 0 1.34 2l1.67.37a2 2 0 0 1 0 3.56l-1.67.37a2 2 0 0 0-1.34 2l.16.72a4 4 0 0 1-4.78 4.77l-.72-.16a2 2 0 0 0-2 1.34l-.37 1.67a2 2 0 0 1-3.56 0l-.37-1.67a2 2 0 0 0-2-1.34l-.72.16a4 4 0 0 1-4.78-4.77l.16-.72a2 2 0 0 0-1.34-2l-1.67-.37a2 2 0 0 1 0-3.56l1.67-.37a2 2 0 0 0 1.34-2l-.16-.72Z"/></svg>`;
										parent.appendChild(fallback);
									}
								}
							}
						}
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 282,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 281,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "space-y-0.5 w-full",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-xs font-bold tracking-tight text-foreground truncate px-1",
						children: inst.app.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 303,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "text-[9px] text-muted-foreground font-medium truncate block px-2",
						children: email || "Conta ainda não conectada"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 306,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 302,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 279,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "w-full mt-1 flex gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						asChild: true,
						type: "button",
						className: "flex-1 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1 h-7 py-0.5 rounded-md text-[10px] font-bold shadow-sm transition-all duration-200 cursor-pointer border-none",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
							to: inst.app.slug === "google_calendar" ? "/apps/google-calendar" : `/apps/${inst.app.slug}`,
							search: { installationId: inst.id },
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Settings, { className: "h-3 w-3 mr-0.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 318,
								columnNumber: 13
							}, this), " Configurar"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 315,
							columnNumber: 11
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 314,
						columnNumber: 9
					}, this),
					inst.status === "ACTIVE" && inst.credentialsConfigured && /* @__PURE__ */ (void 0)(Button, {
						type: "button",
						variant: "outline",
						onClick: () => void onToggleStatus(inst.id, "INACTIVE"),
						className: "px-2 h-7 py-0.5 rounded-md text-[10px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer",
						children: "Inativar"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 322,
						columnNumber: 68
					}, this),
					inst.status === "ACTIVE" && !inst.credentialsConfigured && /* @__PURE__ */ (void 0)(Button, {
						type: "button",
						variant: "destructive",
						onClick: () => void onDelete(inst.id),
						className: "px-2 h-7 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 hover:bg-rose-600 text-white cursor-pointer border-none",
						children: "Excluir"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 326,
						columnNumber: 69
					}, this),
					inst.status === "INACTIVE" && /* @__PURE__ */ (void 0)(Button, {
						type: "button",
						onClick: () => void onToggleStatus(inst.id, "ACTIVE"),
						className: "px-2 h-7 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer border-none",
						children: "Reativar"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 330,
						columnNumber: 40
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 313,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 270,
		columnNumber: 10
	}, this);
}
//#endregion
export { AppsPage as component };
