import type { RuntimeActionState } from "./action-state";
import type { RuntimeHandoffState } from "./handoff-state";

export type RuntimeVersion = "V1" | "V2";

export type ConversationStatus = "ACTIVE" | "WAITING_CUSTOMER" | "WAITING_HUMAN" | "COMPLETED";

export type ObjectiveAction = "KEEP" | "REPLACE" | "ADD" | "COMPLETE" | "NONE";

export type ConversationObjective = {
  key: string;
  label: string;
  subject?: string | null;
  sourceMessageId?: string | null;
  confidence: number;
};

export type ConfirmedFactSourceType =
  "CUSTOMER_TEXT" | "CUSTOMER_AUDIO" | "HUMAN_AGENT" | "TOOL" | "OFFICIAL_CONTEXT" | "KNOWLEDGE";

export type ConfirmedFact = {
  key: string;
  value: unknown;
  confidence: number;
  sourceType: ConfirmedFactSourceType;
  sourceMessageId?: string;
  confirmedAt: Date;
  expiresAt?: Date;
};

export type ConfirmedFactInput = Omit<ConfirmedFact, "confirmedAt"> & {
  confirmedAt?: Date;
};

export type RelevantQuestion = {
  key: string;
  prompt: string;
  fieldKey?: string;
  sourceMessageId?: string;
  contextVersion: number;
  askedAt: Date;
};

export type ContactProfile = {
  contactId: string;
  displayName?: string;
  language?: string;
  companyName?: string;
  role?: string;
  stablePreferences: Array<{
    key: string;
    value: unknown;
    confidence: number;
    sourceId: string;
    updatedAt: Date;
  }>;
};

export type ConversationState = {
  schemaVersion: string;
  revision: number;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  sessionStartedAt: Date;
  firstMessageId: string | null;
  lastProcessedMessageId: string | null;
  lastProcessedExternalMessageId: string | null;
  createdAt: Date;
  objective: ConversationObjective | null;
  secondaryObjectives: ConversationObjective[];
  activeTopics: string[];
  confirmedFacts: Record<string, ConfirmedFact>;
  temporaryFacts: Record<string, ConfirmedFact>;
  answeredQuestions: string[];
  pendingFields: string[];
  lastRelevantQuestion: RelevantQuestion | null;
  lastRelevantQuestionMessageId: string | null;
  lastRelevantQuestionContextVersion: number | null;
  lastValidNextStep: string | null;
  selectedIntent: string | null;
  selectedFlowId: string | null;
  flowStage: string | null;
  status: ConversationStatus;
  actionState?: RuntimeActionState | null;
  handoffState?: RuntimeHandoffState | null;
  updatedAt: Date;
  expiresAt: Date | null;
};

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type SerializedConversationState = {
  schemaVersion: string;
  revision: number;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  sessionStartedAt: string;
  firstMessageId: string | null;
  lastProcessedMessageId: string | null;
  lastProcessedExternalMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  objective: JsonValue;
  secondaryObjectives: JsonValue[];
  activeTopics: string[];
  confirmedFacts: { [key: string]: JsonValue };
  temporaryFacts: { [key: string]: JsonValue };
  answeredQuestions: string[];
  pendingFields: string[];
  lastRelevantQuestion: JsonValue;
  lastRelevantQuestionMessageId: string | null;
  lastRelevantQuestionContextVersion: number | null;
  lastValidNextStep: string | null;
  selectedIntent: string | null;
  selectedFlowId: string | null;
  flowStage: string | null;
  status: ConversationStatus;
  actionState?: JsonValue;
  handoffState?: JsonValue;
};

export type TurnUnderstanding = {
  turnIntent: string;
  confidence: number;
  objectiveAction: ObjectiveAction;
  objective?: ConversationObjective | null;
  factsExtracted: ConfirmedFactInput[];
  correctedFactKeys: string[];
  answeredQuestionKey?: string;
  isShortConfirmation: boolean;
  confirmationAmbiguous?: boolean;
  isSideQuestion: boolean;
  explicitlyRequestsPreviousTopic: boolean;
  requestedInformationCategories: string[];
  requestedCategoryDerivation?: Record<string, string>;
  requestedAction?: string;
  nextQuestion?: RelevantQuestion | null;
  reasonCodes: string[];
  evidenceMessageIds: string[];
};

export type RetrievalPlan = {
  includeContactIdentity: boolean;
  memoryTopics: string[];
  knowledgeQueries: string[];
  officialFactCategories: string[];
  toolCapabilitiesNeeded: string[];
  reasons: string[];
};

export type RetrievedItem = {
  id: string;
  sourceType: string;
  category: string;
  content?: string;
  confidence?: number;
  relevanceScore?: number;
  selectionReason: string;
  scope: string;
  authoritativeFor: string[];
  expiresAt?: Date;
};

export type RetrievedContext = {
  identityMemories: RetrievedItem[];
  thematicMemories: RetrievedItem[];
  officialFacts: RetrievedItem[];
  knowledgeChunks: RetrievedItem[];
  toolResults: RetrievedItem[];
};

export type AuthorityRule = {
  category: string;
  authorizedSourceTypes: string[];
  required: boolean;
};

export type AuthorityPolicy = Record<string, AuthorityRule>;

export type AllowedClaim = {
  category: string;
  sourceIds: string[];
};

export type ResponsePlanAction =
  | "ANSWER"
  | "ASK_NEXT_QUESTION"
  | "USE_TOOL"
  | "REQUEST_CONFIRMATION"
  | "SAFE_UNAVAILABLE"
  | "HANDOFF";

export type ResponsePlan = {
  currentObjective: string | null;
  turnIntent: string;
  selectedFlowId: string | null;
  flowStage: string | null;
  factsAvailable: string[];
  factsMissing: string[];
  claimsAllowed: AllowedClaim[];
  claimsForbidden: string[];
  toolsAllowed: string[];
  action: ResponsePlanAction;
  responseGoal: string;
  nextQuestion?: string;
  shouldHandoff: boolean;
  reasonCodes: string[];
  evidenceMetadata?: {
    authorizedCategories: string[];
    contextualOnlyCategories: string[];
    unavailableCategories: string[];
    conflictCategories: string[];
    winningSourceTypes: string[];
  };
};

export type UsefulHistoryMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  relevance: "objective" | "question-reference" | "correction" | "tool-result";
};

export type PromptSection = {
  name: string;
  role: "system" | "user";
  content: string;
};

export type CompiledPrompt = {
  sections: PromptSection[];
  messages: Array<{ role: "system" | "user"; content: string }>;
  charCount: number;
  tokenEstimate: number;
};

export type ResponseValidationResult = {
  result: "PASS" | "BLOCK" | "SAFE_REPLACEMENT";
  reasonCodes: string[];
  unsupportedClaimDetected: boolean;
  unsupportedClaimCategories: string[];
  repeatedQuestionDetected: boolean;
  replacementCategory?: string;
};

export type RuntimeV2Manifest = {
  runtimeVersion: "V2";
  conversationStateVersion: string;
  companyId: string;
  assistantId: string;
  conversationId: string;
  contextVersion: number;
  currentMessageHash: string | null;
  currentObjective: string | null;
  objectiveAction: ObjectiveAction;
  turnIntent: string;
  intentConfidence: number;
  selectedFlowId: string | null;
  flowStage: string | null;
  confirmedFactKeys: string[];
  pendingFieldKeys: string[];
  answeredQuestionKeys: string[];
  identityMemoryCount: number;
  thematicMemoryCount: number;
  memoryRejectedReasons: string[];
  knowledgeChunkIds: string[];
  authorityCategoriesAvailable: string[];
  authorityCategoriesMissing: string[];
  toolsExposed: string[];
  responsePlanAction: ResponsePlanAction;
  unsupportedClaimDetected: boolean;
  unsupportedClaimCategories: string[];
  repeatedQuestionDetected: boolean;
  responseValidationResult: ResponseValidationResult["result"];
  promptSections: Array<{ name: string; role: string; charCount: number }>;
  promptCharCount: number;
  tokenEstimate: number;
  persistenceStatus: "not_persisted" | "shadow_only";
  outboundStatus: "not_sent" | "shadow_only";
};

export type RuntimeV2FeatureConfig = {
  runtimeVersion?: RuntimeVersion | null;
  runtimeV2Enabled?: boolean | null;
  shadowMode?: boolean | null;
  mode?: "OFF" | "SHADOW" | string | null;
  shadowAssistantIds?: string[] | null;
  evidenceMode?: "OFF" | "SHADOW_METADATA" | string | null;
};

export type RuntimeV2Scope = {
  companyId: string;
  assistantId: string;
  contactId?: string | null;
  conversationId: string;
  contextVersion: number;
};
