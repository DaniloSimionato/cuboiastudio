import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { t as ApiError } from "./_ssr/apiClient-DVSvK5lD.mjs";
import { D as PowerOff, Dt as LoaderCircle, E as Power, _ as Settings, gt as CalendarDays, w as RefreshCw } from "./_libs/lucide-react.mjs";
import { g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Badge } from "./_ssr/badge-CXFhyJYg.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { n as ErrorState, r as LoadingState } from "./_ssr/States-Bsft3ipc.mjs";
import { t as appStoreService } from "./_ssr/appStoreService-BJRGwrHX.mjs";
import { t as toast } from "./_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.apps-DBxVcMNh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.apps.tsx?tsr-split=component";
function AppsPage() {
	const [apps, setApps] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [savingSlug, setSavingSlug] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const loadApps = (0, import_react.useCallback)(async () => {
		setLoading(true);
		setError(null);
		try {
			setApps(await appStoreService.listApps());
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível carregar a loja.");
		} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		loadApps();
	}, [loadApps]);
	async function installApp(app) {
		setSavingSlug(app.slug);
		setError(null);
		try {
			const installation = await appStoreService.install(app.slug);
			setApps((current) => current.map((item) => item.id === app.id ? {
				...item,
				installation: {
					id: installation.id,
					status: installation.status,
					credentialsConfigured: installation.credentialsConfigured
				}
			} : item));
			toast.success(`${app.name} instalado.`);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível instalar o aplicativo.");
		} finally {
			setSavingSlug(null);
		}
	}
	async function updateStatus(app, status) {
		if (!app.installation) return;
		setSavingSlug(app.slug);
		setError(null);
		try {
			const installation = await appStoreService.updateInstallationStatus(app.installation.id, status);
			setApps((current) => current.map((item) => item.id === app.id ? {
				...item,
				installation: {
					id: installation.id,
					status: installation.status,
					credentialsConfigured: installation.credentialsConfigured
				}
			} : item));
			toast.success(status === "ACTIVE" ? `${app.name} ativado.` : `${app.name} inativado.`);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o aplicativo.");
		} finally {
			setSavingSlug(null);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Loja de Aplicativos",
			description: "Instale integrações externas por empresa. A IA chama ferramentas internas do CuboIAStudio, e o backend executa as ações nos provedores.",
			actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				type: "button",
				variant: "outline",
				onClick: () => void loadApps(),
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 76,
					columnNumber: 13
				}, this), " Atualizar"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 75,
				columnNumber: 206
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 75,
			columnNumber: 7
		}, this),
		error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
			title: "Não foi possível concluir a ação",
			description: error,
			onRetry: () => void loadApps(),
			className: "mb-4"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 79,
			columnNumber: 16
		}, this) : null,
		loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando aplicativos..." }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 81,
			columnNumber: 18
		}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
			children: apps.map((app) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppCard, {
				app,
				saving: savingSlug === app.slug,
				onInstall: () => void installApp(app),
				onActivate: () => void updateStatus(app, "ACTIVE"),
				onInactivate: () => void updateStatus(app, "INACTIVE")
			}, app.id, false, {
				fileName: _jsxFileName,
				lineNumber: 82,
				columnNumber: 28
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 81,
			columnNumber: 71
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 74,
		columnNumber: 10
	}, this);
}
function AppCard({ app, saving, onInstall, onActivate, onInactivate }) {
	const installed = Boolean(app.installation);
	const active = app.installation?.status === "ACTIVE";
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CalendarDays, { className: "h-5 w-5" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 105,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 104,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(InstallationBadge, { app }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 107,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 103,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
			className: "text-lg",
			children: app.name
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 109,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 102,
		columnNumber: 7
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "min-h-12 text-sm text-muted-foreground",
			children: app.description
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 112,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex flex-wrap gap-2",
			children: !installed ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				type: "button",
				onClick: onInstall,
				disabled: saving,
				children: [saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 115,
					columnNumber: 25
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Power, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 115,
					columnNumber: 72
				}, this), "Instalar"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 114,
				columnNumber: 25
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				asChild: true,
				type: "button",
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
					to: "/apps/google-calendar",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Settings, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 120,
						columnNumber: 19
					}, this), " Configurar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 119,
					columnNumber: 17
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 118,
				columnNumber: 15
			}, this), active ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				type: "button",
				variant: "outline",
				onClick: onInactivate,
				disabled: saving,
				children: [saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 124,
					columnNumber: 29
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PowerOff, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 124,
					columnNumber: 76
				}, this), "Inativar"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 123,
				columnNumber: 25
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				type: "button",
				onClick: onActivate,
				disabled: saving,
				children: [saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 127,
					columnNumber: 29
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Power, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 127,
					columnNumber: 76
				}, this), "Ativar"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 126,
				columnNumber: 29
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 117,
				columnNumber: 25
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 113,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 111,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 101,
		columnNumber: 10
	}, this);
}
function InstallationBadge({ app }) {
	if (!app.installation) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "outline",
		children: "Não instalado"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 141,
		columnNumber: 12
	}, this);
	if (app.installation.status === "ACTIVE") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { children: "Instalado" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 144,
		columnNumber: 12
	}, this);
	if (app.installation.status === "ERROR") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "destructive",
		children: "Erro"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 147,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "secondary",
		children: "Inativo"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 149,
		columnNumber: 10
	}, this);
}
//#endregion
export { AppsPage as component };
