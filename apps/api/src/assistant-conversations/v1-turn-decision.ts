import { createHash } from "node:crypto";
import {
  V1_COMPATIBILITY_POLICY,
  type TurnExecutionOutboundResult,
  type TurnExecutionTerminalPath,
} from "./turn-execution-manifest";
import {
  CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION,
  type ConversationControlSnapshot,
} from "./conversation-control-snapshot";

export const V1_TURN_DECISION_SCHEMA_VERSION = "V1_TURN_DECISION_V1";
export const V1_TURN_DECISION_ID_ALGORITHM = "sha256/v1-turn-decision-v1";
export const V1_TURN_DECISION_EXECUTOR_OWNER = "V1_TURN_DECISION_EXECUTOR";
export const V1_TURN_DECISION_ORDINAL = 1;
export const V1_OPERATIONAL_HANDOFF_EFFECT_SCHEMA_VERSION =
  "V1_OPERATIONAL_HANDOFF_EFFECT_V1";

export type V1TurnDecisionType =
  | "PROVIDER_RESPONSE"
  | "DETERMINISTIC_RESPONSE"
  | "FALLBACK_RESPONSE"
  | "OPERATIONAL_HANDOFF"
  | "LEGACY_HANDOFF_TEXT"
  | "LEGACY_RESET_RESPONSE";

export type V1TurnProviderDisposition =
  | "USED"
  | "PROHIBITED"
  | "SKIPPED"
  | "FAILED_WITH_FALLBACK"
  | "NOT_OBSERVED";

export type V1TurnStateEffect =
  | "NONE"
  | "BLOCK_AI_AND_HANDOFF"
  | "LEGACY_HANDOFF_TEXT_ONLY"
  | "LEGACY_RESET_ALREADY_APPLIED";

export type V1OperationalHandoffEffect = Readonly<{
  schemaVersion: typeof V1_OPERATIONAL_HANDOFF_EFFECT_SCHEMA_VERSION;
  operationRequired: true;
  localBlockRequired: true;
  remoteMutationRequired: true;
  remoteVerificationRequired: true;
  confirmationPrecondition: "REMOTE_STATE_VERIFIED";
  confirmationAllowedBeforeRemoteVerification: false;
  expectedPostBlockControl: Readonly<{
    contextVersion: number;
    controlRevision: number;
    aiActive: false;
    pausedByHuman: true;
  }>;
}>;

export type V1TurnDecisionResponseBlock = Readonly<{
  ordinal: number;
  content: string;
}>;

export type V1TurnDecisionAuthority = Readonly<{
  id: string;
  serviceKey: string;
  currency: string;
  amount: number;
  qualifier: string;
}>;

export type V1TurnDecision = Readonly<{
  schemaVersion: typeof V1_TURN_DECISION_SCHEMA_VERSION;
  decisionId: string;
  decisionIdAlgorithm: typeof V1_TURN_DECISION_ID_ALGORITHM;
  decisionOrdinal: typeof V1_TURN_DECISION_ORDINAL;
  decisionStatus: "SEALED";
  turnExecutionId: string;
  policyVersion: typeof V1_COMPATIBILITY_POLICY;
  contextVersion: number;
  classification: Readonly<{
    type: V1TurnDecisionType;
    terminalPath: TurnExecutionTerminalPath;
    terminalReasonCode: string;
    strategy: string;
    providerDisposition: V1TurnProviderDisposition;
    legacyCapability: string | null;
  }>;
  response: Readonly<{
    blocks: readonly V1TurnDecisionResponseBlock[];
    persistedContent: string | null;
    persistence: Readonly<{
      source: string;
      mode: string;
      contextVersion: number;
      sources: unknown;
    }> | null;
  }>;
  provider: Readonly<{
    used: boolean;
    finalGenerationCount: number;
    skipReason: string | null;
  }>;
  control: Readonly<{
    schemaVersion: typeof CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION;
    expectedRevision: number;
    expectedContextVersion: number;
    expectedAiActive: boolean;
    expectedPausedByHuman: boolean;
  }>;
  authority: V1TurnDecisionAuthority | null;
  effects: Readonly<{
    persistLocalResponse: boolean;
    finalizeRuntimeLog: boolean;
    outboundIntended: boolean;
    sender: "CHATWOOT_V1" | "NOT_APPLICABLE";
    stateEffect: V1TurnStateEffect;
    operationalHandoff: V1OperationalHandoffEffect | null;
  }>;
  compatibility: Readonly<{
    runtimeMode: string;
    runtimeReason: string;
    expectedOutcome: string;
  }>;
}>;

export type V1TurnDecisionDraft = {
  turnExecutionId: string;
  contextVersion: number;
  classification: V1TurnDecision["classification"];
  response: V1TurnDecision["response"];
  provider: V1TurnDecision["provider"];
  controlSnapshot: ConversationControlSnapshot;
  authority?: V1TurnDecisionAuthority | null;
  effects: Omit<V1TurnDecision["effects"], "operationalHandoff"> & {
    operationalHandoff?: V1OperationalHandoffEffect | null;
  };
  compatibility: V1TurnDecision["compatibility"];
};

export function createV1TurnDecisionId(input: {
  turnExecutionId: string;
  decisionOrdinal?: number;
  policyVersion?: string;
}): string {
  const serialized = JSON.stringify([
    V1_TURN_DECISION_ID_ALGORITHM,
    input.policyVersion ?? V1_COMPATIBILITY_POLICY,
    input.turnExecutionId,
    input.decisionOrdinal ?? V1_TURN_DECISION_ORDINAL,
  ]);
  const digest = createHash("sha256").update(serialized).digest("hex");
  return `decision_v1_${digest.slice(0, 32)}`;
}

function cloneAndFreezeJsonLike(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => cloneAndFreezeJsonLike(item)));
  }
  if (value && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, cloneAndFreezeJsonLike(item)]),
      ),
    );
  }
  return value;
}

function freezeDecision(draft: V1TurnDecisionDraft): V1TurnDecision {
  const blocks = draft.response.blocks.map((block, index) => {
    if (block.ordinal !== index + 1) {
      throw new Error("V1_TURN_DECISION_BLOCK_ORDINAL_INVALID");
    }
    return Object.freeze({ ordinal: block.ordinal, content: block.content });
  });
  if (draft.effects.persistLocalResponse && draft.response.persistedContent === null) {
    throw new Error("V1_TURN_DECISION_PERSISTED_CONTENT_REQUIRED");
  }
  if (!draft.effects.persistLocalResponse && draft.response.persistedContent !== null) {
    throw new Error("V1_TURN_DECISION_UNEXPECTED_PERSISTED_CONTENT");
  }
  if (draft.effects.outboundIntended && blocks.length === 0) {
    throw new Error("V1_TURN_DECISION_OUTBOUND_BLOCK_REQUIRED");
  }
  const isOperationalHandoff =
    draft.classification.type === "OPERATIONAL_HANDOFF" ||
    draft.effects.stateEffect === "BLOCK_AI_AND_HANDOFF";
  if (
    isOperationalHandoff &&
    (draft.classification.type !== "OPERATIONAL_HANDOFF" ||
      draft.effects.stateEffect !== "BLOCK_AI_AND_HANDOFF")
  ) {
    throw new Error("V1_OPERATIONAL_HANDOFF_DECISION_EFFECT_MISMATCH");
  }
  if (isOperationalHandoff && !draft.effects.operationalHandoff) {
    throw new Error("V1_OPERATIONAL_HANDOFF_EFFECT_REQUIRED");
  }
  if (!isOperationalHandoff && draft.effects.operationalHandoff) {
    throw new Error("V1_OPERATIONAL_HANDOFF_EFFECT_UNEXPECTED");
  }
  if (
    isOperationalHandoff &&
    (draft.provider.used ||
      draft.classification.providerDisposition !== "PROHIBITED" ||
      !draft.effects.persistLocalResponse ||
      !draft.effects.outboundIntended)
  ) {
    throw new Error("V1_OPERATIONAL_HANDOFF_CONFIRMATION_CONTRACT_INVALID");
  }
  if (
    draft.effects.operationalHandoff &&
    (draft.effects.operationalHandoff.expectedPostBlockControl.contextVersion !==
      draft.controlSnapshot.currentContextVersion ||
      draft.effects.operationalHandoff.expectedPostBlockControl.controlRevision !==
        draft.controlSnapshot.controlRevision + 1 ||
      draft.effects.operationalHandoff.expectedPostBlockControl.aiActive !== false ||
      draft.effects.operationalHandoff.expectedPostBlockControl.pausedByHuman !== true)
  ) {
    throw new Error("V1_OPERATIONAL_HANDOFF_POST_BLOCK_CONTROL_INVALID");
  }
  const operationalHandoff = draft.effects.operationalHandoff
    ? Object.freeze({
        ...draft.effects.operationalHandoff,
        expectedPostBlockControl: Object.freeze({
          ...draft.effects.operationalHandoff.expectedPostBlockControl,
        }),
      })
    : null;

  return Object.freeze({
    schemaVersion: V1_TURN_DECISION_SCHEMA_VERSION,
    decisionId: createV1TurnDecisionId({ turnExecutionId: draft.turnExecutionId }),
    decisionIdAlgorithm: V1_TURN_DECISION_ID_ALGORITHM,
    decisionOrdinal: V1_TURN_DECISION_ORDINAL,
    decisionStatus: "SEALED",
    turnExecutionId: draft.turnExecutionId,
    policyVersion: V1_COMPATIBILITY_POLICY,
    contextVersion: draft.contextVersion,
    classification: Object.freeze({ ...draft.classification }),
    response: Object.freeze({
      blocks: Object.freeze(blocks),
      persistedContent: draft.response.persistedContent,
      persistence: draft.response.persistence
        ? Object.freeze({
            ...draft.response.persistence,
            sources: cloneAndFreezeJsonLike(draft.response.persistence.sources),
          })
        : null,
    }),
    provider: Object.freeze({ ...draft.provider }),
    control: Object.freeze({
      schemaVersion: CONVERSATION_CONTROL_SNAPSHOT_SCHEMA_VERSION,
      expectedRevision: draft.controlSnapshot.controlRevision,
      expectedContextVersion: draft.controlSnapshot.currentContextVersion,
      expectedAiActive: draft.controlSnapshot.aiActive,
      expectedPausedByHuman: draft.controlSnapshot.pausedByHuman,
    }),
    authority: draft.authority ? Object.freeze({ ...draft.authority }) : null,
    effects: Object.freeze({ ...draft.effects, operationalHandoff }),
    compatibility: Object.freeze({ ...draft.compatibility }),
  });
}

export class V1TurnDecisionSealer {
  private sealedDecision: V1TurnDecision | null = null;

  seal(draft: V1TurnDecisionDraft): V1TurnDecision {
    if (this.sealedDecision) {
      throw new Error("V1_TURN_DECISION_ALREADY_SEALED");
    }
    this.sealedDecision = freezeDecision(draft);
    return this.sealedDecision;
  }

  get sealed(): V1TurnDecision | null {
    return this.sealedDecision;
  }
}

export function outboundResultForDecision(
  decision: V1TurnDecision,
  result: TurnExecutionOutboundResult,
): TurnExecutionOutboundResult {
  if (!decision.effects.outboundIntended && result !== "NOT_ATTEMPTED") {
    throw new Error("V1_TURN_DECISION_UNEXPECTED_OUTBOUND_RESULT");
  }
  return result;
}
