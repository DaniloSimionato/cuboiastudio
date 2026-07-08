import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { It as CircleCheck, Mt as LoaderCircle, Ot as TriangleAlert, P as PencilLine, ct as CircleOff, ot as Clock3, wt as ArrowRightLeft, z as MessageSquare } from "../_libs/lucide-react.mjs";
import { t as Badge } from "./badge-CXFhyJYg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/StatusBadge-CjcQaBDS.js
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/components/StatusBadge.tsx";
var STATUS_MAP = {
	ativo: {
		label: "Ativo",
		className: "bg-emerald-50 text-emerald-700 border-emerald-200",
		Icon: CircleCheck
	},
	ativa: {
		label: "Ativa",
		className: "bg-emerald-50 text-emerald-700 border-emerald-200",
		Icon: CircleCheck
	},
	pausado: {
		label: "Pausado",
		className: "bg-slate-100 text-slate-700 border-slate-200",
		Icon: CircleOff
	},
	rascunho: {
		label: "Rascunho",
		className: "bg-amber-50 text-amber-700 border-amber-200",
		Icon: PencilLine
	},
	erro: {
		label: "Erro",
		className: "bg-rose-50 text-rose-700 border-rose-200",
		Icon: TriangleAlert
	},
	pendente: {
		label: "Pendente",
		className: "bg-amber-50 text-amber-700 border-amber-200",
		Icon: Clock3
	},
	indexando: {
		label: "Indexando",
		className: "bg-blue-50 text-blue-700 border-blue-200",
		Icon: LoaderCircle
	},
	resolvido: {
		label: "Resolvido",
		className: "bg-emerald-50 text-emerald-700 border-emerald-200",
		Icon: CircleCheck
	},
	transferido: {
		label: "Transferido",
		className: "bg-violet-50 text-violet-700 border-violet-200",
		Icon: ArrowRightLeft
	},
	"em andamento": {
		label: "Em andamento",
		className: "bg-blue-50 text-blue-700 border-blue-200",
		Icon: MessageSquare
	},
	conectado: {
		label: "Conectado",
		className: "bg-emerald-50 text-emerald-700 border-emerald-200",
		Icon: CircleCheck
	},
	desconectado: {
		label: "Desconectado",
		className: "bg-slate-100 text-slate-600 border-slate-200",
		Icon: CircleOff
	},
	testando: {
		label: "Testando",
		className: "bg-blue-50 text-blue-700 border-blue-200",
		Icon: LoaderCircle
	}
};
function StatusBadge({ status, className }) {
	const current = STATUS_MAP[status];
	const Icon = current.Icon;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, {
		variant: "outline",
		className: cn("gap-1.5 font-normal", current.className, className),
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: cn("h-3.5 w-3.5", status === "indexando" || status === "testando" ? "animate-spin" : "") }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 101,
			columnNumber: 7
		}, this), current.label]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 100,
		columnNumber: 5
	}, this);
}
//#endregion
export { StatusBadge as t };
