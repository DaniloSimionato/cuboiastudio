import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AttachmentInterpreterModule } from "../attachments/attachment-interpreter.module";
import { ChatwootModule } from "../chatwoot/chatwoot.module";
import { AppsModule } from "../apps/apps.module";
import { AssistantKnowledgeModule } from "../assistant-knowledge/assistant-knowledge.module";
import { PromptCompilerModule } from "../prompt-compiler/prompt-compiler.module";
import { IntentRouterModule } from "../intent-router/intent-router.module";
import { AssistantSecurityRulesModule } from "../assistant-security-rules/assistant-security-rules.module";
import { AssistantConversationsController } from "./assistant-conversations.controller";
import { AssistantConversationsService } from "./assistant-conversations.service";

@Module({
  imports: [
    AiModule,
    AttachmentInterpreterModule,
    ChatwootModule,
    AppsModule,
    AssistantKnowledgeModule,
    PromptCompilerModule,
    IntentRouterModule,
    AssistantSecurityRulesModule,
  ],
  controllers: [AssistantConversationsController],
  providers: [AssistantConversationsService],
  exports: [AssistantConversationsService],
})
export class AssistantConversationsModule {}
