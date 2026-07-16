import { createHash } from "node:crypto";
import {
  createIdempotencyKey,
  hashActionArguments,
  validateActionConfirmation,
  type ActionConfirmation,
  type ActionErrorCode,
  type ActionJsonValue,
  type ActionType,
  type ToolExecutionRequest,
  type ToolExecutionResult,
} from "./action-contracts";
import {
  createRuntimeActionStateEvent,
  reduceRuntimeActionState,
  type ActionStateReason,
  type ActionStateScope,
  type PendingActionState,
  type RuntimeActionStateEvent,
} from "./action-state";
import {
  isRuntimeV2ShadowEnabled,
  resolveRuntimeV2ActionStateMode,
  resolveRuntimeV2Mode,
  resolveRuntimeV2SyntheticExecutionMode,
  type RuntimeV2SyntheticExecutionMode,
} from "./runtime-v2-feature-flag";
import { toolResultToEvidence, type ToolResultEvidenceDecision } from "./action-contracts";
import {
  StateRevisionConflictError,
  type ConversationStateStore,
  type ConversationStateStoreScope,
} from "./conversation-state-store";
import type { ConversationState } from "./runtime-v2.types";
import type { SourceEvidence } from "./evidence-contracts";

export const SYNTHETIC_EXECUTION_CONTRACT_VERSION = 1 as const;
export const SYNTHETIC_EXECUTION_SOURCE = "RUNTIME_V2_SYNTHETIC" as const;

export type SyntheticOutcome =
  "SUCCEEDED" | "FAILED" | "TIMED_OUT_UNKNOWN_EFFECT" | "DUPLICATE_SUPPRESSED";

export type SyntheticReconciliationOutcome = "SUCCEEDED" | "FAILED" | "UNKNOWN";

export type SyntheticExecutionFixture = {
  outcome?: SyntheticOutcome;
  resultCategory?: string;
  authorityCategories?: string[];
  validFrom?: string | null;
  validUntil?: string | null;
  resultMetadata?: Record<string, ActionJsonValue>;
  errorCode?: ActionErrorCode;
  reconciliationOutcome?: SyntheticReconciliationOutcome;
};

export type SyntheticExecutionContext = {
  fixture: SyntheticExecutionFixture;
  now: Date;
  attemptNumber: number;
};

export type SyntheticToolAdapter = {
  toolName: string;
  toolVersion: string;
  supportedActionTypes: ActionType[];
  supportedCategories: string[];
  effectType: ToolExecutionRequest["effectType"];
  execute: (
    request: ToolExecutionRequest,
    context: SyntheticExecutionContext,
  ) => ToolExecutionResult;
  reconcile?: (
    request: ToolExecutionRequest,
    previousResult: ToolExecutionResult,
    context: SyntheticExecutionContext,
  ) => ToolExecutionResult;
};

export type SyntheticExecutionManifest = {
  syntheticExecutionMode: RuntimeV2SyntheticExecutionMode;
  syntheticExecutionEligible: boolean;
  syntheticExecutionSource: typeof SYNTHETIC_EXECUTION_SOURCE | null;
  executionEnvironment: "SYNTHETIC";
  syntheticToolRegistered: boolean;
  syntheticExecutionId: string | null;
  syntheticAttemptNumber: number | null;
  syntheticQueueStatus: "NOT_QUEUED" | "QUEUED" | "DEQUEUED" | "REJECTED";
  syntheticExecutionStatus: ToolExecutionResult["status"] | null;
  syntheticExecutionStartedAt: string | null;
  syntheticExecutionCompletedAt: string | null;
  syntheticDurationMs: number | null;
  syntheticResultCategory: string | null;
  syntheticAuthorityCategories: string[];
  syntheticResultHash: string | null;
  syntheticExternalReferenceHash: string | null;
  syntheticExternalEffectMayHaveOccurred: boolean;
  syntheticRetryPolicy: ToolExecutionRequest["retryPolicy"] | null;
  syntheticRetryCount: number;
  syntheticReconciliationStatus: ToolExecutionResult["reconciliationStatus"] | null;
  syntheticEvidenceCreated: boolean;
  syntheticActionRevisionBefore: number | null;
  syntheticActionRevisionAfter: number | null;
  syntheticExecutionPersisted: boolean;
  syntheticExecutionRedactionApplied: true;
  realToolExecutionPerformed: false;
  externalNetworkCallPerformed: false;
  providerCalled: false;
  outboundSent: false;
  errorCode: string | null;
};

export type SyntheticExecutionResult = {
  state: ConversationState | null;
  request: ToolExecutionRequest | null;
  result: ToolExecutionResult | null;
  evidence: SourceEvidence | null;
  evidenceDecision: ToolResultEvidenceDecision | null;
  manifest: SyntheticExecutionManifest;
};

export type SyntheticExecutionInput = {
  scope: ActionStateScope;
  actionId: string;
  normalizedArguments: Record<string, ActionJsonValue>;
  confirmation?: ActionConfirmation | null;
  internalMessageId: string;
  currentTime?: Date;
  attemptNumber?: number;
  fixture?: SyntheticExecutionFixture;
};

export type SyntheticReconciliationInput = SyntheticExecutionInput & {
  executionId: string;
  previousResult: ToolExecutionResult;
};

export type SyntheticCancellationReason =
  "CUSTOMER_CANCELLED" | "RESET_OCCURRED" | "INTENT_CHANGED" | "HUMAN_TAKEOVER";

export class SyntheticExecutionError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "SyntheticExecutionError";
    this.code = code;
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashValue(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function createSyntheticExecutionId(input: {
  actionId: string;
  toolName: string;
  toolVersion: string;
  argumentsHash: string;
  attemptNumber: number;
  contextVersion: number;
}): string {
  return `synthetic_execution_${hashValue([
    SYNTHETIC_EXECUTION_CONTRACT_VERSION,
    input.actionId,
    input.toolName,
    input.toolVersion,
    input.argumentsHash,
    input.attemptNumber,
    input.contextVersion,
  ])}`;
}

function safeMetadata(
  metadata: Record<string, ActionJsonValue> | undefined,
): Record<string, ActionJsonValue> {
  const forbidden =
    /^(argument|payload|body|response|message|prompt|token|secret|credential|phone|email|url)$/i;
  const visit = (value: ActionJsonValue): ActionJsonValue | undefined => {
    if (typeof value === "string") return value.length <= 120 ? value : value.slice(0, 120);
    if (Array.isArray(value)) {
      return value.flatMap((item) => {
        const safe = visit(item);
        return safe === undefined ? [] : [safe];
      });
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).flatMap(([key, child]) => {
          if (forbidden.test(key)) return [];
          const safe = visit(child);
          return safe === undefined ? [] : [[key, safe]];
        }),
      );
    }
    return value;
  };
  return (visit(metadata ?? {}) as Record<string, ActionJsonValue>) ?? {};
}

function resultStatus(fixture: SyntheticExecutionFixture): ToolExecutionResult["status"] {
  return fixture.outcome ?? "SUCCEEDED";
}

function defaultValidity(now: Date): { validFrom: string; validUntil: string } {
  return {
    validFrom: now.toISOString(),
    validUntil: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
  };
}

function syntheticResult(input: {
  request: ToolExecutionRequest;
  context: SyntheticExecutionContext;
  resultCategory: string;
  authorityCategories: string[];
  defaultMetadata: Record<string, ActionJsonValue>;
}): ToolExecutionResult {
  const fixture = input.context.fixture;
  const status = resultStatus(fixture);
  const validity = defaultValidity(input.context.now);
  const resultMetadata = safeMetadata({
    executionEnvironment: "SYNTHETIC",
    ...input.defaultMetadata,
    ...(fixture.resultMetadata ?? {}),
  });
  const resultHash = hashValue({
    executionId: input.request.executionId,
    status,
    resultCategory: fixture.resultCategory ?? input.resultCategory,
    authorityCategories: fixture.authorityCategories ?? input.authorityCategories,
    resultMetadata,
  });
  const externalEffectMayHaveOccurred = status === "TIMED_OUT_UNKNOWN_EFFECT";
  return {
    contractVersion: 1,
    executionId: input.request.executionId,
    actionId: input.request.actionId,
    toolName: input.request.toolName,
    status,
    startedAt: input.context.now.toISOString(),
    completedAt: input.context.now.toISOString(),
    externalReferenceId:
      status === "SUCCEEDED" ? `synthetic-reference-${resultHash.slice(0, 24)}` : null,
    resultCategory: fixture.resultCategory ?? input.resultCategory,
    authorityCategories: [...(fixture.authorityCategories ?? input.authorityCategories)].sort(),
    validFrom: fixture.validFrom ?? validity.validFrom,
    validUntil: fixture.validUntil ?? validity.validUntil,
    resultHash,
    sanitizedResultMetadata: resultMetadata,
    externalEffectMayHaveOccurred,
    reconciliationStatus: externalEffectMayHaveOccurred ? "PENDING" : "NOT_REQUIRED",
    error:
      status === "FAILED" || status === "TIMED_OUT_UNKNOWN_EFFECT"
        ? {
            code:
              fixture.errorCode ??
              (status === "TIMED_OUT_UNKNOWN_EFFECT" ? "TOOL_TIMEOUT" : "TOOL_FAILED"),
            retryable: false,
          }
        : null,
    provenance: {
      source: "V2_SHADOW",
      sourceTool: input.request.toolName,
      sourceVersion: "SYNTHETIC_RUNTIME_V2",
      reasonCode: "SYNTHETIC_EXECUTION",
    },
    companyId: input.request.companyId,
    assistantId: input.request.assistantId,
    conversationId: input.request.conversationId,
    contextVersion: input.request.contextVersion,
  };
}

function adapterFor(input: {
  toolName: string;
  actionType: ActionType;
  effectType: ToolExecutionRequest["effectType"];
  category: string;
  resultCategory: string;
  requireConfirmation?: boolean;
}): SyntheticToolAdapter {
  return {
    toolName: input.toolName,
    toolVersion: "1",
    supportedActionTypes: [input.actionType],
    supportedCategories: [input.category],
    effectType: input.effectType,
    execute: (request, context) => {
      if (input.requireConfirmation && !request.confirmationProof) {
        throw new SyntheticExecutionError("SYNTHETIC_CONFIRMATION_REQUIRED");
      }
      return syntheticResult({
        request,
        context,
        resultCategory: input.resultCategory,
        authorityCategories: [input.category],
        defaultMetadata: { simulatedEffect: input.effectType !== "READ_ONLY_EXTERNAL" },
      });
    },
    reconcile: (request, previousResult, context) => {
      const outcome = context.fixture.reconciliationOutcome ?? "UNKNOWN";
      if (outcome === "UNKNOWN") return previousResult;
      return syntheticResult({
        request,
        context: {
          ...context,
          fixture: {
            ...context.fixture,
            outcome: outcome === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
          },
        },
        resultCategory: input.resultCategory,
        authorityCategories: [input.category],
        defaultMetadata: { simulatedReconciliation: true },
      });
    },
  };
}

export class SyntheticToolRegistry {
  private readonly adapters = new Map<string, SyntheticToolAdapter>();

  constructor(adapters: SyntheticToolAdapter[] = []) {
    adapters.forEach((adapter) => this.register(adapter));
  }

  register(adapter: SyntheticToolAdapter): void {
    if (!adapter.toolName.startsWith("synthetic.")) {
      throw new SyntheticExecutionError("SYNTHETIC_TOOL_NAME_INVALID");
    }
    if (this.adapters.has(adapter.toolName)) {
      throw new SyntheticExecutionError("SYNTHETIC_TOOL_ALREADY_REGISTERED");
    }
    this.adapters.set(adapter.toolName, adapter);
  }

  resolve(toolName: string, actionType: ActionType): SyntheticToolAdapter | null {
    const adapter = this.adapters.get(toolName);
    if (!adapter || !adapter.supportedActionTypes.includes(actionType)) return null;
    return adapter;
  }

  names(): string[] {
    return [...this.adapters.keys()].sort();
  }
}

export function createDefaultSyntheticToolRegistry(): SyntheticToolRegistry {
  return new SyntheticToolRegistry([
    adapterFor({
      toolName: "synthetic.availability",
      actionType: "READ_AVAILABILITY",
      effectType: "READ_ONLY_EXTERNAL",
      category: "AVAILABILITY",
      resultCategory: "AVAILABILITY_RESULT",
    }),
    adapterFor({
      toolName: "synthetic.booking",
      actionType: "CREATE_BOOKING",
      effectType: "REVERSIBLE_EXTERNAL_MUTATION",
      category: "BOOKING",
      resultCategory: "BOOKING_RESULT",
      requireConfirmation: true,
    }),
    adapterFor({
      toolName: "synthetic.webhook_read",
      actionType: "CUSTOM_WEBHOOK_READ",
      effectType: "READ_ONLY_EXTERNAL",
      category: "EXTERNAL_LOOKUP",
      resultCategory: "WEBHOOK_READ_RESULT",
    }),
    adapterFor({
      toolName: "synthetic.webhook_write",
      actionType: "CUSTOM_WEBHOOK_WRITE",
      effectType: "REVERSIBLE_EXTERNAL_MUTATION",
      category: "EXTERNAL_MUTATION",
      resultCategory: "WEBHOOK_WRITE_RESULT",
      requireConfirmation: true,
    }),
  ]);
}

function toolNameForAction(action: PendingActionState): string | null {
  switch (action.actionType) {
    case "READ_AVAILABILITY":
      return "synthetic.availability";
    case "CREATE_BOOKING":
      return "synthetic.booking";
    case "CUSTOM_WEBHOOK_READ":
      return "synthetic.webhook_read";
    case "CUSTOM_WEBHOOK_WRITE":
      return "synthetic.webhook_write";
    default:
      return null;
  }
}

function storeScope(scope: ActionStateScope): ConversationStateStoreScope {
  return { ...scope, runtimeVersion: "V2", mode: "SHADOW" };
}

function confirmationIsValid(
  confirmation: ActionConfirmation | null | undefined,
  action: PendingActionState,
  now: Date,
): boolean {
  if (!confirmation) return false;
  if (action.status !== "ACTION_CONFIRMED") return false;
  const validated = validateActionConfirmation({
    confirmation,
    action: { ...action, status: "AWAITING_CUSTOMER_CONFIRMATION" },
    currentTime: now,
  });
  return validated.valid;
}

function requiresConfirmation(action: PendingActionState): boolean {
  return action.confirmationPolicy !== "NONE";
}

function eventFor(
  action: PendingActionState,
  scope: ActionStateScope,
  eventType: RuntimeActionStateEvent["eventType"],
  nextStatus: RuntimeActionStateEvent["nextStatus"],
  input: SyntheticExecutionInput,
  reason: ActionStateReason,
  metadata: Record<string, ActionJsonValue> = {},
): RuntimeActionStateEvent {
  return createRuntimeActionStateEvent({
    scope,
    action,
    eventType,
    nextStatus,
    internalMessageId: input.internalMessageId,
    timestamp: (input.currentTime ?? new Date()).toISOString(),
    reason,
    metadata: { executionEnvironment: "SYNTHETIC", ...metadata },
  });
}

function manifest(input: Partial<SyntheticExecutionManifest> = {}): SyntheticExecutionManifest {
  return {
    syntheticExecutionMode: "OFF",
    syntheticExecutionEligible: false,
    syntheticExecutionSource: null,
    executionEnvironment: "SYNTHETIC",
    syntheticToolRegistered: false,
    syntheticExecutionId: null,
    syntheticAttemptNumber: null,
    syntheticQueueStatus: "NOT_QUEUED",
    syntheticExecutionStatus: null,
    syntheticExecutionStartedAt: null,
    syntheticExecutionCompletedAt: null,
    syntheticDurationMs: null,
    syntheticResultCategory: null,
    syntheticAuthorityCategories: [],
    syntheticResultHash: null,
    syntheticExternalReferenceHash: null,
    syntheticExternalEffectMayHaveOccurred: false,
    syntheticRetryPolicy: null,
    syntheticRetryCount: 0,
    syntheticReconciliationStatus: null,
    syntheticEvidenceCreated: false,
    syntheticActionRevisionBefore: null,
    syntheticActionRevisionAfter: null,
    syntheticExecutionPersisted: false,
    syntheticExecutionRedactionApplied: true,
    realToolExecutionPerformed: false,
    externalNetworkCallPerformed: false,
    providerCalled: false,
    outboundSent: false,
    errorCode: null,
    ...input,
  };
}

function errorResult(
  code: string,
  mode: RuntimeV2SyntheticExecutionMode,
): SyntheticExecutionResult {
  return {
    state: null,
    request: null,
    result: null,
    evidence: null,
    evidenceDecision: null,
    manifest: manifest({
      syntheticExecutionMode: mode,
      errorCode: code,
      syntheticQueueStatus: "REJECTED",
    }),
  };
}

function duplicateResult(input: {
  actionId: string;
  actionType: ActionType;
  argumentsHash: string;
  scope: ActionStateScope;
  currentTime: Date;
  attemptNumber: number;
  finalizedAt: string;
}): SyntheticExecutionResult {
  const toolName =
    toolNameForAction({ actionType: input.actionType } as PendingActionState) ??
    "synthetic.unknown";
  const executionId = createSyntheticExecutionId({
    actionId: input.actionId,
    toolName,
    toolVersion: "1",
    argumentsHash: input.argumentsHash,
    attemptNumber: input.attemptNumber,
    contextVersion: input.scope.contextVersion,
  });
  const result: ToolExecutionResult = {
    contractVersion: 1,
    executionId,
    actionId: input.actionId,
    toolName,
    status: "DUPLICATE_SUPPRESSED",
    startedAt: input.finalizedAt,
    completedAt: input.finalizedAt,
    externalReferenceId: null,
    resultCategory: "DUPLICATE_SUPPRESSED",
    authorityCategories: [],
    validFrom: input.finalizedAt,
    validUntil: null,
    resultHash: hashValue({ executionId, status: "DUPLICATE_SUPPRESSED" }),
    sanitizedResultMetadata: { executionEnvironment: "SYNTHETIC", duplicateSuppressed: true },
    externalEffectMayHaveOccurred: false,
    reconciliationStatus: "NOT_REQUIRED",
    error: null,
    provenance: {
      source: "V2_SHADOW",
      sourceTool: toolName,
      sourceVersion: "SYNTHETIC_RUNTIME_V2",
      reasonCode: "SYNTHETIC_DUPLICATE_SUPPRESSED",
    },
    companyId: input.scope.companyId,
    assistantId: input.scope.assistantId,
    conversationId: input.scope.conversationId,
    contextVersion: input.scope.contextVersion,
  };
  const decision = toolResultToEvidence({
    result,
    scope: input.scope,
    currentTime: input.currentTime,
  });
  return {
    state: null,
    request: null,
    result,
    evidence: null,
    evidenceDecision: decision,
    manifest: manifest({
      syntheticExecutionMode: "SYNTHETIC_ONLY",
      syntheticExecutionEligible: true,
      syntheticExecutionSource: SYNTHETIC_EXECUTION_SOURCE,
      syntheticToolRegistered: true,
      syntheticExecutionId: executionId,
      syntheticAttemptNumber: input.attemptNumber,
      syntheticQueueStatus: "REJECTED",
      syntheticExecutionStatus: "DUPLICATE_SUPPRESSED",
      syntheticExecutionStartedAt: input.finalizedAt,
      syntheticExecutionCompletedAt: input.finalizedAt,
      syntheticDurationMs: 0,
      syntheticResultCategory: result.resultCategory,
      syntheticResultHash: result.resultHash,
      syntheticRetryCount: input.attemptNumber - 1,
      syntheticReconciliationStatus: "NOT_REQUIRED",
      syntheticExecutionPersisted: false,
      errorCode: "SYNTHETIC_EXECUTION_DUPLICATE",
    }),
  };
}

export function isRuntimeV2SyntheticExecutionEnabled(
  scope: Pick<ActionStateScope, "assistantId">,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    resolveRuntimeV2Mode({}, environment) === "SHADOW" &&
    resolveRuntimeV2ActionStateMode(environment) === "SHADOW_STATE" &&
    resolveRuntimeV2SyntheticExecutionMode(environment) === "SYNTHETIC_ONLY" &&
    isRuntimeV2ShadowEnabled({ assistantId: scope.assistantId }, environment)
  );
}

export class RuntimeV2SyntheticExecutionOrchestrator {
  constructor(
    private readonly stateStore: ConversationStateStore,
    private readonly registry: SyntheticToolRegistry = createDefaultSyntheticToolRegistry(),
    private readonly environment: NodeJS.ProcessEnv = process.env,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: SyntheticExecutionInput): Promise<SyntheticExecutionResult> {
    const currentTime = input.currentTime ?? this.now();
    const mode = resolveRuntimeV2SyntheticExecutionMode(this.environment);
    if (!isRuntimeV2SyntheticExecutionEnabled(input.scope, this.environment)) {
      return errorResult(
        resolveRuntimeV2Mode({}, this.environment) !== "SHADOW"
          ? "SYNTHETIC_EXECUTION_DISABLED"
          : mode === "OFF"
            ? "SYNTHETIC_EXECUTION_DISABLED"
            : "SYNTHETIC_SCOPE_MISMATCH",
        mode,
      );
    }
    const state = await this.stateStore.load(storeScope(input.scope));
    if (!state?.actionState?.activeAction) {
      const terminal = state?.actionState?.recentTerminalActions.find(
        (item) => item.actionId === input.actionId,
      );
      if (terminal) {
        const argumentHash = hashActionArguments(input.normalizedArguments);
        if (argumentHash !== terminal.argumentsHash) {
          return errorResult("SYNTHETIC_ARGUMENTS_HASH_MISMATCH", mode);
        }
        return duplicateResult({
          actionId: terminal.actionId,
          actionType: terminal.actionType,
          argumentsHash: terminal.argumentsHash,
          scope: input.scope,
          currentTime,
          attemptNumber: input.attemptNumber ?? 1,
          finalizedAt: terminal.finalizedAt,
        });
      }
      return errorResult("SYNTHETIC_ACTION_NOT_FOUND", mode);
    }
    const action = state.actionState.activeAction;
    if (action.actionId !== input.actionId)
      return errorResult("SYNTHETIC_ACTION_ID_MISMATCH", mode);
    if (
      action.companyId !== input.scope.companyId ||
      action.assistantId !== input.scope.assistantId ||
      action.conversationId !== input.scope.conversationId ||
      action.contextVersion !== input.scope.contextVersion
    ) {
      return errorResult("SYNTHETIC_SCOPE_MISMATCH", mode);
    }
    if (currentTime.getTime() >= new Date(action.expiresAt).getTime()) {
      const expired = await this.transition(
        state,
        input,
        "ACTION_EXPIRED",
        "EXPIRED",
        "ACTION_EXPIRED",
      );
      return {
        ...errorResult("SYNTHETIC_ACTION_EXPIRED", mode),
        state: expired.state,
        manifest: manifest({
          syntheticExecutionMode: mode,
          syntheticExecutionSource: SYNTHETIC_EXECUTION_SOURCE,
          syntheticActionRevisionBefore: state.revision,
          syntheticActionRevisionAfter: expired.state.revision,
          syntheticExecutionPersisted: true,
        }),
      };
    }
    if (action.status === "RECONCILIATION_REQUIRED" || action.status === "EXECUTING") {
      return errorResult("SYNTHETIC_RECONCILIATION_REQUIRED", mode);
    }
    const executableWithoutConfirmation =
      action.status === "ACTION_PROPOSED" && !requiresConfirmation(action);
    const recoverQueuedExecution = action.status === "EXECUTION_QUEUED";
    if (
      action.status !== "ACTION_CONFIRMED" &&
      !executableWithoutConfirmation &&
      !recoverQueuedExecution
    ) {
      return errorResult(
        action.status === "ACTION_PROPOSED" ||
          action.status === "AWAITING_CUSTOMER_CONFIRMATION" ||
          action.status === "AWAITING_HUMAN_CONFIRMATION"
          ? "SYNTHETIC_CONFIRMATION_REQUIRED"
          : "SYNTHETIC_ACTION_TERMINAL",
        mode,
      );
    }
    const argumentHash = hashActionArguments(input.normalizedArguments);
    if (argumentHash !== action.argumentsHash)
      return errorResult("SYNTHETIC_ARGUMENTS_HASH_MISMATCH", mode);
    if (
      action.status === "ACTION_CONFIRMED" &&
      requiresConfirmation(action) &&
      !confirmationIsValid(input.confirmation, action, currentTime)
    ) {
      return errorResult("SYNTHETIC_CONFIRMATION_INVALID", mode);
    }
    const toolName = toolNameForAction(action);
    if (!toolName) return errorResult("SYNTHETIC_TOOL_NOT_REGISTERED", mode);
    const adapter = this.registry.resolve(toolName, action.actionType);
    if (!adapter) return errorResult("SYNTHETIC_TOOL_NOT_REGISTERED", mode);
    const attemptNumber = input.attemptNumber ?? 1;
    if (!Number.isInteger(attemptNumber) || attemptNumber < 1)
      return errorResult("SYNTHETIC_ATTEMPT_INVALID", mode);
    const executionId = createSyntheticExecutionId({
      actionId: action.actionId,
      toolName: adapter.toolName,
      toolVersion: adapter.toolVersion,
      argumentsHash: action.argumentsHash,
      attemptNumber,
      contextVersion: action.contextVersion,
    });
    const idempotencyKey = createIdempotencyKey({
      companyId: action.companyId,
      assistantId: action.assistantId,
      conversationId: action.conversationId,
      contextVersion: action.contextVersion,
      actionType: action.actionType,
      argumentsHash: action.argumentsHash,
    });
    const request: ToolExecutionRequest = {
      contractVersion: 1,
      executionId,
      actionId: action.actionId,
      toolName: adapter.toolName,
      toolVersion: adapter.toolVersion,
      effectType: adapter.effectType,
      companyId: action.companyId,
      assistantId: action.assistantId,
      conversationId: action.conversationId,
      contextVersion: action.contextVersion,
      idempotencyKey,
      arguments: input.normalizedArguments,
      argumentsHash: action.argumentsHash,
      requestedAt: currentTime.toISOString(),
      timeoutMs: 1,
      retryPolicy:
        action.effectType === "READ_ONLY_EXTERNAL" ? "SAFE_READ_RETRY" : "RECONCILE_BEFORE_RETRY",
      reconciliationPolicy:
        action.effectType === "READ_ONLY_EXTERNAL" ? "NONE" : "RECONCILE_AFTER_TIMEOUT",
      confirmationProof: input.confirmation
        ? {
            confirmationId: input.confirmation.confirmationId,
            actionId: input.confirmation.actionId,
            parametersHash: input.confirmation.parametersHash,
            contextVersion: input.confirmation.contextVersion,
            validatedAt: currentTime.toISOString(),
          }
        : null,
      scopeProof: { ...input.scope, valid: true, checkedAt: currentTime.toISOString() },
      provenance: {
        source: "V2_SHADOW",
        sourceTool: adapter.toolName,
        sourceVersion: "SYNTHETIC_RUNTIME_V2",
        reasonCode: "SYNTHETIC_EXECUTION",
      },
    };
    const queued = recoverQueuedExecution
      ? { state, event: null }
      : await this.transition(
          state,
          input,
          "EXECUTION_REQUESTED",
          "EXECUTION_QUEUED",
          "EXECUTION_QUEUED",
          { executionId, attemptNumber, confirmationPolicy: action.confirmationPolicy },
        );
    const executing = await this.transition(
      queued.state,
      input,
      "EXECUTION_STARTED",
      "EXECUTING",
      "EXECUTION_STARTED",
      { executionId, attemptNumber },
    );
    let result: ToolExecutionResult;
    try {
      result = adapter.execute(request, {
        fixture: input.fixture ?? {},
        now: currentTime,
        attemptNumber,
      });
    } catch (error) {
      result = this.failedResult(request, currentTime, error);
    }
    const finalEvent =
      result.status === "SUCCEEDED"
        ? {
            eventType: "EXECUTION_SUCCEEDED" as const,
            nextStatus: "SUCCEEDED" as const,
            reason: "EXECUTION_SUCCEEDED" as const,
          }
        : result.status === "TIMED_OUT_UNKNOWN_EFFECT"
          ? {
              eventType: "EXECUTION_TIMED_OUT" as const,
              nextStatus: "RECONCILIATION_REQUIRED" as const,
              reason: "EXECUTION_TIMED_OUT" as const,
            }
          : {
              eventType: "EXECUTION_FAILED" as const,
              nextStatus: "FAILED" as const,
              reason: "EXECUTION_FAILED" as const,
            };
    const completed = await this.transition(
      executing.state,
      input,
      finalEvent.eventType,
      finalEvent.nextStatus,
      finalEvent.reason,
      { executionId, attemptNumber, status: result.status },
    );
    const decision = toolResultToEvidence({ result, scope: input.scope, currentTime });
    return {
      state: completed.state,
      request,
      result,
      evidence: decision.evidence,
      evidenceDecision: decision,
      manifest: manifest({
        syntheticExecutionMode: mode,
        syntheticExecutionEligible: true,
        syntheticExecutionSource: SYNTHETIC_EXECUTION_SOURCE,
        syntheticToolRegistered: true,
        syntheticExecutionId: executionId,
        syntheticAttemptNumber: attemptNumber,
        syntheticQueueStatus: "DEQUEUED",
        syntheticExecutionStatus: result.status,
        syntheticExecutionStartedAt: result.startedAt,
        syntheticExecutionCompletedAt: result.completedAt,
        syntheticDurationMs:
          new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime(),
        syntheticResultCategory: result.resultCategory,
        syntheticAuthorityCategories: result.authorityCategories,
        syntheticResultHash: result.resultHash ?? null,
        syntheticExternalReferenceHash: result.externalReferenceId
          ? hashValue(result.externalReferenceId)
          : null,
        syntheticExternalEffectMayHaveOccurred: result.externalEffectMayHaveOccurred,
        syntheticRetryPolicy: request.retryPolicy,
        syntheticRetryCount: attemptNumber - 1,
        syntheticReconciliationStatus: result.reconciliationStatus,
        syntheticEvidenceCreated: Boolean(decision.evidence),
        syntheticActionRevisionBefore: state.revision,
        syntheticActionRevisionAfter: completed.state.revision,
        syntheticExecutionPersisted: true,
      }),
    };
  }

  async reconcile(input: SyntheticReconciliationInput): Promise<SyntheticExecutionResult> {
    const currentTime = input.currentTime ?? this.now();
    const mode = resolveRuntimeV2SyntheticExecutionMode(this.environment);
    if (!isRuntimeV2SyntheticExecutionEnabled(input.scope, this.environment))
      return errorResult("SYNTHETIC_EXECUTION_DISABLED", mode);
    const state = await this.stateStore.load(storeScope(input.scope));
    const action = state?.actionState?.activeAction;
    if (
      !state ||
      !action ||
      action.actionId !== input.actionId ||
      action.status !== "RECONCILIATION_REQUIRED"
    ) {
      return errorResult("SYNTHETIC_RECONCILIATION_REQUIRED", mode);
    }
    const adapter = this.registry.resolve(input.previousResult.toolName, action.actionType);
    if (!adapter?.reconcile) return errorResult("SYNTHETIC_TOOL_NOT_REGISTERED", mode);
    const request = this.rebuildRequest(action, input, input.executionId, currentTime, adapter);
    const started = await this.transition(
      state,
      input,
      "RECONCILIATION_STARTED",
      "RECONCILIATION_REQUIRED",
      "RECONCILIATION_STARTED",
      { executionId: input.executionId },
    );
    const result = adapter.reconcile(request, input.previousResult, {
      fixture: input.fixture ?? {},
      now: currentTime,
      attemptNumber: input.attemptNumber ?? 1,
    });
    if ((input.fixture?.reconciliationOutcome ?? "UNKNOWN") === "UNKNOWN") {
      const decision = toolResultToEvidence({ result, scope: input.scope, currentTime });
      return {
        state: started.state,
        request,
        result,
        evidence: null,
        evidenceDecision: decision,
        manifest: manifest({
          syntheticExecutionMode: mode,
          syntheticExecutionEligible: true,
          syntheticExecutionSource: SYNTHETIC_EXECUTION_SOURCE,
          syntheticToolRegistered: true,
          syntheticExecutionId: input.executionId,
          syntheticAttemptNumber: input.attemptNumber ?? 1,
          syntheticQueueStatus: "DEQUEUED",
          syntheticExecutionStatus: result.status,
          syntheticExecutionStartedAt: result.startedAt,
          syntheticExecutionCompletedAt: result.completedAt,
          syntheticResultCategory: result.resultCategory,
          syntheticAuthorityCategories: result.authorityCategories,
          syntheticResultHash: result.resultHash ?? null,
          syntheticExternalEffectMayHaveOccurred: true,
          syntheticReconciliationStatus: "PENDING",
          syntheticActionRevisionBefore: state.revision,
          syntheticActionRevisionAfter: started.state.revision,
          syntheticExecutionPersisted: true,
        }),
      };
    }
    const success = result.status === "SUCCEEDED";
    const reconciledResult = {
      ...result,
      reconciliationStatus: success ? ("SUCCEEDED" as const) : ("FAILED" as const),
    };
    const final = await this.transition(
      started.state,
      input,
      success ? "RECONCILIATION_SUCCEEDED" : "RECONCILIATION_FAILED",
      success ? "RECONCILED_SUCCEEDED" : "RECONCILED_FAILED",
      success ? "RECONCILIATION_SUCCEEDED" : "RECONCILIATION_FAILED",
      { executionId: input.executionId },
    );
    const decision = toolResultToEvidence({
      result: reconciledResult,
      scope: input.scope,
      currentTime,
    });
    return {
      state: final.state,
      request,
      result: reconciledResult,
      evidence: decision.evidence,
      evidenceDecision: decision,
      manifest: manifest({
        syntheticExecutionMode: mode,
        syntheticExecutionEligible: true,
        syntheticExecutionSource: SYNTHETIC_EXECUTION_SOURCE,
        syntheticToolRegistered: true,
        syntheticExecutionId: input.executionId,
        syntheticAttemptNumber: input.attemptNumber ?? 1,
        syntheticQueueStatus: "DEQUEUED",
        syntheticExecutionStatus: reconciledResult.status,
        syntheticExecutionStartedAt: reconciledResult.startedAt,
        syntheticExecutionCompletedAt: reconciledResult.completedAt,
        syntheticResultCategory: reconciledResult.resultCategory,
        syntheticAuthorityCategories: reconciledResult.authorityCategories,
        syntheticResultHash: reconciledResult.resultHash ?? null,
        syntheticExternalReferenceHash: reconciledResult.externalReferenceId
          ? hashValue(reconciledResult.externalReferenceId)
          : null,
        syntheticExternalEffectMayHaveOccurred: reconciledResult.externalEffectMayHaveOccurred,
        syntheticReconciliationStatus: reconciledResult.reconciliationStatus,
        syntheticEvidenceCreated: Boolean(decision.evidence),
        syntheticActionRevisionBefore: state.revision,
        syntheticActionRevisionAfter: final.state.revision,
        syntheticExecutionPersisted: true,
      }),
    };
  }

  async cancel(
    input: SyntheticExecutionInput,
    reason: SyntheticCancellationReason = "CUSTOMER_CANCELLED",
  ): Promise<SyntheticExecutionResult> {
    const mode = resolveRuntimeV2SyntheticExecutionMode(this.environment);
    if (!isRuntimeV2SyntheticExecutionEnabled(input.scope, this.environment)) {
      return errorResult("SYNTHETIC_EXECUTION_DISABLED", mode);
    }
    const state = await this.stateStore.load(storeScope(input.scope));
    const action = state?.actionState?.activeAction;
    if (!state || !action || action.actionId !== input.actionId) {
      return errorResult("SYNTHETIC_ACTION_NOT_FOUND", mode);
    }
    if (action.executionState.executionStarted) {
      return errorResult("SYNTHETIC_CANCEL_DURING_EXECUTION", mode);
    }
    const eventType =
      reason === "RESET_OCCURRED"
        ? "ACTION_INVALIDATED_BY_RESET"
        : reason === "INTENT_CHANGED" || reason === "HUMAN_TAKEOVER"
          ? "ACTION_INVALIDATED_BY_INTENT_CHANGE"
          : "ACTION_CANCELLED";
    const cancelled = await this.transition(state, input, eventType, "CANCELLED", reason, {
      cancellation: true,
    });
    return {
      state: cancelled.state,
      request: null,
      result: null,
      evidence: null,
      evidenceDecision: null,
      manifest: manifest({
        syntheticExecutionMode: mode,
        syntheticExecutionEligible: true,
        syntheticExecutionSource: SYNTHETIC_EXECUTION_SOURCE,
        syntheticQueueStatus: "REJECTED",
        syntheticExecutionStatus: "CANCELLED",
        syntheticActionRevisionBefore: state.revision,
        syntheticActionRevisionAfter: cancelled.state.revision,
        syntheticExecutionPersisted: true,
      }),
    };
  }

  private rebuildRequest(
    action: PendingActionState,
    input: SyntheticExecutionInput,
    executionId: string,
    currentTime: Date,
    adapter: SyntheticToolAdapter,
  ): ToolExecutionRequest {
    const argumentsHash = hashActionArguments(input.normalizedArguments);
    if (argumentsHash !== action.argumentsHash)
      throw new SyntheticExecutionError("SYNTHETIC_ARGUMENTS_HASH_MISMATCH");
    return {
      contractVersion: 1,
      executionId,
      actionId: action.actionId,
      toolName: adapter.toolName,
      toolVersion: adapter.toolVersion,
      effectType: adapter.effectType,
      companyId: action.companyId,
      assistantId: action.assistantId,
      conversationId: action.conversationId,
      contextVersion: action.contextVersion,
      idempotencyKey: createIdempotencyKey({
        companyId: action.companyId,
        assistantId: action.assistantId,
        conversationId: action.conversationId,
        contextVersion: action.contextVersion,
        actionType: action.actionType,
        argumentsHash: action.argumentsHash,
      }),
      arguments: input.normalizedArguments,
      argumentsHash,
      requestedAt: currentTime.toISOString(),
      timeoutMs: 1,
      retryPolicy: "RECONCILE_BEFORE_RETRY",
      reconciliationPolicy: "RECONCILE_AFTER_TIMEOUT",
      confirmationProof: input.confirmation
        ? {
            confirmationId: input.confirmation.confirmationId,
            actionId: input.confirmation.actionId,
            parametersHash: input.confirmation.parametersHash,
            contextVersion: input.confirmation.contextVersion,
            validatedAt: currentTime.toISOString(),
          }
        : null,
      scopeProof: { ...input.scope, valid: true, checkedAt: currentTime.toISOString() },
      provenance: {
        source: "V2_SHADOW",
        sourceTool: adapter.toolName,
        sourceVersion: "SYNTHETIC_RUNTIME_V2",
        reasonCode: "SYNTHETIC_RECONCILIATION",
      },
    };
  }

  private failedResult(
    request: ToolExecutionRequest,
    now: Date,
    error: unknown,
  ): ToolExecutionResult {
    const code =
      error instanceof SyntheticExecutionError ? error.code : "SYNTHETIC_RESULT_MAPPING_FAILED";
    return {
      contractVersion: 1,
      executionId: request.executionId,
      actionId: request.actionId,
      toolName: request.toolName,
      status: "FAILED",
      startedAt: now.toISOString(),
      completedAt: now.toISOString(),
      externalReferenceId: null,
      resultCategory: "UNKNOWN",
      authorityCategories: [],
      validFrom: now.toISOString(),
      validUntil: null,
      resultHash: hashValue({ executionId: request.executionId, code }),
      sanitizedResultMetadata: { executionEnvironment: "SYNTHETIC" },
      externalEffectMayHaveOccurred: false,
      reconciliationStatus: "NOT_REQUIRED",
      error: { code: code as ActionErrorCode, retryable: false },
      provenance: {
        source: "V2_SHADOW",
        sourceTool: request.toolName,
        sourceVersion: "SYNTHETIC_RUNTIME_V2",
        reasonCode: "SYNTHETIC_FAILURE",
      },
      companyId: request.companyId,
      assistantId: request.assistantId,
      conversationId: request.conversationId,
      contextVersion: request.contextVersion,
    };
  }

  private async transition(
    state: ConversationState,
    input: SyntheticExecutionInput,
    eventType: RuntimeActionStateEvent["eventType"],
    nextStatus: RuntimeActionStateEvent["nextStatus"],
    reason: ActionStateReason,
    metadata: Record<string, ActionJsonValue> = {},
  ): Promise<{ state: ConversationState; event: RuntimeActionStateEvent }> {
    if (!state.actionState?.activeAction)
      throw new SyntheticExecutionError("SYNTHETIC_ACTION_NOT_FOUND");
    const event = eventFor(
      state.actionState.activeAction,
      input.scope,
      eventType,
      nextStatus,
      input,
      reason,
      metadata,
    );
    const nextActionState = reduceRuntimeActionState(state.actionState, event, {
      scope: input.scope,
      currentTime: input.currentTime ?? this.now(),
    });
    const nextState = {
      ...state,
      actionState: nextActionState,
      revision: state.revision + 1,
      updatedAt: input.currentTime ?? this.now(),
    };
    try {
      const saved = await this.stateStore.save(nextState, state.revision);
      return { state: saved, event };
    } catch (error) {
      if (error instanceof StateRevisionConflictError) {
        throw new SyntheticExecutionError("SYNTHETIC_REVISION_CONFLICT");
      }
      throw error;
    }
  }
}

export function syntheticToolNameForActionType(actionType: ActionType): string | null {
  return toolNameForAction({ actionType } as PendingActionState);
}
