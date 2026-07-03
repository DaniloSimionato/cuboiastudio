import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Mic,
  Plus,
  RefreshCw,
  Send,
  SmilePlus,
  Trash2,
  UserRound,
  Video,
  MessageSquare,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { backendAssistantsService, backendConversationsService } from "@/services";
import { ApiError } from "@/services/apiClient";
import { filterOperationalAssistants, resolveOperationalAssistantId } from "@/lib/assistants";
import {
  filterOperationalConversations,
  formatConversationPrimaryLabel,
  formatConversationSecondaryLabel,
  resolveOperationalConversationId,
} from "@/lib/conversations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  BackendAssistantListItem,
  BackendConversationItem,
  BackendConversationMessageItem,
  BackendAssistantPreviewResponse,
  BackendAssistantRunResponse,
  BackendConversationSendRequest,
  BackendConversationSendResponse,
} from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RouteSearch = {
  assistantId?: string;
};

type ComposerAttachmentType =
  "image" | "document" | "audio" | "video" | "contact" | "location" | "gif";

type TestMessagePayload =
  | { type: "text"; text: string }
  | {
      type: "image";
      fileName: string;
      mimeType: string;
      size: number;
      file: Blob;
      previewUrl?: string;
      caption?: string;
    }
  | {
      type: "document";
      fileName: string;
      mimeType: string;
      size: number;
      file: Blob;
      caption?: string;
    }
  | {
      type: "video";
      fileName: string;
      mimeType: string;
      size: number;
      file: Blob;
      previewUrl?: string;
      caption?: string;
    }
  | {
      type: "audio";
      fileName?: string;
      mimeType?: string;
      size?: number;
      durationSeconds?: number;
      file: Blob;
      audioUrl?: string;
    }
  | { type: "contact"; name: string; phone: string }
  | { type: "location"; label?: string; latitude?: number; longitude?: number }
  | {
      type: "gif";
      fileName: string;
      mimeType: string;
      size: number;
      file: Blob;
      previewUrl?: string;
    };

type PendingAttachmentDraft = Exclude<TestMessagePayload, { type: "text" }>;

type SimulatedMessageBinding = {
  id: string;
  conversationId: string;
  markerText: string;
  createdAt: string;
  payload: PendingAttachmentDraft;
  status: "pending" | "synced" | "error";
};

type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  mode?: string | null;
  sources?: BackendConversationMessageItem["sources"];
  attachments?: BackendConversationMessageItem["attachments"];
  payload?: PendingAttachmentDraft;
  status?: "pending" | "synced" | "error";
};

type PersistedAttachment = NonNullable<BackendConversationMessageItem["attachments"]>[number];

const CONVERSATION_NOT_FOUND_MESSAGE =
  "A conversa selecionada não pertence a este assistente ou não existe mais. Selecione outra conversa ou crie uma nova.";
const MB = 1024 * 1024;
const CLIENT_UPLOAD_LIMITS: Record<
  Exclude<ComposerAttachmentType, "contact" | "location">,
  number
> = {
  image: 10 * MB,
  gif: 10 * MB,
  audio: 25 * MB,
  document: 20 * MB,
  video: 20 * MB,
};
const TESTES_REQUEST_TIMEOUT_MS = 30_000;

type TimedAbortRequest = {
  controller: AbortController;
  timeoutId: number;
  timedOut: boolean;
};

export const Route = createFileRoute("/_app/testes")({
  validateSearch: (search: Record<string, unknown>): RouteSearch => ({
    assistantId: typeof search.assistantId === "string" ? search.assistantId : undefined,
  }),
  head: () => ({ meta: [{ title: "Testar Agente · Cubo AI Studio" }] }),
  component: TestePage,
});

function TestePage() {
  const search = Route.useSearch();

  const [assistants, setAssistants] = useState<BackendAssistantListItem[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>(search.assistantId ?? "");
  const [conversations, setConversations] = useState<BackendConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [messages, setMessages] = useState<BackendConversationMessageItem[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [pendingAttachmentDraft, setPendingAttachmentDraft] =
    useState<PendingAttachmentDraft | null>(null);
  const [simulatedBindings, setSimulatedBindings] = useState<SimulatedMessageBinding[]>([]);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState({ name: "", phone: "" });
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState({
    label: "",
    latitude: "",
    longitude: "",
  });
  const [previewQuestion, setPreviewQuestion] = useState("Qual é o horário de atendimento?");
  const [previewResult, setPreviewResult] = useState<BackendAssistantPreviewResponse | null>(null);
  const [runResult, setRunResult] = useState<BackendAssistantRunResponse | null>(null);
  const [sendResult, setSendResult] = useState<BackendConversationSendResponse | null>(null);
  const [isLoadingAssistants, setIsLoadingAssistants] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const [isLoadingRuntimeDebug, setIsLoadingRuntimeDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const assistantsRequestRef = useRef<TimedAbortRequest | null>(null);
  const conversationsRequestRef = useRef<TimedAbortRequest | null>(null);
  const messagesRequestRef = useRef<TimedAbortRequest | null>(null);
  const sendRequestRef = useRef<TimedAbortRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingPickerTypeRef = useRef<ComposerAttachmentType | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const sendRecordedAudioRef = useRef(false);
  const recordingSecondsRef = useRef(0);
  const pendingAttachmentDraftRef = useRef<PendingAttachmentDraft | null>(null);
  const simulatedBindingsRef = useRef<SimulatedMessageBinding[]>([]);

  const visibleAssistants = useMemo(() => filterOperationalAssistants(assistants), [assistants]);

  const selectedAssistant = useMemo(
    () => visibleAssistants.find((assistant) => assistant.id === selectedAssistantId) ?? null,
    [visibleAssistants, selectedAssistantId],
  );

  const visibleConversations = useMemo(
    () => filterOperationalConversations(conversations),
    [conversations],
  );

  const selectedConversation = useMemo(
    () => visibleConversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [visibleConversations, selectedConversationId],
  );

  const releasePayloadResources = (payload: PendingAttachmentDraft | null) => {
    if (!payload) {
      return;
    }

    if ("previewUrl" in payload && payload.previewUrl) {
      URL.revokeObjectURL(payload.previewUrl);
    }

    if (payload.type === "audio" && payload.audioUrl) {
      URL.revokeObjectURL(payload.audioUrl);
    }
  };

  const createTimedAbortRequest = (): TimedAbortRequest => {
    const request: TimedAbortRequest = {
      controller: new AbortController(),
      timeoutId: 0,
      timedOut: false,
    };

    request.timeoutId = window.setTimeout(() => {
      request.timedOut = true;
      request.controller.abort();
    }, TESTES_REQUEST_TIMEOUT_MS);

    return request;
  };

  const finishTimedAbortRequest = (
    ref: React.MutableRefObject<TimedAbortRequest | null>,
    request: TimedAbortRequest,
  ) => {
    window.clearTimeout(request.timeoutId);
    if (ref.current === request) {
      ref.current = null;
    }
  };

  const cancelTimedAbortRequest = (ref: React.MutableRefObject<TimedAbortRequest | null>) => {
    const request = ref.current;
    if (!request) {
      return;
    }

    window.clearTimeout(request.timeoutId);
    request.controller.abort();
    ref.current = null;
  };

  const startTimedAbortRequest = (
    ref: React.MutableRefObject<TimedAbortRequest | null>,
  ): TimedAbortRequest => {
    cancelTimedAbortRequest(ref);
    const request = createTimedAbortRequest();
    ref.current = request;
    return request;
  };

  const resetRuntimeState = () => {
    setSelectedConversationId("");
    setMessages([]);
    setPreviewResult(null);
    setRunResult(null);
    setSendResult(null);
  };

  const discardPendingAttachmentDraft = () => {
    setPendingAttachmentDraft((current) => {
      releasePayloadResources(current);
      return null;
    });
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const releaseRecordingResources = () => {
    stopRecordingTimer();
    mediaRecorderRef.current = null;
    mediaChunksRef.current = [];
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const handleAssistantChange = (assistantId: string) => {
    cancelTimedAbortRequest(conversationsRequestRef);
    cancelTimedAbortRequest(messagesRequestRef);
    cancelTimedAbortRequest(sendRequestRef);
    setError(null);
    setConversations([]);
    shouldStickToBottomRef.current = true;
    resetRuntimeState();
    setSelectedAssistantId(assistantId);
  };

  const loadAssistants = async () => {
    const request = startTimedAbortRequest(assistantsRequestRef);
    setIsLoadingAssistants(true);
    setError(null);

    try {
      const assistantItems = await backendAssistantsService.list({
        signal: request.controller.signal,
      });

      if (assistantsRequestRef.current !== request) {
        return;
      }

      setAssistants(assistantItems);
      const initialAssistantId = resolveOperationalAssistantId(assistantItems, search.assistantId);
      setSelectedAssistantId(initialAssistantId);
    } catch (err) {
      if (request.controller.signal.aborted && !request.timedOut) {
        return;
      }

      setError(
        formatLoadErrorMessage(err, "Não foi possível carregar o backend.", request.timedOut),
      );
    } finally {
      if (assistantsRequestRef.current === request) {
        setIsLoadingAssistants(false);
      }
      finishTimedAbortRequest(assistantsRequestRef, request);
    }
  };

  const loadAssistantData = async (assistantId: string) => {
    if (!assistantId) {
      cancelTimedAbortRequest(conversationsRequestRef);
      setConversations([]);
      setMessages([]);
      setSelectedConversationId("");
      return;
    }

    const request = startTimedAbortRequest(conversationsRequestRef);
    setIsLoadingConversations(true);
    try {
      const items = await backendConversationsService.list(assistantId, {
        signal: request.controller.signal,
      });

      if (conversationsRequestRef.current !== request) {
        return;
      }

      setConversations(items);
    } catch (err) {
      if (request.controller.signal.aborted && !request.timedOut) {
        return;
      }

      setError(
        formatLoadErrorMessage(err, "Não foi possível carregar as conversas.", request.timedOut),
      );
    } finally {
      if (conversationsRequestRef.current === request) {
        setIsLoadingConversations(false);
      }
      finishTimedAbortRequest(conversationsRequestRef, request);
    }
  };

  const handleConversationNotFound = async (assistantId: string) => {
    setSelectedConversationId("");
    setMessages([]);
    setSendResult(null);
    setError(CONVERSATION_NOT_FOUND_MESSAGE);
    await loadAssistantData(assistantId);
  };

  const loadMessages = async (assistantId: string, conversationId: string) => {
    if (!assistantId || !conversationId) {
      cancelTimedAbortRequest(messagesRequestRef);
      setMessages([]);
      setIsLoadingMessages(false);
      setIsLoadingRuntimeDebug(false);
      return;
    }

    const request = startTimedAbortRequest(messagesRequestRef);
    setIsLoadingMessages(true);
    setIsLoadingRuntimeDebug(true);

    try {
      const items = await backendConversationsService.messages(assistantId, conversationId, {
        signal: request.controller.signal,
      });

      if (messagesRequestRef.current !== request) {
        return;
      }

      setMessages(items);
    } catch (err) {
      if (request.controller.signal.aborted && !request.timedOut) {
        return;
      }

      if (isConversationNotFoundError(err)) {
        await handleConversationNotFound(assistantId);
        return;
      }

      setError(
        formatLoadErrorMessage(err, "Não foi possível carregar as mensagens.", request.timedOut),
      );
    } finally {
      if (messagesRequestRef.current === request) {
        setIsLoadingMessages(false);
        setIsLoadingRuntimeDebug(false);
      }
      finishTimedAbortRequest(messagesRequestRef, request);
    }
  };

  const retryCurrentLoad = () => {
    if (!assistants.length) {
      void loadAssistants();
      return;
    }

    if (selectedAssistantId && selectedConversationId) {
      void loadMessages(selectedAssistantId, selectedConversationId);
      return;
    }

    if (selectedAssistantId) {
      void loadAssistantData(selectedAssistantId);
    }
  };

  useEffect(() => {
    void loadAssistants();

    return () => {
      cancelTimedAbortRequest(assistantsRequestRef);
    };
  }, [search.assistantId]);

  useEffect(() => {
    if (!selectedAssistantId) {
      cancelTimedAbortRequest(conversationsRequestRef);
      cancelTimedAbortRequest(messagesRequestRef);
      resetRuntimeState();
      setConversations([]);
      return;
    }

    setError(null);
    resetRuntimeState();
    setSendResult(null);
    void loadAssistantData(selectedAssistantId);
  }, [selectedAssistantId]);

  useEffect(() => {
    if (!selectedAssistantId || !selectedConversationId) {
      cancelTimedAbortRequest(messagesRequestRef);
      setMessages([]);
      return;
    }

    void loadMessages(selectedAssistantId, selectedConversationId);

    return () => {
      cancelTimedAbortRequest(messagesRequestRef);
    };
  }, [selectedAssistantId, selectedConversationId]);

  useEffect(() => {
    const resolvedConversationId = resolveOperationalConversationId(
      visibleConversations,
      selectedConversationId,
    );

    if (resolvedConversationId !== selectedConversationId) {
      setSelectedConversationId(resolvedConversationId);
    }

    if (!resolvedConversationId) {
      setMessages([]);
      setSendResult(null);
    }
  }, [visibleConversations, selectedConversationId]);

  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || !shouldStickToBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, simulatedBindings.length, isSendingMessage, selectedConversationId]);

  useEffect(() => {
    pendingAttachmentDraftRef.current = pendingAttachmentDraft;
  }, [pendingAttachmentDraft]);

  useEffect(() => {
    simulatedBindingsRef.current = simulatedBindings;
  }, [simulatedBindings]);

  useEffect(() => {
    return () => {
      cancelTimedAbortRequest(assistantsRequestRef);
      cancelTimedAbortRequest(conversationsRequestRef);
      cancelTimedAbortRequest(messagesRequestRef);
      cancelTimedAbortRequest(sendRequestRef);
      stopRecordingTimer();
      mediaRecorderRef.current = null;
      mediaChunksRef.current = [];
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      releasePayloadResources(pendingAttachmentDraftRef.current);
      simulatedBindingsRef.current.forEach((binding) => releasePayloadResources(binding.payload));
    };
  }, []);

  const handleCreateConversation = async () => {
    if (!selectedAssistantId) {
      return;
    }

    const request = startTimedAbortRequest(conversationsRequestRef);
    setIsLoadingConversations(true);
    shouldStickToBottomRef.current = true;
    setError(null);
    setPreviewResult(null);
    setRunResult(null);
    setSendResult(null);

    try {
      const conversation = await backendConversationsService.create(
        selectedAssistantId,
        {},
        { signal: request.controller.signal },
      );

      if (conversationsRequestRef.current !== request) {
        return;
      }

      setConversations((items) => [conversation, ...items]);
      setSelectedConversationId(conversation.id);

      const items = await backendConversationsService.messages(
        selectedAssistantId,
        conversation.id,
        { signal: request.controller.signal },
      );

      if (conversationsRequestRef.current !== request) {
        return;
      }

      setMessages(items);
    } catch (err) {
      if (request.controller.signal.aborted && !request.timedOut) {
        return;
      }

      if (isConversationNotFoundError(err)) {
        await handleConversationNotFound(selectedAssistantId);
        return;
      }

      setError(formatLoadErrorMessage(err, "Não foi possível criar a conversa.", request.timedOut));
    } finally {
      if (conversationsRequestRef.current === request) {
        setIsLoadingConversations(false);
      }
      finishTimedAbortRequest(conversationsRequestRef, request);
    }
  };

  const handleRefreshMessages = async () => {
    if (!selectedAssistantId || !selectedConversationId) {
      return;
    }

    setError(null);
    await loadMessages(selectedAssistantId, selectedConversationId);
  };

  const ensureConversation = async (_signal?: AbortSignal) => {
    if (!selectedAssistantId) {
      throw new Error("Selecione um assistente antes de enviar mensagens.");
    }

    if (selectedConversationId) {
      return selectedConversationId;
    }

    throw new Error("Selecione ou crie uma conversa antes de enviar mensagens.");
  };

  const registerSimulatedBinding = (
    conversationId: string,
    markerText: string,
    payload: PendingAttachmentDraft,
  ) => {
    const binding: SimulatedMessageBinding = {
      id: createLocalId(),
      conversationId,
      markerText,
      payload,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    setSimulatedBindings((items) => [...items, binding]);
    return binding.id;
  };

  const syncSimulatedBinding = (bindingId: string, status: SimulatedMessageBinding["status"]) => {
    setSimulatedBindings((items) =>
      items.map((binding) => (binding.id === bindingId ? { ...binding, status } : binding)),
    );
  };

  const handleSendPayload = async (payload: TestMessagePayload, textToRuntime: string) => {
    if (!selectedAssistantId) {
      toast.error("Selecione um assistente para continuar.");
      return;
    }

    if (!selectedConversationId) {
      toast.error("Selecione ou crie uma conversa antes de enviar mensagens.");
      return;
    }

    const request = startTimedAbortRequest(sendRequestRef);
    const hasAttachment = payload.type !== "text";
    setIsSendingMessage(true);
    setIsProcessingAttachment(hasAttachment);
    setIsLoadingRuntimeDebug(true);
    let bindingId: string | null = null;

    try {
      const assistantId = selectedAssistantId;
      const conversationId = await ensureConversation(request.controller.signal);

      if (payload.type !== "text") {
        bindingId = registerSimulatedBinding(conversationId, textToRuntime, payload);
      }

      setError(null);
      const sendPayload = buildSendPayload(payload, textToRuntime);
      const response = hasBinaryAttachment(payload)
        ? await backendConversationsService.sendMultipart(
            selectedAssistantId,
            conversationId,
            sendPayload,
            [payload.file],
            { signal: request.controller.signal },
          )
        : await backendConversationsService.send(assistantId, conversationId, sendPayload, {
            signal: request.controller.signal,
          });

      if (sendRequestRef.current !== request) {
        return;
      }

      setSendResult(response);
      setRunResult(null);
      setPreviewResult(null);
      setSelectedConversationId(conversationId);

      const items = await backendConversationsService.messages(assistantId, conversationId, {
        signal: request.controller.signal,
      });

      if (sendRequestRef.current !== request) {
        return;
      }

      setMessages(items);

      if (bindingId) {
        syncSimulatedBinding(bindingId, "synced");
      }
    } catch (err) {
      if (request.controller.signal.aborted && !request.timedOut) {
        return;
      }

      if (isConversationNotFoundError(err)) {
        await handleConversationNotFound(selectedAssistantId);
        return;
      }

      if (bindingId) {
        setSimulatedBindings((items) =>
          items.map((binding) =>
            binding.id === bindingId ? { ...binding, status: "error" } : binding,
          ),
        );
      }

      const message = formatSendErrorMessage(err, request.timedOut);
      setError(null);
      toast.error(message);
    } finally {
      if (sendRequestRef.current === request) {
        setIsSendingMessage(false);
        setIsProcessingAttachment(false);
        setIsLoadingRuntimeDebug(false);
      }
      finishTimedAbortRequest(sendRequestRef, request);
    }
  };

  const openFilePicker = (type: ComposerAttachmentType, accept: string) => {
    pendingPickerTypeRef.current = type;
    if (!fileInputRef.current) {
      return;
    }

    fileInputRef.current.value = "";
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const handleAttachmentMenuAction = (type: ComposerAttachmentType) => {
    if (type === "contact") {
      setContactDialogOpen(true);
      return;
    }

    if (type === "location") {
      setLocationDialogOpen(true);
      return;
    }

    if (type === "image") {
      openFilePicker(type, "image/*");
      return;
    }

    if (type === "document") {
      openFilePicker(
        type,
        ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv",
      );
      return;
    }

    if (type === "video") {
      openFilePicker(type, "video/*");
      return;
    }

    if (type === "audio") {
      openFilePicker(type, "audio/*");
      return;
    }

    if (type === "gif") {
      openFilePicker(type, "image/gif");
      return;
    }
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const selectedType = pendingPickerTypeRef.current;

    if (!file || !selectedType) {
      return;
    }

    if (selectedType === "contact" || selectedType === "location") {
      return;
    }

    const limit = CLIENT_UPLOAD_LIMITS[selectedType];
    if (file.size > limit) {
      toast.error(`Arquivo muito grande. Limite: ${formatFileSize(limit)}.`);
      return;
    }

    if (file.size <= 0) {
      toast.error("Arquivo vazio ou inválido.");
      return;
    }

    discardPendingAttachmentDraft();

    if (selectedType === "image") {
      setPendingAttachmentDraft({
        type: "image",
        fileName: file.name,
        mimeType: file.type || "image/*",
        size: file.size,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      });
      return;
    }

    if (selectedType === "document") {
      setPendingAttachmentDraft({
        type: "document",
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        file,
        caption: "",
      });
      return;
    }

    if (selectedType === "video") {
      setPendingAttachmentDraft({
        type: "video",
        fileName: file.name,
        mimeType: file.type || "video/*",
        size: file.size,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      });
      return;
    }

    if (selectedType === "audio") {
      setPendingAttachmentDraft({
        type: "audio",
        fileName: file.name,
        mimeType: file.type || "audio/*",
        size: file.size,
        file,
        audioUrl: URL.createObjectURL(file),
      });
      return;
    }

    if (selectedType === "gif") {
      setPendingAttachmentDraft({
        type: "gif",
        fileName: file.name,
        mimeType: file.type || "image/gif",
        size: file.size,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não está disponível neste navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationDraft((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
      },
      () => {
        toast.error("Não foi possível acessar sua localização.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSaveContactDraft = () => {
    if (!contactDraft.name.trim() || !contactDraft.phone.trim()) {
      toast.error("Preencha nome e telefone do contato.");
      return;
    }

    discardPendingAttachmentDraft();
    setPendingAttachmentDraft({
      type: "contact",
      name: contactDraft.name.trim(),
      phone: contactDraft.phone.trim(),
    });
    setContactDialogOpen(false);
  };

  const handleSaveLocationDraft = () => {
    if (
      !locationDraft.label.trim() &&
      !locationDraft.latitude.trim() &&
      !locationDraft.longitude.trim()
    ) {
      toast.error("Preencha um local ou informe latitude e longitude.");
      return;
    }

    discardPendingAttachmentDraft();
    setPendingAttachmentDraft({
      type: "location",
      label: locationDraft.label.trim() || undefined,
      latitude: locationDraft.latitude ? Number(locationDraft.latitude) : undefined,
      longitude: locationDraft.longitude ? Number(locationDraft.longitude) : undefined,
    });
    setLocationDialogOpen(false);
  };

  const handleSendAttachmentDraft = async () => {
    if (!pendingAttachmentDraft) {
      return;
    }

    const payload = pendingAttachmentDraft;
    setPendingAttachmentDraft(null);
    await handleSendPayload(payload, serializePayloadForRuntime(payload));
  };

  const startAudioRecording = async () => {
    if (recordingAudio) {
      return;
    }

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Seu navegador não suporta gravação de áudio aqui.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = resolvePreferredAudioMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];
      sendRecordedAudioRef.current = false;
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setRecordingAudio(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedChunks = mediaChunksRef.current.filter((chunk) => chunk.size > 0);
        const mimeType = recorder.mimeType || preferredMimeType || "audio/webm";
        const audioBlob = new Blob(recordedChunks, {
          type: mimeType,
        });
        const durationSeconds = recordingSecondsRef.current;

        releaseRecordingResources();
        setRecordingAudio(false);
        setRecordingSeconds(0);
        recordingSecondsRef.current = 0;

        if (!sendRecordedAudioRef.current) {
          sendRecordedAudioRef.current = false;
          return;
        }

        sendRecordedAudioRef.current = false;

        void (async () => {
          if (recordedChunks.length === 0 || audioBlob.size <= 0) {
            toast.error("Não foi possível gravar áudio válido. Tente gravar novamente.");
            return;
          }

          const fileName = `audio-${Date.now()}.${audioExtensionForMimeType(mimeType)}`;
          const payload: PendingAttachmentDraft = {
            type: "audio",
            fileName,
            mimeType,
            size: audioBlob.size,
            durationSeconds,
            file: new File([audioBlob], fileName, { type: mimeType }),
            audioUrl: URL.createObjectURL(audioBlob),
          };

          await handleSendPayload(payload, serializePayloadForRuntime(payload));
        })();
      };

      recorder.start(1000);
      recordingTimerRef.current = window.setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } catch (err) {
      releaseRecordingResources();
      setRecordingAudio(false);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      toast.error(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permissão de microfone negada. Libere o acesso para gravar."
          : err instanceof Error
            ? err.message
            : "Não foi possível iniciar a gravação de áudio.",
      );
    }
  };

  const cancelAudioRecording = () => {
    sendRecordedAudioRef.current = false;
    mediaRecorderRef.current?.stop();
  };

  const confirmAudioRecording = () => {
    sendRecordedAudioRef.current = true;
    mediaRecorderRef.current?.stop();
  };

  const handleSend = async () => {
    if (!selectedAssistantId || !chatMessage.trim()) {
      return;
    }

    const text = chatMessage.trim();
    setChatMessage("");
    await handleSendPayload({ type: "text", text }, text);
  };

  const insertEmoji = (emoji: string) => {
    setChatMessage((current) => `${current}${emoji}`);
  };

  const runtimeMessage = messages[messages.length - 1];
  const runtime = sendResult?.runtime ?? null;
  const runtimeSources = sendResult?.assistantMessage.sources ?? runtimeMessage?.sources ?? [];
  const previewSources = runResult?.sources ?? previewResult?.sources ?? [];
  const contextSources = runtimeSources.length > 0 ? runtimeSources : previewSources;
  const previewAnswerText =
    previewResult?.answer ?? "Execute o preview para ver a resposta determinística.";
  const interpretedInputMessage = sendResult?.userMessage ?? runtimeMessage ?? null;
  const interpretedInputAttachments = interpretedInputMessage?.attachments ?? [];
  const selectedAssistantModel =
    runtime?.model ?? selectedAssistant?.model ?? "Modelo padrão backend";
  const selectedTemperature = runtime?.temperature ?? selectedAssistant?.temperature ?? 0.2;
  const hasBlockingError = error !== null && error !== CONVERSATION_NOT_FOUND_MESSAGE;
  const chatTitle = selectedConversation
    ? formatConversationPrimaryLabel(selectedConversation)
    : (selectedAssistant?.name ?? "Conversa de teste");
  const chatSubtitle = runtime
    ? `${selectedConversation ? formatConversationPrimaryLabel(selectedConversation) : "Teste manual"} · Runtime disponível`
    : `${selectedConversation ? formatConversationPrimaryLabel(selectedConversation) : "Teste manual"} · Runtime aguardando`;
  const canSendMessage =
    selectedAssistantId &&
    selectedConversationId &&
    chatMessage.trim().length > 0 &&
    !isSendingMessage;
  const showMicButton = chatMessage.trim().length === 0;
  const displayedMessages = useMemo(() => {
    const currentBindings = simulatedBindings.filter(
      (binding) => binding.conversationId === selectedConversationId,
    );
    const consumedBindings = new Set<string>();

    const transformedMessages: DisplayMessage[] = messages.map((message) => {
      if (message.role !== "user") {
        return message;
      }

      const matchedBinding = currentBindings.find(
        (binding) => binding.markerText === message.content && !consumedBindings.has(binding.id),
      );

      if (!matchedBinding) {
        return message;
      }

      consumedBindings.add(matchedBinding.id);
      return {
        ...message,
        payload: matchedBinding.payload,
        status: matchedBinding.status === "error" ? "error" : "synced",
      };
    });

    const pendingMessages: DisplayMessage[] = currentBindings
      .filter((binding) => !consumedBindings.has(binding.id) && binding.status !== "synced")
      .map((binding) => ({
        id: binding.id,
        role: "user",
        content: binding.markerText,
        createdAt: binding.createdAt,
        payload: binding.payload,
        status: binding.status,
      }));

    return [...transformedMessages, ...pendingMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [messages, selectedConversationId, simulatedBindings]);

  const interpretAttachmentLine = (attachment: PersistedAttachment): string[] => {
    const lines = [
      `Tipo: ${attachment.type}`,
      `Arquivo: ${attachment.fileName}`,
      `Status: ${getAttachmentStatusLabel(attachment.processingStatus) ?? attachment.processingStatus ?? "—"}`,
    ];

    if (attachment.transcript) {
      lines.push(`Transcript: ${attachment.transcript}`);
    }

    if (attachment.extractedText) {
      lines.push(`ExtractedText: ${attachment.extractedText}`);
    }

    if (attachment.interpretedSummary) {
      lines.push(`Summary: ${attachment.interpretedSummary}`);
    }

    if (attachment.processingError) {
      lines.push(`Erro: ${attachment.processingError}`);
    }

    if (attachment.metadataJson) {
      lines.push(`Metadata: ${JSON.stringify(attachment.metadataJson)}`);
    }

    return lines;
  };

  useEffect(() => {
    shouldStickToBottomRef.current = true;
  }, [selectedConversationId]);

  return (
    <div className="flex h-[calc(100svh-7rem)] min-h-0 flex-col gap-3 overflow-hidden">
      <div className="clean-scrollbar flex-1 min-h-0 overflow-hidden">
        <TooltipProvider delayDuration={120}>
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="rounded-2xl border bg-card/80 p-3 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1">
                  <Field label="Assistente">
                    <Select value={selectedAssistantId} onValueChange={handleAssistantChange}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {visibleAssistants.map((assistant) => (
                          <SelectItem key={assistant.id} value={assistant.id}>
                            {assistant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="min-w-[220px] flex-1">
                  <Field label="Conversa">
                    <Select
                      value={selectedConversationId}
                      onValueChange={setSelectedConversationId}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {visibleConversations.map((conversation) => (
                          <SelectItem key={conversation.id} value={conversation.id}>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">
                                {formatConversationPrimaryLabel(conversation)}
                              </span>
                              <span className="truncate text-[11px] text-muted-foreground">
                                {formatConversationSecondaryLabel(conversation)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Button
                  className="h-10 gap-2 px-4 shadow-sm"
                  onClick={() => void handleCreateConversation()}
                  disabled={!selectedAssistantId}
                >
                  <Plus className="h-4 w-4" /> Nova conversa
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 shrink-0"
                      onClick={() => void handleRefreshMessages()}
                      disabled={!selectedAssistantId || !selectedConversationId}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Recarregar mensagens</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 shrink-0"
                      onClick={() => {
                        setMessages([]);
                        setChatMessage("");
                        discardPendingAttachmentDraft();
                        setSimulatedBindings((items) =>
                          items.filter(
                            (binding) => binding.conversationId !== selectedConversationId,
                          ),
                        );
                        if (recordingAudio) {
                          cancelAudioRecording();
                        }
                        shouldStickToBottomRef.current = true;
                        setPreviewResult(null);
                        setRunResult(null);
                        setSendResult(null);
                        setError(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpar tela</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="grid flex-1 min-h-0 gap-4 lg:[grid-template-columns:minmax(0,1.6fr)_minmax(360px,0.9fr)]">
              <Card className="flex min-h-0 flex-col overflow-hidden border-border/70 bg-card/90 shadow-sm">
                <CardHeader className="border-b bg-card/40 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base font-semibold">
                        {chatTitle}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{chatSubtitle}</span>
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                          runtime
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                  {isLoadingAssistants ? (
                    <div className="flex flex-1 items-center justify-center p-6">
                      <LoadingState label="Carregando assistentes…" />
                    </div>
                  ) : hasBlockingError ? (
                    <div className="flex flex-1 items-center justify-center p-6">
                      <ErrorState
                        className="w-full"
                        title="Não foi possível carregar o runtime"
                        description={error}
                        onRetry={retryCurrentLoad}
                      />
                    </div>
                  ) : !selectedAssistant || (!selectedConversationId && !isLoadingConversations) ? (
                    <div className="flex flex-1 items-center justify-center p-6">
                      <EmptyState
                        className="w-full"
                        title="Teste aguardando seleção"
                        description="Selecione um assistente e uma conversa para iniciar o teste."
                      />
                    </div>
                  ) : (
                    <>
                      <div
                        ref={messagesContainerRef}
                        onScroll={() => {
                          const el = messagesContainerRef.current;
                          if (!el) {
                            return;
                          }

                          const distanceFromBottom =
                            el.scrollHeight - el.scrollTop - el.clientHeight;
                          shouldStickToBottomRef.current = distanceFromBottom < 120;
                        }}
                        className="clean-scrollbar flex-1 min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.05),transparent_35%)] px-4 py-4"
                      >
                        {error === CONVERSATION_NOT_FOUND_MESSAGE ? (
                          <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                            {error}
                          </div>
                        ) : null}

                        {isLoadingConversations && displayedMessages.length === 0 ? (
                          <div className="flex h-full min-h-[220px] items-center justify-center">
                            <LoadingState label="Carregando conversas…" />
                          </div>
                        ) : isLoadingMessages && displayedMessages.length === 0 ? (
                          <div className="flex h-full min-h-[220px] items-center justify-center">
                            <LoadingState label="Carregando mensagens…" />
                          </div>
                        ) : displayedMessages.length === 0 ? (
                          <div className="flex h-full min-h-[260px] items-center justify-center">
                            <div className="max-w-sm rounded-2xl border border-border/60 bg-background/75 px-5 py-5 text-center shadow-sm">
                              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                                <MessageSquare className="h-5 w-5" />
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                Nenhuma mensagem ainda.
                              </p>
                              <p className="mt-2 text-sm text-muted-foreground">
                                Envie uma mensagem para testar este atendimento.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {isLoadingConversations || isLoadingMessages ? (
                              <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                Atualizando conversa
                              </div>
                            ) : null}
                            {displayedMessages.map((message) => (
                              <div
                                key={message.id}
                                className={cn(
                                  "flex min-w-0",
                                  message.role === "user" ? "justify-end" : "justify-start",
                                )}
                              >
                                <div
                                  className={cn(
                                    "min-w-0 max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm break-words whitespace-pre-wrap",
                                    message.role === "user"
                                      ? "rounded-br-md bg-[#dff6cf] text-slate-950 dark:bg-emerald-500/25 dark:text-emerald-50"
                                      : "rounded-bl-md border border-border/70 bg-white/90 text-slate-900 dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-50",
                                  )}
                                >
                                  {message.payload ? (
                                    <AttachmentBubble payload={message.payload} />
                                  ) : message.attachments?.length ? (
                                    <div className="space-y-2">
                                      {message.attachments.map((attachment, index) => (
                                        <PersistedAttachmentBubble
                                          key={`${message.id}-${attachment.fileName}-${index}`}
                                          attachment={attachment}
                                        />
                                      ))}
                                      <p className="break-words">{message.content}</p>
                                    </div>
                                  ) : (
                                    <p className="break-words">{message.content}</p>
                                  )}

                                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                    <span>{formatMessageTime(message.createdAt)}</span>
                                    {message.role === "assistant" && message.mode ? (
                                      <span className="uppercase tracking-[0.16em]">
                                        {getMessageModeLabel(message.mode)}
                                      </span>
                                    ) : message.status === "pending" ? (
                                      <span className="uppercase tracking-[0.16em]">enviando</span>
                                    ) : message.status === "error" ? (
                                      <span className="uppercase tracking-[0.16em] text-destructive">
                                        erro
                                      </span>
                                    ) : (
                                      <span />
                                    )}
                                  </div>

                                  {message.role === "assistant" && message.sources?.length ? (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {message.sources.map((source) => (
                                        <span
                                          key={source.id}
                                          className="rounded-full border border-border/70 bg-background/80 px-2.5 py-0.5 text-[11px] leading-none text-foreground"
                                          title={source.title}
                                        >
                                          {source.title}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t bg-background/80 px-4 py-3 backdrop-blur">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileSelection}
                        />

                        {pendingAttachmentDraft ? (
                          <div className="mb-3 rounded-2xl border border-border/70 bg-background/85 p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-3">
                                  <AttachmentPreview payload={pendingAttachmentDraft} />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-foreground">
                                      {getPayloadTitle(pendingAttachmentDraft)}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {getPayloadMeta(pendingAttachmentDraft)}
                                    </div>
                                  </div>
                                </div>

                                {supportsCaption(pendingAttachmentDraft) ? (
                                  <Input
                                    value={pendingAttachmentDraft.caption ?? ""}
                                    onChange={(event) =>
                                      setPendingAttachmentDraft((current) =>
                                        current && "caption" in current
                                          ? { ...current, caption: event.target.value }
                                          : current,
                                      )
                                    }
                                    placeholder="Adicionar legenda"
                                    className="mt-3 h-9"
                                  />
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => discardPendingAttachmentDraft()}
                                >
                                  <X className="mr-1 h-4 w-4" /> Remover
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => void handleSendAttachmentDraft()}
                                  disabled={isSendingMessage || !selectedConversationId}
                                >
                                  Enviar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {recordingAudio ? (
                          <div className="flex items-center gap-3 rounded-full border border-destructive/25 bg-destructive/5 px-4 py-2.5">
                            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                            <div className="text-sm font-medium text-foreground">Gravando...</div>
                            <div className="font-mono text-sm text-muted-foreground">
                              {formatDuration(recordingSeconds)}
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <Button size="sm" variant="ghost" onClick={cancelAudioRecording}>
                                Cancelar
                              </Button>
                              <Button size="sm" onClick={confirmAudioRecording}>
                                Enviar áudio
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-full bg-[#f0f2f5] px-2 py-2 dark:bg-[#202c33]">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-background/70"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-64">
                                <DropdownMenuItem
                                  onSelect={() => handleAttachmentMenuAction("image")}
                                >
                                  <ImageIcon className="h-4 w-4" /> Imagem
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleAttachmentMenuAction("document")}
                                >
                                  <FileText className="h-4 w-4" /> Documento
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleAttachmentMenuAction("video")}
                                >
                                  <Video className="h-4 w-4" /> Vídeo
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleAttachmentMenuAction("audio")}
                                >
                                  <Mic className="h-4 w-4" /> Áudio
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={() => handleAttachmentMenuAction("contact")}
                                >
                                  <UserRound className="h-4 w-4" /> Contato
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleAttachmentMenuAction("location")}
                                >
                                  <MapPin className="h-4 w-4" /> Localização
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleAttachmentMenuAction("gif")}
                                >
                                  <Film className="h-4 w-4" /> GIF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-background/70"
                                >
                                  <SmilePlus className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48">
                                {["😀", "😂", "😍", "🙏", "👍", "🔥"].map((emoji) => (
                                  <DropdownMenuItem key={emoji} onSelect={() => insertEmoji(emoji)}>
                                    <span className="text-base">{emoji}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      Inserir emoji
                                    </span>
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={() => handleAttachmentMenuAction("gif")}
                                >
                                  <Film className="h-4 w-4" /> Escolher GIF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex-1 rounded-full bg-background px-4 py-2 shadow-sm">
                              <Textarea
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Digite uma mensagem"
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                                className="clean-scrollbar min-h-[24px] max-h-32 w-full resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSend();
                                  }
                                }}
                              />
                            </div>

                            {showMicButton ? (
                              <Button
                                size="icon"
                                className="h-10 w-10 shrink-0 rounded-full"
                                onClick={() => void startAudioRecording()}
                                disabled={
                                  isSendingMessage ||
                                  !!pendingAttachmentDraft ||
                                  !selectedConversationId
                                }
                              >
                                <Mic className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                className="h-10 w-10 shrink-0 rounded-full"
                                onClick={() => void handleSend()}
                                disabled={!canSendMessage}
                              >
                                {isSendingMessage ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="flex min-h-0 flex-col overflow-hidden border-border/70 bg-card/90 shadow-sm">
                <CardHeader className="border-b bg-card/40 px-5 py-4">
                  <CardTitle className="text-base font-semibold">Debug da IA</CardTitle>
                </CardHeader>
                <CardContent className="clean-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
                  <Section title="Status">
                    <div className="grid gap-2">
                      <MetaRow label="Assistente" value={selectedAssistant?.name ?? "—"} />
                      <MetaRow
                        label="Conversa ativa"
                        value={
                          selectedConversation
                            ? formatConversationPrimaryLabel(selectedConversation)
                            : "—"
                        }
                      />
                      <MetaRow label="Preview" value={previewResult ? "Executado" : "Disponível"} />
                      <MetaRow label="Runtime" value={runResult ? "Executado" : "Disponível"} />
                      <MetaRow
                        label="Mensagens"
                        value={isLoadingMessages ? "Carregando" : "Prontas"}
                      />
                      <MetaRow
                        label="Anexos"
                        value={isProcessingAttachment ? "Processando" : "Sem processamento ativo"}
                      />
                      <MetaRow
                        label="Debug"
                        value={isLoadingRuntimeDebug ? "Atualizando" : "Atualizado"}
                      />
                    </div>
                  </Section>

                  <Section title="Execução">
                    <div className="grid gap-2">
                      <MetaRow label="Modelo" value={selectedAssistantModel} />
                      <MetaRow label="Temperatura" value={String(selectedTemperature)} />
                      <MetaRow
                        label="Origem"
                        value={
                          runtime
                            ? `${getConfigurationSourceLabel(runtime.configurationSource)} / ${getModelSourceLabel(runtime.modelSource)}`
                            : "Aguardando execução"
                        }
                      />
                      <MetaRow label="Classificação" value={runtime?.outcome ?? "unknown"} />
                    </div>
                  </Section>

                  <Section title="Entrada interpretada">
                    <div className="grid gap-2">
                      <MetaRow
                        label="Tipo"
                        value={
                          interpretedInputMessage?.messageType ??
                          (interpretedInputAttachments.length > 0
                            ? (interpretedInputAttachments[0]?.type ?? "anexo")
                            : "texto")
                        }
                      />
                      <MetaRow label="Anexos" value={String(interpretedInputAttachments.length)} />
                      <MetaRow
                        label="Conteúdo final"
                        value={interpretedInputMessage?.content ?? "—"}
                      />
                    </div>
                    {interpretedInputAttachments.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {interpretedInputAttachments.map((attachment, index) => (
                          <DebugText
                            key={`${attachment.fileName}-${index}`}
                            value={interpretAttachmentLine(attachment).join("\n")}
                          />
                        ))}
                      </div>
                    ) : null}
                  </Section>

                  <Section title="Contexto usado">
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
                      <div className="grid gap-2">
                        <MetaRow
                          label="Histórico"
                          value={
                            runtime?.context
                              ? `${runtime.context.historyMessagesUsed}/${runtime.context.historyLimit}`
                              : "—"
                          }
                        />
                        <MetaRow
                          label="Fallback"
                          value={runtime?.fallback ? "sim" : runtime ? "não" : "—"}
                        />
                        {runtime?.reason ? (
                          <MetaRow label="Razão" value={getFallbackReasonLabel(runtime.reason)} />
                        ) : null}
                        <div className="pt-1">
                          {contextSources.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {contextSources.map((source) => (
                                <span
                                  key={source.id}
                                  className="rounded-full border border-border/70 bg-background/80 px-2.5 py-0.5 text-[11px] text-foreground"
                                  title={source.title}
                                >
                                  {source.title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma fonte usada ainda.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section title="Pergunta">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Pergunta do preview</Label>
                      <Input
                        value={previewQuestion}
                        onChange={(e) => setPreviewQuestion(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </Section>

                  <Section title="Resposta do preview">
                    <DebugText value={previewAnswerText} />
                  </Section>

                  <Section title="Resposta do runtime">
                    <DebugText
                      value={
                        sendResult?.assistantMessage.content ??
                        runResult?.output.answer ??
                        runtimeMessage?.content ??
                        "Envie uma mensagem para ver a resposta."
                      }
                    />
                  </Section>

                  <Section title="Resumo">
                    <DebugText
                      value={
                        runtime?.summary ??
                        "Envie uma mensagem para gerar o resumo determinístico da execução."
                      }
                    />
                  </Section>
                </CardContent>
              </Card>
            </div>
          </div>
        </TooltipProvider>
      </div>

      <Dialog
        open={contactDialogOpen}
        onOpenChange={(open) => {
          setContactDialogOpen(open);
          if (!open) {
            setContactDraft({ name: "", phone: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo contato</DialogTitle>
            <DialogDescription>
              Preencha os dados para simular uma mensagem do tipo contato.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field label="Nome">
              <Input
                value={contactDraft.name}
                onChange={(event) =>
                  setContactDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="João da Silva"
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={contactDraft.phone}
                onChange={(event) =>
                  setContactDraft((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="+55 67 99999-9999"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveContactDraft}>Salvar contato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={locationDialogOpen}
        onOpenChange={(open) => {
          setLocationDialogOpen(open);
          if (!open) {
            setLocationDraft({ label: "", latitude: "", longitude: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova localização</DialogTitle>
            <DialogDescription>
              Informe um local de referência ou use sua posição atual para simular a mensagem.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field label="Descrição">
              <Input
                value={locationDraft.label}
                onChange={(event) =>
                  setLocationDraft((current) => ({ ...current, label: event.target.value }))
                }
                placeholder="Recepção do clube"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude">
                <Input
                  value={locationDraft.latitude}
                  onChange={(event) =>
                    setLocationDraft((current) => ({ ...current, latitude: event.target.value }))
                  }
                  placeholder="-20.4697"
                />
              </Field>
              <Field label="Longitude">
                <Input
                  value={locationDraft.longitude}
                  onChange={(event) =>
                    setLocationDraft((current) => ({ ...current, longitude: event.target.value }))
                  }
                  placeholder="-54.6201"
                />
              </Field>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => void handleUseCurrentLocation()}>
              Usar minha localização
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLocationDraft}>Salvar localização</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(92px,1fr)_minmax(0,1.4fr)] items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-mono text-sm text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}

function DebugText({ value }: { value: string }) {
  return (
    <div
      className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm leading-6 text-foreground whitespace-pre-wrap break-words"
      title={value}
    >
      {value}
    </div>
  );
}

function AttachmentBubble({ payload }: { payload: PendingAttachmentDraft }) {
  if (payload.type === "image" || payload.type === "gif") {
    return (
      <div className="space-y-2">
        {payload.previewUrl ? (
          <img
            src={payload.previewUrl}
            alt={payload.fileName}
            className="max-h-64 w-full rounded-xl object-cover"
          />
        ) : null}
        <div className="text-xs text-muted-foreground">{payload.fileName}</div>
        {"caption" in payload && payload.caption ? (
          <p className="break-words">{payload.caption}</p>
        ) : null}
      </div>
    );
  }

  if (payload.type === "video") {
    return (
      <div className="space-y-2">
        {payload.previewUrl ? (
          <video
            src={payload.previewUrl}
            className="max-h-64 w-full rounded-xl bg-black/10 object-cover"
            controls
            preload="metadata"
          />
        ) : null}
        <div className="flex items-center gap-2 text-sm">
          <Video className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{payload.fileName}</span>
        </div>
        <div className="text-xs text-muted-foreground">{formatFileSize(payload.size)}</div>
        {payload.caption ? <p className="break-words">{payload.caption}</p> : null}
      </div>
    );
  }

  if (payload.type === "audio") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Mic className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{payload.fileName ?? "Áudio gravado"}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {[
            payload.durationSeconds ? formatDuration(payload.durationSeconds) : null,
            payload.size ? formatFileSize(payload.size) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {payload.audioUrl ? (
          <audio
            controls
            src={payload.audioUrl}
            className="h-10 w-full max-w-full"
            preload="metadata"
          />
        ) : null}
      </div>
    );
  }

  if (payload.type === "document") {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-3 rounded-xl bg-background/60 px-3 py-3">
          <FileText className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{payload.fileName}</div>
            <div className="text-xs text-muted-foreground">{formatFileSize(payload.size)}</div>
          </div>
        </div>
        {payload.caption ? <p className="break-words">{payload.caption}</p> : null}
      </div>
    );
  }

  if (payload.type === "contact") {
    return (
      <div className="rounded-xl bg-background/60 px-3 py-3">
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{payload.name}</div>
            <div className="text-xs text-muted-foreground">{payload.phone}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-background/60 px-3 py-3">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {payload.label ?? "Localização enviada"}
          </div>
          <div className="text-xs text-muted-foreground">
            {[payload.latitude, payload.longitude]
              .filter((value) => value !== undefined)
              .join(", ")}
          </div>
        </div>
      </div>
    </div>
  );
}

function getAttachmentStatusLabel(status?: string | null): string | null {
  switch (status) {
    case "pending":
      return "Processando";
    case "processing":
      return "Processando";
    case "completed":
      return "Processado";
    case "failed":
      return "Falha ao processar";
    default:
      return null;
  }
}

function formatAttachmentProcessingError(attachment: PersistedAttachment): string {
  const rawMessage = attachment.processingError ?? "";
  const normalized = rawMessage.toLowerCase();

  if (
    attachment.type === "audio" &&
    (normalized.includes("corrupted") || normalized.includes("unsupported"))
  ) {
    return "Não foi possível transcrever este áudio. Tente gravar novamente ou enviar em outro formato.";
  }

  if (normalized.includes("provider") || normalized.includes("openai")) {
    return "Não foi possível interpretar o anexo agora. Tente novamente.";
  }

  return rawMessage;
}

function PersistedAttachmentBubble({ attachment }: { attachment: PersistedAttachment }) {
  const statusLabel = getAttachmentStatusLabel(attachment.processingStatus);

  return (
    <div className="space-y-2 rounded-xl bg-background/60 px-3 py-3">
      <div className="flex items-start gap-3">
        <AttachmentPreviewFromPersisted attachment={attachment} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{attachment.fileName}</div>
          <div className="text-xs text-muted-foreground">
            {[formatFileSize(attachment.size), attachment.mimeType].filter(Boolean).join(" · ")}
          </div>
        </div>
        {statusLabel ? (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]",
              attachment.processingStatus === "failed"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : attachment.processingStatus === "completed"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            {statusLabel}
          </span>
        ) : null}
      </div>

      {attachment.transcript ? (
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">
          Transcrição: {attachment.transcript}
        </p>
      ) : null}

      {attachment.interpretedSummary ? (
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">
          {attachment.interpretedSummary}
        </p>
      ) : null}

      {attachment.extractedText ? (
        <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
          {attachment.extractedText}
        </p>
      ) : null}

      {attachment.processingError ? (
        <p className="whitespace-pre-wrap break-words text-xs text-destructive">
          {formatAttachmentProcessingError(attachment)}
        </p>
      ) : null}
    </div>
  );
}

function AttachmentPreviewFromPersisted({ attachment }: { attachment: PersistedAttachment }) {
  const type = attachment.type === "gif" ? "image" : attachment.type;

  if (type === "image") {
    return (
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Video className="h-5 w-5" />
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Mic className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
      <FileText className="h-5 w-5" />
    </div>
  );
}

function AttachmentPreview({ payload }: { payload: PendingAttachmentDraft }) {
  if ((payload.type === "image" || payload.type === "gif") && payload.previewUrl) {
    return (
      <img
        src={payload.previewUrl}
        alt={payload.fileName}
        className="h-14 w-14 rounded-xl object-cover"
      />
    );
  }

  if (payload.type === "video" && payload.previewUrl) {
    return (
      <video
        src={payload.previewUrl}
        className="h-14 w-14 rounded-xl bg-black/10 object-cover"
        muted
        preload="metadata"
      />
    );
  }

  if (payload.type === "audio") {
    return (
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary">
        <Mic className="h-5 w-5" />
      </div>
    );
  }

  if (payload.type === "document") {
    return (
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </div>
    );
  }

  if (payload.type === "contact") {
    return (
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary">
        <UserRound className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary">
      <MapPin className="h-5 w-5" />
    </div>
  );
}

function supportsCaption(
  payload: PendingAttachmentDraft,
): payload is Extract<PendingAttachmentDraft, { caption?: string }> {
  return payload.type === "image" || payload.type === "document" || payload.type === "video";
}

function getPayloadTitle(payload: PendingAttachmentDraft): string {
  switch (payload.type) {
    case "image":
    case "document":
    case "video":
    case "gif":
      return payload.fileName;
    case "audio":
      return payload.fileName ?? "Áudio gravado";
    case "contact":
      return payload.name;
    case "location":
      return payload.label ?? "Localização";
  }
}

function getPayloadMeta(payload: PendingAttachmentDraft): string {
  switch (payload.type) {
    case "image":
    case "video":
    case "gif":
      return `${formatFileSize(payload.size)} · ${payload.mimeType}`;
    case "document":
      return `${formatFileSize(payload.size)} · Documento`;
    case "audio":
      return [
        payload.durationSeconds ? formatDuration(payload.durationSeconds) : null,
        payload.size ? formatFileSize(payload.size) : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "contact":
      return payload.phone;
    case "location":
      return payload.latitude !== undefined && payload.longitude !== undefined
        ? `${payload.latitude}, ${payload.longitude}`
        : "Sem coordenadas";
  }
}

function serializePayloadForRuntime(payload: PendingAttachmentDraft): string {
  switch (payload.type) {
    case "image":
      return [
        `Imagem enviada: ${payload.fileName}`,
        `Formato: ${payload.mimeType}`,
        `Tamanho: ${formatFileSize(payload.size)}`,
        payload.caption ? `Legenda: ${payload.caption}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "document":
      return [
        `Documento enviado: ${payload.fileName}`,
        `Formato: ${payload.mimeType}`,
        `Tamanho: ${formatFileSize(payload.size)}`,
        payload.caption ? `Legenda: ${payload.caption}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "video":
      return [
        `Vídeo enviado: ${payload.fileName}`,
        `Formato: ${payload.mimeType}`,
        `Tamanho: ${formatFileSize(payload.size)}`,
        payload.caption ? `Legenda: ${payload.caption}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "audio":
      return [
        `Áudio enviado: ${payload.fileName ?? "áudio gravado"}`,
        payload.durationSeconds ? `Duração: ${formatDuration(payload.durationSeconds)}` : null,
        payload.size ? `Tamanho: ${formatFileSize(payload.size)}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "contact":
      return `Contato enviado:\nNome: ${payload.name}\nTelefone: ${payload.phone}`;
    case "location":
      return [
        `Localização enviada: ${payload.label ?? "sem descrição"}`,
        payload.latitude !== undefined && payload.longitude !== undefined
          ? `Coordenadas: ${payload.latitude}, ${payload.longitude}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "gif":
      return [`GIF enviado: ${payload.fileName}`, `Formato: ${payload.mimeType}`].join("\n");
  }
}

function buildSendPayload(
  payload: TestMessagePayload,
  textToRuntime: string,
): BackendConversationSendRequest {
  if (payload.type === "text") {
    return { message: textToRuntime, source: "tests" };
  }

  if (payload.type === "contact") {
    return {
      message: textToRuntime,
      source: "tests",
      messageType: "contact",
      contact: {
        name: payload.name,
        phone: payload.phone,
      },
    };
  }

  if (payload.type === "location") {
    return {
      message: textToRuntime,
      source: "tests",
      messageType: "location",
      location: {
        label: payload.label,
        latitude: payload.latitude,
        longitude: payload.longitude,
      },
    };
  }

  return {
    message: textToRuntime,
    source: "tests",
    messageType: payload.type,
    attachments: [
      {
        type: payload.type === "gif" ? "gif" : payload.type,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        size: payload.size,
        caption: "caption" in payload ? payload.caption : undefined,
        durationSeconds: payload.type === "audio" ? payload.durationSeconds : undefined,
      },
    ],
  };
}

function hasBinaryAttachment(
  payload: TestMessagePayload,
): payload is Extract<
  TestMessagePayload,
  { type: "image" | "document" | "audio" | "video" | "gif" }
> {
  return ["image", "document", "audio", "video", "gif"].includes(payload.type);
}

function resolvePreferredAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }

  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"].find(
    (mimeType) => MediaRecorder.isTypeSupported(mimeType),
  );
}

function audioExtensionForMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("ogg")) {
    return "ogg";
  }

  if (normalized.includes("mpeg") || normalized.includes("mp3")) {
    return "mp3";
  }

  if (normalized.includes("wav")) {
    return "wav";
  }

  return "webm";
}

function formatLoadErrorMessage(error: unknown, fallback: string, timedOut = false): string {
  if (timedOut) {
    return "Não foi possível carregar o runtime. A requisição demorou mais que o esperado.";
  }

  const rawMessage = error instanceof Error ? error.message : fallback;
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("request entity too large") || normalized.includes("payload too large")) {
    return "Arquivo muito grande para envio.";
  }

  if (error instanceof ApiError && error.status >= 500) {
    return fallback;
  }

  return rawMessage;
}

function formatSendErrorMessage(error: unknown, timedOut = false): string {
  if (timedOut) {
    return "Não foi possível carregar o runtime. A requisição demorou mais que o esperado.";
  }

  const rawMessage =
    error instanceof Error ? error.message : "Não foi possível enviar a mensagem de teste.";
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("request entity too large") || normalized.includes("payload too large")) {
    return "Arquivo muito grande para envio. Tente um arquivo menor.";
  }

  if (
    normalized.includes("audio file might be corrupted or unsupported") ||
    normalized.includes("corrupted") ||
    normalized.includes("unsupported")
  ) {
    return "Não foi possível transcrever este áudio. Tente gravar novamente ou enviar em outro formato.";
  }

  if (normalized.includes("provider") || normalized.includes("openai")) {
    return "Não foi possível interpretar o anexo agora. Tente novamente.";
  }

  return rawMessage;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getMessageModeLabel(mode: string | null | undefined): string {
  if (mode === "ai-runtime") {
    return "IA real";
  }

  if (mode === "initial-message") {
    return "mensagem inicial";
  }

  return "determinístico";
}

function getConfigurationSourceLabel(
  source: "tenant-settings" | "env-fallback" | "mixed" | "unavailable",
): string {
  const labels = {
    "tenant-settings": "tenant",
    "env-fallback": ".env",
    mixed: "mista",
    unavailable: "indisponível",
  } satisfies Record<typeof source, string>;

  return labels[source];
}

function getModelSourceLabel(
  source: "assistant" | "runtime-config" | "not-configured" | undefined,
): string {
  if (source === "assistant") {
    return "modelo do assistente";
  }

  if (source === "runtime-config") {
    return "modelo da configuração";
  }

  return "modelo não configurado";
}

function getFallbackReasonLabel(
  reason: NonNullable<BackendConversationSendResponse["runtime"]["reason"]>,
): string {
  const labels = {
    "ai-runtime-disabled": "IA real desabilitada",
    "ai-provider-not-configured": "Provider incompleto",
    "ai-model-not-configured": "Modelo não configurado",
    "ai-provider-auth-error": "Autenticação do provider",
    "ai-provider-quota-error": "Quota/rate limit do provider",
    "ai-provider-error": "Erro do provider",
  } satisfies Record<NonNullable<BackendConversationSendResponse["runtime"]["reason"]>, string>;

  return labels[reason];
}

function isConversationNotFoundError(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status === 404 && error.message === "Conversation not found."
  );
}
