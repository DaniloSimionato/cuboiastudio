import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Shield, HelpCircle, Save, Loader2, PlayCircle, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { backendAssistantsService } from "@/services/backendAssistantsService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssistantToolConfig {
  appId: string;
  appSlug: string;
  appName: string;
  toolName: string;
  displayName: string;
  description: string;
  enabled: boolean;
  permissionType: "READ" | "WRITE";
  requiresConfirmation: boolean;
}

interface AssistantToolsTabProps {
  assistantId: string;
}

export function AssistantToolsTab({ assistantId }: AssistantToolsTabProps) {
  const [tools, setTools] = useState<AssistantToolConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!assistantId) return;

    let active = true;
    setLoading(true);

    backendAssistantsService
      .getTools(assistantId)
      .then((res) => {
        if (active) {
          setTools(res.items || []);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Não foi possível carregar as ferramentas deste assistente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [assistantId]);

  const toggleToolEnabled = (index: number) => {
    setTools((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const updateToolPermission = (index: number, val: "READ" | "WRITE") => {
    setTools((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, permissionType: val } : t))
    );
  };

  const toggleToolConfirmation = (index: number) => {
    setTools((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, requiresConfirmation: !t.requiresConfirmation } : t))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await backendAssistantsService.updateTools(assistantId, tools);
      toast.success("Ferramentas do assistente salvas com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar as ferramentas do assistente.");
    } finally {
      setSaving(false);
    }
  };

  // Group tools by App
  const groupedTools = useMemo(() => {
    const groups: Record<string, { appName: string; appSlug: string; tools: Array<{ item: AssistantToolConfig; index: number }> }> = {};
    
    tools.forEach((tool, index) => {
      if (!groups[tool.appId]) {
        groups[tool.appId] = {
          appName: tool.appName,
          appSlug: tool.appSlug,
          tools: [],
        };
      }
      groups[tool.appId].tools.push({ item: tool, index });
    });

    return Object.values(groups);
  }, [tools]);

  if (!assistantId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/40 min-h-[250px]">
        <HelpCircle className="h-10 w-10 text-muted-foreground/60 mb-2" />
        <h3 className="font-semibold text-lg text-foreground">Salvar assistente requerido</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
          Salve o assistente pela primeira vez para liberar a configuração de ferramentas integradas.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 min-h-[300px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground mt-2">Buscando ferramentas ativas...</span>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/40 min-h-[250px]">
        <PlayCircle className="h-10 w-10 text-muted-foreground/60 mb-2" />
        <h3 className="font-semibold text-lg text-foreground">Nenhum App instalado</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
          Vá na Loja de Aplicativos e instale conexões (ex: Google Agenda, Webhooks) para este tenant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Configurações de Ações e Permissões</h2>
          <p className="text-sm text-muted-foreground">
            Defina quais ferramentas de IA este assistente tem permissão para usar nas conversas.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Permissões
        </Button>
      </div>

      <TooltipProvider>
        <div className="grid gap-6">
          {groupedTools.map((group) => (
            <Card key={group.appName} className="overflow-hidden border-muted/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-muted/50 py-4 px-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary p-2 rounded-lg">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{group.appName}</CardTitle>
                    <CardDescription className="text-xs">
                      {group.appSlug === "google_calendar"
                        ? "Conexões nativas de consulta e agendamento de agenda."
                        : "Ações de integrações HTTP e Webhooks Personalizados."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-muted/40 p-0">
                {group.tools.map(({ item, index }) => (
                  <div
                    key={item.toolName}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 transition-colors ${
                      item.enabled ? "bg-card" : "bg-muted/10 opacity-70"
                    }`}
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{item.displayName}</span>
                        <code className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                          {item.toolName}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 self-start sm:self-auto">
                      {/* Read/Write select */}
                      {item.enabled && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground font-medium">Permissão:</Label>
                          <Select
                            value={item.permissionType}
                            onValueChange={(val: "READ" | "WRITE") => updateToolPermission(index, val)}
                          >
                            <SelectTrigger className="h-8 w-[100px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="READ">
                                <span className="flex items-center gap-1.5">
                                  <Eye className="h-3 w-3 text-sky-500" />
                                  Leitura
                                </span>
                              </SelectItem>
                              <SelectItem value="WRITE">
                                <span className="flex items-center gap-1.5">
                                  <Save className="h-3 w-3 text-emerald-500" />
                                  Escrita
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Requires Confirmation switch */}
                      {item.enabled && (
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground cursor-help underline decoration-dotted decoration-muted-foreground/50">
                                Confirmar?
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
                              Se ativado, a IA perguntará explicitamente ao cliente se ele deseja prosseguir antes de
                              chamar essa ação.
                            </TooltipContent>
                          </Tooltip>
                          <Switch
                            checked={item.requiresConfirmation}
                            onCheckedChange={() => toggleToolConfirmation(index)}
                          />
                        </div>
                      )}

                      {/* Tool Enable Switch */}
                      <div className="flex items-center gap-2 border-l border-muted/80 pl-4">
                        <Label className="text-xs font-semibold">Ativo</Label>
                        <Switch checked={item.enabled} onCheckedChange={() => toggleToolEnabled(index)} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
