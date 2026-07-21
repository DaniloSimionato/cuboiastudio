import { createEmptyConversationState, serializeConversationState } from "./conversation-state";
import {
  MAX_STATE_JSON_BYTES,
  StateAlreadyExistsError,
  StateRevisionConflictError,
  type ConversationStateStore,
  type ConversationStateStoreScope,
} from "./conversation-state-store";
import type {
  ResponseExecutionRecord,
  ResponseExecutionScope,
  ResponseExecutionStore,
} from "./response-execution-coordinator";
import { responseExecutionRearmBlocker } from "./response-execution-coordinator";
import type { RuntimeV2ResponseExecutionApproval } from "./response-execution-approval";
import type { ConversationState, JsonValue } from "./runtime-v2.types";

type StateWithResponseExecution = ConversationState & {
  responseExecution?: JsonValue;
};

export type ResponseExecutionSnapshot = {
  current: ResponseExecutionRecord | null;
  history: ResponseExecutionRecord[];
  /** First attempt represented by history; permits compacting terminal audit entries. */
  historyStartAttemptNumber: number;
  invalid: boolean;
};

function scopeFor(input: ResponseExecutionScope): ConversationStateStoreScope {
  return {
    companyId: input.companyId,
    assistantId: input.assistantId,
    conversationId: input.conversationId,
    contextVersion: input.contextVersion ?? 1,
    runtimeVersion: "V2",
    mode: "SHADOW",
  };
}

function isRecord(value: unknown): value is ResponseExecutionRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<ResponseExecutionRecord>;
  return (
    Boolean(record.approval && typeof record.approval === "object") &&
    typeof record.owner === "string" &&
    record.redactionApplied === true
  );
}

function normalizeLegacyRecord(record: ResponseExecutionRecord): ResponseExecutionRecord {
  return {
    ...record,
    approval: {
      ...record.approval,
      approvalSource: record.approval.approvalSource ?? "MANUAL",
    },
    executionId: record.executionId || record.approval.approvalId,
    attemptNumber:
      Number.isInteger(record.attemptNumber) && record.attemptNumber > 0 ? record.attemptNumber : 1,
  };
}

/** Reads both the legacy single-record format and the current/history envelope. */
export function responseExecutionSnapshotFromState(
  state: ConversationState,
): ResponseExecutionSnapshot {
  const candidate = (state as StateWithResponseExecution).responseExecution;
  if (candidate === undefined || candidate === null) {
    return { current: null, history: [], historyStartAttemptNumber: 1, invalid: false };
  }
  if (isRecord(candidate)) {
    const current = normalizeLegacyRecord(candidate);
    return {
      current: {
        ...current,
        revision: state.revision,
        contextVersion: state.contextVersion,
      },
      history: [],
      historyStartAttemptNumber: current.attemptNumber,
      invalid: false,
    };
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { current: null, history: [], historyStartAttemptNumber: 1, invalid: true };
  }
  const envelope = candidate as {
    current?: unknown;
    history?: unknown;
    historyStartAttemptNumber?: unknown;
  };
  if (
    !isRecord(envelope.current) ||
    !Array.isArray(envelope.history) ||
    !envelope.history.every(isRecord)
  ) {
    return { current: null, history: [], historyStartAttemptNumber: 1, invalid: true };
  }
  const current = normalizeLegacyRecord(envelope.current);
  const history = envelope.history.map(normalizeLegacyRecord);
  const historyStartAttemptNumber =
    Number.isInteger(envelope.historyStartAttemptNumber) &&
    (envelope.historyStartAttemptNumber as number) > 0
      ? (envelope.historyStartAttemptNumber as number)
      : 1;
  const identities = new Set(history.map((record) => record.executionId));
  if (
    !current.executionId ||
    identities.has(current.executionId) ||
    history.some(
      (record, index) =>
        !record.executionId || record.attemptNumber !== historyStartAttemptNumber + index,
    ) ||
    current.attemptNumber !== historyStartAttemptNumber + history.length
  ) {
    return { current: null, history: [], historyStartAttemptNumber: 1, invalid: true };
  }
  return {
    current: { ...current, revision: state.revision, contextVersion: state.contextVersion },
    history,
    historyStartAttemptNumber,
    invalid: false,
  };
}

function stateWithSnapshot(
  state: ConversationState,
  current: ResponseExecutionRecord,
  history: ResponseExecutionRecord[],
  historyStartAttemptNumber: number,
): ConversationState {
  return {
    ...state,
    revision: current.revision,
    updatedAt: new Date(),
    responseExecution: {
      current,
      history,
      historyStartAttemptNumber,
    } as unknown as JsonValue,
  } as ConversationState;
}

/**
 * Response-execution history is an audit convenience; correctness and replay
 * safety depend on the current attempt plus the persisted message idempotency
 * store. Keep terminal history only while the existing state payload cap admits
 * the next current attempt. This prevents a long-lived conversation from
 * rejecting an otherwise safe automatic approval solely due to retained audit
 * entries.
 */
function compactTerminalHistoryForNextAttempt(input: {
  state: ConversationState;
  current: ResponseExecutionRecord;
  history: ResponseExecutionRecord[];
  historyStartAttemptNumber: number;
}): { history: ResponseExecutionRecord[]; historyStartAttemptNumber: number } {
  const history = [...input.history];
  let historyStartAttemptNumber = input.historyStartAttemptNumber;
  while (history.length > 0) {
    const candidate = stateWithSnapshot(
      input.state,
      input.current,
      history,
      historyStartAttemptNumber,
    );
    const sizeBytes = Buffer.byteLength(
      JSON.stringify(serializeConversationState(candidate)),
      "utf8",
    );
    if (sizeBytes <= MAX_STATE_JSON_BYTES) break;
    history.shift();
    historyStartAttemptNumber += 1;
  }
  return { history, historyStartAttemptNumber };
}

function expireRecord(record: ResponseExecutionRecord): ResponseExecutionRecord {
  return {
    ...record,
    owner: "TERMINAL_BLOCKED",
    terminalStatus: "TERMINAL_BLOCKED",
    approval: { ...record.approval, status: "EXPIRED" },
  };
}

/**
 * CAS adapter backed by the existing SHADOW stateJson row. It is deliberately
 * dormant until an explicit future arming path seeds a record; no service
 * registers it in the production V1 path during this phase.
 */
export class ConversationStateResponseExecutionStore implements ResponseExecutionStore {
  constructor(private readonly stateStore: ConversationStateStore) {}

  async load(input: ResponseExecutionScope): Promise<ResponseExecutionRecord | null> {
    const state = await this.stateStore.load(scopeFor(input));
    if (!state) return null;
    const snapshot = responseExecutionSnapshotFromState(state);
    if (snapshot.invalid) return null;
    const record = snapshot.current;
    if (
      !record ||
      record.approval.companyId !== input.companyId ||
      record.approval.assistantId !== input.assistantId ||
      record.approval.conversationId !== input.conversationId
    ) {
      return null;
    }
    return record;
  }

  async compareAndSet(input: {
    expectedRevision: number;
    next: ResponseExecutionRecord;
  }): Promise<boolean> {
    const scope = scopeFor({
      ...input.next.approval,
      contextVersion: input.next.contextVersion,
    });
    const current = await this.stateStore.load(scope);
    if (
      !current ||
      current.revision !== input.expectedRevision ||
      input.next.revision !== current.revision + 1
    ) {
      return false;
    }
    try {
      const snapshot = responseExecutionSnapshotFromState(current);
      if (
        snapshot.invalid ||
        !snapshot.current ||
        snapshot.current.executionId !== input.next.executionId
      ) {
        return false;
      }
      await this.stateStore.save(
        stateWithSnapshot(
          current,
          input.next,
          snapshot.history,
          snapshot.historyStartAttemptNumber,
        ),
        current.revision,
      );
      return true;
    } catch (error) {
      if (error instanceof StateRevisionConflictError) return false;
      throw error;
    }
  }

  async arm(input: {
    approval: RuntimeV2ResponseExecutionApproval;
    contextVersion: number;
  }): Promise<ResponseExecutionRecord> {
    const scope = scopeFor({ ...input.approval, contextVersion: input.contextVersion });
    const existing = await this.stateStore.load(scope);
    const snapshot = existing ? responseExecutionSnapshotFromState(existing) : null;
    if (snapshot?.invalid) throw new Error("RESPONSE_EXECUTION_STATE_INCONSISTENT");
    const previous = snapshot?.current ?? null;
    const blocker = previous ? responseExecutionRearmBlocker(previous) : null;
    if (blocker) throw new Error(blocker);
    const revision = existing?.revision ?? 0;
    const history = snapshot?.history ?? [];
    const archived = previous
      ? [...history, previous.approval.status === "ARMED" ? expireRecord(previous) : previous]
      : history;
    const record: ResponseExecutionRecord = {
      executionId: input.approval.approvalId,
      attemptNumber: previous
        ? previous.attemptNumber + 1
        : (snapshot?.historyStartAttemptNumber ?? 1) + archived.length,
      approval: input.approval,
      owner: "V1_OWNED",
      revision,
      contextVersion: input.contextVersion,
      providerV2CallCount: 0,
      providerV1FallbackCallCount: 0,
      outboundV2Attempted: false,
      outboundV2Performed: false,
      outboundV1Performed: false,
      externalMessageId: null,
      fallbackReason: null,
      reconciliationReason: null,
      terminalStatus: null,
      redactionApplied: true,
    };
    if (!existing) {
      const initial = stateWithSnapshot(
        createEmptyConversationState(
          {
            companyId: input.approval.companyId,
            assistantId: input.approval.assistantId,
            conversationId: input.approval.conversationId,
            contextVersion: input.contextVersion,
          },
          new Date(),
        ),
        record,
        [],
        1,
      );
      try {
        await this.stateStore.create(initial);
      } catch (error) {
        if (error instanceof StateAlreadyExistsError) throw new Error("RESPONSE_EXECUTION_ACTIVE");
        throw error;
      }
      return record;
    }
    const next = { ...record, revision: existing.revision + 1 };
    const compacted = compactTerminalHistoryForNextAttempt({
      state: existing,
      current: next,
      history: archived,
      historyStartAttemptNumber: snapshot?.historyStartAttemptNumber ?? 1,
    });
    try {
      await this.stateStore.save(
        stateWithSnapshot(existing, next, compacted.history, compacted.historyStartAttemptNumber),
        existing.revision,
      );
    } catch (error) {
      if (error instanceof StateRevisionConflictError) {
        throw new Error("RESPONSE_EXECUTION_ACTIVE");
      }
      throw error;
    }
    return next;
  }

  async loadSnapshot(input: ResponseExecutionScope): Promise<ResponseExecutionSnapshot | null> {
    const state = await this.stateStore.load(scopeFor(input));
    if (!state) return null;
    return responseExecutionSnapshotFromState(state);
  }
}
