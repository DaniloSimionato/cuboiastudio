import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  TestTube2,
  Trash2,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { backendAssistantsService, chatwootSettingsService, currentCompanyService } from "@/services";
import type {
  BackendAssistantListItem,
  ChatwootInboxConfigItem,
  ChatwootInboxConfigTestResponse,
  CurrentCompanyResponse,
  UpsertChatwootInboxConfigPayload,
} from "@/types";
import { SecurityNotice } from "@/components";

export const Route = createFileRoute("/_app/canais")({
  head: () => ({ meta: [{ title: "Canais · Cubo AI Studio" }] }),
  component: CanaisPage,
});

type ChannelFormState = {
  name: string;
  baseUrl: string;
  accountId: string;
  inboxId: string;
  assistantId: string;
  apiAccessToken: string;
  webhookSecret: string;
  isActive: boolean;
  metadataJsonText: string;
  channelType: "CHATWOOT" | "WHATSAPP";
};

const DEFAULT_FORM: ChannelFormState = {
  name: "",
  baseUrl: "",
  accountId: "",
  inboxId: "",
  assistantId: "",
  apiAccessToken: "",
  webhookSecret: "",
  isActive: true,
  metadataJsonText: "",
  channelType: "CHATWOOT",
};

function CanaisPage() {
  const [company, setCompany] = useState<CurrentCompanyResponse["company"] | null>(null);
  const [assistants, setAssistants] = useState<BackendAssistantListItem[]>([]);
  const [channels, setChannels] = useState<ChatwootInboxConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatwootInboxConfigItem | null>(null);
  const [form, setForm] = useState<ChannelFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ChatwootInboxConfigTestResponse>>({});

  const activeAssistants = useMemo(
    () => assistants.filter((assistant) => assistant.status === "ACTIVE"),
    [assistants],
  );

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [companyResponse, assistantItems, configItems] = await Promise.all([
        currentCompanyService.get(),
        backendAssistantsService.list(),
        chatwootSettingsService.list(),
      ]);

      setCompany(companyResponse.company);
      setAssistants(assistantItems);
      setChannels(configItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os canais.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditingChannel(null);
    setForm(DEFAULT_FORM);
    setSheetOpen(true);
  };

  const openEdit = (channel: ChatwootInboxConfigItem) => {
    setEditingChannel(channel);
    const metadata = channel.metadataJson as Record<string, unknown> | null;
    const channelType = (metadata?.channelType as "CHATWOOT" | "WHATSAPP") || "CHATWOOT";
    setForm({
      name: channel.name,
      baseUrl: channel.baseUrl,
      accountId: channel.accountId,
      inboxId: channel.inboxId,
      assistantId: channel.assistantId ?? "",
      apiAccessToken: "",
      webhookSecret: "",
      isActive: channel.isActive,
      metadataJsonText: channel.metadataJson ? JSON.stringify(channel.metadataJson, null, 2) : "",
      channelType,
    });
    setSheetOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim() || !form.baseUrl.trim() || !form.accountId.trim() || !form.inboxId.trim()) {
      toast.error("Preencha nome, URL base, accountId e inboxId.");
      return;
    }

    let metadataJson: Record<string, unknown> = {
      channelType: form.channelType,
    };
    const trimmedMetadata = form.metadataJsonText.trim();
    if (trimmedMetadata) {
      try {
        const parsed = JSON.parse(trimmedMetadata) as unknown;
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
          throw new Error();
        }
        metadataJson = {
          ...metadataJson,
          ...(parsed as Record<string, unknown>),
        };
      } catch {
        toast.error("O metadata precisa ser um objeto JSON válido.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: UpsertChatwootInboxConfigPayload = {
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim().replace(/\/+$/, ""),
        accountId: form.accountId.trim(),
        inboxId: form.inboxId.trim(),
        assistantId: form.assistantId,
        ...(form.apiAccessToken.trim() ? { apiAccessToken: form.apiAccessToken.trim() } : {}),
        ...(form.webhookSecret.trim() ? { webhookSecret: form.webhookSecret.trim() } : {}),
        isActive: form.isActive,
        metadataJson,
      };

      if (editingChannel) {
        await chatwootSettingsService.update(editingChannel.id, payload);
        toast.success("Canal atualizado.");
      } else {
        await chatwootSettingsService.create(payload);
        toast.success("Canal criado.");
      }

      setSheetOpen(false);
      setForm(DEFAULT_FORM);
      setEditingChannel(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o canal.");
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = async (channel: ChatwootInboxConfigItem) => {
    try {
      await chatwootSettingsService.update(channel.id, {
        name: channel.name,
        baseUrl: channel.baseUrl,
        accountId: channel.accountId,
        inboxId: channel.inboxId,
        assistantId: channel.assistantId ?? "",
        isActive: !channel.isActive,
        ...(channel.metadataJson ? { metadataJson: channel.metadataJson } : {}),
      });
      await load();
      toast.success(channel.isActive ? "Canal pausado." : "Canal ativado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o canal.");
    }
  };

  const testChannel = async (channel: ChatwootInboxConfigItem) => {
    setTestingId(channel.id);
    try {
      const result = await chatwootSettingsService.test(channel.id);
      setTestResults((current) => ({ ...current, [channel.id]: result }));
      toast.success(result.ok ? result.message : result.reason ?? result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível testar o canal.");
    } finally {
      setTestingId(null);
    }
  };

  const removeChannel = async (channel: ChatwootInboxConfigItem) => {
    if (!window.confirm(`Remover o canal "${channel.name}"?`)) {
      return;
    }

    setDeletingId(channel.id);
    try {
      await chatwootSettingsService.remove(channel.id);
      setTestResults((current) => {
        const clone = { ...current };
        delete clone[channel.id];
        return clone;
      });
      await load();
      toast.success("Canal removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover o canal.");
    } finally {
      setDeletingId(null);
    }
  };

  const webhookExample = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://studio-stage.cubochat.com.br";
    return `${origin.replace(/\/$/, "")}/api/webhooks/chatwoot?secret=SEU_SECRET`;
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canais"
        description={`Canais e inboxes da empresa ${company?.name ?? "ativa"}. Aqui fica o cadastro operacional do Chatwoot e a publicação dos assistentes.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Canais cadastrados" value={String(channels.length)} />
        <MetricCard label="Canais ativos" value={String(channels.filter((item) => item.isActive).length)} />
        <MetricCard label="Com assistente vinculado" value={String(channels.filter((item) => item.assistantId).length)} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Chatwoot / WhatsApp</CardTitle>
            <CardDescription>
              Cada inbox pertence a esta empresa e pode ter no máximo um assistente ativo vinculado.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo canal
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <SecurityNotice>
            Tokens e secrets continuam somente no backend. O Studio salva apenas o estado seguro da integração.
          </SecurityNotice>

          <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
            <div className="font-medium">Webhook recomendado</div>
            <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{webhookExample}</div>
          </div>

          {loading ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : channels.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhum canal configurado ainda. Cadastre uma inbox para publicar um assistente depois.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {channels.map((channel) => {
                const testResult = testResults[channel.id];
                return (
                  <article key={channel.id} className="rounded-2xl border p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Radio className="h-4 w-4 text-muted-foreground" />
                          <h3 className="truncate font-medium">{channel.name}</h3>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {channel.metadataJson?.["channelType"] === "WHATSAPP" ? "WhatsApp" : "Chatwoot"}
                        </p>
                      </div>
                      <StatusBadge status={channel.isActive ? "ativo" : "pausado"} />
                    </div>

                    <div className="grid gap-2 text-sm">
                      <SummaryRow label="Account ID" value={channel.accountId} />
                      <SummaryRow label="Inbox ID" value={channel.inboxId} />
                      <SummaryRow
                        label="Assistente"
                        value={channel.assistantName ?? "Nao vinculado"}
                      />
                      <SummaryRow
                        label="Credenciais"
                        value={
                          channel.apiAccessTokenConfigured || channel.webhookSecretConfigured
                            ? "Configuradas"
                            : "Pendentes"
                        }
                      />
                    </div>

                    {testResult ? (
                      <div
                        className={`rounded-xl border p-3 text-xs ${
                          testResult.ok
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {testResult.ok ? <CheckCircle2 className="mb-2 h-4 w-4" /> : <AlertTriangle className="mb-2 h-4 w-4" />}
                        <div>{testResult.message}</div>
                        {testResult.reason ? <div className="mt-1 opacity-80">{testResult.reason}</div> : null}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(channel)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void toggleChannel(channel)}>
                        <RefreshCw className="h-4 w-4" />
                        {channel.isActive ? "Pausar" : "Ativar"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void testChannel(channel)} disabled={testingId === channel.id}>
                        {testingId === channel.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube2 className="h-4 w-4" />
                        )}
                        Testar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => void removeChannel(channel)} disabled={deletingId === channel.id}>
                        {deletingId === channel.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Remover
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proxima etapa</CardTitle>
          <CardDescription>
            Depois de criar o canal, abra um assistente para definir a publicacao por inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          O vínculo também pode ser revisto na aba <strong>Publicação</strong> do assistente em{" "}
          <Link to="/agentes/novo" className="font-medium text-primary underline-offset-4 hover:underline">
            Assistentes IA
          </Link>.
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingChannel ? "Editar canal" : "Novo canal"}</SheetTitle>
            <SheetDescription>
              Cadastre os dados operacionais da inbox. O vínculo do assistente pode ser feito aqui ou na aba de publicação do assistente.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Field label="Nome amigavel">
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="WhatsApp Comercial"
              />
            </Field>
            <Field label="Tipo de canal">
              <Select
                value={form.channelType}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    channelType: value as "CHATWOOT" | "WHATSAPP",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHATWOOT">Chatwoot</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="URL base do Chatwoot">
              <Input
                value={form.baseUrl}
                onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
                placeholder="https://chatwoot.seudominio.com"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Account ID">
                <Input
                  value={form.accountId}
                  onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
                  placeholder="3"
                />
              </Field>
              <Field label="Inbox ID">
                <Input
                  value={form.inboxId}
                  onChange={(event) => setForm((current) => ({ ...current, inboxId: event.target.value }))}
                  placeholder="17"
                />
              </Field>
            </div>
            <Field label="Assistente vinculado">
              <Select
                value={form.assistantId || "__none__"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    assistantId: value === "__none__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um assistente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum assistente</SelectItem>
                  {activeAssistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Token de API (opcional)">
              <Input
                value={form.apiAccessToken}
                onChange={(event) => setForm((current) => ({ ...current, apiAccessToken: event.target.value }))}
                placeholder={editingChannel?.apiAccessTokenConfigured ? "Ja configurado no backend" : "Cole aqui apenas se for atualizar"}
              />
            </Field>
            <Field label="Webhook secret (opcional)">
              <Input
                value={form.webhookSecret}
                onChange={(event) => setForm((current) => ({ ...current, webhookSecret: event.target.value }))}
                placeholder={editingChannel?.webhookSecretConfigured ? "Ja configurado no backend" : "Cole aqui apenas se for atualizar"}
              />
            </Field>
            <Field label="Metadata JSON (opcional)">
              <Textarea
                rows={4}
                value={form.metadataJsonText}
                onChange={(event) => setForm((current) => ({ ...current, metadataJsonText: event.target.value }))}
                placeholder='{"channelType":"WHATSAPP"}'
              />
            </Field>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <div>
                <div className="text-sm font-medium">Canal ativo</div>
                <div className="text-xs text-muted-foreground">Quando desativado, o runtime não responde este inbox.</div>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
              />
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Salvando..." : editingChannel ? "Salvar alteracoes" : "Criar canal"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
