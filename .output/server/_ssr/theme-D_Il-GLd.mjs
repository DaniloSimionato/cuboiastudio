import { n as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/theme-D_Il-GLd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/lib/theme.tsx";
var ThemeCtx = (0, import_react.createContext)(null);
var STORAGE_KEY = "cubo-ai-theme";
function ThemeProvider({ children }) {
	const [theme, setThemeState] = (0, import_react.useState)("light");
	(0, import_react.useEffect)(() => {
		const stored = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) || null;
		const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
		setThemeState(stored ?? (prefersDark ? "dark" : "light"));
	}, []);
	(0, import_react.useEffect)(() => {
		if (typeof document === "undefined") return;
		document.documentElement.classList.toggle("dark", theme === "dark");
		try {
			localStorage.setItem(STORAGE_KEY, theme);
		} catch (error) {}
	}, [theme]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ThemeCtx.Provider, {
		value: {
			theme,
			setTheme: setThemeState,
			toggle: () => setThemeState((t) => t === "dark" ? "light" : "dark")
		},
		children
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 32,
		columnNumber: 5
	}, this);
}
function useTheme() {
	const ctx = (0, import_react.useContext)(ThemeCtx);
	if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
	return ctx;
}
//#endregion
export { useTheme as n, ThemeProvider as t };
