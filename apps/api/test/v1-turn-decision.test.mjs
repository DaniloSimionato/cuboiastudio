import assert from "node:assert/strict";
import { test } from "node:test";
import {
  V1_TURN_DECISION_EXECUTOR_OWNER,
  V1_TURN_DECISION_ID_ALGORITHM,
  V1_TURN_DECISION_ORDINAL,
  V1_TURN_DECISION_SCHEMA_VERSION,
  V1TurnDecisionSealer,
  createV1TurnDecisionId,
  outboundResultForDecision,
} from "../dist/assistant-conversations/v1-turn-decision.js";

function draft(overrides = {}) {
  return {
    turnExecutionId: "turn_v1_0123456789abcdef0123456789abcdef",
    contextVersion: 2,
    classification: {
      type: "DETERMINISTIC_RESPONSE",
      terminalPath: "DETERMINISTIC_PRICE_AUTHORITY",
      terminalReasonCode: "DETERMINISTIC_PRICE_AUTHORITY",
      strategy: "DETERMINISTIC_PRICE_AUTHORITY",
      providerDisposition: "PROHIBITED",
      legacyCapability: null,
    },
    response: {
      blocks: [{ ordinal: 1, content: "Resposta oficial." }],
      persistedContent: "Resposta oficial.",
      persistence: {
        source: "chatwoot",
        mode: "rag",
        contextVersion: 2,
        sources: [{ id: "authority-test", metadata: { selected: true } }],
      },
    },
    provider: {
      used: false,
      finalGenerationCount: 0,
      skipReason: "OFFICIAL_AUTHORITY",
    },
    authority: {
      id: "authority-test",
      serviceKey: "formatacao",
      currency: "BRL",
      amount: 1950,
      qualifier: "starting_at",
    },
    effects: {
      persistLocalResponse: true,
      finalizeRuntimeLog: true,
      outboundIntended: true,
      sender: "CHATWOOT_V1",
      stateEffect: "NONE",
    },
    compatibility: {
      runtimeMode: "rag",
      runtimeReason: "DETERMINISTIC_PRICE_AUTHORITY",
      expectedOutcome: "success",
    },
    ...overrides,
  };
}

test("decisionId é determinístico, versionado, ordinal único e não contém PII", () => {
  const turnExecutionId = "turn_v1_0123456789abcdef0123456789abcdef";
  const first = createV1TurnDecisionId({ turnExecutionId });
  const second = createV1TurnDecisionId({
    policyVersion: "V1_COMPATIBILITY_POLICY",
    decisionOrdinal: 1,
    turnExecutionId,
  });

  assert.equal(first, second);
  assert.match(first, /^decision_v1_[a-f0-9]{32}$/);
  assert.equal(V1_TURN_DECISION_ID_ALGORITHM, "sha256/v1-turn-decision-v1");
  assert.equal(V1_TURN_DECISION_ORDINAL, 1);
  assert.doesNotMatch(first, /Resposta oficial|telefone|token|authorization/i);
});

test("decisão selada é tipada, profundamente imutável e preserva efeito legado", () => {
  const decision = new V1TurnDecisionSealer().seal(
    draft({
      effects: {
        ...draft().effects,
        stateEffect: "LEGACY_HANDOFF_TEXT_ONLY",
      },
    }),
  );

  assert.equal(decision.schemaVersion, V1_TURN_DECISION_SCHEMA_VERSION);
  assert.equal(decision.decisionStatus, "SEALED");
  assert.equal(decision.decisionOrdinal, 1);
  assert.equal(decision.policyVersion, "V1_COMPATIBILITY_POLICY");
  assert.equal(V1_TURN_DECISION_EXECUTOR_OWNER, "V1_TURN_DECISION_EXECUTOR");
  assert.equal(decision.effects.stateEffect, "LEGACY_HANDOFF_TEXT_ONLY");
  assert.equal(Object.isFrozen(decision), true);
  assert.equal(Object.isFrozen(decision.response.blocks), true);
  assert.equal(Object.isFrozen(decision.response.persistence.sources), true);
  assert.equal(Object.isFrozen(decision.response.persistence.sources[0].metadata), true);
  assert.throws(() => {
    decision.response.persistence.sources[0].metadata.selected = false;
  }, TypeError);
});

test("o mesmo turno reutiliza o mesmo decisionId sem depender do conteúdo", () => {
  const first = new V1TurnDecisionSealer().seal(draft());
  const second = new V1TurnDecisionSealer().seal(
    draft({
      response: {
        ...draft().response,
        blocks: [{ ordinal: 1, content: "Outro draft que não participa do ID." }],
        persistedContent: "Outro draft que não participa do ID.",
      },
    }),
  );

  assert.equal(first.decisionId, second.decisionId);
});

test("um sealer rejeita um segundo selamento na mesma execução", () => {
  const sealer = new V1TurnDecisionSealer();
  const first = sealer.seal(draft());

  assert.equal(sealer.sealed, first);
  assert.throws(() => sealer.seal(draft()), /V1_TURN_DECISION_ALREADY_SEALED/);
});

test("compatibilidade V1 permite persistir draft vazio já produzido por tool flow", () => {
  const decision = new V1TurnDecisionSealer().seal(
    draft({
      response: {
        blocks: [],
        persistedContent: "",
        persistence: {
          source: "manual",
          mode: "ai-runtime",
          contextVersion: 2,
          sources: null,
        },
      },
      effects: {
        ...draft().effects,
        outboundIntended: false,
        sender: "NOT_APPLICABLE",
      },
    }),
  );

  assert.equal(decision.response.persistedContent, "");
  assert.equal(decision.response.blocks.length, 0);
});

test("resultado outbound distingue NOT_ATTEMPTED, ACKNOWLEDGED e FAILED", () => {
  const outboundDecision = new V1TurnDecisionSealer().seal(draft());
  assert.equal(
    outboundResultForDecision(outboundDecision, "ACKNOWLEDGED"),
    "ACKNOWLEDGED",
  );
  assert.equal(outboundResultForDecision(outboundDecision, "FAILED"), "FAILED");

  const localDecision = new V1TurnDecisionSealer().seal(
    draft({
      response: {
        blocks: [],
        persistedContent: "Resposta local.",
        persistence: {
          source: "manual",
          mode: "manual",
          contextVersion: 2,
          sources: null,
        },
      },
      effects: {
        ...draft().effects,
        outboundIntended: false,
        sender: "NOT_APPLICABLE",
      },
    }),
  );
  assert.equal(
    outboundResultForDecision(localDecision, "NOT_ATTEMPTED"),
    "NOT_ATTEMPTED",
  );
  assert.throws(
    () => outboundResultForDecision(localDecision, "ACKNOWLEDGED"),
    /V1_TURN_DECISION_UNEXPECTED_OUTBOUND_RESULT/,
  );
});
