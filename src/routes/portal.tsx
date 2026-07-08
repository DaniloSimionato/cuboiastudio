import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
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
  const { isAuthenticated, loading, user, refreshUser } = useAuth();
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
        legalName: companyForm.legalName.trim() || null,
        document: companyForm.document.trim() || null,
        status: companyForm.status,
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
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <main className="min-h-screen bg-slate-50/70">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              <ShieldCheck className="h-4 w-4" />
              Administração global
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Portal do Studio</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie empresas, usuários e acessos do Cubo AI Studio.
            </p>
          </div>
          {canManageCompanies && (
            <Button onClick={() => openCompany()} className="shadow-sm">
              <Plus className="h-4 w-4" />
              Nova empresa
            </Button>
          )}
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <Metric icon={Building2} label="Empresas" value={String(companies.length)} />
          <Metric icon={Users} label="Usuários" value={canManageUsers ? String(studioUsers.length) : "Restrito"} />
          <Metric icon={ShieldCheck} label="Empresa ativa" value={activeCompany?.name ?? "Nenhuma"} />
        </section>

        <Tabs defaultValue="companies">
          <TabsList className="mb-4 h-9 bg-slate-200/70 p-1">
            <TabsTrigger value="companies" className="h-7 px-4 text-xs">Empresas</TabsTrigger>
            <TabsTrigger value="users" className="h-7 px-4 text-xs">Usuários do Studio</TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardContent className="p-0">
                {pageLoading ? (
                  <LoadingRow />
                ) : companies.length === 0 ? (
                  <EmptyState
                    title="Nenhuma empresa disponível"
                    detail="Seu usuário ainda não possui vínculo com uma empresa."
                  />
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="pl-5">Empresa</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead className="pr-5 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <TableRow key={company.id} className="h-16">
                          <TableCell className="pl-5">
                            <div className="font-medium text-slate-900">{company.name}</div>
                            <div className="max-w-64 truncate text-xs text-slate-500">
                              {company.legalName || "Razão social não informada"}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">{company.document || "Não informado"}</TableCell>
                          <TableCell><Status status={company.status} active={company.isActiveContext} /></TableCell>
                          <TableCell className="text-slate-600">{formatDate(company.createdAt)}</TableCell>
                          <TableCell className="pr-5">
                            <div className="flex justify-end gap-2">
                              {canManageCompanies && (
                                <Button size="sm" variant="ghost" onClick={() => openCompany(company)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => void enterCompany(company)}
                                disabled={enteringCompanyId !== null}
                              >
                                {enteringCompanyId === company.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ArrowRight className="h-3.5 w-3.5" />
                                )}
                                Acessar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardContent className="p-0">
                {!canManageUsers ? (
                  <EmptyState title="Acesso restrito" detail="Somente administradores do Studio gerenciam usuários." />
                ) : usersLoading ? (
                  <LoadingRow />
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b px-5 py-3">
                      <div className="text-sm font-medium">Usuários cadastrados</div>
                      <Button size="sm" onClick={() => openUser()}>
                        <Plus className="h-3.5 w-3.5" />
                        Novo usuário
                      </Button>
                    </div>
                    {studioUsers.length === 0 ? (
                      <EmptyState title="Nenhum usuário cadastrado" detail="Crie o primeiro acesso administrativo." />
                    ) : (
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="pl-5">Usuário</TableHead>
                            <TableHead>Papel global</TableHead>
                            <TableHead>Empresas</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="pr-5 text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studioUsers.map((studioUser) => (
                            <TableRow key={studioUser.id} className="h-16">
                              <TableCell className="pl-5">
                                <div className="font-medium">{studioUser.name}</div>
                                <div className="text-xs text-slate-500">{studioUser.email}</div>
                              </TableCell>
                              <TableCell><Badge variant="secondary">{roleLabel(studioUser.globalRole)}</Badge></TableCell>
                              <TableCell className="text-slate-600">{studioUser.memberships.length}</TableCell>
                              <TableCell><Status status={studioUser.status} /></TableCell>
                              <TableCell className="pr-5 text-right">
                                <Button size="sm" variant="ghost" onClick={() => openUser(studioUser)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
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
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{props.editing ? "Editar empresa" : "Nova empresa"}</SheetTitle>
          <SheetDescription>Os exemplos abaixo são apenas placeholders e nunca são enviados.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Field label="Nome fantasia"><Input value={form.name} placeholder="Drimo" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Razão social"><Input value={form.legalName} placeholder="Drimo Tecnologia LTDA" onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))} /></Field>
          <Field label="CNPJ (opcional)"><Input value={form.document} placeholder="00.000.000/0001-00" onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))} /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(status: BackendStatus) => setForm((current) => ({ ...current, status }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ACTIVE">Ativa</SelectItem><SelectItem value="INACTIVE">Inativa</SelectItem></SelectContent>
            </Select>
          </Field>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={props.saving}>Cancelar</Button>
          <Button onClick={props.onSave} disabled={props.saving}>
            {props.saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {props.editing ? "Salvar" : "Criar empresa"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{props.editing ? "Editar usuário" : "Novo usuário"}</SheetTitle>
          <SheetDescription>Defina a identidade, o papel global e as empresas acessíveis.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Nome"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
          <Field label={props.editing ? "Nova senha (opcional)" : "Senha temporária"}>
            <Input type="password" value={form.temporaryPassword} placeholder="Mínimo de 8 caracteres" onChange={(event) => setForm((current) => ({ ...current, temporaryPassword: event.target.value }))} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(status: BackendStatus) => setForm((current) => ({ ...current, status }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ACTIVE">Ativo</SelectItem><SelectItem value="INACTIVE">Inativo</SelectItem></SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Papel global">
              <Select value={form.globalRole} onValueChange={(globalRole: StudioGlobalRole) => setForm((current) => ({ ...current, globalRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
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
          <div className="mt-2 divide-y rounded-xl border">
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
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
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
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={props.saving}>Cancelar</Button>
          <Button onClick={props.onSave} disabled={props.saving}>
            {props.saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {props.editing ? "Salvar usuário" : "Criar usuário"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-50 text-sky-700"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0"><div className="text-xs text-slate-500">{label}</div><div className="truncate text-sm font-semibold text-slate-900">{value}</div></div>
    </div>
  );
}

function Status({ status, active }: { status: BackendStatus; active?: boolean }) {
  return <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>{active ? "Ativa agora" : status === "ACTIVE" ? "Ativa" : "Inativa"}</Badge>;
}

function LoadingRow() {
  return <div className="grid h-40 place-items-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="px-6 py-14 text-center"><div className="text-sm font-medium text-slate-800">{title}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function roleLabel(role: StudioGlobalRole) {
  return role === "STUDIO_ADMIN" ? "Administrador" : role === "STUDIO_OPERATOR" ? "Operador" : "Visualizador";
}
