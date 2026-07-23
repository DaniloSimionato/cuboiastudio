import type { AssistantFlow } from "@prisma/client";

export type FlowKnowledgeScopeResolution = {
  knowledgeScopeSource: "flow_knowledge_scope" | "legacy_global";
  allowedKnowledgeIds: string[];
  knowledgeScopeMissing: boolean;
};

/**
 * `AssistantFlow.knowledgeScope` is the pre-existing JSON string edited by the
 * flows UI (one knowledge ID per line). Tags were historically accepted by the
 * field, but retrieval can only safely scope a query with concrete knowledge
 * item IDs. A malformed or empty value therefore deliberately stays on the
 * legacy path rather than broadening a configured scope.
 */
export function resolveFlowKnowledgeScope(
  flow: Pick<AssistantFlow, "knowledgeScope"> | null | undefined,
): FlowKnowledgeScopeResolution {
  const rawScope = flow?.knowledgeScope?.trim();
  if (!rawScope) {
    return {
      knowledgeScopeSource: "legacy_global",
      allowedKnowledgeIds: [],
      knowledgeScopeMissing: true,
    };
  }

  try {
    const parsed = JSON.parse(rawScope);
    const allowedKnowledgeIds = Array.isArray(parsed)
      ? Array.from(
          new Set(
            parsed.filter(
              (value): value is string => typeof value === "string" && value.trim().length > 0,
            ),
          ),
        )
      : [];

    if (allowedKnowledgeIds.length > 0) {
      return {
        knowledgeScopeSource: "flow_knowledge_scope",
        allowedKnowledgeIds,
        knowledgeScopeMissing: false,
      };
    }
  } catch {
    // Preserve the explicitly configured scope as an empty result below. It
    // must never silently fall back to global retrieval.
  }

  return {
    knowledgeScopeSource: "flow_knowledge_scope",
    allowedKnowledgeIds: [],
    knowledgeScopeMissing: false,
  };
}
