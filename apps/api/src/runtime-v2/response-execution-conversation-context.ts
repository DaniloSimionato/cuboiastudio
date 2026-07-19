import { createHash } from "node:crypto";
import { understandTurn } from "./turn-understanding";
import type { UsefulHistoryMessage } from "./runtime-v2.types";

/**
 * Versioned, bounded context contract for controlled response execution.  The
 * current inbound is deliberately excluded by identity: it is the subject of
 * classification and can never establish its own antecedent.
 */
export const RESPONSE_EXECUTION_CONTEXT_RESOLUTION_VERSION =
  "runtime-v2-response-execution-context-v1";
export const RESPONSE_EXECUTION_CONTEXT_WINDOW = 6;

export type ResponseExecutionContextMessage = Omit<UsefulHistoryMessage, "relevance" | "role"> & {
  role: string;
  relevance?: UsefulHistoryMessage["relevance"];
  createdAt?: Date | string;
  contextVersion?: number | null;
};

export type ResponseExecutionConversationContext = {
  contextResolutionVersion: typeof RESPONSE_EXECUTION_CONTEXT_RESOLUTION_VERSION;
  contextVersion: number;
  messages: UsefulHistoryMessage[];
  antecedent: {
    fingerprint: string;
    category: "businessHours";
    intent: "ask_business_hours";
  } | null;
  antecedentFingerprint: string | null;
  antecedentCategory: "businessHours" | null;
  antecedentIntent: "ask_business_hours" | null;
  contextFingerprint: string;
  contextualResolution: boolean;
};

function opaqueFingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function timestamp(value: Date | string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value instanceof Date ? value.toISOString() : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function messageRole(role: string): "user" | "assistant" | "tool" {
  return role === "assistant" ? "assistant" : role === "tool" ? "tool" : "user";
}

function isBusinessHoursAntecedent(message: UsefulHistoryMessage, contextVersion: number): boolean {
  if (message.role !== "user") return false;
  const understanding = understandTurn({
    message: message.content,
    messageId: message.id ?? "history",
    contextVersion,
    recentHistory: [],
  });
  return (
    understanding.turnIntent === "ask_business_hours" &&
    understanding.requestedInformationCategories.length === 1 &&
    understanding.requestedInformationCategories[0] === "businessHours"
  );
}

/** Builds the exact same history snapshot for preflight and an already-persisted inbound. */
export function buildResponseExecutionConversationContext(input: {
  contextVersion: number;
  messages: readonly ResponseExecutionContextMessage[];
  currentInboundMessageId?: string;
}): ResponseExecutionConversationContext {
  const ordered = input.messages
    .filter(
      (message) =>
        message.contextVersion === undefined ||
        message.contextVersion === null ||
        message.contextVersion === input.contextVersion,
    )
    .filter((message) => message.id !== input.currentInboundMessageId)
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice()
    .sort(
      (left, right) =>
        timestamp(left.createdAt) - timestamp(right.createdAt) ||
        (left.id ?? "").localeCompare(right.id ?? ""),
    )
    .slice(-RESPONSE_EXECUTION_CONTEXT_WINDOW)
    .map((message) => ({
      id: message.id,
      role: messageRole(message.role),
      content: message.content,
      relevance: message.relevance ?? "objective",
    }));
  const antecedentMessage = [...ordered]
    .reverse()
    .find((message) => isBusinessHoursAntecedent(message, input.contextVersion));
  const antecedentFingerprint = antecedentMessage
    ? opaqueFingerprint({
        version: RESPONSE_EXECUTION_CONTEXT_RESOLUTION_VERSION,
        contextVersion: input.contextVersion,
        id: antecedentMessage.id,
        category: "businessHours",
        intent: "ask_business_hours",
      })
    : null;
  const contextFingerprint = opaqueFingerprint({
    version: RESPONSE_EXECUTION_CONTEXT_RESOLUTION_VERSION,
    contextVersion: input.contextVersion,
    messages: ordered.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    })),
  });
  return {
    contextResolutionVersion: RESPONSE_EXECUTION_CONTEXT_RESOLUTION_VERSION,
    contextVersion: input.contextVersion,
    messages: ordered,
    antecedent: antecedentFingerprint
      ? {
          fingerprint: antecedentFingerprint,
          category: "businessHours",
          intent: "ask_business_hours",
        }
      : null,
    antecedentFingerprint,
    antecedentCategory: antecedentFingerprint ? "businessHours" : null,
    antecedentIntent: antecedentFingerprint ? "ask_business_hours" : null,
    contextFingerprint,
    contextualResolution: Boolean(antecedentFingerprint),
  };
}
