import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { n as useAuth } from "./auth-C7rgJ4xY.mjs";
import { t as Button } from "./button-COtkgzDj.mjs";
import { At as Sparkles, Lt as CircleAlert, Mt as LoaderCircle } from "../_libs/lucide-react.mjs";
import { P as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-BW9s_OV3.mjs";
import { t as Input } from "./input-B8Ml971c.mjs";
import { t as Label } from "./label-BZdmkwq8.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-Bfe67_Ib.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-BlXsao0G.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/auth.tsx?tsr-split=component";
function AuthPage() {
	const { isAuthenticated, login, register } = useAuth();
	const navigate = useNavigate();
	const [tab, setTab] = (0, import_react.useState)("login");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [lEmail, setLEmail] = (0, import_react.useState)("");
	const [lPass, setLPass] = (0, import_react.useState)("");
	const [rNome, setRNome] = (0, import_react.useState)("");
	const [rEmail, setREmail] = (0, import_react.useState)("");
	const [rEmpresa, setREmpresa] = (0, import_react.useState)("");
	const [rPass, setRPass] = (0, import_react.useState)("");
	const [rPass2, setRPass2] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (isAuthenticated) navigate({ to: "/" });
	}, [isAuthenticated, navigate]);
	const handleLogin = async (e) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		const res = await login(lEmail.trim(), lPass);
		setLoading(false);
		if (!res.ok) setError(res.error ?? "Falha ao entrar.");
		else navigate({ to: "/" });
	};
	const handleRegister = async (e) => {
		e.preventDefault();
		setError(null);
		if (rPass.length < 6) return setError("A senha deve ter pelo menos 6 caracteres.");
		if (rPass !== rPass2) return setError("As senhas não coincidem.");
		setLoading(true);
		const res = await register({
			nome: rNome.trim(),
			email: rEmail.trim(),
			empresa: rEmpresa.trim() || void 0,
			password: rPass
		});
		setLoading(false);
		if (!res.ok) setError(res.error ?? "Falha ao criar conta.");
		else navigate({ to: "/" });
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "min-h-screen grid lg:grid-cols-2 bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "h-10 w-10 rounded-xl bg-white/15 backdrop-blur grid place-items-center",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Sparkles, { className: "h-5 w-5" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 66,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 65,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "font-bold",
						children: "Cubo AI Studio"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 69,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "text-xs opacity-80",
						children: "Agentes seguros"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 70,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 68,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 64,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "space-y-3 max-w-md",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", {
						className: "text-3xl font-bold leading-tight",
						children: "Construa agentes de IA prontos para atendimento multicanal."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 74,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "opacity-90 text-sm",
						children: "Crie, teste e publique agentes integrados ao Cubo.Chat com segurança ponta-a-ponta."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 77,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 73,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "text-xs opacity-70",
					children: "© Cubo.Chat — todos os direitos reservados."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 81,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 63,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-center justify-center p-6",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
				className: "w-full max-w-md",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, { children: "Bem-vindo" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 87,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardDescription, { children: "Acesse sua conta ou crie uma nova para começar." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 88,
					columnNumber: 13
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 86,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tabs, {
					value: tab,
					onValueChange: (v) => {
						setTab(v === "register" ? "register" : "login");
						setError(null);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsList, {
							className: "grid grid-cols-2 w-full",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
								value: "login",
								children: "Entrar"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 96,
								columnNumber: 17
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsTrigger, {
								value: "register",
								children: "Criar conta"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 97,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 95,
							columnNumber: 15
						}, this),
						error && /* @__PURE__ */ (void 0)("div", {
							className: "mt-4 flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2",
							children: [/* @__PURE__ */ (void 0)(CircleAlert, { className: "h-3.5 w-3.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 101,
								columnNumber: 19
							}, this), error]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 100,
							columnNumber: 25
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
							value: "login",
							className: "space-y-3 mt-4",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", {
								onSubmit: handleLogin,
								className: "space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "lemail",
											children: "Email"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 108,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											id: "lemail",
											type: "email",
											required: true,
											value: lEmail,
											onChange: (e) => setLEmail(e.target.value),
											placeholder: "voce@empresa.com"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 109,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 107,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "lpass",
											children: "Senha"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 112,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											id: "lpass",
											type: "password",
											required: true,
											value: lPass,
											onChange: (e) => setLPass(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 113,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 111,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										type: "submit",
										className: "w-full",
										disabled: loading,
										children: [loading && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 116,
											columnNumber: 33
										}, this), "Entrar"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 115,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-[11px] text-muted-foreground text-center",
										children: [
											"Não tem conta?",
											" ",
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
												type: "button",
												className: "text-primary hover:underline",
												onClick: () => setTab("register"),
												children: "Criar agora"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 121,
												columnNumber: 21
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 119,
										columnNumber: 19
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 106,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 105,
							columnNumber: 15
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TabsContent, {
							value: "register",
							className: "space-y-3 mt-4",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", {
								onSubmit: handleRegister,
								className: "space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "rnome",
											children: "Nome completo"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 131,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											id: "rnome",
											required: true,
											value: rNome,
											onChange: (e) => setRNome(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 132,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 130,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "remail",
											children: "Email"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 135,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											id: "remail",
											type: "email",
											required: true,
											value: rEmail,
											onChange: (e) => setREmail(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 136,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 134,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
											htmlFor: "rempresa",
											children: "Empresa (opcional)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 139,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
											id: "rempresa",
											value: rEmpresa,
											onChange: (e) => setREmpresa(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 140,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 138,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "grid grid-cols-2 gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
												htmlFor: "rpass",
												children: "Senha"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 144,
												columnNumber: 23
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
												id: "rpass",
												type: "password",
												required: true,
												value: rPass,
												onChange: (e) => setRPass(e.target.value)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 145,
												columnNumber: 23
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 143,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
												htmlFor: "rpass2",
												children: "Confirmar"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 148,
												columnNumber: 23
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
												id: "rpass2",
												type: "password",
												required: true,
												value: rPass2,
												onChange: (e) => setRPass2(e.target.value)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 149,
												columnNumber: 23
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 147,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 142,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										type: "submit",
										className: "w-full",
										disabled: loading,
										children: [loading && /* @__PURE__ */ (void 0)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 153,
											columnNumber: 33
										}, this), "Criar conta"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 152,
										columnNumber: 19
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
										className: "text-[10px] text-muted-foreground text-center",
										children: "Cadastro mockado no frontend. A produção usará Lovable Cloud com sessões seguras."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 156,
										columnNumber: 19
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 129,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 128,
							columnNumber: 15
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 91,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 90,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 85,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 84,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 62,
		columnNumber: 10
	}, this);
}
//#endregion
export { AuthPage as component };
