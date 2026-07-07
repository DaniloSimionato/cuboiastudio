import { Injectable, Logger } from "@nestjs/common";
import { AssistantFlow } from "@prisma/client";
import { AiService } from "../ai/ai.service";

export type IntentRouterInput = {
  companyId: string;
  assistantId: string;
  message: string;
  flows: AssistantFlow[];
  model?: string;
  temperature?: number;
};

export type IntentRouterResult = {
  flowId: string | null;
  flowName: string | null;
  confidence: number;
  reason?: string;
};

@Injectable()
export class IntentRouterService {
  private readonly logger = new Logger(IntentRouterService.name);

  constructor(private readonly aiService: AiService) {}

  async route(input: IntentRouterInput): Promise<IntentRouterResult> {
    if (!input.flows || input.flows.length === 0) {
      return { flowId: null, flowName: null, confidence: 0, reason: "No flows available" };
    }

    const activeFlows = input.flows.filter((f) => f.active).sort((a, b) => b.priority - a.priority);
    
    if (activeFlows.length === 0) {
      return { flowId: null, flowName: null, confidence: 0, reason: "No active flows" };
    }

    const messageLower = input.message.toLowerCase();

    // 1. Fixed triggers (Keywords) - Prioritize highest priority flow with keyword match
    for (const flow of activeFlows) {
      if (flow.triggerKeywords) {
        try {
          const keywords: string[] = JSON.parse(flow.triggerKeywords);
          if (Array.isArray(keywords)) {
            for (const keyword of keywords) {
              if (keyword && messageLower.includes(keyword.toLowerCase())) {
                this.logger.debug(`Flow matched by keyword: ${flow.name} (keyword: ${keyword})`);
                return {
                  flowId: flow.id,
                  flowName: flow.name,
                  confidence: 1.0,
                  reason: `Keyword match: ${keyword}`,
                };
              }
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to parse triggerKeywords for flow ${flow.id}`);
        }
      }
    }

    // 2. LLM Fallback (if configured and no keyword match)
    const flowsWithDescriptions = activeFlows.filter((f) => f.triggerDescription?.trim());
    if (flowsWithDescriptions.length === 0) {
      return { flowId: null, flowName: null, confidence: 0, reason: "No flows with descriptions for LLM" };
    }

    try {
      const prompt = `Classifique a intenção da mensagem do cliente em um dos fluxos disponíveis. Responda APENAS com o ID do fluxo selecionado, ou "fallback" se nenhum fluxo se adequar.\n\nFluxos disponíveis:\n` +
        flowsWithDescriptions.map((f) => `- ID: ${f.id} | Nome: ${f.name} | Intenção: ${f.triggerDescription}`).join("\n") +
        `\n\nMensagem do cliente: "${input.message}"`;

      const completion = await this.aiService.generateChatCompletion({
        companyId: input.companyId,
        model: input.model,
        temperature: 0.1, // Low temperature for deterministic classification
        messages: [
          {
            role: "system",
            content: "Você é um roteador de intenção. Responda APENAS com o ID do fluxo correspondente, ou com a palavra 'fallback'."
          },
          {
            role: "user",
            content: prompt,
          }
        ]
      });

      const responseText = (completion.answer || "").trim();
      
      if (responseText.toLowerCase() === "fallback") {
        return { flowId: null, flowName: null, confidence: 0.8, reason: "LLM selected fallback" };
      }

      const matchedFlow = flowsWithDescriptions.find(f => responseText.includes(f.id));
      if (matchedFlow) {
        this.logger.debug(`Flow matched by LLM: ${matchedFlow.name}`);
        return {
          flowId: matchedFlow.id,
          flowName: matchedFlow.name,
          confidence: 0.8,
          reason: "LLM semantic match",
        };
      }

      return { flowId: null, flowName: null, confidence: 0, reason: "LLM response did not match any flow ID" };
    } catch (err) {
      const e = err as Error;
      this.logger.error(`Intent classification failed: ${e.message}`);
      return { flowId: null, flowName: null, confidence: 0, reason: `LLM error: ${e.message}` };
    }
  }
}
