import { createHash } from "node:crypto";

export const CANONICAL_INBOUND_MESSAGE_SCHEMA_VERSION = "canonical-inbound-message-v1";
export const INBOUND_MESSAGE_NORMALIZATION_VERSION = "inbound-comparison-v1";

export type CanonicalInboundAttachmentMetadata = {
  count: number;
  hasCaption: boolean;
  hasQuotedMessage: boolean;
};

export type CanonicalInboundMessage = {
  schemaVersion: typeof CANONICAL_INBOUND_MESSAGE_SCHEMA_VERSION;
  companyId: string;
  assistantId: string;
  conversationId: string;
  internalMessageId: string;
  externalMessageReference: string | null;
  contentType: string;
  /**
   * Ephemeral display text used by the V1 and V2 turn inputs. It must never be
   * copied into telemetry merely to make an audit easier.
   */
  displayContent: string;
  canonicalComparisonContent: string;
  canonicalComparisonHash: string | null;
  sourceSnapshotHash: string | null;
  normalizationVersion: typeof INBOUND_MESSAGE_NORMALIZATION_VERSION;
  receivedAt: Date;
  externalCreatedAt: Date | null;
  externalUpdatedAt: Date | null;
  wasEditedAfterReceipt: boolean | null;
  attachmentMetadata: CanonicalInboundAttachmentMetadata;
  quotedMessageMetadata: { present: boolean };
  redactionApplied: true;
};

export type CanonicalInboundMessageTelemetry = Omit<
  CanonicalInboundMessage,
  "displayContent" | "canonicalComparisonContent"
>;

function hasDisplayContent(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Canonicalizes only representation differences that are not meaningful to a
 * customer. It deliberately preserves word casing, punctuation, emoji (ZWJ and
 * variation selectors), and meaningful internal line breaks.
 */
export function normalizeInboundMessageForComparison(value: string | null | undefined): string {
  if (typeof value !== "string") return "";

  return (
    value
      .normalize("NFC")
      .replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ")
      // U+200D joins emoji sequences and U+FE0F controls emoji presentation, so
      // neither is removed here.
      .replace(/[\u200B\u200C\u200E\u200F\u2060]/g, "")
      .trim()
  );
}

export function hashCanonicalInboundMessageContent(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeInboundMessageForComparison(value);
  return normalized ? createHash("sha256").update(normalized, "utf8").digest("hex") : null;
}

function hashSourceSnapshot(value: string | null | undefined): string | null {
  return hasDisplayContent(value) ? createHash("sha256").update(value, "utf8").digest("hex") : null;
}

export function createCanonicalInboundMessage(input: {
  companyId: string;
  assistantId: string;
  conversationId: string;
  internalMessageId: string;
  externalMessageReference?: string | null;
  contentType: string;
  displayContent: string;
  sourceSnapshotContent?: string | null;
  receivedAt: Date;
  externalCreatedAt?: Date | null;
  externalUpdatedAt?: Date | null;
  attachmentMetadata?: Partial<CanonicalInboundAttachmentMetadata>;
  quotedMessagePresent?: boolean;
}): CanonicalInboundMessage {
  const canonicalComparisonContent = normalizeInboundMessageForComparison(input.displayContent);
  const sourceSnapshotContent = input.sourceSnapshotContent ?? input.displayContent;
  const externalUpdatedAt = input.externalUpdatedAt ?? null;
  const externalCreatedAt = input.externalCreatedAt ?? null;

  return {
    schemaVersion: CANONICAL_INBOUND_MESSAGE_SCHEMA_VERSION,
    companyId: input.companyId,
    assistantId: input.assistantId,
    conversationId: input.conversationId,
    internalMessageId: input.internalMessageId,
    externalMessageReference: input.externalMessageReference ?? null,
    contentType: input.contentType,
    displayContent: input.displayContent,
    canonicalComparisonContent,
    canonicalComparisonHash: hashCanonicalInboundMessageContent(input.displayContent),
    sourceSnapshotHash: hashSourceSnapshot(sourceSnapshotContent),
    normalizationVersion: INBOUND_MESSAGE_NORMALIZATION_VERSION,
    receivedAt: input.receivedAt,
    externalCreatedAt,
    externalUpdatedAt,
    wasEditedAfterReceipt:
      externalUpdatedAt && externalCreatedAt
        ? externalUpdatedAt.getTime() > externalCreatedAt.getTime()
        : null,
    attachmentMetadata: {
      count: input.attachmentMetadata?.count ?? 0,
      hasCaption: input.attachmentMetadata?.hasCaption ?? false,
      hasQuotedMessage: input.attachmentMetadata?.hasQuotedMessage ?? false,
    },
    quotedMessageMetadata: { present: input.quotedMessagePresent ?? false },
    redactionApplied: true,
  };
}

export function toCanonicalInboundMessageTelemetry(
  message: CanonicalInboundMessage,
): CanonicalInboundMessageTelemetry {
  const {
    displayContent: _displayContent,
    canonicalComparisonContent: _comparisonContent,
    ...telemetry
  } = message;
  return telemetry;
}
