import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, Power, PowerOff, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingState } from "@/components/feedback/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/services/apiClient";
import { appStoreService } from "@/services";
import type { AppCatalogItem } from "@/types";

export const Route = createFileRoute("/_app/apps")({
  head: () => ({ meta: [{ title: "Loja de Aplicativos · Cubo AI Studio" }] }),
  component: AppsPage,
});

function AppsPage() {
  const [apps, setApps] = useState<AppCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadApps = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setApps(await appStoreService.listApps());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar a loja.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  async function installApp(app: AppCatalogItem) {
    setSavingSlug(app.slug);
    setError(null);

    try {
      const installation = await appStoreService.install(app.slug);
      setApps((current) =>
        current.map((item) =>
          item.id === app.id
            ? {
                ...item,
                installation: {
                  id: installation.id,
                  status: installation.status,
                  credentialsConfigured: installation.credentialsConfigured,
                },
              }
            : item,
        ),
      );
      toast.success(`${app.name} instalado.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível instalar o aplicativo.");
    } finally {
      setSavingSlug(null);
    }
  }

  async function updateStatus(app: AppCatalogItem, status: "ACTIVE" | "INACTIVE") {
    if (!app.installation) {
      return;
    }

    setSavingSlug(app.slug);
    setError(null);

    try {
      const installation = await appStoreService.updateInstallationStatus(
        app.installation.id,
        status,
      );
      setApps((current) =>
        current.map((item) =>
          item.id === app.id
            ? {
                ...item,
                installation: {
                  id: installation.id,
                  status: installation.status,
                  credentialsConfigured: installation.credentialsConfigured,
                },
              }
            : item,
        ),
      );
      toast.success(status === "ACTIVE" ? `${app.name} ativado.` : `${app.name} inativado.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o aplicativo.");
    } finally {
      setSavingSlug(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Loja de Aplicativos"
        description="Instale integrações externas por empresa. A IA chama ferramentas internas do CuboIAStudio, e o backend executa as ações nos provedores."
        actions={
          <Button type="button" variant="outline" onClick={() => void loadApps()}>
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

      {loading ? (
        <LoadingState label="Carregando aplicativos..." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              saving={savingSlug === app.slug}
              onInstall={() => void installApp(app)}
              onActivate={() => void updateStatus(app, "ACTIVE")}
              onInactivate={() => void updateStatus(app, "INACTIVE")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AppCard({
  app,
  saving,
  onInstall,
  onActivate,
  onInactivate,
}: {
  app: AppCatalogItem;
  saving: boolean;
  onInstall: () => void;
  onActivate: () => void;
  onInactivate: () => void;
}) {
  const installed = Boolean(app.installation);
  const active = app.installation?.status === "ACTIVE";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <InstallationBadge app={app} />
        </div>
        <CardTitle className="text-lg">{app.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="min-h-12 text-sm text-muted-foreground">{app.description}</p>
        <div className="flex flex-wrap gap-2">
          {!installed ? (
            <Button type="button" onClick={onInstall} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Instalar
            </Button>
          ) : (
            <>
              <Button asChild type="button" variant="outline">
                <Link to="/apps/google-calendar">
                  <Settings className="h-4 w-4" /> Configurar
                </Link>
              </Button>
              {active ? (
                <Button type="button" variant="outline" onClick={onInactivate} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PowerOff className="h-4 w-4" />
                  )}
                  Inativar
                </Button>
              ) : (
                <Button type="button" onClick={onActivate} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  Ativar
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InstallationBadge({ app }: { app: AppCatalogItem }) {
  if (!app.installation) {
    return <Badge variant="outline">Não instalado</Badge>;
  }

  if (app.installation.status === "ACTIVE") {
    return <Badge>Instalado</Badge>;
  }

  if (app.installation.status === "ERROR") {
    return <Badge variant="destructive">Erro</Badge>;
  }

  return <Badge variant="secondary">Inativo</Badge>;
}
