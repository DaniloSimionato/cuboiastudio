import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type InboundMessageSource = "tests" | "chatwoot";

export type InboundAttachmentType =
  | "image"
  | "document"
  | "audio"
  | "video"
  | "contact"
  | "location"
  | "gif";

export type InboundAttachmentInput = {
  type: Exclude<InboundAttachmentType, "contact" | "location">;
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
};

export type InboundContactInput = {
  name: string;
  phone: string;
};

export type InboundLocationInput = {
  label?: string;
  latitude?: number;
  longitude?: number;
};

export type InboundAttachmentRecord = {
  type: InboundAttachmentInput["type"];
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
  metadataJson?: Record<string, unknown> | null;
  durationSeconds?: number | null;
};

export type InboundMessageNormalized = {
  source: InboundMessageSource;
  messageType: string;
  rawText: string;
  interpretedText: string;
  externalMessageId?: string | null;
  externalConversationId?: string | null;
  externalContactId?: string | null;
  externalChannelId?: string | null;
  externalInboxId?: string | null;
  conversationTitle?: string | null;
  contact?: InboundContactInput | null;
  location?: InboundLocationInput | null;
  attachments: InboundAttachmentRecord[];
  externalPayload?: Record<string, unknown> | null;
};

export type InboundAttachmentPersistedInput = InboundAttachmentInput & {
  conversationId: string;
  externalMessageId?: string | null;
  source: InboundMessageSource;
  buffer?: Buffer | null;
  sourceUrl?: string | null;
};

const DEFAULT_ATTACHMENT_STORAGE_ROOT = path.resolve(process.cwd(), "storage", "attachments");

function truncateText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}…`;
}

function sanitizeFileName(fileName: string): string {
  const baseName = path
    .basename(fileName || "attachment")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return baseName.length > 0 ? baseName : "attachment";
}

function inferExtension(mimeType: string, fileName: string): string {
  const extensionFromName = path.extname(fileName).replace(/^\./, "");
  if (extensionFromName) {
    return extensionFromName;
  }

  const lowerMime = mimeType.toLowerCase();
  if (lowerMime.includes("jpeg")) return "jpg";
  if (lowerMime.includes("png")) return "png";
  if (lowerMime.includes("gif")) return "gif";
  if (lowerMime.includes("webp")) return "webp";
  if (lowerMime.includes("mp4")) return "mp4";
  if (lowerMime.includes("webm")) return "webm";
  if (lowerMime.includes("mpeg")) return "mp3";
  if (lowerMime.includes("wav")) return "wav";
  if (lowerMime.includes("pdf")) return "pdf";
  if (lowerMime.includes("csv")) return "csv";
  if (lowerMime.includes("text/plain")) return "txt";

  return "bin";
}

function buildStoragePath(input: {
  conversationId: string;
  source: InboundMessageSource;
  fileName: string;
  mimeType: string;
}): string {
  const safeName = sanitizeFileName(input.fileName);
  const extension = inferExtension(input.mimeType, safeName);
  const fingerprint = createHash("sha1")
    .update(`${input.conversationId}:${input.source}:${safeName}:${Date.now()}:${Math.random()}`)
    .digest("hex")
    .slice(0, 16);

  return path.join(
    DEFAULT_ATTACHMENT_STORAGE_ROOT,
    input.source,
    input.conversationId,
    `${fingerprint}-${safeName}.${extension}`,
  );
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim());
  if (!match) {
    return null;
  }

  const [, mimeType, base64] = match;
  return {
    mimeType,
    buffer: Buffer.from(base64, "base64"),
  };
}

async function fetchRemoteFile(url: string): Promise<{ mimeType: string; buffer: Buffer }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Falha ao baixar anexo remoto (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";

  return {
    mimeType,
    buffer: Buffer.from(arrayBuffer),
  };
}

function isLikelyTextMimeType(mimeType: string, fileName: string): boolean {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName.toLowerCase();

  return (
    lowerMime.startsWith("text/") ||
    lowerMime.includes("csv") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".json") ||
    lowerName.endsWith(".md")
  );
}

function decodeTextBuffer(buffer: Buffer): string {
  const text = buffer.toString("utf8").replace(/\u0000/g, "").trim();
  return truncateText(text, 4000);
}

function formatStructuredLocation(location: InboundLocationInput): string {
  const parts: string[] = [];
  if (location.label?.trim()) {
    parts.push(`Localização: ${location.label.trim()}`);
  } else {
    parts.push("Localização enviada");
  }

  if (typeof location.latitude === "number" || typeof location.longitude === "number") {
    parts.push(
      `Coordenadas: ${[
        typeof location.latitude === "number" ? location.latitude : null,
        typeof location.longitude === "number" ? location.longitude : null,
      ]
        .filter((value) => value !== null)
        .join(", ")}`,
    );
  }

  return parts.join("\n");
}

function formatStructuredContact(contact: InboundContactInput): string {
  return [`Contato: ${contact.name.trim()}`, `Telefone: ${contact.phone.trim()}`].join("\n");
}

function describeAttachment(record: InboundAttachmentRecord): string {
  const lines = [
    `${record.type === "gif" ? "GIF" : record.type === "image" ? "Imagem" : record.type === "video" ? "Vídeo" : record.type === "audio" ? "Áudio" : "Documento"}: ${record.fileName}`,
    `Formato: ${record.mimeType}`,
    `Tamanho: ${formatFileSize(record.size)}`,
  ];

  if (record.caption?.trim()) {
    lines.push(`Legenda: ${truncateText(record.caption.trim(), 1000)}`);
  }

  if (record.transcript?.trim()) {
    lines.push(`Transcrição: ${truncateText(record.transcript.trim(), 2000)}`);
  }

  if (record.extractedText?.trim()) {
    lines.push(`Texto extraído: ${truncateText(record.extractedText.trim(), 2000)}`);
  }

  if (record.description?.trim()) {
    lines.push(`Descrição: ${truncateText(record.description.trim(), 1000)}`);
  }

  if (!record.extractedText && !record.transcript && !record.description) {
    lines.push("Conteúdo estruturado aguardando enriquecimento multimodal.");
  }

  return lines.join("\n");
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

export async function persistInboundAttachment(input: InboundAttachmentPersistedInput): Promise<InboundAttachmentRecord> {
  const fileData = input.buffer
    ? {
        mimeType: input.mimeType,
        buffer: input.buffer,
      }
    : input.dataUrl
    ? parseDataUrl(input.dataUrl)
    : input.url
      ? await fetchRemoteFile(input.url)
      : input.thumbUrl
        ? await fetchRemoteFile(input.thumbUrl)
        : null;

  const buffer = fileData?.buffer ?? Buffer.from(input.extractedText?.trim() ?? input.caption?.trim() ?? "", "utf8");
  const mimeType = fileData?.mimeType ?? input.mimeType;
  const storagePath = buildStoragePath({
    conversationId: input.conversationId,
    source: input.source,
    fileName: input.fileName,
    mimeType,
  });

  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, buffer);

  return {
    type: input.type,
    fileName: input.fileName,
    mimeType,
    size: buffer.byteLength,
    storagePath,
    sourceUrl: input.sourceUrl ?? input.url ?? null,
    thumbUrl: input.thumbUrl ?? null,
    processingStatus: "pending",
    processingError: null,
    caption: input.caption?.trim() ? input.caption.trim() : null,
    extractedText: input.extractedText?.trim() ? truncateText(input.extractedText.trim(), 4000) : null,
    interpretedSummary: null,
    transcript: input.transcript?.trim() ? truncateText(input.transcript.trim(), 4000) : null,
    description: input.description?.trim() ? truncateText(input.description.trim(), 2000) : null,
    metadataJson: null,
    durationSeconds: typeof input.durationSeconds === "number" ? input.durationSeconds : null,
  };
}

export function buildInterpretedInboundText(input: {
  rawText?: string | null;
  attachments: InboundAttachmentRecord[];
  contact?: InboundContactInput | null;
  location?: InboundLocationInput | null;
}): string {
  const sections: string[] = [];
  const rawText = input.rawText?.trim();

  if (rawText) {
    sections.push(rawText);
  }

  if (input.contact) {
    sections.push(formatStructuredContact(input.contact));
  }

  if (input.location) {
    sections.push(formatStructuredLocation(input.location));
  }

  for (const attachment of input.attachments) {
    sections.push(describeAttachment(attachment));
  }

  return sections.join("\n\n").trim();
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function isTextLikeDocument(mimeType: string, fileName: string): boolean {
  return isLikelyTextMimeType(mimeType, fileName);
}
