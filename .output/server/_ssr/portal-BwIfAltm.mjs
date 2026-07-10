import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { n as useAuth } from "./auth-DYnTR_ad.mjs";
import { t as Button } from "./button-TeH4yfmP.mjs";
import { n as apiFetch } from "./apiClient-DG1jAm9p.mjs";
import { t as companiesService } from "./companiesService-U13G7e0M.mjs";
import { A as Power, At as UserRound, Bt as CircleCheck, E as RotateCcw, Et as ArrowRight, Ft as LoaderCircle, M as Plus, Nt as Sparkles, P as Pencil, U as LogOut, a as Users, bt as Building2, f as Trash2, ht as ChevronRight, jt as TriangleAlert, v as ShieldCheck } from "../_libs/lucide-react.mjs";
import { P as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Badge } from "./badge-CXFhyJYg.mjs";
import { t as Input } from "./input-B8Ml971c.mjs";
import { n as CardContent, t as Card } from "./card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-vCNF5d_j.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-BQR4UioY.mjs";
import { t as Label } from "./label-BZdmkwq8.mjs";
import { t as Switch } from "./switch-Cit-Q60v.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-Bfe67_Ib.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-BVRpIYgP.mjs";
import { a as SheetHeader, i as SheetFooter, n as SheetContent, o as SheetTitle, r as SheetDescription, t as Sheet } from "./sheet-C9KaKAS6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/portal-BwIfAltm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var studioUsersService = {
	async list() {
		return (await apiFetch("/studio-users")).items;
	},
	create(payload) {
		return apiFetch("/studio-users", {
			method: "POST",
			body: JSON.stringify(payload)
		});
	},
	update(id, payload) {
		return apiFetch(`/studio-users/${id}`, {
			method: "PATCH",
			body: JSON.stringify(payload)
		});
	}
};
async function accessCompany(input) {
	input.setLoadingCompanyId(input.companyId);
	try {
		if (input.activeCompanyId !== input.companyId) await input.setActive(input.companyId);
		if ((await input.refreshUser())?.activeCompanyId !== input.companyId) throw new Error("A empresa ativa não foi confirmada. Tente novamente.");
		await input.navigate();
	} finally {
		input.setLoadingCompanyId(null);
	}
}
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/portal.tsx?tsr-split=component";
var EMPTY_COMPANY = {
	name: "",
	legalName: "",
	document: "",
	status: "ACTIVE",
	createDemoAssistant: false
};
var EMPTY_USER = {
	name: "",
	email: "",
	temporaryPassword: "",
	status: "ACTIVE",
	globalRole: "STUDIO_VIEWER",
	memberships: {}
};
function PortalPage() {
	const { isAuthenticated, loading, user, refreshUser, logout } = useAuth();
	const navigate = useNavigate();
	const [companies, setCompanies] = (0, import_react.useState)([]);
	const [studioUsers, setStudioUsers] = (0, import_react.useState)([]);
	const [pageLoading, setPageLoading] = (0, import_react.useState)(true);
	const [usersLoading, setUsersLoading] = (0, import_react.useState)(false);
	const [enteringCompanyId, setEnteringCompanyId] = (0, import_react.useState)(null);
	const [companySheetOpen, setCompanySheetOpen] = (0, import_react.useState)(false);
	const [userSheetOpen, setUserSheetOpen] = (0, import_react.useState)(false);
	const [savingCompany, setSavingCompany] = (0, import_react.useState)(false);
	const [savingUser, setSavingUser] = (0, import_react.useState)(false);
	const [companyActionId, setCompanyActionId] = (0, import_react.useState)(null);
	const [deleteTarget, setDeleteTarget] = (0, import_react.useState)(null);
	const [deleteConfirmation, setDeleteConfirmation] = (0, import_react.useState)("");
	const [editingCompany, setEditingCompany] = (0, import_react.useState)(null);
	const [editingUser, setEditingUser] = (0, import_react.useState)(null);
	const [companyForm, setCompanyForm] = (0, import_react.useState)(EMPTY_COMPANY);
	const [userForm, setUserForm] = (0, import_react.useState)(EMPTY_USER);
	const canManageCompanies = Boolean(user?.permissions?.includes("companies:manage"));
	const canManageUsers = Boolean(user?.permissions?.includes("users:manage"));
	const canDeleteCompanies = Boolean(user?.roles?.includes("studio_admin"));
	const activeCompany = companies.find((company) => company.isActiveContext);
	(0, import_react.useEffect)(() => {
		if (!loading && !isAuthenticated) navigate({
			to: "/auth",
			replace: true
		});
	}, [
		isAuthenticated,
		loading,
		navigate
	]);
	const loadCompanies = async () => {
		setPageLoading(true);
		try {
			setCompanies(await companiesService.list());
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Não foi possível carregar as empresas.");
		} finally {
			setPageLoading(false);
		}
	};
	const loadUsers = async () => {
		if (!canManageUsers) return;
		setUsersLoading(true);
		try {
			setStudioUsers(await studioUsersService.list());
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Não foi possível carregar os usuários.");
		} finally {
			setUsersLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		if (isAuthenticated) {
			loadCompanies();
			loadUsers();
		}
	}, [isAuthenticated, canManageUsers]);
	const openCompany = (company) => {
		setEditingCompany(company ?? null);
		setCompanyForm(company ? {
			name: company.name,
			legalName: company.legalName ?? "",
			document: company.document ?? "",
			status: company.status,
			createDemoAssistant: false
		} : EMPTY_COMPANY);
		setCompanySheetOpen(true);
	};
	const saveCompany = async () => {
		if (!companyForm.name.trim()) {
			toast.error("Informe o nome da empresa.");
			return;
		}
		setSavingCompany(true);
		try {
			const payload = {
				name: companyForm.name.trim(),
				legalName: companyForm.legalName.trim() || void 0,
				document: companyForm.document.trim() || void 0,
				status: companyForm.status,
				...!editingCompany ? { createDemoAssistant: companyForm.createDemoAssistant } : {}
			};
			if (editingCompany) {
				await companiesService.update(editingCompany.id, payload);
				toast.success("Empresa atualizada.");
			} else {
				await companiesService.create(payload);
				toast.success("Empresa criada. Use “Acessar” quando quiser entrar no tenant.");
			}
			setCompanySheetOpen(false);
			await loadCompanies();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Não foi possível salvar a empresa.");
		} finally {
			setSavingCompany(false);
		}
	};
	const enterCompany = async (company) => {
		if (company.status !== "ACTIVE") {
			toast.info("Reative a empresa para acessar.");
			return;
		}
		if (enteringCompanyId) return;
		try {
			await accessCompany({
				companyId: company.id,
				activeCompanyId: user?.activeCompanyId ?? null,
				setActive: companiesService.setActive,
				refreshUser,
				navigate: () => navigate({ to: "/dashboard" }),
				setLoadingCompanyId: setEnteringCompanyId
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Não foi possível acessar a empresa.");
		}
	};
	const toggleCompanyStatus = async (company) => {
		const nextStatus = company.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
		setCompanyActionId(company.id);
		try {
			await companiesService.update(company.id, { status: nextStatus });
			await refreshUser();
			await loadCompanies();
			toast.success(nextStatus === "ACTIVE" ? "Empresa reativada." : "Empresa inativada.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Não foi possível alterar a empresa.");
		} finally {
			setCompanyActionId(null);
		}
	};
	const deleteCompany = async () => {
		if (!deleteTarget || deleteConfirmation.trim() !== deleteTarget.name) {
			toast.error("Digite o nome exato da empresa para confirmar.");
			return;
		}
		setCompanyActionId(deleteTarget.id);
		try {
			await companiesService.remove(deleteTarget.id);
			setDeleteTarget(null);
			setDeleteConfirmation("");
			await refreshUser();
			await loadCompanies();
			toast.success("Empresa e dados vinculados foram excluídos.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Não foi possível excluir a empresa.");
		} finally {
			setCompanyActionId(null);
		}
	};
	const openUser = (studioUser) => {
		setEditingUser(studioUser ?? null);
		setUserForm(studioUser ? {
			name: studioUser.name,
			email: studioUser.email,
			temporaryPassword: "",
			status: studioUser.status,
			globalRole: studioUser.globalRole,
			memberships: Object.fromEntries(studioUser.memberships.map((membership) => [membership.companyId, membership.role]))
		} : EMPTY_USER);
		setUserSheetOpen(true);
	};
	const saveUser = async () => {
		if (!userForm.name.trim() || !userForm.email.trim()) {
			toast.error("Informe nome e e-mail.");
			return;
		}
		if (!editingUser && userForm.temporaryPassword.length < 8) {
			toast.error("A senha temporária deve ter pelo menos 8 caracteres.");
			return;
		}
		setSavingUser(true);
		try {
			const payload = {
				name: userForm.name.trim(),
				email: userForm.email.trim().toLowerCase(),
				status: userForm.status,
				globalRole: userForm.globalRole,
				memberships: Object.entries(userForm.memberships).map(([companyId, role]) => ({
					companyId,
					role
				})),
				...userForm.temporaryPassword ? { temporaryPassword: userForm.temporaryPassword } : {}
			};
			if (editingUser) {
				await studioUsersService.update(editingUser.id, payload);
				toast.success("Usuário atualizado.");
			} else {
				await studioUsersService.create({
					...payload,
					temporaryPassword: userForm.temporaryPassword
				});
				toast.success("Usuário criado e pronto para acessar o Studio.");
			}
			setUserSheetOpen(false);
			await loadUsers();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Não foi possível salvar o usuário.");
		} finally {
			setSavingUser(false);
		}
	};
	if (loading || !isAuthenticated) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "studio-portal-surface grid min-h-screen place-items-center bg-[#f7f9fc]",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-center gap-2 text-sm font-medium text-slate-500",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin text-blue-600" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 268,
				columnNumber: 11
			}, this), "Carregando Portal do Studio"]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 267,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 266,
		columnNumber: 12
	}, this);
	const activeUsers = studioUsers.filter((studioUser) => studioUser.status === "ACTIVE").length;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("main", {
		className: "studio-portal-surface min-h-screen bg-[#f7f9fc] text-slate-950",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_18%_0%,rgba(37,99,235,0.09),transparent_38%),radial-gradient(circle_at_78%_0%,rgba(14,165,233,0.06),transparent_34%)]" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 275,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("header", {
				className: "relative border-b border-slate-200/80 bg-white/85 backdrop-blur-xl",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)]",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-4.5 w-4.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 281,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 280,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "leading-tight",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-sm font-semibold tracking-tight text-slate-950",
								children: "Cubo AI Studio"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 284,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-[11px] font-medium text-slate-400",
								children: "Portal global"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 287,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 283,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 279,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "hidden items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3 sm:flex",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-700",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserRound, { className: "h-3.5 w-3.5" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 293,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 292,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "max-w-40 truncate text-xs font-medium text-slate-700",
								children: user?.nome
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 295,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 291,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "ghost",
							size: "icon",
							className: "rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900",
							onClick: logout,
							"aria-label": "Sair",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LogOut, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 300,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 299,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 290,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 278,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 277,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", {
						className: "mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShieldCheck, { className: "h-3.5 w-3.5" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 310,
									columnNumber: 15
								}, this), "Administração do Studio"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 309,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
								className: "text-2xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-[28px]",
								children: "Portal do Studio"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 313,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mt-1.5 text-sm text-slate-500",
								children: "Gerencie empresas, usuários e acessos do Cubo AI Studio."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 316,
								columnNumber: 13
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 308,
							columnNumber: 11
						}, this), canManageCompanies && /* @__PURE__ */ (void 0)(Button, {
							onClick: () => openCompany(),
							className: "h-10 rounded-xl bg-blue-600 px-4 text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)] hover:bg-blue-700",
							children: [/* @__PURE__ */ (void 0)(Plus, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 321,
								columnNumber: 15
							}, this), "Nova empresa"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 320,
							columnNumber: 34
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 307,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", {
						className: "mb-6 grid gap-3 sm:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Metric, {
								icon: Building2,
								label: "Empresas cadastradas",
								value: String(companies.length),
								detail: companies.length === 1 ? "tenant disponível" : "tenants disponíveis",
								tone: "blue"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 327,
								columnNumber: 11
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Metric, {
								icon: Users,
								label: "Usuários ativos",
								value: canManageUsers ? String(activeUsers) : "—",
								detail: canManageUsers ? `${studioUsers.length} no total` : "acesso restrito",
								tone: "cyan"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 328,
								columnNumber: 11
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Metric, {
								icon: CircleCheck,
								label: "Empresa ativa",
								value: activeCompany?.name ?? "Nenhuma",
								detail: activeCompany ? "contexto operacional atual" : "selecione uma empresa",
								tone: "emerald"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 329,
								columnNumber: 11
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 326,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tabs, {
						defaultValue: "companies",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
							className: "overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-slate-950 shadow-[0_12px_36px_rgba(15,23,42,0.055)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsList, {
										className: "h-9 justify-start rounded-lg bg-slate-100 p-1 text-slate-500",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
											value: "companies",
											className: "h-7 rounded-md px-3.5 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Building2, { className: "mr-1.5 h-3.5 w-3.5" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 337,
												columnNumber: 19
											}, this), "Empresas"]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 336,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
											value: "users",
											className: "h-7 rounded-md px-3.5 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Users, { className: "mr-1.5 h-3.5 w-3.5" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 341,
												columnNumber: 19
											}, this), "Usuários do Studio"]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 340,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 335,
										columnNumber: 15
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "text-xs text-slate-400",
										children: "Atualizado automaticamente"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 345,
										columnNumber: 15
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 334,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
									value: "companies",
									className: "m-0",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
										className: "p-0",
										children: pageLoading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingRow, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 352,
											columnNumber: 32
										}, this) : companies.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
											title: "Nenhuma empresa disponível",
											detail: "Seu usuário ainda não possui vínculo com uma empresa."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 352,
											columnNumber: 74
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "hidden md:block",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, {
												className: "bg-[#fafbfc]",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
													className: "border-slate-100 hover:bg-transparent",
													children: [
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "h-10 pl-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "Empresa"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 357,
															columnNumber: 29
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "CNPJ"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 358,
															columnNumber: 29
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "Status"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 359,
															columnNumber: 29
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "Criada em"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 360,
															columnNumber: 29
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "pr-5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "Ações"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 361,
															columnNumber: 29
														}, this)
													]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 356,
													columnNumber: 27
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 355,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: companies.map((company) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CompanyRow, {
												company,
												canManage: canManageCompanies,
												canDelete: canDeleteCompanies,
												loading: enteringCompanyId === company.id,
												actionLoading: companyActionId === company.id,
												actionsDisabled: enteringCompanyId !== null || companyActionId !== null,
												onEdit: () => openCompany(company),
												onEnter: () => void enterCompany(company),
												onToggleStatus: () => void toggleCompanyStatus(company),
												onDelete: () => {
													setDeleteTarget(company);
													setDeleteConfirmation("");
												}
											}, company.id, false, {
												fileName: _jsxFileName,
												lineNumber: 365,
												columnNumber: 53
											}, this)) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 364,
												columnNumber: 25
											}, this)] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 354,
												columnNumber: 23
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 353,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "divide-y divide-slate-100 md:hidden",
											children: companies.map((company) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CompanyMobileCard, {
												company,
												canManage: canManageCompanies,
												canDelete: canDeleteCompanies,
												loading: enteringCompanyId === company.id,
												actionLoading: companyActionId === company.id,
												actionsDisabled: enteringCompanyId !== null || companyActionId !== null,
												onEdit: () => openCompany(company),
												onEnter: () => void enterCompany(company),
												onToggleStatus: () => void toggleCompanyStatus(company),
												onDelete: () => {
													setDeleteTarget(company);
													setDeleteConfirmation("");
												}
											}, company.id, false, {
												fileName: _jsxFileName,
												lineNumber: 373,
												columnNumber: 49
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 372,
											columnNumber: 21
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 352,
											columnNumber: 189
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 351,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 350,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
									value: "users",
									className: "m-0",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
										className: "p-0",
										children: !canManageUsers ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
											title: "Acesso restrito",
											detail: "Somente administradores do Studio gerenciam usuários."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 384,
											columnNumber: 36
										}, this) : usersLoading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingRow, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 384,
											columnNumber: 155
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex items-center justify-between border-b border-slate-100 px-5 py-3",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "text-sm font-semibold text-slate-800",
												children: "Usuários cadastrados"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 387,
												columnNumber: 25
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "mt-0.5 text-xs text-slate-400",
												children: "Acessos globais e vínculos por empresa"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 388,
												columnNumber: 25
											}, this)] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 386,
												columnNumber: 23
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												size: "sm",
												className: "rounded-lg bg-blue-600 text-white hover:bg-blue-700",
												onClick: () => openUser(),
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-3.5 w-3.5" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 391,
													columnNumber: 25
												}, this), "Novo usuário"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 390,
												columnNumber: 23
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 385,
											columnNumber: 21
										}, this), studioUsers.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
											title: "Nenhum usuário cadastrado",
											detail: "Crie o primeiro acesso administrativo."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 395,
											columnNumber: 49
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "hidden md:block",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, {
												className: "bg-[#fafbfc]",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
													className: "border-slate-100 hover:bg-transparent",
													children: [
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "h-10 pl-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "Nome"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 400,
															columnNumber: 33
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "E-mail"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 401,
															columnNumber: 33
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "Status"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 402,
															columnNumber: 33
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "Papel global"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 403,
															columnNumber: 33
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "Empresas"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 404,
															columnNumber: 33
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
															className: "pr-5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
															children: "Ações"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 405,
															columnNumber: 33
														}, this)
													]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 399,
													columnNumber: 31
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 398,
												columnNumber: 29
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: studioUsers.map((studioUser) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserRow, {
												studioUser,
												onEdit: () => openUser(studioUser)
											}, studioUser.id, false, {
												fileName: _jsxFileName,
												lineNumber: 409,
												columnNumber: 62
											}, this)) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 408,
												columnNumber: 29
											}, this)] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 397,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 396,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "divide-y divide-slate-100 md:hidden",
											children: studioUsers.map((studioUser) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserMobileCard, {
												studioUser,
												onEdit: () => openUser(studioUser)
											}, studioUser.id, false, {
												fileName: _jsxFileName,
												lineNumber: 414,
												columnNumber: 58
											}, this))
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 413,
											columnNumber: 25
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 395,
											columnNumber: 148
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 384,
											columnNumber: 172
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 383,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 382,
									columnNumber: 13
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 333,
							columnNumber: 11
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 332,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 306,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CompanySheet, {
				open: companySheetOpen,
				onOpenChange: setCompanySheetOpen,
				editing: Boolean(editingCompany),
				form: companyForm,
				setForm: setCompanyForm,
				saving: savingCompany,
				onSave: () => void saveCompany()
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 424,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserSheet, {
				open: userSheetOpen,
				onOpenChange: setUserSheetOpen,
				editing: Boolean(editingUser),
				form: userForm,
				setForm: setUserForm,
				companies,
				saving: savingUser,
				onSave: () => void saveUser()
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 425,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
				open: Boolean(deleteTarget),
				onOpenChange: (open) => {
					if (!open && companyActionId === null) {
						setDeleteTarget(null);
						setDeleteConfirmation("");
					}
				},
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
					className: "studio-portal-dialog rounded-2xl border-slate-200 bg-white text-slate-950 sm:max-w-lg",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mb-2 grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TriangleAlert, { className: "h-5 w-5" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 435,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 434,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: "Excluir empresa permanentemente?" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 437,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, {
								className: "text-slate-500",
								children: "Assistentes, canais, conversas, conhecimentos, logs e demais dados vinculados serão removidos. Esta ação não pode ser desfeita."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 438,
								columnNumber: 13
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 433,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "space-y-2 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
								className: "text-xs font-medium text-slate-700",
								children: [
									"Digite ",
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: deleteTarget?.name }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 445,
										columnNumber: 22
									}, this),
									" para confirmar"
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 444,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								className: "portal-input",
								value: deleteConfirmation,
								onChange: (event) => setDeleteConfirmation(event.target.value),
								autoComplete: "off"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 447,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 443,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "outline",
							className: "border-slate-200 bg-white text-slate-700",
							onClick: () => {
								setDeleteTarget(null);
								setDeleteConfirmation("");
							},
							disabled: companyActionId !== null,
							children: "Cancelar"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 450,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "destructive",
							onClick: () => void deleteCompany(),
							disabled: companyActionId !== null || deleteConfirmation.trim() !== deleteTarget?.name,
							children: [companyActionId && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 457,
								columnNumber: 35
							}, this), "Excluir empresa e dados"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 456,
							columnNumber: 13
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 449,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 432,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 426,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 274,
		columnNumber: 10
	}, this);
}
function CompanySheet(props) {
	const { form, setForm } = props;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
		open: props.open,
		onOpenChange: props.onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
			className: "studio-portal-dialog overflow-hidden rounded-2xl border-slate-200 bg-white p-0 text-slate-950 shadow-2xl sm:max-w-[560px]",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, {
					className: "border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-white px-6 py-5 text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "mb-1 grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Building2, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 482,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 481,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, {
							className: "text-lg font-semibold tracking-tight text-slate-950",
							children: props.editing ? "Editar empresa" : "Nova empresa"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 484,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, {
							className: "text-sm text-slate-500",
							children: props.editing ? "Atualize os dados cadastrais deste tenant." : "Cadastre um novo tenant vazio no Cubo AI Studio."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 487,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 480,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid gap-4 px-6 py-5 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "sm:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Nome fantasia",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									className: "portal-input",
									value: form.name,
									placeholder: "Ex.: Drimo",
									onChange: (event) => setForm((current) => ({
										...current,
										name: event.target.value
									}))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 495,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 494,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 493,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Razão social",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								className: "portal-input",
								value: form.legalName,
								placeholder: "Ex.: Drimo Tecnologia LTDA",
								onChange: (event) => setForm((current) => ({
									...current,
									legalName: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 502,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 501,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "CNPJ (opcional)",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								className: "portal-input",
								value: form.document,
								placeholder: "00.000.000/0001-00",
								onChange: (event) => setForm((current) => ({
									...current,
									document: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 508,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 507,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "sm:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Status",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
									value: form.status,
									onValueChange: (status) => setForm((current) => ({
										...current,
										status
									})),
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
										className: "portal-input",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 520,
											columnNumber: 19
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 519,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, {
										className: "bg-white text-slate-900",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: "ACTIVE",
											children: "Ativa"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 523,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: "INACTIVE",
											children: "Inativa"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 524,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 522,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 515,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 514,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 513,
							columnNumber: 11
						}, this),
						!props.editing && /* @__PURE__ */ (void 0)("div", {
							className: "sm:col-span-2 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5",
							children: [/* @__PURE__ */ (void 0)("div", { children: [/* @__PURE__ */ (void 0)("div", {
								className: "text-sm font-medium text-slate-800",
								children: "Assistente de demonstração"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 531,
								columnNumber: 17
							}, this), /* @__PURE__ */ (void 0)("div", {
								className: "mt-0.5 text-xs text-slate-500",
								children: "Opcional. A empresa nasce vazia quando desativado."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 534,
								columnNumber: 17
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 530,
								columnNumber: 15
							}, this), /* @__PURE__ */ (void 0)(Switch, {
								checked: form.createDemoAssistant,
								onCheckedChange: (createDemoAssistant) => setForm((current) => ({
									...current,
									createDemoAssistant
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 538,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 529,
							columnNumber: 30
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "sm:col-span-2 text-[11px] leading-relaxed text-slate-400",
							children: "Os exemplos são apenas placeholders. Nenhum valor é enviado se o campo estiver vazio."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 543,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 492,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, {
					className: "border-t border-slate-100 bg-slate-50/60 px-6 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						variant: "outline",
						className: "rounded-lg border-slate-200 bg-white text-slate-700",
						onClick: () => props.onOpenChange(false),
						disabled: props.saving,
						children: "Cancelar"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 549,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						className: "rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700",
						onClick: props.onSave,
						disabled: props.saving,
						children: [props.saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 553,
							columnNumber: 30
						}, this), props.editing ? "Salvar alterações" : "Criar empresa"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 552,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 548,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 479,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 478,
		columnNumber: 10
	}, this);
}
function UserSheet(props) {
	const { form, setForm } = props;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sheet, {
		open: props.open,
		onOpenChange: props.onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetContent, {
			className: "studio-portal-dialog overflow-y-auto border-slate-200 bg-white text-slate-950 sm:max-w-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetHeader, {
					className: "border-b border-slate-100 pb-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Users, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 578,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 577,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetTitle, {
							className: "text-slate-950",
							children: props.editing ? "Editar usuário" : "Novo usuário"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 580,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetDescription, {
							className: "text-slate-500",
							children: "Defina a identidade, o papel global e as empresas acessíveis."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 583,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 576,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mt-6 grid gap-4 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Nome",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								className: "portal-input",
								value: form.name,
								onChange: (event) => setForm((current) => ({
									...current,
									name: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 588,
								columnNumber: 31
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 588,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "E-mail",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								className: "portal-input",
								type: "email",
								value: form.email,
								onChange: (event) => setForm((current) => ({
									...current,
									email: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 592,
								columnNumber: 33
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 592,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: props.editing ? "Nova senha (opcional)" : "Senha temporária",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								className: "portal-input",
								type: "password",
								value: form.temporaryPassword,
								placeholder: "Mínimo de 8 caracteres",
								onChange: (event) => setForm((current) => ({
									...current,
									temporaryPassword: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 597,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 596,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Status",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
								value: form.status,
								onValueChange: (status) => setForm((current) => ({
									...current,
									status
								})),
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
									className: "portal-input",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 607,
										columnNumber: 55
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 607,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, {
									className: "bg-white text-slate-900",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
										value: "ACTIVE",
										children: "Ativo"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 608,
										columnNumber: 66
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
										value: "INACTIVE",
										children: "Inativo"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 608,
										columnNumber: 111
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 608,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 603,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 602,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "sm:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Papel global",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
									value: form.globalRole,
									onValueChange: (globalRole) => setForm((current) => ({
										...current,
										globalRole
									})),
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
										className: "portal-input",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 617,
											columnNumber: 57
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 617,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, {
										className: "bg-white text-slate-900",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "STUDIO_ADMIN",
												children: "Administrador"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 619,
												columnNumber: 19
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "STUDIO_OPERATOR",
												children: "Operador"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 620,
												columnNumber: 19
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "STUDIO_VIEWER",
												children: "Visualizador"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 621,
												columnNumber: 19
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 618,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 613,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 612,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 611,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 587,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mt-6",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, { children: "Acesso às empresas" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 628,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white",
						children: props.companies.map((company) => {
							const selectedRole = form.memberships[company.id];
							return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center gap-3 p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
										checked: Boolean(selectedRole),
										onCheckedChange: (checked) => setForm((current) => {
											const memberships = { ...current.memberships };
											if (checked) memberships[company.id] = "VIEWER";
											else delete memberships[company.id];
											return {
												...current,
												memberships
											};
										})
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 633,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "min-w-0 flex-1 truncate text-sm font-medium",
										children: company.name
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 643,
										columnNumber: 19
									}, this),
									selectedRole && /* @__PURE__ */ (void 0)(Select, {
										value: selectedRole,
										onValueChange: (role) => setForm((current) => ({
											...current,
											memberships: {
												...current.memberships,
												[company.id]: role
											}
										})),
										children: [/* @__PURE__ */ (void 0)(SelectTrigger, {
											className: "portal-input w-32",
											children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 651,
												columnNumber: 68
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 651,
											columnNumber: 23
										}, this), /* @__PURE__ */ (void 0)(SelectContent, {
											className: "bg-white text-slate-900",
											children: [
												/* @__PURE__ */ (void 0)(SelectItem, {
													value: "OWNER",
													children: "Owner"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 653,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (void 0)(SelectItem, {
													value: "ADMIN",
													children: "Admin"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 654,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (void 0)(SelectItem, {
													value: "MEMBER",
													children: "Membro"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 655,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (void 0)(SelectItem, {
													value: "VIEWER",
													children: "Viewer"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 656,
													columnNumber: 25
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 652,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 644,
										columnNumber: 36
									}, this)
								]
							}, company.id, true, {
								fileName: _jsxFileName,
								lineNumber: 632,
								columnNumber: 20
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 629,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 627,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetFooter, {
					className: "mt-6",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						variant: "outline",
						className: "rounded-lg border-slate-200 bg-white text-slate-700",
						onClick: () => props.onOpenChange(false),
						disabled: props.saving,
						children: "Cancelar"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 664,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						className: "rounded-lg bg-blue-600 text-white hover:bg-blue-700",
						onClick: props.onSave,
						disabled: props.saving,
						children: [props.saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 666,
							columnNumber: 30
						}, this), props.editing ? "Salvar usuário" : "Criar usuário"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 665,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 663,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 575,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 574,
		columnNumber: 10
	}, this);
}
function CompanyRow({ company, canManage, canDelete, loading, actionLoading, actionsDisabled, onEdit, onEnter, onToggleStatus, onDelete }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
		className: "h-[68px] border-slate-100 bg-white hover:bg-blue-50/25",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "pl-5",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700",
						children: companyInitials(company.name)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 699,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "max-w-64 truncate text-sm font-semibold text-slate-900",
							children: company.name
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 703,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "max-w-64 truncate text-xs text-slate-400",
							children: company.legalName || "Razão social não informada"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 706,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 702,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 698,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 697,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "text-sm text-slate-500",
				children: company.document || "Não informado"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 712,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Status, {
				status: company.status,
				active: company.isActiveContext
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 716,
				columnNumber: 9
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 715,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "text-sm text-slate-500",
				children: formatDate(company.createdAt)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 718,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "pr-5",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-end gap-1.5",
					children: [canManage && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [
						/* @__PURE__ */ (void 0)(Button, {
							size: "sm",
							variant: "ghost",
							className: "rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800",
							onClick: onEdit,
							children: [/* @__PURE__ */ (void 0)(Pencil, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 723,
								columnNumber: 17
							}, this), "Editar"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 722,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (void 0)(Button, {
							size: "sm",
							variant: "ghost",
							className: "rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800",
							onClick: onToggleStatus,
							disabled: actionsDisabled,
							title: company.status === "ACTIVE" ? "Inativar empresa" : "Reativar empresa",
							children: actionLoading ? /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 727,
								columnNumber: 34
							}, this) : company.status === "ACTIVE" ? /* @__PURE__ */ (void 0)(Power, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 727,
								columnNumber: 115
							}, this) : /* @__PURE__ */ (void 0)(RotateCcw, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 727,
								columnNumber: 151
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 726,
							columnNumber: 15
						}, this),
						canDelete && /* @__PURE__ */ (void 0)(Button, {
							size: "sm",
							variant: "ghost",
							className: "rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700",
							onClick: onDelete,
							disabled: actionsDisabled || company.isActiveContext,
							title: company.isActiveContext ? "Troque de empresa antes de excluir" : "Excluir empresa",
							children: /* @__PURE__ */ (void 0)(Trash2, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 730,
								columnNumber: 19
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 729,
							columnNumber: 29
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 721,
						columnNumber: 25
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						size: "sm",
						className: "min-w-24 rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700",
						onClick: onEnter,
						disabled: actionsDisabled || company.status !== "ACTIVE",
						title: company.status === "ACTIVE" ? "Acessar empresa" : "Reative a empresa para acessar",
						children: loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 735,
							columnNumber: 17
						}, this), "Entrando"] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 734,
							columnNumber: 24
						}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: ["Acessar", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowRight, { className: "h-3.5 w-3.5" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 739,
							columnNumber: 17
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 737,
							columnNumber: 21
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 733,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 720,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 719,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 696,
		columnNumber: 10
	}, this);
}
function CompanyMobileCard(props) {
	const { company } = props;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("article", {
		className: "bg-white p-4",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-start gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700",
					children: companyInitials(company.name)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 752,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "truncate text-sm font-semibold text-slate-900",
						children: company.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 756,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "mt-0.5 truncate text-xs text-slate-400",
						children: company.document || "CNPJ não informado"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 757,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 755,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Status, {
					status: company.status,
					active: company.isActiveContext
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 761,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 751,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mt-4 flex gap-2",
			children: [props.canManage && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [
				/* @__PURE__ */ (void 0)(Button, {
					size: "sm",
					variant: "outline",
					className: "flex-1 rounded-lg border-slate-200 bg-white text-slate-600",
					onClick: props.onEdit,
					children: "Editar"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 765,
					columnNumber: 13
				}, this),
				/* @__PURE__ */ (void 0)(Button, {
					size: "sm",
					variant: "outline",
					className: "rounded-lg border-slate-200 bg-white px-2.5 text-slate-600",
					onClick: props.onToggleStatus,
					disabled: props.actionsDisabled,
					"aria-label": company.status === "ACTIVE" ? "Inativar empresa" : "Reativar empresa",
					children: props.actionLoading ? /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 769,
						columnNumber: 38
					}, this) : company.status === "ACTIVE" ? /* @__PURE__ */ (void 0)(Power, { className: "h-3.5 w-3.5" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 769,
						columnNumber: 119
					}, this) : /* @__PURE__ */ (void 0)(RotateCcw, { className: "h-3.5 w-3.5" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 769,
						columnNumber: 155
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 768,
					columnNumber: 13
				}, this),
				props.canDelete && /* @__PURE__ */ (void 0)(Button, {
					size: "sm",
					variant: "outline",
					className: "rounded-lg border-red-100 bg-white px-2.5 text-red-600",
					onClick: props.onDelete,
					disabled: props.actionsDisabled || company.isActiveContext,
					"aria-label": "Excluir empresa",
					children: /* @__PURE__ */ (void 0)(Trash2, { className: "h-3.5 w-3.5" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 772,
						columnNumber: 17
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 771,
					columnNumber: 33
				}, this)
			] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 764,
				columnNumber: 29
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				size: "sm",
				className: "flex-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700",
				onClick: props.onEnter,
				disabled: props.actionsDisabled || company.status !== "ACTIVE",
				title: company.status === "ACTIVE" ? "Acessar empresa" : "Reative a empresa para acessar",
				children: props.loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 776,
					columnNumber: 28
				}, this) : "Acessar empresa"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 775,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 763,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 750,
		columnNumber: 10
	}, this);
}
function UserRow({ studioUser, onEdit }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
		className: "h-[68px] border-slate-100 bg-white hover:bg-blue-50/25",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "pl-5",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600",
						children: companyInitials(studioUser.name)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 791,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "text-sm font-semibold text-slate-800",
						children: studioUser.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 794,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 790,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 789,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "text-sm text-slate-500",
				children: studioUser.email
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 797,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Status, { status: studioUser.status }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 798,
				columnNumber: 18
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 798,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
				className: "border border-blue-100 bg-blue-50 font-medium text-blue-700 shadow-none hover:bg-blue-50",
				children: roleLabel(studioUser.globalRole)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 800,
				columnNumber: 9
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 799,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "text-sm text-slate-500",
				children: studioUser.memberships.length === 1 ? "1 empresa" : `${studioUser.memberships.length} empresas`
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 804,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
				className: "pr-5 text-right",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					size: "sm",
					variant: "ghost",
					className: "rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800",
					onClick: onEdit,
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-3.5 w-3.5" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 809,
						columnNumber: 11
					}, this), "Editar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 808,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 807,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 788,
		columnNumber: 10
	}, this);
}
function UserMobileCard({ studioUser, onEdit }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("article", {
		className: "bg-white p-4",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-start gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600",
					children: companyInitials(studioUser.name)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 824,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "truncate text-sm font-semibold text-slate-900",
						children: studioUser.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 828,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "truncate text-xs text-slate-400",
						children: studioUser.email
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 829,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 827,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Status, { status: studioUser.status }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 831,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 823,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mt-3 flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
				className: "border border-blue-100 bg-blue-50 font-medium text-blue-700 shadow-none",
				children: roleLabel(studioUser.globalRole)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 834,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				size: "sm",
				variant: "ghost",
				className: "rounded-lg text-slate-500",
				onClick: onEdit,
				children: ["Editar", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronRight, { className: "h-3.5 w-3.5" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 839,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 837,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 833,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 822,
		columnNumber: 10
	}, this);
}
function Metric({ icon: Icon, label, value, detail, tone }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex min-h-[82px] items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: `grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${{
				blue: "border-blue-100 bg-blue-50 text-blue-700",
				cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
				emerald: "border-emerald-100 bg-emerald-50 text-emerald-700"
			}[tone]}`,
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4.5 w-4.5" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 864,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 863,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "min-w-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "text-[11px] font-medium text-slate-400",
					children: label
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 867,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "truncate text-base font-semibold tracking-tight text-slate-900",
					children: value
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 868,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "truncate text-[11px] text-slate-400",
					children: detail
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 869,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 866,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 862,
		columnNumber: 10
	}, this);
}
function Status({ status, active }) {
	if (active) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		className: "border border-blue-100 bg-blue-50 font-medium text-blue-700 shadow-none hover:bg-blue-50",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 882,
			columnNumber: 9
		}, this), "Ativa agora"]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 881,
		columnNumber: 12
	}, this);
	const isActive = status === "ACTIVE";
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		className: isActive ? "border border-emerald-100 bg-emerald-50 font-medium text-emerald-700 shadow-none hover:bg-emerald-50" : "border border-slate-200 bg-slate-100 font-medium text-slate-500 shadow-none hover:bg-slate-100",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: `mr-1.5 h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}` }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 888,
			columnNumber: 7
		}, this), isActive ? "Ativa" : "Inativa"]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 887,
		columnNumber: 10
	}, this);
}
function LoadingRow() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-44 place-items-center bg-white text-slate-400",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-center gap-2 text-xs font-medium",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin text-blue-600" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 895,
				columnNumber: 9
			}, this), "Carregando dados"]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 894,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 893,
		columnNumber: 10
	}, this);
}
function EmptyState({ title, detail }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "px-6 py-14 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "text-sm font-medium text-slate-800",
			children: title
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 907,
			columnNumber: 50
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mt-1 text-xs text-slate-500",
			children: detail
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 907,
			columnNumber: 115
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 907,
		columnNumber: 10
	}, this);
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
			className: "text-xs font-medium text-slate-700",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 916,
			columnNumber: 39
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 916,
		columnNumber: 10
	}, this);
}
function formatDate(value) {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}
function roleLabel(role) {
	return role === "STUDIO_ADMIN" ? "Administrador" : role === "STUDIO_OPERATOR" ? "Operador" : "Visualizador";
}
function companyInitials(name) {
	return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
//#endregion
export { PortalPage as component };
