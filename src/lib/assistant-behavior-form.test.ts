import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAssistantBehaviorPayload,
  isAssistantBehaviorDirty,
  normalizeAssistantBehavior,
} from "./assistant-behavior-form.ts";
import { DEFAULT_ASSISTANT_BEHAVIOR } from "../types/assistant-behavior.types.ts";

test("normaliza behavior sem transformar false ou zero em defaults", () => {
  const behavior = normalizeAssistantBehavior({
    showAttendantName: false,
    noInventInfo: false,
    maxBlockLength: 0,
    responseStyle: "concise",
  });

  assert.equal(behavior.showAttendantName, false);
  assert.equal(behavior.noInventInfo, false);
  assert.equal(behavior.maxBlockLength, 0);
  assert.equal(behavior.responseStyle, "concise");
});

test("payload de behavior contém os campos salvos e normaliza strings vazias explicitamente", () => {
  const payload = buildAssistantBehaviorPayload(
    {
      ...DEFAULT_ASSISTANT_BEHAVIOR,
      attendantName: "  Giovanna  ",
      showAttendantName: false,
      responseStyle: "whatsapp",
    },
    "  Olá!  ",
    "  Objetiva  ",
    "  Amigável  ",
  );

  assert.deepEqual(payload, {
    ...DEFAULT_ASSISTANT_BEHAVIOR,
    attendantName: "Giovanna",
    showAttendantName: false,
    role: null,
    howItActs: null,
    greetingMessage: "Olá!",
    personality: "Objetiva",
    toneOfVoice: "Amigável",
  });

  const cleared = buildAssistantBehaviorPayload(DEFAULT_ASSISTANT_BEHAVIOR, "", "", "");
  assert.equal(cleared.greetingMessage, null);
  assert.equal(cleared.personality, null);
  assert.equal(cleared.toneOfVoice, null);
});

test("dirty state distingue formulário sincronizado de alteração local", () => {
  assert.equal(
    isAssistantBehaviorDirty(DEFAULT_ASSISTANT_BEHAVIOR, DEFAULT_ASSISTANT_BEHAVIOR),
    false,
  );
  assert.equal(
    isAssistantBehaviorDirty(
      { ...DEFAULT_ASSISTANT_BEHAVIOR, showAttendantName: false },
      DEFAULT_ASSISTANT_BEHAVIOR,
    ),
    true,
  );
});

test("estado local permanece intacto quando a operação de save falha", async () => {
  const local = { ...DEFAULT_ASSISTANT_BEHAVIOR, attendantName: "Giovanna" };
  await assert.rejects(() => Promise.reject(new Error("API indisponível")), /API indisponível/);
  assert.equal(local.attendantName, "Giovanna");
});
