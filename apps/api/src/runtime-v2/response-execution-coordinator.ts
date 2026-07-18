import { createHash } from "node:crypto";
import type {
  RuntimeV2ResponseExecutionApproval,
  RuntimeV2TurnOwner,
} from "./response-execution-approval";

export type ResponseExecutionTerminal =
  "V2_OUTBOUND_SENT" | "V1_FALLBACK_SENT" | "RECONCILIATION_REQUIRED" | "TERMINAL_BLOCKED";

export type ResponseExecutionRecord = {
  approval: RuntimeV2ResponseExecutionApproval;
  owner: RuntimeV2TurnOwner;
  revision: number;
  providerV2CallCount: number;
  providerV1FallbackCallCount: number;
  outboundV2Attempted: boolean;
  outboundV2Performed: boolean | null;
  outboundV1Performed: boolean;
  externalMessageId: string | null;
  fallbackReason: string | null;
  reconciliationReason: string | null;
  terminalStatus: ResponseExecutionTerminal | null;
  redactionApplied: true;
};

export interface ResponseExecutionStore {
  load(input: {
    companyId: string;
    assistantId: string;
    conversationId: string;
  }): Promise<ResponseExecutionRecord | null>;
  compareAndSet(input: {
    expectedRevision: number;
    next: ResponseExecutionRecord;
  }): Promise<boolean>;
}

export type ResponseExecutionDependencies = {
  store: ResponseExecutionStore;
  generateV2: (input: { generationId: string }) => Promise<{ approved: boolean }>;
  sendV2: (input: { idempotencyKey: string }) => Promise<{ externalMessageId: string }>;
  runV1Fallback: () => Promise<void>;
};

function key(record: ResponseExecutionRecord): string {
  const a = record.approval;
  return createHash("sha256")
    .update(
      `${a.companyId}:${a.assistantId}:${a.conversationId}:${a.internalMessageId}:${a.expectedCanonicalComparisonHash}`,
    )
    .digest("hex");
}

function next(
  record: ResponseExecutionRecord,
  patch: Partial<ResponseExecutionRecord>,
): ResponseExecutionRecord {
  return { ...record, ...patch, revision: record.revision + 1, redactionApplied: true };
}

/**
 * Small, side-effect ordered coordinator. The persistence adapter owns the
 * compare-and-set operation, allowing Prisma stateJson storage to provide the
 * same single winner guarantee across API instances.
 */
export class RuntimeV2ResponseExecutionCoordinator {
  constructor(private readonly dependencies: ResponseExecutionDependencies) {}

  async execute(input: {
    companyId: string;
    assistantId: string;
    conversationId: string;
    internalMessageId: string;
  }): Promise<ResponseExecutionRecord | null> {
    const current = await this.dependencies.store.load(input);
    if (!current || current.approval.internalMessageId !== input.internalMessageId) return null;
    if (current.terminalStatus || current.owner === "RECONCILIATION_REQUIRED") return current;
    if (current.owner !== "V2_OWNED") return current;

    const generationId = key(current);
    const generating = next(current, {
      owner: "V2_GENERATION_PENDING",
      providerV2CallCount: current.providerV2CallCount + 1,
    });
    if (
      !(await this.dependencies.store.compareAndSet({
        expectedRevision: current.revision,
        next: generating,
      }))
    )
      return this.dependencies.store.load(input);

    let candidate: { approved: boolean };
    try {
      candidate = await this.dependencies.generateV2({ generationId });
    } catch {
      return this.fallback(generating, "V2_PROVIDER_FAILED", input);
    }
    if (!candidate.approved) return this.fallback(generating, "V2_CANDIDATE_BLOCKED", input);

    const pending = next(generating, { owner: "V2_OUTBOUND_PENDING", outboundV2Attempted: true });
    if (
      !(await this.dependencies.store.compareAndSet({
        expectedRevision: generating.revision,
        next: pending,
      }))
    )
      return this.dependencies.store.load(input);
    try {
      const sent = await this.dependencies.sendV2({ idempotencyKey: generationId });
      const terminal = next(pending, {
        owner: "V2_OUTBOUND_SENT",
        outboundV2Performed: true,
        externalMessageId: sent.externalMessageId,
        terminalStatus: "V2_OUTBOUND_SENT",
        approval: {
          ...pending.approval,
          status: "CONSUMED",
          consumedAt: new Date().toISOString(),
          generationId,
        },
      });
      await this.dependencies.store.compareAndSet({
        expectedRevision: pending.revision,
        next: terminal,
      });
      return terminal;
    } catch {
      const uncertain = next(pending, {
        owner: "RECONCILIATION_REQUIRED",
        outboundV2Performed: null,
        reconciliationReason: "V2_SENDER_UNCONFIRMED",
        terminalStatus: "RECONCILIATION_REQUIRED",
      });
      await this.dependencies.store.compareAndSet({
        expectedRevision: pending.revision,
        next: uncertain,
      });
      return uncertain;
    }
  }

  private async fallback(
    record: ResponseExecutionRecord,
    reason: string,
    input: { companyId: string; assistantId: string; conversationId: string },
  ): Promise<ResponseExecutionRecord> {
    const required = next(record, { owner: "V1_FALLBACK_REQUIRED", fallbackReason: reason });
    if (
      !(await this.dependencies.store.compareAndSet({
        expectedRevision: record.revision,
        next: required,
      }))
    )
      return (await this.dependencies.store.load(input))!;
    const pending = next(required, {
      owner: "V1_FALLBACK_PENDING",
      providerV1FallbackCallCount: required.providerV1FallbackCallCount + 1,
    });
    if (
      !(await this.dependencies.store.compareAndSet({
        expectedRevision: required.revision,
        next: pending,
      }))
    )
      return (await this.dependencies.store.load(input))!;
    await this.dependencies.runV1Fallback();
    const terminal = next(pending, {
      owner: "V1_FALLBACK_SENT",
      outboundV1Performed: true,
      terminalStatus: "V1_FALLBACK_SENT",
      approval: { ...pending.approval, status: "CONSUMED", consumedAt: new Date().toISOString() },
    });
    await this.dependencies.store.compareAndSet({
      expectedRevision: pending.revision,
      next: terminal,
    });
    return terminal;
  }
}
