import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { t as ThemeProvider } from "./theme-D_Il-GLd.mjs";
import { t as AuthProvider } from "./auth-C7rgJ4xY.mjs";
import { F as useRouter, c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, m as createFileRoute, p as lazyRouteComponent, s as Scripts } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Route$16 } from "../_app.agentes.novo-3Hpuwj3o.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as Route$17 } from "../_app.apps.google-calendar-D_DFMfQ8.mjs";
import { t as Route$18 } from "../_app.testes-DKy9Bpb6.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-CIHE3Gvr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var styles_default = "/assets/styles-DkgS-I9Z.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
var _jsxFileName$1 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/sonner.tsx";
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	}, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 7,
		columnNumber: 5
	}, void 0);
};
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/__root.tsx";
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 22,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 23,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 24,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 28,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 27,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 21,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 20,
		columnNumber: 5
	}, this);
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 50,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 53,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 57,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 66,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 56,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 49,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 48,
		columnNumber: 5
	}, this);
}
var Route$15 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Cubo AI Studio" },
			{
				name: "description",
				content: "Agentes de IA seguros para atendimento multicanal"
			},
			{
				property: "og:title",
				content: "Cubo AI Studio"
			},
			{
				property: "og:description",
				content: "Agentes de IA seguros para atendimento multicanal"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("head", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(HeadContent, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 107,
			columnNumber: 9
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 106,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Scripts, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 111,
			columnNumber: 9
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 109,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 105,
		columnNumber: 5
	}, this);
}
function RootComponent() {
	const { queryClient } = Route$15.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ThemeProvider, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AuthProvider, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Outlet, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 125,
			columnNumber: 11
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Toaster$1, {
			position: "top-right",
			richColors: true
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 126,
			columnNumber: 11
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 123,
			columnNumber: 9
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 122,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 121,
		columnNumber: 5
	}, this);
}
var $$splitComponentImporter$14 = () => import("./auth-BlXsao0G.mjs");
var Route$14 = createFileRoute("/auth")({
	head: () => ({ meta: [{ title: "Entrar · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
var $$splitComponentImporter$13 = () => import("../_app-bi54FRwD.mjs");
var Route$13 = createFileRoute("/_app")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("../_app.index-xamzwdXI.mjs");
var Route$12 = createFileRoute("/_app/")({
	head: () => ({ meta: [{ title: "Dashboard · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("../_app.variaveis-odR5VymM.mjs");
var Route$11 = createFileRoute("/_app/variaveis")({
	head: () => ({ meta: [{ title: "Variáveis · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("../_app.memoria-BbsmZ_II.mjs");
var Route$10 = createFileRoute("/_app/memoria")({
	head: () => ({ meta: [{ title: "Memória · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("../_app.logs-BxLxyisz.mjs");
var Route$9 = createFileRoute("/_app/logs")({
	head: () => ({ meta: [{ title: "Logs · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("../_app.implantacao-t4eDRW1R.mjs");
var Route$8 = createFileRoute("/_app/implantacao")({
	head: () => ({ meta: [{ title: "Assistente de Implantação · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("../_app.flow-BRWj35vG.mjs");
var Route$7 = createFileRoute("/_app/flow")({
	head: () => ({ meta: [{ title: "Flow Builder · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("../_app.ferramentas-DwtFwuFe.mjs");
var Route$6 = createFileRoute("/_app/ferramentas")({
	head: () => ({ meta: [{ title: "Ferramentas · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("../_app.consumo-CU_Iluyd.mjs");
var Route$5 = createFileRoute("/_app/consumo")({
	head: () => ({ meta: [{ title: "Consumo IA · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("../_app.conhecimento-Cb2sf24l.mjs");
var Route$4 = createFileRoute("/_app/conhecimento")({
	head: () => ({ meta: [{ title: "Base de Conhecimento · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("../_app.configuracoes-D_X2FRlM.mjs");
var Route$3 = createFileRoute("/_app/configuracoes")({
	head: () => ({ meta: [{ title: "Configurações · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("../_app.canais-DgX-JuJ9.mjs");
var Route$2 = createFileRoute("/_app/canais")({
	head: () => ({ meta: [{ title: "Canais · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("../_app.apps.index-B82alI-x.mjs");
var Route$1 = createFileRoute("/_app/apps/")({
	head: () => ({ meta: [{ title: "Loja de Aplicativos · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("../_app.agentes.index-D7pSfWy3.mjs");
var Route = createFileRoute("/_app/agentes/")({
	head: () => ({ meta: [{ title: "Assistentes IA · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var AuthRoute = Route$14.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$15
});
var AppRoute = Route$13.update({
	id: "/_app",
	getParentRoute: () => Route$15
});
var AppIndexRoute = Route$12.update({
	id: "/",
	path: "/",
	getParentRoute: () => AppRoute
});
var AppVariaveisRoute = Route$11.update({
	id: "/variaveis",
	path: "/variaveis",
	getParentRoute: () => AppRoute
});
var AppTestesRoute = Route$18.update({
	id: "/testes",
	path: "/testes",
	getParentRoute: () => AppRoute
});
var AppMemoriaRoute = Route$10.update({
	id: "/memoria",
	path: "/memoria",
	getParentRoute: () => AppRoute
});
var AppLogsRoute = Route$9.update({
	id: "/logs",
	path: "/logs",
	getParentRoute: () => AppRoute
});
var AppImplantacaoRoute = Route$8.update({
	id: "/implantacao",
	path: "/implantacao",
	getParentRoute: () => AppRoute
});
var AppFlowRoute = Route$7.update({
	id: "/flow",
	path: "/flow",
	getParentRoute: () => AppRoute
});
var AppFerramentasRoute = Route$6.update({
	id: "/ferramentas",
	path: "/ferramentas",
	getParentRoute: () => AppRoute
});
var AppConsumoRoute = Route$5.update({
	id: "/consumo",
	path: "/consumo",
	getParentRoute: () => AppRoute
});
var AppConhecimentoRoute = Route$4.update({
	id: "/conhecimento",
	path: "/conhecimento",
	getParentRoute: () => AppRoute
});
var AppConfiguracoesRoute = Route$3.update({
	id: "/configuracoes",
	path: "/configuracoes",
	getParentRoute: () => AppRoute
});
var AppCanaisRoute = Route$2.update({
	id: "/canais",
	path: "/canais",
	getParentRoute: () => AppRoute
});
var AppAppsIndexRoute = Route$1.update({
	id: "/apps/",
	path: "/apps/",
	getParentRoute: () => AppRoute
});
var AppAgentesIndexRoute = Route.update({
	id: "/agentes/",
	path: "/agentes/",
	getParentRoute: () => AppRoute
});
var AppAppsGoogleCalendarRoute = Route$17.update({
	id: "/apps/google-calendar",
	path: "/apps/google-calendar",
	getParentRoute: () => AppRoute
});
var AppRouteChildren = {
	AppCanaisRoute,
	AppConfiguracoesRoute,
	AppConhecimentoRoute,
	AppConsumoRoute,
	AppFerramentasRoute,
	AppFlowRoute,
	AppImplantacaoRoute,
	AppLogsRoute,
	AppMemoriaRoute,
	AppTestesRoute,
	AppVariaveisRoute,
	AppIndexRoute,
	AppAgentesNovoRoute: Route$16.update({
		id: "/agentes/novo",
		path: "/agentes/novo",
		getParentRoute: () => AppRoute
	}),
	AppAppsGoogleCalendarRoute,
	AppAgentesIndexRoute,
	AppAppsIndexRoute
};
var rootRouteChildren = {
	AppRoute: AppRoute._addFileChildren(AppRouteChildren),
	AuthRoute
};
var routeTree = Route$15._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
