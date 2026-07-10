import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ContactMemoriesController } from "./contact-memories.controller";
import { ContactMemoriesService } from "./contact-memories.service";
import { ContactMemoriesExtractionService } from "./contact-memories-extraction.service";

@Module({
  imports: [AiModule],
  controllers: [ContactMemoriesController],
  providers: [ContactMemoriesService, ContactMemoriesExtractionService],
  exports: [ContactMemoriesService, ContactMemoriesExtractionService],
})
export class ContactMemoriesModule {}
