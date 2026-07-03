import { Module } from "@nestjs/common";
import { AssistantKnowledgeController } from "./assistant-knowledge.controller";
import { AssistantKnowledgeService } from "./assistant-knowledge.service";

@Module({
  controllers: [AssistantKnowledgeController],
  providers: [AssistantKnowledgeService],
})
export class AssistantKnowledgeModule {}
