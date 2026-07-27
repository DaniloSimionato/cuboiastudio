import { createHash } from "node:crypto";
import {
  CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION,
  type ConversationControlAuthorizedTransition,
  type ConversationControlBlockingReason,
  type ConversationControlCheckpointRecord,
  type ConversationControlSnapshot,
  type ConversationControlTrace,
} from "./conversation-control-snapshot";
import type {
  OutboundDeliveryStatus,
  OutboundRecoveryEligibility,
  OutboundRetrySafety,
} from "./outbound-delivery";

export const TURN_EXECUTION_MANIFEST_VERSION = "TURN_EXECUTION_MANIFEST_V1";
export const V1_COMPATIBILITY_POLICY = "V1_COMPATIBILITY_POLICY";
export const TURN_EXECUTION_ID_ALGORITHM = "sha256/canonical-turn-v1";
export const TURN_EXECUTION_HANDOFF_SCHEMA_VERSION = "TURN_EXECUTION_HANDOFF_V1";

export type FragmentIdentityCoverage = "COMPLETE" | "FIRST_FRAGMENT_ONLY" | "UNKNOWN";
export type TurnExecutionObservation = "OBSERVED" | "NOT_OBSERVED" | "UNKNOWN";
export type TurnExecutionOutboundResult =
  | "NOT_ATTEMPTED"
  | "ACKNOWLEDGED"
  | "FAILED"
  | "UNKNOWN";

export type TurnExecutionTerminalPath =
  | "PROVIDER_STANDARD"
  | "PROVIDER_TRIAGE_LEGACY"
  | "DETERMINISTIC_PRICE_AUTHORITY"
  | "BUSINESS_HOURS_DIRECT"
  | "BUSINESS_HOURS_DIRECT_SAFE_FALLBACK_LEGACY"
  | "OPERATIONAL_HUMAN_HANDOFF"
  | "EXPLICIT_HUMAN_HANDOFF_LEGACY"
  | "FLOW_BYPASS_LEGACY"
  | "DETERMINISTIC_FALLBACK_LEGACY"
  | "OUTSIDE_BUSINESS_HOURS_LEGACY"
  | "RESET_KEYWORD_LEGACY"
  | "BLOCKED_PAUSED"
  | "BLOCKED_STALE_CONTEXT"
  | "BLOCKED_CONTROL_STATE"
  | "DUPLICATE_REUSED"
  | "FAILED_BEFORE_OUTBOUND"
  | "FAILED_OUTBOUND"
  | "UNCLASSIFIED_LEGACY";

export type TurnExecutionHandoffStatus =
  | "REQUESTED"
  | "LOCALLY_BLOCKED"
  | "REMOTE_PENDING"
  | "REMOTE_CONFIRMED"
  | "CONFIRMATION_PENDING"
  | "COMPLETED"
  | "RECONCILIATION_REQUIRED"
  | "FAILED_TERMINAL"
  | "SUPERSEDED";

export type TurnExecutionHandoffSummary = {
  schemaVersion: typeof TURN_EXECUTION_HANDOFF_SCHEMA_VERSION;
  operationId: string;
  status: TurnExecutionHandoffStatus;
  destination: {
    resolution: "RESOLVED" | "UNRESOLVED" | "UNKNOWN";
    type: "ASSIGNEE" | "TEAM" | "INBOX_QUEUE" | "UNRESOLVED" | "UNKNOWN";
    referenceHash: string | null;
  };
  expectedContextVersion: number;
  expectedControlRevision: number;
  postBlockControlRevision: number | null;
  localBlockResult: "NOT_ATTEMPTED" | "CONFIRMED" | "FAILED" | "SUPERSEDED";
  remoteMutation: {
    attempted: boolean;
    attemptCount: number;
    result: "NOT_ATTEMPTED" | "ACKNOWLEDGED" | "FAILED" | "UNKNOWN";
    errorCode: string | null;
  };
  remoteVerification: {
    attempted: boolean;
    result: "NOT_ATTEMPTED" | "CONFIRMED" | "FAILED" | "INCONCLUSIVE";
    verifiedAt: string | null;
  };
  confirmation: {
    authorized: boolean;
    decisionId: string | null;
    deliveryId: string | null;
    result: "NOT_AUTHORIZED" | "PENDING" | "ACKNOWLEDGED" | "FAILED";
  };
  recovery?: {
    schemaVersion: string;
    attemptSchemaVersion: string;
    attemptNumber: number;
    leaseOwner: string | null;
    leaseStartedAt: string | null;
    leaseExpiresAt: string | null;
    safety: "PROVEN_SAFE" | "VERIFY_REMOTE_FIRST" | "NOT_RETRYABLE" | "UNKNOWN";
    eligibility: string;
    nextEligibleAt: string | null;
    reconciliationStatus: string | null;
    reconciliationEvidenceType: string | null;
    externalInterventionObserved: boolean;
    confirmationCreatedOrReused: boolean;
    deliveryId: string | null;
    result: string;
    blockingReason: string | null;
  };
  blockingReason: string | null;
};

export type TurnExecutionIdentityInput = {
  companyId: string;
  assistantId: string;
  source: string;
  accountId: string | null;
  inboxId: string | null;
  externalConversationId: string | null;
  externalMessageId: string | null;
  contextVersion: number;
  internalMessageId?: string | null;
};

export type TurnExecutionManifest = {
  schemaVersion: typeof TURN_EXECUTION_MANIFEST_VERSION;
  turnExecutionId: string;
  turnExecutionIdAlgorithm: typeof TURN_EXECUTION_ID_ALGORITHM;
  policyVersion: typeof V1_COMPATIBILITY_POLICY;
  correlation: {
    requestId: string | null;
    correlationId: string | null;
  };
  identity: {
    source: string;
    companyId: string;
    assistantId: string;
    accountId: string | null;
    inboxId: string | null;
    externalConversationId: string | null;
    externalMessageId: string | null;
    internalConversationId: string;
    internalMessageId: string | null;
    contextVersion: number;
  };
  initialState: {
    aiActive: boolean;
    pausedByHuman: boolean;
    sessionState: string | null;
    snapshotSource: "LOCAL_CONVERSATION_PROCESSING_STATE";
    capturedAt: string;
  };
  inbound: {
    fragmentCount: number;
    fragmentIdentityCoverage: FragmentIdentityCoverage;
    normalizedContentHash: string | null;
    normalizedContentLength: number;
  };
  routing: {
    selectedFlow: { id: string; name: string | null } | null;
    primaryIntent: string | null;
    explicitRequests: string[];
    identifiedServices: string[] | null;
    knowledgeScope: string[] | null;
    chunksEvaluated: number | null;
    chunksSelected: number | null;
    candidateAuthorityCount: number | null;
    eligibleAuthorityCount: number | null;
    selectedAuthority: {
      id: string;
      serviceKey: string;
      currency: string;
      amount: number;
      qualifier: string;
    } | null;
  };
  terminal: {
    path: TurnExecutionTerminalPath;
    reasonCode: string;
  } | null;
  provider: {
    finalGeneration: { observation: TurnExecutionObservation; count: number | null };
    embedding: TurnExecutionObservation;
    intentClassification: TurnExecutionObservation;
    memoryExtraction: TurnExecutionObservation;
    toolRequest: { observation: TurnExecutionObservation; count: number | null };
    toolCall: { observation: TurnExecutionObservation; count: number | null };
  };
  outbound: {
    planned: boolean;
    attempted: boolean;
    attemptCount: number;
    sender: "CHATWOOT_V1" | "NOT_APPLICABLE" | "UNKNOWN";
    externalMessageId: string | null;
    result: TurnExecutionOutboundResult;
    deliveries?: TurnExecutionOutboundDeliveryReference[];
  };
  decisionSchemaVersion: string | null;
  decisionId: string | null;
  decisionOrdinal: number | null;
  decisionStatus: "SEALED" | null;
  decisionType: string | null;
  decisionTerminalReasonCode: string | null;
  decisionExecutorOwner: string | null;
  decisionExecutorExecutionCount: number;
  decisionPlannedBlockCount: number;
  decisionStateEffect: string | null;
  decisionOutboundIntended: boolean | null;
  handoff: TurnExecutionHandoffSummary | null;
  control: {
    schemaVersion: typeof CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION | null;
    acceptedSnapshot: ConversationControlSnapshot | null;
    effectiveSnapshot: ConversationControlSnapshot | null;
    checkpoints: ConversationControlCheckpointRecord[];
    authorizedTransitions: ConversationControlAuthorizedTransition[];
    blockingReason: ConversationControlBlockingReason | null;
    decisionResult: ConversationControlTrace["decisionResult"];
    outboundAuthorization: ConversationControlTrace["outboundAuthorization"];
  };
};

export type TurnExecutionOutboundDeliveryReference = {
  schemaVersion: string;
  deliveryId: string;
  idempotencyKey: string;
  blockOrdinal: number;
  expectedContextVersion: number;
  expectedControlRevision: number;
  status: OutboundDeliveryStatus;
  retrySafety?: OutboundRetrySafety;
  attemptCount: number;
  maxAttempts?: number;
  attemptedAt: string | null;
  claimStartedAt?: string | null;
  claimExpiresAt?: string | null;
  nextEligibleAt?: string | null;
  acknowledgedAt: string | null;
  externalMessageId: string | null;
  errorClass: string | null;
  errorCode: string | null;
  recovery?: {
    schemaVersion: string;
    attemptSchemaVersion: string;
    attemptNumber: number;
    leaseOwner: string | null;
    leaseStartedAt: string | null;
    leaseExpiresAt: string | null;
    retrySafety: OutboundRetrySafety;
    eligibility: OutboundRecoveryEligibility;
    nextEligibleAt: string | null;
    reconciliationStatus: string | null;
    reconciliationEvidenceType: string | null;
    result: string;
    blockingReason: string | null;
  };
};

function canonicalString(input: TurnExecutionIdentityInput): string {
  return JSON.stringify([
    TURN_EXECUTION_ID_ALGORITHM,
    input.companyId,
    input.assistantId,
    input.source,
    input.accountId,
    input.inboxId,
    input.externalConversationId,
    input.externalMessageId,
    input.contextVersion,
    input.externalMessageId ? null : input.internalMessageId ?? null,
  ]);
}

export function createTurnExecutionId(input: TurnExecutionIdentityInput): string {
  const digest = createHash("sha256").update(canonicalString(input)).digest("hex");
  return `turn_v1_${digest.slice(0, 32)}`;
}

export function createTurnExecutionManifest(input: {
  identity: TurnExecutionIdentityInput & { internalConversationId: string };
  requestId?: string | null;
  correlationId?: string | null;
  aiActive: boolean;
  pausedByHuman: boolean;
  sessionState?: string | null;
  capturedAt: string;
  fragmentCount?: number | null;
  fragmentIdentityCoverage?: FragmentIdentityCoverage;
  normalizedContentHash?: string | null;
  normalizedContentLength?: number | null;
  controlTrace?: ConversationControlTrace | null;
}): TurnExecutionManifest {
  return {
    schemaVersion: TURN_EXECUTION_MANIFEST_VERSION,
    turnExecutionId: createTurnExecutionId(input.identity),
    turnExecutionIdAlgorithm: TURN_EXECUTION_ID_ALGORITHM,
    policyVersion: V1_COMPATIBILITY_POLICY,
    correlation: {
      requestId: input.requestId ?? null,
      correlationId: input.correlationId ?? null,
    },
    identity: {
      source: input.identity.source,
      companyId: input.identity.companyId,
      assistantId: input.identity.assistantId,
      accountId: input.identity.accountId,
      inboxId: input.identity.inboxId,
      externalConversationId: input.identity.externalConversationId,
      externalMessageId: input.identity.externalMessageId,
      internalConversationId: input.identity.internalConversationId,
      internalMessageId: input.identity.internalMessageId ?? null,
      contextVersion: input.identity.contextVersion,
    },
    initialState: {
      aiActive: input.aiActive,
      pausedByHuman: input.pausedByHuman,
      sessionState: input.sessionState ?? null,
      snapshotSource: "LOCAL_CONVERSATION_PROCESSING_STATE",
      capturedAt: input.capturedAt,
    },
    inbound: {
      fragmentCount: Math.max(1, input.fragmentCount ?? 1),
      fragmentIdentityCoverage: input.fragmentIdentityCoverage ?? "COMPLETE",
      normalizedContentHash: input.normalizedContentHash ?? null,
      normalizedContentLength: Math.max(0, input.normalizedContentLength ?? 0),
    },
    routing: {
      selectedFlow: null,
      primaryIntent: null,
      explicitRequests: [],
      identifiedServices: null,
      knowledgeScope: null,
      chunksEvaluated: null,
      chunksSelected: null,
      candidateAuthorityCount: null,
      eligibleAuthorityCount: null,
      selectedAuthority: null,
    },
    terminal: null,
    provider: {
      finalGeneration: { observation: "NOT_OBSERVED", count: null },
      embedding: "NOT_OBSERVED",
      intentClassification: "NOT_OBSERVED",
      memoryExtraction: "NOT_OBSERVED",
      toolRequest: { observation: "NOT_OBSERVED", count: null },
      toolCall: { observation: "NOT_OBSERVED", count: null },
    },
    outbound: {
      planned: false,
      attempted: false,
      attemptCount: 0,
      sender: "NOT_APPLICABLE",
      externalMessageId: null,
      result: "NOT_ATTEMPTED",
      deliveries: [],
    },
    decisionSchemaVersion: null,
    decisionId: null,
    decisionOrdinal: null,
    decisionStatus: null,
    decisionType: null,
    decisionTerminalReasonCode: null,
    decisionExecutorOwner: null,
    decisionExecutorExecutionCount: 0,
    decisionPlannedBlockCount: 0,
    decisionStateEffect: null,
    decisionOutboundIntended: null,
    handoff: null,
    control: input.controlTrace
      ? controlManifestFromTrace(input.controlTrace)
      : {
          schemaVersion: null,
          acceptedSnapshot: null,
          effectiveSnapshot: null,
          checkpoints: [],
          authorizedTransitions: [],
          blockingReason: null,
          decisionResult: "PENDING",
          outboundAuthorization: "PENDING",
        },
  };
}

function controlManifestFromTrace(
  trace: ConversationControlTrace,
): TurnExecutionManifest["control"] {
  return {
    schemaVersion: CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION,
    acceptedSnapshot: trace.acceptedSnapshot,
    effectiveSnapshot: trace.expectedSnapshot,
    checkpoints: [...trace.checkpoints],
    authorizedTransitions: [...trace.authorizedTransitions],
    blockingReason: trace.blockingReason,
    decisionResult: trace.decisionResult,
    outboundAuthorization: trace.outboundAuthorization,
  };
}

export function finalizeTurnExecutionManifest(
  manifest: TurnExecutionManifest,
  patch: Pick<TurnExecutionManifest, "routing" | "provider" | "outbound"> & {
    terminal: NonNullable<TurnExecutionManifest["terminal"]>;
  },
): TurnExecutionManifest {
  return {
    ...manifest,
    routing: patch.routing,
    terminal: patch.terminal,
    provider: patch.provider,
    outbound: patch.outbound,
  };
}

export function finalizeLegacyNonProviderTurnExecutionManifest(input: {
  manifest: TurnExecutionManifest;
  terminal: NonNullable<TurnExecutionManifest["terminal"]>;
  primaryIntent: string | null;
  explicitRequests?: string[];
  memoryExtraction?: TurnExecutionObservation;
  outbound: Pick<TurnExecutionManifest["outbound"], "planned" | "sender">;
}): TurnExecutionManifest {
  return finalizeTurnExecutionManifest(input.manifest, {
    terminal: input.terminal,
    routing: {
      ...input.manifest.routing,
      primaryIntent: input.primaryIntent,
      explicitRequests: input.explicitRequests ?? [],
      chunksEvaluated: 0,
      chunksSelected: 0,
      candidateAuthorityCount: 0,
      eligibleAuthorityCount: 0,
    },
    provider: {
      finalGeneration: { observation: "OBSERVED", count: 0 },
      embedding: "OBSERVED",
      intentClassification: "OBSERVED",
      memoryExtraction: input.memoryExtraction ?? "OBSERVED",
      toolRequest: { observation: "OBSERVED", count: 0 },
      toolCall: { observation: "OBSERVED", count: 0 },
    },
    outbound: {
      ...input.manifest.outbound,
      planned: input.outbound.planned,
      sender: input.outbound.sender,
    },
  });
}

export function withTurnExecutionOutbound(
  manifest: TurnExecutionManifest,
  outbound: TurnExecutionManifest["outbound"],
): TurnExecutionManifest {
  return { ...manifest, outbound };
}

export function withTurnExecutionOutboundDeliveries(
  manifest: TurnExecutionManifest,
  deliveries: TurnExecutionOutboundDeliveryReference[],
): TurnExecutionManifest {
  return {
    ...manifest,
    outbound: {
      ...manifest.outbound,
      deliveries: deliveries.map((delivery) => ({ ...delivery })),
    },
  };
}

export function withTurnExecutionDecision(
  manifest: TurnExecutionManifest,
  decision: {
    schemaVersion: string;
    decisionId: string;
    decisionOrdinal: number;
    decisionStatus: "SEALED";
    decisionType: string;
    terminalReasonCode: string;
    executorOwner: string;
    executorExecutionCount: number;
    plannedBlockCount: number;
    stateEffect: string;
    outboundIntended: boolean;
  },
): TurnExecutionManifest {
  return {
    ...manifest,
    decisionSchemaVersion: decision.schemaVersion,
    decisionId: decision.decisionId,
    decisionOrdinal: decision.decisionOrdinal,
    decisionStatus: decision.decisionStatus,
    decisionType: decision.decisionType,
    decisionTerminalReasonCode: decision.terminalReasonCode,
    decisionExecutorOwner: decision.executorOwner,
    decisionExecutorExecutionCount: decision.executorExecutionCount,
    decisionPlannedBlockCount: decision.plannedBlockCount,
    decisionStateEffect: decision.stateEffect,
    decisionOutboundIntended: decision.outboundIntended,
  };
}

export function createTurnExecutionHandoffSummary(input: {
  operationId: string;
  status: TurnExecutionHandoffStatus;
  expectedContextVersion: number;
  expectedControlRevision: number;
}): TurnExecutionHandoffSummary {
  return {
    schemaVersion: TURN_EXECUTION_HANDOFF_SCHEMA_VERSION,
    operationId: input.operationId,
    status: input.status,
    destination: {
      resolution: "UNKNOWN",
      type: "UNKNOWN",
      referenceHash: null,
    },
    expectedContextVersion: input.expectedContextVersion,
    expectedControlRevision: input.expectedControlRevision,
    postBlockControlRevision: null,
    localBlockResult: "NOT_ATTEMPTED",
    remoteMutation: {
      attempted: false,
      attemptCount: 0,
      result: "NOT_ATTEMPTED",
      errorCode: null,
    },
    remoteVerification: {
      attempted: false,
      result: "NOT_ATTEMPTED",
      verifiedAt: null,
    },
    confirmation: {
      authorized: false,
      decisionId: null,
      deliveryId: null,
      result: "NOT_AUTHORIZED",
    },
    blockingReason: null,
  };
}

export function withTurnExecutionHandoff(
  manifest: TurnExecutionManifest,
  handoff: TurnExecutionHandoffSummary | null,
): TurnExecutionManifest {
  return {
    ...manifest,
    handoff: handoff
      ? {
          ...handoff,
          destination: { ...handoff.destination },
          remoteMutation: { ...handoff.remoteMutation },
          remoteVerification: { ...handoff.remoteVerification },
          confirmation: { ...handoff.confirmation },
          ...(handoff.recovery ? { recovery: { ...handoff.recovery } } : {}),
        }
      : null,
  };
}

export function withTurnExecutionControl(
  manifest: TurnExecutionManifest,
  trace: ConversationControlTrace,
): TurnExecutionManifest {
  return {
    ...manifest,
    control: controlManifestFromTrace(trace),
  };
}
