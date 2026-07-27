import { createHash } from "node:crypto";

export const KNOWLEDGE_EVIDENCE_SCHEMA_VERSION = "knowledge-evidence-v1" as const;

declare const canonicalKnowledgeContentBrand: unique symbol;

/**
 * Complete text loaded from the canonical knowledge chunk.
 *
 * The brand prevents an arbitrary preview/excerpt string from satisfying the
 * contract at compile time. Instances must be created through
 * `createCanonicalKnowledgeContent`.
 */
export type CanonicalKnowledgeContent = string & {
  readonly [canonicalKnowledgeContentBrand]: "CanonicalKnowledgeContent";
};

export type FactualEvidenceSourceType =
  | "KNOWLEDGE_CHUNK"
  | "OFFICIAL_DOCUMENT"
  | "RAG_DOCUMENT";

export type FactualEvidenceSpanInput = {
  startOffset: number;
  endOffset: number;
  reason: string;
  anchorIds?: readonly string[];
};

export type FactualEvidenceSpan = Readonly<{
  startOffset: number;
  endOffset: number;
  spanText: string;
  reason: string;
  anchorIds: readonly string[];
}>;

export type FactualEvidenceAuthorityCandidate = Readonly<{
  authorityType: string;
  candidateId: string;
  serviceKey?: string | null;
  currency?: string | null;
  amount?: number | null;
  qualifier?: string | null;
}>;

export type FactualEvidenceArtifact = Readonly<{
  kind: "FACTUAL_EVIDENCE_ARTIFACT";
  schemaVersion: typeof KNOWLEDGE_EVIDENCE_SCHEMA_VERSION;
  chunkId: string;
  knowledgeId: string;
  knowledgeTitle: string;
  canonicalContent: CanonicalKnowledgeContent;
  contentHash: string;
  contentLength: number;
  rankingScore: number;
  selectionReason: string;
  sourceType: FactualEvidenceSourceType;
  fullContentAvailability: "AVAILABLE";
  factualSpans: readonly FactualEvidenceSpan[];
  authorityCandidates: readonly FactualEvidenceAuthorityCandidate[];
}>;

export type EvidencePreview = Readonly<{
  kind: "EVIDENCE_PREVIEW";
  schemaVersion: typeof KNOWLEDGE_EVIDENCE_SCHEMA_VERSION;
  chunkId: string;
  previewText: string;
  previewLength: number;
  originalLength: number;
  truncated: boolean;
  contentHash: string;
}>;

export type ProviderEvidenceAnchorKind =
  | "CURRENT_TURN_TERM"
  | "SERVICE"
  | "AUTHORITY"
  | "CURRENCY"
  | "AMOUNT"
  | "QUALIFIER"
  | "HEADING"
  | "LABEL";

export type ProviderEvidenceAnchor = Readonly<{
  id: string;
  value: string;
  kind: ProviderEvidenceAnchorKind;
  priority?: number;
}>;

export type ProviderEvidenceAnchorSource = "CURRENT_TURN" | "AUTHORITY_SOURCE";

export type ProviderEvidenceBudget = Readonly<{
  maxChunks: number;
  maxCharsPerExcerpt: number;
  maxTotalChars: number;
  maxSpansPerChunk: number;
  contextCharsBefore: number;
  contextCharsAfter: number;
  mergeGapChars: number;
}>;

export const DEFAULT_PROVIDER_EVIDENCE_BUDGET: ProviderEvidenceBudget = Object.freeze({
  maxChunks: 5,
  maxCharsPerExcerpt: 1_600,
  maxTotalChars: 4_800,
  maxSpansPerChunk: 4,
  contextCharsBefore: 180,
  contextCharsAfter: 320,
  mergeGapChars: 48,
});

export type ProviderEvidenceExcerptSpan = Readonly<{
  sourceStartOffset: number;
  sourceEndOffset: number;
  excerptStartOffset: number;
  excerptEndOffset: number;
  anchorIds: readonly string[];
}>;

export type ProviderEvidenceExcerpt = Readonly<{
  kind: "PROVIDER_EVIDENCE_EXCERPT";
  schemaVersion: typeof KNOWLEDGE_EVIDENCE_SCHEMA_VERSION;
  chunkId: string;
  knowledgeId: string;
  excerptText: string;
  startOffset: number;
  endOffset: number;
  truncationStatus:
    | "NOT_TRUNCATED"
    | "TRUNCATED_AROUND_ANCHORS"
    | "TRUNCATED_TO_BUDGET"
    | "NO_RELEVANT_SPAN";
  selectionAnchors: readonly Readonly<{
    id: string;
    kind: ProviderEvidenceAnchorKind;
    sourceStartOffset: number;
    sourceEndOffset: number;
  }>[];
  contentHash: string;
  factualCoverageStatus: "COMPLETE" | "PARTIAL" | "NONE";
  spans: readonly ProviderEvidenceExcerptSpan[];
  budget: Readonly<{
    maxChars: number;
    usedChars: number;
  }>;
}>;

export type ProviderEvidencePack = Readonly<{
  schemaVersion: typeof KNOWLEDGE_EVIDENCE_SCHEMA_VERSION;
  excerpts: readonly ProviderEvidenceExcerpt[];
  selectedChunkIds: readonly string[];
  droppedChunkIds: readonly string[];
  totalExcerptChars: number;
  budget: ProviderEvidenceBudget;
  factualCoverageStatus: "COMPLETE" | "PARTIAL" | "NONE";
}>;

export function isProviderEvidenceExcerpt(value: unknown): value is ProviderEvidenceExcerpt {
  if (!value || typeof value !== "object") return false;
  const excerpt = value as Partial<ProviderEvidenceExcerpt>;
  return (
    excerpt.kind === "PROVIDER_EVIDENCE_EXCERPT" &&
    excerpt.schemaVersion === KNOWLEDGE_EVIDENCE_SCHEMA_VERSION &&
    typeof excerpt.chunkId === "string" &&
    excerpt.chunkId.length > 0 &&
    typeof excerpt.knowledgeId === "string" &&
    excerpt.knowledgeId.length > 0 &&
    typeof excerpt.excerptText === "string" &&
    typeof excerpt.startOffset === "number" &&
    Number.isSafeInteger(excerpt.startOffset) &&
    excerpt.startOffset >= 0 &&
    typeof excerpt.endOffset === "number" &&
    Number.isSafeInteger(excerpt.endOffset) &&
    excerpt.endOffset >= excerpt.startOffset &&
    typeof excerpt.contentHash === "string" &&
    /^[a-f0-9]{64}$/u.test(excerpt.contentHash) &&
    Array.isArray(excerpt.selectionAnchors) &&
    Array.isArray(excerpt.spans) &&
    Boolean(excerpt.budget) &&
    typeof excerpt.budget?.usedChars === "number" &&
    excerpt.budget.usedChars === excerpt.excerptText.length
  );
}

type AnchorOccurrence = {
  id: string;
  kind: ProviderEvidenceAnchorKind;
  priority: number;
  startOffset: number;
  endOffset: number;
};

type CandidateSpan = {
  startOffset: number;
  endOffset: number;
  priority: number;
  anchorOccurrences: AnchorOccurrence[];
  targetRanges: Array<{ startOffset: number; endOffset: number }>;
};

const EXCERPT_SPAN_SEPARATOR = "\n…\n";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertNonEmptyTechnicalId(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}

function freezeStrings(values: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...(values ?? [])]);
}

function validateBudget(budget: ProviderEvidenceBudget): ProviderEvidenceBudget {
  assertPositiveInteger(budget.maxChunks, "budget.maxChunks");
  assertPositiveInteger(budget.maxCharsPerExcerpt, "budget.maxCharsPerExcerpt");
  assertPositiveInteger(budget.maxTotalChars, "budget.maxTotalChars");
  assertPositiveInteger(budget.maxSpansPerChunk, "budget.maxSpansPerChunk");
  assertNonNegativeInteger(budget.contextCharsBefore, "budget.contextCharsBefore");
  assertNonNegativeInteger(budget.contextCharsAfter, "budget.contextCharsAfter");
  assertNonNegativeInteger(budget.mergeGapChars, "budget.mergeGapChars");
  return Object.freeze({ ...budget });
}

export function createCanonicalKnowledgeContent(value: string): CanonicalKnowledgeContent {
  if (typeof value !== "string") {
    throw new TypeError("Canonical knowledge content must be a string");
  }
  return value as CanonicalKnowledgeContent;
}

export function hashKnowledgeContent(value: CanonicalKnowledgeContent | string): string {
  if (typeof value !== "string") {
    throw new TypeError("Knowledge content must be a string");
  }
  return sha256(value);
}

function buildFactualSpans(
  canonicalContent: CanonicalKnowledgeContent,
  inputs: readonly FactualEvidenceSpanInput[],
): readonly FactualEvidenceSpan[] {
  const contentLength = canonicalContent.length;
  const sorted = [...inputs].sort(
    (left, right) =>
      left.startOffset - right.startOffset ||
      left.endOffset - right.endOffset ||
      left.reason.localeCompare(right.reason),
  );
  return Object.freeze(
    sorted.map((span) => {
      assertNonNegativeInteger(span.startOffset, "factualSpan.startOffset");
      assertNonNegativeInteger(span.endOffset, "factualSpan.endOffset");
      if (span.endOffset <= span.startOffset || span.endOffset > contentLength) {
        throw new RangeError("Factual evidence span must be within canonical content");
      }
      assertNonEmptyTechnicalId(span.reason, "factualSpan.reason");
      return Object.freeze({
        startOffset: span.startOffset,
        endOffset: span.endOffset,
        spanText: canonicalContent.slice(span.startOffset, span.endOffset),
        reason: span.reason,
        anchorIds: freezeStrings(span.anchorIds),
      });
    }),
  );
}

export function buildFactualEvidenceArtifact(input: {
  chunkId: string;
  knowledgeId: string;
  knowledgeTitle: string;
  canonicalContent: CanonicalKnowledgeContent;
  rankingScore: number;
  selectionReason: string;
  sourceType?: FactualEvidenceSourceType;
  factualSpans?: readonly FactualEvidenceSpanInput[];
  authorityCandidates?: readonly FactualEvidenceAuthorityCandidate[];
}): FactualEvidenceArtifact {
  assertNonEmptyTechnicalId(input.chunkId, "chunkId");
  assertNonEmptyTechnicalId(input.knowledgeId, "knowledgeId");
  assertNonEmptyTechnicalId(input.knowledgeTitle, "knowledgeTitle");
  assertNonEmptyTechnicalId(input.selectionReason, "selectionReason");
  if (typeof input.canonicalContent !== "string") {
    throw new TypeError("canonicalContent must be created from canonical knowledge text");
  }
  if (!Number.isFinite(input.rankingScore)) {
    throw new TypeError("rankingScore must be finite");
  }

  const authorityCandidates = Object.freeze(
    [...(input.authorityCandidates ?? [])].map((candidate) =>
      Object.freeze({ ...candidate }),
    ),
  );
  return Object.freeze({
    kind: "FACTUAL_EVIDENCE_ARTIFACT",
    schemaVersion: KNOWLEDGE_EVIDENCE_SCHEMA_VERSION,
    chunkId: input.chunkId,
    knowledgeId: input.knowledgeId,
    knowledgeTitle: input.knowledgeTitle,
    canonicalContent: input.canonicalContent,
    contentHash: hashKnowledgeContent(input.canonicalContent),
    contentLength: input.canonicalContent.length,
    rankingScore: input.rankingScore,
    selectionReason: input.selectionReason,
    sourceType: input.sourceType ?? "KNOWLEDGE_CHUNK",
    fullContentAvailability: "AVAILABLE",
    factualSpans: buildFactualSpans(input.canonicalContent, input.factualSpans ?? []),
    authorityCandidates,
  });
}

export function isFactualEvidenceArtifact(value: unknown): value is FactualEvidenceArtifact {
  if (!value || typeof value !== "object") return false;
  const artifact = value as Partial<FactualEvidenceArtifact>;
  return (
    artifact.kind === "FACTUAL_EVIDENCE_ARTIFACT" &&
    artifact.schemaVersion === KNOWLEDGE_EVIDENCE_SCHEMA_VERSION &&
    typeof artifact.chunkId === "string" &&
    artifact.chunkId.length > 0 &&
    typeof artifact.knowledgeId === "string" &&
    artifact.knowledgeId.length > 0 &&
    typeof artifact.knowledgeTitle === "string" &&
    typeof artifact.canonicalContent === "string" &&
    typeof artifact.contentLength === "number" &&
    artifact.contentLength === artifact.canonicalContent.length &&
    typeof artifact.contentHash === "string" &&
    artifact.contentHash === hashKnowledgeContent(artifact.canonicalContent) &&
    typeof artifact.rankingScore === "number" &&
    Number.isFinite(artifact.rankingScore) &&
    artifact.fullContentAvailability === "AVAILABLE" &&
    Array.isArray(artifact.factualSpans) &&
    Array.isArray(artifact.authorityCandidates)
  );
}

export function createEvidencePreview(input: {
  chunkId: string;
  canonicalContent: CanonicalKnowledgeContent;
  maxLength?: number;
}): EvidencePreview {
  assertNonEmptyTechnicalId(input.chunkId, "chunkId");
  if (typeof input.canonicalContent !== "string") {
    throw new TypeError("canonicalContent must be a string");
  }
  const maxLength = input.maxLength ?? 250;
  assertPositiveInteger(maxLength, "maxLength");
  const truncated = input.canonicalContent.length > maxLength;
  const previewText = truncated
    ? `${input.canonicalContent.slice(0, maxLength)}...`
    : input.canonicalContent;
  return Object.freeze({
    kind: "EVIDENCE_PREVIEW",
    schemaVersion: KNOWLEDGE_EVIDENCE_SCHEMA_VERSION,
    chunkId: input.chunkId,
    previewText,
    previewLength: previewText.length,
    originalLength: input.canonicalContent.length,
    truncated,
    contentHash: hashKnowledgeContent(input.canonicalContent),
  });
}

function foldWithOffsets(value: string): {
  folded: string;
  starts: number[];
  ends: number[];
} {
  let folded = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let sourceOffset = 0;
  for (const sourceCharacter of value) {
    const sourceEnd = sourceOffset + sourceCharacter.length;
    const normalized = sourceCharacter
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("pt-BR");
    folded += normalized;
    for (let index = 0; index < normalized.length; index += 1) {
      starts.push(sourceOffset);
      ends.push(sourceEnd);
    }
    sourceOffset = sourceEnd;
  }
  return { folded, starts, ends };
}

function normalizedAnchor(value: string): string {
  return foldWithOffsets(value.trim()).folded;
}

const PORTUGUESE_ANCHOR_STOPWORDS = new Set([
  "a",
  "ao",
  "aos",
  "as",
  "com",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "esta",
  "este",
  "eu",
  "minha",
  "meu",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "por",
  "pra",
  "qual",
  "que",
  "um",
  "uma",
]);

type TextAnchorCandidate = {
  value: string;
  kind: ProviderEvidenceAnchorKind;
  priority: number;
};

function collectPatternCandidates(
  text: string,
  pattern: RegExp,
  kind: ProviderEvidenceAnchorKind,
  priority: number,
): TextAnchorCandidate[] {
  return [...text.matchAll(pattern)]
    .map((match) => match[0]?.trim() ?? "")
    .filter((value) => value.length > 0)
    .map((value) => ({ value, kind, priority }));
}

/**
 * Builds deterministic, ephemeral anchors from text already available to the
 * runtime. Values are never embedded in their IDs; IDs use a short hash so
 * telemetry can reference an anchor without duplicating turn/source text.
 */
export function buildProviderEvidenceAnchorsFromText(
  text: string,
  source: ProviderEvidenceAnchorSource = "CURRENT_TURN",
): readonly ProviderEvidenceAnchor[] {
  if (typeof text !== "string") {
    throw new TypeError("Provider evidence anchor source must be a string");
  }
  const sourcePriority = source === "AUTHORITY_SOURCE" ? 300 : 200;
  const candidates: TextAnchorCandidate[] = [];

  candidates.push(
    ...collectPatternCandidates(
      text,
      /(?:R\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/giu,
      "AMOUNT",
      sourcePriority + 70,
    ),
    ...collectPatternCandidates(
      text,
      /R\$|\bBRL\b|\breais?\b/giu,
      "CURRENCY",
      sourcePriority + 65,
    ),
    ...collectPatternCandidates(
      text,
      /\ba\s+partir\s+de\b|\bstarting_at\b|\bpre[cç]o\s+fixo\b|\bvalor\s+fixo\b/giu,
      "QUALIFIER",
      sourcePriority + 60,
    ),
    ...collectPatternCandidates(
      text,
      /\bpre[cç]o\b|\bvalor\b|\bservi[cç]o\b|\bqualifier\b|\bmoeda\b/giu,
      "LABEL",
      sourcePriority + 40,
    ),
  );

  for (const line of text.split(/\r?\n/u)) {
    const heading = line.match(/^\s{0,3}([^:\n]{2,80}):(?:\s|$)/u)?.[1]?.trim();
    if (heading) {
      candidates.push({
        value: heading,
        kind: "HEADING",
        priority: sourcePriority + 35,
      });
    }
  }

  const lexicalTerms =
    text.match(/[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*/gu) ?? [];
  for (const term of lexicalTerms) {
    const normalized = normalizedAnchor(term);
    if (
      normalized.length < 3 ||
      PORTUGUESE_ANCHOR_STOPWORDS.has(normalized) ||
      /^\d+$/u.test(normalized)
    ) {
      continue;
    }
    candidates.push({
      value: term,
      kind: source === "CURRENT_TURN" ? "CURRENT_TURN_TERM" : "AUTHORITY",
      priority: sourcePriority,
    });
  }

  const unique = new Map<string, TextAnchorCandidate>();
  for (const candidate of candidates) {
    const normalized = normalizedAnchor(candidate.value);
    if (normalized.length === 0) continue;
    const key = `${candidate.kind}\u0000${normalized}`;
    const existing = unique.get(key);
    if (!existing || candidate.priority > existing.priority) {
      unique.set(key, candidate);
    }
  }

  return Object.freeze(
    [...unique.entries()]
      .sort(
        ([leftKey, left], [rightKey, right]) =>
          right.priority - left.priority || leftKey.localeCompare(rightKey),
      )
      .map(([key, candidate]) =>
        Object.freeze({
          id: `anchor:${source.toLowerCase()}:${sha256(key).slice(0, 16)}`,
          value: candidate.value,
          kind: candidate.kind,
          priority: candidate.priority,
        }),
      ),
  );
}

function findAnchorOccurrences(
  content: CanonicalKnowledgeContent,
  anchors: readonly ProviderEvidenceAnchor[],
): AnchorOccurrence[] {
  const foldedContent = foldWithOffsets(content);
  const normalizedAnchors = [...anchors]
    .map((anchor) => ({
      ...anchor,
      normalized: normalizedAnchor(anchor.value),
      priority: Number.isFinite(anchor.priority) ? Number(anchor.priority) : 0,
    }))
    .filter((anchor) => anchor.id.trim().length > 0 && anchor.normalized.length > 0)
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.id.localeCompare(right.id) ||
        left.normalized.localeCompare(right.normalized),
    );

  const occurrences: AnchorOccurrence[] = [];
  for (const anchor of normalizedAnchors) {
    let searchOffset = 0;
    while (searchOffset < foldedContent.folded.length) {
      const index = foldedContent.folded.indexOf(anchor.normalized, searchOffset);
      if (index < 0) break;
      const lastIndex = index + anchor.normalized.length - 1;
      occurrences.push({
        id: anchor.id,
        kind: anchor.kind,
        priority: anchor.priority,
        startOffset: foldedContent.starts[index] ?? index,
        endOffset: foldedContent.ends[lastIndex] ?? index + anchor.normalized.length,
      });
      searchOffset = index + Math.max(1, anchor.normalized.length);
    }
  }
  return occurrences.sort(
    (left, right) =>
      right.priority - left.priority ||
      left.startOffset - right.startOffset ||
      left.endOffset - right.endOffset ||
      left.id.localeCompare(right.id),
  );
}

function occurrenceWindow(
  occurrence: AnchorOccurrence,
  contentLength: number,
  budget: ProviderEvidenceBudget,
): CandidateSpan {
  return {
    startOffset: Math.max(0, occurrence.startOffset - budget.contextCharsBefore),
    endOffset: Math.min(contentLength, occurrence.endOffset + budget.contextCharsAfter),
    priority: occurrence.priority,
    anchorOccurrences: [occurrence],
    targetRanges: [
      {
        startOffset: occurrence.startOffset,
        endOffset: occurrence.endOffset,
      },
    ],
  };
}

function mergeCandidateSpans(
  candidates: readonly CandidateSpan[],
  mergeGapChars: number,
): CandidateSpan[] {
  const sorted = [...candidates].sort(
    (left, right) => left.startOffset - right.startOffset || left.endOffset - right.endOffset,
  );
  const merged: CandidateSpan[] = [];
  for (const candidate of sorted) {
    const previous = merged.at(-1);
    if (!previous || candidate.startOffset > previous.endOffset + mergeGapChars) {
      merged.push({
        ...candidate,
        anchorOccurrences: [...candidate.anchorOccurrences],
        targetRanges: [...candidate.targetRanges],
      });
      continue;
    }
    previous.endOffset = Math.max(previous.endOffset, candidate.endOffset);
    previous.priority = Math.max(previous.priority, candidate.priority);
    previous.anchorOccurrences.push(...candidate.anchorOccurrences);
    previous.targetRanges.push(...candidate.targetRanges);
  }
  return merged;
}

function clampSpanAroundTargets(
  span: CandidateSpan,
  maxChars: number,
): { startOffset: number; endOffset: number; cropped: boolean } {
  const originalLength = span.endOffset - span.startOffset;
  if (originalLength <= maxChars) {
    return { startOffset: span.startOffset, endOffset: span.endOffset, cropped: false };
  }
  const targetStart = Math.min(...span.targetRanges.map((target) => target.startOffset));
  const targetEnd = Math.max(...span.targetRanges.map((target) => target.endOffset));
  if (targetEnd - targetStart >= maxChars) {
    return {
      startOffset: targetStart,
      endOffset: targetStart + maxChars,
      cropped: true,
    };
  }
  const spare = maxChars - (targetEnd - targetStart);
  const desiredBefore = Math.floor(spare / 2);
  let startOffset = Math.max(span.startOffset, targetStart - desiredBefore);
  let endOffset = Math.min(span.endOffset, startOffset + maxChars);
  startOffset = Math.max(span.startOffset, endOffset - maxChars);
  return { startOffset, endOffset, cropped: true };
}

function rangeCovered(
  range: { startOffset: number; endOffset: number },
  selected: readonly { startOffset: number; endOffset: number }[],
): boolean {
  return selected.some(
    (span) => span.startOffset <= range.startOffset && span.endOffset >= range.endOffset,
  );
}

function coverageStatus(input: {
  targets: readonly { startOffset: number; endOffset: number }[];
  selected: readonly { startOffset: number; endOffset: number }[];
}): ProviderEvidenceExcerpt["factualCoverageStatus"] {
  if (input.targets.length === 0) return "NONE";
  const covered = input.targets.filter((target) => rangeCovered(target, input.selected)).length;
  if (covered === 0) return "NONE";
  return covered === input.targets.length ? "COMPLETE" : "PARTIAL";
}

export function buildProviderEvidenceExcerpt(input: {
  artifact: FactualEvidenceArtifact;
  anchors?: readonly ProviderEvidenceAnchor[];
  budget?: ProviderEvidenceBudget;
  maxChars?: number;
}): ProviderEvidenceExcerpt {
  if (!isFactualEvidenceArtifact(input.artifact)) {
    throw new TypeError("Provider evidence requires a factual evidence artifact");
  }
  const budget = validateBudget(input.budget ?? DEFAULT_PROVIDER_EVIDENCE_BUDGET);
  const maxChars = Math.min(input.maxChars ?? budget.maxCharsPerExcerpt, budget.maxCharsPerExcerpt);
  assertPositiveInteger(maxChars, "maxChars");
  const content = input.artifact.canonicalContent;
  const occurrences = findAnchorOccurrences(content, input.anchors ?? []);
  const factualCandidates: CandidateSpan[] = input.artifact.factualSpans.map((span) => ({
    startOffset: Math.max(0, span.startOffset - budget.contextCharsBefore),
    endOffset: Math.min(content.length, span.endOffset + budget.contextCharsAfter),
    priority: 1_000,
    anchorOccurrences: occurrences.filter(
      (occurrence) =>
        occurrence.startOffset < span.endOffset && occurrence.endOffset > span.startOffset,
    ),
    targetRanges: [{ startOffset: span.startOffset, endOffset: span.endOffset }],
  }));
  const occurrenceCandidates = occurrences.map((occurrence) =>
    occurrenceWindow(occurrence, content.length, budget),
  );
  let rawCandidates = [...factualCandidates, ...occurrenceCandidates];
  if (rawCandidates.length === 0 && content.length > 0) {
    rawCandidates = [
      {
        startOffset: 0,
        endOffset: Math.min(content.length, maxChars),
        priority: Number.NEGATIVE_INFINITY,
        anchorOccurrences: [],
        targetRanges: [],
      },
    ];
  }

  // Rank before merging. Otherwise a common low-value anchor occurring
  // throughout a long chunk can create a chain of overlapping windows that
  // joins the beginning of the chunk to a high-value fact near its end.
  const prioritizedCandidates = [...rawCandidates]
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        right.anchorOccurrences.length - left.anchorOccurrences.length ||
        left.startOffset - right.startOffset,
    )
    .slice(0, budget.maxSpansPerChunk);
  const rankedCandidates = mergeCandidateSpans(
    prioritizedCandidates,
    budget.mergeGapChars,
  ).sort(
    (left, right) =>
      right.priority - left.priority ||
      right.anchorOccurrences.length - left.anchorOccurrences.length ||
      left.startOffset - right.startOffset,
  );

  const selected: Array<{
    startOffset: number;
    endOffset: number;
    anchorOccurrences: AnchorOccurrence[];
  }> = [];
  let remaining = maxChars;
  let croppedByBudget = rawCandidates.length > prioritizedCandidates.length;
  for (const candidate of rankedCandidates) {
    const separatorCost = selected.length > 0 ? EXCERPT_SPAN_SEPARATOR.length : 0;
    if (remaining <= separatorCost) {
      croppedByBudget = true;
      break;
    }
    const clamped = clampSpanAroundTargets(candidate, remaining - separatorCost);
    if (clamped.endOffset <= clamped.startOffset) {
      croppedByBudget = true;
      continue;
    }
    selected.push({
      startOffset: clamped.startOffset,
      endOffset: clamped.endOffset,
      anchorOccurrences: candidate.anchorOccurrences,
    });
    remaining -= clamped.endOffset - clamped.startOffset + separatorCost;
    croppedByBudget ||= clamped.cropped;
  }
  selected.sort(
    (left, right) => left.startOffset - right.startOffset || left.endOffset - right.endOffset,
  );

  let excerptText = "";
  const excerptSpans: ProviderEvidenceExcerptSpan[] = [];
  for (const span of selected) {
    if (excerptText.length > 0) excerptText += EXCERPT_SPAN_SEPARATOR;
    const excerptStartOffset = excerptText.length;
    excerptText += content.slice(span.startOffset, span.endOffset);
    excerptSpans.push(
      Object.freeze({
        sourceStartOffset: span.startOffset,
        sourceEndOffset: span.endOffset,
        excerptStartOffset,
        excerptEndOffset: excerptText.length,
        anchorIds: Object.freeze(
          [...new Set(span.anchorOccurrences.map((occurrence) => occurrence.id))].sort(),
        ),
      }),
    );
  }

  const includedOccurrences = occurrences.filter((occurrence) =>
    rangeCovered(occurrence, selected),
  );
  const selectionAnchors = Object.freeze(
    includedOccurrences
      .sort(
        (left, right) =>
          left.startOffset - right.startOffset ||
          left.endOffset - right.endOffset ||
          left.id.localeCompare(right.id),
      )
      .map((occurrence) =>
        Object.freeze({
          id: occurrence.id,
          kind: occurrence.kind,
          sourceStartOffset: occurrence.startOffset,
          sourceEndOffset: occurrence.endOffset,
        }),
      ),
  );
  const factualTargets =
    input.artifact.factualSpans.length > 0
      ? input.artifact.factualSpans
      : occurrences.map((occurrence) => ({
          startOffset: occurrence.startOffset,
          endOffset: occurrence.endOffset,
        }));
  const coversWholeContent =
    selected.length === 1 &&
    selected[0].startOffset === 0 &&
    selected[0].endOffset === content.length;
  const truncationStatus: ProviderEvidenceExcerpt["truncationStatus"] =
    excerptText.length === 0
      ? "NO_RELEVANT_SPAN"
      : coversWholeContent
        ? "NOT_TRUNCATED"
        : croppedByBudget
          ? "TRUNCATED_TO_BUDGET"
          : "TRUNCATED_AROUND_ANCHORS";

  return Object.freeze({
    kind: "PROVIDER_EVIDENCE_EXCERPT",
    schemaVersion: KNOWLEDGE_EVIDENCE_SCHEMA_VERSION,
    chunkId: input.artifact.chunkId,
    knowledgeId: input.artifact.knowledgeId,
    excerptText,
    startOffset: selected.length > 0 ? Math.min(...selected.map((span) => span.startOffset)) : 0,
    endOffset: selected.length > 0 ? Math.max(...selected.map((span) => span.endOffset)) : 0,
    truncationStatus,
    selectionAnchors,
    contentHash: input.artifact.contentHash,
    factualCoverageStatus: coverageStatus({
      targets: factualTargets,
      selected,
    }),
    spans: Object.freeze(excerptSpans),
    budget: Object.freeze({
      maxChars,
      usedChars: excerptText.length,
    }),
  });
}

function aggregateCoverage(
  excerpts: readonly ProviderEvidenceExcerpt[],
): ProviderEvidencePack["factualCoverageStatus"] {
  if (excerpts.length === 0 || excerpts.every((item) => item.factualCoverageStatus === "NONE")) {
    return "NONE";
  }
  return excerpts.every((item) => item.factualCoverageStatus === "COMPLETE")
    ? "COMPLETE"
    : "PARTIAL";
}

export function packProviderEvidenceExcerpts(input: {
  artifacts: readonly FactualEvidenceArtifact[];
  sharedAnchors?: readonly ProviderEvidenceAnchor[];
  anchorsByChunkId?: Readonly<Record<string, readonly ProviderEvidenceAnchor[]>>;
  budget?: ProviderEvidenceBudget;
}): ProviderEvidencePack {
  const budget = validateBudget(input.budget ?? DEFAULT_PROVIDER_EVIDENCE_BUDGET);
  const ranked = [...input.artifacts].sort(
    (left, right) =>
      right.rankingScore - left.rankingScore || left.chunkId.localeCompare(right.chunkId),
  );
  const excerpts: ProviderEvidenceExcerpt[] = [];
  let remaining = budget.maxTotalChars;

  for (const artifact of ranked) {
    if (excerpts.length >= budget.maxChunks || remaining <= 0) break;
    const excerpt = buildProviderEvidenceExcerpt({
      artifact,
      anchors: [
        ...(input.sharedAnchors ?? []),
        ...(input.anchorsByChunkId?.[artifact.chunkId] ?? []),
      ],
      budget,
      maxChars: Math.min(budget.maxCharsPerExcerpt, remaining),
    });
    if (excerpt.excerptText.length === 0) continue;
    excerpts.push(excerpt);
    remaining -= excerpt.excerptText.length;
  }

  const selectedChunkIds = excerpts.map((excerpt) => excerpt.chunkId);
  const selectedSet = new Set(selectedChunkIds);
  return Object.freeze({
    schemaVersion: KNOWLEDGE_EVIDENCE_SCHEMA_VERSION,
    excerpts: Object.freeze(excerpts),
    selectedChunkIds: Object.freeze(selectedChunkIds),
    droppedChunkIds: Object.freeze(
      ranked.map((artifact) => artifact.chunkId).filter((chunkId) => !selectedSet.has(chunkId)),
    ),
    totalExcerptChars: excerpts.reduce((total, excerpt) => total + excerpt.excerptText.length, 0),
    budget,
    factualCoverageStatus: aggregateCoverage(excerpts),
  });
}
