export const CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION =
  "CONVERSATION_CONTROL_SNAPSHOT_V1";

export type ConversationControlDerivedState =
  | "ACTIVE"
  | "PAUSED"
  | "INACTIVE"
  | "STALE_CONTEXT"
  | "UNKNOWN";

export type ConversationControlSnapshotSource =
  | "LOCAL_DATABASE_ADMISSION"
  | "LOCAL_DATABASE_CHECKPOINT"
  | "LOCAL_DATABASE_LOCKED_CHECKPOINT"
  | "LOCAL_DATABASE_CONTROL_TRANSITION";

export type ConversationControlCheckpoint =
  | "ADMISSION"
  | "PRE_PROVIDER"
  | "PRE_SEAL"
  | "PRE_EFFECTS"
  | "PRE_OUTBOUND";

export type ConversationControlMismatchReason =
  | "CONVERSATION_NOT_FOUND"
  | "CONVERSATION_ID_MISMATCH"
  | "CONTEXT_VERSION_MISMATCH"
  | "CONTROL_REVISION_MISMATCH"
  | "AI_ACTIVE_MISMATCH"
  | "PAUSED_BY_HUMAN_MISMATCH";

export type ConversationControlBlockingReason =
  | "BLOCKED_CONTROL_STATE_AT_ADMISSION"
  | "BLOCKED_CONTROL_STATE_PRE_PROVIDER"
  | "BLOCKED_CONTROL_STATE_PRE_SEAL"
  | "BLOCKED_CONTROL_STATE_PRE_EFFECTS"
  | "BLOCKED_CONTROL_STATE_PRE_OUTBOUND";

export type ConversationControlSnapshot = Readonly<{
  schemaVersion: typeof CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION;
  internalConversationId: string;
  currentContextVersion: number;
  controlRevision: number;
  aiActive: boolean;
  pausedByHuman: boolean;
  sessionState: string | null;
  derivedState: ConversationControlDerivedState;
  capturedAt: string;
  snapshotSource: ConversationControlSnapshotSource;
  snapshotReason: string;
}>;

export type ConversationControlCheckpointRecord = Readonly<{
  checkpoint: ConversationControlCheckpoint;
  checkedAt: string;
  result: "PASSED" | "BLOCKED";
  blockingReason: ConversationControlBlockingReason | null;
  mismatchReason: ConversationControlMismatchReason | null;
  expectedRevision: number;
  observedRevision: number | null;
  expectedContextVersion: number;
  observedContextVersion: number | null;
  expectedAiActive: boolean;
  observedAiActive: boolean | null;
  expectedPausedByHuman: boolean;
  observedPausedByHuman: boolean | null;
  observedState: ConversationControlDerivedState;
}>;

export type ConversationControlAuthorizedTransition = Readonly<{
  reason: string;
  transitionedAt: string;
  previousRevision: number;
  currentRevision: number;
  previousContextVersion: number;
  currentContextVersion: number;
}>;

export type ConversationControlTrace = {
  acceptedSnapshot: ConversationControlSnapshot;
  expectedSnapshot: ConversationControlSnapshot;
  checkpoints: ConversationControlCheckpointRecord[];
  authorizedTransitions: ConversationControlAuthorizedTransition[];
  blockingReason: ConversationControlBlockingReason | null;
  decisionResult: "PENDING" | "EXECUTED" | "DISCARDED";
  outboundAuthorization: "PENDING" | "ALLOWED" | "BLOCKED" | "NOT_APPLICABLE";
};

export type ConversationControlRecord = {
  id: string;
  currentContextVersion: number;
  controlRevision: number;
  aiActive: boolean;
  pausedByHuman: boolean;
  status?: string | null;
};

function deriveState(input: {
  aiActive: boolean;
  pausedByHuman: boolean;
}): ConversationControlDerivedState {
  if (input.pausedByHuman) return "PAUSED";
  if (!input.aiActive) return "INACTIVE";
  return "ACTIVE";
}

export function createConversationControlSnapshot(input: {
  conversation: ConversationControlRecord;
  capturedAt: string;
  snapshotSource: ConversationControlSnapshotSource;
  snapshotReason: string;
}): ConversationControlSnapshot {
  return Object.freeze({
    schemaVersion: CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION,
    internalConversationId: input.conversation.id,
    currentContextVersion: input.conversation.currentContextVersion,
    controlRevision: input.conversation.controlRevision,
    aiActive: input.conversation.aiActive,
    pausedByHuman: input.conversation.pausedByHuman,
    sessionState: input.conversation.status ?? null,
    derivedState: deriveState(input.conversation),
    capturedAt: input.capturedAt,
    snapshotSource: input.snapshotSource,
    snapshotReason: input.snapshotReason,
  });
}

export function createConversationControlTrace(
  acceptedSnapshot: ConversationControlSnapshot,
): ConversationControlTrace {
  return {
    acceptedSnapshot,
    expectedSnapshot: acceptedSnapshot,
    checkpoints: [],
    authorizedTransitions: [],
    blockingReason: null,
    decisionResult: "PENDING",
    outboundAuthorization: "PENDING",
  };
}

function blockingReasonFor(
  checkpoint: ConversationControlCheckpoint,
): ConversationControlBlockingReason {
  switch (checkpoint) {
    case "ADMISSION":
      return "BLOCKED_CONTROL_STATE_AT_ADMISSION";
    case "PRE_PROVIDER":
      return "BLOCKED_CONTROL_STATE_PRE_PROVIDER";
    case "PRE_SEAL":
      return "BLOCKED_CONTROL_STATE_PRE_SEAL";
    case "PRE_EFFECTS":
      return "BLOCKED_CONTROL_STATE_PRE_EFFECTS";
    case "PRE_OUTBOUND":
      return "BLOCKED_CONTROL_STATE_PRE_OUTBOUND";
  }
}

function mismatchReason(
  expected: ConversationControlSnapshot,
  observed: ConversationControlSnapshot | null,
): ConversationControlMismatchReason | null {
  if (!observed) return "CONVERSATION_NOT_FOUND";
  if (observed.internalConversationId !== expected.internalConversationId) {
    return "CONVERSATION_ID_MISMATCH";
  }
  if (observed.currentContextVersion !== expected.currentContextVersion) {
    return "CONTEXT_VERSION_MISMATCH";
  }
  if (observed.controlRevision !== expected.controlRevision) {
    return "CONTROL_REVISION_MISMATCH";
  }
  if (observed.aiActive !== expected.aiActive) return "AI_ACTIVE_MISMATCH";
  if (observed.pausedByHuman !== expected.pausedByHuman) {
    return "PAUSED_BY_HUMAN_MISMATCH";
  }
  return null;
}

export function evaluateConversationControlCheckpoint(input: {
  checkpoint: ConversationControlCheckpoint;
  expected: ConversationControlSnapshot;
  observed: ConversationControlSnapshot | null;
  checkedAt: string;
}): ConversationControlCheckpointRecord {
  const mismatch = mismatchReason(input.expected, input.observed);
  return Object.freeze({
    checkpoint: input.checkpoint,
    checkedAt: input.checkedAt,
    result: mismatch ? "BLOCKED" : "PASSED",
    blockingReason: mismatch ? blockingReasonFor(input.checkpoint) : null,
    mismatchReason: mismatch,
    expectedRevision: input.expected.controlRevision,
    observedRevision: input.observed?.controlRevision ?? null,
    expectedContextVersion: input.expected.currentContextVersion,
    observedContextVersion: input.observed?.currentContextVersion ?? null,
    expectedAiActive: input.expected.aiActive,
    observedAiActive: input.observed?.aiActive ?? null,
    expectedPausedByHuman: input.expected.pausedByHuman,
    observedPausedByHuman: input.observed?.pausedByHuman ?? null,
    observedState:
      mismatch === "CONTEXT_VERSION_MISMATCH"
        ? "STALE_CONTEXT"
        : input.observed?.derivedState ?? "UNKNOWN",
  });
}

export function advanceConversationControlTrace(input: {
  trace: ConversationControlTrace;
  nextSnapshot: ConversationControlSnapshot;
  reason: string;
  transitionedAt: string;
}): void {
  const previous = input.trace.expectedSnapshot;
  input.trace.authorizedTransitions.push(
    Object.freeze({
      reason: input.reason,
      transitionedAt: input.transitionedAt,
      previousRevision: previous.controlRevision,
      currentRevision: input.nextSnapshot.controlRevision,
      previousContextVersion: previous.currentContextVersion,
      currentContextVersion: input.nextSnapshot.currentContextVersion,
    }),
  );
  input.trace.expectedSnapshot = input.nextSnapshot;
}

export class ConversationControlSnapshotStaleError extends Error {
  constructor(
    readonly record: ConversationControlCheckpointRecord,
  ) {
    super(record.blockingReason ?? "BLOCKED_CONTROL_STATE");
    this.name = "ConversationControlSnapshotStaleError";
  }
}

export function isConversationControlSnapshotStaleError(
  error: unknown,
): error is ConversationControlSnapshotStaleError {
  return error instanceof ConversationControlSnapshotStaleError;
}
