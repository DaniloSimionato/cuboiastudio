import {
  applyTurnToConversationState,
  createEmptyConversationState,
  markMessageProcessed,
} from "./conversation-state";
import {
  isRuntimeV2ShadowEnabled,
  resolveRuntimeV2Mode,
  type RuntimeV2Mode,
} from "./runtime-v2-feature-flag";
import { buildResponsePlan } from "./response-plan";
import { buildRetrievalPlan } from "./retrieval-plan";
import {
  buildRuntimeV2ShadowManifest,
  type RuntimeV2ShadowManifest,
} from "./runtime-v2-shadow-manifest";
import {
  InMemoryConversationStateStore,
  StateAlreadyExistsError,
  StateRevisionConflictError,
  MissingInternalMessageIdError,
  StaleContextError,
  type ConversationStateSaveTurnResult,
  type ConversationStateStore,
  type ConversationStateStoreScope,
} from "./conversation-state-store";
import { validateResponse } from "./response-validator-v2";
import { understandTurn } from "./turn-understanding";
import {
  type ConversationState,
  type RuntimeV2Scope,
  type UsefulHistoryMessage,
} from "./runtime-v2.types";

export type RuntimeV2ShadowSnapshot = {
  scope: RuntimeV2Scope;
  correlationId: string;
  internalMessageId: string;
  externalMessageId?: string | null;
  source: "CUSTOMER" | "HUMAN_AGENT" | "SYSTEM";
  messageType: "TEXT" | "AUDIO" | "ATTACHMENT";
  currentMessage: string;
  lastRelevantQuestion?: {
    key: string;
    prompt: string;
    fieldKey?: string;
    sourceMessageId?: string;
    contextVersion?: number;
    askedAt?: Date;
  } | null;
  usefulHistory?: UsefulHistoryMessage[];
  audioMessage?: boolean;
  transcriptionAvailable?: boolean;
  transcriptionPersisted?: boolean;
  v1Comparison?: {
    selectedFlowId?: string | null;
    selectedIntent?: string | null;
    triageMode?: string | null;
    toolsExposed?: string[];
  };
};

export type RuntimeV2ShadowResult = {
  enabled: boolean;
  mode: RuntimeV2Mode;
  state: ConversationState | null;
  manifest: RuntimeV2ShadowManifest | null;
};

export type RuntimeV2ShadowMetrics = {
  started: number;
  completed: number;
  ignoredOff: number;
  ignoredAllowlist: number;
  duplicate: number;
  timeout: number;
  capacityExceeded: number;
  processingError: number;
  active: number;
};

export const DEFAULT_SHADOW_TIMEOUT_MS = 250;
export const DEFAULT_SHADOW_MAX_CONCURRENT = 16;
export const DEFAULT_SHADOW_STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sanitizeShadowErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^P\d{4}$/.test(code)) return `PRISMA_${code}`;
  }
  if (error instanceof Error && /^[A-Z][A-Z0-9_:-]{2,79}$/.test(error.message)) {
    return error.message;
  }
  return "SHADOW_PROCESSING_ERROR";
}

const MIN_SHADOW_TIMEOUT_MS = 25;
const MAX_SHADOW_TIMEOUT_MS = 5_000;
const MIN_SHADOW_MAX_CONCURRENT = 1;
const MAX_SHADOW_MAX_CONCURRENT = 64;
const MIN_SHADOW_STATE_TTL_MS = 60 * 60 * 1000;
const MAX_SHADOW_STATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

class ShadowTimeoutError extends Error {
  constructor() {
    super("SHADOW_TIMEOUT");
    this.name = "ShadowTimeoutError";
  }
}

function toStoreScope(scope: RuntimeV2Scope): ConversationStateStoreScope {
  return { ...scope, runtimeVersion: "V2", mode: "SHADOW" };
}

function emptyContext() {
  return {
    identityMemories: [],
    thematicMemories: [],
    officialFacts: [],
    knowledgeChunks: [],
    toolResults: [],
  };
}

function inferRelevantQuestionField(content: string): string | null {
  const normalized = content.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/(?:modelo|equipamento|notebook|computador)/.test(normalized)) return "device_model";
  if (/(?:interface|conexao|conexao|formato fisico)/.test(normalized)) return "component_interface";
  if (/(?:capacidade|quantidade de memoria|quantos gb)/.test(normalized)) return "component_capacity";
  if (/(?:endereco|localizacao|onde fica)/.test(normalized)) return "address";
  if (/(?:horario|funcionamento|aberto|fechado)/.test(normalized)) return "business_hours";
  if (/(?:preco|valor|quanto custa|orcamento)/.test(normalized)) return "price";
  return null;
}

export function isActionableAssistantQuestion(content: string): boolean {
  const normalized = content.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (!normalized.includes("?")) return false;
  if (/(?:preciso confirmar|como posso ajudar|o que posso fazer)/.test(normalized)) return false;
  return inferRelevantQuestionField(content) !== null;
}

export class RuntimeV2ShadowOrchestrator {
  private activeExecutions = 0;

  private readonly metrics: RuntimeV2ShadowMetrics = {
    started: 0,
    completed: 0,
    ignoredOff: 0,
    ignoredAllowlist: 0,
    duplicate: 0,
    timeout: 0,
    capacityExceeded: 0,
    processingError: 0,
    active: 0,
  };

  constructor(
    private readonly stateStore: ConversationStateStore = new InMemoryConversationStateStore(),
    private readonly environment: NodeJS.ProcessEnv = process.env,
    private readonly now: () => Date = () => new Date(),
  ) {}

  getMetrics(): RuntimeV2ShadowMetrics {
    return { ...this.metrics, active: this.activeExecutions };
  }

  async process(snapshot: RuntimeV2ShadowSnapshot): Promise<RuntimeV2ShadowResult> {
    const mode = resolveRuntimeV2Mode({}, this.environment);
    if (mode === "OFF") {
      this.metrics.ignoredOff += 1;
      return { enabled: false, mode, state: null, manifest: null };
    }
    if (!isRuntimeV2ShadowEnabled({ assistantId: snapshot.scope.assistantId }, this.environment)) {
      this.metrics.ignoredAllowlist += 1;
      return { enabled: false, mode, state: null, manifest: null };
    }

    const maxConcurrent = readBoundedEnvironmentInteger(
      this.environment.RUNTIME_V2_SHADOW_MAX_CONCURRENT,
      DEFAULT_SHADOW_MAX_CONCURRENT,
      MIN_SHADOW_MAX_CONCURRENT,
      MAX_SHADOW_MAX_CONCURRENT,
    );
    if (this.activeExecutions >= maxConcurrent) {
      this.metrics.capacityExceeded += 1;
      return this.buildErrorResult(snapshot, "SHADOW_CAPACITY_EXCEEDED", this.now().getTime());
    }

    const startedAt = this.now().getTime();
    const timeoutMs = readBoundedEnvironmentInteger(
      this.environment.RUNTIME_V2_SHADOW_TIMEOUT_MS,
      DEFAULT_SHADOW_TIMEOUT_MS,
      MIN_SHADOW_TIMEOUT_MS,
      MAX_SHADOW_TIMEOUT_MS,
    );
    const deadlineAt = startedAt + timeoutMs;
    this.activeExecutions += 1;
    this.metrics.active = this.activeExecutions;
    this.metrics.started += 1;
    try {
      const result = await this.withTimeout(
        this.processWithRetry(snapshot, startedAt, 0, deadlineAt),
        timeoutMs,
      );
      this.metrics.completed += 1;
      if (result.manifest?.messageAlreadyProcessed) this.metrics.duplicate += 1;
      return result;
    } catch (error) {
      const errorCode =
        error instanceof ShadowTimeoutError
          ? "SHADOW_TIMEOUT"
          : error instanceof MissingInternalMessageIdError
            ? "MISSING_INTERNAL_MESSAGE_ID"
            : error instanceof StaleContextError
              ? "STALE_CONTEXT"
              : error instanceof Error && error.message === "STATE_PAYLOAD_TOO_LARGE"
                ? "STATE_PAYLOAD_TOO_LARGE"
                : sanitizeShadowErrorCode(error);
      if (error instanceof ShadowTimeoutError) this.metrics.timeout += 1;
      else this.metrics.processingError += 1;
      return this.buildErrorResult(snapshot, errorCode, startedAt);
    } finally {
      this.activeExecutions = Math.max(0, this.activeExecutions - 1);
      this.metrics.active = this.activeExecutions;
    }
  }

  private async processWithRetry(
    snapshot: RuntimeV2ShadowSnapshot,
    startedAt: number,
    attempt: number,
    deadlineAt: number,
  ): Promise<RuntimeV2ShadowResult> {
    this.assertBeforeDeadline(deadlineAt);
    const now = this.now();
    const scope = toStoreScope(snapshot.scope);
    let state = await this.stateStore.load(scope);
    this.assertBeforeDeadline(deadlineAt);
    const messageAlreadyProcessedBeforeLoad = await this.stateStore.existsForMessage(
      scope,
      snapshot,
    );
    let persistenceResult: RuntimeV2ShadowManifest["persistenceResult"] = "UPDATED";
    state ??= createEmptyConversationState(snapshot.scope, now);
    state.expiresAt = new Date(
      now.getTime() +
        readBoundedEnvironmentInteger(
          this.environment.RUNTIME_V2_SHADOW_STATE_TTL_MS,
          DEFAULT_SHADOW_STATE_TTL_MS,
          MIN_SHADOW_STATE_TTL_MS,
          MAX_SHADOW_STATE_TTL_MS,
        ),
    );

    const snapshotQuestion = snapshot.lastRelevantQuestion;
    if (
      !state.lastRelevantQuestion &&
      snapshotQuestion?.contextVersion === snapshot.scope.contextVersion &&
      snapshotQuestion.askedAt instanceof Date &&
      snapshotQuestion.askedAt >= state.sessionStartedAt &&
      isActionableAssistantQuestion(snapshotQuestion.prompt)
    ) {
      const fieldKey = snapshotQuestion.fieldKey ?? inferRelevantQuestionField(snapshotQuestion.prompt);
      state = {
        ...state,
        lastRelevantQuestion: {
          key: snapshotQuestion.key,
          prompt: snapshotQuestion.prompt,
          ...(fieldKey ? { fieldKey } : {}),
          ...(snapshotQuestion.sourceMessageId
            ? { sourceMessageId: snapshotQuestion.sourceMessageId }
            : {}),
          contextVersion: snapshot.scope.contextVersion,
          askedAt: snapshotQuestion.askedAt,
        },
        lastRelevantQuestionMessageId: snapshotQuestion.sourceMessageId ?? null,
        lastRelevantQuestionContextVersion: snapshot.scope.contextVersion,
      };
    }

    const beforeState = state;
    let messageAlreadyProcessed = messageAlreadyProcessedBeforeLoad;
    const understanding = understandTurn({
      message: snapshot.currentMessage,
      messageId: snapshot.internalMessageId,
      contextVersion: snapshot.scope.contextVersion,
      now,
      lastRelevantQuestion:
        state.lastRelevantQuestion?.contextVersion === snapshot.scope.contextVersion
          ? state.lastRelevantQuestion
          : null,
      existingObjective: state.objective,
    });

    let nextState = state;
    if (!messageAlreadyProcessed && snapshot.source === "CUSTOMER") {
      nextState = applyTurnToConversationState(state, understanding, now);
      nextState = markMessageProcessed(nextState, snapshot, now);
      nextState.revision = state.revision + 1;
      nextState.expiresAt = new Date(
        now.getTime() +
          readBoundedEnvironmentInteger(
            this.environment.RUNTIME_V2_SHADOW_STATE_TTL_MS,
            DEFAULT_SHADOW_STATE_TTL_MS,
            MIN_SHADOW_STATE_TTL_MS,
            MAX_SHADOW_STATE_TTL_MS,
          ),
      );
      try {
        this.assertBeforeDeadline(deadlineAt);
        const persisted: ConversationStateSaveTurnResult = await this.stateStore.saveTurn(
          nextState,
          state.revision,
          {
            ...snapshot,
            receivedAt: now,
          },
        );
        nextState = persisted.state;
        messageAlreadyProcessed = persisted.messageAlreadyProcessed;
        persistenceResult = persisted.persistenceResult;
      } catch (error) {
        if (
          (error instanceof StateRevisionConflictError ||
            error instanceof StateAlreadyExistsError) &&
          attempt < 2
        ) {
          await this.waitBeforeRetry(attempt, deadlineAt);
          return this.processWithRetry(snapshot, startedAt, attempt + 1, deadlineAt);
        }
        throw error;
      }
    } else if (messageAlreadyProcessed) {
      persistenceResult = "DUPLICATE";
    } else {
      persistenceResult = "UPDATED";
    }

    const retrievalPlan = buildRetrievalPlan({ understanding, state: nextState });
    const responsePlan = buildResponsePlan({
      understanding,
      state: nextState,
      retrievedContext: emptyContext(),
    });
    const validation = validateResponse({
      answer: "",
      responsePlan,
      conversationState: nextState,
    });
    const manifest = buildRuntimeV2ShadowManifest({
      scope: snapshot.scope,
      mode: "SHADOW",
      correlationId: snapshot.correlationId,
      currentMessage: snapshot.currentMessage,
      beforeState,
      afterState: nextState,
      understanding,
      retrievalPlan,
      authorityCategoriesRequested: understanding.requestedInformationCategories,
      authorityCategoriesAvailable: responsePlan.claimsAllowed.map((claim) => claim.category),
      authorityCategoriesMissing: responsePlan.factsMissing,
      responsePlanAction: responsePlan.action,
      repeatedQuestionDetected: validation.repeatedQuestionDetected,
      validationResult: validation.result,
      persistenceResult,
      processingDurationMs: this.now().getTime() - startedAt,
      messageAlreadyProcessed,
      v1Comparison: snapshot.v1Comparison,
      audioMessage: snapshot.audioMessage,
      transcriptionAvailable: snapshot.transcriptionAvailable,
      transcriptionPersisted: snapshot.transcriptionPersisted,
      lastRelevantQuestionUpdated:
        beforeState.lastRelevantQuestion?.key !== nextState.lastRelevantQuestion?.key,
      lastRelevantQuestionUpdateReason: understanding.reasonCodes.includes("CUSTOMER_UNABLE_TO_ANSWER")
        ? "CUSTOMER_UNABLE_TO_ANSWER"
        : beforeState.lastRelevantQuestion?.key !== nextState.lastRelevantQuestion?.key
          ? "ASSISTANT_OBJECTIVE_QUESTION"
          : "UNCHANGED",
    });
    return { enabled: true, mode: "SHADOW", state: nextState, manifest };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ShadowTimeoutError()), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private assertBeforeDeadline(deadlineAt: number): void {
    if (this.now().getTime() >= deadlineAt) throw new ShadowTimeoutError();
  }

  private async waitBeforeRetry(attempt: number, deadlineAt: number): Promise<void> {
    const delayMs = Math.min(25, 5 * (attempt + 1) + Math.floor(Math.random() * 5));
    this.assertBeforeDeadline(deadlineAt - delayMs);
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    this.assertBeforeDeadline(deadlineAt);
  }

  private buildErrorResult(
    snapshot: RuntimeV2ShadowSnapshot,
    errorCode:
      | "SHADOW_TIMEOUT"
      | "SHADOW_CAPACITY_EXCEEDED"
      | "SHADOW_PROCESSING_ERROR"
      | "MISSING_INTERNAL_MESSAGE_ID"
      | "STALE_CONTEXT"
      | "STATE_PAYLOAD_TOO_LARGE"
      | string,
    startedAt: number,
  ): RuntimeV2ShadowResult {
    const fallbackState = createEmptyConversationState(snapshot.scope, this.now());
    const understanding = understandTurn({
      message: snapshot.currentMessage,
      messageId: snapshot.internalMessageId,
      contextVersion: snapshot.scope.contextVersion,
      now: this.now(),
      lastRelevantQuestion: null,
    });
    const retrievalPlan = buildRetrievalPlan({ understanding, state: fallbackState });
    const responsePlan = buildResponsePlan({
      understanding,
      state: fallbackState,
      retrievedContext: emptyContext(),
    });
    const manifest = buildRuntimeV2ShadowManifest({
      scope: snapshot.scope,
      mode: "SHADOW",
      correlationId: snapshot.correlationId,
      currentMessage: snapshot.currentMessage,
      beforeState: fallbackState,
      afterState: fallbackState,
      understanding,
      retrievalPlan,
      authorityCategoriesRequested: understanding.requestedInformationCategories,
      authorityCategoriesAvailable: responsePlan.claimsAllowed.map((claim) => claim.category),
      authorityCategoriesMissing: responsePlan.factsMissing,
      responsePlanAction: responsePlan.action,
      repeatedQuestionDetected: false,
      validationResult: "ERROR",
      persistenceResult: "ERROR",
      processingDurationMs: this.now().getTime() - startedAt,
      messageAlreadyProcessed: false,
      shadowErrorCode: errorCode,
      v1Comparison: snapshot.v1Comparison,
      audioMessage: snapshot.audioMessage,
      transcriptionAvailable: snapshot.transcriptionAvailable,
      transcriptionPersisted: snapshot.transcriptionPersisted,
    });
    return { enabled: true, mode: "SHADOW", state: null, manifest };
  }
}

function readBoundedEnvironmentInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}
