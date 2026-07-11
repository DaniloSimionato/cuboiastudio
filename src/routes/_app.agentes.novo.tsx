import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import {
  ArrowLeft,
  Save,
  Pause,
  PlayCircle,
  Link2,
  Sparkles,
  AlertTriangle,
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AssistantBehaviorTab,
  type AssistantBehaviorTabRef,
} from "../components/assistant/AssistantBehaviorTab";
import { AssistantFlowsTab } from "../components/assistant/AssistantFlowsTab";
import { AssistantToolsTab } from "../components/assistant/AssistantToolsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { backendAssistantsService } from "@/services/backendAssistantsService";
import { chatwootSettingsService } from "@/services/chatwootSettingsService";
import type {
  BackendAssistantKnowledgeItem,
  BackendAssistantPreviewResponse,
  BusinessDayKey,
  BusinessHoursSchedule,
  CurrentCompanyResponse,
  BackendAssistantListItem,
  ChatwootInboxConfigItem,
  AssistantSecurityRuleItem,
  ContactMemoryCategory,
  SplitResponseStyle,
} from "@/types";
import { currentCompanyService } from "@/services/currentCompanyService";
import { toast } from "sonner";
import { filterOperationalAssistants, resolveOperationalAssistantId } from "@/lib/assistants";
import {
  BUSINESS_DAYS,
  buildCityRegion,
  collapseToContinuousInterval,
  createDefaultBusinessHoursSchedule,
  hasBusinessHoursValidationErrors,
  isValidIanaTimezone,
  normalizeBusinessHoursSchedule,
  validateBusinessHoursSchedule,
} from "@/lib/business-hours";

type RouteSearch = {
  assistantId?: string;
};

type SecurityRuleFormState = {
  name: string;
  ruleType: string;
  instruction: string;
  sortOrder: number;
};

const DEFAULT_SECURITY_RULE_FORM: SecurityRuleFormState = {
  name: "",
  ruleType: "Não inventar resposta",
  instruction: "",
  sortOrder: 0,
};

const MEMORY_CATEGORY_OPTIONS: Array<{ value: ContactMemoryCategory; label: string }> = [
  { value: "IDENTITY", label: "Identidade" },
  { value: "PREFERENCE", label: "Preferências" },
  { value: "BUSINESS_CONTEXT", label: "Contexto de Negócio" },
  { value: "RELATIONSHIP_SUMMARY", label: "Resumo de Relacionamento" },
  { value: "TEMPORARY_CONTEXT", label: "Contexto Temporário" },
];

const DEFAULT_SPLIT_RESPONSE_STYLE: SplitResponseStyle = "SINGLE";

function normalizeSplitResponseStyle(
  value: SplitResponseStyle | string | null | undefined,
): SplitResponseStyle {
  return value === "NATURAL_BLOCKS" ? "NATURAL_BLOCKS" : "SINGLE";
}

function splitCityRegion(value: string | null | undefined): { city: string; state: string } {
  const text = value?.trim() ?? "";
  if (!text) {
    return { city: "", state: "" };
  }

  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      city: parts.slice(0, -1).join(", "),
      state: parts.at(-1) ?? "",
    };
  }

  return { city: text, state: "" };
}

export const Route = createFileRoute("/_app/agentes/novo")({
  validateSearch: (search: Record<string, unknown>): RouteSearch => ({
    assistantId: typeof search.assistantId === "string" ? search.assistantId : undefined,
  }),
  head: () => ({ meta: [{ title: "Novo agente · Cubo AI Studio" }] }),
  component: NovoAgente,
});

function NovoAgente() {
  const search = Route.useSearch();
  const behaviorTabRef = useRef<AssistantBehaviorTabRef>(null);

  const [company, setCompany] = useState<CurrentCompanyResponse["company"] | null>(null);
  const [assistants, setAssistants] = useState<BackendAssistantListItem[]>([]);
  const [publicationChannels, setPublicationChannels] = useState<ChatwootInboxConfigItem[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>(search.assistantId ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCityRegion, setBusinessCityRegion] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [businessPostalCode, setBusinessPostalCode] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWhatsapp, setBusinessWhatsapp] = useState("");
  const [businessWhatsappSupport, setBusinessWhatsappSupport] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [weeklySchedule, setWeeklySchedule] = useState<BusinessHoursSchedule>(
    createDefaultBusinessHoursSchedule(),
  );
  const [aiAlwaysAvailable, setAiAlwaysAvailable] = useState(true);
  const [initialMessage, setInitialMessage] = useState("");
  const [ragEnabled, setRagEnabled] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [memoryPrePromptEnabled, setMemoryPrePromptEnabled] = useState(true);
  const [memoryExtractionEnabled, setMemoryExtractionEnabled] = useState(true);
  const [memoryAllowedCategories, setMemoryAllowedCategories] = useState<ContactMemoryCategory[]>(
    ["IDENTITY", "PREFERENCE", "BUSINESS_CONTEXT", "TEMPORARY_CONTEXT"],
  );
  const [memoryConfidenceThreshold, setMemoryConfidenceThreshold] = useState(0.7);
  const [memoryTempDefaultDays, setMemoryTempDefaultDays] = useState(7);
  const [memorySharedAcrossAssistants, setMemorySharedAcrossAssistants] = useState(true);
  const [conversationResetEnabled, setConversationResetEnabled] = useState(false);
  const [conversationResetKeywordsRaw, setConversationResetKeywordsRaw] = useState("reset");
  const [conversationResetConfirmationMessage, setConversationResetConfirmationMessage] = useState(
    "🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?",
  );
  const [conversationResetPreserveMemories, setConversationResetPreserveMemories] = useState(true);
  const [conversationResetSendInitialMessage, setConversationResetSendInitialMessage] = useState(true);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [instructions, setInstructions] = useState(
    "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
  );
  const [personality, setPersonality] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [avoidPhrases, setAvoidPhrases] = useState("");
  const [messageBufferEnabled, setMessageBufferEnabled] = useState(true);
  const [messageBufferSeconds, setMessageBufferSeconds] = useState(6);
  const [splitResponseEnabled, setSplitResponseEnabled] = useState(false);
  const [splitResponseStyle, setSplitResponseStyle] =
    useState<SplitResponseStyle>(DEFAULT_SPLIT_RESPONSE_STYLE);
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState<number | null>(null);
  const [knowledge, setKnowledge] = useState<BackendAssistantKnowledgeItem[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState("Qual é o horário de atendimento?");
  const [usePreparedKnowledge, setUsePreparedKnowledge] = useState(false);
  const [previewResult, setPreviewResult] = useState<BackendAssistantPreviewResponse | null>(null);
  const [publicationSavingId, setPublicationSavingId] = useState<string | null>(null);

  const [noAnswerMessage, setNoAnswerMessage] = useState("");
  const [securityInstructions, setSecurityInstructions] = useState("");
  const [securityRules, setSecurityRules] = useState<AssistantSecurityRuleItem[]>([]);
  const [securityRulesLoading, setSecurityRulesLoading] = useState(false);
  const [securityRulesError, setSecurityRulesError] = useState<string | null>(null);
  const [securityRuleSavingId, setSecurityRuleSavingId] = useState<string | null>(null);
  const [securityRuleDeletingId, setSecurityRuleDeletingId] = useState<string | null>(null);
  const [editingSecurityRule, setEditingSecurityRule] = useState<AssistantSecurityRuleItem | null>(
    null,
  );
  const [securityRuleForm, setSecurityRuleForm] = useState<SecurityRuleFormState>(
    DEFAULT_SECURITY_RULE_FORM,
  );
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [isAddingSecurityRule, setIsAddingSecurityRule] = useState(false);
  const [knowledgeFormId, setKnowledgeFormId] = useState<string | null>(null);
  const [knowledgeFormType, setKnowledgeFormType] = useState<"TEXT" | "URL" | "CONVERSATION">(
    "TEXT",
  );
  const [knowledgeFormTitle, setKnowledgeFormTitle] = useState("");
  const [knowledgeFormContent, setKnowledgeFormContent] = useState("");
  const [knowledgeFormUrl, setKnowledgeFormUrl] = useState("");
  const [knowledgeFormStatus, setKnowledgeFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [preparingKnowledgeId, setPreparingKnowledgeId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const selectableAssistants = useMemo(
    () => filterOperationalAssistants(assistants, { includeInactive: true }),
    [assistants],
  );

  const selectedAssistant = useMemo(
    () => selectableAssistants.find((assistant) => assistant.id === selectedAssistantId) ?? null,
    [selectableAssistants, selectedAssistantId],
  );

  const publicationSummary = useMemo(
    () =>
      publicationChannels.map((channel) => ({
        ...channel,
        linkedToCurrentAssistant: channel.assistantId === selectedAssistantId,
        linkedToOtherAssistant:
          Boolean(channel.assistantId) && channel.assistantId !== selectedAssistantId,
      })),
    [publicationChannels, selectedAssistantId],
  );

  const currentFormData = useMemo(
    () => ({
      name,
      description,
      businessAddress,
      businessCityRegion,
      businessCity,
      businessState,
      businessPostalCode,
      businessPhone,
      businessWhatsapp,
      businessWhatsappSupport,
      websiteUrl,
      timezone,
      googleMapsUrl,
      latitude,
      longitude,
      weeklySchedule,
      aiAlwaysAvailable,
      initialMessage,
      ragEnabled,
      memoryEnabled,
      memoryPrePromptEnabled,
      memoryExtractionEnabled,
      memoryAllowedCategories,
      memoryConfidenceThreshold,
      memoryTempDefaultDays,
      memorySharedAcrossAssistants,
      status,
      instructions,
      personality,
      toneOfVoice,
      avoidPhrases,
      messageBufferEnabled,
      messageBufferSeconds,
      splitResponseEnabled,
      splitResponseStyle,
      model,
      temperature,
      noAnswerMessage,
      securityInstructions,
    }),
    [
      name,
      description,
      businessAddress,
      businessCityRegion,
      businessCity,
      businessState,
      businessPostalCode,
      businessPhone,
      businessWhatsapp,
      businessWhatsappSupport,
      websiteUrl,
      timezone,
      googleMapsUrl,
      latitude,
      longitude,
      weeklySchedule,
      aiAlwaysAvailable,
      initialMessage,
      ragEnabled,
      memoryEnabled,
      memoryPrePromptEnabled,
      memoryExtractionEnabled,
      memoryAllowedCategories,
      memoryConfidenceThreshold,
      memoryTempDefaultDays,
      memorySharedAcrossAssistants,
      status,
      instructions,
      personality,
      toneOfVoice,
      avoidPhrases,
      messageBufferEnabled,
      messageBufferSeconds,
      splitResponseEnabled,
      splitResponseStyle,
      model,
      temperature,
      noAnswerMessage,
      securityInstructions,
    ],
  );

  const [initialFormData, setInitialFormData] = useState<any>(currentFormData);
  const isDirty = useMemo(
    () => JSON.stringify(currentFormData) !== JSON.stringify(initialFormData),
    [currentFormData, initialFormData],
  );
  const businessHoursErrors = useMemo(
    () => validateBusinessHoursSchedule(weeklySchedule),
    [weeklySchedule],
  );

  const updateDayIntervals = (
    day: BusinessDayKey,
    intervals: BusinessHoursSchedule[BusinessDayKey],
  ) => {
    setWeeklySchedule((current) => ({
      ...current,
      [day]: intervals,
    }));
  };

  const toggleDayOpen = (day: BusinessDayKey, open: boolean) => {
    updateDayIntervals(day, open ? [{ start: "08:00", end: "18:00" }] : []);
  };

  const addDayInterval = (day: BusinessDayKey) => {
    const currentIntervals = weeklySchedule[day] ?? [];
    const fallbackStart = currentIntervals.at(-1)?.end ?? "13:30";
    updateDayIntervals(day, [...currentIntervals, { start: fallbackStart, end: "18:00" }]);
  };

  const updateDayInterval = (
    day: BusinessDayKey,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    updateDayIntervals(
      day,
      (weeklySchedule[day] ?? []).map((interval, intervalIndex) =>
        intervalIndex === index ? { ...interval, [field]: value } : interval,
      ),
    );
  };

  const removeDayInterval = (day: BusinessDayKey, index: number) => {
    updateDayIntervals(
      day,
      (weeklySchedule[day] ?? []).filter((_, intervalIndex) => intervalIndex !== index),
    );
  };

  const loadKnowledge = async (assistantId: string) => {
    if (!assistantId) {
      setKnowledge([]);
      return;
    }

    const items = await backendAssistantsService.knowledgeList(assistantId);
    setKnowledge(items);
  };

  const loadSecurityRules = async (assistantId: string) => {
    if (!assistantId) {
      setSecurityRules([]);
      setSecurityRulesError(null);
      return;
    }

    setSecurityRulesLoading(true);
    setSecurityRulesError(null);
    try {
      const items = await backendAssistantsService.securityRulesList(assistantId);
      setSecurityRules(items);
    } catch (err) {
      setSecurityRulesError(
        err instanceof Error ? err.message : "Não foi possível carregar as regras de segurança.",
      );
    } finally {
      setSecurityRulesLoading(false);
    }
  };

  const loadPublicationChannels = async () => {
    const items = await chatwootSettingsService.list();
    setPublicationChannels(items);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [companyResponse, assistantItems, channelItems] = await Promise.all([
          currentCompanyService.get(),
          backendAssistantsService.list(),
          chatwootSettingsService.list(),
        ]);

        if (cancelled) {
          return;
        }

        setCompany(companyResponse.company);
        setAssistants(assistantItems);
        setPublicationChannels(channelItems);
        const initialAssistantId = resolveOperationalAssistantId(
          assistantItems,
          search.assistantId,
          { includeInactive: true },
        );
        setSelectedAssistantId(initialAssistantId);
        if (!initialAssistantId) {
          setName("");
          setDescription("");
          setBusinessAddress("");
          setBusinessCityRegion("");
          setBusinessCity("");
          setBusinessState("");
          setBusinessPostalCode("");
          setBusinessPhone("");
          setBusinessWhatsapp("");
          setBusinessWhatsappSupport("");
          setWebsiteUrl("");
          setTimezone(companyResponse.company.timezone ?? "America/Sao_Paulo");
          setGoogleMapsUrl("");
          setLatitude("");
          setLongitude("");
          setWeeklySchedule(createDefaultBusinessHoursSchedule());
          setAiAlwaysAvailable(true);
          setPersonality("");
          setToneOfVoice("");
          setAvoidPhrases("");
          setMessageBufferEnabled(true);
          setMessageBufferSeconds(6);
          setSplitResponseEnabled(false);
          setSplitResponseStyle(DEFAULT_SPLIT_RESPONSE_STYLE);
          setStatus("ACTIVE");
          setRagEnabled(false);
          setKnowledge([]);

          setInitialFormData({
            name: "",
            description: "",
            businessAddress: "",
            businessCityRegion: "",
            businessCity: "",
            businessState: "",
            businessPostalCode: "",
            businessPhone: "",
            businessWhatsapp: "",
            businessWhatsappSupport: "",
            websiteUrl: "",
            timezone: companyResponse.company.timezone ?? "America/Sao_Paulo",
            googleMapsUrl: "",
            latitude: "",
            longitude: "",
            weeklySchedule: createDefaultBusinessHoursSchedule(),
            aiAlwaysAvailable: true,
            initialMessage: "",
            ragEnabled: false,
            status: "ACTIVE",
            instructions:
              "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
            personality: "",
            toneOfVoice: "",
            avoidPhrases: "",
            messageBufferEnabled: true,
            messageBufferSeconds: 6,
            splitResponseEnabled: false,
            splitResponseStyle: DEFAULT_SPLIT_RESPONSE_STYLE,
            model: "",
            temperature: null,
            noAnswerMessage: "",
            securityInstructions: "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o backend.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [search.assistantId]);

  const publishAssistantOnChannel = async (
    channel: ChatwootInboxConfigItem,
    nextValue: boolean,
  ) => {
    if (!selectedAssistantId) {
      toast.error("Salve o assistente antes de publicar em um canal.");
      return;
    }

    setPublicationSavingId(channel.id);
    try {
      await chatwootSettingsService.update(channel.id, {
        name: channel.name,
        baseUrl: channel.baseUrl,
        accountId: channel.accountId,
        inboxId: channel.inboxId,
        assistantId: nextValue ? selectedAssistantId : "",
        isActive: channel.isActive,
        ...(channel.metadataJson ? { metadataJson: channel.metadataJson } : {}),
      });
      await loadPublicationChannels();
      toast.success(
        nextValue
          ? `Assistente publicado em ${channel.name}.`
          : `Publicação removida de ${channel.name}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível atualizar a publicação do canal.",
      );
    } finally {
      setPublicationSavingId(null);
    }
  };

  useEffect(() => {
    if (!selectedAssistantId) {
      setKnowledge([]);
      setSecurityRules([]);
      setSecurityRulesError(null);
      return;
    }

    void (async () => {
      try {
        const assistant = await backendAssistantsService.get(selectedAssistantId);
        setName(assistant.name);
        setDescription(assistant.description ?? "");
        setBusinessAddress(assistant.businessAddress ?? "");
        setBusinessCityRegion(assistant.businessCityRegion ?? "");
        const parsedCityRegion = splitCityRegion(assistant.businessCityRegion);
        setBusinessCity(assistant.businessCity ?? parsedCityRegion.city);
        setBusinessState(assistant.businessState ?? parsedCityRegion.state);
        setBusinessPostalCode(assistant.businessPostalCode ?? "");
        setBusinessPhone(assistant.businessPhone ?? "");
        setBusinessWhatsapp(assistant.businessWhatsapp ?? "");
        setBusinessWhatsappSupport(assistant.businessWhatsappSupport ?? "");
        setWebsiteUrl(assistant.websiteUrl ?? "");
        setTimezone(assistant.timezone ?? company?.timezone ?? "America/Sao_Paulo");
        setGoogleMapsUrl(assistant.googleMapsUrl ?? "");
        setLatitude(
          assistant.latitude !== null && assistant.latitude !== undefined
            ? String(assistant.latitude)
            : "",
        );
        setLongitude(
          assistant.longitude !== null && assistant.longitude !== undefined
            ? String(assistant.longitude)
            : "",
        );
        setWeeklySchedule(normalizeBusinessHoursSchedule(assistant.weeklySchedule));
        setAiAlwaysAvailable(assistant.aiAlwaysAvailable ?? true);
        setInitialMessage(assistant.initialMessage ?? "");
        setInstructions(
          assistant.instructions ??
            "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
        );
        setPersonality(assistant.personality ?? "");
        setToneOfVoice(assistant.toneOfVoice ?? "");
        setAvoidPhrases(assistant.avoidPhrases ?? "");
        setModel(assistant.model ?? "");
        setTemperature(assistant.temperature ?? null);
        setNoAnswerMessage(assistant.fallbackMessage ?? "");
        setSecurityInstructions(assistant.safetyInstruction ?? "");
        setRagEnabled(assistant.ragEnabled ?? false);
        setMemoryEnabled(assistant.memoryEnabled ?? false);
        setMemoryPrePromptEnabled(assistant.memoryPrePromptEnabled ?? true);
        setMemoryExtractionEnabled(assistant.memoryExtractionEnabled ?? true);
        setMemoryAllowedCategories(
          assistant.memoryAllowedCategories ?? [
            "IDENTITY",
            "PREFERENCE",
            "BUSINESS_CONTEXT",
            "TEMPORARY_CONTEXT",
          ],
        );
        setMemoryConfidenceThreshold(assistant.memoryConfidenceThreshold ?? 0.7);
        setMemoryTempDefaultDays(assistant.memoryTempDefaultDays ?? 7);
        setMemorySharedAcrossAssistants(assistant.memorySharedAcrossAssistants ?? true);
        setConversationResetEnabled(assistant.conversationResetEnabled ?? false);
        setConversationResetKeywordsRaw(
          Array.isArray(assistant.conversationResetKeywords)
            ? assistant.conversationResetKeywords.join(", ")
            : "reset",
        );
        setConversationResetConfirmationMessage(
          assistant.conversationResetConfirmationMessage ??
            "🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?",
        );
        setConversationResetPreserveMemories(assistant.conversationResetPreserveMemories ?? true);
        setConversationResetSendInitialMessage(assistant.conversationResetSendInitialMessage ?? true);
        setMessageBufferEnabled(assistant.messageBufferEnabled ?? true);
        setMessageBufferSeconds(assistant.messageBufferSeconds ?? 6);
        setSplitResponseEnabled(assistant.splitResponseEnabled ?? false);
        setSplitResponseStyle(normalizeSplitResponseStyle(assistant.splitResponseStyle));
        setStatus(assistant.status);
        await loadKnowledge(selectedAssistantId);
        await loadSecurityRules(selectedAssistantId);

        setInitialFormData({
          name: assistant.name,
          description: assistant.description ?? "",
          businessAddress: assistant.businessAddress ?? "",
          businessCityRegion: assistant.businessCityRegion ?? "",
          businessCity: assistant.businessCity ?? parsedCityRegion.city,
          businessState: assistant.businessState ?? parsedCityRegion.state,
          businessPostalCode: assistant.businessPostalCode ?? "",
          businessPhone: assistant.businessPhone ?? "",
          businessWhatsapp: assistant.businessWhatsapp ?? "",
          businessWhatsappSupport: assistant.businessWhatsappSupport ?? "",
          websiteUrl: assistant.websiteUrl ?? "",
          timezone: assistant.timezone ?? company?.timezone ?? "America/Sao_Paulo",
          googleMapsUrl: assistant.googleMapsUrl ?? "",
          latitude:
            assistant.latitude !== null && assistant.latitude !== undefined
              ? String(assistant.latitude)
              : "",
          longitude:
            assistant.longitude !== null && assistant.longitude !== undefined
              ? String(assistant.longitude)
              : "",
          weeklySchedule: normalizeBusinessHoursSchedule(assistant.weeklySchedule),
          aiAlwaysAvailable: assistant.aiAlwaysAvailable ?? true,
          initialMessage: assistant.initialMessage ?? "",
          instructions:
            assistant.instructions ??
            "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
          personality: assistant.personality ?? "",
          toneOfVoice: assistant.toneOfVoice ?? "",
          avoidPhrases: assistant.avoidPhrases ?? "",
          model: assistant.model ?? "",
          temperature: assistant.temperature ?? null,
          noAnswerMessage: assistant.fallbackMessage ?? "",
          securityInstructions: assistant.safetyInstruction ?? "",
          ragEnabled: assistant.ragEnabled ?? false,
          memoryEnabled: assistant.memoryEnabled ?? false,
          memoryPrePromptEnabled: assistant.memoryPrePromptEnabled ?? true,
          memoryExtractionEnabled: assistant.memoryExtractionEnabled ?? true,
          memoryAllowedCategories:
            assistant.memoryAllowedCategories ?? [
              "IDENTITY",
              "PREFERENCE",
              "BUSINESS_CONTEXT",
              "TEMPORARY_CONTEXT",
            ],
          memoryConfidenceThreshold: assistant.memoryConfidenceThreshold ?? 0.7,
          memoryTempDefaultDays: assistant.memoryTempDefaultDays ?? 7,
          memorySharedAcrossAssistants: assistant.memorySharedAcrossAssistants ?? true,
          conversationResetEnabled: assistant.conversationResetEnabled ?? false,
          conversationResetKeywords: assistant.conversationResetKeywords ?? ["reset"],
          conversationResetConfirmationMessage: assistant.conversationResetConfirmationMessage ?? "🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?",
          conversationResetPreserveMemories: assistant.conversationResetPreserveMemories ?? true,
          conversationResetSendInitialMessage: assistant.conversationResetSendInitialMessage ?? true,
          messageBufferEnabled: assistant.messageBufferEnabled ?? true,
          messageBufferSeconds: assistant.messageBufferSeconds ?? 6,
          splitResponseEnabled: assistant.splitResponseEnabled ?? false,
          splitResponseStyle: normalizeSplitResponseStyle(assistant.splitResponseStyle),
          status: assistant.status,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível carregar o assistente.");
      }
    })();
  }, [selectedAssistantId, company?.timezone]);

  const handleCreateNew = () => {
    setSelectedAssistantId("");
    setName("");
    setDescription("");
    setBusinessAddress("");
    setBusinessCityRegion("");
    setBusinessCity("");
    setBusinessState("");
    setBusinessPostalCode("");
    setBusinessPhone("");
    setBusinessWhatsapp("");
    setBusinessWhatsappSupport("");
    setWebsiteUrl("");
    setTimezone(company?.timezone ?? "America/Sao_Paulo");
    setGoogleMapsUrl("");
    setLatitude("");
    setLongitude("");
    setWeeklySchedule(createDefaultBusinessHoursSchedule());
    setAiAlwaysAvailable(true);
    setInitialMessage("");
    setRagEnabled(false);
    setMemoryEnabled(false);
    setMemoryPrePromptEnabled(true);
    setMemoryExtractionEnabled(true);
    setMemoryAllowedCategories(["IDENTITY", "PREFERENCE", "BUSINESS_CONTEXT", "TEMPORARY_CONTEXT"]);
    setMemoryConfidenceThreshold(0.7);
    setMemoryTempDefaultDays(7);
    setMemorySharedAcrossAssistants(true);
    setConversationResetEnabled(false);
    setConversationResetKeywordsRaw("reset");
    setConversationResetConfirmationMessage(
      "🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?",
    );
    setConversationResetPreserveMemories(true);
    setConversationResetSendInitialMessage(true);
    setInstructions(
      "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
    );
    setPersonality("");
    setToneOfVoice("");
    setAvoidPhrases("");
    setMessageBufferEnabled(true);
    setMessageBufferSeconds(6);
    setSplitResponseEnabled(false);
    setSplitResponseStyle(DEFAULT_SPLIT_RESPONSE_STYLE);
    setModel("");
    setTemperature(null);
    setStatus("ACTIVE");
    setKnowledge([]);
    setPreviewResult(null);
    setNoAnswerMessage("");
    setSecurityInstructions("");
    setSecurityRules([]);
    setSecurityRulesError(null);
    setIsReviewConfirmed(false);

    setInitialFormData({
      name: "",
      description: "",
      businessAddress: "",
      businessCityRegion: "",
      businessCity: "",
      businessState: "",
      businessPostalCode: "",
      businessPhone: "",
      businessWhatsapp: "",
      businessWhatsappSupport: "",
      websiteUrl: "",
      timezone: company?.timezone ?? "America/Sao_Paulo",
      googleMapsUrl: "",
      latitude: "",
      longitude: "",
      weeklySchedule: createDefaultBusinessHoursSchedule(),
      aiAlwaysAvailable: true,
      initialMessage: "",
      ragEnabled: false,
      memoryEnabled: false,
      memoryPrePromptEnabled: true,
      memoryExtractionEnabled: true,
      memoryAllowedCategories: ["IDENTITY", "PREFERENCE", "BUSINESS_CONTEXT", "TEMPORARY_CONTEXT"],
      memoryConfidenceThreshold: 0.7,
      memoryTempDefaultDays: 7,
      memorySharedAcrossAssistants: true,
      conversationResetEnabled: false,
      conversationResetKeywords: ["reset"],
      conversationResetConfirmationMessage: "🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?",
      conversationResetPreserveMemories: true,
      conversationResetSendInitialMessage: true,
      status: "ACTIVE",
      instructions:
        "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
      personality: "",
      toneOfVoice: "",
      avoidPhrases: "",
      messageBufferEnabled: true,
      messageBufferSeconds: 6,
      splitResponseEnabled: false,
      splitResponseStyle: DEFAULT_SPLIT_RESPONSE_STYLE,
      model: "",
      temperature: null,
      noAnswerMessage: "",
      securityInstructions: "",
    });
  };

  const openCreateSecurityRule = () => {
    if (!selectedAssistantId) {
      toast.warning("Salve ou selecione um assistente antes de criar regras de segurança.");
      return;
    }

    setEditingSecurityRule(null);
    setSecurityRuleForm({
      ...DEFAULT_SECURITY_RULE_FORM,
      sortOrder: securityRules.length,
    });
    setIsAddingSecurityRule(true);
  };

  const openEditSecurityRule = (rule: AssistantSecurityRuleItem) => {
    setEditingSecurityRule(rule);
    setSecurityRuleForm({
      name: rule.name,
      ruleType: rule.ruleType,
      instruction: rule.instruction,
      sortOrder: rule.sortOrder,
    });
    setIsAddingSecurityRule(true);
  };

  const handleSaveSecurityRule = async () => {
    if (!selectedAssistantId) {
      toast.warning("Salve ou selecione um assistente antes de criar regras de segurança.");
      return;
    }

    if (!securityRuleForm.name.trim() || !securityRuleForm.instruction.trim()) {
      toast.error("Preencha nome e instrução da regra.");
      return;
    }

    const savingId = editingSecurityRule?.id ?? "new";
    setSecurityRuleSavingId(savingId);
    try {
      if (editingSecurityRule) {
        await backendAssistantsService.securityRuleUpdate(
          selectedAssistantId,
          editingSecurityRule.id,
          {
            name: securityRuleForm.name.trim(),
            ruleType: securityRuleForm.ruleType.trim(),
            instruction: securityRuleForm.instruction.trim(),
            sortOrder: securityRuleForm.sortOrder,
          },
        );
        toast.success("Regra de segurança atualizada.");
      } else {
        await backendAssistantsService.securityRuleCreate(selectedAssistantId, {
          name: securityRuleForm.name.trim(),
          ruleType: securityRuleForm.ruleType.trim(),
          instruction: securityRuleForm.instruction.trim(),
          sortOrder: securityRuleForm.sortOrder,
        });
        toast.success("Regra de segurança criada.");
      }

      setIsAddingSecurityRule(false);
      setEditingSecurityRule(null);
      setSecurityRuleForm(DEFAULT_SECURITY_RULE_FORM);
      await loadSecurityRules(selectedAssistantId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a regra.");
    } finally {
      setSecurityRuleSavingId(null);
    }
  };

  const toggleSecurityRuleStatus = async (rule: AssistantSecurityRuleItem, active: boolean) => {
    if (!selectedAssistantId) {
      return;
    }

    setSecurityRuleSavingId(rule.id);
    try {
      await backendAssistantsService.securityRuleUpdate(selectedAssistantId, rule.id, {
        status: active ? "ACTIVE" : "INACTIVE",
      });
      await loadSecurityRules(selectedAssistantId);
      toast.success(active ? "Regra ativada." : "Regra desativada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a regra.");
    } finally {
      setSecurityRuleSavingId(null);
    }
  };

  const removeSecurityRule = async (rule: AssistantSecurityRuleItem) => {
    if (!selectedAssistantId) {
      return;
    }

    if (!window.confirm(`Excluir a regra "${rule.name}"?`)) {
      return;
    }

    setSecurityRuleDeletingId(rule.id);
    try {
      await backendAssistantsService.securityRuleDelete(selectedAssistantId, rule.id);
      await loadSecurityRules(selectedAssistantId);
      toast.success("Regra excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a regra.");
    } finally {
      setSecurityRuleDeletingId(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    if (googleMapsUrl.trim() && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(googleMapsUrl.trim())) {
      toast.error(
        "O link do Google Maps deve ser uma URL válida (ex: https://maps.google.com/...)",
      );
      return;
    }
    if (websiteUrl.trim() && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(websiteUrl.trim())) {
      toast.error("O site deve ser uma URL válida (ex: https://empresa.com.br).");
      return;
    }
    if (!isValidIanaTimezone(timezone.trim())) {
      toast.error("Use um timezone IANA válido, como America/Campo_Grande ou America/Sao_Paulo.");
      return;
    }
    if (latitude.trim() && isNaN(Number(latitude))) {
      toast.error("A latitude deve ser um número válido.");
      return;
    }
    if (longitude.trim() && isNaN(Number(longitude))) {
      toast.error("A longitude deve ser um número válido.");
      return;
    }
    if (hasBusinessHoursValidationErrors(weeklySchedule)) {
      toast.error("Revise os horários de atendimento. Há intervalos inválidos ou sobrepostos.");
      return;
    }

    setSaving(true);
    try {
      const payloadLatitude = latitude.trim() ? parseFloat(latitude) : null;
      const payloadLongitude = longitude.trim() ? parseFloat(longitude) : null;
      const payloadCityRegion = buildCityRegion(businessCity, businessState, businessCityRegion);

      if (selectedAssistantId) {
        const updated = await backendAssistantsService.update(selectedAssistantId, {
          name: name.trim(),
          description: description.trim() || null,
          businessAddress: businessAddress.trim() || null,
          businessCityRegion: payloadCityRegion,
          businessCity: businessCity.trim() || null,
          businessState: businessState.trim() || null,
          businessPostalCode: businessPostalCode.trim() || null,
          businessPhone: businessPhone.trim() || null,
          businessWhatsapp: businessWhatsapp.trim() || null,
          businessWhatsappSupport: businessWhatsappSupport.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          timezone: timezone.trim(),
          googleMapsUrl: googleMapsUrl.trim() || null,
          latitude: payloadLatitude,
          longitude: payloadLongitude,
          weeklySchedule,
          aiAlwaysAvailable,
          initialMessage: initialMessage.trim() || null,
          instructions: instructions.trim() || null,
          personality: personality.trim() || null,
          toneOfVoice: toneOfVoice.trim() || null,
          avoidPhrases: avoidPhrases.trim() || null,
          model: model.trim() || null,
          temperature,
          fallbackMessage: noAnswerMessage.trim() || null,
          safetyInstruction: securityInstructions.trim() || null,
          ragEnabled,
          memoryEnabled,
          memoryPrePromptEnabled,
          memoryExtractionEnabled,
          memoryAllowedCategories,
          memoryConfidenceThreshold,
          memoryTempDefaultDays,
          memorySharedAcrossAssistants,
          messageBufferEnabled,
          messageBufferSeconds,
          splitResponseEnabled,
          splitResponseStyle,
          conversationResetEnabled,
          conversationResetKeywords: conversationResetKeywordsRaw
            .split(",")
            .map((kw) => kw.trim())
            .filter(Boolean),
          conversationResetConfirmationMessage: conversationResetConfirmationMessage.trim() || null,
          conversationResetPreserveMemories,
          conversationResetSendInitialMessage,
        });
        setAssistants((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        setName(updated.name);
        setDescription(updated.description ?? "");
        setBusinessAddress(updated.businessAddress ?? "");
        setBusinessCityRegion(updated.businessCityRegion ?? "");
        setBusinessCity(updated.businessCity ?? "");
        setBusinessState(updated.businessState ?? "");
        setBusinessPostalCode(updated.businessPostalCode ?? "");
        setBusinessPhone(updated.businessPhone ?? "");
        setBusinessWhatsapp(updated.businessWhatsapp ?? "");
        setBusinessWhatsappSupport(updated.businessWhatsappSupport ?? "");
        setWebsiteUrl(updated.websiteUrl ?? "");
        setTimezone(updated.timezone ?? company?.timezone ?? "America/Sao_Paulo");
        setGoogleMapsUrl(updated.googleMapsUrl ?? "");
        setLatitude(
          updated.latitude !== null && updated.latitude !== undefined
            ? String(updated.latitude)
            : "",
        );
        setLongitude(
          updated.longitude !== null && updated.longitude !== undefined
            ? String(updated.longitude)
            : "",
        );
        setWeeklySchedule(normalizeBusinessHoursSchedule(updated.weeklySchedule));
        setAiAlwaysAvailable(updated.aiAlwaysAvailable ?? true);
        setInitialMessage(updated.initialMessage ?? "");
        setInstructions(
          updated.instructions ??
            "Você é um assistente virtual prestativo e educado.\n\nEvite repetir frases de encerramento em sequência. Não finalize todas as respostas com 'é só me avisar' ou termos similares. Use encerramentos naturais e variados, e só ofereça nova ação quando isso ajudar o cliente.",
        );
        setPersonality(updated.personality ?? "");
        setToneOfVoice(updated.toneOfVoice ?? "");
        setAvoidPhrases(updated.avoidPhrases ?? "");
        setModel(updated.model ?? "");
        setTemperature(updated.temperature ?? null);
        setNoAnswerMessage(updated.fallbackMessage ?? "");
        setSecurityInstructions(updated.safetyInstruction ?? "");
        setRagEnabled(updated.ragEnabled ?? false);
        setMemoryEnabled(updated.memoryEnabled ?? false);
        setMemoryPrePromptEnabled(updated.memoryPrePromptEnabled ?? true);
        setMemoryExtractionEnabled(updated.memoryExtractionEnabled ?? true);
        setMemoryAllowedCategories(
          updated.memoryAllowedCategories ?? [
            "IDENTITY",
            "PREFERENCE",
            "BUSINESS_CONTEXT",
            "TEMPORARY_CONTEXT",
          ],
        );
        setMemoryConfidenceThreshold(updated.memoryConfidenceThreshold ?? 0.7);
        setMemoryTempDefaultDays(updated.memoryTempDefaultDays ?? 7);
        setMemorySharedAcrossAssistants(updated.memorySharedAcrossAssistants ?? true);
        setConversationResetEnabled(updated.conversationResetEnabled ?? false);
        setConversationResetKeywordsRaw(
          Array.isArray(updated.conversationResetKeywords)
            ? updated.conversationResetKeywords.join(", ")
            : "reset",
        );
        setConversationResetConfirmationMessage(
          updated.conversationResetConfirmationMessage ??
            "🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?",
        );
        setConversationResetPreserveMemories(updated.conversationResetPreserveMemories ?? true);
        setConversationResetSendInitialMessage(updated.conversationResetSendInitialMessage ?? true);
        setMessageBufferEnabled(updated.messageBufferEnabled ?? true);
        setMessageBufferSeconds(updated.messageBufferSeconds ?? 6);
        setSplitResponseEnabled(updated.splitResponseEnabled ?? false);
        setSplitResponseStyle(normalizeSplitResponseStyle(updated.splitResponseStyle));
        if (updated.status !== status) {
          const updatedStatus = await backendAssistantsService.updateStatus(
            selectedAssistantId,
            status,
          );
          setAssistants((items) =>
            items.map((item) => (item.id === updatedStatus.id ? updatedStatus : item)),
          );
        }

        setInitialFormData({
          name: updated.name,
          description: updated.description ?? "",
          businessAddress: updated.businessAddress ?? "",
          businessCityRegion: updated.businessCityRegion ?? "",
          businessCity: updated.businessCity ?? "",
          businessState: updated.businessState ?? "",
          businessPostalCode: updated.businessPostalCode ?? "",
          businessPhone: updated.businessPhone ?? "",
          businessWhatsapp: updated.businessWhatsapp ?? "",
          businessWhatsappSupport: updated.businessWhatsappSupport ?? "",
          websiteUrl: updated.websiteUrl ?? "",
          timezone: updated.timezone ?? company?.timezone ?? "America/Sao_Paulo",
          googleMapsUrl: updated.googleMapsUrl ?? "",
          latitude:
            updated.latitude !== null && updated.latitude !== undefined
              ? String(updated.latitude)
              : "",
          longitude:
            updated.longitude !== null && updated.longitude !== undefined
              ? String(updated.longitude)
              : "",
          weeklySchedule: normalizeBusinessHoursSchedule(updated.weeklySchedule),
          aiAlwaysAvailable: updated.aiAlwaysAvailable ?? true,
          initialMessage: updated.initialMessage ?? "",
          instructions: updated.instructions ?? "",
          personality: updated.personality ?? "",
          toneOfVoice: updated.toneOfVoice ?? "",
          avoidPhrases: updated.avoidPhrases ?? "",
          model: updated.model ?? "",
          temperature: updated.temperature ?? null,
          noAnswerMessage: updated.fallbackMessage ?? "",
          securityInstructions: updated.safetyInstruction ?? "",
          ragEnabled: updated.ragEnabled ?? false,
          memoryEnabled: updated.memoryEnabled ?? false,
          memoryPrePromptEnabled: updated.memoryPrePromptEnabled ?? true,
          memoryExtractionEnabled: updated.memoryExtractionEnabled ?? true,
          memoryAllowedCategories:
            updated.memoryAllowedCategories ?? [
              "IDENTITY",
              "PREFERENCE",
              "BUSINESS_CONTEXT",
              "TEMPORARY_CONTEXT",
            ],
          memoryConfidenceThreshold: updated.memoryConfidenceThreshold ?? 0.7,
          memoryTempDefaultDays: updated.memoryTempDefaultDays ?? 7,
          memorySharedAcrossAssistants: updated.memorySharedAcrossAssistants ?? true,
          conversationResetEnabled: updated.conversationResetEnabled ?? false,
          conversationResetKeywords: updated.conversationResetKeywords ?? ["reset"],
          conversationResetConfirmationMessage:
            updated.conversationResetConfirmationMessage ??
            "🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?",
          conversationResetPreserveMemories: updated.conversationResetPreserveMemories ?? true,
          conversationResetSendInitialMessage:
            updated.conversationResetSendInitialMessage ?? true,
          messageBufferEnabled: updated.messageBufferEnabled ?? true,
          messageBufferSeconds: updated.messageBufferSeconds ?? 6,
          splitResponseEnabled: updated.splitResponseEnabled ?? false,
          splitResponseStyle: normalizeSplitResponseStyle(updated.splitResponseStyle),
          status: status,
        });

        await behaviorTabRef.current?.saveBehavior(selectedAssistantId);

        toast.success("Agente salvo com sucesso.");
      } else {
        const created = await backendAssistantsService.create({
          name: name.trim(),
          description: description.trim() || null,
          businessAddress: businessAddress.trim() || null,
          businessCityRegion: payloadCityRegion,
          businessCity: businessCity.trim() || null,
          businessState: businessState.trim() || null,
          businessPostalCode: businessPostalCode.trim() || null,
          businessPhone: businessPhone.trim() || null,
          businessWhatsapp: businessWhatsapp.trim() || null,
          businessWhatsappSupport: businessWhatsappSupport.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          timezone: timezone.trim(),
          googleMapsUrl: googleMapsUrl.trim() || null,
          latitude: payloadLatitude,
          longitude: payloadLongitude,
          weeklySchedule,
          aiAlwaysAvailable,
          initialMessage: initialMessage.trim() || null,
          instructions: instructions.trim() || null,
          personality: personality.trim() || null,
          toneOfVoice: toneOfVoice.trim() || null,
          avoidPhrases: avoidPhrases.trim() || null,
          model: model.trim() || null,
          temperature,
          fallbackMessage: noAnswerMessage.trim() || null,
          safetyInstruction: securityInstructions.trim() || null,
          ragEnabled,
          memoryEnabled,
          memoryPrePromptEnabled,
          memoryExtractionEnabled,
          memoryAllowedCategories,
          memoryConfidenceThreshold,
          memoryTempDefaultDays,
          memorySharedAcrossAssistants,
          messageBufferEnabled,
          messageBufferSeconds,
          splitResponseEnabled,
          splitResponseStyle,
          conversationResetEnabled,
          conversationResetKeywords: conversationResetKeywordsRaw
            .split(",")
            .map((kw) => kw.trim())
            .filter(Boolean),
          conversationResetConfirmationMessage: conversationResetConfirmationMessage.trim() || null,
          conversationResetPreserveMemories,
          conversationResetSendInitialMessage,
        });
        setAssistants((items) => [created, ...items]);
        setSelectedAssistantId(created.id);
        setName(created.name);
        setDescription(created.description ?? "");
        setBusinessAddress(created.businessAddress ?? "");
        setBusinessCityRegion(created.businessCityRegion ?? "");
        setBusinessCity(created.businessCity ?? "");
        setBusinessState(created.businessState ?? "");
        setBusinessPostalCode(created.businessPostalCode ?? "");
        setBusinessPhone(created.businessPhone ?? "");
        setBusinessWhatsapp(created.businessWhatsapp ?? "");
        setBusinessWhatsappSupport(created.businessWhatsappSupport ?? "");
        setWebsiteUrl(created.websiteUrl ?? "");
        setTimezone(created.timezone ?? company?.timezone ?? "America/Sao_Paulo");
        setGoogleMapsUrl(created.googleMapsUrl ?? "");
        setLatitude(
          created.latitude !== null && created.latitude !== undefined
            ? String(created.latitude)
            : "",
        );
        setLongitude(
          created.longitude !== null && created.longitude !== undefined
            ? String(created.longitude)
            : "",
        );
        setWeeklySchedule(normalizeBusinessHoursSchedule(created.weeklySchedule));
        setInitialMessage(created.initialMessage ?? "");
        setInstructions(created.instructions ?? "");
        setModel(created.model ?? "");
        setTemperature(created.temperature ?? null);
        setNoAnswerMessage(created.fallbackMessage ?? "");
        setSecurityInstructions(created.safetyInstruction ?? "");
        setRagEnabled(created.ragEnabled ?? false);
        setMemoryEnabled(created.memoryEnabled ?? false);
        setMemoryPrePromptEnabled(created.memoryPrePromptEnabled ?? true);
        setMemoryExtractionEnabled(created.memoryExtractionEnabled ?? true);
        setMemoryAllowedCategories(
          created.memoryAllowedCategories ?? [
            "IDENTITY",
            "PREFERENCE",
            "BUSINESS_CONTEXT",
            "TEMPORARY_CONTEXT",
          ],
        );
        setMemoryConfidenceThreshold(created.memoryConfidenceThreshold ?? 0.7);
        setMemoryTempDefaultDays(created.memoryTempDefaultDays ?? 7);
        setMemorySharedAcrossAssistants(created.memorySharedAcrossAssistants ?? true);
        setConversationResetEnabled(created.conversationResetEnabled ?? false);
        setConversationResetKeywordsRaw(
          Array.isArray(created.conversationResetKeywords)
            ? created.conversationResetKeywords.join(", ")
            : "reset",
        );
        setConversationResetConfirmationMessage(
          created.conversationResetConfirmationMessage ??
            "🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?",
        );
        setConversationResetPreserveMemories(created.conversationResetPreserveMemories ?? true);
        setConversationResetSendInitialMessage(created.conversationResetSendInitialMessage ?? true);
        setStatus(created.status);
        await loadKnowledge(created.id);

        setInitialFormData({
          name: created.name,
          description: created.description ?? "",
          businessAddress: created.businessAddress ?? "",
          businessCityRegion: created.businessCityRegion ?? "",
          businessCity: created.businessCity ?? "",
          businessState: created.businessState ?? "",
          businessPostalCode: created.businessPostalCode ?? "",
          businessPhone: created.businessPhone ?? "",
          businessWhatsapp: created.businessWhatsapp ?? "",
          businessWhatsappSupport: created.businessWhatsappSupport ?? "",
          websiteUrl: created.websiteUrl ?? "",
          timezone: created.timezone ?? company?.timezone ?? "America/Sao_Paulo",
          googleMapsUrl: created.googleMapsUrl ?? "",
          latitude:
            created.latitude !== null && created.latitude !== undefined
              ? String(created.latitude)
              : "",
          longitude:
            created.longitude !== null && created.longitude !== undefined
              ? String(created.longitude)
              : "",
          weeklySchedule: normalizeBusinessHoursSchedule(created.weeklySchedule),
          aiAlwaysAvailable: created.aiAlwaysAvailable ?? true,
          initialMessage: created.initialMessage ?? "",
          instructions: created.instructions ?? "",
          personality: created.personality ?? "",
          toneOfVoice: created.toneOfVoice ?? "",
          avoidPhrases: created.avoidPhrases ?? "",
          model: created.model ?? "",
          temperature: created.temperature ?? null,
          noAnswerMessage: created.fallbackMessage ?? "",
          securityInstructions: created.safetyInstruction ?? "",
          ragEnabled: created.ragEnabled ?? false,
          memoryEnabled: created.memoryEnabled ?? false,
          memoryPrePromptEnabled: created.memoryPrePromptEnabled ?? true,
          memoryExtractionEnabled: created.memoryExtractionEnabled ?? true,
          memoryAllowedCategories:
            created.memoryAllowedCategories ?? [
              "IDENTITY",
              "PREFERENCE",
              "BUSINESS_CONTEXT",
              "TEMPORARY_CONTEXT",
            ],
          memoryConfidenceThreshold: created.memoryConfidenceThreshold ?? 0.7,
          memoryTempDefaultDays: created.memoryTempDefaultDays ?? 7,
          memorySharedAcrossAssistants: created.memorySharedAcrossAssistants ?? true,
          conversationResetEnabled: created.conversationResetEnabled ?? false,
          conversationResetKeywords: created.conversationResetKeywords ?? ["reset"],
          conversationResetConfirmationMessage: created.conversationResetConfirmationMessage ?? "🔄 Atendimento reiniciado. Mantive as informações importantes já registradas e comecei uma nova sessão. Como posso ajudar?",
          conversationResetPreserveMemories: created.conversationResetPreserveMemories ?? true,
          conversationResetSendInitialMessage: created.conversationResetSendInitialMessage ?? true,
          messageBufferEnabled: created.messageBufferEnabled ?? true,
          messageBufferSeconds: created.messageBufferSeconds ?? 6,
          splitResponseEnabled: created.splitResponseEnabled ?? false,
          splitResponseStyle: normalizeSplitResponseStyle(created.splitResponseStyle),
          status: created.status,
        });

        await behaviorTabRef.current?.saveBehavior(created.id);

        toast.success("Agente criado com sucesso.");
      }
      setIsReviewConfirmed(false);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar o agente. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedAssistantId) {
      return;
    }

    const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const updated = await backendAssistantsService.updateStatus(selectedAssistantId, nextStatus);
    setStatus(updated.status);
    setAssistants((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handlePreview = async () => {
    if (!selectedAssistantId || !previewQuestion.trim()) {
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await backendAssistantsService.preview(
        selectedAssistantId,
        previewQuestion,
        usePreparedKnowledge,
      );
      setPreviewResult(response);
    } finally {
      setPreviewLoading(false);
    }
  };

  const isActive = status === "ACTIVE";

  const getTemperatureDescription = (temp: number | null) => {
    if (temp === null) return "Padrão do sistema";
    if (temp <= 0.2) return "Mais objetiva, segura e direta";
    if (temp <= 0.5) return "Equilibrada";
    if (temp <= 0.8) return "Mais criativa e flexível";
    return "Muito criativa, com maior risco de fugir do padrão";
  };

  const handleOpenNewKnowledge = () => {
    setKnowledgeFormId(null);
    setKnowledgeFormType("TEXT");
    setKnowledgeFormTitle("");
    setKnowledgeFormContent("");
    setKnowledgeFormUrl("");
    setKnowledgeFormStatus("ACTIVE");
    setIsAddingKnowledge(true);
  };

  const handleOpenEditKnowledge = (item: BackendAssistantKnowledgeItem) => {
    setKnowledgeFormId(item.id);
    setKnowledgeFormType(item.metadata?.type || "TEXT");
    setKnowledgeFormTitle(item.title);
    setKnowledgeFormContent(item.content);
    setKnowledgeFormUrl(item.metadata?.sourceUrl || "");
    setKnowledgeFormStatus(item.status === "ACTIVE" ? "ACTIVE" : "INACTIVE");
    setIsAddingKnowledge(true);
  };

  const handleSaveKnowledge = async () => {
    if (!knowledgeFormTitle.trim() || !knowledgeFormContent.trim() || !selectedAssistantId) {
      return;
    }

    setKnowledgeSaving(true);
    try {
      if (knowledgeFormId) {
        await backendAssistantsService.knowledgeUpdate(selectedAssistantId, knowledgeFormId, {
          title: knowledgeFormTitle.trim(),
          content: knowledgeFormContent.trim(),
          status: knowledgeFormStatus,
          metadata: {
            type: knowledgeFormType,
            ...(knowledgeFormType === "URL" ? { sourceUrl: knowledgeFormUrl.trim() } : {}),
          },
        });
      } else {
        await backendAssistantsService.knowledgeCreate(selectedAssistantId, {
          title: knowledgeFormTitle.trim(),
          content: knowledgeFormContent.trim(),
          metadata: {
            type: knowledgeFormType,
            ...(knowledgeFormType === "URL" ? { sourceUrl: knowledgeFormUrl.trim() } : {}),
          },
        });
      }
      await loadKnowledge(selectedAssistantId);
      setIsAddingKnowledge(false);
    } catch (err) {
      alert("Erro ao salvar conhecimento: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setKnowledgeSaving(false);
    }
  };

  const handlePrepareForAI = async (item: BackendAssistantKnowledgeItem) => {
    if (!selectedAssistantId) return;

    if (item.status === "INACTIVE") {
      alert("Ative este conhecimento antes de prepará-lo para a IA.");
      return;
    }

    setPreparingKnowledgeId(item.id);
    try {
      await backendAssistantsService.knowledgePrepare(selectedAssistantId, item.id);
      await loadKnowledge(selectedAssistantId);
      // alert("Conhecimento preparado com sucesso!");
    } catch (err) {
      alert("Erro ao preparar conhecimento: " + (err instanceof Error ? err.message : String(err)));
      await loadKnowledge(selectedAssistantId); // Recarrega para mostrar o status de ERRO
    } finally {
      setPreparingKnowledgeId(null);
    }
  };

  const activeKnowledgeCount = knowledge.filter((k) => k.status === "ACTIVE").length;
  const readyKnowledgeCount = knowledge.filter(
    (k) => k.status === "ACTIVE" && k.processingStatus === "READY",
  ).length;
  const errorKnowledgeCount = knowledge.filter(
    (k) => k.status === "ACTIVE" && k.processingStatus === "ERROR",
  ).length;
  const draftKnowledgeCount = knowledge.filter(
    (k) => k.status === "ACTIVE" && k.processingStatus === "DRAFT",
  ).length;

  const handleSearchKnowledge = async () => {
    if (!selectedAssistantId) return;
    if (!searchQuery.trim()) {
      alert("Digite uma pergunta para testar.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      const response = await backendAssistantsService.knowledgeSearch(
        selectedAssistantId,
        searchQuery,
      );
      setSearchResults(response.results);
      if (response.results.length === 0) {
        setSearchError("Nenhum conhecimento preparado foi encontrado para essa pergunta.");
      }
    } catch (err) {
      setSearchError(
        "Erro ao buscar conhecimento: " + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Criar / Editar Agente"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild size="sm">
              <Link to="/agentes">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Link>
            </Button>
            {selectedAssistantId && (
              <div className="flex items-center gap-2 mr-2">
                <StatusBadge status={isActive ? "ativo" : "pausado"} />
                <Button
                  variant={isActive ? "outline" : "destructive"}
                  onClick={handleToggleStatus}
                  size="sm"
                >
                  {isActive ? (
                    <Pause className="h-4 w-4 mr-1" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-1" />
                  )}
                  {isActive ? "Inativar" : "Ativar"}
                </Button>
              </div>
            )}
            <Button onClick={() => void handleSave()} disabled={saving || !name.trim()} size="sm">
              <Save className="h-4 w-4 mr-1" />{" "}
              {saving ? "Salvando..." : selectedAssistantId ? "Salvar" : "Criar"}
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingState label="Carregando assistente real…" />
      ) : error ? (
        <ErrorState
          title="Não foi possível carregar o assistente"
          description={error}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="p-4 grid gap-4 max-w-md">
              <Field label="Selecionar assistente">
                <Select
                  value={selectedAssistantId || "new"}
                  onValueChange={(value) => {
                    if (value === "new") {
                      handleCreateNew();
                    } else {
                      setSelectedAssistantId(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Novo assistente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo assistente</SelectItem>
                    {selectableAssistants.map((assistant) => (
                      <SelectItem key={assistant.id} value={assistant.id}>
                        {assistant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Tabs defaultValue="info">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="comportamento">Comportamento</TabsTrigger>
              <TabsTrigger value="fluxos">Fluxos</TabsTrigger>
              <TabsTrigger value="prompt">Regras Globais</TabsTrigger>
              <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
              <TabsTrigger value="ferramentas">Ferramentas</TabsTrigger>
              <TabsTrigger value="memoria">Memória</TabsTrigger>
              <TabsTrigger value="seguranca">Regras de Segurança</TabsTrigger>
              <TabsTrigger value="publicacao">Publicação</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardContent className="p-6 grid gap-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Nome do assistente">
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </Field>
                    <Field label="Empresa atual">
                      <Input value={company?.name ?? "Tenant atual"} disabled />
                    </Field>
                    <Field label="Sobre a empresa" className="md:col-span-2">
                      <Textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ex: Clube de Padel e Beach Tennis com restaurante, área kids e locação de quadras."
                      />
                    </Field>
                    <div className="md:col-span-2 pt-4 border-t space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Localização</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => {
                            if (googleMapsUrl.trim()) {
                              window.open(googleMapsUrl.trim(), "_blank");
                            } else {
                              toast.warning(
                                "Adicione um link do Google Maps para testar a localização.",
                              );
                            }
                          }}
                        >
                          Testar localização
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use o link do Google Maps para que o agente possa enviar a localização
                        quando o cliente perguntar onde fica a empresa.
                      </p>

                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        <Field label="Endereço" className="md:col-span-2">
                          <Input
                            value={businessAddress}
                            onChange={(e) => setBusinessAddress(e.target.value)}
                            placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                          />
                        </Field>
                        <Field label="Cidade">
                          <Input
                            value={businessCity}
                            onChange={(e) => setBusinessCity(e.target.value)}
                            placeholder="Ex: Dourados"
                          />
                        </Field>
                        <Field label="Estado / UF">
                          <Input
                            value={businessState}
                            onChange={(e) => setBusinessState(e.target.value)}
                            placeholder="Ex: MS"
                          />
                        </Field>
                        <Field label="CEP">
                          <Input
                            value={businessPostalCode}
                            onChange={(e) => setBusinessPostalCode(e.target.value)}
                            placeholder="Ex: 79800-000"
                          />
                        </Field>
                        <Field label="Cidade / Região (legado)">
                          <Input
                            value={businessCityRegion}
                            onChange={(e) => setBusinessCityRegion(e.target.value)}
                            placeholder="Ex: Dourados, MS"
                          />
                        </Field>
                        <Field label="Fuso horário da empresa" className="md:col-span-2">
                          <Input
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            placeholder="Ex: America/Campo_Grande"
                          />
                          <p className="text-xs text-muted-foreground">
                            Usado para responder corretamente perguntas sobre horário de
                            funcionamento, abertura, fechamento, almoço, coleta e disponibilidade.
                          </p>
                        </Field>
                        <Field label="Link do Google Maps" className="md:col-span-2">
                          <Input
                            value={googleMapsUrl}
                            onChange={(e) => setGoogleMapsUrl(e.target.value)}
                            placeholder="Ex: https://maps.app.goo.gl/..."
                          />
                        </Field>
                        <Field label="Latitude">
                          <Input
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            placeholder="Ex: -23.561684"
                          />
                        </Field>
                        <Field label="Longitude">
                          <Input
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            placeholder="Ex: -46.655981"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-4">
                    <h3 className="text-lg font-semibold">Contatos oficiais</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Telefone">
                        <Input
                          value={businessPhone}
                          onChange={(e) => setBusinessPhone(e.target.value)}
                          placeholder="Ex: (67) 3422-0000"
                        />
                      </Field>
                      <Field label="WhatsApp principal">
                        <Input
                          value={businessWhatsapp}
                          onChange={(e) => setBusinessWhatsapp(e.target.value)}
                          placeholder="Ex: (67) 99999-9999"
                        />
                      </Field>
                      <Field label="WhatsApp assistência">
                        <Input
                          value={businessWhatsappSupport}
                          onChange={(e) => setBusinessWhatsappSupport(e.target.value)}
                          placeholder="Ex: (67) 98888-8888"
                        />
                      </Field>
                      <Field label="Site">
                        <Input
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="Ex: https://www.empresa.com.br"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-4">
                    <h3 className="text-lg font-semibold">Horário de atendimento</h3>

                    <div className="flex items-center justify-between bg-secondary/20 p-4 rounded-lg border">
                      <div className="space-y-0.5 max-w-[80%]">
                        <Label
                          htmlFor="ai-always-available"
                          className="text-base font-medium cursor-pointer"
                        >
                          IA responde fora do horário de atendimento
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {aiAlwaysAvailable
                            ? "Quando ativado, a IA pode responder clientes mesmo fora do horário oficial da empresa. Isso não altera o horário de funcionamento da empresa."
                            : "Quando desativado, fora do horário oficial a IA pode usar a mensagem de indisponibilidade configurada."}
                        </p>
                      </div>
                      <Switch
                        id="ai-always-available"
                        checked={aiAlwaysAvailable}
                        onCheckedChange={setAiAlwaysAvailable}
                      />
                    </div>

                    <div className="grid gap-4">
                      {BUSINESS_DAYS.map((day) => {
                        const intervals = weeklySchedule[day.id] ?? [];
                        const isOpen = intervals.length > 0;

                        return (
                          <div key={day.id} className="rounded-lg border bg-card p-4 space-y-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="font-medium">{day.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {isOpen ? "Aberto" : "Fechado"}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Label htmlFor={`open-${day.id}`} className="text-sm">
                                  Aberto
                                </Label>
                                <Switch
                                  id={`open-${day.id}`}
                                  checked={isOpen}
                                  onCheckedChange={(checked) => toggleDayOpen(day.id, checked)}
                                />
                              </div>
                            </div>

                            {isOpen && (
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateDayIntervals(
                                        day.id,
                                        collapseToContinuousInterval(intervals),
                                      )
                                    }
                                  >
                                    Não fecha para almoço
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addDayInterval(day.id)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar intervalo
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {intervals.map((interval, index) => (
                                    <div
                                      key={`${day.id}-${index}`}
                                      className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-end"
                                    >
                                      <Field label={`Intervalo ${index + 1}`} className="md:w-40">
                                        <Input
                                          type="time"
                                          value={interval.start}
                                          onChange={(e) =>
                                            updateDayInterval(
                                              day.id,
                                              index,
                                              "start",
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </Field>
                                      <Field label="Até" className="md:w-40">
                                        <Input
                                          type="time"
                                          value={interval.end}
                                          onChange={(e) =>
                                            updateDayInterval(day.id, index, "end", e.target.value)
                                          }
                                        />
                                      </Field>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeDayInterval(day.id, index)}
                                        className="md:mb-0.5"
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Remover
                                      </Button>
                                    </div>
                                  ))}
                                </div>

                                {businessHoursErrors[day.id] && (
                                  <p className="text-xs text-red-600">
                                    {businessHoursErrors[day.id]}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comportamento">
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {/* Top section: AI settings */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Modelo da IA">
                        <Input
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="Opcional. Se vazio, usa o modelo padrão do backend."
                        />
                      </Field>
                      <Field label="Criatividade da resposta (Temperatura)">
                        <div className="space-y-3 pt-2">
                          <Slider
                            value={[temperature ?? 0.2]}
                            min={0}
                            max={1}
                            step={0.1}
                            onValueChange={(vals) => setTemperature(vals[0])}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{temperature ?? 0.2}</span>
                            <span>{getTemperatureDescription(temperature ?? 0.2)}</span>
                          </div>
                        </div>
                      </Field>
                      <Field label="Tom de voz">
                        <Select
                          value={toneOfVoice || "Profissional"}
                          onValueChange={(val) => setToneOfVoice(val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tom de voz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Profissional">Profissional</SelectItem>
                            <SelectItem value="Amigável">Amigável</SelectItem>
                            <SelectItem value="Descontraído">Descontraído</SelectItem>
                            <SelectItem value="Consultivo">Consultivo</SelectItem>
                            <SelectItem value="Objetivo">Objetivo</SelectItem>
                            <SelectItem value="Formal">Formal</SelectItem>
                            <SelectItem value="Personalizado">Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Personalidade da IA">
                        <Input
                          value={personality}
                          onChange={(e) => setPersonality(e.target.value)}
                          placeholder="Ex: Atendente simpática, objetiva, prestativa..."
                        />
                      </Field>
                    </div>

                    {/* Message Behavior */}
                    <div className="p-4 border rounded-lg bg-secondary/10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Label
                            htmlFor="message-buffer"
                            className="text-base font-semibold cursor-pointer"
                          >
                            Comportamento de mensagens
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Aguardar mensagens antes de responder (evita que o agente responda
                            várias vezes quando o cliente manda mensagens quebradas).
                          </p>
                        </div>
                        <Switch
                          id="message-buffer"
                          checked={messageBufferEnabled}
                          onCheckedChange={setMessageBufferEnabled}
                        />
                      </div>
                      {messageBufferEnabled && (
                        <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-secondary/20">
                          <Field label={`Tempo de espera: ${messageBufferSeconds} segundos`}>
                            <Slider
                              value={[messageBufferSeconds]}
                              min={3}
                              max={20}
                              step={1}
                              onValueChange={(vals) => setMessageBufferSeconds(vals[0])}
                            />
                          </Field>
                          <Field label="Estilo da resposta">
                            <Select
                              value={splitResponseStyle}
                              onValueChange={(val) =>
                                setSplitResponseStyle(normalizeSplitResponseStyle(val))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o estilo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SINGLE">Mensagem Única</SelectItem>
                                <SelectItem value="NATURAL_BLOCKS">
                                  Blocos Naturais (Separados)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      )}
                    </div>

                    <Field
                      label="Mensagem inicial"
                      helper="Opcional. Ao criar uma conversa nova, essa mensagem aparece como a primeira resposta."
                    >
                      <Textarea
                        rows={2}
                        value={initialMessage}
                        onChange={(e) => setInitialMessage(e.target.value)}
                        placeholder="Olá! Sou seu assistente. Como posso ajudar?"
                      />
                    </Field>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem
                        value="fallback-message"
                        className="border rounded-lg px-4 py-1 bg-secondary/5"
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex flex-col text-left space-y-1">
                            <span className="font-semibold text-sm">
                              Mensagem quando não souber responder
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">
                              {noAnswerMessage
                                ? noAnswerMessage.substring(0, 80) +
                                  (noAnswerMessage.length > 80 ? "..." : "")
                                : "Resposta padrão quando a IA não encontra informação."}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                          <p className="text-xs text-muted-foreground mb-3">
                            Mensagem usada quando o agente não tiver informação suficiente para
                            responder.
                          </p>
                          <Textarea
                            rows={3}
                            value={noAnswerMessage}
                            onChange={(e) => setNoAnswerMessage(e.target.value)}
                            placeholder="Infelizmente, não tenho essa informação..."
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <AssistantBehaviorTab assistantId={selectedAssistantId} ref={behaviorTabRef} />
              </div>
            </TabsContent>

            <TabsContent value="fluxos">
              <AssistantFlowsTab assistantId={selectedAssistantId} />
            </TabsContent>

            <TabsContent value="prompt">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                    <p className="text-sm text-primary">
                      <strong>Dica:</strong> Use esta área apenas para regras que valem para todo o
                      atendimento. Informações específicas da empresa devem ir na Base de
                      Conhecimento. Regras por assunto devem ir em Fluxos.
                    </p>
                  </div>

                  <Field
                    label="Instruções principais do agente"
                    helper="Define a personalidade, função e regras primárias do agente."
                  >
                    <Textarea
                      rows={12}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Você é um atendente da Cubo.Chat..."
                    />
                  </Field>

                  {/* Advanced Settings Accordion */}
                  <div className="pt-6 border-t mt-6">
                    <h3 className="text-lg font-semibold mb-4">Regras Avançadas</h3>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem
                        value="avoid-phrases"
                        className="border rounded-lg mb-3 px-4 py-1 bg-secondary/5"
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex flex-col text-left space-y-1">
                            <span className="font-semibold text-sm">Frases a evitar</span>
                            <span className="text-xs text-muted-foreground font-normal">
                              {avoidPhrases
                                ? "Evita repetições configuradas."
                                : "Evita repetições como 'é só me avisar'."}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                          <p className="text-xs text-muted-foreground mb-3">
                            Liste frases, vícios de linguagem ou encerramentos que o agente deve
                            evitar repetir.
                          </p>
                          <Textarea
                            rows={3}
                            value={avoidPhrases}
                            onChange={(e) => setAvoidPhrases(e.target.value)}
                            placeholder="Ex: Evite repetir a mesma frase de encerramento em todas as respostas. Não finalize sempre com 'é só me avisar'. Varie naturalmente os encerramentos e só ofereça ajuda extra quando fizer sentido."
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem
                        value="guardrails"
                        className="border rounded-lg px-4 py-1 bg-secondary/5"
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex flex-col text-left space-y-1">
                            <span className="font-semibold text-sm">Guardrails básicos</span>
                            <span className="text-xs text-muted-foreground font-normal">
                              Limites obrigatórios incorporados ao comportamento do agente.
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                          <p className="text-xs text-muted-foreground mb-3">
                            Defina limites obrigatórios, como não inventar informações, não expor
                            dados internos e transferir para humano quando necessário.
                          </p>
                          <Textarea
                            rows={4}
                            value={securityInstructions}
                            onChange={(e) => setSecurityInstructions(e.target.value)}
                            placeholder="Regras de segurança incorporadas ao prompt."
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10 mt-6">
                    <div className="space-y-0.5 max-w-[80%]">
                      <Label
                        htmlFor="use-rag-production"
                        className="text-base font-medium cursor-pointer"
                      >
                        Usar conhecimento preparado no atendimento real
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Busca respostas baseadas nos arquivos de conhecimento antes de responder ao
                        cliente.
                      </p>
                      {ragEnabled &&
                        knowledge.filter(
                          (k) => k.status === "ACTIVE" && k.processingStatus === "READY",
                        ).length === 0 && (
                          <div className="text-amber-600 text-xs mt-2 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Você não possui conhecimentos ATIVOS e PREPARADOS. O agente responderá
                            normalmente sem contexto até que os arquivos estejam prontos.
                          </div>
                        )}
                    </div>
                    <Switch
                      id="use-rag-production"
                      checked={ragEnabled}
                      onCheckedChange={setRagEnabled}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conhecimento">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Conhecimentos do agente</CardTitle>
                  <Dialog open={isAddingKnowledge} onOpenChange={setIsAddingKnowledge}>
                    <Button
                      size="sm"
                      onClick={handleOpenNewKnowledge}
                      disabled={!selectedAssistantId}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar conhecimento
                    </Button>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>
                          {knowledgeFormId ? "Editar Conhecimento" : "Adicionar Conhecimento"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <Field label="Título">
                          <Input
                            value={knowledgeFormTitle}
                            onChange={(e) => setKnowledgeFormTitle(e.target.value)}
                          />
                        </Field>
                        <Field label="Tipo de conhecimento">
                          <Select
                            value={knowledgeFormType}
                            onValueChange={(val: any) => setKnowledgeFormType(val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TEXT">Texto manual</SelectItem>
                              <SelectItem value="URL">URL (Site)</SelectItem>
                              <SelectItem value="CONVERSATION">Conversa de exemplo</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        {knowledgeFormType === "URL" && (
                          <Field label="URL">
                            <Input
                              placeholder="https://exemplo.com/faq"
                              value={knowledgeFormUrl}
                              onChange={(e) => setKnowledgeFormUrl(e.target.value)}
                            />
                          </Field>
                        )}
                        <Field label="Conteúdo (Base para a IA ler)">
                          <Textarea
                            rows={6}
                            value={knowledgeFormContent}
                            onChange={(e) => setKnowledgeFormContent(e.target.value)}
                          />
                        </Field>
                        {knowledgeFormId && (
                          <div className="flex items-center gap-2 mt-2">
                            <Checkbox
                              id="knowledge-active"
                              checked={knowledgeFormStatus === "ACTIVE"}
                              onCheckedChange={(c) =>
                                setKnowledgeFormStatus(c ? "ACTIVE" : "INACTIVE")
                              }
                            />
                            <Label htmlFor="knowledge-active">
                              Este conhecimento está ativo e liberado para uso
                            </Label>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 border-l-2 pl-3 border-amber-300">
                          Este conteúdo ficará salvo na base de conhecimento do agente. A preparação
                          para a IA ler e analisar o texto será feita na próxima etapa.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddingKnowledge(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => void handleSaveKnowledge()}
                          disabled={
                            knowledgeSaving ||
                            !knowledgeFormTitle.trim() ||
                            !knowledgeFormContent.trim()
                          }
                        >
                          {knowledgeSaving ? "Salvando..." : "Salvar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3">
                  {!selectedAssistantId ? (
                    <EmptyState
                      title="Agente não salvo"
                      description="Salve o agente primeiro antes de adicionar conhecimentos."
                    />
                  ) : knowledge.length === 0 ? (
                    <EmptyState
                      title="Sem conhecimento carregado"
                      description="Adicione conhecimentos para que o agente tenha contexto sobre sua empresa."
                    />
                  ) : (
                    knowledge.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-medium cursor-pointer hover:underline"
                            onClick={() => handleOpenEditKnowledge(item)}
                          >
                            {item.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-muted rounded-md border">
                              {item.metadata?.type === "URL"
                                ? "URL"
                                : item.metadata?.type === "CONVERSATION"
                                  ? "Conversa de Exemplo"
                                  : "Texto Manual"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Atualizado em {new Date(item.updatedAt).toLocaleDateString()}
                            </span>
                            {item.processingStatus === "READY" && (
                              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                                Pronto para IA
                              </span>
                            )}
                            {item.processingStatus === "PROCESSING" && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                                Processando...
                              </span>
                            )}
                            {item.processingStatus === "ERROR" && (
                              <span
                                className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-md"
                                title={item.processingError || "Erro desconhecido"}
                              >
                                Erro
                              </span>
                            )}
                            {item.processingStatus === "DRAFT" && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md">
                                Pendente
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={item.status === "ACTIVE" ? "ativo" : "pausado"} />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handlePrepareForAI(item)}
                            disabled={
                              preparingKnowledgeId === item.id || item.status === "INACTIVE"
                            }
                            title="A preparação organiza o conteúdo para que a IA encontre as informações durante o atendimento."
                          >
                            {preparingKnowledgeId === item.id
                              ? "Preparando..."
                              : item.processingStatus === "ERROR"
                                ? "Tentar Novamente"
                                : item.processingStatus === "READY"
                                  ? "Atualizar preparação"
                                  : "Preparar conhecimento"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditKnowledge(item)}
                          >
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="pt-4 border-t flex justify-end">
                    <Button asChild variant="outline">
                      <Link to="/conhecimento">
                        <Link2 className="h-4 w-4 mr-2" /> Gerenciar Base de Conhecimento
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* RAG Test Area */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Testar busca no conhecimento</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use este teste para ver se a IA encontra informações dentro dos conhecimentos
                    preparados.
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  {readyKnowledgeCount === 0 ? (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">
                        Você precisa ter pelo menos um conhecimento preparado (Pronto) para testar a
                        busca.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite uma pergunta para testar a busca..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearchKnowledge()}
                        />
                        <Button
                          onClick={() => void handleSearchKnowledge()}
                          disabled={isSearching || !searchQuery.trim()}
                        >
                          {isSearching ? "Buscando..." : "Buscar relevante"}
                        </Button>
                      </div>

                      {searchError && (
                        <div className="text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-lg">
                          {searchError}
                        </div>
                      )}

                      {searchResults && searchResults.length > 0 && (
                        <div className="space-y-3 mt-4">
                          <div className="text-sm font-medium">Resultados encontrados:</div>
                          {searchResults.map((res, i) => (
                            <div
                              key={res.chunkId}
                              className="p-3 border rounded-lg bg-muted/20 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">
                                  #{i + 1} - {res.knowledgeTitle}
                                </div>
                                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-semibold">
                                  Score: {(res.score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground italic border-l-2 pl-2">
                                "{res.contentPreview}"
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ferramentas">
              <Card>
                <CardContent className="p-6">
                  <AssistantToolsTab assistantId={selectedAssistantId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="memoria">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Memória Inteligente do contato</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    A memória só é usada quando você ativar explicitamente. Assistentes antigos não
                    passam a salvar dados automaticamente.
                  </p>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Armazenamos apenas fatos úteis para futuras conversas. Dados sensíveis,
                    credenciais, OTP, cartões, documentos completos e texto com tentativa de mudar
                    regras são bloqueados no backend.
                  </div>

                  <div className="rounded-xl border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-base font-semibold cursor-pointer">
                          Habilitar memória para este assistente
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Quando desativado, o runtime não carrega nem extrai memória.
                        </p>
                      </div>
                      <Switch checked={memoryEnabled} onCheckedChange={setMemoryEnabled} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <Label className="cursor-pointer">Usar memória antes de responder</Label>
                          <p className="text-xs text-muted-foreground">
                            Injeta memórias relevantes no contexto do prompt.
                          </p>
                        </div>
                        <Switch
                          checked={memoryPrePromptEnabled}
                          onCheckedChange={setMemoryPrePromptEnabled}
                          disabled={!memoryEnabled}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <Label className="cursor-pointer">Extrair memória automaticamente</Label>
                          <p className="text-xs text-muted-foreground">
                            Analisa mensagens do contato ao final do atendimento.
                          </p>
                        </div>
                        <Switch
                          checked={memoryExtractionEnabled}
                          onCheckedChange={setMemoryExtractionEnabled}
                          disabled={!memoryEnabled}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                        <div>
                          <Label className="cursor-pointer">
                            Compartilhar memória com outros assistentes da empresa
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Desative para usar somente memória criada neste assistente.
                          </p>
                        </div>
                        <Switch
                          checked={memorySharedAcrossAssistants}
                          onCheckedChange={setMemorySharedAcrossAssistants}
                          disabled={!memoryEnabled}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
                    <div className="rounded-xl border p-4 space-y-4">
                      <div>
                        <Label className="text-base font-semibold">Categorias permitidas</Label>
                        <p className="text-sm text-muted-foreground">
                          O extrator só poderá salvar memórias destas categorias.
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {MEMORY_CATEGORY_OPTIONS.map((option) => {
                          const checked = memoryAllowedCategories.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className={`flex items-start gap-3 rounded-lg border p-3 ${checked ? "border-primary/40 bg-primary/5" : ""} ${!memoryEnabled ? "opacity-60" : ""}`}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={!memoryEnabled}
                                onCheckedChange={(nextChecked) => {
                                  setMemoryAllowedCategories((current) => {
                                    if (nextChecked) {
                                      return current.includes(option.value)
                                        ? current
                                        : [...current, option.value];
                                    }
                                    const next = current.filter((value) => value !== option.value);
                                    return next.length > 0 ? next : current;
                                  });
                                }}
                              />
                              <div>
                                <div className="font-medium text-sm">{option.label}</div>
                                <div className="text-xs text-muted-foreground">{option.value}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl border p-4 space-y-5">
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">
                          Limiar mínimo de confiança: {memoryConfidenceThreshold.toFixed(2)}
                        </Label>
                        <Slider
                          value={[memoryConfidenceThreshold]}
                          min={0.5}
                          max={1}
                          step={0.05}
                          disabled={!memoryEnabled}
                          onValueChange={(values) => setMemoryConfidenceThreshold(values[0] ?? 0.7)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Memórias abaixo deste nível não entram no prompt.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-semibold">
                          Duração padrão do contexto temporário: {memoryTempDefaultDays} dias
                        </Label>
                        <Slider
                          value={[memoryTempDefaultDays]}
                          min={1}
                          max={30}
                          step={1}
                          disabled={!memoryEnabled}
                          onValueChange={(values) => setMemoryTempDefaultDays(values[0] ?? 7)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Usado quando o contato informa algo temporário sem data final explícita.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-indigo-500" />
                    <span>Reinício de atendimento (Session Reset)</span>
                  </CardTitle>
                  <CardDescription>
                    Permite que o cliente reinicie o atendimento atual ao enviar uma palavra-chave configurada.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4 rounded-xl border p-4">
                    <Switch
                      id="conversationResetEnabled"
                      checked={conversationResetEnabled}
                      onCheckedChange={setConversationResetEnabled}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="conversationResetEnabled" className="font-semibold text-base">
                        Ativar comando de reinício
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Se ativado, o sistema interceptará mensagens contendo exclusivamente uma das palavras configuradas para resetar a sessão de atendimento.
                      </p>
                    </div>
                  </div>

                  {conversationResetEnabled && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="conversationResetKeywords" className="font-semibold text-base">
                          Palavras-chave de reinício
                        </Label>
                        <Input
                          id="conversationResetKeywords"
                          placeholder="Ex: reset, reiniciar, começar de novo"
                          value={conversationResetKeywordsRaw}
                          onChange={(e) => setConversationResetKeywordsRaw(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Palavras separadas por vírgula. O reinício só é ativado se o cliente enviar exatamente um desses termos (sem texto adicional).
                        </p>
                      </div>

                      <div className="flex items-start gap-4 rounded-xl border p-4">
                        <Switch
                          id="conversationResetPreserveMemories"
                          checked={conversationResetPreserveMemories}
                          onCheckedChange={setConversationResetPreserveMemories}
                        />
                        <div className="space-y-1">
                          <Label htmlFor="conversationResetPreserveMemories" className="font-semibold text-base">
                            Preservar memórias importantes
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Extrai memórias estruturadas da conversa encerrada e as preserva para o próximo ciclo de atendimento, limpando apenas o contexto temporário.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 rounded-xl border p-4">
                        <Switch
                          id="conversationResetSendInitialMessage"
                          checked={conversationResetSendInitialMessage}
                          onCheckedChange={setConversationResetSendInitialMessage}
                        />
                        <div className="space-y-1">
                          <Label htmlFor="conversationResetSendInitialMessage" className="font-semibold text-base">
                            Enviar saudação inicial
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Concatena a mensagem inicial cadastrada do agente logo após a mensagem de confirmação de reset.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="conversationResetConfirmationMessage" className="font-semibold text-base">
                          Mensagem de confirmação de reinício
                        </Label>
                        <Textarea
                          id="conversationResetConfirmationMessage"
                          placeholder="Digite a mensagem de confirmação de reinício..."
                          rows={4}
                          value={conversationResetConfirmationMessage}
                          onChange={(e) => setConversationResetConfirmationMessage(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Resposta que será enviada ao contato informando que a sessão foi reiniciada.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seguranca">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Regras de Segurança e Gatilhos</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure limites de comportamento (Guardrails) e ações automáticas
                      (Gatilhos).
                    </p>
                  </div>
                  <Dialog
                    open={isAddingSecurityRule}
                    onOpenChange={(open) => {
                      setIsAddingSecurityRule(open);
                      if (!open) {
                        setEditingSecurityRule(null);
                        setSecurityRuleForm(DEFAULT_SECURITY_RULE_FORM);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={openCreateSecurityRule}
                        disabled={!selectedAssistantId}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Adicionar regra de segurança
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingSecurityRule
                            ? "Editar Regra de Segurança"
                            : "Nova Regra de Segurança"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Field label="Nome da regra">
                          <Input
                            value={securityRuleForm.name}
                            onChange={(event) =>
                              setSecurityRuleForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            placeholder="Ex: Não divulgar descontos"
                          />
                        </Field>
                        <Field label="Tipo da regra">
                          <Select
                            value={securityRuleForm.ruleType}
                            onValueChange={(value) =>
                              setSecurityRuleForm((current) => ({ ...current, ruleType: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bloquear assunto">Bloquear assunto</SelectItem>
                              <SelectItem value="Não inventar resposta">
                                Não inventar resposta
                              </SelectItem>
                              <SelectItem value="Escalar para humano">
                                Escalar para humano
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Instrução da regra">
                          <Textarea
                            rows={5}
                            value={securityRuleForm.instruction}
                            onChange={(event) =>
                              setSecurityRuleForm((current) => ({
                                ...current,
                                instruction: event.target.value,
                              }))
                            }
                            placeholder="Descreva de forma objetiva o comportamento obrigatório do assistente."
                          />
                        </Field>
                        <Field label="Ordem">
                          <Input
                            type="number"
                            min={0}
                            value={securityRuleForm.sortOrder}
                            onChange={(event) =>
                              setSecurityRuleForm((current) => ({
                                ...current,
                                sortOrder: Number(event.target.value || 0),
                              }))
                            }
                          />
                        </Field>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddingSecurityRule(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => void handleSaveSecurityRule()}
                          disabled={
                            Boolean(securityRuleSavingId) ||
                            !securityRuleForm.name.trim() ||
                            !securityRuleForm.instruction.trim()
                          }
                        >
                          {securityRuleSavingId ? "Salvando..." : "Salvar regra"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  {/* Guardrails Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Guardrails (Limites e Restrições)
                    </h3>
                    {!selectedAssistantId ? (
                      <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                        Salve ou selecione um assistente para gerenciar regras de segurança.
                      </div>
                    ) : securityRulesLoading ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando regras de segurança...
                      </div>
                    ) : securityRulesError ? (
                      <div className="text-sm text-destructive p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
                        {securityRulesError}
                      </div>
                    ) : securityRules.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                        Nenhuma regra de segurança cadastrada. Adicione guardrails para orientar o
                        runtime da IA.
                      </div>
                    ) : (
                      securityRules.map((rule) => {
                        const isRuleActive = rule.status === "ACTIVE";
                        const isBusy =
                          securityRuleSavingId === rule.id || securityRuleDeletingId === rule.id;
                        return (
                          <div
                            key={rule.id}
                            className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {rule.name}
                                <Badge variant="outline">{rule.ruleType}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {rule.instruction}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-xs font-medium">
                                {isRuleActive ? "Ativa" : "Inativa"}
                              </div>
                              <Checkbox
                                checked={isRuleActive}
                                disabled={isBusy}
                                onCheckedChange={(checked) =>
                                  void toggleSecurityRuleStatus(rule, Boolean(checked))
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditSecurityRule(rule)}
                                disabled={isBusy}
                              >
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void removeSecurityRule(rule)}
                                disabled={isBusy}
                              >
                                {securityRuleDeletingId === rule.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Excluir
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Gatilhos Section */}
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      Gatilhos (Ações Automáticas)
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        Em breve
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Gatilhos automáticos ainda não possuem backend nem runtime operacional neste
                      MVP.
                    </p>
                    <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                      Em breve: ações automáticas como transferir chat, agendar ou disparar
                      integrações.
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <div className="text-sm font-medium">Filtros Nativos do Sistema</div>
                    <ToggleRow
                      label="Reduzir invenção de resposta"
                      desc="Aplicado por instruções de prompt e fallback determinístico; não é um bloqueio absoluto para todos os casos."
                      defaultChecked
                    />
                    <ToggleRow
                      label="Provedores externos apenas no backend"
                      desc="Quando habilitada, a IA externa é chamada somente pelo backend. O frontend nunca recebe tokens."
                      defaultChecked
                    />
                    <ToggleRow
                      label="Não expor segredos"
                      desc="Todos os tokens continuam apenas no backend"
                      defaultChecked
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="publicacao">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Canais de Publicação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!selectedAssistantId ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Salve o assistente primeiro para vinculá-lo a um ou mais canais da empresa.
                      </div>
                    ) : publicationSummary.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-5">
                        <div className="text-sm font-medium">Nenhum canal cadastrado.</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Cadastre um canal em Canais para publicar este assistente.
                        </div>
                        <Button asChild variant="outline" size="sm" className="mt-4">
                          <Link to="/canais">Ir para Canais</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {publicationSummary.map((channel) => (
                          <div key={channel.id} className="rounded-xl border p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{channel.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {channel.metadataJson?.["channelType"] === "WHATSAPP"
                                    ? "WhatsApp"
                                    : "Chatwoot"}{" "}
                                  · Account {channel.accountId} · Inbox {channel.inboxId}
                                </div>
                              </div>
                              <StatusBadge status={channel.isActive ? "ativo" : "pausado"} />
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 px-3 py-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium">
                                  {channel.linkedToCurrentAssistant
                                    ? "Publicado neste canal"
                                    : channel.linkedToOtherAssistant
                                      ? `Vinculado a ${channel.assistantName ?? "outro assistente"}`
                                      : "Disponível para publicação"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {channel.linkedToOtherAssistant
                                    ? "Desvincule o assistente atual deste inbox antes de publicar aqui."
                                    : channel.isActive
                                      ? "Este assistente poderá responder este inbox quando estiver ativo."
                                      : "Canal pausado: o vínculo fica salvo, mas o runtime não responde."}
                                </div>
                              </div>
                              <Switch
                                checked={channel.linkedToCurrentAssistant}
                                disabled={
                                  publicationSavingId === channel.id ||
                                  (!channel.linkedToCurrentAssistant &&
                                    channel.linkedToOtherAssistant)
                                }
                                onCheckedChange={(checked) =>
                                  void publishAssistantOnChannel(channel, checked)
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Revisão Final</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!name.trim() && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">O nome do agente é obrigatório.</span>
                      </div>
                    )}
                    {!instructions.trim() && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">
                          Você está usando o prompt padrão do sistema. Recomendamos personalizar as
                          instruções.
                        </span>
                      </div>
                    )}
                    {activeKnowledgeCount === 0 && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">
                          Nenhum conhecimento ativo foi adicionado. O agente responderá apenas com
                          base no prompt.
                        </span>
                      </div>
                    )}
                    {activeKnowledgeCount > 0 && readyKnowledgeCount === 0 && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">
                          O agente ainda não possui conhecimento preparado para IA. Ele responderá
                          apenas com base no prompt.
                        </span>
                      </div>
                    )}
                    {draftKnowledgeCount > 0 && readyKnowledgeCount > 0 && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">
                          Existem conhecimentos ativos que ainda não foram preparados para IA.
                        </span>
                      </div>
                    )}
                    {errorKnowledgeCount > 0 && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">
                          Alguns conhecimentos falharam na preparação. Revise antes de publicar.
                        </span>
                      </div>
                    )}
                    {knowledge.filter((k) => k.status === "INACTIVE").length > 0 && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">
                          Você tem conhecimentos inativos que não serão utilizados pela IA.
                        </span>
                      </div>
                    )}
                    {readyKnowledgeCount > 0 && (
                      <div
                        className={`flex items-center gap-2 p-3 rounded-lg border ${ragEnabled ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900/50" : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50"}`}
                      >
                        <span className="text-sm font-medium">
                          {ragEnabled
                            ? "Os conhecimentos preparados estão ATIVOS para o atendimento real! A IA usará esses documentos para responder."
                            : "Os conhecimentos preparados podem ser testados na aba Preview. A integração real com a IA está DESATIVADA."}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1 bg-muted/30 p-4 rounded-lg border">
                      <Summary label="Empresa" value={company?.name ?? "Tenant atual"} />
                      <Summary label="Nome do Agente" value={name || "Não definido"} />
                      <Summary label="Status Planejado" value={isActive ? "Ativo" : "Inativo"} />
                      <Summary label="Endereço" value={businessAddress || "Não definido"} />
                      <Summary
                        label="Cidade / Estado"
                        value={
                          [businessCity, businessState].filter(Boolean).join(" / ") ||
                          businessCityRegion ||
                          "Não definido"
                        }
                      />
                      <Summary label="CEP" value={businessPostalCode || "Não definido"} />
                      <Summary label="Fuso horário" value={timezone || "America/Sao_Paulo"} />
                      <Summary label="Telefone" value={businessPhone || "Não definido"} />
                      <Summary
                        label="WhatsApp principal"
                        value={businessWhatsapp || "Não definido"}
                      />
                      <Summary
                        label="WhatsApp assistência"
                        value={businessWhatsappSupport || "Não definido"}
                      />
                      <Summary label="Site" value={websiteUrl || "Não definido"} />
                      <Summary
                        label="Link do Google Maps"
                        value={
                          googleMapsUrl ? (
                            <div className="flex items-center gap-2">
                              <span>Sim</span>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs font-semibold text-primary hover:underline"
                                type="button"
                                onClick={() => window.open(googleMapsUrl, "_blank")}
                              >
                                Abrir localização
                              </Button>
                            </div>
                          ) : (
                            "Não"
                          )
                        }
                      />
                      <Summary
                        label="IA fora do horário"
                        value={
                          aiAlwaysAvailable
                            ? "Pode responder fora do horário"
                            : "Não responde fora do horário"
                        }
                      />
                      <Summary label="Personalidade" value={personality || "Não definida"} />
                      <Summary label="Tom de voz" value={toneOfVoice || "Não definido"} />
                      <Summary label="Modelo da IA" value={model || "Padrão do sistema"} />
                      <Summary
                        label="Temperatura"
                        value={`${temperature ?? 0.2} - ${getTemperatureDescription(temperature ?? 0.2)}`}
                      />
                      <Summary
                        label="Buffer de mensagens"
                        value={
                          messageBufferEnabled
                            ? `${messageBufferSeconds}s de espera`
                            : "Desativado (Responde na hora)"
                        }
                      />
                      <Summary
                        label="Mensagem inicial"
                        value={initialMessage.trim() ? "Configurada" : "Não configurada"}
                      />
                      <Summary
                        label="Prompt Principal"
                        value={instructions.trim() ? "Configurado" : "Padrão do sistema"}
                      />
                      <Summary label="Mensagem fallback" value="Configurada" />
                      <Summary
                        label="Conhecimento Ativo"
                        value={`${activeKnowledgeCount} itens (${readyKnowledgeCount} preparados)`}
                      />
                      <Summary
                        label="Conhecimento no Atendimento Real"
                        value={ragEnabled ? "Ativado" : "Desativado"}
                      />
                      <Summary
                        label="Memória Inteligente"
                        value={memoryEnabled ? "Ativada" : "Desativada"}
                      />
                      <Summary
                        label="Memória no Prompt"
                        value={memoryPrePromptEnabled ? "Ativada" : "Desativada"}
                      />
                      <Summary
                        label="Extração Automática"
                        value={memoryExtractionEnabled ? "Ativada" : "Desativada"}
                      />
                      <Summary
                        label="Categorias de Memória"
                        value={memoryAllowedCategories.length > 0 ? memoryAllowedCategories.join(", ") : "Nenhuma"}
                      />
                      <Summary
                        label="Regras de Segurança"
                        value={`${securityRules.filter((r) => r.status === "ACTIVE").length} ativas`}
                      />
                    </div>

                    <div className="pt-4 space-y-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="confirm-review"
                          checked={isReviewConfirmed}
                          onCheckedChange={(c) => setIsReviewConfirmed(!!c)}
                        />
                        <Label
                          htmlFor="confirm-review"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Confirmo que revisei as alterações e desejo salvar este agente.
                        </Label>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => void handleSave()}
                        disabled={saving || !name.trim() || !isReviewConfirmed}
                      >
                        <Save className="h-4 w-4 mr-2" />{" "}
                        {saving ? "Salvando..." : "Confirmar e salvar alterações"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Exemplo de Conversa (Simulação)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 flex flex-col h-full">
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-4 min-h-[400px] flex-1 flex flex-col">
                      {initialMessage.trim() && (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            IA
                          </div>
                          <div className="bg-primary/5 border rounded-lg p-3 text-sm flex-1">
                            {initialMessage}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-row-reverse gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                          VC
                        </div>
                        <div className="bg-muted border rounded-lg p-3 text-sm">
                          {previewQuestion}
                        </div>
                      </div>

                      {previewLoading && (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            IA
                          </div>
                          <div className="bg-primary/5 border rounded-lg p-3 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></span>
                            <span
                              className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></span>
                            <span
                              className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"
                              style={{ animationDelay: "0.4s" }}
                            ></span>
                          </div>
                        </div>
                      )}

                      {previewResult && (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            IA
                          </div>
                          <div className="bg-primary/5 border rounded-lg p-3 text-sm flex-1 space-y-2">
                            <div>{previewResult.answer}</div>
                            {previewResult.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t text-xs">
                                <div className="font-medium text-muted-foreground mb-1">
                                  Fontes manuais sugeridas:
                                </div>
                                {previewResult.sources.map((source) => (
                                  <div key={source.id} className="truncate">
                                    • {source.title}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Bloco de Conhecimento RAG do Teste */}
                            {previewResult.ragEnabled && (
                              <div className="mt-3 pt-3 border-t text-xs">
                                <div className="font-medium text-blue-600 mb-1 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" /> Conhecimentos usados neste teste:
                                </div>
                                {previewResult.usedKnowledge &&
                                previewResult.usedKnowledge.length > 0 ? (
                                  <div className="space-y-2 mt-2">
                                    {previewResult.usedKnowledge.map((k) => (
                                      <div
                                        key={k.chunkId}
                                        className="bg-blue-50/50 p-2 rounded border border-blue-100"
                                      >
                                        <div className="flex justify-between items-start mb-1">
                                          <div className="font-semibold text-blue-800 line-clamp-1">
                                            {k.title}
                                          </div>
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] py-0 px-1 shrink-0 bg-white"
                                          >
                                            Score: {(k.score * 100).toFixed(1)}%
                                          </Badge>
                                        </div>
                                        <div className="text-muted-foreground line-clamp-3 leading-relaxed">
                                          "{k.contentPreview}"
                                        </div>
                                      </div>
                                    ))}
                                    <div className="text-[10px] text-muted-foreground pt-1">
                                      Total de blocos analisados: {previewResult.totalChunksScanned}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 italic">
                                    Nenhum conhecimento relevante foi encontrado para esta pergunta.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs">Faça uma pergunta para testar as respostas</Label>

                      <div className="flex items-center space-x-2 px-1">
                        <Switch
                          id="use-rag-preview"
                          checked={usePreparedKnowledge}
                          onCheckedChange={setUsePreparedKnowledge}
                        />
                        <Label
                          htmlFor="use-rag-preview"
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          Usar conhecimento preparado neste teste
                        </Label>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={previewQuestion}
                          onChange={(e) => setPreviewQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && void handlePreview()}
                        />
                        <Button
                          onClick={() => void handlePreview()}
                          disabled={!selectedAssistantId || previewLoading}
                          variant="secondary"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />{" "}
                          {previewLoading ? "Simulando..." : "Simular"}
                        </Button>
                      </div>
                      {!selectedAssistantId && (
                        <p className="text-[10px] text-muted-foreground">
                          Salve o agente primeiro para habilitar a simulação.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  defaultChecked,
}: {
  label: string;
  desc?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div className="font-medium text-sm">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <div className="h-8 w-8 rounded-full border grid place-items-center text-xs">
        {defaultChecked ? "✓" : "—"}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
