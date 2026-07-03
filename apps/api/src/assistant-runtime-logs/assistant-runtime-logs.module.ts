import { Module } from "@nestjs/common";
import { AssistantRuntimeLogsController } from "./assistant-runtime-logs.controller";
import { AssistantRuntimeLogsService } from "./assistant-runtime-logs.service";

@Module({
  controllers: [AssistantRuntimeLogsController],
  providers: [AssistantRuntimeLogsService],
})
export class AssistantRuntimeLogsModule {}
