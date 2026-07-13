import { Prisma, RuntimeV2StateEventStatus, RuntimeV2StateMode } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  CONVERSATION_STATE_VERSION,
  createEmptyConversationState,
  deserializeConversationState,
  serializeConversationState,
} from "./conversation-state";
import {
  MAX_STATE_JSON_BYTES,
  STATE_EXPIRY_RETENTION_MS,
  STATE_PURGE_RETENTION_MS,
  MissingInternalMessageIdError,
  StateAlreadyExistsError,
  StatePayloadTooLargeError,
  StateRevisionConflictError,
  StaleContextError,
  type ConversationStateSaveTurnResult,
  type ConversationStateStore,
  type ConversationStateStoreScope,
  type ConversationStateTurn,
  type ProcessedMessageLookup,
} from "./conversation-state-store";
import { type ConversationState, type JsonValue } from "./runtime-v2.types";

const STATE_MODE = RuntimeV2StateMode.SHADOW;
export const RUNTIME_V2_STATE_STORE = Symbol("RUNTIME_V2_STATE_STORE");

type StateRow = Awaited<ReturnType<PrismaService["assistantConversationStateV2"]["findUnique"]>>;

function scopeWhere(scope: ConversationStateStoreScope) {
  return {
    where: {
      companyId_assistantId_conversationId_contextVersion_mode: {
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        conversationId: scope.conversationId,
        contextVersion: scope.contextVersion,
        mode: STATE_MODE,
      },
    },
  };
}

function isForbiddenStateKey(key: string): boolean {
  return /audio|transcription|token|secret|credential|password|phone|email|rawpayload|stack/i.test(
    key,
  );
}

function redactStateValue(value: unknown, key = ""): JsonValue | undefined {
  if (isForbiddenStateKey(key)) return undefined;
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return value;
    return value
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED]")
      .replace(/(?<!\d)\+?\d[\d\s().-]{7,}\d(?![\d-])/g, "[REDACTED]");
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const redacted = redactStateValue(item, key);
      return redacted === undefined ? [] : [redacted];
    });
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, JsonValue> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      const redacted =
        childKey === "prompt"
          ? "[REDACTED_QUESTION_REFERENCE]"
          : redactStateValue(childValue, childKey);
      if (redacted !== undefined) result[childKey] = redacted;
    }
    return result;
  }
  return undefined;
}

export function sanitizeConversationStateForPersistence(state: ConversationState): {
  json: Prisma.InputJsonValue;
  sizeBytes: number;
} {
  const serialized = serializeConversationState(state);
  const redacted = redactStateValue(serialized);
  if (!redacted || typeof redacted !== "object" || Array.isArray(redacted)) {
    throw new Error("STATE_SCHEMA_INVALID");
  }
  const json = redacted as Prisma.InputJsonValue;
  const sizeBytes = Buffer.byteLength(JSON.stringify(json), "utf8");
  if (sizeBytes > MAX_STATE_JSON_BYTES) throw new StatePayloadTooLargeError(sizeBytes);
  return { json, sizeBytes };
}

function stateFromRow(row: NonNullable<StateRow>): ConversationState {
  if (row.schemaVersion !== CONVERSATION_STATE_VERSION) {
    throw new Error("STATE_SCHEMA_VERSION_INVALID");
  }
  const state = deserializeConversationState(row.stateJson);
  if (state.revision !== row.revision) {
    throw new Error("STATE_REVISION_MISMATCH");
  }
  return state;
}

function messageMatchesScope(
  row: { companyId: string; assistantId: string; conversationId: string; contextVersion: number },
  scope: ConversationStateStoreScope,
): boolean {
  return (
    row.companyId === scope.companyId &&
    row.assistantId === scope.assistantId &&
    row.conversationId === scope.conversationId &&
    row.contextVersion === scope.contextVersion
  );
}

function messageMatchesConversation(
  row: { companyId: string; assistantId: string; conversationId: string },
  scope: ConversationStateStoreScope,
): boolean {
  return (
    row.companyId === scope.companyId &&
    row.assistantId === scope.assistantId &&
    row.conversationId === scope.conversationId
  );
}

export class PrismaConversationStateStore implements ConversationStateStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async load(scope: ConversationStateStoreScope): Promise<ConversationState | null> {
    const row = await this.prisma.assistantConversationStateV2.findUnique(scopeWhere(scope));
    if (!row || row.expiresAt.getTime() <= this.now().getTime()) return null;
    return stateFromRow(row);
  }

  async create(initialState: ConversationState): Promise<ConversationState> {
    if (initialState.revision !== 0) throw new StateRevisionConflictError();
    const prepared = this.prepareState(initialState, this.now());
    try {
      const row = await this.prisma.assistantConversationStateV2.create({
        data: this.stateCreateData(
          prepared.state,
          prepared.json,
          prepared.expiresAt,
          prepared.purgeAt,
        ),
      });
      return stateFromRow(row);
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new StateAlreadyExistsError();
      throw error;
    }
  }

  async save(state: ConversationState, expectedRevision: number): Promise<ConversationState> {
    const prepared = this.prepareState(state, this.now());
    if (state.revision !== expectedRevision + 1) throw new StateRevisionConflictError();
    const row = await this.prisma.assistantConversationStateV2.findUnique(
      scopeWhere({ ...state, runtimeVersion: "V2", mode: "SHADOW" }),
    );
    if (!row || row.revision !== expectedRevision) throw new StateRevisionConflictError();
    const updated = await this.prisma.assistantConversationStateV2.updateMany({
      where: { id: row.id, revision: expectedRevision },
      data: {
        schemaVersion: prepared.state.schemaVersion,
        revision: state.revision,
        stateJson: prepared.json,
        lastProcessedMessageId: state.lastProcessedMessageId,
        lastProcessedExternalMessageId: state.lastProcessedExternalMessageId,
        expiresAt: prepared.expiresAt,
        purgeAt: prepared.purgeAt,
        updatedAt: prepared.state.updatedAt,
      },
    });
    if (updated.count !== 1) throw new StateRevisionConflictError();
    const saved = await this.prisma.assistantConversationStateV2.findUnique({
      where: { id: row.id },
    });
    if (!saved) throw new StateRevisionConflictError();
    return stateFromRow(saved);
  }

  async saveTurn(
    state: ConversationState,
    expectedRevision: number,
    message: ConversationStateTurn,
  ): Promise<ConversationStateSaveTurnResult> {
    if (!message.internalMessageId?.trim()) throw new MissingInternalMessageIdError();
    const internalMessageId = message.internalMessageId;
    const now = message.receivedAt ?? this.now();
    try {
      return await this.prisma.$transaction(async (tx) => {
        let row = await tx.assistantConversationStateV2.findUnique(
          scopeWhere({ ...state, runtimeVersion: "V2", mode: "SHADOW" }),
        );
        let created = false;
        if (!row) {
          if (expectedRevision !== 0 || state.revision !== 1)
            throw new StateRevisionConflictError();
          const baseState = createEmptyConversationState(
            {
              companyId: state.companyId,
              assistantId: state.assistantId,
              conversationId: state.conversationId,
              contextVersion: state.contextVersion,
            },
            state.createdAt,
          );
          const basePrepared = this.prepareState(baseState, now);
          row = await tx.assistantConversationStateV2.create({
            data: this.stateCreateData(
              baseState,
              basePrepared.json,
              basePrepared.expiresAt,
              basePrepared.purgeAt,
            ),
          });
          created = true;
        }

        const internalMessage = await tx.assistantConversationMessage.findUnique({
          where: { id: internalMessageId },
          select: {
            companyId: true,
            assistantId: true,
            conversationId: true,
            contextVersion: true,
          },
        });
        if (
          !internalMessage ||
          !messageMatchesConversation(internalMessage, {
            ...state,
            runtimeVersion: "V2",
            mode: "SHADOW",
          })
        ) {
          throw new Error("STATE_MESSAGE_SCOPE_MISMATCH");
        }
        if (internalMessage.contextVersion !== state.contextVersion) {
          throw new StaleContextError();
        }

        const existingEvent = await tx.assistantConversationStateV2Event.findUnique({
          where: { internalMessageId },
        });
        if (existingEvent) {
          if (
            !messageMatchesScope(existingEvent, { ...state, runtimeVersion: "V2", mode: "SHADOW" })
          ) {
            throw new Error("STATE_MESSAGE_SCOPE_MISMATCH");
          }
          const existingState = await tx.assistantConversationStateV2.findUnique({
            where: { id: existingEvent.stateId },
          });
          if (!existingState) throw new Error("STATE_EVENT_WITHOUT_STATE");
          return {
            state: stateFromRow(existingState),
            messageAlreadyProcessed: true,
            persistenceResult: "DUPLICATE",
          };
        }

        if (message.externalMessageId) {
          const externalEvent = await tx.assistantConversationStateV2Event.findFirst({
            where: { stateId: row.id, externalMessageId: message.externalMessageId },
          });
          if (externalEvent) {
            return {
              state: stateFromRow(row),
              messageAlreadyProcessed: true,
              persistenceResult: "DUPLICATE",
            };
          }
        }

        if (message.sourceOccurredAt) {
          const latestEvent = await tx.assistantConversationStateV2Event.findFirst({
            where: {
              stateId: row.id,
              status: RuntimeV2StateEventStatus.PROCESSED,
              sourceOccurredAt: { not: null },
            },
            orderBy: { sourceOccurredAt: "desc" },
          });
          if (
            latestEvent?.sourceOccurredAt &&
            message.sourceOccurredAt < latestEvent.sourceOccurredAt
          ) {
            await tx.assistantConversationStateV2Event.create({
              data: {
                stateId: row.id,
                companyId: state.companyId,
                assistantId: state.assistantId,
                conversationId: state.conversationId,
                contextVersion: state.contextVersion,
                internalMessageId,
                externalMessageId: message.externalMessageId ?? null,
                sourceOccurredAt: message.sourceOccurredAt,
                receivedAt: now,
                processedAt: now,
                resultingRevision: row.revision,
                status: RuntimeV2StateEventStatus.STALE_EVENT,
                errorCode: "STALE_EVENT",
                messageHash: message.messageHash ?? null,
              },
            });
            return {
              state: stateFromRow(row),
              messageAlreadyProcessed: false,
              persistenceResult: "STALE_EVENT",
            };
          }
        }

        const expired = row.expiresAt.getTime() <= now.getTime();
        const targetRevision = expired ? row.revision + 1 : expectedRevision + 1;
        if (
          (!expired && row.revision !== expectedRevision) ||
          state.revision !== (expired ? 1 : targetRevision)
        ) {
          throw new StateRevisionConflictError();
        }
        const persistedState = {
          ...state,
          revision: targetRevision,
        };
        const prepared = this.prepareState(persistedState, now);
        const event = await tx.assistantConversationStateV2Event.create({
          data: {
            stateId: row.id,
            companyId: state.companyId,
            assistantId: state.assistantId,
            conversationId: state.conversationId,
            contextVersion: state.contextVersion,
            internalMessageId,
            externalMessageId: message.externalMessageId ?? null,
            sourceOccurredAt: message.sourceOccurredAt ?? null,
            receivedAt: now,
            status: RuntimeV2StateEventStatus.PROCESSING,
            messageHash: message.messageHash ?? null,
          },
        });
        const updated = await tx.assistantConversationStateV2.updateMany({
          where: { id: row.id, revision: row.revision },
          data: {
            schemaVersion: prepared.state.schemaVersion,
            revision: targetRevision,
            stateJson: prepared.json,
            lastProcessedMessageId: internalMessageId,
            lastProcessedExternalMessageId: message.externalMessageId ?? null,
            updatedAt: prepared.state.updatedAt,
            expiresAt: prepared.expiresAt,
            purgeAt: prepared.purgeAt,
          },
        });
        if (updated.count !== 1) throw new StateRevisionConflictError();
        await tx.assistantConversationStateV2Event.update({
          where: { id: event.id },
          data: {
            status: RuntimeV2StateEventStatus.PROCESSED,
            processedAt: now,
            resultingRevision: targetRevision,
          },
        });
        return {
          state: persistedState,
          messageAlreadyProcessed: false,
          persistenceResult: created ? "CREATED" : "UPDATED",
        };
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const existingEvent = await this.prisma.assistantConversationStateV2Event.findUnique({
          where: { internalMessageId },
        });
        if (existingEvent) {
          const existingState = await this.prisma.assistantConversationStateV2.findUnique({
            where: { id: existingEvent.stateId },
          });
          if (
            existingState &&
            messageMatchesScope(existingEvent, { ...state, runtimeVersion: "V2", mode: "SHADOW" })
          ) {
            return {
              state: stateFromRow(existingState),
              messageAlreadyProcessed: true,
              persistenceResult: "DUPLICATE",
            };
          }
        }
        throw new StateAlreadyExistsError();
      }
      throw error;
    }
  }

  async reset(scope: ConversationStateStoreScope): Promise<ConversationState | null> {
    const row = await this.prisma.assistantConversationStateV2.findUnique(scopeWhere(scope));
    if (!row) return null;
    const now = this.now();
    const state = { ...stateFromRow(row), expiresAt: now, updatedAt: now };
    const prepared = this.prepareState(state, now);
    const updated = await this.prisma.assistantConversationStateV2.update({
      where: { id: row.id },
      data: { stateJson: prepared.json, expiresAt: now, purgeAt: prepared.purgeAt, updatedAt: now },
    });
    return stateFromRow(updated);
  }

  async deleteExpired(now = this.now(), limit = 100): Promise<number> {
    const rows = await this.prisma.assistantConversationStateV2.findMany({
      where: { purgeAt: { lte: now } },
      select: { id: true },
      take: limit,
    });
    if (rows.length === 0) return 0;
    const ids = rows.map((row) => row.id);
    return this.prisma.$transaction(async (tx) => {
      await tx.assistantConversationStateV2Event.deleteMany({ where: { stateId: { in: ids } } });
      const deleted = await tx.assistantConversationStateV2.deleteMany({
        where: { id: { in: ids } },
      });
      return deleted.count;
    });
  }

  async purgeExpired(now = this.now(), limit = 100): Promise<number> {
    return this.deleteExpired(now, limit);
  }

  async findByLastProcessedMessage(
    scope: ConversationStateStoreScope,
    message: ProcessedMessageLookup,
  ): Promise<ConversationState | null> {
    const row = await this.prisma.assistantConversationStateV2.findUnique(scopeWhere(scope));
    if (!row) return null;
    const state = stateFromRow(row);
    return (message.internalMessageId &&
      state.lastProcessedMessageId === message.internalMessageId) ||
      (message.externalMessageId &&
        state.lastProcessedExternalMessageId === message.externalMessageId)
      ? state
      : null;
  }

  async existsForMessage(
    scope: ConversationStateStoreScope,
    message: ProcessedMessageLookup,
  ): Promise<boolean> {
    if (message.internalMessageId) {
      const event = await this.prisma.assistantConversationStateV2Event.findUnique({
        where: { internalMessageId: message.internalMessageId },
      });
      if (event) return messageMatchesScope(event, scope);
    }
    if (!message.externalMessageId) return false;
    const event = await this.prisma.assistantConversationStateV2Event.findFirst({
      where: {
        companyId: scope.companyId,
        assistantId: scope.assistantId,
        conversationId: scope.conversationId,
        contextVersion: scope.contextVersion,
        externalMessageId: message.externalMessageId,
      },
    });
    return Boolean(event);
  }

  private prepareState(
    state: ConversationState,
    now: Date,
  ): {
    state: ConversationState;
    json: Prisma.InputJsonValue;
    expiresAt: Date;
    purgeAt: Date;
  } {
    const expiresAt = state.expiresAt ?? new Date(now.getTime() + STATE_EXPIRY_RETENTION_MS);
    const purgeAt = new Date(
      Math.max(expiresAt.getTime(), now.getTime() + STATE_PURGE_RETENTION_MS),
    );
    const normalizedState = { ...state, expiresAt };
    const { json } = sanitizeConversationStateForPersistence(normalizedState);
    return { state: normalizedState, json, expiresAt, purgeAt };
  }

  private stateCreateData(
    state: ConversationState,
    stateJson: Prisma.InputJsonValue,
    expiresAt: Date,
    purgeAt: Date,
  ) {
    return {
      companyId: state.companyId,
      assistantId: state.assistantId,
      conversationId: state.conversationId,
      contextVersion: state.contextVersion,
      mode: STATE_MODE,
      schemaVersion: state.schemaVersion,
      revision: state.revision,
      stateJson,
      lastProcessedMessageId: state.lastProcessedMessageId,
      lastProcessedExternalMessageId: state.lastProcessedExternalMessageId,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      expiresAt,
      purgeAt,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}
