import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTurnExecutionId,
  createTurnExecutionManifest,
  finalizeTurnExecutionManifest,
  withTurnExecutionEvidence,
} from "../dist/assistant-conversations/turn-execution-manifest.js";
import {
  buildFactualEvidenceArtifact,
  buildProviderEvidenceAnchorsFromText,
  createCanonicalKnowledgeContent,
  createEvidencePreview,
  packProviderEvidenceExcerpts,
} from "../dist/assistant-knowledge/knowledge-evidence.js";

const canonicalIdentity = {
  companyId: "company-test",
  assistantId: "assistant-test",
  source: "chatwoot",
  accountId: "account-test",
  inboxId: "inbox-test",
  externalConversationId: "conversation-external",
  externalMessageId: "message-external",
  contextVersion: 2,
  internalConversationId: "conversation-internal",
  internalMessageId: "message-internal",
};

test("turn execution id é determinístico e não serializa conteúdo", () => {
  const first = createTurnExecutionId(canonicalIdentity);
  const second = createTurnExecutionId({
    contextVersion: 2,
    externalMessageId: "message-external",
    companyId: "company-test",
    assistantId: "assistant-test",
    source: "chatwoot",
    accountId: "account-test",
    inboxId: "inbox-test",
    externalConversationId: "conversation-external",
    internalConversationId: "conversation-internal",
    internalMessageId: "message-internal",
  });

  assert.equal(first, second);
  assert.match(first, /^turn_v1_[a-f0-9]{32}$/);
  assert.doesNotMatch(first, /message-external|company-test/);
});

test("manifesto preserva cobertura de fragmento sem conteúdo integral", () => {
  const base = createTurnExecutionManifest({
    identity: canonicalIdentity,
    requestId: "request-test",
    correlationId: "correlation-test",
    aiActive: true,
    pausedByHuman: false,
    sessionState: "ACTIVE",
    capturedAt: "2026-07-24T00:00:00.000Z",
    fragmentCount: 3,
    fragmentIdentityCoverage: "FIRST_FRAGMENT_ONLY",
    normalizedContentHash: "sha256-content-only",
    normalizedContentLength: 42,
  });
  const manifest = finalizeTurnExecutionManifest(base, {
    terminal: { path: "PROVIDER_STANDARD", reasonCode: "PROVIDER_STANDARD" },
    routing: base.routing,
    provider: {
      ...base.provider,
      finalGeneration: { observation: "OBSERVED", count: 1 },
    },
    outbound: {
      planned: true,
      attempted: true,
      attemptCount: 1,
      sender: "CHATWOOT_V1",
      externalMessageId: "outbound-message-id",
      result: "ACKNOWLEDGED",
    },
  });

  assert.equal(manifest.policyVersion, "V1_COMPATIBILITY_POLICY");
  assert.equal(manifest.inbound.fragmentCount, 3);
  assert.equal(manifest.inbound.fragmentIdentityCoverage, "FIRST_FRAGMENT_ONLY");
  assert.equal(manifest.inbound.normalizedContentHash, "sha256-content-only");
  assert.doesNotMatch(JSON.stringify(manifest), /conteúdo integral|telefone|token/);
});

test("manifesto registra hashes, offsets e orçamento sem persistir evidência integral", () => {
  const sensitiveCanonicalText =
    `${"CONTEUDO_CANONICO_NAO_PERSISTIR ".repeat(30)}` +
    "O reparo de placa-mãe custa a partir de R$ 395,00. TOKEN_NAO_PERSISTIR";
  const canonicalContent = createCanonicalKnowledgeContent(sensitiveCanonicalText);
  const factualStart = canonicalContent.indexOf("O reparo de placa-mãe");
  const artifact = buildFactualEvidenceArtifact({
    chunkId: "chunk-evidence",
    knowledgeId: "knowledge-evidence",
    knowledgeTitle: "Autoridade oficial",
    canonicalContent,
    rankingScore: 0.98,
    selectionReason: "score_at_or_above_threshold",
    factualSpans: [
      {
        startOffset: factualStart,
        endOffset: canonicalContent.indexOf(".", factualStart) + 1,
        reason: "OFFICIAL_PRICE_AUTHORITY",
      },
    ],
    authorityCandidates: [
      {
        authorityType: "PRICE",
        candidateId: "price-authority-technical-id",
        serviceKey: "placa_mae",
        currency: "BRL",
        amount: 395,
        qualifier: "starting_at",
      },
    ],
  });
  const preview = createEvidencePreview({
    chunkId: artifact.chunkId,
    canonicalContent,
    maxLength: 250,
  });
  const providerPack = packProviderEvidenceExcerpts({
    artifacts: [artifact],
    sharedAnchors: buildProviderEvidenceAnchorsFromText(
      "Qual o valor do reparo de placa-mãe?",
      "CURRENT_TURN",
    ),
  });
  const base = createTurnExecutionManifest({
    identity: canonicalIdentity,
    requestId: "request-evidence",
    correlationId: "correlation-evidence",
    aiActive: true,
    pausedByHuman: false,
    sessionState: "ACTIVE",
    capturedAt: "2026-07-24T00:00:00.000Z",
    fragmentCount: 1,
    fragmentIdentityCoverage: "COMPLETE",
    normalizedContentHash: "sha256-inbound",
    normalizedContentLength: 38,
  });
  const manifest = withTurnExecutionEvidence({
    manifest: base,
    artifacts: [artifact],
    previews: [preview],
    providerPack,
    queryEmbeddingCacheStatus: "MISS",
    candidateAuthorityCount: 1,
    eligibleAuthorityCount: 1,
    selectedAuthority: {
      chunkId: artifact.chunkId,
      serviceKey: "placa_mae",
      currency: "BRL",
      amount: 395,
      qualifier: "starting_at",
    },
  });

  assert.equal(manifest.evidence.schemaVersion, "knowledge-evidence-v1");
  assert.equal(manifest.evidence.items[0].contentLength, canonicalContent.length);
  assert.match(manifest.evidence.items[0].contentHash, /^[a-f0-9]{64}$/u);
  assert.equal(manifest.evidence.items[0].previewTruncated, true);
  assert.equal(manifest.evidence.items[0].factualSpans.length, 1);
  assert.ok(manifest.evidence.provider.totalExcerptChars <= 4_800);
  assert.equal(manifest.evidence.authority.selected?.serviceKey, "placa_mae");
  const serialized = JSON.stringify(manifest);
  assert.equal(serialized.includes(sensitiveCanonicalText), false);
  assert.doesNotMatch(serialized, /CONTEUDO_CANONICO_NAO_PERSISTIR/);
  assert.doesNotMatch(serialized, /TOKEN_NAO_PERSISTIR/);
  assert.doesNotMatch(serialized, /O reparo de placa-mãe custa/);
});
