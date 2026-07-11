import { Module } from "@nestjs/common";
import { AttachmentInterpreterService } from "./attachment-interpreter.service";
import { OpenAiAttachmentInterpreterProvider } from "./openai-attachment-interpreter.provider";
import type { AttachmentInterpreterProvider } from "./attachment-interpreter.types";
import { AiModule } from "../ai/ai.module";
import { AiService } from "../ai/ai.service";

export const ATTACHMENT_INTERPRETER_PROVIDER = Symbol("ATTACHMENT_INTERPRETER_PROVIDER");

function createAttachmentInterpreterProvider(): AttachmentInterpreterProvider | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return new OpenAiAttachmentInterpreterProvider(apiKey, {
    visionModel: process.env.OPENAI_ATTACHMENT_VISION_MODEL,
    transcriptionModel: process.env.OPENAI_ATTACHMENT_TRANSCRIPTION_MODEL,
  });
}

@Module({
  imports: [AiModule],
  providers: [
    {
      provide: ATTACHMENT_INTERPRETER_PROVIDER,
      useFactory: createAttachmentInterpreterProvider,
    },
    {
      provide: AttachmentInterpreterService,
      useFactory: (provider: AttachmentInterpreterProvider | null, aiService: AiService) =>
        new AttachmentInterpreterService(provider, aiService),
      inject: [ATTACHMENT_INTERPRETER_PROVIDER, AiService],
    },
  ],
  exports: [AttachmentInterpreterService],
})
export class AttachmentInterpreterModule {}
