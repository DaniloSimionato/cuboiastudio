import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { Ft as LoaderCircle, M as Plus, Ot as ArrowLeft, P as Pencil, T as Save, f as Trash2, r as Webhook } from "./_libs/lucide-react.mjs";
import { P as useNavigate, g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./_ssr/dialog-BQR4UioY.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { t as toolsService } from "./_ssr/toolsService-DFOW9sH6.mjs";
import { t as Route } from "./_app.apps.custom-webhook-ClVi3sVd.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./_ssr/table-BVRpIYgP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.apps.custom-webhook-D1HRJFee.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.apps.custom-webhook.tsx?tsr-split=component";
function CustomWebhookAppPage() {
	const search = Route.useSearch();
	useNavigate();
	const [actions, setActions] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [isDialogOpen, setIsDialogOpen] = (0, import_react.useState)(false);
	const [editingId, setEditingId] = (0, import_react.useState)(null);
	const [name, setName] = (0, import_react.useState)("");
	const [displayName, setDisplayName] = (0, import_react.useState)("");
	const [descriptionAdmin, setDescriptionAdmin] = (0, import_react.useState)("");
	const [descriptionAi, setDescriptionAi] = (0, import_react.useState)("");
	const [method, setMethod] = (0, import_react.useState)("GET");
	const [url, setUrl] = (0, import_react.useState)("");
	const [headersJson, setHeadersJson] = (0, import_react.useState)("");
	const [authType, setAuthType] = (0, import_react.useState)("NONE");
	const [authToken, setAuthToken] = (0, import_react.useState)("");
	const [authUsername, setAuthUsername] = (0, import_react.useState)("");
	const [authPassword, setAuthPassword] = (0, import_react.useState)("");
	const [authKeyName, setAuthKeyName] = (0, import_react.useState)("");
	const [authKeyValue, setAuthKeyValue] = (0, import_react.useState)("");
	const [bodyTemplate, setBodyTemplate] = (0, import_react.useState)("");
	const [parameterSchemaJson, setParameterSchemaJson] = (0, import_react.useState)("");
	const [timeoutMs, setTimeoutMs] = (0, import_react.useState)("5000");
	const [permissionType, setPermissionType] = (0, import_react.useState)("READ");
	const [requiresConfirmation, setRequiresConfirmation] = (0, import_react.useState)(false);
	const [responseFilterJson, setResponseFilterJson] = (0, import_react.useState)("");
	const [active, setActive] = (0, import_react.useState)(true);
	const loadActions = async () => {
		setLoading(true);
		try {
			setActions(await toolsService.list());
		} catch (err) {
			console.error(err);
			toast.error("Erro ao carregar as ações de webhook.");
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		loadActions();
	}, []);
	const openCreateDialog = () => {
		setEditingId(null);
		setName("");
		setDisplayName("");
		setDescriptionAdmin("");
		setDescriptionAi("");
		setMethod("GET");
		setUrl("");
		setHeadersJson("{}");
		setAuthType("NONE");
		setAuthToken("");
		setAuthUsername("");
		setAuthPassword("");
		setAuthKeyName("");
		setAuthKeyValue("");
		setBodyTemplate("");
		setParameterSchemaJson(JSON.stringify({
			type: "object",
			properties: { sku: {
				type: "string",
				description: "Código do produto para busca"
			} },
			required: ["sku"]
		}, null, 2));
		setTimeoutMs("5000");
		setPermissionType("READ");
		setRequiresConfirmation(false);
		setResponseFilterJson("[]");
		setActive(true);
		setIsDialogOpen(true);
	};
	const openEditDialog = (action) => {
		setEditingId(action.id);
		setName(action.name);
		setDisplayName(action.displayName);
		setDescriptionAdmin(action.descriptionAdmin || "");
		setDescriptionAi(action.descriptionAi || "");
		setMethod(action.method);
		setUrl(action.url);
		setHeadersJson(JSON.stringify(action.headers || {}, null, 2));
		setAuthType(action.authType || "NONE");
		const auth = action.authConfig || {};
		setAuthToken(auth.token || "");
		setAuthUsername(auth.username || "");
		setAuthPassword(auth.password || "");
		setAuthKeyName(auth.keyName || "");
		setAuthKeyValue(auth.keyValue || "");
		setBodyTemplate(action.bodyTemplate || "");
		setParameterSchemaJson(JSON.stringify(action.parameterSchema || {}, null, 2));
		setTimeoutMs(String(action.timeoutMs || 5e3));
		setPermissionType(action.permissionType || "READ");
		setRequiresConfirmation(action.requiresConfirmation || false);
		setResponseFilterJson(JSON.stringify(action.responseFilter || [], null, 2));
		setActive(action.active);
		setIsDialogOpen(true);
	};
	const handleDelete = async (id) => {
		if (!confirm("Tem certeza que deseja excluir esta ação de webhook? Ela será removida de todos os assistentes.")) return;
		try {
			await toolsService.delete(id);
			toast.success("Ação excluída com sucesso!");
			loadActions();
		} catch (err) {
			console.error(err);
			toast.error("Erro ao excluir ação.");
		}
	};
	const handleSave = async (e) => {
		e.preventDefault();
		if (!/^[a-z0-9_]+$/.test(name)) {
			toast.error("O identificador (slug) deve conter apenas letras minúsculas, números e sublinhados (_).");
			return;
		}
		let headers = {};
		try {
			headers = JSON.parse(headersJson || "{}");
		} catch {
			toast.error("Headers inválidos. Certifique-se de que é um JSON válido.");
			return;
		}
		let parameterSchema = {};
		try {
			parameterSchema = JSON.parse(parameterSchemaJson || "{}");
		} catch {
			toast.error("Parâmetros (JSON Schema) inválidos.");
			return;
		}
		let responseFilter = [];
		try {
			responseFilter = JSON.parse(responseFilterJson || "[]");
		} catch {
			toast.error("Filtro de resposta inválido. Certifique-se de que é um array JSON de chaves.");
			return;
		}
		const authConfig = {};
		if (authType === "BEARER") authConfig.token = authToken;
		else if (authType === "BASIC") {
			authConfig.username = authUsername;
			authConfig.password = authPassword;
		} else if (authType === "API_KEY") {
			authConfig.keyName = authKeyName;
			authConfig.keyValue = authKeyValue;
		}
		const payload = {
			installationId: search.installationId || "webhook-inst-local",
			name,
			displayName,
			descriptionAdmin,
			descriptionAi,
			method,
			url,
			headers,
			authType,
			authConfig,
			bodyTemplate: bodyTemplate || null,
			parameterSchema,
			timeoutMs: Number(timeoutMs) || 5e3,
			permissionType,
			requiresConfirmation,
			responseFilter,
			active
		};
		setSaving(true);
		try {
			if (editingId) {
				await toolsService.update(editingId, payload);
				toast.success("Ação de webhook atualizada!");
			} else {
				await toolsService.create(payload);
				toast.success("Nova ação de webhook cadastrada!");
			}
			setIsDialogOpen(false);
			loadActions();
		} catch (err) {
			console.error(err);
			toast.error("Erro ao salvar ação de webhook.");
		} finally {
			setSaving(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "ghost",
					size: "icon",
					asChild: true,
					className: "h-8 w-8 cursor-pointer",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, {
						to: "/apps",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowLeft, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 218,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 217,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 216,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
					title: "Webhook Personalizado",
					description: "Cadastre webhooks e chame endpoints de ERPs, CRMs ou APIs externas dinamicamente pela IA.",
					actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						onClick: openCreateDialog,
						size: "sm",
						className: "gap-1.5 cursor-pointer",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 222,
							columnNumber: 15
						}, this), " Nova Ação"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 221,
						columnNumber: 164
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 221,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 215,
				columnNumber: 7
			}, this),
			loading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-col items-center justify-center py-12 min-h-[300px]",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-8 w-8 text-primary animate-spin" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 227,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "text-sm text-muted-foreground mt-2",
					children: "Carregando ações cadastradas..."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 228,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 226,
				columnNumber: 18
			}, this) : actions.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
				className: "border-dashed border-muted/80",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
					className: "flex flex-col items-center justify-center p-12 min-h-[300px] text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Webhook, { className: "h-12 w-12 text-muted-foreground/40 mb-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 231,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", {
							className: "text-lg font-semibold text-foreground",
							children: "Nenhum webhook cadastrado"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 232,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
							className: "text-sm text-muted-foreground max-w-sm mt-1 mb-6",
							children: "Integre APIs do seu cliente cadastrando ações personalizadas que a IA pode decidir executar."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 233,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							onClick: openCreateDialog,
							className: "cursor-pointer",
							children: "Cadastrar primeira Ação"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 236,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 230,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 229,
				columnNumber: 41
			}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
				className: "py-4",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
					className: "text-base font-bold",
					children: "Ações Disponíveis"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 242,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, {
					className: "text-xs",
					children: "Essas ações ficarão disponíveis para seleção nas configurações de ferramentas de cada assistente."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 243,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 241,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Table, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Identificador / Slug" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 251,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Nome Visual" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 252,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Método & URL" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 253,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Permissão" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 254,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, { children: "Status" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 255,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableHead, {
						className: "w-[100px] text-right",
						children: "Ações"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 256,
						columnNumber: 19
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 250,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 249,
					columnNumber: 15
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableBody, { children: actions.map((act) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableRow, {
					className: act.active ? "" : "opacity-60 bg-muted/10",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "font-mono text-xs font-semibold",
							children: ["webhook_", act.name]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 261,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "font-medium text-xs",
							children: act.displayName
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 264,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: `inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 ${act.method === "GET" ? "bg-sky-100 text-sky-700" : act.method === "POST" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`,
								children: act.method
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 268,
								columnNumber: 23
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: "text-muted-foreground select-all font-mono text-[11px]",
								children: act.url
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 271,
								columnNumber: 23
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 267,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "text-xs",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
								className: `inline-flex items-center gap-1 font-semibold ${act.permissionType === "WRITE" ? "text-emerald-600" : "text-sky-600"}`,
								children: [act.permissionType === "WRITE" ? "Escrita (Mutação)" : "Leitura", act.requiresConfirmation && /* @__PURE__ */ (void 0)("span", {
									className: "text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-normal",
									children: "Confirmação"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 278,
									columnNumber: 54
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 276,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 275,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "text-xs",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: `inline-block w-2.5 h-2.5 rounded-full ${act.active ? "bg-emerald-500" : "bg-muted-foreground/40"}` }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 284,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 283,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TableCell, {
							className: "text-right",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center justify-end gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "ghost",
									size: "icon",
									onClick: () => openEditDialog(act),
									className: "h-7 w-7 cursor-pointer",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Pencil, { className: "h-3.5 w-3.5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 289,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 288,
									columnNumber: 25
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "ghost",
									size: "icon",
									onClick: () => handleDelete(act.id),
									className: "h-7 w-7 text-rose-500 hover:text-rose-600 cursor-pointer",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-3.5 w-3.5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 292,
										columnNumber: 27
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 291,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 287,
								columnNumber: 23
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 286,
							columnNumber: 21
						}, this)
					]
				}, act.id, true, {
					fileName: _jsxFileName,
					lineNumber: 260,
					columnNumber: 37
				}, this)) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 259,
					columnNumber: 15
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 248,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 247,
				columnNumber: 11
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 240,
				columnNumber: 19
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
				open: isDialogOpen,
				onOpenChange: setIsDialogOpen,
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
					className: "max-w-2xl max-h-[85vh] overflow-y-auto",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", {
						onSubmit: handleSave,
						className: "space-y-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, {
								className: "text-base font-bold",
								children: editingId ? "Editar Ação de Webhook" : "Cadastrar Ação de Webhook"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 307,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, {
								className: "text-xs",
								children: "A IA usará o nome e a instrução semântica para entender quando e como executar esta chamada."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 310,
								columnNumber: 15
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 306,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid grid-cols-2 gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "name",
											className: "text-xs font-semibold",
											children: "Identificador (slug)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 317,
											columnNumber: 17
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											id: "name",
											value: name,
											onChange: (e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")),
											placeholder: "consultar_estoque",
											disabled: !!editingId,
											required: true,
											className: "h-9 text-xs"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 318,
											columnNumber: 17
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
											className: "text-[10px] text-muted-foreground",
											children: [
												"Minúsculas, números e sublinhados. Ficará visível como ",
												/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("code", { children: "webhook_nome" }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 319,
													columnNumber: 121
												}, this),
												"."
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 319,
											columnNumber: 17
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 316,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "displayName",
										className: "text-xs font-semibold",
										children: "Nome amigável (UI)"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 323,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										id: "displayName",
										value: displayName,
										onChange: (e) => setDisplayName(e.target.value),
										placeholder: "Consultar Estoque",
										required: true,
										className: "h-9 text-xs"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 324,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 322,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 315,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
									htmlFor: "descriptionAi",
									className: "text-xs font-semibold",
									children: "Instrução para a IA (Semantic Description)"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 329,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
									id: "descriptionAi",
									value: descriptionAi,
									onChange: (e) => setDescriptionAi(e.target.value),
									placeholder: "Use esta ferramenta para verificar o estoque de um produto passando o SKU. Retorna quantidade e localização.",
									required: true,
									className: "text-xs min-h-[60px]"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 330,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 328,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid grid-cols-4 gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-1.5 col-span-1",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "method",
										className: "text-xs font-semibold",
										children: "Método"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 335,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
										value: method,
										onValueChange: setMethod,
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
											id: "method",
											className: "h-9 text-xs",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 338,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 337,
											columnNumber: 19
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "GET",
												children: "GET"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 341,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "POST",
												children: "POST"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 342,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "PUT",
												children: "PUT"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 343,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "PATCH",
												children: "PATCH"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 344,
												columnNumber: 21
											}, this),
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
												value: "DELETE",
												children: "DELETE"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 345,
												columnNumber: 21
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 340,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 336,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 334,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-1.5 col-span-3",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "url",
										className: "text-xs font-semibold",
										children: "URL do Endpoint"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 351,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										id: "url",
										value: url,
										onChange: (e) => setUrl(e.target.value),
										placeholder: "https://api.sistema.com/v1/estoque/{{sku}}",
										required: true,
										className: "h-9 text-xs font-mono"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 352,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 350,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 333,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
								className: "border-muted/60",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
									className: "py-2.5 px-4 bg-muted/10 border-b border-muted/50",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
										className: "text-xs font-bold",
										children: "Autenticação (Segurança)"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 359,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 358,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
									className: "p-4 space-y-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "grid grid-cols-3 gap-4 items-center",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
												className: "text-xs col-span-1 font-medium",
												children: "Tipo de Autenticação"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 363,
												columnNumber: 19
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "col-span-2",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
													value: authType,
													onValueChange: setAuthType,
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
														className: "h-8 text-xs",
														children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 367,
															columnNumber: 25
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 366,
														columnNumber: 23
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
															value: "NONE",
															children: "Nenhuma (Pública)"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 370,
															columnNumber: 25
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
															value: "BEARER",
															children: "Bearer Token (JWT)"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 371,
															columnNumber: 25
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
															value: "BASIC",
															children: "Basic Auth (user/pass)"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 372,
															columnNumber: 25
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
															value: "API_KEY",
															children: "API Key (Header customizado)"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 373,
															columnNumber: 25
														}, this)
													] }, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 369,
														columnNumber: 23
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 365,
													columnNumber: 21
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 364,
												columnNumber: 19
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 362,
											columnNumber: 17
										}, this),
										authType === "BEARER" && /* @__PURE__ */ (void 0)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (void 0)(Label, {
												className: "text-[11px] font-medium",
												children: "Token de Acesso"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 380,
												columnNumber: 21
											}, this), /* @__PURE__ */ (void 0)(Input, {
												type: "password",
												value: authToken,
												onChange: (e) => setAuthToken(e.target.value),
												placeholder: "Insera o token Bearer...",
												className: "h-8 text-xs font-mono"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 381,
												columnNumber: 21
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 379,
											columnNumber: 43
										}, this),
										authType === "BASIC" && /* @__PURE__ */ (void 0)("div", {
											className: "grid grid-cols-2 gap-3",
											children: [/* @__PURE__ */ (void 0)("div", {
												className: "space-y-1",
												children: [/* @__PURE__ */ (void 0)(Label, {
													className: "text-[11px] font-medium",
													children: "Username / Usuário"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 386,
													columnNumber: 23
												}, this), /* @__PURE__ */ (void 0)(Input, {
													value: authUsername,
													onChange: (e) => setAuthUsername(e.target.value),
													placeholder: "api_user",
													className: "h-8 text-xs"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 387,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 385,
												columnNumber: 21
											}, this), /* @__PURE__ */ (void 0)("div", {
												className: "space-y-1",
												children: [/* @__PURE__ */ (void 0)(Label, {
													className: "text-[11px] font-medium",
													children: "Senha / Password"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 390,
													columnNumber: 23
												}, this), /* @__PURE__ */ (void 0)(Input, {
													type: "password",
													value: authPassword,
													onChange: (e) => setAuthPassword(e.target.value),
													placeholder: "••••••••",
													className: "h-8 text-xs"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 391,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 389,
												columnNumber: 21
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 384,
											columnNumber: 42
										}, this),
										authType === "API_KEY" && /* @__PURE__ */ (void 0)("div", {
											className: "grid grid-cols-2 gap-3",
											children: [/* @__PURE__ */ (void 0)("div", {
												className: "space-y-1",
												children: [/* @__PURE__ */ (void 0)(Label, {
													className: "text-[11px] font-medium",
													children: "Nome do Header"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 397,
													columnNumber: 23
												}, this), /* @__PURE__ */ (void 0)(Input, {
													value: authKeyName,
													onChange: (e) => setAuthKeyName(e.target.value),
													placeholder: "X-API-Key",
													className: "h-8 text-xs"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 398,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 396,
												columnNumber: 21
											}, this), /* @__PURE__ */ (void 0)("div", {
												className: "space-y-1",
												children: [/* @__PURE__ */ (void 0)(Label, {
													className: "text-[11px] font-medium",
													children: "Valor da Chave"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 401,
													columnNumber: 23
												}, this), /* @__PURE__ */ (void 0)(Input, {
													type: "password",
													value: authKeyValue,
													onChange: (e) => setAuthKeyValue(e.target.value),
													placeholder: "Valor do segredo...",
													className: "h-8 text-xs"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 402,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 400,
												columnNumber: 21
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 395,
											columnNumber: 44
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 361,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 357,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid grid-cols-2 gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "headers",
										className: "text-xs font-semibold",
										children: "Headers Customizados (JSON)"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 410,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
										id: "headers",
										value: headersJson,
										onChange: (e) => setHeadersJson(e.target.value),
										placeholder: "{ \"X-Custom-Client\": \"cubo-ai\" }",
										className: "text-xs font-mono min-h-[60px]"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 411,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 409,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "bodyTemplate",
										className: "text-xs font-semibold",
										children: "Template do Corpo / Body (JSON)"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 415,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
										id: "bodyTemplate",
										value: bodyTemplate,
										onChange: (e) => setBodyTemplate(e.target.value),
										placeholder: "{ \"sku_code\": \"{{sku}}\" }",
										className: "text-xs font-mono min-h-[60px]"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 416,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 414,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 408,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid grid-cols-2 gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "parameterSchema",
										className: "text-xs font-semibold",
										children: "Parâmetros Esperados (JSON Schema)"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 422,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
										id: "parameterSchema",
										value: parameterSchemaJson,
										onChange: (e) => setParameterSchemaJson(e.target.value),
										placeholder: "{ \"type\": \"object\", \"properties\": { \"sku\": { \"type\": \"string\" } }, \"required\": [\"sku\"] }",
										className: "text-xs font-mono min-h-[80px]"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 423,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 421,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
										htmlFor: "responseFilter",
										className: "text-xs font-semibold",
										children: "Filtro de Resposta (Array de Campos)"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 427,
										columnNumber: 17
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
										id: "responseFilter",
										value: responseFilterJson,
										onChange: (e) => setResponseFilterJson(e.target.value),
										placeholder: "[\"quantidade\", \"unidade\", \"deposito\"]",
										className: "text-xs font-mono min-h-[80px]"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 428,
										columnNumber: 17
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 426,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 420,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid grid-cols-3 gap-4 items-center border-t pt-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center justify-between border border-muted/60 p-2.5 rounded-lg bg-muted/10 col-span-1",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "permType",
											className: "text-xs font-semibold",
											children: "Escrita?"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 434,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
											id: "permType",
											checked: permissionType === "WRITE",
											onCheckedChange: (checked) => setPermissionType(checked ? "WRITE" : "READ")
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 435,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 433,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center justify-between border border-muted/60 p-2.5 rounded-lg bg-muted/10 col-span-1",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "reqConf",
											className: "text-xs font-semibold",
											children: "Confirmar?"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 439,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
											id: "reqConf",
											checked: requiresConfirmation,
											onCheckedChange: setRequiresConfirmation
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 440,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 438,
										columnNumber: 15
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-center justify-between border border-muted/60 p-2.5 rounded-lg bg-muted/10 col-span-1",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "active",
											className: "text-xs font-semibold",
											children: "Ativo?"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 444,
											columnNumber: 17
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, {
											id: "active",
											checked: active,
											onCheckedChange: setActive
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 445,
											columnNumber: 17
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 443,
										columnNumber: 15
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 432,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								type: "button",
								variant: "outline",
								onClick: () => setIsDialogOpen(false),
								className: "cursor-pointer",
								children: "Cancelar"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 450,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								type: "submit",
								disabled: saving,
								className: "cursor-pointer",
								children: [saving ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 454,
									columnNumber: 27
								}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4 mr-1.5" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 454,
									columnNumber: 74
								}, this), "Salvar Ação"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 453,
								columnNumber: 15
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 449,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 305,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 304,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 303,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 214,
		columnNumber: 10
	}, this);
}
//#endregion
export { CustomWebhookAppPage as component };
