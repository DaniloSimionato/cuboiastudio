import { Module } from "@nestjs/common";
import { IntentRouterService } from "./intent-router.service";
import { AiSettingsModule } from "../ai-settings/ai-settings.module";
import { AiService } from "../ai/ai.service";

@Module({
  imports: [AiSettingsModule],
  providers: [IntentRouterService, AiService],
  exports: [IntentRouterService],
})
export class IntentRouterModule {}
