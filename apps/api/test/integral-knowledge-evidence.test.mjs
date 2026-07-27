import assert from "node:assert/strict";
import test from "node:test";
import { PromptCompilerService } from "../dist/prompt-compiler/prompt-compiler.service.js";

const {
  buildFactualEvidenceArtifact,
  buildProviderEvidenceAnchorsFromText,
  buildProviderEvidenceExcerpt,
  createCanonicalKnowledgeContent,
  createEvidencePreview,
  isFactualEvidenceArtifact,
  packProviderEvidenceExcerpts,
} = await import(
  process.env.KNOWLEDGE_EVIDENCE_TEST_MODULE ??
    "../dist/assistant-knowledge/knowledge-evidence.js"
);

const boundedBudget = Object.freeze({
  maxChunks: 2,
  maxCharsPerExcerpt: 360,
  maxTotalChars: 480,
  maxSpansPerChunk: 2,
  contextCharsBefore: 90,
  contextCharsAfter: 140,
  mergeGapChars: 32,
});

function makeArtifact({
  chunkId = "chunk-1",
  prefixLength = 900,
  score = 0.9,
} = {}) {
  const factualSentence =
    "Serviço: conserto de placa-mãe. Preço: a partir de R$ 395,00.";
  const content = createCanonicalKnowledgeContent(
    `${"Contexto técnico sem preço. ".repeat(Math.ceil(prefixLength / 27)).slice(0, prefixLength)}\n${factualSentence}`,
  );
  const factualStart = content.indexOf(factualSentence);
  return {
    content,
    factualSentence,
    factualStart,
    artifact: buildFactualEvidenceArtifact({
      chunkId,
      knowledgeId: `knowledge-${chunkId}`,
      knowledgeTitle: "Tabela oficial de serviços",
      canonicalContent: content,
      rankingScore: score,
      selectionReason: "RAG_SELECTED",
      factualSpans: [
        {
          startOffset: factualStart,
          endOffset: factualStart + factualSentence.length,
          reason: "OFFICIAL_PRICE_AUTHORITY",
          anchorIds: ["authority-price"],
        },
      ],
      authorityCandidates: [
        {
          authorityType: "PRICE",
          candidateId: `authority-${chunkId}`,
          serviceKey: "placa_mae",
          currency: "BRL",
          amount: 395,
          qualifier: "starting_at",
        },
      ],
    }),
  };
}

test("canonical factual evidence retains content, hash, lengths and immutable factual spans", () => {
  const fixture = makeArtifact();

  assert.ok(fixture.factualStart > 800);
  assert.equal(fixture.artifact.contentLength, fixture.content.length);
  assert.match(fixture.artifact.contentHash, /^[a-f0-9]{64}$/u);
  assert.equal(fixture.artifact.factualSpans[0].spanText, fixture.factualSentence);
  assert.equal(isFactualEvidenceArtifact(fixture.artifact), true);
  assert.equal(Object.isFrozen(fixture.artifact), true);
  assert.equal(Object.isFrozen(fixture.artifact.factualSpans), true);
});

test("observability preview stays truncated and is structurally rejected as factual evidence", () => {
  const fixture = makeArtifact();
  const preview = createEvidencePreview({
    chunkId: fixture.artifact.chunkId,
    canonicalContent: fixture.content,
    maxLength: 250,
  });

  assert.equal(preview.kind, "EVIDENCE_PREVIEW");
  assert.equal(preview.truncated, true);
  assert.equal(preview.previewText.includes("R$ 395,00"), false);
  assert.equal(preview.contentHash, fixture.artifact.contentHash);
  assert.equal("content" in preview, false);
  assert.equal("canonicalContent" in preview, false);
  assert.equal(isFactualEvidenceArtifact(preview), false);
  assert.throws(
    () => buildProviderEvidenceExcerpt({ artifact: preview, budget: boundedBudget }),
    /factual evidence artifact/u,
  );
  assert.throws(
    () =>
      new PromptCompilerService().compile({
        assistant: { name: "Assistente" },
        providerEvidenceItems: [
          {
            id: preview.chunkId,
            title: "Preview não factual",
            evidence: preview,
          },
        ],
        knowledgeItems: [],
        historyMessages: [],
        currentMessage: "Qual o valor?",
      }),
    /bounded provider evidence excerpt/u,
  );
});

test("typed provider evidence excludes the legacy generic transport from the compiled prompt", () => {
  const fixture = makeArtifact();
  const excerpt = buildProviderEvidenceExcerpt({
    artifact: fixture.artifact,
    anchors: buildProviderEvidenceAnchorsFromText(
      fixture.factualSentence,
      "AUTHORITY_SOURCE",
    ),
    budget: boundedBudget,
  });
  const messages = new PromptCompilerService().compile({
    assistant: { name: "Assistente" },
    providerEvidenceItems: [
      {
        id: fixture.artifact.chunkId,
        title: fixture.artifact.knowledgeTitle,
        evidence: excerpt,
      },
    ],
    knowledgeItems: [
      {
        id: "legacy-preview",
        title: "Preview legado",
        content: "PREVIEW_NAO_AUTORITATIVO",
      },
    ],
    historyMessages: [],
    currentMessage: "Qual o valor?",
  });
  const serialized = JSON.stringify(messages);

  assert.match(serialized, /R\$\s*395,00/u);
  assert.doesNotMatch(serialized, /PREVIEW_NAO_AUTORITATIVO/u);
});

test("stable anchors preserve a qualifier and amount located after character 800", () => {
  const fixture = makeArtifact();
  const currentTurnAnchors = buildProviderEvidenceAnchorsFromText(
    "Qual o valor para consertar minha placa-mãe?",
    "CURRENT_TURN",
  );
  const authorityAnchors = buildProviderEvidenceAnchorsFromText(
    fixture.factualSentence,
    "AUTHORITY_SOURCE",
  );
  const excerpt = buildProviderEvidenceExcerpt({
    artifact: fixture.artifact,
    anchors: [...currentTurnAnchors, ...authorityAnchors],
    budget: boundedBudget,
  });

  assert.ok(excerpt.startOffset > 250);
  assert.ok(excerpt.excerptText.length <= boundedBudget.maxCharsPerExcerpt);
  assert.match(excerpt.excerptText, /a partir de R\$ 395,00/u);
  assert.equal(excerpt.factualCoverageStatus, "COMPLETE");
  assert.equal(
    excerpt.spans
      .map((span) =>
        fixture.content.slice(span.sourceStartOffset, span.sourceEndOffset),
      )
      .join("\n…\n"),
    excerpt.excerptText,
  );

  const reordered = buildProviderEvidenceAnchorsFromText(
    "Qual o valor para consertar minha placa-mãe?",
    "CURRENT_TURN",
  );
  assert.deepEqual(reordered, currentTurnAnchors);
});

test("nearby factual anchors merge while preserving stable offsets", () => {
  const canonicalContent = createCanonicalKnowledgeContent(
    `${"x".repeat(500)} Preço oficial: a partir de R$ 395,00 para placa-mãe.`,
  );
  const startOffset = canonicalContent.indexOf("Preço oficial");
  const artifact = buildFactualEvidenceArtifact({
    chunkId: "chunk-nearby",
    knowledgeId: "knowledge-nearby",
    knowledgeTitle: "Preço oficial",
    canonicalContent,
    rankingScore: 1,
    selectionReason: "AUTHORITY",
    factualSpans: [
      {
        startOffset,
        endOffset: canonicalContent.length,
        reason: "PRICE",
      },
    ],
  });
  const excerpt = buildProviderEvidenceExcerpt({
    artifact,
    anchors: buildProviderEvidenceAnchorsFromText(
      "Preço: a partir de R$ 395,00 para placa-mãe",
      "AUTHORITY_SOURCE",
    ),
    budget: boundedBudget,
  });

  assert.equal(excerpt.spans.length, 1);
  assert.match(excerpt.excerptText, /a partir de R\$ 395,00/u);
  assert.equal(excerpt.factualCoverageStatus, "COMPLETE");
});

test("provider evidence pack enforces per-chunk and global budgets in stable rank order", () => {
  const first = makeArtifact({ chunkId: "chunk-a", prefixLength: 850, score: 0.95 });
  const second = makeArtifact({ chunkId: "chunk-b", prefixLength: 820, score: 0.8 });
  const third = makeArtifact({ chunkId: "chunk-c", prefixLength: 810, score: 0.7 });
  const sharedAnchors = buildProviderEvidenceAnchorsFromText(
    "placa-mãe preço",
    "CURRENT_TURN",
  );
  const pack = packProviderEvidenceExcerpts({
    artifacts: [third.artifact, first.artifact, second.artifact],
    sharedAnchors,
    budget: boundedBudget,
  });

  assert.deepEqual(pack.selectedChunkIds, ["chunk-a", "chunk-b"]);
  assert.deepEqual(pack.droppedChunkIds, ["chunk-c"]);
  assert.ok(pack.excerpts.every((excerpt) => excerpt.excerptText.length <= 360));
  assert.ok(pack.totalExcerptChars <= boundedBudget.maxTotalChars);
  assert.equal(
    pack.totalExcerptChars,
    pack.excerpts.reduce((sum, excerpt) => sum + excerpt.excerptText.length, 0),
  );
});

test("tight budget reports partial coverage instead of inventing complete coverage", () => {
  const content = createCanonicalKnowledgeContent(
    `Primeiro fato oficial ${"x".repeat(600)} Segundo fato oficial`,
  );
  const firstStart = content.indexOf("Primeiro fato oficial");
  const secondStart = content.indexOf("Segundo fato oficial");
  const artifact = buildFactualEvidenceArtifact({
    chunkId: "chunk-partial",
    knowledgeId: "knowledge-partial",
    knowledgeTitle: "Dois fatos",
    canonicalContent: content,
    rankingScore: 1,
    selectionReason: "TEST",
    factualSpans: [
      {
        startOffset: firstStart,
        endOffset: firstStart + "Primeiro fato oficial".length,
        reason: "FIRST",
      },
      {
        startOffset: secondStart,
        endOffset: secondStart + "Segundo fato oficial".length,
        reason: "SECOND",
      },
    ],
  });
  const excerpt = buildProviderEvidenceExcerpt({
    artifact,
    budget: {
      ...boundedBudget,
      maxCharsPerExcerpt: 80,
      maxTotalChars: 80,
      maxSpansPerChunk: 1,
      contextCharsBefore: 10,
      contextCharsAfter: 10,
    },
  });

  assert.equal(excerpt.factualCoverageStatus, "PARTIAL");
  assert.ok(excerpt.excerptText.length <= 80);
});
