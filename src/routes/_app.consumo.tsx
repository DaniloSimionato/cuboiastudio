import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Coins,
  Activity,
  DollarSign,
  Timer,
  MessageCircle,
  UserCheck,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { ApiError } from "@/services/apiClient";
import { usageService, type UsageSummary } from "@/services/usageService";

export const Route = createFileRoute("/_app/consumo")({
  head: () => ({ meta: [{ title: "Consumo IA · Cubo AI Studio" }] }),
  component: ConsumoPage,
});

const numberFormatter = new Intl.NumberFormat("pt-BR");
const usdFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "symbol",
});

function formatDateLabel(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function ConsumoPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await usageService.getSummary());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o consumo de IA. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const maxDailyCost = useMemo(
    () => Math.max(...(summary?.dailyCosts.map((item) => item.cost) ?? [0]), 0),
    [summary],
  );
  const month = summary?.month;
  const runtime = summary?.runtime;
  const costDelta = (month?.actualCost ?? 0) - (month?.previousActualCost ?? 0);
  const kpis = [
    {
      label: "Tokens utilizados (mês)",
      value: numberFormatter.format(month?.totalTokens ?? 0),
      icon: Coins,
      delta: "dados oficiais da OpenAI",
    },
    {
      label: "Requests à IA",
      value: numberFormatter.format(month?.requests ?? 0),
      icon: Activity,
      delta: "mês atual",
    },
    {
      label: "Custo real da OpenAI",
      value: usdFormatter.format(month?.actualCost ?? 0),
      icon: DollarSign,
      delta: `${costDelta >= 0 ? "+" : ""}${usdFormatter.format(costDelta)} vs. mês anterior`,
    },
    {
      label: "Tempo médio de resposta",
      value: `${((runtime?.averageResponseMs ?? 0) / 1000).toLocaleString("pt-BR", {
        maximumFractionDigits: 2,
      })} s`,
      icon: Timer,
      delta: "medido pelo runtime",
    },
    {
      label: "Conversas resolvidas pela IA",
      value: numberFormatter.format(runtime?.resolvedConversations ?? 0),
      icon: MessageCircle,
      delta: "mês atual",
    },
    {
      label: "Transferências para humano",
      value: numberFormatter.format(runtime?.handoffs ?? 0),
      icon: UserCheck,
      delta: "mês atual",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Consumo IA"
        description="Acompanhe o uso e o custo real faturável da OpenAI por empresa."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        }
      />

      {(summary?.message || error) && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            {error ?? summary?.message}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {k.label}
                  </div>
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-2xl font-bold">{loading ? "—" : k.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k.delta}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Custo real por dia (últimos 14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-1.5">
              {(summary?.dailyCosts ?? []).map((item) => {
                const height = maxDailyCost > 0 ? Math.max((item.cost / maxDailyCost) * 100, 2) : 0;
                return (
                  <div
                    key={item.date}
                    className="group relative flex h-full flex-1 items-end rounded-t-md bg-primary/10"
                  >
                    <div
                      className="w-full rounded-t-md bg-primary"
                      style={{ height: `${height}%` }}
                    />
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background group-hover:block">
                      {formatDateLabel(item.date)} · {usdFormatter.format(item.cost)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              {(summary?.dailyCosts ?? []).map((item) => (
                <span key={item.date}>{formatDateLabel(item.date)}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uso por modelo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary?.byModel.length ? (
              summary.byModel.map((item) => (
                <div key={item.model}>
                  <div className="mb-1 flex justify-between gap-3 text-xs">
                    <span className="truncate">{item.model}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {numberFormatter.format(item.tokens)} tokens
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nenhum uso registrado no período.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como o custo é apurado</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          O valor exibido vem do endpoint oficial <code>Costs</code> da OpenAI, filtrado pelo
          projeto desta empresa e em USD. A OpenAI informa que esse dado é o apropriado para
          conciliação com a fatura; tokens e requisições vêm do endpoint oficial <code>Usage</code>.
        </CardContent>
      </Card>
    </div>
  );
}
