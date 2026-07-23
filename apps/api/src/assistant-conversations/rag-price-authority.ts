export type RagPriceAuthority = {
  authorityType: "price";
  source: "rag";
  chunkId: string;
  knowledgeItemId: string;
  service: string;
  serviceTerms: string[];
  amount: number;
  currency: "BRL";
  qualifier: "starting_at";
  sourceText: string;
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

function parseBrlAmount(value: string): number | null {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function sentenceAt(text: string, position: number): string {
  const start = Math.max(text.lastIndexOf(".", position) + 1, text.lastIndexOf("\n", position) + 1);
  const nextPeriod = text.indexOf(".", position);
  const end = nextPeriod === -1 ? text.length : nextPeriod + 1;
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 320);
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

    const sourceText = sentenceAt(input.content, match.index);
    const service = serviceLabel(input.title, sourceText);
    const terms = serviceTerms(input.title, sourceText);
    if (terms.length === 0) return [];

    return [
      {
        authorityType: "price" as const,
        source: "rag" as const,
        chunkId: input.chunkId,
        knowledgeItemId: input.knowledgeItemId,
        service,
        serviceTerms: terms,
        amount,
        currency: "BRL" as const,
        qualifier: "starting_at" as const,
        sourceText,
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
    Array.isArray(item.serviceTerms) &&
    item.serviceTerms.every((term) => typeof term === "string") &&
    typeof item.amount === "number" &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    item.currency === "BRL" &&
    item.qualifier === "starting_at" &&
    typeof item.sourceText === "string"
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
