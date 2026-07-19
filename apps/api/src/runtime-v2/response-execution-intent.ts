import { createHash } from "node:crypto";
import { understandTurn } from "./turn-understanding";
import type { UsefulHistoryMessage } from "./runtime-v2.types";
import type { ResponseExecutionConversationContext } from "./response-execution-conversation-context";

/**
 * The sole semantic contract used to admit a controlled V2 response.  It is
 * deliberately narrower than the general turn understanding contract: only a
 * deterministic operating-hours question backed by OFFICIAL_CONTEXT is in
 * scope for the single-use executor.
 */
export const RESPONSE_EXECUTION_INTENT_VERSION = "runtime-v2-response-execution-intent-v1";

export type ResponseExecutionIntent = "ask_business_hours";

export type ResponseExecutionSemanticDecision = {
  version: typeof RESPONSE_EXECUTION_INTENT_VERSION;
  category: "businessHours" | null;
  intent: ResponseExecutionIntent | null;
  authority: "OFFICIAL_CONTEXT" | null;
  applicable: boolean;
  deterministicReason: string;
  fingerprint: string;
  contextResolutionVersion: string;
  contextFingerprint: string;
  antecedentFingerprint: string | null;
  antecedentCategory: "businessHours" | null;
  antecedentIntent: ResponseExecutionIntent | null;
  contextualResolution: boolean;
  redactionApplied: true;
};

export type ResolveResponseExecutionIntentInput = {
  canonicalMessage: string;
  messageId: string;
  contextVersion?: number;
  recentHistory?: UsefulHistoryMessage[];
  recentBusinessHoursTopic?: boolean;
  conversationContext?: ResponseExecutionConversationContext;
  now?: Date;
};

function decisionFingerprint(input: {
  category: "businessHours" | null;
  intent: ResponseExecutionIntent | null;
  applicable: boolean;
  deterministicReason: string;
  contextResolutionVersion?: string;
  contextFingerprint?: string;
  antecedentFingerprint?: string | null;
}): string {
  // Never fingerprint message text or history contents here. The canonical
  // inbound hash separately binds the approval to the exact inbound content.
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: RESPONSE_EXECUTION_INTENT_VERSION,
        ...input,
      }),
    )
    .digest("hex");
}

/**
 * Resolves the semantic eligibility from trusted, canonical inbound content
 * and bounded same-conversation history. Callers must not supply a category or
 * intent from a CLI, webhook or other external payload.
 */
export function resolveResponseExecutionIntent(
  input: ResolveResponseExecutionIntentInput,
): ResponseExecutionSemanticDecision {
  const normalizedMessage = input.canonicalMessage
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  const contextDependentFollowUp = /^e ate que horas(?: voces atendem)?[?!.\s]*$/.test(
    normalizedMessage,
  );
  const hasRecentBusinessHoursTopic = input.conversationContext
    ? input.conversationContext.antecedentCategory === "businessHours" &&
      input.conversationContext.antecedentIntent === "ask_business_hours"
    : (input.recentHistory ?? []).slice(-6).some((message) => {
        const historicalUnderstanding = understandTurn({
          message: message.content,
          messageId: message.id ?? "history",
          contextVersion: input.contextVersion,
          recentHistory: [],
        });
        return (
          historicalUnderstanding.turnIntent === "ask_business_hours" &&
          historicalUnderstanding.requestedInformationCategories.length === 1 &&
          historicalUnderstanding.requestedInformationCategories[0] === "businessHours"
        );
      });
  const recentHistory = input.conversationContext?.messages ?? input.recentHistory?.slice(-6);
  const understanding = understandTurn({
    message: input.canonicalMessage,
    messageId: input.messageId,
    contextVersion: input.contextVersion,
    recentHistory,
    recentBusinessHoursTopic: input.recentBusinessHoursTopic,
    now: input.now,
  });
  const onlyBusinessHours =
    understanding.requestedInformationCategories.length === 1 &&
    understanding.requestedInformationCategories[0] === "businessHours";
  const operationalOrUnrelatedSubject =
    /\b(?:pedido|entrega|tecnico|agend(?:ar|amento)?|prazo|pronto|custa|preco|valor|pessoa|humano)\b/.test(
      normalizedMessage,
    );
  const applicable =
    onlyBusinessHours &&
    understanding.turnIntent === "ask_business_hours" &&
    !understanding.requiresClarification &&
    !understanding.humanHandoffSignal.requested &&
    !operationalOrUnrelatedSubject &&
    (!contextDependentFollowUp || hasRecentBusinessHoursTopic);
  const deterministicReason = applicable
    ? understanding.followUpResolutionStatus === "RESOLVED"
      ? "RECENT_BUSINESS_HOURS_CONTEXT"
      : "EXPLICIT_BUSINESS_HOURS"
    : understanding.humanHandoffSignal.requested
      ? "HUMAN_HANDOFF_REQUESTED"
      : contextDependentFollowUp && !hasRecentBusinessHoursTopic
        ? "BUSINESS_HOURS_FOLLOW_UP_CONTEXT_REQUIRED"
        : operationalOrUnrelatedSubject
          ? "NON_BUSINESS_HOURS_SUBJECT"
          : understanding.requiresClarification
            ? "BUSINESS_HOURS_CONTEXT_AMBIGUOUS"
            : understanding.requestedInformationCategories.length > 1
              ? "MULTIPLE_OR_NON_BUSINESS_HOURS_CATEGORIES"
              : "BUSINESS_HOURS_INTENT_NOT_RESOLVED";
  const category = applicable ? ("businessHours" as const) : null;
  const intent = applicable ? ("ask_business_hours" as const) : null;
  return {
    version: RESPONSE_EXECUTION_INTENT_VERSION,
    category,
    intent,
    authority: applicable ? "OFFICIAL_CONTEXT" : null,
    applicable,
    deterministicReason,
    fingerprint: decisionFingerprint({
      category,
      intent,
      applicable,
      deterministicReason,
      ...(input.conversationContext
        ? {
            contextResolutionVersion: input.conversationContext.contextResolutionVersion,
            contextFingerprint: input.conversationContext.contextFingerprint,
            antecedentFingerprint: input.conversationContext.antecedentFingerprint,
          }
        : {}),
    }),
    contextResolutionVersion:
      input.conversationContext?.contextResolutionVersion ?? "legacy-history-v1",
    contextFingerprint:
      input.conversationContext?.contextFingerprint ??
      decisionFingerprint({
        category: null,
        intent: null,
        applicable: false,
        deterministicReason: "LEGACY_CONTEXT_UNVERSIONED",
      }),
    antecedentFingerprint: input.conversationContext?.antecedentFingerprint ?? null,
    antecedentCategory: input.conversationContext?.antecedentCategory ?? null,
    antecedentIntent: input.conversationContext?.antecedentIntent ?? null,
    contextualResolution:
      contextDependentFollowUp &&
      (input.conversationContext?.contextualResolution ?? hasRecentBusinessHoursTopic),
    redactionApplied: true,
  };
}
