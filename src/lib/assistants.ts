import type { BackendAssistantListItem } from "../types/index.ts";

type AssistantLike = Pick<BackendAssistantListItem, "id" | "name" | "status">;

type OperationalAssistantOptions = {
  includeInactive?: boolean;
};

export function isSmokeAssistantName(name: string): boolean {
  return (
    name.startsWith("[SMOKE]") ||
    name.startsWith("[SMOKE:") ||
    name.startsWith("Assistente Smoke Test")
  );
}

export function isSmokeAssistant(
  assistant: Pick<BackendAssistantListItem, "name"> | null | undefined,
): boolean {
  return Boolean(assistant) && isSmokeAssistantName(assistant.name);
}

export function isOperationalAssistant(
  assistant: AssistantLike,
  options: OperationalAssistantOptions = {},
): boolean {
  const { includeInactive = false } = options;

  if (isSmokeAssistant(assistant)) {
    return false;
  }

  return includeInactive || assistant.status === "ACTIVE";
}

export function filterOperationalAssistants(
  assistants: BackendAssistantListItem[],
  options: OperationalAssistantOptions = {},
): BackendAssistantListItem[] {
  return assistants.filter((assistant) => isOperationalAssistant(assistant, options));
}

export function resolveOperationalAssistantId(
  assistants: BackendAssistantListItem[],
  preferredAssistantId?: string | null,
  options: OperationalAssistantOptions = {},
): string {
  const visibleAssistants = filterOperationalAssistants(assistants, options);

  if (!preferredAssistantId) {
    return visibleAssistants[0]?.id ?? "";
  }

  return visibleAssistants.some((assistant) => assistant.id === preferredAssistantId)
    ? preferredAssistantId
    : (visibleAssistants[0]?.id ?? "");
}
