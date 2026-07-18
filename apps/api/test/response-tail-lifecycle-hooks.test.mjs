import assert from "node:assert/strict";
import test from "node:test";
import { ResponseTailLifecycleHooks } from "../dist/assistant-conversations/response-tail-lifecycle-hooks.js";

function metadata(overrides = {}) {
  return {
    executionOwner: "V1_NORMAL",
    route: "V1_DEFAULT",
    strategy: "STANDARD",
    internalMessageId: "message-1",
    persistedResponseId: null,
    outboundAttempted: false,
    outboundPerformed: "NOT_ATTEMPTED",
    externalMessageReferenceFingerprint: null,
    ...overrides,
  };
}

test("observational hooks preserve successful V1 tail order around a fake sender", async () => {
  const events = [];
  let senderCalls = 0;
  const hooks = new ResponseTailLifecycleHooks((name, eventMetadata) => {
    events.push([name, eventMetadata]);
  });
  const sender = async () => {
    senderCalls += 1;
  };

  hooks.beforeResponsePersist(metadata());
  hooks.afterResponsePersist(metadata({ persistedResponseId: "assistant-1" }));
  hooks.beforeOutbound(metadata({ persistedResponseId: "assistant-1", outboundAttempted: true }));
  await sender();
  hooks.afterOutboundConfirmed(
    metadata({
      persistedResponseId: "assistant-1",
      outboundAttempted: true,
      outboundPerformed: "CONFIRMED",
    }),
  );
  hooks.afterTailCompleted(
    metadata({
      persistedResponseId: "assistant-1",
      outboundAttempted: true,
      outboundPerformed: "CONFIRMED",
    }),
  );

  assert.equal(senderCalls, 1);
  assert.deepEqual(
    events.map(([name]) => name),
    [
      "beforeResponsePersist",
      "afterResponsePersist",
      "beforeOutbound",
      "afterOutboundConfirmed",
      "afterTailCompleted",
    ],
  );
  assert.deepEqual(Object.keys(events[0][1]).sort(), [
    "executionOwner",
    "externalMessageReferenceFingerprint",
    "internalMessageId",
    "outboundAttempted",
    "outboundPerformed",
    "persistedResponseId",
    "route",
    "strategy",
  ]);
});

test("observational hooks do not retry a failed fake sender", async () => {
  const events = [];
  let senderCalls = 0;
  const hooks = new ResponseTailLifecycleHooks((name) => events.push(name));
  const sender = async () => {
    senderCalls += 1;
    throw new Error("sender failure");
  };

  hooks.beforeOutbound(metadata({ outboundAttempted: true }));
  await assert.rejects(sender, /sender failure/);
  hooks.afterOutboundFailure(metadata({ outboundAttempted: true, outboundPerformed: "FAILED" }));

  assert.equal(senderCalls, 1);
  assert.deepEqual(events, ["beforeOutbound", "afterOutboundFailure"]);
});
