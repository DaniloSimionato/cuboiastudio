import assert from "node:assert/strict";
import test from "node:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NotFoundException } from "@nestjs/common";
import { Status } from "@prisma/client";
import { AssistantBehaviorsService } from "../dist/assistant-behaviors/assistant-behaviors.service.js";
import { AssistantsService } from "../dist/assistants/assistants.service.js";
import { CreateAssistantDto } from "../dist/assistants/dto/create-assistant.dto.js";
import { UpdateAssistantDto } from "../dist/assistants/dto/update-assistant.dto.js";
import { UpsertAssistantBehaviorDto } from "../dist/assistant-behaviors/dto/upsert-assistant-behavior.dto.js";

function assistantRecord(overrides = {}) {
  return {
    id: "assistant-1",
    name: "Assistente",
    description: null,
    businessAddress: null,
    businessCityRegion: null,
    businessCity: null,
    businessState: null,
    businessPostalCode: null,
    businessPhone: null,
    businessWhatsapp: null,
    businessWhatsappSupport: null,
    websiteUrl: null,
    timezone: "America/Sao_Paulo",
    googleMapsUrl: null,
    latitude: null,
    longitude: null,
    weeklySchedule: null,
    aiAlwaysAvailable: true,
    initialMessage: null,
    instructions: null,
    personality: "Objetiva",
    toneOfVoice: "Amigável",
    avoidPhrases: null,
    model: "gpt-test",
    temperature: 0,
    fallbackMessage: null,
    safetyInstruction: null,
    ragEnabled: false,
    conversationResetEnabled: false,
    conversationResetKeywords: ["reset"],
    conversationResetConfirmationMessage: "reset ok",
    conversationResetPreserveMemories: true,
    conversationResetSendInitialMessage: true,
    memoryEnabled: false,
    memoryPrePromptEnabled: true,
    memoryExtractionEnabled: true,
    memoryAllowedCategories: null,
    memoryConfidenceThreshold: 0.7,
    memoryTempDefaultDays: 7,
    memorySharedAcrossAssistants: true,
    semanticMemoryEnabled: false,
    semanticMemoryThreshold: 0.7,
    semanticMemoryMaxCandidates: 20,
    semanticMemoryMaxResults: 10,
    messageBufferEnabled: false,
    messageBufferSeconds: 3,
    splitResponseEnabled: false,
    splitResponseStyle: "SINGLE",
    status: Status.ACTIVE,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    behavior: null,
    ...overrides,
  };
}

function authContext(companyId = "company-1") {
  return {
    user: { companyId },
    tenant: { companyId },
  };
}

test("DTO aceita números/booleanos e rejeita valores arbitrários de behavior", async () => {
  const valid = plainToInstance(UpdateAssistantDto, {
    temperature: "0",
    messageBufferSeconds: "3",
    behavior: {
      responseStyle: "concise",
      showAttendantName: false,
      maxBlockLength: "300",
    },
  });
  const validErrors = await validate(valid);
  assert.equal(validErrors.length, 0);
  assert.equal(valid.temperature, 0);
  assert.equal(valid.behavior.maxBlockLength, 300);
  assert.equal(valid.behavior.showAttendantName, false);

  const invalid = plainToInstance(UpsertAssistantBehaviorDto, { responseStyle: "robotic" });
  const errors = await validate(invalid);
  assert.ok(errors.some((error) => error.property === "responseStyle"));
});

test("create persiste behavior dentro da mesma transação e retorna o objeto oficial", async () => {
  const calls = [];
  const record = assistantRecord({ behavior: { assistantId: "assistant-1", responseStyle: "whatsapp" } });
  const prisma = {
    $transaction: async (callback) => callback({
      assistant: {
        create: async () => ({ id: "assistant-1" }),
        findFirst: async () => record,
      },
      assistantBehavior: {
        create: async (args) => {
          calls.push(args);
          return record.behavior;
        },
      },
    }),
  };
  const service = new AssistantsService(prisma, {}, {}, {});
  const result = await service.create({
    dto: {
      name: "Assistente",
      temperature: 0,
      behavior: { responseStyle: "whatsapp", showAttendantName: false },
    },
    ...authContext(),
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].data.assistantId, "assistant-1");
  assert.equal(calls[0].data.showAttendantName, false);
  assert.equal(result.behavior.responseStyle, "whatsapp");
  assert.equal(result.temperature, 0);
});

test("update grava Assistant e AssistantBehavior atomicamente, preservando false e zero", async () => {
  const calls = { assistant: null, behavior: null };
  const record = assistantRecord({
    temperature: 0,
    messageBufferEnabled: false,
    behavior: { assistantId: "assistant-1", responseStyle: "concise", showAttendantName: false },
  });
  const prisma = {
    assistant: { findFirst: async () => ({ id: "assistant-1" }) },
    $transaction: async (callback) => callback({
      assistant: {
        updateMany: async ({ data }) => {
          calls.assistant = data;
          return { count: 1 };
        },
        findFirst: async () => record,
      },
      assistantBehavior: {
        upsert: async (args) => {
          calls.behavior = args;
          return record.behavior;
        },
      },
    }),
  };
  const service = new AssistantsService(prisma, {}, {}, {});
  const result = await service.update({
    id: "assistant-1",
    dto: {
      temperature: 0,
      messageBufferEnabled: false,
      behavior: { responseStyle: "concise", showAttendantName: false },
    },
    ...authContext(),
  });

  assert.equal(calls.assistant.temperature, 0);
  assert.equal(calls.assistant.messageBufferEnabled, false);
  assert.equal(calls.behavior.where.assistantId, "assistant-1");
  assert.equal(calls.behavior.update.responseStyle, "concise");
  assert.equal(result.temperature, 0);
  assert.equal(result.messageBufferEnabled, false);
});

test("PATCH parcial de outro campo não apaga behavior já persistido", async () => {
  let behaviorUpserted = false;
  const persistedBehavior = {
    assistantId: "assistant-1",
    responseStyle: "formal",
    personality: "Persistida",
  };
  const prisma = {
    assistant: { findFirst: async () => ({ id: "assistant-1" }) },
    $transaction: async (callback) => callback({
      assistant: {
        updateMany: async () => ({ count: 1 }),
        findFirst: async () => assistantRecord({ behavior: persistedBehavior }),
      },
      assistantBehavior: {
        upsert: async () => {
          behaviorUpserted = true;
          return persistedBehavior;
        },
      },
    }),
  };
  const service = new AssistantsService(prisma, {}, {}, {});
  const result = await service.update({
    id: "assistant-1",
    dto: { messageBufferSeconds: 8 },
    ...authContext(),
  });

  assert.equal(behaviorUpserted, false);
  assert.equal(result.behavior.responseStyle, "formal");
  assert.equal(result.behavior.personality, "Persistida");
});

test("upsert direto não duplica por assistantId e mantém isolamento por tenant", async () => {
  let row = null;
  let createCount = 0;
  const prisma = {
    assistant: { findFirst: async ({ where }) => (where.companyId === "company-1" ? { id: where.id } : null) },
    $transaction: async (callback) => callback({
      assistantBehavior: {
        upsert: async ({ create, update }) => {
          if (!row) {
            createCount += 1;
            row = { id: "behavior-1", assistantId: create.assistantId, ...create };
          } else {
            row = { ...row, ...update };
          }
          return { ...row, updatedAt: new Date() };
        },
      },
    }),
  };
  const service = new AssistantBehaviorsService(prisma);
  const first = await service.upsert("company-1", "assistant-1", { responseStyle: "whatsapp" });
  const second = await service.upsert("company-1", "assistant-1", { responseStyle: "concise" });
  assert.equal(first.id, second.id);
  assert.equal(createCount, 1);
  assert.equal(second.responseStyle, "concise");

  await assert.rejects(
    () => service.upsert("company-2", "assistant-1", { responseStyle: "formal" }),
    NotFoundException,
  );
});
