import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { DiagnosticsController } from "./diagnostics.controller";

@Module({
  imports: [AiModule],
  controllers: [DiagnosticsController],
})
export class DiagnosticsModule {}
