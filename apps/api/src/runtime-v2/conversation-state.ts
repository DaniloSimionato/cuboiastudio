import {
  type ConversationObjective,
  type ConversationState,
  type ConfirmedFact,
  type TurnUnderstanding,
  type RuntimeV2Scope,
  type JsonValue,
  type SerializedConversationState,
} from "./runtime-v2.types";

export const CONVERSATION_STATE_VERSION = "conversation-state-v2";

export function createEmptyConversationState(
  scope: RuntimeV2Scope,
  now = new Date(),
): ConversationState {
  return {
    schemaVersion: CONVERSATION_STATE_VERSION,
    revision: 0,
    ...scope,
    sessionStartedAt: now,
    firstMessageId: null,
    lastProcessedMessageId: null,
    lastProcessedExternalMessageId: null,
    createdAt: now,
    objective: null,
    secondaryObjectives: [],
    activeTopics: [],
    confirmedFacts: {},
    temporaryFacts: {},
    answeredQuestions: [],
    pendingFields: [],
    lastRelevantQuestion: null,
    lastRelevantQuestionMessageId: null,
    lastRelevantQuestionContextVersion: null,
    lastValidNextStep: null,
    selectedIntent: null,
    selectedFlowId: null,
    flowStage: null,
    status: "ACTIVE",
    updatedAt: now,
    expiresAt: null,
  };
}

export function isConversationStateInScope(
  state: ConversationState,
  scope: RuntimeV2Scope,
): boolean {
  return (
    state.companyId === scope.companyId &&
    state.assistantId === scope.assistantId &&
    state.conversationId === scope.conversationId &&
    state.contextVersion === scope.contextVersion
  );
}

export function resetConversationState(scope: RuntimeV2Scope, now = new Date()): ConversationState {
  return createEmptyConversationState(scope, now);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (typeof value === "object") {
    if (value instanceof Date || Object.getPrototypeOf(value) !== Object.prototype) {
      return false;
    }
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

function toJsonValue(value: unknown, label: string): JsonValue {
  if (value instanceof Date) {
    assertIsoDate(value, label);
    return value.toISOString();
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => toJsonValue(item, `${label}[${index}]`));
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonValue(item, `${label}.${key}`)]),
    );
  }
  throw new Error(`${label} must contain JSON-compatible values`);
}

function assertJsonValue(value: unknown, label: string): asserts value is JsonValue {
  if (!isJsonValue(value)) {
    throw new Error(`${label} must contain JSON-compatible values`);
  }
}

function assertIsoDate(value: unknown, label: string): asserts value is Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid Date`);
  }
}

function assertStateIdentity(state: ConversationState): void {
  for (const key of ["companyId", "assistantId", "conversationId"] as const) {
    if (!state[key]) {
      throw new Error(`${key} is required`);
    }
  }
  if (!Number.isInteger(state.contextVersion) || state.contextVersion < 0) {
    throw new Error("contextVersion must be a non-negative integer");
  }
  if (!Number.isInteger(state.revision) || state.revision < 0) {
    throw new Error("revision must be a non-negative integer");
  }
}

export function serializeConversationState(state: ConversationState): SerializedConversationState {
  assertStateIdentity(state);
  assertIsoDate(state.createdAt, "createdAt");
  assertIsoDate(state.sessionStartedAt, "sessionStartedAt");
  assertIsoDate(state.updatedAt, "updatedAt");
  if (state.expiresAt !== null) {
    assertIsoDate(state.expiresAt, "expiresAt");
  }

  const serializable = toJsonValue(
    {
      ...state,
      sessionStartedAt: state.sessionStartedAt.toISOString(),
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      expiresAt: state.expiresAt?.toISOString() ?? null,
    },
    "conversation state",
  ) as SerializedConversationState;
  assertJsonValue(serializable, "conversation state");
  return serializable;
}

function parseDate(value: unknown, label: string): Date {
  if (typeof value !== "string") {
    throw new Error(`${label} must be an ISO string`);
  }
  const date = new Date(value);
  assertIsoDate(date, label);
  return date;
}

export function deserializeConversationState(input: unknown): ConversationState {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("conversation state must be an object");
  }
  const value = input as Record<string, unknown>;
  const state = {
    ...value,
    firstMessageId: value.firstMessageId === undefined ? null : value.firstMessageId,
    lastRelevantQuestionMessageId:
      value.lastRelevantQuestionMessageId === undefined
        ? null
        : value.lastRelevantQuestionMessageId,
    lastRelevantQuestionContextVersion:
      value.lastRelevantQuestionContextVersion === undefined
        ? null
        : value.lastRelevantQuestionContextVersion,
    sessionStartedAt:
      value.sessionStartedAt === undefined
        ? parseDate(value.createdAt, "createdAt")
        : parseDate(value.sessionStartedAt, "sessionStartedAt"),
    createdAt: parseDate(value.createdAt, "createdAt"),
    updatedAt: parseDate(value.updatedAt, "updatedAt"),
    expiresAt: value.expiresAt === null ? null : parseDate(value.expiresAt, "expiresAt"),
  } as unknown as ConversationState;
  assertStateIdentity(state);
  if (state.schemaVersion !== CONVERSATION_STATE_VERSION) {
    throw new Error("unsupported conversation state schemaVersion");
  }
  if (state.lastProcessedMessageId !== null && typeof state.lastProcessedMessageId !== "string") {
    throw new Error("lastProcessedMessageId must be a string or null");
  }
  if (
    state.lastProcessedExternalMessageId !== null &&
    typeof state.lastProcessedExternalMessageId !== "string"
  ) {
    throw new Error("lastProcessedExternalMessageId must be a string or null");
  }
  if (state.firstMessageId !== null && typeof state.firstMessageId !== "string") {
    throw new Error("firstMessageId must be a string or null");
  }
  if (
    state.lastRelevantQuestionMessageId !== null &&
    typeof state.lastRelevantQuestionMessageId !== "string"
  ) {
    throw new Error("lastRelevantQuestionMessageId must be a string or null");
  }
  if (
    state.lastRelevantQuestionContextVersion !== null &&
    (!Number.isInteger(state.lastRelevantQuestionContextVersion) ||
      state.lastRelevantQuestionContextVersion < 0)
  ) {
    throw new Error("lastRelevantQuestionContextVersion must be a non-negative integer or null");
  }
  if (state.lastRelevantQuestion) {
    const question = state.lastRelevantQuestion as unknown as Record<string, unknown>;
    if (
      question.contextVersion !== state.contextVersion ||
      typeof question.askedAt !== "string" ||
      typeof question.sourceMessageId !== "string"
    ) {
      state.lastRelevantQuestion = null;
      state.lastRelevantQuestionMessageId = null;
      state.lastRelevantQuestionContextVersion = null;
    }
  }
  assertJsonValue(
    {
      objective: state.objective,
      secondaryObjectives: state.secondaryObjectives,
      confirmedFacts: state.confirmedFacts,
      temporaryFacts: state.temporaryFacts,
      lastRelevantQuestion: state.lastRelevantQuestion,
    },
    "conversation state",
  );

  if (state.lastRelevantQuestion) {
    const question = state.lastRelevantQuestion as unknown as Record<string, unknown>;
    question.askedAt = parseDate(question.askedAt, "lastRelevantQuestion.askedAt");
  }

  for (const facts of [state.confirmedFacts, state.temporaryFacts]) {
    for (const fact of Object.values(facts)) {
      if (!fact || typeof fact !== "object" || Array.isArray(fact)) {
        throw new Error("fact must be an object");
      }
      const factRecord = fact as unknown as Record<string, unknown>;
      const confirmedAt = parseDate(factRecord.confirmedAt, "fact.confirmedAt");
      factRecord.confirmedAt = confirmedAt;
      if (factRecord.expiresAt !== undefined && factRecord.expiresAt !== null) {
        factRecord.expiresAt = parseDate(factRecord.expiresAt, "fact.expiresAt");
      }
      if (!("key" in factRecord) || typeof factRecord.key !== "string") {
        throw new Error("fact.key is required");
      }
      assertJsonValue(
        {
          ...factRecord,
          confirmedAt: confirmedAt.toISOString(),
          expiresAt: factRecord.expiresAt ?? null,
        },
        "fact",
      );
    }
  }
  return state;
}

export function markMessageProcessed(
  state: ConversationState,
  message: { internalMessageId?: string | null; externalMessageId?: string | null },
  now = new Date(),
): ConversationState {
  return {
    ...state,
    lastProcessedMessageId: message.internalMessageId ?? state.lastProcessedMessageId,
    lastProcessedExternalMessageId:
      message.externalMessageId ?? state.lastProcessedExternalMessageId,
    updatedAt: now,
  };
}

export function isMessageAlreadyProcessed(
  state: ConversationState,
  message: { internalMessageId?: string | null; externalMessageId?: string | null },
): boolean {
  return Boolean(
    (message.internalMessageId && state.lastProcessedMessageId === message.internalMessageId) ||
    (message.externalMessageId &&
      state.lastProcessedExternalMessageId === message.externalMessageId),
  );
}

function toConfirmedFact(
  fact: TurnUnderstanding["factsExtracted"][number],
  now: Date,
): ConfirmedFact {
  return {
    ...fact,
    confirmedAt: fact.confirmedAt ?? now,
  };
}

function addObjective(
  objectives: ConversationObjective[],
  objective: ConversationObjective | null | undefined,
): ConversationObjective[] {
  if (!objective || objectives.some((item) => item.key === objective.key)) {
    return objectives;
  }
  return [...objectives, objective];
}

export function applyTurnToConversationState(
  state: ConversationState,
  understanding: TurnUnderstanding,
  now = new Date(),
): ConversationState {
  const next: ConversationState = {
    ...state,
    confirmedFacts: { ...state.confirmedFacts },
    temporaryFacts: { ...state.temporaryFacts },
    secondaryObjectives: [...state.secondaryObjectives],
    activeTopics: [...state.activeTopics],
    answeredQuestions: [...state.answeredQuestions],
    updatedAt: now,
  };

  if (!next.firstMessageId) {
    next.firstMessageId = understanding.evidenceMessageIds[0] ?? null;
  }

  if (understanding.objectiveAction === "REPLACE") {
    next.objective = understanding.objective ?? null;
    next.secondaryObjectives = [];
    next.activeTopics = understanding.objective?.key ? [understanding.objective.key] : [];
    next.pendingFields = [];
  } else if (understanding.objectiveAction === "ADD") {
    next.secondaryObjectives = addObjective(next.secondaryObjectives, understanding.objective);
  } else if (understanding.objectiveAction === "COMPLETE") {
    next.objective = null;
    next.pendingFields = [];
  }

  for (const fact of understanding.factsExtracted) {
    const confirmedFact = toConfirmedFact(fact, now);
    next.confirmedFacts[confirmedFact.key] = confirmedFact;
    next.temporaryFacts[confirmedFact.key] = confirmedFact;
  }

  for (const key of understanding.correctedFactKeys) {
    const fact = next.confirmedFacts[key];
    if (fact) {
      next.confirmedFacts[key] = { ...fact, confirmedAt: now };
      next.temporaryFacts[key] = { ...fact, confirmedAt: now };
    }
  }

  if (understanding.reasonCodes.includes("CUSTOMER_UNABLE_TO_ANSWER")) {
    const refusedFieldKey = next.lastRelevantQuestion?.fieldKey;
    next.lastRelevantQuestion = null;
    next.lastRelevantQuestionMessageId = null;
    next.lastRelevantQuestionContextVersion = null;
    next.lastValidNextStep = null;
    if (refusedFieldKey) {
      next.pendingFields = next.pendingFields.filter((field) => field !== refusedFieldKey);
    }
  }

  if (understanding.answeredQuestionKey) {
    next.answeredQuestions = Array.from(
      new Set([...next.answeredQuestions, understanding.answeredQuestionKey]),
    );
    next.pendingFields = next.pendingFields.filter(
      (field) => field !== understanding.answeredQuestionKey,
    );
  }

  if (understanding.nextQuestion) {
    next.lastRelevantQuestion = understanding.nextQuestion;
    next.lastRelevantQuestionMessageId = understanding.nextQuestion.sourceMessageId ?? null;
    next.lastRelevantQuestionContextVersion = understanding.nextQuestion.contextVersion;
    next.lastValidNextStep = understanding.nextQuestion.prompt;
    if (understanding.nextQuestion.fieldKey) {
      next.pendingFields = Array.from(
        new Set([...next.pendingFields, understanding.nextQuestion.fieldKey]),
      );
    }
  }

  if (understanding.objective?.key) {
    next.activeTopics = Array.from(new Set([...next.activeTopics, understanding.objective.key]));
  }

  next.selectedIntent = understanding.turnIntent;
  return next;
}
