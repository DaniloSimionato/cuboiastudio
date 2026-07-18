import assert from "node:assert/strict";
import test from "node:test";
import {
  RuntimeV2ResponseExecutionCoordinator,
  createRuntimeV2ResponseExecutionApproval,
} from "../dist/runtime-v2/index.js";

const scope = { companyId: "company", assistantId: "assistant", conversationId: "conversation" };
function record() {
  const approval = createRuntimeV2ResponseExecutionApproval({
    ...scope,
    expectedCanonicalComparisonHash: "hash",
    canonicalVersion: "v1",
    expiresAt: new Date(Date.now() + 60_000),
    operatorPurpose: "test",
  });
  return {
    approval: { ...approval, status: "CLAIMED", internalMessageId: "message" },
    owner: "V2_OWNED",
    revision: 0,
    providerV2CallCount: 0,
    providerV1FallbackCallCount: 0,
    outboundV2Attempted: false,
    outboundV2Performed: false,
    outboundV1Performed: false,
    externalMessageId: null,
    fallbackReason: null,
    reconciliationReason: null,
    terminalStatus: null,
    redactionApplied: true,
  };
}
function store(initial) {
  let value = initial;
  return {
    async load() {
      return value;
    },
    async compareAndSet({ expectedRevision, next }) {
      if (!value || value.revision !== expectedRevision) return false;
      value = next;
      return true;
    },
    value: () => value,
  };
}

test("V2 owns one approved outbound and replay never calls provider or sender", async () => {
  const s = store(record());
  let v2 = 0,
    sender = 0,
    v1 = 0;
  const c = new RuntimeV2ResponseExecutionCoordinator({
    store: s,
    async generateV2() {
      v2++;
      return { approved: true };
    },
    async sendV2() {
      sender++;
      return { externalMessageId: "external" };
    },
    async runV1Fallback() {
      v1++;
    },
  });
  const first = await c.execute({ ...scope, internalMessageId: "message" });
  const replay = await c.execute({ ...scope, internalMessageId: "message" });
  assert.equal(first.terminalStatus, "V2_OUTBOUND_SENT");
  assert.equal(replay.terminalStatus, "V2_OUTBOUND_SENT");
  assert.deepEqual([v2, sender, v1], [1, 1, 0]);
});

test("candidate/provider failure uses exactly one V1 fallback before any V2 sender", async () => {
  const s = store(record());
  let v2 = 0,
    sender = 0,
    v1 = 0;
  const c = new RuntimeV2ResponseExecutionCoordinator({
    store: s,
    async generateV2() {
      v2++;
      throw new Error("fake");
    },
    async sendV2() {
      sender++;
      return { externalMessageId: "never" };
    },
    async runV1Fallback() {
      v1++;
    },
  });
  const result = await c.execute({ ...scope, internalMessageId: "message" });
  assert.equal(result.terminalStatus, "V1_FALLBACK_SENT");
  assert.deepEqual([v2, sender, v1], [1, 0, 1]);
});

test("uncertain V2 sender never activates V1 fallback", async () => {
  const s = store(record());
  let fallback = 0;
  const c = new RuntimeV2ResponseExecutionCoordinator({
    store: s,
    async generateV2() {
      return { approved: true };
    },
    async sendV2() {
      throw new Error("network");
    },
    async runV1Fallback() {
      fallback++;
    },
  });
  const result = await c.execute({ ...scope, internalMessageId: "message" });
  assert.equal(result.terminalStatus, "RECONCILIATION_REQUIRED");
  assert.equal(result.outboundV2Attempted, true);
  assert.equal(result.outboundV2Performed, null);
  assert.equal(fallback, 0);
});
