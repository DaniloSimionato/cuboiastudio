import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-C7rgJ4xY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
/**
* Mock authentication context.
* IMPORTANT: This is frontend-only scaffolding for prototyping.
* Real authentication MUST be implemented by the backend with secure sessions.
*
* Security rule:
* - never persist passwords, API keys, tokens, or secrets in the frontend
* - only keep non-sensitive session metadata here while the backend is not ready
*/
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/lib/auth.tsx";
var Ctx = (0, import_react.createContext)(null);
var USERS_KEY = "cubo-ai-mock-users";
var SESSION_KEY = "cubo-ai-session";
function readUsers() {
	try {
		return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
	} catch (error) {
		return [];
	}
}
function writeUsers(u) {
	localStorage.setItem(USERS_KEY, JSON.stringify(u));
}
function AuthProvider({ children }) {
	const [user, setUser] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const checkAuth = async () => {
			try {
				const res = await fetch("/api/auth/me");
				if (res.ok) {
					const data = await res.json();
					const authUser = {
						id: data.id,
						nome: data.name || data.email.split("@")[0],
						email: data.email,
						role: data.roles?.includes("admin") ? "admin" : "operator"
					};
					setUser(authUser);
					sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
					setLoading(false);
					return;
				}
			} catch (err) {
				console.warn("Failed to fetch /api/auth/me, falling back to local session:", err);
			}
			try {
				const raw = sessionStorage.getItem(SESSION_KEY);
				if (raw) setUser(JSON.parse(raw));
			} catch (error) {}
			setLoading(false);
		};
		checkAuth();
	}, []);
	const login = async (email, password) => {
		if (!email.trim()) return {
			ok: false,
			error: "Informe um email válido."
		};
		if (!password.trim()) return {
			ok: false,
			error: "Informe uma senha."
		};
		const safe = readUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? {
			id: `mock-${email.toLowerCase()}`,
			nome: email.split("@")[0] || "Operador",
			email,
			role: "operator"
		};
		setUser(safe);
		sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
		return { ok: true };
	};
	const register = async ({ nome, email, empresa, password }) => {
		if (!nome.trim()) return {
			ok: false,
			error: "Informe seu nome."
		};
		if (!email.trim()) return {
			ok: false,
			error: "Informe um email válido."
		};
		if (!password.trim()) return {
			ok: false,
			error: "Informe uma senha."
		};
		const users = readUsers();
		if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return {
			ok: false,
			error: "Já existe um usuário com este email."
		};
		const newUser = {
			id: crypto.randomUUID(),
			nome,
			email,
			empresa,
			role: "admin"
		};
		users.push(newUser);
		writeUsers(users);
		setUser(newUser);
		sessionStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
		return { ok: true };
	};
	const logout = () => {
		setUser(null);
		sessionStorage.removeItem(SESSION_KEY);
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Ctx.Provider, {
		value: {
			user,
			isAuthenticated: !!user,
			loading,
			login,
			register,
			logout
		},
		children
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 138,
		columnNumber: 5
	}, this);
}
function useAuth() {
	const ctx = (0, import_react.useContext)(Ctx);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
}
//#endregion
export { useAuth as n, AuthProvider as t };
