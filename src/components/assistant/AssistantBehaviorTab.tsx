import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
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
import { toast } from "sonner";
import { assistantBehaviorsService } from "../../services/assistant-behaviors/assistant-behaviors.service";
import type { AssistantBehavior } from "../../types/assistant-behavior.types";

interface AssistantBehaviorTabProps {
  assistantId: string | null;
}

export interface AssistantBehaviorTabRef {
  saveBehavior: (newId?: string) => Promise<void>;
}

type AssistantBehaviorFormState = Partial<
  Pick<
    AssistantBehavior,
    | "attendantName"
    | "showAttendantName"
    | "role"
    | "howItActs"
    | "personality"
    | "toneOfVoice"
    | "responseStyle"
    | "emojiUsage"
    | "greetingMessage"
    | "noInventInfo"
    | "unknownBehavior"
    | "maxBlockLength"
  >
>;

const DEFAULT_BEHAVIOR: AssistantBehaviorFormState = {
  attendantName: "",
  showAttendantName: true,
  role: "",
  howItActs: "",
  personality: "",
  toneOfVoice: "",
  responseStyle: "whatsapp",
  emojiUsage: "low",
  greetingMessage: "",
  noInventInfo: true,
  unknownBehavior: "fallback",
  maxBlockLength: 300,
};

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildBehaviorPayload(behavior: AssistantBehaviorFormState): AssistantBehaviorFormState {
  return {
    attendantName: normalizeOptionalText(behavior.attendantName),
    showAttendantName: behavior.showAttendantName ?? true,
    role: normalizeOptionalText(behavior.role),
    howItActs: normalizeOptionalText(behavior.howItActs),
    personality: normalizeOptionalText(behavior.personality),
    toneOfVoice: normalizeOptionalText(behavior.toneOfVoice),
    responseStyle: normalizeOptionalText(behavior.responseStyle) ?? "whatsapp",
    emojiUsage: normalizeOptionalText(behavior.emojiUsage) ?? "low",
    greetingMessage: normalizeOptionalText(behavior.greetingMessage),
    noInventInfo: behavior.noInventInfo ?? true,
    unknownBehavior: normalizeOptionalText(behavior.unknownBehavior) ?? "fallback",
    maxBlockLength: behavior.maxBlockLength ?? 300,
  };
}

export const AssistantBehaviorTab = forwardRef<AssistantBehaviorTabRef, AssistantBehaviorTabProps>(
  ({ assistantId }, ref) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [behavior, setBehavior] = useState<AssistantBehaviorFormState>(DEFAULT_BEHAVIOR);

    useEffect(() => {
      if (!assistantId) {
        setBehavior(DEFAULT_BEHAVIOR);
        setLoading(false);
        return;
      }

      const loadBehavior = async () => {
        setLoading(true);
        try {
          const data = await assistantBehaviorsService.findByAssistantId(assistantId);
          if (data) {
            setBehavior(buildBehaviorPayload(data));
          } else {
            setBehavior(DEFAULT_BEHAVIOR);
          }
        } catch (error) {
          toast.error("Erro ao carregar comportamento da IA");
        } finally {
          setLoading(false);
        }
      };

      void loadBehavior();
    }, [assistantId]);

    useImperativeHandle(ref, () => ({
      saveBehavior: async (newId?: string) => {
        const targetId = newId || assistantId;
        if (!targetId) return;
        try {
          const payload = buildBehaviorPayload(behavior);
          const savedBehavior = await assistantBehaviorsService.upsert(targetId, payload);
          setBehavior(buildBehaviorPayload(savedBehavior));
        } catch (error) {
          console.error("Erro ao salvar comportamento:", error);
          throw error;
        }
      },
    }));

    const handleSave = async () => {
      if (!assistantId) return;
      setSaving(true);
      try {
        const payload = buildBehaviorPayload(behavior);
        const savedBehavior = await assistantBehaviorsService.upsert(assistantId, payload);
        setBehavior(buildBehaviorPayload(savedBehavior));
        toast.success("Comportamento salvo com sucesso!");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao salvar comportamento";
        toast.error(message);
      } finally {
        setSaving(false);
      }
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
                value={behavior.attendantName || ""}
                onChange={(e) => setBehavior({ ...behavior, attendantName: e.target.value })}
                placeholder="Ex: Giovanna"
              />
            </Field>
            <Field label="Mostrar nome da atendente" className="flex flex-col justify-center mt-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={behavior.showAttendantName}
                  onCheckedChange={(c) => setBehavior({ ...behavior, showAttendantName: c })}
                />
                <span className="text-sm">Exibir na resposta</span>
              </div>
            </Field>
          </div>

          <Field label="Papel / Cargo">
            <Input
              value={behavior.role || ""}
              onChange={(e) => setBehavior({ ...behavior, role: e.target.value })}
              placeholder="Ex: Secretária virtual, Atendente de suporte"
            />
          </Field>

          <Field label="Como ela atua">
            <Textarea
              value={behavior.howItActs || ""}
              onChange={(e) => setBehavior({ ...behavior, howItActs: e.target.value })}
              placeholder="Ex: Atende clientes pelo WhatsApp, tira dúvidas e agenda horários."
              rows={3}
            />
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Uso de Emojis">
              <Select
                value={behavior.emojiUsage || "low"}
                onValueChange={(val) => setBehavior({ ...behavior, emojiUsage: val })}
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
                value={behavior.unknownBehavior || "fallback"}
                onValueChange={(val) => setBehavior({ ...behavior, unknownBehavior: val })}
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

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Comportamento
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  },
);
