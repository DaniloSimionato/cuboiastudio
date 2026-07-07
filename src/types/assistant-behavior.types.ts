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
