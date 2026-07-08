import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coins,
  Activity,
  DollarSign,
  Timer,
  MessageCircle,
  UserCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";

export const Route = createFileRoute("/_app/consumo")({
  head: () => ({ meta: [{ title: "Consumo IA · Cubo AI Studio" }] }),
  component: ConsumoPage,
});

const kpis = [
  { label: "Tokens utilizados (mês)", value: "0", icon: Coins, delta: "vs R$ 0,00 mês anterior" },
  { label: "Requests à IA", value: "0", icon: Activity, delta: "últimos 30d" },
  {
    label: "Custo estimado",
    value: "R$ 0,00",
    icon: DollarSign,
    delta: "vs R$ 0,00 mês anterior",
  },
  { label: "Tempo médio de resposta", value: "0,00 s", icon: Timer, delta: "0 s" },
  {
    label: "Conversas resolvidas pela IA",
    value: "0",
    icon: MessageCircle,
    delta: "0% das conversas",
  },
  { label: "Transferências para humano", value: "0", icon: UserCheck, delta: "0%" },
];

const custoDia: number[] = [];
const porAssistente: { l: string; v: number; c: string }[] = [];
const porCanal: { l: string; v: number }[] = [];
const porModelo: { l: string; v: number }[] = [];

function ConsumoPage() {
  return (
    <div>
      <PageHeader
        title="Consumo IA"
        description="Acompanhe utilização, custos e desempenho dos Assistentes IA do Cubo.Chat."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {k.label}
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-2xl font-bold">{k.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{k.delta}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-600 grid place-items-center">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Economia gerada pela IA</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Estimativa baseada em conversas resolvidas sem intervenção humana.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Conversas resolvidas</div>
              <div className="text-lg font-bold">0</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tempo economizado</div>
              <div className="text-lg font-bold">0h</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Economia estimada</div>
              <div className="text-lg font-bold text-emerald-600">R$ 0,00</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Custo por dia (últimos 14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {custoDia.length === 0 ? (
              <div className="h-48 grid place-items-center text-xs text-muted-foreground border border-dashed rounded-lg">
                Nenhum dado de custo disponível para o período.
              </div>
            ) : (
              <>
                <div className="h-48 flex items-end gap-1.5">
                  {custoDia.map((v, i) => (
                    <div key={i} className="flex-1 bg-primary/15 rounded-t-md relative">
                      <div
                        className="absolute inset-x-0 bottom-0 bg-primary rounded-t-md"
                        style={{ height: `${v}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                  {custoDia.map((_, i) => (
                    <span key={i}>d{i + 1}</span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por Assistente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {porAssistente.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum custo registrado.</p>
            ) : (
              porAssistente.map((i) => (
                <div key={i.l}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate">{i.l}</span>
                    <span className="text-muted-foreground">{i.c}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-2 bg-primary rounded-full" style={{ width: `${i.v * 2}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por Canal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {porCanal.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum custo registrado.</p>
            ) : (
              porCanal.map((i) => (
                <div key={i.l}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{i.l}</span>
                    <span className="text-muted-foreground">{i.v}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-2 bg-primary rounded-full" style={{ width: `${i.v}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por Modelo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {porModelo.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum custo registrado.</p>
            ) : (
              porModelo.map((i) => (
                <div key={i.l}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{i.l}</span>
                    <span className="text-muted-foreground">{i.v}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-2 bg-primary rounded-full" style={{ width: `${i.v}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
