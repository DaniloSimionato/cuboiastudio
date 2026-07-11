import assert from "node:assert/strict";
import test from "node:test";
import {
  assistantFormSnapshotsEqual,
  canonicalizeAssistantFormSnapshot,
} from "./assistant-form-snapshot.ts";

const base = {
  name: "Assistente",
  timezone: "America/Sao_Paulo",
  weeklySchedule: {
    monday: [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
  },
  memoryAllowedCategories: ["PREFERENCE", "IDENTITY"],
  conversationResetKeywordsRaw: " novo, reset ",
  messageBufferEnabled: false,
  messageBufferSeconds: "6",
  temperature: "0",
  behavior: { showAttendantName: false, maxBlockLength: "300" },
};

test("snapshot ignora diferenças equivalentes de tipos, null e ordem", () => {
  assert.equal(
    assistantFormSnapshotsEqual(base, {
      ...base,
      weeklySchedule: {
        monday: [{ start: "13:00", end: "18:00" }, { start: "08:00", end: "12:00" }],
      },
      memoryAllowedCategories: ["IDENTITY", "PREFERENCE"],
      conversationResetKeywordsRaw: "reset,novo",
      messageBufferSeconds: 6,
      temperature: 0,
      behavior: { showAttendantName: false, maxBlockLength: 300 },
    }),
    true,
  );
});

test("snapshot preserva alterações reais, incluindo false e zero", () => {
  assert.notEqual(
    assistantFormSnapshotsEqual(base, {
      ...base,
      messageBufferEnabled: true,
    }),
    true,
  );
  assert.notEqual(
    assistantFormSnapshotsEqual(base, {
      ...base,
      temperature: 0.1,
    }),
    true,
  );
});

test("snapshot normaliza estado persistido sem campos visuais", () => {
  const snapshot = canonicalizeAssistantFormSnapshot({
    ...base,
    behavior: {
      ...base.behavior,
      id: "behavior-1",
      assistantId: "assistant-1",
      updatedAt: "2026-07-11T00:00:00Z",
    },
  });

  assert.deepEqual(snapshot.behavior, canonicalizeAssistantFormSnapshot(base).behavior);
});

test("snapshot mantém um assistente sem edição estável após reidratação", () => {
  const first = canonicalizeAssistantFormSnapshot(base);
  const second = canonicalizeAssistantFormSnapshot({ ...base, description: undefined });

  assert.equal(assistantFormSnapshotsEqual(first, second), true);
});
