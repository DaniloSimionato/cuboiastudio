import { Module } from "@nestjs/common";
import { AssistantsController } from "./assistants.controller";
import { AssistantsService } from "./assistants.service";
import { AssistantKnowledgeModule } from "../assistant-knowledge/assistant-knowledge.module";
import { AiModule } from "../ai/ai.module";
import { PromptCompilerModule } from "../prompt-compiler/prompt-compiler.module";

@Module({
  imports: [AssistantKnowledgeModule, AiModule, PromptCompilerModule],
  controllers: [AssistantsController],
  providers: [AssistantsService],
})
export class AssistantsModule {}
