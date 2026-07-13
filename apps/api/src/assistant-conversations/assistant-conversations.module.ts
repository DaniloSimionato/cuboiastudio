import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AttachmentInterpreterModule } from "../attachments/attachment-interpreter.module";
import { ChatwootModule } from "../chatwoot/chatwoot.module";
import { AppsModule } from "../apps/apps.module";
import { AssistantKnowledgeModule } from "../assistant-knowledge/assistant-knowledge.module";
import { PromptCompilerModule } from "../prompt-compiler/prompt-compiler.module";
import { IntentRouterModule } from "../intent-router/intent-router.module";
import { AssistantSecurityRulesModule } from "../assistant-security-rules/assistant-security-rules.module";
import { ContactMemoriesModule } from "../contact-memories/contact-memories.module";
import { AssistantConversationsController } from "./assistant-conversations.controller";
import { AssistantConversationsService } from "./assistant-conversations.service";
import { InMemoryConversationStateStore } from "../runtime-v2/conversation-state-store";
import { RuntimeV2ShadowOrchestrator } from "../runtime-v2/runtime-v2-shadow-orchestrator";

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
    ContactMemoriesModule,
  ],
  controllers: [AssistantConversationsController],
  providers: [
    InMemoryConversationStateStore,
    {
      provide: RuntimeV2ShadowOrchestrator,
      useFactory: (stateStore: InMemoryConversationStateStore) =>
        new RuntimeV2ShadowOrchestrator(stateStore),
      inject: [InMemoryConversationStateStore],
    },
    AssistantConversationsService,
  ],
  exports: [AssistantConversationsService],
})
export class AssistantConversationsModule {}
