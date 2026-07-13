import {
  applyTurnToConversationState,
  createEmptyConversationState,
  isMessageAlreadyProcessed,
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
        error instanceof ShadowTimeoutError ? "SHADOW_TIMEOUT" : "SHADOW_PROCESSING_ERROR";
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
    if (!state) {
      state = createEmptyConversationState(snapshot.scope, now);
      state.expiresAt = new Date(
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
        state = await this.stateStore.create(state);
        persistenceResult = "CREATED";
      } catch (error) {
        if (error instanceof StateAlreadyExistsError && attempt < 1) {
          return this.processWithRetry(snapshot, startedAt, attempt + 1, deadlineAt);
        }
        throw error;
      }
    }

    if (!state.lastRelevantQuestion && snapshot.lastRelevantQuestion) {
      state = { ...state, lastRelevantQuestion: snapshot.lastRelevantQuestion };
    }

    const beforeState = state;
    const messageAlreadyProcessed =
      messageAlreadyProcessedBeforeLoad || isMessageAlreadyProcessed(state, snapshot);
    const understanding = understandTurn({
      message: snapshot.currentMessage,
      messageId: snapshot.internalMessageId,
      lastRelevantQuestion: state.lastRelevantQuestion ?? snapshot.lastRelevantQuestion ?? null,
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
        nextState = await this.stateStore.save(nextState, state.revision);
      } catch (error) {
        if (error instanceof StateRevisionConflictError && attempt < 1) {
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
    if (this.now().getTime() > deadlineAt) throw new ShadowTimeoutError();
  }

  private buildErrorResult(
    snapshot: RuntimeV2ShadowSnapshot,
    errorCode: "SHADOW_TIMEOUT" | "SHADOW_CAPACITY_EXCEEDED" | "SHADOW_PROCESSING_ERROR",
    startedAt: number,
  ): RuntimeV2ShadowResult {
    const fallbackState = createEmptyConversationState(snapshot.scope, this.now());
    const understanding = understandTurn({
      message: snapshot.currentMessage,
      messageId: snapshot.internalMessageId,
      lastRelevantQuestion: snapshot.lastRelevantQuestion ?? null,
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
