import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import {
  DEFAULT_ASSISTANT_BEHAVIOR,
  type AssistantBehaviorFormState,
} from "../../types/assistant-behavior.types";

export type { AssistantBehaviorFormState } from "../../types/assistant-behavior.types";
export const DEFAULT_BEHAVIOR = DEFAULT_ASSISTANT_BEHAVIOR;

type AssistantBehaviorTabProps = {
  assistantId: string | null;
  behavior: AssistantBehaviorFormState;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  onChange: (next: AssistantBehaviorFormState) => void;
  onSave: () => Promise<void>;
};

function textValue(value: string | null): string {
  return value ?? "";
}

export function AssistantBehaviorTab({
  assistantId,
  behavior,
  loading,
  saving,
  dirty,
  onChange,
  onSave,
}: AssistantBehaviorTabProps) {
  const update = <K extends keyof AssistantBehaviorFormState>(
    key: K,
    value: AssistantBehaviorFormState[K],
  ) => {
    onChange({ ...behavior, [key]: value });
  };

  if (!assistantId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center py-8">
            Salve o assistente primeiro para configurar o comportamento da IA.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 grid gap-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nome da Atendente">
            <Input
              value={textValue(behavior.attendantName)}
              onChange={(event) => update("attendantName", event.target.value)}
              placeholder="Ex: Giovanna"
            />
          </Field>
          <Field label="Mostrar nome da atendente" className="flex flex-col justify-center mt-6">
            <div className="flex items-center space-x-2">
              <Switch
                checked={behavior.showAttendantName}
                onCheckedChange={(checked) => update("showAttendantName", checked)}
              />
              <span className="text-sm">Exibir na resposta</span>
            </div>
          </Field>
        </div>

        <Field label="Papel / Cargo">
          <Input
            value={textValue(behavior.role)}
            onChange={(event) => update("role", event.target.value)}
            placeholder="Ex: Secretária virtual, Atendente de suporte"
          />
        </Field>

        <Field label="Como ela atua">
          <Textarea
            value={textValue(behavior.howItActs)}
            onChange={(event) => update("howItActs", event.target.value)}
            placeholder="Ex: Atende clientes pelo WhatsApp, tira dúvidas e agenda horários."
            rows={3}
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Estilo conversacional">
            <Select
              value={behavior.responseStyle ?? "whatsapp"}
              onValueChange={(value) => update("responseStyle", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">Natural para WhatsApp</SelectItem>
                <SelectItem value="concise">Conciso</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Uso de Emojis">
            <Select
              value={behavior.emojiUsage ?? "low"}
              onValueChange={(value) => update("emojiUsage", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (Proibido)</SelectItem>
                <SelectItem value="low">Baixo (Raramente)</SelectItem>
                <SelectItem value="moderate">Moderado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Comportamento Desconhecido">
            <Select
              value={behavior.unknownBehavior ?? "fallback"}
              onValueChange={(value) => update("unknownBehavior", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fallback">Responder mensagem padrão (Fallback)</SelectItem>
                <SelectItem value="handoff">Transferir para humano (Handoff)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {saving ? "Salvando..." : dirty ? "Alterações não salvas" : "Configuração sincronizada"}
          </span>
          <Button onClick={() => void onSave()} disabled={saving || !dirty}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
