import { Module } from "@nestjs/common";
import { AssistantBehaviorsController } from "./assistant-behaviors.controller";
import { AssistantBehaviorsService } from "./assistant-behaviors.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AssistantBehaviorsController],
  providers: [AssistantBehaviorsService],
  exports: [AssistantBehaviorsService],
})
export class AssistantBehaviorsModule {}
