import type { RuntimeV2ResponseExecutionCoordinator } from "../runtime-v2/response-execution-coordinator";
import type {
  ResponseExecutionEnvelope,
  ResponseExecutionOwner,
  ResponseExecutionRoute,
  ResponseExecutionTurn,
} from "./response-execution-envelope";

export type ResponseTailOutboundState =
  "NOT_ATTEMPTED" | "SKIPPED" | "CONFIRMED" | "FAILED" | "UNKNOWN";

export type ResponseTailLifecycleMetadata = {
  executionOwner: ResponseExecutionOwner;
  route: ResponseExecutionRoute;
  strategy: ResponseExecutionEnvelope["strategy"];
  internalMessageId: string;
  generationId: string | null;
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
 * Hooks retain V1's observational lifecycle. When an explicitly injected
 * single-use coordinator is present, only V2_PRIMARY and V1_FALLBACK transition
 * persisted ownership around the shared sender; V1_NORMAL remains untouched.
 */
export class ResponseTailLifecycleHooks {
  constructor(
    private readonly observe?: ResponseTailLifecycleObserver,
    private readonly coordinator?: RuntimeV2ResponseExecutionCoordinator | null,
    private readonly turn?: ResponseExecutionTurn,
  ) {}

  async beforeResponsePersist(metadata: ResponseTailLifecycleMetadata): Promise<void> {
    this.emit("beforeResponsePersist", metadata);
  }

  async afterResponsePersist(metadata: ResponseTailLifecycleMetadata): Promise<void> {
    this.emit("afterResponsePersist", metadata);
  }

  async beforeOutbound(metadata: ResponseTailLifecycleMetadata): Promise<void> {
    if (metadata.executionOwner !== "V1_NORMAL") {
      const allowed = await this.coordinatorFor(metadata).beforeOutbound({
        ...this.turnFor(metadata),
        owner: metadata.executionOwner,
        generationId: metadata.generationId,
      });
      if (!allowed) throw new Error("RESPONSE_EXECUTION_OUTBOUND_NOT_OWNED");
    }
    this.emit("beforeOutbound", metadata);
  }

  async afterOutboundConfirmed(
    metadata: ResponseTailLifecycleMetadata,
    externalMessageId: string | null,
  ): Promise<void> {
    if (metadata.executionOwner !== "V1_NORMAL") {
      const completed = await this.coordinatorFor(metadata).afterOutboundConfirmed({
        ...this.turnFor(metadata),
        owner: metadata.executionOwner,
        generationId: metadata.generationId,
        externalMessageId,
      });
      if (!completed) throw new Error("RESPONSE_EXECUTION_TERMINAL_NOT_PERSISTED");
    }
    this.emit("afterOutboundConfirmed", metadata);
  }

  async afterOutboundUncertain(metadata: ResponseTailLifecycleMetadata): Promise<void> {
    if (metadata.executionOwner === "V2_PRIMARY") {
      const reconciled = await this.coordinatorFor(metadata).afterOutboundUncertain({
        ...this.turnFor(metadata),
        owner: "V2_PRIMARY",
        generationId: this.requireGenerationId(metadata),
      });
      if (!reconciled) throw new Error("RESPONSE_EXECUTION_RECONCILIATION_NOT_PERSISTED");
    }
    this.emit("afterOutboundUncertain", metadata);
  }

  async afterOutboundFailure(metadata: ResponseTailLifecycleMetadata): Promise<void> {
    // A V2 sender may have crossed the external boundary before reporting failure.
    // Treat it as uncertain, never as permission to run V1 fallback.
    if (metadata.executionOwner === "V2_PRIMARY") {
      const reconciled = await this.coordinatorFor(metadata).afterOutboundUncertain({
        ...this.turnFor(metadata),
        owner: "V2_PRIMARY",
        generationId: this.requireGenerationId(metadata),
      });
      if (!reconciled) throw new Error("RESPONSE_EXECUTION_RECONCILIATION_NOT_PERSISTED");
    }
    this.emit("afterOutboundFailure", metadata);
  }

  async afterTailCompleted(metadata: ResponseTailLifecycleMetadata): Promise<void> {
    this.emit("afterTailCompleted", metadata);
  }

  private coordinatorFor(
    metadata: ResponseTailLifecycleMetadata,
  ): RuntimeV2ResponseExecutionCoordinator {
    if (!this.coordinator || !this.turn) {
      throw new Error(`RESPONSE_EXECUTION_COORDINATOR_REQUIRED:${metadata.executionOwner}`);
    }
    return this.coordinator;
  }

  private turnFor(metadata: ResponseTailLifecycleMetadata): ResponseExecutionTurn {
    if (!this.turn || this.turn.internalMessageId !== metadata.internalMessageId) {
      throw new Error("RESPONSE_EXECUTION_TURN_MISMATCH");
    }
    return this.turn;
  }

  private requireGenerationId(metadata: ResponseTailLifecycleMetadata): string {
    if (!metadata.generationId) throw new Error("RESPONSE_EXECUTION_GENERATION_REQUIRED");
    return metadata.generationId;
  }

  private emit(
    name: ResponseTailLifecycleEventName,
    metadata: ResponseTailLifecycleMetadata,
  ): void {
    this.observe?.(name, metadata);
  }
}
