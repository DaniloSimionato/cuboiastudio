import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Save,
  Send,
  Copy,
  ArrowLeft,
  Flag,
  GitBranch,
  Sparkles,
  BookOpen,
  Wrench,
  Clock,
  UserCheck,
  X,
  Trash2,
  Webhook,
  Globe,
  Braces,
  Brain,
  Bot,
  Network,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_app/flow")({
  head: () => ({ meta: [{ title: "Flow Builder · Cubo AI Studio" }] }),
  component: FlowPage,
});

type BlockKind =
  | "start"
  | "assistant"
  | "decision"
  | "kb"
  | "tool"
  | "webhook"
  | "http"
  | "cond"
  | "wait"
  | "var"
  | "memory"
  | "human"
  | "end";

type FlowNodeData = {
  kind: BlockKind;
  label: string;
};

type FlowNodeType = Node<FlowNodeData, "flowNode">;

type FlowBlock = {
  id: BlockKind;
  label: string;
  icon: LucideIcon;
  color: string;
  category: string;
};

const blocos: FlowBlock[] = [
  { id: "start", label: "Início", icon: Flag, color: "text-emerald-500", category: "Fluxo" },
  {
    id: "assistant",
    label: "Executar Assistente IA",
    icon: Sparkles,
    color: "text-primary",
    category: "IA",
  },
  { id: "decision", label: "Decisão IA", icon: Bot, color: "text-violet-500", category: "IA" },
  {
    id: "kb",
    label: "Buscar Conhecimento",
    icon: BookOpen,
    color: "text-indigo-500",
    category: "IA",
  },
  {
    id: "tool",
    label: "Executar Ferramenta",
    icon: Wrench,
    color: "text-fuchsia-500",
    category: "Integrações",
  },
  {
    id: "webhook",
    label: "Chamar Webhook",
    icon: Webhook,
    color: "text-amber-500",
    category: "Integrações",
  },
  {
    id: "http",
    label: "HTTP Request",
    icon: Globe,
    color: "text-sky-500",
    category: "Integrações",
  },
  { id: "cond", label: "Condição", icon: GitBranch, color: "text-amber-600", category: "Lógica" },
  { id: "wait", label: "Esperar", icon: Clock, color: "text-slate-500", category: "Lógica" },
  { id: "var", label: "Variáveis", icon: Braces, color: "text-teal-500", category: "Lógica" },
  {
    id: "memory",
    label: "Atualizar Memória",
    icon: Brain,
    color: "text-cyan-500",
    category: "Dados",
  },
  {
    id: "human",
    label: "Transferir Humano",
    icon: UserCheck,
    color: "text-orange-500",
    category: "Cubo.Chat",
  },
  { id: "end", label: "Encerrar Conversa", icon: X, color: "text-rose-500", category: "Cubo.Chat" },
];

const ASSISTANT_OUTS = [
  "sucesso",
  "baixa_confianca",
  "timeout",
  "erro",
  "ferramenta_indisponivel",
] as const;
const DECISION_OUTS = [
  "comercial",
  "financeiro",
  "suporte",
  "agendamento",
  "ordem_servico",
  "outros",
] as const;

function FlowNode({ data, selected }: NodeProps<FlowNodeType>) {
  const kind = data.kind;
  const meta = blocos.find((b) => b.id === kind) ?? blocos[0];
  const Icon = meta.icon;
  const isStart = kind === "start";
  const isEnd = kind === "end";

  const outs: string[] | null =
    kind === "assistant"
      ? [...ASSISTANT_OUTS]
      : kind === "decision"
        ? [...DECISION_OUTS]
        : kind === "cond"
          ? ["verdadeiro", "falso"]
          : null;

  return (
    <div
      className={`w-[200px] rounded-lg border bg-card shadow-sm text-xs transition-shadow ${
        selected ? "ring-2 ring-primary shadow-md" : "hover:shadow"
      }`}
    >
      {!isStart && (
        <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-primary" />
      )}
      <div className="flex items-center gap-1.5 font-medium px-3 py-2 border-b">
        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
        <span className="truncate">{meta.label}</span>
      </div>
      <div className="px-3 py-2 text-muted-foreground truncate">
        {data.label || "Configurar..."}
      </div>

      {outs ? (
        <div className="border-t divide-y">
          {outs.map((o, i) => (
            <div
              key={o}
              className="relative px-3 py-1.5 text-[10px] text-muted-foreground flex justify-between items-center"
            >
              <span className="truncate">{o}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={o}
                style={{ top: `${(100 / outs.length) * (i + 0.5)}%` }}
                className="!w-2.5 !h-2.5 !bg-primary"
              />
            </div>
          ))}
        </div>
      ) : (
        !isEnd && (
          <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-primary" />
        )
      )}
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };

const initialNodes: FlowNodeType[] = [
  {
    id: "1",
    type: "flowNode",
    position: { x: 20, y: 200 },
    data: { kind: "start", label: "Início" },
  },
  {
    id: "2",
    type: "flowNode",
    position: { x: 260, y: 200 },
    data: { kind: "decision", label: "Classificar intenção" },
  },
  {
    id: "3",
    type: "flowNode",
    position: { x: 540, y: 40 },
    data: { kind: "assistant", label: "Assistente Comercial" },
  },
  {
    id: "4",
    type: "flowNode",
    position: { x: 540, y: 240 },
    data: { kind: "assistant", label: "Assistente Suporte" },
  },
  {
    id: "5",
    type: "flowNode",
    position: { x: 540, y: 440 },
    data: { kind: "human", label: "Transferir humano" },
  },
  {
    id: "6",
    type: "flowNode",
    position: { x: 840, y: 240 },
    data: { kind: "end", label: "Encerrar" },
  },
];

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed },
  style: { strokeWidth: 2 },
};

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", ...defaultEdgeOptions },
  {
    id: "e2-3",
    source: "2",
    sourceHandle: "comercial",
    target: "3",
    label: "comercial",
    ...defaultEdgeOptions,
  },
  {
    id: "e2-4",
    source: "2",
    sourceHandle: "suporte",
    target: "4",
    label: "suporte",
    ...defaultEdgeOptions,
  },
  {
    id: "e2-5",
    source: "2",
    sourceHandle: "outros",
    target: "5",
    label: "outros",
    ...defaultEdgeOptions,
  },
  { id: "e3-6", source: "3", sourceHandle: "sucesso", target: "6", ...defaultEdgeOptions },
  { id: "e4-6", source: "4", sourceHandle: "sucesso", target: "6", ...defaultEdgeOptions },
];

function FlowPage() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  );
}

function FlowInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeType>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>("2");
  const [actionFeedback, setActionFeedback] = useState(
    "Modo visual demonstrativo. Persistência do fluxo será conectada em etapa futura.",
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(initialNodes.length + 1);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges],
  );

  const onDragStart = (e: React.DragEvent<HTMLElement>, kind: BlockKind) => {
    e.dataTransfer.setData("application/cubo-flow-kind", kind);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const addBlockToCanvas = useCallback(
    (kind: BlockKind, position?: { x: number; y: number }) => {
      const meta = blocos.find((b) => b.id === kind);
      if (!meta) {
        return;
      }

      const newId = String(idRef.current++);
      const fallbackPosition = {
        x: 120 + ((idRef.current - 1) % 4) * 40,
        y: 120 + ((idRef.current - 1) % 6) * 40,
      };

      setNodes((nds) => [
        ...nds,
        {
          id: newId,
          type: "flowNode",
          position: position ?? fallbackPosition,
          data: { kind, label: meta.label },
        },
      ]);
      setSelectedId(newId);
    },
    [setNodes],
  );

  const onDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/cubo-flow-kind") as BlockKind;
    if (!kind || !wrapperRef.current) return;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = { x: e.clientX - bounds.left - 100, y: e.clientY - bounds.top - 30 };
    addBlockToCanvas(kind, position);
  };

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );
  const updateSelected = (patch: Partial<FlowNodeData>) => {
    if (!selected) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  };
  const deleteSelected = () => {
    if (!selected) return;
    setNodes((nds) => nds.filter((n) => n.id !== selected.id));
    setEdges((eds) => eds.filter((e) => e.source !== selected.id && e.target !== selected.id));
    setSelectedId(null);
  };

  const selectedKind = selected?.data.kind ?? null;
  const selectedMeta = selectedKind ? blocos.find((b) => b.id === selectedKind) : null;

  const categorized = useMemo(() => {
    const map = new Map<string, typeof blocos>();
    blocos.forEach((b) => {
      if (b.id === "start") return;
      const arr = map.get(b.category) ?? [];
      arr.push(b);
      map.set(b.category, arr);
    });
    return Array.from(map.entries());
  }, []);

  const showDemoAction = (action: string) => {
    setActionFeedback(`${action} em modo visual demonstrativo.`);
    toast.info(`${action} em modo visual demonstrativo.`);
  };

  return (
    <div>
      <PageHeader
        title="Flow Builder"
        description="O fluxo controla a conversa: orquestra Assistentes IA, Ferramentas e respostas ao cliente."
        actions={
          <>
            <Button variant="outline" onClick={() => showDemoAction("Voltar")}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button variant="outline" onClick={() => showDemoAction("Duplicar fluxo")}>
              <Copy className="h-4 w-4" /> Duplicar
            </Button>
            <Button variant="outline" onClick={() => showDemoAction("Teste de fluxo")}>
              <Play className="h-4 w-4" /> Testar fluxo
            </Button>
            <Button variant="outline" onClick={() => showDemoAction("Salvar fluxo")}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
            <Button onClick={() => showDemoAction("Publicação do fluxo")}>
              <Send className="h-4 w-4" /> Publicar
            </Button>
          </>
        }
      />

      <p className="mb-4 text-xs text-muted-foreground">
        Modo visual demonstrativo. Clique em um bloco da lateral para adicioná-lo ao canvas ou
        arraste-o para posicionar manualmente.
      </p>

      <p className="mb-4 text-xs text-muted-foreground">{actionFeedback}</p>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5" /> Blocos
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">Arraste para o canvas</p>
          </CardHeader>
          <CardContent className="space-y-3 px-2">
            {categorized.map(([cat, list]) => (
              <div key={cat} className="space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 font-semibold">
                  {cat}
                </div>
                {list.map((b) => {
                  const Icon = b.icon;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      draggable
                      onDragStart={(e) => onDragStart(e, b.id)}
                      onClick={() => addBlockToCanvas(b.id)}
                      className="flex w-full items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent active:cursor-grabbing cursor-grab text-xs select-none text-left"
                    >
                      <Icon className={`h-3.5 w-3.5 ${b.color}`} />
                      <span className="truncate">{b.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-7 overflow-hidden">
          <CardContent className="p-0">
            <div
              ref={wrapperRef}
              className="h-[620px] w-full"
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                onNodeClick={(_, n) => setSelectedId(n.id)}
                onPaneClick={() => setSelectedId(null)}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={20} size={1} />
                <MiniMap pannable zoomable className="!bg-card" />
                <Controls />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Propriedades {selectedMeta ? `· ${selectedMeta.label}` : ""}</span>
              {selected && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={deleteSelected}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected && (
              <p className="text-xs text-muted-foreground">
                Selecione um bloco no canvas para editar suas propriedades.
              </p>
            )}

            {selected && (
              <>
                <Field label="Rótulo">
                  <Input
                    value={selected.data.label ?? ""}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                  />
                </Field>

                {selectedKind === "assistant" && (
                  <>
                    <Field label="Assistente utilizado">
                      <Select defaultValue="a1">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a1">Atendente Comercial</SelectItem>
                          <SelectItem value="a2">Suporte Técnico</SelectItem>
                          <SelectItem value="a4">Agendamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Modelo">
                      <Select defaultValue="gpt-4o-mini">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                          <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                          <SelectItem value="claude-3-5-sonnet">claude-3-5-sonnet</SelectItem>
                          <SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Temperatura">
                      <Input type="number" defaultValue={0.4} step={0.1} />
                    </Field>
                    <Field label="Limite de confiança">
                      <Input type="number" defaultValue={0.7} step={0.05} />
                    </Field>
                    <Field label="Prompt adicional">
                      <Textarea rows={3} placeholder="Contexto extra..." />
                    </Field>
                    <ToggleRow label="Utilizar memória" defaultChecked />
                    <ToggleRow label="Utilizar conhecimento" defaultChecked />
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground pt-2">
                      Saídas
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ASSISTANT_OUTS.map((o) => (
                        <span key={o} className="px-2 py-0.5 rounded-md bg-muted text-[10px]">
                          {o}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {selectedKind === "decision" && (
                  <>
                    <Field label="Instrução de classificação">
                      <Textarea
                        rows={3}
                        placeholder="Classifique a mensagem do cliente em uma das categorias..."
                      />
                    </Field>
                    <Field label="Modelo">
                      <Select defaultValue="gpt-4o-mini">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                          <SelectItem value="claude-3-5-sonnet">claude-3-5-sonnet</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground pt-2">
                      Categorias (saídas)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {DECISION_OUTS.map((o) => (
                        <span key={o} className="px-2 py-0.5 rounded-md bg-muted text-[10px]">
                          {o}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Este bloco apenas classifica a intenção — não responde ao cliente.
                    </p>
                  </>
                )}

                {selectedKind === "kb" && (
                  <>
                    <Field label="Base de conhecimento">
                      <Select defaultValue="b1">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="b1">Catálogo de produtos</SelectItem>
                          <SelectItem value="b2">FAQ Suporte</SelectItem>
                          <SelectItem value="b4">Procedimentos clínicos</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Top K">
                      <Input type="number" defaultValue={4} />
                    </Field>
                  </>
                )}

                {selectedKind === "tool" && (
                  <Field label="Ferramenta">
                    <Select defaultValue="f1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="f1">Consultar OS</SelectItem>
                        <SelectItem value="f2">Consultar boleto</SelectItem>
                        <SelectItem value="f5">Transferir humano</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {selectedKind === "webhook" && (
                  <>
                    <Field label="URL do webhook">
                      <Input placeholder="https://..." />
                    </Field>
                    <Field label="Método">
                      <Select defaultValue="POST">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["GET", "POST", "PUT", "DELETE"].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <p className="text-[10px] text-muted-foreground">
                      Segredos do webhook são armazenados no backend.
                    </p>
                  </>
                )}

                {selectedKind === "http" && (
                  <>
                    <Field label="URL">
                      <Input placeholder="https://api.exemplo.com/recurso" />
                    </Field>
                    <Field label="Método">
                      <Select defaultValue="GET">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Body (JSON)">
                      <Textarea rows={3} placeholder='{"chave":"valor"}' />
                    </Field>
                  </>
                )}

                {selectedKind === "cond" && (
                  <>
                    <Field label="Variável">
                      <Input placeholder="ex: confidence" />
                    </Field>
                    <Field label="Operador">
                      <Select defaultValue="gte">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gte">{">="}</SelectItem>
                          <SelectItem value="lte">{"<="}</SelectItem>
                          <SelectItem value="eq">{"="}</SelectItem>
                          <SelectItem value="neq">{"!="}</SelectItem>
                          <SelectItem value="contains">contém</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Valor">
                      <Input defaultValue="0.7" />
                    </Field>
                  </>
                )}

                {selectedKind === "wait" && (
                  <Field label="Tempo (segundos)">
                    <Input type="number" defaultValue={5} />
                  </Field>
                )}

                {selectedKind === "var" && (
                  <>
                    <Field label="Nome da variável">
                      <Input placeholder="cliente_status" />
                    </Field>
                    <Field label="Valor">
                      <Input placeholder="{{ultima_mensagem}}" />
                    </Field>
                  </>
                )}

                {selectedKind === "memory" && (
                  <>
                    <Field label="Chave">
                      <Input placeholder="preferencia_atendimento" />
                    </Field>
                    <Field label="Valor">
                      <Input placeholder="{{ultima_mensagem}}" />
                    </Field>
                    <Field label="Expira em (dias)">
                      <Input type="number" defaultValue={90} />
                    </Field>
                  </>
                )}

                {selectedKind === "human" && (
                  <>
                    <Field label="Departamento">
                      <Select defaultValue="suporte">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comercial">Comercial</SelectItem>
                          <SelectItem value="suporte">Suporte</SelectItem>
                          <SelectItem value="financeiro">Financeiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Mensagem de transferência">
                      <Textarea
                        rows={2}
                        placeholder="Vou te transferir para um atendente humano..."
                      />
                    </Field>
                  </>
                )}

                {selectedKind === "end" && (
                  <>
                    <Field label="Mensagem de encerramento">
                      <Textarea rows={2} placeholder="Obrigado pelo contato!" />
                    </Field>
                    <Field label="Tag (opcional)">
                      <Input placeholder="atendimento_concluido" />
                    </Field>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function ToggleRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 border rounded-md text-xs">
      <span>{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
