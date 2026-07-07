import { Module } from "@nestjs/common";
import { AssistantKnowledgeController } from "./assistant-knowledge.controller";
import { AssistantKnowledgeService } from "./assistant-knowledge.service";
import { AssistantKnowledgeRetrievalService } from "./assistant-knowledge-retrieval.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [AiModule],
  controllers: [AssistantKnowledgeController],
  providers: [AssistantKnowledgeService, AssistantKnowledgeRetrievalService],
  exports: [AssistantKnowledgeService, AssistantKnowledgeRetrievalService],
})
export class AssistantKnowledgeModule {}
