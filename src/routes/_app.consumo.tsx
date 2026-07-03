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
  { label: "Tokens utilizados (mês)", value: "3.482.190", icon: Coins, delta: "+8,2%" },
  { label: "Requests à IA", value: "12.487", icon: Activity, delta: "últimos 30d" },
  {
    label: "Custo estimado",
    value: "R$ 1.284,50",
    icon: DollarSign,
    delta: "vs R$ 1.190 mês anterior",
  },
  { label: "Tempo médio de resposta", value: "1,82 s", icon: Timer, delta: "-0,12 s" },
  {
    label: "Conversas resolvidas pela IA",
    value: "1.084",
    icon: MessageCircle,
    delta: "82% das conversas",
  },
  { label: "Transferências para humano", value: "187", icon: UserCheck, delta: "14,5%" },
];

const custoDia = [22, 38, 31, 47, 52, 41, 60, 55, 49, 63, 70, 58, 66, 72];
const porAssistente = [
  { l: "Atendente Comercial", v: 38, c: "R$ 488,12" },
  { l: "Suporte Técnico", v: 27, c: "R$ 346,82" },
  { l: "Agendamento", v: 18, c: "R$ 231,21" },
  { l: "Financeiro e Boletos", v: 11, c: "R$ 141,30" },
  { l: "Ordem de Serviço", v: 6, c: "R$ 77,05" },
];
const porCanal = [
  { l: "WhatsApp Oficial", v: 62 },
  { l: "Instagram", v: 18 },
  { l: "Webchat", v: 12 },
  { l: "Facebook", v: 5 },
  { l: "Telegram", v: 3 },
];
const porModelo = [
  { l: "gpt-4o-mini", v: 48 },
  { l: "claude-3-5-sonnet", v: 27 },
  { l: "gemini-1.5-pro", v: 17 },
  { l: "gpt-4o", v: 8 },
];

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
              <div className="text-lg font-bold">1.084</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tempo economizado</div>
              <div className="text-lg font-bold">182h</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Economia estimada</div>
              <div className="text-lg font-bold text-emerald-600">R$ 9.480</div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por Assistente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {porAssistente.map((i) => (
              <div key={i.l}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="truncate">{i.l}</span>
                  <span className="text-muted-foreground">{i.c}</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-2 bg-primary rounded-full" style={{ width: `${i.v * 2}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por Canal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {porCanal.map((i) => (
              <div key={i.l}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{i.l}</span>
                  <span className="text-muted-foreground">{i.v}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-2 bg-primary rounded-full" style={{ width: `${i.v}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por Modelo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {porModelo.map((i) => (
              <div key={i.l}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{i.l}</span>
                  <span className="text-muted-foreground">{i.v}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-2 bg-primary rounded-full" style={{ width: `${i.v}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
