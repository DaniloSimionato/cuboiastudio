import * as React from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * MaskedSecretInput
 * Campo para credenciais sensíveis.
 *
 * 🔐 Garantias:
 * - `type="password"` por padrão; toggle de visibilidade apenas visual.
 * - `autoComplete="new-password"` evita que o navegador armazene em managers
 *   compartilhados sem o usuário perceber.
 * - O valor digitado deve ser enviado ao backend (`/api/...`) e depois
 *   descartado. Nunca persistir em localStorage/sessionStorage.
 * - Quando o backend já possui o segredo, exiba `storedHint` (ex.: "sk-••••1234")
 *   no placeholder e deixe o input vazio: enviar vazio = manter o atual.
 */
export interface MaskedSecretInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  storedHint?: string;
}

export const MaskedSecretInput = React.forwardRef<HTMLInputElement, MaskedSecretInputProps>(
  ({ className, storedHint, placeholder, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const ph = storedHint
      ? `${storedHint} — deixe em branco para manter`
      : (placeholder ?? "••••••••••••");

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          spellCheck={false}
          placeholder={ph}
          className="pr-20"
          {...props}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          <ShieldCheck
            className="h-3.5 w-3.5 text-emerald-600"
            aria-label="Será enviada com segurança ao servidor"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar" : "Mostrar"}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  },
);
MaskedSecretInput.displayName = "MaskedSecretInput";
