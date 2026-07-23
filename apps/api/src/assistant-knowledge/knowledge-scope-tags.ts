/**
 * Normalization is deliberately comparison-only. The Studio keeps the original
 * user-entered tag in metadata.tags; this canonical form is never persisted
 * back as a side effect of retrieval.
 */
export function normalizeKnowledgeScopeTag(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || null;
}

export function normalizeKnowledgeScopeTags(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values.map(normalizeKnowledgeScopeTag).filter((value): value is string => value !== null),
    ),
  );
}

export function getKnowledgeMetadataTags(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  return normalizeKnowledgeScopeTags((metadata as Record<string, unknown>).tags);
}

export function knowledgeScopeTagsMatch(input: {
  scopeTags: readonly string[];
  metadata: unknown;
}): boolean {
  const knowledgeTags = new Set(getKnowledgeMetadataTags(input.metadata));
  return input.scopeTags.some((tag) => knowledgeTags.has(tag));
}
