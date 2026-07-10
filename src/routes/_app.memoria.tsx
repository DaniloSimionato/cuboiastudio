import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  Eye,
  History,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { contactMemoriesService } from "@/services/contactMemoriesService";
import type {
  ContactMemoryEvent,
  ContactMemoryItem,
  ContactMemoryProfile,
} from "@/services/contactMemoriesService";
import { currentCompanyService } from "@/services/currentCompanyService";
import type { ContactMemoryCategory, CurrentCompanyResponse } from "@/types";
import { ApiError } from "@/services/apiClient";
import { toast } from "sonner";

const CATEGORY_OPTIONS: Array<{ value: ContactMemoryCategory; label: string }> = [
  { value: "IDENTITY", label: "Identidade" },
  { value: "PREFERENCE", label: "Preferência" },
  { value: "BUSINESS_CONTEXT", label: "Contexto de Negócio" },
  { value: "RELATIONSHIP_SUMMARY", label: "Resumo de Relacionamento" },
  { value: "TEMPORARY_CONTEXT", label: "Contexto Temporário" },
];

const SOURCE_OPTIONS = [
  "CONTACT_MESSAGE",
  "HUMAN_AGENT",
  "AI_EXTRACTED",
  "WEBHOOK_TOOL",
  "GOOGLE_CALENDAR",
  "CHATWOOT",
  "MANUAL",
  "SYSTEM",
] as const;

type MemoryFormState = {
  profileId: string;
  category: ContactMemoryCategory;
  key: string;
  value: string;
  confidence: number;
  expiresAt: string;
  active: boolean;
};

const DEFAULT_FORM: MemoryFormState = {
  profileId: "",
  category: "IDENTITY",
  key: "",
  value: "",
  confidence: 1,
  expiresAt: "",
  active: true,
};

export const Route = createFileRoute("/_app/memoria")({
  head: () => ({ meta: [{ title: "Memória · Cubo AI Studio" }] }),
  component: MemoriaPage,
});

function MemoriaPage() {
  const [company, setCompany] = useState<CurrentCompanyResponse["company"] | null>(null);
  const [items, setItems] = useState<ContactMemoryItem[]>([]);
  const [profiles, setProfiles] = useState<Array<ContactMemoryProfile & { _count: { items: number } }>>([]);
  const [selectedItem, setSelectedItem] = useState<ContactMemoryItem | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<ContactMemoryEvent[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<(ContactMemoryProfile & { items: ContactMemoryItem[] }) | null>(null);
  const [search, setSearch] = useState("");
  const [channelType, setChannelType] = useState("all");
  const [category, setCategory] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [active, setActive] = useState("all");
  const [expired, setExpired] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContactMemoryItem | null>(null);
  const [form, setForm] = useState<MemoryFormState>(DEFAULT_FORM);

  const loadProfiles = useCallback(async () => {
    const response = await contactMemoriesService.listProfiles({
      channelType: channelType !== "all" ? channelType : undefined,
      search: search.trim() || undefined,
      limit: 100,
    });
    setProfiles(response.items);
  }, [channelType, search]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyResponse, itemsResponse] = await Promise.all([
        currentCompanyService.get(),
        contactMemoriesService.listItems({
          channelType: channelType !== "all" ? channelType : undefined,
          category: category !== "all" ? category : undefined,
          sourceType: sourceType !== "all" ? sourceType : undefined,
          active: active !== "all" ? active === "true" : undefined,
          expired: expired !== "all" ? expired === "true" : undefined,
          search: search.trim() || undefined,
          limit: 100,
        }),
      ]);

      setCompany(companyResponse.company);
      setItems(itemsResponse.items);
      await loadProfiles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar as memórias.");
    } finally {
      setLoading(false);
    }
  }, [active, category, channelType, expired, loadProfiles, search, sourceType]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const groupedProfileItems = useMemo(() => {
    if (!selectedProfile) return [];

    return CATEGORY_OPTIONS.map((option) => ({
      category: option.label,
      items: selectedProfile.items.filter((item) => item.category === option.value),
    })).filter((group) => group.items.length > 0);
  }, [selectedProfile]);

  function resetForm() {
    setEditingItem(null);
    setForm(DEFAULT_FORM);
  }

  function openCreateDialog() {
    resetForm();
    setForm((current) => ({
      ...current,
      profileId: profiles[0]?.id ?? "",
    }));
    setIsFormOpen(true);
  }

  function openEditDialog(item: ContactMemoryItem) {
    setEditingItem(item);
    setForm({
      profileId: item.profileId,
      category: item.category,
      key: item.key,
      value: item.value,
      confidence: item.confidence,
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : "",
      active: item.active,
    });
    setIsFormOpen(true);
  }

  async function openDetail(itemId: string) {
    setDetailLoading(true);
    setSelectedItem(null);
    setSelectedEvents([]);
    try {
      const [item, events] = await Promise.all([
        contactMemoriesService.getItem(itemId),
        contactMemoriesService.getEvents(itemId),
      ]);
      setSelectedItem(item);
      setSelectedEvents(events);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar o detalhe.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function openProfile(profileId: string) {
    setProfileLoading(true);
    try {
      const profile = await contactMemoriesService.getProfile(profileId);
      setSelectedProfile(profile);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar o perfil.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleSave() {
    if (!form.profileId || !form.key.trim() || !form.value.trim()) {
      toast.error("Preencha perfil, chave e valor.");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await contactMemoriesService.updateItem(editingItem.id, {
          category: form.category,
          key: form.key.trim(),
          value: form.value.trim(),
          confidence: form.confidence,
          expiresAt: form.expiresAt || null,
          active: form.active,
        });
        toast.success("Memória atualizada.");
      } else {
        await contactMemoriesService.createItem({
          profileId: form.profileId,
          category: form.category,
          key: form.key.trim(),
          value: form.value.trim(),
          confidence: form.confidence,
          expiresAt: form.expiresAt || null,
        });
        toast.success("Memória criada.");
      }

      setIsFormOpen(false);
      resetForm();
      await loadItems();
      if (selectedProfile?.id === form.profileId) {
        await openProfile(form.profileId);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar a memória.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: ContactMemoryItem) {
    try {
      await contactMemoriesService.updateItem(item.id, {
        active: !item.active,
      });
      toast.success(item.active ? "Memória desativada." : "Memória reativada.");
      await loadItems();
      if (selectedProfile?.id === item.profileId) {
        await openProfile(item.profileId);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível alterar o status.");
    }
  }

  async function handleDelete(item: ContactMemoryItem) {
    try {
      await contactMemoriesService.deleteItem(item.id);
      toast.success("Memória marcada como apagada.");
      await loadItems();
      if (selectedProfile?.id === item.profileId) {
        await openProfile(item.profileId);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível apagar a memória.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Memória"
        description="Memórias reais por contato, com histórico, origem e controle manual por tenant."
      />

      <Alert className="mb-4 border-amber-200 bg-amber-50">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Proteção de dados sensíveis</AlertTitle>
        <AlertDescription className="text-amber-800">
          O backend bloqueia senhas, tokens, cartões, OTP, documentos completos e texto com
          tentativa de prompt injection. Use a memória apenas para fatos úteis e legítimos.
        </AlertDescription>
      </Alert>

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 md:grid-cols-6">
          <div className="space-y-1">
            <Label>Empresa</Label>
            <div className="h-10 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              {company?.name ?? "Tenant atual"}
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Contato</Label>
            <Input
              placeholder="Nome, telefone, resumo ou chave"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Canal</Label>
            <Select value={channelType} onValueChange={setChannelType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                <SelectItem value="WEBCHAT">Webchat</SelectItem>
                <SelectItem value="UNKNOWN">Desconhecido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Origem</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatSource(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Ativo</Label>
            <Select value={active} onValueChange={setActive}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Expiração</Label>
            <Select value={expired} onValueChange={setExpired}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="false">Não expiradas</SelectItem>
                <SelectItem value="true">Expiradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2 md:col-span-2">
            <Button variant="outline" onClick={() => void loadItems()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button onClick={openCreateDialog} disabled={profiles.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Nova memória
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Memórias salvas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Informação</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-10 text-center text-muted-foreground">
                    Carregando memórias...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-12 text-center text-muted-foreground">
                    <Brain className="mx-auto mb-2 h-8 w-8 animate-pulse opacity-50 text-primary" />
                    <p className="text-sm font-semibold">Nenhuma memória encontrada</p>
                    <p className="text-xs">
                      Quando a memória estiver habilitada, os fatos úteis do contato aparecem aqui.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="font-medium text-left hover:text-primary"
                        onClick={() => void openProfile(item.profileId)}
                      >
                        {item.profile?.displayName ?? "Contato sem nome"}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.profile?.phoneNormalized ?? "—"}
                    </TableCell>
                    <TableCell>{company?.name ?? "Tenant atual"}</TableCell>
                    <TableCell>{formatChannel(item.profile?.channelType ?? "UNKNOWN")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatCategory(item.category)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate">
                      <span className="font-medium">{item.key}:</span> {item.value}
                    </TableCell>
                    <TableCell>{item.confidence.toFixed(2)}</TableCell>
                    <TableCell>{formatSource(item.sourceType)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(item.updatedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.expiresAt ? formatDate(item.expiresAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge item={item} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => void openDetail(item.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleToggleActive(item)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600"
                          onClick={() => void handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar memória" : "Nova memória"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Perfil do contato</Label>
              <Select
                value={form.profileId}
                onValueChange={(value) => setForm((current) => ({ ...current, profileId: value }))}
                disabled={Boolean(editingItem)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {(profile.displayName ?? "Contato sem nome") +
                        (profile.phoneNormalized ? ` • ${profile.phoneNormalized}` : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(value: ContactMemoryCategory) =>
                  setForm((current) => ({ ...current, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Confiança</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={form.confidence}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confidence: Number(event.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Chave</Label>
              <Input
                value={form.key}
                onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                placeholder="name, company, role, responsibility..."
              />
            </div>

            <div className="space-y-1">
              <Label>Expira em</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, expiresAt: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Valor</Label>
              <Input
                value={form.value}
                onChange={(event) =>
                  setForm((current) => ({ ...current, value: event.target.value }))
                }
              />
            </div>

            {editingItem ? (
              <label className="flex items-center gap-3 md:col-span-2">
                <Checkbox
                  checked={form.active}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, active: Boolean(checked) }))
                  }
                />
                <span className="text-sm">Memória ativa</span>
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Salvando..." : editingItem ? "Salvar alterações" : "Criar memória"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe da memória</DialogTitle>
          </DialogHeader>
          {detailLoading || !selectedItem ? (
            <div className="py-8 text-sm text-muted-foreground">Carregando detalhe...</div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <Detail label="Contato" value={selectedItem.profile?.displayName ?? "—"} />
                <Detail label="Telefone" value={selectedItem.profile?.phoneNormalized ?? "—"} />
                <Detail label="Categoria" value={formatCategory(selectedItem.category)} />
                <Detail label="Chave" value={selectedItem.key} />
                <Detail label="Valor atual" value={selectedItem.value} />
                <Detail label="Confiança" value={selectedItem.confidence.toFixed(2)} />
                <Detail label="Origem" value={formatSource(selectedItem.sourceType)} />
                <Detail label="Canal" value={formatChannel(selectedItem.profile?.channelType ?? "UNKNOWN")} />
                <Detail label="Criado em" value={formatDate(selectedItem.createdAt)} />
                <Detail label="Atualizado em" value={formatDate(selectedItem.updatedAt)} />
                <Detail label="Última confirmação" value={formatDate(selectedItem.lastSeenAt)} />
                <Detail label="Expiração" value={selectedItem.expiresAt ? formatDate(selectedItem.expiresAt) : "—"} />
                <Detail label="Conversa de origem" value={selectedItem.sourceConversationId ?? "—"} />
                <Detail label="Mensagem de origem" value={selectedItem.sourceMessageId ?? "—"} />
                <Detail label="Status" value={renderStatusText(selectedItem)} />
              </div>

              <div className="space-y-3">
                <div className="font-semibold">Histórico de alterações</div>
                {selectedEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhum evento registrado.</div>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{event.eventType}</Badge>
                          <Badge variant="secondary">{formatSource(event.sourceType)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(event.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm">
                          <div>
                            <span className="font-medium">Anterior:</span>{" "}
                            {event.previousValue ?? "—"}
                          </div>
                          <div>
                            <span className="font-medium">Novo:</span> {event.newValue ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Conversa: {event.sourceConversationId ?? "—"} • Mensagem:{" "}
                            {event.sourceMessageId ?? "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedProfile)} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Perfil de memória do contato</SheetTitle>
            <SheetDescription>
              Visualização agrupada por categoria, com resumo curto, origem e datas.
            </SheetDescription>
          </SheetHeader>

          {profileLoading || !selectedProfile ? (
            <div className="py-8 text-sm text-muted-foreground">Carregando perfil...</div>
          ) : (
            <div className="mt-6 space-y-6">
              <Card>
                <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                  <Detail label="Contato" value={selectedProfile.displayName ?? "—"} />
                  <Detail label="Telefone" value={selectedProfile.phoneNormalized ?? "—"} />
                  <Detail label="Canal" value={formatChannel(selectedProfile.channelType)} />
                  <Detail label="Contato externo" value={selectedProfile.externalContactId ?? "—"} />
                  <Detail label="Inbox externo" value={selectedProfile.externalInboxId ?? "—"} />
                  <Detail label="Conta externa" value={selectedProfile.externalAccountId ?? "—"} />
                  <Detail label="Resumo" value={selectedProfile.summary ?? "Ainda não gerado"} />
                  <Detail label="Última interação" value={formatDate(selectedProfile.lastInteractionAt ?? selectedProfile.updatedAt)} />
                </CardContent>
              </Card>

              {groupedProfileItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">Este perfil ainda não possui memórias.</div>
              ) : (
                groupedProfileItems.map((group) => (
                  <Card key={group.category}>
                    <CardHeader>
                      <CardTitle className="text-base">{group.category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.items.map((item) => (
                        <div key={item.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium">
                                {item.key}: {item.value}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatSource(item.sourceType)} • confiança {item.confidence.toFixed(2)}
                              </div>
                            </div>
                            <StatusBadge item={item} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatusBadge({ item }: { item: ContactMemoryItem }) {
  if (item.deletedAt) {
    return <Badge variant="destructive">Apagada</Badge>;
  }
  if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) {
    return <Badge variant="secondary">Expirada</Badge>;
  }
  if (!item.active) {
    return <Badge variant="outline">Inativa</Badge>;
  }
  return <Badge>Ativa</Badge>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function formatCategory(value: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function formatSource(value: string) {
  return {
    CONTACT_MESSAGE: "Mensagem do contato",
    HUMAN_AGENT: "Atendente humano",
    AI_EXTRACTED: "IA",
    WEBHOOK_TOOL: "Webhook/Ferramenta",
    GOOGLE_CALENDAR: "Google Agenda",
    CHATWOOT: "Chatwoot",
    MANUAL: "Manual",
    SYSTEM: "Sistema",
  }[value] ?? value;
}

function formatChannel(value: string) {
  return {
    WHATSAPP: "WhatsApp",
    INSTAGRAM: "Instagram",
    WEBCHAT: "Webchat",
    UNKNOWN: "Desconhecido",
  }[value] ?? value;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function renderStatusText(item: ContactMemoryItem) {
  if (item.deletedAt) return "Apagada";
  if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) return "Expirada";
  if (!item.active) return "Inativa";
  return "Ativa";
}
