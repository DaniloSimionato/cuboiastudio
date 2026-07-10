import { Module } from "@nestjs/common";
import { AssistantSecurityRulesController } from "./assistant-security-rules.controller";
import { AssistantSecurityRulesService } from "./assistant-security-rules.service";

@Module({
  controllers: [AssistantSecurityRulesController],
  providers: [AssistantSecurityRulesService],
  exports: [AssistantSecurityRulesService],
})
export class AssistantSecurityRulesModule {}
