import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Clock3,
  CircleOff,
  PencilLine,
  MessageSquare,
  ArrowRightLeft,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConnectionState, ConversationStatus, Status } from "@/types";

type SupportedStatus = Status | "ativa" | ConversationStatus | ConnectionState;

const STATUS_MAP: Record<
  SupportedStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  ativo: {
    label: "Ativo",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  ativa: {
    label: "Ativa",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  pausado: {
    label: "Pausado",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    Icon: CircleOff,
  },
  rascunho: {
    label: "Rascunho",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: PencilLine,
  },
  erro: {
    label: "Erro",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    Icon: AlertTriangle,
  },
  pendente: {
    label: "Pendente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock3,
  },
  indexando: {
    label: "Indexando",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Loader2,
  },
  resolvido: {
    label: "Resolvido",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  transferido: {
    label: "Transferido",
    className: "bg-violet-50 text-violet-700 border-violet-200",
    Icon: ArrowRightLeft,
  },
  "em andamento": {
    label: "Em andamento",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: MessageSquare,
  },
  conectado: {
    label: "Conectado",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  desconectado: {
    label: "Desconectado",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: CircleOff,
  },
  testando: {
    label: "Testando",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Loader2,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: SupportedStatus;
  className?: string;
}) {
  const current = STATUS_MAP[status];
  const Icon = current.Icon;

  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", current.className, className)}>
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          status === "indexando" || status === "testando" ? "animate-spin" : "",
        )}
      />
      {current.label}
    </Badge>
  );
}
