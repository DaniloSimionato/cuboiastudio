import type { AssistantFlow } from "@prisma/client";
import { normalizeKnowledgeScopeTags } from "../assistant-knowledge/knowledge-scope-tags";

export type FlowKnowledgeScopeResolution = {
  knowledgeScopeSource: "flow_knowledge_scope_tags" | "legacy_global";
  scopeTags: string[];
  knowledgeScopeMissing: boolean;
};

/**
 * `AssistantFlow.knowledgeScope` is the pre-existing JSON string edited by the
 * flows UI. Its contract is a list of domain tags. Values are normalized only
 * for matching; the persisted flow configuration remains untouched.
 */
export function resolveFlowKnowledgeScope(
  flow: Pick<AssistantFlow, "knowledgeScope"> | null | undefined,
): FlowKnowledgeScopeResolution {
  const rawScope = flow?.knowledgeScope?.trim();
  if (!rawScope) {
    return {
      knowledgeScopeSource: "legacy_global",
      scopeTags: [],
      knowledgeScopeMissing: true,
    };
  }

  try {
    const parsed = JSON.parse(rawScope);
    const scopeTags = normalizeKnowledgeScopeTags(parsed);

    if (scopeTags.length > 0) {
      return {
        knowledgeScopeSource: "flow_knowledge_scope_tags",
        scopeTags,
        knowledgeScopeMissing: false,
      };
    }

    return {
      knowledgeScopeSource: "legacy_global",
      scopeTags: [],
      knowledgeScopeMissing: true,
    };
  } catch {
    // A malformed configured scope is not considered missing. When the flag is
    // enabled it must therefore resolve to no knowledge rather than broaden the
    // query to every base.
  }

  return {
    knowledgeScopeSource: "flow_knowledge_scope_tags",
    scopeTags: [],
    knowledgeScopeMissing: false,
  };
}

export function isKnowledgeScopeTagFilterEnabled(input: {
  assistantId: string;
  environment?: NodeJS.ProcessEnv;
}): boolean {
  const configuredAssistantIds = (
    input.environment ?? process.env
  ).KNOWLEDGE_SCOPE_TAG_FILTER_ASSISTANT_IDS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configuredAssistantIds?.includes(input.assistantId) ?? false;
}
