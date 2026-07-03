import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Pause, Play, MessageSquare, Instagram, Facebook, Globe } from "lucide-react";
import { canais, agentes, clientes, clienteNome, agenteNome } from "@/data/mock";
import { SecurityNotice } from "@/components";

export const Route = createFileRoute("/_app/canais")({
  head: () => ({ meta: [{ title: "Canais · Cubo AI Studio" }] }),
  component: CanaisPage,
});

const icone: Record<string, LucideIcon> = {
  "WhatsApp Oficial": MessageSquare,
  Uazapi: MessageSquare,
  Waha: MessageSquare,
  Instagram: Instagram,
  Facebook: Facebook,
  Webchat: Globe,
  TikTok: Globe,
};

function CanaisPage() {
  return (
    <div>
      <PageHeader
        title="Canais"
        description="Vincule agentes aos canais conectados via Cubo.Chat."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {canais.map((c) => {
          const Icon = icone[c.tipo] ?? MessageSquare;
          return (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <h3 className="font-semibold">{c.tipo}</h3>
                <p className="text-xs text-muted-foreground">{c.inbox}</p>
                <div className="mt-3 space-y-1 text-xs">
                  <Row label="Cliente" value={clienteNome(c.clienteId)} />
                  <Row label="Agente" value={c.agenteId ? agenteNome(c.agenteId) : "—"} />
                </div>
                <div className="flex gap-1 mt-4 pt-3 border-t">
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" /> Configurar
                  </Button>
                  <Button size="sm" variant="ghost">
                    {c.status === "ativo" ? (
                      <>
                        <Pause className="h-4 w-4" /> Pausar IA
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" /> Ativar IA
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6 grid md:grid-cols-2 gap-4">
          <h3 className="md:col-span-2 font-semibold">Configurar canal</h3>
          <div className="md:col-span-2">
            <SecurityNotice>
              Credenciais de canais (WhatsApp, Instagram, etc.) são gerenciadas pelo Cubo.Chat via
              backend. O frontend só recebe status.
            </SecurityNotice>
          </div>
          <Field label="Cliente/empresa">
            <Select defaultValue="c1">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Canal">
            <Select defaultValue="wa">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wa">WhatsApp Oficial</SelectItem>
                <SelectItem value="uaz">Uazapi</SelectItem>
                <SelectItem value="waha">Waha</SelectItem>
                <SelectItem value="ig">Instagram</SelectItem>
                <SelectItem value="fb">Facebook</SelectItem>
                <SelectItem value="web">Webchat</SelectItem>
                <SelectItem value="tt">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Inbox do Cubo.Chat">
            <Input defaultValue="Farmácia - Vendas" />
          </Field>
          <Field label="Agente padrão">
            <Select defaultValue="a1">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agentes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fluxo padrão">
            <Input defaultValue="Atendimento comercial" />
          </Field>
          <Field label="Departamento de fallback humano">
            <Input defaultValue="Vendas - Humanos" />
          </Field>
          <Field label="Horário de atendimento da IA">
            <Input defaultValue="seg-sex 08:00-20:00" />
          </Field>
          <Field label="Mensagem fora do horário" className="md:col-span-2">
            <Textarea
              rows={2}
              defaultValue="Estamos fora do horário. Retornaremos no próximo dia útil."
            />
          </Field>
          <ToggleRow label="Pausar IA quando humano assumir" defaultChecked />
          <ToggleRow label="Reativar IA quando conversa for resolvida" defaultChecked />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"space-y-1.5 " + className}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function ToggleRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="text-sm">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
