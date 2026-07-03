import { Module } from "@nestjs/common";
import { ChatwootAttachmentDownloaderService } from "./chatwoot-attachment-downloader.service";
import { ChatwootInboxConfigService } from "./chatwoot-inbox-config.service";
import { ChatwootSettingsController } from "./chatwoot-settings.controller";

@Module({
  providers: [ChatwootInboxConfigService, ChatwootAttachmentDownloaderService],
  exports: [ChatwootInboxConfigService, ChatwootAttachmentDownloaderService],
  controllers: [ChatwootSettingsController],
})
export class ChatwootModule {}
