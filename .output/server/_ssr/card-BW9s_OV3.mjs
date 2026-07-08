import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/card-BW9s_OV3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/card.tsx";
var Card = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	ref,
	className: cn("rounded-xl border bg-card text-card-foreground shadow", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 7,
	columnNumber: 5
}, void 0));
Card.displayName = "Card";
var CardHeader = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	ref,
	className: cn("flex flex-col space-y-1.5 p-6", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 18,
	columnNumber: 5
}, void 0));
CardHeader.displayName = "CardHeader";
var CardTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	ref,
	className: cn("font-semibold leading-none tracking-tight", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 25,
	columnNumber: 5
}, void 0));
CardTitle.displayName = "CardTitle";
var CardDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 36,
	columnNumber: 5
}, void 0));
CardDescription.displayName = "CardDescription";
var CardContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	ref,
	className: cn("p-6 pt-0", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 43,
	columnNumber: 5
}, void 0));
CardContent.displayName = "CardContent";
var CardFooter = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	ref,
	className: cn("flex items-center p-6 pt-0", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 50,
	columnNumber: 5
}, void 0));
CardFooter.displayName = "CardFooter";
//#endregion
export { CardTitle as a, CardHeader as i, CardContent as n, CardDescription as r, Card as t };
