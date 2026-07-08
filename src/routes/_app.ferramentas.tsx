import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Copy, Pencil, PlayCircle, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { MaskedSecretInput, SecurityNotice } from "@/components";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ferramentas, clientes, clienteNome } from "@/data/mock";
import type { Tool } from "@/types";

export const Route = createFileRoute("/_app/ferramentas")({
  head: () => ({ meta: [{ title: "Ferramentas · Cubo AI Studio" }] }),
  component: FerramentasPage,
});

type ToolDraft = {
  nome: string;
  clienteId: string;
  descricao: string;
  tipo: Tool["tipo"];
  metodo: Tool["metodo"];
  url: string;
  headersJson: string;
  bodyJson: string;
  queryParams: string;
  timeoutMs: number;
  authType: "none" | "bearer" | "basic" | "apikey";
  token: string;
  inputFields: string;
  outputFields: string;
  responseExample: string;
  whenUse: string;
  whenNotUse: string;
  requireConfirmation: boolean;
};

const DEFAULT_DRAFT: ToolDraft = {
  nome: "",
  clienteId: clientes[0]?.id ?? "",
  descricao: "",
  tipo: "API REST",
  metodo: "GET",
  url: "",
  headersJson: '{"Content-Type":"application/json"}',
  bodyJson: "",
  queryParams: "",
  timeoutMs: 5000,
  authType: "none",
  token: "",
  inputFields: "",
  outputFields: "",
  responseExample: "",
  whenUse: "",
  whenNotUse: "",
  requireConfirmation: true,
};

function createDraft(tool?: Tool): ToolDraft {
  if (!tool) {
    return { ...DEFAULT_DRAFT };
  }

  return {
    ...DEFAULT_DRAFT,
    nome: tool.nome,
    clienteId: tool.clienteId,
    descricao: `Ferramenta demo para ${tool.nome.toLowerCase()}`,
    tipo: tool.tipo,
    metodo: tool.metodo,
    url: tool.url,
    token: tool.hasStoredSecret ? "●●●●●●" : "",
    inputFields: "id (string, obrigatório)",
    outputFields: "status, prazo, tecnico",
    responseExample: '{ "status": "em andamento", "prazo": "2026-07-01" }',
    whenUse: "Quando o cliente solicitar uma integração simulada",
    whenNotUse: "Quando a ação não fizer parte do fluxo demonstrativo",
  };
}

function buildToolFromDraft(id: string, draft: ToolDraft, previous?: Tool): Tool {
  return {
    id,
    nome: draft.nome.trim() || "Nova ferramenta",
    clienteId: draft.clienteId || clientes[0]?.id || "c1",
    tipo: draft.tipo,
    metodo: draft.metodo,
    url: draft.url.trim() || "https://exemplo.local/tool",
    status: previous?.status ?? "pausado",
    ultimoTeste: previous?.ultimoTeste ?? new Date().toISOString().slice(0, 10),
    hasStoredSecret: draft.token.trim().length > 0 || previous?.hasStoredSecret,
  };
}

function FerramentasPage() {
  const [tools, setTools] = useState<Tool[]>(() => ferramentas);
  const [selectedToolId, setSelectedToolId] = useState<string>(ferramentas[0]?.id ?? "");
  const [draft, setDraft] = useState<ToolDraft>(() => createDraft(ferramentas[0]));
  const [testFeedback, setTestFeedback] = useState<string>(
    "Modo demonstrativo: ferramentas ainda não estão conectadas ao backend.",
  );

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.id === selectedToolId) ?? null,
    [selectedToolId, tools],
  );

  useEffect(() => {
    setDraft(createDraft(selectedTool ?? undefined));
  }, [selectedToolId, selectedTool]);

  const updateDraft = <K extends keyof ToolDraft>(key: K, value: ToolDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const startNewTool = () => {
    setSelectedToolId("");
    setDraft({ ...DEFAULT_DRAFT });
    setTestFeedback("Novo rascunho iniciado em modo demonstrativo.");
    toast.info("Nova ferramenta em modo demonstrativo");
  };

  const saveTool = () => {
    const isEditing = Boolean(selectedToolId && selectedTool);
    const nextId = isEditing ? selectedToolId : `f-local-${Date.now()}`;
    const nextTool = buildToolFromDraft(nextId, draft, selectedTool ?? undefined);

    setTools((current) =>
      isEditing
        ? current.map((tool) => (tool.id === nextId ? nextTool : tool))
        : [nextTool, ...current],
    );
    setSelectedToolId(nextId);
    toast.success(isEditing ? "Ferramenta atualizada localmente" : "Ferramenta criada localmente");
  };

  const duplicateTool = (tool: Tool) => {
    const duplicated: Tool = {
      ...tool,
      id: `f-local-${Date.now()}`,
      nome: `${tool.nome} (cópia)`,
      ultimoTeste: new Date().toISOString().slice(0, 10),
    };

    setTools((current) => [duplicated, ...current]);
    setSelectedToolId(duplicated.id);
    toast.success("Ferramenta duplicada no modo demonstrativo");
  };

  const removeTool = (toolId: string) => {
    setTools((current) => current.filter((tool) => tool.id !== toolId));
    setSelectedToolId((current) => {
      return current === toolId ? "" : current;
    });
    toast.info("Ferramenta removida do estado local");
  };

  const testTool = (toolName?: string) => {
    const label = toolName?.trim() || draft.nome.trim() || "Nova ferramenta";
    setTestFeedback(`Teste simulado executado para ${label} em modo demonstrativo.`);
    toast.info("Teste demonstrativo concluído");
  };

  return (
    <div>
      <PageHeader
        title="Ferramentas / Webhooks"
        description="Configure ações e integrações que seus agentes podem executar."
        actions={
          <Button onClick={startNewTool}>
            <Plus className="h-4 w-4" /> Nova ferramenta
          </Button>
        }
      />

      <Card className="mb-6 border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Modo demonstrativo: ferramentas ainda não estão conectadas ao backend. Você pode criar,
          editar, duplicar e excluir itens apenas no estado local desta tela.
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último teste</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50 text-primary animate-pulse" />
                    <p className="font-semibold text-sm">Nenhuma ferramenta cadastrada</p>
                    <p className="text-xs">Clique em "Nova ferramenta" no topo para criar sua primeira integração demonstrativa.</p>
                  </TableCell>
                </TableRow>
              ) : (
                tools.map((tool) => (
                  <TableRow
                    key={tool.id}
                    data-state={tool.id === selectedToolId ? "selected" : undefined}
                  >
                    <TableCell className="font-medium">{tool.nome}</TableCell>
                    <TableCell>{clienteNome(tool.clienteId)}</TableCell>
                    <TableCell>{tool.tipo}</TableCell>
                    <TableCell>
                      <code className="text-xs">{tool.metodo}</code>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground text-xs">
                      {tool.url}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tool.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tool.ultimoTeste}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedToolId(tool.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedToolId(tool.id);
                            testTool(tool.nome);
                          }}
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => duplicateTool(tool)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600"
                          onClick={() => removeTool(tool.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editar ferramenta</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Nome">
            <Input value={draft.nome} onChange={(e) => updateDraft("nome", e.target.value)} />
          </Field>
          <Field label="Cliente">
            <Select
              value={draft.clienteId}
              onValueChange={(value) => updateDraft("clienteId", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Descrição" className="md:col-span-2">
            <Textarea
              rows={2}
              value={draft.descricao}
              onChange={(e) => updateDraft("descricao", e.target.value)}
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={draft.tipo}
              onValueChange={(value) => updateDraft("tipo", value as Tool["tipo"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Webhook">Webhook</SelectItem>
                <SelectItem value="API REST">API REST</SelectItem>
                <SelectItem value="Função interna">Função interna</SelectItem>
                <SelectItem value="Cubo.Chat action">Cubo.Chat action</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Método HTTP">
            <Select
              value={draft.metodo}
              onValueChange={(value) => updateDraft("metodo", value as Tool["metodo"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "DELETE"].map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="URL" className="md:col-span-2">
            <Input value={draft.url} onChange={(e) => updateDraft("url", e.target.value)} />
          </Field>
          <Field label="Headers (JSON)">
            <Textarea
              rows={3}
              value={draft.headersJson}
              onChange={(e) => updateDraft("headersJson", e.target.value)}
            />
          </Field>
          <Field label="Body (JSON)">
            <Textarea
              rows={3}
              value={draft.bodyJson}
              onChange={(e) => updateDraft("bodyJson", e.target.value)}
            />
          </Field>
          <Field label="Query params">
            <Textarea
              rows={2}
              value={draft.queryParams}
              onChange={(e) => updateDraft("queryParams", e.target.value)}
            />
          </Field>
          <Field label="Timeout (ms)">
            <Input
              type="number"
              value={draft.timeoutMs}
              onChange={(e) => updateDraft("timeoutMs", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Autenticação">
            <Select
              value={draft.authType}
              onValueChange={(value) => updateDraft("authType", value as ToolDraft["authType"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="apikey">API Key</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Token / chave">
            {/* 🔐 Segredo permanece só no frontend demonstrativo até a BE-022. */}
            <MaskedSecretInput
              storedHint={draft.token ? "Configurado localmente" : "Não configurado"}
              value={draft.token}
              onChange={(e) => updateDraft("token", e.target.value)}
            />
          </Field>
          <Field label="Campos de entrada esperados">
            <Textarea
              rows={2}
              value={draft.inputFields}
              onChange={(e) => updateDraft("inputFields", e.target.value)}
            />
          </Field>
          <Field label="Campos de saída esperados">
            <Textarea
              rows={2}
              value={draft.outputFields}
              onChange={(e) => updateDraft("outputFields", e.target.value)}
            />
          </Field>
          <Field label="Exemplo de resposta" className="md:col-span-2">
            <Textarea
              rows={3}
              value={draft.responseExample}
              onChange={(e) => updateDraft("responseExample", e.target.value)}
            />
          </Field>
          <Field label="Quando usar">
            <Textarea
              rows={2}
              value={draft.whenUse}
              onChange={(e) => updateDraft("whenUse", e.target.value)}
            />
          </Field>
          <Field label="Quando NÃO usar">
            <Textarea
              rows={2}
              value={draft.whenNotUse}
              onChange={(e) => updateDraft("whenNotUse", e.target.value)}
            />
          </Field>
          <div className="md:col-span-2 flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-sm">Exigir confirmação antes de executar</div>
              <div className="text-xs text-muted-foreground">
                Pede confirmação ao cliente antes de chamar a ferramenta
              </div>
            </div>
            <Switch
              checked={draft.requireConfirmation}
              onCheckedChange={(checked) => updateDraft("requireConfirmation", checked)}
            />
          </div>
          <div className="md:col-span-2">
            <SecurityNotice />
          </div>
          <div className="md:col-span-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            {testFeedback}
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button onClick={saveTool}>Salvar</Button>
            <Button variant="outline" onClick={() => testTool()}>
              <PlayCircle className="h-4 w-4" /> Testar ferramenta
            </Button>
            <Button
              variant="ghost"
              onClick={() => toast.info("Histórico demonstrativo ainda não conectado.")}
            >
              Ver histórico de execuções
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={"space-y-1.5 " + className}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
