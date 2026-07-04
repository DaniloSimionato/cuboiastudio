import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
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
  ArrowLeft,
  X,
  Layers,
  Settings2,
  FolderOpen,
  Sliders,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ApiError } from "@/services/apiClient";
import { appStoreService } from "@/services";
import type {
  AppCatalogItem,
  GoogleCalendarAccountCalendar,
  GoogleCalendarOAuthStatus,
  GoogleCalendarResourceItem,
  SaveGoogleCalendarResourcePayload,
  ReservableResourceType,
  ReservableResourceCategory,
  ReservableResourceAttribute,
} from "@/types";

type SearchParams = {
  installationId?: string;
};

export const Route = createFileRoute("/_app/apps/google-calendar")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      installationId: search.installationId as string | undefined,
    };
  },
  head: () => ({ meta: [{ title: "Google Agenda · Cubo AI Studio" }] }),
  component: GoogleCalendarAppPage,
});

const TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch (e) {
    return ["America/Campo_Grande", "America/Sao_Paulo", "America/Cuiaba", "America/Manaus", "America/Bahia", "America/Fortaleza", "America/Recife", "America/Belem", "America/Rio_Branco", "UTC"];
  }
})();

type ResourceDraft = {
  id?: string;
  name: string;
  calendarId: string;
  resourceType?: string;
  sportType?: string;
  isCovered?: boolean;
  timezone: string;
  slotMinutes: string;
  defaultDurationMinutes: string;
  minAdvanceMinutes: string;
  maxDaysAhead: string;
  active: boolean;
  resourceTypeId?: string | null;
  categoryId?: string | null;
  attributeId?: string | null;
};

const emptyDraft: ResourceDraft = {
  name: "",
  calendarId: "",
  resourceType: "",
  sportType: "",
  isCovered: false,
  timezone: "America/Campo_Grande",
  slotMinutes: "30",
  defaultDurationMinutes: "60",
  minAdvanceMinutes: "60",
  maxDaysAhead: "14",
  active: true,
  resourceTypeId: "",
  categoryId: "",
  attributeId: "",
};

function getTypeName(resource: GoogleCalendarResourceItem, types: ReservableResourceType[]) {
  if (resource.resourceTypeId) {
    const type = types.find((t) => t.id === resource.resourceTypeId);
    if (type) return type.name;
  }
  if (resource.resourceType) {
    if (["court", "quadra"].includes(resource.resourceType.toLowerCase())) return "Quadra";
    return resource.resourceType.charAt(0).toUpperCase() + resource.resourceType.slice(1);
  }
  return "—";
}

function getCategoryName(resource: GoogleCalendarResourceItem, categories: ReservableResourceCategory[]) {
  if (resource.categoryId) {
    const cat = categories.find((c) => c.id === resource.categoryId);
    if (cat) return cat.name;
  }
  if (resource.sportType) {
    if (["beach", "beach_tennis"].includes(resource.sportType.toLowerCase())) return "Beach Tennis";
    return resource.sportType.charAt(0).toUpperCase() + resource.sportType.slice(1);
  }
  return "—";
}

function getAttributeName(resource: GoogleCalendarResourceItem, attributes: ReservableResourceAttribute[]) {
  if (resource.attributeId) {
    const attr = attributes.find((a) => a.id === resource.attributeId);
    if (attr) return attr.name;
  }
  if (resource.isCovered !== undefined) {
    return resource.isCovered ? "Coberta" : "Aberta";
  }
  return "—";
}

function getCalendarName(calendarId: string, calendars: GoogleCalendarAccountCalendar[]) {
  const cal = calendars.find((c) => c.id === calendarId);
  return cal ? cal.summary : calendarId;
}

function GoogleCalendarAppPage() {
  const { installationId } = Route.useSearch();
  const navigate = useNavigate();

  const [app, setApp] = useState<AppCatalogItem | null>(null);
  const [oauthStatus, setOauthStatus] = useState<GoogleCalendarOAuthStatus | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarAccountCalendar[]>([]);
  const [resources, setResources] = useState<GoogleCalendarResourceItem[]>([]);
  const [draft, setDraft] = useState<ResourceDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Classificações
  const [types, setTypes] = useState<ReservableResourceType[]>([]);
  const [categories, setCategories] = useState<ReservableResourceCategory[]>([]);
  const [attributes, setAttributes] = useState<ReservableResourceAttribute[]>([]);

  // Navegação Interna
  const [activeSubTab, setActiveSubTab] = useState<"calendars" | "resources" | "classifications">("resources");

  // Estado do Drawer/Panel Lateral
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modais de Criação de Classificação
  const [newTypeName, setNewTypeName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newAttrName, setNewAttrName] = useState("");

  const [showCalendarId, setShowCalendarId] = useState(false);

  const installed = Boolean(app?.installation);
  const active = app?.installation?.status === "ACTIVE";
  const editing = Boolean(draft.id);
  const connected = Boolean(oauthStatus?.connected);

  // Redirect to first Google Calendar installation if installationId is missing in search query
  useEffect(() => {
    if (!installationId) {
      const resolveDefaultInstallation = async () => {
        try {
          const insts = await appStoreService.listInstallations();
          const googleInsts = insts.filter((inst) => inst.app.slug === "google_calendar");
          if (googleInsts.length > 0) {
            void navigate({
              search: { installationId: googleInsts[0].id },
              replace: true,
            });
          } else {
            void navigate({ to: "/apps", replace: true });
          }
        } catch {
          void navigate({ to: "/apps", replace: true });
        }
      };
      void resolveDefaultInstallation();
    }
  }, [installationId, navigate]);

  const loadPage = useCallback(async () => {
    if (!installationId) return;
    setLoading(true);
    setError(null);

    try {
      const appDetail = await appStoreService.getApp("google_calendar", installationId);
      const [status, resourceItems, typeItems, catItems, attrItems] = await Promise.all([
        appStoreService.getGoogleCalendarOAuthStatus(installationId),
        appStoreService.listGoogleCalendarResources(installationId),
        appStoreService.listResourceTypes(),
        appStoreService.listResourceCategories(),
        appStoreService.listResourceAttributes(),
      ]);
      setApp(appDetail);
      setOauthStatus(status);
      setResources(resourceItems);
      setTypes(typeItems);
      setCategories(catItems);
      setAttributes(attrItems);

      if (status.connected) {
        setCalendars(await appStoreService.listGoogleCalendars(installationId));
      } else {
        setCalendars([]);
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError(
          "Usuário sem permissão para configurar aplicativos. Verifique permissões tools:read/tools:write.",
        );
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o app Google Agenda.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [installationId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const activeResources = useMemo(
    () => resources.filter((resource) => resource.active).length,
    [resources],
  );

  async function loadCalendars() {
    if (!installationId) return;
    setLoadingCalendars(true);
    setError(null);

    try {
      setCalendars(await appStoreService.listGoogleCalendars(installationId));
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
      toast.success("Google Agenda instalado com sucesso.");
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
      const payload = toPayload(draft, installationId);
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
      setIsDrawerOpen(false);
      
      if (connected) {
        void loadCalendars();
      }
      toast.success(draft.id ? "Recurso atualizado com sucesso." : "Recurso cadastrado com sucesso.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o recurso.");
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar recurso.");
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
      toast.success("Recurso inativado com sucesso.");
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
      resourceTypeId: resource.resourceTypeId || "",
      categoryId: resource.categoryId || "",
      attributeId: resource.attributeId || "",
    });
    setIsDrawerOpen(true);
  }

  async function connectGoogle() {
    setSaving(true);
    setError(null);

    try {
      const res = await appStoreService.getGoogleCalendarOAuthStartUrl(installationId);
      window.location.href = res.authorizationUrl;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível iniciar a conexão com o Google Agenda.",
      );
      toast.error("Erro ao iniciar conexão com o Google.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnectGoogle() {
    setSaving(true);
    setError(null);

    try {
      const status = await appStoreService.disconnectGoogleCalendarOAuth(installationId);
      setOauthStatus(status);
      setCalendars([]);
      setResources(await appStoreService.listGoogleCalendarResources(installationId));
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
    setIsDrawerOpen(true);
  }

  // ── Classifications Handlers ──────────────────────────────────────

  async function handleCreateType() {
    if (!newTypeName.trim()) return;
    const slug = newTypeName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    try {
      const created = await appStoreService.createResourceType({ name: newTypeName, slug });
      setTypes((curr) => [...curr, created]);
      setNewTypeName("");
      toast.success("Tipo cadastrado com sucesso.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cadastrar tipo.");
    }
  }

  async function handleDeleteType(id: string) {
    try {
      await appStoreService.deleteResourceType(id);
      setTypes((curr) => curr.filter(t => t.id !== id));
      toast.success("Tipo removido.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover tipo.");
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    const slug = newCategoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    try {
      const created = await appStoreService.createResourceCategory({ name: newCategoryName, slug });
      setCategories((curr) => [...curr, created]);
      setNewCategoryName("");
      toast.success("Categoria cadastrada com sucesso.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cadastrar categoria.");
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await appStoreService.deleteResourceCategory(id);
      setCategories((curr) => curr.filter(c => c.id !== id));
      toast.success("Categoria removida.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover categoria.");
    }
  }

  async function handleCreateAttribute() {
    if (!newAttrName.trim()) return;
    const slug = newAttrName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    try {
      const created = await appStoreService.createResourceAttribute({ name: newAttrName, slug });
      setAttributes((curr) => [...curr, created]);
      setNewAttrName("");
      toast.success("Característica cadastrada com sucesso.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cadastrar característica.");
    }
  }

  async function handleDeleteAttribute(id: string) {
    try {
      await appStoreService.deleteResourceAttribute(id);
      setAttributes((curr) => curr.filter(a => a.id !== id));
      toast.success("Característica removida.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover característica.");
    }
  }

  return (
    <div className="space-y-6 relative pb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="hover:bg-muted rounded-xl">
            <Link to="/apps">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {oauthStatus?.providerAccountEmail ? `Google Agenda (${oauthStatus.providerAccountEmail})` : "Google Agenda"}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Mapeie suas agendas do Google Calendar como recursos que a IA pode ler, reservar, remarcar ou cancelar.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button type="button" variant="outline" onClick={() => void loadPage()} className="hover:bg-muted">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
          </Button>
          <Button
            type="button"
            onClick={() => {
              setDraft(emptyDraft);
              setIsDrawerOpen(true);
            }}
            disabled={!active}
            className="bg-primary text-primary-foreground font-medium"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Novo Recurso
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Carregando configurações do Google Agenda..." />
      ) : error ? (
        <ErrorState
          title="Não foi possível concluir a ação"
          description={error}
          onRetry={() => void loadPage()}
          className="mb-4"
        />
      ) : (
        <div className="space-y-6">
          {/* Card Resumo do Status da Conexão */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" /> Status da Instalação
                </CardTitle>
                <CardDescription>Status atual da extensão no Cubo AI Studio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="text-muted-foreground">Aplicativo</span>
                  <span className="font-semibold text-foreground">Google Agenda</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="text-muted-foreground">Extensão</span>
                  <InstallationBadge app={app} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Recursos ativos</span>
                  <Badge variant="outline" className="font-bold border-primary/20 text-primary bg-primary/5">
                    {activeResources} ativo(s)
                  </Badge>
                </div>
                {!installed && (
                  <Button type="button" onClick={() => void install()} disabled={saving} className="w-full mt-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Power className="h-4 w-4 mr-1.5" />}
                    Instalar Integração
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" /> Credenciais Google OAuth
                </CardTitle>
                <CardDescription>Conexão com sua conta administrativa do Google</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="text-muted-foreground">Status da Conta</span>
                  {connected ? (
                    <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">Conectado</Badge>
                  ) : (
                    <Badge variant="secondary">Desconectado</Badge>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="text-muted-foreground">E-mail Conectado</span>
                  <span className="font-medium truncate max-w-[200px] text-foreground">
                    {oauthStatus?.providerAccountEmail || "Nenhuma conta vinculada"}
                  </span>
                </div>
                {connected && oauthStatus?.expiresAt && (
                  <div className="text-xs text-muted-foreground flex justify-between items-center border-b pb-2">
                    <span>Validade do token</span>
                    <span>{formatDate(oauthStatus.expiresAt)}</span>
                  </div>
                )}
                <div className="pt-1 flex gap-2">
                  {connected ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadCalendars()}
                        disabled={loadingCalendars}
                        className="flex-1"
                      >
                        {loadingCalendars ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1.5" />
                        )}
                        Atualizar Agendas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void disconnectGoogle()}
                        disabled={saving}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <PowerOff className="h-4 w-4 mr-1.5" /> Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={connectGoogle} disabled={!installed || saving} className="w-full">
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <Power className="h-4 w-4 mr-1.5" />
                      )}
                      Autorizar Acesso Google
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Abas de Gerenciamento Interno */}
          <div className="space-y-4">
            <div className="flex border-b">
              <button
                onClick={() => setActiveSubTab("resources")}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeSubTab === "resources"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Settings2 className="h-4.5 w-4.5" /> Recursos Mapeados
              </button>
              <button
                onClick={() => setActiveSubTab("calendars")}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeSubTab === "calendars"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderOpen className="h-4.5 w-4.5" /> Agendas da Conta ({calendars.length})
              </button>
              <button
                onClick={() => setActiveSubTab("classifications")}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeSubTab === "classifications"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-4.5 w-4.5" /> Classificações de Recursos
              </button>
            </div>

            {/* Conteúdo da Aba: Recursos */}
            {activeSubTab === "resources" && (
              <ResourcesCard
                resources={resources}
                calendars={calendars}
                types={types}
                categories={categories}
                attributes={attributes}
                saving={saving}
                onEdit={editResource}
                onDeactivate={(resItem) => void deactivateResource(resItem)}
              />
            )}

            {/* Conteúdo da Aba: Agendas */}
            {activeSubTab === "calendars" && (
              <CalendarsCard
                connected={connected}
                loading={loadingCalendars}
                calendars={calendars}
                onRefresh={() => void loadCalendars()}
                onConfigure={configureCalendar}
              />
            )}

            {/* Conteúdo da Aba: Classificações (CRUD) */}
            {activeSubTab === "classifications" && (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Tipos */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Sliders className="h-4 w-4 text-primary" /> Tipos de Recursos
                    </CardTitle>
                    <CardDescription className="text-xs">Ex: Quadra, Sala, Profissional</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Novo tipo..."
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Button onClick={handleCreateType} size="sm" className="h-8 px-2 font-semibold">
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {types.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum tipo criado.</p>
                      ) : (
                        types.map((t) => (
                          <div key={t.id} className="flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded-lg border text-xs">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{t.name}</span>
                              <span className="text-[10px] text-muted-foreground">slug: {t.slug}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteType(t.id)}
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Categorias */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <FolderOpen className="h-4 w-4 text-primary" /> Categorias / Modalidades
                    </CardTitle>
                    <CardDescription className="text-xs">Ex: Beach Tennis, Padel, Geral</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Nova categoria..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Button onClick={handleCreateCategory} size="sm" className="h-8 px-2 font-semibold">
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {categories.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma categoria criada.</p>
                      ) : (
                        categories.map((c) => (
                          <div key={c.id} className="flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded-lg border text-xs">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{c.name}</span>
                              <span className="text-[10px] text-muted-foreground">slug: {c.slug}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategory(c.id)}
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Características */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Layers className="h-4 w-4 text-primary" /> Características / Atributos
                    </CardTitle>
                    <CardDescription className="text-xs">Ex: Coberta, Aberta, Ar Condicionado</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Novo atributo..."
                        value={newAttrName}
                        onChange={(e) => setNewAttrName(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Button onClick={handleCreateAttribute} size="sm" className="h-8 px-2 font-semibold">
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {attributes.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma característica criada.</p>
                      ) : (
                        attributes.map((a) => (
                          <div key={a.id} className="flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded-lg border text-xs">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{a.name}</span>
                              <span className="text-[10px] text-muted-foreground">slug: {a.slug}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAttribute(a.id)}
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer/Panel Lateral Deslizante Premium para Novo/Editar Recurso */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-all duration-300">
          {/* Overlay de fechar ao clicar fora */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsDrawerOpen(false)} />

          <div className="relative w-full max-w-[500px] bg-background border-l h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {editing ? "Editar recurso reservável" : "Mapear novo recurso"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preencha as configurações e defina as características do recurso.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDrawerOpen(false)}
                className="hover:bg-muted rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form className="space-y-5" onSubmit={(event) => void saveResource(event)}>
              <Field label="Nome de exibição do recurso">
                <Input
                  value={draft.name}
                  onChange={(event) => setDraftField("name", event.target.value, setDraft)}
                  placeholder="Ex: Quadra 1 de Beach Tennis"
                  required
                />
              </Field>

              <Field label="ID do Google Calendar">
                <div className="relative">
                  <Input
                    value={draft.calendarId}
                    onChange={(event) => setDraftField("calendarId", event.target.value, setDraft)}
                    placeholder="Ex: agenda@group.calendar.google.com"
                    readOnly={connected && !editing}
                    required
                    className="pr-20 font-mono text-xs"
                    type={showCalendarId ? "text" : "password"}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCalendarId(!showCalendarId)}
                    >
                      {showCalendarId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        navigator.clipboard.writeText(draft.calendarId);
                        toast.success("ID copiado!");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Field>

              {/* Novas classificações de recursos por FKs */}
              <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-dashed">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Classificações do Recurso</h4>
                
                <Field label="Tipo do Recurso">
                  <Select
                    value={draft.resourceTypeId || "none"}
                    onValueChange={(value) => setDraftField("resourceTypeId", value === "none" ? null : value, setDraft)}
                  >
                    <SelectTrigger className="w-full bg-background border rounded-lg text-sm px-3 py-2">
                      <SelectValue placeholder="Selecione o Tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione o Tipo...</SelectItem>
                      {types.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Categoria / Modalidade">
                  <Select
                    value={draft.categoryId || "none"}
                    onValueChange={(value) => setDraftField("categoryId", value === "none" ? null : value, setDraft)}
                  >
                    <SelectTrigger className="w-full bg-background border rounded-lg text-sm px-3 py-2">
                      <SelectValue placeholder="Selecione a Categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione a Categoria...</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Característica / Atributo">
                  <Select
                    value={draft.attributeId || "none"}
                    onValueChange={(value) => setDraftField("attributeId", value === "none" ? null : value, setDraft)}
                  >
                    <SelectTrigger className="w-full bg-background border rounded-lg text-sm px-3 py-2">
                      <SelectValue placeholder="Selecione o Atributo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione o Atributo...</SelectItem>
                      {attributes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Fuso horário (Timezone)">
                <Select
                  value={draft.timezone || "America/Campo_Grande"}
                  onValueChange={(value) => setDraftField("timezone", value, setDraft)}
                >
                  <SelectTrigger className="w-full bg-background border rounded-lg text-sm px-3 py-2 font-mono">
                    <SelectValue placeholder="Selecione o fuso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <NumberField
                  label="Tamanho do Slot (min)"
                  value={draft.slotMinutes}
                  onChange={(value) => setDraftField("slotMinutes", value, setDraft)}
                />
                <NumberField
                  label="Duração Padrão (min)"
                  value={draft.defaultDurationMinutes}
                  onChange={(value) => setDraftField("defaultDurationMinutes", value, setDraft)}
                />
                <NumberField
                  label="Antecedência Mínima (min)"
                  value={draft.minAdvanceMinutes}
                  onChange={(value) => setDraftField("minAdvanceMinutes", value, setDraft)}
                />
                <NumberField
                  label="Dias Máx. Reservas à frente"
                  value={draft.maxDaysAhead}
                  onChange={(value) => setDraftField("maxDaysAhead", value, setDraft)}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="active" className="font-semibold text-sm">Recurso Ativo</Label>
                  <span className="text-[11px] text-muted-foreground">Disponível para reservas e consultas da IA</span>
                </div>
                <Switch
                  id="active"
                  checked={draft.active}
                  onCheckedChange={(value) => setDraftField("active", value, setDraft)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="submit" disabled={!active || saving} className="flex-1 font-bold">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  {editing ? "Salvar Alterações" : "Mapear Recurso"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-5 font-semibold hover:bg-muted"
                >
                  Cancelar
                </Button>
              </div>
            </form>
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
    <Card className="border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/10 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Agendas vinculadas à sua conta Google</CardTitle>
          <CardDescription className="text-xs">Selecione uma agenda para expor como recurso da IA</CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={!connected || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
          Atualizar Lista
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {!connected ? (
          <EmptyState
            title="Nenhuma conta conectada"
            description="Por favor, conecte uma conta Google OAuth acima para poder mapear suas agendas."
            className="m-6"
          />
        ) : calendars.length === 0 ? (
          <EmptyState
            title="Nenhuma agenda encontrada"
            description="Garantimos acesso às agendas Google da conta conectada. Tente atualizar a lista."
            className="m-6"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Agenda</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Mapeamento</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendars.map((calendar) => (
                <TableRow key={calendar.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="font-semibold text-foreground">{calendar.summary}</div>
                    <div className="max-w-[320px] truncate text-[11px] text-muted-foreground font-mono">
                      {calendar.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{calendar.timeZone ?? "—"}</TableCell>
                  <TableCell className="text-xs font-semibold capitalize">{calendar.accessRole ?? "—"}</TableCell>
                  <TableCell>
                    {calendar.mapped ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Mapeado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-muted">Não mapeada</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end pr-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={calendar.mapped ? "secondary" : "outline"}
                        onClick={() => onConfigure(calendar)}
                        className="font-semibold text-xs rounded-xl"
                      >
                        {calendar.mapped ? "Editar Configurações" : "Configurar como recurso"}
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
  calendars,
  types,
  categories,
  attributes,
  saving,
  onEdit,
  onDeactivate,
}: {
  resources: GoogleCalendarResourceItem[];
  calendars: GoogleCalendarAccountCalendar[];
  types: ReservableResourceType[];
  categories: ReservableResourceCategory[];
  attributes: ReservableResourceAttribute[];
  saving: boolean;
  onEdit: (resource: GoogleCalendarResourceItem) => void;
  onDeactivate: (resource: GoogleCalendarResourceItem) => void;
}) {
  return (
    <Card className="border bg-card shadow-sm">
      <CardHeader className="border-b bg-muted/10 pb-4">
        <CardTitle className="text-base font-semibold">Lista de Recursos Reserváveis</CardTitle>
        <CardDescription className="text-xs">Recursos mapeados da agenda do Google disponíveis no runtime da IA.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {resources.length === 0 ? (
          <EmptyState
            title="Nenhum recurso cadastrado"
            description="Mapeie suas agendas Google nas abas acima ou crie um recurso manualmente."
            className="m-6"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Recurso</TableHead>
                <TableHead>Agenda Mapeada</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Atributo</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource.id} className="hover:bg-muted/20">
                  <TableCell className="font-semibold text-foreground">{resource.name}</TableCell>
                  <TableCell className="max-w-[240px]">
                    <div className="flex items-center gap-2" title={resource.calendarId}>
                      <span className="truncate text-xs font-medium text-foreground">
                        {getCalendarName(resource.calendarId, calendars)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-muted shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(resource.calendarId);
                          toast.success("ID copiado!");
                        }}
                      >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {getTypeName(resource, types)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs text-primary border-primary/20 bg-primary/5">
                      {getCategoryName(resource, categories)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs border-muted-foreground/20 text-muted-foreground">
                      {getAttributeName(resource, attributes)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{resource.defaultDurationMinutes} min</TableCell>
                  <TableCell>
                    {resource.active ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1 pr-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(resource)}
                        className="text-xs font-semibold hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!resource.active || saving}
                        onClick={() => onDeactivate(resource)}
                        className="text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Desativar
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
      <Label className="font-semibold text-xs text-foreground">{label}</Label>
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
        className="h-9"
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

function toPayload(draft: ResourceDraft, installationId?: string): SaveGoogleCalendarResourcePayload {
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
    resourceTypeId: draft.resourceTypeId || null,
    categoryId: draft.categoryId || null,
    attributeId: draft.attributeId || null,
    installationId: installationId || null,
  };
}

function InstallationBadge({ app }: { app: AppCatalogItem | null }) {
  if (!app?.installation) {
    return <Badge variant="outline">Não instalado</Badge>;
  }

  if (app.installation.status === "ACTIVE") {
    return <Badge className="bg-emerald-500 text-white font-medium">Instalado e Ativo</Badge>;
  }

  if (app.installation.status === "ERROR") {
    return <Badge variant="destructive" className="font-medium">Erro na Extensão</Badge>;
  }

  return <Badge variant="secondary" className="font-medium">Desativado</Badge>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
