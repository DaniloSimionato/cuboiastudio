import { n as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "./_libs/react.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { t as Button } from "./_ssr/button-COtkgzDj.mjs";
import { n as apiFetch, t as ApiError } from "./_ssr/apiClient-Dme41CHA.mjs";
import { $ as FileText, I as Mic, K as Image, L as MessageSquare, Mt as LoaderCircle, Ot as UserRound, T as RefreshCw, Z as Film, b as Send, d as Trash2, h as SmilePlus, i as Video, k as Plus, t as X, z as MapPin } from "./_libs/lucide-react.mjs";
import { a as DropdownMenuSeparator, c as TooltipContent, l as TooltipProvider, n as DropdownMenuContent, o as DropdownMenuTrigger, r as DropdownMenuItem, s as Tooltip, t as DropdownMenu, u as TooltipTrigger } from "./_ssr/tooltip-JDz4WYjb.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-BW9s_OV3.mjs";
import { t as Input } from "./_ssr/input-B8Ml971c.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./_ssr/select-vCNF5d_j.mjs";
import { n as ErrorState, r as LoadingState, t as EmptyState } from "./_ssr/States-Bsft3ipc.mjs";
import { a as resolveOperationalAssistantId, n as filterOperationalAssistants, t as backendAssistantsService } from "./_ssr/backendAssistantsService-CPFwOdlH.mjs";
import { t as Label } from "./_ssr/label-BZdmkwq8.mjs";
import { t as Textarea } from "./_ssr/textarea-CULRsq90.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./_ssr/dialog-BQR4UioY.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as Route } from "./_app.testes-NePO95L7.mjs";
import { i as formatConversationSecondaryLabel, o as resolveOperationalConversationId, r as formatConversationPrimaryLabel, t as filterOperationalConversations } from "./_ssr/conversations-B8gZYb2W.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.testes-BzlAz1Gk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var backendConversationsService = {
	async create(assistantId, input, options = {}) {
		return apiFetch(`/assistants/${assistantId}/conversations`, {
			method: "POST",
			body: JSON.stringify(input ?? {}),
			signal: options.signal
		});
	},
	async list(assistantId, options = {}) {
		return (await apiFetch(`/assistants/${assistantId}/conversations`, { signal: options.signal })).items;
	},
	async messages(assistantId, conversationId, options = {}) {
		return (await apiFetch(`/assistants/${assistantId}/conversations/${conversationId}/messages`, { signal: options.signal })).items;
	},
	async send(assistantId, conversationId, input, options = {}) {
		return apiFetch(`/assistants/${assistantId}/conversations/${conversationId}/messages`, {
			method: "POST",
			body: JSON.stringify(input ?? {}),
			signal: options.signal
		});
	},
	async sendMultipart(assistantId, conversationId, input, files, options = {}) {
		const formData = new FormData();
		formData.append("payload", JSON.stringify(input ?? {}));
		files.forEach((file, index) => {
			const attachment = input.attachments?.[index];
			formData.append("attachments", file, attachment?.fileName ?? `attachment-${index + 1}`);
		});
		return apiFetch(`/assistants/${assistantId}/conversations/${conversationId}/messages/multipart`, {
			method: "POST",
			body: formData,
			signal: options.signal
		});
	}
};
var _jsxFileName = "/Users/danilosimionato/Projetos/CuboIAStudio/src/routes/_app.testes.tsx?tsr-split=component";
var CONVERSATION_NOT_FOUND_MESSAGE = "A conversa selecionada não pertence a este assistente ou não existe mais. Selecione outra conversa ou crie uma nova.";
var MB = 1024 * 1024;
var CLIENT_UPLOAD_LIMITS = {
	image: 10 * MB,
	gif: 10 * MB,
	audio: 25 * MB,
	document: 20 * MB,
	video: 20 * MB
};
var TESTES_REQUEST_TIMEOUT_MS = 3e4;
function TestePage() {
	const search = Route.useSearch();
	const [assistants, setAssistants] = (0, import_react.useState)([]);
	const [selectedAssistantId, setSelectedAssistantId] = (0, import_react.useState)(search.assistantId ?? "");
	const [conversations, setConversations] = (0, import_react.useState)([]);
	const [selectedConversationId, setSelectedConversationId] = (0, import_react.useState)("");
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [chatMessage, setChatMessage] = (0, import_react.useState)("");
	const [pendingAttachmentDraft, setPendingAttachmentDraft] = (0, import_react.useState)(null);
	const [simulatedBindings, setSimulatedBindings] = (0, import_react.useState)([]);
	const [recordingAudio, setRecordingAudio] = (0, import_react.useState)(false);
	const [recordingSeconds, setRecordingSeconds] = (0, import_react.useState)(0);
	const [contactDialogOpen, setContactDialogOpen] = (0, import_react.useState)(false);
	const [contactDraft, setContactDraft] = (0, import_react.useState)({
		name: "",
		phone: ""
	});
	const [locationDialogOpen, setLocationDialogOpen] = (0, import_react.useState)(false);
	const [locationDraft, setLocationDraft] = (0, import_react.useState)({
		label: "",
		latitude: "",
		longitude: ""
	});
	const [previewQuestion, setPreviewQuestion] = (0, import_react.useState)("Qual é o horário de atendimento?");
	const [previewResult, setPreviewResult] = (0, import_react.useState)(null);
	const [runResult, setRunResult] = (0, import_react.useState)(null);
	const [sendResult, setSendResult] = (0, import_react.useState)(null);
	const [isLoadingAssistants, setIsLoadingAssistants] = (0, import_react.useState)(true);
	const [isLoadingConversations, setIsLoadingConversations] = (0, import_react.useState)(false);
	const [isLoadingMessages, setIsLoadingMessages] = (0, import_react.useState)(false);
	const [isSendingMessage, setIsSendingMessage] = (0, import_react.useState)(false);
	const [isProcessingAttachment, setIsProcessingAttachment] = (0, import_react.useState)(false);
	const [isLoadingRuntimeDebug, setIsLoadingRuntimeDebug] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const messagesContainerRef = (0, import_react.useRef)(null);
	const shouldStickToBottomRef = (0, import_react.useRef)(true);
	const assistantsRequestRef = (0, import_react.useRef)(null);
	const conversationsRequestRef = (0, import_react.useRef)(null);
	const messagesRequestRef = (0, import_react.useRef)(null);
	const sendRequestRef = (0, import_react.useRef)(null);
	const fileInputRef = (0, import_react.useRef)(null);
	const pendingPickerTypeRef = (0, import_react.useRef)(null);
	const mediaRecorderRef = (0, import_react.useRef)(null);
	const mediaStreamRef = (0, import_react.useRef)(null);
	const mediaChunksRef = (0, import_react.useRef)([]);
	const recordingTimerRef = (0, import_react.useRef)(null);
	const sendRecordedAudioRef = (0, import_react.useRef)(false);
	const recordingSecondsRef = (0, import_react.useRef)(0);
	const pendingAttachmentDraftRef = (0, import_react.useRef)(null);
	const simulatedBindingsRef = (0, import_react.useRef)([]);
	const visibleAssistants = (0, import_react.useMemo)(() => filterOperationalAssistants(assistants), [assistants]);
	const selectedAssistant = (0, import_react.useMemo)(() => visibleAssistants.find((assistant) => assistant.id === selectedAssistantId) ?? null, [visibleAssistants, selectedAssistantId]);
	const visibleConversations = (0, import_react.useMemo)(() => filterOperationalConversations(conversations), [conversations]);
	const selectedConversation = (0, import_react.useMemo)(() => visibleConversations.find((conversation) => conversation.id === selectedConversationId) ?? null, [visibleConversations, selectedConversationId]);
	const releasePayloadResources = (payload) => {
		if (!payload) return;
		if ("previewUrl" in payload && payload.previewUrl) URL.revokeObjectURL(payload.previewUrl);
		if (payload.type === "audio" && payload.audioUrl) URL.revokeObjectURL(payload.audioUrl);
	};
	const createTimedAbortRequest = () => {
		const request = {
			controller: new AbortController(),
			timeoutId: 0,
			timedOut: false
		};
		request.timeoutId = window.setTimeout(() => {
			request.timedOut = true;
			request.controller.abort();
		}, TESTES_REQUEST_TIMEOUT_MS);
		return request;
	};
	const finishTimedAbortRequest = (ref, request) => {
		window.clearTimeout(request.timeoutId);
		if (ref.current === request) ref.current = null;
	};
	const cancelTimedAbortRequest = (ref) => {
		const request = ref.current;
		if (!request) return;
		window.clearTimeout(request.timeoutId);
		request.controller.abort();
		ref.current = null;
	};
	const startTimedAbortRequest = (ref) => {
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
	const handleAssistantChange = (assistantId) => {
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
			const assistantItems = await backendAssistantsService.list({ signal: request.controller.signal });
			if (assistantsRequestRef.current !== request) return;
			setAssistants(assistantItems);
			setSelectedAssistantId(resolveOperationalAssistantId(assistantItems, search.assistantId));
		} catch (err) {
			if (request.controller.signal.aborted && !request.timedOut) return;
			setError(formatLoadErrorMessage(err, "Não foi possível carregar o backend.", request.timedOut));
		} finally {
			if (assistantsRequestRef.current === request) setIsLoadingAssistants(false);
			finishTimedAbortRequest(assistantsRequestRef, request);
		}
	};
	const loadAssistantData = async (assistantId) => {
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
			const items = await backendConversationsService.list(assistantId, { signal: request.controller.signal });
			if (conversationsRequestRef.current !== request) return;
			setConversations(items);
		} catch (err) {
			if (request.controller.signal.aborted && !request.timedOut) return;
			setError(formatLoadErrorMessage(err, "Não foi possível carregar as conversas.", request.timedOut));
		} finally {
			if (conversationsRequestRef.current === request) setIsLoadingConversations(false);
			finishTimedAbortRequest(conversationsRequestRef, request);
		}
	};
	const handleConversationNotFound = async (assistantId) => {
		setSelectedConversationId("");
		setMessages([]);
		setSendResult(null);
		setError(CONVERSATION_NOT_FOUND_MESSAGE);
		await loadAssistantData(assistantId);
	};
	const loadMessages = async (assistantId, conversationId) => {
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
			const items = await backendConversationsService.messages(assistantId, conversationId, { signal: request.controller.signal });
			if (messagesRequestRef.current !== request) return;
			setMessages(items);
		} catch (err) {
			if (request.controller.signal.aborted && !request.timedOut) return;
			if (isConversationNotFoundError(err)) {
				await handleConversationNotFound(assistantId);
				return;
			}
			setError(formatLoadErrorMessage(err, "Não foi possível carregar as mensagens.", request.timedOut));
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
			loadAssistants();
			return;
		}
		if (selectedAssistantId && selectedConversationId) {
			loadMessages(selectedAssistantId, selectedConversationId);
			return;
		}
		if (selectedAssistantId) loadAssistantData(selectedAssistantId);
	};
	(0, import_react.useEffect)(() => {
		loadAssistants();
		return () => {
			cancelTimedAbortRequest(assistantsRequestRef);
		};
	}, [search.assistantId]);
	(0, import_react.useEffect)(() => {
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
		loadAssistantData(selectedAssistantId);
	}, [selectedAssistantId]);
	(0, import_react.useEffect)(() => {
		if (!selectedAssistantId || !selectedConversationId) {
			cancelTimedAbortRequest(messagesRequestRef);
			setMessages([]);
			return;
		}
		loadMessages(selectedAssistantId, selectedConversationId);
		return () => {
			cancelTimedAbortRequest(messagesRequestRef);
		};
	}, [selectedAssistantId, selectedConversationId]);
	(0, import_react.useEffect)(() => {
		const resolvedConversationId = resolveOperationalConversationId(visibleConversations, selectedConversationId);
		if (resolvedConversationId !== selectedConversationId) setSelectedConversationId(resolvedConversationId);
		if (!resolvedConversationId) {
			setMessages([]);
			setSendResult(null);
		}
	}, [visibleConversations, selectedConversationId]);
	(0, import_react.useLayoutEffect)(() => {
		const el = messagesContainerRef.current;
		if (!el || !shouldStickToBottomRef.current) return;
		requestAnimationFrame(() => {
			el.scrollTop = el.scrollHeight;
		});
	}, [
		messages.length,
		simulatedBindings.length,
		isSendingMessage,
		selectedConversationId
	]);
	(0, import_react.useEffect)(() => {
		pendingAttachmentDraftRef.current = pendingAttachmentDraft;
	}, [pendingAttachmentDraft]);
	(0, import_react.useEffect)(() => {
		simulatedBindingsRef.current = simulatedBindings;
	}, [simulatedBindings]);
	(0, import_react.useEffect)(() => {
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
		if (!selectedAssistantId) return;
		const request = startTimedAbortRequest(conversationsRequestRef);
		setIsLoadingConversations(true);
		shouldStickToBottomRef.current = true;
		setError(null);
		setPreviewResult(null);
		setRunResult(null);
		setSendResult(null);
		try {
			const conversation = await backendConversationsService.create(selectedAssistantId, {}, { signal: request.controller.signal });
			if (conversationsRequestRef.current !== request) return;
			setConversations((items) => [conversation, ...items]);
			setSelectedConversationId(conversation.id);
			const items = await backendConversationsService.messages(selectedAssistantId, conversation.id, { signal: request.controller.signal });
			if (conversationsRequestRef.current !== request) return;
			setMessages(items);
		} catch (err) {
			if (request.controller.signal.aborted && !request.timedOut) return;
			if (isConversationNotFoundError(err)) {
				await handleConversationNotFound(selectedAssistantId);
				return;
			}
			setError(formatLoadErrorMessage(err, "Não foi possível criar a conversa.", request.timedOut));
		} finally {
			if (conversationsRequestRef.current === request) setIsLoadingConversations(false);
			finishTimedAbortRequest(conversationsRequestRef, request);
		}
	};
	const handleRefreshMessages = async () => {
		if (!selectedAssistantId || !selectedConversationId) return;
		setError(null);
		await loadMessages(selectedAssistantId, selectedConversationId);
	};
	const ensureConversation = async (_signal) => {
		if (!selectedAssistantId) throw new Error("Selecione um assistente antes de enviar mensagens.");
		if (selectedConversationId) return selectedConversationId;
		throw new Error("Selecione ou crie uma conversa antes de enviar mensagens.");
	};
	const registerSimulatedBinding = (conversationId, markerText, payload) => {
		const binding = {
			id: createLocalId(),
			conversationId,
			markerText,
			payload,
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			status: "pending"
		};
		setSimulatedBindings((items) => [...items, binding]);
		return binding.id;
	};
	const syncSimulatedBinding = (bindingId, status) => {
		setSimulatedBindings((items) => items.map((binding) => binding.id === bindingId ? {
			...binding,
			status
		} : binding));
	};
	const handleSendPayload = async (payload, textToRuntime) => {
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
		let bindingId = null;
		try {
			const assistantId = selectedAssistantId;
			const conversationId = await ensureConversation(request.controller.signal);
			if (payload.type !== "text") bindingId = registerSimulatedBinding(conversationId, textToRuntime, payload);
			setError(null);
			const sendPayload = buildSendPayload(payload, textToRuntime);
			const response = hasBinaryAttachment(payload) ? await backendConversationsService.sendMultipart(selectedAssistantId, conversationId, sendPayload, [payload.file], { signal: request.controller.signal }) : await backendConversationsService.send(assistantId, conversationId, sendPayload, { signal: request.controller.signal });
			if (sendRequestRef.current !== request) return;
			setSendResult(response);
			setRunResult(null);
			setPreviewResult(null);
			setSelectedConversationId(conversationId);
			const items = await backendConversationsService.messages(assistantId, conversationId, { signal: request.controller.signal });
			if (sendRequestRef.current !== request) return;
			setMessages(items);
			if (bindingId) syncSimulatedBinding(bindingId, "synced");
		} catch (err) {
			if (request.controller.signal.aborted && !request.timedOut) return;
			if (isConversationNotFoundError(err)) {
				await handleConversationNotFound(selectedAssistantId);
				return;
			}
			if (bindingId) setSimulatedBindings((items) => items.map((binding) => binding.id === bindingId ? {
				...binding,
				status: "error"
			} : binding));
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
	const openFilePicker = (type, accept) => {
		pendingPickerTypeRef.current = type;
		if (!fileInputRef.current) return;
		fileInputRef.current.value = "";
		fileInputRef.current.accept = accept;
		fileInputRef.current.click();
	};
	const handleAttachmentMenuAction = (type) => {
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
			openFilePicker(type, ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv");
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
	const handleFileSelection = async (event) => {
		const file = event.target.files?.[0];
		const selectedType = pendingPickerTypeRef.current;
		if (!file || !selectedType) return;
		if (selectedType === "contact" || selectedType === "location") return;
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
				caption: ""
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
				caption: ""
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
				caption: ""
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
				audioUrl: URL.createObjectURL(file)
			});
			return;
		}
		if (selectedType === "gif") setPendingAttachmentDraft({
			type: "gif",
			fileName: file.name,
			mimeType: file.type || "image/gif",
			size: file.size,
			file,
			previewUrl: URL.createObjectURL(file)
		});
	};
	const handleUseCurrentLocation = async () => {
		if (!navigator.geolocation) {
			toast.error("Geolocalização não está disponível neste navegador.");
			return;
		}
		navigator.geolocation.getCurrentPosition((position) => {
			setLocationDraft((current) => ({
				...current,
				latitude: String(position.coords.latitude),
				longitude: String(position.coords.longitude)
			}));
		}, () => {
			toast.error("Não foi possível acessar sua localização.");
		}, {
			enableHighAccuracy: true,
			timeout: 1e4
		});
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
			phone: contactDraft.phone.trim()
		});
		setContactDialogOpen(false);
	};
	const handleSaveLocationDraft = () => {
		if (!locationDraft.label.trim() && !locationDraft.latitude.trim() && !locationDraft.longitude.trim()) {
			toast.error("Preencha um local ou informe latitude e longitude.");
			return;
		}
		discardPendingAttachmentDraft();
		setPendingAttachmentDraft({
			type: "location",
			label: locationDraft.label.trim() || void 0,
			latitude: locationDraft.latitude ? Number(locationDraft.latitude) : void 0,
			longitude: locationDraft.longitude ? Number(locationDraft.longitude) : void 0
		});
		setLocationDialogOpen(false);
	};
	const handleSendAttachmentDraft = async () => {
		if (!pendingAttachmentDraft) return;
		const payload = pendingAttachmentDraft;
		setPendingAttachmentDraft(null);
		await handleSendPayload(payload, serializePayloadForRuntime(payload));
	};
	const startAudioRecording = async () => {
		if (recordingAudio) return;
		if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
			toast.error("Seu navegador não suporta gravação de áudio aqui.");
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const preferredMimeType = resolvePreferredAudioMimeType();
			const recorder = preferredMimeType ? new MediaRecorder(stream, { mimeType: preferredMimeType }) : new MediaRecorder(stream);
			mediaStreamRef.current = stream;
			mediaRecorderRef.current = recorder;
			mediaChunksRef.current = [];
			sendRecordedAudioRef.current = false;
			recordingSecondsRef.current = 0;
			setRecordingSeconds(0);
			setRecordingAudio(true);
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) mediaChunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				const recordedChunks = mediaChunksRef.current.filter((chunk) => chunk.size > 0);
				const mimeType = recorder.mimeType || preferredMimeType || "audio/webm";
				const audioBlob = new Blob(recordedChunks, { type: mimeType });
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
				(async () => {
					if (recordedChunks.length === 0 || audioBlob.size <= 0) {
						toast.error("Não foi possível gravar áudio válido. Tente gravar novamente.");
						return;
					}
					const fileName = `audio-${Date.now()}.${audioExtensionForMimeType(mimeType)}`;
					const payload = {
						type: "audio",
						fileName,
						mimeType,
						size: audioBlob.size,
						durationSeconds,
						file: new File([audioBlob], fileName, { type: mimeType }),
						audioUrl: URL.createObjectURL(audioBlob)
					};
					await handleSendPayload(payload, serializePayloadForRuntime(payload));
				})();
			};
			recorder.start(1e3);
			recordingTimerRef.current = window.setInterval(() => {
				recordingSecondsRef.current += 1;
				setRecordingSeconds(recordingSecondsRef.current);
			}, 1e3);
		} catch (err) {
			releaseRecordingResources();
			setRecordingAudio(false);
			setRecordingSeconds(0);
			recordingSecondsRef.current = 0;
			toast.error(err instanceof DOMException && err.name === "NotAllowedError" ? "Permissão de microfone negada. Libere o acesso para gravar." : err instanceof Error ? err.message : "Não foi possível iniciar a gravação de áudio.");
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
		if (!selectedAssistantId || !chatMessage.trim()) return;
		const text = chatMessage.trim();
		setChatMessage("");
		await handleSendPayload({
			type: "text",
			text
		}, text);
	};
	const insertEmoji = (emoji) => {
		setChatMessage((current) => `${current}${emoji}`);
	};
	const runtimeMessage = messages[messages.length - 1];
	const runtime = sendResult?.runtime ?? null;
	const runtimeSources = sendResult?.assistantMessage.sources ?? runtimeMessage?.sources ?? [];
	const previewSources = runResult?.sources ?? previewResult?.sources ?? [];
	const contextSources = runtimeSources.length > 0 ? runtimeSources : previewSources;
	const previewAnswerText = previewResult?.answer ?? "Execute o preview para ver a resposta determinística.";
	const interpretedInputMessage = sendResult?.userMessage ?? runtimeMessage ?? null;
	const interpretedInputAttachments = interpretedInputMessage?.attachments ?? [];
	const selectedAssistantModel = runtime?.model ?? selectedAssistant?.model ?? "Modelo padrão backend";
	const selectedTemperature = runtime?.temperature ?? selectedAssistant?.temperature ?? .2;
	const hasBlockingError = error !== null && error !== CONVERSATION_NOT_FOUND_MESSAGE;
	const chatTitle = selectedConversation ? formatConversationPrimaryLabel(selectedConversation) : selectedAssistant?.name ?? "Conversa de teste";
	const chatSubtitle = runtime ? `${selectedConversation ? formatConversationPrimaryLabel(selectedConversation) : "Teste manual"} · Runtime disponível` : `${selectedConversation ? formatConversationPrimaryLabel(selectedConversation) : "Teste manual"} · Runtime aguardando`;
	const canSendMessage = selectedAssistantId && selectedConversationId && chatMessage.trim().length > 0 && !isSendingMessage;
	const showMicButton = chatMessage.trim().length === 0;
	const displayedMessages = (0, import_react.useMemo)(() => {
		const currentBindings = simulatedBindings.filter((binding) => binding.conversationId === selectedConversationId);
		const consumedBindings = /* @__PURE__ */ new Set();
		const transformedMessages = messages.map((message) => {
			if (message.role !== "user") return message;
			const matchedBinding = currentBindings.find((binding) => binding.markerText === message.content && !consumedBindings.has(binding.id));
			if (!matchedBinding) return message;
			consumedBindings.add(matchedBinding.id);
			return {
				...message,
				payload: matchedBinding.payload,
				status: matchedBinding.status === "error" ? "error" : "synced"
			};
		});
		const pendingMessages = currentBindings.filter((binding) => !consumedBindings.has(binding.id) && binding.status !== "synced").map((binding) => ({
			id: binding.id,
			role: "user",
			content: binding.markerText,
			createdAt: binding.createdAt,
			payload: binding.payload,
			status: binding.status
		}));
		return [...transformedMessages, ...pendingMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	}, [
		messages,
		selectedConversationId,
		simulatedBindings
	]);
	const interpretAttachmentLine = (attachment) => {
		const lines = [
			`Tipo: ${attachment.type}`,
			`Arquivo: ${attachment.fileName}`,
			`Status: ${getAttachmentStatusLabel(attachment.processingStatus) ?? attachment.processingStatus ?? "—"}`
		];
		if (attachment.transcript) lines.push(`Transcript: ${attachment.transcript}`);
		if (attachment.extractedText) lines.push(`ExtractedText: ${attachment.extractedText}`);
		if (attachment.interpretedSummary) lines.push(`Summary: ${attachment.interpretedSummary}`);
		if (attachment.processingError) lines.push(`Erro: ${attachment.processingError}`);
		if (attachment.metadataJson) lines.push(`Metadata: ${JSON.stringify(attachment.metadataJson)}`);
		return lines;
	};
	(0, import_react.useEffect)(() => {
		shouldStickToBottomRef.current = true;
	}, [selectedConversationId]);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "flex h-[calc(100svh-7rem)] min-h-0 flex-col gap-3 overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "clean-scrollbar flex-1 min-h-0 overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipProvider, {
					delayDuration: 120,
					children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "flex h-full min-h-0 flex-col gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "rounded-2xl border bg-card/80 p-3 shadow-sm backdrop-blur",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex flex-wrap items-end gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "min-w-[240px] flex-1",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Assistente",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
												value: selectedAssistantId,
												onValueChange: handleAssistantChange,
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
													className: "h-10 w-full",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 919,
														columnNumber: 25
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 918,
													columnNumber: 23
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: visibleAssistants.map((assistant) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: assistant.id,
													children: assistant.name
												}, assistant.id, false, {
													fileName: _jsxFileName,
													lineNumber: 922,
													columnNumber: 61
												}, this)) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 921,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 917,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 916,
											columnNumber: 19
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 915,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "min-w-[220px] flex-1",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
											label: "Conversa",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, {
												value: selectedConversationId,
												onValueChange: setSelectedConversationId,
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectTrigger, {
													className: "h-10 w-full",
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectValue, { placeholder: "Selecione" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 934,
														columnNumber: 25
													}, this)
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 933,
													columnNumber: 23
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectContent, { children: visibleConversations.map((conversation) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SelectItem, {
													value: conversation.id,
													children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "flex min-w-0 flex-col",
														children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
															className: "truncate",
															children: formatConversationPrimaryLabel(conversation)
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 939,
															columnNumber: 31
														}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
															className: "truncate text-[11px] text-muted-foreground",
															children: formatConversationSecondaryLabel(conversation)
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 942,
															columnNumber: 31
														}, this)]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 938,
														columnNumber: 29
													}, this)
												}, conversation.id, false, {
													fileName: _jsxFileName,
													lineNumber: 937,
													columnNumber: 67
												}, this)) }, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 936,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 932,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 931,
											columnNumber: 19
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 930,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
										className: "h-10 gap-2 px-4 shadow-sm",
										onClick: () => void handleCreateConversation(),
										disabled: !selectedAssistantId,
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 953,
											columnNumber: 19
										}, this), " Nova conversa"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 952,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipTrigger, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
											size: "icon",
											variant: "outline",
											className: "h-10 w-10 shrink-0",
											onClick: () => void handleRefreshMessages(),
											disabled: !selectedAssistantId || !selectedConversationId,
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(RefreshCw, { className: "h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 959,
												columnNumber: 23
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 958,
											columnNumber: 21
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 957,
										columnNumber: 19
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipContent, { children: "Recarregar mensagens" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 962,
										columnNumber: 19
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 956,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipTrigger, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
											size: "icon",
											variant: "outline",
											className: "h-10 w-10 shrink-0",
											onClick: () => {
												setMessages([]);
												setChatMessage("");
												discardPendingAttachmentDraft();
												setSimulatedBindings((items) => items.filter((binding) => binding.conversationId !== selectedConversationId));
												if (recordingAudio) cancelAudioRecording();
												shouldStickToBottomRef.current = true;
												setPreviewResult(null);
												setRunResult(null);
												setSendResult(null);
												setError(null);
											},
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Trash2, { className: "h-4 w-4" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 981,
												columnNumber: 23
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 967,
											columnNumber: 21
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 966,
										columnNumber: 19
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TooltipContent, { children: "Limpar tela" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 984,
										columnNumber: 19
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 965,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 914,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 913,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid flex-1 min-h-0 gap-4 lg:[grid-template-columns:minmax(0,1.6fr)_minmax(360px,0.9fr)]",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
								className: "flex min-h-0 flex-col overflow-hidden border-border/70 bg-card/90 shadow-sm",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
									className: "border-b bg-card/40 px-5 py-4",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex items-start gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MessageSquare, { className: "h-5 w-5" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 994,
												columnNumber: 23
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 993,
											columnNumber: 21
										}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
												className: "truncate text-base font-semibold",
												children: chatTitle
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 997,
												columnNumber: 23
											}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "mt-1 flex items-center gap-2 text-xs text-muted-foreground",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
													className: "truncate",
													children: chatSubtitle
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1001,
													columnNumber: 25
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
													className: "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300",
													children: "runtime"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1002,
													columnNumber: 25
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1e3,
												columnNumber: 23
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 996,
											columnNumber: 21
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 992,
										columnNumber: 19
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 991,
									columnNumber: 17
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
									className: "flex min-h-0 flex-1 flex-col p-0",
									children: isLoadingAssistants ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex flex-1 items-center justify-center p-6",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando assistentes…" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1012,
											columnNumber: 23
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1011,
										columnNumber: 42
									}, this) : hasBlockingError ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex flex-1 items-center justify-center p-6",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ErrorState, {
											className: "w-full",
											title: "Não foi possível carregar o runtime",
											description: error,
											onRetry: retryCurrentLoad
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1014,
											columnNumber: 23
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1013,
										columnNumber: 49
									}, this) : !selectedAssistant || !selectedConversationId && !isLoadingConversations ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "flex flex-1 items-center justify-center p-6",
										children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, {
											className: "w-full",
											title: "Teste aguardando seleção",
											description: "Selecione um assistente e uma conversa para iniciar o teste."
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1016,
											columnNumber: 23
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1015,
										columnNumber: 105
									}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										ref: messagesContainerRef,
										onScroll: () => {
											const el = messagesContainerRef.current;
											if (!el) return;
											shouldStickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
										},
										className: "clean-scrollbar flex-1 min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.05),transparent_35%)] px-4 py-4",
										children: [error === CONVERSATION_NOT_FOUND_MESSAGE ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200",
											children: error
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1026,
											columnNumber: 69
										}, this) : null, isLoadingConversations && displayedMessages.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex h-full min-h-[220px] items-center justify-center",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando conversas…" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1031,
												columnNumber: 29
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1030,
											columnNumber: 85
										}, this) : isLoadingMessages && displayedMessages.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex h-full min-h-[220px] items-center justify-center",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingState, { label: "Carregando mensagens…" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1033,
												columnNumber: 29
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1032,
											columnNumber: 90
										}, this) : displayedMessages.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "flex h-full min-h-[260px] items-center justify-center",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "max-w-sm rounded-2xl border border-border/60 bg-background/75 px-5 py-5 text-center shadow-sm",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary",
														children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MessageSquare, { className: "h-5 w-5" }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1037,
															columnNumber: 33
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1036,
														columnNumber: 31
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
														className: "text-sm font-medium text-foreground",
														children: "Nenhuma mensagem ainda."
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1039,
														columnNumber: 31
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
														className: "mt-2 text-sm text-muted-foreground",
														children: "Envie uma mensagem para testar este atendimento."
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1042,
														columnNumber: 31
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1035,
												columnNumber: 29
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1034,
											columnNumber: 69
										}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
											className: "space-y-3",
											children: [isLoadingConversations || isLoadingMessages ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
												children: "Atualizando conversa"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1047,
												columnNumber: 76
											}, this) : null, displayedMessages.map((message) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: cn("flex min-w-0", message.role === "user" ? "justify-end" : "justify-start"),
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: cn("min-w-0 max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm break-words whitespace-pre-wrap", message.role === "user" ? "rounded-br-md bg-[#dff6cf] text-slate-950 dark:bg-emerald-500/25 dark:text-emerald-50" : "rounded-bl-md border border-border/70 bg-white/90 text-slate-900 dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-50"),
													children: [
														message.payload ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AttachmentBubble, { payload: message.payload }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1052,
															columnNumber: 54
														}, this) : message.attachments?.length ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
															className: "space-y-2",
															children: [message.attachments.map((attachment, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PersistedAttachmentBubble, { attachment }, `${message.id}-${attachment.fileName}-${index}`, false, {
																fileName: _jsxFileName,
																lineNumber: 1053,
																columnNumber: 87
															}, this)), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
																className: "break-words",
																children: message.content
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1054,
																columnNumber: 39
															}, this)]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 1052,
															columnNumber: 133
														}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
															className: "break-words",
															children: message.content
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1055,
															columnNumber: 46
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
															className: "mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground",
															children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: formatMessageTime(message.createdAt) }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1058,
																columnNumber: 37
															}, this), message.role === "assistant" && message.mode ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
																className: "uppercase tracking-[0.16em]",
																children: getMessageModeLabel(message.mode)
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1059,
																columnNumber: 85
															}, this) : message.status === "pending" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
																className: "uppercase tracking-[0.16em]",
																children: "enviando"
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1061,
																columnNumber: 80
															}, this) : message.status === "error" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
																className: "uppercase tracking-[0.16em] text-destructive",
																children: "erro"
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1061,
																columnNumber: 173
															}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1063,
																columnNumber: 49
															}, this)]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 1057,
															columnNumber: 35
														}, this),
														message.role === "assistant" && message.sources?.length ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
															className: "mt-3 flex flex-wrap gap-1.5",
															children: message.sources.map((source) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
																className: "rounded-full border border-border/70 bg-background/80 px-2.5 py-0.5 text-[11px] leading-none text-foreground",
																title: source.title,
																children: source.title
															}, source.id, false, {
																fileName: _jsxFileName,
																lineNumber: 1067,
																columnNumber: 70
															}, this))
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1066,
															columnNumber: 94
														}, this) : null
													]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1051,
													columnNumber: 33
												}, this)
											}, message.id, false, {
												fileName: _jsxFileName,
												lineNumber: 1050,
												columnNumber: 63
											}, this))]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1046,
											columnNumber: 36
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1018,
										columnNumber: 23
									}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
										className: "border-t bg-background/80 px-4 py-3 backdrop-blur",
										children: [
											/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", {
												ref: fileInputRef,
												type: "file",
												className: "hidden",
												onChange: handleFileSelection
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1077,
												columnNumber: 25
											}, this),
											pendingAttachmentDraft ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "mb-3 rounded-2xl border border-border/70 bg-background/85 p-3 shadow-sm",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "flex items-start justify-between gap-3",
													children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "min-w-0 flex-1",
														children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
															className: "flex items-start gap-3",
															children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AttachmentPreview, { payload: pendingAttachmentDraft }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1083,
																columnNumber: 35
															}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
																className: "min-w-0 flex-1",
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
																	className: "truncate text-sm font-medium text-foreground",
																	children: getPayloadTitle(pendingAttachmentDraft)
																}, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1085,
																	columnNumber: 37
																}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
																	className: "mt-1 text-xs text-muted-foreground",
																	children: getPayloadMeta(pendingAttachmentDraft)
																}, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1088,
																	columnNumber: 37
																}, this)]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1084,
																columnNumber: 35
															}, this)]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 1082,
															columnNumber: 33
														}, this), supportsCaption(pendingAttachmentDraft) ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
															value: pendingAttachmentDraft.caption ?? "",
															onChange: (event) => setPendingAttachmentDraft((current) => current && "caption" in current ? {
																...current,
																caption: event.target.value
															} : current),
															placeholder: "Adicionar legenda",
															className: "mt-3 h-9"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1094,
															columnNumber: 76
														}, this) : null]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1081,
														columnNumber: 31
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "flex items-center gap-2",
														children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
															size: "sm",
															variant: "ghost",
															onClick: () => discardPendingAttachmentDraft(),
															children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(X, { className: "mr-1 h-4 w-4" }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1102,
																columnNumber: 35
															}, this), " Remover"]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 1101,
															columnNumber: 33
														}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
															size: "sm",
															onClick: () => void handleSendAttachmentDraft(),
															disabled: isSendingMessage || !selectedConversationId,
															children: "Enviar"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1104,
															columnNumber: 33
														}, this)]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1100,
														columnNumber: 31
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1080,
													columnNumber: 29
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1079,
												columnNumber: 51
											}, this) : null,
											recordingAudio ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "flex items-center gap-3 rounded-full border border-destructive/25 bg-destructive/5 px-4 py-2.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { className: "h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" }, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1112,
														columnNumber: 29
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "text-sm font-medium text-foreground",
														children: "Gravando..."
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1113,
														columnNumber: 29
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "font-mono text-sm text-muted-foreground",
														children: formatDuration(recordingSeconds)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1114,
														columnNumber: 29
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "ml-auto flex items-center gap-2",
														children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
															size: "sm",
															variant: "ghost",
															onClick: cancelAudioRecording,
															children: "Cancelar"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1118,
															columnNumber: 31
														}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
															size: "sm",
															onClick: confirmAudioRecording,
															children: "Enviar áudio"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1121,
															columnNumber: 31
														}, this)]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1117,
														columnNumber: 29
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1111,
												columnNumber: 43
											}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "flex items-center gap-2 rounded-full bg-[#f0f2f5] px-2 py-2 dark:bg-[#202c33]",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuTrigger, {
														asChild: true,
														children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
															size: "icon",
															variant: "ghost",
															className: "h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-background/70",
															children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1129,
																columnNumber: 35
															}, this)
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1128,
															columnNumber: 33
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1127,
														columnNumber: 31
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuContent, {
														align: "start",
														className: "w-64",
														children: [
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
																onSelect: () => handleAttachmentMenuAction("image"),
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Image, { className: "h-4 w-4" }, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1134,
																	columnNumber: 35
																}, this), " Imagem"]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1133,
																columnNumber: 33
															}, this),
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
																onSelect: () => handleAttachmentMenuAction("document"),
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FileText, { className: "h-4 w-4" }, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1137,
																	columnNumber: 35
																}, this), " Documento"]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1136,
																columnNumber: 33
															}, this),
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
																onSelect: () => handleAttachmentMenuAction("video"),
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Video, { className: "h-4 w-4" }, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1140,
																	columnNumber: 35
																}, this), " Vídeo"]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1139,
																columnNumber: 33
															}, this),
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
																onSelect: () => handleAttachmentMenuAction("audio"),
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Mic, { className: "h-4 w-4" }, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1143,
																	columnNumber: 35
																}, this), " Áudio"]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1142,
																columnNumber: 33
															}, this),
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuSeparator, {}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1145,
																columnNumber: 33
															}, this),
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
																onSelect: () => handleAttachmentMenuAction("contact"),
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserRound, { className: "h-4 w-4" }, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1147,
																	columnNumber: 35
																}, this), " Contato"]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1146,
																columnNumber: 33
															}, this),
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
																onSelect: () => handleAttachmentMenuAction("location"),
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MapPin, { className: "h-4 w-4" }, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1150,
																	columnNumber: 35
																}, this), " Localização"]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1149,
																columnNumber: 33
															}, this),
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
																onSelect: () => handleAttachmentMenuAction("gif"),
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Film, { className: "h-4 w-4" }, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1153,
																	columnNumber: 35
																}, this), " GIF"]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1152,
																columnNumber: 33
															}, this)
														]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1132,
														columnNumber: 31
													}, this)] }, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1126,
														columnNumber: 29
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuTrigger, {
														asChild: true,
														children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
															size: "icon",
															variant: "ghost",
															className: "h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-background/70",
															children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SmilePlus, { className: "h-4 w-4" }, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1161,
																columnNumber: 35
															}, this)
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1160,
															columnNumber: 33
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1159,
														columnNumber: 31
													}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuContent, {
														align: "start",
														className: "w-48",
														children: [
															[
																"😀",
																"😂",
																"😍",
																"🙏",
																"👍",
																"🔥"
															].map((emoji) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
																onSelect: () => insertEmoji(emoji),
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
																	className: "text-base",
																	children: emoji
																}, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1166,
																	columnNumber: 37
																}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
																	className: "ml-2 text-xs text-muted-foreground",
																	children: "Inserir emoji"
																}, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1167,
																	columnNumber: 37
																}, this)]
															}, emoji, true, {
																fileName: _jsxFileName,
																lineNumber: 1165,
																columnNumber: 84
															}, this)),
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuSeparator, {}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1171,
																columnNumber: 33
															}, this),
															/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DropdownMenuItem, {
																onSelect: () => handleAttachmentMenuAction("gif"),
																children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Film, { className: "h-4 w-4" }, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1173,
																	columnNumber: 35
																}, this), " Escolher GIF"]
															}, void 0, true, {
																fileName: _jsxFileName,
																lineNumber: 1172,
																columnNumber: 33
															}, this)
														]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1164,
														columnNumber: 31
													}, this)] }, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 1158,
														columnNumber: 29
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
														className: "flex-1 rounded-full bg-background px-4 py-2 shadow-sm",
														children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Textarea, {
															value: chatMessage,
															onChange: (e) => setChatMessage(e.target.value),
															placeholder: "Digite uma mensagem",
															spellCheck: false,
															autoCorrect: "off",
															autoCapitalize: "off",
															autoComplete: "off",
															className: "clean-scrollbar min-h-[24px] max-h-32 w-full resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0",
															onKeyDown: (e) => {
																if (e.key === "Enter" && !e.shiftKey) {
																	e.preventDefault();
																	handleSend();
																}
															}
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1179,
															columnNumber: 31
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1178,
														columnNumber: 29
													}, this),
													showMicButton ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
														size: "icon",
														className: "h-10 w-10 shrink-0 rounded-full",
														onClick: () => void startAudioRecording(),
														disabled: isSendingMessage || !!pendingAttachmentDraft || !selectedConversationId,
														children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Mic, { className: "h-4 w-4" }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1188,
															columnNumber: 33
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1187,
														columnNumber: 46
													}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
														size: "icon",
														className: "h-10 w-10 shrink-0 rounded-full",
														onClick: () => void handleSend(),
														disabled: !canSendMessage,
														children: isSendingMessage ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoaderCircle, { className: "h-4 w-4 animate-spin" }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1190,
															columnNumber: 53
														}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Send, { className: "h-4 w-4" }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1190,
															columnNumber: 100
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1189,
														columnNumber: 43
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1125,
												columnNumber: 36
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1076,
										columnNumber: 23
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1017,
										columnNumber: 30
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1010,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 990,
								columnNumber: 15
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, {
								className: "flex min-h-0 flex-col overflow-hidden border-border/70 bg-card/90 shadow-sm",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardHeader, {
									className: "border-b bg-card/40 px-5 py-4",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardTitle, {
										className: "text-base font-semibold",
										children: "Debug da IA"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1200,
										columnNumber: 19
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1199,
									columnNumber: 17
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CardContent, {
									className: "clean-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Section, {
											title: "Status",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "grid gap-2",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Assistente",
														value: selectedAssistant?.name ?? "—"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1205,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Conversa ativa",
														value: selectedConversation ? formatConversationPrimaryLabel(selectedConversation) : "—"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1206,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Preview",
														value: previewResult ? "Executado" : "Disponível"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1207,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Runtime",
														value: runResult ? "Executado" : "Disponível"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1208,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Mensagens",
														value: isLoadingMessages ? "Carregando" : "Prontas"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1209,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Anexos",
														value: isProcessingAttachment ? "Processando" : "Sem processamento ativo"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1210,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Debug",
														value: isLoadingRuntimeDebug ? "Atualizando" : "Atualizado"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1211,
														columnNumber: 23
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1204,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1203,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Section, {
											title: "Execução",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "grid gap-2",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Modelo",
														value: selectedAssistantModel
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1217,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Temperatura",
														value: String(selectedTemperature)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1218,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Origem",
														value: runtime ? `${getConfigurationSourceLabel(runtime.configurationSource)} / ${getModelSourceLabel(runtime.modelSource)}` : "Aguardando execução"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1219,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Classificação",
														value: runtime?.outcome ?? "unknown"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1220,
														columnNumber: 23
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1216,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1215,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Section, {
											title: "Entrada interpretada",
											children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "grid gap-2",
												children: [
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Tipo",
														value: interpretedInputMessage?.messageType ?? (interpretedInputAttachments.length > 0 ? interpretedInputAttachments[0]?.type ?? "anexo" : "texto")
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1226,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Anexos",
														value: String(interpretedInputAttachments.length)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1227,
														columnNumber: 23
													}, this),
													/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
														label: "Conteúdo final",
														value: interpretedInputMessage?.content ?? "—"
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 1228,
														columnNumber: 23
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1225,
												columnNumber: 21
											}, this), interpretedInputAttachments.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "mt-3 space-y-2",
												children: interpretedInputAttachments.map((attachment, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DebugText, { value: interpretAttachmentLine(attachment).join("\n") }, `${attachment.fileName}-${index}`, false, {
													fileName: _jsxFileName,
													lineNumber: 1231,
													columnNumber: 81
												}, this))
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1230,
												columnNumber: 63
											}, this) : null]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1224,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Section, {
											title: "Contexto usado",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "rounded-2xl border border-border/70 bg-muted/30 p-3",
												children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
													className: "grid gap-2",
													children: [
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
															label: "Histórico",
															value: runtime?.context ? `${runtime.context.historyMessagesUsed}/${runtime.context.historyLimit}` : "—"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1238,
															columnNumber: 25
														}, this),
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
															label: "Fallback",
															value: runtime?.fallback ? "sim" : runtime ? "não" : "—"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1239,
															columnNumber: 25
														}, this),
														runtime?.reason ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MetaRow, {
															label: "Razão",
															value: getFallbackReasonLabel(runtime.reason)
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1240,
															columnNumber: 44
														}, this) : null,
														/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
															className: "pt-1",
															children: contextSources.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
																className: "flex flex-wrap gap-1.5",
																children: contextSources.map((source) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
																	className: "rounded-full border border-border/70 bg-background/80 px-2.5 py-0.5 text-[11px] text-foreground",
																	title: source.title,
																	children: source.title
																}, source.id, false, {
																	fileName: _jsxFileName,
																	lineNumber: 1243,
																	columnNumber: 61
																}, this))
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1242,
																columnNumber: 56
															}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
																className: "text-sm text-muted-foreground",
																children: "Nenhuma fonte usada ainda."
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 1246,
																columnNumber: 38
															}, this)
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 1241,
															columnNumber: 25
														}, this)
													]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 1237,
													columnNumber: 23
												}, this)
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1236,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1235,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Section, {
											title: "Pergunta",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
												className: "space-y-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
													className: "text-xs text-muted-foreground",
													children: "Pergunta do preview"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1256,
													columnNumber: 23
												}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
													value: previewQuestion,
													onChange: (e) => setPreviewQuestion(e.target.value),
													className: "h-10"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 1257,
													columnNumber: 23
												}, this)]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 1255,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1254,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Section, {
											title: "Resposta do preview",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DebugText, { value: previewAnswerText }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1262,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1261,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Section, {
											title: "Resposta do runtime",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DebugText, { value: sendResult?.assistantMessage.content ?? runResult?.output.answer ?? runtimeMessage?.content ?? "Envie uma mensagem para ver a resposta." }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1266,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1265,
											columnNumber: 19
										}, this),
										/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Section, {
											title: "Resumo",
											children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DebugText, { value: runtime?.summary ?? "Envie uma mensagem para gerar o resumo determinístico da execução." }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 1270,
												columnNumber: 21
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 1269,
											columnNumber: 19
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1202,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1198,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 989,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 912,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 911,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 910,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
				open: contactDialogOpen,
				onOpenChange: (open) => {
					setContactDialogOpen(open);
					if (!open) setContactDraft({
						name: "",
						phone: ""
					});
				},
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
					className: "sm:max-w-md",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: "Novo contato" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1290,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, { children: "Preencha os dados para simular uma mensagem do tipo contato." }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1291,
							columnNumber: 13
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1289,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid gap-4 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Nome",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: contactDraft.name,
									onChange: (event) => setContactDraft((current) => ({
										...current,
										name: event.target.value
									})),
									placeholder: "João da Silva"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1297,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1296,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Telefone",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: contactDraft.phone,
									onChange: (event) => setContactDraft((current) => ({
										...current,
										phone: event.target.value
									})),
									placeholder: "+55 67 99999-9999"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1303,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1302,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1295,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							variant: "outline",
							onClick: () => setContactDialogOpen(false),
							children: "Cancelar"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1310,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
							onClick: handleSaveContactDraft,
							children: "Salvar contato"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1313,
							columnNumber: 13
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1309,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1288,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1279,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Dialog, {
				open: locationDialogOpen,
				onOpenChange: (open) => {
					setLocationDialogOpen(open);
					if (!open) setLocationDraft({
						label: "",
						latitude: "",
						longitude: ""
					});
				},
				children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogContent, {
					className: "sm:max-w-md",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogTitle, { children: "Nova localização" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1330,
							columnNumber: 13
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogDescription, { children: "Informe um local de referência ou use sua posição atual para simular a mensagem." }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1331,
							columnNumber: 13
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1329,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid gap-4 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
								label: "Descrição",
								children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
									value: locationDraft.label,
									onChange: (event) => setLocationDraft((current) => ({
										...current,
										label: event.target.value
									})),
									placeholder: "Recepção do clube"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1337,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1336,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "grid gap-4 sm:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Latitude",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: locationDraft.latitude,
										onChange: (event) => setLocationDraft((current) => ({
											...current,
											latitude: event.target.value
										})),
										placeholder: "-20.4697"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1344,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1343,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Field, {
									label: "Longitude",
									children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Input, {
										value: locationDraft.longitude,
										onChange: (event) => setLocationDraft((current) => ({
											...current,
											longitude: event.target.value
										})),
										placeholder: "-54.6201"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1350,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1349,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1342,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1335,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DialogFooter, {
							className: "gap-2 sm:justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
								variant: "outline",
								onClick: () => void handleUseCurrentLocation(),
								children: "Usar minha localização"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1358,
								columnNumber: 13
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									variant: "outline",
									onClick: () => setLocationDialogOpen(false),
									children: "Cancelar"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1362,
									columnNumber: 15
								}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, {
									onClick: handleSaveLocationDraft,
									children: "Salvar localização"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1365,
									columnNumber: 15
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1361,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1357,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1328,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1318,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 909,
		columnNumber: 10
	}, this);
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Label, {
			className: "text-xs",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1380,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1379,
		columnNumber: 10
	}, this);
}
function Section({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground",
			children: title
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1392,
			columnNumber: 7
		}, this), children]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1391,
		columnNumber: 10
	}, this);
}
function MetaRow({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid grid-cols-[minmax(92px,1fr)_minmax(0,1.4fr)] items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "text-sm text-muted-foreground",
			children: label
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1406,
			columnNumber: 7
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
			className: "min-w-0 truncate text-right font-mono text-sm text-foreground",
			title: value,
			children: value
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1407,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1405,
		columnNumber: 10
	}, this);
}
function DebugText({ value }) {
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm leading-6 text-foreground whitespace-pre-wrap break-words",
		title: value,
		children: value
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1417,
		columnNumber: 10
	}, this);
}
function AttachmentBubble({ payload }) {
	if (payload.type === "image" || payload.type === "gif") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-2",
		children: [
			payload.previewUrl ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("img", {
				src: payload.previewUrl,
				alt: payload.fileName,
				className: "max-h-64 w-full rounded-xl object-cover"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1428,
				columnNumber: 31
			}, this) : null,
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-xs text-muted-foreground",
				children: payload.fileName
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1429,
				columnNumber: 9
			}, this),
			"caption" in payload && payload.caption ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "break-words",
				children: payload.caption
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1430,
				columnNumber: 52
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1427,
		columnNumber: 12
	}, this);
	if (payload.type === "video") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-2",
		children: [
			payload.previewUrl ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("video", {
				src: payload.previewUrl,
				className: "max-h-64 w-full rounded-xl bg-black/10 object-cover",
				controls: true,
				preload: "metadata"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1435,
				columnNumber: 31
			}, this) : null,
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Video, { className: "h-4 w-4 shrink-0" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1437,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "min-w-0 truncate",
					children: payload.fileName
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1438,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1436,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-xs text-muted-foreground",
				children: formatFileSize(payload.size)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1440,
				columnNumber: 9
			}, this),
			payload.caption ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "break-words",
				children: payload.caption
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1441,
				columnNumber: 28
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1434,
		columnNumber: 12
	}, this);
	if (payload.type === "audio") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-center gap-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Mic, { className: "h-4 w-4 shrink-0" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1447,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
					className: "min-w-0 truncate",
					children: payload.fileName ?? "Áudio gravado"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1448,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1446,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "text-xs text-muted-foreground",
				children: [payload.durationSeconds ? formatDuration(payload.durationSeconds) : null, payload.size ? formatFileSize(payload.size) : null].filter(Boolean).join(" · ")
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1450,
				columnNumber: 9
			}, this),
			payload.audioUrl ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("audio", {
				controls: true,
				src: payload.audioUrl,
				className: "h-10 w-full max-w-full",
				preload: "metadata"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1453,
				columnNumber: 29
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1445,
		columnNumber: 12
	}, this);
	if (payload.type === "document") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-start gap-3 rounded-xl bg-background/60 px-3 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FileText, { className: "mt-0.5 h-4 w-4 shrink-0" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1459,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "truncate text-sm font-medium",
					children: payload.fileName
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1461,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "text-xs text-muted-foreground",
					children: formatFileSize(payload.size)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1462,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1460,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1458,
			columnNumber: 9
		}, this), payload.caption ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
			className: "break-words",
			children: payload.caption
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1465,
			columnNumber: 28
		}, this) : null]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1457,
		columnNumber: 12
	}, this);
	if (payload.type === "contact") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "rounded-xl bg-background/60 px-3 py-3",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-start gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserRound, { className: "mt-0.5 h-4 w-4 shrink-0" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1471,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "truncate text-sm font-medium",
					children: payload.name
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1473,
					columnNumber: 13
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "text-xs text-muted-foreground",
					children: payload.phone
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1474,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1472,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1470,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1469,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "rounded-xl bg-background/60 px-3 py-3",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "flex items-start gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MapPin, { className: "mt-0.5 h-4 w-4 shrink-0" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1481,
				columnNumber: 9
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "truncate text-sm font-medium",
					children: payload.label ?? "Localização enviada"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1483,
					columnNumber: 11
				}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "text-xs text-muted-foreground",
					children: [payload.latitude, payload.longitude].filter((value) => value !== void 0).join(", ")
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1486,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1482,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1480,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1479,
		columnNumber: 10
	}, this);
}
function getAttachmentStatusLabel(status) {
	switch (status) {
		case "pending": return "Processando";
		case "processing": return "Processando";
		case "completed": return "Processado";
		case "failed": return "Falha ao processar";
		default: return null;
	}
}
function formatAttachmentProcessingError(attachment) {
	const rawMessage = attachment.processingError ?? "";
	const normalized = rawMessage.toLowerCase();
	if (attachment.type === "audio" && (normalized.includes("corrupted") || normalized.includes("unsupported"))) return "Não foi possível transcrever este áudio. Tente gravar novamente ou enviar em outro formato.";
	if (normalized.includes("provider") || normalized.includes("openai")) return "Não foi possível interpretar o anexo agora. Tente novamente.";
	return rawMessage;
}
function PersistedAttachmentBubble({ attachment }) {
	const statusLabel = getAttachmentStatusLabel(attachment.processingStatus);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "space-y-2 rounded-xl bg-background/60 px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "flex items-start gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AttachmentPreviewFromPersisted, { attachment }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1526,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "truncate text-sm font-medium",
							children: attachment.fileName
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1528,
							columnNumber: 11
						}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "text-xs text-muted-foreground",
							children: [formatFileSize(attachment.size), attachment.mimeType].filter(Boolean).join(" · ")
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1529,
							columnNumber: 11
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1527,
						columnNumber: 9
					}, this),
					statusLabel ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]", attachment.processingStatus === "failed" ? "border-destructive/30 bg-destructive/10 text-destructive" : attachment.processingStatus === "completed" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"),
						children: statusLabel
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1533,
						columnNumber: 24
					}, this) : null
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1525,
				columnNumber: 7
			}, this),
			attachment.transcript ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "whitespace-pre-wrap break-words text-sm text-foreground",
				children: ["Transcrição: ", attachment.transcript]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1538,
				columnNumber: 32
			}, this) : null,
			attachment.interpretedSummary ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "whitespace-pre-wrap break-words text-sm text-foreground",
				children: attachment.interpretedSummary
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1542,
				columnNumber: 40
			}, this) : null,
			attachment.extractedText ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "whitespace-pre-wrap break-words text-xs text-muted-foreground",
				children: attachment.extractedText
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1546,
				columnNumber: 35
			}, this) : null,
			attachment.processingError ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
				className: "whitespace-pre-wrap break-words text-xs text-destructive",
				children: formatAttachmentProcessingError(attachment)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1550,
				columnNumber: 37
			}, this) : null
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1524,
		columnNumber: 10
	}, this);
}
function AttachmentPreviewFromPersisted({ attachment }) {
	const type = attachment.type === "gif" ? "image" : attachment.type;
	if (type === "image") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Image, { className: "h-5 w-5" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1563,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1562,
		columnNumber: 12
	}, this);
	if (type === "video") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Video, { className: "h-5 w-5" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1568,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1567,
		columnNumber: 12
	}, this);
	if (type === "audio") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Mic, { className: "h-5 w-5" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1573,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1572,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FileText, { className: "h-5 w-5" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1577,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1576,
		columnNumber: 10
	}, this);
}
function AttachmentPreview({ payload }) {
	if ((payload.type === "image" || payload.type === "gif") && payload.previewUrl) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("img", {
		src: payload.previewUrl,
		alt: payload.fileName,
		className: "h-14 w-14 rounded-xl object-cover"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1586,
		columnNumber: 12
	}, this);
	if (payload.type === "video" && payload.previewUrl) return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("video", {
		src: payload.previewUrl,
		className: "h-14 w-14 rounded-xl bg-black/10 object-cover",
		muted: true,
		preload: "metadata"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1589,
		columnNumber: 12
	}, this);
	if (payload.type === "audio") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Mic, { className: "h-5 w-5" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1593,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1592,
		columnNumber: 12
	}, this);
	if (payload.type === "document") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FileText, { className: "h-5 w-5" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1598,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1597,
		columnNumber: 12
	}, this);
	if (payload.type === "contact") return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(UserRound, { className: "h-5 w-5" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1603,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1602,
		columnNumber: 12
	}, this);
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary",
		children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MapPin, { className: "h-5 w-5" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1607,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1606,
		columnNumber: 10
	}, this);
}
function supportsCaption(payload) {
	return payload.type === "image" || payload.type === "document" || payload.type === "video";
}
function getPayloadTitle(payload) {
	switch (payload.type) {
		case "image":
		case "document":
		case "video":
		case "gif": return payload.fileName;
		case "audio": return payload.fileName ?? "Áudio gravado";
		case "contact": return payload.name;
		case "location": return payload.label ?? "Localização";
	}
}
function getPayloadMeta(payload) {
	switch (payload.type) {
		case "image":
		case "video":
		case "gif": return `${formatFileSize(payload.size)} · ${payload.mimeType}`;
		case "document": return `${formatFileSize(payload.size)} · Documento`;
		case "audio": return [payload.durationSeconds ? formatDuration(payload.durationSeconds) : null, payload.size ? formatFileSize(payload.size) : null].filter(Boolean).join(" · ");
		case "contact": return payload.phone;
		case "location": return payload.latitude !== void 0 && payload.longitude !== void 0 ? `${payload.latitude}, ${payload.longitude}` : "Sem coordenadas";
	}
}
function serializePayloadForRuntime(payload) {
	switch (payload.type) {
		case "image": return [
			`Imagem enviada: ${payload.fileName}`,
			`Formato: ${payload.mimeType}`,
			`Tamanho: ${formatFileSize(payload.size)}`,
			payload.caption ? `Legenda: ${payload.caption}` : null
		].filter(Boolean).join("\n");
		case "document": return [
			`Documento enviado: ${payload.fileName}`,
			`Formato: ${payload.mimeType}`,
			`Tamanho: ${formatFileSize(payload.size)}`,
			payload.caption ? `Legenda: ${payload.caption}` : null
		].filter(Boolean).join("\n");
		case "video": return [
			`Vídeo enviado: ${payload.fileName}`,
			`Formato: ${payload.mimeType}`,
			`Tamanho: ${formatFileSize(payload.size)}`,
			payload.caption ? `Legenda: ${payload.caption}` : null
		].filter(Boolean).join("\n");
		case "audio": return [
			`Áudio enviado: ${payload.fileName ?? "áudio gravado"}`,
			payload.durationSeconds ? `Duração: ${formatDuration(payload.durationSeconds)}` : null,
			payload.size ? `Tamanho: ${formatFileSize(payload.size)}` : null
		].filter(Boolean).join("\n");
		case "contact": return `Contato enviado:\nNome: ${payload.name}\nTelefone: ${payload.phone}`;
		case "location": return [`Localização enviada: ${payload.label ?? "sem descrição"}`, payload.latitude !== void 0 && payload.longitude !== void 0 ? `Coordenadas: ${payload.latitude}, ${payload.longitude}` : null].filter(Boolean).join("\n");
		case "gif": return [`GIF enviado: ${payload.fileName}`, `Formato: ${payload.mimeType}`].join("\n");
	}
}
function buildSendPayload(payload, textToRuntime) {
	if (payload.type === "text") return {
		message: textToRuntime,
		source: "tests"
	};
	if (payload.type === "contact") return {
		message: textToRuntime,
		source: "tests",
		messageType: "contact",
		contact: {
			name: payload.name,
			phone: payload.phone
		}
	};
	if (payload.type === "location") return {
		message: textToRuntime,
		source: "tests",
		messageType: "location",
		location: {
			label: payload.label,
			latitude: payload.latitude,
			longitude: payload.longitude
		}
	};
	return {
		message: textToRuntime,
		source: "tests",
		messageType: payload.type,
		attachments: [{
			type: payload.type === "gif" ? "gif" : payload.type,
			fileName: payload.fileName,
			mimeType: payload.mimeType,
			size: payload.size,
			caption: "caption" in payload ? payload.caption : void 0,
			durationSeconds: payload.type === "audio" ? payload.durationSeconds : void 0
		}]
	};
}
function hasBinaryAttachment(payload) {
	return [
		"image",
		"document",
		"audio",
		"video",
		"gif"
	].includes(payload.type);
}
function resolvePreferredAudioMimeType() {
	if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return;
	return [
		"audio/webm;codecs=opus",
		"audio/webm",
		"audio/ogg;codecs=opus",
		"audio/ogg"
	].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}
function audioExtensionForMimeType(mimeType) {
	const normalized = mimeType.toLowerCase();
	if (normalized.includes("ogg")) return "ogg";
	if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
	if (normalized.includes("wav")) return "wav";
	return "webm";
}
function formatLoadErrorMessage(error, fallback, timedOut = false) {
	if (timedOut) return "Não foi possível carregar o runtime. A requisição demorou mais que o esperado.";
	const rawMessage = error instanceof Error ? error.message : fallback;
	const normalized = rawMessage.toLowerCase();
	if (normalized.includes("request entity too large") || normalized.includes("payload too large")) return "Arquivo muito grande para envio.";
	if (error instanceof ApiError && error.status >= 500) return fallback;
	return rawMessage;
}
function formatSendErrorMessage(error, timedOut = false) {
	if (timedOut) return "Não foi possível carregar o runtime. A requisição demorou mais que o esperado.";
	const rawMessage = error instanceof Error ? error.message : "Não foi possível enviar a mensagem de teste.";
	const normalized = rawMessage.toLowerCase();
	if (normalized.includes("request entity too large") || normalized.includes("payload too large")) return "Arquivo muito grande para envio. Tente um arquivo menor.";
	if (normalized.includes("audio file might be corrupted or unsupported") || normalized.includes("corrupted") || normalized.includes("unsupported")) return "Não foi possível transcrever este áudio. Tente gravar novamente ou enviar em outro formato.";
	if (normalized.includes("provider") || normalized.includes("openai")) return "Não foi possível interpretar o anexo agora. Tente novamente.";
	return rawMessage;
}
function formatDuration(seconds) {
	const safeSeconds = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(safeSeconds / 60);
	const remainingSeconds = safeSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
function formatFileSize(size) {
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function createLocalId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function formatMessageTime(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("pt-BR", {
		hour: "2-digit",
		minute: "2-digit"
	}).format(date);
}
function getMessageModeLabel(mode) {
	if (mode === "ai-runtime") return "IA real";
	if (mode === "initial-message") return "mensagem inicial";
	return "determinístico";
}
function getConfigurationSourceLabel(source) {
	return {
		"tenant-settings": "tenant",
		"env-fallback": ".env",
		mixed: "mista",
		unavailable: "indisponível"
	}[source];
}
function getModelSourceLabel(source) {
	if (source === "assistant") return "modelo do assistente";
	if (source === "runtime-config") return "modelo da configuração";
	return "modelo não configurado";
}
function getFallbackReasonLabel(reason) {
	return {
		"ai-runtime-disabled": "IA real desabilitada",
		"ai-provider-not-configured": "Provider incompleto",
		"ai-model-not-configured": "Modelo não configurado",
		"ai-provider-auth-error": "Autenticação do provider",
		"ai-provider-quota-error": "Quota/rate limit do provider",
		"ai-provider-error": "Erro do provider"
	}[reason];
}
function isConversationNotFoundError(error) {
	return error instanceof ApiError && error.status === 404 && error.message === "Conversation not found.";
}
//#endregion
export { TestePage as component };
