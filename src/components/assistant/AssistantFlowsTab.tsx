import { useEffect, useState } from "react";
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
import { Loader2, Plus, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import { assistantFlowsService } from "../../services/assistant-flows/assistant-flows.service";
import type {
  AssistantFlow,
  AssistantFlowCalendarToolContext,
  CreateAssistantFlowDto,
} from "../../types/assistant-flow.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface AssistantFlowsTabProps {
  assistantId: string | null;
}

type CalendarScopeFormState = {
  category: string;
  resourceType: string;
  attribute: string;
  durationMinutes: string;
};

const EMPTY_CALENDAR_SCOPE_FORM: CalendarScopeFormState = {
  category: "",
  resourceType: "",
  attribute: "",
  durationMinutes: "",
};

function buildToolContextFromCalendarScope(
  scope: CalendarScopeFormState,
): CreateAssistantFlowDto["toolContext"] {
  const category = scope.category.trim();
  const resourceType = scope.resourceType.trim();
  const attribute = scope.attribute.trim();
  const durationValue = scope.durationMinutes.trim();
  const durationMinutes = durationValue ? Number(durationValue) : null;

  if (!category && !resourceType && !attribute && !durationMinutes) {
    return null;
  }

  const calendar: AssistantFlowCalendarToolContext = {
    ...(category ? { category, sportType: category } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(attribute ? { attribute } : {}),
    ...(durationMinutes && Number.isFinite(durationMinutes) ? { durationMinutes } : {}),
  };

  return { calendar };
}

function parseCalendarScopeForm(
  toolContext: AssistantFlow["toolContext"] | null | undefined,
): CalendarScopeFormState {
  const calendar = toolContext?.calendar;

  return {
    category: calendar?.category ?? calendar?.sportType ?? "",
    resourceType: calendar?.resourceType ?? "",
    attribute: calendar?.attribute ?? "",
    durationMinutes:
      calendar?.durationMinutes !== null && calendar?.durationMinutes !== undefined
        ? String(calendar.durationMinutes)
        : "",
  };
}

export function AssistantFlowsTab({ assistantId }: AssistantFlowsTabProps) {
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState<AssistantFlow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<AssistantFlow | null>(null);
  const [calendarScopeForm, setCalendarScopeForm] =
    useState<CalendarScopeFormState>(EMPTY_CALENDAR_SCOPE_FORM);

  const parseJsonToLines = (json: string | undefined | null) => {
    try {
      const parsed = JSON.parse(json || "[]");
      if (Array.isArray(parsed)) return parsed.join("\n");
    } catch {}
    return json || "";
  };

  const parseLinesToJson = (lines: string) => {
    const arr = lines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return JSON.stringify(arr);
  };

  const [formData, setFormData] = useState<CreateAssistantFlowDto>({
    name: "",
    description: "",
    priority: 0,
    triggerKeywords: "",
    triggerDescription: "",
    triggerExamples: "",
    flowInstructions: "",
    allowedToolSlugs: "",
    knowledgeScope: "",
    toolContext: null,
    finalAction: "respond",
    fixedMessage: "",
    handoffTeamId: "",
    handoffTeamName: "",
    chatwootLabels: "",
    autoRespond: true,
    requiresHuman: false,
    active: true,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!assistantId) {
      setLoading(false);
      return;
    }
    loadFlows();
  }, [assistantId]);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const data = await assistantFlowsService.findAll(assistantId!);
      setFlows(data);
    } catch (error) {
      toast.error("Erro ao carregar fluxos");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingFlow(null);
    setCalendarScopeForm(EMPTY_CALENDAR_SCOPE_FORM);
    setFormData({
      name: "",
      description: "",
      priority: 0,
      triggerKeywords: '["palavra"]',
      triggerDescription: "",
      triggerExamples: "",
      flowInstructions: "",
      allowedToolSlugs: "",
      knowledgeScope: "",
      toolContext: null,
      finalAction: "respond",
      fixedMessage: "",
      handoffTeamId: "",
      handoffTeamName: "",
      chatwootLabels: "",
      autoRespond: true,
      requiresHuman: false,
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (flow: AssistantFlow) => {
    setEditingFlow(flow);
    setCalendarScopeForm(parseCalendarScopeForm(flow.toolContext));
    setFormData({
      name: flow.name,
      description: flow.description || "",
      priority: flow.priority,
      triggerKeywords: flow.triggerKeywords || "",
      triggerDescription: flow.triggerDescription || "",
      triggerExamples: flow.triggerExamples || "",
      flowInstructions: flow.flowInstructions || "",
      allowedToolSlugs: flow.allowedToolSlugs || "",
      knowledgeScope: flow.knowledgeScope || "",
      toolContext: flow.toolContext || null,
      finalAction: flow.finalAction || "respond",
      fixedMessage: flow.fixedMessage || "",
      handoffTeamId: flow.handoffTeamId || "",
      handoffTeamName: flow.handoffTeamName || "",
      chatwootLabels: flow.chatwootLabels || "",
      autoRespond: flow.autoRespond,
      requiresHuman: flow.requiresHuman,
      active: flow.active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (flowId: string) => {
    if (!assistantId) return;
    if (!confirm("Tem certeza que deseja excluir este fluxo?")) return;
    try {
      await assistantFlowsService.delete(assistantId, flowId);
      toast.success("Fluxo excluído");
      loadFlows();
    } catch (error) {
      toast.error("Erro ao excluir fluxo");
    }
  };

  const handleSave = async () => {
    if (!assistantId) return;
    if (!formData.name) {
      toast.error("O nome do fluxo é obrigatório");
      return;
    }

    const payload: CreateAssistantFlowDto = {
      ...formData,
      toolContext: buildToolContextFromCalendarScope(calendarScopeForm),
    };

    setSaving(true);
    try {
      if (editingFlow) {
        await assistantFlowsService.update(assistantId, editingFlow.id, payload);
        toast.success("Fluxo atualizado");
      } else {
        await assistantFlowsService.create(assistantId, payload);
        toast.success("Fluxo criado");
      }
      setIsModalOpen(false);
      loadFlows();
    } catch (error) {
      toast.error("Erro ao salvar fluxo");
    } finally {
      setSaving(false);
    }
  };

  if (!assistantId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center py-8">
            Salve o assistente primeiro para configurar os fluxos.
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
    <div className="space-y-4">
      <div className="flex justify-between items-start mb-6">
        <div className="max-w-3xl pr-4">
          <h3 className="text-lg font-medium">Fluxos da IA</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Fluxos são regras específicas acionadas por intenção. Use fluxos para assuntos como
            agendamento, financeiro, restaurante, Goomer Delivery ou atendimento humano. O prompt
            global continua valendo, mas o fluxo selecionado pode limitar ferramentas, usar mensagem
            fixa ou encaminhar para humano.
          </p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Fluxo
        </Button>
      </div>

      {flows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground py-12">
            Nenhum fluxo cadastrado. A IA responderá normalmente conforme o comportamento base.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {flows.map((flow) => (
            <Card key={flow.id} className="overflow-hidden">
              <div className="p-4 flex items-center justify-between bg-accent/5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{flow.name}</h4>
                    {!flow.active && <Badge variant="secondary">Inativo</Badge>}
                    <Badge variant="outline">Prioridade: {flow.priority}</Badge>
                    {flow.toolContext?.calendar?.category && (
                      <Badge
                        variant="outline"
                        className="border-primary/20 bg-primary/5 text-primary"
                      >
                        Agenda: {flow.toolContext.calendar.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{flow.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(flow)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(flow.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFlow ? "Editar Fluxo" : "Novo Fluxo"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Nome do Fluxo *">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Agendamento Padel"
                />
              </Field>
              <Field label="Prioridade">
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maior número = avaliado primeiro.
                </p>
              </Field>
            </div>

            <Field label="Descrição Interna">
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Utilizado para marcar quadras de padel."
              />
            </Field>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Gatilhos de Intenção</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Palavras que ativam este fluxo">
                  <Textarea
                    value={parseJsonToLines(formData.triggerKeywords)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        triggerKeywords: parseLinesToJson(e.target.value),
                      })
                    }
                    placeholder="Ex:&#10;agendar&#10;marcar quadra"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Uma palavra ou frase curta por linha.
                  </p>
                </Field>
                <Field label="Quando usar este fluxo?">
                  <Textarea
                    value={formData.triggerDescription || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, triggerDescription: e.target.value })
                    }
                    placeholder="Ex: O cliente quer reservar um horário."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usado pela IA caso as palavras-chave falhem.
                  </p>
                </Field>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Execução do Fluxo</h4>
              <Field label="Regras deste fluxo">
                <Textarea
                  value={formData.flowInstructions || ""}
                  onChange={(e) => setFormData({ ...formData, flowInstructions: e.target.value })}
                  placeholder="Instruções adicionais que serão somadas ao prompt principal quando este fluxo for ativado."
                  rows={4}
                />
              </Field>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Field label="Ação Final">
                  <Select
                    value={formData.finalAction || "respond"}
                    onValueChange={(val) => setFormData({ ...formData, finalAction: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="respond">A IA responde</SelectItem>
                      <SelectItem value="fixed_message">Mensagem fixa</SelectItem>
                      <SelectItem value="handoff">Encaminhar para humano</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.finalAction === "respond" &&
                      "Usa a IA normalmente com as regras e ferramentas permitidas."}
                    {formData.finalAction === "fixed_message" &&
                      "Responde exatamente o texto configurado, sem chamar LLM."}
                    {formData.finalAction === "handoff" &&
                      "Não deixa a IA tentar resolver sozinha."}
                  </p>
                </Field>
                <Field label="Ativo">
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      checked={formData.active}
                      onCheckedChange={(c) => setFormData({ ...formData, active: c })}
                    />
                    <span className="text-sm">Fluxo ativado</span>
                  </div>
                </Field>
              </div>
            </div>

            {formData.finalAction === "fixed_message" && (
              <Field label="Mensagem Fixa">
                <Textarea
                  value={formData.fixedMessage || ""}
                  onChange={(e) => setFormData({ ...formData, fixedMessage: e.target.value })}
                  placeholder="Mensagem exata a ser enviada ao cliente"
                  rows={2}
                />
              </Field>
            )}

            {formData.finalAction === "handoff" && (
              <Field label="Time de Transbordo (ID Chatwoot)">
                <Input
                  value={formData.handoffTeamId || ""}
                  onChange={(e) => setFormData({ ...formData, handoffTeamId: e.target.value })}
                  placeholder="ID numérico do time no Chatwoot"
                />
              </Field>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Escopo da Agenda</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Use estes campos para obrigar as ferramentas de agenda a consultar apenas recursos
                compatíveis com este fluxo.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Categoria/modalidade da agenda">
                  <Input
                    value={calendarScopeForm.category}
                    onChange={(e) =>
                      setCalendarScopeForm((current) => ({
                        ...current,
                        category: e.target.value,
                      }))
                    }
                    placeholder="Ex: Padel, Beach Tennis, Restaurante"
                  />
                </Field>
                <Field label="Tipo de recurso">
                  <Input
                    value={calendarScopeForm.resourceType}
                    onChange={(e) =>
                      setCalendarScopeForm((current) => ({
                        ...current,
                        resourceType: e.target.value,
                      }))
                    }
                    placeholder="Ex: quadra, restaurante, aula"
                  />
                </Field>
                <Field label="Atributo">
                  <Input
                    value={calendarScopeForm.attribute}
                    onChange={(e) =>
                      setCalendarScopeForm((current) => ({
                        ...current,
                        attribute: e.target.value,
                      }))
                    }
                    placeholder="Ex: coberta, descoberta"
                  />
                </Field>
                <Field label="Duração padrão em minutos">
                  <Input
                    type="number"
                    min={5}
                    step={5}
                    value={calendarScopeForm.durationMinutes}
                    onChange={(e) =>
                      setCalendarScopeForm((current) => ({
                        ...current,
                        durationMinutes: e.target.value,
                      }))
                    }
                    placeholder="Ex: 60 ou 120"
                  />
                </Field>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Configurações Adicionais</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Permitir Auto Responder">
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      checked={formData.autoRespond}
                      onCheckedChange={(c) => setFormData({ ...formData, autoRespond: c })}
                    />
                    <span className="text-sm">Se desativado, pulará a LLM</span>
                  </div>
                </Field>
                <Field label="Requer Humano">
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      checked={formData.requiresHuman}
                      onCheckedChange={(c) => setFormData({ ...formData, requiresHuman: c })}
                    />
                    <span className="text-sm">Força bypass da LLM e transbordo</span>
                  </div>
                </Field>
                <Field label="Ferramentas Permitidas">
                  <Textarea
                    value={parseJsonToLines(formData.allowedToolSlugs)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowedToolSlugs: parseLinesToJson(e.target.value),
                      })
                    }
                    placeholder="Ex:&#10;calendar_checkAvailability"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Uma ferramenta por linha. Vazio libera todas as globais.
                  </p>
                </Field>
                <Field label="Escopo de Conhecimento (Tags)">
                  <Textarea
                    value={parseJsonToLines(formData.knowledgeScope)}
                    onChange={(e) =>
                      setFormData({ ...formData, knowledgeScope: parseLinesToJson(e.target.value) })
                    }
                    placeholder="Ex:&#10;financeiro&#10;padel"
                    rows={2}
                  />
                </Field>
                <Field label="Labels do Chatwoot">
                  <Textarea
                    value={parseJsonToLines(formData.chatwootLabels)}
                    onChange={(e) =>
                      setFormData({ ...formData, chatwootLabels: parseLinesToJson(e.target.value) })
                    }
                    placeholder="Ex:&#10;urgente&#10;atendimento-financeiro"
                    rows={2}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
