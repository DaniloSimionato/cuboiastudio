import { Module } from "@nestjs/common";
import { AssistantKnowledgeController } from "./assistant-knowledge.controller";
import { AssistantKnowledgeService } from "./assistant-knowledge.service";

import { AssistantKnowledgeRetrievalService } from "./assistant-knowledge-retrieval.service";

@Module({
  controllers: [AssistantKnowledgeController],
  providers: [AssistantKnowledgeService, AssistantKnowledgeRetrievalService],
  exports: [AssistantKnowledgeService, AssistantKnowledgeRetrievalService],
})
export class AssistantKnowledgeModule {}
