import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { n as useAuth } from "./auth-fzlSrChi.mjs";
import { t as Button } from "./button-TeH4yfmP.mjs";
import { t as companiesService } from "./companiesService-BvflQGn-.mjs";
import { Ct as ArrowRight, Mt as LoaderCircle, N as Pencil, _ as Shield, _t as Building2, a as Users, j as Plus } from "../_libs/lucide-react.mjs";
import { P as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Badge } from "./badge-CXFhyJYg.mjs";
import { t as StatusBadge } from "./StatusBadge-CjcQaBDS.mjs";
import { t as Input } from "./input-B8Ml971c.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-vCNF5d_j.mjs";
import { t as Label } from "./label-BZdmkwq8.mjs";
import { t as Textarea } from "./textarea-CULRsq90.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as SheetHeader, i as SheetFooter, n as SheetContent, o as SheetTitle, r as SheetDescription, t as Sheet } from "./sheet-C9KaKAS6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/portal-DWXwTwgk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/portal.tsx?tsr-split=component";
var DEFAULT_FORM = {
	name: "",
	legalName: "",
	document: "",
	status: "ACTIVE",
	notes: ""
};
function PortalPage() {
	const { isAuthenticated, loading, user } = useAuth();
	const navigate = useNavigate();
	const [companies, setCompanies] = (0, import_react.useState)([]);
	const [pageLoading, setPageLoading] = (0, import_react.useState)(true);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [sheetOpen, setSheetOpen] = (0, import_react.useState)(false);
	const [editingCompany, setEditingCompany] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(DEFAULT_FORM);
	const [enteringCompanyId, setEnteringCompanyId] = (0, import_react.useState)(null);
	const canManageCompanies = (0, import_react.useMemo)(() => Boolean(user?.permissions?.includes("companies:manage") || user?.role === "admin"), [user?.permissions, user?.role]);
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
		setError(null);
		try {
			setCompanies(await companiesService.list());
		} catch (err) {
			setError(err instanceof Error ? err.message : "Não foi possível carregar as empresas.");
		} finally {
			setPageLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		if (isAuthenticated) loadCompanies();
	}, [isAuthenticated]);
	const resetForm = () => {
		setEditingCompany(null);
		setForm(DEFAULT_FORM);
	};
	const openCreate = () => {
		resetForm();
		setSheetOpen(true);
	};
	const openEdit = (company) => {
		setEditingCompany(company);
		setForm({
			name: company.name ?? "",
			legalName: company.legalName ?? "",
			document: company.document ?? "",
			status: company.status,
			notes: company.notes ?? ""
		});
		setSheetOpen(true);
	};
	const submit = async () => {
		if (!form.name.trim()) {
			toast.error("Informe o nome da empresa.");
			return;
		}
		setSaving(true);
		try {
			const payload = {
				name: form.name.trim(),
				legalName: form.legalName.trim() || null,
				document: form.document.trim() || null,
				status: form.status,
				notes: form.notes.trim() || null
			};
			if (editingCompany) {
				await companiesService.update(editingCompany.id, payload);
				toast.success("Empresa atualizada no portal global.");
			} else {
				await companiesService.create(payload);
				toast.success("Empresa criada vazia e pronta para configuração.");
			}
			setSheetOpen(false);
			resetForm();
			await loadCompanies();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível salvar a empresa.");
		} finally {
			setSaving(false);
		}
	};
	const enterCompany = async (company) => {
		setEnteringCompanyId(company.id);
		try {
			await companiesService.setActive(company.id);
			await navigate({ to: "/dashboard" });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Não foi possível definir a empresa ativa.");
		} finally {
			setEnteringCompanyId(null);
		}
	};
	if (loading || !isAuthenticated) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "min-h-screen grid place-items-center bg-background text-muted-foreground",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-6 w-6 animate-spin" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 135,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 134,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "mx-auto max-w-7xl px-6 py-8 space-y-6",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", {
				className: "rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
							variant: "secondary",
							className: "bg-white/10 text-white hover:bg-white/10",
							children: "Portal global do Studio"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 143,
							columnNumber: 15
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
								className: "text-3xl font-semibold tracking-tight",
								children: "Empresas e governanca do Cubo AI Studio"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 147,
								columnNumber: 17
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "max-w-2xl text-sm text-slate-200/85",
								children: "Crie novas empresas, escolha o tenant ativo para operar e mantenha a administracao global fora do contexto interno de cada cliente."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 148,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 146,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 142,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid gap-3 sm:grid-cols-3 lg:grid-cols-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
								label: "Empresas acessiveis",
								value: String(companies.length),
								icon: Building2
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 156,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
								label: "Empresa ativa",
								value: companies.find((item) => item.isActiveContext)?.name ?? "Nenhuma",
								icon: Shield
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 157,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetricCard, {
								label: "Usuarios do Studio",
								value: "Em breve",
								icon: Users
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 158,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 155,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 141,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 140,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", {
				className: "grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
					className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, { children: "Empresas" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 167,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Lista global de tenants acessiveis para este usuario no Studio." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 168,
						columnNumber: 17
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 166,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						onClick: openCreate,
						disabled: !canManageCompanies,
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 173,
							columnNumber: 17
						}, this), "Nova empresa"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 172,
						columnNumber: 15
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 165,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: pageLoading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid place-items-center py-16 text-muted-foreground",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-5 w-5 animate-spin" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 179,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 178,
					columnNumber: 30
				}, this) : error ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive",
					children: error
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 180,
					columnNumber: 34
				}, this) : companies.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground",
					children: "Nenhuma empresa acessivel encontrada."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 182,
					columnNumber: 51
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "grid gap-4 md:grid-cols-2",
					children: companies.map((company) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("article", {
						className: "rounded-2xl border p-5 space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "min-w-0 space-y-1",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Building2, { className: "h-4 w-4 text-muted-foreground" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 189,
											columnNumber: 29
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
											className: "truncate font-medium",
											children: company.name
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 190,
											columnNumber: 29
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 188,
										columnNumber: 27
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "truncate text-xs text-muted-foreground",
										children: company.legalName || "Razao social nao informada"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 192,
										columnNumber: 27
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 187,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(StatusBadge, { status: company.status === "ACTIVE" ? "ativo" : "pausado" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 196,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 186,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("dl", {
								className: "grid gap-2 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
										label: "CNPJ",
										value: company.document || "Nao informado"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 200,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
										label: "Criada em",
										value: formatDate(company.createdAt) || "Data indisponivel"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 201,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SummaryRow, {
										label: "Status do contexto",
										value: company.isActiveContext ? "Empresa ativa" : "Pronta para acessar"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 202,
										columnNumber: 25
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 199,
								columnNumber: 23
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex flex-wrap gap-2 pt-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									onClick: () => void enterCompany(company),
									disabled: enteringCompanyId === company.id,
									children: [enteringCompanyId === company.id ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 207,
										columnNumber: 63
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowRight, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 207,
										columnNumber: 110
									}, this), "Acessar empresa"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 206,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									size: "sm",
									variant: "outline",
									onClick: () => openEdit(company),
									disabled: !canManageCompanies,
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-4 w-4" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 211,
										columnNumber: 27
									}, this), "Editar"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 210,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 205,
								columnNumber: 23
							}, this)
						]
					}, company.id, true, {
						fileName: _jsxFileName,
						lineNumber: 185,
						columnNumber: 45
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 184,
					columnNumber: 26
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 177,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 164,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, { children: "Usuarios do Studio" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 222,
					columnNumber: 15
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Estrutura global de usuarios e permissoes do Studio." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 223,
					columnNumber: 15
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 221,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "space-y-3 text-sm text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl border border-dashed p-4",
						children: "Gestao de usuarios em breve."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 228,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "rounded-2xl bg-muted/40 p-4",
						children: "O objetivo desta area e centralizar memberships, papeis globais e acessos a multiplas empresas sem misturar isso com as configuracoes internas do tenant."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 231,
						columnNumber: 15
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 227,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 220,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 163,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 139,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sheet, {
			open: sheetOpen,
			onOpenChange: setSheetOpen,
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetContent, {
				className: "sm:max-w-xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetTitle, { children: editingCompany ? "Editar empresa" : "Nova empresa" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 243,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SheetDescription, { children: editingCompany ? "Atualize os dados cadastrais da empresa no portal global." : "Crie uma empresa vazia. O usuario atual continuara no portal e podera acessar o tenant quando quiser." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 244,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 242,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "mt-6 space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Nome fantasia",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: form.name,
									onChange: (event) => setForm((current) => ({
										...current,
										name: event.target.value
									})),
									placeholder: "Drimo"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 251,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 250,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Razao social",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: form.legalName,
									onChange: (event) => setForm((current) => ({
										...current,
										legalName: event.target.value
									})),
									placeholder: "Drimo Tecnologia LTDA"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 257,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 256,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "CNPJ (opcional)",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: form.document,
									onChange: (event) => setForm((current) => ({
										...current,
										document: event.target.value
									})),
									placeholder: "00.000.000/0001-00"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 263,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 262,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Status",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
									value: form.status,
									onValueChange: (value) => setForm((current) => ({
										...current,
										status: value
									})),
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 274,
										columnNumber: 19
									}, this) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 273,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
										value: "ACTIVE",
										children: "ACTIVE"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 277,
										columnNumber: 19
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
										value: "INACTIVE",
										children: "INACTIVE"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 278,
										columnNumber: 19
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 276,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 269,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 268,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Observacoes",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
									rows: 4,
									value: form.notes,
									onChange: (event) => setForm((current) => ({
										...current,
										notes: event.target.value
									})),
									placeholder: "Contexto operacional, time responsavel ou observacoes internas do onboarding."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 283,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 282,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 249,
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
							lineNumber: 291,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							onClick: () => void submit(),
							disabled: saving,
							children: saving ? "Salvando..." : editingCompany ? "Salvar alteracoes" : "Criar empresa"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 294,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 290,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 241,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 240,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 138,
		columnNumber: 10
	}, this);
}
function MetricCard({ icon: Icon, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "rounded-2xl border border-white/10 bg-white/5 p-4",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-[11px] uppercase tracking-[0.18em] text-slate-300",
				children: label
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 314,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "mt-2 text-lg font-medium text-white",
				children: value
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 315,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 313,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid h-10 w-10 place-items-center rounded-xl bg-white/10",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4 text-white" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 318,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 317,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 312,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 311,
		columnNumber: 10
	}, this);
}
function SummaryRow({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex items-center justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("dt", {
			className: "text-muted-foreground",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 331,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("dd", {
			className: "text-right font-medium",
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 332,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 330,
		columnNumber: 10
	}, this);
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, { children: label }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 343,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 342,
		columnNumber: 10
	}, this);
}
function formatDate(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString("pt-BR");
}
//#endregion
export { PortalPage as component };
