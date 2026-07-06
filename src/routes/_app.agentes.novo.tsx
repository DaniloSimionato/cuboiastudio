import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Save, Pause, PlayCircle, Link2, Sparkles, AlertTriangle, Plus, Check } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
  const [ragEnabled, setRagEnabled] = useState(false);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState<number | null>(null);
  const [knowledge, setKnowledge] = useState<BackendAssistantKnowledgeItem[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState("Qual é o horário de atendimento?");
  const [usePreparedKnowledge, setUsePreparedKnowledge] = useState(false);
  const [previewResult, setPreviewResult] = useState<BackendAssistantPreviewResponse | null>(null);

  const [noAnswerMessage, setNoAnswerMessage] = useState("");
  const [securityInstructions, setSecurityInstructions] = useState("");
  const [securityRules, setSecurityRules] = useState<{ id: string, name: string, type: string, instruction: string, active: boolean }[]>([
    { id: '1', name: 'Não informar preços sem base', type: 'Não inventar resposta', instruction: 'Se o preço não estiver na base de conhecimento ou ferramenta autorizada, diga que não possui essa informação e ofereça transferência para atendimento humano.', active: true }
  ]);
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [isAddingSecurityRule, setIsAddingSecurityRule] = useState(false);
  const [knowledgeFormId, setKnowledgeFormId] = useState<string | null>(null);
  const [knowledgeFormType, setKnowledgeFormType] = useState<"TEXT" | "URL" | "CONVERSATION">("TEXT");
  const [knowledgeFormTitle, setKnowledgeFormTitle] = useState("");
  const [knowledgeFormContent, setKnowledgeFormContent] = useState("");
  const [knowledgeFormUrl, setKnowledgeFormUrl] = useState("");
  const [knowledgeFormStatus, setKnowledgeFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [preparingKnowledgeId, setPreparingKnowledgeId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

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
          setRagEnabled(false);
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
        setNoAnswerMessage(assistant.fallbackMessage ?? "");
        setSecurityInstructions(assistant.safetyInstruction ?? "");
        setRagEnabled(assistant.ragEnabled ?? false);
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
    setNoAnswerMessage("");
    setSecurityInstructions("");
    setSecurityRules([
      { id: '1', name: 'Não informar preços sem base', type: 'Não inventar resposta', instruction: 'Se o preço não estiver na base de conhecimento ou ferramenta autorizada, diga que não possui essa informação e ofereça transferência para atendimento humano.', active: true }
    ]);
    setIsReviewConfirmed(false);
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
          fallbackMessage: noAnswerMessage.trim() || null,
          safetyInstruction: securityInstructions.trim() || null,
          ragEnabled,
        });
        setAssistants((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        setName(updated.name);
        setDescription(updated.description ?? "");
        setInitialMessage(updated.initialMessage ?? "");
        setInstructions(updated.instructions ?? "");
        setModel(updated.model ?? "");
        setTemperature(updated.temperature ?? null);
        setNoAnswerMessage(updated.fallbackMessage ?? "");
        setSecurityInstructions(updated.safetyInstruction ?? "");
        setRagEnabled(updated.ragEnabled ?? false);
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
          fallbackMessage: noAnswerMessage.trim() || null,
          safetyInstruction: securityInstructions.trim() || null,
          ragEnabled,
        });
        setAssistants((items) => [created, ...items]);
        setSelectedAssistantId(created.id);
        setName(created.name);
        setDescription(created.description ?? "");
        setInitialMessage(created.initialMessage ?? "");
        setInstructions(created.instructions ?? "");
        setModel(created.model ?? "");
        setTemperature(created.temperature ?? null);
        setNoAnswerMessage(created.fallbackMessage ?? "");
        setSecurityInstructions(created.safetyInstruction ?? "");
        setRagEnabled(created.ragEnabled ?? false);
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
      const response = await backendAssistantsService.preview(selectedAssistantId, previewQuestion, usePreparedKnowledge);
      setPreviewResult(response);
    } finally {
      setPreviewLoading(false);
    }
  };

  const isActive = status === "ACTIVE";

  const getTemperatureDescription = (temp: number | null) => {
    if (temp === null) return "Padrão do sistema";
    if (temp <= 0.2) return "Mais objetiva, segura e direta";
    if (temp <= 0.5) return "Equilibrada";
    if (temp <= 0.8) return "Mais criativa e flexível";
    return "Muito criativa, com maior risco de fugir do padrão";
  };

  const handleOpenNewKnowledge = () => {
    setKnowledgeFormId(null);
    setKnowledgeFormType("TEXT");
    setKnowledgeFormTitle("");
    setKnowledgeFormContent("");
    setKnowledgeFormUrl("");
    setKnowledgeFormStatus("ACTIVE");
    setIsAddingKnowledge(true);
  };

  const handleOpenEditKnowledge = (item: BackendAssistantKnowledgeItem) => {
    setKnowledgeFormId(item.id);
    setKnowledgeFormType(item.metadata?.type || "TEXT");
    setKnowledgeFormTitle(item.title);
    setKnowledgeFormContent(item.content);
    setKnowledgeFormUrl(item.metadata?.sourceUrl || "");
    setKnowledgeFormStatus(item.status === "ACTIVE" ? "ACTIVE" : "INACTIVE");
    setIsAddingKnowledge(true);
  };

  const handleSaveKnowledge = async () => {
    if (!knowledgeFormTitle.trim() || !knowledgeFormContent.trim() || !selectedAssistantId) {
      return;
    }
    
    setKnowledgeSaving(true);
    try {
      if (knowledgeFormId) {
        await backendAssistantsService.knowledgeUpdate(selectedAssistantId, knowledgeFormId, {
          title: knowledgeFormTitle.trim(),
          content: knowledgeFormContent.trim(),
          status: knowledgeFormStatus,
          metadata: {
            type: knowledgeFormType,
            ...(knowledgeFormType === "URL" ? { sourceUrl: knowledgeFormUrl.trim() } : {})
          }
        });
      } else {
        await backendAssistantsService.knowledgeCreate(selectedAssistantId, {
          title: knowledgeFormTitle.trim(),
          content: knowledgeFormContent.trim(),
          metadata: {
            type: knowledgeFormType,
            ...(knowledgeFormType === "URL" ? { sourceUrl: knowledgeFormUrl.trim() } : {})
          }
        });
      }
      await loadKnowledge(selectedAssistantId);
      setIsAddingKnowledge(false);
    } catch (err) {
      alert("Erro ao salvar conhecimento: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setKnowledgeSaving(false);
    }
  };

  const handlePrepareForAI = async (item: BackendAssistantKnowledgeItem) => {
    if (!selectedAssistantId) return;
    
    if (item.status === "INACTIVE") {
      alert("Ative este conhecimento antes de prepará-lo para a IA.");
      return;
    }

    setPreparingKnowledgeId(item.id);
    try {
      await backendAssistantsService.knowledgePrepare(selectedAssistantId, item.id);
      await loadKnowledge(selectedAssistantId);
      // alert("Conhecimento preparado com sucesso!");
    } catch (err) {
      alert("Erro ao preparar conhecimento: " + (err instanceof Error ? err.message : String(err)));
      await loadKnowledge(selectedAssistantId); // Recarrega para mostrar o status de ERRO
    } finally {
      setPreparingKnowledgeId(null);
    }
  };

  const activeKnowledgeCount = knowledge.filter(k => k.status === "ACTIVE").length;
  const readyKnowledgeCount = knowledge.filter(k => k.status === "ACTIVE" && k.processingStatus === "READY").length;
  const errorKnowledgeCount = knowledge.filter(k => k.status === "ACTIVE" && k.processingStatus === "ERROR").length;
  const draftKnowledgeCount = knowledge.filter(k => k.status === "ACTIVE" && k.processingStatus === "DRAFT").length;

  const handleSearchKnowledge = async () => {
    if (!selectedAssistantId) return;
    if (!searchQuery.trim()) {
      alert("Digite uma pergunta para testar.");
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      const response = await backendAssistantsService.knowledgeSearch(selectedAssistantId, searchQuery);
      setSearchResults(response.results);
      if (response.results.length === 0) {
        setSearchError("Nenhum conhecimento preparado foi encontrado para essa pergunta.");
      }
    } catch (err) {
      setSearchError("Erro ao buscar conhecimento: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSearching(false);
    }
  };

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
            <CardContent className="p-4 grid gap-4 md:grid-cols-2">
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Modelo da IA">
                      <Input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Opcional. Se vazio, usa o modelo padrão do backend."
                      />
                    </Field>
                    <Field label="Criatividade da resposta (Temperatura)">
                      <div className="space-y-3 pt-2">
                        <Slider
                          value={[temperature ?? 0.2]}
                          min={0}
                          max={1}
                          step={0.1}
                          onValueChange={(vals) => setTemperature(vals[0])}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{temperature ?? 0.2}</span>
                          <span>{getTemperatureDescription(temperature ?? 0.2)}</span>
                        </div>
                      </div>
                    </Field>
                  </div>
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
                  <Field
                    label="Instruções do agente (Prompt Principal)"
                    helper="Define a personalidade, função, tom de voz e comportamento do agente."
                  >
                    <Textarea
                      rows={6}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Você é um atendente da Cubo.Chat. Responda de forma objetiva, educada e em português."
                    />
                  </Field>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Mensagem quando não souber responder" helper="Resposta padrão quando a IA não encontra informação.">
                      <Textarea
                        rows={3}
                        value={noAnswerMessage}
                        onChange={(e) => setNoAnswerMessage(e.target.value)}
                      />
                    </Field>
                    <Field label="Instrução de segurança (Guardrails básicos)" helper="Regras base obrigatórias incorporadas ao prompt.">
                      <Textarea
                        rows={3}
                        value={securityInstructions}
                        onChange={(e) => setSecurityInstructions(e.target.value)}
                      />
                    </Field>
                  </div>
                  
                  <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10 mt-4">
                    <div className="space-y-0.5 max-w-[80%]">
                      <Label htmlFor="use-rag-production" className="text-base font-medium cursor-pointer">
                        Usar conhecimento preparado no atendimento real
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quando ativado, o agente buscará informações nos conhecimentos preparados antes de responder no atendimento real. Use somente após testar no Preview.
                      </p>
                      {ragEnabled && knowledge.filter(k => k.status === "ACTIVE" && k.processingStatus === "READY").length === 0 && (
                        <div className="text-amber-600 text-xs mt-2 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Você não possui conhecimentos ATIVOS e PREPARADOS. O agente responderá normalmente sem contexto até que os arquivos estejam prontos.
                        </div>
                      )}
                    </div>
                    <Switch
                      id="use-rag-production"
                      checked={ragEnabled}
                      onCheckedChange={setRagEnabled}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conhecimento">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Base de Conhecimento Ativa</CardTitle>
                  <Dialog open={isAddingKnowledge} onOpenChange={setIsAddingKnowledge}>
                    <Button size="sm" onClick={handleOpenNewKnowledge} disabled={!selectedAssistantId}>
                      <Plus className="h-4 w-4 mr-2" /> Adicionar conhecimento
                    </Button>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>{knowledgeFormId ? "Editar Conhecimento" : "Adicionar Conhecimento"}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <Field label="Título">
                          <Input value={knowledgeFormTitle} onChange={(e) => setKnowledgeFormTitle(e.target.value)} />
                        </Field>
                        <Field label="Tipo de conhecimento">
                          <Select value={knowledgeFormType} onValueChange={(val: any) => setKnowledgeFormType(val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TEXT">Texto manual</SelectItem>
                              <SelectItem value="URL">URL (Site)</SelectItem>
                              <SelectItem value="CONVERSATION">Conversa de exemplo</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        {knowledgeFormType === "URL" && (
                          <Field label="URL">
                            <Input placeholder="https://exemplo.com/faq" value={knowledgeFormUrl} onChange={(e) => setKnowledgeFormUrl(e.target.value)} />
                          </Field>
                        )}
                        <Field label="Conteúdo (Base para a IA ler)">
                          <Textarea rows={6} value={knowledgeFormContent} onChange={(e) => setKnowledgeFormContent(e.target.value)} />
                        </Field>
                        {knowledgeFormId && (
                           <div className="flex items-center gap-2 mt-2">
                              <Checkbox 
                                id="knowledge-active" 
                                checked={knowledgeFormStatus === "ACTIVE"} 
                                onCheckedChange={(c) => setKnowledgeFormStatus(c ? "ACTIVE" : "INACTIVE")} 
                              />
                              <Label htmlFor="knowledge-active">Este conhecimento está ativo e liberado para uso</Label>
                           </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 border-l-2 pl-3 border-amber-300">
                           Este conteúdo ficará salvo na base de conhecimento do agente. A preparação para IA (vetorização) será feita em uma próxima etapa.
                        </p>
                      </div>
                      <DialogFooter>
                         <Button variant="outline" onClick={() => setIsAddingKnowledge(false)}>Cancelar</Button>
                         <Button onClick={() => void handleSaveKnowledge()} disabled={knowledgeSaving || !knowledgeFormTitle.trim() || !knowledgeFormContent.trim()}>
                            {knowledgeSaving ? "Salvando..." : "Salvar"}
                         </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3">
                  {!selectedAssistantId ? (
                    <EmptyState
                      title="Agente não salvo"
                      description="Salve o agente primeiro antes de adicionar conhecimentos."
                    />
                  ) : knowledge.length === 0 ? (
                    <EmptyState
                      title="Sem conhecimento carregado"
                      description="Adicione conhecimentos para que o agente tenha contexto sobre sua empresa."
                    />
                  ) : (
                    knowledge.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium cursor-pointer hover:underline" onClick={() => handleOpenEditKnowledge(item)}>{item.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-muted rounded-md border">
                               {item.metadata?.type === "URL" ? "URL" : item.metadata?.type === "CONVERSATION" ? "Conversa de Exemplo" : "Texto Manual"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                               Atualizado em {new Date(item.updatedAt).toLocaleDateString()}
                            </span>
                            {item.processingStatus === "READY" && (
                              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">Pronto ({item.chunkCount} blocos)</span>
                            )}
                            {item.processingStatus === "PROCESSING" && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">Processando...</span>
                            )}
                            {item.processingStatus === "ERROR" && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-md" title={item.processingError || "Erro desconhecido"}>Erro</span>
                            )}
                            {item.processingStatus === "DRAFT" && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md">Pendente</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={item.status === "ACTIVE" ? "ativo" : "pausado"} />
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => void handlePrepareForAI(item)}
                            disabled={preparingKnowledgeId === item.id || item.status === "INACTIVE"}
                          >
                            {preparingKnowledgeId === item.id ? "Preparando..." : item.processingStatus === "ERROR" ? "Tentar Novamente" : item.processingStatus === "READY" ? "Reprocessar IA" : "Preparar para IA"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditKnowledge(item)}>Editar</Button>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="pt-4 border-t flex justify-end">
                    <Button asChild variant="outline">
                      <Link to="/conhecimento">
                        <Link2 className="h-4 w-4 mr-2" /> Gerenciar Base de Conhecimento
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* RAG Test Area */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Testar busca no conhecimento</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  {readyKnowledgeCount === 0 ? (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">Você precisa ter pelo menos um conhecimento preparado (Pronto) para testar a busca.</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Digite uma pergunta para testar a busca semântica..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearchKnowledge()}
                        />
                        <Button 
                          onClick={() => void handleSearchKnowledge()} 
                          disabled={isSearching || !searchQuery.trim()}
                        >
                          {isSearching ? "Buscando..." : "Buscar relevante"}
                        </Button>
                      </div>

                      {searchError && (
                        <div className="text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-lg">
                          {searchError}
                        </div>
                      )}

                      {searchResults && searchResults.length > 0 && (
                        <div className="space-y-3 mt-4">
                          <div className="text-sm font-medium">Resultados encontrados:</div>
                          {searchResults.map((res, i) => (
                            <div key={res.chunkId} className="p-3 border rounded-lg bg-muted/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">
                                  #{i+1} - {res.knowledgeTitle}
                                </div>
                                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-semibold">
                                  Score: {(res.score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground italic border-l-2 pl-2">
                                "{res.contentPreview}"
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Regras de Segurança</CardTitle>
                  <Dialog open={isAddingSecurityRule} onOpenChange={setIsAddingSecurityRule}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Adicionar regra de segurança</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Regra de Segurança</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Field label="Nome da regra">
                          <Input placeholder="Ex: Não divulgar descontos" />
                        </Field>
                        <Field label="Tipo da regra">
                          <Select defaultValue="bloquear">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bloquear">Bloquear assunto</SelectItem>
                              <SelectItem value="nao-inventar">Não inventar resposta</SelectItem>
                              <SelectItem value="transferir">Transferir para humano</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddingSecurityRule(false)}>Cancelar</Button>
                        <Button onClick={() => setIsAddingSecurityRule(false)}>Salvar regra</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-3">
                    {securityRules.map(rule => (
                      <div key={rule.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            {rule.name}
                            <Badge variant="outline">{rule.type}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">{rule.instruction}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium">{rule.active ? 'Ativa' : 'Inativa'}</div>
                          <Checkbox checked={rule.active} onCheckedChange={(c) => {
                            setSecurityRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !!c } : r));
                          }} />
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t space-y-3">
                      <div className="text-sm font-medium">Filtros Nativos do Sistema</div>
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="publicacao">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Revisão Final</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!name.trim() && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">O nome do agente é obrigatório.</span>
                      </div>
                    )}
                    {!instructions.trim() && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">Você está usando o prompt padrão do sistema. Recomendamos personalizar as instruções.</span>
                      </div>
                    )}
                    {activeKnowledgeCount === 0 && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">Nenhum conhecimento ativo foi adicionado. O agente responderá apenas com base no prompt.</span>
                      </div>
                    )}
                    {activeKnowledgeCount > 0 && readyKnowledgeCount === 0 && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">O agente ainda não possui conhecimento preparado para IA. Ele responderá apenas com base no prompt.</span>
                      </div>
                    )}
                    {draftKnowledgeCount > 0 && readyKnowledgeCount > 0 && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">Existem conhecimentos ativos que ainda não foram preparados para IA.</span>
                      </div>
                    )}
                    {errorKnowledgeCount > 0 && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">Alguns conhecimentos falharam na preparação. Revise antes de publicar.</span>
                      </div>
                    )}
                    {knowledge.filter(k => k.status === "INACTIVE").length > 0 && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">Você tem conhecimentos inativos que não serão utilizados pela IA.</span>
                      </div>
                    )}
                    {readyKnowledgeCount > 0 && (
                      <div className={`flex items-center gap-2 p-3 rounded-lg border ${ragEnabled ? 'text-green-700 bg-green-50 border-green-200' : 'text-blue-600 bg-blue-50 border-blue-200'}`}>
                        <span className="text-sm font-medium">
                          {ragEnabled
                            ? "Os conhecimentos preparados estão ATIVOS para o atendimento real! A IA usará esses documentos para responder."
                            : "Os conhecimentos preparados podem ser testados na aba Preview. A integração real com a IA está DESATIVADA."
                          }
                        </span>
                      </div>
                    )}

                    <div className="space-y-1 bg-muted/30 p-4 rounded-lg border">
                      <Summary label="Empresa" value={company?.name ?? "Tenant atual"} />
                      <Summary label="Nome do Agente" value={name || "Não definido"} />
                      <Summary label="Status Planejado" value={isActive ? "Ativo" : "Inativo"} />
                      <Summary label="Modelo da IA" value={model || "Padrão do sistema"} />
                      <Summary label="Temperatura" value={`${temperature ?? 0.2} - ${getTemperatureDescription(temperature ?? 0.2)}`} />
                      <Summary label="Mensagem inicial" value={initialMessage.trim() ? "Configurada" : "Não configurada"} />
                      <Summary label="Prompt Principal" value={instructions.trim() ? "Configurado" : "Padrão do sistema"} />
                      <Summary label="Mensagem fallback" value="Configurada" />
                      <Summary label="Conhecimento Ativo" value={`${activeKnowledgeCount} itens (${readyKnowledgeCount} preparados)`} />
                      <Summary label="Conhecimento no Atendimento Real" value={ragEnabled ? "Ativado" : "Desativado"} />
                      <Summary label="Regras de Segurança" value={`${securityRules.filter(r => r.active).length} ativas`} />
                    </div>

                    <div className="pt-4 space-y-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="confirm-review" 
                          checked={isReviewConfirmed} 
                          onCheckedChange={(c) => setIsReviewConfirmed(!!c)} 
                        />
                        <Label htmlFor="confirm-review" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Confirmo que revisei as alterações e desejo salvar este agente.
                        </Label>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => void handleSave()}
                        disabled={saving || !name.trim() || !isReviewConfirmed}
                      >
                        <Save className="h-4 w-4 mr-2" /> Confirmar e salvar alterações
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Exemplo de Conversa (Simulação)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-4">
                      {initialMessage.trim() && (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            IA
                          </div>
                          <div className="bg-primary/5 border rounded-lg p-3 text-sm flex-1">
                            {initialMessage}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-row-reverse gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                          VC
                        </div>
                        <div className="bg-muted border rounded-lg p-3 text-sm">
                          {previewQuestion}
                        </div>
                      </div>

                      {previewResult && (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            IA
                          </div>
                          <div className="bg-primary/5 border rounded-lg p-3 text-sm flex-1 space-y-2">
                            <div>{previewResult.answer}</div>
                            {previewResult.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t text-xs">
                                <div className="font-medium text-muted-foreground mb-1">Fontes manuais sugeridas:</div>
                                {previewResult.sources.map((source) => (
                                  <div key={source.id} className="truncate">• {source.title}</div>
                                ))}
                              </div>
                            )}
                            
                            {/* Bloco de Conhecimento RAG do Teste */}
                            {previewResult.ragEnabled && (
                              <div className="mt-3 pt-3 border-t text-xs">
                                <div className="font-medium text-blue-600 mb-1 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" /> Conhecimentos usados neste teste:
                                </div>
                                {previewResult.usedKnowledge && previewResult.usedKnowledge.length > 0 ? (
                                  <div className="space-y-2 mt-2">
                                    {previewResult.usedKnowledge.map((k) => (
                                      <div key={k.chunkId} className="bg-blue-50/50 p-2 rounded border border-blue-100">
                                        <div className="flex justify-between items-start mb-1">
                                          <div className="font-semibold text-blue-800 line-clamp-1">{k.title}</div>
                                          <Badge variant="outline" className="text-[10px] py-0 px-1 shrink-0 bg-white">
                                            Score: {(k.score * 100).toFixed(1)}%
                                          </Badge>
                                        </div>
                                        <div className="text-muted-foreground line-clamp-3 leading-relaxed">
                                          "{k.contentPreview}"
                                        </div>
                                      </div>
                                    ))}
                                    <div className="text-[10px] text-muted-foreground pt-1">
                                      Total de chunks escaneados: {previewResult.totalChunksScanned}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 italic">
                                    Nenhum conhecimento relevante foi encontrado para esta pergunta.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs">Faça uma pergunta para testar as respostas</Label>
                      
                      <div className="flex items-center space-x-2 px-1">
                        <Switch 
                          id="use-rag-preview" 
                          checked={usePreparedKnowledge} 
                          onCheckedChange={setUsePreparedKnowledge} 
                        />
                        <Label htmlFor="use-rag-preview" className="text-xs text-muted-foreground cursor-pointer">
                          Usar conhecimento preparado neste teste
                        </Label>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={previewQuestion}
                          onChange={(e) => setPreviewQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && void handlePreview()}
                        />
                        <Button 
                          onClick={() => void handlePreview()}
                          disabled={!selectedAssistantId || previewLoading}
                          variant="secondary"
                        >
                          <Sparkles className="h-4 w-4 mr-2" /> {previewLoading ? "Simulando..." : "Simular"}
                        </Button>
                      </div>
                      {!selectedAssistantId && (
                         <p className="text-[10px] text-muted-foreground">Salve o agente primeiro para habilitar a simulação.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
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
