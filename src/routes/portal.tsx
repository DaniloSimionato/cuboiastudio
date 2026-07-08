import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { companiesService } from "@/services";
import type { BackendStatus, CreateCompanyPayload, CurrentCompany, UpdateCompanyPayload } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [{ title: "Portal do Studio · Cubo AI Studio" }] }),
  component: PortalPage,
});

type CompanyFormState = {
  name: string;
  legalName: string;
  document: string;
  status: BackendStatus;
  notes: string;
};

const DEFAULT_FORM: CompanyFormState = {
  name: "",
  legalName: "",
  document: "",
  status: "ACTIVE",
  notes: "",
};

function PortalPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CurrentCompany[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CurrentCompany | null>(null);
  const [form, setForm] = useState<CompanyFormState>(DEFAULT_FORM);
  const [enteringCompanyId, setEnteringCompanyId] = useState<string | null>(null);

  const canManageCompanies = useMemo(
    () => Boolean(user?.permissions?.includes("companies:manage") || user?.role === "admin"),
    [user?.permissions, user?.role],
  );

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      void navigate({ to: "/auth", replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const loadCompanies = async () => {
    setPageLoading(true);
    setError(null);

    try {
      const items = await companiesService.list();
      setCompanies(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as empresas.");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void loadCompanies();
    }
  }, [isAuthenticated]);

  const resetForm = () => {
    setEditingCompany(null);
    setForm(DEFAULT_FORM);
  };

  const openCreate = () => {
    resetForm();
    setSheetOpen(true);
  };

  const openEdit = (company: CurrentCompany) => {
    setEditingCompany(company);
    setForm({
      name: company.name ?? "",
      legalName: company.legalName ?? "",
      document: company.document ?? "",
      status: company.status,
      notes: company.notes ?? "",
    });
    setSheetOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }

    setSaving(true);
    try {
      const payload: CreateCompanyPayload & UpdateCompanyPayload = {
        name: form.name.trim(),
        legalName: form.legalName.trim() || null,
        document: form.document.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (editingCompany) {
        await companiesService.update(editingCompany.id, payload);
        toast.success("Empresa atualizada no portal global.");
      } else {
        await companiesService.create(payload);
        toast.success("Empresa criada vazia e pronta para configuração.");
      }

      setSheetOpen(false);
      resetForm();
      await loadCompanies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a empresa.");
    } finally {
      setSaving(false);
    }
  };

  const enterCompany = async (company: CurrentCompany) => {
    setEnteringCompanyId(company.id);
    try {
      await companiesService.setActive(company.id);
      await navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível definir a empresa ativa.",
      );
    } finally {
      setEnteringCompanyId(null);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <section className="rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white overflow-hidden">
          <div className="grid gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
                Portal global do Studio
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">Empresas e governanca do Cubo AI Studio</h1>
                <p className="max-w-2xl text-sm text-slate-200/85">
                  Crie novas empresas, escolha o tenant ativo para operar e mantenha a administracao
                  global fora do contexto interno de cada cliente.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard label="Empresas acessiveis" value={String(companies.length)} icon={Building2} />
              <MetricCard
                label="Empresa ativa"
                value={companies.find((item) => item.isActiveContext)?.name ?? "Nenhuma"}
                icon={Shield}
              />
              <MetricCard label="Usuarios do Studio" value="Em breve" icon={Users} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Empresas</CardTitle>
                <CardDescription>
                  Lista global de tenants acessiveis para este usuario no Studio.
                </CardDescription>
              </div>
              <Button onClick={openCreate} disabled={!canManageCompanies}>
                <Plus className="h-4 w-4" />
                Nova empresa
              </Button>
            </CardHeader>
            <CardContent>
              {pageLoading ? (
                <div className="grid place-items-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {error}
                </div>
              ) : companies.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                  Nenhuma empresa acessivel encontrada.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {companies.map((company) => (
                    <article key={company.id} className="rounded-2xl border p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <h2 className="truncate font-medium">{company.name}</h2>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {company.legalName || "Razao social nao informada"}
                          </p>
                        </div>
                        <StatusBadge status={company.status === "ACTIVE" ? "ativo" : "pausado"} />
                      </div>

                      <dl className="grid gap-2 text-sm">
                        <SummaryRow label="CNPJ" value={company.document || "Nao informado"} />
                        <SummaryRow
                          label="Criada em"
                          value={formatDate(company.createdAt) || "Data indisponivel"}
                        />
                        <SummaryRow
                          label="Status do contexto"
                          value={company.isActiveContext ? "Empresa ativa" : "Pronta para acessar"}
                        />
                      </dl>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => void enterCompany(company)}
                          disabled={enteringCompanyId === company.id}
                        >
                          {enteringCompanyId === company.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          Acessar empresa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(company)}
                          disabled={!canManageCompanies}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios do Studio</CardTitle>
              <CardDescription>
                Estrutura global de usuarios e permissoes do Studio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-dashed p-4">
                Gestao de usuarios em breve.
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                O objetivo desta area e centralizar memberships, papeis globais e acessos a
                multiplas empresas sem misturar isso com as configuracoes internas do tenant.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingCompany ? "Editar empresa" : "Nova empresa"}</SheetTitle>
            <SheetDescription>
              {editingCompany
                ? "Atualize os dados cadastrais da empresa no portal global."
                : "Crie uma empresa vazia. O usuario atual continuara no portal e podera acessar o tenant quando quiser."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Field label="Nome fantasia">
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Drimo"
              />
            </Field>
            <Field label="Razao social">
              <Input
                value={form.legalName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, legalName: event.target.value }))
                }
                placeholder="Drimo Tecnologia LTDA"
              />
            </Field>
            <Field label="CNPJ (opcional)">
              <Input
                value={form.document}
                onChange={(event) =>
                  setForm((current) => ({ ...current, document: event.target.value }))
                }
                placeholder="00.000.000/0001-00"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(value: BackendStatus) =>
                  setForm((current) => ({ ...current, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Observacoes">
              <Textarea
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Contexto operacional, time responsavel ou observacoes internas do onboarding."
              />
            </Field>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Salvando..." : editingCompany ? "Salvar alteracoes" : "Criar empresa"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">{label}</div>
          <div className="mt-2 text-lg font-medium text-white">{value}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("pt-BR");
}
