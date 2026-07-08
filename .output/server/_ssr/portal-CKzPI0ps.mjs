import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { n as useAuth } from "./auth-DYnTR_ad.mjs";
import { t as Button } from "./button-TeH4yfmP.mjs";
import { n as apiFetch } from "./apiClient-DG1jAm9p.mjs";
import { t as companiesService } from "./companiesService-FDKqQbvz.mjs";
import { A as Plus, Ct as ArrowRight, M as Pencil, Mt as LoaderCircle, _ as ShieldCheck, _t as Building2, a as Users } from "../_libs/lucide-react.mjs";
import { P as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Badge } from "./badge-CXFhyJYg.mjs";
import { t as Input } from "./input-B8Ml971c.mjs";
import { n as CardContent, t as Card } from "./card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-vCNF5d_j.mjs";
import { t as Label } from "./label-BZdmkwq8.mjs";
import { t as Switch } from "./switch-Cit-Q60v.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-Bfe67_Ib.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-BVRpIYgP.mjs";
import { a as SheetHeader, i as SheetFooter, n as SheetContent, o as SheetTitle, r as SheetDescription, t as Sheet } from "./sheet-C9KaKAS6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/portal-CKzPI0ps.js
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
	status: "ACTIVE"
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
	const { isAuthenticated, loading, user, refreshUser } = useAuth();
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
	const [editingCompany, setEditingCompany] = (0, import_react.useState)(null);
	const [editingUser, setEditingUser] = (0, import_react.useState)(null);
	const [companyForm, setCompanyForm] = (0, import_react.useState)(EMPTY_COMPANY);
	const [userForm, setUserForm] = (0, import_react.useState)(EMPTY_USER);
	const canManageCompanies = Boolean(user?.permissions?.includes("companies:manage"));
	const canManageUsers = Boolean(user?.permissions?.includes("users:manage"));
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
			status: company.status
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
				legalName: companyForm.legalName.trim() || null,
				document: companyForm.document.trim() || null,
				status: companyForm.status
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
		className: "grid min-h-screen place-items-center",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-5 w-5 animate-spin" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 215,
			columnNumber: 66
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 215,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("main", {
		className: "min-h-screen bg-slate-50/70",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("header", {
						className: "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ShieldCheck, { className: "h-4 w-4" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 222,
									columnNumber: 15
								}, this), "Administração global"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 221,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
								className: "text-2xl font-semibold tracking-tight text-slate-950",
								children: "Portal do Studio"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 225,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "mt-1 text-sm text-slate-500",
								children: "Gerencie empresas, usuários e acessos do Cubo AI Studio."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 226,
								columnNumber: 13
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 220,
							columnNumber: 11
						}, this), canManageCompanies && /* @__PURE__ */ (void 0)(Button, {
							onClick: () => openCompany(),
							className: "shadow-sm",
							children: [/* @__PURE__ */ (void 0)(Plus, { className: "h-4 w-4" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 231,
								columnNumber: 15
							}, this), "Nova empresa"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 230,
							columnNumber: 34
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 219,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", {
						className: "mb-6 grid gap-3 sm:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Metric, {
								icon: Building2,
								label: "Empresas",
								value: String(companies.length)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 237,
								columnNumber: 11
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Metric, {
								icon: Users,
								label: "Usuários",
								value: canManageUsers ? String(studioUsers.length) : "Restrito"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 238,
								columnNumber: 11
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Metric, {
								icon: ShieldCheck,
								label: "Empresa ativa",
								value: activeCompany?.name ?? "Nenhuma"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 239,
								columnNumber: 11
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 236,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tabs, {
						defaultValue: "companies",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsList, {
								className: "mb-4 h-9 bg-slate-200/70 p-1",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
									value: "companies",
									className: "h-7 px-4 text-xs",
									children: "Empresas"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 244,
									columnNumber: 13
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
									value: "users",
									className: "h-7 px-4 text-xs",
									children: "Usuários do Studio"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 245,
									columnNumber: 13
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 243,
								columnNumber: 11
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
								value: "companies",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
									className: "overflow-hidden border-slate-200 shadow-sm",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
										className: "p-0",
										children: pageLoading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingRow, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 251,
											columnNumber: 32
										}, this) : companies.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
											title: "Nenhuma empresa disponível",
											detail: "Seu usuário ainda não possui vínculo com uma empresa."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 251,
											columnNumber: 74
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, {
											className: "bg-slate-50",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
													className: "pl-5",
													children: "Empresa"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 254,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "CNPJ" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 255,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 256,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Criada em" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 257,
													columnNumber: 25
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
													className: "pr-5 text-right",
													children: "Ações"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 258,
													columnNumber: 25
												}, this)
											] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 253,
												columnNumber: 23
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 252,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: companies.map((company) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
											className: "h-16",
											children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
													className: "pl-5",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "font-medium text-slate-900",
														children: company.name
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 264,
														columnNumber: 29
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "max-w-64 truncate text-xs text-slate-500",
														children: company.legalName || "Razão social não informada"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 265,
														columnNumber: 29
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 263,
													columnNumber: 27
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
													className: "text-slate-600",
													children: company.document || "Não informado"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 269,
													columnNumber: 27
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Status, {
													status: company.status,
													active: company.isActiveContext
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 270,
													columnNumber: 38
												}, this) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 270,
													columnNumber: 27
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
													className: "text-slate-600",
													children: formatDate(company.createdAt)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 271,
													columnNumber: 27
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
													className: "pr-5",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "flex justify-end gap-2",
														children: [canManageCompanies && /* @__PURE__ */ (void 0)(Button, {
															size: "sm",
															variant: "ghost",
															onClick: () => openCompany(company),
															children: [/* @__PURE__ */ (void 0)(Pencil, { className: "h-3.5 w-3.5" }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 275,
																columnNumber: 35
															}, this), "Editar"]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 274,
															columnNumber: 54
														}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
															size: "sm",
															onClick: () => void enterCompany(company),
															disabled: enteringCompanyId !== null,
															children: [enteringCompanyId === company.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 279,
																columnNumber: 69
															}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowRight, { className: "h-3.5 w-3.5" }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 279,
																columnNumber: 120
															}, this), "Acessar"]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 278,
															columnNumber: 31
														}, this)]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 273,
														columnNumber: 29
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 272,
													columnNumber: 27
												}, this)
											]
										}, company.id, true, {
											fileName: _jsxFileName,
											lineNumber: 262,
											columnNumber: 49
										}, this)) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 261,
											columnNumber: 21
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 251,
											columnNumber: 189
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 250,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 249,
									columnNumber: 13
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 248,
								columnNumber: 11
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
								value: "users",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
									className: "overflow-hidden border-slate-200 shadow-sm",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
										className: "p-0",
										children: !canManageUsers ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
											title: "Acesso restrito",
											detail: "Somente administradores do Studio gerenciam usuários."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 294,
											columnNumber: 36
										}, this) : usersLoading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingRow, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 294,
											columnNumber: 155
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex items-center justify-between border-b px-5 py-3",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "text-sm font-medium",
												children: "Usuários cadastrados"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 296,
												columnNumber: 23
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
												size: "sm",
												onClick: () => openUser(),
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-3.5 w-3.5" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 298,
													columnNumber: 25
												}, this), "Novo usuário"]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 297,
												columnNumber: 23
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 295,
											columnNumber: 21
										}, this), studioUsers.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
											title: "Nenhum usuário cadastrado",
											detail: "Crie o primeiro acesso administrativo."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 302,
											columnNumber: 49
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, {
											className: "bg-slate-50",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
													className: "pl-5",
													children: "Usuário"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 305,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Papel global" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 306,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Empresas" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 307,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 308,
													columnNumber: 29
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
													className: "pr-5 text-right",
													children: "Ação"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 309,
													columnNumber: 29
												}, this)
											] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 304,
												columnNumber: 27
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 303,
											columnNumber: 25
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: studioUsers.map((studioUser) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
											className: "h-16",
											children: [
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
													className: "pl-5",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "font-medium",
														children: studioUser.name
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 315,
														columnNumber: 33
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "text-xs text-slate-500",
														children: studioUser.email
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 316,
														columnNumber: 33
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 314,
													columnNumber: 31
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
													variant: "secondary",
													children: roleLabel(studioUser.globalRole)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 318,
													columnNumber: 42
												}, this) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 318,
													columnNumber: 31
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
													className: "text-slate-600",
													children: studioUser.memberships.length
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 319,
													columnNumber: 31
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Status, { status: studioUser.status }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 320,
													columnNumber: 42
												}, this) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 320,
													columnNumber: 31
												}, this),
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
													className: "pr-5 text-right",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
														size: "sm",
														variant: "ghost",
														onClick: () => openUser(studioUser),
														children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-3.5 w-3.5" }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 323,
															columnNumber: 35
														}, this), "Editar"]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 322,
														columnNumber: 33
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 321,
													columnNumber: 31
												}, this)
											]
										}, studioUser.id, true, {
											fileName: _jsxFileName,
											lineNumber: 313,
											columnNumber: 58
										}, this)) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 312,
											columnNumber: 25
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 302,
											columnNumber: 148
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 294,
											columnNumber: 172
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 293,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 292,
									columnNumber: 13
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 291,
								columnNumber: 11
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 242,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 218,
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
				lineNumber: 337,
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
				lineNumber: 338,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 217,
		columnNumber: 10
	}, this);
}
function CompanySheet(props) {
	const { form, setForm } = props;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sheet, {
		open: props.open,
		onOpenChange: props.onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetContent, {
			className: "sm:max-w-lg",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetTitle, { children: props.editing ? "Editar empresa" : "Nova empresa" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 357,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetDescription, { children: "Os exemplos abaixo são apenas placeholders e nunca são enviados." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 358,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 356,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mt-6 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Nome fantasia",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								value: form.name,
								placeholder: "Drimo",
								onChange: (event) => setForm((current) => ({
									...current,
									name: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 361,
								columnNumber: 40
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 361,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Razão social",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								value: form.legalName,
								placeholder: "Drimo Tecnologia LTDA",
								onChange: (event) => setForm((current) => ({
									...current,
									legalName: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 365,
								columnNumber: 39
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 365,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "CNPJ (opcional)",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								value: form.document,
								placeholder: "00.000.000/0001-00",
								onChange: (event) => setForm((current) => ({
									...current,
									document: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 369,
								columnNumber: 42
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 369,
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
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 378,
									columnNumber: 30
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 378,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
									value: "ACTIVE",
									children: "Ativa"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 379,
									columnNumber: 30
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
									value: "INACTIVE",
									children: "Inativa"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 379,
									columnNumber: 75
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 379,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 374,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 373,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 360,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetFooter, {
					className: "mt-6",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						variant: "outline",
						onClick: () => props.onOpenChange(false),
						disabled: props.saving,
						children: "Cancelar"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 384,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						onClick: props.onSave,
						disabled: props.saving,
						children: [props.saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 386,
							columnNumber: 30
						}, this), props.editing ? "Salvar" : "Criar empresa"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 385,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 383,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 355,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 354,
		columnNumber: 10
	}, this);
}
function UserSheet(props) {
	const { form, setForm } = props;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sheet, {
		open: props.open,
		onOpenChange: props.onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetContent, {
			className: "overflow-y-auto sm:max-w-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetTitle, { children: props.editing ? "Editar usuário" : "Novo usuário" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 410,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetDescription, { children: "Defina a identidade, o papel global e as empresas acessíveis." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 411,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 409,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mt-6 grid gap-4 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "Nome",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								value: form.name,
								onChange: (event) => setForm((current) => ({
									...current,
									name: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 414,
								columnNumber: 31
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 414,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: "E-mail",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								type: "email",
								value: form.email,
								onChange: (event) => setForm((current) => ({
									...current,
									email: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 418,
								columnNumber: 33
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 418,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
							label: props.editing ? "Nova senha (opcional)" : "Senha temporária",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
								type: "password",
								value: form.temporaryPassword,
								placeholder: "Mínimo de 8 caracteres",
								onChange: (event) => setForm((current) => ({
									...current,
									temporaryPassword: event.target.value
								}))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 423,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 422,
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
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 433,
									columnNumber: 30
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 433,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
									value: "ACTIVE",
									children: "Ativo"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 434,
									columnNumber: 30
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
									value: "INACTIVE",
									children: "Inativo"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 434,
									columnNumber: 75
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 434,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 429,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 428,
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
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 443,
										columnNumber: 32
									}, this) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 443,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: "STUDIO_ADMIN",
											children: "Administrador"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 445,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: "STUDIO_OPERATOR",
											children: "Operador"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 446,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
											value: "STUDIO_VIEWER",
											children: "Visualizador"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 447,
											columnNumber: 19
										}, this)
									] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 444,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 439,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 438,
								columnNumber: 13
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 437,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 413,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "mt-6",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, { children: "Acesso às empresas" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 454,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "mt-2 divide-y rounded-xl border",
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
										lineNumber: 459,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "min-w-0 flex-1 truncate text-sm font-medium",
										children: company.name
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 469,
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
											className: "w-32",
											children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 477,
												columnNumber: 55
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 477,
											columnNumber: 23
										}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "OWNER",
												children: "Owner"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 479,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "ADMIN",
												children: "Admin"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 480,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "MEMBER",
												children: "Membro"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 481,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "VIEWER",
												children: "Viewer"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 482,
												columnNumber: 25
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 478,
											columnNumber: 23
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 470,
										columnNumber: 36
									}, this)
								]
							}, company.id, true, {
								fileName: _jsxFileName,
								lineNumber: 458,
								columnNumber: 20
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 455,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 453,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetFooter, {
					className: "mt-6",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						variant: "outline",
						onClick: () => props.onOpenChange(false),
						disabled: props.saving,
						children: "Cancelar"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 490,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						onClick: props.onSave,
						disabled: props.saving,
						children: [props.saving && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 492,
							columnNumber: 30
						}, this), props.editing ? "Salvar usuário" : "Criar usuário"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 491,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 489,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 408,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 407,
		columnNumber: 10
	}, this);
}
function Metric({ icon: Icon, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid h-9 w-9 place-items-center rounded-lg bg-sky-50 text-sky-700",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 509,
				columnNumber: 90
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 509,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-xs text-slate-500",
				children: label
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 510,
				columnNumber: 32
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "truncate text-sm font-semibold text-slate-900",
				children: value
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 510,
				columnNumber: 85
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 510,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 508,
		columnNumber: 10
	}, this);
}
function Status({ status, active }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: status === "ACTIVE" ? "default" : "secondary",
		children: active ? "Ativa agora" : status === "ACTIVE" ? "Ativa" : "Inativa"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 520,
		columnNumber: 10
	}, this);
}
function LoadingRow() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-40 place-items-center text-slate-400",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-5 w-5 animate-spin" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 523,
			columnNumber: 71
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 523,
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
			lineNumber: 532,
			columnNumber: 50
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mt-1 text-xs text-slate-500",
			children: detail
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 532,
			columnNumber: 115
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 532,
		columnNumber: 10
	}, this);
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, { children: label }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 541,
			columnNumber: 39
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 541,
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
//#endregion
export { PortalPage as component };
