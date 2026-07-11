import fs from "node:fs";
import { createHash } from "node:crypto";
import OpenAI from "openai";
import type {
  AttachmentInterpreterInput,
  AttachmentInterpreterProvider,
} from "./attachment-interpreter.types";

const DEFAULT_VISION_MODEL = "gpt-4o-mini";
const DEFAULT_TRANSCRIPTION_MODEL = "whisper-1";
const MAX_TEXT_OUTPUT_LENGTH = 8000;

function truncateText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}…`;
}

function stripCodeFence(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function dataUrlFromFile(path: string, mimeType: string): string {
  const base64 = fs.readFileSync(path).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function parseJsonBlock(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(stripCodeFence(value));
  } catch {
    return null;
  }
}

function buildInstruction(prompt: string, input: AttachmentInterpreterInput): string {
  return [
    prompt,
    `Arquivo: ${input.fileName}`,
    `MIME: ${input.mimeType}`,
    input.caption ? `Legenda original: ${input.caption}` : null,
    "Responda em português do Brasil.",
    "Se algo não puder ser inferido, use null ou vazio em vez de inventar.",
  ]
    .filter(Boolean)
    .join("\n");
}

function trimOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? truncateText(value.trim(), MAX_TEXT_OUTPUT_LENGTH) : null;
}

export class OpenAiAttachmentInterpreterProvider implements AttachmentInterpreterProvider {
  private readonly client: OpenAI;
  private readonly visionModel: string;
  private readonly transcriptionModel: string;

  constructor(
    apiKey: string,
    options?: {
      baseUrl?: string;
      visionModel?: string;
      transcriptionModel?: string;
      timeoutMs?: number;
    },
  ) {
    this.client = new OpenAI({
      apiKey,
      baseURL: options?.baseUrl?.trim() || undefined,
      timeout: options?.timeoutMs ?? undefined,
    });
    this.visionModel = options?.visionModel?.trim() || DEFAULT_VISION_MODEL;
    this.transcriptionModel = options?.transcriptionModel?.trim() || DEFAULT_TRANSCRIPTION_MODEL;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async transcribeAudio(input: AttachmentInterpreterInput) {
    const response = await this.client.audio.transcriptions.create({
      file: fs.createReadStream(input.storagePath),
      model: this.transcriptionModel,
      response_format: "text",
    });

    const transcript = typeof response === "string" ? response.trim() : (response as { text?: string }).text?.trim() ?? "";

    return {
      transcript: truncateText(transcript, MAX_TEXT_OUTPUT_LENGTH),
      extractedText: null,
      interpretedSummary: transcript
        ? truncateText(`O usuário enviou um áudio. Transcrição: ${transcript}`, MAX_TEXT_OUTPUT_LENGTH)
        : "O usuário enviou um áudio, mas a transcrição veio vazia.",
      processingError: null,
      metadataJson: {
        provider: "openai",
        model: this.transcriptionModel,
        fileHash: createHash("sha1").update(input.storagePath).digest("hex").slice(0, 16),
      },
    };
  }

  async interpretImage(input: AttachmentInterpreterInput) {
    const response = await this.client.chat.completions.create({
      model: this.visionModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildInstruction(
                "Analise a imagem e extraia uma descrição objetiva e qualquer texto visível em OCR. Retorne preferencialmente em formato JSON estruturado com os campos: extractedText e interpretedSummary.",
                input,
              ),
            },
            {
              type: "image_url",
              image_url: {
                url: input.dataUrl ?? dataUrlFromFile(input.storagePath, input.mimeType),
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const rawText = response.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonBlock(rawText);
    const extractedText = trimOrNull(parsed?.extractedText ?? parsed?.ocr ?? parsed?.text ?? null);
    const interpretedSummary =
      trimOrNull(parsed?.interpretedSummary ?? parsed?.description ?? parsed?.summary ?? rawText) ??
      "Imagem processada pelo provider de visão.";

    return {
      transcript: null,
      extractedText,
      interpretedSummary,
      processingError: null,
      metadataJson: {
        provider: "openai",
        model: this.visionModel,
        rawOutputSample: truncateText(rawText, 1000),
      },
    };
  }

  async extractPdfText(input: AttachmentInterpreterInput) {
    return this.extractFileWithPrompt(
      input,
      "Extraia o texto legível deste PDF. Se houver conteúdo escaneado, tente OCR. Devolva JSON com extractedText e interpretedSummary.",
      "pdf",
    );
  }

  async extractTextFile(input: AttachmentInterpreterInput) {
    return this.extractFileWithPrompt(
      input,
      "Extraia o conteúdo textual deste arquivo. Devolva JSON com extractedText e interpretedSummary.",
      "document",
    );
  }

  async summarizeSpreadsheet(input: AttachmentInterpreterInput) {
    return this.extractFileWithPrompt(
      input,
      "Analise esta planilha. Resuma colunas principais, primeiras linhas e insights relevantes. Devolva JSON com extractedText e interpretedSummary.",
      "spreadsheet",
    );
  }

  private async extractFileWithPrompt(
    input: AttachmentInterpreterInput,
    prompt: string,
    kind: "pdf" | "document" | "spreadsheet",
  ) {
    let fileContentPrompt = "";
    try {
      if (
        input.mimeType.startsWith("text/") ||
        input.fileName.endsWith(".csv") ||
        input.fileName.endsWith(".txt") ||
        input.fileName.endsWith(".json")
      ) {
        const text = fs.readFileSync(input.storagePath, "utf8");
        fileContentPrompt = `\n\nConteúdo do arquivo:\n${text.slice(0, 10000)}`;
      } else {
        fileContentPrompt = `\n\n[Arquivo binário: ${input.fileName} (${input.mimeType}), tamanho: ${input.size} bytes]`;
      }
    } catch (e) {
      fileContentPrompt = `\n\n[Erro ao ler arquivo: ${e instanceof Error ? e.message : String(e)}]`;
    }

    const response = await this.client.chat.completions.create({
      model: this.visionModel,
      messages: [
        {
          role: "user",
          content: buildInstruction(prompt, input) + fileContentPrompt,
        },
      ],
    });

    const rawText = response.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonBlock(rawText);
    const extractedText = trimOrNull(parsed?.extractedText ?? parsed?.text ?? rawText ?? null);
    const interpretedSummary =
      trimOrNull(parsed?.interpretedSummary ?? parsed?.summary ?? rawText) ??
      `Arquivo ${kind} processado pelo provider OpenAI.`;
    const warning = trimOrNull(parsed?.warning ?? null);

    return {
      transcript: null,
      extractedText,
      interpretedSummary,
      processingError: null,
      metadataJson: {
        provider: "openai",
        model: this.visionModel,
        kind,
        warning,
        rawOutputSample: truncateText(rawText, 1000),
      },
    };
  }
}
