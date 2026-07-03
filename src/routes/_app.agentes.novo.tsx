import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Save, Pause, PlayCircle, Link2, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { filterOperationalAssistants, resolveOperationalAssistantId } from "@/lib/assistants";
import { backendAssistantsService, currentCompanyService } from "@/services";
import type {
  BackendAssistantKnowledgeItem,
  BackendAssistantListItem,
  BackendAssistantPreviewResponse,
  CurrentCompanyResponse,
} from "@/types";

type RouteSearch = {
  assistantId?: string;
};

export const Route = createFileRoute("/_app/agentes/novo")({
  validateSearch: (search: Record<string, unknown>): RouteSearch => ({
    assistantId: typeof search.assistantId === "string" ? search.assistantId : undefined,
  }),
  head: () => ({ meta: [{ title: "Novo agente · Cubo AI Studio" }] }),
  component: NovoAgente,
});

function NovoAgente() {
  const search = Route.useSearch();

  const [company, setCompany] = useState<CurrentCompanyResponse["company"] | null>(null);
  const [assistants, setAssistants] = useState<BackendAssistantListItem[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>(search.assistantId ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState<number | null>(null);
  const [knowledge, setKnowledge] = useState<BackendAssistantKnowledgeItem[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState("Qual é o horário de atendimento?");
  const [previewResult, setPreviewResult] = useState<BackendAssistantPreviewResponse | null>(null);
  const selectableAssistants = useMemo(
    () => filterOperationalAssistants(assistants, { includeInactive: true }),
    [assistants],
  );

  const selectedAssistant = useMemo(
    () => selectableAssistants.find((assistant) => assistant.id === selectedAssistantId) ?? null,
    [selectableAssistants, selectedAssistantId],
  );

  const loadKnowledge = async (assistantId: string) => {
    if (!assistantId) {
      setKnowledge([]);
      return;
    }

    const items = await backendAssistantsService.knowledgeList(assistantId);
    setKnowledge(items);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [companyResponse, assistantItems] = await Promise.all([
          currentCompanyService.get(),
          backendAssistantsService.list(),
        ]);

        if (cancelled) {
          return;
        }

        setCompany(companyResponse.company);
        setAssistants(assistantItems);
        const initialAssistantId = resolveOperationalAssistantId(
          assistantItems,
          search.assistantId,
          { includeInactive: true },
        );
        setSelectedAssistantId(initialAssistantId);
        if (!initialAssistantId) {
          setName("");
          setDescription("");
          setStatus("ACTIVE");
          setKnowledge([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o backend.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [search.assistantId]);

  useEffect(() => {
    if (!selectedAssistantId) {
      setKnowledge([]);
      return;
    }

    void (async () => {
      try {
        const assistant = await backendAssistantsService.get(selectedAssistantId);
        setName(assistant.name);
        setDescription(assistant.description ?? "");
        setInitialMessage(assistant.initialMessage ?? "");
        setInstructions(assistant.instructions ?? "");
        setModel(assistant.model ?? "");
        setTemperature(assistant.temperature ?? null);
        setStatus(assistant.status);
        await loadKnowledge(selectedAssistantId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível carregar o assistente.");
      }
    })();
  }, [selectedAssistantId]);

  const handleCreateNew = () => {
    setSelectedAssistantId("");
    setName("");
    setDescription("");
    setInitialMessage("");
    setInstructions("");
    setModel("");
    setTemperature(null);
    setStatus("ACTIVE");
    setKnowledge([]);
    setPreviewResult(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    setSaving(true);
    try {
      if (selectedAssistantId) {
        const updated = await backendAssistantsService.update(selectedAssistantId, {
          name: name.trim(),
          description: description.trim() || null,
          initialMessage: initialMessage.trim() || null,
          instructions: instructions.trim() || null,
          model: model.trim() || null,
          temperature,
        });
        setAssistants((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        setName(updated.name);
        setDescription(updated.description ?? "");
        setInitialMessage(updated.initialMessage ?? "");
        setInstructions(updated.instructions ?? "");
        setModel(updated.model ?? "");
        setTemperature(updated.temperature ?? null);
        if (updated.status !== status) {
          const updatedStatus = await backendAssistantsService.updateStatus(
            selectedAssistantId,
            status,
          );
          setAssistants((items) =>
            items.map((item) => (item.id === updatedStatus.id ? updatedStatus : item)),
          );
        }
      } else {
        const created = await backendAssistantsService.create({
          name: name.trim(),
          description: description.trim() || null,
          initialMessage: initialMessage.trim() || null,
          instructions: instructions.trim() || null,
          model: model.trim() || null,
          temperature,
        });
        setAssistants((items) => [created, ...items]);
        setSelectedAssistantId(created.id);
        setName(created.name);
        setDescription(created.description ?? "");
        setInitialMessage(created.initialMessage ?? "");
        setInstructions(created.instructions ?? "");
        setModel(created.model ?? "");
        setTemperature(created.temperature ?? null);
        setStatus(created.status);
        await loadKnowledge(created.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedAssistantId) {
      return;
    }

    const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const updated = await backendAssistantsService.updateStatus(selectedAssistantId, nextStatus);
    setStatus(updated.status);
    setAssistants((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handlePreview = async () => {
    if (!selectedAssistantId || !previewQuestion.trim()) {
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await backendAssistantsService.preview(selectedAssistantId, previewQuestion);
      setPreviewResult(response);
    } finally {
      setPreviewLoading(false);
    }
  };

  const isActive = status === "ACTIVE";

  return (
    <div>
      <PageHeader
        title="Criar / Editar Agente"
        description={
          company
            ? `Configure o assistente real do tenant ${company.name}.`
            : "Configure o assistente real do tenant atual."
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/agentes">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Link>
            </Button>
            <Button variant="outline" onClick={handleCreateNew}>
              Novo
            </Button>
            <Button
              variant="outline"
              onClick={() => void handlePreview()}
              disabled={!selectedAssistantId || previewLoading}
            >
              <Sparkles className="h-4 w-4" /> Preview
            </Button>
            <Button variant="outline" onClick={handleToggleStatus} disabled={!selectedAssistantId}>
              {isActive ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              {isActive ? "Inativar" : "Ativar"}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !name.trim()}>
              <Save className="h-4 w-4" /> {selectedAssistantId ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      />

      {loading ? (
        <LoadingState label="Carregando assistente real…" />
      ) : error ? (
        <ErrorState
          title="Não foi possível carregar o assistente"
          description={error}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="p-4 grid gap-4 md:grid-cols-3">
              <Field label="Selecionar assistente">
                <Select
                  value={selectedAssistantId || "new"}
                  onValueChange={(value) => {
                    if (value === "new") {
                      handleCreateNew();
                    } else {
                      setSelectedAssistantId(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Novo assistente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo assistente</SelectItem>
                    {selectableAssistants.map((assistant) => (
                      <SelectItem key={assistant.id} value={assistant.id}>
                        {assistant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <div className="h-10 flex items-center">
                  <StatusBadge status={isActive ? "ativo" : "pausado"} />
                </div>
              </Field>
              <Field label="Resumo">
                <div className="text-sm text-muted-foreground">
                  {selectedAssistant?.description || description || "Sem descrição cadastrada."}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedAssistant?.instructions || instructions ? (
                    <Badge variant="secondary">Prompt configurado</Badge>
                  ) : (
                    <Badge variant="outline">Prompt padrão</Badge>
                  )}
                  {selectedAssistant?.initialMessage || initialMessage ? (
                    <Badge variant="secondary">Mensagem inicial</Badge>
                  ) : (
                    <Badge variant="outline">Sem mensagem inicial</Badge>
                  )}
                  <Badge variant="outline">
                    {model.trim() || selectedAssistant?.model || "Modelo padrão"}
                  </Badge>
                </div>
              </Field>
            </CardContent>
          </Card>

          <Tabs defaultValue="info">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
              <TabsTrigger value="ferramentas">Ferramentas</TabsTrigger>
              <TabsTrigger value="memoria">Memória</TabsTrigger>
              <TabsTrigger value="seguranca">Regras de Segurança</TabsTrigger>
              <TabsTrigger value="publicacao">Publicação</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardContent className="p-6 grid md:grid-cols-2 gap-4">
                  <Field label="Nome do assistente">
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field label="Empresa atual">
                    <Input value={company?.name ?? "Tenant atual"} disabled />
                  </Field>
                  <Field label="Descrição" className="md:col-span-2">
                    <Textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </Field>
                  <Field label="Modelo">
                    <Input
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Opcional. Se vazio, usa o modelo padrão do backend."
                    />
                  </Field>
                  <Field label="Temperatura">
                    <Input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperature ?? ""}
                      onChange={(e) => {
                        const nextValue = e.target.value.trim();
                        if (nextValue === "") {
                          setTemperature(null);
                          return;
                        }

                        const parsed = Number(nextValue);
                        setTemperature(Number.isNaN(parsed) ? null : parsed);
                      }}
                      placeholder="0.2"
                    />
                  </Field>
                  <div className="md:col-span-2 flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">Assistente ativo</div>
                      <div className="text-xs text-muted-foreground">
                        Receberá conversas quando o runtime persistido for acionado
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleToggleStatus}
                      disabled={!selectedAssistantId}
                    >
                      {isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                      {isActive ? "Inativar" : "Ativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prompt">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Field
                    label="Instruções do agente"
                    helper="Usadas pelo runtime de IA quando o provider estiver habilitado; também aparecem no debug dos testes."
                  >
                    <Textarea
                      rows={8}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Você é um atendente da Cubo.Chat. Responda de forma objetiva, educada e em português."
                    />
                  </Field>
                  <Field
                    label="Mensagem inicial"
                    helper="Opcional. Ao criar uma conversa nova, essa mensagem aparece como a primeira resposta do assistente."
                  >
                    <Textarea
                      rows={3}
                      value={initialMessage}
                      onChange={(e) => setInitialMessage(e.target.value)}
                      placeholder="Olá! Sou seu assistente. Como posso ajudar?"
                    />
                  </Field>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Modelo preferencial">
                      <Input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Opcional. Se vazio, usa o modelo padrão do backend."
                      />
                    </Field>
                    <Field
                      label="Temperatura"
                      helper="Valores menores deixam as respostas mais objetivas. Valores maiores deixam as respostas mais criativas."
                    >
                      <Input
                        type="number"
                        min={0}
                        max={2}
                        step={0.1}
                        value={temperature ?? ""}
                        onChange={(e) => {
                          const nextValue = e.target.value.trim();
                          if (nextValue === "") {
                            setTemperature(null);
                            return;
                          }

                          const parsed = Number(nextValue);
                          setTemperature(Number.isNaN(parsed) ? null : parsed);
                        }}
                        placeholder="0.2"
                      />
                    </Field>
                    <Field label="Mensagem quando não souber responder">
                      <Textarea
                        rows={3}
                        value="Não tenho essa informação na base atual. Posso transferir para um humano?"
                        readOnly
                      />
                    </Field>
                    <Field label="Instrução de segurança">
                      <Textarea
                        rows={3}
                        value="Não inventar dados, não chamar APIs externas e não expor segredos."
                        readOnly
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conhecimento">
              <Card>
                <CardContent className="p-6 space-y-2">
                  {knowledge.length === 0 ? (
                    <EmptyState
                      title="Sem conhecimento carregado"
                      description="Cadastre itens na tela Base de Conhecimento para este assistente."
                    />
                  ) : (
                    knowledge.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.content}
                          </div>
                        </div>
                        <StatusBadge status={item.status === "ACTIVE" ? "ativo" : "pausado"} />
                      </div>
                    ))
                  )}
                  <div className="pt-2">
                    <Button asChild variant="outline">
                      <Link to="/conhecimento">
                        <Link2 className="h-4 w-4" /> Ir para Base de Conhecimento
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ferramentas">
              <Card>
                <CardContent className="p-6">
                  <EmptyState
                    title="Ferramentas não conectadas nesta etapa"
                    description="A demo atual foca em assistentes, conhecimento e runtime determinístico."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="memoria">
              <Card>
                <CardContent className="p-6">
                  <EmptyState
                    title="Memória avançada ainda não conectada"
                    description="A memória persiste apenas no runtime backend atual."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seguranca">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <ToggleRow
                      label="Não responder sem base de conhecimento"
                      desc="Mantido no runtime determinístico do backend"
                      defaultChecked
                    />
                    <ToggleRow
                      label="Não chamar IA externa"
                      desc="Nenhuma integração com provedores é feita no frontend"
                      defaultChecked
                    />
                    <ToggleRow
                      label="Não expor segredos"
                      desc="Todos os tokens continuam apenas no backend"
                      defaultChecked
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="publicacao">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo do assistente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Summary label="Empresa" value={company?.name ?? "Tenant atual"} />
                  <Summary label="Assistente" value={name || "Novo assistente"} />
                  <Summary label="Status" value={isActive ? "Ativo" : "Inativo"} />
                  <Summary
                    label="Mensagem inicial"
                    value={initialMessage.trim() ? "Configurada" : "Não configurada"}
                  />
                  <Summary label="Conhecimento" value={`${knowledge.length} itens carregados`} />
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => void handleSave()}
                      disabled={saving || !name.trim()}
                    >
                      <Save className="h-4 w-4" /> {selectedAssistantId ? "Salvar" : "Criar"}
                    </Button>
                    {selectedAssistantId ? (
                      <Button variant="outline" asChild>
                        <Link to="/testes" search={{ assistantId: selectedAssistantId }}>
                          <PlayCircle className="h-4 w-4" /> Testar runtime
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" asChild>
                        <Link to="/testes">
                          <PlayCircle className="h-4 w-4" /> Testar runtime
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleToggleStatus}
                      disabled={!selectedAssistantId}
                    >
                      <Pause className="h-4 w-4" /> {isActive ? "Inativar" : "Ativar"}
                    </Button>
                    <Button
                      onClick={() => void handlePreview()}
                      disabled={!selectedAssistantId || previewLoading}
                    >
                      <Sparkles className="h-4 w-4" /> {previewLoading ? "Preview..." : "Preview"}
                    </Button>
                  </div>
                  {previewResult ? (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="text-sm font-medium">Resposta determinística</div>
                      <p className="text-sm">{previewResult.answer}</p>
                      <div className="flex flex-wrap gap-1">
                        {previewResult.sources.map((source) => (
                          <Badge key={source.id} variant="outline">
                            {source.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pergunta para preview</Label>
                    <Input
                      value={previewQuestion}
                      onChange={(e) => setPreviewQuestion(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  helper,
  className = "",
}: {
  label: string;
  children: ReactNode;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={"space-y-1.5 " + className}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {helper ? <div className="text-[11px] text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  defaultChecked,
}: {
  label: string;
  desc?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div className="font-medium text-sm">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <div className="h-8 w-8 rounded-full border grid place-items-center text-xs">
        {defaultChecked ? "✓" : "—"}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
