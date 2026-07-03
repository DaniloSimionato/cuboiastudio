import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { filterOperationalAssistants, resolveOperationalAssistantId } from "@/lib/assistants";
import { backendAssistantsService, currentCompanyService } from "@/services";
import type {
  BackendAssistantKnowledgeItem,
  BackendAssistantListItem,
  CurrentCompanyResponse,
} from "@/types";

export const Route = createFileRoute("/_app/conhecimento")({
  head: () => ({ meta: [{ title: "Base de Conhecimento · Cubo AI Studio" }] }),
  component: ConhecimentoPage,
});

function ConhecimentoPage() {
  const [company, setCompany] = useState<CurrentCompanyResponse["company"] | null>(null);
  const [assistants, setAssistants] = useState<BackendAssistantListItem[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [knowledge, setKnowledge] = useState<BackendAssistantKnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const selectableAssistants = useMemo(() => filterOperationalAssistants(assistants), [assistants]);

  const selectedAssistant = useMemo(
    () => selectableAssistants.find((assistant) => assistant.id === selectedAssistantId) ?? null,
    [selectableAssistants, selectedAssistantId],
  );

  const filteredKnowledge = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return knowledge;
    }

    return knowledge.filter(
      (item) =>
        item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query),
    );
  }, [knowledge, search]);

  const loadKnowledge = async (assistantId: string) => {
    if (!assistantId) {
      setKnowledge([]);
      return;
    }

    setKnowledgeLoading(true);
    try {
      const items = await backendAssistantsService.knowledgeList(assistantId);
      setKnowledge(items);
      setEditingId(null);
      setTitle("");
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a base.");
    } finally {
      setKnowledgeLoading(false);
    }
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
        const initialAssistant = resolveOperationalAssistantId(assistantItems);
        setSelectedAssistantId(initialAssistant);
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
  }, []);

  useEffect(() => {
    const nextAssistantId = resolveOperationalAssistantId(assistants, selectedAssistantId);

    if (nextAssistantId !== selectedAssistantId) {
      setSelectedAssistantId(nextAssistantId);
      return;
    }

    if (!nextAssistantId) {
      setKnowledge([]);
      return;
    }

    void loadKnowledge(nextAssistantId);
  }, [assistants, selectedAssistantId]);

  const handleEdit = (item: BackendAssistantKnowledgeItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
  };

  const handleSave = async () => {
    if (!selectedAssistantId || !title.trim() || !content.trim()) {
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
    };

    if (editingId) {
      await backendAssistantsService.knowledgeUpdate(selectedAssistantId, editingId, payload);
    } else {
      await backendAssistantsService.knowledgeCreate(selectedAssistantId, payload);
    }

    await loadKnowledge(selectedAssistantId);
  };

  const handleDelete = async (item: BackendAssistantKnowledgeItem) => {
    if (!selectedAssistantId) {
      return;
    }

    await backendAssistantsService.knowledgeDelete(selectedAssistantId, item.id);
    await loadKnowledge(selectedAssistantId);
  };

  return (
    <div>
      <PageHeader
        title="Base de Conhecimento"
        description={
          company
            ? `Gerencie a base manual do tenant ${company.name}.`
            : "Gerencie a base manual do tenant atual."
        }
        actions={
          <Button
            onClick={() => void loadKnowledge(selectedAssistantId)}
            disabled={!selectedAssistantId}
          >
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-4 grid gap-2 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Assistente</Label>
            <Select value={selectedAssistantId} onValueChange={setSelectedAssistantId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {selectableAssistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Busca</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar título ou conteúdo..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status do assistente</Label>
            <div className="h-10 flex items-center">
              {selectedAssistant ? (
                <StatusBadge status={selectedAssistant.status === "ACTIVE" ? "ativo" : "pausado"} />
              ) : (
                <span className="text-sm text-muted-foreground">Selecione um assistente</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState label="Carregando conhecimento real…" />
      ) : error ? (
        <ErrorState
          title="Não foi possível carregar a base"
          description={error}
          onRetry={() => void loadKnowledge(selectedAssistantId)}
        />
      ) : !selectedAssistant ? (
        <EmptyState
          title="Nenhum assistente disponível"
          description="Crie ou ative um assistente real para vincular conhecimento manual."
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-0">
              {knowledgeLoading ? (
                <LoadingState className="py-8" />
              ) : filteredKnowledge.length === 0 ? (
                <EmptyState
                  title="Sem itens de conhecimento"
                  description="Cadastre o primeiro texto manual para este assistente."
                  className="m-4"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Atualizado</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKnowledge.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate">{item.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {item.content}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status === "ACTIVE" ? "ativo" : "pausado"} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(item.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {editingId ? "Editar item" : "Criar item"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Título">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Horário de atendimento"
                />
              </Field>
              <Field label="Conteúdo">
                <Textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Atendemos de segunda a sexta das 08h às 18h."
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void handleSave()}
                  disabled={!title.trim() || !content.trim()}
                >
                  {editingId ? "Salvar alterações" : "Adicionar conhecimento"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setTitle("");
                    setContent("");
                  }}
                >
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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

function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
