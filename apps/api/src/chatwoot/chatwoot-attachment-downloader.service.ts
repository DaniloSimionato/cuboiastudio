import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import path from "node:path";
import { type NormalizedChatwootAttachment } from "../webhooks/chatwoot-normalizer";
import type { ResolvedChatwootInboxConfig } from "./chatwoot-inbox-config.service";

export type DownloadedChatwootAttachment = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  sourceUrl: string | null;
  thumbUrl: string | null;
  resolvedType: NormalizedChatwootAttachment["type"];
  metadataJson: Record<string, unknown>;
};

type AttachmentDownloadErrorCode =
  | "DOWNLOAD_UNAUTHORIZED"
  | "DOWNLOAD_FORBIDDEN"
  | "DOWNLOAD_NOT_FOUND"
  | "DOWNLOAD_TIMEOUT"
  | "INVALID_CONTENT_TYPE"
  | "EMPTY_ATTACHMENT"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_MEDIA"
  | "INVALID_ATTACHMENT_URL"
  | "DOWNLOAD_FAILED";

class ChatwootAttachmentDownloadError extends Error {
  constructor(
    readonly code: AttachmentDownloadErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type ResolvedCandidate = {
  url: string;
  source: "data_url" | "file_url" | "thumb_url";
};

type FetchResult = {
  buffer: Buffer;
  finalUrl: string;
  status: number;
  contentType: string;
  contentLength?: number;
};

function trimOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function sanitizeFileName(fileName: string): string {
  const baseName = path
    .basename(fileName || "attachment")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return baseName.length > 0 ? baseName : "attachment";
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

function sanitizeHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).host;
  } catch {
    return "invalid-host";
  }
}

function sanitizeUrlForLog(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl;
  }
}

function inferTypeFromMime(contentType: string): NormalizedChatwootAttachment["type"] {
  const lower = contentType.toLowerCase();
  if (lower.startsWith("image/")) {
    return lower.includes("gif") ? "gif" : "image";
  }

  if (lower.startsWith("audio/")) {
    return "audio";
  }

  if (lower.startsWith("video/")) {
    return "video";
  }

  return "document";
}

function inferTypeFromFileName(fileName: string): NormalizedChatwootAttachment["type"] | null {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(lower)) {
    return lower.endsWith(".gif") ? "gif" : "image";
  }

  if (/\.(ogg|oga|opus|mp3|m4a|aac|wav|webm)$/i.test(lower)) {
    return "audio";
  }

  if (/\.(mp4|mov|avi|mkv|webm)$/i.test(lower)) {
    return "video";
  }

  return null;
}

function inferType(input: {
  declaredType: NormalizedChatwootAttachment["type"];
  mimeType: string;
  fileName: string;
}): NormalizedChatwootAttachment["type"] {
  if (input.mimeType && input.mimeType !== "application/octet-stream") {
    return inferTypeFromMime(input.mimeType);
  }

  return inferTypeFromFileName(input.fileName) ?? input.declaredType;
}

function isAllowedContentType(type: NormalizedChatwootAttachment["type"], contentType: string): boolean {
  const lower = contentType.toLowerCase();
  switch (type) {
    case "image":
    case "gif":
      return lower.startsWith("image/");
    case "audio":
      return lower.startsWith("audio/");
    case "video":
      return lower.startsWith("video/");
    case "document":
      return (
        lower.includes("pdf") ||
        lower.startsWith("text/") ||
        lower.includes("json") ||
        lower.includes("xml") ||
        lower.includes("csv") ||
        lower.includes("word") ||
        lower.includes("document") ||
        lower.includes("excel") ||
        lower.includes("sheet") ||
        lower.includes("officedocument") ||
        lower.includes("octet-stream")
      );
    default:
      return true;
  }
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

@Injectable()
export class ChatwootAttachmentDownloaderService {
  private readonly logger = new Logger(ChatwootAttachmentDownloaderService.name);

  constructor(private readonly configService: ConfigService) {}

  async downloadAttachment(input: {
    config: ResolvedChatwootInboxConfig;
    attachment: NormalizedChatwootAttachment;
    traceLabel?: string;
  }): Promise<DownloadedChatwootAttachment> {
    const candidates = this.buildCandidateUrls(input.attachment, input.config);
    const timeoutMs = this.configService.get<number>("CHATWOOT_ATTACHMENT_DOWNLOAD_TIMEOUT_MS") ?? 15000;
    const expectedLimit = this.resolveSizeLimit(input.attachment.type);
    let lastError: ChatwootAttachmentDownloadError | null = null;

    for (const candidate of candidates) {
      if (candidate.url.startsWith("data:")) {
        const parsed = parseDataUrl(candidate.url);
        if (!parsed) {
          continue;
        }

        const mimeType = parsed.mimeType || input.attachment.mimeType;
        const resolvedType = inferType({
          declaredType: input.attachment.type,
          mimeType,
          fileName: input.attachment.fileName,
        });
        if (parsed.buffer.byteLength > expectedLimit) {
          throw new ChatwootAttachmentDownloadError(
            "FILE_TOO_LARGE",
            `Anexo maior que o limite permitido (${expectedLimit} bytes).`,
            { sizeBytes: parsed.buffer.byteLength, limitBytes: expectedLimit },
          );
        }

        this.logEvent("attachmentDownloadCompleted", input, {
          source: candidate.source,
          host: "data-url",
          sizeBytes: parsed.buffer.byteLength,
          contentType: mimeType,
        });

        return {
          buffer: parsed.buffer,
          mimeType,
          fileName: sanitizeFileName(input.attachment.fileName),
          sizeBytes: parsed.buffer.byteLength,
          sourceUrl: candidate.url,
          thumbUrl: trimOrNull(input.attachment.thumbUrl),
          resolvedType,
          metadataJson: {
            source: candidate.source,
            attachmentType: resolvedType,
          },
        };
      }

      try {
        this.logEvent("attachmentDownloadStarted", input, {
          source: candidate.source,
          host: sanitizeHost(candidate.url),
        });

        const fetched = await this.fetchWithControlledRedirects({
          candidate,
          config: input.config,
          timeoutMs,
        });

        const detectedType = inferType({
          declaredType: input.attachment.type,
          mimeType: fetched.contentType,
          fileName: input.attachment.fileName,
        });
        this.logEvent("mediaMimeDetected", input, {
          source: candidate.source,
          host: sanitizeHost(fetched.finalUrl),
          contentType: fetched.contentType,
          resolvedType: detectedType,
          statusHttp: fetched.status,
        });

        if (fetched.buffer.byteLength === 0) {
          throw new ChatwootAttachmentDownloadError("EMPTY_ATTACHMENT", "Anexo retornou sem conteúdo.", {
            statusHttp: fetched.status,
          });
        }

        if (fetched.contentLength && fetched.contentLength > expectedLimit) {
          throw new ChatwootAttachmentDownloadError(
            "FILE_TOO_LARGE",
            `Anexo maior que o limite permitido (${expectedLimit} bytes).`,
            { sizeBytes: fetched.contentLength, limitBytes: expectedLimit, statusHttp: fetched.status },
          );
        }

        if (fetched.buffer.byteLength > expectedLimit) {
          throw new ChatwootAttachmentDownloadError(
            "FILE_TOO_LARGE",
            `Anexo maior que o limite permitido (${expectedLimit} bytes).`,
            { sizeBytes: fetched.buffer.byteLength, limitBytes: expectedLimit, statusHttp: fetched.status },
          );
        }

        if (
          fetched.contentType.includes("html") ||
          fetched.contentType.includes("xhtml")
        ) {
          throw new ChatwootAttachmentDownloadError(
            "INVALID_CONTENT_TYPE",
            "Download retornou HTML em vez de mídia.",
            { statusHttp: fetched.status, contentType: fetched.contentType },
          );
        }

        if (!isAllowedContentType(detectedType, fetched.contentType)) {
          throw new ChatwootAttachmentDownloadError(
            "INVALID_CONTENT_TYPE",
            `Content-Type incompatível: ${fetched.contentType}`,
            { statusHttp: fetched.status, contentType: fetched.contentType, resolvedType: detectedType },
          );
        }

        this.logEvent("attachmentDownloadCompleted", input, {
          source: candidate.source,
          host: sanitizeHost(fetched.finalUrl),
          sizeBytes: fetched.buffer.byteLength,
          contentType: fetched.contentType,
          statusHttp: fetched.status,
        });

        return {
          buffer: fetched.buffer,
          mimeType: fetched.contentType,
          fileName: sanitizeFileName(input.attachment.fileName),
          sizeBytes: fetched.buffer.byteLength,
          sourceUrl: fetched.finalUrl,
          thumbUrl: trimOrNull(input.attachment.thumbUrl),
          resolvedType: detectedType,
          metadataJson: {
            source: candidate.source,
            attachmentType: detectedType,
            contentType: fetched.contentType,
          },
        };
      } catch (error) {
        const normalized =
          error instanceof ChatwootAttachmentDownloadError
            ? error
            : new ChatwootAttachmentDownloadError(
                "DOWNLOAD_FAILED",
                error instanceof Error ? error.message : "Falha desconhecida ao baixar anexo do Chatwoot.",
              );
        lastError = normalized;
        this.logEvent("attachmentDownloadFailed", input, {
          source: candidate.source,
          host: sanitizeHost(candidate.url),
          errorCode: normalized.code,
          statusHttp: normalized.details?.statusHttp,
          contentType: normalized.details?.contentType,
        });
      }
    }

    throw (
      lastError ??
      new ChatwootAttachmentDownloadError(
        "DOWNLOAD_FAILED",
        `Não foi possível baixar o anexo ${input.attachment.fileName}.`,
      )
    );
  }

  private buildCandidateUrls(
    attachment: NormalizedChatwootAttachment,
    config: ResolvedChatwootInboxConfig,
  ): ResolvedCandidate[] {
    const entries: Array<{ source: ResolvedCandidate["source"]; value: string | null | undefined }> = [
      { source: "data_url", value: attachment.dataUrl },
      { source: "file_url", value: attachment.url },
      { source: "thumb_url", value: attachment.thumbUrl },
    ];

    const resolved: ResolvedCandidate[] = [];
    for (const entry of entries) {
      const normalized = trimOrNull(entry.value);
      if (!normalized) {
        continue;
      }

      const url = this.resolveCandidateUrl(normalized, config);
      resolved.push({ source: entry.source, url });
      this.logEvent("attachmentUrlResolved", { attachment, traceLabel: undefined, config }, {
        source: entry.source,
        host: normalized.startsWith("data:") ? "data-url" : sanitizeHost(url),
        urlPath: normalized.startsWith("data:") ? "data-url" : sanitizeUrlForLog(url),
      });
    }

    return resolved;
  }

  private resolveCandidateUrl(candidate: string, config: ResolvedChatwootInboxConfig): string {
    if (candidate.startsWith("data:")) {
      return candidate;
    }

    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== "https:") {
        throw new ChatwootAttachmentDownloadError(
          "INVALID_ATTACHMENT_URL",
          "URL de anexo deve usar HTTPS.",
          { host: parsed.host },
        );
      }
      return parsed.toString();
    } catch (error) {
      if (error instanceof ChatwootAttachmentDownloadError) {
        throw error;
      }
    }

    const baseUrl = trimOrNull(config.baseUrl);
    if (!baseUrl) {
      throw new ChatwootAttachmentDownloadError(
        "INVALID_ATTACHMENT_URL",
        "Base URL do Chatwoot não está configurada para resolver URL relativa do anexo.",
      );
    }

    return new URL(candidate, `${baseUrl.replace(/\/$/, "")}/`).toString();
  }

  private async fetchWithControlledRedirects(input: {
    candidate: ResolvedCandidate;
    config: ResolvedChatwootInboxConfig;
    timeoutMs: number;
  }): Promise<FetchResult> {
    const baseHost = new URL(input.config.baseUrl).host;
    let currentUrl = input.candidate.url;
    let redirects = 0;

    while (redirects <= 3) {
      const currentHost = sanitizeHost(currentUrl);
      const keepAuth = currentHost === baseHost;
      const headers: Record<string, string> = {
        accept: "*/*",
        ...this.buildAuthHeaders(input.config, keepAuth),
      };

      let response: Response;
      try {
        response = await fetch(currentUrl, {
          redirect: "manual",
          headers,
          signal: AbortSignal.timeout(input.timeoutMs),
        });
      } catch (error) {
        if (error instanceof Error && error.name === "TimeoutError") {
          throw new ChatwootAttachmentDownloadError("DOWNLOAD_TIMEOUT", "Tempo limite ao baixar anexo do Chatwoot.", {
            host: currentHost,
          });
        }

        throw new ChatwootAttachmentDownloadError(
          "DOWNLOAD_FAILED",
          error instanceof Error ? error.message : "Falha ao executar download do anexo do Chatwoot.",
          { host: currentHost },
        );
      }

      if (isRedirectStatus(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new ChatwootAttachmentDownloadError("DOWNLOAD_FAILED", "Redirect sem cabeçalho Location.", {
            host: currentHost,
            statusHttp: response.status,
          });
        }

        const nextUrl = new URL(location, currentUrl);
        if (nextUrl.protocol !== "https:") {
          throw new ChatwootAttachmentDownloadError(
            "INVALID_ATTACHMENT_URL",
            "Redirect de anexo retornou protocolo inseguro.",
            { host: nextUrl.host, statusHttp: response.status },
          );
        }

        redirects += 1;
        currentUrl = nextUrl.toString();
        continue;
      }

      if (response.status === 401) {
        throw new ChatwootAttachmentDownloadError("DOWNLOAD_UNAUTHORIZED", "Download do anexo não autorizado.", {
          host: currentHost,
          statusHttp: response.status,
        });
      }

      if (response.status === 403) {
        throw new ChatwootAttachmentDownloadError("DOWNLOAD_FORBIDDEN", "Download do anexo foi proibido.", {
          host: currentHost,
          statusHttp: response.status,
        });
      }

      if (response.status === 404) {
        throw new ChatwootAttachmentDownloadError("DOWNLOAD_NOT_FOUND", "Anexo não encontrado no Chatwoot/storage.", {
          host: currentHost,
          statusHttp: response.status,
        });
      }

      if (!response.ok) {
        throw new ChatwootAttachmentDownloadError("DOWNLOAD_FAILED", `HTTP ${response.status}`, {
          host: currentHost,
          statusHttp: response.status,
        });
      }

      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
      const contentLengthHeader = response.headers.get("content-length");
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
      const buffer = Buffer.from(await response.arrayBuffer());

      return {
        buffer,
        finalUrl: currentUrl,
        status: response.status,
        contentType,
        contentLength: Number.isFinite(contentLength) ? contentLength : undefined,
      };
    }

    throw new ChatwootAttachmentDownloadError("DOWNLOAD_FAILED", "Número máximo de redirects excedido.");
  }

  private buildAuthHeaders(config: ResolvedChatwootInboxConfig, includeAuth: boolean): Record<string, string> {
    if (!includeAuth || !config.apiAccessToken) {
      return {};
    }

    return {
      api_access_token: config.apiAccessToken,
    };
  }

  private resolveSizeLimit(type: NormalizedChatwootAttachment["type"]): number {
    const defaults = {
      image: this.configService.get<number>("CHATWOOT_ATTACHMENT_MAX_IMAGE_BYTES") ?? 10 * 1024 * 1024,
      gif: this.configService.get<number>("CHATWOOT_ATTACHMENT_MAX_IMAGE_BYTES") ?? 10 * 1024 * 1024,
      audio: this.configService.get<number>("CHATWOOT_ATTACHMENT_MAX_AUDIO_BYTES") ?? 20 * 1024 * 1024,
      video: this.configService.get<number>("CHATWOOT_ATTACHMENT_MAX_VIDEO_BYTES") ?? 20 * 1024 * 1024,
      document: this.configService.get<number>("CHATWOOT_ATTACHMENT_MAX_DOCUMENT_BYTES") ?? 15 * 1024 * 1024,
    } satisfies Record<NormalizedChatwootAttachment["type"], number>;

    return defaults[type];
  }

  private logEvent(
    event: string,
    input: { config: ResolvedChatwootInboxConfig; attachment: NormalizedChatwootAttachment; traceLabel?: string },
    extra: Record<string, unknown>,
  ) {
    this.logger.log(
      JSON.stringify({
        event,
        host: extra.host ?? null,
        source: extra.source ?? null,
        fileName: sanitizeFileName(input.attachment.fileName),
        mediaType: input.attachment.type,
        companyId: input.config.companyId,
        assistantId: input.config.assistantId,
        contentType: extra.contentType ?? null,
        sizeBytes: extra.sizeBytes ?? null,
        statusHttp: extra.statusHttp ?? null,
        errorCode: extra.errorCode ?? null,
        urlPath: extra.urlPath ?? null,
        trace: input.traceLabel ?? null,
      }),
    );
  }
}
