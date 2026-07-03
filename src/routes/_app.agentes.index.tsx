import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, PlayCircle, Pause, Play, Search, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { filterOperationalAssistants, isSmokeAssistant } from "@/lib/assistants";
import { backendAssistantsService, currentCompanyService } from "@/services";
import type { BackendAssistantListItem, CurrentCompanyResponse } from "@/types";

export const Route = createFileRoute("/_app/agentes/")({
  head: () => ({ meta: [{ title: "Assistentes IA · Cubo AI Studio" }] }),
  component: AgentesPage,
});

type UiStatus = "active" | "inactive" | "all";

function AgentesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<UiStatus>("active");
  const [company, setCompany] = useState<CurrentCompanyResponse["company"] | null>(null);
  const [assistants, setAssistants] = useState<BackendAssistantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [companyResponse, assistantItems] = await Promise.all([
        currentCompanyService.get(),
        backendAssistantsService.list(),
      ]);
      setCompany(companyResponse.company);
      setAssistants(assistantItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os assistentes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const realAssistants = filterOperationalAssistants(assistants, { includeInactive: true });

    return realAssistants.filter((assistant) => {
      const matchesStatus =
        status === "all" ||
        (status === "active" && assistant.status === "ACTIVE") ||
        (status === "inactive" && assistant.status === "INACTIVE");
      const matchesQuery =
        normalizedQuery.length === 0 || assistant.name.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [assistants, query, status]);

  const hiddenSmokeCount = useMemo(() => {
    return assistants.filter(isSmokeAssistant).length;
  }, [assistants]);

  const visibleRealAssistantsCount = useMemo(() => {
    return assistants.filter((assistant) => !isSmokeAssistant(assistant)).length;
  }, [assistants]);

  const hasOnlyHiddenSmokeAssistants = visibleRealAssistantsCount === 0 && hiddenSmokeCount > 0;

  const handleToggleStatus = async (assistant: BackendAssistantListItem) => {
    const nextStatus = assistant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setSavingId(assistant.id);

    try {
      const updated = await backendAssistantsService.updateStatus(assistant.id, nextStatus);
      setAssistants((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Assistentes IA"
        description={
          company
            ? `Gerencie os assistentes reais do tenant ${company.name}.`
            : "Gerencie os assistentes reais do tenant atual."
        }
        actions={
          <Button asChild>
            <Link to="/agentes/novo">
              <Plus className="h-4 w-4" /> Criar novo Assistente
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as UiStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Carregando assistentes reais…" />
      ) : error ? (
        <ErrorState
          title="Não foi possível carregar os assistentes"
          description={error}
          onRetry={() => void load()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum assistente encontrado"
          description={
            hasOnlyHiddenSmokeAssistants
              ? "Há apenas artefatos técnicos de smoke test ocultos nesta tela."
              : "Tente limpar os filtros ou criar um novo assistente."
          }
          action={
            <Button asChild>
              <Link to="/agentes/novo">
                <Plus className="h-4 w-4" /> Criar assistente
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((assistant) => {
            const isActive = assistant.status === "ACTIVE";

            return (
              <Card key={assistant.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold">
                      {assistant.name.charAt(0)}
                    </div>
                    <StatusBadge status={isActive ? "ativo" : "pausado"} />
                  </div>
                  <h3 className="font-semibold">{assistant.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">
                    {assistant.description || "Sem descrição cadastrada."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assistant.instructions ? (
                      <Badge variant="secondary">Prompt configurado</Badge>
                    ) : (
                      <Badge variant="outline">Prompt padrão</Badge>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <Row label="Empresa" value={company?.name ?? "Tenant atual"} />
                    <Row label="Status" value={isActive ? "Ativo" : "Inativo"} />
                    <Row label="Atualizado" value={formatDate(assistant.updatedAt)} />
                  </div>

                  <div className="flex gap-1 mt-4 pt-3 border-t">
                    <Button size="sm" variant="ghost" asChild title="Editar">
                      <Link to="/agentes/novo" search={{ assistantId: assistant.id }}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild title="Testar">
                      <Link to="/testes" search={{ assistantId: assistant.id }}>
                        <PlayCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title={isActive ? "Inativar" : "Ativar"}
                      onClick={() => void handleToggleStatus(assistant)}
                      disabled={savingId === assistant.id}
                    >
                      {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate">{value}</span>
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
