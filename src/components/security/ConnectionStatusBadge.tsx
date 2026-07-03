import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConnectionState } from "@/types";

const map: Record<ConnectionState, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  conectado: {
    label: "Conectado",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  desconectado: {
    label: "Desconectado",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: XCircle,
  },
  testando: {
    label: "Testando…",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Loader2,
  },
  erro: {
    label: "Erro",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    Icon: AlertTriangle,
  },
};

export function ConnectionStatusBadge({
  state,
  className,
}: {
  state: ConnectionState;
  className?: string;
}) {
  const { label, cls, Icon } = map[state];
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", cls, className)}>
      <Icon className={cn("h-3.5 w-3.5", state === "testando" && "animate-spin")} />
      {label}
    </Badge>
  );
}
