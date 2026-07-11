import {
  DEFAULT_ASSISTANT_BEHAVIOR,
  type AssistantBehavior,
  type AssistantBehaviorFormState,
} from "../types/assistant-behavior.types.ts";

export function normalizeAssistantBehavior(
  value: Partial<AssistantBehavior> | null | undefined,
): AssistantBehaviorFormState {
  return {
    attendantName: value?.attendantName ?? "",
    role: value?.role ?? "",
    howItActs: value?.howItActs ?? "",
    personality: value?.personality ?? "",
    toneOfVoice: value?.toneOfVoice ?? "",
    greetingMessage: value?.greetingMessage ?? "",
    responseStyle: value?.responseStyle ?? DEFAULT_ASSISTANT_BEHAVIOR.responseStyle,
    emojiUsage: value?.emojiUsage ?? DEFAULT_ASSISTANT_BEHAVIOR.emojiUsage,
    unknownBehavior: value?.unknownBehavior ?? DEFAULT_ASSISTANT_BEHAVIOR.unknownBehavior,
    maxBlockLength: value?.maxBlockLength ?? DEFAULT_ASSISTANT_BEHAVIOR.maxBlockLength,
    showAttendantName: value?.showAttendantName ?? DEFAULT_ASSISTANT_BEHAVIOR.showAttendantName,
    noInventInfo: value?.noInventInfo ?? DEFAULT_ASSISTANT_BEHAVIOR.noInventInfo,
  };
}

export function buildAssistantBehaviorPayload(
  behavior: AssistantBehaviorFormState,
  initialMessage: string,
  personality: string,
  toneOfVoice: string,
): AssistantBehaviorFormState {
  return {
    ...behavior,
    attendantName: behavior.attendantName?.trim() || null,
    role: behavior.role?.trim() || null,
    howItActs: behavior.howItActs?.trim() || null,
    personality: personality.trim() || null,
    toneOfVoice: toneOfVoice.trim() || null,
    greetingMessage: initialMessage.trim() || null,
    responseStyle: behavior.responseStyle || DEFAULT_ASSISTANT_BEHAVIOR.responseStyle,
    emojiUsage: behavior.emojiUsage || DEFAULT_ASSISTANT_BEHAVIOR.emojiUsage,
    unknownBehavior: behavior.unknownBehavior || DEFAULT_ASSISTANT_BEHAVIOR.unknownBehavior,
    maxBlockLength: behavior.maxBlockLength ?? DEFAULT_ASSISTANT_BEHAVIOR.maxBlockLength,
  };
}

export function isAssistantBehaviorDirty(
  current: AssistantBehaviorFormState,
  initial: AssistantBehaviorFormState,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}
