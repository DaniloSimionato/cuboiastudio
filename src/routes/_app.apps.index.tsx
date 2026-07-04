import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Blocks,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  Settings
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingState } from "@/components/feedback/States";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/services/apiClient";
import { appStoreService } from "@/services";
import { getAppBrandIcon } from "@/lib/appBrandIcons";
import type { AppCatalogItem, AppInstallationItem } from "@/types";

export const Route = createFileRoute("/_app/apps/")({
  head: () => ({ meta: [{ title: "Loja de Aplicativos · Cubo AI Studio" }] }),
  component: AppsPage,
});

function AppsPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppCatalogItem[]>([]);
  const [installations, setInstallations] = useState<AppInstallationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros e Abas
  const [activeTab, setActiveTab] = useState<"store" | "my_apps">("store");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const loadApps = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [appsData, instsData] = await Promise.all([
        appStoreService.listApps(),
        appStoreService.listInstallations(),
      ]);
      setApps(appsData);
      setInstallations(instsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar a loja de aplicativos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  async function installApp(app: AppCatalogItem) {
    if (app.availability === "COMING_SOON") {
      toast.info("Este aplicativo estará disponível em breve.");
      return;
    }
    setSavingSlug(app.slug);
    setError(null);

    try {
      const installation = await appStoreService.install(app.slug);
      
      if (app.slug === "google_calendar") {
        toast.success("Redirecionando para configurar a extensão do Google Agenda...");
        void navigate({
          to: "/apps/google-calendar",
          search: { installationId: installation.id },
        });
        return;
      }
      
      toast.success(`${app.name} instalado com sucesso.`);
      await loadApps();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível instalar o aplicativo.");
      toast.error(err instanceof ApiError ? err.message : "Erro na instalação.");
    } finally {
      setSavingSlug(null);
    }
  }

  async function toggleStatus(id: string, status: "ACTIVE" | "INACTIVE") {
    try {
      await appStoreService.updateInstallationStatus(id, status);
      toast.success(status === "ACTIVE" ? "Conexão reativada." : "Conexão inativada.");
      await loadApps();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao alterar status da conexão.");
    }
  }

  async function deleteInst(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta conexão definitivamente?")) return;
    try {
      await appStoreService.deleteInstallation(id);
      toast.success("Conexão excluída com sucesso.");
      await loadApps();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao excluir conexão.");
    }
  }

  // Lista única de categorias presentes nos aplicativos
  const categories = ["TODOS", ...Array.from(new Set(apps.map(a => a.category).filter(Boolean))) as string[]];

  // Filtragem dos apps (catálogo) baseada nas opções do usuário
  const filteredApps = apps.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "TODOS" || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtragem das instalações baseada nas opções do usuário
  const filteredInstallations = installations.filter((inst) => {
    const matchesSearch = inst.app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.credentials?.some(c => c.providerAccountEmail?.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesCategory = selectedCategory === "TODOS" || inst.app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loja de Aplicativos"
        description="Conecte seus aplicativos externos e de produtividade para estender as capacidades da sua IA."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadApps()}
            className="flex items-center gap-2 hover:bg-muted h-9 rounded-lg px-3 text-xs"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        }
      />

      {error ? (
        <ErrorState
          title="Não foi possível concluir a ação"
          description={error}
          onRetry={() => void loadApps()}
          className="mb-4"
        />
      ) : null}

      {/* Tabs principal de navegação com design premium */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex bg-muted/60 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("store")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "store"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Explorar Loja
          </button>
          <button
            onClick={() => setActiveTab("my_apps")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center ${
              activeTab === "my_apps"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Meus Aplicativos
            {installations.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full font-bold">
                {installations.length}
              </span>
            )}
          </button>
        </div>

        {/* Barra de busca e filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar aplicativos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          
          <div className="relative">
            <button
              onClick={() => setCategoryOpen(!categoryOpen)}
              className="flex items-center justify-between bg-background border border-border rounded-lg text-sm px-3 py-2 min-w-[180px] text-left hover:bg-muted/40 transition-all cursor-pointer h-9 shadow-sm"
            >
              <span className="truncate">{selectedCategory === "TODOS" ? "Todas as Categorias" : selectedCategory}</span>
              <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
            </button>
            {categoryOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCategoryOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-full min-w-[200px] bg-white text-slate-800 border border-slate-200 rounded-lg shadow-lg z-20 py-1.5 max-h-[300px] overflow-y-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCategoryOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-slate-100 cursor-pointer ${
                        selectedCategory === cat ? "bg-slate-50 font-bold text-primary" : "font-normal"
                      }`}
                    >
                      {cat === "TODOS" ? "Todas as Categorias" : cat}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Carregando catálogo de aplicativos..." />
      ) : (
        <>
          {activeTab === "store" ? (
            filteredApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/20 border border-dashed rounded-2xl">
                <Blocks className="h-12 w-12 text-muted-foreground/60 mb-3 animate-pulse" />
                <h3 className="text-lg font-semibold text-foreground">Nenhum aplicativo encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Tente redefinir seus filtros ou buscar por outros termos para encontrar aplicativos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {filteredApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isInstalled={installations.some(i => i.appId === app.id)}
                    saving={savingSlug === app.slug}
                    onInstall={() => void installApp(app)}
                  />
                ))}
              </div>
            )
          ) : (
            filteredInstallations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/20 border border-dashed rounded-2xl">
                <Blocks className="h-12 w-12 text-muted-foreground/60 mb-3 animate-pulse" />
                <h3 className="text-lg font-semibold text-foreground">Nenhum aplicativo instalado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Você ainda não possui instalações ativas nessa categoria ou busca. Explore a loja para adicionar integrações.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {filteredInstallations.map((inst) => (
                  <AppInstallationCard
                    key={inst.id}
                    inst={inst}
                    onToggleStatus={toggleStatus}
                    onDelete={deleteInst}
                  />
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function AppCard({
  app,
  isInstalled,
  saving,
  onInstall,
}: {
  app: AppCatalogItem;
  isInstalled: boolean;
  saving: boolean;
  onInstall: () => void;
}) {
  const isComingSoon = app.availability === "COMING_SOON";

  return (
    <Card className={`group relative flex flex-col items-center justify-between overflow-hidden border bg-background hover:shadow-md transition-all duration-200 p-3 h-[180px] text-center ${
      isComingSoon ? "border-muted-foreground/10 opacity-70" : "border-border"
    }`}>
      {/* Small badge in the top right corner */}
      <div className="absolute top-2 right-2">
        {isInstalled && (
          <span className="bg-emerald-500 text-white text-[8px] py-0.5 px-1.5 rounded-sm font-bold uppercase tracking-wide leading-none">
            Instalado
          </span>
        )}
      </div>

      {/* Main visual app tile block */}
      <div className="flex flex-col items-center space-y-2 mt-4 w-full">
        {/* Logo Container (56x56 px area) */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20 border border-muted/5 shadow-sm p-1.5 group-hover:scale-105 transition-all duration-200">
          <img
            src={getAppBrandIcon(app.slug, "png")}
            alt=""
            className="h-11 w-11 object-contain"
            onError={(e) => {
              const currentSrc = e.currentTarget.src;
              if (currentSrc.includes(".png")) {
                e.currentTarget.src = getAppBrandIcon(app.slug, "svg");
              } else {
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  if (!parent.querySelector(".fallback-icon")) {
                    const fallback = document.createElement("div");
                    fallback.className = "fallback-icon flex items-center justify-center bg-muted rounded-xl text-muted-foreground w-full h-full";
                    fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-blocks"><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77l.72.16a2 2 0 0 0 2-1.34L11.72 1a2 2 0 0 1 3.56 0l.37 1.67a2 2 0 0 0 2 1.34l.72-.16a4 4 0 0 1 4.78 4.77l-.16.72a2 2 0 0 0 1.34 2l1.67.37a2 2 0 0 1 0 3.56l-1.67.37a2 2 0 0 0-1.34 2l.16.72a4 4 0 0 1-4.78 4.77l-.72-.16a2 2 0 0 0-2 1.34l-.37 1.67a2 2 0 0 1-3.56 0l-.37-1.67a2 2 0 0 0-2-1.34l-.72.16a4 4 0 0 1-4.78-4.77l.16-.72a2 2 0 0 0-1.34-2l-1.67-.37a2 2 0 0 1 0-3.56l1.67-.37a2 2 0 0 0 1.34-2l-.16-.72Z"/></svg>`;
                    parent.appendChild(fallback);
                  }
                }
              }
            }}
          />
        </div>

        {/* Text information */}
        <div className="space-y-0.5 w-full">
          <CardTitle className="text-xs font-bold tracking-tight text-foreground truncate px-1">
            {app.name}
          </CardTitle>
          {app.category && (
            <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider block">
              {app.category}
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="w-full mt-1">
        {isComingSoon ? (
          <Button
            disabled
            className="w-full bg-muted text-muted-foreground h-7 py-0.5 rounded-md text-[10px] font-bold cursor-not-allowed border-none"
          >
            Em breve
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onInstall}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1 h-7 py-0.5 rounded-md text-[10px] font-bold shadow-sm transition-all duration-200 cursor-pointer border-none"
          >
            {saving ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowUpRight className="h-3 w-3" />
            )}
            Adicionar app
          </Button>
        )}
      </div>
    </Card>
  );
}

function getInstallationStatusLabel(inst: AppInstallationItem) {
  if (inst.status === "INACTIVE") return { text: "Inativo", color: "bg-slate-400 text-white" };
  if (inst.status === "ERROR") return { text: "Erro", color: "bg-red-500 text-white" };
  if (inst.credentialsConfigured) {
    return { text: "Conectado", color: "bg-emerald-500 text-white" };
  }
  return { text: "Desconectado", color: "bg-amber-500 text-white" };
}

function AppInstallationCard({
  inst,
  onToggleStatus,
  onDelete,
}: {
  inst: AppInstallationItem;
  onToggleStatus: (id: string, status: "ACTIVE" | "INACTIVE") => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const email = inst.providerAccountEmail;
  const statusInfo = getInstallationStatusLabel(inst);

  return (
    <Card className="group relative flex flex-col items-center justify-between overflow-hidden border border-border bg-background hover:shadow-md transition-all duration-200 p-3 h-[180px] text-center">
      {/* Top right status badge */}
      <div className="absolute top-2 right-2">
        <span className={`text-[8px] py-0.5 px-1.5 rounded-sm font-bold uppercase tracking-wide leading-none ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* Central icon and details */}
      <div className="flex flex-col items-center space-y-2 mt-4 w-full">
        {/* Logo area */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20 border border-muted/5 shadow-sm p-1.5 group-hover:scale-105 transition-all duration-200">
          <img
            src={getAppBrandIcon(inst.app.slug, "png")}
            alt=""
            className="h-11 w-11 object-contain"
            onError={(e) => {
              const currentSrc = e.currentTarget.src;
              if (currentSrc.includes(".png")) {
                e.currentTarget.src = getAppBrandIcon(inst.app.slug, "svg");
              } else {
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  if (!parent.querySelector(".fallback-icon")) {
                    const fallback = document.createElement("div");
                    fallback.className = "fallback-icon flex items-center justify-center bg-muted rounded-xl text-muted-foreground w-full h-full";
                    fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-blocks"><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77l.72.16a2 2 0 0 0 2-1.34L11.72 1a2 2 0 0 1 3.56 0l.37 1.67a2 2 0 0 0 2 1.34l.72-.16a4 4 0 0 1 4.78 4.77l-.16.72a2 2 0 0 0 1.34 2l1.67.37a2 2 0 0 1 0 3.56l-1.67.37a2 2 0 0 0-1.34 2l.16.72a4 4 0 0 1-4.78 4.77l-.72-.16a2 2 0 0 0-2 1.34l-.37 1.67a2 2 0 0 1-3.56 0l-.37-1.67a2 2 0 0 0-2-1.34l-.72.16a4 4 0 0 1-4.78-4.77l.16-.72a2 2 0 0 0-1.34-2l-1.67-.37a2 2 0 0 1 0-3.56l1.67-.37a2 2 0 0 0 1.34-2l-.16-.72Z"/></svg>`;
                    parent.appendChild(fallback);
                  }
                }
              }
            }}
          />
        </div>

        {/* Text information */}
        <div className="space-y-0.5 w-full">
          <CardTitle className="text-xs font-bold tracking-tight text-foreground truncate px-1">
            {inst.app.name}
          </CardTitle>
          <span className="text-[9px] text-muted-foreground font-medium truncate block px-2">
            {email || "Conta ainda não conectada"}
          </span>
        </div>
      </div>

      {/* Buttons group with actions */}
      <div className="w-full mt-1 flex gap-1.5">
        <Button
          asChild
          type="button"
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1 h-7 py-0.5 rounded-md text-[10px] font-bold shadow-sm transition-all duration-200 cursor-pointer border-none"
        >
          <Link
            to={inst.app.slug === "google_calendar" ? "/apps/google-calendar" : `/apps/${inst.app.slug}`}
            search={{ installationId: inst.id }}
          >
            <Settings className="h-3 w-3 mr-0.5" /> Configurar
          </Link>
        </Button>

        {inst.status === "ACTIVE" && inst.credentialsConfigured && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void onToggleStatus(inst.id, "INACTIVE")}
            className="px-2 h-7 py-0.5 rounded-md text-[10px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Inativar
          </Button>
        )}

        {inst.status === "ACTIVE" && !inst.credentialsConfigured && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onDelete(inst.id)}
            className="px-2 h-7 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 hover:bg-rose-600 text-white cursor-pointer border-none"
          >
            Excluir
          </Button>
        )}

        {inst.status === "INACTIVE" && (
          <Button
            type="button"
            onClick={() => void onToggleStatus(inst.id, "ACTIVE")}
            className="px-2 h-7 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer border-none"
          >
            Reativar
          </Button>
        )}
      </div>
    </Card>
  );
}
