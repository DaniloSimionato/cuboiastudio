import { createHash } from "node:crypto";
import { V1_COMPATIBILITY_POLICY } from "./turn-execution-manifest";

export const OPERATIONAL_HANDOFF_SCHEMA_VERSION = "ASSISTANT_OPERATIONAL_HANDOFF_V1";
export const OPERATIONAL_HANDOFF_ID_ALGORITHM =
  "sha256/assistant-operational-handoff-v1";
export const OPERATIONAL_HANDOFF_REMOTE_STATE_SCHEMA_VERSION =
  "CHATWOOT_OPERATIONAL_HANDOFF_STATE_V1";

export const OPERATIONAL_HANDOFF_STATUSES = [
  "REQUESTED",
  "LOCALLY_BLOCKED",
  "REMOTE_PENDING",
  "REMOTE_CONFIRMED",
  "CONFIRMATION_PENDING",
  "COMPLETED",
  "RECONCILIATION_REQUIRED",
  "FAILED_TERMINAL",
  "SUPERSEDED",
] as const;

export type OperationalHandoffStatus = (typeof OPERATIONAL_HANDOFF_STATUSES)[number];

export const OPERATIONAL_HANDOFF_REMOTE_MUTATION_RESULTS = [
  "NOT_ATTEMPTED",
  "ACKNOWLEDGED",
  "FAILED",
  "AMBIGUOUS",
] as const;

export type OperationalHandoffRemoteMutationResult =
  (typeof OPERATIONAL_HANDOFF_REMOTE_MUTATION_RESULTS)[number];

export const OPERATIONAL_HANDOFF_REMOTE_VERIFICATION_RESULTS = [
  "NOT_ATTEMPTED",
  "CONFIRMED",
  "NOT_CONFIRMED",
  "FAILED",
] as const;

export type OperationalHandoffRemoteVerificationResult =
  (typeof OPERATIONAL_HANDOFF_REMOTE_VERIFICATION_RESULTS)[number];

export const OPERATIONAL_HANDOFF_COMPATIBLE_REMOTE_STATUSES = ["open", "pending"] as const;

export type OperationalHandoffCompatibleRemoteStatus =
  (typeof OPERATIONAL_HANDOFF_COMPATIBLE_REMOTE_STATUSES)[number];

export type OperationalHandoffDestinationType =
  | "EXISTING_ASSIGNEE"
  | "EXISTING_TEAM"
  | "UNRESOLVED";

export type ChatwootOperationalHandoffState = Readonly<{
  schemaVersion: typeof OPERATIONAL_HANDOFF_REMOTE_STATE_SCHEMA_VERSION;
  conversationId: string | null;
  accountId: string | null;
  inboxId: string | null;
  aiActive: boolean | null;
  humanActive: boolean | null;
  status: string | null;
  assigneeId: string | null;
  teamId: string | null;
  labelCount: number;
  stateFingerprint: string;
  observedAt: string;
}>;

export type ResolvedOperationalHandoffDestination = Readonly<{
  resolution: "RESOLVED";
  type: Exclude<OperationalHandoffDestinationType, "UNRESOLVED">;
  assigneeId: string | null;
  teamId: string | null;
  inboxId: string | null;
  reasonCode: "EXISTING_ASSIGNEE_PRESENT" | "EXISTING_TEAM_PRESENT";
  source: "CHATWOOT_CONVERSATION_READ";
}>;

export type UnresolvedOperationalHandoffDestination = Readonly<{
  resolution: "UNRESOLVED";
  type: "UNRESOLVED";
  assigneeId: null;
  teamId: null;
  inboxId: string | null;
  reasonCode: "DESTINATION_UNRESOLVED";
  source: "CHATWOOT_CONVERSATION_READ";
}>;

export type OperationalHandoffDestination =
  | ResolvedOperationalHandoffDestination
  | UnresolvedOperationalHandoffDestination;

export type OperationalHandoffPlan = Readonly<{
  schemaVersion: typeof OPERATIONAL_HANDOFF_SCHEMA_VERSION;
  operationId: string;
  idempotencyKey: string;
  idAlgorithm: typeof OPERATIONAL_HANDOFF_ID_ALGORITHM;
  policyVersion: typeof V1_COMPATIBILITY_POLICY;
  turnExecutionId: string;
  decisionId: string;
  contextVersion: number;
  expectedControlRevision: number;
  reasonCode: string;
  desiredRemoteState: Readonly<{
    aiActive: false;
  }>;
}>;

export type OperationalHandoffRemoteVerificationReason =
  | "CHATWOOT_CONVERSATION_ID_MISSING"
  | "CHATWOOT_CONVERSATION_MISMATCH"
  | "CHATWOOT_ACCOUNT_ID_MISSING"
  | "CHATWOOT_ACCOUNT_MISMATCH"
  | "CHATWOOT_INBOX_ID_MISSING"
  | "CHATWOOT_INBOX_MISMATCH"
  | "CHATWOOT_AI_ACTIVE_NOT_CONFIRMED_INACTIVE"
  | "CHATWOOT_STATUS_NOT_HANDOFF_COMPATIBLE"
  | "DESTINATION_UNRESOLVED"
  | "CHATWOOT_ASSIGNEE_MISMATCH"
  | "CHATWOOT_TEAM_MISMATCH";

export type OperationalHandoffRemoteVerification =
  | Readonly<{
      verified: true;
      reasonCode: "REMOTE_HANDOFF_STATE_CONFIRMED";
      state: ChatwootOperationalHandoffState;
      destination: ResolvedOperationalHandoffDestination;
    }>
  | Readonly<{
      verified: false;
      reasonCode: OperationalHandoffRemoteVerificationReason;
      state: ChatwootOperationalHandoffState;
      destination: OperationalHandoffDestination;
    }>;

function digest(parts: readonly unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeTechnicalIdentifier(value: unknown): string | null {
  const candidate =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : "";
  if (
    !candidate ||
    candidate.length > 160 ||
    !/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(candidate)
  ) {
    return null;
  }
  return candidate;
}

function readEntityIdentifier(value: unknown): string | null {
  const direct = normalizeTechnicalIdentifier(value);
  if (direct) return direct;
  return normalizeTechnicalIdentifier(readObject(value).id);
}

function normalizeRemoteStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toLowerCase();
  return candidate && candidate.length <= 40 && /^[a-z0-9_-]+$/.test(candidate)
    ? candidate
    : null;
}

function safeErrorCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toUpperCase();
  return /^[A-Z][A-Z0-9_]{2,119}$/.test(candidate) ? candidate : null;
}

export function createOperationalHandoffId(input: {
  turnExecutionId: string;
  decisionId: string;
  contextVersion: number;
  policyVersion?: string;
}): string {
  const hash = digest([
    OPERATIONAL_HANDOFF_ID_ALGORITHM,
    "operation-id",
    input.policyVersion ?? V1_COMPATIBILITY_POLICY,
    input.turnExecutionId,
    input.decisionId,
    input.contextVersion,
  ]);
  return `handoff_v1_${hash.slice(0, 32)}`;
}

export function createOperationalHandoffIdempotencyKey(input: {
  turnExecutionId: string;
  decisionId: string;
  contextVersion: number;
  policyVersion?: string;
}): string {
  const hash = digest([
    OPERATIONAL_HANDOFF_ID_ALGORITHM,
    "idempotency-key",
    input.policyVersion ?? V1_COMPATIBILITY_POLICY,
    input.turnExecutionId,
    input.decisionId,
    input.contextVersion,
  ]);
  return `handoff_key_v1_${hash}`;
}

export function createOperationalHandoffPlan(input: {
  turnExecutionId: string;
  decisionId: string;
  contextVersion: number;
  expectedControlRevision: number;
  reasonCode: string;
}): OperationalHandoffPlan {
  const identity = {
    turnExecutionId: input.turnExecutionId,
    decisionId: input.decisionId,
    contextVersion: input.contextVersion,
  };
  return Object.freeze({
    schemaVersion: OPERATIONAL_HANDOFF_SCHEMA_VERSION,
    operationId: createOperationalHandoffId(identity),
    idempotencyKey: createOperationalHandoffIdempotencyKey(identity),
    idAlgorithm: OPERATIONAL_HANDOFF_ID_ALGORITHM,
    policyVersion: V1_COMPATIBILITY_POLICY,
    turnExecutionId: input.turnExecutionId,
    decisionId: input.decisionId,
    contextVersion: input.contextVersion,
    expectedControlRevision: input.expectedControlRevision,
    reasonCode: sanitizeOperationalHandoffErrorCode(
      input.reasonCode,
      "CUSTOMER_REQUESTED_HUMAN",
    ),
    desiredRemoteState: Object.freeze({ aiActive: false as const }),
  });
}

export function parseChatwootOperationalHandoffState(
  value: unknown,
  options: { observedAt?: Date } = {},
): ChatwootOperationalHandoffState {
  const payload = readObject(value);
  const meta = readObject(payload.meta);
  const conversation = readObject(payload.conversation);
  const account = readObject(payload.account);
  const inbox = readObject(payload.inbox);
  const metaAccount = readObject(meta.account);
  const metaInbox = readObject(meta.inbox);
  const customAttributes = readObject(payload.custom_attributes);
  const additionalAttributes = readObject(payload.additional_attributes);
  const assigneeId =
    readEntityIdentifier(payload.assignee) ?? readEntityIdentifier(meta.assignee);
  const teamId = readEntityIdentifier(payload.team) ?? readEntityIdentifier(meta.team);
  const labels = Array.isArray(payload.labels)
    ? payload.labels
    : Array.isArray(meta.labels)
      ? meta.labels
      : [];
  const safeState: Omit<ChatwootOperationalHandoffState, "stateFingerprint"> = {
    schemaVersion: OPERATIONAL_HANDOFF_REMOTE_STATE_SCHEMA_VERSION,
    conversationId:
      normalizeTechnicalIdentifier(payload.id) ??
      normalizeTechnicalIdentifier(payload.conversation_id) ??
      normalizeTechnicalIdentifier(conversation.id),
    accountId:
      normalizeTechnicalIdentifier(payload.account_id) ??
      normalizeTechnicalIdentifier(account.id) ??
      normalizeTechnicalIdentifier(meta.account_id) ??
      normalizeTechnicalIdentifier(metaAccount.id),
    inboxId:
      normalizeTechnicalIdentifier(payload.inbox_id) ??
      normalizeTechnicalIdentifier(inbox.id) ??
      normalizeTechnicalIdentifier(meta.inbox_id) ??
      normalizeTechnicalIdentifier(metaInbox.id),
    aiActive:
      readBoolean(payload.ai_active) ??
      readBoolean(customAttributes.ai_active) ??
      readBoolean(additionalAttributes.ai_active) ??
      readBoolean(meta.ai_active),
    humanActive:
      readBoolean(payload.human_active) ??
      readBoolean(customAttributes.human_active) ??
      readBoolean(additionalAttributes.human_active) ??
      readBoolean(meta.human_active),
    status: normalizeRemoteStatus(payload.status),
    assigneeId,
    teamId,
    labelCount: Math.min(labels.length, 10_000),
    observedAt: (options.observedAt ?? new Date()).toISOString(),
  };
  return Object.freeze({
    ...safeState,
    stateFingerprint: digest([
      OPERATIONAL_HANDOFF_REMOTE_STATE_SCHEMA_VERSION,
      safeState.conversationId,
      safeState.accountId,
      safeState.inboxId,
      safeState.aiActive,
      safeState.humanActive,
      safeState.status,
      safeState.assigneeId,
      safeState.teamId,
      safeState.labelCount,
    ]),
  });
}

export function resolveOperationalHandoffDestination(
  state: ChatwootOperationalHandoffState,
): OperationalHandoffDestination {
  if (state.assigneeId) {
    return Object.freeze({
      resolution: "RESOLVED",
      type: "EXISTING_ASSIGNEE",
      assigneeId: state.assigneeId,
      teamId: state.teamId,
      inboxId: state.inboxId,
      reasonCode: "EXISTING_ASSIGNEE_PRESENT",
      source: "CHATWOOT_CONVERSATION_READ",
    });
  }
  if (state.teamId) {
    return Object.freeze({
      resolution: "RESOLVED",
      type: "EXISTING_TEAM",
      assigneeId: null,
      teamId: state.teamId,
      inboxId: state.inboxId,
      reasonCode: "EXISTING_TEAM_PRESENT",
      source: "CHATWOOT_CONVERSATION_READ",
    });
  }
  return Object.freeze({
    resolution: "UNRESOLVED",
    type: "UNRESOLVED",
    assigneeId: null,
    teamId: null,
    inboxId: state.inboxId,
    reasonCode: "DESTINATION_UNRESOLVED",
    source: "CHATWOOT_CONVERSATION_READ",
  });
}

export function verifyOperationalHandoffRemoteState(input: {
  state: ChatwootOperationalHandoffState;
  destination: OperationalHandoffDestination;
  expectedConversationId: string;
  expectedAccountId: string;
  expectedInboxId: string;
}): OperationalHandoffRemoteVerification {
  const fail = (
    reasonCode: OperationalHandoffRemoteVerificationReason,
  ): OperationalHandoffRemoteVerification => ({
    verified: false,
    reasonCode,
    state: input.state,
    destination: input.destination,
  });
  if (!input.state.conversationId) return fail("CHATWOOT_CONVERSATION_ID_MISSING");
  if (input.state.conversationId !== input.expectedConversationId) {
    return fail("CHATWOOT_CONVERSATION_MISMATCH");
  }
  if (!input.state.accountId) return fail("CHATWOOT_ACCOUNT_ID_MISSING");
  if (input.state.accountId !== input.expectedAccountId) {
    return fail("CHATWOOT_ACCOUNT_MISMATCH");
  }
  if (!input.state.inboxId) return fail("CHATWOOT_INBOX_ID_MISSING");
  if (input.state.inboxId !== input.expectedInboxId) {
    return fail("CHATWOOT_INBOX_MISMATCH");
  }
  if (input.state.aiActive !== false) {
    return fail("CHATWOOT_AI_ACTIVE_NOT_CONFIRMED_INACTIVE");
  }
  if (
    !OPERATIONAL_HANDOFF_COMPATIBLE_REMOTE_STATUSES.includes(
      input.state.status as OperationalHandoffCompatibleRemoteStatus,
    )
  ) {
    return fail("CHATWOOT_STATUS_NOT_HANDOFF_COMPATIBLE");
  }
  if (input.destination.resolution !== "RESOLVED") {
    return fail("DESTINATION_UNRESOLVED");
  }
  if (
    input.destination.type === "EXISTING_ASSIGNEE" &&
    input.state.assigneeId !== input.destination.assigneeId
  ) {
    return fail("CHATWOOT_ASSIGNEE_MISMATCH");
  }
  if (
    input.destination.type === "EXISTING_TEAM" &&
    input.state.teamId !== input.destination.teamId
  ) {
    return fail("CHATWOOT_TEAM_MISMATCH");
  }
  return Object.freeze({
    verified: true,
    reasonCode: "REMOTE_HANDOFF_STATE_CONFIRMED",
    state: input.state,
    destination: input.destination,
  });
}

export function sanitizeOperationalHandoffErrorCode(
  error: unknown,
  fallback = "OPERATIONAL_HANDOFF_FAILED",
): string {
  const record = readObject(error);
  const status =
    typeof record.status === "number" && Number.isInteger(record.status)
      ? record.status
      : typeof record.statusCode === "number" && Number.isInteger(record.statusCode)
        ? record.statusCode
        : null;
  if (status !== null && status >= 100 && status <= 599) return `HTTP_${status}`;
  return (
    safeErrorCode(record.code) ??
    safeErrorCode(error instanceof Error ? error.message : error) ??
    safeErrorCode(fallback) ??
    "OPERATIONAL_HANDOFF_FAILED"
  );
}
