import { Module } from "@nestjs/common";
import { AiSettingsModule } from "../ai-settings/ai-settings.module";
import { AiService } from "./ai.service";

@Module({
  imports: [AiSettingsModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
