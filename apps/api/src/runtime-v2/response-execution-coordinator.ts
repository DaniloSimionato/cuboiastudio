import { createHash } from "node:crypto";
import {
  claimRuntimeV2ResponseExecution,
  type RuntimeV2ResponseExecutionApproval,
  type RuntimeV2TurnOwner,
} from "./response-execution-approval";

export type ResponseExecutionTerminal =
  "V2_OUTBOUND_SENT" | "V1_FALLBACK_SENT" | "RECONCILIATION_REQUIRED" | "TERMINAL_BLOCKED";

export type ResponseExecutionRecord = {
  approval: RuntimeV2ResponseExecutionApproval;
  owner: RuntimeV2TurnOwner;
  /** Mirrors the persisted stateJson row revision and is used by CAS. */
  revision: number;
  contextVersion: number;
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

export type ResponseExecutionScope = {
  companyId: string;
  assistantId: string;
  conversationId: string;
  internalMessageId?: string | null;
  contextVersion?: number;
};

export interface ResponseExecutionStore {
  load(input: ResponseExecutionScope): Promise<ResponseExecutionRecord | null>;
  compareAndSet(input: {
    expectedRevision: number;
    next: ResponseExecutionRecord;
  }): Promise<boolean>;
}

export type ResponseExecutionDependencies = {
  store: ResponseExecutionStore;
  /** Legacy isolated-execute dependencies. The router uses only transition methods. */
  generateV2?: (input: { generationId: string }) => Promise<{ approved: boolean }>;
  sendV2?: (input: { idempotencyKey: string }) => Promise<{ externalMessageId: string }>;
  runV1Fallback?: () => Promise<void>;
};

export type ResponseExecutionClaimResult =
  | { status: "CLAIMED"; approval: RuntimeV2ResponseExecutionApproval; generationId: string }
  | { status: "NOT_ELIGIBLE" | "PENDING_OR_TERMINAL" };

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

function sameScope(record: ResponseExecutionRecord, input: ResponseExecutionScope): boolean {
  const approval = record.approval;
  return (
    approval.companyId === input.companyId &&
    approval.assistantId === input.assistantId &&
    approval.conversationId === input.conversationId &&
    (!input.internalMessageId || approval.internalMessageId === input.internalMessageId) &&
    (input.contextVersion === undefined || record.contextVersion === input.contextVersion)
  );
}

/**
 * Persistence-first single-use coordinator. It does not know providers, transport,
 * prompts, or the shared response tail. Router and tail call these transitions at
 * their respective safe boundaries; all transitions are protected by store CAS.
 */
export class RuntimeV2ResponseExecutionCoordinator {
  constructor(private readonly dependencies: ResponseExecutionDependencies) {}

  async loadApproval(
    input: ResponseExecutionScope,
  ): Promise<RuntimeV2ResponseExecutionApproval | null> {
    const current = await this.dependencies.store.load(input);
    return current && sameScope(current, { ...input, internalMessageId: null })
      ? current.approval
      : null;
  }

  async claim(input: {
    companyId: string;
    assistantId: string;
    conversationId: string;
    canonicalComparisonHash: string | null;
    internalMessageId: string;
    contextVersion?: number;
    approval: RuntimeV2ResponseExecutionApproval;
  }): Promise<ResponseExecutionClaimResult> {
    const current = await this.dependencies.store.load(input);
    if (!current || !sameScope(current, { ...input, internalMessageId: undefined })) {
      return { status: "NOT_ELIGIBLE" };
    }
    if (current.terminalStatus || current.owner !== "V1_OWNED") {
      return { status: "PENDING_OR_TERMINAL" };
    }
    const claimed = claimRuntimeV2ResponseExecution({
      approval: current.approval,
      companyId: input.companyId,
      assistantId: input.assistantId,
      conversationId: input.conversationId,
      canonicalComparisonHash: input.canonicalComparisonHash ?? "",
      internalMessageId: input.internalMessageId,
    });
    if (!claimed.allowed || claimed.approval.approvalId !== input.approval.approvalId) {
      return { status: "NOT_ELIGIBLE" };
    }
    const generationId = key({ ...current, approval: claimed.approval });
    const candidate = next(current, {
      owner: "V2_OWNED",
      approval: { ...claimed.approval, generationId },
    });
    if (
      !(await this.dependencies.store.compareAndSet({
        expectedRevision: current.revision,
        next: candidate,
      }))
    ) {
      return { status: "PENDING_OR_TERMINAL" };
    }
    return { status: "CLAIMED", approval: candidate.approval, generationId };
  }

  async beginV2Generation(
    input: ResponseExecutionScope & { generationId: string },
  ): Promise<boolean> {
    return this.transition(input, ["V2_OWNED"], (record) =>
      next(record, {
        owner: "V2_GENERATION_PENDING",
        providerV2CallCount: record.providerV2CallCount + 1,
        approval: record.approval.generationId
          ? record.approval
          : { ...record.approval, generationId: input.generationId },
      }),
    );
  }

  /** Cancellation is deliberately available only before any single-use claim. */
  async cancel(input: ResponseExecutionScope & { approvalFingerprint: string }): Promise<boolean> {
    const current = await this.dependencies.store.load(input);
    if (
      !current ||
      !sameScope(current, input) ||
      current.owner !== "V1_OWNED" ||
      current.terminalStatus ||
      current.approval.status !== "ARMED" ||
      current.approval.creationFingerprint.slice(0, 16) !== input.approvalFingerprint ||
      Date.parse(current.approval.expiresAt) <= Date.now()
    ) {
      return false;
    }
    return this.dependencies.store.compareAndSet({
      expectedRevision: current.revision,
      next: next(current, {
        owner: "TERMINAL_BLOCKED",
        terminalStatus: "TERMINAL_BLOCKED",
        approval: { ...current.approval, status: "CANCELLED" },
      }),
    });
  }

  async approveV2Candidate(
    input: ResponseExecutionScope & { generationId: string },
  ): Promise<boolean> {
    return this.transition(input, ["V2_GENERATION_PENDING"], (record) =>
      next(record, { owner: "V2_CANDIDATE_APPROVED" }),
    );
  }

  async beginV1Fallback(
    input: ResponseExecutionScope & {
      generationId: string;
      reason: string;
    },
  ): Promise<boolean> {
    const current = await this.dependencies.store.load(input);
    if (
      !current ||
      !sameScope(current, input) ||
      current.approval.generationId !== input.generationId ||
      current.outboundV2Attempted ||
      !["V2_OWNED", "V2_GENERATION_PENDING", "V2_CANDIDATE_APPROVED"].includes(current.owner)
    ) {
      return false;
    }
    const required = next(current, {
      owner: "V1_FALLBACK_REQUIRED",
      fallbackReason: input.reason.slice(0, 80),
    });
    if (
      !(await this.dependencies.store.compareAndSet({
        expectedRevision: current.revision,
        next: required,
      }))
    ) {
      return false;
    }
    const pending = next(required, {
      owner: "V1_FALLBACK_PENDING",
      providerV1FallbackCallCount: required.providerV1FallbackCallCount + 1,
    });
    return this.dependencies.store.compareAndSet({
      expectedRevision: required.revision,
      next: pending,
    });
  }

  async beforeOutbound(
    input: ResponseExecutionScope & {
      owner: "V1_FALLBACK" | "V2_PRIMARY";
      generationId: string | null;
    },
  ): Promise<boolean> {
    if (input.owner === "V1_FALLBACK") {
      return this.transition(input, ["V1_FALLBACK_PENDING"], (record) => next(record, {}));
    }
    if (!input.generationId) return false;
    return this.transition(input, ["V2_CANDIDATE_APPROVED"], (record) =>
      next(record, { owner: "V2_OUTBOUND_PENDING", outboundV2Attempted: true }),
    );
  }

  async afterOutboundConfirmed(
    input: ResponseExecutionScope & {
      owner: "V1_FALLBACK" | "V2_PRIMARY";
      generationId: string | null;
      externalMessageId: string | null;
    },
  ): Promise<boolean> {
    const expectedOwner =
      input.owner === "V2_PRIMARY" ? "V2_OUTBOUND_PENDING" : "V1_FALLBACK_PENDING";
    return this.transition(input, [expectedOwner], (record) => {
      const consumedAt = new Date().toISOString();
      return next(record, {
        owner: input.owner === "V2_PRIMARY" ? "V2_OUTBOUND_SENT" : "V1_FALLBACK_SENT",
        outboundV2Performed: input.owner === "V2_PRIMARY" ? true : record.outboundV2Performed,
        outboundV1Performed: input.owner === "V1_FALLBACK" ? true : record.outboundV1Performed,
        externalMessageId: input.externalMessageId,
        terminalStatus: input.owner === "V2_PRIMARY" ? "V2_OUTBOUND_SENT" : "V1_FALLBACK_SENT",
        approval: { ...record.approval, status: "CONSUMED", consumedAt },
      });
    });
  }

  async afterOutboundUncertain(
    input: ResponseExecutionScope & {
      owner: "V2_PRIMARY";
      generationId: string;
    },
  ): Promise<boolean> {
    return this.transition(input, ["V2_OUTBOUND_PENDING"], (record) =>
      next(record, {
        owner: "RECONCILIATION_REQUIRED",
        outboundV2Performed: null,
        reconciliationReason: "V2_SENDER_UNCONFIRMED",
        terminalStatus: "RECONCILIATION_REQUIRED",
      }),
    );
  }

  /** Legacy isolated side-effect harness retained for its existing unit contract. */
  async execute(input: {
    companyId: string;
    assistantId: string;
    conversationId: string;
    internalMessageId: string;
    contextVersion?: number;
  }): Promise<ResponseExecutionRecord | null> {
    if (
      !this.dependencies.generateV2 ||
      !this.dependencies.sendV2 ||
      !this.dependencies.runV1Fallback
    ) {
      throw new Error("RESPONSE_EXECUTION_LEGACY_DEPENDENCIES_REQUIRED");
    }
    const current = await this.dependencies.store.load(input);
    if (!current || current.approval.internalMessageId !== input.internalMessageId) return null;
    if (current.terminalStatus || current.owner === "RECONCILIATION_REQUIRED") return current;
    if (current.owner !== "V2_OWNED") return current;

    const generationId = key(current);
    if (!(await this.beginV2Generation({ ...input, generationId })))
      return this.dependencies.store.load(input);
    let candidate: { approved: boolean };
    try {
      candidate = await this.dependencies.generateV2({ generationId });
    } catch {
      return this.legacyFallback(input, generationId, "V2_PROVIDER_FAILED");
    }
    if (!candidate.approved)
      return this.legacyFallback(input, generationId, "V2_CANDIDATE_BLOCKED");
    if (!(await this.approveV2Candidate({ ...input, generationId })))
      return this.dependencies.store.load(input);
    if (!(await this.beforeOutbound({ ...input, owner: "V2_PRIMARY", generationId }))) {
      return this.dependencies.store.load(input);
    }
    try {
      const sent = await this.dependencies.sendV2({ idempotencyKey: generationId });
      await this.afterOutboundConfirmed({
        ...input,
        owner: "V2_PRIMARY",
        generationId,
        externalMessageId: sent.externalMessageId,
      });
    } catch {
      await this.afterOutboundUncertain({ ...input, owner: "V2_PRIMARY", generationId });
    }
    return this.dependencies.store.load(input);
  }

  private async legacyFallback(
    input: ResponseExecutionScope,
    generationId: string,
    reason: string,
  ): Promise<ResponseExecutionRecord | null> {
    if (!(await this.beginV1Fallback({ ...input, generationId, reason }))) {
      return this.dependencies.store.load(input);
    }
    await this.dependencies.runV1Fallback?.();
    await this.afterOutboundConfirmed({
      ...input,
      owner: "V1_FALLBACK",
      generationId: null,
      externalMessageId: null,
    });
    return this.dependencies.store.load(input);
  }

  private async transition(
    input: ResponseExecutionScope & { generationId?: string | null },
    owners: RuntimeV2TurnOwner[],
    createNext: (record: ResponseExecutionRecord) => ResponseExecutionRecord,
  ): Promise<boolean> {
    const current = await this.dependencies.store.load(input);
    if (
      !current ||
      !sameScope(current, input) ||
      !owners.includes(current.owner) ||
      (input.generationId &&
        current.approval.generationId !== null &&
        current.approval.generationId !== input.generationId)
    ) {
      return false;
    }
    return this.dependencies.store.compareAndSet({
      expectedRevision: current.revision,
      next: createNext(current),
    });
  }
}
