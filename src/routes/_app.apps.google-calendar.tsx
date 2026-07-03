import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import {
  CalendarDays,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/services/apiClient";
import { appStoreService } from "@/services";
import type {
  AppCatalogItem,
  GoogleCalendarAccountCalendar,
  GoogleCalendarOAuthStatus,
  GoogleCalendarResourceItem,
  SaveGoogleCalendarResourcePayload,
} from "@/types";

export const Route = createFileRoute("/_app/apps/google-calendar")({
  head: () => ({ meta: [{ title: "Google Agenda · Cubo AI Studio" }] }),
  component: GoogleCalendarAppPage,
});

type ResourceDraft = {
  id?: string;
  name: string;
  calendarId: string;
  resourceType: string;
  sportType: string;
  isCovered: boolean;
  timezone: string;
  slotMinutes: string;
  defaultDurationMinutes: string;
  minAdvanceMinutes: string;
  maxDaysAhead: string;
  active: boolean;
};

const emptyDraft: ResourceDraft = {
  name: "",
  calendarId: "",
  resourceType: "quadra",
  sportType: "beach_tennis",
  isCovered: false,
  timezone: "America/Campo_Grande",
  slotMinutes: "30",
  defaultDurationMinutes: "60",
  minAdvanceMinutes: "60",
  maxDaysAhead: "14",
  active: true,
};

function GoogleCalendarAppPage() {
  const [app, setApp] = useState<AppCatalogItem | null>(null);
  const [oauthStatus, setOauthStatus] = useState<GoogleCalendarOAuthStatus | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarAccountCalendar[]>([]);
  const [resources, setResources] = useState<GoogleCalendarResourceItem[]>([]);
  const [draft, setDraft] = useState<ResourceDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installed = Boolean(app?.installation);
  const active = app?.installation?.status === "ACTIVE";
  const editing = Boolean(draft.id);
  const connected = Boolean(oauthStatus?.connected);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const appDetail = await appStoreService.getApp("google_calendar");
      const [status, resourceItems] = await Promise.all([
        appStoreService.getGoogleCalendarOAuthStatus(),
        appStoreService.listGoogleCalendarResources(),
      ]);
      setApp(appDetail);
      setOauthStatus(status);
      setResources(resourceItems);

      if (status.connected) {
        setCalendars(await appStoreService.listGoogleCalendars());
      } else {
        setCalendars([]);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o app Google Agenda.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const activeResources = useMemo(
    () => resources.filter((resource) => resource.active).length,
    [resources],
  );

  async function loadCalendars() {
    setLoadingCalendars(true);
    setError(null);

    try {
      setCalendars(await appStoreService.listGoogleCalendars());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar as agendas.");
    } finally {
      setLoadingCalendars(false);
    }
  }

  async function install() {
    setSaving(true);
    setError(null);

    try {
      const installation = await appStoreService.install("google_calendar");
      setApp((current) =>
        current
          ? {
              ...current,
              installation: {
                id: installation.id,
                status: installation.status,
                credentialsConfigured: installation.credentialsConfigured,
              },
            }
          : current,
      );
      toast.success("Google Agenda instalado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível instalar o app.");
    } finally {
      setSaving(false);
    }
  }

  async function saveResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = toPayload(draft);
      const saved = draft.id
        ? await appStoreService.updateGoogleCalendarResource(draft.id, payload)
        : connected
          ? await appStoreService.createGoogleCalendarResourceFromCalendar(payload)
          : await appStoreService.createGoogleCalendarResource(payload);

      setResources((current) =>
        draft.id
          ? current.map((resource) => (resource.id === saved.id ? saved : resource))
          : [saved, ...current],
      );
      setDraft(emptyDraft);
      if (connected) {
        void loadCalendars();
      }
      toast.success(draft.id ? "Recurso atualizado." : "Recurso cadastrado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o recurso.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateResource(resource: GoogleCalendarResourceItem) {
    setSaving(true);
    setError(null);

    try {
      const updated = await appStoreService.deactivateGoogleCalendarResource(resource.id);
      setResources((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success("Recurso inativado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível inativar o recurso.");
    } finally {
      setSaving(false);
    }
  }

  function editResource(resource: GoogleCalendarResourceItem) {
    setDraft({
      id: resource.id,
      name: resource.name,
      calendarId: resource.calendarId,
      resourceType: resource.resourceType,
      sportType: resource.sportType,
      isCovered: resource.isCovered,
      timezone: resource.timezone,
      slotMinutes: String(resource.slotMinutes),
      defaultDurationMinutes: String(resource.defaultDurationMinutes),
      minAdvanceMinutes: String(resource.minAdvanceMinutes),
      maxDaysAhead: String(resource.maxDaysAhead),
      active: resource.active,
    });
  }

  function connectGoogle() {
    window.location.href = appStoreService.getGoogleCalendarOAuthStartUrl();
  }

  async function disconnectGoogle() {
    setSaving(true);
    setError(null);

    try {
      const status = await appStoreService.disconnectGoogleCalendarOAuth();
      setOauthStatus(status);
      setCalendars([]);
      setResources(await appStoreService.listGoogleCalendarResources());
      toast.success("Google Agenda desconectado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível desconectar.");
    } finally {
      setSaving(false);
    }
  }

  function configureCalendar(calendar: GoogleCalendarAccountCalendar) {
    setDraft({
      ...emptyDraft,
      name: calendar.summary,
      calendarId: calendar.id,
      timezone: calendar.timeZone ?? emptyDraft.timezone,
    });
  }

  return (
    <div>
      <PageHeader
        title="Google Agenda"
        description="Configure agendas Google como recursos reserváveis para a IA consultar horários e preparar reservas pelo backend."
        actions={
          <>
            <Button asChild type="button" variant="outline">
              <Link to="/apps">Voltar para Apps</Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => void loadPage()}>
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState
          title="Não foi possível concluir a ação"
          description={error}
          onRetry={() => void loadPage()}
          className="mb-4"
        />
      ) : null}

      {loading ? (
        <LoadingState label="Carregando Google Agenda..." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5" /> Instalação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <InstallationBadge app={app} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Recursos ativos</span>
                  <span className="text-sm font-medium">{activeResources}</span>
                </div>
                {!installed ? (
                  <Button type="button" onClick={() => void install()} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                    Instalar Google Agenda
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link2 className="h-5 w-5" /> Conexão Google
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Conta</span>
                  <span className="truncate text-sm font-medium">
                    {oauthStatus?.providerAccountEmail ?? "Não conectada"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">OAuth</span>
                  {connected ? <Badge>Conectado</Badge> : <Badge variant="outline">Desconectado</Badge>}
                </div>
                {connected ? (
                  <>
                    <div className="text-xs text-muted-foreground">
                      Expira em {oauthStatus?.expiresAt ? formatDate(oauthStatus.expiresAt) : "—"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void loadCalendars()}
                        disabled={loadingCalendars}
                      >
                        {loadingCalendars ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Atualizar agendas
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void disconnectGoogle()}
                        disabled={saving}
                      >
                        <PowerOff className="h-4 w-4" /> Desconectar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      O admin será redirecionado para autorizar acesso às agendas Google.
                    </p>
                    <Button type="button" onClick={connectGoogle} disabled={!installed || saving}>
                      <Power className="h-4 w-4" /> Conectar Google Agenda
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editing ? "Editar recurso" : "Cadastrar recurso"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={(event) => void saveResource(event)}>
                  <Field label="Nome do recurso">
                    <Input
                      value={draft.name}
                      onChange={(event) => setDraftField("name", event.target.value, setDraft)}
                      placeholder="Quadra de Beach Aberta 1"
                      required
                    />
                  </Field>

                  <Field label="ID da agenda Google">
                    <Input
                      value={draft.calendarId}
                      onChange={(event) =>
                        setDraftField("calendarId", event.target.value, setDraft)
                      }
                      placeholder="agenda@group.calendar.google.com"
                      readOnly={connected && !editing}
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo">
                      <Select
                        value={draft.resourceType}
                        onValueChange={(value) => setDraftField("resourceType", value, setDraft)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quadra">Quadra</SelectItem>
                          <SelectItem value="sala">Sala</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Esporte">
                      <Select
                        value={draft.sportType}
                        onValueChange={(value) => setDraftField("sportType", value, setDraft)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beach_tennis">Beach Tennis</SelectItem>
                          <SelectItem value="padel">Padel</SelectItem>
                          <SelectItem value="tennis">Tênis</SelectItem>
                          <SelectItem value="multiuso">Multiuso</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Timezone">
                    <Input
                      value={draft.timezone}
                      onChange={(event) => setDraftField("timezone", event.target.value, setDraft)}
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Intervalo"
                      value={draft.slotMinutes}
                      onChange={(value) => setDraftField("slotMinutes", value, setDraft)}
                    />
                    <NumberField
                      label="Duração padrão"
                      value={draft.defaultDurationMinutes}
                      onChange={(value) =>
                        setDraftField("defaultDurationMinutes", value, setDraft)
                      }
                    />
                    <NumberField
                      label="Antecedência min."
                      value={draft.minAdvanceMinutes}
                      onChange={(value) => setDraftField("minAdvanceMinutes", value, setDraft)}
                    />
                    <NumberField
                      label="Dias à frente"
                      value={draft.maxDaysAhead}
                      onChange={(value) => setDraftField("maxDaysAhead", value, setDraft)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <Label htmlFor="isCovered">Coberta</Label>
                    <Switch
                      id="isCovered"
                      checked={draft.isCovered}
                      onCheckedChange={(value) => setDraftField("isCovered", value, setDraft)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <Label htmlFor="active">Ativa</Label>
                    <Switch
                      id="active"
                      checked={draft.active}
                      onCheckedChange={(value) => setDraftField("active", value, setDraft)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={!active || saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {editing ? "Salvar alterações" : "Cadastrar"}
                    </Button>
                    {editing ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDraft(emptyDraft)}
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <CalendarsCard
              connected={connected}
              loading={loadingCalendars}
              calendars={calendars}
              onRefresh={() => void loadCalendars()}
              onConfigure={configureCalendar}
            />
            <ResourcesCard
              resources={resources}
              saving={saving}
              onEdit={editResource}
              onDeactivate={(resource) => void deactivateResource(resource)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarsCard({
  connected,
  loading,
  calendars,
  onRefresh,
  onConfigure,
}: {
  connected: boolean;
  loading: boolean;
  calendars: GoogleCalendarAccountCalendar[];
  onRefresh: () => void;
  onConfigure: (calendar: GoogleCalendarAccountCalendar) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">Agendas da conta Google</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={!connected || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {!connected ? (
          <EmptyState
            title="Conta Google não conectada"
            description="Conecte o Google Agenda para listar agendas reais e mapear quadras."
            className="m-4"
          />
        ) : calendars.length === 0 ? (
          <EmptyState
            title="Nenhuma agenda encontrada"
            description="Atualize a lista após concluir a autorização no Google."
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agenda</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendars.map((calendar) => (
                <TableRow key={calendar.id}>
                  <TableCell>
                    <div className="font-medium">{calendar.summary}</div>
                    <div className="max-w-[300px] truncate text-xs text-muted-foreground">
                      {calendar.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{calendar.timeZone ?? "—"}</TableCell>
                  <TableCell>{calendar.accessRole ?? "—"}</TableCell>
                  <TableCell>
                    {calendar.mapped ? (
                      <Badge>Mapeada</Badge>
                    ) : (
                      <Badge variant="outline">Não mapeada</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onConfigure(calendar)}
                      >
                        Configurar como recurso
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
  );
}

function ResourcesCard({
  resources,
  saving,
  onEdit,
  onDeactivate,
}: {
  resources: GoogleCalendarResourceItem[];
  saving: boolean;
  onEdit: (resource: GoogleCalendarResourceItem) => void;
  onDeactivate: (resource: GoogleCalendarResourceItem) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recursos configurados</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {resources.length === 0 ? (
          <EmptyState
            title="Nenhum recurso configurado"
            description="Mapeie uma agenda Google ou cadastre manualmente uma agenda."
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recurso</TableHead>
                <TableHead>Agenda</TableHead>
                <TableHead>Esporte</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">{resource.name}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                    {resource.calendarId}
                  </TableCell>
                  <TableCell>{formatSport(resource.sportType)}</TableCell>
                  <TableCell>{resource.isCovered ? "Coberta" : "Aberta"}</TableCell>
                  <TableCell>{resource.defaultDurationMinutes} min</TableCell>
                  <TableCell>
                    {resource.active ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(resource)}>
                        <Pencil className="h-4 w-4" /> Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!resource.active || saving}
                        onClick={() => onDeactivate(resource)}
                      >
                        <Trash2 className="h-4 w-4" /> Inativar
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
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </Field>
  );
}

function setDraftField<K extends keyof ResourceDraft>(
  field: K,
  value: ResourceDraft[K],
  setDraft: Dispatch<SetStateAction<ResourceDraft>>,
) {
  setDraft((current) => ({ ...current, [field]: value }));
}

function toPayload(draft: ResourceDraft): SaveGoogleCalendarResourcePayload {
  return {
    name: draft.name,
    calendarId: draft.calendarId,
    resourceType: draft.resourceType,
    sportType: draft.sportType,
    isCovered: draft.isCovered,
    timezone: draft.timezone,
    slotMinutes: Number(draft.slotMinutes),
    defaultDurationMinutes: Number(draft.defaultDurationMinutes),
    minAdvanceMinutes: Number(draft.minAdvanceMinutes),
    maxDaysAhead: Number(draft.maxDaysAhead),
    active: draft.active,
  };
}

function InstallationBadge({ app }: { app: AppCatalogItem | null }) {
  if (!app?.installation) {
    return <Badge variant="outline">Não instalado</Badge>;
  }

  if (app.installation.status === "ACTIVE") {
    return <Badge>Ativo</Badge>;
  }

  if (app.installation.status === "ERROR") {
    return <Badge variant="destructive">Erro</Badge>;
  }

  return <Badge variant="secondary">Inativo</Badge>;
}

function formatSport(value: string): string {
  const labels: Record<string, string> = {
    beach_tennis: "Beach Tennis",
    padel: "Padel",
    tennis: "Tênis",
    multiuso: "Multiuso",
  };

  return labels[value] ?? value;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
