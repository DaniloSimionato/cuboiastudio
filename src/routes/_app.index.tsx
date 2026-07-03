import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Bot, MessageSquare, UserCheck, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Dashboard · Cubo AI Studio" }] }),
  component: Dashboard,
});

const kpis = [
  { label: "Assistentes IA ativos", value: "4", icon: Bot, delta: "+1 esta semana" },
  { label: "Conversas atendidas pela IA", value: "1.284", icon: MessageSquare, delta: "+12%" },
  { label: "Transferências para humano", value: "187", icon: UserCheck, delta: "14,5%" },
  { label: "Taxa de resolução", value: "82%", icon: TrendingUp, delta: "+3pp" },
  { label: "Erros em ferramentas/webhooks", value: "9", icon: AlertTriangle, delta: "últimos 7d" },
  { label: "Custo estimado de IA", value: "R$ 412,80", icon: DollarSign, delta: "este mês" },
];

function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral dos Assistentes IA, atendimentos e integrações do módulo Cubo AI."
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Atendimentos por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-2">
              {[40, 65, 50, 80, 70, 95, 60].map((v, i) => (
                <div key={i} className="flex-1 bg-primary/20 rounded-t-md relative">
                  <div
                    className="absolute inset-x-0 bottom-0 bg-primary rounded-t-md"
                    style={{ height: `${v}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              {["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Principais intenções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { l: "dúvida_produto", v: 38 },
              { l: "2via_boleto", v: 24 },
              { l: "agendar_consulta", v: 18 },
              { l: "status_os", v: 12 },
              { l: "transferir", v: 8 },
            ].map((i) => (
              <div key={i.l}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{i.l}</span>
                  <span className="text-muted-foreground">{i.v}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-2 bg-primary rounded-full" style={{ width: `${i.v * 2}%` }} />
                </div>
              </div>
            ))}
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
              {logs.slice(0, 6).map((l) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
