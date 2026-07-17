import { readFile } from "node:fs/promises";
import path from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { PDFParse } from "pdf-parse";
import {
  type AttachmentInterpreterInput,
  type AttachmentInterpreterProvider,
  type AttachmentInterpreterResult,
  type AttachmentProcessingDebug,
} from "./attachment-interpreter.types";
import { AiService } from "../ai/ai.service";
import { OpenAiAttachmentInterpreterProvider } from "./openai-attachment-interpreter.provider";

const MAX_INTERPRETED_TEXT_LENGTH = 8000;
const MAX_LOCAL_TEXT_FILE_LENGTH = 12000;
const MAX_LOCAL_PDF_TEXT_LENGTH = 12000;
const MAX_CSV_PREVIEW_ROWS = 8;
const MAX_CSV_PREVIEW_COLUMNS = 12;
const MAX_CSV_PREVIEW_CELL_LENGTH = 120;

function truncateText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}…`;
}

function trimOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isTextMimeType(mimeType: string, fileName: string): boolean {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName.toLowerCase();
  return (
    lowerMime.startsWith("text/") ||
    lowerMime.includes("json") ||
    lowerMime.includes("xml") ||
    lowerMime.includes("html") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".json") ||
    lowerName.endsWith(".xml") ||
    lowerName.endsWith(".html")
  );
}

function isCsvLike(mimeType: string, fileName: string): boolean {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName.toLowerCase();
  return lowerMime.includes("csv") || lowerMime.includes("tsv") || lowerName.endsWith(".csv") || lowerName.endsWith(".tsv");
}

function isPdf(mimeType: string, fileName: string): boolean {
  return mimeType.toLowerCase().includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
}

function isSpreadsheet(mimeType: string, fileName: string): boolean {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName.toLowerCase();
  return (
    lowerMime.includes("sheet") ||
    lowerMime.includes("excel") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".ods")
  );
}

function isDocument(mimeType: string, fileName: string): boolean {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName.toLowerCase();
  return (
    lowerMime.includes("word") ||
    lowerMime.includes("document") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".rtf") ||
    lowerName.endsWith(".odt")
  );
}

function isBinaryDocument(mimeType: string, fileName: string): boolean {
  return isDocument(mimeType, fileName) || isSpreadsheet(mimeType, fileName);
}

function isVideo(mimeType: string, fileName: string): boolean {
  return mimeType.toLowerCase().startsWith("video/") || /\.(mp4|mov|mkv)$/i.test(fileName);
}

function isAudio(mimeType: string, fileName: string): boolean {
  return mimeType.toLowerCase().startsWith("audio/") || /\.(mp3|mp4|mpeg|m4a|ogg|wav|webm)$/i.test(fileName);
}

function buildLocalTextFromFile(
  fileName: string,
  content: string,
  isCsvPreview: boolean,
): {
  extractedText: string;
  interpretedSummary: string;
  metadataJson: Record<string, unknown>;
} {
  const truncated = truncateText(content, MAX_LOCAL_TEXT_FILE_LENGTH);
  const csvPreview = isCsvPreview ? summarizeCsv(fileName, truncated) : null;

  return {
    extractedText: truncated,
    interpretedSummary: csvPreview
      ? `CSV processado localmente: ${csvPreview.summary}`
      : `Arquivo texto processado localmente: ${truncateText(truncated.slice(0, 1000), 1000)}`,
    metadataJson: csvPreview
      ? { kind: "csv", ...csvPreview }
      : { kind: "text" },
  };
}

function summarizeCsv(fileName: string, content: string): { summary: string; columns: string[]; rows: string[][] } {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { summary: "arquivo vazio", columns: [], rows: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const columns = splitCsvLine(lines[0], delimiter).slice(0, MAX_CSV_PREVIEW_COLUMNS);
  const rows = lines.slice(1, MAX_CSV_PREVIEW_ROWS + 1).map((line) =>
    splitCsvLine(line, delimiter)
      .slice(0, MAX_CSV_PREVIEW_COLUMNS)
      .map((cell) => truncateText(cell, MAX_CSV_PREVIEW_CELL_LENGTH)),
  );

  return {
    summary: `colunas: ${columns.join(", ")}; primeiras linhas: ${Math.min(rows.length, MAX_CSV_PREVIEW_ROWS)}`,
    columns,
    rows,
  };
}

function detectDelimiter(line: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;

  for (const candidate of candidates) {
    const count = (line.match(new RegExp(escapeRegExp(candidate), "g")) ?? []).length;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }

  return best;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  parts.push(current.trim());
  return parts;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getHttpStatus(error: unknown): number | null {
  if (!error) return null;
  const err = error as any;
  if (typeof err.status === "number") return err.status;
  if (typeof err.statusCode === "number") return err.statusCode;
  if (typeof err.response?.status === "number") return err.response.status;
  return null;
}

function getErrorCode(error: unknown): string | null {
  if (!error) return null;
  const err = error as any;
  return err.code || err.type || null;
}

@Injectable()
export class AttachmentInterpreterService {
  private readonly logger = new Logger(AttachmentInterpreterService.name);

  constructor(
    private readonly provider: AttachmentInterpreterProvider | null,
    private readonly aiService?: AiService,
  ) {}

  get isProviderConfigured(): boolean {
    return Boolean(this.provider?.isConfigured());
  }

  private async resolveProvider(companyId?: string): Promise<AttachmentInterpreterProvider | null> {
    if (companyId && this.aiService) {
      try {
        const config = await this.aiService.resolveRuntimeConfig(companyId);
        if (config && config.apiKey) {
          return new OpenAiAttachmentInterpreterProvider(config.apiKey, {
            baseUrl: config.baseUrl,
            visionModel: config.model,
            transcriptionModel: "whisper-1",
            timeoutMs: config.requestTimeoutMs,
          });
        }
      } catch (e) {
        this.logger.warn(`Failed to resolve company AI settings: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return this.provider;
  }

  async processAttachment(input: AttachmentInterpreterInput, companyId?: string): Promise<AttachmentInterpreterResult> {
    const normalizedMime = input.mimeType.toLowerCase();

    if (isAudio(normalizedMime, input.fileName)) {
      return this.processAudio(input, companyId);
    }

    if (isVideo(normalizedMime, input.fileName)) {
      this.logger.log(
        JSON.stringify({
          event: "videoProcessingStarted",
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.size,
        }),
      );
      return {
        processingStatus: "failed",
        processingError: "Vídeo não suportado nesta versão do pipeline de anexos.",
        extractedText: null,
        interpretedSummary: "Vídeo recebido, mas ainda não há processamento multimodal de frames nesta versão.",
        transcript: null,
        metadataJson: { kind: "video", supported: false, errorCode: "VIDEO_PROCESSING_FAILED" },
      };
    }

    if (isPdf(normalizedMime, input.fileName)) {
      return this.processPdf(input, companyId);
    }

    if (isSpreadsheet(normalizedMime, input.fileName)) {
      return this.processSpreadsheet(input, companyId);
    }

    if (isBinaryDocument(normalizedMime, input.fileName)) {
      return this.processDocument(input, companyId);
    }

    if (isTextMimeType(normalizedMime, input.fileName) || isCsvLike(normalizedMime, input.fileName)) {
      return this.processTextLike(input, companyId);
    }

    if (normalizedMime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(input.fileName)) {
      return this.processImage(input, companyId);
    }

    return {
      processingStatus: "failed",
      processingError: `Tipo de arquivo não suportado nesta versão: ${input.mimeType}`,
      extractedText: null,
      interpretedSummary: `Arquivo ${input.fileName} recebido, mas sem suporte de interpretação nesta versão.`,
      transcript: null,
      metadataJson: { kind: "unsupported" },
    };
  }

  private async processAudio(input: AttachmentInterpreterInput, companyId?: string): Promise<AttachmentInterpreterResult> {
    const startedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: "audioTranscriptionStarted",
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.size,
      }),
    );

    const providerToUse = await this.resolveProvider(companyId);
    if (!providerToUse || !providerToUse.isConfigured()) {
      const durationMs = Date.now() - startedAt;
      this.logger.warn(
        JSON.stringify({
          event: "mediaProcessingFailed",
          provider: "none",
          model: "none",
          endpoint: "transcription",
          statusHttp: null,
          errorCode: "PROVIDER_NOT_CONFIGURED",
          mimeType: input.mimeType,
          size: input.size,
          durationMs,
        }),
      );
      return {
        processingStatus: "failed",
        processingError: "Provider de áudio não configurado.",
        extractedText: null,
        interpretedSummary: "Áudio recebido, mas o provider de transcrição não está configurado.",
        transcript: null,
        metadataJson: { kind: "audio", supported: false },
      };
    }

    try {
      const result = await providerToUse.transcribeAudio(input);
      const transcript = trimOrNull(result.transcript);
      const interpretedSummary =
        trimOrNull(result.interpretedSummary) ??
        (transcript ? `O usuário enviou um áudio. Transcrição: ${transcript}` : "O usuário enviou um áudio.");

      const durationMs = Date.now() - startedAt;
      this.logger.log(
        JSON.stringify({
          event: "mediaProcessingCompleted",
          provider: result.metadataJson?.provider || "openai",
          model: result.metadataJson?.model || (providerToUse as any)["transcriptionModel"] || "unknown",
          endpoint: "transcription",
          statusHttp: 200,
          mimeType: input.mimeType,
          size: input.size,
          durationMs,
        }),
      );

      return {
        processingStatus: "completed",
        extractedText: transcript,
        interpretedSummary: truncateText(interpretedSummary, MAX_INTERPRETED_TEXT_LENGTH),
        transcript,
        processingError: null,
        metadataJson: result.metadataJson ?? { kind: "audio" },
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const statusHttp = getHttpStatus(error);
      const errorCode = getErrorCode(error) || "TRANSCRIPTION_FAILED";
      const modelUsed = (providerToUse as any)["transcriptionModel"] || "unknown";

      this.logger.warn(
        JSON.stringify({
          event: "mediaProcessingFailed",
          provider: "openai",
          model: modelUsed,
          endpoint: "transcription",
          statusHttp,
          errorCode,
          mimeType: input.mimeType,
          size: input.size,
          durationMs,
        }),
      );
      this.logger.warn(`Audio interpretation failed for ${input.fileName}: ${error instanceof Error ? error.message : String(error)}`);

      return {
        processingStatus: "failed",
        processingError: error instanceof Error ? truncateText(error.message, 500) : "Falha ao transcrever áudio.",
        extractedText: null,
        interpretedSummary: "Áudio recebido, mas a transcrição falhou.",
        transcript: null,
        metadataJson: { kind: "audio", supported: true },
      };
    }
  }

  private async processImage(input: AttachmentInterpreterInput, companyId?: string): Promise<AttachmentInterpreterResult> {
    const startedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: "imageProcessingStarted",
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.size,
      }),
    );

    const providerToUse = await this.resolveProvider(companyId);
    if (!providerToUse || !providerToUse.isConfigured()) {
      const durationMs = Date.now() - startedAt;
      this.logger.warn(
        JSON.stringify({
          event: "mediaProcessingFailed",
          provider: "none",
          model: "none",
          endpoint: "vision",
          statusHttp: null,
          errorCode: "PROVIDER_NOT_CONFIGURED",
          mimeType: input.mimeType,
          size: input.size,
          durationMs,
        }),
      );
      return {
        processingStatus: "failed",
        processingError: "Provider de visão não configurado.",
        extractedText: null,
        interpretedSummary: "Imagem recebida, mas o provider de visão não está configurado.",
        transcript: null,
        metadataJson: { kind: "image", supported: false },
      };
    }

    try {
      const result = await providerToUse.interpretImage(input);
      const extractedText = trimOrNull(result.extractedText);
      const interpretedSummary =
        trimOrNull(result.interpretedSummary) ??
        (extractedText
          ? `O usuário enviou uma imagem chamada ${input.fileName}. Texto detectado: ${extractedText}`
          : `O usuário enviou uma imagem chamada ${input.fileName}.`);

      const durationMs = Date.now() - startedAt;
      this.logger.log(
        JSON.stringify({
          event: "mediaProcessingCompleted",
          provider: result.metadataJson?.provider || "openai",
          model: result.metadataJson?.model || (providerToUse as any)["visionModel"] || "unknown",
          endpoint: "vision",
          statusHttp: 200,
          mimeType: input.mimeType,
          size: input.size,
          durationMs,
        }),
      );

      return {
        processingStatus: "completed",
        extractedText,
        interpretedSummary: truncateText(interpretedSummary, MAX_INTERPRETED_TEXT_LENGTH),
        transcript: null,
        processingError: null,
        metadataJson: result.metadataJson ?? { kind: "image" },
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const statusHttp = getHttpStatus(error);
      const errorCode = getErrorCode(error) || "VISION_FAILED";
      const modelUsed = (providerToUse as any)["visionModel"] || "unknown";

      this.logger.warn(
        JSON.stringify({
          event: "mediaProcessingFailed",
          provider: "openai",
          model: modelUsed,
          endpoint: "vision",
          statusHttp,
          errorCode,
          mimeType: input.mimeType,
          size: input.size,
          durationMs,
        }),
      );
      this.logger.warn(`Image interpretation failed for ${input.fileName}: ${error instanceof Error ? error.message : String(error)}`);

      return {
        processingStatus: "failed",
        processingError: error instanceof Error ? truncateText(error.message, 500) : "Falha ao interpretar imagem.",
        extractedText: null,
        interpretedSummary: "Imagem recebida, mas a interpretação falhou.",
        transcript: null,
        metadataJson: { kind: "image", supported: true },
      };
    }
  }

  private async processPdf(input: AttachmentInterpreterInput, companyId?: string): Promise<AttachmentInterpreterResult> {
    try {
      const parser = new PDFParse({ data: await readFile(input.storagePath) });
      try {
        const parsed = await parser.getText();
        const extractedText = trimOrNull(parsed.text)
          ? truncateText(parsed.text.trim(), MAX_LOCAL_PDF_TEXT_LENGTH)
          : null;

        if (extractedText) {
          const interpretedSummary = truncateText(
            `O usuário enviou o documento ${input.fileName}. Conteúdo extraído: ${truncateText(extractedText, MAX_INTERPRETED_TEXT_LENGTH)}`,
            MAX_INTERPRETED_TEXT_LENGTH,
          );

          return {
            processingStatus: "completed",
            extractedText,
            interpretedSummary,
            transcript: null,
            processingError: null,
            metadataJson: {
              kind: "pdf",
              strategy: "local-pdf-parser",
              textLength: extractedText.length,
              pages: parsed.total,
            },
          };
        }
      } finally {
        await parser.destroy();
      }
    } catch (error) {
      this.logger.warn(
        `Local PDF extraction failed for ${input.fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const providerToUse = await this.resolveProvider(companyId);
    if (!providerToUse || !providerToUse.isConfigured()) {
      return {
        processingStatus: "failed",
        processingError: "PDF sem texto extraível localmente e provider não configurado.",
        extractedText: null,
        interpretedSummary: "PDF recebido, mas não foi possível extrair texto nesta versão.",
        transcript: null,
        metadataJson: { kind: "pdf", supported: false },
      };
    }

    try {
      const result = await providerToUse.extractPdfText(input);
      const extractedText = trimOrNull(result.extractedText);
      const interpretedSummary =
        trimOrNull(result.interpretedSummary) ??
        (extractedText
          ? `O usuário enviou o documento ${input.fileName}. Conteúdo extraído: ${extractedText}`
          : `O usuário enviou o documento ${input.fileName}.`);

      return {
        processingStatus: "completed",
        extractedText,
        interpretedSummary: truncateText(interpretedSummary, MAX_INTERPRETED_TEXT_LENGTH),
        transcript: null,
        processingError: null,
        metadataJson: result.metadataJson ?? { kind: "pdf", strategy: "openai-fallback" },
      };
    } catch (error) {
      this.logger.warn(
        `PDF interpretation failed for ${input.fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        processingStatus: "failed",
        processingError: error instanceof Error ? truncateText(error.message, 500) : "Falha ao interpretar PDF.",
        extractedText: null,
        interpretedSummary: "PDF recebido, mas a interpretação falhou.",
        transcript: null,
        metadataJson: { kind: "pdf", supported: true },
      };
    }
  }

  private async processSpreadsheet(input: AttachmentInterpreterInput, companyId?: string): Promise<AttachmentInterpreterResult> {
    const providerToUse = await this.resolveProvider(companyId);
    if (!providerToUse || !providerToUse.isConfigured()) {
      return {
        processingStatus: "failed",
        processingError: "Provider de planilhas não configurado.",
        extractedText: null,
        interpretedSummary: "Planilha recebida, mas o provider não está configurado.",
        transcript: null,
        metadataJson: { kind: "spreadsheet", supported: false },
      };
    }

    try {
      const result = await providerToUse.summarizeSpreadsheet(input);
      const extractedText = trimOrNull(result.extractedText);
      const interpretedSummary =
        trimOrNull(result.interpretedSummary) ??
        (extractedText
          ? `A planilha ${input.fileName} foi resumida. Conteúdo: ${extractedText}`
          : `A planilha ${input.fileName} foi processada.`);

      return {
        processingStatus: "completed",
        extractedText,
        interpretedSummary: truncateText(interpretedSummary, MAX_INTERPRETED_TEXT_LENGTH),
        transcript: null,
        processingError: null,
        metadataJson: result.metadataJson ?? { kind: "spreadsheet" },
      };
    } catch (error) {
      this.logger.warn(`Spreadsheet interpretation failed for ${input.fileName}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        processingStatus: "failed",
        processingError: error instanceof Error ? truncateText(error.message, 500) : "Falha ao interpretar planilha.",
        extractedText: null,
        interpretedSummary: "Planilha recebida, mas a interpretação falhou.",
        transcript: null,
        metadataJson: { kind: "spreadsheet", supported: true },
      };
    }
  }

  private async processDocument(input: AttachmentInterpreterInput, companyId?: string): Promise<AttachmentInterpreterResult> {
    const providerToUse = await this.resolveProvider(companyId);
    if (!providerToUse || !providerToUse.isConfigured()) {
      return {
        processingStatus: "failed",
        processingError: "Provider de documentos não configurado.",
        extractedText: null,
        interpretedSummary: "Documento binário recebido, mas o provider de documentos não está configurado.",
        transcript: null,
        metadataJson: { kind: "document", supported: false },
      };
    }

    try {
      const result = await providerToUse.extractTextFile(input);
      return {
        processingStatus: "completed",
        extractedText: trimOrNull(result.extractedText),
        interpretedSummary:
          trimOrNull(result.interpretedSummary) ?? `Documento ${input.fileName} processado pelo provider.`,
        transcript: null,
        processingError: null,
        metadataJson: result.metadataJson ?? { kind: "document" },
      };
    } catch (error) {
      this.logger.warn(
        `Document interpretation failed for ${input.fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        processingStatus: "failed",
        processingError: error instanceof Error ? truncateText(error.message, 500) : "Falha ao interpretar documento.",
        extractedText: null,
        interpretedSummary: "Documento recebido, mas a interpretação falhou.",
        transcript: null,
        metadataJson: { kind: "document", supported: true },
      };
    }
  }

  private async processTextLike(input: AttachmentInterpreterInput, companyId?: string): Promise<AttachmentInterpreterResult> {
    const raw = await readFile(input.storagePath, "utf8");
    const csvLike = isCsvLike(input.mimeType, input.fileName);
    const local = buildLocalTextFromFile(input.fileName, raw, csvLike);
    const extractedText = truncateText(local.extractedText, MAX_LOCAL_TEXT_FILE_LENGTH);

    const providerToUse = await this.resolveProvider(companyId);
    if (!providerToUse || !providerToUse.isConfigured()) {
      return {
        processingStatus: "completed",
        extractedText,
        interpretedSummary: local.interpretedSummary,
        transcript: null,
        processingError: null,
        metadataJson: local.metadataJson,
      };
    }

    if (csvLike) {
      try {
        const result = await providerToUse.summarizeSpreadsheet(input);
        return {
          processingStatus: "completed",
          extractedText: trimOrNull(result.extractedText) ?? extractedText,
          interpretedSummary:
            trimOrNull(result.interpretedSummary) ??
            `CSV enviado: ${truncateText(local.interpretedSummary, MAX_INTERPRETED_TEXT_LENGTH)}`,
          transcript: null,
          processingError: null,
          metadataJson: {
            kind: "csv",
            ...local.metadataJson,
            ...(result.metadataJson ?? {}),
          },
        };
      } catch (error) {
        return {
          processingStatus: "failed",
          processingError: error instanceof Error ? truncateText(error.message, 500) : "Falha ao interpretar CSV.",
          extractedText,
          interpretedSummary: local.interpretedSummary,
          transcript: null,
          metadataJson: local.metadataJson,
        };
      }
    }

    if (isTextMimeType(input.mimeType, input.fileName)) {
      return {
        processingStatus: "completed",
        extractedText,
        interpretedSummary: local.interpretedSummary,
        transcript: null,
        processingError: null,
        metadataJson: local.metadataJson,
      };
    }

    if (providerToUse?.isConfigured()) {
      try {
        const result = await providerToUse.extractTextFile(input);
        return {
          processingStatus: "completed",
          extractedText: trimOrNull(result.extractedText) ?? extractedText,
          interpretedSummary: trimOrNull(result.interpretedSummary) ?? local.interpretedSummary,
          transcript: null,
          processingError: null,
          metadataJson: result.metadataJson ?? local.metadataJson,
        };
      } catch (error) {
        return {
          processingStatus: "failed",
          processingError: error instanceof Error ? truncateText(error.message, 500) : "Falha ao interpretar arquivo.",
          extractedText,
          interpretedSummary: local.interpretedSummary,
          transcript: null,
          metadataJson: local.metadataJson,
        };
      }
    }

    return {
      processingStatus: "completed",
      extractedText,
      interpretedSummary: local.interpretedSummary,
      transcript: null,
      processingError: null,
      metadataJson: local.metadataJson,
    };
  }

  buildRuntimeInputText(input: {
    rawText?: string | null;
    contact?: { name: string; phone: string } | null;
    location?: { label?: string; latitude?: number; longitude?: number } | null;
    attachments: Array<{
      type: string;
      fileName: string;
      mimeType: string;
      processingStatus?: string | null;
      extractedText?: string | null;
      interpretedSummary?: string | null;
      transcript?: string | null;
      processingError?: string | null;
    }>;
  }): string {
    const parts: string[] = [];

    if (input.rawText?.trim()) {
      parts.push(input.rawText);
    }

    if (input.contact) {
      parts.push(`Contato enviado:\nNome: ${input.contact.name}\nTelefone: ${input.contact.phone}`);
    }

    if (input.location) {
      const locationParts = [
        input.location.label ? `Localização: ${input.location.label}` : "Localização enviada",
        typeof input.location.latitude === "number" || typeof input.location.longitude === "number"
          ? `Coordenadas: ${[
              typeof input.location.latitude === "number" ? input.location.latitude : null,
              typeof input.location.longitude === "number" ? input.location.longitude : null,
            ]
              .filter((value) => value !== null)
              .join(", ")}`
          : null,
      ].filter(Boolean);
      parts.push(locationParts.join("\n"));
    }

    for (const attachment of input.attachments) {
      const header = `${attachment.type === "image" ? "Imagem" : attachment.type === "audio" ? "Áudio" : attachment.type === "pdf" ? "Documento" : attachment.type === "spreadsheet" ? "Planilha" : "Anexo"} enviada: ${attachment.fileName}`;
      const lines = [header];
      if (attachment.processingStatus) {
        lines.push(`Status: ${attachment.processingStatus}`);
      }
      if (attachment.transcript) {
        lines.push(`Transcrição: ${attachment.transcript}`);
      }
      if (attachment.extractedText) {
        lines.push(`Texto extraído: ${attachment.extractedText}`);
      }
      if (attachment.interpretedSummary) {
        lines.push(`Descrição: ${attachment.interpretedSummary}`);
      }
      if (attachment.processingError) {
        lines.push(`Erro de processamento: ${attachment.processingError}`);
      }
      parts.push(lines.join("\n"));
    }

    return parts.join("\n\n");
  }

  /**
   * Text authored by the customer (or transcribed from the customer's audio).
   * Contact, location and attachment labels are runtime metadata and must not
   * participate in intent or flow selection.
   */
  buildCustomerIntentText(input: {
    rawText?: string | null;
    attachments: Array<{
      extractedText?: string | null;
      interpretedSummary?: string | null;
      transcript?: string | null;
    }>;
  }): string {
    const parts: string[] = [];
    if (input.rawText?.trim()) parts.push(input.rawText);
    for (const attachment of input.attachments) {
      const interpreted = [
        attachment.transcript,
        attachment.extractedText,
        attachment.interpretedSummary,
      ].find((value) => Boolean(value?.trim()));
      if (interpreted?.trim()) parts.push(interpreted.trim());
    }
    return parts.join("\n\n");
  }

  async processAttachments(input: {
    source: AttachmentInterpreterInput["source"];
    attachments: AttachmentInterpreterInput[];
  }): Promise<{ attachments: AttachmentProcessingDebug[] }> {
    const processed: AttachmentProcessingDebug[] = [];

    for (const attachment of input.attachments) {
      const result = await this.processAttachment(attachment);
      processed.push({
        source: attachment.source,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        processingStatus: result.processingStatus,
        extractedText: result.extractedText ?? null,
        interpretedSummary: result.interpretedSummary ?? null,
        transcript: result.transcript ?? null,
        processingError: result.processingError ?? null,
        metadataJson: result.metadataJson ?? null,
      });
    }

    return { attachments: processed };
  }
}
