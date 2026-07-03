import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AttachmentInterpreterModule } from "../attachments/attachment-interpreter.module";
import { ChatwootModule } from "../chatwoot/chatwoot.module";
import { AssistantConversationsController } from "./assistant-conversations.controller";
import { AssistantConversationsService } from "./assistant-conversations.service";

@Module({
  imports: [AiModule, AttachmentInterpreterModule, ChatwootModule],
  controllers: [AssistantConversationsController],
  providers: [AssistantConversationsService],
  exports: [AssistantConversationsService],
})
export class AssistantConversationsModule {}
