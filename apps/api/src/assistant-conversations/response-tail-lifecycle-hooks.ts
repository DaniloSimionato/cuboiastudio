import type { ResponseExecutionOwner, ResponseExecutionRoute } from "./response-execution-envelope";
import type { V1ResponseGenerationStrategy } from "./v1-response-generation-executor";

export type ResponseTailOutboundState =
  "NOT_ATTEMPTED" | "SKIPPED" | "CONFIRMED" | "FAILED" | "UNKNOWN";

export type ResponseTailLifecycleMetadata = {
  executionOwner: ResponseExecutionOwner;
  route: ResponseExecutionRoute;
  strategy: V1ResponseGenerationStrategy | null;
  internalMessageId: string;
  persistedResponseId: string | null;
  outboundAttempted: boolean;
  outboundPerformed: ResponseTailOutboundState;
  externalMessageReferenceFingerprint: string | null;
};

export type ResponseTailLifecycleEventName =
  | "beforeResponsePersist"
  | "afterResponsePersist"
  | "beforeOutbound"
  | "afterOutboundConfirmed"
  | "afterOutboundUncertain"
  | "afterOutboundFailure"
  | "afterTailCompleted";

export type ResponseTailLifecycleObserver = (
  name: ResponseTailLifecycleEventName,
  metadata: ResponseTailLifecycleMetadata,
) => void;

/**
 * V1 hooks are intentionally observational. They own no persistence, sender,
 * provider, approval, coordinator, or retry behavior.
 */
export class ResponseTailLifecycleHooks {
  constructor(private readonly observe?: ResponseTailLifecycleObserver) {}

  beforeResponsePersist(metadata: ResponseTailLifecycleMetadata): void {
    this.emit("beforeResponsePersist", metadata);
  }

  afterResponsePersist(metadata: ResponseTailLifecycleMetadata): void {
    this.emit("afterResponsePersist", metadata);
  }

  beforeOutbound(metadata: ResponseTailLifecycleMetadata): void {
    this.emit("beforeOutbound", metadata);
  }

  afterOutboundConfirmed(metadata: ResponseTailLifecycleMetadata): void {
    this.emit("afterOutboundConfirmed", metadata);
  }

  afterOutboundUncertain(metadata: ResponseTailLifecycleMetadata): void {
    this.emit("afterOutboundUncertain", metadata);
  }

  afterOutboundFailure(metadata: ResponseTailLifecycleMetadata): void {
    this.emit("afterOutboundFailure", metadata);
  }

  afterTailCompleted(metadata: ResponseTailLifecycleMetadata): void {
    this.emit("afterTailCompleted", metadata);
  }

  private emit(
    name: ResponseTailLifecycleEventName,
    metadata: ResponseTailLifecycleMetadata,
  ): void {
    this.observe?.(name, metadata);
  }
}
