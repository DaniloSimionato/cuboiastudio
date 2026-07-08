import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Copy,
  KeyRound,
  Link2,
  Pencil,
  Power,
  PowerOff,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { MaskedSecretInput, SecurityNotice, StatusBadge } from "@/components";
import {
  filterOperationalAssistants,
  isSmokeAssistant,
  isSmokeAssistantName,
} from "@/lib/assistants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Textarea } from "@/components/ui/textarea";
import {
  aiSettingsService,
  backendAssistantsService,
  chatwootSettingsService,
  companiesService,
  currentCompanyService,
} from "@/services";
import { ApiError } from "@/services/apiClient";
import type {
  AiSettings,
  AiSettingsOptions,
  BackendAssistantListItem,
  BackendStatus,
  ChatwootInboxConfigItem,
  ChatwootInboxConfigTestResponse,
  CurrentCompany,
  CurrentCompanyResponse,
  CreateCompanyPayload,
  UpsertChatwootInboxConfigPayload,
  UpdateCompanyPayload,
} from "@/types";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Cubo AI Studio" }] }),
  component: ConfigPage,
});

type AiSettingsFormState = {
  runtimeEnabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  requestTimeoutMs: string;
};

const DEFAULT_FORM_STATE: AiSettingsFormState = {
  runtimeEnabled: false,
  provider: "openai-compatible",
  baseUrl: "",
  model: "",
  apiKey: "",
  requestTimeoutMs: "30000",
};

const CUSTOM_MODEL_VALUE = "__custom_model__";

type ChatwootFormState = {
  name: string;
  baseUrl: string;
  accountId: string;
  inboxId: string;
  assistantId: string;
  apiAccessToken: string;
  webhookSecret: string;
  isActive: boolean;
  metadataJsonText: string;
};

const DEFAULT_CHATWOOT_FORM_STATE: ChatwootFormState = {
  name: "",
  baseUrl: "",
  accountId: "",
  inboxId: "",
  assistantId: "",
  apiAccessToken: "",
  webhookSecret: "",
  isActive: true,
  metadataJsonText: "",
};

type CompanyAdminFormState = {
  name: string;
  legalName: string;
  document: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string;
  createDemoAssistant: boolean;
};

const DEFAULT_COMPANY_ADMIN_FORM_STATE: CompanyAdminFormState = {
  name: "",
  legalName: "",
  document: "",
  status: "ACTIVE",
  notes: "",
  createDemoAssistant: false,
};

const CHATWOOT_WEBHOOK_SECRET_PLACEHOLDER = "SEU_SECRET_CONFIGURADO";
const CHATWOOT_LEGACY_WEBHOOK_HEADER = "x-chatwoot-webhook-secret";
const CHATWOOT_WEBHOOK_PATH = "/webhooks/chatwoot";
const CHATWOOT_LEGACY_WEBHOOK_PATH = "/webhooks/chatwoot/:assistantId/message-created";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function isLocalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return value.includes("localhost") || value.includes("127.0.0.1");
  }
}

function getConfiguredPublicApiUrl(): string {
  const candidates = [
    import.meta.env.VITE_PUBLIC_API_URL,
    import.meta.env.VITE_APP_PUBLIC_API_URL,
    import.meta.env.VITE_API_PUBLIC_URL,
    import.meta.env.VITE_API_URL,
  ];

  const configured = candidates.find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  return configured ? normalizeBaseUrl(configured) : "";
}

function getWebhookUrlTemplate(): string {
  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const apiBase = import.meta.env.DEV
    ? (import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001")
    : `${currentOrigin.replace(/\/$/, "")}/api`;

  return `${apiBase}/webhooks/chatwoot?secret=${CHATWOOT_WEBHOOK_SECRET_PLACEHOLDER}`;
}

function buildWebhookUrl(baseUrl: string, secret?: string | null): string {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${CHATWOOT_WEBHOOK_PATH}`);
  const normalizedSecret = secret?.trim();
  if (normalizedSecret) {
    url.searchParams.set("secret", normalizedSecret);
  }

  return url.toString();
}

function buildPlaceholderWebhookUrl(baseUrl: string): string {
  return buildWebhookUrl(baseUrl, CHATWOOT_WEBHOOK_SECRET_PLACEHOLDER);
}

function assistantShortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function generateWebhookSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("pt-BR");
}

function parseChatwootMetadata(input: string): Record<string, unknown> | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    throw new Error("O metadataJson precisa ser um objeto JSON.");
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "metadataJson inválido.");
  }
}

function toChatwootMetadataText(metadata: Record<string, unknown> | null): string {
  if (!metadata) {
    return "";
  }

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "";
  }
}

function normalizeChatwootPayload(
  form: ChatwootFormState,
  existing?: ChatwootInboxConfigItem | null,
): UpsertChatwootInboxConfigPayload {
  const name = form.name.trim() || `Chatwoot ${form.inboxId.trim() || "Inbox"}`;
  const baseUrl = normalizeBaseUrl(form.baseUrl);
  const accountId = form.accountId.trim();
  const inboxId = form.inboxId.trim();
  const assistantId = form.assistantId.trim();
  const apiAccessToken = form.apiAccessToken.trim();
  const webhookSecret = form.webhookSecret.trim();

  return {
    name,
    baseUrl,
    accountId,
    inboxId,
    ...(assistantId ? { assistantId } : existing?.assistantId ? {} : {}),
    ...(apiAccessToken ? { apiAccessToken } : existing?.apiAccessTokenConfigured ? {} : {}),
    ...(webhookSecret ? { webhookSecret } : existing?.webhookSecretConfigured ? {} : {}),
    isActive: form.isActive,
    metadataJson: parseChatwootMetadata(form.metadataJsonText),
  };
}

function mapSettingsToForm(
  settings: AiSettings,
  options?: AiSettingsOptions | null,
): AiSettingsFormState {
  const provider = options?.providers.find((item) => item.id === settings.provider);

  return {
    runtimeEnabled: settings.runtimeEnabled,
    provider: settings.provider,
    baseUrl: settings.baseUrl ?? provider?.baseUrl ?? "",
    model: settings.model ?? provider?.models[0] ?? "",
    apiKey: "",
    requestTimeoutMs: String(settings.requestTimeoutMs ?? 30000),
  };
}

function mapCompanyToAdminForm(company?: CurrentCompany | null): CompanyAdminFormState {
  if (!company) {
    return DEFAULT_COMPANY_ADMIN_FORM_STATE;
  }

  return {
    name: company.name ?? "",
    legalName: company.legalName ?? "",
    document: company.document ?? "",
    status: company.status,
    notes: company.notes ?? "",
    createDemoAssistant: false,
  };
}

function normalizeCompanyPayload(
  form: CompanyAdminFormState,
): CreateCompanyPayload & UpdateCompanyPayload {
  return {
    name: form.name.trim(),
    legalName: form.legalName.trim() || null,
    document: form.document.trim() || null,
    status: form.status,
    notes: form.notes.trim() || null,
    createDemoAssistant: form.createDemoAssistant,
  };
}

function ConfigPage() {
  const [company, setCompany] = useState<CurrentCompanyResponse["company"] | null>(null);
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [options, setOptions] = useState<AiSettingsOptions | null>(null);
  const [form, setForm] = useState<AiSettingsFormState>(DEFAULT_FORM_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testError, setTestError] = useState<{
    message: string;
    providerStatus?: number;
  } | null>(null);

  const hasKeyConfigured = settings?.apiKeyConfigured ?? false;
  const providerOptions = options?.providers ?? [];
  const timeoutOptions = options?.timeoutOptionsMs ?? [10000, 30000, 60000, 120000];
  const selectedProvider = providerOptions.find((provider) => provider.id === form.provider);
  const isCustomProvider = form.provider === "custom" || !selectedProvider;
  const selectedModelValue =
    selectedProvider?.models.includes(form.model) && form.model.length > 0
      ? form.model
      : CUSTOM_MODEL_VALUE;
  const hasUnsavedSettings = settings
    ? form.runtimeEnabled !== settings.runtimeEnabled ||
      form.provider !== settings.provider ||
      form.baseUrl !== (settings.baseUrl ?? "") ||
      form.model !== (settings.model ?? "") ||
      Number(form.requestTimeoutMs) !== settings.requestTimeoutMs
    : true;
  const hasUnsavedApiKey = form.apiKey.trim().length > 0;
  const canTestConnection =
    Boolean(settings?.runtimeEnabled) &&
    Boolean(settings?.baseUrl) &&
    Boolean(settings?.model) &&
    Boolean(settings?.apiKeyConfigured) &&
    !hasUnsavedSettings &&
    !hasUnsavedApiKey;
  const testDisabledReason = useMemo(() => {
    if (!settings?.runtimeEnabled) {
      return "Ative e salve a IA real antes de testar.";
    }

    if (!settings.baseUrl || !settings.model) {
      return "Informe provider/modelo e salve antes de testar.";
    }

    if (!settings.apiKeyConfigured) {
      return "Salve uma API key antes de testar a conexão.";
    }

    if (hasUnsavedApiKey || hasUnsavedSettings) {
      return "Salve a configuração antes de testar.";
    }

    return "Configuração salva pronta para teste.";
  }, [hasUnsavedApiKey, hasUnsavedSettings, settings]);
  const lastTestLabel = useMemo(() => {
    if (!settings?.lastTestAt) {
      return "Nenhum teste registrado ainda.";
    }

    const date = new Date(settings.lastTestAt);
    return `Último teste em ${date.toLocaleString("pt-BR")}.`;
  }, [settings?.lastTestAt]);

  const sourceLabel = useMemo(() => {
    switch (settings?.source) {
      case "tenant-settings":
        return "Usando configuração do tenant.";
      case "env-fallback":
        return "Usando fallback global do backend.";
      case "mixed":
        return "Usando configuração do tenant com fallback global.";
      default:
        return "Sem provider ativo no momento.";
    }
  }, [settings?.source]);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [companyResponse, settingsResponse, optionsResponse] = await Promise.all([
        currentCompanyService.get(),
        aiSettingsService.get(),
        aiSettingsService.getOptions(),
      ]);

      setCompany(companyResponse.company);
      setSettings(settingsResponse);
      setOptions(optionsResponse);
      setForm(mapSettingsToForm(settingsResponse, optionsResponse));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as configurações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateField = <K extends keyof AiSettingsFormState>(
    key: K,
    value: AiSettingsFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateProvider = (providerId: string) => {
    const provider = providerOptions.find((item) => item.id === providerId);
    setForm((current) => ({
      ...current,
      provider: providerId,
      baseUrl: provider?.baseUrl ?? "",
      model: provider?.models[0] ?? "",
    }));
  };

  const updateModel = (value: string) => {
    if (value === CUSTOM_MODEL_VALUE) {
      setForm((current) => ({
        ...current,
        model: selectedProvider?.models.includes(current.model) ? "" : current.model,
      }));
      return;
    }

    updateField("model", value);
  };

  const handleSave = async () => {
    setSaving(true);
    setTestError(null);

    try {
      const timeoutValue = Number(form.requestTimeoutMs);
      const requestTimeoutMsValue = form.requestTimeoutMs.trim();
      const payload = {
        runtimeEnabled: form.runtimeEnabled,
        provider: form.provider.trim() || undefined,
        baseUrl: form.baseUrl.trim() || undefined,
        model: form.model.trim() || undefined,
        requestTimeoutMs:
          requestTimeoutMsValue.length > 0 && Number.isFinite(timeoutValue)
            ? timeoutValue
            : undefined,
        ...(form.apiKey.trim().length > 0 ? { apiKey: form.apiKey.trim() } : {}),
      };

      const saved = await aiSettingsService.save(payload);
      setSettings(saved);
      setForm(mapSettingsToForm(saved, options));
      toast.success("Configuração de IA salva com segurança.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a configuração.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestError(null);

    try {
      const result = await aiSettingsService.test({
        message: "Responda apenas: ok",
      });

      setSettings((current) =>
        current
          ? { ...current, lastTestAt: new Date().toISOString(), lastTestStatus: "success" }
          : current,
      );
      toast.success(`Conexão validada com ${result.provider} (${result.model}).`);
    } catch (err) {
      const formattedError = formatProviderTestError(err);
      setTestError(formattedError);
      toast.error(formattedError.message);
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!window.confirm("Remover a chave salva deste tenant?")) {
      return;
    }

    setRemovingKey(true);

    try {
      const response = await aiSettingsService.deleteApiKey();
      setSettings((current) => (current ? { ...current, ...response } : current));
      setForm((current) => ({ ...current, apiKey: "" }));
      toast.success("Chave removida com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover a chave.");
    } finally {
      setRemovingKey(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Configurações"
          description="Configure o provider de IA por tenant sem expor segredos no navegador."
        />
        <LoadingState label="Carregando configuração de IA…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Configurações"
          description="Configure o provider de IA por tenant sem expor segredos no navegador."
        />
        <ErrorState title="Não foi possível carregar a página" description={error} onRetry={load} />
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeader
          title="Configurações"
          description="Configure o provider de IA por tenant sem expor segredos no navegador."
        />
        <EmptyState
          title="Empresa não encontrada"
          description="Não foi possível resolver a empresa atual para esta sessão."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description={`Configuração aplicada à empresa ${company.name}. A API key nunca sai do backend.`}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuração de IA</CardTitle>
            <CardDescription>
              Defina o provider do tenant. Se nenhum valor for salvo aqui, o backend usa o fallback
              global em desenvolvimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ativar IA real">
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Runtime habilitado</p>
                    <p className="text-xs text-muted-foreground">
                      Quando desligado, o fallback determinístico continua ativo.
                    </p>
                  </div>
                  <Switch
                    checked={form.runtimeEnabled}
                    onCheckedChange={(checked) => updateField("runtimeEnabled", checked)}
                  />
                </div>
              </Field>

              <Field label="Status da chave">
                <div className="flex h-10 items-center gap-2">
                  <Badge variant="outline" className={hasKeyConfigured ? "border-emerald-200" : ""}>
                    {hasKeyConfigured ? "Chave configurada" : "Nenhuma chave salva"}
                  </Badge>
                  <Badge variant="outline">
                    {settings?.apiKeyConfigured ? "Protegida no backend" : "Aguardando chave"}
                  </Badge>
                </div>
              </Field>

              <Field label="Provedor">
                <Select value={form.provider} onValueChange={updateProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOptions.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Base URL">
                <Input
                  value={form.baseUrl}
                  onChange={(event) => updateField("baseUrl", event.target.value)}
                  placeholder={
                    isCustomProvider ? "https://api.exemplo.com/v1" : selectedProvider?.baseUrl
                  }
                  readOnly={!isCustomProvider}
                  autoComplete="off"
                />
              </Field>

              <Field label="Modelo padrão">
                <div className="space-y-2">
                  <Select value={selectedModelValue} onValueChange={updateModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProvider?.models.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_MODEL_VALUE}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {(selectedModelValue === CUSTOM_MODEL_VALUE || isCustomProvider) && (
                    <Input
                      value={form.model}
                      onChange={(event) => updateField("model", event.target.value)}
                      placeholder="Modelo customizado"
                      autoComplete="off"
                    />
                  )}
                </div>
              </Field>

              <Field label="Timeout da requisição">
                <Select
                  value={form.requestTimeoutMs}
                  onValueChange={(value) => updateField("requestTimeoutMs", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeoutOptions.map((timeout) => (
                      <SelectItem key={timeout} value={String(timeout)}>
                        {timeout / 1000}s
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="API Key">
              <MaskedSecretInput
                value={form.apiKey}
                onChange={(event) => updateField("apiKey", event.target.value)}
                storedHint={hasKeyConfigured ? "Chave configurada" : undefined}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter a chave atual. A nova chave é criptografada no backend.
              </p>
            </Field>

            <SecurityNotice>
              Segredos ficam somente no backend. O navegador envia a chave nova apenas quando você
              decide salvar.
            </SecurityNotice>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Salvando…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Salvar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !canTestConnection}
                title={testDisabledReason}
              >
                {testing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Testando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Testar conexão
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveKey}
                disabled={removingKey || !hasKeyConfigured}
              >
                {removingKey ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Removendo…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Remover chave
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{testDisabledReason}</p>
            {testError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <p>{testError.message}</p>
                {testError.providerStatus !== undefined && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status do provider: {testError.providerStatus}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
            <CardDescription>Visão rápida da configuração ativa no backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryRow label="Empresa" value={company.name} />
            <SummaryRow
              label="Modo"
              value={form.runtimeEnabled ? "IA real habilitada" : "Fallback determinístico"}
            />
            <SummaryRow label="Origem" value={sourceLabel} />
            <SummaryRow label="Provider" value={settings?.provider ?? form.provider} />
            <SummaryRow
              label="Modelo"
              value={settings?.model || form.model || "Padrão do backend"}
            />
            <SummaryRow
              label="Timeout"
              value={`${settings?.requestTimeoutMs ?? Number(form.requestTimeoutMs)} ms`}
            />
            <SummaryRow label="Último teste" value={settings?.lastTestStatus ?? "Sem testes"} />
            <p className="text-xs text-muted-foreground">{lastTestLabel}</p>
          </CardContent>
        </Card>
      </div>

      {settings?.source === "env-fallback" && (
        <SecurityNotice>
          O backend está usando fallback global por enquanto. Salvar esta tela cria a configuração
          do tenant sem quebrar o modo determinístico.
        </SecurityNotice>
      )}

      <CompanyAdministrationSection
        currentCompanyId={company.id}
        onCompanyChanged={() => {
          void load();
        }}
      />

      <ChatwootIntegrationSection companyName={company.name} />
    </div>
  );
}

function CompanyAdministrationSection({
  currentCompanyId,
  onCompanyChanged,
}: {
  currentCompanyId: string;
  onCompanyChanged: () => void;
}) {
  const [companies, setCompanies] = useState<CurrentCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CurrentCompany | null>(null);
  const [form, setForm] = useState<CompanyAdminFormState>(DEFAULT_COMPANY_ADMIN_FORM_STATE);

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await companiesService.list();
      setCompanies(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as empresas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompanies();
  }, []);

  const openCreate = () => {
    setEditingCompany(null);
    setForm(DEFAULT_COMPANY_ADMIN_FORM_STATE);
    setSheetOpen(true);
  };

  const openEdit = (company: CurrentCompany) => {
    setEditingCompany(company);
    setForm(mapCompanyToAdminForm(company));
    setSheetOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }

    setSaving(true);
    try {
      const payload = normalizeCompanyPayload(form);
      if (editingCompany) {
        await companiesService.update(editingCompany.id, payload);
        toast.success("Empresa atualizada.");
      } else {
        await companiesService.create(payload);
        toast.success("Empresa criada com tenant isolado e pronta para setup.");
      }

      setSheetOpen(false);
      await loadCompanies();
      onCompanyChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a empresa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg">Administração de empresas</CardTitle>
          <CardDescription>
            Cadastre clientes no mesmo staging sem misturar dados. Cada empresa começa vazia e
            isolada, pronta para configurar assistentes, conhecimento, Chatwoot e apps depois.
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nova empresa
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <LoadingState label="Carregando empresas…" /> : null}
        {!loading && error ? (
          <ErrorState title="Não foi possível carregar as empresas" description={error} onRetry={loadCompanies} />
        ) : null}
        {!loading && !error && companies.length === 0 ? (
          <EmptyState
            title="Nenhuma empresa cadastrada"
            description="Crie a primeira empresa para iniciar um tenant limpo e começar o setup real."
          />
        ) : null}
        {!loading && !error && companies.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {companies.map((item) => (
              <div key={item.id} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium truncate">{item.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.legalName ?? "Razão social não informada"}
                    </p>
                  </div>
                  <StatusBadge status={item.status === "ACTIVE" ? "ativo" : "pausado"} />
                </div>
                <div className="space-y-1 text-sm">
                  <SummaryRow label="CNPJ" value={item.document || "Não informado"} />
                  <SummaryRow label="Observações" value={item.notes || "Sem observações"} />
                  <SummaryRow
                    label="Contexto"
                    value={item.id === currentCompanyId ? "Empresa ativa" : "Disponível para trocar"}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  {item.id !== currentCompanyId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void companiesService
                          .setActive(item.id)
                          .then(() => {
                            toast.success(`Empresa ativa alterada para ${item.name}.`);
                            window.location.reload();
                          })
                          .catch((err) => {
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : "Não foi possível trocar a empresa ativa.",
                            );
                          });
                      }}
                    >
                      Entrar na empresa
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingCompany ? "Editar empresa" : "Nova empresa"}</SheetTitle>
            <SheetDescription>
              {editingCompany
                ? "Atualize nome, status e observações da empresa."
                : "Crie um tenant novo do zero. Nenhum dado de outra empresa será copiado."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Field label="Nome fantasia">
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Cubo Saúde"
              />
            </Field>
            <Field label="Razão social">
              <Input
                value={form.legalName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, legalName: event.target.value }))
                }
                placeholder="Cubo Saúde LTDA"
              />
            </Field>
            <Field label="CNPJ (opcional)">
              <Input
                value={form.document}
                onChange={(event) =>
                  setForm((current) => ({ ...current, document: event.target.value }))
                }
                placeholder="12.345.678/0001-99"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(value: "ACTIVE" | "INACTIVE") =>
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
            <Field label="Observações">
              <Textarea
                rows={5}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Notas de onboarding, time responsável, restrições do ambiente..."
              />
            </Field>
            {!editingCompany ? (
              <Field label="Assistente demo opcional">
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">Criar assistente demo explicitamente</div>
                    <div className="text-xs text-muted-foreground">
                      Desligado por padrão para manter o tenant inicial vazio.
                    </div>
                  </div>
                  <Switch
                    checked={form.createDemoAssistant}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, createDemoAssistant: checked }))
                    }
                  />
                </div>
              </Field>
            ) : null}
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : editingCompany ? "Salvar alterações" : "Criar empresa"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function ChatwootIntegrationSection({ companyName }: { companyName: string }) {
  const [configs, setConfigs] = useState<ChatwootInboxConfigItem[]>([]);
  const [assistants, setAssistants] = useState<BackendAssistantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<ChatwootFormState>(DEFAULT_CHATWOOT_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastTestResults, setLastTestResults] = useState<
    Record<string, ChatwootInboxConfigTestResponse>
  >({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [webhookSecretWasGenerated, setWebhookSecretWasGenerated] = useState(false);
  const [showHiddenAssistants, setShowHiddenAssistants] = useState(false);
  const [temporaryPublicApiUrl, setTemporaryPublicApiUrl] = useState("");
  const [webhookUrlTemplate, setWebhookUrlTemplate] = useState("");
  const [configuredPublicApiUrl, setConfiguredPublicApiUrl] = useState("");
  const editingConfig = configs.find((item) => item.id === editingId) ?? null;
  const isEditing = Boolean(editingConfig);
  const storedTokenHint = editingConfig?.apiAccessTokenConfigured
    ? "Token já configurado"
    : undefined;
  const storedSecretHint = editingConfig?.webhookSecretConfigured
    ? "Segredo já configurado"
    : undefined;
  const webhookSecretRequired = import.meta.env.PROD && !storedSecretHint;
  const assistantById = useMemo(
    () => new Map(assistants.map((item) => [item.id, item])),
    [assistants],
  );
  const selectedAssistant = assistantById.get(form.assistantId) ?? null;
  const assistantOptions = useMemo(
    () =>
      assistants.slice().sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "ACTIVE" ? -1 : 1;
        }

        const nameCompare = left.name.localeCompare(right.name, "pt-BR");
        if (nameCompare !== 0) {
          return nameCompare;
        }

        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      }),
    [assistants],
  );
  const visibleAssistantOptions = useMemo(
    () => filterOperationalAssistants(assistantOptions),
    [assistantOptions],
  );
  const hiddenAssistantOptions = useMemo(
    () =>
      assistantOptions.filter(
        (assistant) => !isSmokeAssistant(assistant) && assistant.status !== "ACTIVE",
      ),
    [assistantOptions],
  );
  const selectedAssistantIsHidden =
    Boolean(selectedAssistant) &&
    !visibleAssistantOptions.some((assistant) => assistant.id === selectedAssistant?.id);
  const configuredPublicInstructionUrl =
    configuredPublicApiUrl && !isLocalUrl(configuredPublicApiUrl) ? configuredPublicApiUrl : "";
  const publicInstructionBaseUrl = normalizeBaseUrl(
    temporaryPublicApiUrl.trim() || configuredPublicInstructionUrl,
  );
  const recommendedWebhookUrl = publicInstructionBaseUrl
    ? buildPlaceholderWebhookUrl(publicInstructionBaseUrl)
    : `https://SUA_URL_PUBLICA/webhooks/chatwoot?secret=${CHATWOOT_WEBHOOK_SECRET_PLACEHOLDER}`;
  const localWebhookUrl = webhookUrlTemplate || getWebhookUrlTemplate();
  const hasPublicWebhookUrl =
    Boolean(publicInstructionBaseUrl) && !isLocalUrl(publicInstructionBaseUrl);
  const activeConfigs = configs.filter((config) => config.isActive);
  const configsWithAssistant = configs.filter((config) => Boolean(config.assistantId));
  const configsWithIssues = configs.filter(
    (config) =>
      !config.assistantId ||
      config.assistantStatus !== "ACTIVE" ||
      !config.apiAccessTokenConfigured ||
      !config.webhookSecretConfigured ||
      lastTestResults[config.id]?.ok === false,
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    setAssistantError(null);

    try {
      const [configsResponse, assistantsResponse] = await Promise.allSettled([
        chatwootSettingsService.list(),
        backendAssistantsService.list(),
      ]);

      if (configsResponse.status === "rejected") {
        throw configsResponse.reason instanceof Error
          ? configsResponse.reason
          : new Error("Não foi possível carregar as inboxes do Chatwoot.");
      }

      setConfigs(configsResponse.value);

      if (assistantsResponse.status === "fulfilled") {
        setAssistants(assistantsResponse.value);
      } else {
        setAssistants([]);
        setAssistantError(
          assistantsResponse.reason instanceof Error
            ? assistantsResponse.reason.message
            : "Não foi possível carregar a lista de assistentes.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível carregar as inboxes do Chatwoot.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setWebhookUrlTemplate(getWebhookUrlTemplate());
    setConfiguredPublicApiUrl(getConfiguredPublicApiUrl());
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_CHATWOOT_FORM_STATE);
    setFormError(null);
    setShowAdvanced(false);
    setWebhookSecretWasGenerated(false);
    setIsFormOpen(true);
  };

  const startEdit = (config: ChatwootInboxConfigItem) => {
    setEditingId(config.id);
    setFormError(null);
    setForm({
      name: config.name,
      baseUrl: config.baseUrl,
      accountId: config.accountId,
      inboxId: config.inboxId,
      assistantId: config.assistantId ?? "",
      apiAccessToken: "",
      webhookSecret: "",
      isActive: config.isActive,
      metadataJsonText: toChatwootMetadataText(
        config.metadataJson as Record<string, unknown> | null,
      ),
    });
    setShowAdvanced(false);
    setWebhookSecretWasGenerated(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormError(null);
    setEditingId(null);
    setForm(DEFAULT_CHATWOOT_FORM_STATE);
    setShowAdvanced(false);
    setWebhookSecretWasGenerated(false);
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);

    try {
      const baseUrl = normalizeBaseUrl(form.baseUrl);
      if (!baseUrl) {
        throw new Error("Informe a URL base do Chatwoot.");
      }

      try {
        new URL(baseUrl);
      } catch {
        throw new Error("A URL base do Chatwoot precisa ser válida.");
      }

      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        throw new Error("A URL base precisa começar com http:// ou https://.");
      }

      if (!form.name.trim()) {
        throw new Error("Informe o nome da configuração.");
      }

      if (!form.accountId.trim()) {
        throw new Error("Informe o Account ID.");
      }

      if (!form.inboxId.trim()) {
        throw new Error("Informe o Inbox ID.");
      }

      if (!form.assistantId.trim() && !(editingConfig?.assistantId ?? "")) {
        throw new Error("Selecione o assistente responsável.");
      }

      const assistantToValidate = assistantById.get(form.assistantId);
      if (form.isActive && (!assistantToValidate || assistantToValidate.status !== "ACTIVE")) {
        throw new Error("Selecione um assistente ativo para responder esta inbox.");
      }

      const apiAccessTokenMissing =
        !form.apiAccessToken.trim() && !(editingConfig?.apiAccessTokenConfigured ?? false);
      if (apiAccessTokenMissing) {
        throw new Error("Informe o token de API do Chatwoot.");
      }

      if (
        webhookSecretRequired &&
        !form.webhookSecret.trim() &&
        !(editingConfig?.webhookSecretConfigured ?? false)
      ) {
        throw new Error("Informe o segredo do webhook.");
      }

      const payload = normalizeChatwootPayload(form, editingConfig);
      const response = editingConfig
        ? await chatwootSettingsService.update(editingConfig.id, payload)
        : await chatwootSettingsService.create(payload);

      toast.success(
        editingConfig ? "Configuração do Chatwoot atualizada." : "Configuração do Chatwoot criada.",
      );
      setConfigs((current) =>
        editingConfig
          ? current.map((item) => (item.id === response.id ? response : item))
          : [response, ...current],
      );
      closeForm();
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar a inbox.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (config: ChatwootInboxConfigItem) => {
    try {
      const payload = normalizeChatwootPayload(
        {
          name: config.name,
          baseUrl: config.baseUrl,
          accountId: config.accountId,
          inboxId: config.inboxId,
          assistantId: config.assistantId ?? "",
          apiAccessToken: "",
          webhookSecret: "",
          isActive: !config.isActive,
          metadataJsonText: toChatwootMetadataText(
            config.metadataJson as Record<string, unknown> | null,
          ),
        },
        config,
      );

      const response = await chatwootSettingsService.update(config.id, payload);
      setConfigs((current) => current.map((item) => (item.id === config.id ? response : item)));
      toast.success(response.isActive ? "Inbox ativada." : "Inbox desativada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar o status.");
    }
  };

  const testConnection = async (config: ChatwootInboxConfigItem) => {
    setTestingId(config.id);
    try {
      const result = await chatwootSettingsService.test(config.id);
      setLastTestResults((current) => ({ ...current, [config.id]: result }));

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.reason ? `${result.message} ${result.reason}` : result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível testar a configuração.");
    } finally {
      setTestingId(null);
    }
  };

  const remove = async (config: ChatwootInboxConfigItem) => {
    if (!window.confirm(`Remover a inbox "${config.name}"?`)) {
      return;
    }

    setDeletingId(config.id);

    try {
      await chatwootSettingsService.remove(config.id);
      setConfigs((current) => current.filter((item) => item.id !== config.id));
      setLastTestResults((current) => {
        const next = { ...current };
        delete next[config.id];
        return next;
      });
      if (editingId === config.id) {
        startCreate();
      }
      toast.success("Configuração removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover a inbox.");
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error("Não foi possível copiar para a área de transferência.");
    }
  };

  const generateSecret = () => {
    const secret = generateWebhookSecret();
    setForm((current) => ({ ...current, webhookSecret: secret }));
    setWebhookSecretWasGenerated(true);
    toast.success("Segredo gerado. Agora copie a URL do webhook com segredo.");
  };

  if (loading) {
    return (
      <div className="mt-10">
        <LoadingState label="Carregando configurações do Chatwoot…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10">
        <ErrorState title="Chatwoot indisponível" description={error} onRetry={load} />
      </div>
    );
  }

  return (
    <section className="space-y-4 mt-8">
      <PageHeader
        title="Chatwoot / WhatsApp"
        description={`Conecte inboxes do Chatwoot a assistentes para responder conversas reais do WhatsApp na empresa ${companyName}.`}
        actions={
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4" /> Nova configuração
          </Button>
        }
      />

      {assistantError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900">
          {assistantError}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Total de inboxes" value={String(configs.length)} />
        <MetricCard label="Ativas" value={String(activeConfigs.length)} />
        <MetricCard label="Com assistente" value={String(configsWithAssistant.length)} />
        <MetricCard
          label="Com alerta"
          value={String(configsWithIssues.length)}
          tone={configsWithIssues.length > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Inboxes cadastradas</CardTitle>
            <CardDescription>
              Cada inbox mapeia Account ID + Inbox ID para um assistente responsável.
            </CardDescription>
          </div>
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4" /> Nova configuração
          </Button>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <EmptyState
              title="Nenhuma inbox do Chatwoot configurada."
              description="Cadastre uma inbox para conectar um número de WhatsApp a um assistente."
              action={
                <Button onClick={startCreate}>
                  <Plus className="h-4 w-4" /> Nova configuração
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {configs.map((config) => {
                const testResult = lastTestResults[config.id];
                const linkedAssistant = assistantById.get(config.assistantId ?? "") ?? null;
                const assistantIsSmoke =
                  isSmokeAssistant(linkedAssistant) ||
                  (typeof config.assistantName === "string" &&
                    isSmokeAssistantName(config.assistantName));
                const assistantName = assistantIsSmoke
                  ? "Assistente de teste oculto"
                  : (config.assistantName ?? linkedAssistant?.name ?? "Sem assistente vinculado");
                const assistantInactive =
                  Boolean(config.assistantId) &&
                  (config.assistantStatus !== "ACTIVE" || assistantIsSmoke);

                return (
                  <div key={config.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{config.name}</h3>
                          <StatusBadge status={config.isActive ? "ativo" : "pausado"} />
                          {!config.assistantId ? (
                            <Badge variant="outline" className="border-amber-200 text-amber-700">
                              Sem assistente
                            </Badge>
                          ) : assistantInactive ? (
                            <Badge variant="outline" className="border-amber-200 text-amber-700">
                              Assistente inativo
                            </Badge>
                          ) : null}
                        </div>
                        <p className="break-all text-xs text-muted-foreground">{config.baseUrl}</p>
                      </div>
                      {testResult ? (
                        <Badge
                          variant="outline"
                          className={
                            testResult.ok
                              ? "border-emerald-200 text-emerald-700"
                              : "border-rose-200 text-rose-700"
                          }
                        >
                          {testResult.ok ? "Teste OK" : "Erro no teste"}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <SummaryRow label="Account ID" value={config.accountId} />
                      <SummaryRow label="Inbox ID" value={config.inboxId} />
                      <SummaryRow label="Assistente responsável" value={assistantName} />
                      <SummaryRow label="Atualizado em" value={formatDate(config.updatedAt)} />
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div className="rounded-lg border bg-muted/30 px-3 py-2">
                        <span className="font-medium text-foreground">API Access Token:</span>{" "}
                        {config.apiAccessTokenConfigured
                          ? "Token de usuário já configurado"
                          : "Sem token"}
                      </div>
                      <div className="rounded-lg border bg-muted/30 px-3 py-2">
                        <span className="font-medium text-foreground">Webhook secret:</span>{" "}
                        {config.webhookSecretConfigured ? "Segredo já configurado" : "Sem segredo"}
                      </div>
                    </div>

                    {!config.isActive ? (
                      <p className="mt-3 text-sm text-amber-700">
                        Inativa: mensagens dessa inbox serão ignoradas.
                      </p>
                    ) : !config.assistantId ? (
                      <p className="mt-3 text-sm text-amber-700">
                        Sem assistente vinculado. Esta inbox não responderá automaticamente até que
                        um assistente seja selecionado.
                      </p>
                    ) : assistantInactive ? (
                      <p className="mt-3 text-sm text-amber-700">
                        Assistente inativo. Reative ou selecione outro assistente para responder
                        esta inbox.
                      </p>
                    ) : null}

                    {testResult ? (
                      <div
                        className={
                          testResult.ok
                            ? "mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-800"
                            : "mt-3 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2 text-sm text-rose-800"
                        }
                      >
                        <div className="font-medium">{testResult.message}</div>
                        {!testResult.ok && testResult.reason ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {testResult.reason}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(config)}>
                        {!config.assistantId ? "Vincular assistente" : "Editar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void testConnection(config)}
                        disabled={testingId === config.id}
                      >
                        {testingId === config.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Testando
                          </>
                        ) : (
                          <>
                            <Webhook className="h-4 w-4" /> Testar conexão
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void toggleActive(config)}>
                        {config.isActive ? (
                          <>
                            <PowerOff className="h-4 w-4" /> Inativar
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4" /> Ativar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void remove(config)}
                        disabled={deletingId === config.id}
                      >
                        {deletingId === config.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Removendo
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" /> Remover
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-emerald-600" /> Validação do webhook
          </CardTitle>
          <CardDescription>
            Use a URL com `?secret=` no Chatwoot. O assistente é resolvido por Account ID + Inbox
            ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-background to-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                POST {CHATWOOT_WEBHOOK_PATH}
              </Badge>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const displayBaseUrl = publicInstructionBaseUrl || "https://SUA_URL_PUBLICA";
                    const fullUrl =
                      webhookSecretWasGenerated && form.webhookSecret.trim()
                        ? buildWebhookUrl(displayBaseUrl, form.webhookSecret.trim())
                        : buildPlaceholderWebhookUrl(displayBaseUrl);
                    void copyToClipboard(fullUrl, "URL do webhook");
                  }}
                >
                  <Copy className="h-4 w-4" />{" "}
                  {webhookSecretWasGenerated && form.webhookSecret.trim()
                    ? "Copiar URL com segredo"
                    : "Copiar URL recomendada"}
                </Button>
              </div>
            </div>
            <div className="mt-3 break-all rounded-lg bg-background/70 px-3 py-2 font-mono text-sm">
              {webhookSecretWasGenerated && form.webhookSecret.trim()
                ? buildWebhookUrl(
                    publicInstructionBaseUrl || "https://SUA_URL_PUBLICA",
                    form.webhookSecret.trim(),
                  )
                : recommendedWebhookUrl}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta URL valida o segredo na query string. Se o segredo já estiver salvo, a interface
              mostra `SEU_SECRET_CONFIGURADO` para evitar expor o valor em claro.
            </p>
            {!hasPublicWebhookUrl ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900">
                Para testes reais com Chatwoot, use uma URL pública via ngrok/cloudflared. A URL
                local `{localWebhookUrl}` serve apenas para replay local.
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <Input
                value={temporaryPublicApiUrl}
                onChange={(event) => setTemporaryPublicApiUrl(event.target.value)}
                placeholder="Cole aqui uma URL pública temporária, ex.: https://sua-url.ngrok-free.app"
              />
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                Header legado: <span className="font-mono">{CHATWOOT_LEGACY_WEBHOOK_HEADER}</span>
              </div>
            </div>
          </div>

          <details className="rounded-lg border bg-muted/20 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Como configurar no Chatwoot
            </summary>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Cadastre a inbox no Cubo.</li>
              <li>Vincule um assistente responsável.</li>
              <li>Gere ou informe um segredo de webhook.</li>
              <li>Copie a URL recomendada com `?secret=...`.</li>
              <li>No CuboChat/Chatwoot, vá em Configurações &gt; Integrações &gt; Webhooks.</li>
              <li>
                Crie o webhook com nome `Cubo AI Studio`, URL `POST /webhooks/chatwoot?secret=...` e
                evento `message_created`.
              </li>
              <li>Salve a configuração.</li>
              <li>Envie uma mensagem pelo WhatsApp de teste.</li>
            </ol>
          </details>

          <details className="rounded-lg border bg-muted/10 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">Endpoint legado/dev</summary>
            <div className="mt-3 break-all font-mono text-sm text-muted-foreground">
              POST {CHATWOOT_LEGACY_WEBHOOK_PATH}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Use apenas para compatibilidade ou testes internos. Em produção, use `
              {CHATWOOT_WEBHOOK_PATH}`.
            </p>
          </details>
        </CardContent>
      </Card>

      <Sheet open={isFormOpen} onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}>
        <SheetContent className="clean-scrollbar w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{isEditing ? "Editar configuração" : "Nova configuração"}</SheetTitle>
            <SheetDescription>
              {isEditing
                ? "Token e segredo podem ficar em branco para manter os valores atuais."
                : "Vincule uma inbox real do Chatwoot a um assistente do Cubo."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <FormSection
              title="Identificação"
              description="Nome interno e URL da sua instância Chatwoot."
            >
              <Field label="Nome da configuração">
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="WhatsApp teste Delta"
                />
              </Field>
              <Field label="URL base do Chatwoot">
                <Input
                  value={form.baseUrl}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, baseUrl: event.target.value }))
                  }
                  placeholder="https://app2.cubochat.com.br"
                />
                <HelpText>
                  Precisa começar com http:// ou https://. A barra final será removida ao salvar.
                </HelpText>
              </Field>
            </FormSection>

            <FormSection
              title="Dados da inbox"
              description="IDs da conta e da inbox WhatsApp dentro do Chatwoot."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Account ID">
                  <Input
                    value={form.accountId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, accountId: event.target.value }))
                    }
                    placeholder="3"
                  />
                  <HelpText>
                    Você encontra no painel/admin do Chatwoot. Exemplo: Account #3.
                  </HelpText>
                </Field>
                <Field label="Inbox ID">
                  <Input
                    value={form.inboxId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, inboxId: event.target.value }))
                    }
                    placeholder="523"
                  />
                  <HelpText>É o ID da inbox WhatsApp que será atendida por este agente.</HelpText>
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Assistente"
              description="Define qual agente responderá mensagens dessa inbox."
            >
              <Field label="Assistente responsável">
                <AssistantCombobox
                  value={form.assistantId}
                  onChange={(assistantId) => setForm((current) => ({ ...current, assistantId }))}
                  visibleAssistants={visibleAssistantOptions}
                  hiddenAssistants={hiddenAssistantOptions}
                  selectedAssistant={selectedAssistant}
                  showHiddenAssistants={showHiddenAssistants}
                  onShowHiddenAssistantsChange={setShowHiddenAssistants}
                />
                <HelpText>
                  Quando chegar mensagem nessa inbox, este assistente será usado no runtime.
                </HelpText>
                {selectedAssistantIsHidden ? (
                  <p className="text-xs text-amber-700">
                    O assistente selecionado está inativo ou é de teste/smoke. Para uma inbox ativa,
                    selecione um assistente ativo.
                  </p>
                ) : null}
              </Field>
            </FormSection>

            <FormSection
              title="Segurança"
              description="Credenciais usadas para baixar anexos e enviar respostas."
            >
              <Field label="API Access Token de User">
                <SecretTextInput
                  value={form.apiAccessToken}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, apiAccessToken: value }))
                  }
                  storedHint={storedTokenHint}
                  placeholder="Cole o token de usuário"
                />
                <HelpText>
                  Use um token de usuário com permissão para ler conversas, baixar anexos e enviar
                  respostas nesta inbox. O Agent Bot é restrito e não deve ser o padrão.
                </HelpText>
              </Field>
              <Field label="Segredo do webhook">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <SecretTextInput
                    value={form.webhookSecret}
                    onChange={(value) => {
                      setWebhookSecretWasGenerated(false);
                      setForm((current) => ({ ...current, webhookSecret: value }));
                    }}
                    storedHint={storedSecretHint}
                    placeholder="Cole ou gere um segredo"
                  />
                  <Button type="button" variant="outline" onClick={generateSecret}>
                    <KeyRound className="h-4 w-4" /> Gerar segredo
                  </Button>
                </div>
                <HelpText>
                  Como o CuboChat não envia headers customizados, este segredo será validado na
                  query string da URL do webhook.
                </HelpText>
              </Field>
            </FormSection>

            <FormSection
              title="Status"
              description="Controle se esta inbox processa mensagens recebidas."
            >
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{form.isActive ? "Ativa" : "Inativa"}</div>
                  <div className="text-xs text-muted-foreground">
                    {form.isActive
                      ? "Mensagens dessa inbox serão processadas."
                      : "Mensagens dessa inbox serão ignoradas."}
                  </div>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, isActive: checked }))
                  }
                />
              </div>
              {!form.isActive ? (
                <p className="text-xs text-amber-700">
                  Inativa: o webhook resolve a inbox, mas não processa mensagens.
                </p>
              ) : null}
            </FormSection>

            <details
              className="rounded-xl border bg-muted/10 px-4 py-3"
              open={showAdvanced}
              onToggle={(event) => setShowAdvanced(event.currentTarget.open)}
            >
              <summary className="cursor-pointer text-sm font-medium">Avançado</summary>
              <div className="mt-4 space-y-4">
                <Field label="Metadados JSON opcional">
                  <Textarea
                    rows={6}
                    value={form.metadataJsonText}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, metadataJsonText: event.target.value }))
                    }
                    placeholder='{"ambiente": "homologacao"}'
                  />
                  <HelpText>Opcional. Use apenas para metadados internos em JSON válido.</HelpText>
                </Field>
                <div className="rounded-lg border bg-background px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Endpoint legado/dev
                  </div>
                  <div className="mt-1 break-all font-mono text-sm text-muted-foreground">
                    POST {CHATWOOT_LEGACY_WEBHOOK_PATH}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Use apenas para compatibilidade ou testes internos. Em produção, use `
                    {CHATWOOT_WEBHOOK_PATH}`.
                  </p>
                </div>
                <div className="rounded-lg border bg-background px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Header legado/proxy
                  </div>
                  <div className="mt-1 font-mono text-sm text-muted-foreground">
                    {CHATWOOT_LEGACY_WEBHOOK_HEADER}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mantenha apenas para compatibilidade com proxies ou integrações legadas. O fluxo
                    principal usa `?secret=` na query string.
                  </p>
                </div>
              </div>
            </details>

            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2 text-sm text-rose-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>{formError}</div>
                </div>
              </div>
            )}

            <SecurityNotice>
              Se você editar uma configuração e deixar token ou segredo em branco, os valores
              antigos serão mantidos. Nada sensível salvo é mostrado em claro na interface.
            </SecurityNotice>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Salvando…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />{" "}
                  {isEditing ? "Salvar alterações" : "Salvar configuração"}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function formatProviderTestError(error: unknown): { message: string; providerStatus?: number } {
  if (error instanceof ApiError) {
    const providerError = error.details.providerError;
    const providerDetail = providerError?.message ?? providerError?.code ?? providerError?.type;

    if (providerDetail) {
      return {
        message: `Provider recusou a requisição: ${providerDetail}.`,
        providerStatus: error.details.providerStatus,
      };
    }

    return {
      message: error.message,
      providerStatus: error.details.providerStatus,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Falha ao testar a conexão.",
  };
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card className={tone === "warning" ? "border-amber-200 bg-amber-50/50" : undefined}>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card/70 p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function SecretTextInput({
  value,
  onChange,
  storedHint,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  storedHint?: string;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={storedHint ? `${storedHint} — deixe em branco para manter` : placeholder}
        autoComplete="new-password"
        spellCheck={false}
        className="pr-10"
      />
      <ShieldCheck
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600"
        aria-label="Será enviada com segurança ao servidor"
      />
    </div>
  );
}

function AssistantCombobox({
  value,
  onChange,
  visibleAssistants,
  hiddenAssistants,
  selectedAssistant,
  showHiddenAssistants,
  onShowHiddenAssistantsChange,
}: {
  value: string;
  onChange: (value: string) => void;
  visibleAssistants: BackendAssistantListItem[];
  hiddenAssistants: BackendAssistantListItem[];
  selectedAssistant: BackendAssistantListItem | null;
  showHiddenAssistants: boolean;
  onShowHiddenAssistantsChange: (value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = selectedAssistant
    ? isSmokeAssistant(selectedAssistant)
      ? "Assistente de teste oculto"
      : selectedAssistant.name
    : "Busque ou selecione um assistente";
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    [...visibleAssistants, ...hiddenAssistants].forEach((assistant) => {
      counts.set(assistant.name, (counts.get(assistant.name) ?? 0) + 1);
    });
    return counts;
  }, [hiddenAssistants, visibleAssistants]);

  const renderAssistantItem = (assistant: BackendAssistantListItem) => {
    const showShortId = (duplicateNames.get(assistant.name) ?? 0) > 1;

    return (
      <CommandItem
        key={assistant.id}
        value={`${assistant.name} ${assistant.id}`}
        onSelect={() => {
          onChange(assistant.id);
          setOpen(false);
        }}
      >
        <Check className={value === assistant.id ? "opacity-100" : "opacity-0"} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate">{assistant.name}</span>
            <AssistantStatusBadge status={assistant.status} smoke={false} />
          </div>
          {showShortId ? (
            <div className="text-xs text-muted-foreground">ID {assistantShortId(assistant.id)}</div>
          ) : null}
        </div>
      </CommandItem>
    );
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="min-w-0 truncate">{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Busque ou selecione um assistente" />
            <CommandList>
              <CommandEmpty>Nenhum assistente encontrado.</CommandEmpty>
              <CommandGroup heading="Assistentes ativos">
                {visibleAssistants.length > 0 ? (
                  visibleAssistants.map(renderAssistantItem)
                ) : (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    Nenhum assistente ativo disponível.
                  </div>
                )}
              </CommandGroup>
              {showHiddenAssistants ? (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Assistentes inativos">
                    {hiddenAssistants.map(renderAssistantItem)}
                  </CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {hiddenAssistants.length > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-auto px-0 text-xs text-muted-foreground"
          onClick={() => onShowHiddenAssistantsChange(!showHiddenAssistants)}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {showHiddenAssistants ? "Ocultar assistentes inativos" : "Mostrar assistentes inativos"}
        </Button>
      ) : null}
    </div>
  );
}

function AssistantStatusBadge({ status, smoke }: { status: BackendStatus; smoke: boolean }) {
  if (smoke) {
    return (
      <Badge variant="outline" className="border-slate-200 text-slate-600">
        Teste/Smoke
      </Badge>
    );
  }

  if (status === "ACTIVE") {
    return (
      <Badge variant="outline" className="border-emerald-200 text-emerald-700">
        Ativo
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-amber-200 text-amber-700">
      Inativo
    </Badge>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
