export interface AssistantFlowCalendarToolContext {
  category?: string | null;
  sportType?: string | null;
  resourceType?: string | null;
  attribute?: string | null;
  durationMinutes?: number | null;
  isCovered?: boolean | null;
  resourceIds?: string[] | null;
  calendarIds?: string[] | null;
}

export interface AssistantFlowToolContext {
  calendar?: AssistantFlowCalendarToolContext | null;
}

export interface AssistantFlow {
  id: string;
  assistantId: string;
  name: string;
  description: string | null;
  priority: number;
  triggerKeywords: string | null;
  triggerDescription: string | null;
  triggerExamples: string | null;
  flowInstructions: string | null;
  allowedToolSlugs: string | null;
  knowledgeScope: string | null;
  toolContext: AssistantFlowToolContext | null;
  finalAction: string | null;
  fixedMessage: string | null;
  handoffTeamId: string | null;
  handoffTeamName: string | null;
  chatwootLabels: string | null;
  autoRespond: boolean;
  requiresHuman: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateAssistantFlowDto = Omit<
  AssistantFlow,
  "id" | "assistantId" | "createdAt" | "updatedAt"
>;
export type UpdateAssistantFlowDto = Partial<CreateAssistantFlowDto>;
