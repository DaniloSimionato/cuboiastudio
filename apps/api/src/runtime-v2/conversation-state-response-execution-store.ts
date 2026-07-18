import { createEmptyConversationState } from "./conversation-state";
import {
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
import type { RuntimeV2ResponseExecutionApproval } from "./response-execution-approval";
import type { ConversationState, JsonValue } from "./runtime-v2.types";

type StateWithResponseExecution = ConversationState & {
  responseExecution?: JsonValue;
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

function responseExecutionFromState(state: ConversationState): ResponseExecutionRecord | null {
  const candidate = (state as StateWithResponseExecution).responseExecution;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const record = candidate as unknown as ResponseExecutionRecord;
  if (
    !record.approval ||
    typeof record.approval !== "object" ||
    typeof record.owner !== "string" ||
    record.redactionApplied !== true
  ) {
    return null;
  }
  return { ...record, revision: state.revision, contextVersion: state.contextVersion };
}

function stateWithRecord(
  state: ConversationState,
  record: ResponseExecutionRecord,
): ConversationState {
  return {
    ...state,
    revision: record.revision,
    updatedAt: new Date(),
    responseExecution: record as unknown as JsonValue,
  } as ConversationState;
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
    const record = responseExecutionFromState(state);
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
      await this.stateStore.save(stateWithRecord(current, input.next), current.revision);
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
    if (existing && responseExecutionFromState(existing)) {
      throw new Error("RESPONSE_EXECUTION_ALREADY_ARMED");
    }
    const revision = existing?.revision ?? 0;
    const record: ResponseExecutionRecord = {
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
      const initial = stateWithRecord(
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
      );
      try {
        await this.stateStore.create(initial);
      } catch (error) {
        if (error instanceof StateAlreadyExistsError)
          throw new Error("RESPONSE_EXECUTION_ALREADY_ARMED");
        throw error;
      }
      return record;
    }
    const next = { ...record, revision: existing.revision + 1 };
    await this.stateStore.save(stateWithRecord(existing, next), existing.revision);
    return next;
  }
}
