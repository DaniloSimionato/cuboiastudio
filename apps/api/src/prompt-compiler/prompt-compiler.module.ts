import { Module } from "@nestjs/common";
import { PromptCompilerService } from "./prompt-compiler.service";

@Module({
  providers: [PromptCompilerService],
  exports: [PromptCompilerService],
})
export class PromptCompilerModule {}
