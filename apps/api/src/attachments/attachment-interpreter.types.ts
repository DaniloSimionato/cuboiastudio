import type { InboundMessageSource } from "../assistant-conversations/inbound-message";

export type AttachmentProcessingStatus = "pending" | "processing" | "completed" | "failed";

export type AttachmentInterpreterInput = {
  source: InboundMessageSource;
  fileName: string;
  mimeType: string;
  storagePath: string;
  size: number;
  dataUrl?: string | null;
  thumbUrl?: string | null;
  caption?: string | null;
  durationSeconds?: number | null;
};

export type AttachmentInterpreterResult = {
  processingStatus: AttachmentProcessingStatus;
  extractedText?: string | null;
  interpretedSummary?: string | null;
  transcript?: string | null;
  processingError?: string | null;
  metadataJson?: Record<string, unknown> | null;
};

export type AttachmentProcessingDebug = {
  source: InboundMessageSource;
  fileName: string;
  mimeType: string;
  size: number;
  processingStatus: AttachmentProcessingStatus;
  extractedText?: string | null;
  interpretedSummary?: string | null;
  transcript?: string | null;
  processingError?: string | null;
  metadataJson?: Record<string, unknown> | null;
};

export interface AttachmentInterpreterProvider {
  isConfigured(): boolean;
  transcribeAudio(
    input: AttachmentInterpreterInput,
  ): Promise<Omit<AttachmentInterpreterResult, "processingStatus">>;
  interpretImage(
    input: AttachmentInterpreterInput,
  ): Promise<Omit<AttachmentInterpreterResult, "processingStatus">>;
  extractPdfText(
    input: AttachmentInterpreterInput,
  ): Promise<Omit<AttachmentInterpreterResult, "processingStatus">>;
  extractTextFile(
    input: AttachmentInterpreterInput,
  ): Promise<Omit<AttachmentInterpreterResult, "processingStatus">>;
  summarizeSpreadsheet(
    input: AttachmentInterpreterInput,
  ): Promise<Omit<AttachmentInterpreterResult, "processingStatus">>;
}
