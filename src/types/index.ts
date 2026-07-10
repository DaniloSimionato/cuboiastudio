// Tipos de domínio compartilhados pelo frontend.
// IMPORTANTE: nenhum campo desta camada carrega segredos em claro.
// Tokens, API keys e webhook secrets vivem APENAS no backend.

export type Status = "ativo" | "pausado" | "rascunho" | "erro" | "pendente" | "indexando";

export type ConversationStatus = "resolvido" | "transferido" | "erro" | "em andamento";

export type ConnectionState = "conectado" | "desconectado" | "testando" | "erro";

export type BackendStatus = "ACTIVE" | "INACTIVE";
export type AppInstallationStatus = "ACTIVE" | "INACTIVE" | "ERROR";
export type BackendConversationSource = "UNKNOWN" | "MANUAL_TEST" | "CHATWOOT" | "SMOKE" | "SYSTEM";
export type BackendConversationChannelType = "UNKNOWN" | "WHATSAPP" | "INSTAGRAM" | "WEBCHAT";
export type ContactMemoryCategory =
  | "IDENTITY"
  | "PREFERENCE"
  | "BUSINESS_CONTEXT"
  | "RELATIONSHIP_SUMMARY"
  | "TEMPORARY_CONTEXT";

export interface CurrentCompany {
  id: string;
  name: string;
  legalName: string | null;
  document: string | null;
  notes: string | null;
  timezone: string;
  status: BackendStatus;
  isActiveContext?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrentUserIdentity {
  id: string;
  email: string;
  name: string;
}

export interface CurrentCompanyResponse {
  company: CurrentCompany;
  user: CurrentUserIdentity;
}

export interface CompanyListResponse {
  items: CurrentCompany[];
}

export interface CreateCompanyPayload {
  name: string;
  legalName?: string | null;
  document?: string | null;
  status?: BackendStatus;
  notes?: string | null;
  timezone?: string;
  createDemoAssistant?: boolean;
}

export interface UpdateCompanyPayload {
  name?: string;
  legalName?: string | null;
  document?: string | null;
  status?: BackendStatus;
  notes?: string | null;
  timezone?: string | null;
}

export type StudioGlobalRole = "STUDIO_ADMIN" | "STUDIO_OPERATOR" | "STUDIO_VIEWER";
export type StudioCompanyRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface StudioUserMembership {
  companyId: string;
  companyName: string;
  status: BackendStatus;
  role: StudioCompanyRole;
}

export interface StudioUser {
  id: string;
  name: string;
  email: string;
  status: BackendStatus;
  globalRole: StudioGlobalRole;
  createdAt: string;
  updatedAt: string;
  memberships: StudioUserMembership[];
}

export interface StudioUsersResponse {
  items: StudioUser[];
}

export interface SaveStudioUserPayload {
  name: string;
  email: string;
  temporaryPassword?: string;
  status: BackendStatus;
  globalRole: StudioGlobalRole;
  memberships: Array<{ companyId: string; role: StudioCompanyRole }>;
}

export interface AppCatalogItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  availability: "AVAILABLE" | "COMING_SOON" | "HIDDEN";
  status: BackendStatus;
  sortOrder: number;
  isFeatured: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  installation: {
    id: string;
    status: AppInstallationStatus;
    credentialsConfigured: boolean;
  } | null;
}

export interface AppInstallationItem {
  id: string;
  companyId: string;
  appId: string;
  status: AppInstallationStatus;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  app: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    category?: string | null;
    icon?: string | null;
    availability?: "AVAILABLE" | "COMING_SOON" | "HIDDEN";
    status: BackendStatus;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  };
  credentialsConfigured: boolean;
  providerAccountEmail: string | null;
  credentialExpiresAt: string | null;
}

export interface GoogleCalendarResourceItem {
  id: string;
  companyId: string;
  installationId: string;
  calendarId: string;
  name: string;
  resourceType: string;
  sportType: string;
  isCovered: boolean;
  timezone: string;
  slotMinutes: number;
  defaultDurationMinutes: number;
  minAdvanceMinutes: number;
  maxDaysAhead: number;
  active: boolean;
  resourceTypeId: string | null;
  categoryId: string | null;
  attributeId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendarOAuthStatus {
  connected: boolean;
  providerAccountEmail: string | null;
  scopes: string[];
  connectedAt: string | null;
  expiresAt: string | null;
  lastRefreshAt: string | null;
}

export interface GoogleCalendarAccountCalendar {
  id: string;
  summary: string;
  description: string | null;
  timeZone: string | null;
  accessRole: string | null;
  primary: boolean;
  selected: boolean;
  mapped: boolean;
}

export interface SaveGoogleCalendarResourcePayload {
  name: string;
  calendarId: string;
  resourceType?: string;
  sportType?: string;
  isCovered?: boolean;
  timezone?: string;
  slotMinutes?: number;
  defaultDurationMinutes?: number;
  minAdvanceMinutes?: number;
  maxDaysAhead?: number;
  active?: boolean;
  resourceTypeId?: string | null;
  categoryId?: string | null;
  attributeId?: string | null;
  installationId?: string | null;
}

export interface ReservableResourceType {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReservableResourceCategory {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReservableResourceAttribute {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiSettings {
  runtimeEnabled: boolean;
  provider: string;
  baseUrl: string | null;
  model: string | null;
  apiKeyConfigured: boolean;
  requestTimeoutMs: number;
  lastTestAt: string | null;
  lastTestStatus: string | null;
  source: "tenant-settings" | "env-fallback" | "mixed" | "unavailable";
  tenantSettingsConfigured: boolean;
  envFallbackConfigured: boolean;
}

export interface AiSettingsProviderOption {
  id: string;
  label: string;
  baseUrl: string;
  models: string[];
}

export interface AiSettingsOptions {
  providers: AiSettingsProviderOption[];
  timeoutOptionsMs: number[];
}

export interface UpdateAiSettingsPayload {
  runtimeEnabled?: boolean;
  provider?: string;
  baseUrl?: string | null;
  model?: string | null;
  apiKey?: string;
  requestTimeoutMs?: number;
}

export interface TestAiSettingsPayload {
  message?: string;
}

export interface TestAiSettingsResponse {
  ok: true;
  provider: string;
  model: string;
  answer: string;
  durationMs: number;
}

export interface Cliente {
  id: string;
  nome: string;
}

export interface Agent {
  id: string;
  nome: string;
  descricao: string;
  clienteId: string;
  status: Status;
  modelo: string;
  baseId?: string;
  canais: string[];
  atualizadoEm: string;
}

export interface KnowledgeBase {
  id: string;
  nome: string;
  clienteId: string;
  tipo: "Texto" | "PDF" | "Site" | "FAQ" | "Planilha";
  status: "ativa" | "indexando" | "pendente" | "erro";
  documentos: number;
  atualizadoEm: string;
}

export interface Tool {
  id: string;
  nome: string;
  clienteId: string;
  tipo: "Webhook" | "API REST" | "Função interna" | "Cubo.Chat action";
  metodo: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  status: "ativo" | "pausado" | "erro";
  ultimoTeste: string;
  /**
   * Indica se a ferramenta possui credenciais salvas no backend.
   * O segredo real nunca é exposto aqui.
   */
  hasStoredSecret?: boolean;
}

export interface Channel {
  id: string;
  tipo: "WhatsApp Oficial" | "Uazapi" | "Waha" | "Instagram" | "Facebook" | "Webchat" | "TikTok";
  inbox: string;
  clienteId: string;
  agenteId?: string;
  status: Status;
}

export interface ConversationLog {
  id: string;
  data: string;
  clienteFinal: string;
  canal: string;
  agenteId: string;
  intencao: string;
  status: ConversationStatus;
  confianca: number;
  tool?: string;
  tempoMs: number;
  ultimaMensagem: string;
}

export interface Memory {
  id: string;
  contato: string;
  telefone: string;
  clienteId: string;
  canal: string;
  tipo: "preferência" | "operacional" | "contato";
  info: string;
  criadoEm: string;
  expiraEm: string;
}

export interface Variable {
  nome: string;
  descricao: string;
  origem: string;
  exemplo: string;
  disponivelEm: string[];
}

export interface ExecutionLog {
  id: string;
  agenteId: string;
  canal: string;
  contato: string;
  intencao: string;
  status: "ok" | "fallback" | "erro";
  duracaoMs: number;
  custoEstimado: number;
  criadoEm: string;
}

/**
 * Configurações de provider de IA.
 * O frontend NUNCA recebe a apiKey em claro — apenas `maskedKey`
 * (ex.: "sk-••••1234") devolvido pelo backend.
 */
export interface AIProviderSettings {
  provider: "openai" | "anthropic" | "gemini" | "openrouter";
  model: string;
  temperature: number;
  maxTokens: number;
  connected: boolean;
  maskedKey?: string;
  lastTestAt?: string;
}

/**
 * Configurações de integração com Cubo.Chat / Chatwoot.
 * Tokens e webhook secrets vivem somente no backend.
 */
export interface CuboChatSettings {
  baseUrl: string;
  connected: boolean;
  maskedToken?: string;
  hasWebhookSecret: boolean;
  lastTestAt?: string;
}

/** Resposta padrão de endpoints que armazenam segredo. */
export interface SecureStatus {
  connected: boolean;
  maskedKey?: string;
  lastTestAt?: string;
  message?: string;
}

export type BusinessDayKey =
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface BusinessHoursInterval {
  start: string;
  end: string;
}

export type BusinessHoursSchedule = Record<BusinessDayKey, BusinessHoursInterval[]>;

export interface ChatwootInboxConfigItem {
  id: string;
  companyId: string;
  assistantId: string | null;
  assistantName: string | null;
  assistantStatus: BackendStatus | null;
  name: string;
  baseUrl: string;
  accountId: string;
  inboxId: string;
  isActive: boolean;
  metadataJson: Record<string, unknown> | null;
  apiAccessTokenConfigured: boolean;
  webhookSecretConfigured: boolean;
  lastApiTestAt: string | null;
  lastApiTestOk: boolean | null;
  lastWebhookAt: string | null;
  lastWebhookEvent: string | null;
  lastWebhookAccountId: string | null;
  lastWebhookInboxId: string | null;
  lastWebhookConversationId: string | null;
  lastWebhookMessageType: string | null;
  lastWebhookIgnoredReason: string | null;
  lastWebhookRequestId: string | null;
  lastResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertChatwootInboxConfigPayload {
  name: string;
  baseUrl: string;
  accountId: string;
  inboxId: string;
  assistantId?: string;
  apiAccessToken?: string;
  webhookSecret?: string;
  isActive?: boolean;
  metadataJson?: Record<string, unknown>;
}

export interface ChatwootInboxConfigTestDetails {
  accountId: string;
  inboxId: string;
  baseUrl: string;
  canReadInbox: boolean;
  webhookUrlTemplate: string;
  assistantId: string | null;
  assistantName: string | null;
  assistantStatus: BackendStatus | null;
  assistantConfigured: boolean;
}

export interface ChatwootInboxConfigTestResponse {
  ok: boolean;
  message: string;
  reason?: string;
  details?: ChatwootInboxConfigTestDetails;
}

export interface BackendAssistantListItem {
  id: string;
  name: string;
  description: string | null;
  businessAddress: string | null;
  businessCityRegion: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPostalCode: string | null;
  businessPhone: string | null;
  businessWhatsapp: string | null;
  businessWhatsappSupport: string | null;
  websiteUrl: string | null;
  timezone: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  weeklySchedule: BusinessHoursSchedule | any | null;
  aiAlwaysAvailable: boolean;
  initialMessage: string | null;
  instructions: string | null;
  personality: string | null;
  toneOfVoice: string | null;
  avoidPhrases: string | null;
  model: string | null;
  temperature: number | null;
  fallbackMessage: string | null;
  safetyInstruction: string | null;
  ragEnabled: boolean;
  memoryEnabled: boolean;
  memoryPrePromptEnabled: boolean;
  memoryExtractionEnabled: boolean;
  memoryAllowedCategories: ContactMemoryCategory[] | null;
  memoryConfidenceThreshold: number;
  memoryTempDefaultDays: number;
  memorySharedAcrossAssistants: boolean;
  messageBufferEnabled: boolean;
  messageBufferSeconds: number;
  splitResponseEnabled: boolean;
  splitResponseStyle: string | null;
  status: BackendStatus;
  createdAt: string;
  updatedAt: string;
}

export type BackendAssistantResponse = BackendAssistantListItem;

export type AssistantSecurityRuleItem = {
  id: string;
  companyId: string;
  assistantId: string;
  name: string;
  ruleType: string;
  instruction: string;
  status: BackendStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BackendAssistantKnowledgeItem = {
  id: string;
  title: string;
  content: string;
  status: BackendStatus;
  processingStatus: string;
  chunkCount: number;
  processedAt?: string;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
};

export interface BackendConversationItem {
  id: string;
  title: string | null;
  source: BackendConversationSource;
  channelType: BackendConversationChannelType;
  status: BackendStatus;
  sourceProvider?: string | null;
  externalConversationId?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendConversationMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string | null;
  messageType?: string | null;
  externalMessageId?: string | null;
  attachments?: Array<{
    type: "image" | "document" | "audio" | "video" | "gif";
    fileName: string;
    mimeType: string;
    size: number;
    storagePath: string;
    sourceUrl?: string | null;
    thumbUrl?: string | null;
    processingStatus?: "pending" | "processing" | "completed" | "failed";
    processingError?: string | null;
    caption?: string | null;
    extractedText?: string | null;
    interpretedSummary?: string | null;
    transcript?: string | null;
    description?: string | null;
    durationSeconds?: number | null;
    metadataJson?: Record<string, unknown> | null;
  }>;
  sources?: Array<{
    id: string;
    title: string;
  }>;
  mode?: string | null;
  createdAt: string;
}

export interface BackendConversationSendAttachment {
  type: "image" | "document" | "audio" | "video" | "gif";
  fileName: string;
  mimeType: string;
  size?: number;
  dataUrl?: string;
  url?: string;
  thumbUrl?: string;
  caption?: string;
  durationSeconds?: number;
  extractedText?: string;
  transcript?: string;
  description?: string;
}

export interface BackendConversationSendContact {
  name: string;
  phone: string;
}

export interface BackendConversationSendLocation {
  label?: string;
  latitude?: number;
  longitude?: number;
}

export interface BackendConversationSendRequest {
  message?: string;
  source?: "tests" | "chatwoot" | "manual";
  externalMessageId?: string;
  externalConversationId?: string;
  externalContactId?: string;
  externalChannelId?: string;
  externalInboxId?: string;
  messageType?: string;
  attachments?: BackendConversationSendAttachment[];
  contact?: BackendConversationSendContact;
  location?: BackendConversationSendLocation;
}

export interface BackendConversationRuntime {
  mode: "ai-runtime" | "deterministic-runtime";
  assistant: {
    id: string;
    name: string;
  };
  provider?: string;
  model?: string;
  modelSource?: "assistant" | "runtime-config" | "not-configured";
  temperature: number;
  temperatureSource: "assistant" | "default";
  configurationSource: "tenant-settings" | "env-fallback" | "mixed" | "unavailable";
  fallback: boolean;
  outcome: "success" | "fallback" | "needs_human" | "unknown";
  summary: string;
  context?: {
    historyMessagesUsed: number;
    historyLimit: number;
    initialMessageIncluded: boolean;
    instructionsIncluded: boolean;
  };
  logId?: string;
  reason?:
    | "ai-runtime-disabled"
    | "ai-provider-not-configured"
    | "ai-model-not-configured"
    | "ai-provider-auth-error"
    | "ai-provider-quota-error"
    | "ai-provider-error";
  warning?: string;
}

export interface BackendAssistantPreviewResponse {
  previewLogId: string;
  assistant: {
    id: string;
    name: string;
  };
  question: string;
  answer: string;
  sources: Array<{
    id: string;
    title: string;
  }>;
  mode: "deterministic-preview" | "ai-preview-rag";
  usedKnowledge?: Array<{
    knowledgeId: string;
    title: string;
    chunkId: string;
    score: number;
    contentPreview: string;
  }>;
  ragEnabled?: boolean;
  totalChunksScanned?: number;
}

export interface BackendAssistantRunResponse {
  runLogId: string;
  assistant: {
    id: string;
    name: string;
  };
  input: {
    message: string;
  };
  output: {
    answer: string;
  };
  sources: Array<{
    id: string;
    title: string;
  }>;
  mode: "deterministic-runtime";
}

export interface BackendConversationSendResponse {
  conversationId: string;
  userMessage: BackendConversationMessageItem;
  assistantMessage: BackendConversationMessageItem;
  runtime: BackendConversationRuntime;
}

export interface AiRuntimeLogListItem {
  id: string;
  assistantId: string | null;
  assistantName: string | null;
  conversationId: string | null;
  conversationSource: BackendConversationSource | null;
  conversationChannelType: BackendConversationChannelType | null;
  mode: "ai-runtime" | "deterministic-runtime" | string;
  status: "success" | "fallback" | "error" | string;
  provider: string | null;
  model: string | null;
  configurationSource: string | null;
  fallback: boolean;
  fallbackReason: string | null;
  outcome: string | null;
  durationMs: number | null;
  providerStatus: number | null;
  providerErrorCode: string | null;
  knowledgeCount: number | null;
  historyMessagesUsed: number | null;
  historyLimit: number | null;
  initialMessageIncluded: boolean;
  instructionsIncluded: boolean;
  createdAt: string;
}

export interface AiRuntimeLogDetail extends AiRuntimeLogListItem {
  userMessageId: string | null;
  assistantMessageId: string | null;
  providerErrorType: string | null;
  providerErrorMessage: string | null;
}

export interface AiRuntimeLogsQuery {
  assistantId?: string;
  conversationId?: string;
  mode?: string;
  status?: string;
  fallback?: boolean;
  limit?: number;
}

export type ConversaLog = ConversationLog;
export type Memoria = Memory;
export type Variavel = Variable;
