import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { At as Sparkles, I as Network, J as GitBranch, M as Play, S as Send, T as Save, Tt as ArrowLeft, X as Flag, at as Clock, bt as BookOpen, f as Trash2, n as Wrench, q as Globe, r as Webhook, rt as Copy, s as UserCheck, t as X, vt as Brain, yt as Bot, zt as Braces } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import "./_ssr/router-BnVzw_3d.mjs";
import { a as ReactFlowProvider, c as useEdgesState, d as Position, i as MiniMap, l as useNodesState, n as Controls, o as addEdge, r as Handle, s as index, t as Background, u as MarkerType } from "./_libs/@xyflow/react+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.flow-70QeFvmp.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.flow.tsx?tsr-split=component";
var blocos = [
	{
		id: "start",
		label: "Início",
		icon: Flag,
		color: "text-emerald-500",
		category: "Fluxo"
	},
	{
		id: "assistant",
		label: "Executar Assistente IA",
		icon: Sparkles,
		color: "text-primary",
		category: "IA"
	},
	{
		id: "decision",
		label: "Decisão IA",
		icon: Bot,
		color: "text-violet-500",
		category: "IA"
	},
	{
		id: "kb",
		label: "Buscar Conhecimento",
		icon: BookOpen,
		color: "text-indigo-500",
		category: "IA"
	},
	{
		id: "tool",
		label: "Executar Ferramenta",
		icon: Wrench,
		color: "text-fuchsia-500",
		category: "Integrações"
	},
	{
		id: "webhook",
		label: "Chamar Webhook",
		icon: Webhook,
		color: "text-amber-500",
		category: "Integrações"
	},
	{
		id: "http",
		label: "HTTP Request",
		icon: Globe,
		color: "text-sky-500",
		category: "Integrações"
	},
	{
		id: "cond",
		label: "Condição",
		icon: GitBranch,
		color: "text-amber-600",
		category: "Lógica"
	},
	{
		id: "wait",
		label: "Esperar",
		icon: Clock,
		color: "text-slate-500",
		category: "Lógica"
	},
	{
		id: "var",
		label: "Variáveis",
		icon: Braces,
		color: "text-teal-500",
		category: "Lógica"
	},
	{
		id: "memory",
		label: "Atualizar Memória",
		icon: Brain,
		color: "text-cyan-500",
		category: "Dados"
	},
	{
		id: "human",
		label: "Transferir Humano",
		icon: UserCheck,
		color: "text-orange-500",
		category: "Cubo.Chat"
	},
	{
		id: "end",
		label: "Encerrar Conversa",
		icon: X,
		color: "text-rose-500",
		category: "Cubo.Chat"
	}
];
var ASSISTANT_OUTS = [
	"sucesso",
	"baixa_confianca",
	"timeout",
	"erro",
	"ferramenta_indisponivel"
];
var DECISION_OUTS = [
	"comercial",
	"financeiro",
	"suporte",
	"agendamento",
	"ordem_servico",
	"outros"
];
function FlowNode({ data, selected }) {
	const kind = data.kind;
	const meta = blocos.find((b) => b.id === kind) ?? blocos[0];
	const Icon = meta.icon;
	const isStart = kind === "start";
	const isEnd = kind === "end";
	const outs = kind === "assistant" ? [...ASSISTANT_OUTS] : kind === "decision" ? [...DECISION_OUTS] : kind === "cond" ? ["verdadeiro", "falso"] : null;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: `w-[200px] rounded-lg border bg-card shadow-sm text-xs transition-shadow ${selected ? "ring-2 ring-primary shadow-md" : "hover:shadow"}`,
		children: [
			!isStart && /* @__PURE__ */ (void 0)(Handle, {
				type: "target",
				position: Position.Left,
				className: "!w-2.5 !h-2.5 !bg-primary"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 119,
				columnNumber: 20
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-1.5 font-medium px-3 py-2 border-b",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: `h-3.5 w-3.5 ${meta.color}` }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 121,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "truncate",
					children: meta.label
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 122,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 120,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "px-3 py-2 text-muted-foreground truncate",
				children: data.label || "Configurar..."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 124,
				columnNumber: 7
			}, this),
			outs ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "border-t divide-y",
				children: outs.map((o, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "relative px-3 py-1.5 text-[10px] text-muted-foreground flex justify-between items-center",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "truncate",
						children: o
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 130,
						columnNumber: 15
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Handle, {
						type: "source",
						position: Position.Right,
						id: o,
						style: { top: `${100 / outs.length * (i + .5)}%` },
						className: "!w-2.5 !h-2.5 !bg-primary"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 131,
						columnNumber: 15
					}, this)]
				}, o, true, {
					fileName: _jsxFileName,
					lineNumber: 129,
					columnNumber: 31
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 128,
				columnNumber: 15
			}, this) : !isEnd && /* @__PURE__ */ (void 0)(Handle, {
				type: "source",
				position: Position.Right,
				className: "!w-2.5 !h-2.5 !bg-primary"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 135,
				columnNumber: 28
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 118,
		columnNumber: 10
	}, this);
}
var nodeTypes = { flowNode: FlowNode };
var initialNodes = [
	{
		id: "1",
		type: "flowNode",
		position: {
			x: 20,
			y: 200
		},
		data: {
			kind: "start",
			label: "Início"
		}
	},
	{
		id: "2",
		type: "flowNode",
		position: {
			x: 260,
			y: 200
		},
		data: {
			kind: "decision",
			label: "Classificar intenção"
		}
	},
	{
		id: "3",
		type: "flowNode",
		position: {
			x: 540,
			y: 40
		},
		data: {
			kind: "assistant",
			label: "Assistente Comercial"
		}
	},
	{
		id: "4",
		type: "flowNode",
		position: {
			x: 540,
			y: 240
		},
		data: {
			kind: "assistant",
			label: "Assistente Suporte"
		}
	},
	{
		id: "5",
		type: "flowNode",
		position: {
			x: 540,
			y: 440
		},
		data: {
			kind: "human",
			label: "Transferir humano"
		}
	},
	{
		id: "6",
		type: "flowNode",
		position: {
			x: 840,
			y: 240
		},
		data: {
			kind: "end",
			label: "Encerrar"
		}
	}
];
var defaultEdgeOptions = {
	type: "smoothstep",
	animated: true,
	markerEnd: { type: MarkerType.ArrowClosed },
	style: { strokeWidth: 2 }
};
var initialEdges = [
	{
		id: "e1-2",
		source: "1",
		target: "2",
		...defaultEdgeOptions
	},
	{
		id: "e2-3",
		source: "2",
		sourceHandle: "comercial",
		target: "3",
		label: "comercial",
		...defaultEdgeOptions
	},
	{
		id: "e2-4",
		source: "2",
		sourceHandle: "suporte",
		target: "4",
		label: "suporte",
		...defaultEdgeOptions
	},
	{
		id: "e2-5",
		source: "2",
		sourceHandle: "outros",
		target: "5",
		label: "outros",
		...defaultEdgeOptions
	},
	{
		id: "e3-6",
		source: "3",
		sourceHandle: "sucesso",
		target: "6",
		...defaultEdgeOptions
	},
	{
		id: "e4-6",
		source: "4",
		sourceHandle: "sucesso",
		target: "6",
		...defaultEdgeOptions
	}
];
function FlowPage() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ReactFlowProvider, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FlowInner, {}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 259,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 258,
		columnNumber: 10
	}, this);
}
function FlowInner() {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const [selectedId, setSelectedId] = (0, import_react.useState)("2");
	const [actionFeedback, setActionFeedback] = (0, import_react.useState)("Modo visual demonstrativo. Persistência do fluxo será conectada em etapa futura.");
	const wrapperRef = (0, import_react.useRef)(null);
	const idRef = (0, import_react.useRef)(initialNodes.length + 1);
	const onConnect = (0, import_react.useCallback)((params) => setEdges((eds) => addEdge({
		...params,
		...defaultEdgeOptions
	}, eds)), [setEdges]);
	const onDragStart = (e, kind) => {
		e.dataTransfer.setData("application/cubo-flow-kind", kind);
		e.dataTransfer.effectAllowed = "move";
	};
	const onDragOver = (e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};
	const addBlockToCanvas = (0, import_react.useCallback)((kind, position) => {
		const meta = blocos.find((b) => b.id === kind);
		if (!meta) return;
		const newId = String(idRef.current++);
		const fallbackPosition = {
			x: 120 + (idRef.current - 1) % 4 * 40,
			y: 120 + (idRef.current - 1) % 6 * 40
		};
		setNodes((nds) => [...nds, {
			id: newId,
			type: "flowNode",
			position: position ?? fallbackPosition,
			data: {
				kind,
				label: meta.label
			}
		}]);
		setSelectedId(newId);
	}, [setNodes]);
	const onDrop = (e) => {
		e.preventDefault();
		const kind = e.dataTransfer.getData("application/cubo-flow-kind");
		if (!kind || !wrapperRef.current) return;
		const bounds = wrapperRef.current.getBoundingClientRect();
		addBlockToCanvas(kind, {
			x: e.clientX - bounds.left - 100,
			y: e.clientY - bounds.top - 30
		});
	};
	const selected = (0, import_react.useMemo)(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
	const updateSelected = (patch) => {
		if (!selected) return;
		setNodes((nds) => nds.map((n) => n.id === selected.id ? {
			...n,
			data: {
				...n.data,
				...patch
			}
		} : n));
	};
	const deleteSelected = () => {
		if (!selected) return;
		setNodes((nds) => nds.filter((n) => n.id !== selected.id));
		setEdges((eds) => eds.filter((e) => e.source !== selected.id && e.target !== selected.id));
		setSelectedId(null);
	};
	const selectedKind = selected?.data.kind ?? null;
	const selectedMeta = selectedKind ? blocos.find((b) => b.id === selectedKind) : null;
	const categorized = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		blocos.forEach((b) => {
			if (b.id === "start") return;
			const arr = map.get(b.category) ?? [];
			arr.push(b);
			map.set(b.category, arr);
		});
		return Array.from(map.entries());
	}, []);
	const showDemoAction = (action) => {
		setActionFeedback(`${action} em modo visual demonstrativo.`);
		toast.info(`${action} em modo visual demonstrativo.`);
	};
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Flow Builder",
			description: "O fluxo controla a conversa: orquestra Assistentes IA, Ferramentas e respostas ao cliente.",
			actions: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "outline",
					onClick: () => showDemoAction("Voltar"),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ArrowLeft, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 352,
						columnNumber: 15
					}, this), " Voltar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 351,
					columnNumber: 13
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "outline",
					onClick: () => showDemoAction("Duplicar fluxo"),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Copy, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 355,
						columnNumber: 15
					}, this), " Duplicar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 354,
					columnNumber: 13
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "outline",
					onClick: () => showDemoAction("Teste de fluxo"),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Play, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 358,
						columnNumber: 15
					}, this), " Testar fluxo"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 357,
					columnNumber: 13
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					variant: "outline",
					onClick: () => showDemoAction("Salvar fluxo"),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Save, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 361,
						columnNumber: 15
					}, this), " Salvar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 360,
					columnNumber: 13
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
					onClick: () => showDemoAction("Publicação do fluxo"),
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Send, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 364,
						columnNumber: 15
					}, this), " Publicar"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 363,
					columnNumber: 13
				}, this)
			] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 350,
				columnNumber: 154
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 350,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "mb-4 text-xs text-muted-foreground",
			children: "Modo visual demonstrativo. Clique em um bloco da lateral para adicioná-lo ao canvas ou arraste-o para posicionar manualmente."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 368,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "mb-4 text-xs text-muted-foreground",
			children: actionFeedback
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 373,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-12 gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
					className: "col-span-12 md:col-span-2",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-sm flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Network, { className: "h-3.5 w-3.5" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 379,
							columnNumber: 15
						}, this), " Blocos"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 378,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "text-[11px] text-muted-foreground",
						children: "Arraste para o canvas"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 381,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 377,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "space-y-3 px-2",
						children: categorized.map(([cat, list]) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "text-[10px] uppercase tracking-wide text-muted-foreground px-1 font-semibold",
								children: cat
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 385,
								columnNumber: 17
							}, this), list.map((b) => {
								const Icon = b.icon;
								return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
									type: "button",
									draggable: true,
									onDragStart: (e) => onDragStart(e, b.id),
									onClick: () => addBlockToCanvas(b.id),
									className: "flex w-full items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent active:cursor-grabbing cursor-grab text-xs select-none text-left",
									children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: `h-3.5 w-3.5 ${b.color}` }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 391,
										columnNumber: 23
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
										className: "truncate",
										children: b.label
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 392,
										columnNumber: 23
									}, this)]
								}, b.id, true, {
									fileName: _jsxFileName,
									lineNumber: 390,
									columnNumber: 22
								}, this);
							})]
						}, cat, true, {
							fileName: _jsxFileName,
							lineNumber: 384,
							columnNumber: 47
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 383,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 376,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
					className: "col-span-12 md:col-span-7 overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "p-0",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							ref: wrapperRef,
							className: "h-[620px] w-full",
							onDrop,
							onDragOver,
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(index, {
								nodes,
								edges,
								onNodesChange,
								onEdgesChange,
								onConnect,
								nodeTypes,
								defaultEdgeOptions,
								onNodeClick: (_, n) => setSelectedId(n.id),
								onPaneClick: () => setSelectedId(null),
								fitView: true,
								proOptions: { hideAttribution: true },
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Background, {
										gap: 20,
										size: 1
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 405,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MiniMap, {
										pannable: true,
										zoomable: true,
										className: "!bg-card"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 406,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Controls, {}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 407,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 402,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 401,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 400,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 399,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
					className: "col-span-12 md:col-span-3",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
						className: "text-sm flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: ["Propriedades ", selectedMeta ? `· ${selectedMeta.label}` : ""] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 416,
							columnNumber: 15
						}, this), selected && /* @__PURE__ */ (void 0)(Button, {
							variant: "ghost",
							size: "icon",
							className: "h-7 w-7",
							onClick: deleteSelected,
							children: /* @__PURE__ */ (void 0)(Trash2, { className: "h-3.5 w-3.5 text-destructive" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 418,
								columnNumber: 19
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 417,
							columnNumber: 28
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 415,
						columnNumber: 13
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 414,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
						className: "space-y-3",
						children: [!selected && /* @__PURE__ */ (void 0)("p", {
							className: "text-xs text-muted-foreground",
							children: "Selecione um bloco no canvas para editar suas propriedades."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 423,
							columnNumber: 27
						}, this), selected && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [
							/* @__PURE__ */ (void 0)(Field, {
								label: "Rótulo",
								children: /* @__PURE__ */ (void 0)(Input, {
									value: selected.data.label ?? "",
									onChange: (e) => updateSelected({ label: e.target.value })
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 429,
									columnNumber: 19
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 428,
								columnNumber: 17
							}, this),
							selectedKind === "assistant" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [
								/* @__PURE__ */ (void 0)(Field, {
									label: "Assistente utilizado",
									children: /* @__PURE__ */ (void 0)(Select, {
										defaultValue: "a1",
										children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 438,
											columnNumber: 27
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 437,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "a1",
												children: "Atendente Comercial"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 441,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "a2",
												children: "Suporte Técnico"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 442,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "a4",
												children: "Agendamento"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 443,
												columnNumber: 27
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 440,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 436,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 435,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Modelo",
									children: /* @__PURE__ */ (void 0)(Select, {
										defaultValue: "gpt-4o-mini",
										children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 450,
											columnNumber: 27
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 449,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "gpt-4o-mini",
												children: "gpt-4o-mini"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 453,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "gpt-4o",
												children: "gpt-4o"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 454,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "claude-3-5-sonnet",
												children: "claude-3-5-sonnet"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 455,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "gemini-1.5-pro",
												children: "gemini-1.5-pro"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 456,
												columnNumber: 27
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 452,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 448,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 447,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Temperatura",
									children: /* @__PURE__ */ (void 0)(Input, {
										type: "number",
										defaultValue: .4,
										step: .1
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 461,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 460,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Limite de confiança",
									children: /* @__PURE__ */ (void 0)(Input, {
										type: "number",
										defaultValue: .7,
										step: .05
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 464,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 463,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Prompt adicional",
									children: /* @__PURE__ */ (void 0)(Textarea, {
										rows: 3,
										placeholder: "Contexto extra..."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 467,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 466,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(ToggleRow, {
									label: "Utilizar memória",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 469,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(ToggleRow, {
									label: "Utilizar conhecimento",
									defaultChecked: true
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 470,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)("div", {
									className: "text-[10px] uppercase tracking-wide text-muted-foreground pt-2",
									children: "Saídas"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 471,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)("div", {
									className: "flex flex-wrap gap-1",
									children: ASSISTANT_OUTS.map((o) => /* @__PURE__ */ (void 0)("span", {
										className: "px-2 py-0.5 rounded-md bg-muted text-[10px]",
										children: o
									}, o, false, {
										fileName: _jsxFileName,
										lineNumber: 475,
										columnNumber: 48
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 474,
									columnNumber: 21
								}, this)
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 434,
								columnNumber: 50
							}, this),
							selectedKind === "decision" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [
								/* @__PURE__ */ (void 0)(Field, {
									label: "Instrução de classificação",
									children: /* @__PURE__ */ (void 0)(Textarea, {
										rows: 3,
										placeholder: "Classifique a mensagem do cliente em uma das categorias..."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 483,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 482,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Modelo",
									children: /* @__PURE__ */ (void 0)(Select, {
										defaultValue: "gpt-4o-mini",
										children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 488,
											columnNumber: 27
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 487,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [/* @__PURE__ */ (void 0)(SelectItem, {
											value: "gpt-4o-mini",
											children: "gpt-4o-mini"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 491,
											columnNumber: 27
										}, this), /* @__PURE__ */ (void 0)(SelectItem, {
											value: "claude-3-5-sonnet",
											children: "claude-3-5-sonnet"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 492,
											columnNumber: 27
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 490,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 486,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 485,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)("div", {
									className: "text-[10px] uppercase tracking-wide text-muted-foreground pt-2",
									children: "Categorias (saídas)"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 496,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)("div", {
									className: "flex flex-wrap gap-1",
									children: DECISION_OUTS.map((o) => /* @__PURE__ */ (void 0)("span", {
										className: "px-2 py-0.5 rounded-md bg-muted text-[10px]",
										children: o
									}, o, false, {
										fileName: _jsxFileName,
										lineNumber: 500,
										columnNumber: 47
									}, this))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 499,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)("p", {
									className: "text-[10px] text-muted-foreground",
									children: "Este bloco apenas classifica a intenção — não responde ao cliente."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 504,
									columnNumber: 21
								}, this)
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 481,
								columnNumber: 49
							}, this),
							selectedKind === "kb" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (void 0)(Field, {
								label: "Base de conhecimento",
								children: /* @__PURE__ */ (void 0)(Select, {
									defaultValue: "b1",
									children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 513,
										columnNumber: 27
									}, this) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 512,
										columnNumber: 25
									}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
										/* @__PURE__ */ (void 0)(SelectItem, {
											value: "b1",
											children: "Catálogo de produtos"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 516,
											columnNumber: 27
										}, this),
										/* @__PURE__ */ (void 0)(SelectItem, {
											value: "b2",
											children: "FAQ Suporte"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 517,
											columnNumber: 27
										}, this),
										/* @__PURE__ */ (void 0)(SelectItem, {
											value: "b4",
											children: "Procedimentos clínicos"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 518,
											columnNumber: 27
										}, this)
									] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 515,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 511,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 510,
								columnNumber: 21
							}, this), /* @__PURE__ */ (void 0)(Field, {
								label: "Top K",
								children: /* @__PURE__ */ (void 0)(Input, {
									type: "number",
									defaultValue: 4
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 523,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 522,
								columnNumber: 21
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 509,
								columnNumber: 43
							}, this),
							selectedKind === "tool" && /* @__PURE__ */ (void 0)(Field, {
								label: "Ferramenta",
								children: /* @__PURE__ */ (void 0)(Select, {
									defaultValue: "f1",
									children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 530,
										columnNumber: 25
									}, this) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 529,
										columnNumber: 23
									}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
										/* @__PURE__ */ (void 0)(SelectItem, {
											value: "f1",
											children: "Consultar OS"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 533,
											columnNumber: 25
										}, this),
										/* @__PURE__ */ (void 0)(SelectItem, {
											value: "f2",
											children: "Consultar boleto"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 534,
											columnNumber: 25
										}, this),
										/* @__PURE__ */ (void 0)(SelectItem, {
											value: "f5",
											children: "Transferir humano"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 535,
											columnNumber: 25
										}, this)
									] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 532,
										columnNumber: 23
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 528,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 527,
								columnNumber: 45
							}, this),
							selectedKind === "webhook" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [
								/* @__PURE__ */ (void 0)(Field, {
									label: "URL do webhook",
									children: /* @__PURE__ */ (void 0)(Input, { placeholder: "https://..." }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 542,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 541,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Método",
									children: /* @__PURE__ */ (void 0)(Select, {
										defaultValue: "POST",
										children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 547,
											columnNumber: 27
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 546,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
											"GET",
											"POST",
											"PUT",
											"DELETE"
										].map((m) => /* @__PURE__ */ (void 0)(SelectItem, {
											value: m,
											children: m
										}, m, false, {
											fileName: _jsxFileName,
											lineNumber: 550,
											columnNumber: 70
										}, this)) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 549,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 545,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 544,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)("p", {
									className: "text-[10px] text-muted-foreground",
									children: "Segredos do webhook são armazenados no backend."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 556,
									columnNumber: 21
								}, this)
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 540,
								columnNumber: 48
							}, this),
							selectedKind === "http" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [
								/* @__PURE__ */ (void 0)(Field, {
									label: "URL",
									children: /* @__PURE__ */ (void 0)(Input, { placeholder: "https://api.exemplo.com/recurso" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 563,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 562,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Método",
									children: /* @__PURE__ */ (void 0)(Select, {
										defaultValue: "GET",
										children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 568,
											columnNumber: 27
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 567,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
											"GET",
											"POST",
											"PUT",
											"DELETE",
											"PATCH"
										].map((m) => /* @__PURE__ */ (void 0)(SelectItem, {
											value: m,
											children: m
										}, m, false, {
											fileName: _jsxFileName,
											lineNumber: 571,
											columnNumber: 79
										}, this)) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 570,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 566,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 565,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Body (JSON)",
									children: /* @__PURE__ */ (void 0)(Textarea, {
										rows: 3,
										placeholder: "{\"chave\":\"valor\"}"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 578,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 577,
									columnNumber: 21
								}, this)
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 561,
								columnNumber: 45
							}, this),
							selectedKind === "cond" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [
								/* @__PURE__ */ (void 0)(Field, {
									label: "Variável",
									children: /* @__PURE__ */ (void 0)(Input, { placeholder: "ex: confidence" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 584,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 583,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Operador",
									children: /* @__PURE__ */ (void 0)(Select, {
										defaultValue: "gte",
										children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 589,
											columnNumber: 27
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 588,
											columnNumber: 25
										}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "gte",
												children: ">="
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 592,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "lte",
												children: "<="
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 593,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "eq",
												children: "="
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 594,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "neq",
												children: "!="
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 595,
												columnNumber: 27
											}, this),
											/* @__PURE__ */ (void 0)(SelectItem, {
												value: "contains",
												children: "contém"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 596,
												columnNumber: 27
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 591,
											columnNumber: 25
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 587,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 586,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Valor",
									children: /* @__PURE__ */ (void 0)(Input, { defaultValue: "0.7" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 601,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 600,
									columnNumber: 21
								}, this)
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 582,
								columnNumber: 45
							}, this),
							selectedKind === "wait" && /* @__PURE__ */ (void 0)(Field, {
								label: "Tempo (segundos)",
								children: /* @__PURE__ */ (void 0)(Input, {
									type: "number",
									defaultValue: 5
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 606,
									columnNumber: 21
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 605,
								columnNumber: 45
							}, this),
							selectedKind === "var" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (void 0)(Field, {
								label: "Nome da variável",
								children: /* @__PURE__ */ (void 0)(Input, { placeholder: "cliente_status" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 611,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 610,
								columnNumber: 21
							}, this), /* @__PURE__ */ (void 0)(Field, {
								label: "Valor",
								children: /* @__PURE__ */ (void 0)(Input, { placeholder: "{{ultima_mensagem}}" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 614,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 613,
								columnNumber: 21
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 609,
								columnNumber: 44
							}, this),
							selectedKind === "memory" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [
								/* @__PURE__ */ (void 0)(Field, {
									label: "Chave",
									children: /* @__PURE__ */ (void 0)(Input, { placeholder: "preferencia_atendimento" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 620,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 619,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Valor",
									children: /* @__PURE__ */ (void 0)(Input, { placeholder: "{{ultima_mensagem}}" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 623,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 622,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ (void 0)(Field, {
									label: "Expira em (dias)",
									children: /* @__PURE__ */ (void 0)(Input, {
										type: "number",
										defaultValue: 90
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 626,
										columnNumber: 23
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 625,
									columnNumber: 21
								}, this)
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 618,
								columnNumber: 47
							}, this),
							selectedKind === "human" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (void 0)(Field, {
								label: "Departamento",
								children: /* @__PURE__ */ (void 0)(Select, {
									defaultValue: "suporte",
									children: [/* @__PURE__ */ (void 0)(SelectTrigger, { children: /* @__PURE__ */ (void 0)(SelectValue, {}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 634,
										columnNumber: 27
									}, this) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 633,
										columnNumber: 25
									}, this), /* @__PURE__ */ (void 0)(SelectContent, { children: [
										/* @__PURE__ */ (void 0)(SelectItem, {
											value: "comercial",
											children: "Comercial"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 637,
											columnNumber: 27
										}, this),
										/* @__PURE__ */ (void 0)(SelectItem, {
											value: "suporte",
											children: "Suporte"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 638,
											columnNumber: 27
										}, this),
										/* @__PURE__ */ (void 0)(SelectItem, {
											value: "financeiro",
											children: "Financeiro"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 639,
											columnNumber: 27
										}, this)
									] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 636,
										columnNumber: 25
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 632,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 631,
								columnNumber: 21
							}, this), /* @__PURE__ */ (void 0)(Field, {
								label: "Mensagem de transferência",
								children: /* @__PURE__ */ (void 0)(Textarea, {
									rows: 2,
									placeholder: "Vou te transferir para um atendente humano..."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 644,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 643,
								columnNumber: 21
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 630,
								columnNumber: 46
							}, this),
							selectedKind === "end" && /* @__PURE__ */ (void 0)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (void 0)(Field, {
								label: "Mensagem de encerramento",
								children: /* @__PURE__ */ (void 0)(Textarea, {
									rows: 2,
									placeholder: "Obrigado pelo contato!"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 650,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 649,
								columnNumber: 21
							}, this), /* @__PURE__ */ (void 0)(Field, {
								label: "Tag (opcional)",
								children: /* @__PURE__ */ (void 0)(Input, { placeholder: "atendimento_concluido" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 653,
									columnNumber: 23
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 652,
								columnNumber: 21
							}, this)] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 648,
								columnNumber: 44
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 427,
							columnNumber: 26
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 422,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 413,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 375,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 349,
		columnNumber: 10
	}, this);
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
			className: "text-xs",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 670,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 669,
		columnNumber: 10
	}, this);
}
function ToggleRow({ label, defaultChecked }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex items-center justify-between p-2 border rounded-md text-xs",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: label }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 682,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, { defaultChecked }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 683,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 681,
		columnNumber: 10
	}, this);
}
//#endregion
export { FlowPage as component };
