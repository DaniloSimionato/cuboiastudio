export interface AssistantBehavior {
  id: string;
  assistantId: string;
  attendantName: string | null;
  showAttendantName: boolean;
  role: string | null;
  howItActs: string | null;
  personality: string | null;
  toneOfVoice: string | null;
  responseStyle: string | null;
  emojiUsage: string | null;
  greetingMessage: string | null;
  noInventInfo: boolean;
  unknownBehavior: string | null;
  maxBlockLength: number | null;
  createdAt: string;
  updatedAt: string;
}

export type AssistantBehaviorFormState = Pick<
  AssistantBehavior,
  | "attendantName"
  | "showAttendantName"
  | "role"
  | "howItActs"
  | "personality"
  | "toneOfVoice"
  | "responseStyle"
  | "emojiUsage"
  | "greetingMessage"
  | "noInventInfo"
  | "unknownBehavior"
  | "maxBlockLength"
>;

export const DEFAULT_ASSISTANT_BEHAVIOR: AssistantBehaviorFormState = {
  attendantName: "",
  showAttendantName: true,
  role: "",
  howItActs: "",
  personality: "",
  toneOfVoice: "",
  responseStyle: "whatsapp",
  emojiUsage: "low",
  greetingMessage: "",
  noInventInfo: true,
  unknownBehavior: "fallback",
  maxBlockLength: 300,
};
