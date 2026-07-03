import { Module } from "@nestjs/common";
import { AttachmentInterpreterService } from "./attachment-interpreter.service";
import { OpenAiAttachmentInterpreterProvider } from "./openai-attachment-interpreter.provider";
import type { AttachmentInterpreterProvider } from "./attachment-interpreter.types";

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
  providers: [
    {
      provide: ATTACHMENT_INTERPRETER_PROVIDER,
      useFactory: createAttachmentInterpreterProvider,
    },
    {
      provide: AttachmentInterpreterService,
      useFactory: (provider: AttachmentInterpreterProvider | null) =>
        new AttachmentInterpreterService(provider),
      inject: [ATTACHMENT_INTERPRETER_PROVIDER],
    },
  ],
  exports: [AttachmentInterpreterService],
})
export class AttachmentInterpreterModule {}
