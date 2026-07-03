import { Module } from "@nestjs/common";
import { AssistantConversationsModule } from "../assistant-conversations/assistant-conversations.module";
import { ChatwootModule } from "../chatwoot/chatwoot.module";
import { ChatwootWebhookService } from "../chatwoot/chatwoot-webhook.service";
import { ChatwootController } from "./chatwoot.controller";

@Module({
  imports: [AssistantConversationsModule, ChatwootModule],
  providers: [ChatwootWebhookService],
  controllers: [ChatwootController],
})
export class WebhooksModule {}
