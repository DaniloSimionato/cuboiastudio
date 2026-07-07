import { Module } from "@nestjs/common";
import { AssistantFlowsController } from "./assistant-flows.controller";
import { AssistantFlowsService } from "./assistant-flows.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AssistantFlowsController],
  providers: [AssistantFlowsService],
  exports: [AssistantFlowsService],
})
export class AssistantFlowsModule {}
