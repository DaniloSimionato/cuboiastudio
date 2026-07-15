import {
  applyTurnToConversationState,
  createEmptyConversationState,
  markMessageProcessed,
} from "./conversation-state";
import {
  isRuntimeV2ShadowEnabled,
  resolveRuntimeV2Mode,
  resolveRuntimeV2EvidenceMode,
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
import { type OfficialStructuredEvidenceReader } from "./official-structured-evidence.adapter";
import { type RagEvidenceAdapter, type RagRetrievalObservation } from "./rag-evidence.adapter";
import {
  type MemoryEvidenceAdapter,
  type MemoryRetrievalObservation,
} from "./memory-evidence.adapter";
import { DEFAULT_EVIDENCE_POLICIES } from "./authority-evidence-policy";
import { resolveAuthority } from "./authority-evidence-resolver";
import { buildEvidenceManifestExtension } from "./evidence-manifest";
import {
  buildCombinedEvidenceManifest,
  buildCustomerEvidence,
  buildSessionEvidenceDetails,
  combineEvidence,
  deriveRequestedEvidenceCategories,
} from "./combined-evidence";
import { type SourceEvidence } from "./evidence-contracts";
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
  v1TriageSignal?: {
    customerUnableToAnswer?: boolean;
    triageExitReason?: string | null;
    requestedDetailKey?: string | null;
    conversationalOutcome?: string | null;
  };
  ragObservation?: RagRetrievalObservation | null;
  memoryObservation?: MemoryRetrievalObservation | null;
  customerEvidenceFields?: string[];
  customerEvidence?: SourceEvidence[];
  sessionEvidence?: SourceEvidence[];
  requestedCategoryDerivation?: Record<string, string>;
  memoryNotExecutedReason?: import("./memory-evidence.adapter").MemoryNotExecutedReason;
  v1Comparison?: {
    selectedFlowId?: string | null;
    selectedIntent?: string | null;
    triageMode?: string | null;
    toolsExposed?: string[];
    customerUnableToAnswer?: boolean;
    triageExitReason?: string | null;
    conversationalOutcome?: string | null;
    flowSelectionReason?: string | null;
    flowCandidateCount?: number;
    intentChangedFromPreviousTurn?: boolean;
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
  const normalized = content
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (/(?:modelo|equipamento|notebook|computador)/.test(normalized)) return "device_model";
  if (/(?:interface|conexao|conexao|formato fisico)/.test(normalized)) return "component_interface";
  if (/(?:capacidade|quantidade de memoria|quantos gb)/.test(normalized))
    return "component_capacity";
  if (/(?:endereco|localizacao|onde fica)/.test(normalized)) return "address";
  if (/(?:horario|funcionamento|aberto|fechado)/.test(normalized)) return "business_hours";
  if (/(?:preco|valor|quanto custa|orcamento)/.test(normalized)) return "price";
  return null;
}

export function isActionableAssistantQuestion(content: string): boolean {
  const normalized = content
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
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
    private readonly officialEvidenceAdapter?: OfficialStructuredEvidenceReader,
    private readonly ragEvidenceAdapter?: RagEvidenceAdapter,
    private readonly memoryEvidenceAdapter?: MemoryEvidenceAdapter,
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

    const stateBeforeQuestionSync = state;
    const snapshotQuestion = snapshot.lastRelevantQuestion;
    const v1TriageSignal = snapshot.v1TriageSignal;
    const staleQuestionRemoved = Boolean(
      v1TriageSignal?.customerUnableToAnswer && state.lastRelevantQuestion,
    );
    if (staleQuestionRemoved) {
      state = {
        ...state,
        lastRelevantQuestion: null,
        lastRelevantQuestionMessageId: null,
        lastRelevantQuestionContextVersion: null,
      };
    }
    if (
      !staleQuestionRemoved &&
      !state.lastRelevantQuestion &&
      snapshotQuestion?.contextVersion === snapshot.scope.contextVersion &&
      snapshotQuestion.askedAt instanceof Date &&
      snapshotQuestion.askedAt >= state.sessionStartedAt &&
      isActionableAssistantQuestion(snapshotQuestion.prompt)
    ) {
      const fieldKey =
        snapshotQuestion.fieldKey ?? inferRelevantQuestionField(snapshotQuestion.prompt);
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

    const beforeState = stateBeforeQuestionSync;
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
    const evidenceManifest = await this.resolveEvidence({
      snapshot,
      retrievalPlan,
      requestedCategoryDerivation: understanding.requestedCategoryDerivation,
      state: nextState,
      now,
    });
    let responsePlan = buildResponsePlan({
      understanding,
      state: nextState,
      retrievedContext: emptyContext(),
    });
    if (evidenceManifest.evidenceMode === "SHADOW_METADATA") {
      responsePlan = {
        ...responsePlan,
        evidenceMetadata: {
          authorizedCategories: evidenceManifest.authorizedCategories ?? [],
          contextualOnlyCategories: evidenceManifest.contextualOnlyCategories ?? [],
          unavailableCategories: evidenceManifest.unavailableCategories ?? [],
          conflictCategories: evidenceManifest.conflictCategories,
          winningSourceTypes: evidenceManifest.winningSourceTypes ?? [],
        },
      };
    }
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
      authorityCategoriesAvailable:
        evidenceManifest.evidenceMode === "SHADOW_METADATA"
          ? evidenceManifest.authorizedCategories
          : responsePlan.claimsAllowed.map((claim) => claim.category),
      authorityCategoriesMissing:
        evidenceManifest.evidenceMode === "SHADOW_METADATA"
          ? evidenceManifest.unavailableCategories
          : responsePlan.factsMissing,
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
      lastRelevantQuestionCleared:
        Boolean(staleQuestionRemoved) ||
        understanding.reasonCodes.includes("CUSTOMER_UNABLE_TO_ANSWER"),
      staleQuestionRemoved,
      lastRelevantQuestionUpdateReason:
        staleQuestionRemoved || understanding.reasonCodes.includes("CUSTOMER_UNABLE_TO_ANSWER")
          ? "CUSTOMER_UNABLE_TO_ANSWER"
          : beforeState.lastRelevantQuestion?.key !== nextState.lastRelevantQuestion?.key
            ? "ASSISTANT_OBJECTIVE_QUESTION"
            : "UNCHANGED",
      evidence: evidenceManifest,
    });
    return { enabled: true, mode: "SHADOW", state: nextState, manifest };
  }

  private async resolveEvidence(input: {
    snapshot: RuntimeV2ShadowSnapshot;
    retrievalPlan: ReturnType<typeof buildRetrievalPlan>;
    requestedCategoryDerivation?: Record<string, string>;
    state: ConversationState;
    now: Date;
  }) {
    const evidenceMode = resolveRuntimeV2EvidenceMode({}, this.environment);
    const requestedCategories = deriveRequestedEvidenceCategories({
      requestedCategories: [
        ...input.retrievalPlan.officialFactCategories,
        ...input.retrievalPlan.knowledgeQueries,
      ],
      includeContactIdentity: input.retrievalPlan.includeContactIdentity,
    });
    const skipped = buildEvidenceManifestExtension({
      evidenceMode,
      requestedCategories,
      decisions: requestedCategories.map((category) =>
        resolveAuthority({
          requestedCategory: category,
          candidates: [],
          scope: input.snapshot.scope,
          policy: DEFAULT_EVIDENCE_POLICIES[category],
          currentTime: input.now,
        }),
      ),
      evidence: [],
      adapterStatus: "SKIPPED",
      adapterDurationMs: 0,
      requestedCategoryDerivation: input.requestedCategoryDerivation,
    });
    if (evidenceMode !== "SHADOW_METADATA") return skipped;

    const officialResult = this.officialEvidenceAdapter
      ? await this.officialEvidenceAdapter
          .read({
            companyId: input.snapshot.scope.companyId,
            assistantId: input.snapshot.scope.assistantId,
            requestedCategories,
            currentTime: input.now,
          })
          .catch(() => ({
            evidence: [],
            missingCategories: [...requestedCategories],
            failures: ["OFFICIAL_EVIDENCE_ADAPTER_ERROR"],
            scopeValidationFailures: [],
            adapterStatus: "FAILED" as const,
            emptyReason: "SCOPE_REJECTED" as const,
            durationMs: 0,
          }))
      : {
          evidence: [],
          missingCategories: [],
          failures: [],
          scopeValidationFailures: [],
          adapterStatus: "SKIPPED" as const,
          emptyReason: "NO_REQUESTED_CATEGORY" as const,
          durationMs: 0,
        };
    let ragAdapterFailed = false;
    const ragResult = this.ragEvidenceAdapter
      ? (() => {
          try {
            return this.ragEvidenceAdapter!.read({
              scope: input.snapshot.scope,
              requestedCategories,
              observation: input.snapshot.ragObservation,
              currentTime: input.now,
            });
          } catch {
            ragAdapterFailed = true;
            return null;
          }
        })()
      : null;
    let memoryAdapterFailed = false;
    const memoryResult = this.memoryEvidenceAdapter
      ? (() => {
          try {
            return this.memoryEvidenceAdapter!.read({
              scope: {
                ...input.snapshot.scope,
                contactId: input.snapshot.scope.contactId,
              },
              requestedCategories,
              observation: input.snapshot.memoryObservation,
              currentTime: input.now,
            });
          } catch {
            memoryAdapterFailed = true;
            return null;
          }
        })()
      : null;
    const customerEvidence =
      input.snapshot.customerEvidence ??
      buildCustomerEvidence({
        scope: input.snapshot.scope,
        internalMessageId: input.snapshot.internalMessageId,
        observedAt: input.now,
        fieldKeys: input.snapshot.customerEvidenceFields ?? [],
        requestedCategories,
      });
    const sessionDetails = input.snapshot.sessionEvidence
      ? {
          evidence: input.snapshot.sessionEvidence,
          rawCandidateCount: input.snapshot.sessionEvidence.length,
          deduplicatedCount: input.snapshot.sessionEvidence.length,
          duplicateRejectedCount: 0,
        }
      : buildSessionEvidenceDetails({
          scope: input.snapshot.scope,
          state: input.state,
        });
    const sessionEvidence = sessionDetails.evidence;
    const allRawEvidence = [
      ...officialResult.evidence,
      ...(ragResult?.evidence ?? []),
      ...(memoryResult?.evidence ?? []),
      ...customerEvidence,
      ...sessionEvidence,
    ];
    let combined;
    try {
      combined = combineEvidence({
        scope: input.snapshot.scope,
        requestedCategories,
        officialEvidence: officialResult.evidence,
        ragEvidence: ragResult?.evidence,
        memoryEvidence: memoryResult?.evidence,
        customerEvidence,
        sessionEvidence,
        currentTime: input.now,
        adapterStatuses: {
          official: officialResult.adapterStatus,
          rag: ragResult?.adapterStatus ?? (ragAdapterFailed ? "FAILED" : "NOT_EXECUTED"),
          memory: memoryResult?.adapterStatus ?? (memoryAdapterFailed ? "FAILED" : "NOT_EXECUTED"),
          customer: customerEvidence.length ? "COMPLETED" : "EMPTY",
          session: sessionEvidence.length ? "COMPLETED" : "EMPTY",
        },
        adapterExecutionOrder: ["official", "rag", "memory", "customer", "session"],
      });
    } catch {
      return buildEvidenceManifestExtension({
        evidenceMode,
        requestedCategories,
        decisions: requestedCategories.map((category) =>
          resolveAuthority({
            requestedCategory: category,
            candidates: [],
            scope: input.snapshot.scope,
            policy: DEFAULT_EVIDENCE_POLICIES[category],
            currentTime: input.now,
          }),
        ),
        evidence: [],
        adapterStatus: "FAILED",
        adapterDurationMs: 0,
        evidencePipelineError: "EVIDENCE_PIPELINE_ERROR",
      });
    }
    const combinedMetadata = buildCombinedEvidenceManifest(
      combined,
      allRawEvidence.length + sessionDetails.duplicateRejectedCount,
      sessionDetails,
    );
    const extension = buildEvidenceManifestExtension({
      evidenceMode,
      requestedCategories,
      decisions: combined.decisions,
      evidence: combined.evidence,
      officialEvidence: officialResult.evidence,
      adapterStatus: officialResult.adapterStatus,
      adapterDurationMs: officialResult.durationMs,
      scopeValidationFailures: [
        ...(officialResult.scopeValidationFailures ?? []),
        ...(ragResult?.scopeValidationFailures ?? []),
        ...(memoryResult?.scopeValidationFailures ?? []),
        ...combined.scopeValidationFailures,
      ],
      combined: combinedMetadata,
      requestedCategoryDerivation: input.requestedCategoryDerivation,
      officialAdapterEmptyReason: officialResult.emptyReason,
      memory: memoryResult?.manifest
        ? {
            ...memoryResult.manifest,
            memoryNotExecutedReason:
              memoryResult.manifest.memoryNotExecutedReason ??
              input.snapshot.memoryNotExecutedReason ??
              null,
          }
        : undefined,
      rag: ragResult?.manifest
        ? {
            ...ragResult.manifest,
            ragConflictDetected: combined.decisions.some((item) => item.conflictDetected),
          }
        : undefined,
    });
    return {
      ...extension,
      missingCategories: [
        ...new Set([
          ...extension.missingCategories,
          ...officialResult.missingCategories,
          ...(ragResult?.missingCategories ?? []),
          ...(memoryResult?.missingCategories ?? []),
          ...combined.missingCategories,
        ]),
      ].sort(),
      scopeValidationFailures: [
        ...new Set([
          ...(officialResult.scopeValidationFailures ?? []),
          ...(ragResult?.scopeValidationFailures ?? []),
          ...(memoryResult?.scopeValidationFailures ?? []),
          ...combined.scopeValidationFailures,
        ]),
      ],
      rag: ragResult?.manifest
        ? {
            ...ragResult.manifest,
            ragConflictDetected: combined.decisions.some((item) => item.conflictDetected),
          }
        : extension.rag,
      memory: memoryResult?.manifest
        ? {
            ...memoryResult.manifest,
            memoryNotExecutedReason:
              memoryResult.manifest.memoryNotExecutedReason ??
              input.snapshot.memoryNotExecutedReason ??
              null,
          }
        : extension.memory,
    };
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
