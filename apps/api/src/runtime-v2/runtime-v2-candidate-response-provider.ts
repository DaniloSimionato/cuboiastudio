import { Injectable } from "@nestjs/common";
import { AiService } from "../ai/ai.service";
import type { CandidateResponseProvider } from "./candidate-response";

@Injectable()
export class RuntimeV2CandidateResponseProvider implements CandidateResponseProvider {
  constructor(private readonly aiService: AiService) {}

  generate(input: Parameters<CandidateResponseProvider["generate"]>[0]) {
    return this.aiService.generateChatCompletion({
      companyId: input.companyId,
      messages: input.messages,
      ...(input.model ? { model: input.model } : {}),
      ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
      tools: [],
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
}
