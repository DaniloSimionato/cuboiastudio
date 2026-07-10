import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Trash2,
  Settings,
  Webhook,
  PlayCircle,
  HelpCircle,
  Pencil,
  Copy,
  CheckCircle,
  Save,
  X
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toolsService, type CustomWebhookAction } from "@/services/toolsService";

type SearchParams = {
  installationId?: string;
};

export const Route = createFileRoute("/_app/apps/custom-webhook")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      installationId: search.installationId as string | undefined,
    };
  },
  head: () => ({ meta: [{ title: "Webhook Personalizado · Cubo AI Studio" }] }),
  component: CustomWebhookAppPage,
});

function CustomWebhookAppPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [actions, setActions] = useState<CustomWebhookAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [descriptionAdmin, setDescriptionAdmin] = useState("");
  const [descriptionAi, setDescriptionAi] = useState("");
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headersJson, setHeadersJson] = useState("");
  const [authType, setAuthType] = useState("NONE");
  const [authToken, setAuthToken] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authKeyName, setAuthKeyName] = useState("");
  const [authKeyValue, setAuthKeyValue] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [parameterSchemaJson, setParameterSchemaJson] = useState("");
  const [timeoutMs, setTimeoutMs] = useState("5000");
  const [permissionType, setPermissionType] = useState("READ");
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [responseFilterJson, setResponseFilterJson] = useState("");
  const [active, setActive] = useState(true);

  const loadActions = async () => {
    setLoading(true);
    try {
      const items = await toolsService.list();
      setActions(items);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar as ações de webhook.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActions();
  }, []);

  const openCreateDialog = () => {
    setEditingId(null);
    setName("");
    setDisplayName("");
    setDescriptionAdmin("");
    setDescriptionAi("");
    setMethod("GET");
    setUrl("");
    setHeadersJson("{}");
    setAuthType("NONE");
    setAuthToken("");
    setAuthUsername("");
    setAuthPassword("");
    setAuthKeyName("");
    setAuthKeyValue("");
    setBodyTemplate("");
    setParameterSchemaJson(JSON.stringify({
      type: "object",
      properties: {
        sku: { type: "string", description: "Código do produto para busca" }
      },
      required: ["sku"]
    }, null, 2));
    setTimeoutMs("5000");
    setPermissionType("READ");
    setRequiresConfirmation(false);
    setResponseFilterJson("[]");
    setActive(true);
    setIsDialogOpen(true);
  };

  const openEditDialog = (action: CustomWebhookAction) => {
    setEditingId(action.id);
    setName(action.name);
    setDisplayName(action.displayName);
    setDescriptionAdmin(action.descriptionAdmin || "");
    setDescriptionAi(action.descriptionAi || "");
    setMethod(action.method);
    setUrl(action.url);
    setHeadersJson(JSON.stringify(action.headers || {}, null, 2));
    setAuthType(action.authType || "NONE");

    const auth = action.authConfig || {};
    setAuthToken(auth.token || "");
    setAuthUsername(auth.username || "");
    setAuthPassword(auth.password || "");
    setAuthKeyName(auth.keyName || "");
    setAuthKeyValue(auth.keyValue || "");

    setBodyTemplate(action.bodyTemplate || "");
    setParameterSchemaJson(JSON.stringify(action.parameterSchema || {}, null, 2));
    setTimeoutMs(String(action.timeoutMs || 5000));
    setPermissionType(action.permissionType || "READ");
    setRequiresConfirmation(action.requiresConfirmation || false);
    setResponseFilterJson(JSON.stringify(action.responseFilter || [], null, 2));
    setActive(action.active);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ação de webhook? Ela será removida de todos os assistentes.")) {
      return;
    }

    try {
      await toolsService.delete(id);
      toast.success("Ação excluída com sucesso!");
      void loadActions();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir ação.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^[a-z0-9_]+$/.test(name)) {
      toast.error("O identificador (slug) deve conter apenas letras minúsculas, números e sublinhados (_).");
      return;
    }

    // JSON Validations
    let headers = {};
    try {
      headers = JSON.parse(headersJson || "{}");
    } catch {
      toast.error("Headers inválidos. Certifique-se de que é um JSON válido.");
      return;
    }

    let parameterSchema = {};
    try {
      parameterSchema = JSON.parse(parameterSchemaJson || "{}");
    } catch {
      toast.error("Parâmetros (JSON Schema) inválidos.");
      return;
    }

    let responseFilter = [];
    try {
      responseFilter = JSON.parse(responseFilterJson || "[]");
    } catch {
      toast.error("Filtro de resposta inválido. Certifique-se de que é um array JSON de chaves.");
      return;
    }

    // Build authConfig
    const authConfig: Record<string, string> = {};
    if (authType === "BEARER") {
      authConfig.token = authToken;
    } else if (authType === "BASIC") {
      authConfig.username = authUsername;
      authConfig.password = authPassword;
    } else if (authType === "API_KEY") {
      authConfig.keyName = authKeyName;
      authConfig.keyValue = authKeyValue;
    }

    const payload: Partial<CustomWebhookAction> = {
      installationId: search.installationId || "webhook-inst-local",
      name,
      displayName,
      descriptionAdmin,
      descriptionAi,
      method,
      url,
      headers,
      authType,
      authConfig,
      bodyTemplate: bodyTemplate || null,
      parameterSchema,
      timeoutMs: Number(timeoutMs) || 5000,
      permissionType,
      requiresConfirmation,
      responseFilter,
      active,
    };

    setSaving(true);
    try {
      if (editingId) {
        await toolsService.update(editingId, payload);
        toast.success("Ação de webhook atualizada!");
      } else {
        await toolsService.create(payload);
        toast.success("Nova ação de webhook cadastrada!");
      }
      setIsDialogOpen(false);
      void loadActions();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar ação de webhook.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 cursor-pointer">
          <Link to="/apps">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Webhook Personalizado"
          description="Cadastre webhooks e chame endpoints de ERPs, CRMs ou APIs externas dinamicamente pela IA."
          actions={
            <Button onClick={openCreateDialog} size="sm" className="gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" /> Nova Ação
            </Button>
          }
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 min-h-[300px]">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground mt-2">Carregando ações cadastradas...</span>
        </div>
      ) : actions.length === 0 ? (
        <Card className="border-dashed border-muted/80">
          <CardContent className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center">
            <Webhook className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Nenhum webhook cadastrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
              Integre APIs do seu cliente cadastrando ações personalizadas que a IA pode decidir executar.
            </p>
            <Button onClick={openCreateDialog} className="cursor-pointer">
              Cadastrar primeira Ação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-bold">Ações Disponíveis</CardTitle>
            <CardDescription className="text-xs">
              Essas ações ficarão disponíveis para seleção nas configurações de ferramentas de cada assistente.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador / Slug</TableHead>
                  <TableHead>Nome Visual</TableHead>
                  <TableHead>Método & URL</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((act) => (
                  <TableRow key={act.id} className={act.active ? "" : "opacity-60 bg-muted/10"}>
                    <TableCell className="font-mono text-xs font-semibold">
                      webhook_{act.name}
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      {act.displayName}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 ${
                        act.method === "GET" ? "bg-sky-100 text-sky-700" :
                        act.method === "POST" ? "bg-emerald-100 text-emerald-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {act.method}
                      </span>
                      <span className="text-muted-foreground select-all font-mono text-[11px]">
                        {act.url}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className={`inline-flex items-center gap-1 font-semibold ${
                        act.permissionType === "WRITE" ? "text-emerald-600" : "text-sky-600"
                      }`}>
                        {act.permissionType === "WRITE" ? "Escrita (Mutação)" : "Leitura"}
                        {act.requiresConfirmation && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-normal">
                            Confirmação
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${act.active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(act)} className="h-7 w-7 cursor-pointer">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(act.id)} className="h-7 w-7 text-rose-500 hover:text-rose-600 cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* CRUD dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingId ? "Editar Ação de Webhook" : "Cadastrar Ação de Webhook"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                A IA usará o nome e a instrução semântica para entender quando e como executar esta chamada.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">Identificador (slug)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="consultar_estoque"
                  disabled={!!editingId}
                  required
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Minúsculas, números e sublinhados. Ficará visível como <code>webhook_nome</code>.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs font-semibold">Nome amigável (UI)</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Consultar Estoque"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descriptionAi" className="text-xs font-semibold">Instrução para a IA (Semantic Description)</Label>
              <Textarea
                id="descriptionAi"
                value={descriptionAi}
                onChange={(e) => setDescriptionAi(e.target.value)}
                placeholder="Use esta ferramenta para verificar o estoque de um produto passando o SKU. Retorna quantidade e localização."
                required
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="method" className="text-xs font-semibold">Método</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="method" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-3">
                <Label htmlFor="url" className="text-xs font-semibold">URL do Endpoint</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.sistema.com/v1/estoque/{{sku}}"
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Auth Configurations */}
            <Card className="border-muted/60">
              <CardHeader className="py-2.5 px-4 bg-muted/10 border-b border-muted/50">
                <CardTitle className="text-xs font-bold">Autenticação (Segurança)</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-xs col-span-1 font-medium">Tipo de Autenticação</Label>
                  <div className="col-span-2">
                    <Select value={authType} onValueChange={setAuthType}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Nenhuma (Pública)</SelectItem>
                        <SelectItem value="BEARER">Bearer Token (JWT)</SelectItem>
                        <SelectItem value="BASIC">Basic Auth (user/pass)</SelectItem>
                        <SelectItem value="API_KEY">API Key (Header customizado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {authType === "BEARER" && (
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Token de Acesso</Label>
                    <Input
                      type="password"
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      placeholder="Insera o token Bearer..."
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                )}

                {authType === "BASIC" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Username / Usuário</Label>
                      <Input
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        placeholder="api_user"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Senha / Password</Label>
                      <Input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {authType === "API_KEY" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Nome do Header</Label>
                      <Input
                        value={authKeyName}
                        onChange={(e) => setAuthKeyName(e.target.value)}
                        placeholder="X-API-Key"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Valor da Chave</Label>
                      <Input
                        type="password"
                        value={authKeyValue}
                        onChange={(e) => setAuthKeyValue(e.target.value)}
                        placeholder="Valor do segredo..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="headers" className="text-xs font-semibold">Headers Customizados (JSON)</Label>
                <Textarea
                  id="headers"
                  value={headersJson}
                  onChange={(e) => setHeadersJson(e.target.value)}
                  placeholder='{ "X-Custom-Client": "cubo-ai" }'
                  className="text-xs font-mono min-h-[60px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bodyTemplate" className="text-xs font-semibold">Template do Corpo / Body (JSON)</Label>
                <Textarea
                  id="bodyTemplate"
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  placeholder='{ "sku_code": "{{sku}}" }'
                  className="text-xs font-mono min-h-[60px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="parameterSchema" className="text-xs font-semibold">Parâmetros Esperados (JSON Schema)</Label>
                <Textarea
                  id="parameterSchema"
                  value={parameterSchemaJson}
                  onChange={(e) => setParameterSchemaJson(e.target.value)}
                  placeholder='{ "type": "object", "properties": { "sku": { "type": "string" } }, "required": ["sku"] }'
                  className="text-xs font-mono min-h-[80px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="responseFilter" className="text-xs font-semibold">Filtro de Resposta (Array de Campos)</Label>
                <Textarea
                  id="responseFilter"
                  value={responseFilterJson}
                  onChange={(e) => setResponseFilterJson(e.target.value)}
                  placeholder='["quantidade", "unidade", "deposito"]'
                  className="text-xs font-mono min-h-[80px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center border-t pt-4">
              <div className="flex items-center justify-between border border-muted/60 p-2.5 rounded-lg bg-muted/10 col-span-1">
                <Label htmlFor="permType" className="text-xs font-semibold">Escrita?</Label>
                <Switch
                  id="permType"
                  checked={permissionType === "WRITE"}
                  onCheckedChange={(checked) => setPermissionType(checked ? "WRITE" : "READ")}
                />
              </div>

              <div className="flex items-center justify-between border border-muted/60 p-2.5 rounded-lg bg-muted/10 col-span-1">
                <Label htmlFor="reqConf" className="text-xs font-semibold">Confirmar?</Label>
                <Switch
                  id="reqConf"
                  checked={requiresConfirmation}
                  onCheckedChange={setRequiresConfirmation}
                />
              </div>

              <div className="flex items-center justify-between border border-muted/60 p-2.5 rounded-lg bg-muted/10 col-span-1">
                <Label htmlFor="active" className="text-xs font-semibold">Ativo?</Label>
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="cursor-pointer">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="cursor-pointer">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Salvar Ação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
