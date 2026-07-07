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

export type CreateAssistantFlowDto = Omit<AssistantFlow, "id" | "assistantId" | "createdAt" | "updatedAt">;
export type UpdateAssistantFlowDto = Partial<CreateAssistantFlowDto>;
