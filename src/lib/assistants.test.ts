import assert from "node:assert/strict";
import test from "node:test";

import {
  filterOperationalAssistants,
  isOperationalAssistant,
  isSmokeAssistant,
  isSmokeAssistantName,
  resolveOperationalAssistantId,
} from "./assistants.ts";
import type { BackendAssistantListItem } from "../types/index.ts";

const activeRealAssistant: BackendAssistantListItem = {
  id: "assistant_real_active",
  name: "Assistente Demo",
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
  timezone: null,
  googleMapsUrl: null,
  latitude: null,
  longitude: null,
  weeklySchedule: null,
  aiAlwaysAvailable: true,
  initialMessage: null,
  instructions: null,
  personality: null,
  toneOfVoice: null,
  avoidPhrases: null,
  model: null,
  temperature: null,
  fallbackMessage: null,
  safetyInstruction: null,
  ragEnabled: false,
  messageBufferEnabled: true,
  messageBufferSeconds: 6,
  splitResponseEnabled: false,
  splitResponseStyle: null,
  status: "ACTIVE",
  createdAt: "2026-07-02T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
};

const inactiveRealAssistant: BackendAssistantListItem = {
  ...activeRealAssistant,
  id: "assistant_real_inactive",
  name: "Drimo Sport Clube",
  status: "INACTIVE",
};

const smokeAssistant: BackendAssistantListItem = {
  ...activeRealAssistant,
  id: "assistant_smoke",
  name: "[SMOKE:run-123] Assistente Smoke Test Atualizado",
};

test("identifica nomes de smoke em formatos novos e legados", () => {
  assert.equal(isSmokeAssistantName("[SMOKE] Assistente Smoke Test"), true);
  assert.equal(isSmokeAssistantName("[SMOKE:run-123] Assistente Smoke Test"), true);
  assert.equal(isSmokeAssistantName("Assistente Smoke Test Atualizado"), true);
  assert.equal(isSmokeAssistantName("Assistente Demo"), false);
  assert.equal(isSmokeAssistant(smokeAssistant), true);
  assert.equal(isSmokeAssistant(activeRealAssistant), false);
});

test("filtra apenas assistentes operacionais ativos por padrão", () => {
  assert.equal(isOperationalAssistant(activeRealAssistant), true);
  assert.equal(isOperationalAssistant(inactiveRealAssistant), false);
  assert.equal(isOperationalAssistant(smokeAssistant), false);

  assert.deepEqual(
    filterOperationalAssistants([activeRealAssistant, inactiveRealAssistant, smokeAssistant]).map(
      (assistant) => assistant.id,
    ),
    ["assistant_real_active"],
  );
});

test("permite incluir inativos reais sem nunca expor smoke", () => {
  assert.deepEqual(
    filterOperationalAssistants([activeRealAssistant, inactiveRealAssistant, smokeAssistant], {
      includeInactive: true,
    }).map((assistant) => assistant.id),
    ["assistant_real_active", "assistant_real_inactive"],
  );
});

test("resolve automaticamente um ID salvo de smoke para o primeiro assistente real", () => {
  const assistants = [smokeAssistant, activeRealAssistant, inactiveRealAssistant];

  assert.equal(
    resolveOperationalAssistantId(assistants, smokeAssistant.id),
    activeRealAssistant.id,
  );
  assert.equal(
    resolveOperationalAssistantId(assistants, inactiveRealAssistant.id, { includeInactive: true }),
    inactiveRealAssistant.id,
  );
  assert.equal(resolveOperationalAssistantId([smokeAssistant], smokeAssistant.id), "");
});
