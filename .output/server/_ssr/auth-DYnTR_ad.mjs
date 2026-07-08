import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-DYnTR_ad.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/lib/auth.tsx";
var Ctx = (0, import_react.createContext)(null);
var SESSION_KEY = "cubo-ai-session";
function mapAuthUser(data) {
	const roles = Array.isArray(data.roles) ? data.roles.filter((item) => typeof item === "string") : [];
	return {
		id: String(data.id),
		nome: typeof data.name === "string" ? data.name : String(data.email).split("@")[0],
		email: String(data.email),
		role: roles.includes("studio_admin") ? "admin" : roles.includes("studio_viewer") ? "viewer" : "operator",
		activeCompanyId: typeof data.activeCompanyId === "string" ? data.activeCompanyId : null,
		memberships: Array.isArray(data.memberships) ? data.memberships.filter((item) => typeof item === "string") : [],
		roles,
		permissions: Array.isArray(data.permissions) ? data.permissions.filter((item) => typeof item === "string") : []
	};
}
function AuthProvider({ children }) {
	const [user, setUser] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const refreshUser = async () => {
		try {
			const res = await fetch("/api/auth/me", { credentials: "include" });
			if (!res.ok) {
				setUser(null);
				sessionStorage.removeItem(SESSION_KEY);
				return null;
			}
			const authUser = mapAuthUser(await res.json());
			setUser(authUser);
			sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
			return authUser;
		} catch {
			setUser(null);
			return null;
		}
	};
	(0, import_react.useEffect)(() => {
		refreshUser().finally(() => setLoading(false));
	}, []);
	const logout = () => {
		setUser(null);
		sessionStorage.removeItem(SESSION_KEY);
		window.location.assign("/staging/logout");
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Ctx.Provider, {
		value: {
			user,
			isAuthenticated: !!user,
			loading,
			refreshUser,
			logout
		},
		children
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 79,
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
