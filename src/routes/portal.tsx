import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { accessCompany } from "@/lib/portalAccess";
import { companiesService, studioUsersService } from "@/services";
import type {
  BackendStatus,
  CreateCompanyPayload,
  CurrentCompany,
  SaveStudioUserPayload,
  StudioCompanyRole,
  StudioGlobalRole,
  StudioUser,
  UpdateCompanyPayload,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [{ title: "Portal do Studio · Cubo AI Studio" }] }),
  component: PortalPage,
});

type CompanyForm = {
  name: string;
  legalName: string;
  document: string;
  status: BackendStatus;
  createDemoAssistant: boolean;
};

type UserForm = {
  name: string;
  email: string;
  temporaryPassword: string;
  status: BackendStatus;
  globalRole: StudioGlobalRole;
  memberships: Record<string, StudioCompanyRole>;
};

const EMPTY_COMPANY: CompanyForm = {
  name: "",
  legalName: "",
  document: "",
  status: "ACTIVE",
  createDemoAssistant: false,
};

const EMPTY_USER: UserForm = {
  name: "",
  email: "",
  temporaryPassword: "",
  status: "ACTIVE",
  globalRole: "STUDIO_VIEWER",
  memberships: {},
};

function PortalPage() {
  const { isAuthenticated, loading, user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CurrentCompany[]>([]);
  const [studioUsers, setStudioUsers] = useState<StudioUser[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [enteringCompanyId, setEnteringCompanyId] = useState<string | null>(null);
  const [companySheetOpen, setCompanySheetOpen] = useState(false);
  const [userSheetOpen, setUserSheetOpen] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CurrentCompany | null>(null);
  const [editingUser, setEditingUser] = useState<StudioUser | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(EMPTY_COMPANY);
  const [userForm, setUserForm] = useState<UserForm>(EMPTY_USER);

  const canManageCompanies = Boolean(user?.permissions?.includes("companies:manage"));
  const canManageUsers = Boolean(user?.permissions?.includes("users:manage"));
  const activeCompany = companies.find((company) => company.isActiveContext);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      void navigate({ to: "/auth", replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const loadCompanies = async () => {
    setPageLoading(true);
    try {
      setCompanies(await companiesService.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar as empresas.");
    } finally {
      setPageLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!canManageUsers) return;
    setUsersLoading(true);
    try {
      setStudioUsers(await studioUsersService.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os usuários.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void loadCompanies();
      void loadUsers();
    }
  }, [isAuthenticated, canManageUsers]);

  const openCompany = (company?: CurrentCompany) => {
    setEditingCompany(company ?? null);
    setCompanyForm(
      company
        ? {
            name: company.name,
            legalName: company.legalName ?? "",
            document: company.document ?? "",
            status: company.status,
            createDemoAssistant: false,
          }
        : EMPTY_COMPANY,
    );
    setCompanySheetOpen(true);
  };

  const saveCompany = async () => {
    if (!companyForm.name.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }

    setSavingCompany(true);
    try {
      const payload: CreateCompanyPayload & UpdateCompanyPayload = {
        name: companyForm.name.trim(),
        legalName: companyForm.legalName.trim() || undefined,
        document: companyForm.document.trim() || undefined,
        status: companyForm.status,
        ...(!editingCompany
          ? { createDemoAssistant: companyForm.createDemoAssistant }
          : {}),
      };
      if (editingCompany) {
        await companiesService.update(editingCompany.id, payload);
        toast.success("Empresa atualizada.");
      } else {
        await companiesService.create(payload);
        toast.success("Empresa criada. Use “Acessar” quando quiser entrar no tenant.");
      }
      setCompanySheetOpen(false);
      await loadCompanies();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a empresa.");
    } finally {
      setSavingCompany(false);
    }
  };

  const enterCompany = async (company: CurrentCompany) => {
    if (enteringCompanyId) return;
    try {
      await accessCompany({
        companyId: company.id,
        activeCompanyId: user?.activeCompanyId ?? null,
        setActive: companiesService.setActive,
        refreshUser,
        navigate: () => navigate({ to: "/dashboard" }),
        setLoadingCompanyId: setEnteringCompanyId,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível acessar a empresa.");
    }
  };

  const openUser = (studioUser?: StudioUser) => {
    setEditingUser(studioUser ?? null);
    setUserForm(
      studioUser
        ? {
            name: studioUser.name,
            email: studioUser.email,
            temporaryPassword: "",
            status: studioUser.status,
            globalRole: studioUser.globalRole,
            memberships: Object.fromEntries(
              studioUser.memberships.map((membership) => [
                membership.companyId,
                membership.role,
              ]),
            ),
          }
        : EMPTY_USER,
    );
    setUserSheetOpen(true);
  };

  const saveUser = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast.error("Informe nome e e-mail.");
      return;
    }
    if (!editingUser && userForm.temporaryPassword.length < 8) {
      toast.error("A senha temporária deve ter pelo menos 8 caracteres.");
      return;
    }

    setSavingUser(true);
    try {
      const payload: SaveStudioUserPayload = {
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        status: userForm.status,
        globalRole: userForm.globalRole,
        memberships: Object.entries(userForm.memberships).map(([companyId, role]) => ({
          companyId,
          role,
        })),
        ...(userForm.temporaryPassword
          ? { temporaryPassword: userForm.temporaryPassword }
          : {}),
      };
      if (editingUser) {
        await studioUsersService.update(editingUser.id, payload);
        toast.success("Usuário atualizado.");
      } else {
        await studioUsersService.create({
          ...payload,
          temporaryPassword: userForm.temporaryPassword,
        });
        toast.success("Usuário criado e pronto para acessar o Studio.");
      }
      setUserSheetOpen(false);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o usuário.");
    } finally {
      setSavingUser(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="studio-portal-surface grid min-h-screen place-items-center bg-[#f7f9fc]">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Carregando Portal do Studio
        </div>
      </div>
    );
  }

  const activeUsers = studioUsers.filter((studioUser) => studioUser.status === "ACTIVE").length;

  return (
    <main className="studio-portal-surface min-h-screen bg-[#f7f9fc] text-slate-950">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_18%_0%,rgba(37,99,235,0.09),transparent_38%),radial-gradient(circle_at_78%_0%,rgba(14,165,233,0.06),transparent_34%)]" />

      <header className="relative border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-slate-950">
                Cubo AI Studio
              </div>
              <div className="text-[11px] font-medium text-slate-400">Portal global</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3 sm:flex">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-700">
                <UserRound className="h-3.5 w-3.5" />
              </div>
              <div className="max-w-40 truncate text-xs font-medium text-slate-700">
                {user?.nome}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={logout}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <section className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administração do Studio
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-[28px]">
              Portal do Studio
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Gerencie empresas, usuários e acessos do Cubo AI Studio.
            </p>
          </div>
          {canManageCompanies && (
            <Button
              onClick={() => openCompany()}
              className="h-10 rounded-xl bg-blue-600 px-4 text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)] hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Nova empresa
            </Button>
          )}
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <Metric
            icon={Building2}
            label="Empresas cadastradas"
            value={String(companies.length)}
            detail={companies.length === 1 ? "tenant disponível" : "tenants disponíveis"}
            tone="blue"
          />
          <Metric
            icon={Users}
            label="Usuários ativos"
            value={canManageUsers ? String(activeUsers) : "—"}
            detail={canManageUsers ? `${studioUsers.length} no total` : "acesso restrito"}
            tone="cyan"
          />
          <Metric
            icon={CheckCircle2}
            label="Empresa ativa"
            value={activeCompany?.name ?? "Nenhuma"}
            detail={activeCompany ? "contexto operacional atual" : "selecione uma empresa"}
            tone="emerald"
          />
        </section>

        <Tabs defaultValue="companies">
          <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-slate-950 shadow-[0_12px_36px_rgba(15,23,42,0.055)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <TabsList className="h-9 justify-start rounded-lg bg-slate-100 p-1 text-slate-500">
                <TabsTrigger
                  value="companies"
                  className="h-7 rounded-md px-3.5 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  Empresas
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="h-7 rounded-md px-3.5 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Usuários do Studio
                </TabsTrigger>
              </TabsList>
              <div className="text-xs text-slate-400">
                Atualizado automaticamente
              </div>
            </div>

            <TabsContent value="companies" className="m-0">
              <CardContent className="p-0">
                {pageLoading ? (
                  <LoadingRow />
                ) : companies.length === 0 ? (
                  <EmptyState
                    title="Nenhuma empresa disponível"
                    detail="Seu usuário ainda não possui vínculo com uma empresa."
                  />
                ) : (
                  <>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader className="bg-[#fafbfc]">
                          <TableRow className="border-slate-100 hover:bg-transparent">
                            <TableHead className="h-10 pl-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Empresa</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">CNPJ</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Criada em</TableHead>
                            <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companies.map((company) => (
                            <CompanyRow
                              key={company.id}
                              company={company}
                              canManage={canManageCompanies}
                              loading={enteringCompanyId === company.id}
                              actionsDisabled={enteringCompanyId !== null}
                              onEdit={() => openCompany(company)}
                              onEnter={() => void enterCompany(company)}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="divide-y divide-slate-100 md:hidden">
                      {companies.map((company) => (
                        <CompanyMobileCard
                          key={company.id}
                          company={company}
                          canManage={canManageCompanies}
                          loading={enteringCompanyId === company.id}
                          actionsDisabled={enteringCompanyId !== null}
                          onEdit={() => openCompany(company)}
                          onEnter={() => void enterCompany(company)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="users" className="m-0">
              <CardContent className="p-0">
                {!canManageUsers ? (
                  <EmptyState title="Acesso restrito" detail="Somente administradores do Studio gerenciam usuários." />
                ) : usersLoading ? (
                  <LoadingRow />
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Usuários cadastrados</div>
                        <div className="mt-0.5 text-xs text-slate-400">Acessos globais e vínculos por empresa</div>
                      </div>
                      <Button size="sm" className="rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={() => openUser()}>
                        <Plus className="h-3.5 w-3.5" />
                        Novo usuário
                      </Button>
                    </div>
                    {studioUsers.length === 0 ? (
                      <EmptyState title="Nenhum usuário cadastrado" detail="Crie o primeiro acesso administrativo." />
                    ) : (
                      <>
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader className="bg-[#fafbfc]">
                              <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="h-10 pl-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Nome</TableHead>
                                <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">E-mail</TableHead>
                                <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</TableHead>
                                <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Papel global</TableHead>
                                <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Empresas</TableHead>
                                <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {studioUsers.map((studioUser) => (
                                <UserRow
                                  key={studioUser.id}
                                  studioUser={studioUser}
                                  onEdit={() => openUser(studioUser)}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="divide-y divide-slate-100 md:hidden">
                          {studioUsers.map((studioUser) => (
                            <UserMobileCard
                              key={studioUser.id}
                              studioUser={studioUser}
                              onEdit={() => openUser(studioUser)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </TabsContent>
          </Card>
        </Tabs>
      </div>

      <CompanySheet
        open={companySheetOpen}
        onOpenChange={setCompanySheetOpen}
        editing={Boolean(editingCompany)}
        form={companyForm}
        setForm={setCompanyForm}
        saving={savingCompany}
        onSave={() => void saveCompany()}
      />
      <UserSheet
        open={userSheetOpen}
        onOpenChange={setUserSheetOpen}
        editing={Boolean(editingUser)}
        form={userForm}
        setForm={setUserForm}
        companies={companies}
        saving={savingUser}
        onSave={() => void saveUser()}
      />
    </main>
  );
}

function CompanySheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  form: CompanyForm;
  setForm: React.Dispatch<React.SetStateAction<CompanyForm>>;
  saving: boolean;
  onSave: () => void;
}) {
  const { form, setForm } = props;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="studio-portal-dialog overflow-hidden rounded-2xl border-slate-200 bg-white p-0 text-slate-950 shadow-2xl sm:max-w-[560px]">
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-white px-6 py-5 text-left">
          <div className="mb-1 grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Building2 className="h-4 w-4" />
          </div>
          <DialogTitle className="text-lg font-semibold tracking-tight text-slate-950">
            {props.editing ? "Editar empresa" : "Nova empresa"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {props.editing
              ? "Atualize os dados cadastrais deste tenant."
              : "Cadastre um novo tenant vazio no Cubo AI Studio."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nome fantasia">
              <Input
                className="portal-input"
                value={form.name}
                placeholder="Ex.: Drimo"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Razão social">
            <Input
              className="portal-input"
              value={form.legalName}
              placeholder="Ex.: Drimo Tecnologia LTDA"
              onChange={(event) =>
                setForm((current) => ({ ...current, legalName: event.target.value }))
              }
            />
          </Field>
          <Field label="CNPJ (opcional)">
            <Input
              className="portal-input"
              value={form.document}
              placeholder="00.000.000/0001-00"
              onChange={(event) =>
                setForm((current) => ({ ...current, document: event.target.value }))
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(status: BackendStatus) =>
                  setForm((current) => ({ ...current, status }))
                }
              >
                <SelectTrigger className="portal-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="ACTIVE">Ativa</SelectItem>
                  <SelectItem value="INACTIVE">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {!props.editing && (
            <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div>
                <div className="text-sm font-medium text-slate-800">
                  Assistente de demonstração
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Opcional. A empresa nasce vazia quando desativado.
                </div>
              </div>
              <Switch
                checked={form.createDemoAssistant}
                onCheckedChange={(createDemoAssistant) =>
                  setForm((current) => ({ ...current, createDemoAssistant }))
                }
              />
            </div>
          )}
          <p className="sm:col-span-2 text-[11px] leading-relaxed text-slate-400">
            Os exemplos são apenas placeholders. Nenhum valor é enviado se o campo estiver vazio.
          </p>
        </div>

        <DialogFooter className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <Button
            variant="outline"
            className="rounded-lg border-slate-200 bg-white text-slate-700"
            onClick={() => props.onOpenChange(false)}
            disabled={props.saving}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700"
            onClick={props.onSave}
            disabled={props.saving}
          >
            {props.saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {props.editing ? "Salvar alterações" : "Criar empresa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  form: UserForm;
  setForm: React.Dispatch<React.SetStateAction<UserForm>>;
  companies: CurrentCompany[];
  saving: boolean;
  onSave: () => void;
}) {
  const { form, setForm } = props;
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="studio-portal-dialog overflow-y-auto border-slate-200 bg-white text-slate-950 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-100 pb-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Users className="h-4 w-4" />
          </div>
          <SheetTitle className="text-slate-950">
            {props.editing ? "Editar usuário" : "Novo usuário"}
          </SheetTitle>
          <SheetDescription className="text-slate-500">
            Defina a identidade, o papel global e as empresas acessíveis.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Nome"><Input className="portal-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="E-mail"><Input className="portal-input" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
          <Field label={props.editing ? "Nova senha (opcional)" : "Senha temporária"}>
            <Input className="portal-input" type="password" value={form.temporaryPassword} placeholder="Mínimo de 8 caracteres" onChange={(event) => setForm((current) => ({ ...current, temporaryPassword: event.target.value }))} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(status: BackendStatus) => setForm((current) => ({ ...current, status }))}>
              <SelectTrigger className="portal-input"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white text-slate-900"><SelectItem value="ACTIVE">Ativo</SelectItem><SelectItem value="INACTIVE">Inativo</SelectItem></SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Papel global">
              <Select value={form.globalRole} onValueChange={(globalRole: StudioGlobalRole) => setForm((current) => ({ ...current, globalRole }))}>
                <SelectTrigger className="portal-input"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="STUDIO_ADMIN">Administrador</SelectItem>
                  <SelectItem value="STUDIO_OPERATOR">Operador</SelectItem>
                  <SelectItem value="STUDIO_VIEWER">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <div className="mt-6">
          <Label>Acesso às empresas</Label>
          <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {props.companies.map((company) => {
              const selectedRole = form.memberships[company.id];
              return (
                <div key={company.id} className="flex items-center gap-3 p-3">
                  <Switch
                    checked={Boolean(selectedRole)}
                    onCheckedChange={(checked) =>
                      setForm((current) => {
                        const memberships = { ...current.memberships };
                        if (checked) memberships[company.id] = "VIEWER";
                        else delete memberships[company.id];
                        return { ...current, memberships };
                      })
                    }
                  />
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">{company.name}</div>
                  {selectedRole && (
                    <Select
                      value={selectedRole}
                      onValueChange={(role: StudioCompanyRole) =>
                        setForm((current) => ({
                          ...current,
                          memberships: { ...current.memberships, [company.id]: role },
                        }))
                      }
                    >
                      <SelectTrigger className="portal-input w-32"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white text-slate-900">
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MEMBER">Membro</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" className="rounded-lg border-slate-200 bg-white text-slate-700" onClick={() => props.onOpenChange(false)} disabled={props.saving}>Cancelar</Button>
          <Button className="rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={props.onSave} disabled={props.saving}>
            {props.saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {props.editing ? "Salvar usuário" : "Criar usuário"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CompanyRow({
  company,
  canManage,
  loading,
  actionsDisabled,
  onEdit,
  onEnter,
}: {
  company: CurrentCompany;
  canManage: boolean;
  loading: boolean;
  actionsDisabled: boolean;
  onEdit: () => void;
  onEnter: () => void;
}) {
  return (
    <TableRow className="h-[68px] border-slate-100 bg-white hover:bg-blue-50/25">
      <TableCell className="pl-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700">
            {companyInitials(company.name)}
          </div>
          <div className="min-w-0">
            <div className="max-w-64 truncate text-sm font-semibold text-slate-900">
              {company.name}
            </div>
            <div className="max-w-64 truncate text-xs text-slate-400">
              {company.legalName || "Razão social não informada"}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-slate-500">
        {company.document || "Não informado"}
      </TableCell>
      <TableCell>
        <Status status={company.status} active={company.isActiveContext} />
      </TableCell>
      <TableCell className="text-sm text-slate-500">{formatDate(company.createdAt)}</TableCell>
      <TableCell className="pr-5">
        <div className="flex justify-end gap-1.5">
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          )}
          <Button
            size="sm"
            className="min-w-24 rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700"
            onClick={onEnter}
            disabled={actionsDisabled}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Entrando
              </>
            ) : (
              <>
                Acessar
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CompanyMobileCard(props: Parameters<typeof CompanyRow>[0]) {
  const { company } = props;
  return (
    <article className="bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700">
          {companyInitials(company.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{company.name}</div>
          <div className="mt-0.5 truncate text-xs text-slate-400">
            {company.document || "CNPJ não informado"}
          </div>
        </div>
        <Status status={company.status} active={company.isActiveContext} />
      </div>
      <div className="mt-4 flex gap-2">
        {props.canManage && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 rounded-lg border-slate-200 bg-white text-slate-600"
            onClick={props.onEdit}
          >
            Editar
          </Button>
        )}
        <Button
          size="sm"
          className="flex-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          onClick={props.onEnter}
          disabled={props.actionsDisabled}
        >
          {props.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Acessar empresa"}
        </Button>
      </div>
    </article>
  );
}

function UserRow({
  studioUser,
  onEdit,
}: {
  studioUser: StudioUser;
  onEdit: () => void;
}) {
  return (
    <TableRow className="h-[68px] border-slate-100 bg-white hover:bg-blue-50/25">
      <TableCell className="pl-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {companyInitials(studioUser.name)}
          </div>
          <div className="text-sm font-semibold text-slate-800">{studioUser.name}</div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-slate-500">{studioUser.email}</TableCell>
      <TableCell><Status status={studioUser.status} /></TableCell>
      <TableCell>
        <Badge className="border border-blue-100 bg-blue-50 font-medium text-blue-700 shadow-none hover:bg-blue-50">
          {roleLabel(studioUser.globalRole)}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-slate-500">
        {studioUser.memberships.length === 1
          ? "1 empresa"
          : `${studioUser.memberships.length} empresas`}
      </TableCell>
      <TableCell className="pr-5 text-right">
        <Button
          size="sm"
          variant="ghost"
          className="rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </TableCell>
    </TableRow>
  );
}

function UserMobileCard({ studioUser, onEdit }: { studioUser: StudioUser; onEdit: () => void }) {
  return (
    <article className="bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {companyInitials(studioUser.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{studioUser.name}</div>
          <div className="truncate text-xs text-slate-400">{studioUser.email}</div>
        </div>
        <Status status={studioUser.status} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Badge className="border border-blue-100 bg-blue-50 font-medium text-blue-700 shadow-none">
          {roleLabel(studioUser.globalRole)}
        </Badge>
        <Button size="sm" variant="ghost" className="rounded-lg text-slate-500" onClick={onEdit}>
          Editar
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "cyan" | "emerald";
}) {
  const toneClasses = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="flex min-h-[82px] items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${toneClasses[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-slate-400">{label}</div>
        <div className="truncate text-base font-semibold tracking-tight text-slate-900">{value}</div>
        <div className="truncate text-[11px] text-slate-400">{detail}</div>
      </div>
    </div>
  );
}

function Status({ status, active }: { status: BackendStatus; active?: boolean }) {
  if (active) {
    return (
      <Badge className="border border-blue-100 bg-blue-50 font-medium text-blue-700 shadow-none hover:bg-blue-50">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
        Ativa agora
      </Badge>
    );
  }
  const isActive = status === "ACTIVE";
  return (
    <Badge
      className={
        isActive
          ? "border border-emerald-100 bg-emerald-50 font-medium text-emerald-700 shadow-none hover:bg-emerald-50"
          : "border border-slate-200 bg-slate-100 font-medium text-slate-500 shadow-none hover:bg-slate-100"
      }
    >
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
      {isActive ? "Ativa" : "Inativa"}
    </Badge>
  );
}

function LoadingRow() {
  return (
    <div className="grid h-44 place-items-center bg-white text-slate-400">
      <div className="flex items-center gap-2 text-xs font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        Carregando dados
      </div>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="px-6 py-14 text-center"><div className="text-sm font-medium text-slate-800">{title}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-700">{label}</Label>{children}</div>;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function roleLabel(role: StudioGlobalRole) {
  return role === "STUDIO_ADMIN" ? "Administrador" : role === "STUDIO_OPERATOR" ? "Operador" : "Visualizador";
}

function companyInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
