import { Injectable, Logger } from "@nestjs/common";
import { AssistantFlow } from "@prisma/client";
import { AiService } from "../ai/ai.service";
import {
  flowIntentKey,
  scoreFlowCandidates,
  type FlowKeywordEvidence,
} from "./intent-routing";

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
  flowSelectionMethod?: "keyword_scored" | "llm_semantic" | "none";
  score?: number;
  matchedAliases?: string[];
  candidates?: FlowKeywordEvidence[];
  secondaryIntentKeys?: string[];
};

@Injectable()
export class IntentRouterService {
  private readonly logger = new Logger(IntentRouterService.name);

  constructor(private readonly aiService: AiService) {}

  async route(input: IntentRouterInput): Promise<IntentRouterResult> {
    if (!input.message?.trim()) {
      return {
        flowId: null,
        flowName: null,
        confidence: 0,
        flowSelectionMethod: "none",
        reason: "No customer intent text",
      };
    }
    if (!input.flows || input.flows.length === 0) {
      return { flowId: null, flowName: null, confidence: 0, reason: "No flows available" };
    }

    const activeFlows = input.flows.filter((f) => f.active);
    
    if (activeFlows.length === 0) {
      return { flowId: null, flowName: null, confidence: 0, reason: "No active flows" };
    }

    // Evaluate every active flow. Priority is only a deterministic tie-breaker.
    const candidates = scoreFlowCandidates(input.message, activeFlows);
    const best = candidates[0];
    if (best && best.score >= 2) {
      const secondaryIntentKeys = candidates
        .slice(1)
        .filter((candidate) => candidate.score >= 2)
        .map((candidate) => flowIntentKey(candidate.flowName));
      const confidence = Math.min(0.99, 0.55 + best.score / 12);
      this.logger.debug(
        `Flow matched by scored evidence: ${best.flowName} (${best.matchedAliases.join(", ")})`,
      );
      return {
        flowId: best.flowId,
        flowName: best.flowName,
        confidence,
        score: best.score,
        matchedAliases: best.matchedAliases,
        candidates,
        secondaryIntentKeys,
        flowSelectionMethod: "keyword_scored",
        reason: `Scored keyword match: ${best.matchedAliases.join(", ")}`,
      };
    }

    // 2. LLM Fallback (if configured and no keyword match)
    const flowsWithDescriptions = activeFlows.filter((f) => f.triggerDescription?.trim());
    if (flowsWithDescriptions.length === 0) {
      return {
        flowId: null,
        flowName: null,
        confidence: 0,
        candidates,
        flowSelectionMethod: "none",
        reason: "No flows with descriptions for LLM",
      };
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
        return {
          flowId: null,
          flowName: null,
          confidence: 0.8,
          candidates,
          flowSelectionMethod: "llm_semantic",
          reason: "LLM selected fallback",
        };
      }

      const matchedFlow = flowsWithDescriptions.find(f => responseText.includes(f.id));
      if (matchedFlow) {
        this.logger.debug(`Flow matched by LLM: ${matchedFlow.name}`);
        return {
          flowId: matchedFlow.id,
          flowName: matchedFlow.name,
          confidence: 0.8,
          candidates,
          flowSelectionMethod: "llm_semantic",
          reason: "LLM semantic match",
        };
      }

      return {
        flowId: null,
        flowName: null,
        confidence: 0,
        candidates,
        flowSelectionMethod: "none",
        reason: "LLM response did not match any flow ID",
      };
    } catch (err) {
      const e = err as Error;
      this.logger.error(`Intent classification failed: ${e.message}`);
      return {
        flowId: null,
        flowName: null,
        confidence: 0,
        candidates,
        flowSelectionMethod: "none",
        reason: `LLM error: ${e.message}`,
      };
    }
  }
}
