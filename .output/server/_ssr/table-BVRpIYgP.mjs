import { r as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/table-BVRpIYgP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/ui/table.tsx";
var Table = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
	className: "relative w-full overflow-auto",
	children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("table", {
		ref,
		className: cn("w-full caption-bottom text-sm", className),
		...props
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 8,
		columnNumber: 7
	}, void 0)
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 7,
	columnNumber: 5
}, void 0));
Table.displayName = "Table";
var TableHeader = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("thead", {
	ref,
	className: cn("[&_tr]:border-b", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 18,
	columnNumber: 3
}, void 0));
TableHeader.displayName = "TableHeader";
var TableBody = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tbody", {
	ref,
	className: cn("[&_tr:last-child]:border-0", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 26,
	columnNumber: 3
}, void 0));
TableBody.displayName = "TableBody";
var TableFooter = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tfoot", {
	ref,
	className: cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 34,
	columnNumber: 3
}, void 0));
TableFooter.displayName = "TableFooter";
var TableRow = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tr", {
	ref,
	className: cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 44,
	columnNumber: 5
}, void 0));
TableRow.displayName = "TableRow";
var TableHead = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("th", {
	ref,
	className: cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 60,
	columnNumber: 3
}, void 0));
TableHead.displayName = "TableHead";
var TableCell = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", {
	ref,
	className: cn("p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 75,
	columnNumber: 3
}, void 0));
TableCell.displayName = "TableCell";
var TableCaption = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("caption", {
	ref,
	className: cn("mt-4 text-sm text-muted-foreground", className),
	...props
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 90,
	columnNumber: 3
}, void 0));
TableCaption.displayName = "TableCaption";
//#endregion
export { TableHeader as a, TableHead as i, TableBody as n, TableRow as o, TableCell as r, Table as t };
