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

export const MAX_IN_MEMORY_PROCESSED_MESSAGE_IDS = 512;

export interface ConversationStateStore {
  load(scope: ConversationStateStoreScope): Promise<ConversationState | null>;
  create(initialState: ConversationState): Promise<ConversationState>;
  save(state: ConversationState, expectedRevision: number): Promise<ConversationState>;
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

  async load(scope: ConversationStateStoreScope): Promise<ConversationState | null> {
    await this.deleteExpired();
    const state = this.states.get(scopeKey(scope));
    return state ? cloneState(state) : null;
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

  async reset(scope: ConversationStateStoreScope): Promise<ConversationState | null> {
    const key = scopeKey(scope);
    const current = this.states.get(key);
    this.states.delete(key);
    this.processedMessages.delete(key);
    return current ? cloneState(current) : null;
  }

  async deleteExpired(now = new Date()): Promise<number> {
    let deleted = 0;
    for (const [key, state] of this.states) {
      if (state.expiresAt && state.expiresAt.getTime() <= now.getTime()) {
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
}
