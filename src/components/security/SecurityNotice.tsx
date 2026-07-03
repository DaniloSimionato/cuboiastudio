import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aviso discreto exibido em telas que coletam credenciais.
 * Reforça ao usuário que o frontend não armazena segredos.
 */
export function SecurityNotice({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800",
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {children ??
          "Credenciais sensíveis são armazenadas apenas no backend. O frontend nunca retém tokens."}
      </span>
    </div>
  );
}
