import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { logs, agenteNome } from "@/data/mock";
import { backendAssistantsService } from "@/services";
import { Bot, MessageSquare, UserCheck, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Cubo AI Studio" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [activeAssistantsCount, setActiveAssistantsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    backendAssistantsService
      .list()
      .then((items) => {
        if (!cancelled) {
          const activeCount = items.filter((a) => a.status === "ACTIVE").length;
          setActiveAssistantsCount(activeCount);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = [
    {
      label: "Assistentes IA ativos",
      value: loading ? "..." : String(activeAssistantsCount),
      icon: Bot,
      delta: "Ativos no momento",
    },
    {
      label: "Conversas atendidas pela IA",
      value: "0",
      icon: MessageSquare,
      delta: "0% de taxa de acerto",
    },
    { label: "Transferências para humano", value: "0", icon: UserCheck, delta: "0%" },
    { label: "Taxa de resolução", value: "0%", icon: TrendingUp, delta: "0%" },
    {
      label: "Erros em ferramentas/webhooks",
      value: "0",
      icon: AlertTriangle,
      delta: "últimos 7d",
    },
    { label: "Custo estimado de IA", value: "R$ 0,00", icon: DollarSign, delta: "este mês" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral dos Assistentes IA, atendimentos e integrações do módulo Cubo AI."
      />

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Atendimentos por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-2 border border-dashed rounded-lg justify-center items-center text-xs text-muted-foreground">
              Nenhum atendimento registrado nos últimos 7 dias.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Principais intenções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 py-6 flex flex-col items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg h-48">
            Nenhuma intenção identificada.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas conversas com IA</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente final</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Assistente IA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última mensagem</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50 text-primary animate-pulse" />
                    <p className="font-semibold text-sm">Nenhuma conversa registrada</p>
                    <p className="text-xs">As interações dos assistentes aparecerão aqui em tempo real.</p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.slice(0, 6).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.clienteFinal}</TableCell>
                    <TableCell>{l.canal}</TableCell>
                    <TableCell>{agenteNome(l.agenteId)}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {l.ultimaMensagem}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.data}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/logs">Ver log</Link>
                      </Button>
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
