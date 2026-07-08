import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { n as useTheme } from "./_ssr/theme-D_Il-GLd.mjs";
import { n as useAuth } from "./_ssr/auth-C7rgJ4xY.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { t as companiesService } from "./_ssr/companiesService-BvflQGn-.mjs";
import { t as currentCompanyService } from "./_ssr/currentCompanyService-CeW1PXo7.mjs";
import { At as Sparkles, B as LogOut, E as Radio, F as Moon, Ft as CirclePlay, H as LayoutDashboard, J as GitBranch, Mt as LoaderCircle, Rt as ChartColumn, S as ScrollText, St as BookOpen, a as User, bt as Brain, dt as ChevronsRight, ft as ChevronsLeft, gt as ChevronDown, k as Plus, m as Store, n as Wrench, p as Sun, v as Settings, w as Rocket, xt as Bot, zt as Braces } from "./_libs/lucide-react.mjs";
import { n as AvatarFallback$1, r as AvatarImage$1, t as Avatar$1 } from "./_libs/@radix-ui/react-avatar+[...].mjs";
import { a as DropdownMenuSeparator, c as TooltipContent, i as DropdownMenuLabel, l as TooltipProvider, n as DropdownMenuContent, o as DropdownMenuTrigger, r as DropdownMenuItem, s as Tooltip, t as DropdownMenu, u as TooltipTrigger } from "./_ssr/tooltip-JDz4WYjb.mjs";
import { P as useNavigate, f as Outlet, g as Link, l as useRouterState } from "./_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app-bi54FRwD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName$4 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/lib/sidebar-context.tsx";
var SidebarCtx = (0, import_react.createContext)(null);
var KEY = "cubo-ai-sidebar-collapsed";
function SidebarProvider({ children }) {
	const [collapsed, setCollapsed] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem(KEY);
			if (raw) setCollapsed(raw === "1");
		} catch (error) {}
	}, []);
	(0, import_react.useEffect)(() => {
		try {
			localStorage.setItem(KEY, collapsed ? "1" : "0");
		} catch (error) {}
	}, [collapsed]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SidebarCtx.Provider, {
		value: {
			collapsed,
			toggle: () => setCollapsed((c) => !c),
			setCollapsed
		},
		children
	}, void 0, false, {
		fileName: _jsxFileName$4,
		lineNumber: 29,
		columnNumber: 5
	}, this);
}
function useSidebar() {
	const ctx = (0, import_react.useContext)(SidebarCtx);
	if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
	return ctx;
}
var _jsxFileName$3 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/layout/Sidebar.tsx";
var items = [
	{
		to: "/",
		label: "Dashboard",
		icon: LayoutDashboard
	},
	{
		to: "/agentes",
		label: "Assistentes IA",
		icon: Bot
	},
	{
		to: "/conhecimento",
		label: "Base de Conhecimento",
		icon: BookOpen
	},
	{
		to: "/ferramentas",
		label: "Ferramentas",
		icon: Wrench
	},
	{
		to: "/flow",
		label: "Flow Builder",
		icon: GitBranch
	},
	{
		to: "/canais",
		label: "Canais",
		icon: Radio
	},
	{
		to: "/apps",
		label: "Apps",
		icon: Store
	},
	{
		to: "/implantacao",
		label: "Assistente de Implantação",
		icon: Rocket
	},
	{
		to: "/consumo",
		label: "Consumo IA",
		icon: ChartColumn
	},
	{
		to: "/testes",
		label: "Testes",
		icon: CirclePlay
	},
	{
		to: "/logs",
		label: "Logs",
		icon: ScrollText
	},
	{
		to: "/variaveis",
		label: "Variáveis",
		icon: Braces
	},
	{
		to: "/memoria",
		label: "Memória",
		icon: Brain
	},
	{
		to: "/configuracoes",
		label: "Configurações",
		icon: Settings
	}
];
function Sidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { collapsed, toggle } = useSidebar();
	const [company, setCompany] = (0, import_react.useState)(null);
	const [companies, setCompanies] = (0, import_react.useState)([]);
	const [switchingCompanyId, setSwitchingCompanyId] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		Promise.all([currentCompanyService.get(), companiesService.list()]).then(([currentResponse, companiesResponse]) => {
			if (!cancelled) {
				setCompany(currentResponse.company);
				setCompanies(companiesResponse);
			}
		}).catch(() => {
			if (!cancelled) {
				setCompany(null);
				setCompanies([]);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);
	const handleRefresh = () => {
		Promise.all([currentCompanyService.get(), companiesService.list()]).then(([currentResponse, companiesResponse]) => {
			setCompany(currentResponse.company);
			setCompanies(companiesResponse);
		});
	};
	const handleSwitchCompany = (companyId) => {
		setSwitchingCompanyId(companyId);
		companiesService.setActive(companyId).then((response) => {
			setCompany(response.company);
			window.location.reload();
		}).finally(() => {
			setSwitchingCompanyId(null);
		});
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipProvider, {
		delayDuration: 100,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("aside", {
			className: cn("h-full shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col transition-[width] duration-200", collapsed ? "w-16" : "w-64"),
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: cn("h-16 flex items-center gap-2 border-b", collapsed ? "px-3 justify-center" : "px-5"),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-5 w-5" }, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 121,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 120,
						columnNumber: 11
					}, this), !collapsed && /* @__PURE__ */ (void 0)("div", {
						className: "leading-tight flex-1 min-w-0",
						children: [/* @__PURE__ */ (void 0)("div", {
							className: "font-bold text-sm truncate",
							children: "Cubo AI Studio"
						}, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 125,
							columnNumber: 15
						}, this), /* @__PURE__ */ (void 0)("div", {
							className: "text-[10px] text-muted-foreground",
							children: "Módulo IA · Cubo.Chat"
						}, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 126,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 124,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$3,
					lineNumber: 114,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: cn("border-b px-2 py-3", collapsed ? "px-2" : "px-3"),
					children: collapsed ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "outline",
							className: "h-10 w-full rounded-xl border-sidebar-border bg-sidebar-accent/40 px-0 text-sidebar-foreground",
							"aria-label": company?.name ?? "Tenant atual",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "text-xs font-semibold",
								children: (company?.name ?? "TA").slice(0, 2)
							}, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 140,
								columnNumber: 19
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 135,
							columnNumber: 17
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 134,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipContent, {
						side: "right",
						children: company?.name ?? "Tenant atual"
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 145,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 133,
						columnNumber: 13
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "outline",
							className: "h-11 w-full justify-between rounded-xl border-sidebar-border bg-sidebar-accent/40 px-3 text-left text-sidebar-foreground shadow-sm",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "min-w-0 text-left",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "truncate text-sm font-medium",
									children: company?.name ?? "Tenant atual"
								}, void 0, false, {
									fileName: _jsxFileName$3,
									lineNumber: 155,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "truncate text-[10px] text-muted-foreground",
									children: "Empresa ativa"
								}, void 0, false, {
									fileName: _jsxFileName$3,
									lineNumber: 158,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$3,
								lineNumber: 154,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronDown, { className: "h-4 w-4 shrink-0 opacity-70" }, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 160,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$3,
							lineNumber: 150,
							columnNumber: 17
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 149,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuContent, {
						align: "start",
						className: "w-64",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuLabel, { children: "Empresas acessíveis" }, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 164,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuSeparator, {}, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 165,
								columnNumber: 17
							}, this),
							companies.length > 0 ? companies.map((item) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
								disabled: switchingCompanyId === item.id,
								onClick: () => handleSwitchCompany(item.id),
								children: [item.name, item.id === company?.id ? " · ativa" : ""]
							}, item.id, true, {
								fileName: _jsxFileName$3,
								lineNumber: 168,
								columnNumber: 21
							}, this)) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
								disabled: true,
								children: company?.name ?? "Backend indisponível"
							}, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 178,
								columnNumber: 19
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuSeparator, {}, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 180,
								columnNumber: 17
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
								onClick: handleRefresh,
								children: "Atualizar tenant"
							}, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 181,
								columnNumber: 17
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 163,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 148,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 131,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("nav", {
					className: cn("flex-1 overflow-y-auto py-3 space-y-0.5", collapsed ? "px-2" : "px-2"),
					children: items.map((it) => {
						const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
						const Icon = it.icon;
						const linkEl = /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
							to: it.to,
							className: cn("flex items-center gap-3 rounded-lg text-sm transition-colors", collapsed ? "justify-center p-2.5" : "px-3 py-2", active ? "bg-primary text-primary-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent"),
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4 shrink-0" }, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 205,
								columnNumber: 17
							}, this), !collapsed && /* @__PURE__ */ (void 0)("span", {
								className: "truncate",
								children: it.label
							}, void 0, false, {
								fileName: _jsxFileName$3,
								lineNumber: 206,
								columnNumber: 32
							}, this)]
						}, it.to, true, {
							fileName: _jsxFileName$3,
							lineNumber: 194,
							columnNumber: 15
						}, this);
						return collapsed ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipTrigger, {
							asChild: true,
							children: linkEl
						}, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 211,
							columnNumber: 17
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipContent, {
							side: "right",
							children: it.label
						}, void 0, false, {
							fileName: _jsxFileName$3,
							lineNumber: 212,
							columnNumber: 17
						}, this)] }, it.to, true, {
							fileName: _jsxFileName$3,
							lineNumber: 210,
							columnNumber: 15
						}, this) : linkEl;
					})
				}, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 189,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
					onClick: toggle,
					className: cn("border-t flex items-center gap-2 text-xs text-muted-foreground hover:bg-sidebar-accent transition-colors", collapsed ? "justify-center p-3" : "px-4 py-3"),
					"aria-label": collapsed ? "Expandir menu" : "Recolher menu",
					children: collapsed ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronsRight, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 229,
						columnNumber: 13
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronsLeft, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName$3,
						lineNumber: 232,
						columnNumber: 15
					}, this), " Recolher"] }, void 0, true, {
						fileName: _jsxFileName$3,
						lineNumber: 231,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$3,
					lineNumber: 220,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$3,
			lineNumber: 108,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$3,
		lineNumber: 107,
		columnNumber: 5
	}, this);
}
var _jsxFileName$2 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/avatar.tsx";
var Avatar = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Avatar$1, {
	ref,
	className: cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 12,
	columnNumber: 3
}, void 0));
Avatar.displayName = Avatar$1.displayName;
var AvatarImage = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AvatarImage$1, {
	ref,
	className: cn("aspect-square h-full w-full", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 24,
	columnNumber: 3
}, void 0));
AvatarImage.displayName = AvatarImage$1.displayName;
var AvatarFallback = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AvatarFallback$1, {
	ref,
	className: cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName$2,
	lineNumber: 36,
	columnNumber: 3
}, void 0));
AvatarFallback.displayName = AvatarFallback$1.displayName;
var _jsxFileName$1 = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/layout/Topbar.tsx";
function Topbar() {
	const { theme, toggle } = useTheme();
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const initials = (0, import_react.useMemo)(() => (user?.nome || "OP").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(), [user?.nome]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("header", {
		className: "h-16 border-b bg-card flex items-center gap-3 px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "flex-1" }, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 36,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "outline",
				size: "icon",
				onClick: toggle,
				"aria-label": theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro",
				children: theme === "dark" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sun, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 44,
					columnNumber: 29
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Moon, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 44,
					columnNumber: 59
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 38,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				asChild: true,
				className: "gap-2",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
					to: "/agentes/novo",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 49,
						columnNumber: 11
					}, this), "Novo Agente"]
				}, void 0, true, {
					fileName: _jsxFileName$1,
					lineNumber: 48,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 47,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
					className: "rounded-full focus:outline-none focus:ring-2 focus:ring-ring",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Avatar, {
						className: "h-9 w-9",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AvatarFallback, {
							className: "bg-primary text-primary-foreground text-xs",
							children: initials
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 58,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 57,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName$1,
					lineNumber: 56,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 55,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuContent, {
				align: "end",
				className: "w-56",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuLabel, {
						className: "flex flex-col",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "text-sm",
							children: user?.nome ?? "Operador"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 66,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "text-xs font-normal text-muted-foreground truncate",
							children: user?.email ?? ""
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 67,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 65,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuSeparator, {}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 71,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
							to: "/configuracoes",
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(User, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName$1,
								lineNumber: 74,
								columnNumber: 15
							}, this), " Minha conta"]
						}, void 0, true, {
							fileName: _jsxFileName$1,
							lineNumber: 73,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 72,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
						onClick: () => {
							logout();
							if (user?.id?.startsWith("stg-usr-")) window.location.href = "/staging/logout";
							else navigate({ to: "/auth" });
						},
						className: "text-destructive focus:text-destructive",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LogOut, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 88,
							columnNumber: 13
						}, this), " Sair"]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 77,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 64,
				columnNumber: 9
			}, this)] }, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 54,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 35,
		columnNumber: 5
	}, this);
}
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.tsx?tsr-split=component";
function AppLayout() {
	const { isAuthenticated, loading } = useAuth();
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (!loading && !isAuthenticated) navigate({ to: "/auth" });
	}, [
		loading,
		isAuthenticated,
		navigate
	]);
	(0, import_react.useEffect)(() => {
		if (isAuthenticated) {
			document.body.style.overflow = "hidden";
			document.body.style.height = "100vh";
			return () => {
				document.body.style.overflow = "";
				document.body.style.height = "";
			};
		}
	}, [isAuthenticated]);
	if (loading || !isAuthenticated) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "min-h-screen grid place-items-center bg-background text-muted-foreground",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-6 w-6 animate-spin" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 31,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 30,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SidebarProvider, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "h-screen overflow-hidden flex bg-background text-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sidebar, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 36,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex-1 flex flex-col min-w-0 min-h-0",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Topbar, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 38,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("main", {
				className: "flex-1 min-h-0 overflow-y-auto p-6",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Outlet, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 40,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 39,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 37,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 35,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 34,
		columnNumber: 10
	}, this);
}
//#endregion
export { AppLayout as component };
