import { r as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { t as Button } from "./_ssr/button-TeH4yfmP.mjs";
import { Bt as CircleCheck, S as Send, St as Bot, X as GitBranch, bt as Building2, c as Upload, et as FileUp, gt as ChevronLeft, ht as ChevronRight, n as Wrench, zt as CirclePlay } from "./_libs/lucide-react.mjs";
import { t as PageHeader } from "./_ssr/PageHeader-D4Y71euA.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Switch } from "./_ssr/switch-Cit-Q60v.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.implantacao-D0sab-4A.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.implantacao.tsx?tsr-split=component";
var steps = [
	{
		id: 1,
		label: "Dados da empresa",
		icon: Building2
	},
	{
		id: 2,
		label: "Criar Assistente",
		icon: Bot
	},
	{
		id: 3,
		label: "Enviar documentos",
		icon: FileUp
	},
	{
		id: 4,
		label: "Configurar Ferramentas",
		icon: Wrench
	},
	{
		id: 5,
		label: "Configurar Fluxo",
		icon: GitBranch
	},
	{
		id: 6,
		label: "Testar",
		icon: CirclePlay
	},
	{
		id: 7,
		label: "Publicar",
		icon: Send
	}
];
function ImplantacaoPage() {
	const [step, setStep] = (0, import_react.useState)(1);
	const current = steps.find((s) => s.id === step);
	const Icon = current.icon;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			title: "Assistente de Implantação",
			description: "Wizard guiado para colocar um novo Assistente IA em produção no Cubo.Chat."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 46,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
			className: "mb-4",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
				className: "p-4",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex items-center gap-1 overflow-x-auto",
					children: steps.map((s, idx) => {
						const SIcon = s.icon;
						const done = s.id < step;
						const active = s.id === step;
						return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "flex items-center gap-1 shrink-0",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
								onClick: () => setStep(s.id),
								className: cn("flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors", active && "bg-primary text-primary-foreground font-medium", done && !active && "text-primary", !active && !done && "text-muted-foreground hover:bg-accent"),
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
									className: cn("h-6 w-6 rounded-full grid place-items-center border text-[10px] font-bold", active && "border-primary-foreground", done && "border-primary bg-primary/10"),
									children: done ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleCheck, { className: "h-3.5 w-3.5" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 58,
										columnNumber: 31
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SIcon, { className: "h-3 w-3" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 58,
										columnNumber: 74
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 57,
									columnNumber: 21
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: s.label }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 60,
									columnNumber: 21
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 56,
								columnNumber: 19
							}, this), idx < steps.length - 1 && /* @__PURE__ */ (void 0)(ChevronRight, { className: "h-3 w-3 text-muted-foreground" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 62,
								columnNumber: 46
							}, this)]
						}, s.id, true, {
							fileName: _jsxFileName,
							lineNumber: 55,
							columnNumber: 20
						}, this);
					})
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 50,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 49,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 48,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
			className: "text-base flex items-center gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Icon, { className: "h-4 w-4 text-primary" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 72,
					columnNumber: 13
				}, this),
				" Etapa ",
				step,
				" · ",
				current.label
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 71,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 70,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
			className: "space-y-4",
			children: [
				step === 1 && /* @__PURE__ */ (void 0)(Step1, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 76,
					columnNumber: 26
				}, this),
				step === 2 && /* @__PURE__ */ (void 0)(Step2, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 77,
					columnNumber: 26
				}, this),
				step === 3 && /* @__PURE__ */ (void 0)(Step3, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 78,
					columnNumber: 26
				}, this),
				step === 4 && /* @__PURE__ */ (void 0)(Step4, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 79,
					columnNumber: 26
				}, this),
				step === 5 && /* @__PURE__ */ (void 0)(Step5, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 80,
					columnNumber: 26
				}, this),
				step === 6 && /* @__PURE__ */ (void 0)(Step6, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 81,
					columnNumber: 26
				}, this),
				step === 7 && /* @__PURE__ */ (void 0)(Step7, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 82,
					columnNumber: 26
				}, this),
				/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between pt-4 border-t",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						variant: "outline",
						disabled: step === 1,
						onClick: () => setStep(step - 1),
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronLeft, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 86,
							columnNumber: 15
						}, this), " Anterior"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 85,
						columnNumber: 13
					}, this), step < steps.length ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
						onClick: () => setStep(step + 1),
						children: ["Próximo ", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ChevronRight, { className: "h-4 w-4" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 89,
							columnNumber: 25
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 88,
						columnNumber: 36
					}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Send, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 91,
						columnNumber: 17
					}, this), " Publicar Assistente"] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 90,
						columnNumber: 27
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 84,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 75,
			columnNumber: 9
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 69,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 45,
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
			lineNumber: 106,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 105,
		columnNumber: 10
	}, this);
}
function Step1() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid grid-cols-1 md:grid-cols-2 gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Nome da empresa",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, { placeholder: "Ex.: Farmácia São Lucas" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 113,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 112,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Segmento",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione..." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 118,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 117,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: "comercio",
						children: "Comércio / Varejo"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 121,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: "saude",
						children: "Saúde"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 122,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: "servicos",
						children: "Serviços"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 123,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: "financeiro",
						children: "Financeiro"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 124,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
						value: "tecnologia",
						children: "Tecnologia"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 125,
						columnNumber: 13
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 120,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 116,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 115,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Site / URL",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, { placeholder: "https://" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 130,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 129,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Horário de atendimento",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, { placeholder: "Seg–Sex 08h–18h" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 133,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 132,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "md:col-span-2",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Sobre a empresa",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 3,
						placeholder: "Breve descrição do negócio, público-alvo e diferenciais..."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 137,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 136,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 135,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 111,
		columnNumber: 10
	}, this);
}
function Step2() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid grid-cols-1 md:grid-cols-2 gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Nome do Assistente",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, { placeholder: "Ex.: Atendente Comercial" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 145,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 144,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Persona",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
					defaultValue: "cordial",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 150,
						columnNumber: 13
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 149,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "cordial",
							children: "Cordial e empático"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 153,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "objetivo",
							children: "Objetivo e direto"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 154,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "tecnico",
							children: "Técnico e formal"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 155,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "descontraido",
							children: "Descontraído"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 156,
							columnNumber: 13
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 152,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 148,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 147,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Modelo",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
					defaultValue: "gpt-4o-mini",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 163,
						columnNumber: 13
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 162,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "gpt-4o-mini",
							children: "gpt-4o-mini"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 166,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "gpt-4o",
							children: "gpt-4o"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 167,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "claude-3-5-sonnet",
							children: "claude-3-5-sonnet"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 168,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "gemini-1.5-pro",
							children: "gemini-1.5-pro"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 169,
							columnNumber: 13
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 165,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 161,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 160,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
				label: "Idioma",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
					defaultValue: "pt-BR",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, {}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 176,
						columnNumber: 13
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 175,
						columnNumber: 11
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "pt-BR",
							children: "Português (BR)"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 179,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "en",
							children: "English"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 180,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
							value: "es",
							children: "Español"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 181,
							columnNumber: 13
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 178,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 174,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 173,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "md:col-span-2",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
					label: "Objetivo principal",
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
						rows: 3,
						placeholder: "O que esse Assistente deve resolver para o cliente final?"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 187,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 186,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 185,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 143,
		columnNumber: 10
	}, this);
}
function Step3() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "border-2 border-dashed rounded-lg p-8 grid place-items-center text-center text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Upload, { className: "h-8 w-8 text-muted-foreground mb-2" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 195,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "font-medium",
				children: "Arraste documentos aqui"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 196,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "text-xs text-muted-foreground mt-1",
				children: "PDF, DOCX, TXT, planilhas e FAQs · até 25 MB cada"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 197,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
				variant: "outline",
				size: "sm",
				className: "mt-3",
				children: "Selecionar arquivos"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 200,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 194,
		columnNumber: 7
	}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-xs",
		children: [
			{
				n: "catalogo_produtos.xlsx",
				s: "1,2 MB"
			},
			{
				n: "politica_trocas.pdf",
				s: "240 KB"
			},
			{
				n: "faq_atendimento.docx",
				s: "88 KB"
			}
		].map((f) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-center justify-between p-2.5 border rounded-md",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
				className: "truncate",
				children: f.n
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 215,
				columnNumber: 13
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
				className: "text-muted-foreground",
				children: f.s
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 216,
				columnNumber: 13
			}, this)]
		}, f.n, true, {
			fileName: _jsxFileName,
			lineNumber: 214,
			columnNumber: 19
		}, this))
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 204,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 193,
		columnNumber: 10
	}, this);
}
function Step4() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "text-xs text-muted-foreground",
			children: "Habilite as ferramentas que o Assistente poderá utilizar. Credenciais serão configuradas no backend."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 236,
			columnNumber: 7
		}, this), [
			{
				n: "Consultar pedido",
				t: "API REST"
			},
			{
				n: "Criar OS",
				t: "Webhook"
			},
			{
				n: "Transferir humano",
				t: "Cubo.Chat action"
			},
			{
				n: "Adicionar tag",
				t: "Cubo.Chat action"
			}
		].map((t, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-center justify-between p-3 border rounded-md",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-sm font-medium",
				children: t.n
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 242,
				columnNumber: 13
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-[11px] text-muted-foreground",
				children: t.t
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 243,
				columnNumber: 13
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 241,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Switch, { defaultChecked: i < 2 }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 245,
				columnNumber: 11
			}, this)]
		}, t.n, true, {
			fileName: _jsxFileName,
			lineNumber: 240,
			columnNumber: 28
		}, this))]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 235,
		columnNumber: 10
	}, this);
}
function Step5() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "text-xs text-muted-foreground",
			children: "Selecione um modelo de fluxo. Você poderá ajustá-lo no Flow Builder após a publicação."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 251,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid grid-cols-1 md:grid-cols-3 gap-3",
			children: [
				{
					n: "Atendimento padrão",
					d: "Recebe → Decisão IA → Assistente → Resposta"
				},
				{
					n: "Suporte com triagem",
					d: "Decisão IA → Conhecimento → Assistente → Transferir humano"
				},
				{
					n: "Comercial qualificador",
					d: "Assistente → Ferramenta CRM → Tag → Encerrar"
				}
			].map((f, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
				className: cn("text-left p-3 border rounded-lg hover:border-primary transition-colors", i === 0 && "border-primary bg-primary/5"),
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "text-sm font-medium",
					children: f.n
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 265,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "text-[11px] text-muted-foreground mt-1",
					children: f.d
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 266,
					columnNumber: 13
				}, this)]
			}, f.n, true, {
				fileName: _jsxFileName,
				lineNumber: 264,
				columnNumber: 24
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 254,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 250,
		columnNumber: 10
	}, this);
}
function Step6() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "p-3 border rounded-md bg-muted/30 text-xs",
				children: "Envie mensagens de teste para validar respostas, ferramentas e fallback antes de publicar."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 273,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "border rounded-md p-3 h-48 overflow-y-auto space-y-2 text-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "bg-muted rounded-lg px-3 py-1.5 max-w-[70%]",
							children: "Olá, quero a 2ª via do meu boleto."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 278,
							columnNumber: 11
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 277,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex justify-end",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "bg-primary text-primary-foreground rounded-lg px-3 py-1.5 max-w-[70%]",
							children: "Claro! Pode me confirmar seu CPF para que eu localize?"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 283,
							columnNumber: 11
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 282,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "bg-muted rounded-lg px-3 py-1.5 max-w-[70%]",
							children: "123.456.789-00"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 288,
							columnNumber: 11
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 287,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex justify-end",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "bg-primary text-primary-foreground rounded-lg px-3 py-1.5 max-w-[70%]",
							children: "Encontrei seu boleto. Enviei o link no chat. Posso ajudar em algo mais?"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 291,
							columnNumber: 11
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 290,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 276,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, { placeholder: "Digite uma mensagem..." }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 297,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { children: "Enviar" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 298,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 296,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 272,
		columnNumber: 10
	}, this);
}
function Step7() {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "p-4 border rounded-lg bg-emerald-500/5 border-emerald-500/30",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CircleCheck, { className: "h-4 w-4" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 306,
						columnNumber: 11
					}, this), " Tudo pronto para publicação"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 305,
					columnNumber: 9
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "text-xs text-muted-foreground mt-1",
					children: "Após publicar, o Assistente ficará disponível nos canais selecionados no Cubo.Chat."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 308,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 304,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 gap-3 text-xs",
				children: [
					["Empresa", "Farmácia São Lucas"],
					["Assistente", "Atendente Comercial"],
					["Modelo", "gpt-4o-mini"],
					["Documentos", "3 arquivos · 1,5 MB"],
					["Ferramentas ativas", "2"],
					["Fluxo", "Atendimento padrão"]
				].map(([k, v]) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex justify-between p-2.5 border rounded-md",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "text-muted-foreground",
						children: k
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 314,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "font-medium",
						children: v
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 315,
						columnNumber: 13
					}, this)]
				}, k, true, {
					fileName: _jsxFileName,
					lineNumber: 313,
					columnNumber: 229
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 312,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
				className: "text-xs",
				children: "Canais para publicação"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 319,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex flex-wrap gap-2 mt-1.5",
				children: [
					"WhatsApp Oficial",
					"Instagram",
					"Webchat",
					"Facebook",
					"Telegram",
					"E-mail"
				].map((c, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", {
					className: "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md text-xs cursor-pointer hover:bg-accent",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
						type: "checkbox",
						defaultChecked: i < 2,
						className: "accent-primary"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 322,
						columnNumber: 17
					}, this), c]
				}, c, true, {
					fileName: _jsxFileName,
					lineNumber: 321,
					columnNumber: 105
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 320,
				columnNumber: 9
			}, this)] }, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 318,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 303,
		columnNumber: 10
	}, this);
}
//#endregion
export { ImplantacaoPage as component };
