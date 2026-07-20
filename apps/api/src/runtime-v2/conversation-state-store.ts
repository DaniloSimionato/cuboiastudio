import { deserializeConversationState, serializeConversationState } from "./conversation-state";
import { type ConversationState, type RuntimeV2Scope } from "./runtime-v2.types";

export type ConversationStateStoreScope = RuntimeV2Scope & {
  runtimeVersion: "V2";
  mode: "SHADOW";
};

export type ProcessedMessageLookup = {
  internalMessageId?: string | null;
  externalMessageId?: string | null;
};

export type ConversationStateTurn = ProcessedMessageLookup & {
  sourceOccurredAt?: Date | null;
  receivedAt?: Date;
  messageHash?: string | null;
};

export type ConversationStateSaveTurnResult = {
  state: ConversationState;
  messageAlreadyProcessed: boolean;
  persistenceResult: "CREATED" | "UPDATED" | "DUPLICATE" | "STALE_CONTEXT" | "STALE_EVENT";
};

export const MAX_IN_MEMORY_PROCESSED_MESSAGE_IDS = 512;

export interface ConversationStateStore {
  load(scope: ConversationStateStoreScope): Promise<ConversationState | null>;
  create(initialState: ConversationState): Promise<ConversationState>;
  save(state: ConversationState, expectedRevision: number): Promise<ConversationState>;
  saveTurn(
    state: ConversationState,
    expectedRevision: number,
    message: ConversationStateTurn,
  ): Promise<ConversationStateSaveTurnResult>;
  reset(scope: ConversationStateStoreScope): Promise<ConversationState | null>;
  deleteExpired(now?: Date): Promise<number>;
  findByLastProcessedMessage(
    scope: ConversationStateStoreScope,
    message: ProcessedMessageLookup,
  ): Promise<ConversationState | null>;
  existsForMessage(
    scope: ConversationStateStoreScope,
    message: ProcessedMessageLookup,
  ): Promise<boolean>;
}

export class StateRevisionConflictError extends Error {
  constructor() {
    super("RUNTIME_V2_STATE_REVISION_CONFLICT");
    this.name = "StateRevisionConflictError";
  }
}

export class StateAlreadyExistsError extends Error {
  constructor() {
    super("RUNTIME_V2_STATE_ALREADY_EXISTS");
    this.name = "StateAlreadyExistsError";
  }
}

export class MissingInternalMessageIdError extends Error {
  constructor() {
    super("MISSING_INTERNAL_MESSAGE_ID");
    this.name = "MissingInternalMessageIdError";
  }
}

export class StatePayloadTooLargeError extends Error {
  readonly sizeBytes: number;

  constructor(sizeBytes: number) {
    super("STATE_PAYLOAD_TOO_LARGE");
    this.name = "StatePayloadTooLargeError";
    this.sizeBytes = sizeBytes;
  }
}

export class StaleContextError extends Error {
  constructor() {
    super("STALE_CONTEXT");
    this.name = "StaleContextError";
  }
}

export const MAX_STATE_JSON_BYTES = 64 * 1024;
export const STATE_EXPIRY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const STATE_PURGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function scopeKey(scope: ConversationStateStoreScope): string {
  return [
    scope.runtimeVersion,
    scope.mode,
    scope.companyId,
    scope.assistantId,
    scope.conversationId,
    scope.contextVersion,
  ]
    .map((value) => encodeURIComponent(String(value)))
    .join(":");
}

function cloneState(state: ConversationState): ConversationState {
  return deserializeConversationState(
    JSON.parse(JSON.stringify(serializeConversationState(state))),
  );
}

function matchesMessage(state: ConversationState, message: ProcessedMessageLookup): boolean {
  return Boolean(
    (message.internalMessageId && state.lastProcessedMessageId === message.internalMessageId) ||
    (message.externalMessageId &&
      state.lastProcessedExternalMessageId === message.externalMessageId),
  );
}

export class InMemoryConversationStateStore implements ConversationStateStore {
  private readonly states = new Map<string, ConversationState>();
  private readonly processedMessages = new Map<
    string,
    { internal: Set<string>; external: Set<string> }
  >();
  private readonly now: () => Date;

  constructor(now?: () => Date) {
    this.now = now ?? (() => new Date());
  }

  async load(scope: ConversationStateStoreScope): Promise<ConversationState | null> {
    await this.deleteExpired();
    const state = this.states.get(scopeKey(scope));
    if (!state || (state.expiresAt && state.expiresAt.getTime() <= this.now().getTime()))
      return null;
    return cloneState(state);
  }

  async create(initialState: ConversationState): Promise<ConversationState> {
    await this.deleteExpired();
    const key = scopeKey({
      ...initialState,
      runtimeVersion: "V2",
      mode: "SHADOW",
    });
    if (this.states.has(key)) {
      throw new StateAlreadyExistsError();
    }
    if (initialState.revision !== 0) {
      throw new Error("RUNTIME_V2_INITIAL_REVISION_MUST_BE_ZERO");
    }
    const stored = cloneState(initialState);
    this.states.set(key, stored);
    this.processedMessages.set(key, {
      internal: new Set(
        initialState.lastProcessedMessageId ? [initialState.lastProcessedMessageId] : [],
      ),
      external: new Set(
        initialState.lastProcessedExternalMessageId
          ? [initialState.lastProcessedExternalMessageId]
          : [],
      ),
    });
    return cloneState(stored);
  }

  async save(state: ConversationState, expectedRevision: number): Promise<ConversationState> {
    await this.deleteExpired();
    const key = scopeKey({
      ...state,
      runtimeVersion: "V2",
      mode: "SHADOW",
    });
    const current = this.states.get(key);
    if (
      !current ||
      current.revision !== expectedRevision ||
      state.revision !== expectedRevision + 1
    ) {
      throw new StateRevisionConflictError();
    }
    const stored = cloneState(state);
    this.states.set(key, stored);
    const processed = this.processedMessages.get(key) ?? {
      internal: new Set(),
      external: new Set(),
    };
    this.remember(processed.internal, state.lastProcessedMessageId);
    this.remember(processed.external, state.lastProcessedExternalMessageId);
    this.processedMessages.set(key, processed);
    return cloneState(stored);
  }

  async saveTurn(
    state: ConversationState,
    expectedRevision: number,
    message: ConversationStateTurn,
  ): Promise<ConversationStateSaveTurnResult> {
    if (!message.internalMessageId?.trim()) throw new MissingInternalMessageIdError();
    await this.deleteExpired();
    const key = scopeKey({ ...state, runtimeVersion: "V2", mode: "SHADOW" });
    const processed = this.processedMessages.get(key);
    const duplicate = Boolean(
      processed &&
      ((message.internalMessageId && processed.internal.has(message.internalMessageId)) ||
        (message.externalMessageId && processed.external.has(message.externalMessageId))),
    );
    const current = this.states.get(key);
    if (duplicate && current) {
      return {
        state: cloneState(current),
        messageAlreadyProcessed: true,
        persistenceResult: "DUPLICATE",
      };
    }

    const expired = Boolean(
      current?.expiresAt && current.expiresAt.getTime() <= this.now().getTime(),
    );
    if (!current) {
      if (expectedRevision !== 0 || state.revision !== 1) throw new StateRevisionConflictError();
      const stored = cloneState(state);
      this.states.set(key, stored);
      this.rememberMessage(key, message);
      return {
        state: cloneState(stored),
        messageAlreadyProcessed: false,
        persistenceResult: "CREATED",
      };
    }

    const expectedCurrentRevision = expired ? current.revision : expectedRevision;
    const expectedNextRevision = expired ? current.revision + 1 : expectedRevision + 1;
    if (
      current.revision !== expectedCurrentRevision ||
      state.revision !== (expired ? 1 : expectedNextRevision)
    ) {
      throw new StateRevisionConflictError();
    }
    const stored = cloneState({
      ...state,
      revision: expectedNextRevision,
      createdAt: expired ? state.createdAt : current.createdAt,
    });
    this.states.set(key, stored);
    this.rememberMessage(key, message);
    return {
      state: cloneState(stored),
      messageAlreadyProcessed: false,
      persistenceResult: "UPDATED",
    };
  }

  async reset(scope: ConversationStateStoreScope): Promise<ConversationState | null> {
    const key = scopeKey(scope);
    const current = this.states.get(key);
    if (!current) return null;
    const expired = cloneState({ ...current, expiresAt: new Date() });
    this.states.set(key, expired);
    return expired;
  }

  async deleteExpired(now = this.now()): Promise<number> {
    let deleted = 0;
    for (const [key, state] of this.states) {
      const purgeAt = state.updatedAt.getTime() + STATE_PURGE_RETENTION_MS;
      if (purgeAt <= now.getTime()) {
        this.states.delete(key);
        this.processedMessages.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }

  async findByLastProcessedMessage(
    scope: ConversationStateStoreScope,
    message: ProcessedMessageLookup,
  ): Promise<ConversationState | null> {
    const state = await this.load(scope);
    return state && matchesMessage(state, message) ? state : null;
  }

  async existsForMessage(
    scope: ConversationStateStoreScope,
    message: ProcessedMessageLookup,
  ): Promise<boolean> {
    await this.deleteExpired();
    const processed = this.processedMessages.get(scopeKey(scope));
    return Boolean(
      processed &&
      ((message.internalMessageId && processed.internal.has(message.internalMessageId)) ||
        (message.externalMessageId && processed.external.has(message.externalMessageId))),
    );
  }

  getDebugStats(): { stateCount: number; processedMessageIdCount: number } {
    return {
      stateCount: this.states.size,
      processedMessageIdCount: Array.from(this.processedMessages.values()).reduce(
        (total, value) => total + value.internal.size + value.external.size,
        0,
      ),
    };
  }

  private remember(set: Set<string>, value: string | null): void {
    if (!value) return;
    set.add(value);
    while (set.size > MAX_IN_MEMORY_PROCESSED_MESSAGE_IDS) {
      const oldest = set.values().next().value;
      if (typeof oldest !== "string") break;
      set.delete(oldest);
    }
  }

  private rememberMessage(key: string, message: ConversationStateTurn): void {
    const processed = this.processedMessages.get(key) ?? {
      internal: new Set<string>(),
      external: new Set<string>(),
    };
    this.remember(processed.internal, message.internalMessageId ?? null);
    this.remember(processed.external, message.externalMessageId ?? null);
    this.processedMessages.set(key, processed);
  }
}
