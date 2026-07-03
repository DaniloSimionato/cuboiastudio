import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ApiError } from "@/services/apiClient";
import { logsService } from "@/services";
import {
  formatConversationChannelLabel,
  formatConversationSourceLabel,
} from "@/lib/conversations";
import type { AiRuntimeLogDetail, AiRuntimeLogListItem } from "@/types";

export const Route = createFileRoute("/_app/logs")({
  head: () => ({ meta: [{ title: "Logs · Cubo AI Studio" }] }),
  component: LogsPage,
});

function LogsPage() {
  const [items, setItems] = useState<AiRuntimeLogListItem[]>([]);
  const [selected, setSelected] = useState<AiRuntimeLogDetail | null>(null);
  const [mode, setMode] = useState("all");
  const [status, setStatus] = useState("all");
  const [fallback, setFallback] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const logs = await logsService.list({
        ...(mode !== "all" ? { mode } : {}),
        ...(status !== "all" ? { status } : {}),
        ...(fallback !== "all" ? { fallback: fallback === "true" } : {}),
        limit: 100,
      });
      setItems(logs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar os logs.");
    } finally {
      setLoading(false);
    }
  }, [fallback, mode, status]);

  async function loadDetail(id: string) {
    setDetailLoading(true);
    setError(null);

    try {
      setSelected(await logsService.get(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar o detalhe.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div>
      <PageHeader
        title="Logs de IA"
        description="Auditoria segura das execuções do runtime, sem prompt completo ou segredos."
      />

      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger>
              <SelectValue placeholder="Modo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os modos</SelectItem>
              <SelectItem value="ai-runtime">IA real</SelectItem>
              <SelectItem value="deterministic-runtime">Determinístico</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="fallback">Fallback</SelectItem>
            </SelectContent>
          </Select>

          <Select value={fallback} onValueChange={setFallback}>
            <SelectTrigger>
              <SelectValue placeholder="Fallback" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Com ou sem fallback</SelectItem>
              <SelectItem value="false">Sem fallback</SelectItem>
              <SelectItem value="true">Com fallback</SelectItem>
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" onClick={() => void loadLogs()}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Assistant</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Fallback</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-sm text-muted-foreground">
                    Carregando logs...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-sm text-muted-foreground">
                    Nenhum log de runtime encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.assistantName ?? item.assistantId ?? "Assistente removido"}
                    </TableCell>
                    <TableCell>{formatMode(item.mode)}</TableCell>
                    <TableCell className="text-xs">
                      {formatOriginAndChannel(
                        item.conversationSource,
                        item.conversationChannelType,
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={item.status} />
                    </TableCell>
                    <TableCell className="text-xs">{item.provider ?? "—"}</TableCell>
                    <TableCell className="text-xs">{item.model ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.durationMs !== null ? `${item.durationMs} ms` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.fallback ? (item.fallbackReason ?? "sim") : "não"}
                    </TableCell>
                    <TableCell className="text-xs">{item.outcome ?? "—"}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void loadDetail(item.id)}
                          >
                            <Eye className="h-4 w-4" /> Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Detalhe do log</DialogTitle>
                            <DialogDescription>
                              Metadados seguros da execução. Prompt completo e segredos não são
                              armazenados.
                            </DialogDescription>
                          </DialogHeader>
                          {detailLoading && selected?.id !== item.id ? (
                            <p className="text-sm text-muted-foreground">Carregando detalhe...</p>
                          ) : (
                            <LogDetail log={selected?.id === item.id ? selected : item} />
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LogDetail({ log }: { log: AiRuntimeLogListItem | AiRuntimeLogDetail }) {
  const detail = "providerErrorMessage" in log ? log : null;

  return (
    <div className="grid md:grid-cols-2 gap-3 mt-2">
      <Box title="Runtime">
        <Description label="Modo" value={formatMode(log.mode)} />
        <Description label="Status" value={log.status} />
        <Description label="Saída" value={log.outcome ?? "—"} />
        <Description
          label="Fallback"
          value={log.fallback ? (log.fallbackReason ?? "sim") : "não"}
        />
      </Box>

      <Box title="Provider">
        <Description label="Provider" value={log.provider ?? "—"} />
        <Description label="Modelo" value={log.model ?? "—"} />
        <Description label="Origem" value={log.configurationSource ?? "—"} />
        <Description label="Status do provider" value={String(log.providerStatus ?? "—")} />
      </Box>

      <Box title="Contexto usado">
        <Description
          label="Origem"
          value={formatOriginAndChannel(log.conversationSource, log.conversationChannelType)}
        />
        <Description label="Fontes" value={String(log.knowledgeCount ?? 0)} />
        <Description label="Histórico" value={String(log.historyMessagesUsed ?? 0)} />
        <Description label="Limite histórico" value={String(log.historyLimit ?? "—")} />
        <Description label="Mensagem inicial" value={log.initialMessageIncluded ? "sim" : "não"} />
        <Description label="Instruções/persona" value={log.instructionsIncluded ? "sim" : "não"} />
      </Box>

      <Box title="Rastreio">
        <Description label="Log ID" value={log.id} />
        <Description label="Conversation ID" value={log.conversationId ?? "—"} />
        <Description label="User Message ID" value={detail?.userMessageId ?? "—"} />
        <Description label="Assistant Message ID" value={detail?.assistantMessageId ?? "—"} />
      </Box>

      <Box title="Erro sanitizado">
        <Description label="Tipo" value={detail?.providerErrorType ?? "—"} />
        <Description label="Código" value={log.providerErrorCode ?? "—"} />
        <Description label="Mensagem" value={detail?.providerErrorMessage ?? "—"} />
      </Box>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const className =
    status === "success"
      ? "bg-emerald-500/10 text-emerald-700"
      : status === "fallback"
        ? "bg-amber-500/10 text-amber-700"
        : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-xs">{children}</CardContent>
    </Card>
  );
}

function Description({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value}</span>
    </div>
  );
}

function formatMode(mode: string): string {
  if (mode === "ai-runtime") return "IA real";
  if (mode === "deterministic-runtime") return "Determinístico";
  return mode;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOriginAndChannel(
  source: AiRuntimeLogListItem["conversationSource"],
  channelType: AiRuntimeLogListItem["conversationChannelType"],
): string {
  const sourceLabel = formatConversationSourceLabel(source);
  const channelLabel = formatConversationChannelLabel(channelType);

  return channelLabel ? `${sourceLabel} · ${channelLabel}` : sourceLabel;
}
