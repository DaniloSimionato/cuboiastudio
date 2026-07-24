export type RagPriceServiceKey =
  | "formatacao"
  | "placa_mae"
  | "remocao_virus"
  | "recuperacao_dados"
  | "montagem_computadores"
  | "unknown";

export type PriceAuthorityQualifier = "starting_at";

type ServicePattern = readonly [serviceKey: RagPriceServiceKey, pattern: RegExp];

const PRICE_SERVICE_PATTERNS: readonly ServicePattern[] = [
  ["placa_mae", /\bplaca[ -]?mae\b/u],
  ["remocao_virus", /\b(?:remocao|remover)\s+(?:de\s+)?(?:virus|malware)\b/u],
  ["recuperacao_dados", /\b(?:recupera[cr][aã]o|recuperar)\s+(?:de\s+)?(?:dados|arquivos?)\b/u],
  ["montagem_computadores", /\b(?:montagem|configuracao)\s+(?:de\s+)?computador(?:es)?\b/u],
  ["formatacao", /\b(?:format|windows|sistema(?:s)?|instala[cr][aã]o)\w*/u],
];

const RAG_PRICE_SERVICE_ORDER: readonly RagPriceServiceKey[] = [
  "formatacao",
  "placa_mae",
  "remocao_virus",
  "recuperacao_dados",
  "montagem_computadores",
  "unknown",
];

export type RagPriceAuthority = {
  authorityType: "price";
  source: "rag";
  chunkId: string;
  knowledgeItemId: string;
  service: string;
  serviceKey: RagPriceServiceKey;
  serviceTerms: string[];
  amount: number;
  currency: "BRL";
  qualifier: PriceAuthorityQualifier;
  sourceText: string;
  sourceChunkIds: string[];
  sourceKnowledgeIds: string[];
  evidenceCount: number;
};

/**
 * Canonical, service-filtered authority contract used by the runtime guard.
 * It is created once after RAG selection and must not be re-extracted from
 * prompt chunks during response authorization.
 */
export type EligiblePriceAuthority = RagPriceAuthority;

export type ExtractedPriceClaim = {
  serviceKey: RagPriceServiceKey;
  currency: "BRL";
  amount: number;
  qualifier: PriceAuthorityQualifier | null;
  index: number;
  excerpt: string;
};

type RagPriceAuthorityInput = {
  chunkId: string;
  knowledgeItemId: string;
  title: string;
  content: string;
};

const STOP_WORDS = new Set([
  "como",
  "com",
  "para",
  "valor",
  "preco",
  "partir",
  "inicial",
  "referencia",
  "incluindo",
  "padrao",
  "basica",
  "orcamento",
  "final",
  "depende",
  "avaliacao",
  "tecnica",
  "tem",
  "uma",
  "que",
  "dos",
  "das",
  "por",
]);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function parseBrlAmount(value: string): number | null {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function priceAmountInMinorUnits(amount: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function priceContextAt(text: string, position: number): string {
  const separators = [".", ";", "\n", "•"];
  const start = Math.max(
    ...separators.map((separator) => text.lastIndexOf(separator, position) + 1),
  );
  const ends = separators
    .map((separator) => text.indexOf(separator, position))
    .filter((index) => index !== -1);
  const end = ends.length > 0 ? Math.min(...ends) + 1 : text.length;
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 320);
}

function priceServiceKey(sourceText: string): RagPriceServiceKey {
  const source = normalize(sourceText);
  const matches = PRICE_SERVICE_PATTERNS.filter(([, pattern]) => pattern.test(source));
  return matches.length === 1 ? matches[0][0] : "unknown";
}

function priceServiceKeyBeforePosition(text: string, position: number): RagPriceServiceKey {
  const sentenceStart = Math.max(
    text.lastIndexOf(".", position),
    text.lastIndexOf(";", position),
    text.lastIndexOf("\n", position),
  );
  const beforePrice = normalize(text.slice(sentenceStart + 1, position));
  const matches = PRICE_SERVICE_PATTERNS.flatMap(([serviceKey, pattern]) => {
    const globalPattern = new RegExp(pattern.source, "gu");
    return Array.from(beforePrice.matchAll(globalPattern)).map((match) => ({
      serviceKey,
      index: match.index ?? -1,
    }));
  }).filter((match) => match.index >= 0);

  if (matches.length === 0) return "unknown";
  matches.sort((left, right) => right.index - left.index);
  const best = matches[0];
  return matches.filter((match) => match.index === best.index).length === 1
    ? best.serviceKey
    : "unknown";
}

function claimQualifier(text: string, position: number): PriceAuthorityQualifier | null {
  const beforePrice = normalize(text.slice(Math.max(0, position - 120), position));
  return /(?:a\s+partir\s+de|valor\s+(?:inicial|de\s+partida)(?:\s+de)?|(?:valor|preco)\s+parte\s+de)\s*$/u.test(
    beforePrice,
  )
    ? "starting_at"
    : null;
}

/** Extracts every explicit BRL price claim from a draft response without persisting prose. */
export function extractPriceClaims(answer: string): ExtractedPriceClaim[] {
  return Array.from(
    answer.matchAll(/(?:R\$\s*([\d.]+(?:,\d{2})?)|([\d.]+(?:,\d{2})?)\s*(?:reais|real)\b)/giu),
  ).flatMap((match) => {
    const amount = parseBrlAmount(match[1] ?? match[2]);
    if (amount === null || match.index === undefined) return [];
    const excerpt = priceContextAt(answer, match.index);
    return [
      {
        serviceKey: priceServiceKeyBeforePosition(answer, match.index),
        currency: "BRL" as const,
        amount,
        qualifier: claimQualifier(answer, match.index),
        index: match.index,
        excerpt,
      },
    ];
  });
}

function serviceTerms(title: string, sourceText: string): string[] {
  const sourceTerms = normalize(sourceText)
    .split(/[^a-z0-9]+/u)
    .filter((term) => term.length >= 5 && !STOP_WORDS.has(term));
  const titleServiceTerms = normalize(title.replace(/^\S+\s*-\s*/u, "").split(",", 1)[0])
    .split(/[^a-z0-9]+/u)
    .filter((term) => term.length >= 5 && !STOP_WORDS.has(term));
  return Array.from(new Set([...sourceTerms, ...titleServiceTerms])).slice(0, 16);
}

function serviceLabel(title: string, sourceText: string): string {
  const match = sourceText.match(
    /(?:a|o)\s+([^,.]{4,120}?)(?:\s*,[^.]{0,160})?\s+(?:tem\s+valor|custa|tem\s+pre[cç]o|valor\s+(?:inicial|a\s+partir))/iu,
  );
  return (
    match?.[1]?.trim() ||
    title
      .replace(/^\S+\s*-\s*/u, "")
      .split(",", 1)[0]
      .trim() ||
    title
  );
}

export function extractRagPriceAuthorities(input: RagPriceAuthorityInput): RagPriceAuthority[] {
  const matches = Array.from(
    input.content.matchAll(
      /(?:a\s+partir\s+de|valor\s+inicial)[^R]{0,80}R\$\s*([\d.]+(?:,\d{2})?)/giu,
    ),
  );

  return matches.flatMap((match) => {
    const amount = parseBrlAmount(match[1]);
    if (amount === null || match.index === undefined) return [];

    const sourceText = priceContextAt(input.content, match.index);
    const service = serviceLabel(input.title, sourceText);
    const terms = serviceTerms(input.title, sourceText);
    const serviceKey = priceServiceKey(sourceText);
    if (terms.length === 0 || serviceKey === "unknown") return [];

    return [
      {
        authorityType: "price" as const,
        source: "rag" as const,
        chunkId: input.chunkId,
        knowledgeItemId: input.knowledgeItemId,
        service,
        serviceKey,
        serviceTerms: terms,
        amount,
        currency: "BRL" as const,
        qualifier: "starting_at" as const,
        sourceText,
        sourceChunkIds: [input.chunkId],
        sourceKnowledgeIds: [input.knowledgeItemId],
        evidenceCount: 1,
      },
    ];
  });
}

export function isRagPriceAuthority(value: unknown): value is RagPriceAuthority {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RagPriceAuthority>;
  return (
    item.authorityType === "price" &&
    item.source === "rag" &&
    typeof item.chunkId === "string" &&
    typeof item.knowledgeItemId === "string" &&
    typeof item.service === "string" &&
    typeof item.serviceKey === "string" &&
    [
      "formatacao",
      "placa_mae",
      "remocao_virus",
      "recuperacao_dados",
      "montagem_computadores",
      "unknown",
    ].includes(item.serviceKey) &&
    Array.isArray(item.serviceTerms) &&
    item.serviceTerms.every((term) => typeof term === "string") &&
    typeof item.amount === "number" &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    item.currency === "BRL" &&
    item.qualifier === "starting_at" &&
    typeof item.sourceText === "string" &&
    Array.isArray(item.sourceChunkIds) &&
    item.sourceChunkIds.every((chunkId) => typeof chunkId === "string") &&
    Array.isArray(item.sourceKnowledgeIds) &&
    item.sourceKnowledgeIds.every((knowledgeId) => typeof knowledgeId === "string") &&
    typeof item.evidenceCount === "number" &&
    Number.isSafeInteger(item.evidenceCount) &&
    item.evidenceCount > 0
  );
}

function amountMatches(answer: string, amount: number): boolean {
  const amounts = Array.from(answer.matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/giu))
    .map((match) => parseBrlAmount(match[1]))
    .filter((candidate): candidate is number => candidate !== null);
  return amounts.some((candidate) => Math.abs(candidate - amount) < 0.001);
}

function hasStartingAtQualifier(answer: string): boolean {
  return /(?:a\s+partir\s+de|valor\s+(?:inicial|de\s+partida)|(?:valor|preco)\s+parte\s+de)/iu.test(
    answer,
  );
}

function matchesService(message: string, authority: RagPriceAuthority): boolean {
  const normalizedMessage = normalize(message);
  return authority.serviceTerms.some((term) => {
    if (term.startsWith("format")) return /\bformat\w*/u.test(normalizedMessage);
    return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "u").test(
      normalizedMessage,
    );
  });
}

/**
 * A title can legitimately cover several services (for example, formatting,
 * motherboard repair and virus removal). Authorities must consequently be
 * matched against the sentence that supplied the amount, not only title terms.
 */
export function isRagPriceAuthorityCompatibleWithMessage(input: {
  authority: RagPriceAuthority;
  currentMessage: string;
}): boolean {
  return (
    filterEligibleRagPriceAuthorities({
      authorities: [input.authority],
      currentMessage: input.currentMessage,
    }).length === 1
  );
}

export function requestedPriceServiceKeys(message: string): RagPriceServiceKey[] {
  const normalizedMessage = normalize(message);
  return PRICE_SERVICE_PATTERNS.map(([serviceKey, pattern]) => ({
    serviceKey,
    position: normalizedMessage.search(pattern),
    canonicalOrder: RAG_PRICE_SERVICE_ORDER.indexOf(serviceKey),
  }))
    .filter((item) => item.position >= 0)
    .sort(
      (left, right) => left.position - right.position || left.canonicalOrder - right.canonicalOrder,
    )
    .map((item) => item.serviceKey);
}

export function filterEligibleRagPriceAuthorities(input: {
  authorities: RagPriceAuthority[];
  currentMessage: string;
}): RagPriceAuthority[] {
  const requestedServiceKeys = requestedPriceServiceKeys(input.currentMessage);
  if (requestedServiceKeys.length === 0) return [];
  return input.authorities.filter(
    (authority) =>
      authority.serviceKey !== "unknown" && requestedServiceKeys.includes(authority.serviceKey),
  );
}

function normalizedQualifier(qualifier: string): string {
  return normalize(qualifier).replace(/\s+/g, "_");
}

function authorityDeduplicationKey(authority: RagPriceAuthority): string {
  const amountInMinorUnits = priceAmountInMinorUnits(authority.amount);
  return [
    authority.serviceKey,
    authority.currency,
    amountInMinorUnits,
    normalizedQualifier(authority.qualifier),
  ].join(":");
}

/**
 * Multiple RAG chunks can repeat one commercial fact. The guard receives one
 * logical authority while retaining every chunk and knowledge reference that
 * corroborated it. Different services, values and qualifiers remain distinct.
 */
export function deduplicateEligibleRagPriceAuthorities(
  authorities: RagPriceAuthority[],
): RagPriceAuthority[] {
  const grouped = new Map<string, RagPriceAuthority>();
  for (const authority of authorities) {
    const key = authorityDeduplicationKey(authority);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        ...authority,
        sourceChunkIds: Array.from(new Set(authority.sourceChunkIds)),
        sourceKnowledgeIds: Array.from(new Set(authority.sourceKnowledgeIds)),
      });
      continue;
    }
    existing.sourceChunkIds = Array.from(
      new Set([...existing.sourceChunkIds, ...authority.sourceChunkIds]),
    );
    existing.sourceKnowledgeIds = Array.from(
      new Set([...existing.sourceKnowledgeIds, ...authority.sourceKnowledgeIds]),
    );
    existing.evidenceCount += authority.evidenceCount;
  }
  return Array.from(grouped.values());
}

export function hasConflictingEligibleRagPriceAuthorities(
  authorities: RagPriceAuthority[],
): boolean {
  const amountsByService = new Map<RagPriceServiceKey, Set<number>>();
  for (const authority of authorities) {
    const amounts = amountsByService.get(authority.serviceKey) ?? new Set<number>();
    amounts.add(authority.amount);
    amountsByService.set(authority.serviceKey, amounts);
  }
  return Array.from(amountsByService.values()).some((amounts) => amounts.size > 1);
}

function legacyAuthorityMatchesService(input: {
  authority: RagPriceAuthority;
  currentMessage: string;
}): boolean {
  const source = normalize(input.authority.sourceText);
  const message = normalize(input.currentMessage);
  const serviceSignals: Array<{ source: RegExp; message: RegExp }> = [
    { source: /\bplaca[ -]?mae\b/u, message: /\bplaca[ -]?mae\b/u },
    { source: /\b(?:montagem|configuracao)\b/u, message: /\b(?:montagem|configura[cr][aã]o)\b/u },
    { source: /\b(?:virus|malware)\b/u, message: /\b(?:virus|malware)\b/u },
    {
      source: /\b(?:format|windows|sistema(?:s)?|instalacao)\w*/u,
      message: /\b(?:format|windows|sistema(?:s)?|instala[cr][aã]o)\w*/u,
    },
    {
      source: /\b(?:recupera[cr][aã]o|dados|arquivos?)\b/u,
      message: /\b(?:recuper|dados|arquivos?)\b/u,
    },
  ];

  const sourceSpecificSignals = serviceSignals.filter(({ source: pattern }) =>
    pattern.test(source),
  );
  if (
    sourceSpecificSignals.length > 0 &&
    !sourceSpecificSignals.some(({ message: pattern }) => pattern.test(message))
  ) {
    return false;
  }

  return matchesService(input.currentMessage, input.authority);
}

export function hasPriceAuthorityForMessage(input: {
  authorities: RagPriceAuthority[];
  currentMessage: string;
}): boolean {
  return input.authorities.some((authority) => matchesService(input.currentMessage, authority));
}

export function findMatchingRagPriceAuthority(input: {
  authorities: RagPriceAuthority[];
  currentMessage: string;
  answer: string;
}): RagPriceAuthority | null {
  if (/\b(?:exatamente|fixo|fechado)\b/iu.test(normalize(input.answer))) return null;

  return (
    input.authorities.find(
      (authority) =>
        matchesService(input.currentMessage, authority) &&
        amountMatches(input.answer, authority.amount) &&
        hasStartingAtQualifier(input.answer),
    ) ?? null
  );
}
