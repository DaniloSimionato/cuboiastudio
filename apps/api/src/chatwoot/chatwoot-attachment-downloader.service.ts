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
  metadataJson: Record<string, unknown>;
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

@Injectable()
export class ChatwootAttachmentDownloaderService {
  private readonly logger = new Logger(ChatwootAttachmentDownloaderService.name);

  constructor(private readonly configService: ConfigService) {}

  async downloadAttachment(input: {
    config: ResolvedChatwootInboxConfig;
    attachment: NormalizedChatwootAttachment;
    traceLabel?: string;
  }): Promise<DownloadedChatwootAttachment> {
    const candidates = this.buildCandidateUrls(input.attachment);
    const authHeaders = this.buildAuthHeaders(input.config);
    const timeoutMs = this.configService.get<number>("CHATWOOT_ATTACHMENT_DOWNLOAD_TIMEOUT_MS") ?? 15000;
    const expectedLimit = this.resolveSizeLimit(input.attachment.type);

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }

      if (candidate.startsWith("data:")) {
        const parsed = parseDataUrl(candidate);
        if (!parsed) {
          continue;
        }

        const mimeType = parsed.mimeType || input.attachment.mimeType;
        if (parsed.buffer.byteLength > expectedLimit) {
          throw new Error(`Anexo maior que o limite permitido (${expectedLimit} bytes).`);
        }

        const result = {
          buffer: parsed.buffer,
          mimeType,
          fileName: sanitizeFileName(input.attachment.fileName),
          sizeBytes: parsed.buffer.byteLength,
          sourceUrl: candidate,
          thumbUrl: trimOrNull(input.attachment.thumbUrl),
          metadataJson: {
            source: "data-url",
            attachmentType: input.attachment.type,
          },
        };
        this.logger.log(
          `Chatwoot attachment download completed${input.traceLabel ?? ""} for ${result.fileName}: bytes=${result.sizeBytes} mime=${result.mimeType}`,
        );
        return result;
      }

      try {
        const response = await fetch(candidate, {
          redirect: "follow",
          headers: {
            accept: "*/*",
            ...authHeaders,
          },
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || input.attachment.mimeType;
        const contentLengthHeader = response.headers.get("content-length");
        const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;

        if (Number.isFinite(contentLength) && typeof contentLength === "number" && contentLength > expectedLimit) {
          throw new Error(`Anexo maior que o limite permitido (${expectedLimit} bytes).`);
        }

        if (!isAllowedContentType(input.attachment.type, contentType)) {
          throw new Error(`Content-Type incompatível: ${contentType}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.byteLength > expectedLimit) {
          throw new Error(`Anexo maior que o limite permitido (${expectedLimit} bytes).`);
        }

        const result = {
          buffer,
          mimeType: contentType,
          fileName: sanitizeFileName(input.attachment.fileName),
          sizeBytes: buffer.byteLength,
          sourceUrl: candidate,
          thumbUrl: trimOrNull(input.attachment.thumbUrl),
          metadataJson: {
            source: candidate === input.attachment.thumbUrl ? "thumb_url" : "url",
            attachmentType: input.attachment.type,
            contentType,
          },
        };
        this.logger.log(
          `Chatwoot attachment download completed${input.traceLabel ?? ""} for ${result.fileName}: bytes=${result.sizeBytes} mime=${result.mimeType}`,
        );
        return result;
      } catch (error) {
        this.logger.warn(
          `Chatwoot attachment download failed${input.traceLabel ?? ""} for ${input.attachment.fileName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    throw new Error(`Não foi possível baixar o anexo ${input.attachment.fileName}.`);
  }

  private buildCandidateUrls(attachment: NormalizedChatwootAttachment): string[] {
    return [attachment.dataUrl, attachment.url, attachment.thumbUrl].map((value) => trimOrNull(value)).filter(Boolean) as string[];
  }

  private buildAuthHeaders(config: ResolvedChatwootInboxConfig): Record<string, string> {
    if (!config.apiAccessToken) {
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
}
