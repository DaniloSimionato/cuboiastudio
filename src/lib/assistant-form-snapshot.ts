import { normalizeAssistantBehavior } from "./assistant-behavior-form.ts";
import { normalizeBusinessHoursSchedule } from "./business-hours.ts";

type SnapshotInput = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sortedStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asString).map((item) => item.trim()).filter(Boolean).sort()
    : [];
}

function canonicalBehavior(value: unknown): Record<string, unknown> {
  const behavior = normalizeAssistantBehavior(
    value && typeof value === "object" ? (value as Record<string, unknown>) : null,
  );

  return {
    attendantName: behavior.attendantName?.trim() ?? "",
    showAttendantName: asBoolean(behavior.showAttendantName, true),
    role: behavior.role?.trim() ?? "",
    howItActs: behavior.howItActs?.trim() ?? "",
    personality: behavior.personality?.trim() ?? "",
    toneOfVoice: behavior.toneOfVoice?.trim() ?? "",
    responseStyle: behavior.responseStyle ?? "whatsapp",
    emojiUsage: behavior.emojiUsage ?? "low",
    greetingMessage: behavior.greetingMessage?.trim() ?? "",
    noInventInfo: asBoolean(behavior.noInventInfo, true),
    unknownBehavior: behavior.unknownBehavior ?? "fallback",
    maxBlockLength: asNumber(behavior.maxBlockLength, 300),
  };
}

export function canonicalizeAssistantFormSnapshot(value: SnapshotInput): SnapshotInput {
  const cityRegion = asString(value.businessCityRegion).trim();
  const parsedCityRegion = cityRegion.split(",").map((item) => item.trim());
  const city = asString(value.businessCity).trim() || parsedCityRegion.slice(0, -1).join(", ");
  const state = asString(value.businessState).trim() || parsedCityRegion.at(-1) || "";
  const keywords = asString(value.conversationResetKeywordsRaw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort();

  return {
    name: asString(value.name).trim(),
    description: asString(value.description).trim(),
    businessAddress: asString(value.businessAddress).trim(),
    businessCityRegion: cityRegion,
    businessCity: city,
    businessState: state,
    businessPostalCode: asString(value.businessPostalCode).trim(),
    businessPhone: asString(value.businessPhone).trim(),
    businessWhatsapp: asString(value.businessWhatsapp).trim(),
    businessWhatsappSupport: asString(value.businessWhatsappSupport).trim(),
    websiteUrl: asString(value.websiteUrl).trim(),
    timezone: asString(value.timezone).trim(),
    googleMapsUrl: asString(value.googleMapsUrl).trim(),
    latitude: asNumber(value.latitude),
    longitude: asNumber(value.longitude),
    weeklySchedule: normalizeBusinessHoursSchedule(value.weeklySchedule),
    aiAlwaysAvailable: asBoolean(value.aiAlwaysAvailable, true),
    initialMessage: asString(value.initialMessage).trim(),
    ragEnabled: asBoolean(value.ragEnabled, false),
    memoryEnabled: asBoolean(value.memoryEnabled, false),
    memoryPrePromptEnabled: asBoolean(value.memoryPrePromptEnabled, true),
    memoryExtractionEnabled: asBoolean(value.memoryExtractionEnabled, true),
    memoryAllowedCategories: sortedStrings(value.memoryAllowedCategories),
    memoryConfidenceThreshold: asNumber(value.memoryConfidenceThreshold, 0.7),
    memoryTempDefaultDays: asNumber(value.memoryTempDefaultDays, 7),
    memorySharedAcrossAssistants: asBoolean(value.memorySharedAcrossAssistants, true),
    semanticMemoryEnabled: asBoolean(value.semanticMemoryEnabled, false),
    semanticMemoryThreshold: asNumber(value.semanticMemoryThreshold, 0.7),
    semanticMemoryMaxCandidates: asNumber(value.semanticMemoryMaxCandidates, 20),
    semanticMemoryMaxResults: asNumber(value.semanticMemoryMaxResults, 10),
    conversationResetEnabled: asBoolean(value.conversationResetEnabled, false),
    conversationResetKeywordsRaw: keywords.join(", "),
    conversationResetConfirmationMessage: asString(
      value.conversationResetConfirmationMessage,
    ).trim(),
    conversationResetPreserveMemories: asBoolean(value.conversationResetPreserveMemories, true),
    conversationResetSendInitialMessage: asBoolean(value.conversationResetSendInitialMessage, true),
    status: asString(value.status),
    instructions: asString(value.instructions).trim(),
    personality: asString(value.personality).trim(),
    toneOfVoice: asString(value.toneOfVoice).trim(),
    avoidPhrases: asString(value.avoidPhrases).trim(),
    messageBufferEnabled: asBoolean(value.messageBufferEnabled, true),
    messageBufferSeconds: asNumber(value.messageBufferSeconds, 6),
    splitResponseEnabled: asBoolean(value.splitResponseEnabled, false),
    splitResponseStyle: asString(value.splitResponseStyle) || "SINGLE",
    model: asString(value.model).trim(),
    temperature: asNumber(value.temperature),
    noAnswerMessage: asString(value.noAnswerMessage).trim(),
    securityInstructions: asString(value.securityInstructions).trim(),
    behavior: canonicalBehavior(value.behavior),
  };
}

export function assistantFormSnapshotsEqual(left: SnapshotInput, right: SnapshotInput): boolean {
  return JSON.stringify(canonicalizeAssistantFormSnapshot(left)) ===
    JSON.stringify(canonicalizeAssistantFormSnapshot(right));
}
